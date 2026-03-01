import {
  useState,
  useRef,
  useEffect,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import styles from './Dropdown.module.css';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  direction?: 'up' | 'down';
  menuClassName?: string;
}

/**
 * Dropdown Component
 * Reusable dropdown menu with click-outside-to-close functionality
 */
export function Dropdown({ trigger, children, direction = 'down', menuClassName }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMenuClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-dropdown-item="true"]')) {
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <div onClick={handleToggle}>{trigger}</div>
      {isOpen && (
        <div
          className={`${styles.menu} ${direction === 'up' ? styles.menuUp : ''} ${menuClassName || ''}`}
          onClick={handleMenuClick}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * DropdownItem Component
 * Individual menu item within a dropdown
 */
export function DropdownItem({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
  className,
}: DropdownItemProps) {
  const handleClick = () => {
    if (disabled) return;
    onClick();
  };

  return (
    <button
      type="button"
      className={`${styles.item} ${danger ? styles.itemDanger : ''} ${className || ''}`}
      onClick={handleClick}
      data-dropdown-item="true"
      disabled={disabled}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{label}</span>
    </button>
  );
}
