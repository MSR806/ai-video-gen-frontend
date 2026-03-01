import type { Collection } from '@core/collection';
import { Card } from '@presentation/components/ui/Card';
import styles from './CollectionsCardList.module.css';

interface CollectionsCardListProps {
  collections: Collection[];
  onCollectionSelect: (collectionId: string) => void;
  onAddClick: () => void;
}

export function CollectionsCardList({
  collections,
  onCollectionSelect,
  onAddClick,
}: CollectionsCardListProps) {
  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Collections</h2>
          <p className={styles.subtitle}>Pick a collection to open its workspace.</p>
        </div>
        <button type="button" className={styles.createButton} onClick={onAddClick}>
          + New collection
        </button>
      </header>

      {collections.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No collections found.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              className={styles.cardButton}
              onClick={() => onCollectionSelect(collection.id)}
            >
              <Card className={styles.card}>
                <p className={styles.cardTag}>{collection.tag}</p>
                <h3 className={styles.cardTitle}>{collection.name}</h3>
                <p className={styles.cardDescription}>{collection.description}</p>
              </Card>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
