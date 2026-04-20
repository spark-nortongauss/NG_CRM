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
    // Top-level phone fields
    phone?: string | null;
    mobile_phone?: string | null;
    corporate_phone?: string | null;
    direct_phone?: string | null;
    sanitized_phone?: string | null;
    // phone_numbers array — Apollo puts revealed phones here
    phone_numbers?: Array<{
      raw_number?: string | null;
      sanitized_number?: string | null;
      number?: string | null;
      value?: string | null;
      type?: string | null;
    }>;
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

// Matches literal placeholder strings Apollo uses before a phone is revealed.
// Does NOT match real phone numbers.
const PHONE_PLACEHOLDER_PATTERN = /(phone|number)\s+available/i;

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (PHONE_PLACEHOLDER_PATTERN.test(trimmed)) return null;
  // Must contain at least 6 digits to be a real phone number
  if ((trimmed.match(/\d/g) || []).length < 6) return null;
  return trimmed;
}

function extractPhone(person: ApolloEnrichResponse["person"]): string | null {
  if (!person) return null;

  // 1. Prefer the phone_numbers array — this is where Apollo puts revealed phones
  if (Array.isArray(person.phone_numbers) && person.phone_numbers.length > 0) {
    for (const item of person.phone_numbers) {
      const candidate =
        normalizePhone(item?.sanitized_number) ||
        normalizePhone(item?.raw_number) ||
        normalizePhone(item?.number) ||
        normalizePhone(item?.value);
      if (candidate) return candidate;
    }
  }

  // 2. Fall back to top-level phone fields in priority order
  return (
    normalizePhone(person.sanitized_phone) ||
    normalizePhone(person.mobile_phone) ||
    normalizePhone(person.direct_phone) ||
    normalizePhone(person.corporate_phone) ||
    normalizePhone(person.phone)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveNameParts(
  firstName: string | null,
  lastName: string | null,
  fullName: string | null
) {
  if (firstName && lastName) {
    return {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
    };
  }

  const normalizedFullName = fullName?.trim() || null;
  if (!normalizedFullName) {
    return { first_name: firstName, last_name: lastName, full_name: null };
  }

  const parts = normalizedFullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { first_name: firstName, last_name: lastName, full_name: null };
  }

  return {
    first_name: firstName || parts[0] || null,
    last_name: lastName || (parts.length > 1 ? parts.slice(1).join(" ") : null),
    full_name: normalizedFullName,
  };
}

// Build the Apollo People Match URL.
// reveal_phone_number=true is ALWAYS sent — the webhook requirement only applies
// to bulk/async flows, not single-contact /people/match calls.
function buildApolloUrl(): string {
  const url = new URL("https://api.apollo.io/api/v1/people/match");
  url.searchParams.set("reveal_personal_emails", "true");
  url.searchParams.set("reveal_phone_number", "true");
  return url.toString();
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

    // Build the match request body — only include identification params
    const matchBody: Record<string, unknown> = {};

    // Prefer LinkedIn URL as it's most accurate
    if (linkedinUrl) {
      matchBody.linkedin_url = linkedinUrl;
    } else if (apolloId) {
      matchBody.id = apolloId;
    } else {
      matchBody.first_name = firstName;
      matchBody.last_name = lastName;
      matchBody.organization_name = organizationName;
      if (domain) matchBody.domain = domain;
    }

    console.log("Apollo enrich request body:", JSON.stringify(matchBody, null, 2));

    const apolloUrl = buildApolloUrl();
    console.log("Apollo enrich URL:", apolloUrl);

    const makeApolloRequest = async (reqBody: Record<string, unknown>) =>
      fetch(apolloUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(reqBody),
      });

    const apolloResponse = await makeApolloRequest(matchBody);

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      console.error("Apollo enrich error:", errorText);

      let errorMessage = "Failed to enrich contact";
      if (apolloResponse.status === 401) errorMessage = "Invalid Apollo.io API key";
      else if (apolloResponse.status === 404) errorMessage = "Contact not found in Apollo database";
      else if (apolloResponse.status === 429) errorMessage = "Apollo rate limit exceeded";

      return NextResponse.json(
        { error: errorMessage, details: errorText },
        { status: apolloResponse.status }
      );
    }

    const data: ApolloEnrichResponse = await apolloResponse.json();

    // Log the FULL raw response to see every field Apollo returns
    console.log("Apollo FULL enrich response:", JSON.stringify(data, null, 2));

    if (!data.person) {
      return NextResponse.json(
        { error: "Contact not found in Apollo database" },
        { status: 404 }
      );
    }

    let person = data.person;

    // Dedicated phone field log for quick diagnosis
    console.log("Apollo phone fields for", person.name, ":", JSON.stringify({
      phone: person.phone,
      mobile_phone: person.mobile_phone,
      direct_phone: person.direct_phone,
      corporate_phone: person.corporate_phone,
      sanitized_phone: person.sanitized_phone,
      phone_numbers: person.phone_numbers,
    }, null, 2));

    // Extract email from available sources
    const email =
      person.email ||
      (person.personal_emails && person.personal_emails.length > 0
        ? person.personal_emails[0]
        : null);

    // Try to extract phone from the initial response
    let phone = extractPhone(person);

    // If no phone yet, poll up to 3 times — Apollo's reveal can be slightly async
    if (!phone && apolloId) {
      for (let attempt = 0; attempt < 3 && !phone; attempt++) {
        await sleep(1500);

        const pollResponse = await makeApolloRequest({ id: apolloId });
        if (!pollResponse.ok) continue;

        const pollData: ApolloEnrichResponse = await pollResponse.json();
        if (!pollData.person) continue;

        person = pollData.person;

        console.log(`Apollo poll attempt ${attempt + 1} phone fields:`, JSON.stringify({
          phone: person.phone,
          mobile_phone: person.mobile_phone,
          direct_phone: person.direct_phone,
          corporate_phone: person.corporate_phone,
          sanitized_phone: person.sanitized_phone,
          phone_numbers: person.phone_numbers,
        }, null, 2));

        phone = extractPhone(person);
      }
    }

    console.log("Final resolved phone:", phone);

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