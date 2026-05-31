import Link from "next/link";
import styles from "./dashboard-widgets.module.css";

interface PendingOrderBannerProps {
  count: number;
}

export function PendingOrderBanner({ count }: PendingOrderBannerProps) {
  if (count === 0) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.bannerContent}>
        <span className={styles.bannerIcon}>📋</span>
        <p className={styles.bannerText}>
          발송 대기 중인 주문이 <span className={styles.bannerCount}>{count}건</span> 있습니다
        </p>
      </div>
      <Link href="/ledger" className={styles.bannerLink}>
        확인하기 →
      </Link>
    </div>
  );
}
