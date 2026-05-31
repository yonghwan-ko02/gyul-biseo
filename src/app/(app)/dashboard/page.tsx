import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/Card";
import { DashboardChart } from "@/components/DashboardChart";
import { AiInsightWidget } from "@/components/AiInsightWidget";
import { format, subDays, startOfMonth } from "date-fns";
import styles from "./dashboard.module.css";


export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDayOfMonth = startOfMonth(new Date());

  // 1. 오늘 출하량 (pending 제외, shipped 기준)
  const todayShipments = await prisma.shipment.findMany({
    where: { 
      createdAt: { gte: today },
      status: "shipped",
      isDeleted: false 
    }
  });
  const todayBoxCount = todayShipments.reduce((acc, curr) => acc + curr.quantity, 0);

  // 2. 전체 미수금
  const unpaidShipments = await prisma.shipment.findMany({
    where: { paymentStatus: { in: ["unpaid", "partial"] }, isDeleted: false }
  });
  const totalUnpaid = unpaidShipments.reduce((acc, curr) => {
    const amount = curr.outstandingAmount || curr.totalAmount || (curr.quantity * (curr.unitPrice || 0));
    return acc + amount;
  }, 0);

  // 3. 이번 달 예상 매출
  const monthShipments = await prisma.shipment.findMany({
    where: { createdAt: { gte: firstDayOfMonth }, isDeleted: false }
  });
  const monthRevenue = monthShipments.reduce((acc, curr) => acc + (curr.totalAmount || (curr.quantity * (curr.unitPrice || 0))), 0);

  // 4. 최근 7일 주간 출하 추이 (단일 쿼리로 최적화)
  const sevenDaysAgo = subDays(new Date(), 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const weekShipments = await prisma.shipment.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
      status: "shipped",
      isDeleted: false,
    },
  });

  // 날짜별로 그룹핑
  const dailyMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = subDays(new Date(), i);
    dailyMap.set(format(d, "M/d"), 0);
  }
  for (const s of weekShipments) {
    const key = format(new Date(s.createdAt), "M/d");
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + s.quantity);
    }
  }
  const chartData = Array.from(dailyMap.entries()).map(([name, qty]) => ({
    name,
    출하량: qty,
  }));

  // 5. 최근 거래 (최대 3건)
  const recentTransactions = await prisma.shipment.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { customer: true }
  });

  return (
    <div className={styles.container}>
      <AiInsightWidget />

      <section className={styles.summary}>
        <Card variant="default" padding="lg" className={styles.recentCard}>
          <CardHeader title="오늘 출하" icon="📦" />
          <p className={`amount ${styles.bigNumber}`}>{todayBoxCount} 박스</p>
        </Card>

        <Card variant="danger" padding="lg" className={styles.recentCard}>
          <CardHeader title="미수금 합계" icon="💸" />
          <p className={`amount amount-negative ${styles.bigNumber}`}>
            ₩{totalUnpaid.toLocaleString()}
          </p>
        </Card>

        <Card variant="success" padding="lg" className={styles.recentCard}>
          <CardHeader title="이번 달 매출 (예상)" icon="💰" />
          <p className={`amount ${styles.bigNumber}`}>
            ₩{monthRevenue.toLocaleString()}
          </p>
        </Card>
      </section>

      <section className={styles.recent}>
        <h2>주간 출하량 추이</h2>
        <Card padding="md" className={styles.recentCard}>
          <DashboardChart data={chartData} />
        </Card>
      </section>

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
  );
}
