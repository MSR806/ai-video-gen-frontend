'use client';

import { useState } from 'react';
import type { Character, Location, Scene } from '@core';
import type { TabType } from './types';
import { TabNavigation } from './components/TabNavigation';
import { ItemList } from './components/ItemList';
import { CharacterDetails } from './components/details/CharacterDetails';
import { LocationDetails } from './components/details/LocationDetails';
import { SceneDetails } from './components/details/SceneDetails';
import styles from './ProjectDetailPage.module.css';

type Item = Character | Location | Scene | null;

interface ProjectDetailPageProps {
  characters: Character[];
  locations: Location[];
  scenes: Scene[];
}

/**
 * ProjectDetailPage
 *
 * Orchestrates the four-panel layout for viewing project details:
 * - Tab navigation (Characters/Locations/Scenes)
 * - List of items based on active tab
 * - Empty center area (reserved for future use)
 * - Details panel showing selected item
 */
export function ProjectDetailPage({ characters, locations, scenes }: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('characters');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const items = getItems();
  const selectedItem = getSelectedItem();

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

      {/* Center Empty Area */}
      <div className={styles.centerArea}></div>

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
    </div>
  );
}
