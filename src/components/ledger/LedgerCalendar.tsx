"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  subMonths,
  addMonths,
  isSameDay,
  isToday,
  startOfDay,
  parseISO
} from "date-fns";
import { ko } from "date-fns/locale";
import styles from "./LedgerCalendar.module.css";

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
  shipments: Shipment[];
  onEditClick: (shipment: Shipment) => void;
}

export default function LedgerCalendar({ shipments, onEditClick }: Props) {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

  // 1. 달력 날짜 계산
  const startMonth = startOfMonth(currentMonthDate);
  const endMonth = endOfMonth(currentMonthDate);
  
  // 이번 달의 모든 일
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: startMonth, end: endMonth });
  }, [startMonth, endMonth]);

  // 시작일의 요일 (0: 일요일, 6: 토요일)
  const startDayOfWeek = getDay(startMonth);

  // 이전 달의 패딩 날짜 계산
  const prevMonthPadding = useMemo(() => {
    const prevMonth = subMonths(currentMonthDate, 1);
    const prevMonthEnd = endOfMonth(prevMonth);
    const padding = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(prevMonthEnd);
      d.setDate(prevMonthEnd.getDate() - i);
      padding.push(d);
    }
    return padding;
  }, [currentMonthDate, startDayOfWeek]);

  // 다음 달의 패딩 날짜 계산 (전체 42칸 맞추기)
  const nextMonthPadding = useMemo(() => {
    const totalCells = 42;
    const currentCellsCount = prevMonthPadding.length + daysInMonth.length;
    const paddingCount = totalCells - currentCellsCount;
    const nextMonth = addMonths(currentMonthDate, 1);
    const padding = [];
    for (let i = 1; i <= paddingCount; i++) {
      const d = new Date(nextMonth);
      d.setDate(i);
      padding.push(d);
    }
    return padding;
  }, [currentMonthDate, prevMonthPadding, daysInMonth]);

  // 2. 일별 출하 내역 매핑
  const getShipmentsForDay = (date: Date) => {
    return shipments.filter((s) => {
      const sDate = startOfDay(new Date(s.createdAt));
      return isSameDay(sDate, date);
    });
  };

  // 3. 네비게이션
  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => addMonths(prev, 1));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(startOfDay(date));
  };

  // 선택된 날의 출하 내역
  const selectedDayShipments = useMemo(() => {
    return getShipmentsForDay(selectedDate);
  }, [selectedDate, shipments]);

  const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className={styles.calendarContainer}>
      {/* 캘린더 헤더 */}
      <div className={styles.header}>
        <h3 className={styles.monthTitle}>
          {format(currentMonthDate, "yyyy년 M월")}
        </h3>
        <div className={styles.navGroup}>
          <button type="button" className={styles.navBtn} onClick={handlePrevMonth}>
            ◀
          </button>
          <button type="button" className={styles.navBtn} onClick={() => {
            setCurrentMonthDate(new Date());
            setSelectedDate(startOfDay(new Date()));
          }}>
            오늘
          </button>
          <button type="button" className={styles.navBtn} onClick={handleNextMonth}>
            ▶
          </button>
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div className={styles.grid}>
        {/* 요일 헤더 */}
        {daysOfWeek.map((day) => (
          <div key={day} className={styles.dayName}>
            {day}
          </div>
        ))}

        {/* 이전 달 패딩 */}
        {prevMonthPadding.map((date, idx) => (
          <div key={`prev-${idx}`} className={`${styles.dayCell} ${styles.dayCellOtherMonth}`}>
            <span className={styles.dayNum}>{date.getDate()}</span>
          </div>
        ))}

        {/* 이번 달 일자들 */}
        {daysInMonth.map((date) => {
          const dayShipments = getShipmentsForDay(date);
          const hasUnpaid = dayShipments.some((s) => s.paymentStatus !== "paid");
          const hasPending = dayShipments.some((s) => s.status === "pending");
          const hasAny = dayShipments.length > 0;

          const isSelected = isSameDay(date, selectedDate);
          const isCurrToday = isToday(date);

          return (
            <div
              key={date.toISOString()}
              className={`${styles.dayCell} ${isSelected ? styles.dayCellSelected : ""} ${
                isCurrToday ? styles.dayCellToday : ""
              }`}
              onClick={() => handleDayClick(date)}
            >
              <span className={styles.dayNum}>{date.getDate()}</span>
              
              {/* 출하 상태 마커 도트 */}
              {hasAny && (
                <div className={styles.markers}>
                  {hasPending && <span className={`${styles.dot} ${styles.dotPending}`} />}
                  {hasUnpaid && <span className={`${styles.dot} ${styles.dotUnpaid}`} />}
                  {!hasUnpaid && !hasPending && <span className={`${styles.dot} ${styles.dotShipped}`} />}
                </div>
              )}
            </div>
          );
        })}

        {/* 다음 달 패딩 */}
        {nextMonthPadding.map((date, idx) => (
          <div key={`next-${idx}`} className={`${styles.dayCell} ${styles.dayCellOtherMonth}`}>
            <span className={styles.dayNum}>{date.getDate()}</span>
          </div>
        ))}
      </div>

      {/* 선택된 날의 세부 리스트 */}
      <div className={styles.detailsContainer}>
        <div className={styles.detailsHeader}>
          <h4 className={styles.detailsTitle}>
            📅 {format(selectedDate, "M월 d일 (EEEE)", { locale: ko })} 거래 기록
          </h4>
          <span className={styles.detailsCount}>{selectedDayShipments.length}건</span>
        </div>

        {selectedDayShipments.length === 0 ? (
          <div className={styles.emptyDetails}>이 날짜에 등록된 출하 및 주문 내역이 없습니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {selectedDayShipments.map((tx) => (
              <div key={tx.id} className={styles.dayCard}>
                <div className={styles.cardHeader}>
                  <h5 className={styles.custName}>
                    {tx.customer.name}
                    <span
                      className={`${styles.badge} ${
                        tx.status === "pending" ? styles.badgePending : styles.badgeShipped
                      }`}
                    >
                      {tx.status === "pending" ? "발송대기" : "출하완료"}
                    </span>
                  </h5>
                  <span
                    className={`${styles.badge} ${
                      tx.paymentStatus === "paid" ? styles.badgePaid : styles.badgeUnpaid
                    }`}
                  >
                    {tx.paymentStatus === "paid" ? "완납" : tx.paymentStatus === "partial" ? "일부수금" : "미수금"}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.infoLine}>
                    <span className={styles.infoLabel}>품종 / 수량</span>
                    <span className={styles.infoVal}>
                      {tx.variety} · {tx.quantity} {tx.memo?.replace("단위: ", "") || "박스"}
                    </span>
                  </div>
                  {tx.unitPrice && (
                    <div className={styles.infoLine}>
                      <span className={styles.infoLabel}>단가 / 총액</span>
                      <span className={styles.infoVal}>
                        ₩{(tx.unitPrice).toLocaleString()} / ₩{(tx.totalAmount || (tx.quantity * tx.unitPrice)).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {tx.customer.phone && (
                    <div className={styles.infoLine}>
                      <span className={styles.infoLabel}>연락처</span>
                      <span className={styles.infoVal}>{tx.customer.phone}</span>
                    </div>
                  )}
                  {tx.customer.address && (
                    <div className={styles.infoLine}>
                      <span className={styles.infoLabel}>주소</span>
                      <span className={styles.infoVal}>{tx.customer.address}</span>
                    </div>
                  )}
                </div>

                <div className={styles.actionRow}>
                  <button type="button" className={styles.editBtn} onClick={() => onEditClick(tx)}>
                    ✏️ 내역 수정
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
