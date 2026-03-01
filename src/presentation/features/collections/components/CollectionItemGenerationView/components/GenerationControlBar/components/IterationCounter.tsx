import type { BatchSize } from '@core/collection-item';
import styles from './IterationCounter.module.css';

interface IterationCounterProps {
  value: BatchSize;
  onChange: (value: BatchSize) => void;
}

const BATCH_OPTIONS: BatchSize[] = [1, 2, 3, 4];
const MAX_DISPLAY = 4; // Always show /4 as the maximum

/**
 * IterationCounter Component
 * Compact counter with +/- buttons for batch size
 * Shows X/4 where X is how many images to generate (max 4 shown)
 */
export function IterationCounter({ value, onChange }: IterationCounterProps) {
  const currentIndex = BATCH_OPTIONS.indexOf(value);

  const handleDecrease = () => {
    if (currentIndex > 0) {
      onChange(BATCH_OPTIONS[currentIndex - 1]);
    }
  };

  const handleIncrease = () => {
    if (currentIndex < BATCH_OPTIONS.length - 1) {
      onChange(BATCH_OPTIONS[currentIndex + 1]);
    }
  };

  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < BATCH_OPTIONS.length - 1;

  // Display actual value or cap at 4 for display (8 would show as "4/4" but actually generate 8)
  const displayValue = Math.min(value, MAX_DISPLAY);

  return (
    <div className={styles.counter}>
      <button
        className={styles.button}
        onClick={handleDecrease}
        disabled={!canDecrease}
        aria-label="Decrease"
      >
        −
      </button>
      <span className={styles.display}>
        <span className={styles.current}>{displayValue}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.total}>{MAX_DISPLAY}</span>
      </span>
      <button
        className={styles.button}
        onClick={handleIncrease}
        disabled={!canIncrease}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}
