import type { ReactNode } from 'react';
import styles from './Badge.module.css';

type BadgeVariant = 'draft' | 'in-progress' | 'completed';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

/**
 * Badge Component
 * Status indicator with color variants
 */
export function Badge({ variant, children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>;
}
