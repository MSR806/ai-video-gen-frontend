'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Collection, Scene, CollectionItem } from '@core';
import { CreateCollectionUseCase, type CollectionCreationPayload } from '@core/collection';
import {
  DeleteCollectionItemUseCase,
  GenerateCollectionItemUseCase,
  GetCollectionItemByIdUseCase,
  GetCollectionItemsUseCase,
  GetGenerationJobUseCase,
  UploadCollectionItemUseCase,
  type GenerationAspectRatio,
  type ImageMetadata,
  type VideoMetadata,
} from '@core/collection-item';
import {
  CreateSceneUseCase,
  DeleteSceneUseCase,
  GetProjectScenesUseCase,
  type SceneCreatePayload,
  type SceneUpdatePayload,
  UpdateSceneUseCase,
} from '@core/scene';
import {
  CollectionItemRepositoryImpl,
  CollectionRepositoryImpl,
  SceneRepositoryImpl,
} from '@infra/repositories';
import { getProjectCollectionPath } from '@presentation/features/projects/routes';
import type { TabType } from './types';
import { TabNavigation } from './components/TabNavigation';
import { CollectionsCardList } from './components/CollectionsCardList';
import { ItemList } from '../../collections/components/ItemList';
import { CollectionCreateModal } from '../../collections/components/CollectionCreateModal';
import { CollectionDetails } from '../../collections/components/details/CollectionDetails';
import { CollectionItemGrid } from '../../collections/components/CollectionItemGrid';
import { CollectionItemLightbox } from '../../collections/components/CollectionItemLightbox';
import { GenerationControlBar } from '../../collections/components/CollectionItemGenerationView/components/GenerationControlBar/GenerationControlBar';
import { ScenesEditor } from '../../scenes/components/ScenesEditor';
import { ToastContainer } from '@presentation/components/feedback';
import { Button, Modal } from '@presentation/components/ui';
import styles from './ProjectDetailPage.module.css';

type Item = Collection | null;

interface ProjectDetailPageProps {
  projectId: string;
  activeTab: TabType;
  selectedCollectionId: string | null;
  collections: Collection[];
  scenes: Scene[];
  collectionItems: CollectionItem[];
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const getCollectionItemDownloadName = (item: CollectionItem): string => {
  const baseName = item.name.trim() || 'collection-item';
  const extension = item.metadata.format.trim().replace(/^\./, '');

  if (!extension) {
    return baseName;
  }

  return baseName.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
    ? baseName
    : `${baseName}.${extension}`;
};

const ACTIVE_GENERATION_JOBS_POLL_INTERVAL_MS = 3000;
const ACTIVE_GENERATION_JOBS_MAX_POLL_ATTEMPTS = 240;
const MISSING_JOB_FALLBACK_REFRESH_INTERVAL_MS = 15000;
const MISSING_JOB_FALLBACK_MAX_ATTEMPTS = 4;
const ITEM_TERMINAL_REFRESH_MAX_RETRIES = 5;

/**
 * ProjectDetailPage
 *
 * Orchestrates the four-panel layout for viewing project details:
 * - Tab navigation (Collections/Scenes/Shots)
 * - List of collections
 * - Collection item grid with inline generation controls
 * - Details panel showing selected collection
 */
export function ProjectDetailPage({
  projectId,
  activeTab,
  selectedCollectionId,
  collections,
  scenes,
  collectionItems,
}: ProjectDetailPageProps) {
  const router = useRouter();
  const [lightboxItem, setLightboxItem] = useState<CollectionItem | null>(null);
  const [collectionCreateModalOpen, setCollectionCreateModalOpen] = useState(false);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [isUploadingCollectionItems, setIsUploadingCollectionItems] = useState(false);
  const [isGeneratingCollectionItem, setIsGeneratingCollectionItem] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [itemRefreshKey, setItemRefreshKey] = useState(0);
  const [loadedCollections, setLoadedCollections] = useState<Collection[]>(collections);
  const [loadedScenes, setLoadedScenes] = useState<Scene[]>(scenes);
  const [loadedCollectionItems, setLoadedCollectionItems] =
    useState<CollectionItem[]>(collectionItems);
  const loadedCollectionItemsRef = useRef<CollectionItem[]>(collectionItems);
  const [deletingItemIds, setDeletingItemIds] = useState<Set<string>>(new Set());
  const [deleteCandidate, setDeleteCandidate] = useState<CollectionItem | null>(null);
  const [isScenesReady, setIsScenesReady] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const getItems = () => {
    switch (activeTab) {
      case 'collections':
        return loadedCollections;
      case 'scenes':
      case 'shots':
        return [];
    }
  };

  const getCollectionItems = (): CollectionItem[] => {
    if (!selectedCollectionId || activeTab !== 'collections') return [];
    return loadedCollectionItems.filter((item) => item.collectionId === selectedCollectionId);
  };

  const getSelectedItem = (): Item => {
    if (!selectedCollectionId || activeTab !== 'collections') {
      return null;
    }

    return loadedCollections.find((collection) => collection.id === selectedCollectionId) || null;
  };

  const getEmptyMessage = (): string => {
    if (!selectedCollectionId) {
      if (activeTab === 'collections') return 'Select a collection to view items';
      return '';
    }

    if (activeTab === 'scenes' || activeTab === 'shots') return 'Not applicable for this view';

    return 'No collection items available';
  };

  const handleCollectionSelect = (collectionId: string) => {
    if (collectionId === selectedCollectionId) {
      return;
    }

    router.push(getProjectCollectionPath(projectId, collectionId));
  };

  const handleUploadClick = () => {
    if (isUploadingCollectionItems) {
      return;
    }

    uploadInputRef.current?.click();
  };

  const handleCreateCollectionClick = () => {
    setCollectionCreateModalOpen(true);
  };

  const handleCreateCollection = async (payload: CollectionCreationPayload) => {
    setIsCreatingCollection(true);

    try {
      const repository = new CollectionRepositoryImpl();
      const createCollectionUseCase = new CreateCollectionUseCase(repository);
      const created = await createCollectionUseCase.execute(payload);

      setLoadedCollections((prev) => [...prev, created]);
      router.push(getProjectCollectionPath(projectId, created.id));
      addToast('Collection created successfully!', 'success');
    } catch (error) {
      console.error('Error creating collection:', error);
      addToast('Failed to create collection. Please try again.', 'error');
      throw error;
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleGenerateCollectionItem = useCallback(
    async (prompt: string, referenceImages: string[], aspectRatio: GenerationAspectRatio) => {
      if (!selectedCollectionId) {
        return;
      }

      setIsGeneratingCollectionItem(true);

      try {
        const repository = new CollectionItemRepositoryImpl();
        const generateCollectionItemUseCase = new GenerateCollectionItemUseCase(repository);
        const generatedPlaceholder = await generateCollectionItemUseCase.execute({
          prompt,
          referenceImages,
          aspectRatio,
          projectId,
          collectionId: selectedCollectionId,
        });
        setLoadedCollectionItems((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === generatedPlaceholder.id);
          if (existingIndex === -1) {
            return [...prev, generatedPlaceholder];
          }

          const next = [...prev];
          next[existingIndex] = generatedPlaceholder;
          return next;
        });
      } catch (error) {
        console.error('Error generating collection item:', error);
        addToast(
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : 'Failed to generate collection item.',
          'error',
        );
      } finally {
        setIsGeneratingCollectionItem(false);
      }
    },
    [addToast, projectId, selectedCollectionId],
  );

  const getImageDimensions = useCallback(
    (file: File): Promise<{ width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
          resolve({ width: image.width, height: image.height });
          URL.revokeObjectURL(objectUrl);
        };

        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error(`Unable to read image dimensions for "${file.name}"`));
        };

        image.src = objectUrl;
      });
    },
    [],
  );

  const buildUploadMetadata = useCallback(
    async (file: File): Promise<ImageMetadata | VideoMetadata> => {
      const formatFromMime = file.type.includes('/') ? file.type.split('/')[1] : '';
      const formatFromName = file.name.split('.').pop()?.toLowerCase() ?? '';
      const format = formatFromMime || formatFromName || 'unknown';

      if (file.type.startsWith('image/')) {
        try {
          const dimensions = await getImageDimensions(file);
          return {
            width: dimensions.width,
            height: dimensions.height,
            format,
            thumbnailUrl: '',
          };
        } catch (error) {
          console.error('Error reading image metadata:', error);
          return {
            width: 0,
            height: 0,
            format,
            thumbnailUrl: '',
          };
        }
      }

      return {
        width: 1920,
        height: 1080,
        duration: 10,
        format,
        thumbnailUrl: '',
      };
    },
    [getImageDimensions],
  );

  const handleUploadInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
      event.target.value = '';

      if (selectedFiles.length === 0 || isUploadingCollectionItems || !selectedCollectionId) {
        return;
      }

      setIsUploadingCollectionItems(true);

      const repository = new CollectionItemRepositoryImpl();
      const uploadCollectionItemUseCase = new UploadCollectionItemUseCase(repository);

      let successCount = 0;
      const failedFileNames: string[] = [];

      try {
        for (const file of selectedFiles) {
          const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, '').trim();
          const normalizedName =
            fileNameWithoutExtension.length > 0 ? fileNameWithoutExtension : 'upload';

          try {
            const metadata = await buildUploadMetadata(file);
            await uploadCollectionItemUseCase.execute({
              projectId,
              collectionId: selectedCollectionId,
              name: normalizedName,
              description: '',
              file,
              metadata,
            });
            successCount += 1;
          } catch (error) {
            console.error(`Error uploading file "${file.name}":`, error);
            failedFileNames.push(file.name);
          }
        }
      } finally {
        setIsUploadingCollectionItems(false);
      }

      if (successCount > 0) {
        setItemRefreshKey((prev) => prev + 1);
      }

      if (failedFileNames.length === 0) {
        const message =
          successCount === 1
            ? 'Collection item uploaded successfully!'
            : `${successCount} collection items uploaded successfully!`;
        addToast(message, 'success');
        return;
      }

      const failedPreview = failedFileNames.slice(0, 3).join(', ');
      const hasMoreFailures = failedFileNames.length > 3;
      const failedSuffix = hasMoreFailures ? ', ...' : '';

      if (successCount === 0) {
        addToast(
          `Failed to upload ${failedFileNames.length} file(s): ${failedPreview}${failedSuffix}`,
          'error',
        );
        return;
      }

      addToast(
        `Uploaded ${successCount} file(s), failed ${failedFileNames.length}: ${failedPreview}${failedSuffix}`,
        'error',
      );
    },
    [addToast, buildUploadMetadata, isUploadingCollectionItems, projectId, selectedCollectionId],
  );

  const handleCopyCollectionItem = useCallback(
    async (item: CollectionItem) => {
      if (item.mediaType !== 'image') {
        addToast('Only image items can be copied to clipboard.', 'error');
        return;
      }

      const mediaUrl = item.url?.trim() ?? '';
      if (item.status !== 'READY' || mediaUrl.length === 0) {
        addToast('This item is still processing and cannot be copied yet.', 'info');
        return;
      }

      if (
        typeof navigator === 'undefined' ||
        !navigator.clipboard?.write ||
        typeof ClipboardItem === 'undefined'
      ) {
        addToast('Image copy is not available in this browser.', 'error');
        return;
      }

      try {
        const response = await fetch(mediaUrl);
        if (!response.ok) {
          throw new Error(`Copy request failed with status ${response.status}`);
        }

        const fetchedBlob = await response.blob();
        const normalizedBlob =
          fetchedBlob.type.startsWith('image/') && fetchedBlob.type.length > 0
            ? fetchedBlob
            : new Blob([fetchedBlob], {
                type: `image/${item.metadata.format.trim().replace(/^\./, '').toLowerCase() || 'png'}`,
              });

        await navigator.clipboard.write([
          new ClipboardItem({
            [normalizedBlob.type]: normalizedBlob,
          }),
        ]);

        addToast('Image copied to clipboard.', 'success');
      } catch (error) {
        console.error('Error copying collection item image:', error);
        addToast('Failed to copy image. Please try again.', 'error');
      }
    },
    [addToast],
  );

  const handleDownloadCollectionItem = useCallback(
    (item: CollectionItem) => {
      if (typeof document === 'undefined' || typeof window === 'undefined') {
        addToast('Download is not available right now.', 'error');
        return;
      }

      const mediaUrl = item.url?.trim() ?? '';
      if (item.status !== 'READY' || mediaUrl.length === 0) {
        addToast('This item is still processing and cannot be downloaded yet.', 'info');
        return;
      }

      void (async () => {
        let objectUrl: string | null = null;

        try {
          const response = await fetch(mediaUrl);
          if (!response.ok) {
            throw new Error(`Download request failed with status ${response.status}`);
          }

          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);

          const anchor = document.createElement('a');
          anchor.href = objectUrl;
          anchor.download = getCollectionItemDownloadName(item);
          anchor.rel = 'noopener noreferrer';
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          addToast('Download started.', 'info');
        } catch (error) {
          console.error('Error downloading collection item:', error);
          addToast('Failed to download item. Please try again.', 'error');
        } finally {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
        }
      })();
    },
    [addToast],
  );

  const handleDeleteCollectionItem = async (item: CollectionItem) => {
    if (deletingItemIds.has(item.id)) {
      return;
    }

    setDeletingItemIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });

    try {
      const repository = new CollectionItemRepositoryImpl();
      const deleteCollectionItemUseCase = new DeleteCollectionItemUseCase(repository);
      await deleteCollectionItemUseCase.execute(item.collectionId, item.id);

      setLoadedCollectionItems((prev) => prev.filter((existing) => existing.id !== item.id));
      setLightboxItem((prev) => (prev?.id === item.id ? null : prev));
      addToast('Collection item deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting collection item:', error);
      addToast('Failed to delete collection item. Please try again.', 'error');
    } finally {
      setDeletingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleDeleteRequest = (item: CollectionItem) => {
    if (deletingItemIds.has(item.id)) {
      return;
    }
    setDeleteCandidate(item);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) {
      return;
    }

    const itemToDelete = deleteCandidate;
    setDeleteCandidate(null);
    await handleDeleteCollectionItem(itemToDelete);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleSceneCreate = useCallback(
    async (payload: SceneCreatePayload): Promise<Scene[]> => {
      try {
        const sceneRepository = new SceneRepositoryImpl();
        const createSceneUseCase = new CreateSceneUseCase(sceneRepository);
        const nextScenes = await createSceneUseCase.execute(projectId, payload);
        setLoadedScenes(nextScenes);
        return nextScenes;
      } catch (error) {
        console.error('Error creating scene:', error);
        addToast('Failed to create scene. Please try again.', 'error');
        throw error;
      }
    },
    [addToast, projectId],
  );

  const handleSceneUpdate = useCallback(
    async (sceneId: string, payload: SceneUpdatePayload): Promise<Scene> => {
      try {
        const sceneRepository = new SceneRepositoryImpl();
        const updateSceneUseCase = new UpdateSceneUseCase(sceneRepository);
        return await updateSceneUseCase.execute(projectId, sceneId, payload);
      } catch (error) {
        console.error('Error updating scene:', error);
        addToast('Failed to save scene. Please try again.', 'error');
        throw error;
      }
    },
    [addToast, projectId],
  );

  const handleSceneDelete = useCallback(
    async (sceneId: string): Promise<Scene[]> => {
      try {
        const sceneRepository = new SceneRepositoryImpl();
        const deleteSceneUseCase = new DeleteSceneUseCase(sceneRepository);
        const nextScenes = await deleteSceneUseCase.execute(projectId, sceneId);
        setLoadedScenes(nextScenes);
        return nextScenes;
      } catch (error) {
        console.error('Error deleting scene:', error);
        addToast('Failed to delete scene. Please try again.', 'error');
        throw error;
      }
    },
    [addToast, projectId],
  );

  const refreshCollectionItems = useCallback(
    async (
      collectionId: string,
      options?: { silentError?: boolean },
    ): Promise<CollectionItem[] | null> => {
      const silentError = options?.silentError ?? false;

      try {
        const repository = new CollectionItemRepositoryImpl();
        const getCollectionItemsUseCase = new GetCollectionItemsUseCase(repository);
        const items = await getCollectionItemsUseCase.execute(collectionId);

        setLoadedCollectionItems((prev) => [
          ...prev.filter((item) => item.collectionId !== collectionId),
          ...items,
        ]);

        return items;
      } catch (error) {
        console.error('Error loading collection items:', error);
        if (!silentError) {
          setToasts((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              message: 'Failed to load collection items.',
              type: 'error',
            },
          ]);
        }
        return null;
      }
    },
    [],
  );

  const fetchCollectionItemById = useCallback(
    async (itemId: string, options?: { silentError?: boolean }): Promise<CollectionItem | null> => {
      const silentError = options?.silentError ?? false;

      try {
        const repository = new CollectionItemRepositoryImpl();
        const getCollectionItemByIdUseCase = new GetCollectionItemByIdUseCase(repository);
        const item = await getCollectionItemByIdUseCase.execute(itemId);

        if (item === null) {
          setLoadedCollectionItems((prev) => prev.filter((existing) => existing.id !== itemId));
          return null;
        }

        setLoadedCollectionItems((prev) => {
          const existingIndex = prev.findIndex((existing) => existing.id === item.id);
          if (existingIndex === -1) {
            return [...prev, item];
          }

          const next = [...prev];
          next[existingIndex] = item;
          return next;
        });

        return item;
      } catch (error) {
        console.error('Error loading collection item:', error);
        if (!silentError) {
          addToast('Failed to load collection item.', 'error');
        }
        throw error;
      }
    },
    [addToast],
  );

  useEffect(() => {
    setLoadedCollections(collections);
  }, [collections]);

  useEffect(() => {
    setLoadedCollectionItems(collectionItems);
    loadedCollectionItemsRef.current = collectionItems;
  }, [collectionItems]);

  useEffect(() => {
    loadedCollectionItemsRef.current = loadedCollectionItems;
  }, [loadedCollectionItems]);

  useEffect(() => {
    setLoadedScenes(scenes);
  }, [scenes]);

  useEffect(() => {
    if (activeTab !== 'scenes') return;
    setIsScenesReady(false);

    let isCancelled = false;

    const loadScenes = async () => {
      try {
        const repository = new SceneRepositoryImpl();
        const getProjectScenesUseCase = new GetProjectScenesUseCase(repository);
        const latestScenes = await getProjectScenesUseCase.execute(projectId);

        if (isCancelled) return;
        setLoadedScenes(latestScenes);
      } catch (error) {
        if (isCancelled) return;

        console.error('Error loading scenes:', error);
        addToast('Failed to load scenes from backend.', 'error');
      } finally {
        if (!isCancelled) {
          setIsScenesReady(true);
        }
      }
    };

    void loadScenes();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, addToast, projectId]);

  useEffect(() => {
    if (!selectedCollectionId || activeTab !== 'collections') return;

    void refreshCollectionItems(selectedCollectionId, { silentError: false });
  }, [selectedCollectionId, activeTab, itemRefreshKey, refreshCollectionItems]);

  useEffect(() => {
    if (!selectedCollectionId || activeTab !== 'collections') return;

    const selectedGeneratingItems = loadedCollectionItems.filter(
      (item) => item.collectionId === selectedCollectionId && item.status === 'GENERATING',
    );
    if (selectedGeneratingItems.length === 0) {
      return;
    }

    let isCancelled = false;
    let isPolling = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let missingJobFallbackAttempts = 0;
    let lastMissingJobFallbackAt = 0;
    const pollStartedAt = Date.now();
    const maxPollDurationMs =
      ACTIVE_GENERATION_JOBS_MAX_POLL_ATTEMPTS * ACTIVE_GENERATION_JOBS_POLL_INTERVAL_MS;
    const terminalItemRefreshAttempts = new Map<string, number>();

    const stopPolling = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleNextPoll = () => {
      if (isCancelled || timeoutId !== null) {
        return;
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        void pollActiveGenerationJobs();
      }, ACTIVE_GENERATION_JOBS_POLL_INTERVAL_MS);
    };

    const getGeneratingItems = (): CollectionItem[] =>
      loadedCollectionItemsRef.current.filter(
        (item) => item.collectionId === selectedCollectionId && item.status === 'GENERATING',
      );

    const getActiveJobIds = (items: CollectionItem[]): string[] => {
      const activeJobIds = new Set<string>();
      items.forEach((item) => {
        const jobId = item.jobId?.trim();
        if (jobId && jobId.length > 0) {
          activeJobIds.add(jobId);
        }
      });
      return Array.from(activeJobIds);
    };

    const maybeRefreshMissingJobItems = async (items: CollectionItem[]): Promise<void> => {
      const hasMissingJob = items.some((item) => {
        const jobId = item.jobId?.trim() ?? '';
        return jobId.length === 0;
      });

      if (!hasMissingJob) {
        return;
      }

      const now = Date.now();
      if (missingJobFallbackAttempts >= MISSING_JOB_FALLBACK_MAX_ATTEMPTS) {
        return;
      }

      if (now - lastMissingJobFallbackAt < MISSING_JOB_FALLBACK_REFRESH_INTERVAL_MS) {
        return;
      }

      missingJobFallbackAttempts += 1;
      lastMissingJobFallbackAt = now;
      await refreshCollectionItems(selectedCollectionId, { silentError: true });
    };

    const pollActiveGenerationJobs = async () => {
      if (isCancelled || isPolling) {
        return;
      }

      if (Date.now() - pollStartedAt >= maxPollDurationMs) {
        stopPolling();
        return;
      }

      isPolling = true;
      try {
        const generatingItems = getGeneratingItems();
        if (generatingItems.length === 0) {
          stopPolling();
          return;
        }

        await maybeRefreshMissingJobItems(generatingItems);
        if (isCancelled) {
          return;
        }

        const activeJobIds = getActiveJobIds(generatingItems);
        if (activeJobIds.length === 0) {
          scheduleNextPoll();
          return;
        }

        const repository = new CollectionItemRepositoryImpl();
        const getGenerationJobUseCase = new GetGenerationJobUseCase(repository);
        const results = await Promise.allSettled(
          activeJobIds.map((jobId) => getGenerationJobUseCase.execute(jobId)),
        );
        if (isCancelled) {
          return;
        }

        const terminalItemIds = new Set<string>();
        results.forEach((result) => {
          if (result.status !== 'fulfilled') {
            return;
          }

          if (result.value.status === 'QUEUED' || result.value.status === 'IN_PROGRESS') {
            return;
          }

          const itemId = result.value.itemId?.trim();
          if (itemId && itemId.length > 0) {
            terminalItemIds.add(itemId);
          }
        });

        if (terminalItemIds.size > 0) {
          const idsToRefresh = Array.from(terminalItemIds);
          const refreshResults = await Promise.allSettled(
            idsToRefresh.map((itemId) => fetchCollectionItemById(itemId, { silentError: true })),
          );
          if (isCancelled) {
            return;
          }

          let needsCollectionFallbackRefresh = false;
          refreshResults.forEach((result, index) => {
            const itemId = idsToRefresh[index];
            if (result.status === 'fulfilled') {
              terminalItemRefreshAttempts.delete(itemId);
              return;
            }

            const nextAttempt = (terminalItemRefreshAttempts.get(itemId) ?? 0) + 1;
            if (nextAttempt >= ITEM_TERMINAL_REFRESH_MAX_RETRIES) {
              terminalItemRefreshAttempts.delete(itemId);
              needsCollectionFallbackRefresh = true;
              return;
            }

            terminalItemRefreshAttempts.set(itemId, nextAttempt);
          });

          if (needsCollectionFallbackRefresh) {
            await refreshCollectionItems(selectedCollectionId, { silentError: true });
            if (isCancelled) {
              return;
            }
          }
        }

        const remainingGeneratingItems = getGeneratingItems();
        if (remainingGeneratingItems.length === 0) {
          stopPolling();
          return;
        }

        scheduleNextPoll();
      } finally {
        isPolling = false;
      }
    };

    void pollActiveGenerationJobs();

    return () => {
      isCancelled = true;
      stopPolling();
    };
  }, [
    selectedCollectionId,
    activeTab,
    loadedCollectionItems,
    fetchCollectionItemById,
    refreshCollectionItems,
  ]);

  const items = getItems();
  const selectedItem = getSelectedItem();
  const selectedCollectionItems = getCollectionItems();
  const emptyMessage = getEmptyMessage();

  const canCreateCollectionItems = !!selectedCollectionId && activeTab === 'collections';

  return (
    <div className={styles.container}>
      <TabNavigation projectId={projectId} activeTab={activeTab} />

      {activeTab === 'collections' && !selectedCollectionId ? (
        <CollectionsCardList
          collections={loadedCollections}
          onCollectionSelect={handleCollectionSelect}
          onAddClick={handleCreateCollectionClick}
        />
      ) : activeTab === 'scenes' ? (
        <div className={styles.scenesArea}>
          <div className={styles.scenesContent}>
            {isScenesReady ? (
              <ScenesEditor
                projectId={projectId}
                scenes={loadedScenes}
                onSceneCreate={handleSceneCreate}
                onSceneUpdate={handleSceneUpdate}
                onSceneDelete={handleSceneDelete}
              />
            ) : (
              <div className={styles.scenesLoading}>Loading scenes...</div>
            )}
          </div>
        </div>
      ) : activeTab === 'shots' ? (
        <div className={styles.shotsArea}>
          <div>Shots Storyboard Placeholder</div>
        </div>
      ) : (
        <>
          {selectedCollectionId === null ? (
            <ItemList
              items={items}
              selectedId={selectedCollectionId}
              onItemSelect={handleCollectionSelect}
              onAddClick={handleCreateCollectionClick}
            />
          ) : null}

          <div
            className={`${styles.collectionsWorkspaceArea} ${selectedCollectionId ? styles.collectionsWorkspaceAreaExpanded : ''}`}
          >
            <div className={styles.collectionItemsPane}>
              <CollectionItemGrid
                key={itemRefreshKey}
                items={selectedCollectionItems}
                onItemClick={setLightboxItem}
                onItemCopy={handleCopyCollectionItem}
                onItemDownload={handleDownloadCollectionItem}
                onItemDelete={canCreateCollectionItems ? handleDeleteRequest : undefined}
                deletingItemIds={deletingItemIds}
                emptyMessage={emptyMessage}
                onUploadClick={canCreateCollectionItems ? handleUploadClick : undefined}
                isUploadDisabled={isUploadingCollectionItems}
                showAddButton={canCreateCollectionItems}
              />
            </div>
            {canCreateCollectionItems && (
              <GenerationControlBar
                onGenerate={handleGenerateCollectionItem}
                isGenerating={isGeneratingCollectionItem}
              />
            )}
          </div>

          {selectedCollectionId === null ? (
            <aside className={styles.detailsPanel}>
              {!selectedItem ? (
                <div className={styles.emptyDetails}>
                  <p>Select collection to view details</p>
                </div>
              ) : (
                <div className={styles.details}>
                  {activeTab === 'collections' && (
                    <CollectionDetails
                      collection={selectedItem}
                      itemCount={selectedCollectionItems.length}
                    />
                  )}
                </div>
              )}
            </aside>
          ) : null}
        </>
      )}

      <CollectionItemLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />

      <CollectionCreateModal
        projectId={projectId}
        isOpen={collectionCreateModalOpen}
        isSubmitting={isCreatingCollection}
        onClose={() => setCollectionCreateModalOpen(false)}
        onSubmit={handleCreateCollection}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleUploadInputChange}
        className={styles.hiddenFileInput}
      />

      <Modal
        isOpen={deleteCandidate !== null}
        onClose={() => setDeleteCandidate(null)}
        title="Delete Collection Item"
      >
        <div className={styles.deleteConfirmBody}>
          <p className={styles.deleteConfirmText}>
            {`Delete "${deleteCandidate?.name || ''}" from this collection?`}
          </p>
          <p className={styles.deleteConfirmWarning}>This action cannot be undone.</p>
          <div className={styles.deleteConfirmActions}>
            <Button variant="secondary" onClick={() => setDeleteCandidate(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleDeleteConfirm()}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
