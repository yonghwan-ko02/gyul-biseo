import { useState, useCallback } from "react";
import type { ParsedAction } from "@/lib/ai/actions";

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
        replyContent = `[출하 완료] ${savedName ? savedName + "에 " : ""}${variety} ${quantity}${unit} 출하 기록을 장부에 추가했습니다.`;
      } else if (action.action === "create_customer_order") {
        const { variety, quantity, unit, phone, address } = action.data;
        const savedName = data.savedCustomerName || action.data.customerName;
        replyContent = `[주문 접수] ${savedName}(${phone || '연락처 없음'})님의 ${variety} ${quantity}${unit} 주문을 접수했습니다. (발송 대기 상태)`;
      } else if (action.action === "create_payment") {
        replyContent = `[입금] ${action.data.customerName}에서 ${action.data.amount.toLocaleString()}원 입금된 내역을 확인했습니다.`;
      } else if (action.action === "create_farm_log") {
        replyContent = `[영농일지] 오늘 ${action.data.workType} 작업${action.data.workerCount ? ` (${action.data.workerCount}명)` : ""}을 일지에 기록했습니다.`;
      } else if (action.action === "clarify") {
        replyContent = action.data.question;
      } else if (action.action === "query_unpaid") {
        replyContent = `[조회] ${action.data.customerName || "전체"} 미수금 내역을 불러오겠습니다. (개발 중)`;
      } else {
        replyContent = `말씀하신 내용을 기록하기 어렵습니다. 다시 한번 자세히 말씀해 주시겠어요?`;
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
