import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/role-check";
import { enqueueScrapperJob } from "@/lib/scrapper/qstash";
import type { ScrapperJobParams } from "@/lib/scrapper/types";

function normalizeCountries(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((c) => (typeof c === "string" ? c.trim().toUpperCase() : ""))
    .filter(Boolean);
}

function normalizeQueries(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((q) => (typeof q === "string" ? q.trim() : ""))
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const params: ScrapperJobParams = {
    queries: normalizeQueries(body.queries),
    countries: normalizeCountries(body.countries),
    resultsPerQuery:
      typeof body.resultsPerQuery === "number" ? body.resultsPerQuery : 30,
    timeFilter: typeof body.timeFilter === "string" ? body.timeFilter : "",
    requestDelayMs:
      typeof body.requestDelayMs === "number" ? body.requestDelayMs : 0,
    minScore: typeof body.minScore === "number" ? body.minScore : 35,
  };

  if (params.queries.length === 0) {
    return NextResponse.json({ error: "At least 1 query is required" }, { status: 400 });
  }
  if (params.countries.length === 0) {
    return NextResponse.json({ error: "At least 1 country is required" }, { status: 400 });
  }
  params.resultsPerQuery = Math.min(Math.max(params.resultsPerQuery, 1), 100);
  params.minScore = Math.min(Math.max(params.minScore ?? 35, 0), 100);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scrapper_jobs")
    .insert([
      {
        status: "pending",
        cancelled: false,
        created_by_user_id: auth.userId,
        params,
        progress: {
          queryIndex: 0,
          countryIndex: 0,
          start: 0,
          collectedCount: 0,
          uniqueDomainsCount: 0,
          lastMessage: "Queued",
        },
      },
    ])
    .select("id")
    .single();

  if (error || !data?.id) {
    return NextResponse.json(
      { error: error?.message || "Failed to create job" },
      { status: 500 }
    );
  }

  try {
    await enqueueScrapperJob(data.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to enqueue job";
    // Mark job failed so UI shows a meaningful status.
    await supabase
      .from("scrapper_jobs")
      .update({ status: "failed", error_message: message })
      .eq("id", data.id);

    return NextResponse.json(
      { error: message, jobId: data.id },
      { status: 502 }
    );
  }

  return NextResponse.json({ jobId: data.id });
}

