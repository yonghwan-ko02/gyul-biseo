"use client";

import Link from "next/link";
import styles from "./dashboard-widgets.module.css";

interface QuickActionBarProps {
  pendingCount: number;
  unpaidCount: number;
}

export function QuickActionBar({ pendingCount, unpaidCount }: QuickActionBarProps) {
  const actions = [
    { href: "/chat", icon: "💬", label: "채팅", badge: 0 },
    { href: "/ledger", icon: "📋", label: "발송대기", badge: pendingCount },
    { href: "/settlement", icon: "🧾", label: "정산서", badge: unpaidCount },
    { href: "/ledger", icon: "📒", label: "장부", badge: 0 },
  ];

  return (
    <div className={styles.quickBar}>
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className={styles.quickAction}
        >
          {action.badge > 0 && (
            <span className={styles.quickBadge}>{action.badge}</span>
          )}
          <span className={styles.quickActionIcon}>{action.icon}</span>
          <span className={styles.quickActionLabel}>{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
