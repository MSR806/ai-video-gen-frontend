import { useEffect, useMemo, useState } from 'react';
import { GetCollectionItemsUseCase, type CollectionItemRepository } from '@core/collection-item';
import type { Shot } from '@core/shot';

export type ShotCollectionPreview =
  | {
      state: 'loading';
      message: string;
    }
  | {
      state: 'ready';
      message: string;
      imageUrl: string;
      itemName: string;
    }
  | {
      state: 'generating' | 'empty' | 'failed';
      message: string;
    };

const PREVIEW_FETCH_CONCURRENCY = 4;

const normalizeUrl = (url: string | null | undefined): string | null => {
  if (typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildCollectionPreview = (
  items: Awaited<ReturnType<GetCollectionItemsUseCase['execute']>>,
): ShotCollectionPreview => {
  const imageItems = items.filter((item) => item.mediaType === 'image');

  const latestReadyImage = imageItems.find(
    (item) => item.status === 'READY' && normalizeUrl(item.url) !== null,
  );

  if (latestReadyImage) {
    return {
      state: 'ready',
      message: 'Latest image',
      imageUrl: normalizeUrl(latestReadyImage.url) ?? '',
      itemName: latestReadyImage.name.trim() || 'Generated image',
    };
  }

  if (imageItems.some((item) => item.status === 'GENERATING')) {
    return {
      state: 'generating',
      message: 'Generating image',
    };
  }

  if (imageItems.length === 0 || items.length === 0) {
    return {
      state: 'empty',
      message: 'No images yet',
    };
  }

  return {
    state: 'failed',
    message: 'No usable image',
  };
};

const runWithConcurrencyLimit = async (
  collectionIds: string[],
  limit: number,
  runTask: (collectionId: string) => Promise<void>,
): Promise<void> => {
  let currentIndex = 0;
  const workerCount = Math.min(limit, collectionIds.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (currentIndex < collectionIds.length) {
      const collectionId = collectionIds[currentIndex];
      currentIndex += 1;
      await runTask(collectionId);
    }
  });

  await Promise.all(workers);
};

export const useShotCollectionPreviews = (
  shots: Shot[],
  collectionItemRepository: CollectionItemRepository,
): Record<string, ShotCollectionPreview> => {
  const [previewsByShotId, setPreviewsByShotId] = useState<Record<string, ShotCollectionPreview>>(
    {},
  );

  const collectionIdByShotId = useMemo(
    () =>
      new Map(
        shots
          .filter((shot): shot is Shot & { collectionId: string } => Boolean(shot.collectionId))
          .map((shot) => [shot.id, shot.collectionId]),
      ),
    [shots],
  );
  const uniqueCollectionIds = useMemo(
    () => Array.from(new Set(collectionIdByShotId.values())),
    [collectionIdByShotId],
  );

  useEffect(() => {
    if (uniqueCollectionIds.length === 0) {
      return;
    }

    let cancelled = false;

    const loadPreviews = async (): Promise<void> => {
      const getCollectionItemsUseCase = new GetCollectionItemsUseCase(collectionItemRepository);
      const previewByCollectionId = new Map<string, ShotCollectionPreview>();

      await runWithConcurrencyLimit(uniqueCollectionIds, PREVIEW_FETCH_CONCURRENCY, async (id) => {
        try {
          const items = await getCollectionItemsUseCase.execute(id);
          previewByCollectionId.set(id, buildCollectionPreview(items));
        } catch {
          previewByCollectionId.set(id, { state: 'failed', message: 'Unable to load image' });
        }
      });

      if (cancelled) {
        return;
      }

      setPreviewsByShotId((previous) => {
        const next: Record<string, ShotCollectionPreview> = {};

        shots.forEach((shot) => {
          if (!shot.collectionId) {
            return;
          }

          next[shot.id] = previewByCollectionId.get(shot.collectionId) ??
            previous[shot.id] ?? { state: 'failed', message: 'Unable to load image' };
        });

        return next;
      });
    };

    void loadPreviews();

    return () => {
      cancelled = true;
    };
  }, [collectionItemRepository, shots, uniqueCollectionIds]);

  return useMemo(() => {
    const next: Record<string, ShotCollectionPreview> = {};

    shots.forEach((shot) => {
      if (!shot.collectionId) {
        return;
      }

      next[shot.id] = previewsByShotId[shot.id] ?? { state: 'loading', message: 'Loading image' };
    });

    return next;
  }, [previewsByShotId, shots]);
};
