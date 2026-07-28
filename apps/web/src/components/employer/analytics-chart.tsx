"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DailyEvent = {
  day: string;
  event_type: "impression" | "view" | "click" | "apply" | "chat_request";
  total: number;
};

export function AnalyticsChart({ daily, days }: { daily: DailyEvent[]; days: string[] }) {
  const byDay = new Map(days.map((day) => [day, { views: 0, clicks: 0, applies: 0, chats: 0 }]));
  for (const event of daily) {
    const bucket = byDay.get(event.day);
    if (!bucket) continue;
    if (event.event_type === "view") bucket.views += Number(event.total);
    if (event.event_type === "click") bucket.clicks += Number(event.total);
    if (event.event_type === "apply") bucket.applies += Number(event.total);
    if (event.event_type === "chat_request") bucket.chats += Number(event.total);
  }

  const data = days.map((day) => ({
    day: new Date(day).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    ...byDay.get(day)!,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillApplies" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="views" stroke="var(--chart-1)" fill="url(#fillViews)" strokeWidth={2} name="Views" />
          <Area type="monotone" dataKey="clicks" stroke="var(--chart-3)" fill="none" strokeWidth={2} name="Clicks" />
          <Area type="monotone" dataKey="applies" stroke="var(--chart-2)" fill="url(#fillApplies)" strokeWidth={2} name="Applies" />
          <Area type="monotone" dataKey="chats" stroke="var(--chart-4)" fill="none" strokeWidth={2} name="Chats" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
