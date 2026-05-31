import { prisma } from "@/lib/prisma";
import LedgerClientList from "./LedgerClientList";
import styles from "./ledger.module.css";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const shipments = await prisma.shipment.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: { customer: true }
  });

  // Prisma DateTime 객체를 JSON 직렬화 가능한 문자열로 변환
  const serializedShipments = shipments.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    shipmentDate: s.shipmentDate.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    customer: {
      ...s.customer,
      createdAt: s.customer.createdAt.toISOString(),
      updatedAt: s.customer.updatedAt.toISOString(),
    }
  }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>📒 장부</h2>
        <p className="text-secondary">출하 기록과 주문 내역을 확인하세요</p>
      </div>

      {serializedShipments.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📋</span>
          <p>아직 기록된 내역이 없습니다.</p>
          <p className="text-sm text-secondary">
            채팅에서 &quot;한라봉 50박스 보냈어&quot; 같이 말씀해 보세요!
          </p>
        </div>
      ) : (
        <LedgerClientList initialShipments={serializedShipments} />
      )}
    </div>
  );
}
