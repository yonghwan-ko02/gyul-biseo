"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./chat.module.css";
import { useChat } from "@/hooks/useChat";
import { useVoiceInput } from "@/hooks/useVoiceInput";

export default function ChatPage() {
  const { messages, sendMessage, isLoading } = useChat();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isRecording, toggleRecording } = useVoiceInput((text) => {
    sendMessage(text);
  });

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
                {msg.content}
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
  );
}
