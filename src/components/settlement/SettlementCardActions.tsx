"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import styles from "./SettlementCardActions.module.css";

interface Props {
  customerName: string;
  amount: number;
  bankInfo: string;
}

export function SettlementCardActions({ customerName, amount, bankInfo }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCopy = () => {
    const text = `${customerName}님, 감귤농장입니다.\n미수금 ${amount.toLocaleString()}원 입금 부탁드립니다.\n\n입금 계좌: ${bankInfo}`;
    navigator.clipboard.writeText(text).then(() => {
      alert("청구 메시지가 복사되었습니다.\n카카오톡 대화창에 '붙여넣기' 하세요!");
    }).catch(() => {
      alert("복사에 실패했습니다.");
    });
  };

  const handleCompleteSettlement = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "정산 처리 중 오류가 발생했습니다.");
      }

      setIsSuccess(true);
      
      // Next.js App Router 서버 컴포넌트 데이터 갱신
      router.refresh();

      // 1.5초 후 모달 닫기 및 상태 리셋
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "정산 처리 중 오류가 발생했습니다.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={styles.actionsContainer}>
        <Button
          onClick={handleCopy}
          variant="outline"
          className={styles.copyButton}
          size="md"
        >
          카톡 요청 💬
        </Button>
        <Button
          onClick={() => setIsOpen(true)}
          variant="primary"
          className={styles.payButton}
          size="md"
        >
          입금 완료 💸
        </Button>
      </div>

      {isOpen && (
        <div className={styles.modalOverlay} onClick={() => !isLoading && !isSuccess && setIsOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {isSuccess ? (
              <div className={styles.successContainer}>
                <div className={styles.checkmarkWrapper}>
                  <span className={styles.checkmark}>✓</span>
                </div>
                <h3 className={styles.successText}>정산 완료!</h3>
                <p className={styles.successSubtext}>{customerName}님의 미수금이 완납 처리되었습니다.</p>
              </div>
            ) : (
              <>
                <span className={styles.modalIcon}>🍊</span>
                <h3 className={styles.modalTitle}>입금 완료 확인</h3>
                
                <p className={styles.modalDesc}>
                  <span className={styles.customerName}>{customerName}</span> 삼춘에게 아래 금액을 입금 받으셨나요?
                </p>

                <div className={styles.amountBox}>
                  <span className={styles.amountLabel}>정산 예정 금액</span>
                  <span className={styles.amountValue}>₩{amount.toLocaleString()}</span>
                </div>

                {errorMessage && (
                  <p className="text-danger text-sm" style={{ marginBottom: "var(--space-md)" }}>
                    ⚠️ {errorMessage}
                  </p>
                )}

                <div className={styles.modalButtons}>
                  <Button
                    onClick={handleCompleteSettlement}
                    variant="secondary"
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    네, 입금 확인되었습니다!
                  </Button>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    disabled={isLoading}
                  >
                    취소
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
