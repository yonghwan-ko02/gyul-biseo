import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { prisma } from "./src/lib/prisma";
import { createShipmentRecord } from "./src/lib/services/shipment-service";
import { createPaymentRecord } from "./src/lib/services/payment-service";
import { queryUnpaidRecords } from "./src/lib/services/unpaid-service";
import { queryRevenueRecord } from "./src/lib/services/revenue-service";
import { subDays } from "date-fns";

async function runIntegrationTests() {
  console.log("==========================================================");
  console.log("🧪 [귤비서] 개선 기능 통합/무결성 스트레스 검증 테스트 시작");
  console.log("==========================================================");

  let testFarm = await prisma.farm.findFirst();
  if (!testFarm) {
    testFarm = await prisma.farm.create({
      data: {
        ownerName: "테스트농민",
        farmName: "검증용 농장"
      }
    });
  }

  const uniqueSuffix = Date.now().toString().slice(-6);
  const testCustomerName = `테스트상인_${uniqueSuffix}`;

  // ==========================================================
  // 테스트 1: totalAmount 및 outstandingAmount 선연산 저장 검증
  // ==========================================================
  console.log("\n[테스트 1] totalAmount & outstandingAmount 선연산 저장 테스트");
  
  const shipment = await createShipmentRecord({
    customerName: testCustomerName,
    variety: "타이벡",
    quantity: 10,
    unit: "박스",
    pricePerUnit: 15000, // 총액 150,000원
    rawInput: "테스트 출하 등록"
  });

  const createdShipment = await prisma.shipment.findUnique({
    where: { id: shipment.id }
  });

  if (createdShipment && createdShipment.totalAmount === 150000 && createdShipment.outstandingAmount === 150000) {
    console.log("🟢 [성공] totalAmount 및 outstandingAmount가 선연산되어 디비에 즉시 적립되었습니다.");
  } else {
    console.error("🔴 [실패] 선연산 필드 저장이 올바르지 않습니다:", createdShipment);
    process.exit(1);
  }

  // ==========================================================
  // 테스트 2: 예치금(prepayment) 정산 상계 및 추가 적립 검증
  // ==========================================================
  console.log("\n[테스트 2] prepayment(선수금/예치금) 상계 및 누적 정산 테스트");

  // 150,000원 미수금이 걸려있는 상태에서, 200,000원 입금 처리 시도
  console.log("-> 150,000원 미수금이 걸린 상태에서 200,000원 입금 적용...");
  const paymentResult1 = await createPaymentRecord({
    customerName: testCustomerName,
    amount: 200000,
    rawInput: "20만원 입금"
  });

  const dbCustomerAfterPay1 = await prisma.customer.findFirst({
    where: { name: testCustomerName, isDeleted: false }
  });

  const updatedShipmentAfterPay1 = await prisma.shipment.findUnique({
    where: { id: shipment.id }
  });

  if (
    updatedShipmentAfterPay1?.paymentStatus === "paid" && 
    updatedShipmentAfterPay1.outstandingAmount === 0 &&
    dbCustomerAfterPay1 && dbCustomerAfterPay1.prepayment === 50000
  ) {
    console.log("🟢 [성공] 출하건은 완납(paid) 처리되었고, 초과된 선수금 50,000원이 예치금으로 누적되었습니다.");
  } else {
    console.error("🔴 [실패] 예치금 적립 또는 완납 상태가 올바르지 않습니다:", {
      shipment: updatedShipmentAfterPay1,
      customer: dbCustomerAfterPay1
    });
    process.exit(1);
  }

  // 예치금 50,000원이 있는 상태에서, 신규 출하 80,000원 등록
  console.log("-> 예치금 50,000원이 있는 상태에서 80,000원짜리 새 출하 등록...");
  const shipment2 = await createShipmentRecord({
    customerName: testCustomerName,
    variety: "한라봉",
    quantity: 4,
    unit: "박스",
    pricePerUnit: 20000, // 총액 80,000원
    rawInput: "테스트 출하 2"
  });

  // 40,000원 추가 입금 처리 -> 가용 금액은 기존 예치금 50,000원 + 40,000원 = 총 90,000원이 됨
  console.log("-> 40,000원 추가 입금 적용 (총 가용금액 90,000원)...");
  const paymentResult2 = await createPaymentRecord({
    customerName: testCustomerName,
    amount: 40000,
    rawInput: "4만원 추가 입금"
  });

  const dbCustomerAfterPay2 = await prisma.customer.findFirst({
    where: { name: testCustomerName, isDeleted: false }
  });

  const updatedShipmentAfterPay2 = await prisma.shipment.findUnique({
    where: { id: shipment2.id }
  });

  if (
    updatedShipmentAfterPay2?.paymentStatus === "paid" &&
    updatedShipmentAfterPay2.outstandingAmount === 0 &&
    dbCustomerAfterPay2 && dbCustomerAfterPay2.prepayment === 10000
  ) {
    console.log("🟢 [성공] 기존 예치금과 신규 입금액이 정상 상계되어 출하2 완납 및 잔여 예치금 10,000원이 정밀 갱신되었습니다.");
  } else {
    console.error("🔴 [실패] 복합 예치금 상계 처리에 실패했습니다:", {
      shipment2: updatedShipmentAfterPay2,
      customer: dbCustomerAfterPay2
    });
    process.exit(1);
  }

  // ==========================================================
  // 테스트 3: 거래처 Soft Delete 시 미수금 노출 차단 검증
  // ==========================================================
  console.log("\n[테스트 3] 거래처 소프트 딜리트 시 미수금 노출 차단 테스트");

  const deleteCustomerName = `삭제상인_${uniqueSuffix}`;
  // 미수금 출하 등록
  const tempShipment = await createShipmentRecord({
    customerName: deleteCustomerName,
    variety: "레드향",
    quantity: 5,
    unit: "박스",
    pricePerUnit: 30000, // 150,000원 미수금
    rawInput: "레드향 등록"
  });

  // 조회 시 존재 확인
  const unpaidBeforeDelete = await queryUnpaidRecords({ customerName: deleteCustomerName });
  if (unpaidBeforeDelete.grandTotal !== 150000) {
    console.error("🔴 [실패] 삭제 전 미수금 조회가 올바르지 않습니다:", unpaidBeforeDelete);
    process.exit(1);
  }

  // 거래처 소프트 딜리트 수행
  const targetCustomer = await prisma.customer.findFirst({
    where: { name: deleteCustomerName, isDeleted: false }
  });
  if (targetCustomer) {
    await prisma.customer.update({
      where: { id: targetCustomer.id },
      data: { isDeleted: true }
    });
  }

  // 삭제 후 미수금 조회
  const unpaidAfterDelete = await queryUnpaidRecords({ customerName: deleteCustomerName });
  const unpaidTotalAfterDelete = await queryUnpaidRecords({}); // 전체 미수금 조회

  const isMatchedInTotal = unpaidTotalAfterDelete.results.some(r => r.customerName === deleteCustomerName);

  if (unpaidAfterDelete.grandTotal === 0 && !isMatchedInTotal) {
    console.log("🟢 [성공] 거래처 소프트 딜리트 이후 해당 거래처의 미수금 내역이 노출 차단 및 총액 집계에서 안전히 배제되었습니다.");
  } else {
    console.error("🔴 [실패] 소프트 딜리트된 고객의 미수금이 여전히 유출됩니다:", {
      unpaidAfterDelete,
      isMatchedInTotal
    });
    process.exit(1);
  }

  // ==========================================================
  // 테스트 4: shipmentDate 기준 매출/출하 통계 검증
  // ==========================================================
  console.log("\n[테스트 4] shipmentDate 기준 날짜 필터 통계 검증 테스트");

  const oldCustomerName = `과거상인_${uniqueSuffix}`;
  
  // 45일 전의 날짜로 shipmentDate를 명시해서 출하 레코드 등록
  const fortyFiveDaysAgo = subDays(new Date(), 45);
  
  const oldCustomer = await prisma.customer.create({
    data: {
      name: oldCustomerName,
      type: "direct",
      farmId: testFarm.id
    }
  });

  const oldShipment = await prisma.shipment.create({
    data: {
      farmId: testFarm.id,
      customerId: oldCustomer.id,
      variety: "노지",
      quantity: 100, // 100박스
      unitPrice: 10000, // 1,000,000원
      totalAmount: 1000000,
      outstandingAmount: 1000000,
      shipmentDate: fortyFiveDaysAgo, // 실제 출하일 45일 전
      createdAt: new Date(), // DB 등록은 오늘
      paymentStatus: "unpaid"
    }
  });

  // 이번 달(month) 매출 통계 조회
  const thisMonthStats = await queryRevenueRecord({ period: "month" });
  // 전체(all) 매출 통계 조회
  const allStats = await queryRevenueRecord({ period: "all" });

  const hasOldShipmentInMonth = thisMonthStats.totalAmount >= 1000000 && thisMonthStats.totalQuantity >= 100;

  if (!hasOldShipmentInMonth && allStats.totalAmount >= 1000000) {
    console.log("🟢 [성공] 과거 출하 내역이 DB 등록일(createdAt)이 아닌 실제 출하일(shipmentDate) 기준으로 올바르게 분류되어 당월 통계 왜곡이 방지되었습니다.");
  } else {
    console.error("🔴 [실패] 통계 날짜 필터링이 올바르지 않습니다:", {
      thisMonthStats,
      allStats,
      hasOldShipmentInMonth
    });
    process.exit(1);
  }

  console.log("\n==========================================================");
  console.log("🎉 [귤비서] 모든 신규 기능 통합 무결성 테스트 통과 (Pass)!");
  console.log("==========================================================");
}

runIntegrationTests().catch(err => {
  console.error("🔴 테스트 도중 오류 발생:", err);
  process.exit(1);
});
