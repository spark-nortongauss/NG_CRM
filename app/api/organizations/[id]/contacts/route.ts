import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    try {
        // First, get the organization to find its legal_name and trade_name
        const { data: organization, error: orgError } = await supabase
            .from("organizations")
            .select("legal_name, trade_name")
            .eq("org_id", id)
            .single();

        if (orgError) {
            if (orgError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Organization not found" },
                    { status: 404 }
                );
            }
            return NextResponse.json({ error: orgError.message }, { status: 500 });
        }

        // Build query to match contacts by organization name
        // Match against both legal_name and trade_name (if trade_name exists)
        const orgNames = [organization.legal_name];
        if (organization.trade_name) {
            orgNames.push(organization.trade_name);
        }

        // Fetch contacts where organization matches legal_name or trade_name
        const { data: contacts, error: contactsError } = await supabase
            .from("contacts")
            .select("id, first_name, last_name, job_title, fixed_number, email_1, linkedin_url, organization")
            .in("organization", orgNames)
            .order("first_name", { ascending: true });

        if (contactsError) {
            return NextResponse.json({ error: contactsError.message }, { status: 500 });
        }

        return NextResponse.json(contacts || []);
    } catch (error) {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
