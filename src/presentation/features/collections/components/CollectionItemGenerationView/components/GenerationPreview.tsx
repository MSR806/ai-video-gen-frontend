import { Button } from '@presentation/components/ui';
import type { GeneratedCollectionItem } from '@core/collection-item';
import styles from './GenerationPreview.module.css';

interface GenerationPreviewProps {
  state: 'empty' | 'generating' | 'result';
  generatedItem: GeneratedCollectionItem | null;
  onRegenerate: () => void;
  onUseItem: () => void;
}

/**
 * GenerationPreview Component
 * Right panel showing empty state, loading, or generated result
 */
export function GenerationPreview({
  state,
  generatedItem,
  onRegenerate,
  onUseItem,
}: GenerationPreviewProps) {
  if (state === 'empty') {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <svg
            className={styles.emptyIcon}
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
          </svg>
          <h3 className={styles.emptyTitle}>Ready to create</h3>
          <p className={styles.emptyText}>Your generated collection item will appear here</p>
        </div>
      </div>
    );
  }

  if (state === 'generating') {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3 className={styles.loadingTitle}>Generating your collection item...</h3>
          <p className={styles.loadingText}>This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (state === 'result' && generatedItem) {
    return (
      <div className={styles.container}>
        <div className={styles.resultState}>
          <div className={styles.preview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedItem.url} alt="Generated item" className={styles.previewImage} />
          </div>

          <div className={styles.metadata}>
            <span className={styles.metadataItem}>
              {generatedItem.width} × {generatedItem.height}px
            </span>
            <span className={styles.metadataItem}>
              Format: {generatedItem.format.toUpperCase()}
            </span>
            {generatedItem.duration && (
              <span className={styles.metadataItem}>Duration: {generatedItem.duration}s</span>
            )}
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={onRegenerate}>
              Regenerate
            </Button>
            <Button variant="primary" onClick={onUseItem}>
              Use This Item
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
