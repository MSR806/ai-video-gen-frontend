import type { Collection } from '@core/collection';
import styles from './ChildCollectionCard.module.css';

interface ChildCollectionCardProps {
  collection: Collection;
  onClick?: (collectionId: string) => void;
}

export function ChildCollectionCard({ collection, onClick }: ChildCollectionCardProps) {
  const description = collection.description.trim();

  return (
    <div className={styles.cardShell}>
      <button
        type="button"
        className={styles.card}
        onClick={() => onClick?.(collection.id)}
        aria-label={`Open collection ${collection.name}`}
      >
        <div className={styles.overlay}>
          <span className={styles.badge}>Collection</span>
          <div className={styles.content}>
            <h3 className={styles.title}>{collection.name}</h3>
            {description.length > 0 ? (
              <p className={styles.description}>{description}</p>
            ) : (
              <p className={styles.description}>{collection.tag}</p>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
