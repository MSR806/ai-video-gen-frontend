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
  onGenerateClick?: () => void;
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
  onGenerateClick,
  showAddButton = true,
}: CollectionItemGridProps) {
  return (
    <div className={styles.container}>
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

      {showAddButton && (onUploadClick || onGenerateClick) && (
        <div className={styles.fabContainer}>
          <Dropdown
            direction="up"
            trigger={
              <button className={styles.fab} aria-label="Add Collection Item">
                +
              </button>
            }
          >
            {onUploadClick && (
              <DropdownItem icon="📤" label="Upload File" onClick={onUploadClick} />
            )}
            {onGenerateClick && (
              <DropdownItem icon="✨" label="Generate with AI" onClick={onGenerateClick} />
            )}
          </Dropdown>
        </div>
      )}
    </div>
  );
}
