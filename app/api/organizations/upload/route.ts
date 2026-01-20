import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";

interface OrganizationRow {
  "Legal Name": string;
  "Trading Name"?: string;
  "Company Type"?: string;
  "Website URL"?: string;
  "Primary Email"?: string;
  "Primary Phone"?: string;
  "Country Code"?: string;
  "Address Line 1"?: string;
  "Address Line 2"?: string;
  City?: string;
  Region?: string;
  "Postal Code"?: string;
  Timezone?: string;
  Industry?: string;
  "Business Model"?: string;
  "Employee Range"?: string;
  "Annual Revenue"?: string;
  "Revenue Currency"?: string;
  "Account Tier"?: string;
  "Lifecycle Stage"?: string;
  "Source Channel"?: string;
  Tags?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 },
      );
    }

    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(csv|xlsx|xls)$/i)
    ) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a CSV or Excel file." },
        { status: 400 },
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 },
      );
    }

    const fileContent = await file.text();

    const parseResult = Papa.parse<OrganizationRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: "Failed to parse CSV file",
          details: parseResult.errors,
        },
        { status: 400 },
      );
    }

    const rows = parseResult.data;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const organizationsToInsert: any[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    rows.forEach((row, index) => {
      const legalName = row["Legal Name"]?.trim();

      if (!legalName) {
        errors.push({
          row: index + 2,
          error: "Missing Legal Name",
        });
        return;
      }

      const annualRevenueRaw = row["Annual Revenue"]?.trim();
      let annualRevenueNumber: number | null = null;
      if (annualRevenueRaw) {
        const parsed = Number(annualRevenueRaw.replace(/,/g, ""));
        if (!Number.isNaN(parsed)) {
          annualRevenueNumber = parsed;
        }
      }

      organizationsToInsert.push({
        legal_name: legalName,
        trade_name: row["Trading Name"]?.trim() || null,
        company_type: row["Company Type"]?.trim() || null,
        website_url: row["Website URL"]?.trim() || null,
        primary_email: row["Primary Email"]?.trim() || null,
        primary_phone_e164: row["Primary Phone"]?.trim() || null,
        hq_country_code: row["Country Code"]?.trim() || null,
        hq_address_line1: row["Address Line 1"]?.trim() || null,
        hq_address_line2: row["Address Line 2"]?.trim() || null,
        hq_city: row["City"]?.trim() || null,
        hq_region: row["Region"]?.trim() || null,
        hq_postal_code: row["Postal Code"]?.trim() || null,
        timezone: row["Timezone"]?.trim() || null,
        industry_primary: row["Industry"]?.trim() || null,
        business_model: row["Business Model"]?.trim() || null,
        employee_count_range: row["Employee Range"]?.trim() || null,
        annual_revenue_amount: annualRevenueNumber,
        annual_revenue_currency: row["Revenue Currency"]?.trim() || null,
        account_tier: row["Account Tier"]?.trim() || null,
        lifecycle_stage: row["Lifecycle Stage"]?.trim() || null,
        source_channel: row["Source Channel"]?.trim() || null,
      });
    });

    let insertedCount = 0;

    if (organizationsToInsert.length > 0) {
      const { data, error } = await supabase
        .from("organizations")
        .insert(organizationsToInsert)
        .select("org_id, legal_name");

      if (error) {
        console.error("Database insert error:", error);
        return NextResponse.json(
          {
            error: "Failed to insert organizations into database",
            details: error.message,
          },
          { status: 500 },
        );
      }

      insertedCount = data?.length || 0;

      const tagsRows = rows
        .map((row, index) => ({
          rowIndex: index,
          legalName: row["Legal Name"]?.trim(),
          tags: row.Tags,
        }))
        .filter((r) => r.legalName && r.tags);

      if (data && tagsRows.length > 0) {
        const orgByName = new Map<string, string>();
        data.forEach((org) => {
          if (org.legal_name) {
            orgByName.set(org.legal_name, org.org_id);
          }
        });

        const tagInserts: { org_id: string; tag_name: string }[] = [];
        tagsRows.forEach((rowInfo) => {
          const orgId = orgByName.get(rowInfo.legalName!);
          if (!orgId) return;
          const tagList = rowInfo.tags
            ?.split(",")
            .map((t) => t.trim())
            .filter(Boolean);
          if (tagList && tagList.length > 0) {
            Array.from(new Set(tagList)).forEach((tagName) => {
              tagInserts.push({ org_id: orgId, tag_name: tagName });
            });
          }
        });

        if (tagInserts.length > 0) {
          const { error: tagsError } = await supabase
            .from("organization_tags")
            .insert(tagInserts);
          if (tagsError) {
            console.error("Error inserting bulk organization tags:", tagsError);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Organizations file processed successfully",
      summary: {
        total: rows.length,
        inserted: insertedCount,
        duplicates: 0,
        errors: errors.length,
      },
      details: {
        errors,
      },
    });
  } catch (error) {
    console.error("Organizations upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload organizations file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}


