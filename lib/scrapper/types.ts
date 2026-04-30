export type ScrapperJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type ScrapperSearchResult = {
  search_position: number;
  title: string;
  url: string;
  snippet: string;
  search_country: string;
  search_query: string;
  domain: string;
  relevance_score?: number;
};

export type ScrapperJobParams = {
  queries: string[];
  countries: string[]; // ISO 3166-1 alpha-2, e.g. ["AE"]
  resultsPerQuery: number; // total results desired per query-country
  timeFilter?: string; // qdr:h|qdr:d|qdr:w|qdr:m|qdr:y|"" (all)
  requestDelayMs?: number; // optional pacing between calls (best-effort)
  minScore?: number; // relevance score threshold
};

export type ScrapperJobProgress = {
  queryIndex: number;
  countryIndex: number;
  start: number; // pagination start index
  collectedCount: number;
  uniqueDomainsCount: number;
  lastMessage?: string;
};

