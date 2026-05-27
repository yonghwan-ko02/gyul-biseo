"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/chat", icon: "💬", label: "채팅" },
  { href: "/dashboard", icon: "📊", label: "현황" },
  { href: "/ledger", icon: "📒", label: "장부" },
  { href: "/settlement", icon: "💰", label: "정산" },
  { href: "/settings", icon: "⚙️", label: "설정" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="메인 메뉴">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${isActive ? styles.active : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
