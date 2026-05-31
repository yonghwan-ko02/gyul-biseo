import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      variety,
      quantity,
      unit,
      pricePerUnit,
      totalAmount,
      outstandingAmount,
      paymentStatus,
      status,
      customerName,
      phone,
      address,
    } = body;

    // 1. MVP용 농장 정보 가져오기
    let farm = await prisma.farm.findFirst();
    if (!farm) {
      return NextResponse.json({ error: "농장 정보가 없습니다." }, { status: 404 });
    }

    // 2. 출하 기록 찾기
    const shipment = await prisma.shipment.findFirst({
      where: { id, isDeleted: false },
      include: { customer: true },
    });

    if (!shipment) {
      return NextResponse.json({ error: "출하 기록을 찾을 수 없습니다." }, { status: 404 });
    }

    // 3. 거래처 정보 업데이트 또는 변경
    let customerId = shipment.customerId;
    if (customerName && customerName !== shipment.customer.name) {
      // 거래처 이름이 바뀐 경우 새로운 거래처 찾기 혹은 생성
      let customer = await prisma.customer.findFirst({
        where: { name: customerName, farmId: farm.id, isDeleted: false },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: customerName,
            type: "direct",
            farmId: farm.id,
            phone: phone || null,
            address: address || null,
          },
        });
      } else {
        // 이미 존재하는 거래처라면 연락처와 주소 업데이트
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            phone: phone !== undefined ? phone : customer.phone,
            address: address !== undefined ? address : customer.address,
          },
        });
      }
      customerId = customer.id;
    } else {
      // 거래처 이름이 같은 경우, 전화번호나 주소만 업데이트
      await prisma.customer.update({
        where: { id: shipment.customerId },
        data: {
          phone: phone !== undefined ? phone : shipment.customer.phone,
          address: address !== undefined ? address : shipment.customer.address,
        },
      });
    }

    // 4. 출하 기록 업데이트
    const updatedShipment = await prisma.shipment.update({
      where: { id },
      data: {
        customerId,
        variety: variety !== undefined ? variety : shipment.variety,
        quantity: quantity !== undefined ? Number(quantity) : shipment.quantity,
        memo: unit !== undefined ? `단위: ${unit}` : shipment.memo,
        unitPrice: pricePerUnit !== undefined ? (pricePerUnit === null ? null : Number(pricePerUnit)) : shipment.unitPrice,
        totalAmount: totalAmount !== undefined ? (totalAmount === null ? null : Number(totalAmount)) : shipment.totalAmount,
        outstandingAmount: outstandingAmount !== undefined ? (outstandingAmount === null ? null : Number(outstandingAmount)) : shipment.outstandingAmount,
        paymentStatus: paymentStatus !== undefined ? paymentStatus : shipment.paymentStatus,
        status: status !== undefined ? status : shipment.status,
      },
      include: {
        customer: true,
      },
    });

    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, shipment: updatedShipment });
  } catch (error) {
    console.error("PATCH Shipment Error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
