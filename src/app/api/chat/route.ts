import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parseUserUtterance } from "@/lib/ai/llm";
import { createShipmentRecord, createCustomerOrderRecord } from "@/lib/services/shipment-service";
import { createPaymentRecord } from "@/lib/services/payment-service";
import { createFarmLogRecord } from "@/lib/services/farmlog-service";
import { queryUnpaidRecords } from "@/lib/services/unpaid-service";
import { queryRevenueRecord } from "@/lib/services/revenue-service";
import type { ParsedAction } from "@/lib/ai/actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;
    
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const action: ParsedAction = await parseUserUtterance(message);

    // ─── 안전 검증: 출하/주문 액션의 필수 필드가 비어있으면 차단 ───
    if (action.action === "create_shipment" || action.action === "create_customer_order") {
      const d = action.data;
      if (!d.customerName || !d.variety || !d.quantity || !d.unit) {
        console.warn("[Safety Guard] LLM이 필수 필드 없이 출하/주문 액션을 생성하려 했습니다:", JSON.stringify(action));
        return NextResponse.json({
          action: {
            action: "unknown" as const,
            data: { reason: "죄송합니다, 말씀하신 내용을 장부에 기록하기에는 정보가 부족합니다. 거래처, 품종, 수량을 포함해서 다시 말씀해 주세요." }
          }
        });
      }
    }

    // ─── 출하 기록 (중간 컨펌 유도) ───
    if (action.action === "create_shipment") {
      return NextResponse.json({ 
        action, 
        needsConfirmation: true,
        rawInput: message
      });
    }

    // ─── B2C 주문 접수 (중간 컨펌 유도) ───
    if (action.action === "create_customer_order") {
      return NextResponse.json({ 
        action, 
        needsConfirmation: true,
        rawInput: message
      });
    }

    // ─── 입금(수금) 기록 (중간 컨펌 유도) ───
    if (action.action === "create_payment") {
      return NextResponse.json({
        action,
        needsConfirmation: true,
        rawInput: message
      });
    }

    // ─── 영농일지 기록 (중간 컨펌 유도) ───
    if (action.action === "create_farm_log") {
      return NextResponse.json({
        action,
        needsConfirmation: true,
        rawInput: message
      });
    }

    // ─── 미수금 조회 ───
    if (action.action === "query_unpaid") {
      const unpaidResult = await queryUnpaidRecords({
        customerName: action.data.customerName,
      });

      return NextResponse.json({
        action,
        unpaidResult,
      });
    }

    // ─── 매출 및 출하 통계 조회 ───
    if (action.action === "query_revenue") {
      const revenueResult = await queryRevenueRecord({
        period: action.data.period,
        variety: action.data.variety,
      });

      return NextResponse.json({
        action,
        revenueResult,
      });
    }

    // ─── clarify / unknown 등 ───
    return NextResponse.json({ action });
  } catch (error) {
    console.error("API Chat Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
