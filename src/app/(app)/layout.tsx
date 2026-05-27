import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

/**
 * (chat) 그룹 레이아웃 — Header + BottomNav를 공유하는 모든 앱 페이지
 * chat, dashboard, ledger, settlement, settings 페이지가 이 레이아웃 안에 렌더링됨
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="main-content">{children}</main>
      <BottomNav />
    </>
  );
}
