import { NextRequest, NextResponse } from "next/server";

interface ApolloEnrichResponse {
  person: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    name: string | null;
    email: string | null;
    email_status: string | null;
    title: string | null;
    headline: string | null;
    linkedin_url: string | null;
    phone?: string | null;
    phone_numbers?: Array<{
      raw_number?: string | null;
      sanitized_number?: string | null;
      number?: string | null;
      value?: string | null;
      type?: string | null;
    }>;
    mobile_phone?: string | null;
    corporate_phone?: string | null;
    personal_emails?: string[];
    organization?: {
      name: string | null;
      website_url: string | null;
    };
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
}

const PHONE_PLACEHOLDER_PATTERN = /(phone|number)\s+available/i;

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (PHONE_PLACEHOLDER_PATTERN.test(trimmed)) return null;
  return trimmed;
}

function extractPhone(person: ApolloEnrichResponse["person"]): string | null {
  if (!person) return null;

  if (Array.isArray(person.phone_numbers)) {
    for (const item of person.phone_numbers) {
      const candidate =
        normalizePhone(item?.sanitized_number) ||
        normalizePhone(item?.raw_number) ||
        normalizePhone(item?.number) ||
        normalizePhone(item?.value);
      if (candidate) return candidate;
    }
  }

  return (
    normalizePhone(person.mobile_phone) ||
    normalizePhone(person.corporate_phone) ||
    normalizePhone(person.phone)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApolloWebhookUrl(): string | null {
  const webhookUrl = process.env.APOLLO_WEBHOOK_URL?.trim();
  if (!webhookUrl) return null;

  try {
    const parsed = new URL(webhookUrl);
    if (parsed.protocol !== "https:") {
      console.warn(
        "APOLLO_WEBHOOK_URL must use HTTPS. Ignoring non-HTTPS webhook URL."
      );
      return null;
    }
    return parsed.toString();
  } catch {
    console.warn("APOLLO_WEBHOOK_URL is invalid and will be ignored.");
    return null;
  }
}

function deriveNameParts(
  firstName: string | null,
  lastName: string | null,
  fullName: string | null
) {
  if (firstName && lastName) {
    return { first_name: firstName, last_name: lastName, full_name: `${firstName} ${lastName}`.trim() };
  }

  const normalizedFullName = fullName?.trim() || null;
  if (!normalizedFullName) {
    return { first_name: firstName, last_name: lastName, full_name: null };
  }

  const parts = normalizedFullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { first_name: firstName, last_name: lastName, full_name: null };
  }

  const derivedFirstName = firstName || parts[0] || null;
  const derivedLastName = lastName || (parts.length > 1 ? parts.slice(1).join(" ") : null);

  return {
    first_name: derivedFirstName,
    last_name: derivedLastName,
    full_name: normalizedFullName,
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.APOLLO_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Apollo.io API key is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { apolloId, firstName, lastName, linkedinUrl, organizationName, domain } = body;

    if (!apolloId && !linkedinUrl && !(firstName && organizationName)) {
      return NextResponse.json(
        { error: "Need either Apollo ID, LinkedIn URL, or name + organization to enrich" },
        { status: 400 }
      );
    }

    // Build the match request body - only include identification params
    const matchBody: Record<string, unknown> = {};

    // Prefer LinkedIn URL as it's most accurate
    if (linkedinUrl) {
      matchBody.linkedin_url = linkedinUrl;
    } else if (apolloId) {
      matchBody.id = apolloId;
    } else {
      // Fall back to name + organization matching
      matchBody.first_name = firstName;
      matchBody.last_name = lastName;
      matchBody.organization_name = organizationName;
      if (domain) {
        matchBody.domain = domain;
      }
    }

    console.log("Apollo enrich request body:", JSON.stringify(matchBody, null, 2));

    const webhookUrl = getApolloWebhookUrl();
    const shouldRequestPhoneReveal = Boolean(webhookUrl);

    // Build the URL with query parameters as per Apollo docs
    // reveal_personal_emails=true for emails (synchronous)
    // reveal_phone_number only when APOLLO_WEBHOOK_URL is configured (Apollo requirement)
    const url = new URL("https://api.apollo.io/api/v1/people/match");
    url.searchParams.set("reveal_personal_emails", "true");
    if (shouldRequestPhoneReveal) {
      url.searchParams.set("reveal_phone_number", "true");
      url.searchParams.set("webhook_url", webhookUrl as string);
    }

    const callApollo = async () =>
      fetch(url.toString(), {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(matchBody),
      });

    console.log("Apollo enrich URL:", url.toString());

    // Call Apollo's People Match API for enrichment
    let apolloResponse = await callApollo();

    // Safety net: if Apollo rejects phone reveal due to webhook validation, retry without phone reveal
    if (!apolloResponse.ok && shouldRequestPhoneReveal) {
      const errorText = await apolloResponse.text();
      const needsWebhook = /webhook_url/i.test(errorText) && /reveal_phone_number/i.test(errorText);
      if (needsWebhook) {
        console.warn("Apollo phone reveal failed due to webhook_url requirement. Retrying without phone reveal.");
        const fallbackUrl = new URL("https://api.apollo.io/api/v1/people/match");
        fallbackUrl.searchParams.set("reveal_personal_emails", "true");
        apolloResponse = await fetch(fallbackUrl.toString(), {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "x-api-key": apiKey,
          },
          body: JSON.stringify(matchBody),
        });
      } else {
        // Recreate response stream body for standard error handling
        apolloResponse = new Response(errorText, {
          status: apolloResponse.status,
          statusText: apolloResponse.statusText,
          headers: apolloResponse.headers,
        });
      }
    }

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      console.error("Apollo enrich error:", errorText);
      
      let errorMessage = "Failed to enrich contact";
      if (apolloResponse.status === 401) {
        errorMessage = "Invalid Apollo.io API key";
      } else if (apolloResponse.status === 404) {
        errorMessage = "Contact not found in Apollo database";
      } else if (apolloResponse.status === 429) {
        errorMessage = "Apollo rate limit exceeded";
      }

      return NextResponse.json(
        { error: errorMessage, details: errorText },
        { status: apolloResponse.status }
      );
    }

    const data: ApolloEnrichResponse = await apolloResponse.json();
    
    console.log("Apollo enrich response:", JSON.stringify(data, null, 2));

    if (!data.person) {
      return NextResponse.json(
        { error: "Contact not found in Apollo database" },
        { status: 404 }
      );
    }

    let person = data.person;

    // Extract email from available sources
    const email = person.email || 
      (person.personal_emails && person.personal_emails.length > 0 ? person.personal_emails[0] : null);

    // Phone reveal can arrive slightly later; poll briefly to capture it before responding.
    let phone = extractPhone(person);
    if (!phone && shouldRequestPhoneReveal && apolloId) {
      const followUpUrl = new URL("https://api.apollo.io/api/v1/people/match");
      followUpUrl.searchParams.set("reveal_personal_emails", "true");

      const followUpBody = JSON.stringify({ id: apolloId });

      for (let attempt = 0; attempt < 2 && !phone; attempt++) {
        await sleep(1200);

        const followUpResponse = await fetch(followUpUrl.toString(), {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "x-api-key": apiKey,
          },
          body: followUpBody,
        });

        if (!followUpResponse.ok) continue;
        const followUpData: ApolloEnrichResponse = await followUpResponse.json();
        if (!followUpData.person) continue;

        person = followUpData.person;
        phone = extractPhone(person);
      }
    }

    const normalizedName = deriveNameParts(person.first_name, person.last_name, person.name);

    return NextResponse.json({
      success: true,
      contact: {
        id: person.id,
        first_name: normalizedName.first_name,
        last_name: normalizedName.last_name,
        full_name: normalizedName.full_name,
        email,
        email_status: person.email_status,
        job_title: person.title || person.headline,
        linkedin_url: person.linkedin_url,
        phone,
        city: person.city,
        state: person.state,
        country: person.country,
        organization_name: person.organization?.name || organizationName,
      },
    });
  } catch (error) {
    console.error("Apollo enrich error:", error);
    return NextResponse.json(
      { error: "Failed to enrich contact" },
      { status: 500 }
    );
  }
}
