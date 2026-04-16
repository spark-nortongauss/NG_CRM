"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Activity,
  Building2,
  Users,
  Zap,
  Edit3,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UserAnalyticsCharts = dynamic(() => import("./user-analytics-charts"), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="h-[220px] animate-pulse rounded-xl bg-gray-100/80 dark:bg-ng-dark-elevated" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 h-[240px] animate-pulse rounded-xl bg-gray-100/80 dark:bg-ng-dark-elevated" />
        <div className="h-[240px] animate-pulse rounded-xl bg-gray-100/80 dark:bg-ng-dark-elevated" />
      </div>
    </div>
  ),
});

type ActivityRow = {
  id: string;
  occurred_at: string;
  actor_name: string | null;
  actor_email: string | null;
  action_type: string;
  entity_type: "contact" | "organization" | "task";
  metadata: Record<string, unknown> | null;
  channel: string | null;
  contact_id: string | null;
  org_id: string | null;
  summary: string | null;
  display_message: any;
};

type Props = {
  actorEmail: string;
  actorName: string;
  date: string;
  stats: {
    totalEvents: number;
    contactsAdded: number;
    contactsAffected: number;
    orgsAffected: number;
    fieldChanges: number;
  };
  actionTypeCounts: Record<string, number>;
  entityTypeCounts: Record<string, number>;
  channelCounts: Record<string, number>;
  hourlyActivity: number[];
  activities: ActivityRow[];
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function ActivityMessage({ msg }: { msg: any }) {
  if (!msg?.isStructured) {
    return <span>{msg?.text ?? ""}</span>;
  }
  return (
    <span>
      <span className="text-primary font-bold">{msg.actor}</span>{" "}
      <span className="opacity-80">{msg.actionWord}</span>{" "}
      {msg.field && (
        <span className="font-semibold px-1 bg-gray-100 dark:bg-gray-800 rounded">
          {msg.field}
        </span>
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

function FieldDiffExtra({ event }: { event: ActivityRow }) {
  const m = event.metadata ?? {};
  const diffs = m.field_diffs as
    | Array<{ label?: string; before?: string; after?: string }>
    | undefined;
  if (!Array.isArray(diffs) || diffs.length <= 1) return null;
  return (
    <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-gray-600 dark:text-gray-400">
      {diffs.slice(1).map((d, i) => (
        <li key={i}>
          <span className="font-semibold text-chart-4">{d.label ?? "Field"}</span>:{" "}
          <span className="italic">{d.before ?? "—"}</span>{" "}
          <span className="text-gray-400 dark:text-gray-600">→</span>{" "}
          <span className="italic">{d.after ?? "—"}</span>
        </li>
      ))}
    </ul>
  );
}

const ACTION_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  "contact.created": { label: "Created", color: "bg-[rgb(217,255,53)]/20 text-[rgb(120,160,20)] dark:text-[rgb(217,255,53)]" },
  "contact.updated": { label: "Updated", color: "bg-blue-100/60 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  "contact.deleted": { label: "Deleted", color: "bg-red-100/60 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  "organization.created": { label: "Org Created", color: "bg-teal-100/60 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  "organization.updated": { label: "Org Updated", color: "bg-indigo-100/60 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  "organization.deleted": { label: "Org Deleted", color: "bg-orange-100/60 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  "task.created": { label: "Task", color: "bg-purple-100/60 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  "task.updated": { label: "Task Updated", color: "bg-violet-100/60 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
};

export default function UserAnalyticsClient({
  actorEmail,
  actorName,
  date,
  stats,
  actionTypeCounts,
  entityTypeCounts,
  channelCounts,
  hourlyActivity,
  activities,
}: Props) {
  const initials = getInitials(actorName);
  const dateFormatted = new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const statCards = [
    {
      label: "Total Events",
      value: stats.totalEvents,
      icon: <Activity className="h-5 w-5" />,
      color: "bg-primary/10 text-primary",
      sub: "All activity today",
    },
    {
      label: "Contacts Added",
      value: stats.contactsAdded,
      icon: <Users className="h-5 w-5" />,
      color: "bg-[rgb(217,255,53)]/20 text-[rgb(100,130,20)] dark:text-[rgb(217,255,53)]",
      sub: "New contacts created",
    },
    {
      label: "Contacts Touched",
      value: stats.contactsAffected,
      icon: <Edit3 className="h-5 w-5" />,
      color: "bg-blue-100/60 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
      sub: "Distinct contacts affected",
    },
    {
      label: "Orgs Affected",
      value: stats.orgsAffected,
      icon: <Building2 className="h-5 w-5" />,
      color: "bg-teal-100/60 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300",
      sub: "Organizations touched",
    },
    {
      label: "Field Changes",
      value: stats.fieldChanges,
      icon: <Zap className="h-5 w-5" />,
      color: "bg-orange-100/60 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300",
      sub: "Individual field updates",
    },
  ];

  return (
    <div className="min-h-screen space-y-6 p-4 sm:p-6">
      {/* Back button */}
      <div>
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ng-teal via-[rgb(30,52,53)] to-[rgb(15,28,29)] p-6 sm:p-8 shadow-xl">
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[rgb(217,255,53)]/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-[rgb(77,104,105)]/20 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[rgb(217,255,53)] shadow-lg shadow-[rgb(217,255,53)]/20">
            <span className="text-2xl font-bold text-[rgb(15,28,29)] font-primary">
              {initials}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white font-primary truncate">
              {actorName}&apos;s Data Today
            </h1>
            <p className="mt-1 text-sm text-white/60 truncate">{actorEmail}</p>
            <div className="mt-2 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[rgb(217,255,53)]" />
              <span className="text-sm text-[rgb(217,255,53)] font-medium">{dateFormatted}</span>
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[rgb(217,255,53)]/20 px-2.5 py-0.5 text-xs font-semibold text-[rgb(217,255,53)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[rgb(217,255,53)] animate-pulse inline-block" />
                Live — resets at midnight
              </span>
            </div>
          </div>

          {/* Big number */}
          <div className="shrink-0 text-center sm:text-right">
            <p className="text-5xl font-bold text-[rgb(217,255,53)] font-primary leading-none">
              {stats.totalEvents}
            </p>
            <p className="mt-1 text-xs text-white/50 uppercase tracking-widest">
              events today
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => (
          <Card
            key={card.label}
            className="border-gray-200 bg-white py-4 dark:border-ng-dark-elevated dark:bg-ng-dark-card shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <CardHeader className="px-4 pb-1">
              <CardTitle className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-foreground">{card.value}</span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
                  {card.icon}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400 leading-tight">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <UserAnalyticsCharts
        hourlyActivity={hourlyActivity}
        actionTypeCounts={actionTypeCounts}
        entityTypeCounts={entityTypeCounts}
        channelCounts={channelCounts}
      />

      {/* Activity Log */}
      <Card className="border-gray-200 bg-white dark:border-ng-dark-elevated dark:bg-ng-dark-card shadow-sm">
        <CardHeader className="px-5 pb-3 pt-5">
          <CardTitle className="text-base font-primary flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Today&apos;s Activity Log
            <span className="ml-auto text-xs font-normal text-gray-400 font-sans">
              {activities.length} event{activities.length !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-ng-dark-elevated mb-3">
                <Activity className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No activity today</p>
              <p className="text-xs text-gray-400 mt-1">
                {actorName} hasn&apos;t made any changes yet today.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activities.map((event) => {
                const badge = ACTION_TYPE_BADGE[event.action_type];
                return (
                  <div
                    key={event.id}
                    className="group rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 transition-all hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm dark:border-ng-dark-elevated dark:bg-ng-dark-elevated/30 dark:hover:bg-ng-dark-elevated/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed flex-1">
                        <ActivityMessage msg={event.display_message} />
                      </p>
                      {badge && (
                        <span
                          className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <FieldDiffExtra event={event} />
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 font-mono">
                      <span>
                        {new Date(event.occurred_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      {event.channel && (
                        <>
                          <span className="opacity-40">·</span>
                          <span className="capitalize">{event.channel}</span>
                        </>
                      )}
                      <span className="opacity-40">·</span>
                      <span className="capitalize">{event.entity_type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
