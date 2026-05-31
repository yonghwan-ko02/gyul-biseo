import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { SettlementCardActions } from "@/components/settlement/SettlementCardActions";
import styles from "./settlement.module.css";


export const dynamic = "force-dynamic";

export default async function SettlementPage() {
  const farm = await prisma.farm.findFirst();
  const bankInfo = farm ? `${farm.bankName || ''} ${farm.accountNumber || ''} ${farm.accountHolder || ''}`.trim() : "계좌 정보 없음";

  // Fetch all unpaid or partial shipments grouped by customer
  const unpaidShipments = await prisma.shipment.findMany({
    where: { paymentStatus: { in: ["unpaid", "partial"] }, isDeleted: false },
    include: { customer: true }
  });

  // Group by customer
  const settlementMap = new Map<string, { customerName: string; totalUnpaid: number; count: number }>();

  unpaidShipments.forEach(tx => {
    const amount = tx.outstandingAmount || tx.totalAmount || (tx.quantity * (tx.unitPrice || 0));
    if (amount > 0) {
      if (!settlementMap.has(tx.customerId)) {
        settlementMap.set(tx.customerId, {
          customerName: tx.customer.name,
          totalUnpaid: 0,
          count: 0
        });
      }
      const item = settlementMap.get(tx.customerId)!;
      item.totalUnpaid += amount;
      item.count += 1;
    }
  });

  const settlements = Array.from(settlementMap.values()).sort((a, b) => b.totalUnpaid - a.totalUnpaid);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🧾 미수금 정산서</h2>
        <p className="text-secondary">입금받지 못한 금액을 거래처별로 확인하세요</p>
      </div>

      {settlements.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🎉</span>
          <p>미수금이 하나도 없습니다!</p>
          <p className="text-sm text-secondary">모든 거래처에서 입금이 완료되었습니다.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {settlements.map((s, idx) => (
            <Card key={idx} padding="lg">
              <div className={styles.cardHeader}>
                <h3 className={styles.customerName}>{s.customerName}</h3>
                <span className={styles.countBadge}>{s.count}건</span>
              </div>
              <div className={styles.amountBox}>
                <span className="text-secondary">미수금 총액</span>
                <span className={styles.totalAmount}>₩{s.totalUnpaid.toLocaleString()}</span>
              </div>
              <SettlementCardActions customerName={s.customerName} amount={s.totalUnpaid} bankInfo={bankInfo} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
