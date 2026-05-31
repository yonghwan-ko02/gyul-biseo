"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { format } from "date-fns";
import styles from "./ledger.module.css";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

interface Shipment {
  id: string;
  createdAt: string;
  variety: string;
  quantity: number;
  memo: string | null;
  paymentStatus: string;
  status: string;
  customer: Customer;
}

interface Props {
  initialShipments: Shipment[];
}

export default function LedgerClientList({ initialShipments }: Props) {
  // 각 주문별 발송 상태 추적 (loading, success, error)
  const [sendingStates, setSendingStates] = useState<Record<string, "idle" | "sending" | "success" | "error">>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendEmail = async (shipmentId: string) => {
    setSendingStates((prev) => ({ ...prev, [shipmentId]: "sending" }));
    setErrorMessage(null);

    try {
      const res = await fetch("/api/orders/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSendingStates((prev) => ({ ...prev, [shipmentId]: "success" }));
        
        // 2초 후 완료 상태 초기화
        setTimeout(() => {
          setSendingStates((prev) => ({ ...prev, [shipmentId]: "idle" }));
        }, 2500);

        if (data.emailResult?.mode === "mock") {
          alert(`✉️ [시뮬레이션 모드 성공]\n택배사 이메일 모의 전송이 무사히 기록되었습니다!\n- 수신: ${data.emailResult.logPath || "scratch 폴더 내 파일"}`);
        } else {
          alert(`✉️ [택배사 전송 완료]\n제휴된 택배사 이메일로 배송 의뢰서가 정상적으로 발송되었습니다!`);
        }
      } else {
        setSendingStates((prev) => ({ ...prev, [shipmentId]: "error" }));
        const err = data.error || "메일 전송 중 알 수 없는 에러가 발생했습니다.";
        setErrorMessage(err);
        alert(`⚠️ 오류 발생:\n${err}`);
        
        setTimeout(() => {
          setSendingStates((prev) => ({ ...prev, [shipmentId]: "idle" }));
        }, 3000);
      }
    } catch (err) {
      setSendingStates((prev) => ({ ...prev, [shipmentId]: "error" }));
      alert("⚠️ 네트워크 연결 오류가 발생했습니다.");
      
      setTimeout(() => {
        setSendingStates((prev) => ({ ...prev, [shipmentId]: "idle" }));
      }, 3000);
    }
  };

  return (
    <div className={styles.list}>
      {initialShipments.map((tx) => {
        const sendingState = sendingStates[tx.id] || "idle";
        
        return (
          <Card key={tx.id} padding="lg" className={styles.ledgerCard}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.customerName}>
                  {tx.customer.name}
                  {tx.status === "pending" ? (
                    <span className={styles.badgePending}>발송대기</span>
                  ) : (
                    <span className={styles.badgeShipped}>출하완료</span>
                  )}
                </h3>
                <p className="text-secondary text-sm">
                  {format(new Date(tx.createdAt), "yyyy.MM.dd HH:mm")}
                </p>
              </div>
              <div className={styles.paymentStatus}>
                {tx.paymentStatus === "paid" ? (
                  <span className="amount-positive text-sm">결제완료</span>
                ) : (
                  <span className="amount-negative text-sm">미수금</span>
                )}
              </div>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className="text-secondary">품목</span>
                <span className={styles.infoValue}>{tx.variety}</span>
              </div>
              <div className={styles.infoRow}>
                <span className="text-secondary">수량</span>
                <span className={styles.infoValue}>
                  {tx.quantity} {tx.memo?.replace("단위: ", "") || "박스"}
                </span>
              </div>
              {tx.customer.phone && (
                <div className={styles.infoRow}>
                  <span className="text-secondary">연락처</span>
                  <span className={styles.infoValue}>{tx.customer.phone}</span>
                </div>
              )}
              {tx.customer.address && (
                <div className={styles.infoRow}>
                  <span className="text-secondary">배송지</span>
                  <span className={styles.infoValue}>{tx.customer.address}</span>
                </div>
              )}
            </div>

            {/* 원클릭 택배 이메일 전송 인터랙션 버튼 추가 */}
            <div className={styles.actionRow}>
              <button
                className={`${styles.emailButton} ${
                  sendingState === "sending"
                    ? styles.emailButtonSending
                    : sendingState === "success"
                    ? styles.emailButtonSuccess
                    : sendingState === "error"
                    ? styles.emailButtonError
                    : tx.status === "pending"
                    ? styles.emailButtonPending
                    : styles.emailButtonNormal
                }`}
                disabled={sendingState === "sending"}
                onClick={() => handleSendEmail(tx.id)}
              >
                {sendingState === "sending" && (
                  <>
                    <span className={styles.spinner}>⏳</span> 전송하는 중...
                  </>
                )}
                {sendingState === "success" && "전송 완료! ✅"}
                {sendingState === "error" && "전송 실패 ⚠️"}
                {sendingState === "idle" && (
                  <>
                    <span>✉️</span>{" "}
                    {tx.status === "pending" ? "택배사에 의뢰서 즉시 전송" : "택배의뢰 메일 재발송"}
                  </>
                )}
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
