import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Collection } from '@core/collection';
import type { CollectionContents, CollectionItem } from '@core/collection-item';
import styles from './ReferencePickerPopover.module.css';

interface ReferencePickerPopoverProps {
  collections: Collection[];
  currentCollectionId: string | null;
  currentContents: CollectionContents | null;
  isLoading: boolean;
  errorMessage: string | null;
  selectedReferenceImages: string[];
  maxReferenceImages: number;
  onClose: () => void;
  onNavigateRoot: () => void;
  onNavigateCollection: (collectionId: string) => void;
  onSelectReferenceItem: (item: CollectionItem) => void;
}

const buildBreadcrumb = (
  collections: Collection[],
  currentCollectionId: string | null,
): Collection[] => {
  if (!currentCollectionId) {
    return [];
  }

  const collectionsById = new Map(collections.map((collection) => [collection.id, collection]));
  const breadcrumb: Collection[] = [];
  const visited = new Set<string>();
  let nextCollectionId: string | null = currentCollectionId;

  while (nextCollectionId) {
    if (visited.has(nextCollectionId)) {
      break;
    }

    visited.add(nextCollectionId);
    const collection = collectionsById.get(nextCollectionId);
    if (!collection) {
      break;
    }

    breadcrumb.unshift(collection);
    nextCollectionId = collection.parentCollectionId;
  }

  return breadcrumb;
};

const canSelectAsReference = (item: CollectionItem): boolean => {
  const mediaUrl = item.url?.trim() ?? '';
  return item.mediaType === 'image' && item.status === 'READY' && mediaUrl.length > 0;
};

const getItemPreviewSource = (item: CollectionItem): string => {
  const thumbnailUrl = item.metadata.thumbnailUrl?.trim() ?? '';
  const mediaUrl = item.url?.trim() ?? '';
  return thumbnailUrl.length > 0 ? thumbnailUrl : mediaUrl;
};

const getAssetAspectRatio = (item: CollectionItem): number => {
  const width = item.metadata.width;
  const height = item.metadata.height;
  if (width > 0 && height > 0) {
    return width / height;
  }

  return 1;
};

export function ReferencePickerPopover({
  collections,
  currentCollectionId,
  currentContents,
  isLoading,
  errorMessage,
  selectedReferenceImages,
  maxReferenceImages,
  onClose,
  onNavigateRoot,
  onNavigateCollection,
  onSelectReferenceItem,
}: ReferencePickerPopoverProps) {
  const [loadedAspectRatios, setLoadedAspectRatios] = useState<Record<string, number>>({});
  const [hoveredItem, setHoveredItem] = useState<CollectionItem | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breadcrumb = buildBreadcrumb(collections, currentCollectionId);

  const visibleCollections =
    currentCollectionId === null
      ? collections.filter((collection) => collection.parentCollectionId === null)
      : (currentContents?.childCollections ?? []);

  const eligibleItems = (currentContents?.items ?? []).filter(canSelectAsReference);

  const getResolvedAspectRatio = (item: CollectionItem): number => {
    const loadedRatio = loadedAspectRatios[item.id];
    if (typeof loadedRatio === 'number' && Number.isFinite(loadedRatio) && loadedRatio > 0) {
      return loadedRatio;
    }

    return getAssetAspectRatio(item);
  };

  const handleAssetLoad = (itemId: string, event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      return;
    }

    const nextRatio = naturalWidth / naturalHeight;
    setLoadedAspectRatios((prev) => {
      const previousRatio = prev[itemId];
      if (typeof previousRatio === 'number' && Math.abs(previousRatio - nextRatio) < 0.01) {
        return prev;
      }

      return {
        ...prev,
        [itemId]: nextRatio,
      };
    });
  };

  const clearHoverPreview = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredItem(null);
    setPreviewPosition(null);
  }, []);

  // Show the floating preview after a short delay using viewport coords
  const handleItemMouseEnter = useCallback(
    (item: CollectionItem, event: React.MouseEvent<HTMLButtonElement>) => {
      clearHoverPreview();
      const target = event.currentTarget;

      hoverTimerRef.current = setTimeout(() => {
        const rect = target.getBoundingClientRect();
        // Center horizontally on the thumbnail
        const left = rect.left + rect.width / 2;
        // Place above the thumbnail with a small gap
        const top = rect.top - 10;
        setPreviewPosition({ top, left });
        setHoveredItem(item);
      }, 400);
    },
    [clearHoverPreview],
  );

  const renderCollectionList = () => {
    if (visibleCollections.length === 0) {
      return (
        <p className={styles.emptyText}>
          {currentCollectionId === null
            ? 'No root collections available.'
            : 'No child collections.'}
        </p>
      );
    }

    return (
      <div className={styles.collectionList}>
        {visibleCollections.map((collection) => (
          <button
            key={collection.id}
            type="button"
            className={styles.collectionButton}
            onClick={() => onNavigateCollection(collection.id)}
            aria-label={`Open collection ${collection.name}`}
          >
            <span className={styles.collectionName}>{collection.name}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderItems = () => {
    if (currentCollectionId === null) {
      return <p className={styles.emptyText}>Open a collection to choose reference images.</p>;
    }

    if (isLoading) {
      return <p className={styles.emptyText}>Loading collection assets...</p>;
    }

    if (errorMessage) {
      return <p className={styles.errorText}>{errorMessage}</p>;
    }

    if (!currentContents) {
      return <p className={styles.emptyText}>Collection data is not loaded yet.</p>;
    }

    if (eligibleItems.length === 0) {
      return <p className={styles.emptyText}>No ready images in this collection.</p>;
    }

    const hoveredPreviewSource = hoveredItem ? getItemPreviewSource(hoveredItem) : '';

    return (
      <>
        <div className={styles.assetGrid} onMouseLeave={clearHoverPreview}>
          {eligibleItems.map((item) => {
            const mediaUrl = item.url?.trim() ?? '';
            const previewSource = getItemPreviewSource(item);
            const isAlreadySelected = selectedReferenceImages.includes(mediaUrl);
            const disableForLimit =
              !isAlreadySelected && selectedReferenceImages.length >= maxReferenceImages;

            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.assetButton} ${isAlreadySelected ? styles.assetButtonSelected : ''}`}
                onClick={() => onSelectReferenceItem(item)}
                onMouseEnter={(event) => handleItemMouseEnter(item, event)}
                onMouseLeave={clearHoverPreview}
                disabled={disableForLimit}
                aria-label={`Use ${item.name} as reference`}
                title={disableForLimit ? 'Max references reached' : item.name}
                style={{ '--asset-aspect-ratio': getResolvedAspectRatio(item) } as CSSProperties}
              >
                <span className={styles.assetFrame}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSource}
                    alt={item.name}
                    className={styles.assetThumb}
                    loading="lazy"
                    onLoad={(event) => handleAssetLoad(item.id, event)}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* Portal: renders outside the overflow-hidden parents */}
        {hoveredItem &&
          previewPosition &&
          hoveredPreviewSource.length > 0 &&
          createPortal(
            <div
              className={styles.floatingPreview}
              style={{
                top: previewPosition.top,
                left: previewPosition.left,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hoveredPreviewSource}
                alt={hoveredItem.name}
                className={styles.floatingPreviewImage}
              />
            </div>,
            document.body,
          )}
      </>
    );
  };

  return (
    <div className={styles.popover} role="dialog" aria-label="Reference picker">
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <button type="button" className={styles.breadcrumbButton} onClick={onNavigateRoot}>
            Collections
          </button>
          {breadcrumb.map((collection, index) => {
            const isLast = index === breadcrumb.length - 1;
            return (
              <span key={collection.id} className={styles.crumbGroup}>
                <span className={styles.crumbDivider}>/</span>
                {isLast ? (
                  <span className={styles.crumbCurrent}>{collection.name}</span>
                ) : (
                  <button
                    type="button"
                    className={styles.breadcrumbButton}
                    onClick={() => onNavigateCollection(collection.id)}
                  >
                    {collection.name}
                  </button>
                )}
              </span>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close picker"
        >
          ×
        </button>
      </div>

      <div className={styles.metaRow}>
        <span
          className={styles.metaLabel}
        >{`${selectedReferenceImages.length}/${maxReferenceImages} selected`}</span>
      </div>

      <div className={styles.body}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {currentCollectionId === null ? 'Collections' : 'Subcollections'}
          </h3>
          {renderCollectionList()}
        </section>

        <section className={`${styles.section} ${styles.imageSection}`}>
          <h3 className={styles.sectionTitle}>Reference Images</h3>
          {renderItems()}
        </section>
      </div>
    </div>
  );
}
