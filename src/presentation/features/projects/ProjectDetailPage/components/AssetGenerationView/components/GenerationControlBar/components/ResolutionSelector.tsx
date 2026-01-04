import { useState, useRef, useEffect } from 'react';
import type { Resolution } from '@core/asset';
import styles from './ResolutionSelector.module.css';

interface ResolutionSelectorProps {
  selected: Resolution;
  onSelect: (resolution: Resolution) => void;
}

const RESOLUTIONS: Array<{ value: Resolution; label: string; desc: string }> = [
  { value: '2k', label: '2K', desc: 'Standard (2048×1080)' },
  { value: '4k', label: '4K', desc: 'High Quality (4096×2160)' },
  { value: '8k', label: '8K', desc: 'Ultra Quality (8192×4320)' },
];

/**
 * ResolutionSelector Component
 * Compact resolution selector with badge style
 */
export function ResolutionSelector({ selected, onSelect }: ResolutionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (resolution: Resolution) => {
    onSelect(resolution);
    setIsOpen(false);
  };

  const selectedRes = RESOLUTIONS.find((r) => r.value === selected) || RESOLUTIONS[0];

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.label}>{selectedRes.label}</span>
      </button>

      {isOpen && (
        <div className={styles.menu}>
          {RESOLUTIONS.map((res) => (
            <button
              key={res.value}
              className={`${styles.item} ${selected === res.value ? styles.itemActive : ''}`}
              onClick={() => handleSelect(res.value)}
            >
              <span className={styles.itemLabel}>{res.label}</span>
              <span className={styles.itemDesc}>{res.desc}</span>
              {selected === res.value && <span className={styles.checkmark}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
