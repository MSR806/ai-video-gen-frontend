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

  const previewText = item.description?.trim() || item.name;
  const thumbnailUrl = item.metadata.thumbnailUrl || item.url;

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <button className={styles.closeButton} onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className={styles.viewer} onClick={handleContentClick}>
        <div className={styles.mediaStage}>
          {item.mediaType === 'image' ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={item.url} alt={item.name} className={styles.media} />
          ) : (
            <video src={item.url} controls autoPlay className={styles.media}>
              Your browser does not support video playback.
            </video>
          )}
        </div>

        <aside className={styles.selectionDock}>
          <div className={styles.selectionThumbFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnailUrl} alt={item.name} className={styles.selectionThumb} />
          </div>
          <p className={styles.selectionText}>{previewText}</p>
        </aside>
      </div>
    </div>
  );
}
