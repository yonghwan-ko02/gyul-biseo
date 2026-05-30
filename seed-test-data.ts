import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=========================================");
  console.log("🗑️ 기존 데이터 삭제 시작...");
  console.log("=========================================");

  // 외래키 제약조건이 있으므로 Payment -> Shipment -> Customer / FarmLog 순으로 지운다.
  await prisma.payment.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.farmLog.deleteMany({});
  await prisma.workRecord.deleteMany({});
  await prisma.worker.deleteMany({});
  await prisma.customer.deleteMany({});

  console.log("🟢 기존 거래, 고객, 결제, 영농기록 삭제 완료!");

  // 1. 기존 Farm 조회 또는 신규 생성
  let farm = await prisma.farm.findFirst();
  if (!farm) {
    console.log("🌱 농장이 존재하지 않아 신규 농장을 생성합니다...");
    farm = await prisma.farm.create({
      data: {
        ownerName: "고용환",
        farmName: "서귀포 꿀감귤 농장",
        phone: "010-1234-5678",
        bankName: "농협",
        accountNumber: "302-1234-5678-91",
        accountHolder: "고용환"
      }
    });
  }
  
  const farmId = farm.id;
  console.log(` Tangerine 농장: ${farm.farmName} (${farm.ownerName} 삼춘, ID: ${farmId})`);

  console.log("\n=========================================");
  console.log("👥 테스트용 고품질 고객 데이터 등록 시작...");
  console.log("=========================================");

  // 고객 1: 서귀포농협 청과 (도매)
  const custWholesale = await prisma.customer.create({
    data: {
      farmId,
      name: "서귀포농협 청과",
      nickname: "서귀포 청과",
      type: "wholesale",
      phone: "064-763-1234",
      address: "제주특별자치도 서귀포시 서귀동 123",
      memo: "농협 유통센터 매일 오전 입고 차량 배차 필수"
    }
  });

  // 고객 2: 김영철 (직거래단골)
  const custDirect = await prisma.customer.create({
    data: {
      farmId,
      name: "김영철",
      nickname: "영철 삼춘",
      type: "direct",
      phone: "010-9876-5432",
      address: "서울특별시 서초구 반포동 45-6 102호",
      memo: "매년 10박스 이상 주문하시는 최고 VIP 삼춘. 맛있는 부위로 엄선 요망"
    }
  });

  // 고객 3: 이옥자 (지인)
  const custAcquaintance = await prisma.customer.create({
    data: {
      farmId,
      name: "이옥자",
      nickname: "옥자 이모",
      type: "acquaintance",
      phone: "010-2222-3333",
      address: "제주시 노형동 789 푸르지오아파트 101동 502호",
      memo: "주변 친척 소개를 많이 해 주시는 이모님"
    }
  });

  // 고객 4: 대정만감류작목반 (작목반)
  const custCoop = await prisma.customer.create({
    data: {
      farmId,
      name: "대정만감류작목반",
      nickname: "대정작목반",
      type: "coop",
      phone: "064-794-9988",
      address: "제주특별자치도 서귀포시 대정읍 하모리 456",
      memo: "레드향, 황금향 공동 출하용 유통 채널"
    }
  });

  console.log("🟢 4명의 고품질 테스트 고객 주소록 등록 완료!");

  console.log("\n=========================================");
  console.log("📦 테스트용 출하/주문 및 입금 거래 매칭 시작...");
  console.log("=========================================");

  // 1. 서귀포농협 청과 거래
  // 건 1: 조생 10kg 100박스 출하완료, 단가 18,000 -> 1,800,000 외상 (unpaid)
  await prisma.shipment.create({
    data: {
      farmId,
      customerId: custWholesale.id,
      variety: "조생 감귤 10kg",
      quantity: 100,
      unitPrice: 18000,
      totalAmount: 1800000,
      outstandingAmount: 1800000,
      paymentStatus: "unpaid",
      status: "shipped",
      rawInput: "오늘 서귀포 청과에 조생 10kg짜리 100박스 실어 보냈다. 단가는 1만8천원 쳐주기로 했어.",
      memo: "조생 감귤 10kg 벌크 박스 출하"
    }
  });

  // 건 2: 타이벡 5kg 50박스 출하완료, 단가 25,000 -> 1,250,000 결제완료 (paid)
  const shipWholesale2 = await prisma.shipment.create({
    data: {
      farmId,
      customerId: custWholesale.id,
      variety: "타이벡 감귤 5kg",
      quantity: 50,
      unitPrice: 25000,
      totalAmount: 1250000,
      outstandingAmount: 0,
      paymentStatus: "paid",
      status: "shipped",
      rawInput: "어제 서귀포 청과로 타이벡 5킬로 상 쉰박스 나간 거 단가 2만5천원짜리 장부에 올려라.",
      memo: "타이벡 감귤 프리미엄 선물용"
    }
  });
  
  await prisma.payment.create({
    data: {
      shipmentId: shipWholesale2.id,
      amount: 1250000,
      memo: "청과 정산 계좌 입금 완료"
    }
  });

  // 2. 김영철 삼춘 거래
  // 건 1: 한라봉 3kg 3박스 주문접수 (pending), 단가 30,000 -> 90,000원 외상
  await prisma.shipment.create({
    data: {
      farmId,
      customerId: custDirect.id,
      variety: "한라봉 3kg",
      quantity: 3,
      unitPrice: 30000,
      totalAmount: 90000,
      outstandingAmount: 90000,
      paymentStatus: "unpaid",
      status: "pending",
      rawInput: "영철 삼춘이 한라봉 3킬로짜리 3박스 보내달라고 주문했주게. 외상으로 달아놔라.",
      memo: "직거래 택배 발송 대기중"
    }
  });

  // 건 2: 황금향 5kg 2박스 출하완료, 단가 35,000 -> 70,000원 결제완료
  const shipDirect2 = await prisma.shipment.create({
    data: {
      farmId,
      customerId: custDirect.id,
      variety: "황금향 5kg",
      quantity: 2,
      unitPrice: 35000,
      totalAmount: 70000,
      outstandingAmount: 0,
      paymentStatus: "paid",
      status: "shipped",
      rawInput: "서울 사는 영철이한테 황금향 5킬로 2박스 보냈고 입금 바로 확인했어.",
      memo: "직거래 택배 완료"
    }
  });

  await prisma.payment.create({
    data: {
      shipmentId: shipDirect2.id,
      amount: 70000,
      memo: "카카오페이 송금 확인"
    }
  });

  // 3. 이옥자 이모 거래
  // 건 1: 천혜향 5kg 5박스 출하완료, 단가 40,000 -> 200,000원 외상
  await prisma.shipment.create({
    data: {
      farmId,
      customerId: custAcquaintance.id,
      variety: "천혜향 5kg",
      quantity: 5,
      unitPrice: 40000,
      totalAmount: 200000,
      outstandingAmount: 200000,
      paymentStatus: "unpaid",
      status: "shipped",
      rawInput: "옥자 이모한테 천혜향 5킬로짜리 5박스 외상으로 보내드렸우다.",
      memo: "지인 할인 5% 적용가"
    }
  });

  // 4. 대정작목반 거래
  // 건 1: 레드향 10kg 80박스 출하완료, 단가 45,000 -> 3,600,000원, 미수금 1,000,000원 (partial, 2,600,000원 입금)
  const shipCoop = await prisma.shipment.create({
    data: {
      farmId,
      customerId: custCoop.id,
      variety: "레드향 10kg",
      quantity: 80,
      unitPrice: 45000,
      totalAmount: 3600000,
      outstandingAmount: 1000000,
      paymentStatus: "partial",
      status: "shipped",
      rawInput: "대정작목반에 레드향 10킬로 80박스 보내부렀고, 260만 원은 먼저 선금으로 받았고 잔금은 외상이우다.",
      memo: "작목반 위탁 출하"
    }
  });

  await prisma.payment.create({
    data: {
      shipmentId: shipCoop.id,
      amount: 2600000,
      memo: "작목반 선금 계좌 이체"
    }
  });

  console.log("🟢 8개의 실감나는 영농 거래 내역(결제/외상/대기) 등록 완료!");

  console.log("\n=========================================");
  console.log("📝 테스트용 영농일지(작업기록) 등록 시작...");
  console.log("=========================================");

  await prisma.farmLog.create({
    data: {
      farmId,
      category: "prune",
      description: "아침 8시부터 과수원 동쪽 구역 전정 작업 실시. 인근 일꾼 삼춘 3명 합류하여 하루 종일 가지치기 고생했음.",
      rawInput: "오늘 아침 일찍 전정 작업했주게. 동쪽 밭 삼춘 3명 불러다 하루 종일 했어."
    }
  });

  await prisma.farmLog.create({
    data: {
      farmId,
      category: "spray",
      description: "서쪽 타이벡 밭 노린재 및 응애 방제약 살포 완료. 약제 500리터 조제.",
      rawInput: "타이벡 밭 방제 작업 완료했우다. 약 500리터 다 뿌렸어."
    }
  });

  console.log("🟢 2건의 풍성한 영농일지 데이터 등록 완료!");

  console.log("\n=========================================");
  console.log("✨ 테스트 시드 프로세스가 성공적으로 완료되었습니다!");
  console.log("=========================================");
}

main()
  .catch((e) => {
    console.error("❌ 시드 도중 에러가 발생했습니다:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
