import { useState, useCallback } from "react";
import type { ParsedAction } from "@/lib/ai/actions";
import { getShipmentReply, getOrderReply, getPaymentReply, getFarmLogReply, getFallbackReply } from "@/lib/ai/responses";
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  pendingAction?: {
    action: "create_shipment" | "create_customer_order" | "create_payment" | "create_farm_log";
    data: {
      customerName?: string;
      variety?: string;
      quantity?: number;
      unit?: string;
      pricePerUnit?: number | null;
      phone?: string;
      address?: string;
      rawInput?: string;
      amount?: number;
      workType?: string;
      workerCount?: number | null;
      details?: string;
    };
  };
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
      
      let replyContent = "";
      let pendingAction: any = undefined;

      if (!res.ok || data.error) {
        replyContent = `앗, 데이터를 처리하는 중에 문제가 발생했어요: ${data.error || "알 수 없는 에러"}`;
      } else {
        const action: ParsedAction = data.action;

        if (!action) {
          replyContent = getFallbackReply();
        } else if (data.needsConfirmation) {
          replyContent = "입력하신 정보를 분석했습니다. 아래 카드 내용이 정확한지 확인하시고 등록 버튼을 눌러주세요.";
          pendingAction = {
            action: action.action,
            data: {
              ...action.data,
              rawInput: data.rawInput,
            }
          };
        } else if (action.action === "create_shipment") {
          const { variety, quantity, unit } = action.data;
          const savedName = data.savedCustomerName || action.data.customerName;
          replyContent = getShipmentReply(savedName, variety, quantity, unit);
        } else if (action.action === "create_customer_order") {
          const { variety, quantity, unit, phone } = action.data;
          const savedName = data.savedCustomerName || action.data.customerName;
          replyContent = getOrderReply(savedName, phone, variety, quantity, unit);
          
          if (data.emailResult) {
            if (data.emailResult.success) {
              if (data.emailResult.mode === "real") {
                replyContent += "\n\n✉️ 제휴 택배사에 배송 의뢰 메일이 자동으로 전송되었습니다!";
              } else {
                replyContent += "\n\n✉️ [안내] 제휴 택배사 배송 의뢰 메일 모의 전송이 성공적으로 기록되었습니다. (시뮬레이션 모드)";
              }
            } else {
              replyContent += "\n\n⚠️ 택배사 이메일 자동 전송에 실패했습니다. 설정을 확인해 주세요.";
            }
          }
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
        } else if (action.action === "query_revenue") {
          const rr = data.revenueResult;
          replyContent = rr?.message || `[조회] 매출 및 출하량 통계를 확인합니다.`;
        } else if (action.action === "unknown") {
          replyContent = action.data.reason || getFallbackReply();
        } else {
          replyContent = getFallbackReply();
        }
      }

      // 볼드체(**) 마크다운 제거 (한글 환경에서 볼드 렌더링 미지원)
      replyContent = replyContent.replace(/\*\*(.*?)\*\*/g, '$1');

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: replyContent, pendingAction },
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
