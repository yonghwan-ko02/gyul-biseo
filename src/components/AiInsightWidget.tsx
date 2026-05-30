"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";

export function AiInsightWidget() {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsight() {
      try {
        const res = await fetch("/api/insight");
        const data = await res.json();
        setInsight(data.insight);
      } catch (err) {
        console.error("Failed to load AI insight:", err);
        setInsight("삼춘, 지금 AI 정산 비서가 밭에 나가서 답장이 늦어지쿠다. 조금 이따 대시보드를 다시 켜주십서! 🍊");
      } finally {
        setLoading(false);
      }
    }
    fetchInsight();
  }, []);

  return (
    <Card 
      padding="lg" 
      style={{ 
        borderLeft: "6px solid var(--color-primary)",
        background: "linear-gradient(135deg, rgba(255, 140, 0, 0.07) 0%, rgba(255, 243, 224, 0.3) 100%)",
        backdropFilter: "blur(12px)",
        boxShadow: "var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-sm)",
        transition: "transform var(--transition-normal), box-shadow var(--transition-normal)",
        cursor: "pointer"
      }}
      className="animate-fade-in"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "2px" }}>
        <span style={{ fontSize: "1.75rem", filter: "drop-shadow(0 2px 4px rgba(255, 140, 0, 0.2))" }}>🍊</span>
        <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: "900", color: "var(--color-primary-dark)", margin: 0, letterSpacing: "-0.02em" }}>
          귤비서의 따뜻한 농가 진단 인사이트
        </h3>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
          <div 
            style={{ 
              height: "18px", 
              backgroundColor: "var(--color-border)", 
              borderRadius: "4px",
              width: "90%",
              animation: "pulse 1.5s infinite ease-in-out"
            }} 
          />
          <div 
            style={{ 
              height: "18px", 
              backgroundColor: "var(--color-border)", 
              borderRadius: "4px",
              width: "75%",
              animation: "pulse 1.5s infinite ease-in-out"
            }} 
          />
        </div>
      ) : (
        <p 
          style={{ 
            fontSize: "var(--font-size-md)", 
            lineHeight: "1.6", 
            color: "var(--color-text-primary)",
            fontWeight: "500",
            margin: 0
          }}
        >
          {insight}
        </p>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </Card>
  );
}
