'use client';

import { useState } from 'react';
import type { Character, Location, Scene, Asset } from '@core';
import type { TabType } from './types';
import { TabNavigation } from './components/TabNavigation';
import { ItemList } from './components/ItemList';
import { CharacterDetails } from './components/details/CharacterDetails';
import { LocationDetails } from './components/details/LocationDetails';
import { SceneDetails } from './components/details/SceneDetails';
import { AssetGrid } from './components/AssetGrid';
import { AssetLightbox } from './components/AssetLightbox';
import { AssetUploadModal } from './components/AssetUploadModal/AssetUploadModal';
import { AssetGenerationView } from './components/AssetGenerationView/AssetGenerationView';
import { ToastContainer } from '@presentation/components/feedback';
import styles from './ProjectDetailPage.module.css';

type Item = Character | Location | Scene | null;
type CenterViewMode = 'grid' | 'generation';

interface ProjectDetailPageProps {
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
  assets: Asset[];
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
 * - Tab navigation (Characters/Locations/Scenes)
 * - List of items based on active tab
 * - Asset grid OR generation view showing media for selected character/location
 * - Details panel showing selected item
 */
export function ProjectDetailPage({
  characters,
  locations,
  scenes,
  assets,
}: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('characters');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightboxAsset, setLightboxAsset] = useState<Asset | null>(null);
  const [centerViewMode, setCenterViewMode] = useState<CenterViewMode>('grid');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [assetRefreshKey, setAssetRefreshKey] = useState(0);

  const getItems = () => {
    switch (activeTab) {
      case 'characters':
        return characters;
      case 'locations':
        return locations;
      case 'scenes':
        return scenes;
    }
  };

  const getSelectedItem = (): Item => {
    if (!selectedId) return null;
    switch (activeTab) {
      case 'characters':
        return characters.find((c) => c.id === selectedId) || null;
      case 'locations':
        return locations.find((l) => l.id === selectedId) || null;
      case 'scenes':
        return scenes.find((s) => s.id === selectedId) || null;
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedId(null); // Clear selection when switching tabs
    setCenterViewMode('grid'); // Reset to grid view
  };

  const getEntityAssets = (): Asset[] => {
    if (!selectedId) return [];
    if (activeTab === 'characters') {
      return assets.filter((a) => a.entityId === selectedId && a.entityType === 'character');
    }
    if (activeTab === 'locations') {
      return assets.filter((a) => a.entityId === selectedId && a.entityType === 'location');
    }
    return [];
  };

  const getEmptyMessage = (): string => {
    if (!selectedId) {
      if (activeTab === 'characters') return 'Select a character to view assets';
      if (activeTab === 'locations') return 'Select a location to view assets';
      return '';
    }
    if (activeTab === 'scenes') return 'Scenes do not have assets';
    return 'No assets available';
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

  const handleAssetCreated = () => {
    // Refresh assets
    setAssetRefreshKey((prev) => prev + 1);
    // Show success toast
    addToast('Asset created successfully!', 'success');
    // Return to grid view
    setCenterViewMode('grid');
  };

  const handleUploadSuccess = () => {
    // Refresh assets
    setAssetRefreshKey((prev) => prev + 1);
    // Show success toast
    addToast('Asset uploaded successfully!', 'success');
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const items = getItems();
  const selectedItem = getSelectedItem();
  const entityAssets = getEntityAssets();
  const emptyMessage = getEmptyMessage();

  const canCreateAssets = selectedId && activeTab !== 'scenes';
  const entityType = activeTab === 'characters' ? 'character' : 'location';

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* List Panel */}
      <ItemList
        items={items}
        selectedId={selectedId}
        activeTab={activeTab}
        onItemSelect={setSelectedId}
      />

      {/* Center Panel - Asset Grid OR Generation View */}
      <div className={styles.centerArea}>
        {centerViewMode === 'grid' ? (
          <AssetGrid
            key={assetRefreshKey}
            assets={entityAssets}
            onAssetClick={setLightboxAsset}
            emptyMessage={emptyMessage}
            onUploadClick={canCreateAssets ? handleUploadClick : undefined}
            onGenerateClick={canCreateAssets ? handleGenerateClick : undefined}
            showAddButton={canCreateAssets}
          />
        ) : (
          selectedId && (
            <AssetGenerationView
              entityId={selectedId}
              entityType={entityType}
              projectId="1"
              onBack={handleBackToGrid}
              onAssetCreated={handleAssetCreated}
            />
          )
        )}
      </div>

      {/* Details Panel */}
      <aside className={styles.detailsPanel}>
        {!selectedItem ? (
          <div className={styles.emptyDetails}>
            <p>Select {activeTab.slice(0, -1)} to view details</p>
          </div>
        ) : (
          <div className={styles.details}>
            {activeTab === 'characters' && (
              <CharacterDetails character={selectedItem as Character} />
            )}
            {activeTab === 'locations' && <LocationDetails location={selectedItem as Location} />}
            {activeTab === 'scenes' && <SceneDetails scene={selectedItem as Scene} />}
          </div>
        )}
      </aside>

      {/* Asset Lightbox Modal */}
      <AssetLightbox asset={lightboxAsset} onClose={() => setLightboxAsset(null)} />

      {/* Upload Modal */}
      {selectedId && canCreateAssets && (
        <AssetUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          entityId={selectedId}
          entityType={entityType}
          projectId="1"
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
