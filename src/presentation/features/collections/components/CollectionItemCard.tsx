import { useState } from 'react';
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

  const thumbnailUrl = item.metadata.thumbnailUrl?.trim();
  const hasThumbnail = Boolean(thumbnailUrl);
  const mediaKey = `${item.id}:${thumbnailUrl ?? ''}:${item.url}`;
  const [failedMediaKey, setFailedMediaKey] = useState<string | null>(null);
  const mediaUnavailable = failedMediaKey === mediaKey;

  const renderMedia = () => {
    if (mediaUnavailable) {
      return (
        <div className={styles.thumbnailFallback}>
          <p className={styles.fallbackLabel}>{item.name}</p>
        </div>
      );
    }

    if (item.mediaType === 'video' && !hasThumbnail) {
      return (
        <video
          src={item.url}
          className={styles.thumbnail}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          onError={() => setFailedMediaKey(mediaKey)}
        />
      );
    }

    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hasThumbnail ? thumbnailUrl : item.url}
          alt={item.name}
          className={styles.thumbnail}
          loading="lazy"
          onError={() => setFailedMediaKey(mediaKey)}
        />
      </>
    );
  };

  return (
    <button type="button" className={styles.card} onClick={handleClick} aria-label={item.name}>
      <div className={styles.thumbnailContainer}>
        {renderMedia()}
        <div className={styles.overlay}>
          {item.mediaType === 'video' && (
            <div className={styles.mediaTypeBadge}>
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
            </div>
          )}

          {item.mediaType === 'video' && 'duration' in item.metadata ? (
            <div className={styles.durationBadge}>{formatDuration(item.metadata.duration)}</div>
          ) : (
            <div className={styles.durationSpacer} />
          )}
        </div>
      </div>
    </button>
  );
}
