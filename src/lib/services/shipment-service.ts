import { prisma } from "@/lib/prisma";
import { sendOrderEmailToCourier } from "./email-service";

interface CreateShipmentDTO {
  customerName: string;
  variety: string;
  quantity: number;
  unit: string;
  pricePerUnit?: number | null;
  rawInput?: string;
}

/**
 * AI 대화 엔진에서 파싱된 데이터를 받아 실제 데이터베이스(Supabase)에 출하 기록을 저장합니다.
 */
export async function createShipmentRecord(data: CreateShipmentDTO) {
  // 1. 임시 농장 정보 가져오기 (MVP에서는 첫 번째 농장 사용)
  let farm = await prisma.farm.findFirst();
  if (!farm) {
    farm = await prisma.farm.create({
      data: {
        ownerName: "농장주",
        farmName: "우리 농장",
      },
    });
  }

  // 2. 거래처 확인 및 생성
  // AI가 고객명을 찾지 못한 경우(null) "미지정 거래처"로 처리
  const safeCustomerName = data.customerName || "미지정 거래처";
  let customer = await prisma.customer.findFirst({
    where: { name: safeCustomerName, farmId: farm.id, isDeleted: false },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: safeCustomerName,
        type: "direct",
        farmId: farm.id,
      },
    });
  }

  // 3. 출하 기록(Shipment) 생성
  const shipment = await prisma.shipment.create({
    data: {
      farmId: farm.id,
      customerId: customer.id,
      variety: data.variety,
      quantity: data.quantity,
      memo: `단위: ${data.unit}`,
      unitPrice: data.pricePerUnit || null,
      rawInput: data.rawInput,
      paymentStatus: "unpaid",
    },
    include: {
      customer: true, // 반환 시 고객 정보 포함
    },
  });

  return shipment;
}

export interface CreateCustomerOrderDTO {
  customerName: string;
  phone?: string;
  address?: string;
  variety: string;
  quantity: number;
  unit: string;
  rawInput?: string;
}

/**
 * AI 파싱 또는 B2C 전용 웹 폼에서 들어온 고객 주문(pending 상태)을 저장합니다.
 */
export async function createCustomerOrderRecord(data: CreateCustomerOrderDTO) {
  let farm = await prisma.farm.findFirst();
  if (!farm) throw new Error("농장 정보가 없습니다.");

  let customer = await prisma.customer.findFirst({
    where: { name: data.customerName, farmId: farm.id, isDeleted: false },
  });

  // 고객이 없으면 새로 생성, 있으면 기존 정보에 전화번호/주소 업데이트
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: data.customerName,
        type: "direct",
        farmId: farm.id,
        phone: data.phone,
        address: data.address,
      },
    });
  } else if (data.phone || data.address) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        phone: data.phone || customer.phone,
        address: data.address || customer.address,
      },
    });
  }

  // 발송 대기(pending) 상태로 출하 기록 생성
  const shipment = await prisma.shipment.create({
    data: {
      farmId: farm.id,
      customerId: customer.id,
      variety: data.variety,
      quantity: data.quantity,
      memo: `단위: ${data.unit}`,
      rawInput: data.rawInput,
      paymentStatus: "unpaid",
      status: "pending", 
    },
    include: {
      customer: true,
    },
  });

  // 택배사 이메일 자동 발송 처리
  let emailResult = null;
  if (farm.autoEmailCourier && farm.courierEmail) {
    try {
      emailResult = await sendOrderEmailToCourier({
        customerName: customer.name,
        phone: customer.phone,
        address: customer.address,
        variety: shipment.variety,
        quantity: shipment.quantity,
        unit: data.unit,
        memo: shipment.memo,
      }, {
        farmName: farm.farmName,
        ownerName: farm.ownerName,
        phone: farm.phone,
        courierName: farm.courierName,
        courierEmail: farm.courierEmail,
      });
    } catch (e) {
      console.error("[Shipment Service] 택배 배송의뢰 이메일 전송 중 에러 발생:", e);
    }
  }

  return {
    ...shipment,
    emailResult,
  };
}
