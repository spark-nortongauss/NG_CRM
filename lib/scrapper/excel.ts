import * as XLSX from "xlsx";

import type { ScrapperSearchResult } from "@/lib/scrapper/types";

export function buildExcelBuffer(results: ScrapperSearchResult[]): Buffer {
  const rows = results.map((r) => ({
    Title: r.title,
    "Relevance Score": r.relevance_score ?? "",
    URL: r.url,
    Description: r.snippet,
    Domain: r.domain,
    "Search Position": r.search_position,
    "Search Country": r.search_country,
    "Search Query": r.search_query,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");

  // Return as Buffer for easy upload/response
  const array = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return Buffer.from(array);
}

