import type { ScreenplayScene } from '@core/screenplay';
import styles from './SceneShotList.module.css';

interface SceneShotListProps {
  scenes: ScreenplayScene[];
  activeSceneId: string | null;
  shotCounts: Map<string, number>;
  onSceneSelect: (sceneId: string) => void;
}

export function SceneShotList({
  scenes,
  activeSceneId,
  shotCounts,
  onSceneSelect,
}: SceneShotListProps) {
  return (
    <section className={styles.panel} aria-label="Scenes">
      <header className={styles.header}>
        <h2 className={styles.title}>Scenes</h2>
      </header>

      {scenes.length === 0 ? (
        <p className={styles.empty}>No scenes available yet.</p>
      ) : (
        <ul className={styles.list}>
          {scenes.map((scene) => {
            const isActive = scene.id === activeSceneId;
            const shotCount = shotCounts.get(scene.id) ?? 0;
            return (
              <li key={scene.id}>
                <button
                  type="button"
                  className={`${styles.sceneButton} ${isActive ? styles.sceneButtonActive : ''}`}
                  onClick={() => onSceneSelect(scene.id)}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span className={styles.sceneLabel}>{scene.name}</span>
                  <span className={styles.sceneCount}>{shotCount} shots</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
