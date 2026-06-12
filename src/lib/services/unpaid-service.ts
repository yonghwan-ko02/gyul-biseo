import { prisma } from "@/lib/prisma";

interface UnpaidQueryDTO {
  customerName?: string | null;
}

interface UnpaidResult {
  customerName: string;
  totalUnpaid: number;
  shipmentCount: number;
}

/**
 * 미수금을 조회합니다.
 * customerName이 주어지면 해당 거래처만, 없으면 전체 미수금을 집계합니다.
 */
export async function queryUnpaidRecords(data: UnpaidQueryDTO): Promise<{
  results: UnpaidResult[];
  grandTotal: number;
  message: string;
}> {
  const farm = await prisma.farm.findFirst();
  if (!farm) throw new Error("농장 정보가 없습니다.");

  // 거래처 필터 조건 구성
  const customerFilter: Record<string, unknown> = {};
  if (data.customerName) {
    const customer = await prisma.customer.findFirst({
      where: { name: data.customerName, farmId: farm.id, isDeleted: false },
    });
    if (!customer) {
      return {
        results: [],
        grandTotal: 0,
        message: `"${data.customerName}" 거래처를 찾을 수 없습니다.`,
      };
    }
    customerFilter.customerId = customer.id;
  }

  // 미수금 Shipment 조회
  const unpaidShipments = await prisma.shipment.findMany({
    where: {
      farmId: farm.id,
      paymentStatus: { in: ["unpaid", "partial"] },
      isDeleted: false,
      customer: {
        isDeleted: false,
      },
      ...customerFilter,
    },
    include: {
      customer: true,
      payments: { where: { isDeleted: false } },
    },
  });

  // 거래처별 집계
  const map = new Map<string, UnpaidResult>();

  for (const shipment of unpaidShipments) {
    const shipmentTotal = shipment.outstandingAmount
      || shipment.totalAmount
      || (shipment.quantity * (shipment.unitPrice || 0));
    const paidSoFar = shipment.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = Math.max(0, shipmentTotal - paidSoFar);

    if (outstanding <= 0) continue;

    if (!map.has(shipment.customerId)) {
      map.set(shipment.customerId, {
        customerName: shipment.customer.name,
        totalUnpaid: 0,
        shipmentCount: 0,
      });
    }
    const entry = map.get(shipment.customerId)!;
    entry.totalUnpaid += outstanding;
    entry.shipmentCount += 1;
  }

  const results = Array.from(map.values()).sort((a, b) => b.totalUnpaid - a.totalUnpaid);
  const grandTotal = results.reduce((sum, r) => sum + r.totalUnpaid, 0);

  // 자연어 응답 메시지 생성
  let message: string;
  const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  if (results.length === 0) {
    message = data.customerName
      ? pickRandom([
          `${data.customerName}의 미수금이 없습니다. 모두 정산 완료되었습니다!`,
          `확인해보니 ${data.customerName}쪽은 밀린 돈 없이 깔끔합니다.`,
          `${data.customerName} 거래처는 현재 미수금이 0원입니다.`
        ])
      : pickRandom([
          "현재 미수금이 하나도 없습니다. 모든 거래처에서 정산이 완료되었습니다! 🎉",
          "밀린 외상값이 하나도 없네요! 기분 좋은 하루입니다. 😊",
          "전체 장부를 확인했는데 미수금이 0원입니다. 모두 수금 완료되었어요."
        ]);
  } else if (data.customerName) {
    const r = results[0];
    message = pickRandom([
      `${r.customerName}의 미수금은 총 ${r.totalUnpaid.toLocaleString()}원 (${r.shipmentCount}건)입니다.`,
      `현재 ${r.customerName} 쪽에 받을 돈이 ${r.totalUnpaid.toLocaleString()}원 남아있네요. (총 ${r.shipmentCount}건)`,
      `확인했습니다! ${r.customerName} 미수금은 ${r.shipmentCount}건 합해서 ${r.totalUnpaid.toLocaleString()}원입니다.`
    ]);
  } else {
    const top3 = results.slice(0, 3);
    const detail = top3
      .map((r) => `  • ${r.customerName}: ${r.totalUnpaid.toLocaleString()}원 (${r.shipmentCount}건)`)
      .join("\n");
      
    const header = pickRandom([
      `전체 미수금은 총 ${grandTotal.toLocaleString()}원입니다.\n\n${detail}`,
      `아직 못 받은 돈은 다 합쳐서 ${grandTotal.toLocaleString()}원이에요. 상위 거래처는 다음과 같습니다.\n\n${detail}`,
      `현재 남아있는 전체 미수금 ${grandTotal.toLocaleString()}원 내역 요약입니다.\n\n${detail}`
    ]);
    
    message = header;
    if (results.length > 3) {
      message += `\n  ... 외 ${results.length - 3}개 거래처`;
    }
  }

  return { results, grandTotal, message };
}
