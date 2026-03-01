import { useState, type CSSProperties } from 'react';
import type { CollectionItem } from '@core/collection-item';
import { Dropdown, DropdownItem } from '@presentation/components/ui';
import styles from './CollectionItemCard.module.css';

interface CollectionItemCardProps {
  item: CollectionItem;
  onClick: (item: CollectionItem) => void;
  onCopy: (item: CollectionItem) => void | Promise<void>;
  onDownload: (item: CollectionItem) => void;
  onDelete?: (item: CollectionItem) => void;
  isDeleting?: boolean;
}

export function CollectionItemCard({
  item,
  onClick,
  onCopy,
  onDownload,
  onDelete,
  isDeleting = false,
}: CollectionItemCardProps) {
  const handleClick = () => {
    onClick(item);
  };

  const defaultAspectRatio =
    item.metadata.width > 0 && item.metadata.height > 0
      ? item.metadata.width / item.metadata.height
      : 9 / 16;
  const [cardAspectRatio, setCardAspectRatio] = useState(defaultAspectRatio);
  const cardStyle = {
    '--card-aspect-ratio': cardAspectRatio,
  } as CSSProperties;

  const updateAspectRatio = (width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    const resolvedAspectRatio = width / height;
    if (Math.abs(resolvedAspectRatio - cardAspectRatio) > 0.01) {
      setCardAspectRatio(resolvedAspectRatio);
    }
  };

  // Helper function to format duration (seconds to mm:ss)
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const thumbnailUrl = item.metadata.thumbnailUrl?.trim() ?? '';
  const mediaKey = `${item.id}:${thumbnailUrl}`;
  const descriptionLabel = item.description.trim() || item.name;
  const canCopyImage = item.mediaType === 'image';

  const [failedThumbnailKey, setFailedThumbnailKey] = useState<string | null>(null);

  const renderMedia = () => {
    const thumbnailFailed = failedThumbnailKey === mediaKey;
    if (!thumbnailFailed) {
      const imageSource =
        thumbnailUrl.length > 0 ? thumbnailUrl : item.mediaType === 'image' ? item.url : '';
      if (imageSource.length === 0) {
        return (
          <div className={styles.thumbnailFallback}>
            <p className={styles.fallbackLabel}>{item.name}</p>
          </div>
        );
      }

      return (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSource}
            alt={item.name}
            className={styles.thumbnail}
            loading="lazy"
            onLoad={(event) =>
              updateAspectRatio(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
            }
            onError={() => setFailedThumbnailKey(mediaKey)}
          />
        </>
      );
    }

    return (
      <div className={styles.thumbnailFallback}>
        <p className={styles.fallbackLabel}>{item.name}</p>
      </div>
    );
  };

  return (
    <div className={styles.cardShell}>
      <button
        type="button"
        className={styles.card}
        onClick={handleClick}
        aria-label={item.name}
        style={cardStyle}
        disabled={isDeleting}
      >
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

            <div className={styles.descriptionChip}>
              <span className={styles.descriptionIcon} aria-hidden="true">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </span>
              <span className={styles.descriptionText}>{descriptionLabel}</span>
            </div>

            {item.mediaType === 'video' && 'duration' in item.metadata ? (
              <div className={styles.durationBadge}>{formatDuration(item.metadata.duration)}</div>
            ) : (
              <div className={styles.durationSpacer} />
            )}
          </div>
        </div>
      </button>

      <div className={styles.menuContainer}>
        <Dropdown
          menuClassName={styles.actionMenu}
          trigger={
            <button
              type="button"
              className={styles.menuButton}
              disabled={isDeleting}
              aria-label={isDeleting ? `Updating ${item.name}` : `Open menu for ${item.name}`}
            >
              ⋮
            </button>
          }
        >
          <DropdownItem
            icon={<span className={styles.menuGlyph}>⧉</span>}
            label="Copy"
            className={styles.actionItem}
            onClick={() => {
              if (!canCopyImage) {
                return;
              }
              void onCopy(item);
            }}
            disabled={isDeleting || !canCopyImage}
          />
          <DropdownItem
            icon={<span className={styles.menuGlyph}>↓</span>}
            label="Download"
            className={styles.actionItem}
            onClick={() => onDownload(item)}
            disabled={isDeleting}
          />
          {onDelete && (
            <>
              <div className={styles.menuDivider} />
              <DropdownItem
                icon={<span className={styles.menuGlyph}>⌫</span>}
                label={isDeleting ? 'Deleting...' : 'Delete'}
                className={styles.actionItem}
                danger
                onClick={() => {
                  if (!isDeleting) {
                    onDelete(item);
                  }
                }}
                disabled={isDeleting}
              />
            </>
          )}
        </Dropdown>
      </div>
    </div>
  );
}
