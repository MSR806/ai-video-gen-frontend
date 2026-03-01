import type { CollectionItem } from '@core/collection-item';
import styles from './CollectionItemCard.module.css';

interface CollectionItemCardProps {
  item: CollectionItem;
  onClick: (item: CollectionItem) => void;
}

export function CollectionItemCard({ item, onClick }: CollectionItemCardProps) {
  const handleClick = () => {
    onClick(item);
  };

  // Helper function to format duration (seconds to mm:ss)
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.thumbnailContainer}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.metadata.thumbnailUrl}
          alt={item.name}
          className={styles.thumbnail}
          loading="lazy"
        />
        <div className={styles.overlay}>
          <div className={styles.mediaTypeBadge}>
            {item.mediaType === 'image' ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            )}
          </div>
          {item.mediaType === 'video' && 'duration' in item.metadata && (
            <div className={styles.durationBadge}>{formatDuration(item.metadata.duration)}</div>
          )}
        </div>
      </div>
      <div className={styles.info}>
        <h4 className={styles.name}>{item.name}</h4>
      </div>
    </div>
  );
}
