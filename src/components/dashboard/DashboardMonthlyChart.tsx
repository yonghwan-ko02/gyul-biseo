"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MonthlyData {
  name: string;
  매출: number;
}

interface DashboardMonthlyChartProps {
  data: MonthlyData[];
}

function formatAmount(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만`;
  }
  return value.toLocaleString();
}

export function DashboardMonthlyChart({ data }: DashboardMonthlyChartProps) {
  return (
    <div style={{ width: "100%", height: 250, marginTop: "var(--space-md)" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF7E00" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#FF7E00" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 14, fill: "var(--color-text-secondary)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--color-text-tertiary)" }}
            tickFormatter={formatAmount}
            width={50}
          />
          <Tooltip
            cursor={{ strokeDasharray: "4 4", stroke: "var(--color-border)" }}
            contentStyle={{
              borderRadius: "10px",
              border: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              fontSize: "var(--font-size-sm)",
            }}
            formatter={(value) => [`₩${Number(value).toLocaleString()}`, "매출"]}
          />
          <Area
            type="monotone"
            dataKey="매출"
            stroke="#FF7E00"
            strokeWidth={2.5}
            fill="url(#monthlyGradient)"
            dot={{ fill: "#FF7E00", r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#FF7E00", stroke: "white", strokeWidth: 2 }}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
