"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { format } from "date-fns";
import styles from "./customers.module.css";

interface Shipment {
  id: string;
  createdAt: Date | string;
  variety: string;
  quantity: number;
  memo: string | null;
  unitPrice: number | null;
  totalAmount: number | null;
  paymentStatus: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  nickname: string | null;
  type: string;
  phone: string | null;
  address: string | null;
  memo: string | null;
  shipments: Shipment[];
}

interface Props {
  initialCustomers: Customer[];
}

export default function CustomerClientPage({ initialCustomers }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    initialCustomers.length > 0 ? initialCustomers[0].id : null
  );

  // 검색 필터링 (이름 또는 별칭으로 검색)
  const filteredCustomers = initialCustomers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.nickname && c.nickname.toLowerCase().includes(q))
    );
  });

  const selectedCustomer = initialCustomers.find(
    (c) => c.id === selectedCustomerId
  );

  // 거래처 타입 한국어 변환
  const getCustomerTypeLabel = (type: string) => {
    switch (type) {
      case "direct":
        return "직거래";
      case "wholesale":
        return "도매(청과)";
      case "coop":
        return "작목반";
      case "acquaintance":
        return "지인(외상)";
      default:
        return "거래처";
    }
  };

  // 클립보드 주소 복사 유틸
  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    alert("주소가 복사되었습니다! 📋");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>👥 고객 관리 (CRM)</h2>
        <p className="text-secondary">
          고객의 주소록과 과거 출하 및 주문 배송 내역을 한눈에 관리하세요.
        </p>
      </div>

      {/* 검색 바 */}
      <div className={styles.searchRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="고객 이름 또는 별칭(예: 삼춘)으로 검색하세요"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.layout}>
        {/* 왼쪽: 고객 목록 */}
        <div className={styles.sidebar}>
          {filteredCustomers.length === 0 ? (
            <p className="text-secondary" style={{ padding: "var(--space-md)" }}>
              검색 결과가 없습니다.
            </p>
          ) : (
            filteredCustomers.map((c) => {
              const isSelected = c.id === selectedCustomerId;
              const directOrderCount = c.shipments.filter(
                (s) => s.status === "pending"
              ).length;
              return (
                <Card
                  key={c.id}
                  padding="md"
                  className={`${styles.customerItem} ${isSelected ? styles.activeCustomerItem : ""}`}
                  onClick={() => setSelectedCustomerId(c.id)}
                >
                  <div className={styles.customerHeader}>
                    <div className={styles.nameGroup}>
                      <span className={styles.name}>{c.name}</span>
                      {c.nickname && (
                        <span className={styles.nickname}>({c.nickname})</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {directOrderCount > 0 && (
                        <span
                          style={{
                            backgroundColor: "var(--color-primary)",
                            color: "white",
                            fontSize: "var(--font-size-xs)",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            fontWeight: "bold"
                          }}
                        >
                          대기 {directOrderCount}
                        </span>
                      )}
                      <span
                        className={`${styles.typeBadge} ${c.type === "direct" ? styles.typeBadgeDirect : ""}`}
                      >
                        {getCustomerTypeLabel(c.type)}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* 오른쪽: 상세 프로필 & 거래 이력 타임라인 */}
        <div className={styles.detailView}>
          {selectedCustomer ? (
            <>
              {/* 프로필 카드 */}
              <Card padding="lg" className={styles.profileCard}>
                <h3 className={styles.profileTitle}>
                  {selectedCustomer.name}
                  {selectedCustomer.nickname && ` (${selectedCustomer.nickname})`}
                </h3>
                <span
                  className={`${styles.typeBadge} ${selectedCustomer.type === "direct" ? styles.typeBadgeDirect : ""}`}
                >
                  {getCustomerTypeLabel(selectedCustomer.type)}
                </span>

                <div className={styles.metaGrid}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>📞 연락처</span>
                    <span className={styles.metaValue}>
                      {selectedCustomer.phone ? (
                        <a href={`tel:${selectedCustomer.phone}`} className={styles.linkButton}>
                          {selectedCustomer.phone}
                        </a>
                      ) : (
                        <span className="text-secondary">기록 없음</span>
                      )}
                    </span>
                  </div>

                  <div className={styles.metaRow} style={{ alignItems: "flex-start" }}>
                    <span className={styles.metaLabel}>📍 배송지 주소</span>
                    <span className={styles.metaValue} style={{ maxWidth: "70%" }}>
                      {selectedCustomer.address ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span>{selectedCustomer.address}</span>
                          <span
                            className={styles.linkButton}
                            style={{ fontSize: "var(--font-size-xs)", alignSelf: "flex-end" }}
                            onClick={() => handleCopyAddress(selectedCustomer.address!)}
                          >
                            주소 복사하기
                          </span>
                        </div>
                      ) : (
                        <span className="text-secondary">기록 없음</span>
                      )}
                    </span>
                  </div>

                  {selectedCustomer.memo && (
                    <div className={styles.metaRow} style={{ alignItems: "flex-start" }}>
                      <span className={styles.metaLabel}>📝 메모</span>
                      <span className={styles.metaValue} style={{ maxWidth: "70%" }}>
                        {selectedCustomer.memo}
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              {/* 과거 배송 및 출하 이력 타임라인 */}
              <div className={styles.historySection}>
                <h3 className={styles.historyTitle}>📦 과거 출하 및 주문 이력</h3>
                
                {selectedCustomer.shipments.length === 0 ? (
                  <Card padding="md">
                    <p className="text-secondary" style={{ textAlign: "center" }}>
                      이 고객에게 등록된 출하/주문 내역이 아직 없습니다.
                    </p>
                  </Card>
                ) : (
                  <div className={styles.timeline}>
                    {selectedCustomer.shipments.map((s) => (
                      <div
                        key={s.id}
                        className={`${styles.timelineItem} ${s.status === "pending" ? styles.timelineItemActive : ""}`}
                      >
                        <div className={styles.timelineHeader}>
                          <span className={styles.timelineDate}>
                            {format(new Date(s.createdAt), "yyyy.MM.dd HH:mm")}
                          </span>
                          <span
                            className={`${styles.timelineStatus} ${
                              s.status === "pending" ? styles.statusPending : styles.statusShipped
                            }`}
                          >
                            {s.status === "pending" ? "발송대기(주문)" : "출하완료"}
                          </span>
                        </div>
                        <div className={styles.timelineContent}>
                          {s.variety} {s.quantity}
                          {s.memo?.replace("단위: ", "") || "박스"}
                        </div>
                        {s.unitPrice && (
                          <div className={styles.timelineMeta}>
                            단가: ₩{s.unitPrice.toLocaleString()}원 · 
                            합계: ₩{(s.totalAmount || s.quantity * s.unitPrice).toLocaleString()}원 
                            {s.paymentStatus === "paid" ? (
                              <span className="amount-positive" style={{ marginLeft: "6px" }}>[결제완료]</span>
                            ) : (
                              <span className="amount-negative" style={{ marginLeft: "6px" }}>[미수금]</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <Card padding="lg" className={styles.placeholderCard}>
              <span className={styles.placeholderIcon}>👥</span>
              <h3>조회할 고객을 선택해 주세요</h3>
              <p className="text-secondary text-sm">
                왼쪽 목록에서 고객을 클릭하면 자세한 프로필과 배송 타임라인이 표시됩니다.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
