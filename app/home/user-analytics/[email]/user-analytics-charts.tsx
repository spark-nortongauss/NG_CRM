"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const NG_YELLOW = "rgb(217, 255, 53)";
const NG_TEAL = "rgb(45, 67, 68)";
const NG_TEAL_LIGHT = "rgb(77, 104, 105)";
const NG_LIGHT_BLUE = "rgb(100, 130, 131)";
const NG_GRAY = "rgb(128, 128, 128)";

const tooltipStyle = {
  backgroundColor: "#1e2d3d",
  border: "1px solid #2a3f52",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
};

type Props = {
  hourlyActivity: number[];
  actionTypeCounts: Record<string, number>;
  entityTypeCounts: Record<string, number>;
  channelCounts: Record<string, number>;
};

const ACTION_COLORS: Record<string, string> = {
  "contact.created": NG_YELLOW,
  "contact.updated": NG_TEAL_LIGHT,
  "contact.deleted": "#ef4444",
  "organization.created": NG_LIGHT_BLUE,
  "organization.updated": NG_GRAY,
  "organization.deleted": "#f97316",
  "task.created": "rgb(189, 221, 56)",
  "task.updated": "rgb(56, 189, 172)",
  "task.deleted": "#e11d48",
};

const ENTITY_COLORS: Record<string, string> = {
  contact: NG_YELLOW,
  organization: NG_TEAL_LIGHT,
  task: NG_LIGHT_BLUE,
};

const CHANNEL_COLORS: Record<string, string> = {
  email: NG_YELLOW,
  phone: NG_TEAL_LIGHT,
  linkedin: NG_LIGHT_BLUE,
  meeting: "rgb(189, 221, 56)",
  other: NG_GRAY,
};

export default function UserAnalyticsCharts({
  hourlyActivity,
  actionTypeCounts,
  entityTypeCounts,
  channelCounts,
}: Props) {
  // Hourly timeline
  const hourlyData = hourlyActivity.map((count, hour) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    events: count,
  }));

  // Action type bar data
  const actionData = Object.entries(actionTypeCounts).map(([action, count]) => ({
    name: action.replace(".", " ").replace("_", " "),
    rawKey: action,
    count,
  }));

  // Entity type pie
  const entityData = Object.entries(entityTypeCounts).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
    fill: ENTITY_COLORS[type] ?? NG_GRAY,
  }));

  // Channel pie
  const channelData = Object.entries(channelCounts).map(([ch, count]) => ({
    name: ch.charAt(0).toUpperCase() + ch.slice(1),
    value: count,
    fill: CHANNEL_COLORS[ch] ?? NG_GRAY,
  }));

  const totalEvents = hourlyActivity.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Hourly Activity Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-ng-dark-elevated dark:bg-ng-dark-card">
        <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
          Activity Timeline — Today (by hour)
        </p>
        <div className="h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <AreaChart data={hourlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NG_YELLOW} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={NG_YELLOW} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-ng-dark-elevated"
              />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10 }}
                interval={3}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="events"
                name="Events"
                stroke={NG_YELLOW}
                strokeWidth={2.5}
                fill="url(#hourlyGrad)"
                dot={false}
                activeDot={{ r: 5, fill: NG_YELLOW }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Action Type Bar */}
        <div className="xl:col-span-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-ng-dark-elevated dark:bg-ng-dark-card">
          <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
            Actions Breakdown
          </p>
          {actionData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
              No actions today
            </div>
          ) : (
            <div className="h-[200px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <BarChart data={actionData} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-ng-dark-elevated"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Events" radius={[4, 4, 0, 0]}>
                    {actionData.map((entry) => (
                      <Cell
                        key={entry.rawKey}
                        fill={ACTION_COLORS[entry.rawKey] ?? NG_TEAL_LIGHT}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Entity Type Donut */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-ng-dark-elevated dark:bg-ng-dark-card">
          <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
            Entity Mix
          </p>
          {entityData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
              No data
            </div>
          ) : (
            <div className="h-[200px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <PieChart>
                  <Pie
                    data={entityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={72}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {entityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Channel distribution (only when present) */}
      {channelData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-ng-dark-elevated dark:bg-ng-dark-card">
          <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
            Outreach Channels
          </p>
          <div className="h-[180px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <BarChart
                data={channelData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 60, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-200 dark:stroke-ng-dark-elevated"
                />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Events" radius={[0, 4, 4, 0]}>
                  {channelData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
