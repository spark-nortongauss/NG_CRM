import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth/role-check";
import type {
  ScrapperJobParams,
  ScrapperSearchResult,
} from "@/lib/scrapper/types";
import { searchGoogleRapidApi } from "@/lib/scrapper/google-search";
import { filterAndScoreResults } from "@/lib/scrapper/company-filter";
import { buildExcelBuffer } from "@/lib/scrapper/excel";
import { uploadScrapperResultXlsx } from "@/lib/scrapper/storage";

export const runtime = "nodejs";
// Allow up to 5 minutes for the long-running request (Vercel Pro / self-hosted).
// On Hobby plans the max is 60s; the user acknowledged this by staying on page.
export const maxDuration = 300;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Streaming scrapper endpoint.
 * The client POSTs params and keeps the connection open.
 * We stream SSE progress events, then send a final "complete" event with the
 * download URL (signed Supabase Storage URL). No DB job table or QStash needed.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));

  const queries: string[] = Array.isArray(body.queries)
    ? body.queries.map((q: unknown) => (typeof q === "string" ? q.trim() : "")).filter(Boolean)
    : [];
  const countries: string[] = Array.isArray(body.countries)
    ? body.countries
        .map((c: unknown) => (typeof c === "string" ? c.trim().toUpperCase() : ""))
        .filter(Boolean)
    : [];
  const resultsPerQuery = Math.min(
    Math.max(typeof body.resultsPerQuery === "number" ? body.resultsPerQuery : 30, 1),
    100
  );
  const minScore = Math.min(
    Math.max(typeof body.minScore === "number" ? body.minScore : 35, 0),
    100
  );
  const timeFilter = typeof body.timeFilter === "string" ? body.timeFilter : "";
  const delayMs = Math.max(0, typeof body.requestDelayMs === "number" ? body.requestDelayMs : 0);

  if (queries.length === 0 || countries.length === 0) {
    return new Response(
      JSON.stringify({ error: "At least 1 query and 1 country required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Set up SSE stream
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  let aborted = false;

  // Listen for client disconnect
  req.signal.addEventListener("abort", () => {
    aborted = true;
  });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
  });

  function sendEvent(event: string, data: Record<string, unknown>) {
    if (aborted || !controllerRef) return;
    try {
      controllerRef.enqueue(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      );
    } catch {
      // stream closed
      aborted = true;
    }
  }

  function closeStream() {
    try {
      controllerRef?.close();
    } catch {
      // already closed
    }
  }

  // Start the work in the background while returning the stream immediately
  (async () => {
    const allResults: ScrapperSearchResult[] = [];
    const resultsPerPage = 10;
    const totalTasks = queries.length * countries.length;
    let tasksDone = 0;

    try {
      for (let qi = 0; qi < queries.length; qi++) {
        for (let ci = 0; ci < countries.length; ci++) {
          const query = queries[qi];
          const country = countries[ci];

          for (let start = 0; start < resultsPerQuery; start += resultsPerPage) {
            if (aborted) {
              sendEvent("cancelled", { message: "Cancelled by user" });
              closeStream();
              return;
            }

            sendEvent("progress", {
              status: "running",
              queryIndex: qi,
              countryIndex: ci,
              start,
              collectedCount: allResults.length,
              uniqueDomainsCount: new Set(allResults.map((r) => r.domain).filter(Boolean)).size,
              lastMessage: `Fetching q=${qi + 1}/${queries.length}, c=${ci + 1}/${countries.length}, start=${start}`,
            });

            try {
              const pageResults = await searchGoogleRapidApi({
                query,
                country,
                num: Math.min(resultsPerPage, resultsPerQuery - start),
                start,
                timeFilter,
                timeoutMs: 30_000,
              });

              const filtered = filterAndScoreResults(pageResults, minScore);
              allResults.push(...filtered);
            } catch (fetchErr) {
              const msg = fetchErr instanceof Error ? fetchErr.message : "Search API error";
              sendEvent("warning", {
                message: `Search failed for q="${query}" c=${country} start=${start}: ${msg}`,
              });
              // Continue to next page/query instead of aborting the whole job
            }

            if (delayMs > 0) {
              await sleep(delayMs);
            }
          }

          tasksDone++;
        }
      }

      if (aborted) {
        sendEvent("cancelled", { message: "Cancelled by user" });
        closeStream();
        return;
      }

      // Deduplicate by domain
      const uniqueByDomain = new Map<string, ScrapperSearchResult>();
      for (const r of allResults) {
        if (r.domain && !uniqueByDomain.has(r.domain)) {
          uniqueByDomain.set(r.domain, r);
        }
      }

      sendEvent("progress", {
        status: "building",
        collectedCount: allResults.length,
        uniqueDomainsCount: uniqueByDomain.size,
        lastMessage: "Building Excel file…",
      });

      // Build Excel and upload to Supabase Storage
      const excelBuffer = buildExcelBuffer(Array.from(uniqueByDomain.values()));
      const jobId = crypto.randomUUID();
      const uploaded = await uploadScrapperResultXlsx({ jobId, buffer: excelBuffer });

      // Create a signed download URL (valid for 10 minutes)
      const supabase = createAdminClient();
      const { data: signed, error: signError } = await supabase.storage
        .from(uploaded.bucket)
        .createSignedUrl(uploaded.path, 600);

      if (signError || !signed?.signedUrl) {
        sendEvent("error", {
          message: `Failed to create download URL: ${signError?.message || "unknown"}`,
        });
        closeStream();
        return;
      }

      sendEvent("complete", {
        status: "completed",
        collectedCount: allResults.length,
        uniqueDomainsCount: uniqueByDomain.size,
        downloadUrl: signed.signedUrl,
        lastMessage: "Completed",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      sendEvent("error", { message: msg });
    } finally {
      closeStream();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
