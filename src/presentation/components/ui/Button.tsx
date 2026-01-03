import type { ReactNode, MouseEvent } from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface ButtonProps {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  variant?: ButtonVariant;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Button Component
 * Primary action button with variants
 */
export function Button({ children, onClick, variant = 'primary', type = 'button' }: ButtonProps) {
  return (
    <button type={type} className={`${styles.button} ${styles[variant]}`} onClick={onClick}>
      {children}
    </button>
  );
}
