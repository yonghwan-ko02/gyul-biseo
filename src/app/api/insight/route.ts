import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { llmClient } from "@/lib/ai/llm";

export const dynamic = "force-dynamic";

// Groq/Ollama 모델명 결정 (llm.ts와 동일하게 설정)
const useGroq = !!process.env.GROQ_API_KEY;
const modelName = useGroq 
  ? (process.env.GROQ_MODEL || "llama-3.1-8b-instant") 
  : (process.env.OLLAMA_MODEL || "llama3.1");


const INSIGHT_SYSTEM_PROMPT = `당신은 감귤 농장주의 똑똑하고 따뜻한 비서 '귤비서'입니다.
농장의 경영/매출/미수금 및 영농기록 통계를 분석하여 농장주에게 든든하고 친근한 격려와 경영 진단(의사결정 보조)을 제공해야 합니다.

[작성 지침]
1. 친근하고 다정한 표준어 존댓말(~습니다, ~세요, ~해요)로 작성하세요. 방언이나 사투리는 사용하지 마세요.
2. 현재 농가의 수치(출하량, 미수금 비율, 미수금 최대 거래처, 영농일지 기록 횟수 등)를 구체적으로 1~2개 짚어서 칭찬하거나 우려되는 부분(예: 높은 미수금 비율)을 다정하게 진단하고, 실천할 수 있는 1개의 액션(예: "정산서 보내기", "영농일지 기록하기" 등)을 부드럽게 권고하세요.
3. 절대 수치나 줄바꿈을 과다하게 쓰지 말고, 2~3문장의 줄글 형태로 컴팩트하게 작성하세요. 부연 설명이나 JSON 껍데기 없이 오직 조언 텍스트 자체만 그대로 반환하세요.
4. 마크다운 볼드체(**)는 절대 사용하지 마세요.`;

export async function GET() {
  try {
    // 1. 통계 데이터 집계
    const shipments = await prisma.shipment.findMany({
      where: { isDeleted: false },
      include: { customer: true }
    });

    const farmLogs = await prisma.farmLog.findMany({
      where: { isDeleted: false }
    });

    const totalEstimatedSales = shipments.reduce((acc, curr) => {
      return acc + (curr.totalAmount || (curr.quantity * (curr.unitPrice || 0)));
    }, 0);

    const totalUnpaid = shipments
      .filter(s => ["unpaid", "partial"].includes(s.paymentStatus))
      .reduce((acc, curr) => acc + (curr.outstandingAmount || curr.totalAmount || 0), 0);

    const unpaidRatio = totalEstimatedSales > 0 ? (totalUnpaid / totalEstimatedSales) * 100 : 0;

    // 미수금이 가장 높은 거래처 조회
    const customerUnpaidMap = new Map<string, number>();
    shipments
      .filter(s => ["unpaid", "partial"].includes(s.paymentStatus))
      .forEach(s => {
        const amt = s.outstandingAmount || s.totalAmount || 0;
        customerUnpaidMap.set(s.customer.name, (customerUnpaidMap.get(s.customer.name) || 0) + amt);
      });

    let topDebtor = "없음";
    let maxUnpaid = 0;
    customerUnpaidMap.forEach((amt, name) => {
      if (amt > maxUnpaid) {
        maxUnpaid = amt;
        topDebtor = name;
      }
    });

    const shippedBoxCount = shipments
      .filter(s => s.status === "shipped")
      .reduce((acc, curr) => acc + curr.quantity, 0);

    const pendingOrderCount = shipments.filter(s => s.status === "pending").length;

    // 2. LLM에 전달할 컨텍스트 구성
    const contextPrompt = `현재 농가 실시간 통계:
- 이번 시즌 총 예상 매출액: ₩${totalEstimatedSales.toLocaleString()}원
- 현재 총 미수금(외상 잔액): ₩${totalUnpaid.toLocaleString()}원
- 미수금 비율: ${unpaidRatio.toFixed(1)}%
- 미수금이 가장 높은 거래처: ${topDebtor} (미수액: ₩${maxUnpaid.toLocaleString()}원)
- 총 출하량: ${shippedBoxCount} 상자
- 신규 접수된 발송대기 주문서: ${pendingOrderCount}건
- 누적 작성된 영농일지 기록 수: ${farmLogs.length}회

위 통계를 바탕으로 농장주에게 격려와 든든한 3줄 경영 조언을 작성해줘.`;

    // 3. LLM 호출
    const response = await llmClient.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: INSIGHT_SYSTEM_PROMPT },
        { role: "user", content: contextPrompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const insight = response.choices[0]?.message?.content?.trim() || "오늘도 귤 농장 가꾸시느라 고생 많으셨습니다! 귤비서가 곁에서 든든하게 장부와 기록을 돕겠습니다. 🍊";

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("AI Insight Generation Error:", error);
    return NextResponse.json({ 
      insight: "지금 AI 정산 엔진 연결이 조금 불안정해서 통계를 확인하지 못했습니다. 조금 뒤에 다시 확인해주세요! 🍊" 
    });
  }
}
