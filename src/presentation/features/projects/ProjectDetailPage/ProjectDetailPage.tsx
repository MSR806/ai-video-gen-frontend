'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Collection, Scene, CollectionItem } from '@core';
import { CreateCollectionUseCase, type CollectionCreationPayload } from '@core/collection';
import {
  DeleteCollectionItemUseCase,
  GenerateCollectionItemUseCase,
  GetCollectionItemsUseCase,
  GetGenerationJobUseCase,
  type GenerationAspectRatio,
  type GenerationJob,
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
import { CollectionItemUploadModal } from '../../collections/components/CollectionItemUploadModal/CollectionItemUploadModal';
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

const GENERATION_POLL_INTERVAL_MS = 2000;
const GENERATION_MAX_POLL_ATTEMPTS = 60;
const ACTIVE_GENERATION_JOBS_POLL_INTERVAL_MS = 3000;
const ACTIVE_GENERATION_JOBS_MAX_POLL_ATTEMPTS = 240;

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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isGeneratingCollectionItem, setIsGeneratingCollectionItem] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [itemRefreshKey, setItemRefreshKey] = useState(0);
  const [loadedCollections, setLoadedCollections] = useState<Collection[]>(collections);
  const [loadedScenes, setLoadedScenes] = useState<Scene[]>(scenes);
  const [loadedCollectionItems, setLoadedCollectionItems] =
    useState<CollectionItem[]>(collectionItems);
  const [deletingItemIds, setDeletingItemIds] = useState<Set<string>>(new Set());
  const [deleteCandidate, setDeleteCandidate] = useState<CollectionItem | null>(null);
  const [isScenesReady, setIsScenesReady] = useState(false);

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
    setUploadModalOpen(true);
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

  const waitForGenerationTerminalState = useCallback(
    async (jobId: string): Promise<GenerationJob> => {
      const repository = new CollectionItemRepositoryImpl();
      const getGenerationJobUseCase = new GetGenerationJobUseCase(repository);

      for (let attempt = 0; attempt < GENERATION_MAX_POLL_ATTEMPTS; attempt += 1) {
        const job = await getGenerationJobUseCase.execute(jobId);
        if (job.status === 'SUCCEEDED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
          return job;
        }

        await new Promise<void>((resolve) => setTimeout(resolve, GENERATION_POLL_INTERVAL_MS));
      }

      throw new Error('Generation timed out. Please check back in a moment.');
    },
    [],
  );

  const handleGenerateCollectionItem = useCallback(
    async (prompt: string, referenceImages: string[], aspectRatio: GenerationAspectRatio) => {
      if (!selectedCollectionId) {
        return;
      }

      setIsGeneratingCollectionItem(true);

      try {
        const repository = new CollectionItemRepositoryImpl();
        const generateCollectionItemUseCase = new GenerateCollectionItemUseCase(repository);
        const submission = await generateCollectionItemUseCase.execute({
          prompt,
          referenceImages,
          aspectRatio,
          projectId,
          collectionId: selectedCollectionId,
        });

        const terminalJob = await waitForGenerationTerminalState(submission.jobId);
        setItemRefreshKey((prev) => prev + 1);

        if (terminalJob.status === 'SUCCEEDED') {
          addToast('Generation completed successfully.', 'success');
          return;
        }

        addToast(terminalJob.error?.message || 'Generation failed on backend.', 'error');
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
    [addToast, projectId, selectedCollectionId, waitForGenerationTerminalState],
  );

  const handleUploadSuccess = () => {
    setItemRefreshKey((prev) => prev + 1);
    addToast('Collection item uploaded successfully!', 'success');
  };

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

  useEffect(() => {
    setLoadedCollections(collections);
  }, [collections]);

  useEffect(() => {
    setLoadedCollectionItems(collectionItems);
  }, [collectionItems]);

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

    let isCancelled = false;
    let isPolling = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const pollStartedAt = Date.now();
    const maxPollDurationMs =
      ACTIVE_GENERATION_JOBS_MAX_POLL_ATTEMPTS * ACTIVE_GENERATION_JOBS_POLL_INTERVAL_MS;

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

    const getActiveJobIds = (items: CollectionItem[]): string[] => {
      const activeJobIds = new Set<string>();
      items
        .filter((item) => item.status === 'GENERATING')
        .forEach((item) => {
          const jobId = item.jobId?.trim();
          if (jobId && jobId.length > 0) {
            activeJobIds.add(jobId);
          }
        });
      return Array.from(activeJobIds);
    };

    const hasInProgressJobs = async (jobIds: string[]): Promise<boolean | null> => {
      if (jobIds.length === 0) {
        return null;
      }

      try {
        const repository = new CollectionItemRepositoryImpl();
        const getGenerationJobUseCase = new GetGenerationJobUseCase(repository);
        const results = await Promise.allSettled(
          jobIds.map((jobId) => getGenerationJobUseCase.execute(jobId)),
        );

        if (results.some((result) => result.status === 'rejected')) {
          return null;
        }

        return results.some(
          (result) =>
            result.status === 'fulfilled' &&
            (result.value.status === 'QUEUED' || result.value.status === 'IN_PROGRESS'),
        );
      } catch (error) {
        console.error('Error polling generation jobs:', error);
        return null;
      }
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
        const currentItems = await refreshCollectionItems(selectedCollectionId, {
          silentError: true,
        });
        if (isCancelled) {
          return;
        }

        if (currentItems === null) {
          scheduleNextPoll();
          return;
        }

        const generatingItems = currentItems.filter((item) => item.status === 'GENERATING');
        if (generatingItems.length === 0) {
          stopPolling();
          return;
        }

        const activeJobIds = getActiveJobIds(generatingItems);
        if (activeJobIds.length === 0) {
          scheduleNextPoll();
          return;
        }

        const hasInProgress = await hasInProgressJobs(activeJobIds);
        if (isCancelled) {
          return;
        }

        if (hasInProgress !== false) {
          scheduleNextPoll();
          return;
        }

        const finalRefresh = await refreshCollectionItems(selectedCollectionId, {
          silentError: true,
        });
        if (isCancelled) {
          return;
        }

        if (finalRefresh?.some((item) => item.status === 'GENERATING')) {
          scheduleNextPoll();
          return;
        }

        stopPolling();
      } finally {
        isPolling = false;
      }
    };

    const loadItems = async () => {
      const items = await refreshCollectionItems(selectedCollectionId, { silentError: false });
      if (isCancelled) {
        return;
      }

      if (!items?.some((item) => item.status === 'GENERATING')) {
        return;
      }

      scheduleNextPoll();
    };

    void loadItems();

    return () => {
      isCancelled = true;
      stopPolling();
    };
  }, [selectedCollectionId, activeTab, itemRefreshKey, refreshCollectionItems]);

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

      {selectedCollectionId && canCreateCollectionItems && (
        <CollectionItemUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          collectionId={selectedCollectionId}
          projectId={projectId}
          onSuccess={handleUploadSuccess}
        />
      )}

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
