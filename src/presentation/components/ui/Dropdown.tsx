import {
  useState,
  useRef,
  useEffect,
  useId,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import styles from './Dropdown.module.css';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  direction?: 'up' | 'down';
  menuClassName?: string;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  disabled?: boolean;
}

/**
 * Dropdown Component
 * Reusable dropdown menu with click-outside-to-close functionality
 */
export function Dropdown({
  trigger,
  children,
  direction = 'down',
  menuClassName,
  triggerClassName,
  triggerAriaLabel,
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const menuOpen = isOpen && !disabled;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const handleToggle = () => {
    if (disabled) {
      return;
    }

    setIsOpen((prev) => !prev);
  };

  const handleMenuClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-dropdown-item="true"]')) {
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.trigger} ${triggerClassName || ''}`}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        aria-label={triggerAriaLabel}
        disabled={disabled}
      >
        {trigger}
      </button>
      {menuOpen && (
        <div
          id={menuId}
          className={`${styles.menu} ${direction === 'up' ? styles.menuUp : ''} ${menuClassName || ''}`}
          onClick={handleMenuClick}
          role="menu"
          aria-orientation="vertical"
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
      role="menuitem"
    >
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.label}>{label}</span>
    </button>
  );
}
