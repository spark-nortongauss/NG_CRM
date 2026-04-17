"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Building2, UserRoundPlus, Users, Zap, BarChart2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActivityRow, WeekBucket, DailyUserStat } from "./page";

// Norton-Gauss brand palette aligned with globals.css
const NG_YELLOW = "rgb(217, 255, 53)";
const NG_TEAL = "rgb(45, 67, 68)";
const NG_TEAL_LIGHT = "rgb(77, 104, 105)";
const NG_GRAY = "rgb(128, 128, 128)";
const NG_LIGHT_BLUE = "rgb(100, 130, 131)";

// Avatar palette — inline styles to avoid Tailwind JIT purging arbitrary values
const AVATAR_VARIANTS: { bg: string; color: string }[] = [
  { bg: "#d9ff35", color: "#2d4344" }, // NG yellow bg, dark teal text
  { bg: "#2d4344", color: "#d9ff35" }, // dark teal bg, NG yellow text
  { bg: "#4d6869", color: "#d9ff35" }, // medium teal bg, NG yellow text
];

const DashboardHomeCharts = dynamic(() => import("./dashboard-home-charts"), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 h-[320px] animate-pulse rounded-lg bg-gray-100/80 dark:bg-ng-dark-elevated" />
        <div className="h-[320px] animate-pulse rounded-lg bg-gray-100/80 dark:bg-ng-dark-elevated" />
      </div>
      <div className="h-[280px] animate-pulse rounded-lg bg-gray-100/80 dark:bg-ng-dark-elevated" />
    </div>
  ),
});

type Props = {
  contactsTotal: number;
  organizationsTotal: number;
  activityEventsTotal: number;
  weeks: WeekBucket[];
  recentActivities: ActivityRow[];
  actorOptions: { email: string; name: string | null }[];
  filters: { actor: string; from: string; to: string };
  dailyUserStats: DailyUserStat[];
};

function FieldDiffExtra({ event }: { event: ActivityRow }) {
  const m = event.metadata ?? {};
  const diffs = m.field_diffs as Array<{ label?: string; before?: string; after?: string }> | undefined;
  if (!Array.isArray(diffs) || diffs.length <= 1) return null;
  return (
    <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-gray-600 dark:text-gray-400">
      {diffs.slice(1).map((d, i) => (
        <li key={i}>
          <span className="font-semibold text-chart-4">{d.label ?? "Field"}</span>: <span className="italic">{d.before ?? "—"}</span>{" "}
          <span className="text-gray-400 dark:text-gray-600">→</span> <span className="italic">{d.after ?? "—"}</span>
        </li>
      ))}
    </ul>
  );
}

function ActivityMessage({ msg }: { msg: any }) {
  if (!msg.isStructured) {
    return <span>{msg.text}</span>;
  }

  return (
    <span>
      <span className="text-primary font-bold">{msg.actor}</span>{" "}
      <span className="opacity-80">{msg.actionWord}</span>{" "}
      {msg.field && (
        <span className="font-semibold px-1 bg-gray-100 dark:bg-gray-800 rounded">{msg.field}</span>
      )}
      {msg.field ? <span className="opacity-80"> for </span> : ""}
      {msg.targetName && (
        <span className="text-chart-4 font-semibold">{msg.targetName}</span>
      )}
      {msg.details && (
        <>
          <span className="opacity-80"> {"("}</span>
          <span className="italic text-gray-600 dark:text-gray-300">{msg.details}</span>
          <span className="opacity-80">{")"}</span>
        </>
      )}
    </span>
  );
}

export default function DashboardHomeClient(props: Props) {
  const {
    contactsTotal,
    organizationsTotal,
    activityEventsTotal,
    weeks,
    recentActivities,
    actorOptions,
    filters,
    dailyUserStats,
  } = props;
  const router = useRouter();
  const pathname = usePathname();

  const thisWeek = weeks[weeks.length - 1];
  const previousWeek = weeks[weeks.length - 2];
  const contactDelta = (thisWeek?.contactsAdded ?? 0) - (previousWeek?.contactsAdded ?? 0);
  const updateDelta = (thisWeek?.contactUpdates ?? 0) - (previousWeek?.contactUpdates ?? 0);
  const totalEmail = weeks.reduce((sum, week) => sum + week.outreachEmail, 0);
  const totalPhone = weeks.reduce((sum, week) => sum + week.outreachPhone, 0);
  const totalLinkedIn = weeks.reduce((sum, week) => sum + week.outreachLinkedIn, 0);

  const channelData = useMemo(
    () => [
      { name: "Email", value: totalEmail, fill: NG_YELLOW },
      { name: "Phone", value: totalPhone, fill: NG_TEAL_LIGHT },
      { name: "LinkedIn", value: totalLinkedIn, fill: NG_LIGHT_BLUE },
    ],
    [totalEmail, totalPhone, totalLinkedIn],
  );

  const onFilterSubmit = (formData: FormData) => {
    const params = new URLSearchParams();
    const actor = String(formData.get("actor") || "");
    const from = String(formData.get("from") || "");
    const to = String(formData.get("to") || "");
    if (actor) params.set("actor", actor);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-primary text-gray-900 dark:text-gray-100">Dashboard Home</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Total Contacts */}
        <Card className="border-gray-200 bg-white py-4 dark:border-ng-dark-elevated dark:bg-ng-dark-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">{contactsTotal}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This week: {thisWeek?.contactsAdded ?? 0} ({contactDelta >= 0 ? "+" : ""}
              {contactDelta} vs last week)
            </p>
          </CardContent>
        </Card>

        {/* Organizations */}
        <Card className="border-gray-200 bg-white py-4 dark:border-ng-dark-elevated dark:bg-ng-dark-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">{organizationsTotal}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-4/10">
                <Building2 className="h-5 w-5 text-chart-4" />
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Contact Updates */}
        <Card className="border-gray-200 bg-white py-4 dark:border-ng-dark-elevated dark:bg-ng-dark-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Contact Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">{thisWeek?.contactUpdates ?? 0}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-2/10">
                <UserRoundPlus className="h-5 w-5 text-chart-2" />
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {updateDelta >= 0 ? "+" : ""}
              {updateDelta} vs previous week
            </p>
          </CardContent>
        </Card>

        {/* Logged Activity */}
        <Card className="border-gray-200 bg-white py-4 dark:border-ng-dark-elevated dark:bg-ng-dark-card shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Logged Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">{activityEventsTotal}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <DashboardHomeCharts weeks={weeks} channelData={channelData} />

      {/* ── Team Daily Contribution ──────────────────────────────────── */}
      <div>
        {/* Section header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold font-primary text-gray-900 dark:text-gray-100">
              Team&apos;s Work Today
            </h2>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {dailyUserStats.length} active
          </span>
        </div>

        {/* Member cards grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {dailyUserStats.map((u, i) => {
            const displayName = u.name ?? u.email.split("@")[0] ?? u.email;
            const initials = displayName.slice(0, 2).toUpperCase();
            const href = `/home/user-analytics/${encodeURIComponent(u.email)}`;
            const av = AVATAR_VARIANTS[i % AVATAR_VARIANTS.length];

            return (
              <a
                key={u.email}
                href={href}
                className="group relative flex items-center gap-3 rounded-xl border border-gray-200 dark:border-ng-dark-elevated bg-white dark:bg-ng-dark-card px-4 py-3 overflow-hidden transition-all hover:border-gray-300 dark:hover:border-ng-dark-elevated/80 hover:bg-gray-50/80 dark:hover:bg-ng-dark-elevated/40"
              >
                {/* Active dot — absolutely positioned top-right */}
                <span
                  className="absolute top-3 right-3 h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: "#d9ff35",
                    boxShadow: "0 0 0 3px rgba(217,255,53,0.2)",
                  }}
                />

                {/* Avatar with inline styles to guarantee correct colors */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{ backgroundColor: av.bg, color: av.color }}
                >
                  {initials}
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">View today&apos;s data</p>
                </div>

                {/* Animated arrow */}
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
                  style={{ color: "#d9ff35" }}
                />
              </a>
            );
          })}
        </div>
      </div>

      {/* Activity Logs */}
      <Card className="border-gray-200 bg-white py-4 dark:border-ng-dark-elevated dark:bg-ng-dark-card shadow-sm">
        <CardHeader className="px-4 pb-4">
          <CardTitle className="text-base font-primary">Activity Logs</CardTitle>
          <form action={onFilterSubmit} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
            <select
              name="actor"
              defaultValue={filters.actor}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-ng-dark-elevated dark:bg-ng-dark-card"
            >
              <option value="">All actors</option>
              {actorOptions.map((actor) => (
                <option key={actor.email} value={actor.email}>
                  {actor.name || actor.email}
                </option>
              ))}
            </select>
            <Input name="from" type="date" defaultValue={filters.from} className="bg-white dark:bg-ng-dark-card" />
            <Input name="to" type="date" defaultValue={filters.to} className="bg-white dark:bg-ng-dark-card" />
            <Button
              type="submit"
              className="w-full md:w-auto font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              Apply filter
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(pathname)}
              className="w-full md:w-auto hover:bg-accent/10 hover:text-accent-foreground transition-colors"
            >
              Reset
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-500">No activity found for this filter range.</p>
          ) : (
            recentActivities.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-gray-200 p-3 bg-gray-50/50 hover:bg-gray-50 transition-colors dark:border-ng-dark-elevated dark:bg-ng-dark-elevated/30 dark:hover:bg-ng-dark-elevated/50"
              >
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  <ActivityMessage msg={event.display_message} />
                </p>
                <FieldDiffExtra event={event} />
                <p className="mt-2 text-xs font-mono text-gray-500">
                  {new Date(event.occurred_at).toLocaleString()} <span className="opacity-50 mx-1">·</span>{" "}
                  {event.actor_name || event.actor_email || "Unknown user"} <span className="opacity-50 mx-1">·</span>{" "}
                  <span className="capitalize">{event.entity_type}</span>
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}