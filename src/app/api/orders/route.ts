import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createCustomerOrderRecord } from "@/lib/services/shipment-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { farmId, name, phone, address, variety, quantity, unit } = body;

    if (!farmId || !name || !variety || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Call service to create or update customer, and create pending shipment
    const order = await createCustomerOrderRecord({
      customerName: name,
      phone,
      address,
      variety,
      quantity: parseInt(quantity, 10),
      unit,
      rawInput: "B2C 앱 직접 접수",
    });

    // 캐시 재검증 (현황, 장부 등 실시간 연동 보장)
    revalidatePath("/", "layout");

    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      emailResult: (order as unknown as { emailResult?: unknown }).emailResult,
    });
  } catch (error) {
    console.error("[Order API Error]", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
