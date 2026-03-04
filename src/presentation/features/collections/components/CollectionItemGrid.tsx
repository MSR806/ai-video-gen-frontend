import type { CollectionItem } from '@core/collection-item';
import type { Collection } from '@core/collection';
import { CollectionItemCard } from './CollectionItemCard';
import { ChildCollectionCard } from './ChildCollectionCard';
import styles from './CollectionItemGrid.module.css';

interface CollectionItemGridProps {
  items: CollectionItem[];
  childCollections?: Collection[];
  onChildCollectionClick?: (collectionId: string) => void;
  onItemClick: (item: CollectionItem) => void;
  onItemCopy: (item: CollectionItem) => void | Promise<void>;
  onItemDownload: (item: CollectionItem) => void;
  onItemDelete?: (item: CollectionItem) => void;
  deletingItemIds?: ReadonlySet<string>;
  emptyMessage: string;
}

export function CollectionItemGrid({
  items,
  childCollections = [],
  onChildCollectionClick,
  onItemClick,
  onItemCopy,
  onItemDownload,
  onItemDelete,
  deletingItemIds,
  emptyMessage,
}: CollectionItemGridProps) {
  const hasGridContent = childCollections.length > 0 || items.length > 0;

  return (
    <div className={styles.container}>
      {!hasGridContent ? (
        <div className={styles.empty}>
          <p className={styles.emptyMessage}>{emptyMessage}</p>
        </div>
      ) : (
        <div className={styles.strip}>
          {childCollections.map((collection) => (
            <ChildCollectionCard
              key={`child-collection-${collection.id}`}
              collection={collection}
              onClick={onChildCollectionClick}
            />
          ))}
          {items.map((item) => (
            <CollectionItemCard
              key={item.id}
              item={item}
              onClick={onItemClick}
              onCopy={onItemCopy}
              onDownload={onItemDownload}
              onDelete={onItemDelete}
              isDeleting={deletingItemIds?.has(item.id) ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
