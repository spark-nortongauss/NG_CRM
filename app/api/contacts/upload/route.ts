import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";

interface ContactRow {
    "First Name": string;
    "Last Name": string;
    "Organization": string;
    "Mobile 1": string;
    "Mobile 2": string;
    "Mobile 3": string;
    "Fixed Number": string;
    "Email 1": string;
    "Email 2": string;
    "Email 3": string;
    "City": string;
    "State": string;
    "Country": string;
    "Contact Status": string;
    "Contacted": string;
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

        // Read file content
        const fileContent = await file.text();

        // Parse CSV
        const parseResult = Papa.parse<ContactRow>(fileContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
        });

        if (parseResult.errors.length > 0) {
            return NextResponse.json(
                {
                    error: "Failed to parse CSV file",
                    details: parseResult.errors
                },
                { status: 400 }
            );
        }

        const rows = parseResult.data;

        if (rows.length === 0) {
            return NextResponse.json(
                { error: "CSV file is empty" },
                { status: 400 }
            );
        }

        // Initialize Supabase client
        const supabase = await createClient();

        // Get existing emails for duplicate checking
        const existingEmails = new Set<string>();
        const emailsToCheck = rows
            .map(row => row["Email 1"]?.trim())
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
            const email1 = row["Email 1"]?.trim();

            // Check for duplicates
            if (email1 && existingEmails.has(email1.toLowerCase())) {
                duplicates.push(email1);
                return;
            }

            // Validate required fields
            if (!row["First Name"]?.trim() && !row["Last Name"]?.trim()) {
                errors.push({
                    row: index + 2, // +2 because index is 0-based and header is row 1
                    error: "Missing both first name and last name"
                });
                return;
            }

            // Map contacted field
            const contactedValue = row["Contacted"]?.trim().toLowerCase();
            const contacted = contactedValue === "yes" || contactedValue === "true" || contactedValue === "1";

            // Create contact record
            const contact: ContactRecord = {
                first_name: row["First Name"]?.trim() || "",
                last_name: row["Last Name"]?.trim() || "",
                organization: row["Organization"]?.trim() || "",
                mobile_1: row["Mobile 1"]?.trim() || "",
                mobile_2: row["Mobile 2"]?.trim() || "",
                mobile_3: row["Mobile 3"]?.trim() || "",
                fixed_number: row["Fixed Number"]?.trim() || "",
                email_1: email1 || "",
                email_2: row["Email 2"]?.trim() || "",
                email_3: row["Email 3"]?.trim() || "",
                city: row["City"]?.trim() || "",
                state: row["State"]?.trim() || "",
                country: row["Country"]?.trim() || "",
                contact_status: row["Contact Status"]?.trim() || "Not Contacted",
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
