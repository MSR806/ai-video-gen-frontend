import type { CollectionItem } from '@core/collection-item';
import type { Collection } from '@core/collection';
import { Dropdown, DropdownItem } from '@presentation/components/ui';
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
  onUploadClick?: () => void;
  onCreateCollectionClick?: () => void;
  isUploadDisabled?: boolean;
  showAddButton?: boolean;
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
  onUploadClick,
  onCreateCollectionClick,
  isUploadDisabled = false,
  showAddButton = true,
}: CollectionItemGridProps) {
  const hasAddActions = showAddButton && (onUploadClick || onCreateCollectionClick);
  const hasGridContent = childCollections.length > 0 || items.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        {hasAddActions ? (
          <Dropdown
            trigger={
              <button
                type="button"
                className={styles.addButton}
                aria-label="Add options"
                disabled={isUploadDisabled}
              >
                +
              </button>
            }
          >
            {onCreateCollectionClick ? (
              <DropdownItem icon="+" label="New collection" onClick={onCreateCollectionClick} />
            ) : null}
            {onUploadClick ? <DropdownItem icon="↑" label="Upload image" onClick={onUploadClick} /> : null}
          </Dropdown>
        ) : null}
      </div>

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
