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
    // Define all column headers that can be used for bulk organization upload
    // These headers match what the upload route expects and all available fields
    const headers = [
      "Legal Name", // Required field
      "Trading Name",
      "Company Type",
      "Website URL",
      "LinkedIn URL",
      "Primary Email",
      "Primary Phone",
      "Country Code",
      "Address Line 1",
      "Address Line 2",
      "City",
      "Region",
      "Postal Code",
      "Timezone",
      "Industry",
      "Vertical",
      "Sub Vertical",
      "Business Model",
      "Employee Count Range",
      "Annual Revenue Amount",
      "Annual Revenue Currency",
      "Account Tier",
      "Lifecycle Stage",
      "Source Channel",
      "Registration Number",
      "Tax ID",
      "Marketing Opt In Status",
      "Do Not Contact",
      "Billing Email",
      "Payment Terms",
      "Preferred Currency",
      "Internal Notes",
      "Discovery Search Terms",
      "Discovery Sources",
      "Keywords",
      "Tags", // Comma-separated tags
    ];

    // Create CSV content with headers only (no data rows)
    // Properly escape headers that might contain special characters
    const csvContent = headers.map(escapeCsvField).join(",") + "\n";

    // Return CSV file as download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="organization_bulk_upload_template.csv"`,
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
