import styles from "./dashboard-widgets.module.css";

interface GrowthIndicatorProps {
  current: number;
  previous: number;
}

export function GrowthIndicator({ current, previous }: GrowthIndicatorProps) {
  if (previous === 0 && current === 0) {
    return null;
  }

  let percent: number;
  let direction: "up" | "down" | "flat";

  if (previous === 0) {
    percent = 100;
    direction = "up";
  } else {
    percent = ((current - previous) / previous) * 100;
    if (Math.abs(percent) < 0.5) {
      direction = "flat";
    } else {
      direction = percent > 0 ? "up" : "down";
    }
    percent = Math.abs(percent);
  }

  const className =
    direction === "up"
      ? styles.growthUp
      : direction === "down"
        ? styles.growthDown
        : styles.growthFlat;

  const arrow =
    direction === "up" ? "↑" : direction === "down" ? "↓" : "→";

  return (
    <span className={`${styles.growth} ${className}`}>
      <span className={styles.growthArrow}>{arrow}</span>
      {percent.toFixed(1)}%
      <span className={styles.growthLabel}>전월 대비</span>
    </span>
  );
}
