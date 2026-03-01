'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Collection, Scene, CollectionItem } from '@core';
import { CreateCollectionUseCase, type CollectionCreationPayload } from '@core/collection';
import { DeleteCollectionItemUseCase, GetCollectionItemsUseCase } from '@core/collection-item';
import { GetProjectScenesUseCase, SyncScenesUseCase } from '@core/scene';
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
import { CollectionItemGenerationView } from '../../collections/components/CollectionItemGenerationView/CollectionItemGenerationView';
import { ScenesEditor } from '../../scenes/components/ScenesEditor';
import { ToastContainer } from '@presentation/components/feedback';
import { Button, Modal } from '@presentation/components/ui';
import styles from './ProjectDetailPage.module.css';

type Item = Collection | null;
type CenterViewMode = 'grid' | 'generation';

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

/**
 * ProjectDetailPage
 *
 * Orchestrates the four-panel layout for viewing project details:
 * - Tab navigation (Collections/Scenes/Shots)
 * - List of collections
 * - Collection item grid OR generation view showing media for selected collection
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
  const [centerViewMode, setCenterViewMode] = useState<CenterViewMode>('grid');
  const [collectionCreateModalOpen, setCollectionCreateModalOpen] = useState(false);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
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

    setCenterViewMode('grid');
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
      setCenterViewMode('grid');
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

  const handleGenerateClick = () => {
    setCenterViewMode('generation');
  };

  const handleBackToGrid = () => {
    setCenterViewMode('grid');
  };

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleCollectionItemCreated = () => {
    setItemRefreshKey((prev) => prev + 1);
    addToast('Collection item created successfully!', 'success');
    setCenterViewMode('grid');
  };

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

      if (
        typeof navigator === 'undefined' ||
        !navigator.clipboard?.write ||
        typeof ClipboardItem === 'undefined'
      ) {
        addToast('Image copy is not available in this browser.', 'error');
        return;
      }

      try {
        const response = await fetch(item.url);
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

      void (async () => {
        let objectUrl: string | null = null;

        try {
          const response = await fetch(item.url);
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

  const handleScenesSave = useCallback(
    async (nextScenes: Scene[]) => {
      try {
        const sceneRepository = new SceneRepositoryImpl();
        const syncScenesUseCase = new SyncScenesUseCase(sceneRepository);
        await syncScenesUseCase.execute(projectId, nextScenes);
        setLoadedScenes(nextScenes);
      } catch (error) {
        console.error('Error saving scenes:', error);
        addToast('Failed to save scenes. Please try again.', 'error');
      }
    },
    [addToast, projectId],
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
    setCenterViewMode('grid');
  }, [activeTab, selectedCollectionId]);

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

    const loadItems = async () => {
      try {
        const repository = new CollectionItemRepositoryImpl();
        const getCollectionItemsUseCase = new GetCollectionItemsUseCase(repository);
        const items = await getCollectionItemsUseCase.execute(selectedCollectionId);

        if (isCancelled) return;

        setLoadedCollectionItems((prev) => [
          ...prev.filter((item) => item.collectionId !== selectedCollectionId),
          ...items,
        ]);
      } catch (error) {
        if (!isCancelled) {
          console.error('Error loading collection items:', error);
          setToasts((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              message: 'Failed to load collection items.',
              type: 'error',
            },
          ]);
        }
      }
    };

    void loadItems();

    return () => {
      isCancelled = true;
    };
  }, [selectedCollectionId, activeTab, itemRefreshKey]);

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
              <ScenesEditor projectId={projectId} scenes={loadedScenes} onSave={handleScenesSave} />
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
          <ItemList
            items={items}
            selectedId={selectedCollectionId}
            onItemSelect={handleCollectionSelect}
            onAddClick={handleCreateCollectionClick}
          />

          <div className={styles.collectionsWorkspaceArea}>
            {centerViewMode === 'grid' ? (
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
                onGenerateClick={canCreateCollectionItems ? handleGenerateClick : undefined}
                showAddButton={canCreateCollectionItems}
              />
            ) : selectedCollectionId ? (
              <CollectionItemGenerationView
                collectionId={selectedCollectionId}
                projectId={projectId}
                onBack={handleBackToGrid}
                onItemCreated={handleCollectionItemCreated}
              />
            ) : null}
          </div>

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
