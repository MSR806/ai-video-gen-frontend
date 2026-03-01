'use client';

import { useState } from 'react';
import type { Collection, Scene, CollectionItem } from '@core';
import type { TabType } from './types';
import { TabNavigation } from './components/TabNavigation';
import { ItemList } from '../../collections/components/ItemList';
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
  collections,
  scenes,
  collectionItems,
}: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('collections');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<CollectionItem | null>(null);
  const [centerViewMode, setCenterViewMode] = useState<CenterViewMode>('grid');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [itemRefreshKey, setItemRefreshKey] = useState(0);

  const getItems = () => {
    switch (activeTab) {
      case 'collections':
        return collections;
      case 'scenes':
      case 'shots':
        return [];
    }
  };

  const getSelectedItem = (): Item => {
    if (!selectedId) return null;
    switch (activeTab) {
      case 'collections':
        return collections.find((collection) => collection.id === selectedId) || null;
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
    return collectionItems.filter((item) => item.collectionId === selectedId);
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

  const handleGenerateClick = () => {
    setCenterViewMode('generation');
  };

  const handleBackToGrid = () => {
    setCenterViewMode('grid');
  };

  const handleCollectionItemCreated = () => {
    setItemRefreshKey((prev) => prev + 1);
    addToast('Collection item created successfully!', 'success');
    setCenterViewMode('grid');
  };

  const handleUploadSuccess = () => {
    setItemRefreshKey((prev) => prev + 1);
    addToast('Collection item uploaded successfully!', 'success');
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleScenesSave = async (nextScenes: Scene[]) => {
    try {
      const response = await fetch(`/api/projects/1/scenes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: nextScenes }),
      });
      if (!response.ok) throw new Error('Failed to save scenes');
    } catch (error) {
      console.error('Error saving scenes:', error);
      addToast('Failed to save scenes. Please try again.', 'error');
    }
  };

  const items = getItems();
  const selectedItem = getSelectedItem();
  const selectedCollectionItems = getCollectionItems();
  const emptyMessage = getEmptyMessage();

  const canCreateCollectionItems = !!selectedId && activeTab === 'collections';

  return (
    <div className={styles.container}>
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'collections' && (
        <ItemList items={items} selectedId={selectedId} onItemSelect={setSelectedId} />
      )}

      {activeTab === 'scenes' ? (
        <div
          className={styles.centerArea}
          style={{ gridColumn: '2 / 5', height: '100%', overflowY: 'auto' }}
        >
          <div style={{ padding: '2rem 2rem 3rem 0' }}>
            <ScenesEditor projectId="1" scenes={scenes} onSave={handleScenesSave} />
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
                projectId="1"
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

      {selectedId && canCreateCollectionItems && (
        <CollectionItemUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          collectionId={selectedId}
          projectId="1"
          onSuccess={handleUploadSuccess}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
