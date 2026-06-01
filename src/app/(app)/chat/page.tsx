"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./chat.module.css";
import { useChat } from "@/hooks/useChat";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import ConfirmationCard from "@/components/chat/ConfirmationCard";
import { Card, CardHeader } from "@/components/ui/Card";

export default function ChatPage() {
  const { messages, sendMessage, isLoading } = useChat();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 실시간 농가 현황 통계 상태
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const { isRecording, toggleRecording } = useVoiceInput((text) => {
    sendMessage(text);
  });

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (e) {
      console.error("Failed to fetch real-time stats:", e);
    } finally {
      setStatsLoading(false);
    }
  };

  // 마운트 시 통계 불러오기 및 장부 등록 완료 이벤트 리스너 추가
  useEffect(() => {
    fetchStats();

    const handleRefresh = () => {
      fetchStats();
    };

    window.addEventListener("shipment-registered", handleRefresh);
    return () => {
      window.removeEventListener("shipment-registered", handleRefresh);
    };
  }, []);

  // 메시지 전송/수신 완료(AI 답변 대기 끝) 시 통계 실시간 리프레시
  useEffect(() => {
    if (!isLoading) {
      fetchStats();
    }
  }, [isLoading]);

  // 새 메시지가 오면 맨 아래로 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText("");
  };

  return (
    <div className={styles.container}>
      {/* 좌측 컬럼: 메인 채팅 영역 */}
      <div className={styles.chatArea}>
        {/* 메시지 영역 */}
        <div className={styles.messages}>
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <span className={styles.welcomeIcon}>🍊</span>
              <h2>안녕하세요! 귤비서입니다</h2>
              <p>
                음성이나 텍스트로 출하 기록, 정산, 영농일지를 편하게 말씀해 주세요.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageWrapper} ${msg.role === "user" ? styles.userWrapper : styles.assistantWrapper}`}
              >
                <div className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.assistantBubble}`}>
                  <div>{msg.content}</div>
                  {msg.pendingAction && (
                    <ConfirmationCard
                      action={msg.pendingAction.action}
                      data={msg.pendingAction.data}
                    />
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className={`${styles.messageWrapper} ${styles.assistantWrapper}`}>
              <div className={`${styles.bubble} ${styles.assistantBubble} ${styles.loadingBubble}`}>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className={styles.inputArea}>
          <form onSubmit={handleSubmit} className={styles.inputRow}>
            <input
              type="text"
              className={styles.textInput}
              placeholder={isRecording ? "음성을 듣고 있습니다..." : "여기에 입력하거나 🎤 버튼을 누르세요"}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading || isRecording}
            />
            <button 
              type="submit" 
              className={styles.sendButton} 
              disabled={!inputText.trim() || isLoading || isRecording}
              aria-label="전송"
            >
              ➤
            </button>
          </form>
          <button 
            className={`${styles.micButton} ${isRecording ? styles.recording : ""}`} 
            onClick={toggleRecording}
            disabled={isLoading}
            aria-label={isRecording ? "녹음 중지" : "음성 입력 시작"}
          >
            {isRecording ? "⏹️" : "🎤"}
          </button>
        </div>
      </div>

      {/* 우측 컬럼: 데스크톱 전용 실시간 현황 패널 */}
      <div className={styles.sideBoard}>
        <h2 className={styles.sideBoardTitle}>실시간 농가 현황</h2>
        
        {/* 발송 대기 주문 알림 위젯 */}
        {stats && stats.pendingOrderCount > 0 && (
          <div className="animate-slide-up">
            <Card variant="warning" padding="md" className={styles.sideCard}>
              <CardHeader title="발송대기 주문" icon="📦" />
              <p className={styles.statValue} style={{ color: "var(--color-warning)" }}>
                {stats.pendingOrderCount} 건
              </p>
              <p className="text-secondary text-sm" style={{ marginTop: "4px" }}>
                아직 출하되지 않은 예약 주문 건이 있습니다. 포장 후 발송 상태로 업데이트해 주세요.
              </p>
            </Card>
          </div>
        )}

        {/* 오늘 출하량 */}
        <Card variant="default" padding="md" className={styles.sideCard}>
          <CardHeader title="오늘 출하량" icon="🚚" />
          <p className={`${styles.statValue} amount`}>
            {statsLoading ? "..." : `${stats?.todayBoxCount || 0} 박스`}
          </p>
          <p className="text-secondary text-sm" style={{ marginTop: "4px" }}>오늘 농장에서 내보낸 박스 수량입니다.</p>
        </Card>

        {/* 미수금 총액 */}
        <Card variant="danger" padding="md" className={styles.sideCard}>
          <CardHeader title="미수금 총액" icon="💸" />
          <p className={`${styles.statValue} amount amount-negative`}>
            {statsLoading ? "..." : `₩${(stats?.totalUnpaid || 0).toLocaleString()}`}
          </p>
          <p className="text-secondary text-sm" style={{ marginTop: "4px" }}>거래처로부터 입금받아야 할 미수 대금입니다.</p>
        </Card>

        {/* 이번 달 예상 매출 */}
        <Card variant="success" padding="md" className={styles.sideCard}>
          <CardHeader title="이번 달 예상 매출" icon="💰" />
          <p className={`${styles.statValue} amount`}>
            {statsLoading ? "..." : `₩${(stats?.monthRevenue || 0).toLocaleString()}`}
          </p>
          <p className="text-secondary text-sm" style={{ marginTop: "4px" }}>이번 달에 거래 및 출하된 전체 매출액입니다.</p>
        </Card>
      </div>
    </div>
  );
}
