import { prisma } from "@/lib/prisma";

interface CreatePaymentDTO {
  customerName: string;
  amount: number;
  rawInput?: string;
}

/**
 * 입금(수금) 기록을 저장하고, 관련 Shipment의 paymentStatus를 자동 갱신합니다.
 * 
 * 로직:
 * 1. 해당 거래처의 미수금 Shipment를 오래된 순으로 가져옴
 * 2. 입금액을 오래된 출하건부터 차감하며 Payment 레코드 생성
 * 3. Shipment의 paymentStatus를 paid/partial로 갱신
 */
export async function createPaymentRecord(data: CreatePaymentDTO) {
  let farm = await prisma.farm.findFirst();
  if (!farm) throw new Error("농장 정보가 없습니다.");

  const safeCustomerName = data.customerName || "미지정 거래처";
  const customer = await prisma.customer.findFirst({
    where: { name: safeCustomerName, farmId: farm.id, isDeleted: false },
  });

  if (!customer) {
    throw new Error(`거래처 "${safeCustomerName}"을(를) 찾을 수 없습니다.`);
  }

  // 미수금 Shipment 조회 (오래된 것부터)
  const unpaidShipments = await prisma.shipment.findMany({
    where: {
      customerId: customer.id,
      paymentStatus: { in: ["unpaid", "partial"] },
      isDeleted: false,
    },
    orderBy: { createdAt: "asc" },
    include: { payments: { where: { isDeleted: false } } },
  });

  let remainingAmount = data.amount;
  const createdPayments: string[] = [];

  for (const shipment of unpaidShipments) {
    if (remainingAmount <= 0) break;

    // 이 Shipment의 총액 계산
    const shipmentTotal = shipment.totalAmount || (shipment.quantity * (shipment.unitPrice || 0));
    // 이미 입금된 금액 합산
    const alreadyPaid = shipment.payments.reduce((sum, p) => sum + p.amount, 0);
    // 잔여 미수금
    const outstanding = shipmentTotal - alreadyPaid;

    if (outstanding <= 0) continue;

    // 이번 입금에서 이 Shipment에 배분할 금액
    const paymentForThis = Math.min(remainingAmount, outstanding);

    // Payment 레코드 생성
    const payment = await prisma.payment.create({
      data: {
        shipmentId: shipment.id,
        amount: paymentForThis,
        method: "transfer",
        memo: data.rawInput,
      },
    });
    createdPayments.push(payment.id);

    // Shipment의 paymentStatus 갱신
    const newTotalPaid = alreadyPaid + paymentForThis;
    const newOutstanding = shipmentTotal - newTotalPaid;
    
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        paymentStatus: newOutstanding <= 0 ? "paid" : "partial",
        outstandingAmount: Math.max(0, newOutstanding),
      },
    });

    remainingAmount -= paymentForThis;
  }

  return {
    customerName: customer.name,
    totalAmount: data.amount,
    appliedAmount: data.amount - remainingAmount,
    remainingAmount,
    paymentCount: createdPayments.length,
  };
}
