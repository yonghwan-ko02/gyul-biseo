"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import styles from "./dashboard-widgets.module.css";

interface VarietyData {
  variety: string;
  totalAmount: number;
  quantity: number;
}

interface DashboardVarietyChartProps {
  data: VarietyData[];
}

const COLORS = [
  "#FF7E00", // 귤 오렌지
  "#FFB347", // 밝은 오렌지
  "#3A6922", // 감귤잎 그린
  "#FF6B6B", // 산호
  "#8B5CF6", // 바이올렛
  "#06B6D4", // 시안
  "#F59E0B", // 황금
  "#EC4899", // 핑크
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: VarietyData }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div
      style={{
        background: "white",
        borderRadius: "10px",
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        border: "none",
        fontSize: "var(--font-size-sm)",
      }}
    >
      <p style={{ fontWeight: 700, margin: 0 }}>{item.name}</p>
      <p style={{ margin: "4px 0 0", color: "var(--color-text-secondary)" }}>
        매출: ₩{item.value.toLocaleString()}
      </p>
      <p style={{ margin: "2px 0 0", color: "var(--color-text-tertiary)" }}>
        {item.payload.quantity}박스
      </p>
    </div>
  );
}

export function DashboardVarietyChart({ data }: DashboardVarietyChartProps) {
  if (data.length === 0) {
    return (
      <div className={styles.varietyEmpty}>
        <p>품종별 데이터가 아직 없습니다.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.variety,
    value: d.totalAmount,
    quantity: d.quantity,
  }));

  return (
    <div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((_entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.varietyLegend}>
        {chartData.map((entry, idx) => (
          <span key={entry.name} className={styles.varietyLegendItem}>
            <span
              className={styles.varietyLegendDot}
              style={{ background: COLORS[idx % COLORS.length] }}
            />
            {entry.name}
          </span>
        ))}
      </div>
    </div>
  );
}
