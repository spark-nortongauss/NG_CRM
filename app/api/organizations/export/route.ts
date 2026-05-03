import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const url = new URL(req.url);

  // Search & sort params
  const search = url.searchParams.get("search")?.trim() || "";
  const sort = url.searchParams.get("sort") || "";

  // Range params
  const isAll = url.searchParams.get("all") === "true";
  const start = parseInt(url.searchParams.get("start") || "1");
  const end = parseInt(url.searchParams.get("end") || "10");

  try {
    let query = supabase.from("organizations").select(`
      legal_name,
      trade_name,
      company_type,
      website_url,
      linkedin_url,
      primary_email,
      primary_phone_e164,
      hq_country_code,
      hq_address_line1,
      hq_address_line2,
      hq_city,
      hq_region,
      hq_postal_code,
      industry_primary,
      employee_count_range,
      annual_revenue_amount,
      annual_revenue_currency
    `);

    // Apply search filter across the entire table
    if (search) {
      query = query.ilike("legal_name", `%${search}%`);
    }

    // Apply sorting
    if (sort === "name") {
      query = query
        .order("legal_name", { ascending: true, nullsFirst: false });
    } else if (sort === "contacts") {
      query = query
        .order("primary_email", { ascending: true, nullsFirst: true })
        .order("primary_phone_e164", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: true });
    } else {
      query = query
        .order("created_at", { ascending: true })
        .order("org_id", { ascending: true });
    }

    // Apply range if not 'all'
    if (!isAll) {
      // ranges are 0-indexed in Supabase, but our UI start/end are 1-indexed.
      query = query.range(start - 1, end - 1);
    } else {
      // Even if 'all', put a high limit to prevent memory exhaustion
      query = query.limit(50000);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return new NextResponse("No data found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Construct CSV
    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const val = (row as Record<string, any>)[header];
        if (val === null || val === undefined) return '';
        const strVal = String(val);
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="organizations_export.csv"`,
      },
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
