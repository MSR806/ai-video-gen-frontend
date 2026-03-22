import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { CollectionItem } from '@core/collection-item';
import styles from './CollectionItemLightbox.module.css';

interface CollectionItemLightboxProps {
  item: CollectionItem | null;
  onClose: () => void;
}

export function CollectionItemLightbox({ item, onClose }: CollectionItemLightboxProps) {
  const [failedSelectionPreviewKey, setFailedSelectionPreviewKey] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!item) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Handle ESC key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
      previousFocusRef.current?.focus();
    };
  }, [item, onClose]);

  if (!item) return null;

  const handleBackdropPointerDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const previewText = item.description?.trim() || item.name;
  const mediaUrl = item.url?.trim() ?? '';
  const thumbnailUrl = item.metadata.thumbnailUrl?.trim() ?? '';
  const mediaAspectRatio =
    item.metadata.width > 0 && item.metadata.height > 0
      ? item.metadata.width / item.metadata.height
      : null;
  const mediaStageOrientationClassName =
    mediaAspectRatio !== null && mediaAspectRatio >= 1.1
      ? styles.mediaStageLandscape
      : mediaAspectRatio !== null && mediaAspectRatio <= 0.9
        ? styles.mediaStagePortrait
        : styles.mediaStageSquare;
  const previewKey = `${item.id}:${thumbnailUrl}:${mediaUrl}`;
  const selectionPreviewFailed = failedSelectionPreviewKey === previewKey;
  const hasUsableVideoThumbnail =
    item.mediaType === 'video' && thumbnailUrl.length > 0 && thumbnailUrl !== mediaUrl;
  const imageSelectionSrc = thumbnailUrl.length > 0 ? thumbnailUrl : mediaUrl;
  const canRenderMedia = mediaUrl.length > 0 && item.status === 'READY';

  return (
    <div className={styles.backdrop} onMouseDown={handleBackdropPointerDown}>
      <button
        ref={closeButtonRef}
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>

      <div className={styles.viewer} role="dialog" aria-modal="true" aria-label="Media viewer">
        <div className={`${styles.mediaStage} ${mediaStageOrientationClassName}`}>
          {!canRenderMedia ? (
            <div className={styles.selectionThumbFallback}>Media is still processing...</div>
          ) : item.mediaType === 'image' ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mediaUrl}
              alt={item.name}
              className={styles.media}
              width={Math.max(item.metadata.width, 1)}
              height={Math.max(item.metadata.height, 1)}
            />
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
                  <img
                    src={thumbnailUrl}
                    alt={item.name}
                    className={styles.selectionThumb}
                    width={Math.max(item.metadata.width, 1)}
                    height={Math.max(item.metadata.height, 1)}
                    loading="lazy"
                  />
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
                <img
                  src={imageSelectionSrc}
                  alt={item.name}
                  className={styles.selectionThumb}
                  width={Math.max(item.metadata.width, 1)}
                  height={Math.max(item.metadata.height, 1)}
                  loading="lazy"
                />
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
