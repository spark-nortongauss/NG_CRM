import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

/**
 * Sanitize text content to remove problematic characters that PostgreSQL can't handle.
 * - Removes NULL characters (\u0000)
 * - Removes other control characters except common whitespace
 * - Removes BOM (Byte Order Mark)
 */
function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    // Remove BOM (Byte Order Mark)
    .replace(/^\uFEFF/, "")
    // Remove NULL characters
    .replace(/\u0000/g, "")
    // Remove other problematic control characters (except tab, newline, carriage return)
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/**
 * Sanitize a single string value for database insertion
 */
function sanitizeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  // Convert numbers and other types to string
  const strValue = String(value);
  return sanitizeText(strValue.trim());
}

/**
 * Check if the file is an Excel binary file (.xlsx, .xls)
 */
function isExcelFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  return (
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls") ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  );
}

/**
 * Parse Excel file (xlsx/xls) and return rows as string arrays
 */
async function parseExcelFile(file: File): Promise<string[][]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  
  // Get the first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }
  
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to array of arrays (rows), with header: 1 to get raw values
  const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: "",
    raw: false // Convert everything to strings
  });
  
  // Convert all values to sanitized strings
  return rows.map(row => 
    row.map(cell => sanitizeValue(cell))
  );
}

/**
 * Parse CSV file and return rows as string arrays
 */
async function parseCSVFile(file: File): Promise<string[][]> {
  const rawContent = await file.text();
  const fileContent = sanitizeText(rawContent);
  
  const parseResult = Papa.parse<string[]>(fileContent, {
    header: false,
    skipEmptyLines: true,
  });
  
  if (parseResult.errors.length > 0) {
    console.warn("CSV Parse warnings:", parseResult.errors);
  }
  
  // Sanitize all values
  return parseResult.data.map(row =>
    row.map(cell => sanitizeValue(cell))
  );
}

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

    // Parse file based on type
    let rows: string[][];
    
    if (isExcelFile(file)) {
      console.log("Parsing Excel file:", file.name);
      rows = await parseExcelFile(file);
    } else {
      console.log("Parsing CSV file:", file.name);
      rows = await parseCSVFile(file);
    }

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

    const organizationsToInsert: Array<{ orgData: Record<string, unknown>; tags: string[] }> = [];

    // Determine start index and mapping strategy
    let startIndex = 0;

    // Map of Column Index -> Field Name
    const columnMapping: Record<number, string> = {};

    if (isHeaderRow) {
      startIndex = 1; // Skip header
      // Build dynamic mapping from header row - comprehensive mapping for all template fields
      firstRowResponse.forEach((colName, index) => {
        const lower = colName.toLowerCase().trim();
        // Basic Information
        if (lower === "legal name" || lower === "company name" || lower === "name") columnMapping[index] = "legal_name";
        else if (lower === "trading name" || lower === "trade name") columnMapping[index] = "trade_name";
        else if (lower === "company type" || lower === "type") columnMapping[index] = "company_type";
        else if (lower === "website" || lower === "website url") columnMapping[index] = "website_url";
        else if (lower === "email" || lower === "primary email") columnMapping[index] = "primary_email";
        else if (lower === "phone" || lower === "primary phone") columnMapping[index] = "primary_phone_e164";
        // Location
        else if (lower === "country" || lower === "country code") columnMapping[index] = "hq_country_code";
        else if (lower === "address line 1" || lower === "address 1") columnMapping[index] = "hq_address_line1";
        else if (lower === "address line 2" || lower === "address 2") columnMapping[index] = "hq_address_line2";
        else if (lower === "city") columnMapping[index] = "hq_city";
        else if (lower === "region" || lower === "state" || lower === "province") columnMapping[index] = "hq_region";
        else if (lower === "postal code" || lower === "zip code" || lower === "zip") columnMapping[index] = "hq_postal_code";
        else if (lower === "timezone") columnMapping[index] = "timezone";
        // Business Details
        else if (lower === "industry" || lower === "primary industry") columnMapping[index] = "industry_primary";
        else if (lower === "vertical") columnMapping[index] = "vertical";
        else if (lower === "sub vertical" || lower === "sub-vertical") columnMapping[index] = "sub_vertical";
        else if (lower === "business model") columnMapping[index] = "business_model";
        else if (lower === "employee count range" || lower === "employees") columnMapping[index] = "employee_count_range";
        else if (lower === "annual revenue amount" || lower === "revenue") columnMapping[index] = "annual_revenue_amount";
        else if (lower === "annual revenue currency" || lower === "revenue currency") columnMapping[index] = "annual_revenue_currency";
        // Relationship & Ownership
        else if (lower === "account tier" || lower === "tier") columnMapping[index] = "account_tier";
        else if (lower === "lifecycle stage" || lower === "stage") columnMapping[index] = "lifecycle_stage";
        else if (lower === "source channel" || lower === "source") columnMapping[index] = "source_channel";
        // Legal & Compliance
        else if (lower === "registration number") columnMapping[index] = "registration_number";
        else if (lower === "tax id" || lower === "vat number" || lower === "tax id / vat number") columnMapping[index] = "tax_id";
        else if (lower === "marketing opt in status" || lower === "marketing opt-in") {
          columnMapping[index] = "marketing_opt_in_status";
        }
        else if (lower === "do not contact") {
          columnMapping[index] = "do_not_contact";
        }
        // Billing
        else if (lower === "billing email") columnMapping[index] = "billing_email";
        else if (lower === "payment terms") columnMapping[index] = "payment_terms";
        else if (lower === "preferred currency") columnMapping[index] = "preferred_currency";
        else if (lower === "internal notes" || lower === "notes") columnMapping[index] = "internal_notes";
        // Discovery & Keywords
        else if (lower === "discovery search terms") columnMapping[index] = "discovery_search_terms";
        else if (lower === "discovery sources") columnMapping[index] = "discovery_sources";
        else if (lower === "keywords") columnMapping[index] = "keywords";
        // Tags (will be handled separately as it's a many-to-many relationship)
        else if (lower === "tags") columnMapping[index] = "tags";
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
      if (!row || row.length === 0 || row.every(c => !c?.trim())) continue;

      const orgData: Record<string, unknown> = {};
      let tagsValue = "";

      // Extract data according to mapping
      for (const [colIndex, fieldName] of Object.entries(columnMapping)) {
        const val = row[parseInt(colIndex)] || "";
        if (val) {
          // Handle special field types
          if (fieldName === "marketing_opt_in_status") {
            // Convert yes/no, true/false, 1/0 to boolean
            const lowerVal = val.toLowerCase();
            orgData[fieldName] = lowerVal === "yes" || lowerVal === "true" || lowerVal === "1";
          } else if (fieldName === "do_not_contact") {
            const lowerVal = val.toLowerCase();
            orgData[fieldName] = lowerVal === "yes" || lowerVal === "true" || lowerVal === "1";
          } else if (fieldName === "annual_revenue_amount") {
            // Convert to number
            const numVal = parseFloat(val);
            if (!isNaN(numVal)) {
              orgData[fieldName] = numVal;
            }
          } else if (fieldName === "tags") {
            // Store tags separately to handle later
            tagsValue = val;
          } else {
            orgData[fieldName] = val;
          }
        }
      }

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
          if (anyVal) orgData.legal_name = anyVal.trim();
          else continue; // Truly empty row
        }
      }

      // Defaults for fields not provided
      if (orgData.marketing_opt_in_status === undefined) {
        orgData.marketing_opt_in_status = false;
      }
      if (orgData.do_not_contact === undefined) {
        orgData.do_not_contact = false;
      }
      orgData.created_by_user_id = userId;
      orgData.updated_by_user_id = userId;

      // Store tags separately for later insertion into organization_tags table
      const parsedTags = tagsValue ? tagsValue.split(",").map(t => t.trim()).filter(Boolean) : [];
      const orgWithTags = {
        orgData,
        tags: parsedTags,
      };

      organizationsToInsert.push(orgWithTags);
    }

    if (organizationsToInsert.length === 0) {
      return NextResponse.json({ success: true, message: "No valid data found to insert." });
    }

    // Separate org data and tags
    const orgsData = organizationsToInsert.map(item => item.orgData);

    // Insert organizations
    const { data, error } = await supabase
      .from("organizations")
      .insert(orgsData)
      .select("org_id");

    if (error) {
      console.error("Bulk insert error:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    // Insert tags if any organizations have tags
    if (data && data.length > 0) {
      const tagsToInsert: Array<{ org_id: string; tag_name: string }> = [];
      
      // Match inserted orgs with their tags by index
      data.forEach((insertedOrg, index) => {
        if (index < organizationsToInsert.length) {
          const tags = organizationsToInsert[index].tags;
          tags.forEach(tag => {
            tagsToInsert.push({
              org_id: insertedOrg.org_id,
              tag_name: tag,
            });
          });
        }
      });

      if (tagsToInsert.length > 0) {
        const { error: tagsError } = await supabase
          .from("organization_tags")
          .insert(tagsToInsert);

        if (tagsError) {
          console.warn("Error inserting tags:", tagsError);
          // Don't fail the whole operation if tags fail
        }
      }
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
