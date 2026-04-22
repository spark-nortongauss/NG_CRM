import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticated, requireSuperAdmin } from "@/lib/auth/role-check";
import { buildFieldDiffs, getContactFieldLabels, logActivity } from "@/lib/activity/log";
import { buildContactDedupeKey } from "@/lib/contacts/dedupe-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Contact not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Any authenticated user can edit contacts
  const auth = await requireAuthenticated();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  try {
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();

    const mergedForDedupe = {
      first_name: (body?.first_name ?? existingContact?.first_name) as string | null,
      last_name: (body?.last_name ?? existingContact?.last_name) as string | null,
      organization: (body?.organization ?? existingContact?.organization) as string | null,
      job_title: (body?.job_title ?? existingContact?.job_title) as string | null,
    };

    const { data, error } = await supabase
      .from("contacts")
      .update({
        ...body,
        dedupe_key: buildContactDedupeKey(mergedForDedupe),
        updated_at: new Date().toISOString(),
        updated_by_user_id: auth.userId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: authData } = await supabase.auth.getUser();
    const actor = authData?.user ?? null;
    const keys = body && typeof body === "object" ? Object.keys(body) : [];
    const diffs = buildFieldDiffs(existingContact, body, getContactFieldLabels());
    const contactName = [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim() || "this contact";
    const summary =
      diffs[0]
        ? `${actor?.user_metadata?.full_name ?? actor?.email ?? "A user"} updated ${diffs[0].label} for ${contactName} (${diffs[0].before} -> ${diffs[0].after})`
        : `${actor?.user_metadata?.full_name ?? actor?.email ?? "A user"} updated ${contactName}`;
    const phoneStatusKeys = [
      "mobile_1_call_status",
      "mobile_2_call_status",
      "mobile_3_call_status",
      "fixed_number_call_status",
    ];

    const hasPhoneCallStatusChange =
      body &&
      typeof body === "object" &&
      phoneStatusKeys.some((k) =>
        Object.prototype.hasOwnProperty.call(body, k),
      );

    const channel = hasPhoneCallStatusChange
      ? "phone"
      : body?.contact_status === "Email"
        ? "email"
        : body?.contact_status === "LinkedIn"
          ? "linkedin"
          : body?.contact_status === "Call"
            ? "phone"
            : body?.cold_email_status === "Done"
              ? "email"
              : body?.cold_call_status === "Done"
                ? "phone"
                : body?.linkedin_status === "Done"
                  ? "linkedin"
                  : null;

    await logActivity(supabase, {
      actor_user_id: auth.userId,
      actor_email: actor?.email ?? null,
      actor_name: (actor?.user_metadata?.full_name as string | undefined) ?? null,
      entity_type: "contact",
      entity_id: id,
      contact_id: id,
      action_type: "contact.updated",
      channel,
      summary,
      metadata: {
        summary,
        contact_name: contactName,
        updated_fields: keys,
        field_diffs: diffs,
        patch: body,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Only super admins can delete contacts
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const supabase = await createClient();

  try {
    const { error } = await supabase.from("contacts").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: authData } = await supabase.auth.getUser();
    const actor = authData?.user ?? null;
    await logActivity(supabase, {
      actor_user_id: auth.userId,
      actor_email: actor?.email ?? null,
      actor_name: (actor?.user_metadata?.full_name as string | undefined) ?? null,
      entity_type: "contact",
      entity_id: id,
      contact_id: id,
      action_type: "contact.deleted",
      metadata: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
