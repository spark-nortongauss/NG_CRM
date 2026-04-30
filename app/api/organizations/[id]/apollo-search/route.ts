import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/role-check";

// Apollo People Search API response format
// Note: This endpoint returns limited data - use People Enrichment for full contact details
interface ApolloSearchPerson {
  id: string;
  first_name: string | null;
  last_name_obfuscated: string | null; // Partial last name (e.g., "Zh***g")
  title: string | null;
  last_refreshed_at: string | null;
  has_email: boolean;
  has_city: boolean;
  has_state: boolean;
  has_country: boolean;
  has_direct_phone: string | null; // "Yes" or "Maybe: please request..."
  organization?: {
    id: string | null;
    name: string | null;
    website_url: string | null;
    primary_domain: string | null;
    sanitized_phone: string | null;
  };
}

interface ApolloSearchApiResponse {
  people: ApolloSearchPerson[];
  total_entries: number;
}

interface TransformedContact {
  id: string;
  first_name: string | null;
  last_name_obfuscated: string | null;
  last_name?: string | null;
  full_name?: string | null;
  job_title: string | null;
  organization_name: string | null;
  organization_website: string | null;
  has_email: boolean;
  has_direct_phone: boolean;
  last_refreshed_at: string | null;
  linkedin_url?: string | null;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    try {
      const urlObj = new URL(`https://${url}`);
      return urlObj.hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }
}

function normalizeDomain(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.replace(/^www\./, "");
}

/**
 * STRICTEST filter: pass only if the person's current organization matches
 * either by Apollo org ID (when we have it) OR by domain.
 *
 * Using org ID is more reliable than domain — Apollo can have multiple orgs
 * sharing similar domains (subsidiaries, rebrands), but the ID is exact.
 */
function personMatchesOrganization(
  person: ApolloSearchPerson,
  expectedDomain: string,
  apolloOrgId: string | null
): boolean {
  // If we resolved an Apollo org ID, require it to match exactly.
  // This is the strongest signal — domain can be ambiguous, IDs are not.
  if (apolloOrgId && person.organization?.id) {
    return person.organization.id === apolloOrgId;
  }

  // Fallback: domain match (used when org ID lookup failed)
  const expected = normalizeDomain(expectedDomain);
  if (!expected) return false;

  const primary = normalizeDomain(person.organization?.primary_domain);
  if (primary && primary === expected) return true;

  const website = normalizeDomain(
    person.organization?.website_url
      ? extractDomain(person.organization.website_url)
      : null
  );
  if (website && website === expected) return true;

  return false;
}

interface ApolloOrgResult {
  id: string;
  primaryDomain: string | null;
}

async function fetchApolloOrganizationByDomain(
  apiKey: string,
  domain: string
): Promise<ApolloOrgResult | null> {
  try {
    const response = await fetch(
      "https://api.apollo.io/api/v1/mixed_companies/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          accept: "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          q_organization_domains_list: [domain],
          per_page: 5,
          page: 1,
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();

    const orgs: Array<{
      id?: string;
      organization_id?: string;
      primary_domain?: string;
      website_url?: string;
    }> = Array.isArray(data?.organizations)
      ? data.organizations
      : Array.isArray(data?.companies)
        ? data.companies
        : [];

    const expected = normalizeDomain(domain);
    if (!expected || orgs.length === 0) return null;

    // Prefer exact primary_domain match over partial/fuzzy
    const exact = orgs.find((o) => normalizeDomain(o.primary_domain) === expected);
    const best = exact ?? orgs[0];
    const id = (best?.id ?? best?.organization_id) as string | undefined;

    if (typeof id !== "string" || !id.trim()) return null;
    return { id: id.trim(), primaryDomain: normalizeDomain(best.primary_domain) };
  } catch {
    return null;
  }
}

async function fetchApolloFullNameById(
  apiKey: string,
  personId: string
): Promise<{
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  linkedin_url: string | null;
} | null> {
  try {
    const response = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        accept: "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ id: personId }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const person = data?.person;
    if (!person) return null;

    const normalizedFullName =
      typeof person.name === "string" ? person.name.trim() : null;
    const normalizedFirstName =
      typeof person.first_name === "string"
        ? person.first_name.trim() || null
        : null;
    const normalizedLastName =
      typeof person.last_name === "string"
        ? person.last_name.trim() || null
        : null;

    return {
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      full_name: normalizedFullName || null,
      linkedin_url:
        typeof person.linkedin_url === "string" ? person.linkedin_url : null,
    };
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const supabase = await createClient();

  try {
    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Apollo.io API key is not configured. Please add APOLLO_API_KEY to your .env.local file.",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { perPage = 10 } = body;

    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select(
        "org_id, legal_name, website_url, primary_email, primary_phone_e164"
      )
      .eq("org_id", id)
      .single();

    if (orgError) {
      if (orgError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    if (!organization.website_url) {
      return NextResponse.json(
        { error: "Organization does not have a website URL configured" },
        { status: 400 }
      );
    }

    const domain = extractDomain(organization.website_url);
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain) {
      return NextResponse.json(
        { error: "Organization website URL domain is invalid" },
        { status: 400 }
      );
    }

    // Step 1: Resolve Apollo's own org ID for this domain.
    // When available, we use org ID as the primary filter — it's unambiguous.
    const apolloOrg = await fetchApolloOrganizationByDomain(apiKey, normalizedDomain);
    const apolloOrganizationId = apolloOrg?.id ?? null;

    // Step 2: Search people.
    // We use TWO complementary Apollo-side filters:
    //   a) q_organization_domains_list  — domain-based hint (current or past employer)
    //   b) organization_ids             — Apollo org ID (narrows to a specific company record)
    //
    // Apollo treats both as AND when combined, which is stricter than either alone.
    // We then apply our own post-filter to remove any stragglers Apollo still returns.

    const desiredCount = Math.min(Math.max(perPage, 1), 100);
    const maxPages = 5;
    const contacts: ApolloSearchPerson[] = [];
    let totalEntries: number | null = null;
    let filteredOutCount = 0;

    for (
      let page = 1;
      page <= maxPages && contacts.length < desiredCount;
      page++
    ) {
      const requestBody: Record<string, unknown> = {
        q_organization_domains_list: [normalizedDomain],
        per_page: desiredCount,
        page,
      };

      // Add org ID constraint when available — this is the key improvement.
      // Apollo's organization_ids[] restricts to people currently employed at
      // that specific company record, not just anyone who ever had that domain.
      if (apolloOrganizationId) {
        requestBody.organization_ids = [apolloOrganizationId];
      }

      const apolloResponse = await fetch(
        "https://api.apollo.io/api/v1/mixed_people/api_search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            accept: "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!apolloResponse.ok) {
        const errorText = await apolloResponse.text();
        let errorMessage = "Apollo API request failed";

        if (apolloResponse.status === 401) {
          errorMessage =
            "Invalid Apollo.io API key. Note: The People Search API requires a MASTER API key (not a regular API key). Go to Apollo Settings > API Keys > Create Master Key.";
        } else if (apolloResponse.status === 403) {
          errorMessage =
            "Apollo.io API access forbidden - check your subscription or ensure you're using a Master API key";
        } else if (apolloResponse.status === 429) {
          errorMessage =
            "Apollo.io rate limit exceeded - please try again later";
        } else if (apolloResponse.status === 422) {
          errorMessage = "Invalid request to Apollo.io API";
        }

        console.error("Apollo API error:", errorText);
        return NextResponse.json(
          { error: errorMessage, details: errorText },
          { status: apolloResponse.status }
        );
      }

      const apolloData: ApolloSearchApiResponse = await apolloResponse.json();
      totalEntries =
        typeof apolloData.total_entries === "number"
          ? apolloData.total_entries
          : totalEntries;

      const people = Array.isArray(apolloData.people) ? apolloData.people : [];
      if (people.length === 0) break;

      // Step 3: Post-filter (defense in depth).
      // Even with org ID + domain on Apollo's side, occasionally a person slips
      // through whose returned organization doesn't match. We reject them here.
      //
      // Priority: Apollo org ID match > domain match.
      // If we have an Apollo org ID, REQUIRE it to match — no domain fallback.
      // This is the strictest possible check we can do client-side.
      const matches = people.filter((p) =>
        personMatchesOrganization(p, normalizedDomain, apolloOrganizationId)
      );
      filteredOutCount += people.length - matches.length;

      for (const p of matches) {
        if (contacts.length >= desiredCount) break;
        contacts.push(p);
      }

      if (people.length < desiredCount) break;
    }

    if (contacts.length === 0) {
      return NextResponse.json({
        success: true,
        organization: {
          org_id: organization.org_id,
          legal_name: organization.legal_name,
          website_url: organization.website_url,
          hasEmail: !!organization.primary_email,
          hasPhone: !!organization.primary_phone_e164,
        },
        contacts: [],
        total_entries: totalEntries || 0,
        domain: normalizedDomain,
        apolloOrganizationId,
        filtered_out: filteredOutCount,
        message: `No people found in Apollo database for domain: ${normalizedDomain}`,
      });
    }

    const transformedContacts: TransformedContact[] = contacts.map(
      (person) => ({
        id: person.id,
        first_name: person.first_name,
        last_name_obfuscated: person.last_name_obfuscated,
        job_title: person.title,
        organization_name:
          person.organization?.name || organization.legal_name,
        organization_website:
          person.organization?.website_url || organization.website_url,
        has_email: person.has_email,
        has_direct_phone: person.has_direct_phone === "Yes",
        last_refreshed_at: person.last_refreshed_at,
      })
    );

    // Hydrate full names via People Match (search returns obfuscated last names)
    const hydratedContacts = await Promise.all(
      transformedContacts.map(async (contact) => {
        const fullNameData = await fetchApolloFullNameById(apiKey, contact.id);
        if (!fullNameData) return contact;
        return {
          ...contact,
          first_name: fullNameData.first_name || contact.first_name,
          last_name: fullNameData.last_name || null,
          full_name: fullNameData.full_name || null,
          linkedin_url: fullNameData.linkedin_url || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      organization: {
        org_id: organization.org_id,
        legal_name: organization.legal_name,
        website_url: organization.website_url,
        hasEmail: !!organization.primary_email,
        hasPhone: !!organization.primary_phone_e164,
      },
      contacts: hydratedContacts,
      total_entries: totalEntries ?? hydratedContacts.length,
      domain: normalizedDomain,
      apolloOrganizationId,
      filtered_out: filteredOutCount,
    });
  } catch (error) {
    console.error("Apollo search error:", error);
    return NextResponse.json(
      { error: "Failed to search Apollo.io" },
      { status: 500 }
    );
  }
}