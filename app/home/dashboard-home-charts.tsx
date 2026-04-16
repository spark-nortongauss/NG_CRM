"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import type { WeekBucket } from "./page";

type ChannelDatum = { name: string; value: number; fill: string };

type Props = {
  weeks: WeekBucket[];
  channelData: ChannelDatum[];
};

// Norton-Gauss brand palette aligned with globals.css
const NG_YELLOW       = "rgb(217, 255, 53)";
const NG_TEAL         = "rgb(45, 67, 68)";
const NG_TEAL_LIGHT   = "rgb(77, 104, 105)";
const NG_GRAY         = "rgb(128, 128, 128)";
const NG_LIGHT_BLUE   = "rgb(100, 130, 131)"; // Based on chart-4 dark mode

export const NG_CHANNEL_COLORS = {
  email:    NG_YELLOW,
  phone:    NG_TEAL_LIGHT,
  linkedin: NG_LIGHT_BLUE,
};

export default function DashboardHomeCharts({ weeks, channelData }: Props) {
  // Remap channel fills to NG palette
  const ngChannelData = channelData.map((d) => ({
    ...d,
    fill:
      d.name === "Email"    ? NG_YELLOW :
      d.name === "Phone"    ? NG_TEAL_LIGHT :
      d.name === "LinkedIn" ? NG_LIGHT_BLUE : d.fill,
  }));

  const outreachTotal = ngChannelData.reduce((s, d) => s + d.value, 0);

  const tooltipStyle = {
    backgroundColor: "#1e2d3d",
    border: "1px solid #2a3f52",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 12,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Weekly Contact Activity — line chart */}
        <div className="xl:col-span-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-ng-dark-elevated dark:bg-ng-dark-card">
          <p className="px-2 pt-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Weekly Contact Activity
          </p>
          <div className="h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <LineChart data={weeks} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-gray-200 dark:stroke-ng-dark-elevated"
                />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="contactsAdded"
                  name="Contacts added"
                  stroke={NG_YELLOW}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: NG_YELLOW }}
                />
                <Line
                  type="monotone"
                  dataKey="contactUpdates"
                  name="Contact updates"
                  stroke={NG_TEAL_LIGHT}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: NG_TEAL_LIGHT }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outreach Mix — donut chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-ng-dark-elevated dark:bg-ng-dark-card">
          <p className="px-2 pt-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Outreach Mix (8 weeks)
          </p>
          <div className="relative h-[320px] w-full min-w-0">
            {outreachTotal === 0 ? (
              <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-gray-500">
                No outreach signals in this window
              </p>
            ) : null}
            {outreachTotal > 0 ? (
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <PieChart>
                  <Pie
                    data={ngChannelData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {ngChannelData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>

      {/* Outreach Trend — bar chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-ng-dark-elevated dark:bg-ng-dark-card">
        <p className="px-2 pt-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          Outreach Trend (8 weeks)
        </p>
        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={weeks} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-ng-dark-elevated"
              />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="outreachEmail"    name="Email"    fill={NG_YELLOW} radius={[3, 3, 0, 0]} />
              <Bar dataKey="outreachPhone"    name="Phone"    fill={NG_TEAL_LIGHT}  radius={[3, 3, 0, 0]} />
              <Bar dataKey="outreachLinkedIn" name="LinkedIn" fill={NG_LIGHT_BLUE}     radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}