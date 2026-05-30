import { prisma } from "@/lib/prisma";
import CustomerClientPage from "./CustomerClientPage";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  // DB에서 삭제되지 않은 모든 고객과 각 고객별 출하/배송 내역을 조회
  const customers = await prisma.customer.findMany({
    where: { isDeleted: false },
    include: {
      shipments: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { name: "asc" }
  });

  // Prisma DateTime 객체를 클라이언트 컴포넌트로 보내기 위해 단순 직렬화 처리
  const serializedCustomers = customers.map((c) => ({
    ...c,
    shipments: c.shipments.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      shipmentDate: s.shipmentDate.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    }))
  }));

  return <CustomerClientPage initialCustomers={serializedCustomers} />;
}
