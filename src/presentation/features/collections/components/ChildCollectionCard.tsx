import type { Collection } from '@core/collection';
import Link from 'next/link';
import { useState } from 'react';
import styles from './ChildCollectionCard.module.css';

interface ChildCollectionCardProps {
  collection: Collection;
  href: string;
}

export function ChildCollectionCard({ collection, href }: ChildCollectionCardProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const thumbnailUrl = collection.thumbnailUrl?.trim() ?? '';
  const shouldRenderThumbnail = thumbnailUrl.length > 0 && !hasImageError;

  return (
    <div className={styles.cardShell}>
      <Link href={href} className={styles.card} aria-label={`Open collection ${collection.name}`}>
        {shouldRenderThumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={`Collection thumbnail for ${collection.name}`}
            className={styles.thumbnailImage}
            loading="lazy"
            onError={() => setHasImageError(true)}
          />
        )}
        <div className={styles.overlay}>
          {!shouldRenderThumbnail && (
            <>
              <span className={styles.centerGlyph} aria-hidden="true">
                ✿
              </span>
              <span className={styles.placeholderLabel}>No preview</span>
            </>
          )}
          <div className={styles.content}>
            <p className={styles.tag}>{collection.tag}</p>
            <h3 className={styles.title}>{collection.name}</h3>
            {collection.description.trim().length > 0 && (
              <p className={styles.description}>{collection.description}</p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
