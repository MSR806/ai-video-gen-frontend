import styles from './ItemList.module.css';

interface Item {
  id: string;
  name: string;
}

interface ItemListProps {
  items: Item[];
  selectedId: string | null;
  onItemSelect: (id: string) => void;
  onAddClick?: () => void;
}

export function ItemList({ items, selectedId, onItemSelect, onAddClick }: ItemListProps) {
  return (
    <aside className={styles.listPanel}>
      <h2 className={styles.listTitle}>Collections</h2>
      <div className={styles.list}>
        {items.length === 0 ? (
          <p className={styles.emptyList}>No collections found</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              className={`${styles.listItem} ${selectedId === item.id ? styles.selectedItem : ''}`}
              onClick={() => onItemSelect(item.id)}
            >
              {item.name}
            </button>
          ))
        )}
      </div>
      {onAddClick && (
        <div className={styles.listFooter}>
          <button className={styles.addButton} onClick={onAddClick}>
            + New collection
          </button>
        </div>
      )}
    </aside>
  );
}
