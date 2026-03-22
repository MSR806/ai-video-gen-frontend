import type { Collection } from '@core/collection';
import Link from 'next/link';
import styles from './ChildCollectionCard.module.css';

interface ChildCollectionCardProps {
  collection: Collection;
  href: string;
}

export function ChildCollectionCard({ collection, href }: ChildCollectionCardProps) {
  return (
    <div className={styles.cardShell}>
      <Link href={href} className={styles.card} aria-label={`Open collection ${collection.name}`}>
        <div className={styles.overlay}>
          <span className={styles.centerGlyph} aria-hidden="true">
            ✿
          </span>
          <div className={styles.content}>
            <h3 className={styles.title}>{collection.name}</h3>
          </div>
        </div>
      </Link>
    </div>
  );
}
