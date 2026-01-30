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
    phone_numbers?: Array<{
      raw_number: string;
      sanitized_number: string;
      type: string;
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

    // Build the URL with query parameters as per Apollo docs
    // reveal_personal_emails=true for emails (synchronous)
    // reveal_phone_number=false because it requires webhook (async)
    const url = new URL("https://api.apollo.io/api/v1/people/match");
    url.searchParams.set("reveal_personal_emails", "true");
    url.searchParams.set("reveal_phone_number", "false");

    console.log("Apollo enrich URL:", url.toString());

    // Call Apollo's People Match API for enrichment
    const apolloResponse = await fetch(url.toString(), {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(matchBody),
    });

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

    const person = data.person;

    // Extract email from available sources
    const email = person.email || 
      (person.personal_emails && person.personal_emails.length > 0 ? person.personal_emails[0] : null);

    // Extract phone from available sources  
    const phone = 
      (person.phone_numbers && person.phone_numbers.length > 0
        ? person.phone_numbers[0].sanitized_number || person.phone_numbers[0].raw_number
        : null) ||
      person.mobile_phone ||
      person.corporate_phone;

    return NextResponse.json({
      success: true,
      contact: {
        id: person.id,
        first_name: person.first_name,
        last_name: person.last_name,
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
