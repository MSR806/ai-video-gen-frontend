import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

// Represents any grid item with an aspect ratio
export interface JustifiedItem {
  id: string;
  aspectRatio: number; // width / height
}

interface JustifiedCell {
  id: string;
  width: number;
  height: number;
  row: number;
}

interface JustifiedLayoutResult {
  cells: JustifiedCell[];
  containerRef: (node: HTMLDivElement | null) => void;
}

interface JustifiedLayoutOptions {
  gap: number;
  targetRowHeight: number;
  // Min/max row height bounds to prevent extreme stretching
  minRowHeight?: number;
  maxRowHeight?: number;
  containerPaddingX?: number;
}

/**
 * Computes a justified (Google Photos-style) layout.
 * Items in each row are scaled to the same height so the combined
 * widths fill the container exactly.
 */
function computeJustifiedLayout(
  items: JustifiedItem[],
  containerWidth: number,
  options: JustifiedLayoutOptions,
): JustifiedCell[] {
  const {
    gap,
    targetRowHeight,
    minRowHeight = 150,
    maxRowHeight = 600,
    containerPaddingX = 0,
  } = options;
  const usableWidth = containerWidth - containerPaddingX * 2;

  if (items.length === 0 || usableWidth <= 0) return [];

  const cells: JustifiedCell[] = [];
  let rowStart = 0;
  let row = 0;

  while (rowStart < items.length) {
    // Greedily add items until the row reaches the target height
    let rowEnd = rowStart;
    let bestRowEnd = rowStart + 1;
    let bestDiff = Infinity;

    while (rowEnd < items.length) {
      rowEnd++;
      const rowItems = items.slice(rowStart, rowEnd);
      const totalGap = (rowItems.length - 1) * gap;
      // Sum of aspect ratios determines how wide the row would be at targetRowHeight
      const totalAspectRatio = rowItems.reduce((sum, item) => sum + item.aspectRatio, 0);
      const rowHeight = (usableWidth - totalGap) / totalAspectRatio;
      const diff = Math.abs(rowHeight - targetRowHeight);

      if (diff < bestDiff) {
        bestDiff = diff;
        bestRowEnd = rowEnd;
      }

      // If row height drops below target, we've added enough items for this row
      if (rowHeight < targetRowHeight) {
        break;
      }
    }

    // Use the best split found
    const rowItems = items.slice(rowStart, bestRowEnd);
    const totalGap = (rowItems.length - 1) * gap;
    const totalAspectRatio = rowItems.reduce((sum, item) => sum + item.aspectRatio, 0);
    let rowHeight = (usableWidth - totalGap) / totalAspectRatio;

    // Clamp row height
    rowHeight = Math.max(minRowHeight, Math.min(maxRowHeight, rowHeight));

    // Compute each cell's width from the clamped height
    for (const item of rowItems) {
      cells.push({
        id: item.id,
        width: item.aspectRatio * rowHeight,
        height: Math.floor(rowHeight),
        row,
      });
    }

    row++;
    rowStart = bestRowEnd;
  }

  return cells;
}

/**
 * Hook that returns justified layout cells and a container ref for measuring.
 */
export function useJustifiedLayout(
  items: JustifiedItem[],
  options: JustifiedLayoutOptions,
): JustifiedLayoutResult {
  const [containerWidth, setContainerWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  // Callback ref to attach ResizeObserver
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    // Cleanup old observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    nodeRef.current = node;

    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          setContainerWidth((prev) => (Math.abs(prev - width) > 1 ? width : prev));
        }
      });
      observer.observe(node);
      observerRef.current = observer;

      // Initial measurement
      setContainerWidth(node.clientWidth);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const cells = useMemo(
    () => computeJustifiedLayout(items, containerWidth, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      items,
      containerWidth,
      options.gap,
      options.targetRowHeight,
      options.minRowHeight,
      options.maxRowHeight,
      options.containerPaddingX,
    ],
  );

  return { cells, containerRef };
}
