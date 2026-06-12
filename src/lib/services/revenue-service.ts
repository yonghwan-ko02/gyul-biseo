import { prisma } from "../prisma";
import { startOfDay, startOfMonth, startOfYear } from "date-fns";

interface QueryRevenueParams {
  period?: "today" | "month" | "year" | "all";
  variety?: string | null;
}

export async function queryRevenueRecord({ period = "month", variety }: QueryRevenueParams) {
  // 1. 현재 농장 ID 획득
  const farm = await prisma.farm.findFirst();
  if (!farm) {
    return {
      message: "등록된 농장 정보가 없어 통계를 확인할 수 없습니다. 농장 설정을 먼저 확인해주세요! 🍊",
      totalAmount: 0,
      totalQuantity: 0
    };
  }

  const farmId = farm.id;

  // 2. 조회 기간 계산
  let startDate: Date | undefined;
  const now = new Date();

  if (period === "today") {
    startDate = startOfDay(now);
  } else if (period === "month") {
    startDate = startOfMonth(now);
  } else if (period === "year") {
    startDate = startOfYear(now);
  }

  // 3. Prisma Shipment 조회 필터 구성
  const whereClause: any = {
    farmId,
    isDeleted: false,
  };

  if (startDate) {
    whereClause.shipmentDate = { gte: startDate };
  }

  if (variety) {
    whereClause.variety = { contains: variety };
  }

  // 4. 데이터 조회
  const shipments = await prisma.shipment.findMany({
    where: whereClause
  });

  // 5. 연산 집계
  const totalAmount = shipments.reduce((acc, curr) => {
    return acc + (curr.totalAmount || (curr.quantity * (curr.unitPrice || 0)));
  }, 0);

  const totalQuantity = shipments.reduce((acc, curr) => acc + curr.quantity, 0);

  // 6. 표준어 보고서 문장 작성
  let periodLabel = "이번 달";
  if (period === "today") periodLabel = "오늘";
  if (period === "year") periodLabel = "올해";
  if (period === "all") periodLabel = "지금까지 전체";

  let varietyLabel = variety ? `[${variety}] 품종 ` : "";

  let message = "";
  if (totalQuantity === 0) {
    message = `${periodLabel} 등록된 ${varietyLabel}출하 기록이 아직 없습니다. 수확하시면 음성으로 편하게 장부에 적어보세요! 🍊`;
  } else {
    message = `${periodLabel} ${varietyLabel}총 예상 매출은 ₩${totalAmount.toLocaleString()}원입니다! 💰\n`;
    message += `총 출하량은 ${totalQuantity.toLocaleString()}박스 (기록: ${shipments.length}건)로 집계되었습니다. 고생 많으셨어요! 🍊`;
  }

  return {
    message,
    totalAmount,
    totalQuantity,
    count: shipments.length
  };
}
