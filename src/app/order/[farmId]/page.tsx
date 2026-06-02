"use client";

import { useState, use } from "react";
import { Card } from "@/components/ui/Card";
import styles from "./order.module.css";

interface PageProps {
  params: Promise<{ farmId: string }>;
}

export default function B2COrderPage({ params }: PageProps) {
  const { farmId } = use(params);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    variety: "노지감귤",
    quantity: 1,
    unit: "박스",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, farmId }),
      });

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        alert("주문 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } catch (err) {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={styles.container}>
        <Card padding="lg" variant="success">
          <div className={styles.success}>
            <span className={styles.successIcon}>✅</span>
            <h2>주문이 완료되었습니다!</h2>
            <p>농장에서 확인 후 발송할 예정입니다.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.logo}>🍊</span>
        <h2>농장 직거래 주문서</h2>
        <p>받으시는 분의 정보를 정확히 입력해 주세요.</p>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>받는 분 성함</label>
            <input required name="name" value={form.name} onChange={handleChange} placeholder="홍길동" />
          </div>

          <div className={styles.field}>
            <label>연락처</label>
            <input required type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="010-0000-0000" />
          </div>

          <div className={styles.field}>
            <label>배송지 주소</label>
            <input required name="address" value={form.address} onChange={handleChange} placeholder="상세 주소를 입력해 주세요" />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>주문 품목</label>
              <select name="variety" value={form.variety} onChange={handleChange}>
                <option value="노지감귤">노지감귤</option>
                <option value="타이벡감귤">타이벡감귤</option>
                <option value="한라봉">한라봉</option>
                <option value="천혜향">천혜향</option>
                <option value="레드향">레드향</option>
              </select>
            </div>
            
            <div className={styles.field}>
              <label>수량 (박스)</label>
              <input required type="number" min="1" name="quantity" value={form.quantity} onChange={handleChange} />
            </div>
          </div>

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? "주문 접수 중..." : "주문하기"}
          </button>
        </form>
      </Card>
    </div>
  );
}
