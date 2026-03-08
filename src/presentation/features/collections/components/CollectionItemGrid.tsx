import { useMemo, useState, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import type { CollectionItem } from '@core/collection-item';
import type { Collection } from '@core/collection';
import { CollectionItemCard } from './CollectionItemCard';
import { ChildCollectionCard } from './ChildCollectionCard';
import { useJustifiedLayout, type JustifiedItem } from './useJustifiedLayout';
import styles from './CollectionItemGrid.module.css';

// Layout constants
const ROW_GAP = 6;
const TARGET_ROW_HEIGHT = 380;
const MIN_ROW_HEIGHT = 200;
const MAX_ROW_HEIGHT = 520;
const CONTAINER_PADDING_X = 12; // matches var(--space-3) ≈ 12px

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

// Default aspect ratio for child collection cards (square)
const CHILD_COLLECTION_ASPECT = 1;

// Helper: resolve aspect ratio from a collection item
function getItemAspectRatio(item: CollectionItem): number {
  if (item.metadata.width > 0 && item.metadata.height > 0) {
    return item.metadata.width / item.metadata.height;
  }
  return 9 / 16; // fallback portrait
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

  const [aspectRatioOverrides, setAspectRatioOverrides] = useState<Record<string, number>>({});

  const handleAspectRatioResolved = useCallback((id: string, ratio: number) => {
    setAspectRatioOverrides((prev) => {
      // Only update if difference is more than 0.01 to avoid unnecessary re-renders
      if (Math.abs((prev[id] || 0) - ratio) < 0.01) return prev;
      return { ...prev, [id]: ratio };
    });
  }, []);

  // Track previous items length to trigger auto-scroll on new items
  const prevItemsLengthRef = useRef(items.length);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (items.length > prevItemsLengthRef.current) {
      // Scroll to bottom if new items were added
      if (scrollContainerRef.current) {
        // Small delay to let the layout engine digest the new items
        setTimeout(() => {
          scrollContainerRef.current?.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }, 100);
      }
    }
    prevItemsLengthRef.current = items.length;
  }, [items.length]);

  // Build unified item list for the justified layout engine
  const justifiedItems: JustifiedItem[] = useMemo(() => {
    const list: JustifiedItem[] = [];

    for (const col of childCollections) {
      list.push({ id: `child-${col.id}`, aspectRatio: CHILD_COLLECTION_ASPECT });
    }

    for (const item of items) {
      list.push({
        id: item.id,
        aspectRatio: aspectRatioOverrides[item.id] || getItemAspectRatio(item),
      });
    }

    return list;
  }, [childCollections, items, aspectRatioOverrides]);

  const layoutOptions = useMemo(
    () => ({
      gap: ROW_GAP,
      targetRowHeight: TARGET_ROW_HEIGHT,
      minRowHeight: MIN_ROW_HEIGHT,
      maxRowHeight: MAX_ROW_HEIGHT,
      containerPaddingX: CONTAINER_PADDING_X,
    }),
    [],
  );

  const { cells, containerRef } = useJustifiedLayout(justifiedItems, layoutOptions);

  // Build a lookup map: id -> { width, height }
  const cellMap = useMemo(() => {
    const map = new Map<string, { width: number; height: number }>();
    for (const cell of cells) {
      map.set(cell.id, { width: cell.width, height: cell.height });
    }
    return map;
  }, [cells]);

  return (
    <div className={styles.container}>
      {!hasGridContent ? (
        <div className={styles.empty}>
          <p className={styles.emptyMessage}>{emptyMessage}</p>
        </div>
      ) : (
        <div
          ref={(node) => {
            containerRef(node);
            scrollContainerRef.current = node;
          }}
          className={styles.strip}
        >
          {/* Child collection cards */}
          {childCollections.map((collection) => {
            const dims = cellMap.get(`child-${collection.id}`);
            const style: CSSProperties = dims
              ? { width: dims.width, height: dims.height, flex: 'none' }
              : {};
            return (
              <div key={`child-collection-${collection.id}`} style={style}>
                <ChildCollectionCard collection={collection} onClick={onChildCollectionClick} />
              </div>
            );
          })}

          {/* Collection item cards */}
          {items.map((item) => {
            const dims = cellMap.get(item.id);
            const style: CSSProperties = dims
              ? { width: dims.width, height: dims.height, flex: 'none' }
              : {};
            return (
              <div key={item.id} style={style}>
                <CollectionItemCard
                  item={item}
                  onClick={onItemClick}
                  onCopy={onItemCopy}
                  onDownload={onItemDownload}
                  onDelete={onItemDelete}
                  isDeleting={deletingItemIds?.has(item.id) ?? false}
                  onAspectRatioResolved={(ratio) => handleAspectRatioResolved(item.id, ratio)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
