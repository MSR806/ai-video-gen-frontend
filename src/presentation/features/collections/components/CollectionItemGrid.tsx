import type { CollectionItem } from '@core/collection-item';
import { Dropdown, DropdownItem } from '@presentation/components/ui';
import { CollectionItemCard } from './CollectionItemCard';
import styles from './CollectionItemGrid.module.css';

interface CollectionItemGridProps {
  items: CollectionItem[];
  onItemClick: (item: CollectionItem) => void;
  emptyMessage: string;
  onUploadClick?: () => void;
  onGenerateClick?: () => void;
  showAddButton?: boolean;
}

export function CollectionItemGrid({
  items,
  onItemClick,
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
        <div className={styles.grid}>
          {items.map((item) => (
            <CollectionItemCard key={item.id} item={item} onClick={onItemClick} />
          ))}
        </div>
      )}

      {showAddButton && (onUploadClick || onGenerateClick) && (
        <div
          style={{
            position: 'absolute',
            bottom: 'var(--space-6)',
            right: 'var(--space-6)',
            zIndex: 100,
          }}
        >
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
