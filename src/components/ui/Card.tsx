import { type ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  padding?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export function Card({
  children,
  variant = "default",
  padding = "md",
  className = "",
  onClick,
}: CardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={`${styles.card} ${styles[variant]} ${styles[`pad-${padding}`]} ${onClick ? styles.clickable : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, icon, action }: CardHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <div>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
