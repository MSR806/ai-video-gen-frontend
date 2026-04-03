import type { Collection } from '@core/collection';
import Link from 'next/link';
import { useState } from 'react';
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

interface CollectionCardLinkProps {
  collection: Collection;
  projectId: string;
}

function CollectionCardLink({ collection, projectId }: CollectionCardLinkProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const thumbnailUrl = collection.thumbnailUrl?.trim() ?? '';
  const shouldRenderThumbnail = thumbnailUrl.length > 0 && !hasImageError;

  return (
    <Link
      className={styles.cardLink}
      href={getProjectCollectionPath(projectId, collection.id)}
      aria-label={`Open collection ${collection.name}`}
    >
      <Card className={styles.card}>
        <div className={styles.thumbnailContainer}>
          {shouldRenderThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={`Collection thumbnail for ${collection.name}`}
              className={styles.thumbnailImage}
              loading="lazy"
              onError={() => setHasImageError(true)}
            />
          ) : (
            <div className={styles.thumbnailPlaceholder}>
              <span className={styles.placeholderGlyph} aria-hidden="true">
                ✿
              </span>
              <span className={styles.placeholderLabel}>No preview</span>
            </div>
          )}
          <div className={styles.cardContent}>
            <p className={styles.cardTag}>{collection.tag}</p>
            <h3 className={styles.cardTitle}>{collection.name}</h3>
            <p className={styles.cardDescription}>{collection.description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
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
        <div className={styles.headerMain}>
          <button type="button" className={styles.backButton} onClick={onBackToProjectClick}>
            <ChevronLeft aria-hidden="true" size={14} strokeWidth={2.5} />
            Back to Project
          </button>

          <div>
            <h2 className={styles.title}>Collections</h2>
            <p className={styles.subtitle}>Pick a collection to open its workspace.</p>
          </div>
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
            <CollectionCardLink key={collection.id} collection={collection} projectId={projectId} />
          ))}
        </div>
      )}
    </section>
  );
}
