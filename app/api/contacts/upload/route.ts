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

        // Get existing emails for duplicate checking
        const existingEmails = new Set<string>();
        const emailsToCheck = rows
            .map(row => row["Email 1"] || "")
            .filter(email => email && email.length > 0);

        if (emailsToCheck.length > 0) {
            const { data: existingContacts } = await supabase
                .from("contacts")
                .select("email_1")
                .in("email_1", emailsToCheck);

            if (existingContacts) {
                existingContacts.forEach(contact => {
                    if (contact.email_1) {
                        existingEmails.add(contact.email_1.toLowerCase());
                    }
                });
            }
        }

        // Transform and filter contacts
        const contactsToInsert: ContactRecord[] = [];
        const duplicates: string[] = [];
        const errors: Array<{ row: number; error: string }> = [];

        rows.forEach((row, index) => {
            const email1 = row["Email 1"] || "";

            // Check for duplicates
            if (email1 && existingEmails.has(email1.toLowerCase())) {
                duplicates.push(email1);
                return;
            }

            // Validate required fields
            const firstName = row["First Name"] || "";
            const lastName = row["Last Name"] || "";
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

            // Create contact record with sanitized values
            const contact: ContactRecord = {
                first_name: firstName,
                last_name: lastName,
                organization: row["Organization"] || "",
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
                contacted: contacted,
            };

            contactsToInsert.push(contact);

            // Add to existing emails to prevent duplicates within the same file
            if (email1) {
                existingEmails.add(email1.toLowerCase());
            }
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
                duplicateEmails: duplicates,
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
