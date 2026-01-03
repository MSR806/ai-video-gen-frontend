import type { ReactNode, MouseEvent } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

/**
 * Card Component
 * Reusable container with elevation and glassmorphism
 */
export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div className={`${styles.card} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
