import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createShipmentRecord, createCustomerOrderRecord } from "@/lib/services/shipment-service";
import { createPaymentRecord } from "@/lib/services/payment-service";
import { createFarmLogRecord } from "@/lib/services/farmlog-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (!action || !data) {
      return NextResponse.json({ error: "Action and data are required" }, { status: 400 });
    }

    let savedRecord;

    if (action === "create_shipment") {
      savedRecord = await createShipmentRecord({
        customerName: data.customerName,
        recipientName: data.recipientName,
        phone: data.phone,
        address: data.address,
        variety: data.variety,
        quantity: Number(data.quantity),
        unit: data.unit,
        pricePerUnit: data.pricePerUnit ? Number(data.pricePerUnit) : null,
        rawInput: data.rawInput || "채팅 컨펌을 통한 등록",
      });
    } else if (action === "create_customer_order") {
      savedRecord = await createCustomerOrderRecord({
        customerName: data.customerName,
        recipientName: data.recipientName,
        phone: data.phone,
        address: data.address,
        variety: data.variety,
        quantity: Number(data.quantity),
        unit: data.unit,
        rawInput: data.rawInput || "채팅 컨펌을 통한 주문 접수",
      });
    } else if (action === "create_payment") {
      savedRecord = await createPaymentRecord({
        customerName: data.customerName,
        amount: Number(data.amount),
        rawInput: data.rawInput || "채팅 컨펌을 통한 입금 등록",
      });
    } else if (action === "create_farm_log") {
      savedRecord = await createFarmLogRecord({
        workType: data.workType,
        workerCount: data.workerCount ? Number(data.workerCount) : null,
        details: data.details || "",
        rawInput: data.rawInput || "채팅 컨펌을 통한 일지 등록",
      });
    } else {
      return NextResponse.json({ error: "Unsupported confirmation action type" }, { status: 400 });
    }

    revalidatePath("/", "layout");
    
    const savedCustomerName = savedRecord && 'customer' in savedRecord && savedRecord.customer
      ? (savedRecord.customer as any).name
      : (savedRecord && 'customerName' in savedRecord ? (savedRecord as any).customerName : data.customerName);

    return NextResponse.json({
      success: true,
      savedId: savedRecord ? ((savedRecord as any).id || null) : null,
      savedCustomerName,
      savedRecord,
    });
  } catch (error) {
    console.error("POST Confirm Chat Error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
