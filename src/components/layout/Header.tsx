"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";

export function Header() {
  const pathname = usePathname();

  /** 현재 페이지에 따른 제목 표시 */
  const getTitle = () => {
    if (pathname === "/chat" || pathname === "/") return "💬 귤비서";
    if (pathname === "/dashboard") return "📊 대시보드";
    if (pathname === "/ledger") return "📒 장부";
    if (pathname.startsWith("/settlement")) return "💰 정산서";
    if (pathname === "/settings") return "⚙️ 설정";
    return "🍊 귤비서";
  };

  return (
    <header className={styles.header}>
      <Link href="/chat" className={styles.logo} aria-label="귤비서 홈">
        🍊
      </Link>
      <h1 className={styles.title}>{getTitle()}</h1>
      <div className={styles.spacer} />
    </header>
  );
}
