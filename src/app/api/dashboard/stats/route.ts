import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = startOfMonth(now);

    // 1. 오늘 출하 박스 수
    const todayShipments = await prisma.shipment.findMany({
      where: {
        createdAt: { gte: today },
        status: "shipped",
        isDeleted: false,
      },
    });
    const todayBoxCount = todayShipments.reduce((acc, curr) => acc + curr.quantity, 0);

    // 2. 전체 미수금
    const unpaidShipments = await prisma.shipment.findMany({
      where: {
        paymentStatus: { in: ["unpaid", "partial"] },
        isDeleted: false,
      },
    });
    const totalUnpaid = unpaidShipments.reduce((acc, curr) => {
      const amount = curr.outstandingAmount || curr.totalAmount || (curr.quantity * (curr.unitPrice || 0));
      return acc + amount;
    }, 0);

    // 3. 이번 달 매출
    const monthShipments = await prisma.shipment.findMany({
      where: {
        createdAt: { gte: firstDayOfMonth },
        isDeleted: false,
      },
    });
    const monthRevenue = monthShipments.reduce((acc, curr) => {
      const amount = curr.totalAmount || (curr.quantity * (curr.unitPrice || 0));
      return acc + amount;
    }, 0);

    // 4. 발송 대기 주문 건수
    const pendingOrderCount = await prisma.shipment.count({
      where: {
        status: "pending",
        isDeleted: false,
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        todayBoxCount,
        totalUnpaid,
        monthRevenue,
        pendingOrderCount,
      },
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { success: false, error: "통계 데이터를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
