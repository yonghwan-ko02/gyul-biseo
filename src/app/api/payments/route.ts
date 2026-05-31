import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createPaymentRecord } from "@/lib/services/payment-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, amount } = body;

    if (!customerName || amount === undefined || amount <= 0) {
      return NextResponse.json(
        { error: "올바른 거래처 이름(customerName)과 0보다 큰 금액(amount)이 필요합니다." },
        { status: 400 }
      );
    }

    const result = await createPaymentRecord({
      customerName,
      amount: Number(amount),
      rawInput: "정산 화면에서 수동 완료 처리됨",
    });

    // 캐시 재검증 (대시보드, 장부, 정산 등 실시간 업데이트 보장)
    revalidatePath("/", "layout");

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[Create Payment API Error]", error);
    const message = error instanceof Error ? error.message : "수동 정산을 완료하는 중 오류가 발생했습니다.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
