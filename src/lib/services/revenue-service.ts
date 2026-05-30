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
      message: "삼춘, 등록된 농장 정보가 없어 통계를 뽑을 수 없쿠다. 설정을 먼저 확인해봅서! 🍊",
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
    whereClause.createdAt = { gte: startDate };
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

  // 6. 제주 방언 보고서 문장 작성
  let periodLabel = "이번 달";
  if (period === "today") periodLabel = "오늘";
  if (period === "year") periodLabel = "올해";
  if (period === "all") periodLabel = "지금까지 전체";

  let varietyLabel = variety ? `[${variety}] 품종 ` : "";

  let message = "";
  if (totalQuantity === 0) {
    message = `삼춘, ${periodLabel} 등록된 ${varietyLabel}출하 기록이 아직 없수다. 수확하시면 음성으로 편하게 장부에 적어봅서! 🍊`;
  } else {
    message = `삼춘, ${periodLabel} ${varietyLabel}총 예상 매출은 **₩${totalAmount.toLocaleString()}원**이우다! 💰\n`;
    message += `총 출하량은 **${totalQuantity.toLocaleString()}박스** (기록: ${shipments.length}건)로 집계되었수다. 밭일 무리하지 마시고 몸 살살해가면서 하십서! 🍊`;
  }

  return {
    message,
    totalAmount,
    totalQuantity,
    count: shipments.length
  };
}
