"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { format } from "date-fns";
import styles from "./ledger.module.css";
import LedgerCalendar from "@/components/ledger/LedgerCalendar";
import EditShipmentModal from "@/components/ledger/EditShipmentModal";

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
  unitPrice?: number | null;
  totalAmount?: number | null;
  outstandingAmount?: number | null;
  customer: Customer;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientAddress?: string | null;
}

interface Props {
  initialShipments: Shipment[];
}

export default function LedgerClientList({ initialShipments }: Props) {
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  
  const [filterType, setFilterType] = useState<"all" | "week" | "month" | "custom">("all");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // 필터링 적용된 출하 목록 계산
  const filteredShipments = useMemo(() => {
    const now = new Date();
    return shipments.filter((s) => {
      const sDate = new Date(s.createdAt);
      if (filterType === "all") return true;
      
      if (filterType === "week") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return sDate >= sevenDaysAgo;
      }
      
      if (filterType === "month") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        return sDate >= thirtyDaysAgo;
      }
      
      if (filterType === "custom") {
        if (!customStart && !customEnd) return true;
        
        let startCondition = true;
        let endCondition = true;
        
        if (customStart) {
          const start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
          startCondition = sDate >= start;
        }
        
        if (customEnd) {
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          endCondition = sDate <= end;
        }
        
        return startCondition && endCondition;
      }
      
      return true;
    });
  }, [shipments, filterType, customStart, customEnd]);

  // props 변경 시 상태 동기화
  useEffect(() => {
    setShipments(initialShipments);
  }, [initialShipments]);

  // 각 주문별 발송 상태 추적 (loading, success, error)
  const [sendingStates, setSendingStates] = useState<Record<string, "idle" | "sending" | "success" | "error">>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleShipmentSaved = (updatedShipment: Shipment) => {
    setShipments((prevShipments) =>
      prevShipments.map((s) =>
        s.id === updatedShipment.id ? updatedShipment : s
      )
    );
  };

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
        
        // 성공 시 로컬 상태에서 출하 상태를 'shipped'로 업데이트하여 배송대기 배지와 버튼 문구를 피드백
        setShipments((prevShipments) =>
          prevShipments.map((s) =>
            s.id === shipmentId ? { ...s, status: "shipped" } : s
          )
        );
        
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      {/* 뷰 모드 탭 스위처 */}
      <div style={{
        display: "flex",
        background: "var(--color-bg)",
        padding: "6px",
        borderRadius: "var(--radius-md)",
        border: "1.5px solid var(--color-border)",
        width: "100%",
        maxWidth: "320px",
        margin: "0 auto var(--space-sm) auto"
      }}>
        <button
          type="button"
          onClick={() => setViewMode("list")}
          style={{
            flex: 1,
            padding: "10px",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
            background: viewMode === "list" ? "var(--color-surface)" : "transparent",
            color: viewMode === "list" ? "var(--color-primary-dark)" : "var(--color-text-secondary)",
            boxShadow: viewMode === "list" ? "var(--shadow-sm)" : "none",
            transition: "all 0.2s ease"
          }}
        >
          📋 내역 리스트
        </button>
        <button
          type="button"
          onClick={() => setViewMode("calendar")}
          style={{
            flex: 1,
            padding: "10px",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
            background: viewMode === "calendar" ? "var(--color-surface)" : "transparent",
            color: viewMode === "calendar" ? "var(--color-primary-dark)" : "var(--color-text-secondary)",
            boxShadow: viewMode === "calendar" ? "var(--shadow-sm)" : "none",
            transition: "all 0.2s ease"
          }}
        >
          📅 달력으로 보기
        </button>
      </div>

      {/* ─── 기간 필터 바 (Period Filter Bar) ─── */}
      <div className={styles.filterBar}>
        <div className={styles.filterLabel}>📅 조회 기간 설정</div>
        <div className={styles.filterGroup}>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterType === "all" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilterType("all")}
          >
            전체
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterType === "week" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilterType("week")}
          >
            주별(7일)
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterType === "month" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilterType("month")}
          >
            월별(30일)
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterType === "custom" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilterType("custom")}
          >
            기간설정
          </button>
        </div>

        {filterType === "custom" && (
          <div className={styles.dateRangePicker}>
            <input
              type="date"
              className={styles.dateInput}
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              aria-label="조회 시작일"
            />
            <span className={styles.rangeSeparator}>~</span>
            <input
              type="date"
              className={styles.dateInput}
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              aria-label="조회 종료일"
            />
          </div>
        )}
      </div>

      {/* 달력 뷰 */}
      {viewMode === "calendar" && (
        <LedgerCalendar shipments={filteredShipments} onEditClick={setEditingShipment} />
      )}

      {/* 리스트 뷰 */}
      {viewMode === "list" && (
        <div className={styles.list}>
          {filteredShipments.length === 0 ? (
            <p className="text-secondary" style={{ textAlign: "center", padding: "var(--space-lg) 0", fontSize: "16px" }}>
              선택한 기간에 해당하는 거래 내역이 없습니다.
            </p>
          ) : (
            filteredShipments.map((tx) => {
            const sendingState = sendingStates[tx.id] || "idle";
            
            return (
              <Card key={tx.id} padding="lg" className={styles.ledgerCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.customerName}>
                      {tx.customer.name}
                      {tx.recipientName && tx.recipientName !== tx.customer.name && (
                        <span style={{ fontSize: "14px", fontWeight: "normal", color: "var(--color-text-secondary)", marginLeft: "8px" }}>
                          (받는 분: {tx.recipientName})
                        </span>
                      )}
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
                  
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                    <div className={styles.paymentStatus}>
                      {tx.paymentStatus === "paid" ? (
                        <span className="amount-positive text-sm">결제완료</span>
                      ) : tx.paymentStatus === "partial" ? (
                        <span className="text-warning text-sm" style={{ fontWeight: 600 }}>일부수금</span>
                      ) : (
                        <span className="amount-negative text-sm">미수금</span>
                      )}
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setEditingShipment(tx)}
                      style={{
                        background: "none",
                        border: "1.5px solid var(--color-border)",
                        borderRadius: "6px",
                        padding: "4px 10px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        color: "var(--color-primary-dark)",
                        transition: "all 0.15s ease"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-primary-bg)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      ✏️ 수정
                    </button>
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
                  
                  {tx.unitPrice && (
                    <div className={styles.infoRow}>
                      <span className="text-secondary">상자 단가</span>
                      <span className={styles.infoValue}>₩{tx.unitPrice.toLocaleString()}</span>
                    </div>
                  )}

                  {tx.totalAmount && (
                    <div className={styles.infoRow}>
                      <span className="text-secondary">총액</span>
                      <span className={styles.infoValue} style={{ fontWeight: 700 }}>
                        ₩{tx.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {tx.outstandingAmount !== null && tx.outstandingAmount !== undefined && tx.paymentStatus !== "paid" && (
                    <div className={styles.infoRow}>
                      <span className="text-secondary">남은 미수금</span>
                      <span className={`${styles.infoValue} amount-negative`} style={{ fontWeight: 700 }}>
                        ₩{tx.outstandingAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {(tx.recipientPhone || tx.customer.phone) && (
                    <div className={styles.infoRow}>
                      <span className="text-secondary">연락처</span>
                      <span className={styles.infoValue}>{tx.recipientPhone || tx.customer.phone}</span>
                    </div>
                  )}
                  {(tx.recipientAddress || tx.customer.address) && (
                    <div className={styles.infoRow}>
                      <span className="text-secondary">배송지</span>
                      <span className={styles.infoValue}>{tx.recipientAddress || tx.customer.address}</span>
                    </div>
                  )}
                </div>

                {/* 원클릭 택배 이메일 전송 인터랙션 버튼 */}
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
          })
          )}
        </div>
      )}

      {/* 상세 수정 모달 */}
      {editingShipment !== null && (
        <EditShipmentModal
          shipment={editingShipment}
          onClose={() => setEditingShipment(null)}
          onSaved={handleShipmentSaved}
        />
      )}
    </div>
  );
}
