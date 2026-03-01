'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Collection, Scene, CollectionItem } from '@core';
import { CreateCollectionUseCase, type CollectionCreationPayload } from '@core/collection';
import { GetCollectionItemsUseCase } from '@core/collection-item';
import { GetProjectScenesUseCase, SyncScenesUseCase } from '@core/scene';
import {
  CollectionItemRepositoryImpl,
  CollectionRepositoryImpl,
  SceneRepositoryImpl,
} from '@infra/repositories';
import type { TabType } from './types';
import { TabNavigation } from './components/TabNavigation';
import { ItemList } from '../../collections/components/ItemList';
import { CollectionCreateModal } from '../../collections/components/CollectionCreateModal';
import { CollectionDetails } from '../../collections/components/details/CollectionDetails';
import { CollectionItemGrid } from '../../collections/components/CollectionItemGrid';
import { CollectionItemLightbox } from '../../collections/components/CollectionItemLightbox';
import { CollectionItemUploadModal } from '../../collections/components/CollectionItemUploadModal/CollectionItemUploadModal';
import { CollectionItemGenerationView } from '../../collections/components/CollectionItemGenerationView/CollectionItemGenerationView';
import { ScenesEditor } from '../../scenes/components/ScenesEditor';
import { ToastContainer } from '@presentation/components/feedback';
import styles from './ProjectDetailPage.module.css';

type Item = Collection | Scene | null;
type CenterViewMode = 'grid' | 'generation';

interface ProjectDetailPageProps {
  projectId: string;
  collections: Collection[];
  scenes: Scene[];
  collectionItems: CollectionItem[];
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

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
  collections,
  scenes,
  collectionItems,
}: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('collections');
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const getSelectedItem = (): Item => {
    if (!selectedId) return null;
    switch (activeTab) {
      case 'collections':
        return loadedCollections.find((collection) => collection.id === selectedId) || null;
      case 'scenes':
      case 'shots':
        return null;
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedId(null);
    setCenterViewMode('grid');
  };

  const getCollectionItems = (): CollectionItem[] => {
    if (!selectedId || activeTab !== 'collections') return [];
    return loadedCollectionItems.filter((item) => item.collectionId === selectedId);
  };

  const getEmptyMessage = (): string => {
    if (!selectedId) {
      if (activeTab === 'collections') return 'Select a collection to view items';
      return '';
    }

    if (activeTab === 'scenes' || activeTab === 'shots') return 'Not applicable for this view';

    return 'No collection items available';
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
      setSelectedId(created.id);
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
    if (!selectedId || activeTab !== 'collections') return;

    let isCancelled = false;

    const loadItems = async () => {
      try {
        const repository = new CollectionItemRepositoryImpl();
        const getCollectionItemsUseCase = new GetCollectionItemsUseCase(repository);
        const items = await getCollectionItemsUseCase.execute(selectedId);

        if (isCancelled) return;

        setLoadedCollectionItems((prev) => [
          ...prev.filter((item) => item.collectionId !== selectedId),
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
  }, [selectedId, activeTab, itemRefreshKey]);

  const items = getItems();
  const selectedItem = getSelectedItem();
  const selectedCollectionItems = getCollectionItems();
  const emptyMessage = getEmptyMessage();

  const canCreateCollectionItems = !!selectedId && activeTab === 'collections';

  return (
    <div className={styles.container}>
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'collections' && (
        <ItemList
          items={items}
          selectedId={selectedId}
          onItemSelect={setSelectedId}
          onAddClick={handleCreateCollectionClick}
        />
      )}

      {activeTab === 'scenes' ? (
        <div
          className={styles.centerArea}
          style={{ gridColumn: '2 / 5', height: '100%', overflowY: 'auto' }}
        >
          <div style={{ padding: '2rem 2rem 3rem 0' }}>
            {isScenesReady ? (
              <ScenesEditor projectId={projectId} scenes={loadedScenes} onSave={handleScenesSave} />
            ) : (
              <div className={styles.scenesLoading}>Loading scenes...</div>
            )}
          </div>
        </div>
      ) : activeTab === 'shots' ? (
        <div className={styles.centerArea} style={{ gridColumn: '2 / 4' }}>
          <div>Shots Storyboard Placeholder</div>
        </div>
      ) : (
        <>
          <div className={styles.centerArea}>
            {centerViewMode === 'grid' ? (
              <CollectionItemGrid
                key={itemRefreshKey}
                items={selectedCollectionItems}
                onItemClick={setLightboxItem}
                emptyMessage={emptyMessage}
                onUploadClick={canCreateCollectionItems ? handleUploadClick : undefined}
                onGenerateClick={canCreateCollectionItems ? handleGenerateClick : undefined}
                showAddButton={canCreateCollectionItems}
              />
            ) : selectedId ? (
              <CollectionItemGenerationView
                collectionId={selectedId}
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
                    collection={selectedItem as Collection}
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

      {selectedId && canCreateCollectionItems && (
        <CollectionItemUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          collectionId={selectedId}
          projectId={projectId}
          onSuccess={handleUploadSuccess}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
