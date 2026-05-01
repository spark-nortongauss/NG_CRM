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
        // ── 1. Fetch contacts linked via the organization_contacts junction table ──
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
            console.error("Error fetching junction links:", linkError.message);
        }

        const typedLinks = (links || []) as unknown as OrgContactLinkRow[];
        const junctionContacts = typedLinks
            .map((l) => l.contacts)
            .filter((c): c is ContactSummary => Boolean(c));

        // Collect IDs already linked via the junction table
        const linkedIds = new Set(junctionContacts.map((c) => c.id));

        // ── 2. Fetch the organization's names so we can match by name ──
        const { data: orgData } = await supabase
            .from("organizations")
            .select("legal_name, trade_name")
            .eq("org_id", id)
            .single();

        let nameMatchedContacts: ContactSummary[] = [];

        if (orgData) {
            // Build an array of non-null org names to match against
            const namesToMatch = [orgData.legal_name, orgData.trade_name].filter(
                (n): n is string => typeof n === "string" && n.trim().length > 0
            );

            if (namesToMatch.length > 0) {
                // Query contacts whose organization text field matches any of the org names
                const { data: nameMatches, error: nameError } = await supabase
                    .from("contacts")
                    .select(
                        "id, first_name, last_name, job_title, fixed_number, email_1, linkedin_url, organization"
                    )
                    .in("organization", namesToMatch);

                if (nameError) {
                    console.error("Error fetching name-matched contacts:", nameError.message);
                } else {
                    nameMatchedContacts = (nameMatches || []) as ContactSummary[];
                }
            }
        }

        // ── 3. Merge & deduplicate (junction results take precedence) ──
        const unlinkedContacts = nameMatchedContacts.filter(
            (c) => !linkedIds.has(c.id)
        );

        const allContacts = [...junctionContacts, ...unlinkedContacts].sort(
            (a, b) =>
                String(a.first_name || "").localeCompare(String(b.first_name || ""))
        );

        // ── 4. Auto-link unlinked contacts into the junction table (fire & forget) ──
        if (unlinkedContacts.length > 0) {
            const rows = unlinkedContacts.map((c) => ({
                org_id: id,
                contact_id: c.id,
                relationship_type: "Primary",
            }));

            supabase
                .from("organization_contacts")
                .upsert(rows, { onConflict: "org_id,contact_id,relationship_type" })
                .then(({ error: upsertError }) => {
                    if (upsertError) {
                        console.error(
                            "Auto-link upsert failed:",
                            upsertError.message
                        );
                    }
                });
        }

        return NextResponse.json(allContacts);
    } catch (error) {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
