import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function cleanPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

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
    const incomingPhoneClean = cleanPhone(phone);

    if (customerName) {
      // 거래처 이름이 제공된 경우
      const existingCustomers = await prisma.customer.findMany({
        where: { name: customerName, farmId: farm.id, isDeleted: false },
      });

      let targetCustomer = null;

      if (existingCustomers.length > 0) {
        if (incomingPhoneClean) {
          // 1. 번호가 같은 기존 고객 찾기
          targetCustomer = existingCustomers.find(c => cleanPhone(c.phone) === incomingPhoneClean);

          // 2. 번호가 같은 고객이 없는데 번호가 빈 기존 고객이 있는 경우 병합
          if (!targetCustomer) {
            const emptyPhoneCustomer = existingCustomers.find(c => !cleanPhone(c.phone));
            if (emptyPhoneCustomer) {
              targetCustomer = await prisma.customer.update({
                where: { id: emptyPhoneCustomer.id },
                data: {
                  phone: phone,
                  address: address !== undefined ? address : emptyPhoneCustomer.address,
                },
              });
            }
          }

          // 3. 번호가 전부 다른 경우 새로운 동명이인 고객 생성
          if (!targetCustomer) {
            const suffix = phone ? `(${phone.slice(-4)})` : "";
            targetCustomer = await prisma.customer.create({
              data: {
                name: customerName,
                nickname: `${customerName}${suffix}`,
                type: "direct",
                farmId: farm.id,
                phone: phone || null,
                address: address || null,
              },
            });
          } else {
            // 주소만 업데이트
            targetCustomer = await prisma.customer.update({
              where: { id: targetCustomer.id },
              data: {
                address: address !== undefined ? address : targetCustomer.address,
              },
            });
          }
        } else {
          // 전화번호가 안 온 경우 첫 번째 동일 이름 고객 선택
          targetCustomer = existingCustomers[0];
          if (address !== undefined) {
            targetCustomer = await prisma.customer.update({
              where: { id: targetCustomer.id },
              data: {
                address: address,
              },
            });
          }
        }
      } else {
        // 동일 이름의 기존 고객이 아예 없는 경우 새로 생성
        targetCustomer = await prisma.customer.create({
          data: {
            name: customerName,
            type: "direct",
            farmId: farm.id,
            phone: phone || null,
            address: address || null,
          },
        });
      }

      customerId = targetCustomer.id;
    } else {
      // 거래처 이름이 오지 않은 경우, 현재 배송 정보의 고객 전화번호/주소만 업데이트
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
