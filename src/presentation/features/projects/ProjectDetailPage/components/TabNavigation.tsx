import type { TabType } from '../types';
import Link from 'next/link';
import {
  getProjectCollectionsPath,
  getProjectScenesPath,
  getProjectShotsPath,
} from '@presentation/features/projects/routes';
import { Clapperboard, FolderTree, NotebookText } from 'lucide-react';
import styles from '../ProjectDetailPage.module.css';

interface TabNavigationProps {
  projectId: string;
  activeTab: TabType;
}

export function TabNavigation({ projectId, activeTab }: TabNavigationProps) {
  return (
    <nav className={styles.nav} aria-label="Project workspace tabs">
      <Link
        href={getProjectCollectionsPath(projectId)}
        className={`${styles.navButton} ${activeTab === 'collections' ? styles.active : ''}`}
        aria-label="Collections"
        title="Collections"
        aria-current={activeTab === 'collections' ? 'page' : undefined}
      >
        <FolderTree aria-hidden="true" size={18} strokeWidth={2} />
        <span className={styles.navButtonLabel}>Collections</span>
      </Link>
      <Link
        href={getProjectScenesPath(projectId)}
        className={`${styles.navButton} ${activeTab === 'scenes' ? styles.active : ''}`}
        aria-label="Scenes"
        title="Scenes"
        aria-current={activeTab === 'scenes' ? 'page' : undefined}
      >
        <NotebookText aria-hidden="true" size={18} strokeWidth={2} />
        <span className={styles.navButtonLabel}>Scenes</span>
      </Link>
      <Link
        href={getProjectShotsPath(projectId)}
        className={`${styles.navButton} ${activeTab === 'shots' ? styles.active : ''}`}
        aria-label="Shots"
        title="Shots"
        aria-current={activeTab === 'shots' ? 'page' : undefined}
      >
        <Clapperboard aria-hidden="true" size={18} strokeWidth={2} />
        <span className={styles.navButtonLabel}>Shots</span>
      </Link>
    </nav>
  );
}
