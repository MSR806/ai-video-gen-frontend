import type { Scene } from '@core/scene';
import styles from '../../ProjectDetailPage.module.css';

interface SceneDetailsProps {
  scene: Scene;
}

export function SceneDetails({ scene }: SceneDetailsProps) {
  return (
    <div className={styles.detailsContent}>
      <h2 className={styles.detailsTitle}>{scene.name}</h2>
      <div className={styles.detailsSection}>
        <h3>Content Prefix</h3>
        <p>Edit in Screenplay view</p>
      </div>
      <div className={styles.detailsSection}>
        <h3>Characters</h3>
        <p>{scene.characterIds.length} character(s)</p>
      </div>
    </div>
  );
}
