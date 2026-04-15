import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Building2, Mail, Phone, UserRoundPlus, Users } from "lucide-react";

type WeekBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
  contactsAdded: number;
  contactUpdates: number;
  outreachEmail: number;
  outreachPhone: number;
  outreachLinkedIn: number;
};

type ActivityRow = {
  id: string;
  occurred_at: string;
  actor_name: string | null;
  actor_email: string | null;
  action_type: string;
  entity_type: "contact" | "organization" | "task";
  metadata: Record<string, unknown> | null;
  channel: "email" | "phone" | "linkedin" | "meeting" | "other" | null;
};

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

function getActionLabel(actionType: string) {
  const map: Record<string, string> = {
    "contact.created": "Contact created",
    "contact.updated": "Contact updated",
    "contact.deleted": "Contact deleted",
    "organization.created": "Organization created",
    "organization.updated": "Organization updated",
    "organization.deleted": "Organization deleted",
    "task.created": "Task created",
    "task.updated": "Task updated",
    "task.deleted": "Task deleted",
  };
  return map[actionType] ?? actionType;
}

function getChannelLabel(channel: ActivityRow["channel"]) {
  if (!channel) return "N/A";
  if (channel === "linkedin") return "LinkedIn";
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

function getWeeks(count: number): WeekBucket[] {
  const now = new Date();
  const currentWeekStart = startOfWeek(now);
  const buckets: WeekBucket[] = [];

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

function findBucket(buckets: WeekBucket[], value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return buckets.find((bucket) => date >= bucket.start && date < bucket.end) ?? null;
}

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const weeks = getWeeks(8);
  const oldestWeekStart = weeks[0]?.start.toISOString() ?? new Date().toISOString();

  const [
    contactsCountQuery,
    organizationsCountQuery,
    activitiesCountQuery,
    contactsRecentQuery,
    activityRecentQuery,
    contactUpdatesQuery,
  ] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("organizations").select("org_id", { count: "exact", head: true }),
    supabase.from("activity_log").select("id", { count: "exact", head: true }),
    supabase
      .from("contacts")
      .select("created_at, contact_status, cold_email_status, cold_call_status, linkedin_status")
      .gte("created_at", oldestWeekStart),
    supabase
      .from("activity_log")
      .select("id, occurred_at, actor_name, actor_email, action_type, entity_type, metadata, channel")
      .order("occurred_at", { ascending: false })
      .limit(12),
    supabase
      .from("activity_log")
      .select("occurred_at, action_type")
      .eq("action_type", "contact.updated")
      .gte("occurred_at", oldestWeekStart),
  ]);

  if (contactsRecentQuery.data) {
    for (const row of contactsRecentQuery.data) {
      const bucket = findBucket(weeks, row.created_at as string | null);
      if (!bucket) continue;
      bucket.contactsAdded += 1;

      if (row.contact_status === "Email" || row.cold_email_status === "Done") {
        bucket.outreachEmail += 1;
      }
      if (row.contact_status === "Call" || row.cold_call_status === "Done") {
        bucket.outreachPhone += 1;
      }
      if (row.contact_status === "LinkedIn" || row.linkedin_status === "Done") {
        bucket.outreachLinkedIn += 1;
      }
    }
  }

  if (contactUpdatesQuery.data) {
    for (const row of contactUpdatesQuery.data) {
      const bucket = findBucket(weeks, row.occurred_at as string | null);
      if (!bucket) continue;
      bucket.contactUpdates += 1;
    }
  }

  const contactsTotal = contactsCountQuery.count ?? 0;
  const organizationsTotal = organizationsCountQuery.count ?? 0;
  const activityEventsTotal = activitiesCountQuery.count ?? 0;

  const thisWeek = weeks[weeks.length - 1];
  const previousWeek = weeks[weeks.length - 2];
  const contactDelta = (thisWeek?.contactsAdded ?? 0) - (previousWeek?.contactsAdded ?? 0);
  const updateDelta = (thisWeek?.contactUpdates ?? 0) - (previousWeek?.contactUpdates ?? 0);

  const totalEmail = weeks.reduce((sum, week) => sum + week.outreachEmail, 0);
  const totalPhone = weeks.reduce((sum, week) => sum + week.outreachPhone, 0);
  const totalLinkedIn = weeks.reduce((sum, week) => sum + week.outreachLinkedIn, 0);

  const recentActivities = (activityRecentQuery.data ?? []) as ActivityRow[];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard Home</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Weekly CRM evolution for contacts, outreach, and user activity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card py-4">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{contactsTotal}</span>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This week: {thisWeek?.contactsAdded ?? 0} ({contactDelta >= 0 ? "+" : ""}
              {contactDelta} vs last week)
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card py-4">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Organizations</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{organizationsTotal}</span>
              <Building2 className="h-5 w-5 text-purple-500" />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Accounts currently tracked in CRM.
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card py-4">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact Updates</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {thisWeek?.contactUpdates ?? 0}
              </span>
              <UserRoundPlus className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {updateDelta >= 0 ? "+" : ""}
              {updateDelta} vs previous week.
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card py-4">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Logged Activity</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activityEventsTotal}</span>
              <Activity className="h-5 w-5 text-orange-500" />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Audit events available for dashboard analytics.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-base">Week-by-Week Evolution (Last 8 Weeks)</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-ng-dark-elevated text-left">
                    <th className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400">Week</th>
                    <th className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400">Contacts Added</th>
                    <th className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400">Contacts Updated</th>
                    <th className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400">Email</th>
                    <th className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400">Phone</th>
                    <th className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400">LinkedIn</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week) => (
                    <tr key={week.key} className="border-b border-gray-100 dark:border-ng-dark-elevated/50">
                      <td className="px-2 py-2 text-gray-800 dark:text-gray-200">{week.label}</td>
                      <td className="px-2 py-2">{week.contactsAdded}</td>
                      <td className="px-2 py-2">{week.contactUpdates}</td>
                      <td className="px-2 py-2">{week.outreachEmail}</td>
                      <td className="px-2 py-2">{week.outreachPhone}</td>
                      <td className="px-2 py-2">{week.outreachLinkedIn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-base">Outreach Channels (8 Weeks)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <div className="rounded-lg border border-gray-200 dark:border-ng-dark-elevated p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Email</span>
                <Mail className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{totalEmail}</p>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-ng-dark-elevated p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Phone</span>
                <Phone className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{totalPhone}</p>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-ng-dark-elevated p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">LinkedIn</span>
                <div className="h-4 w-4 rounded-full bg-indigo-500" />
              </div>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{totalLinkedIn}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card py-4">
        <CardHeader className="px-4 pb-2">
          <CardTitle className="text-base">Recent Activity (Who Did What)</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No tracked activity yet. Events will appear here as users create and update CRM data.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-ng-dark-elevated text-left">
                    <th className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400">When</th>
                    <th className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400">Actor</th>
                    <th className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400">Action</th>
                    <th className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400">Entity</th>
                    <th className="px-2 py-2 font-medium text-gray-500 dark:text-gray-400">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((event) => (
                    <tr key={event.id} className="border-b border-gray-100 dark:border-ng-dark-elevated/50">
                      <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                        {new Date(event.occurred_at).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-gray-800 dark:text-gray-200">
                        {event.actor_name || event.actor_email || "Unknown user"}
                      </td>
                      <td className="px-2 py-2">{getActionLabel(event.action_type)}</td>
                      <td className="px-2 py-2 capitalize">{event.entity_type}</td>
                      <td className="px-2 py-2">{getChannelLabel(event.channel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
