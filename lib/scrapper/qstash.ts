import { Client } from "@upstash/qstash";

export function getQStashClient(): Client | null {
  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;
  // For multi-region QStash, you MUST use the regional endpoint that matches your token.
  // Example: https://qstash.eu-central-1.upstash.io
  const baseUrl =
    process.env.QSTASH_URL ||
    process.env.QSTASH_ENDPOINT ||
    process.env.QSTASH_REST_URL ||
    undefined;
  return new Client({ token, baseUrl });
}

export async function enqueueScrapperJob(jobId: string): Promise<void> {
  const client = getQStashClient();
  if (!client) {
    throw new Error("QSTASH_TOKEN is not configured");
  }

  const baseUrl = process.env.QSTASH_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error(
      "Set QSTASH_BASE_URL or NEXT_PUBLIC_APP_URL to your production URL"
    );
  }

  const url = new URL("/api/scrapper/worker", baseUrl).toString();

  await client.publishJSON({
    url,
    body: { jobId },
    // Avoid retry storms; we re-enqueue ourselves for continuation.
    retries: 3,
    // Best effort dedupe (doesn't block re-enqueue on continuation)
    // contentBasedDeduplication is supported by QStash; leaving off for compatibility.
  });
}

