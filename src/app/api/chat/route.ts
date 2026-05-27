import { NextResponse } from "next/server";
import { parseUserUtterance } from "@/lib/ai/llm";
import { createShipmentRecord, createCustomerOrderRecord } from "@/lib/services/shipment-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;
    
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const action = await parseUserUtterance(message);

    // DB 연동 파이프라인 (Step 6)
    if (action.action === "create_shipment" && action.data) {
      // @ts-ignore
      const savedShipment = await createShipmentRecord({
        ...action.data,
        rawInput: message,
      });
      
      return NextResponse.json({ 
        action, 
        savedId: savedShipment.id, 
        savedCustomerName: savedShipment.customer.name 
      });
    } else if (action.action === "create_customer_order" && action.data) {
      // @ts-ignore
      const savedOrder = await createCustomerOrderRecord({
        ...action.data,
        rawInput: message,
      });

      return NextResponse.json({ 
        action, 
        savedId: savedOrder.id, 
        savedCustomerName: savedOrder.customer.name 
      });
    }
    
    return NextResponse.json({ action });
  } catch (error) {
    console.error("API Chat Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
