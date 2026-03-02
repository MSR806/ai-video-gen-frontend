import { useEffect, useState } from 'react';
import type { CollectionItem } from '@core/collection-item';
import styles from './CollectionItemLightbox.module.css';

interface CollectionItemLightboxProps {
  item: CollectionItem | null;
  onClose: () => void;
}

export function CollectionItemLightbox({ item, onClose }: CollectionItemLightboxProps) {
  const [failedSelectionPreviewKey, setFailedSelectionPreviewKey] = useState<string | null>(null);

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
  const mediaUrl = item.url?.trim() ?? '';
  const thumbnailUrl = item.metadata.thumbnailUrl?.trim() ?? '';
  const previewKey = `${item.id}:${thumbnailUrl}:${mediaUrl}`;
  const selectionPreviewFailed = failedSelectionPreviewKey === previewKey;
  const hasUsableVideoThumbnail =
    item.mediaType === 'video' && thumbnailUrl.length > 0 && thumbnailUrl !== mediaUrl;
  const imageSelectionSrc = thumbnailUrl.length > 0 ? thumbnailUrl : mediaUrl;
  const canRenderMedia = mediaUrl.length > 0 && item.status === 'READY';

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <button className={styles.closeButton} onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className={styles.viewer} onClick={handleContentClick}>
        <div className={styles.mediaStage}>
          {!canRenderMedia ? (
            <div className={styles.selectionThumbFallback}>Media is still processing...</div>
          ) : item.mediaType === 'image' ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={mediaUrl} alt={item.name} className={styles.media} />
          ) : (
            <video src={mediaUrl} controls autoPlay className={styles.media}>
              Your browser does not support video playback.
            </video>
          )}
        </div>

        <aside className={styles.selectionDock}>
          <div className={styles.selectionThumbFrame}>
            {item.mediaType === 'video' ? (
              hasUsableVideoThumbnail ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailUrl} alt={item.name} className={styles.selectionThumb} />
                </>
              ) : !canRenderMedia || selectionPreviewFailed ? (
                <div className={styles.selectionThumbFallback}>{item.name}</div>
              ) : (
                <video
                  src={mediaUrl}
                  className={styles.selectionThumb}
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="metadata"
                  onError={() => setFailedSelectionPreviewKey(previewKey)}
                />
              )
            ) : imageSelectionSrc.length > 0 ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSelectionSrc} alt={item.name} className={styles.selectionThumb} />
              </>
            ) : (
              <div className={styles.selectionThumbFallback}>{item.name}</div>
            )}
          </div>
          <p className={styles.selectionText}>{previewText}</p>
        </aside>
      </div>
    </div>
  );
}
