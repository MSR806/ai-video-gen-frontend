import { useEffect } from 'react';
import type { Asset } from '@core/asset';
import styles from './AssetLightbox.module.css';

interface AssetLightboxProps {
  asset: Asset | null;
  onClose: () => void;
}

export function AssetLightbox({ asset, onClose }: AssetLightboxProps) {
  useEffect(() => {
    if (!asset) return;

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
  }, [asset, onClose]);

  if (!asset) return null;

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
          {asset.mediaType === 'image' ? (
            <img src={asset.url} alt={asset.name} className={styles.media} />
          ) : (
            <video src={asset.url} controls autoPlay className={styles.media}>
              Your browser does not support video playback.
            </video>
          )}
        </div>

        <div className={styles.details}>
          <h3 className={styles.title}>{asset.name}</h3>
          <p className={styles.description}>{asset.description}</p>
          <div className={styles.metadata}>
            <span className={styles.metadataItem}>
              {asset.metadata.width} x {asset.metadata.height}px
            </span>
            {asset.mediaType === 'video' && 'duration' in asset.metadata && (
              <span className={styles.metadataItem}>Duration: {asset.metadata.duration}s</span>
            )}
            <span className={styles.metadataItem}>
              Format: {asset.metadata.format.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
