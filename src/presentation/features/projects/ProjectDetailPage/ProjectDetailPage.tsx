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
import styles from './ProjectDetailPage.module.css';

type Item = Character | Location | Scene | null;

interface ProjectDetailPageProps {
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
  assets: Asset[];
}

/**
 * ProjectDetailPage
 *
 * Orchestrates the four-panel layout for viewing project details:
 * - Tab navigation (Characters/Locations/Scenes)
 * - List of items based on active tab
 * - Asset grid showing media for selected character/location
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

  const items = getItems();
  const selectedItem = getSelectedItem();
  const entityAssets = getEntityAssets();
  const emptyMessage = getEmptyMessage();

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

      {/* Center Panel - Asset Grid */}
      <div className={styles.centerArea}>
        <AssetGrid
          assets={entityAssets}
          onAssetClick={setLightboxAsset}
          emptyMessage={emptyMessage}
        />
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
    </div>
  );
}
