import { NextResponse } from "next/server";
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

    // ─── 출하 기록 ───
    if (action.action === "create_shipment") {
      const savedShipment = await createShipmentRecord({
        customerName: action.data.customerName,
        variety: action.data.variety,
        quantity: action.data.quantity,
        unit: action.data.unit,
        pricePerUnit: action.data.pricePerUnit,
        rawInput: message,
      });
      
      return NextResponse.json({ 
        action, 
        savedId: savedShipment.id, 
        savedCustomerName: savedShipment.customer.name,
      });
    }

    // ─── B2C 주문 접수 ───
    if (action.action === "create_customer_order") {
      const savedOrder = await createCustomerOrderRecord({
        customerName: action.data.customerName,
        phone: action.data.phone,
        address: action.data.address,
        variety: action.data.variety,
        quantity: action.data.quantity,
        unit: action.data.unit,
        rawInput: message,
      });

      return NextResponse.json({ 
        action, 
        savedId: savedOrder.id, 
        savedCustomerName: savedOrder.customer.name,
      });
    }

    // ─── 입금(수금) 기록 ───
    if (action.action === "create_payment") {
      const result = await createPaymentRecord({
        customerName: action.data.customerName,
        amount: action.data.amount,
        rawInput: message,
      });

      return NextResponse.json({
        action,
        paymentResult: result,
      });
    }

    // ─── 영농일지 기록 ───
    if (action.action === "create_farm_log") {
      const farmLog = await createFarmLogRecord({
        workType: action.data.workType,
        workerCount: action.data.workerCount,
        details: action.data.details,
        rawInput: message,
      });

      return NextResponse.json({
        action,
        savedLogId: farmLog.id,
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
