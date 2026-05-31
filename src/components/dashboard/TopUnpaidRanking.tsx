import styles from "./dashboard-widgets.module.css";

interface UnpaidCustomer {
  customerName: string;
  totalUnpaid: number;
  count: number;
}

interface TopUnpaidRankingProps {
  data: UnpaidCustomer[];
  totalUnpaid: number;
}

export function TopUnpaidRanking({ data, totalUnpaid }: TopUnpaidRankingProps) {
  if (data.length === 0) {
    return (
      <div className={styles.rankingEmpty}>
        <span className={styles.rankingEmptyIcon}>🎉</span>
        <p>미수금 거래처가 없습니다!</p>
      </div>
    );
  }

  const maxAmount = data[0]?.totalUnpaid || 1;

  return (
    <div className={styles.rankingList}>
      {data.map((item, idx) => {
        const rankClass =
          idx === 0
            ? styles.rankingRank1
            : idx === 1
              ? styles.rankingRank2
              : idx === 2
                ? styles.rankingRank3
                : styles.rankingRankOther;

        const barWidth = (item.totalUnpaid / maxAmount) * 100;
        const share = totalUnpaid > 0 ? ((item.totalUnpaid / totalUnpaid) * 100).toFixed(0) : "0";

        return (
          <div key={item.customerName} className={styles.rankingItem}>
            <span className={`${styles.rankingRank} ${rankClass}`}>
              {idx + 1}
            </span>
            <div className={styles.rankingInfo}>
              <p className={styles.rankingName}>{item.customerName}</p>
              <p className={styles.rankingMeta}>{item.count}건 · 전체의 {share}%</p>
              <div className={styles.rankingBarWrap}>
                <div
                  className={styles.rankingBar}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
            <span className={styles.rankingAmount}>
              ₩{item.totalUnpaid.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
