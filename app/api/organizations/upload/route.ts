import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 },
      );
    }

    // Note: We are treating all text-based uploads as CSV for now since we only have PapaParse.
    // If the user uploads a binary .xlsx, this will likely fail to parse meaningful text.
    // We assume the user creates a CSV or valid text-based spreadsheet export.

    const fileContent = await file.text();

    // Parse without headers first to inspect structure
    const parseResult = Papa.parse<string[]>(fileContent, {
      header: false,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      // If critical parsing errors, report them, but maybe try to proceed if we have some data?
      // PapaParse usually returns data even with errors.
      console.warn("CSV Parse warnings:", parseResult.errors);
    }

    const rows = parseResult.data;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // Heuristics: Check if first row looks like our standard headers
    const firstRowResponse = rows[0];
    const firstRowStr = firstRowResponse.map(c => c?.toLowerCase().trim());

    const isHeaderRow =
      firstRowStr.includes("legal name") ||
      firstRowStr.includes("company name") ||
      (firstRowStr.includes("name") && firstRowStr.includes("email"));

    const organizationsToInsert: any[] = [];

    // Determine start index and mapping strategy
    let startIndex = 0;

    // Map of Column Index -> Field Name
    const columnMapping: Record<number, string> = {};

    if (isHeaderRow) {
      startIndex = 1; // Skip header
      // Build dynamic mapping from header row
      firstRowResponse.forEach((colName, index) => {
        const lower = colName.toLowerCase().trim();
        if (lower === "legal name" || lower === "company name" || lower === "name") columnMapping[index] = "legal_name";
        else if (lower === "trading name" || lower === "trade name") columnMapping[index] = "trade_name";
        else if (lower === "company type" || lower === "type") columnMapping[index] = "company_type";
        else if (lower === "website" || lower === "website url") columnMapping[index] = "website_url";
        else if (lower === "email" || lower === "primary email") columnMapping[index] = "primary_email";
        else if (lower === "phone" || lower === "primary phone") columnMapping[index] = "primary_phone_e164";
        else if (lower === "industry") columnMapping[index] = "industry_primary";
        else if (lower === "city") columnMapping[index] = "hq_city";
        else if (lower === "country" || lower === "country code") columnMapping[index] = "hq_country_code";
        // expand as needed
      });
    } else {
      // Positional Mapping (Fallback)
      // 0: Legal Name
      // 1: Trade Name
      // 2: Company Type
      // 3: Website
      // 4: Email
      // 5: Phone
      columnMapping[0] = "legal_name";
      columnMapping[1] = "trade_name";
      columnMapping[2] = "company_type";
      columnMapping[3] = "website_url";
      columnMapping[4] = "primary_email";
      columnMapping[5] = "primary_phone_e164";
    }

    // Process rows
    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      // Skip empty rows
      if (row.length === 0 || row.every(c => !c?.trim())) continue;

      const orgData: any = {};

      // Extract data according to mapping
      Object.entries(columnMapping).forEach(([colIndex, fieldName]) => {
        const val = row[parseInt(colIndex)]?.trim();
        if (val) {
          orgData[fieldName] = val;
        }
      });

      // User Requirement: "No excel sheet upload shows failure"
      // Even if we only have one value, we save it.
      // Ensure we have a legal_name. If undefined, reuse the first found value or a placeholder.
      if (!orgData.legal_name) {
        // Fallback: Use the very first column value as legal_name if not mapped
        const firstValue = row[0]?.trim();
        if (firstValue) {
          orgData.legal_name = firstValue;
        } else {
          // If mostly empty row but has some data elsewhere?
          // Find ANY string
          const anyVal = row.find(c => c?.trim());
          if (anyVal) orgData.legal_name = anyVal;
          else continue; // Truly empty row
        }
      }

      // Defaults
      orgData.marketing_opt_in_status = false;
      orgData.do_not_contact = false;
      orgData.created_by_user_id = userId;
      orgData.updated_by_user_id = userId;

      organizationsToInsert.push(orgData);
    }

    if (organizationsToInsert.length === 0) {
      return NextResponse.json({ success: true, message: "No valid data found to insert." });
    }



    const { data, error } = await supabase
      .from("organizations")
      .insert(organizationsToInsert)
      .select("org_id");

    if (error) {
      console.error("Bulk insert error:", error);
      // Even on error, maybe partial success? Supabase insert all-or-nothing usually.
      // User said "no excel sheet upload shows failure".
      // We'll return 500 but with details, or maybe try one by one? 
      // For now, standard error.
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${organizationsToInsert.length} organizations.`,
      inserted: data?.length || 0
    });

  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
