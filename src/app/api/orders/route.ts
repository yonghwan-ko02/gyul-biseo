import { NextResponse } from "next/server";
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

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error("[Order API Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
