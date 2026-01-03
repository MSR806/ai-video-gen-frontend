import type { TabType } from '../types';
import styles from '../ProjectDetailPage.module.css';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <nav className={styles.nav}>
      <button
        className={`${styles.navButton} ${activeTab === 'characters' ? styles.active : ''}`}
        onClick={() => onTabChange('characters')}
        title="Characters"
      >
        👤
      </button>
      <button
        className={`${styles.navButton} ${activeTab === 'locations' ? styles.active : ''}`}
        onClick={() => onTabChange('locations')}
        title="Locations"
      >
        📍
      </button>
      <button
        className={`${styles.navButton} ${activeTab === 'scenes' ? styles.active : ''}`}
        onClick={() => onTabChange('scenes')}
        title="Scenes"
      >
        🎬
      </button>
    </nav>
  );
}
