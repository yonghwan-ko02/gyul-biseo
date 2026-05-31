import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Shipment ID와 상태(status) 정보가 필요합니다." },
        { status: 400 }
      );
    }

    // 데이터베이스 상태 업데이트
    const updatedShipment = await prisma.shipment.update({
      where: { id },
      data: { status },
    });

    // 캐시 재검증 (현황, 장부 등 실시간 연동 보장)
    revalidatePath("/", "layout");

    return NextResponse.json({
      success: true,
      shipment: updatedShipment,
    });
  } catch (error) {
    console.error("[Update Shipment Status API Error]", error);
    return NextResponse.json(
      { error: "출하 상태를 업데이트하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
