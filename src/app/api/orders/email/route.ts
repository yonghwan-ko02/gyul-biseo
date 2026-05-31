import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderEmailToCourier } from "@/lib/services/email-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shipmentId } = body;

    if (!shipmentId) {
      return NextResponse.json({ error: "Shipment ID가 필요합니다." }, { status: 400 });
    }

    // 1. 출하 정보 조회 (고객 정보 및 농장 정보 포함)
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, isDeleted: false },
      include: {
        customer: true,
        farm: true,
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: "해당 주문을 찾을 수 없습니다." }, { status: 404 });
    }

    const { farm, customer } = shipment;

    // 2. 택배 이메일 설정 확인
    if (!farm.courierEmail) {
      return NextResponse.json({ 
        error: "설정(⚙️) 메뉴에서 택배사 접수용 이메일 주소를 먼저 설정해 주세요." 
      }, { status: 400 });
    }

    // 3. 이메일 발송 실행
    const unitStr = shipment.memo && shipment.memo.startsWith("단위: ") 
      ? shipment.memo.replace("단위: ", "") 
      : "박스";

    const emailResult = await sendOrderEmailToCourier({
      customerName: customer.name,
      phone: customer.phone,
      address: customer.address,
      variety: shipment.variety,
      quantity: shipment.quantity,
      unit: unitStr,
      memo: shipment.memo,
    }, {
      farmName: farm.farmName,
      ownerName: farm.ownerName,
      phone: farm.phone,
      courierName: farm.courierName,
      courierEmail: farm.courierEmail,
    });

    if (!emailResult.success) {
      return NextResponse.json({ 
        error: "택배사 이메일 발송 과정에서 문제가 발생했습니다." 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      emailResult 
    });
  } catch (error) {
    console.error("[Manual Order Email API Error]", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
