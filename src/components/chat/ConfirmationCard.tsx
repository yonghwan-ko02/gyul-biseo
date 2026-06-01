"use client";

import { useState } from "react";
import styles from "./ConfirmationCard.module.css";

interface Props {
  action: "create_shipment" | "create_customer_order";
  data: {
    customerName: string;
    recipientName?: string;
    variety: string;
    quantity: number;
    unit: string;
    pricePerUnit?: number | null;
    phone?: string;
    address?: string;
    rawInput?: string;
  };
}

const COMMON_VARIETIES = ["노지감귤", "타이벡", "한라봉", "천혜향", "레드향", "황금향"];
const COMMON_UNITS = ["박스", "콘테나", "kg", "개"];

export default function ConfirmationCard({ action, data }: Props) {
  const [form, setForm] = useState({
    customerName: data.customerName || "미지정 거래처",
    recipientName: data.recipientName || data.customerName || "",
    variety: data.variety || "노지감귤",
    quantity: data.quantity || 1,
    unit: data.unit || "박스",
    pricePerUnit: data.pricePerUnit || "",
    phone: data.phone || "",
    address: data.address || "",
    rawInput: data.rawInput || "",
  });

  const [status, setStatus] = useState<"pending" | "registering" | "success" | "cancelled" | "error">("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "quantity" ? Math.max(1, parseInt(value) || 1) : value,
    }));
  };

  const handleVarietyClick = (v: string) => {
    setForm((prev) => ({ ...prev, variety: v }));
  };

  const handleUnitClick = (u: string) => {
    setForm((prev) => ({ ...prev, unit: u }));
  };

  const adjustQuantity = (amount: number) => {
    setForm((prev) => ({
      ...prev,
      quantity: Math.max(1, prev.quantity + amount),
    }));
  };

  const handleConfirm = async () => {
    setStatus("registering");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          data: {
            ...form,
            pricePerUnit: form.pricePerUnit ? Number(form.pricePerUnit) : null,
          },
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(result.error || "등록하는 중에 에러가 발생했습니다.");
      }
    } catch (e) {
      setStatus("error");
      setErrorMessage("서버와 통신하는 중 문제가 발생했습니다.");
    }
  };

  if (status === "success") {
    return (
      <div className={styles.card}>
        <div className={styles.successState}>
          <span className={styles.successIcon}>🎉</span>
          <h3 className={styles.successTitle}>장부에 성공적으로 등록되었습니다!</h3>
          <p className={styles.successDesc}>
            {form.customerName} · {form.variety} {form.quantity}{form.unit}
          </p>
          <p className="text-secondary text-sm" style={{ marginTop: "8px" }}>
            {action === "create_customer_order" ? "택배 배송 의뢰가 예약되었습니다." : "출하 정보가 장부에 기록되었습니다."}
          </p>
        </div>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className={styles.card}>
        <div className={styles.cancelledState}>
          <span>🛑 거래 등록이 취소되었습니다.</span>
        </div>
      </div>
    );
  }

  const isShipment = action === "create_shipment";

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>
        🍊 {isShipment ? "출하 내역 등록 확인" : "B2C 주문 접수 확인"}
      </h3>

      <div className={styles.form}>
        {/* 거래처명 */}
        <div className={styles.field}>
          <label className={styles.label}>{isShipment ? "거래처 (성함)" : "주문자 (결제자 성함)"}</label>
          <input
            type="text"
            name="customerName"
            className={styles.input}
            value={form.customerName}
            onChange={handleInputChange}
            placeholder={isShipment ? "예: 홍길동, 제주청과" : "예: 홍길동"}
            disabled={status === "registering"}
          />
        </div>

        {/* 품종 */}
        <div className={styles.field}>
          <label className={styles.label}>품종</label>
          <input
            type="text"
            name="variety"
            className={styles.input}
            value={form.variety}
            onChange={handleInputChange}
            placeholder="품종 입력"
            disabled={status === "registering"}
          />
          <div className={styles.varietyChips}>
            {COMMON_VARIETIES.map((v) => (
              <span
                key={v}
                className={`${styles.chip} ${form.variety.includes(v) ? styles.chipActive : ""}`}
                onClick={() => status !== "registering" && handleVarietyClick(v)}
              >
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* 수량 및 단위 */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>수량</label>
            <div className={styles.quantityGroup}>
              <button
                type="button"
                className={styles.qtyButton}
                onClick={() => adjustQuantity(-1)}
                disabled={status === "registering"}
              >
                -
              </button>
              <input
                type="number"
                name="quantity"
                className={`${styles.input} ${styles.qtyInput}`}
                value={form.quantity}
                onChange={handleInputChange}
                min="1"
                disabled={status === "registering"}
              />
              <button
                type="button"
                className={styles.qtyButton}
                onClick={() => adjustQuantity(1)}
                disabled={status === "registering"}
              >
                +
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>단위</label>
            <input
              type="text"
              name="unit"
              className={styles.input}
              value={form.unit}
              onChange={handleInputChange}
              placeholder="단위"
              disabled={status === "registering"}
            />
            <div className={styles.varietyChips}>
              {COMMON_UNITS.map((u) => (
                <span
                  key={u}
                  className={`${styles.chip} ${form.unit === u ? styles.chipActive : ""}`}
                  onClick={() => status !== "registering" && handleUnitClick(u)}
                >
                  {u}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 출하일 때: 단가 */}
        {isShipment && (
          <div className={styles.field}>
            <label className={styles.label}>상자당 단가 (원)</label>
            <input
              type="number"
              name="pricePerUnit"
              className={styles.input}
              value={form.pricePerUnit}
              onChange={handleInputChange}
              placeholder="단가 미정 시 비워두세요"
              disabled={status === "registering"}
            />
          </div>
        )}

        {/* B2C 주문일 때: 연락처 및 주소 */}
        {!isShipment && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>받는 분 성함</label>
              <input
                type="text"
                name="recipientName"
                className={styles.input}
                value={form.recipientName}
                onChange={handleInputChange}
                placeholder="예: 김철수 (비워두면 주문자와 동일)"
                disabled={status === "registering"}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>받는 분 연락처</label>
              <input
                type="text"
                name="phone"
                className={styles.input}
                value={form.phone}
                onChange={handleInputChange}
                placeholder="예: 010-1234-5678"
                disabled={status === "registering"}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>배송지 주소</label>
              <input
                type="text"
                name="address"
                className={styles.input}
                value={form.address}
                onChange={handleInputChange}
                placeholder="상세 주소를 정확히 적어주세요"
                disabled={status === "registering"}
              />
            </div>
          </>
        )}
      </div>

      {status === "error" && (
        <div style={{ color: "var(--color-danger)", fontSize: "var(--font-size-sm)" }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.confirmBtn}
          onClick={handleConfirm}
          disabled={status === "registering" || !form.customerName || !form.variety}
        >
          {status === "registering" ? "등록하는 중..." : "✓ 장부에 바로 등록"}
        </button>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => setStatus("cancelled")}
          disabled={status === "registering"}
        >
          취소
        </button>
      </div>
    </div>
  );
}
