"use client";

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ChartData {
  name: string;
  출하량: number;
}

interface Props {
  data: ChartData[];
}

export function DashboardChart({ data }: Props) {
  return (
    <div style={{ width: "100%", height: 250, marginTop: "var(--space-md)" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 14, fill: "var(--color-text-secondary)" }} />
          <Tooltip 
            cursor={{ fill: "var(--color-background)" }}
            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          />
          <Bar dataKey="출하량" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
