import type { Collection } from '@core/collection';
import styles from './CollectionDetails.module.css';

interface CollectionDetailsProps {
  collection: Collection;
  itemCount: number;
}

export function CollectionDetails({ collection, itemCount }: CollectionDetailsProps) {
  return (
    <div className={styles.detailsContent}>
      <h2 className={styles.detailsTitle}>{collection.name}</h2>
      <div className={styles.detailsSection}>
        <h3>Tag</h3>
        <p className={styles.badge}>{collection.tag}</p>
      </div>
      <div className={styles.detailsSection}>
        <h3>Description</h3>
        <p>{collection.description}</p>
      </div>
      <div className={styles.detailsSection}>
        <h3>Collection Items</h3>
        <p>{itemCount} item(s)</p>
      </div>
    </div>
  );
}
