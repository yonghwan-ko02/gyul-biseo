"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import styles from "./SettingsForm.module.css";

interface FarmProps {
  id: string;
  farmName: string | null;
  ownerName: string;
  phone: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  courierName: string | null;
  courierEmail: string | null;
  autoEmailCourier: boolean;
}

export function SettingsForm({ farm }: { farm: FarmProps }) {
  const [form, setForm] = useState({
    farmName: farm.farmName || "",
    ownerName: farm.ownerName,
    phone: farm.phone || "",
    bankName: farm.bankName || "",
    accountNumber: farm.accountNumber || "",
    accountHolder: farm.accountHolder || "",
    courierName: farm.courierName || "",
    courierEmail: farm.courierEmail || "",
    autoEmailCourier: farm.autoEmailCourier || false,
  });

  const handleToggleAutoEmail = () => {
    setForm(prev => ({ ...prev, autoEmailCourier: !prev.autoEmailCourier }));
  };

  const orderLink = typeof window !== "undefined" ? `${window.location.origin}/order/${farm.id}` : `http://localhost:3000/order/${farm.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(`저희 농장 귤을 주문해주셔서 감사합니다! 🍊\n아래 링크를 눌러 주소와 주문 내역을 남겨주세요.\n👉 ${orderLink}`).then(() => {
      alert("주문서 링크가 복사되었습니다. 카톡 공지사항이나 손님에게 붙여넣기 하세요!");
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/farm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: farm.id, ...form }),
      });
      if (res.ok) alert("설정이 저장되었습니다.");
      else alert("저장 중 오류가 발생했습니다.");
    } catch (e) {
      alert("네트워크 오류입니다.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      
      {/* B2C 주문 링크 섹션 */}
      <Card padding="lg">
        <h3 className={styles.title}>🔗 손님용 간편 주문서 링크</h3>
        <p className={styles.subtitle}>
          이 링크를 복사해서 카카오톡으로 손님들에게 보내세요. 손님들이 직접 배송지를 입력하면 장부에 자동으로 기록됩니다.
        </p>
        <div className={styles.copyArea}>
          {orderLink}
        </div>
        <button onClick={copyLink} className={styles.button}>
          주문서 링크 복사하기
        </button>
      </Card>

      {/* 농장/계좌 정보 폼 */}
      <Card padding="lg">
        <h3 className={styles.title}>🏡 내 농장 정보</h3>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          
          <div className={styles.formField}>
            <label className={styles.label}>농장 이름</label>
            <input 
              name="farmName" 
              value={form.farmName} 
              onChange={handleChange} 
              className={styles.input}
              placeholder="예: 귤빛농원"
            />
          </div>

          <div className={styles.formGroupRow}>
            <div className={styles.formField}>
              <label className={styles.label}>대표자 (본인)</label>
              <input 
                required 
                name="ownerName" 
                value={form.ownerName} 
                onChange={handleChange} 
                className={styles.input}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>연락처</label>
              <input 
                name="phone" 
                value={form.phone} 
                onChange={handleChange} 
                className={styles.input}
                placeholder="예: 010-1234-5678"
              />
            </div>
          </div>

          <h3 className={styles.sectionTitle}>💳 정산 계좌</h3>
          
          <div className={styles.formGroupRow}>
            <div className={styles.formField}>
              <label className={styles.label}>은행명</label>
              <input 
                name="bankName" 
                value={form.bankName} 
                onChange={handleChange} 
                placeholder="농협" 
                className={styles.input}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>예금주</label>
              <input 
                name="accountHolder" 
                value={form.accountHolder} 
                onChange={handleChange} 
                placeholder="홍길동" 
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>계좌번호 ( - 제외)</label>
            <input 
              name="accountNumber" 
              value={form.accountNumber} 
              onChange={handleChange} 
              placeholder="3560000000000" 
              className={styles.input}
            />
          </div>

          <h3 className={styles.sectionTitle}>📦 제휴 택배사 자동 연동</h3>
          
          <div className={styles.formGroupRow}>
            <div className={styles.formField}>
              <label className={styles.label}>택배사명</label>
              <input 
                name="courierName" 
                value={form.courierName} 
                onChange={handleChange} 
                placeholder="우체국택배, CJ대한통운 등" 
                className={styles.input}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>택배 접수 이메일</label>
              <input 
                type="email" 
                name="courierEmail" 
                value={form.courierEmail} 
                onChange={handleChange} 
                placeholder="office@courier.com" 
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.checkboxContainer}>
            <div className={styles.checkboxTextContainer}>
              <span className={styles.checkboxLabel}>주문 접수 시 즉시 전송</span>
              <span className={styles.checkboxSubLabel}>고객 주문 등록 시 택배사로 메일을 자동 전송합니다.</span>
            </div>
            <input 
              type="checkbox" 
              checked={form.autoEmailCourier} 
              onChange={handleToggleAutoEmail} 
              className={styles.checkbox}
            />
          </div>

          <button type="submit" className={styles.saveButton}>
            변경사항 저장
          </button>
        </form>
      </Card>
    </div>
  );
}
