import type { TabType } from '../types';
import Link from 'next/link';
import {
  getProjectCollectionsPath,
  getProjectScenesPath,
  getProjectShotsPath,
} from '@presentation/features/projects/routes';
import styles from '../ProjectDetailPage.module.css';

interface TabNavigationProps {
  projectId: string;
  activeTab: TabType;
}

export function TabNavigation({ projectId, activeTab }: TabNavigationProps) {
  return (
    <nav className={styles.nav}>
      <Link
        href={getProjectCollectionsPath(projectId)}
        className={`${styles.navButton} ${activeTab === 'collections' ? styles.active : ''}`}
        title="Collections"
      >
        🗂️
      </Link>
      <Link
        href={getProjectScenesPath(projectId)}
        className={`${styles.navButton} ${activeTab === 'scenes' ? styles.active : ''}`}
        title="Scenes"
      >
        📝
      </Link>
      <Link
        href={getProjectShotsPath(projectId)}
        className={`${styles.navButton} ${activeTab === 'shots' ? styles.active : ''}`}
        title="Shots"
      >
        🎬
      </Link>
    </nav>
  );
}
