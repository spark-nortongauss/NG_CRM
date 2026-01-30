import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  last_name_obfuscated: string | null; // Partial last name from search API
  job_title: string | null;
  organization_name: string | null;
  organization_website: string | null;
  has_email: boolean;
  has_direct_phone: boolean;
  last_refreshed_at: string | null;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    // If URL doesn't have protocol, try adding one
    try {
      const urlObj = new URL(`https://${url}`);
      return urlObj.hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    // Get the API key from environment variable
    const apiKey = process.env.APOLLO_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Apollo.io API key is not configured. Please add APOLLO_API_KEY to your .env.local file." },
        { status: 500 }
      );
    }

    // Get optional parameters from request body
    const body = await request.json().catch(() => ({}));
    const { perPage = 10 } = body;

    // Fetch the organization to get the domain
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("org_id, legal_name, website_url, primary_email, primary_phone_e164")
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

    // Call Apollo.io People Search API
    // API docs: https://api.apollo.io/api/v1/mixed_people/api_search
    // Note: This endpoint requires a MASTER API key and doesn't return emails/phones
    const apolloResponse = await fetch(
      "https://api.apollo.io/api/v1/mixed_people/api_search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "accept": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          // q_organization_domains_list[] filters by employer domain
          q_organization_domains_list: [domain],
          per_page: Math.min(perPage, 100), // Apollo allows up to 100 per page
          page: 1,
        }),
      }
    );

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      let errorMessage = "Apollo API request failed";

      if (apolloResponse.status === 401) {
        errorMessage = "Invalid Apollo.io API key. Note: The People Search API requires a MASTER API key (not a regular API key). Go to Apollo Settings > API Keys > Create Master Key.";
      } else if (apolloResponse.status === 403) {
        errorMessage = "Apollo.io API access forbidden - check your subscription or ensure you're using a Master API key";
      } else if (apolloResponse.status === 429) {
        errorMessage = "Apollo.io rate limit exceeded - please try again later";
      } else if (apolloResponse.status === 422) {
        errorMessage = "Invalid request to Apollo.io API";
      }

      console.error("Apollo API error:", errorText);
      console.error("Request details:", {
        url: "https://api.apollo.io/api/v1/mixed_people/api_search",
        domain: domain,
        apiKeyPrefix: apiKey?.substring(0, 8) + "...",
      });
      return NextResponse.json(
        { error: errorMessage, details: errorText },
        { status: apolloResponse.status }
      );
    }

    const apolloData: ApolloSearchApiResponse = await apolloResponse.json();

    // Log the raw response for debugging
    console.log("Apollo API response:", JSON.stringify({
      total_entries: apolloData.total_entries,
      people_count: apolloData.people?.length || 0,
      first_person: apolloData.people?.[0] || null,
      searched_domain: domain,
    }, null, 2));

    // Check if we got any results
    if (!apolloData.people || apolloData.people.length === 0) {
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
        total_entries: apolloData.total_entries || 0,
        domain,
        message: `No people found in Apollo database for domain: ${domain}`,
      });
    }

    // Transform the data to our format
    // Note: People Search API returns limited info - use People Enrichment for full details
    const transformedContacts: TransformedContact[] = apolloData.people.map(
      (person) => ({
        id: person.id,
        first_name: person.first_name,
        last_name_obfuscated: person.last_name_obfuscated,
        job_title: person.title,
        organization_name: person.organization?.name || organization.legal_name,
        organization_website: person.organization?.website_url || organization.website_url,
        has_email: person.has_email,
        has_direct_phone: person.has_direct_phone === "Yes",
        last_refreshed_at: person.last_refreshed_at,
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
      contacts: transformedContacts,
      total_entries: apolloData.total_entries,
      domain,
      note: "People Search API returns limited info. Use Apollo Enrichment to get full contact details (email, phone, LinkedIn).",
    });
  } catch (error) {
    console.error("Apollo search error:", error);
    return NextResponse.json(
      { error: "Failed to search Apollo.io" },
      { status: 500 }
    );
  }
}
