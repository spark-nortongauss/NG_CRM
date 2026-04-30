import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ScrapperJobParams,
  ScrapperJobProgress,
  ScrapperSearchResult,
} from "@/lib/scrapper/types";
import { searchGoogleRapidApi } from "@/lib/scrapper/google-search";
import { filterAndScoreResults } from "@/lib/scrapper/company-filter";
import { buildExcelBuffer } from "@/lib/scrapper/excel";
import { uploadScrapperResultXlsx } from "@/lib/scrapper/storage";
import { enqueueScrapperJob } from "@/lib/scrapper/qstash";

export const runtime = "nodejs";

type ScrapperJobRow = {
  id: string;
  status: string;
  cancelled: boolean;
  params: ScrapperJobParams;
  progress: ScrapperJobProgress;
};

type StoredProgress = ScrapperJobProgress & {
  results?: ScrapperSearchResult[];
};

const receiver =
  process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY
    ? new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
      })
    : null;

async function verifyQStash(req: NextRequest, rawBody: string): Promise<boolean> {
  if (!receiver) return true; // local/dev fallback
  const signature = req.headers.get("upstash-signature");
  if (!signature) return false;
  return receiver.verify({
    signature,
    body: rawBody,
    url: req.url,
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureProgress(p: unknown): ScrapperJobProgress {
  const base: ScrapperJobProgress = {
    queryIndex: 0,
    countryIndex: 0,
    start: 0,
    collectedCount: 0,
    uniqueDomainsCount: 0,
    lastMessage: "Starting",
  };
  if (!p || typeof p !== "object") return base;
  const pp = p as Partial<ScrapperJobProgress>;
  return {
    queryIndex: typeof pp.queryIndex === "number" ? pp.queryIndex : base.queryIndex,
    countryIndex: typeof pp.countryIndex === "number" ? pp.countryIndex : base.countryIndex,
    start: typeof pp.start === "number" ? pp.start : base.start,
    collectedCount:
      typeof pp.collectedCount === "number" ? pp.collectedCount : base.collectedCount,
    uniqueDomainsCount:
      typeof pp.uniqueDomainsCount === "number"
        ? pp.uniqueDomainsCount
        : base.uniqueDomainsCount,
    lastMessage: typeof pp.lastMessage === "string" ? pp.lastMessage : base.lastMessage,
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const ok = await verifyQStash(req, rawBody);
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = rawBody ? (JSON.parse(rawBody) as { jobId?: string }) : {};
  const jobId = typeof body.jobId === "string" ? body.jobId : null;
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: job, error } = await supabase
    .from("scrapper_jobs")
    .select("id, status, cancelled, params, progress")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: error?.message || "Job not found" }, { status: 404 });
  }

  const typedJob = job as unknown as ScrapperJobRow;
  if (typedJob.cancelled || typedJob.status === "cancelled") {
    return NextResponse.json({ ok: true, status: "cancelled" });
  }
  if (typedJob.status === "completed") {
    return NextResponse.json({ ok: true, status: "completed" });
  }

  const params = typedJob.params;
  const progress = ensureProgress(typedJob.progress);

  const queries = Array.isArray(params.queries) ? params.queries : [];
  const countries = Array.isArray(params.countries) ? params.countries : [];
  const minScore = typeof params.minScore === "number" ? params.minScore : 35;
  const resultsPerQuery = Math.min(Math.max(params.resultsPerQuery ?? 30, 1), 100);
  const delayMs = Math.max(0, params.requestDelayMs ?? 0);

  if (queries.length === 0 || countries.length === 0) {
    await supabase
      .from("scrapper_jobs")
      .update({
        status: "failed",
        error_message: "Invalid params: missing queries/countries",
      })
      .eq("id", jobId);
    return NextResponse.json({ ok: false, status: "failed" }, { status: 500 });
  }

  // Transition to running on first worker invocation.
  if (typedJob.status === "pending") {
    await supabase
      .from("scrapper_jobs")
      .update({ status: "running", progress: { ...progress, lastMessage: "Running" } })
      .eq("id", jobId);
  }

  // Work chunk: one page fetch (<=10 results), then reschedule continuation.
  const query = queries[progress.queryIndex] ?? null;
  const country = countries[progress.countryIndex] ?? null;
  if (!query || !country) {
    // Done: build Excel from stored results
    // NOTE: for now we store all results in job.progress.results (small-to-medium runs).
    // If this grows, we will move intermediate results to Storage.
    const { data: finalJob } = await supabase
      .from("scrapper_jobs")
      .select("progress, params")
      .eq("id", jobId)
      .single();

    const finalProgress = (finalJob?.progress || {}) as StoredProgress;
    const results = Array.isArray(finalProgress?.results)
      ? (finalProgress.results as ScrapperSearchResult[])
      : [];

    const uniqueByDomain = new Map<string, ScrapperSearchResult>();
    for (const r of results) {
      if (r.domain && !uniqueByDomain.has(r.domain)) uniqueByDomain.set(r.domain, r);
    }

    const excelBuffer = buildExcelBuffer(Array.from(uniqueByDomain.values()));
    const uploaded = await uploadScrapperResultXlsx({ jobId, buffer: excelBuffer });

    await supabase
      .from("scrapper_jobs")
      .update({
        status: "completed",
        result_storage_bucket: uploaded.bucket,
        result_storage_path: uploaded.path,
        progress: {
          ...finalProgress,
          uniqueDomainsCount: uniqueByDomain.size,
          lastMessage: "Completed",
        },
      })
      .eq("id", jobId);

    return NextResponse.json({ ok: true, status: "completed" });
  }

  const resultsPerPage = 10;
  const start = progress.start;

  const pageResults = await searchGoogleRapidApi({
    query,
    country,
    num: Math.min(resultsPerPage, resultsPerQuery),
    start,
    timeFilter: params.timeFilter || "",
    timeoutMs: 30_000,
  });

  const filtered = filterAndScoreResults(pageResults, minScore);

  // Load current accumulated results (kept in progress for MVP).
  const { data: existing } = await supabase
    .from("scrapper_jobs")
    .select("progress, cancelled")
    .eq("id", jobId)
    .single();

  if (existing?.cancelled) {
    await supabase
      .from("scrapper_jobs")
      .update({ status: "cancelled", progress: { ...progress, lastMessage: "Cancelled" } })
      .eq("id", jobId);
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  const existingProgress = (existing?.progress || {}) as StoredProgress;
  const accumulated: ScrapperSearchResult[] = Array.isArray(existingProgress?.results)
    ? (existingProgress.results as ScrapperSearchResult[])
    : [];

  const merged = accumulated.concat(filtered);

  // Advance cursor
  let nextQueryIndex = progress.queryIndex;
  let nextCountryIndex = progress.countryIndex;
  let nextStart = start + resultsPerPage;

  if (nextStart >= resultsPerQuery) {
    nextStart = 0;
    nextCountryIndex += 1;
    if (nextCountryIndex >= countries.length) {
      nextCountryIndex = 0;
      nextQueryIndex += 1;
    }
  }

  const uniqueDomains = new Set(merged.map((m) => m.domain).filter(Boolean));

  const nextProgress: ScrapperJobProgress & { results: ScrapperSearchResult[] } = {
    queryIndex: nextQueryIndex,
    countryIndex: nextCountryIndex,
    start: nextStart,
    collectedCount: merged.length,
    uniqueDomainsCount: uniqueDomains.size,
    lastMessage: `Fetched ${filtered.length} filtered results (q=${progress.queryIndex + 1}/${queries.length}, c=${progress.countryIndex + 1}/${countries.length}, start=${start})`,
    results: merged,
  };

  await supabase
    .from("scrapper_jobs")
    .update({ progress: nextProgress })
    .eq("id", jobId);

  if (delayMs > 0) {
    await sleep(delayMs);
  }

  await enqueueScrapperJob(jobId);

  return NextResponse.json({ ok: true, status: "running" });
}

