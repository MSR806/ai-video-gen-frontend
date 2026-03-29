import type { Collection } from '@core/collection';
import Link from 'next/link';
import { Card } from '@presentation/components/ui/Card';
import { getProjectCollectionPath } from '@presentation/features/projects/routes';
import { ChevronLeft } from 'lucide-react';
import styles from './CollectionsCardList.module.css';

interface CollectionsCardListProps {
  projectId: string;
  collections: Collection[];
  onAddClick: () => void;
  onBackToProjectClick: () => void;
}

export function CollectionsCardList({
  projectId,
  collections,
  onAddClick,
  onBackToProjectClick,
}: CollectionsCardListProps) {
  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Collections</h2>
          <p className={styles.subtitle}>Pick a collection to open its workspace.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.backButton} onClick={onBackToProjectClick}>
            <ChevronLeft aria-hidden="true" size={14} strokeWidth={2.5} />
            Back to Project
          </button>
          <button type="button" className={styles.createButton} onClick={onAddClick}>
            + New collection
          </button>
        </div>
      </header>

      {collections.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No collections found.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {collections.map((collection) => (
            <Link
              key={collection.id}
              className={styles.cardLink}
              href={getProjectCollectionPath(projectId, collection.id)}
              aria-label={`Open collection ${collection.name}`}
            >
              <Card className={styles.card}>
                <p className={styles.cardTag}>{collection.tag}</p>
                <h3 className={styles.cardTitle}>{collection.name}</h3>
                <p className={styles.cardDescription}>{collection.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
