import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ContactSummary = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    job_title: string | null;
    fixed_number: string | null;
    email_1: string | null;
    linkedin_url: string | null;
    organization: string | null;
};

type OrgContactLinkRow = {
    relationship_type: string;
    contacts: ContactSummary | null;
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    try {
        // Fetch contacts strictly linked to this organization via organization_contacts.
        // This avoids name-based matching, which can mix unrelated companies.
        const { data: links, error: linkError } = await supabase
            .from("organization_contacts")
            .select(
                `
          relationship_type,
          contacts:contacts (
            id,
            first_name,
            last_name,
            job_title,
            fixed_number,
            email_1,
            linkedin_url,
            organization
          )
        `
            )
            .eq("org_id", id)
            .order("created_at", { ascending: false });

        if (linkError) {
            // If the link table isn't populated yet, return empty rather than guessing by org name.
            return NextResponse.json({ error: linkError.message }, { status: 500 });
        }

        const typedLinks = (links || []) as unknown as OrgContactLinkRow[];

        const contacts = typedLinks
            .map((l) => l.contacts)
            .filter((c): c is ContactSummary => Boolean(c))
            .sort((a, b) => String(a.first_name || "").localeCompare(String(b.first_name || "")));

        return NextResponse.json(contacts);
    } catch (error) {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
