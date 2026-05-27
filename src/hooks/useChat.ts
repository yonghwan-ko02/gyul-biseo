import { useState, useCallback } from "react";
import type { ParsedAction } from "@/lib/ai/actions";
import { getShipmentReply, getOrderReply, getPaymentReply, getFarmLogReply, getFallbackReply } from "@/lib/ai/responses";
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    // 사용자 메시지 추가
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      
      const data = await res.json();
      const action: ParsedAction = data.action;

      let replyContent = "";

      // Step 6 DB 연동 완료
      if (action.action === "create_shipment") {
        const { variety, quantity, unit } = action.data;
        const savedName = data.savedCustomerName || action.data.customerName;
        replyContent = getShipmentReply(savedName, variety, quantity, unit);
      } else if (action.action === "create_customer_order") {
        const { variety, quantity, unit, phone } = action.data;
        const savedName = data.savedCustomerName || action.data.customerName;
        replyContent = getOrderReply(savedName, phone, variety, quantity, unit);
      } else if (action.action === "create_payment") {
        const pr = data.paymentResult;
        if (pr) {
          replyContent = getPaymentReply(pr.customerName, pr.totalAmount, pr.paymentCount, pr.remainingAmount);
        } else {
          replyContent = getPaymentReply(action.data.customerName, action.data.amount);
        }
      } else if (action.action === "create_farm_log") {
        replyContent = getFarmLogReply(action.data.workType, action.data.workerCount);
      } else if (action.action === "clarify") {
        replyContent = action.data.question;
      } else if (action.action === "query_unpaid") {
        const ur = data.unpaidResult;
        replyContent = ur?.message || `[조회] ${action.data.customerName || "전체"} 미수금 내역을 확인합니다.`;
      } else {
        replyContent = getFallbackReply();
      }

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: replyContent },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "앗, 통신에 문제가 발생했어요. 잠시 후 다시 시도해 주세요." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, sendMessage, isLoading };
}
