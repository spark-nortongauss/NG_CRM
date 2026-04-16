import { createClient } from "@/lib/supabase/server";
import { formatActivityLogMessage } from "@/lib/activity/audit-message";
import DashboardHomeClient from "./dashboard-home-client";

export type DailyUserStat = {
  email: string;
  name: string | null;
  totalEvents: number;
  contactsAdded: number;
  contactsAffected: number;
  orgsAffected: number;
  fieldChanges: number;
};

export type WeekBucket = {
  key: string;
  label: string;
  contactsAdded: number;
  contactUpdates: number;
  outreachEmail: number;
  outreachPhone: number;
  outreachLinkedIn: number;
};

export type ActivityRow = {
  id: string;
  occurred_at: string;
  actor_name: string | null;
  actor_email: string | null;
  action_type: string;
  entity_type: "contact" | "organization" | "task";
  metadata: Record<string, unknown> | null;
  channel: "email" | "phone" | "linkedin" | "meeting" | "other" | null;
  contact_id: string | null;
  org_id: string | null;
  summary: string | null;
  /** Resolved on the server for reliable client rendering */
  display_message: any;
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date) {
  const copy = startOfDay(d);
  const day = copy.getDay();
  const diffToMonday = (day + 6) % 7;
  copy.setDate(copy.getDate() - diffToMonday);
  return copy;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getWeeks(count: number): Array<WeekBucket & { start: Date; end: Date }> {
  const now = new Date();
  const currentWeekStart = startOfWeek(now);
  const buckets: Array<WeekBucket & { start: Date; end: Date }> = [];

  for (let i = count - 1; i >= 0; i--) {
    const start = addDays(currentWeekStart, -7 * i);
    const end = addDays(start, 7);
    buckets.push({
      key: start.toISOString(),
      label: `${formatShortDate(start)} - ${formatShortDate(addDays(end, -1))}`,
      start,
      end,
      contactsAdded: 0,
      contactUpdates: 0,
      outreachEmail: 0,
      outreachPhone: 0,
      outreachLinkedIn: 0,
    });
  }

  return buckets;
}

function findBucket<T extends { start: Date; end: Date }>(
  buckets: T[],
  value: string | null | undefined,
) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return buckets.find((bucket) => date >= bucket.start && date < bucket.end) ?? null;
}

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const actorFilter = typeof params.actor === "string" ? params.actor : "";
  const fromFilter = typeof params.from === "string" ? params.from : "";
  const toFilter = typeof params.to === "string" ? params.to : "";
  const hasFilter = Boolean(actorFilter || fromFilter || toFilter);
  const now = new Date();
  const weeks = getWeeks(8);
  const oldestWeekStart = weeks[0]?.start.toISOString() ?? new Date().toISOString();

  // Today's UTC window for per-user daily stats
  const todayUTC = startOfDay(now);
  const todayStart = new Date(
    Date.UTC(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate(), 0, 0, 0, 0)
  ).toISOString();
  const todayEnd = new Date(
    Date.UTC(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate(), 23, 59, 59, 999)
  ).toISOString();

  const [contactsCountQuery, organizationsCountQuery, activitiesCountQuery, contactsRecentQuery, contactUpdatesQuery, todayLogsQuery] =
    await Promise.all([
      supabase.from("contacts").select("id", { count: "exact", head: true }),
      supabase.from("organizations").select("org_id", { count: "exact", head: true }),
      supabase.from("activity_log").select("id", { count: "exact", head: true }),
      supabase
        .from("contacts")
        .select("created_at, contact_status, cold_email_status, cold_call_status, linkedin_status")
        .gte("created_at", oldestWeekStart),
      supabase
        .from("activity_log")
        .select("occurred_at, action_type")
        .eq("action_type", "contact.updated")
        .gte("occurred_at", oldestWeekStart),
      supabase
        .from("activity_log")
        .select("actor_email, actor_name, action_type, entity_type, contact_id, org_id, metadata")
        .gte("occurred_at", todayStart)
        .lte("occurred_at", todayEnd),
    ]);

  let activityQuery = supabase
    .from("activity_log")
    .select(
      "id, occurred_at, actor_name, actor_email, action_type, entity_type, metadata, channel, contact_id, org_id, summary",
    )
    .order("occurred_at", { ascending: false });

  if (actorFilter) activityQuery = activityQuery.eq("actor_email", actorFilter);
  if (fromFilter) activityQuery = activityQuery.gte("occurred_at", `${fromFilter}T00:00:00.000Z`);
  if (toFilter) activityQuery = activityQuery.lte("occurred_at", `${toFilter}T23:59:59.999Z`);

  const [activityRecentQuery, actorOptionsQuery] = await Promise.all([
    activityQuery.limit(hasFilter ? 200 : 10),
    supabase
      .from("activity_log")
      .select("actor_name, actor_email")
      .order("occurred_at", { ascending: false })
      .limit(500),
  ]);

  if (contactsRecentQuery.data) {
    for (const row of contactsRecentQuery.data) {
      const bucket = findBucket(weeks, row.created_at as string | null);
      if (!bucket) continue;
      bucket.contactsAdded += 1;

      if (row.contact_status === "Email" || row.cold_email_status === "Done") bucket.outreachEmail += 1;
      if (row.contact_status === "Call" || row.cold_call_status === "Done") bucket.outreachPhone += 1;
      if (row.contact_status === "LinkedIn" || row.linkedin_status === "Done") bucket.outreachLinkedIn += 1;
    }
  }

  if (contactUpdatesQuery.data) {
    for (const row of contactUpdatesQuery.data) {
      const bucket = findBucket(weeks, row.occurred_at as string | null);
      if (!bucket) continue;
      bucket.contactUpdates += 1;
    }
  }

  const actorOptions = Array.from(
    new Map(
      (actorOptionsQuery.data ?? [])
        .filter((row) => row.actor_email)
        .map((row) => [row.actor_email as string, { email: row.actor_email as string, name: row.actor_name ?? null }]),
    ).values(),
  );

  // ── Fetch ALL users from auth so every user ALWAYS gets a card ───────────
  // Use admin client (service role) — server-only, safe in a Server Component
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();
  const { data: authUsersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const allAuthUsers = (authUsersData?.users ?? [])
    .map((u) => ({
      email: u.email ?? "",
      name: (u.user_metadata?.full_name as string | null) ?? null,
    }))
    .filter((u) => u.email);

  // Seed every registered user with zero stats
  const userStatsMap = new Map<string, DailyUserStat>();
  for (const u of allAuthUsers) {
    userStatsMap.set(u.email, {
      email: u.email,
      name: u.name,
      totalEvents: 0,
      contactsAdded: 0,
      contactsAffected: 0,
      orgsAffected: 0,
      fieldChanges: 0,
    });
  }

  // Merge today's activity log data on top of the zero-seed
  for (const row of todayLogsQuery.data ?? []) {
    const email = row.actor_email as string | null;
    if (!email) continue;

    // If actor not in auth (edge case), still add them
    if (!userStatsMap.has(email)) {
      userStatsMap.set(email, {
        email,
        name: (row.actor_name as string | null) ?? null,
        totalEvents: 0,
        contactsAdded: 0,
        contactsAffected: 0,
        orgsAffected: 0,
        fieldChanges: 0,
      });
    }

    const stat = userStatsMap.get(email)!;
    // Prefer activity-log name if auth didn't store a full_name
    if (!stat.name && row.actor_name) stat.name = row.actor_name as string;

    stat.totalEvents++;
    if (row.action_type === "contact.created") stat.contactsAdded++;
    if (row.contact_id as string | null) stat.contactsAffected++;
    if (row.org_id as string | null) stat.orgsAffected++;
    const diffs = (row.metadata as Record<string, unknown> | null)?.field_diffs;
    if (Array.isArray(diffs)) stat.fieldChanges += diffs.length;
  }

  // Sort: most active first, then alphabetically by display name
  const dailyUserStats: DailyUserStat[] = Array.from(userStatsMap.values()).sort((a, b) => {
    if (b.totalEvents !== a.totalEvents) return b.totalEvents - a.totalEvents;
    return (a.name ?? a.email).toLowerCase().localeCompare((b.name ?? b.email).toLowerCase());
  });

  const rawActivities = (activityRecentQuery.data ?? []) as Omit<ActivityRow, "display_message">[];

  const contactIds = [...new Set(rawActivities.map((r) => r.contact_id).filter(Boolean))] as string[];
  const orgIds = [...new Set(rawActivities.map((r) => r.org_id).filter(Boolean))] as string[];

  const [contactsForLabels, orgsForLabels] = await Promise.all([
    contactIds.length
      ? supabase.from("contacts").select("id, first_name, last_name").in("id", contactIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string | null; last_name: string | null }[] }),
    orgIds.length
      ? supabase.from("organizations").select("org_id, legal_name, trade_name").in("org_id", orgIds)
      : Promise.resolve({ data: [] as { org_id: string; legal_name: string | null; trade_name: string | null }[] }),
  ]);

  const contactNameById = new Map<string, string>();
  for (const c of contactsForLabels.data ?? []) {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
    contactNameById.set(c.id, name || "this contact");
  }

  const orgNameById = new Map<string, string>();
  for (const o of orgsForLabels.data ?? []) {
    const name = (o.legal_name || o.trade_name || "").trim();
    orgNameById.set(o.org_id, name || "this organization");
  }

  const recentActivities: ActivityRow[] = rawActivities.map((row) => ({
    ...row,
    display_message: formatActivityLogMessage(
      {
        action_type: row.action_type,
        actor_name: row.actor_name,
        actor_email: row.actor_email,
        entity_type: row.entity_type,
        metadata: row.metadata,
        summary: row.summary,
      },
      row.contact_id ? contactNameById.get(row.contact_id) ?? null : null,
      row.org_id ? orgNameById.get(row.org_id) ?? null : null,
    ),
  }));

  return (
    <DashboardHomeClient
      contactsTotal={contactsCountQuery.count ?? 0}
      organizationsTotal={organizationsCountQuery.count ?? 0}
      activityEventsTotal={activitiesCountQuery.count ?? 0}
      weeks={weeks.map(({ ...rest }) => rest)}
      recentActivities={recentActivities}
      actorOptions={actorOptions}
      filters={{ actor: actorFilter, from: fromFilter, to: toFilter }}
      dailyUserStats={dailyUserStats}
    />
  );
}
