import type { ScrapperSearchResult } from "@/lib/scrapper/types";
import { extractDomain } from "@/lib/scrapper/company-filter";

type RapidGoogleResult =
  | {
      title?: string;
      link?: string;
      snippet?: string;
      description?: string;
      url?: string;
      href?: string;
      text?: string;
      name?: string;
      headline?: string;
    }
  | Record<string, unknown>;

type RapidGoogleResponse = {
  results?: RapidGoogleResult[];
  data?: RapidGoogleResult[];
  items?: RapidGoogleResult[];
  organic?: RapidGoogleResult[];
} & Record<string, unknown>;

export async function searchGoogleRapidApi(params: {
  query: string;
  country: string;
  num: number; // results per page (<=10)
  start: number; // pagination start
  timeFilter?: string;
  timeoutMs: number;
}): Promise<ScrapperSearchResult[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  const host = process.env.GOOGLE_SEARCH_HOST || "google-search116.p.rapidapi.com";
  const baseUrl = process.env.GOOGLE_SEARCH_URL || "https://google-search116.p.rapidapi.com/";

  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY is not configured");
  }

  const url = new URL(baseUrl);
  url.searchParams.set("query", params.query);
  url.searchParams.set("num", String(params.num));
  url.searchParams.set("start", String(params.start));
  // API supports `tbs` for time filters (qdr:d, etc.)
  if (params.timeFilter) url.searchParams.set("tbs", params.timeFilter);
  // Some providers accept `gl` as country. If unsupported it is ignored.
  url.searchParams.set("gl", params.country);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), params.timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": host,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Google Search API failed: ${res.status} ${text}`.trim());
    }

    const data = (await res.json()) as RapidGoogleResponse;
    const results =
      data.results ??
      data.data ??
      data.items ??
      data.organic ??
      ([] as RapidGoogleResult[]);

    if (!Array.isArray(results) || results.length === 0) return [];

    const mapped: ScrapperSearchResult[] = results.map((r, idx) => {
      const rr = r as RapidGoogleResult;
      const title =
        (typeof rr.title === "string" && rr.title) ||
        (typeof rr.name === "string" && rr.name) ||
        (typeof rr.headline === "string" && rr.headline) ||
        "";
      const urlStr =
        (typeof rr.link === "string" && rr.link) ||
        (typeof rr.url === "string" && rr.url) ||
        (typeof rr.href === "string" && rr.href) ||
        "";
      const snippet =
        (typeof rr.snippet === "string" && rr.snippet) ||
        (typeof rr.description === "string" && rr.description) ||
        (typeof rr.text === "string" && rr.text) ||
        "";

      return {
        search_position: params.start + idx + 1,
        title,
        url: urlStr,
        snippet,
        search_country: params.country,
        search_query: params.query,
        domain: extractDomain(urlStr),
      };
    });

    return mapped.filter((m) => !!m.url && !!m.domain);
  } finally {
    clearTimeout(t);
  }
}

