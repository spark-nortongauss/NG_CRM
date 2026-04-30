"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Play, Square, Download, AlertCircle } from "lucide-react";
import type { ScrapperJobProgress } from "@/lib/scrapper/types";

type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

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

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobProgress, setJobProgress] = useState<ScrapperJobProgress | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

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
    return nonEmptyQueries.length > 0 && countries.length > 0 && !isSubmitting;
  }, [queries, countries, isSubmitting]);

  // Poll job status while running/pending
  useEffect(() => {
    if (!jobId) return;
    if (!jobStatus || jobStatus === "pending" || jobStatus === "running") {
      const timer = setInterval(async () => {
        try {
          const res = await fetch(`/api/scrapper/jobs/${jobId}`, {
            cache: "no-store",
          });
          const data = await res.json();
          if (!res.ok) {
            setJobError(data.error || "Failed to fetch job status");
            return;
          }
          setJobStatus(data.job.status);
          setJobProgress(data.job.progress);
          setJobError(data.job.error_message || null);
        } catch (e) {
          setJobError(e instanceof Error ? e.message : "Polling failed");
        }
      }, 1500);
      return () => clearInterval(timer);
    }
  }, [jobId, jobStatus]);

  const startJob = async () => {
    setIsSubmitting(true);
    setJobError(null);
    setJobId(null);
    setJobStatus(null);
    setJobProgress(null);

    const nonEmptyQueries = queries.map((q) => q.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/scrapper/jobs", {
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
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start job");

      setJobId(data.jobId);
      setJobStatus("pending");
    } catch (e) {
      setJobError(e instanceof Error ? e.message : "Failed to start job");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelJob = async () => {
    if (!jobId) return;
    setIsCancelling(true);
    setJobError(null);
    try {
      const res = await fetch(`/api/scrapper/jobs/${jobId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      setJobStatus(data.job.status);
    } catch (e) {
      setJobError(e instanceof Error ? e.message : "Failed to cancel job");
    } finally {
      setIsCancelling(false);
    }
  };

  const download = () => {
    if (!jobId) return;
    window.location.href = `/api/scrapper/jobs/${jobId}/download`;
  };

  return (
    <div className="w-full px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Scrapper API (Google Search → Filter → Excel)
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Super-admin tool to run long searches in the background and download an Excel result when finished.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={startJob}
                disabled={!canRun || (jobStatus === "running" || jobStatus === "pending")}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run
              </button>
              <button
                onClick={cancelJob}
                disabled={
                  !jobId ||
                  isCancelling ||
                  jobStatus === "completed" ||
                  jobStatus === "failed" ||
                  jobStatus === "cancelled"
                }
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-ng-dark-elevated px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ng-dark-hover disabled:opacity-50"
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Cancel
              </button>
              <button
                onClick={download}
                disabled={!jobId || jobStatus !== "completed"}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download Excel
              </button>
            </div>
          </div>

          {jobError && (
            <div className="mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4" />
                <span>{jobError}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card p-6">
            <div className="flex items-center justify-between gap-4">
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
                  className="w-20 rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {queries.map((q, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-8 text-xs text-gray-400 dark:text-gray-500">
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
                    className="flex-1 rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card p-6 space-y-4">
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
                className="w-full rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
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
                  className="w-full rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
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
                  className="w-full rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
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
                className="w-full rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
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
                className="w-full rounded-md border border-gray-300 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-bg px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Best-effort pacing. Background execution is chunked per page to avoid timeouts.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Job Status
          </h2>
          {!jobId ? (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No job started yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Job ID:</span>{" "}
                  <span className="font-mono text-gray-900 dark:text-gray-100">
                    {jobId}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>{" "}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {jobStatus || "…"}
                  </span>
                </div>
                {jobProgress?.collectedCount !== undefined && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Collected:
                    </span>{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {jobProgress.collectedCount}
                    </span>
                  </div>
                )}
                {jobProgress?.uniqueDomainsCount !== undefined && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Unique domains:
                    </span>{" "}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {jobProgress.uniqueDomainsCount}
                    </span>
                  </div>
                )}
              </div>
              {jobProgress?.lastMessage && (
                <p className="text-gray-600 dark:text-gray-300">
                  {jobProgress.lastMessage}
                </p>
              )}
              {(jobStatus === "running" || jobStatus === "pending") && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Running in background (safe to leave this page)</span>
                </div>
              )}
              {jobStatus === "completed" && (
                <p className="text-green-700 dark:text-green-300">
                  Completed. Click “Download Excel”.
                </p>
              )}
              {jobStatus === "cancelled" && (
                <p className="text-amber-700 dark:text-amber-300">
                  Cancelled.
                </p>
              )}
              {jobStatus === "failed" && (
                <p className="text-red-700 dark:text-red-300">
                  Failed. {jobError ? `(${jobError})` : ""}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
