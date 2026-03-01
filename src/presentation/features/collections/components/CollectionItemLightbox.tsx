import { useEffect } from 'react';
import type { CollectionItem } from '@core/collection-item';
import styles from './CollectionItemLightbox.module.css';

interface CollectionItemLightboxProps {
  item: CollectionItem | null;
  onClose: () => void;
}

export function CollectionItemLightbox({ item, onClose }: CollectionItemLightboxProps) {
  useEffect(() => {
    if (!item) return;

    // Handle ESC key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [item, onClose]);

  if (!item) return null;

  const handleBackdropClick = () => {
    onClose();
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent backdrop click when clicking content
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <button className={styles.closeButton} onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className={styles.contentCard} onClick={handleContentClick}>
        <div className={styles.mediaContainer}>
          {item.mediaType === 'image' ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={item.url} alt={item.name} className={styles.media} />
          ) : (
            <video src={item.url} controls autoPlay className={styles.media}>
              Your browser does not support video playback.
            </video>
          )}
        </div>

        <div className={styles.details}>
          <h3 className={styles.title}>{item.name}</h3>
          <p className={styles.description}>{item.description}</p>
          <div className={styles.metadata}>
            <span className={styles.metadataItem}>
              {item.metadata.width} x {item.metadata.height}px
            </span>
            {item.mediaType === 'video' && 'duration' in item.metadata && (
              <span className={styles.metadataItem}>Duration: {item.metadata.duration}s</span>
            )}
            <span className={styles.metadataItem}>
              Format: {item.metadata.format.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
