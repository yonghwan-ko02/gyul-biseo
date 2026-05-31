"use client";

import { useState, useEffect } from "react";
import styles from "./EditShipmentModal.module.css";

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
}

interface Props {
  shipment: Shipment;
  onClose: () => void;
  onSaved: (updatedShipment: Shipment) => void;
}

export default function EditShipmentModal({ shipment, onClose, onSaved }: Props) {
  // Extract unit from shipment.memo e.g. "단위: 박스"
  const getUnitFromMemo = (memo: string | null) => {
    if (!memo) return "박스";
    if (memo.startsWith("단위: ")) return memo.replace("단위: ", "");
    return memo;
  };

  const [form, setForm] = useState({
    customerName: shipment.customer.name,
    phone: shipment.customer.phone || "",
    address: shipment.customer.address || "",
    variety: shipment.variety,
    quantity: shipment.quantity,
    unit: getUnitFromMemo(shipment.memo),
    pricePerUnit: shipment.unitPrice !== null && shipment.unitPrice !== undefined ? String(shipment.unitPrice) : "",
    totalAmount: shipment.totalAmount !== null && shipment.totalAmount !== undefined ? String(shipment.totalAmount) : "",
    outstandingAmount: shipment.outstandingAmount !== null && shipment.outstandingAmount !== undefined ? String(shipment.outstandingAmount) : "",
    paymentStatus: shipment.paymentStatus as "paid" | "unpaid" | "partial",
    status: shipment.status as "pending" | "shipped",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Auto calculate totalAmount when quantity or pricePerUnit changes
  useEffect(() => {
    const qty = Number(form.quantity) || 0;
    const price = Number(form.pricePerUnit) || 0;
    if (qty > 0 && price > 0) {
      const calculatedTotal = qty * price;
      setForm((prev) => {
        // If they chose 완납, outstanding is 0. If 미수금, outstanding is calculatedTotal
        let calculatedOutstanding = prev.outstandingAmount;
        if (prev.paymentStatus === "paid") {
          calculatedOutstanding = "0";
        } else if (prev.paymentStatus === "unpaid") {
          calculatedOutstanding = String(calculatedTotal);
        }

        return {
          ...prev,
          totalAmount: String(calculatedTotal),
          outstandingAmount: calculatedOutstanding,
        };
      });
    }
  }, [form.quantity, form.pricePerUnit]);

  // Adjust outstandingAmount based on payment status changes
  const handlePaymentStatusChange = (status: "paid" | "unpaid" | "partial") => {
    setForm((prev) => {
      const total = Number(prev.totalAmount) || 0;
      let outstanding = prev.outstandingAmount;

      if (status === "paid") {
        outstanding = "0";
      } else if (status === "unpaid") {
        outstanding = String(total);
      } else if (status === "partial") {
        // Default partial to half or leave it
        outstanding = prev.outstandingAmount === "0" || prev.outstandingAmount === String(total)
          ? String(Math.floor(total / 2))
          : prev.outstandingAmount;
      }

      return {
        ...prev,
        paymentStatus: status,
        outstandingAmount: outstanding,
      };
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "quantity" ? Math.max(1, parseInt(value) || 1) : value,
    }));
  };

  const adjustQuantity = (amount: number) => {
    setForm((prev) => ({
      ...prev,
      quantity: Math.max(1, prev.quantity + amount),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parsedPrice = form.pricePerUnit ? Number(form.pricePerUnit) : null;
      const parsedTotal = form.totalAmount ? Number(form.totalAmount) : (parsedPrice ? form.quantity * parsedPrice : null);
      const parsedOutstanding = form.paymentStatus === "paid" ? 0 : (form.outstandingAmount ? Number(form.outstandingAmount) : parsedTotal);

      const res = await fetch(`/api/shipments/${shipment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pricePerUnit: parsedPrice,
          totalAmount: parsedTotal,
          outstandingAmount: parsedOutstanding,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSaved(data.shipment);
        alert("장부 기록이 성공적으로 수정되었습니다! 👍");
        onClose();
      } else {
        alert(`수정 실패: ${data.error || "알 수 없는 에러가 발생했습니다."}`);
      }
    } catch (e) {
      alert("네트워크 연결에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>✏️ 장부 내역 수정</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {/* 거래처 정보 섹션 */}
          <div className={styles.sectionTitle}>🤝 거래처 정보</div>

          <div className={styles.field}>
            <label className={styles.label}>거래처 이름 (성함)</label>
            <input
              type="text"
              name="customerName"
              className={styles.input}
              value={form.customerName}
              onChange={handleInputChange}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>연락처</label>
              <input
                type="text"
                name="phone"
                className={styles.input}
                value={form.phone}
                onChange={handleInputChange}
                placeholder="010-0000-0000"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>배송 주소</label>
              <input
                type="text"
                name="address"
                className={styles.input}
                value={form.address}
                onChange={handleInputChange}
                placeholder="지번/도로명 주소"
              />
            </div>
          </div>

          {/* 출하 세부 내역 섹션 */}
          <div className={styles.sectionTitle}>📦 출하 및 주문 상세</div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>품종</label>
              <input
                type="text"
                name="variety"
                className={styles.input}
                value={form.variety}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>단위</label>
              <input
                type="text"
                name="unit"
                className={styles.input}
                value={form.unit}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>수량</label>
              <div className={styles.quantityGroup}>
                <button type="button" className={styles.qtyBtn} onClick={() => adjustQuantity(-1)}>
                  -
                </button>
                <input
                  type="number"
                  name="quantity"
                  className={`${styles.input} ${styles.qtyInput}`}
                  value={form.quantity}
                  onChange={handleInputChange}
                  min="1"
                />
                <button type="button" className={styles.qtyBtn} onClick={() => adjustQuantity(1)}>
                  +
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>상자당 단가 (원)</label>
              <input
                type="number"
                name="pricePerUnit"
                className={styles.input}
                value={form.pricePerUnit}
                onChange={handleInputChange}
                placeholder="미정 시 비워두기"
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>총액 (원)</label>
              <input
                type="number"
                name="totalAmount"
                className={styles.input}
                value={form.totalAmount}
                onChange={handleInputChange}
                placeholder="수량*단가 자동 계산"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>발송 상태</label>
              <div className={`${styles.statusSelector} ${styles.statusSelectorDual}`}>
                <div
                  className={`${styles.statusOption} ${form.status === "pending" ? styles.statusOptionActive : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, status: "pending" }))}
                >
                  발송대기
                </div>
                <div
                  className={`${styles.statusOption} ${form.status === "shipped" ? styles.statusOptionActive : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, status: "shipped" }))}
                >
                  출하완료
                </div>
              </div>
            </div>
          </div>

          {/* 수금 정보 섹션 */}
          <div className={styles.sectionTitle}>💸 수금 및 정산 상태</div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>수금 상태</label>
              <div className={styles.statusSelector}>
                <div
                  className={`${styles.statusOption} ${form.paymentStatus === "unpaid" ? styles.statusOptionActive : ""}`}
                  onClick={() => handlePaymentStatusChange("unpaid")}
                >
                  미수금
                </div>
                <div
                  className={`${styles.statusOption} ${form.paymentStatus === "partial" ? styles.statusOptionActive : ""}`}
                  onClick={() => handlePaymentStatusChange("partial")}
                >
                  일부수금
                </div>
                <div
                  className={`${styles.statusOption} ${form.paymentStatus === "paid" ? styles.statusOptionActive : ""}`}
                  onClick={() => handlePaymentStatusChange("paid")}
                >
                  완납
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>남은 미수금 (원)</label>
              <input
                type="number"
                name="outstandingAmount"
                className={styles.input}
                value={form.outstandingAmount}
                onChange={handleInputChange}
                disabled={form.paymentStatus === "paid"}
                placeholder="미수금 액수"
              />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "저장 중..." : "✓ 장부 내용 저장"}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSaving}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
