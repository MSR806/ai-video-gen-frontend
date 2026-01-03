import type { Scene } from '@core/scene';
import styles from '../../ProjectDetailPage.module.css';

interface SceneDetailsProps {
  scene: Scene;
}

export function SceneDetails({ scene }: SceneDetailsProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.detailsContent}>
      <h2 className={styles.detailsTitle}>{scene.name}</h2>
      <div className={styles.detailsSection}>
        <h3>Description</h3>
        <p>{scene.description}</p>
      </div>
      <div className={styles.detailsSection}>
        <h3>Duration</h3>
        <p>{formatDuration(scene.duration)}</p>
      </div>
      <div className={styles.detailsSection}>
        <h3>Objective</h3>
        <p>{scene.objective}</p>
      </div>
      <div className={styles.detailsSection}>
        <h3>Characters</h3>
        <p>{scene.characterIds.length} character(s)</p>
      </div>
    </div>
  );
}
