import { NextResponse } from "next/server";

// Helper function to properly escape CSV fields
function escapeCsvField(field: string): string {
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export async function GET() {
  try {
    // Define all column headers that can be used for bulk contact upload
    // These headers match what the upload route expects and all available fields
    const headers = [
      "First Name",
      "Last Name",
      "Organization",
      "Mobile 1",
      "Mobile 2",
      "Mobile 3",
      "Fixed Number",
      "Email 1",
      "Email 2",
      "Email 3",
      "City",
      "State",
      "Country",
      "Contact Status",
      "Contacted", // Values: yes/no or true/false or 1/0
    ];

    // Create CSV content with headers only (no data rows)
    // Properly escape headers that might contain special characters
    const csvContent = headers.map(escapeCsvField).join(",") + "\n";

    // Return CSV file as download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contact_bulk_upload_template.csv"`,
      },
    });
  } catch (error) {
    console.error("Template generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
