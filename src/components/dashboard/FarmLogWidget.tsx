import styles from "./dashboard-widgets.module.css";

interface FarmLogEntry {
  id: string;
  logDate: string;
  category: string;
  description: string;
}

interface FarmLogWidgetProps {
  logs: FarmLogEntry[];
  daysSinceLastLog: number | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  spray: "🧪",
  prune: "✂️",
  harvest: "🍊",
  other: "📝",
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}달 전`;
}

export function FarmLogWidget({ logs, daysSinceLastLog }: FarmLogWidgetProps) {
  // 5일 이상 기록 없으면 경고
  const showWarning = daysSinceLastLog !== null && daysSinceLastLog >= 5;

  if (logs.length === 0) {
    return (
      <div className={styles.farmLogEmpty}>
        <p>아직 기록된 영농일지가 없습니다.</p>
        <p>채팅에서 &quot;오늘 약쳤어&quot; 같이 말씀해보세요!</p>
      </div>
    );
  }

  return (
    <div className={styles.farmLogList}>
      {showWarning && (
        <div className={styles.farmLogWarning}>
          <span className={styles.farmLogWarningIcon}>🌱</span>
          <p className={styles.farmLogWarningText}>
            영농일지를 {daysSinceLastLog}일째 안 쓰셨어요. 오늘 작업 기록해보세요!
          </p>
        </div>
      )}
      {logs.map((log) => (
        <div key={log.id} className={styles.farmLogItem}>
          <div className={styles.farmLogIcon}>
            {CATEGORY_ICONS[log.category] || "📝"}
          </div>
          <div className={styles.farmLogContent}>
            <p className={styles.farmLogDesc}>{log.description}</p>
            <p className={styles.farmLogDate}>
              {formatRelativeDate(log.logDate)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
