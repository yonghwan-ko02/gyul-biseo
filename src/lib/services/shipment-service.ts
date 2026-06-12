import { prisma } from "@/lib/prisma";
import { sendOrderEmailToCourier } from "./email-service";

interface CreateShipmentDTO {
  customerName: string;
  recipientName?: string;
  phone?: string;
  address?: string;
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
        phone: data.phone || null,
        address: data.address || null,
      },
    });
  } else {
    // 기존 고객 정보 업데이트 (연락처나 주소가 새로 기입된 경우)
    if ((data.phone && !customer.phone) || (data.address && !customer.address)) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          phone: customer.phone || data.phone || null,
          address: customer.address || data.address || null,
        },
      });
    }
  }

  const totalAmount = data.pricePerUnit ? (data.quantity * data.pricePerUnit) : null;
  const outstandingAmount = totalAmount;

  // 3. 출하 기록(Shipment) 생성
  const shipment = await prisma.shipment.create({
    data: {
      farmId: farm.id,
      customerId: customer.id,
      variety: data.variety,
      quantity: data.quantity,
      memo: `단위: ${data.unit || "박스"}`,
      unitPrice: data.pricePerUnit || null,
      totalAmount,
      outstandingAmount,
      rawInput: data.rawInput,
      paymentStatus: "unpaid",
      recipientName: data.recipientName || safeCustomerName,
      recipientPhone: data.phone || null,
      recipientAddress: data.address || null,
    },
    include: {
      customer: true, // 반환 시 고객 정보 포함
    },
  });

  return shipment;
}

export interface CreateCustomerOrderDTO {
  farmId?: string;
  customerName: string;
  recipientName?: string;
  phone?: string;
  address?: string;
  variety: string;
  quantity: number;
  unit: string;
  rawInput?: string;
}

function cleanPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

/**
 * AI 파싱 또는 B2C 전용 웹 폼에서 들어온 고객 주문(pending 상태)을 저장합니다.
 */
export async function createCustomerOrderRecord(data: CreateCustomerOrderDTO) {
  let farm = null;
  if (data.farmId) {
    farm = await prisma.farm.findUnique({
      where: { id: data.farmId },
    });
  }
  if (!farm) {
    farm = await prisma.farm.findFirst();
  }
  if (!farm) throw new Error("농장 정보가 없습니다.");

  const isGift = !!(data.recipientName && data.recipientName !== data.customerName);
  let customer = null;

  if (isGift) {
    // ─── [선물 주문 / 다중 배송 시나리오] ───
    // 구매자(주문자)를 Customer로 지정합니다. 구매자의 연락처/배송지가 없으므로, 
    // 동일인 구별이 어렵기 때문에 이름이 같은 첫 번째 고객을 매칭하고 없으면 새로 만듭니다.
    const existingPayer = await prisma.customer.findFirst({
      where: { name: data.customerName, farmId: farm.id, isDeleted: false },
    });

    if (existingPayer) {
      customer = existingPayer;
    } else {
      customer = await prisma.customer.create({
        data: {
          name: data.customerName,
          type: "direct",
          farmId: farm.id,
        },
      });
    }
  } else {
    // ─── [자가 소비 / 일반 주문 시나리오 (기존 로직 유지)] ───
    const existingCustomers = await prisma.customer.findMany({
      where: { name: data.customerName, farmId: farm.id, isDeleted: false },
    });

    const inputPhoneClean = cleanPhone(data.phone);

    if (existingCustomers.length > 0) {
      if (inputPhoneClean) {
        // 1. 입력된 전화번호와 번호가 같은 기존 고객을 찾습니다.
        customer = existingCustomers.find(c => cleanPhone(c.phone) === inputPhoneClean);
        
        // 2. 만약 전화번호가 일치하는 고객이 없고, 기존 고객 중 전화번호가 비어 있는 고객이 있다면 동일인으로 간주해 합쳐서 업데이트합니다.
        if (!customer) {
          const emptyPhoneCustomer = existingCustomers.find(c => !cleanPhone(c.phone));
          if (emptyPhoneCustomer) {
            customer = await prisma.customer.update({
              where: { id: emptyPhoneCustomer.id },
              data: {
                phone: data.phone,
                address: data.address || emptyPhoneCustomer.address,
              },
            });
          }
        }
        
        // 3. 만약 모든 기존 고객이 번호를 가지고 있고, 그 번호들이 입력 번호와 전부 다르면 새로운 동명이인 고객으로 생성합니다.
        if (!customer) {
          const suffix = data.phone ? `(${data.phone.slice(-4)})` : "";
          customer = await prisma.customer.create({
            data: {
              name: data.customerName,
              nickname: `${data.customerName}${suffix}`,
              type: "direct",
              farmId: farm.id,
              phone: data.phone,
              address: data.address,
            },
          });
        } else {
          // 이미 매치된 고객이 있다면 주소를 최신 주소로 업데이트합니다.
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              address: data.address || customer.address,
            },
          });
        }
      } else {
        // 입력된 전화번호가 없을 경우 기존 호환성을 위해 첫 번째 일치하는 고객 선택
        customer = existingCustomers[0];
        if (data.address) {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              address: data.address || customer.address,
            },
          });
        }
      }
    } else {
      // 일치하는 기존 고객이 전혀 없으면 완전 신규 고객 생성
      customer = await prisma.customer.create({
        data: {
          name: data.customerName,
          type: "direct",
          farmId: farm.id,
          phone: data.phone,
          address: data.address,
        },
      });
    }
  }

  const safeUnit = data.unit || "박스";

  // 발송 대기(pending) 상태로 출하 기록 생성 (수령인 정보 함께 저장)
  const shipment = await prisma.shipment.create({
    data: {
      farmId: farm.id,
      customerId: customer.id,
      variety: data.variety,
      quantity: data.quantity,
      memo: `단위: ${safeUnit}`,
      rawInput: data.rawInput,
      paymentStatus: "unpaid",
      status: "pending", 
      recipientName: isGift ? data.recipientName : (data.customerName || customer.name),
      recipientPhone: data.phone || null,
      recipientAddress: data.address || null,
    },
    include: {
      customer: true,
    },
  });

  // 택배사 이메일 자동 발송 처리 (수령인 정보 기준으로 발송)
  let emailResult = null;
  if (farm.autoEmailCourier && farm.courierEmail) {
    try {
      emailResult = await sendOrderEmailToCourier({
        customerName: shipment.recipientName || customer.name,
        phone: shipment.recipientPhone || customer.phone,
        address: shipment.recipientAddress || customer.address,
        variety: shipment.variety,
        quantity: shipment.quantity,
        unit: safeUnit,
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
