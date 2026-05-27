import { PrismaClient } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { format } from "date-fns";
import styles from "./ledger.module.css";

const prisma = new PrismaClient({});

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const shipments = await prisma.shipment.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: { customer: true }
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>📒 장부</h2>
        <p className="text-secondary">출하 기록과 주문 내역을 확인하세요</p>
      </div>

      {shipments.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📋</span>
          <p>아직 기록된 내역이 없습니다.</p>
          <p className="text-sm text-secondary">
            채팅에서 &quot;한라봉 50박스 보냈어&quot; 같이 말씀해 보세요!
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {shipments.map((tx) => (
            <Card key={tx.id} padding="lg">
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.customerName}>
                    {tx.customer.name}
                    {tx.status === "pending" ? (
                      <span className={styles.badgePending}>발송대기</span>
                    ) : (
                      <span className={styles.badgeShipped}>출하완료</span>
                    )}
                  </h3>
                  <p className="text-secondary text-sm">
                    {format(new Date(tx.createdAt), "yyyy.MM.dd HH:mm")}
                  </p>
                </div>
                <div className={styles.paymentStatus}>
                  {tx.paymentStatus === "paid" ? (
                    <span className="amount-positive text-sm">결제완료</span>
                  ) : (
                    <span className="amount-negative text-sm">미수금</span>
                  )}
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                  <span className="text-secondary">품목</span>
                  <span className={styles.infoValue}>{tx.variety}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className="text-secondary">수량</span>
                  <span className={styles.infoValue}>
                    {tx.quantity} {tx.memo?.replace('단위: ', '') || '박스'}
                  </span>
                </div>
                {tx.customer.phone && (
                  <div className={styles.infoRow}>
                    <span className="text-secondary">연락처</span>
                    <span className={styles.infoValue}>{tx.customer.phone}</span>
                  </div>
                )}
                {tx.customer.address && (
                  <div className={styles.infoRow}>
                    <span className="text-secondary">배송지</span>
                    <span className={styles.infoValue}>{tx.customer.address}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
