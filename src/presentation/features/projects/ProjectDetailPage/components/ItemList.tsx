import type { TabType } from '../types';
import styles from '../ProjectDetailPage.module.css';

interface Item {
  id: string;
  name: string;
}

interface ItemListProps {
  items: Item[];
  selectedId: string | null;
  activeTab: TabType;
  onItemSelect: (id: string) => void;
}

export function ItemList({ items, selectedId, activeTab, onItemSelect }: ItemListProps) {
  return (
    <aside className={styles.listPanel}>
      <h2 className={styles.listTitle}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
      <div className={styles.list}>
        {items.length === 0 ? (
          <p className={styles.emptyList}>No {activeTab} found</p>
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
    </aside>
  );
}
