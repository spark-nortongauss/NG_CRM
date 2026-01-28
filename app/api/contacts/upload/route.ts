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

interface ContactRow {
    [key: string]: string;
}

interface ContactRecord {
    first_name: string;
    last_name: string;
    organization: string;
    job_title: string;
    linkedin_url: string;
    mobile_1: string;
    mobile_2: string;
    mobile_3: string;
    fixed_number: string;
    email_1: string;
    email_2: string;
    email_3: string;
    city: string;
    state: string;
    country: string;
    contact_status: string;
    linkedin_status: string;
    cold_call_status: string;
    cold_email_status: string;
    contacted: boolean;
}

/**
 * Parse Excel file (xlsx/xls) and return rows with headers
 */
async function parseExcelFile(file: File): Promise<ContactRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  
  // Get the first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }
  
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to array of objects with headers
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { 
    defval: "",
    raw: false // Convert everything to strings
  });
  
  // Convert and sanitize all values to strings
  return rows.map(row => {
    const sanitizedRow: ContactRow = {};
    Object.entries(row).forEach(([key, value]) => {
      sanitizedRow[sanitizeText(key.trim())] = sanitizeValue(value);
    });
    return sanitizedRow;
  });
}

/**
 * Parse CSV file and return rows with headers
 */
async function parseCSVFile(file: File): Promise<ContactRow[]> {
  const rawContent = await file.text();
  const fileContent = sanitizeText(rawContent);
  
  const parseResult = Papa.parse<ContactRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => sanitizeText(header.trim()),
  });
  
  if (parseResult.errors.length > 0) {
    console.warn("CSV Parse warnings:", parseResult.errors);
  }
  
  // Sanitize all values
  return parseResult.data.map(row => {
    const sanitizedRow: ContactRow = {};
    Object.entries(row).forEach(([key, value]) => {
      sanitizedRow[key] = sanitizeValue(value);
    });
    return sanitizedRow;
  });
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = [
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];

        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
            return NextResponse.json(
                { error: "Invalid file type. Please upload a CSV or Excel file." },
                { status: 400 }
            );
        }

        // Validate file size (10 MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 10 MB." },
                { status: 400 }
            );
        }

        // Parse file based on type
        let rows: ContactRow[];
        
        if (isExcelFile(file)) {
            console.log("Parsing Excel file:", file.name);
            rows = await parseExcelFile(file);
        } else {
            console.log("Parsing CSV file:", file.name);
            rows = await parseCSVFile(file);
        }

        if (rows.length === 0) {
            return NextResponse.json(
                { error: "File is empty" },
                { status: 400 }
            );
        }

        // Initialize Supabase client
        const supabase = await createClient();

        // Helper function to create a unique key for duplicate detection
        // Based on: First Name, Last Name, Organization, and Job Title
        const createDuplicateKey = (firstName: string, lastName: string, organization: string, jobTitle: string): string => {
            return `${firstName.toLowerCase().trim()}|${lastName.toLowerCase().trim()}|${organization.toLowerCase().trim()}|${jobTitle.toLowerCase().trim()}`;
        };

        // Collect all unique combinations from uploaded rows for duplicate checking
        const uploadedContactKeys = rows.map(row => ({
            firstName: row["First Name"] || "",
            lastName: row["Last Name"] || "",
            organization: row["Organization"] || "",
            jobTitle: row["Job Title"] || "",
        }));

        // Get existing contacts for duplicate checking based on first_name, last_name, organization, job_title
        const existingContactKeys = new Set<string>();
        
        // Fetch existing contacts that might match any of the uploaded data
        // We need to check for contacts with matching first_name, last_name, organization, job_title combination
        const { data: existingContacts } = await supabase
            .from("contacts")
            .select("first_name, last_name, organization, job_title");

        if (existingContacts) {
            existingContacts.forEach(contact => {
                const key = createDuplicateKey(
                    contact.first_name || "",
                    contact.last_name || "",
                    contact.organization || "",
                    contact.job_title || ""
                );
                existingContactKeys.add(key);
            });
        }

        // Transform and filter contacts
        const contactsToInsert: ContactRecord[] = [];
        const duplicates: Array<{ firstName: string; lastName: string; organization: string; jobTitle: string }> = [];
        const errors: Array<{ row: number; error: string }> = [];
        const seenContactKeys = new Set<string>(); // Track duplicates within the same file

        rows.forEach((row, index) => {
            const firstName = row["First Name"] || "";
            const lastName = row["Last Name"] || "";
            const organization = row["Organization"] || "";
            const jobTitle = row["Job Title"] || "";

            // Create duplicate key based on First Name, Last Name, Organization, Job Title
            const duplicateKey = createDuplicateKey(firstName, lastName, organization, jobTitle);

            // Check for duplicates against existing database records
            if (existingContactKeys.has(duplicateKey)) {
                duplicates.push({ firstName, lastName, organization, jobTitle });
                return;
            }

            // Check for duplicates within the same uploaded file
            if (seenContactKeys.has(duplicateKey)) {
                duplicates.push({ firstName, lastName, organization, jobTitle });
                return;
            }

            // Validate required fields
            if (!firstName && !lastName) {
                errors.push({
                    row: index + 2, // +2 because index is 0-based and header is row 1
                    error: "Missing both first name and last name"
                });
                return;
            }

            // Map contacted field
            const contactedValue = (row["Contacted"] || "").toLowerCase();
            const contacted = contactedValue === "yes" || contactedValue === "true" || contactedValue === "1";

            // Map outreach status fields - default to "Not Done" if not provided or invalid
            const parseOutreachStatus = (value: string | undefined): string => {
                const normalized = (value || "").trim().toLowerCase();
                if (normalized === "done" || normalized === "yes" || normalized === "true" || normalized === "1") {
                    return "Done";
                }
                return "Not Done";
            };

            const linkedinStatus = parseOutreachStatus(row["LinkedIn"]);
            const coldCallStatus = parseOutreachStatus(row["Cold Call"]);
            const coldEmailStatus = parseOutreachStatus(row["Cold E-mail"] || row["Cold Email"]);

            const email1 = row["Email 1"] || "";

            // Create contact record with sanitized values
            const contact: ContactRecord = {
                first_name: firstName,
                last_name: lastName,
                organization: organization,
                job_title: jobTitle,
                linkedin_url: row["LinkedIn URL"] || "",
                mobile_1: row["Mobile 1"] || "",
                mobile_2: row["Mobile 2"] || "",
                mobile_3: row["Mobile 3"] || "",
                fixed_number: row["Fixed Number"] || "",
                email_1: email1,
                email_2: row["Email 2"] || "",
                email_3: row["Email 3"] || "",
                city: row["City"] || "",
                state: row["State"] || "",
                country: row["Country"] || "",
                contact_status: row["Contact Status"] || "Not Contacted",
                linkedin_status: linkedinStatus,
                cold_call_status: coldCallStatus,
                cold_email_status: coldEmailStatus,
                contacted: contacted,
            };

            contactsToInsert.push(contact);

            // Add to seen keys to prevent duplicates within the same file
            seenContactKeys.add(duplicateKey);
        });

        // Insert contacts into database
        let insertedCount = 0;
        if (contactsToInsert.length > 0) {
            const { data, error } = await supabase
                .from("contacts")
                .insert(contactsToInsert)
                .select();

            if (error) {
                console.error("Database insert error:", error);
                return NextResponse.json(
                    {
                        error: "Failed to insert contacts into database",
                        details: error.message
                    },
                    { status: 500 }
                );
            }

            insertedCount = data?.length || 0;
        }

        // Format duplicate info for response
        const duplicateInfo = duplicates.map(d => 
            `${d.firstName} ${d.lastName}${d.organization ? ` at ${d.organization}` : ""}${d.jobTitle ? ` (${d.jobTitle})` : ""}`
        );

        return NextResponse.json({
            success: true,
            message: "File processed successfully",
            summary: {
                total: rows.length,
                inserted: insertedCount,
                duplicates: duplicates.length,
                errors: errors.length,
            },
            details: {
                duplicateContacts: duplicateInfo,
                errors: errors,
            },
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            {
                error: "Failed to upload file",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
