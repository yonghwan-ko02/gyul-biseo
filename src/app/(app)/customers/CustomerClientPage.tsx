"use client";

import { useState, useEffect } from "react";
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
  // 상태 관리
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    initialCustomers.length > 0 ? initialCustomers[0].id : null
  );

  // 고대비 모드 상태
  const [isHighContrast, setIsHighContrast] = useState(false);

  // 토스트 알림 상태
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // 로컬 스토리지에서 고대비 모드 설정 복원
  useEffect(() => {
    const saved = localStorage.getItem("highContrast") === "true";
    setIsHighContrast(saved);
  }, []);

  // 고대비 토글
  const toggleHighContrast = () => {
    const newVal = !isHighContrast;
    setIsHighContrast(newVal);
    localStorage.setItem("highContrast", String(newVal));
  };

  // 토스트 알림 노출 유틸
  const showToast = (message: string, type: "success" | "info" = "success") => {
    setToast({ message, type });
    // 기존 대기 중인 타이머가 있을 경우를 위해 자동 소멸
    const timer = setTimeout(() => {
      setToast(null);
    }, 2500);
    return () => clearTimeout(timer);
  };

  // 검색 필터링 (이름 또는 별칭으로 검색)
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.nickname && c.nickname.toLowerCase().includes(q))
    );
  });

  const selectedCustomer = customers.find(
    (c) => c.id === selectedCustomerId
  );

  // 고객 정보 수정용 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editMemo, setEditMemo] = useState("");

  // 고객이 선택되거나 변경되면 수정 입력 필드 초기화
  useEffect(() => {
    if (selectedCustomer) {
      setEditName(selectedCustomer.name);
      setEditNickname(selectedCustomer.nickname || "");
      setEditPhone(selectedCustomer.phone || "");
      setEditAddress(selectedCustomer.address || "");
      setEditMemo(selectedCustomer.memo || "");
      setIsEditing(false);
    }
  }, [selectedCustomerId, selectedCustomer]);

  // 고객 정보 PATCH API 호출 저장
  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;
    if (!editName.trim()) {
      showToast("⚠️ 고객 이름은 필수 입력 항목입니다.", "info");
      return;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCustomer.id,
          name: editName.trim(),
          nickname: editNickname.trim() || null,
          phone: editPhone.trim() || null,
          address: editAddress.trim() || null,
          memo: editMemo.trim() || null,
        }),
      });

      if (res.ok) {
        // 로컬 상태 즉시 반영으로 갱신
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === selectedCustomer.id
              ? {
                  ...c,
                  name: editName.trim(),
                  nickname: editNickname.trim() || null,
                  phone: editPhone.trim() || null,
                  address: editAddress.trim() || null,
                  memo: editMemo.trim() || null,
                }
              : c
          )
        );
        setIsEditing(false);
        showToast("💾 고객 정보가 성공적으로 수정되었습니다!");
      } else {
        const err = await res.json();
        showToast(`⚠️ 수정 실패: ${err.error || "다시 시도해 주세요."}`, "info");
      }
    } catch (e) {
      console.error(e);
      showToast("⚠️ 네트워크 오류가 발생했습니다.", "info");
    }
  };

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

  // 클립보드 주소 복사
  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    showToast("📋 주소가 복사되었습니다!");
  };

  // 전체 배송 정보 문자 템플릿 복사
  const handleCopyShareTemplate = (customer: Customer) => {
    const text = `[귤비서] 배송 의뢰 내역
받는 분: ${customer.name}${customer.nickname ? ` (${customer.nickname})` : ""}
연락처: ${customer.phone || "등록 없음"}
배송지 주소: ${customer.address || "등록 없음"}
메모: ${customer.memo || "없음"}`;
    
    navigator.clipboard.writeText(text);
    showToast("✉️ 배송 정보 전체가 복사되었습니다!");
  };

  // 문자 전송 연동 (sms: 프로토콜)
  const handleSendSMS = (customer: Customer) => {
    if (!customer.phone) {
      showToast("⚠️ 연락처가 등록되지 않은 고객입니다.", "info");
      return;
    }
    const text = `[귤비서] 배송 정보 확인
받는 분: ${customer.name}
배송지: ${customer.address || "등록 없음"}`;
    
    const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
    window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
  };

  // 즉각 출하 완료 처리 API 호출
  const handleCompleteShipment = async (shipmentId: string) => {
    try {
      const res = await fetch("/api/shipments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: shipmentId, status: "shipped" }),
      });

      if (res.ok) {
        // 로컬 상태 변경으로 즉시 반응형 UI 업데이트
        setCustomers((prev) =>
          prev.map((c) => ({
            ...c,
            shipments: c.shipments.map((s) =>
              s.id === shipmentId ? { ...s, status: "shipped" } : s
            ),
          }))
        );
        showToast("🚚 성공적으로 출하 완료 처리되었습니다!");
      } else {
        showToast("⚠️ 변경 실패. 다시 시도해 주세요.", "info");
      }
    } catch (e) {
      console.error(e);
      showToast("⚠️ 네트워크 오류가 발생했습니다.", "info");
    }
  };

  return (
    <div className={`${styles.container} ${isHighContrast ? styles.highContrast : ""}`}>
      {/* 헤더 섹션 */}
      <div className={styles.header}>
        <div className={styles.headerTitleRow}>
          <h2>👥 고객 관리 (CRM)</h2>
          <button
            className={`${styles.contrastToggle} ${isHighContrast ? styles.activeContrastToggle : ""}`}
            onClick={toggleHighContrast}
            title="큰글씨 및 눈이 편한 고대비 모드를 켭니다."
          >
            {isHighContrast ? "🔆 일반 화면으로 보기" : "👓 고대비/큰글씨 켜기"}
          </button>
        </div>
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
        {/* 🎙️ 음성 검색 단추 (추후 탑재 예정 기록용) */}
        <button
          className={styles.voiceSearchButton}
          onClick={() => showToast("🎙️ 음성 검색 기능은 다음 업데이트에 추가될 예정입니다!", "info")}
          title="음성 검색 (추후 적용 예정)"
        >
          🎙️
        </button>
      </div>

      <div className={styles.layout}>
        {/* 왼쪽: 고객 목록 */}
        <div className={`${styles.sidebar} ${selectedCustomerId ? styles.sidebarHiddenOnMobile : ""}`}>
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
                            padding: "2px 8px",
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
        <div className={`${styles.detailView} ${!selectedCustomerId ? styles.detailHiddenOnMobile : ""}`}>
          {selectedCustomer ? (
            <>
              {/* 모바일 화면용 목록 이동 버튼 */}
              <button
                className={styles.backButton}
                onClick={() => setSelectedCustomerId(null)}
              >
                ⬅️ 전체 고객 목록 보기
              </button>

              {/* 프로필 카드 */}
              <Card padding="lg" className={styles.profileCard}>
                {isEditing ? (
                  <div className={styles.editFormContainer}>
                    <h3 className={styles.editFormTitle}>📝 고객 정보 수정</h3>
                    
                    <div className={styles.editFormGroup}>
                      <label className={styles.editFormLabel}>👤 이름 (필수)</label>
                      <input
                        type="text"
                        className={styles.editFormInput}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="이름을 입력하세요"
                      />
                    </div>

                    <div className={styles.editFormGroup}>
                      <label className={styles.editFormLabel}>🏷️ 별칭 (예: 마포 삼춘, 둘째이모)</label>
                      <input
                        type="text"
                        className={styles.editFormInput}
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        placeholder="거래처 구분을 위한 별칭을 입력하세요"
                      />
                    </div>

                    <div className={styles.editFormGroup}>
                      <label className={styles.editFormLabel}>📞 연락처</label>
                      <input
                        type="text"
                        className={styles.editFormInput}
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="전화번호를 입력하세요"
                      />
                    </div>

                    <div className={styles.editFormGroup}>
                      <label className={styles.editFormLabel}>📍 배송지 주소</label>
                      <textarea
                        className={`${styles.editFormInput} ${styles.editFormTextarea}`}
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="배송지 주소를 입력하세요"
                        rows={2}
                      />
                    </div>

                    <div className={styles.editFormGroup}>
                      <label className={styles.editFormLabel}>📝 메모</label>
                      <textarea
                        className={`${styles.editFormInput} ${styles.editFormTextarea}`}
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        placeholder="참고사항이나 특이사항을 적어두세요"
                        rows={2}
                      />
                    </div>

                    <div className={styles.editFormActions}>
                      <button className={styles.saveButton} onClick={handleSaveCustomer}>
                        💾 저장하기
                      </button>
                      <button className={styles.cancelButton} onClick={() => setIsEditing(false)}>
                        ❌ 취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <h3 className={styles.profileTitle}>
                          {selectedCustomer.name}
                          {selectedCustomer.nickname && ` (${selectedCustomer.nickname})`}
                        </h3>
                        <span
                          className={`${styles.typeBadge} ${selectedCustomer.type === "direct" ? styles.typeBadgeDirect : ""}`}
                        >
                          {getCustomerTypeLabel(selectedCustomer.type)}
                        </span>
                      </div>
                      <button
                        className={styles.editButton}
                        onClick={() => setIsEditing(true)}
                        title="고객 정보를 수정합니다"
                      >
                        📝 수정하기
                      </button>
                    </div>

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
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              <span className={styles.addressText}>{selectedCustomer.address}</span>
                              <div style={{ display: "flex", gap: "8px", alignSelf: "flex-end" }}>
                                <span
                                  className={styles.actionLinkButton}
                                  onClick={() => handleCopyAddress(selectedCustomer.address!)}
                                >
                                  주소 복사
                                </span>
                              </div>
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

                    {/* 원클릭 공유 액션 버튼 그룹 */}
                    <div className={styles.profileActions}>
                      <button
                        className={styles.smsButton}
                        onClick={() => handleSendSMS(selectedCustomer)}
                        disabled={!selectedCustomer.phone}
                      >
                        💬 배송 확인 문자 보내기
                      </button>
                      <button
                        className={styles.shareButton}
                        onClick={() => handleCopyShareTemplate(selectedCustomer)}
                      >
                        📋 전체 배송정보 복사
                      </button>
                    </div>
                  </>
                )}
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
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span
                              className={`${styles.timelineStatus} ${
                                s.status === "pending" ? styles.statusPending : styles.statusShipped
                              }`}
                            >
                              {s.status === "pending" ? "발송대기" : "출하완료"}
                            </span>
                            
                            {/* 발송 대기 주문일 때 간편 출하완료 처리 버튼 */}
                            {s.status === "pending" && (
                              <button
                                className={styles.shipCompleteButton}
                                onClick={() => handleCompleteShipment(s.id)}
                              >
                                🚚 발송 완료로 변경
                              </button>
                            )}
                          </div>
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

      {/* 🍊 싱그러운 감귤 테마 커스텀 토스트 알림 */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "info" ? styles.toastInfo : ""}`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
