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
        className={`${styles.navButton} ${activeTab === 'collections' ? styles.active : ''}`}
        onClick={() => onTabChange('collections')}
        title="Collections"
      >
        🗂️
      </button>
      <button
        className={`${styles.navButton} ${activeTab === 'scenes' ? styles.active : ''}`}
        onClick={() => onTabChange('scenes')}
        title="Scenes"
      >
        📝
      </button>
      <button
        className={`${styles.navButton} ${activeTab === 'shots' ? styles.active : ''}`}
        onClick={() => onTabChange('shots')}
        title="Shots"
      >
        🎬
      </button>
    </nav>
  );
}
