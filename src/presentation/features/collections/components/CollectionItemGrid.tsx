import type { CollectionItem } from '@core/collection-item';
import { Dropdown, DropdownItem } from '@presentation/components/ui';
import { CollectionItemCard } from './CollectionItemCard';
import styles from './CollectionItemGrid.module.css';

interface CollectionItemGridProps {
  items: CollectionItem[];
  onItemClick: (item: CollectionItem) => void;
  onItemCopy: (item: CollectionItem) => void | Promise<void>;
  onItemDownload: (item: CollectionItem) => void;
  onItemDelete?: (item: CollectionItem) => void;
  deletingItemIds?: ReadonlySet<string>;
  emptyMessage: string;
  onUploadClick?: () => void;
  isUploadDisabled?: boolean;
  showAddButton?: boolean;
}

export function CollectionItemGrid({
  items,
  onItemClick,
  onItemCopy,
  onItemDownload,
  onItemDelete,
  deletingItemIds,
  emptyMessage,
  onUploadClick,
  isUploadDisabled = false,
  showAddButton = true,
}: CollectionItemGridProps) {
  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        {showAddButton && onUploadClick ? (
          <Dropdown
            trigger={
              <button
                type="button"
                className={styles.addButton}
                aria-label="Add collection item"
                disabled={isUploadDisabled}
              >
                +
              </button>
            }
          >
            <DropdownItem icon="↑" label="Upload image" onClick={onUploadClick} />
          </Dropdown>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyMessage}>{emptyMessage}</p>
        </div>
      ) : (
        <div className={styles.strip}>
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
