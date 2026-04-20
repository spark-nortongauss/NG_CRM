import { NextRequest, NextResponse } from "next/server";

interface ApolloPerson {
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
  mobile_phone?: string | null;
  corporate_phone?: string | null;
  direct_phone?: string | null;
  sanitized_phone?: string | null;
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
}

interface ApolloMatchResponse {
  person: ApolloPerson | null;
}

interface ApolloPeopleGetResponse {
  person: ApolloPerson | null;
}

// Matches literal placeholder strings Apollo uses before a phone is revealed.
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

function extractPhone(person: ApolloPerson | null): string | null {
  if (!person) return null;

  // 1. phone_numbers array — Apollo puts revealed phones here
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

  // 2. Top-level phone fields
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

/**
 * Step 1 — People Match (email reveal only, NO reveal_phone_number param).
 * Apollo requires a webhook for reveal_phone_number on lower-tier plans.
 * We get phone data separately via the People GET endpoint instead.
 */
async function matchPerson(
  matchBody: Record<string, unknown>,
  apiKey: string
): Promise<ApolloPerson | null> {
  const url = new URL("https://api.apollo.io/api/v1/people/match");
  url.searchParams.set("reveal_personal_emails", "true");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(matchBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw Object.assign(new Error(text), { status: response.status });
  }

  const data: ApolloMatchResponse = await response.json();
  console.log("Apollo match response:", JSON.stringify(data, null, 2));
  return data.person ?? null;
}

/**
 * Step 2 — People GET by ID.
 * Apollo's GET /people/{id} returns phone_numbers without requiring
 * reveal_phone_number or a webhook — works on all plan tiers.
 */
async function getPersonById(
  id: string,
  apiKey: string
): Promise<ApolloPerson | null> {
  const response = await fetch(`https://api.apollo.io/api/v1/people/${id}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    console.warn(`Apollo People GET failed for id ${id}: ${response.status}`);
    return null;
  }

  const data: ApolloPeopleGetResponse = await response.json();
  console.log("Apollo People GET response:", JSON.stringify(data, null, 2));
  return data.person ?? null;
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

    // Build the match request body
    const matchBody: Record<string, unknown> = {};
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

    console.log("Apollo enrich match body:", JSON.stringify(matchBody, null, 2));

    // ── Step 1: Match — get full profile + email ───────────────────────────────
    let person: ApolloPerson | null;
    try {
      person = await matchPerson(matchBody, apiKey);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status ?? 500;
      const message =
        status === 401 ? "Invalid Apollo.io API key" :
        status === 404 ? "Contact not found in Apollo database" :
        status === 429 ? "Apollo rate limit exceeded" :
        "Failed to enrich contact";
      return NextResponse.json(
        { error: message, details: (err as Error).message },
        { status }
      );
    }

    if (!person) {
      return NextResponse.json(
        { error: "Contact not found in Apollo database" },
        { status: 404 }
      );
    }

    // ── Step 2: GET by ID to retrieve phone (no webhook needed) ───────────────
    const personId = person.id || apolloId;
    let phone = extractPhone(person);

    if (!phone && personId) {
      await sleep(500);
      const detailedPerson = await getPersonById(personId, apiKey);

      if (detailedPerson) {
        person = { ...person, ...detailedPerson };
        phone = extractPhone(person);
      }

      // Retry once more if still no phone
      if (!phone) {
        await sleep(1500);
        const retryPerson = await getPersonById(personId, apiKey);
        if (retryPerson) {
          person = { ...person, ...retryPerson };
          phone = extractPhone(person);
        }
      }
    }

    console.log("Apollo phone fields:", JSON.stringify({
      phone: person.phone,
      mobile_phone: person.mobile_phone,
      direct_phone: person.direct_phone,
      corporate_phone: person.corporate_phone,
      sanitized_phone: person.sanitized_phone,
      phone_numbers: person.phone_numbers,
    }, null, 2));
    console.log("Final resolved phone:", phone);

    // Extract email
    const email =
      person.email ||
      (person.personal_emails && person.personal_emails.length > 0
        ? person.personal_emails[0]
        : null);

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