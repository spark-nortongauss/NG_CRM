import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatActivityLogMessage } from "@/lib/activity/audit-message";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email: rawEmail } = await params;
  const actorEmail = decodeURIComponent(rawEmail);

  // Today's UTC window
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  ).toISOString();
  const todayEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  ).toISOString();

  // All today's activity for this actor
  const { data: todayLogs, error: logsErr } = await supabase
    .from("activity_log")
    .select(
      "id, occurred_at, actor_name, actor_email, action_type, entity_type, metadata, channel, contact_id, org_id, summary"
    )
    .eq("actor_email", actorEmail)
    .gte("occurred_at", todayStart)
    .lte("occurred_at", todayEnd)
    .order("occurred_at", { ascending: false });

  if (logsErr) {
    return NextResponse.json({ error: logsErr.message }, { status: 500 });
  }

  const logs = todayLogs ?? [];

  // Resolve contact and org names for display messages
  const contactIds = [...new Set(logs.map((r) => r.contact_id).filter(Boolean))] as string[];
  const orgIds = [...new Set(logs.map((r) => r.org_id).filter(Boolean))] as string[];

  const [contactsRes, orgsRes] = await Promise.all([
    contactIds.length
      ? supabase
          .from("contacts")
          .select("id, first_name, last_name")
          .in("id", contactIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string | null; last_name: string | null }[] }),
    orgIds.length
      ? supabase
          .from("organizations")
          .select("org_id, legal_name, trade_name")
          .in("org_id", orgIds)
      : Promise.resolve({
          data: [] as { org_id: string; legal_name: string | null; trade_name: string | null }[],
        }),
  ]);

  const contactNameById = new Map<string, string>();
  for (const c of contactsRes.data ?? []) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
    contactNameById.set(c.id, name || "this contact");
  }

  const orgNameById = new Map<string, string>();
  for (const o of orgsRes.data ?? []) {
    const name = (o.legal_name || o.trade_name || "").trim();
    orgNameById.set(o.org_id, name || "this organization");
  }

  // Compute stats
  let contactsAdded = 0;
  let orgsAffected = new Set<string>();
  let contactsAffected = new Set<string>();
  let fieldChanges = 0;
  const actionTypeCounts: Record<string, number> = {};
  const entityTypeCounts: Record<string, number> = {};
  const channelCounts: Record<string, number> = {};

  const activities = logs.map((row) => {
    // count by action type
    actionTypeCounts[row.action_type] = (actionTypeCounts[row.action_type] ?? 0) + 1;
    // count by entity type
    entityTypeCounts[row.entity_type] = (entityTypeCounts[row.entity_type] ?? 0) + 1;
    // count by channel
    if (row.channel) channelCounts[row.channel] = (channelCounts[row.channel] ?? 0) + 1;

    if (row.action_type === "contact.created") contactsAdded++;
    if (row.contact_id) contactsAffected.add(row.contact_id);
    if (row.org_id) orgsAffected.add(row.org_id);

    // Count field diffs
    const diffs = (row.metadata as Record<string, unknown> | null)?.field_diffs;
    if (Array.isArray(diffs)) fieldChanges += diffs.length;

    const display_message = formatActivityLogMessage(
      {
        action_type: row.action_type,
        actor_name: row.actor_name,
        actor_email: row.actor_email,
        entity_type: row.entity_type,
        metadata: row.metadata as Record<string, unknown> | null,
        summary: row.summary,
      },
      row.contact_id ? (contactNameById.get(row.contact_id) ?? null) : null,
      row.org_id ? (orgNameById.get(row.org_id) ?? null) : null
    );

    return { ...row, display_message };
  });

  // Hourly breakdown for timeline chart (0-23)
  const hourlyActivity: number[] = new Array(24).fill(0);
  for (const row of logs) {
    const h = new Date(row.occurred_at).getUTCHours();
    hourlyActivity[h]++;
  }

  const actorName = logs[0]?.actor_name ?? actorEmail.split("@")[0] ?? actorEmail;

  return NextResponse.json({
    actorEmail,
    actorName,
    date: todayStart.split("T")[0],
    stats: {
      totalEvents: logs.length,
      contactsAdded,
      contactsAffected: contactsAffected.size,
      orgsAffected: orgsAffected.size,
      fieldChanges,
    },
    actionTypeCounts,
    entityTypeCounts,
    channelCounts,
    hourlyActivity,
    activities,
  });
}
