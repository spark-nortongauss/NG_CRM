import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity/log";
import { buildContactDedupeKey } from "@/lib/contacts/dedupe-key";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      first_name,
      last_name,
      organization,
      organization_id,
      job_title,
      linkedin_url,
      mobile_1,
      mobile_2,
      mobile_3,
      fixed_number,
      email_1,
      email_2,
      email_3,
      city,
      state,
      country,
      contact_status,
      contact_date,
      contacted,
    } = body;

    const { data: authData } = await supabase.auth.getUser();
    const actor = authData?.user ?? null;

    // Validate that at least first_name or last_name is provided
    if (!first_name?.trim() && !last_name?.trim()) {
      return NextResponse.json(
        { error: "At least First Name or Last Name is required" },
        { status: 400 },
      );
    }

    const payload = {
      first_name: first_name || null,
      last_name: last_name || null,
      organization: organization || null,
      job_title: job_title || null,
      linkedin_url: linkedin_url || null,
      mobile_1: mobile_1 || null,
      mobile_2: mobile_2 || null,
      mobile_3: mobile_3 || null,
      fixed_number: fixed_number || null,
      email_1: email_1 || null,
      email_2: email_2 || null,
      email_3: email_3 || null,
      city: city || null,
      state: state || null,
      country: country || null,
      contact_status: contact_status || null,
      contact_date: contact_date || null,
      contacted: contacted || false,
      dedupe_key: buildContactDedupeKey({
        first_name,
        last_name,
        organization,
        job_title,
      }),
    };

    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("dedupe_key", payload.dedupe_key)
      .maybeSingle();

    type ContactRow = {
      id: string;
      contact_status?: string | null;
      contacted?: boolean | null;
      organization?: string | null;
    };

    let data: ContactRow[] | null = null;
    let error: { message?: string } | null = null;

    if (existing?.id) {
      const result = await supabase
        .from("contacts")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
          updated_by_user_id: actor?.id ?? null,
        })
        .eq("id", existing.id)
        .select();
      data = result.data;
      error = result.error;
    } else {
      let result = await supabase
        .from("contacts")
        .insert([
          {
            ...payload,
            created_by_user_id: actor?.id ?? null,
            updated_by_user_id: actor?.id ?? null,
          },
        ])
        .select();
      if (result.error && (result.error as { code?: string }).code === "23505") {
        result = await supabase
          .from("contacts")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
            updated_by_user_id: actor?.id ?? null,
          })
          .eq("dedupe_key", payload.dedupe_key)
          .select();
      }
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create contact" },
        { status: 500 },
      );
    }

    const created = Array.isArray(data) ? data[0] : null;

    // If an organization_id was provided, link this contact to the organization.
    // This is the canonical way to fetch org contacts (prevents cross-company mixing).
    if (created?.id && typeof organization_id === "string" && organization_id.trim()) {
      const linkResult = await supabase
        .from("organization_contacts")
        .upsert(
          [
            {
              org_id: organization_id.trim(),
              contact_id: created.id,
              relationship_type: "Primary",
            },
          ],
          { onConflict: "org_id,contact_id,relationship_type" }
        );

      if (linkResult.error) {
        console.error("Failed to link contact to organization:", linkResult.error);
      }
    }

    if (created?.id) {
      const statusToChannel =
        typeof created.contact_status === "string"
          ? created.contact_status.toLowerCase()
          : "";
      const channel =
        statusToChannel === "email"
          ? "email"
          : statusToChannel === "linkedin"
            ? "linkedin"
            : statusToChannel === "call"
              ? "phone"
              : null;

      await logActivity(supabase, {
        actor_user_id: actor?.id ?? null,
        actor_email: actor?.email ?? null,
        actor_name: (actor?.user_metadata?.full_name as string | undefined) ?? null,
        entity_type: "contact",
        entity_id: created.id,
        contact_id: created.id,
        action_type: "contact.created",
        channel,
        metadata: {
          contact_status: created.contact_status ?? null,
          contacted: created.contacted ?? null,
          organization: created.organization ?? null,
        },
      });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  // Clamp limit
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  try {
    const { data, count, error } = await supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + safeLimit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      count,
      page,
      limit: safeLimit,
      totalPages: count ? Math.ceil(count / safeLimit) : 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
