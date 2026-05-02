"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Play, Square, Download, AlertCircle, AlertTriangle } from "lucide-react";

type RunStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

interface ProgressData {
  status?: string;
  queryIndex?: number;
  countryIndex?: number;
  start?: number;
  collectedCount?: number;
  uniqueDomainsCount?: number;
  lastMessage?: string;
  downloadUrl?: string;
  message?: string;
}

export default function ScrapperApiPage() {
  const [queriesCount, setQueriesCount] = useState<number>(5);
  const [queries, setQueries] = useState<string[]>(
    Array.from({ length: 5 }, () => "")
  );
  const [countriesText, setCountriesText] = useState<string>("AE");
  const [resultsPerQuery, setResultsPerQuery] = useState<number>(30);
  const [minScore, setMinScore] = useState<number>(35);
  const [timeFilter, setTimeFilter] = useState<string>("");
  const [requestDelayMs, setRequestDelayMs] = useState<number>(0);

  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  // Resize query inputs array when queriesCount changes
  useEffect(() => {
    setQueries((prev) => {
      const next = prev.slice(0, queriesCount);
      while (next.length < queriesCount) next.push("");
      return next;
    });
  }, [queriesCount]);

  const countries = useMemo(() => {
    return countriesText
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
  }, [countriesText]);

  const canRun = useMemo(() => {
    const nonEmptyQueries = queries.map((q) => q.trim()).filter(Boolean);
    return nonEmptyQueries.length > 0 && countries.length > 0 && runStatus !== "running";
  }, [queries, countries, runStatus]);

  const startRun = async () => {
    setRunStatus("running");
    setErrorMsg(null);
    setDownloadUrl(null);
    setProgress(null);
    setWarnings([]);

    const nonEmptyQueries = queries.map((q) => q.trim()).filter(Boolean);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/scrapper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: nonEmptyQueries,
          countries,
          resultsPerQuery,
          minScore,
          timeFilter,
          requestDelayMs,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      // Read the SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || ""; // Keep incomplete last part

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventType = "message";
          let eventData = "";

          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              eventData = line.slice(6);
            }
          }

          if (!eventData) continue;

          try {
            const parsed = JSON.parse(eventData) as ProgressData;

            switch (eventType) {
              case "progress":
                setProgress(parsed);
                break;
              case "complete":
                setProgress(parsed);
                setDownloadUrl(parsed.downloadUrl || null);
                setRunStatus("completed");
                // Auto-download the Excel file immediately on completion
                // (works even if this tab is in the background)
                if (parsed.downloadUrl) {
                  const a = document.createElement("a");
                  a.href = parsed.downloadUrl;
                  a.download = "scrapper-results.xlsx";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }
                break;
              case "error":
                setErrorMsg(parsed.message || "Unknown error");
                setRunStatus("failed");
                break;
              case "cancelled":
                setRunStatus("cancelled");
                break;
              case "warning":
                setWarnings((prev) => [...prev.slice(-19), parsed.message || "Warning"]);
                break;
            }
          } catch {
            // Ignore malformed data
          }
        }
      }

      // If we finished reading without getting a terminal event, treat as complete
      if (runStatus === "running") {
        // This could happen if stream just ended — check last known progress
        setRunStatus((prev) => (prev === "running" ? "completed" : prev));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setRunStatus("cancelled");
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Failed to run");
        setRunStatus("failed");
      }
    } finally {
      abortRef.current = null;
    }
  };

  const cancelRun = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setRunStatus("cancelled");
    }
  };

  const downloadExcel = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  const isActive = runStatus === "running";

  return (
    <div className="w-full px-3 sm:px-6 py-4 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        {/* ── Header Card ── */}
        <div className="rounded-xl border border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                Scrapper API (Google Search → Filter → Excel)
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Super-admin tool to run searches and download an Excel result. Please stay on this page while the job is running.
              </p>
            </div>
            {/* Action buttons — stack vertically on mobile, row on sm+ */}
            <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={startRun}
                disabled={!canRun}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 sm:py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run
              </button>
              <button
                onClick={cancelRun}
                disabled={!isActive}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-ng-dark-elevated px-4 py-2.5 sm:py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ng-dark-hover disabled:opacity-50 transition-colors"
              >
                <Square className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={downloadExcel}
                disabled={!downloadUrl || runStatus !== "completed"}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 sm:py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span className="whitespace-nowrap">Download Excel</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
              <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="break-words">{errorMsg}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Queries + Parameters Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Search Queries — spans 2 columns on lg */}
          <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Search Queries
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Count
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={queriesCount}
                  onChange={(e) => setQueriesCount(Number(e.target.value))}
                  disabled={isActive}
                  className="w-20 rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-2 py-1 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {queries.map((q, idx) => (
                <div key={idx} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 sm:w-8 text-xs text-gray-400 dark:text-gray-500 text-right shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    value={q}
                    onChange={(e) => {
                      const v = e.target.value;
                      setQueries((prev) => {
                        const next = [...prev];
                        next[idx] = v;
                        return next;
                      });
                    }}
                    placeholder={`Query ${idx + 1}`}
                    disabled={isActive}
                    className="flex-1 min-w-0 rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Parameters — single column on lg */}
          <div className="rounded-xl border border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card p-4 sm:p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Parameters
            </h2>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Countries (comma-separated ISO codes)
              </label>
              <input
                value={countriesText}
                onChange={(e) => setCountriesText(e.target.value)}
                placeholder="AE, SA, QA"
                disabled={isActive}
                className="w-full rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Results / query
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={resultsPerQuery}
                  onChange={(e) => setResultsPerQuery(Number(e.target.value))}
                  disabled={isActive}
                  className="w-full rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">
                  Min score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  disabled={isActive}
                  className="w-full rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Time filter (optional)
              </label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                disabled={isActive}
                className="w-full rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
              >
                <option value="">All time</option>
                <option value="qdr:d">Last day</option>
                <option value="qdr:w">Last week</option>
                <option value="qdr:m">Last month</option>
                <option value="qdr:y">Last year</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Delay between calls (ms)
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                value={requestDelayMs}
                onChange={(e) => setRequestDelayMs(Number(e.target.value))}
                disabled={isActive}
                className="w-full rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Best-effort pacing between API calls.
              </p>
            </div>
          </div>
        </div>

        {/* ── Job Status Card ── */}
        <div className="rounded-xl border border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Job Status
          </h2>
          {runStatus === "idle" ? (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No job started yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-6 gap-y-2">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>{" "}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {progress?.status || runStatus}
                  </span>
                </div>
                {progress?.collectedCount !== undefined && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Collected:
                    </span>{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {progress.collectedCount}
                    </span>
                  </div>
                )}
                {progress?.uniqueDomainsCount !== undefined && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Unique domains:
                    </span>{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {progress.uniqueDomainsCount}
                    </span>
                  </div>
                )}
              </div>
              {progress?.lastMessage && (
                <p className="text-gray-600 dark:text-gray-300 break-words">
                  {progress.lastMessage}
                </p>
              )}
              {isActive && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Running — please stay on this page until complete</span>
                </div>
              )}
              {runStatus === "completed" && (
                <p className="text-green-700 dark:text-green-300">
                  Completed. Click &ldquo;Download Excel&rdquo;.
                </p>
              )}
              {runStatus === "cancelled" && (
                <p className="text-amber-700 dark:text-amber-300">
                  Cancelled.
                </p>
              )}
              {runStatus === "failed" && (
                <p className="text-red-700 dark:text-red-300">
                  Failed. {errorMsg ? `(${errorMsg})` : ""}
                </p>
              )}

              {/* Warnings log */}
              {warnings.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Warnings ({warnings.length})</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-600 dark:text-amber-400 break-words">
                        {w}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
