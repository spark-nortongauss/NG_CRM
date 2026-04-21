import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getHeaderContentType(request: NextRequest): string {
  return request.headers.get("content-type")?.toLowerCase() || "";
}

async function parseApolloWebhookPayload(request: NextRequest): Promise<unknown> {
  const contentType = getHeaderContentType(request);

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  const rawBody = await request.text();
  try {
    return JSON.parse(rawBody);
  } catch {
    return { raw: rawBody };
  }
}

function maskIp(ip: string | null): string | null {
  if (!ip) return null;
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  return ip;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Apollo webhook endpoint is live",
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await parseApolloWebhookPayload(request);
    const supabase = createAdminClient();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip");

    // Keep logs lightweight and avoid dumping full PII payloads.
    const payloadKeys =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? Object.keys(payload as Record<string, unknown>)
        : [];

    console.log("Apollo webhook received", {
      payloadKeys,
      userAgent: request.headers.get("user-agent"),
      sourceIp: maskIp(ip),
      timestamp: new Date().toISOString(),
    });

    // Apollo phone reveal payload contains people[].id and people[].phone_numbers.
    const people =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as { people?: unknown }).people
        : undefined;

    if (Array.isArray(people)) {
      for (const person of people) {
        if (!person || typeof person !== "object" || Array.isArray(person)) continue;

        const apolloId =
          typeof (person as { id?: unknown }).id === "string"
            ? ((person as { id?: string }).id ?? "").trim()
            : "";
        const phoneNumbers = (person as { phone_numbers?: unknown }).phone_numbers;

        if (!apolloId || !Array.isArray(phoneNumbers)) continue;

        for (const phoneEntry of phoneNumbers) {
          if (
            !phoneEntry ||
            typeof phoneEntry !== "object" ||
            Array.isArray(phoneEntry)
          ) {
            continue;
          }

          const candidate =
            (phoneEntry as { sanitized_number?: unknown }).sanitized_number ??
            (phoneEntry as { raw_number?: unknown }).raw_number;
          const phone = typeof candidate === "string" ? candidate.trim() : "";

          if (!phone) continue;

          const { error } = await supabase.from("apollo_phone_cache").upsert(
            {
              apollo_id: apolloId,
              phone,
            },
            { onConflict: "apollo_id" }
          );

          if (error) {
            console.error("Failed to persist Apollo phone cache row", {
              apolloId,
              error: error.message,
            });
          } else {
            console.log("Stored Apollo phone cache row", { apolloId });
          }

          break;
        }
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("Apollo webhook parse error:", error);
    // Always return 200-ish success shape so provider does not retry forever for parse edge-cases.
    return NextResponse.json({ success: true, received: false });
  }
}
