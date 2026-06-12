import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/Card";
import { AiInsightWidget } from "@/components/AiInsightWidget";
import { PendingOrderBanner } from "@/components/dashboard/PendingOrderBanner";
import { GrowthIndicator } from "@/components/dashboard/GrowthIndicator";
import { QuickActionBar } from "@/components/dashboard/QuickActionBar";
import { DashboardChartTabs } from "@/components/dashboard/DashboardChartTabs";
import { DashboardVarietyChart } from "@/components/dashboard/DashboardVarietyChart";
import { TopUnpaidRanking } from "@/components/dashboard/TopUnpaidRanking";
import { FarmLogWidget } from "@/components/dashboard/FarmLogWidget";
import { format, subDays, startOfMonth, subMonths } from "date-fns";
import styles from "./dashboard.module.css";


export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDayOfMonth = startOfMonth(now);
  const firstDayOfPrevMonth = startOfMonth(subMonths(now, 1));

  // ═══════════════════════════════════════════
  // 1. 오늘 출하량 (shipped 기준)
  // ═══════════════════════════════════════════
  const todayShipments = await prisma.shipment.findMany({
    where: { 
      shipmentDate: { gte: today },
      status: "shipped",
      isDeleted: false 
    }
  });
  const todayBoxCount = todayShipments.reduce((acc, curr) => acc + curr.quantity, 0);

  // ═══════════════════════════════════════════
  // 2. 전체 미수금
  // ═══════════════════════════════════════════
  const unpaidShipments = await prisma.shipment.findMany({
    where: { 
      paymentStatus: { in: ["unpaid", "partial"] }, 
      isDeleted: false,
      customer: { isDeleted: false }
    },
    include: { customer: true }
  });
  const totalUnpaid = unpaidShipments.reduce((acc, curr) => {
    const amount = curr.outstandingAmount || curr.totalAmount || (curr.quantity * (curr.unitPrice || 0));
    return acc + amount;
  }, 0);

  // ═══════════════════════════════════════════
  // 3. 이번 달 + 전월 매출 (성장률용)
  // ═══════════════════════════════════════════
  const allRecentShipments = await prisma.shipment.findMany({
    where: { shipmentDate: { gte: firstDayOfPrevMonth }, isDeleted: false }
  });

  const monthShipments = allRecentShipments.filter(s => new Date(s.shipmentDate) >= firstDayOfMonth);
  const prevMonthShipments = allRecentShipments.filter(
    s => new Date(s.shipmentDate) >= firstDayOfPrevMonth && new Date(s.shipmentDate) < firstDayOfMonth
  );

  const calcRevenue = (shipments: typeof allRecentShipments) =>
    shipments.reduce((acc, curr) => acc + (curr.totalAmount || (curr.quantity * (curr.unitPrice || 0))), 0);
  const calcBoxes = (shipments: typeof allRecentShipments) =>
    shipments.filter(s => s.status === "shipped").reduce((acc, curr) => acc + curr.quantity, 0);

  const monthRevenue = calcRevenue(monthShipments);
  const prevMonthRevenue = calcRevenue(prevMonthShipments);
  const monthBoxes = calcBoxes(monthShipments);
  const prevMonthBoxes = calcBoxes(prevMonthShipments);

  // 전월 미수금 계산
  const prevMonthUnpaid = prevMonthShipments
    .filter(s => ["unpaid", "partial"].includes(s.paymentStatus))
    .reduce((acc, curr) => {
      return acc + (curr.outstandingAmount || curr.totalAmount || (curr.quantity * (curr.unitPrice || 0)));
    }, 0);

  // ═══════════════════════════════════════════
  // 4. 발송대기 주문 건수
  // ═══════════════════════════════════════════
  const pendingOrderCount = await prisma.shipment.count({
    where: { status: "pending", isDeleted: false }
  });

  // ═══════════════════════════════════════════
  // 5. 주간 출하 추이 (7일)
  // ═══════════════════════════════════════════
  const sevenDaysAgo = subDays(now, 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const weekShipments = await prisma.shipment.findMany({
    where: {
      shipmentDate: { gte: sevenDaysAgo },
      status: "shipped",
      isDeleted: false,
    },
  });

  const dailyMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    dailyMap.set(format(d, "M/d"), 0);
  }
  for (const s of weekShipments) {
    const key = format(new Date(s.shipmentDate), "M/d");
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + s.quantity);
    }
  }
  const weeklyChartData = Array.from(dailyMap.entries()).map(([name, qty]) => ({
    name,
    출하량: qty,
  }));

  // ═══════════════════════════════════════════
  // 6. 월별 매출 트렌드 (6개월)
  // ═══════════════════════════════════════════
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));
  const sixMonthShipments = await prisma.shipment.findMany({
    where: { shipmentDate: { gte: sixMonthsAgo }, isDeleted: false },
  });

  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    monthlyMap.set(format(d, "M월"), 0);
  }
  for (const s of sixMonthShipments) {
    const key = format(new Date(s.shipmentDate), "M월");
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + (s.totalAmount || (s.quantity * (s.unitPrice || 0))));
    }
  }
  const monthlyChartData = Array.from(monthlyMap.entries()).map(([name, amount]) => ({
    name,
    매출: amount,
  }));

  // ═══════════════════════════════════════════
  // 7. 품종별 매출 분석
  // ═══════════════════════════════════════════
  const allShipments = await prisma.shipment.findMany({
    where: { isDeleted: false },
  });

  const varietyMap = new Map<string, { totalAmount: number; quantity: number }>();
  for (const s of allShipments) {
    const key = s.variety || "기타";
    const existing = varietyMap.get(key) || { totalAmount: 0, quantity: 0 };
    existing.totalAmount += s.totalAmount || (s.quantity * (s.unitPrice || 0));
    existing.quantity += s.quantity;
    varietyMap.set(key, existing);
  }
  const varietyData = Array.from(varietyMap.entries())
    .map(([variety, data]) => ({ variety, ...data }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // ═══════════════════════════════════════════
  // 8. 거래처 TOP 5 미수금 랭킹
  // ═══════════════════════════════════════════
  const customerUnpaidMap = new Map<string, { customerName: string; totalUnpaid: number; count: number }>();
  for (const s of unpaidShipments) {
    const amount = s.outstandingAmount || s.totalAmount || (s.quantity * (s.unitPrice || 0));
    if (amount > 0) {
      const existing = customerUnpaidMap.get(s.customerId) || {
        customerName: s.customer.name,
        totalUnpaid: 0,
        count: 0,
      };
      existing.totalUnpaid += amount;
      existing.count += 1;
      customerUnpaidMap.set(s.customerId, existing);
    }
  }
  const topUnpaidCustomers = Array.from(customerUnpaidMap.values())
    .sort((a, b) => b.totalUnpaid - a.totalUnpaid)
    .slice(0, 5);

  // 미수금 있는 거래처 수 (빠른 액션 배지용)
  const unpaidCustomerCount = customerUnpaidMap.size;

  // ═══════════════════════════════════════════
  // 9. 영농일지 최근 기록
  // ═══════════════════════════════════════════
  const recentFarmLogs = await prisma.farmLog.findMany({
    where: { isDeleted: false },
    orderBy: { logDate: "desc" },
    take: 2,
  });

  const farmLogEntries = recentFarmLogs.map((log) => ({
    id: log.id,
    logDate: log.logDate.toISOString(),
    category: log.category,
    description: log.description,
  }));

  // 마지막 기록 이후 경과일
  let daysSinceLastLog: number | null = null;
  if (recentFarmLogs.length > 0) {
    const lastLogDate = new Date(recentFarmLogs[0].logDate);
    daysSinceLastLog = Math.floor((now.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // ═══════════════════════════════════════════
  // 10. 최근 거래 (최대 3건)
  // ═══════════════════════════════════════════
  const recentTransactions = await prisma.shipment.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { customer: true }
  });

  // ═══════════════════════════════════════════
  // 렌더링
  // ═══════════════════════════════════════════
  return (
    <div className={styles.container}>
      {/* 1. 발송대기 주문 알림은 전면 배치 */}
      <PendingOrderBanner count={pendingOrderCount} />

      <div className={styles.dashboardGrid}>
        {/* 좌측 메인 영역: AI 인사이트 및 시각 차트 분석 */}
        <div className={styles.leftColumn}>
          {/* 2. AI 인사이트 */}
          <AiInsightWidget />

          {/* 3. 차트 탭 (주간 출하 / 월별 매출) */}
          <section className={styles.recent}>
            <h2>출하 & 매출 추이</h2>
            <Card padding="md" className={styles.recentCard}>
              <DashboardChartTabs
                weeklyData={weeklyChartData}
                monthlyData={monthlyChartData}
              />
            </Card>
          </section>

          {/* 4. 품종별 매출 분석 */}
          <section className={styles.recent}>
            <h2>품종별 매출 분석</h2>
            <Card padding="md" className={styles.recentCard}>
              <DashboardVarietyChart data={varietyData} />
            </Card>
          </section>
        </div>

        {/* 우측 사이드바 영역: 요약 카드, 미수금, 로그 및 최근 거래 리스트 */}
        <div className={styles.rightColumn}>
          {/* 5. 빠른 액션 바 */}
          <QuickActionBar pendingCount={pendingOrderCount} unpaidCount={unpaidCustomerCount} />

          {/* 6. 요약 카드 (성장률 포함) */}
          <section className={styles.summaryGrid}>
            <Card variant="default" padding="lg" className={styles.recentCard}>
              <CardHeader title="오늘 출하" icon="📦" />
              <p className={`amount ${styles.bigNumber}`}>{todayBoxCount} 박스</p>
              <GrowthIndicator current={monthBoxes} previous={prevMonthBoxes} />
            </Card>

            <Card variant="danger" padding="lg" className={styles.recentCard}>
              <CardHeader title="미수금 합계" icon="💸" />
              <p className={`amount amount-negative ${styles.bigNumber}`}>
                ₩{totalUnpaid.toLocaleString()}
              </p>
              <GrowthIndicator current={totalUnpaid} previous={prevMonthUnpaid} />
            </Card>

            <Card variant="success" padding="lg" className={styles.recentCard}>
              <CardHeader title="이번 달 매출 (예상)" icon="💰" />
              <p className={`amount ${styles.bigNumber}`}>
                ₩{monthRevenue.toLocaleString()}
              </p>
              <GrowthIndicator current={monthRevenue} previous={prevMonthRevenue} />
            </Card>
          </section>

          {/* 7. 거래처 TOP 5 미수금 랭킹 */}
          <section className={styles.recent}>
            <h2>거래처 미수금 TOP 5</h2>
            <Card padding="md" className={styles.recentCard}>
              <TopUnpaidRanking data={topUnpaidCustomers} totalUnpaid={totalUnpaid} />
            </Card>
          </section>

          {/* 8. 영농일지 최근 기록 */}
          <section className={styles.recent}>
            <h2>영농일지</h2>
            <Card padding="md" className={styles.recentCard}>
              <FarmLogWidget logs={farmLogEntries} daysSinceLastLog={daysSinceLastLog} />
            </Card>
          </section>

          {/* 9. 최근 거래 내역 */}
          <section className={styles.recent}>
            <h2>최근 거래 내역</h2>
            {recentTransactions.length === 0 ? (
              <p className="text-secondary">아직 기록된 거래가 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                {recentTransactions.map((tx) => (
                  <Card key={tx.id} padding="md" className={styles.recentCard}>
                    <div className={styles.txItem}>
                      <div className={styles.txDetails}>
                        <h3 className={styles.txTitle}>
                          {tx.customer.name} 
                          {tx.status === "pending" && (
                            <span className={`${styles.txBadge} ${styles.txBadgePending}`}>
                              주문접수
                            </span>
                          )}
                        </h3>
                        <p className="text-secondary text-sm">
                          {format(new Date(tx.createdAt), "MM/dd HH:mm")} · {tx.variety} {tx.quantity}{tx.memo?.replace('단위: ', '') || '박스'}
                        </p>
                      </div>
                      <div className={`amount ${tx.paymentStatus === 'paid' ? 'amount-positive' : 'amount-negative'} ${styles.txStatus}`}>
                        {tx.paymentStatus === 'paid' ? '결제완료' : '미수금'}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

