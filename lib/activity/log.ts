import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityChannel = "email" | "phone" | "linkedin" | "meeting" | "other";
export type ActivityEntityType = "contact" | "organization" | "task";

export type ActivityLogInsert = {
  occurred_at?: string;
  actor_user_id?: string | null;
  actor_email?: string | null;
  actor_name?: string | null;
  entity_type: ActivityEntityType;
  entity_id: string;
  action_type: string;
  channel?: ActivityChannel | null;
  contact_id?: string | null;
  org_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Best-effort audit + analytics logging.
 * Never throw: dashboard logging must not break core CRUD flows.
 */
export async function logActivity(
  supabase: SupabaseClient,
  entry: ActivityLogInsert,
) {
  try {
    const { error } = await supabase.from("activity_log").insert({
      occurred_at: entry.occurred_at ?? new Date().toISOString(),
      actor_user_id: entry.actor_user_id ?? null,
      actor_email: entry.actor_email ?? null,
      actor_name: entry.actor_name ?? null,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action_type: entry.action_type,
      channel: entry.channel ?? null,
      contact_id: entry.contact_id ?? null,
      org_id: entry.org_id ?? null,
      metadata: entry.metadata ?? {},
    });
    if (error) console.error("activity_log insert failed:", error);
  } catch (e) {
    console.error("activity_log insert error:", e);
  }
}

