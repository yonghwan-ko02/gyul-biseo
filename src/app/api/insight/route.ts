import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { llmClient } from "@/lib/ai/llm";

export const dynamic = "force-dynamic";

// Groq/Ollama 모델명 결정 (llm.ts와 동일하게 설정)
const useGroq = !!process.env.GROQ_API_KEY;
const modelName = useGroq 
  ? (process.env.GROQ_MODEL || "llama-3.1-8b-instant") 
  : (process.env.OLLAMA_MODEL || "llama3.1");

const INSIGHT_SYSTEM_PROMPT = `You are "Gyul-Biseo", a smart and warm personal AI assistant for a citrus farmer.
Your role is to analyze farm statistics (sales, unpaid balance, top debtor, shipment boxes, farm logs count) and generate a friendly, encouraging business advice/insight for the farmer.

[Rules]
1. Write the advice strictly in friendly and polite standard Korean (~습니다, ~세요, ~해요). Do NOT use any regional dialect.
2. Specifically mention 1 or 2 metrics from the statistics (e.g. high unpaid ratio, shipment count, etc.) to praise them or kindly advise caution. Suggest exactly 1 gentle action they can take (e.g. sending a settlement statement, writing a farm log, etc.).
3. Write compactly in 2 to 3 sentences of continuous text. Do not use excessive line breaks or list formats. Do not explain the reasoning or wrap in JSON, just output the plain text advice itself.
4. NEVER use markdown bold markers (**).`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientHash = searchParams.get("hash");

    // 1. Calculate stateHash from latest updates and record counts
    const shipmentCount = await prisma.shipment.count({ where: { isDeleted: false } });
    const paymentCount = await prisma.payment.count({ where: { isDeleted: false } });
    const farmLogCount = await prisma.farmLog.count({ where: { isDeleted: false } });

    const latestShipment = await prisma.shipment.findFirst({
      where: { isDeleted: false },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true }
    });
    const latestPayment = await prisma.payment.findFirst({
      where: { isDeleted: false },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true }
    });
    const latestFarmLog = await prisma.farmLog.findFirst({
      where: { isDeleted: false },
      orderBy: { logDate: "desc" }, // logDate is the date field, but we can also check createdAt
      select: { createdAt: true }
    });

    const latestShipmentTime = latestShipment?.updatedAt?.getTime() || 0;
    const latestPaymentTime = latestPayment?.updatedAt?.getTime() || 0;
    const latestFarmLogTime = latestFarmLog?.createdAt?.getTime() || 0;

    const stateHash = `${shipmentCount}_${paymentCount}_${farmLogCount}_${latestShipmentTime}_${latestPaymentTime}_${latestFarmLogTime}`;

    // 2. If client hash matches stateHash, return immediately with isModified: false
    if (clientHash && clientHash === stateHash) {
      return NextResponse.json({ isModified: false });
    }

    // 3. Gather full statistical data for LLM
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

    let topDebtor = "none";
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

    // 4. Compact English context prompt
    const contextPrompt = `Stats:
- Sales: KRW ${totalEstimatedSales}
- Unpaid: KRW ${totalUnpaid} (${unpaidRatio.toFixed(1)}%)
- Top Debtor: ${topDebtor} (Unpaid: KRW ${maxUnpaid})
- Shipped: ${shippedBoxCount} boxes
- Pending Orders: ${pendingOrderCount}
- Farm Logs: ${farmLogs.length}

Based on these stats, write a 3-sentence encouraging advice/insight for the farmer.`;

    // 5. LLM Call
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

    return NextResponse.json({ isModified: true, insight, stateHash });
  } catch (error) {
    console.error("AI Insight Generation Error:", error);
    return NextResponse.json({ 
      isModified: true,
      insight: "지금 AI 정산 엔진 연결이 조금 불안정해서 통계를 확인하지 못했습니다. 조금 뒤에 다시 확인해주세요! 🍊",
      stateHash: ""
    });
  }
}
