"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  description: string;
}

const navItems: NavItem[] = [
  { href: "/chat", icon: "💬", label: "AI 귤비서", description: "음성/텍스트 업무 기록" },
  { href: "/dashboard", icon: "📊", label: "종합 현황", description: "매출 및 출하 통계 대시보드" },
  { href: "/ledger", icon: "📒", label: "출하 장부", description: "전체 출하 내역 목록" },
  { href: "/settlement", icon: "💰", label: "미수금 정산", description: "거래처별 미수금 관리" },
  { href: "/customers", icon: "👥", label: "고객 관리", description: "거래처 전화번호 및 주소록" },
  { href: "/settings", icon: "⚙️", label: "농가 설정", description: "계좌번호 및 개인 정보 설정" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar} aria-label="사이드 메뉴">
      <div className={styles.logoArea}>
        <span className={styles.logoIcon}>🍊</span>
        <div className={styles.logoText}>
          <h2 className={styles.title}>귤비서</h2>
          <span className={styles.subtitle}>스마트 농가 ERP</span>
        </div>
      </div>

      <div className={styles.profileBox}>
        <div className={styles.avatar}>👨‍🌾</div>
        <div className={styles.profileInfo}>
          <span className={styles.profileName}>용환 농가님</span>
          <span className={styles.profileRole}>농장 관리자</span>
        </div>
      </div>

      <nav className={styles.nav}>
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
              <div className={styles.textContainer}>
                <span className={styles.label}>{item.label}</span>
                <span className={styles.description}>{item.description}</span>
              </div>
              {isActive && <div className={styles.activeIndicator} />}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <p className={styles.footerText}>© 2026 Gyul-Biseo</p>
        <p className={styles.footerSubText}>Premium Citrus Service</p>
      </div>
    </aside>
  );
}
