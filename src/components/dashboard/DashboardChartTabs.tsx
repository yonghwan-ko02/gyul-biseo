"use client";

import { useState } from "react";
import { DashboardChart } from "@/components/DashboardChart";
import { DashboardMonthlyChart } from "./DashboardMonthlyChart";
import styles from "./dashboard-widgets.module.css";

interface WeeklyData {
  name: string;
  출하량: number;
}

interface MonthlyData {
  name: string;
  매출: number;
}

interface DashboardChartTabsProps {
  weeklyData: WeeklyData[];
  monthlyData: MonthlyData[];
}

export function DashboardChartTabs({ weeklyData, monthlyData }: DashboardChartTabsProps) {
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly">("weekly");

  return (
    <div>
      <div className={styles.chartTabs}>
        <button
          className={`${styles.chartTab} ${activeTab === "weekly" ? styles.chartTabActive : ""}`}
          onClick={() => setActiveTab("weekly")}
        >
          📦 주간 출하
        </button>
        <button
          className={`${styles.chartTab} ${activeTab === "monthly" ? styles.chartTabActive : ""}`}
          onClick={() => setActiveTab("monthly")}
        >
          💰 월별 매출
        </button>
      </div>
      {activeTab === "weekly" ? (
        <DashboardChart data={weeklyData} />
      ) : (
        <DashboardMonthlyChart data={monthlyData} />
      )}
    </div>
  );
}
