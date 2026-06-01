import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";

/**
 * (chat) 그룹 레이아웃 — Header + BottomNav + Sidebar를 포함하는 반응형 앱 레이아웃
 * chat, dashboard, ledger, settlement, settings 페이지가 이 레이아웃 안에 렌더링됨
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout-root">
      <Sidebar />
      <div className="layout-content">
        <Header />
        <main className="main-content">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}

