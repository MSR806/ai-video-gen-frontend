import type { Location } from '@core/location';
import styles from '../../ProjectDetailPage.module.css';

interface LocationDetailsProps {
  location: Location;
}

export function LocationDetails({ location }: LocationDetailsProps) {
  return (
    <div className={styles.detailsContent}>
      <h2 className={styles.detailsTitle}>{location.name}</h2>
      <div className={styles.detailsSection}>
        <h3>Type</h3>
        <p className={styles.badge}>
          {location.locationType === 'interior' ? 'Interior' : 'Exterior'}
        </p>
      </div>
      <div className={styles.detailsSection}>
        <h3>Description</h3>
        <p>{location.description}</p>
      </div>
      <div className={styles.detailsSection}>
        <h3>Mood</h3>
        <p>{location.mood}</p>
      </div>
      {location.timeOfDay && (
        <div className={styles.detailsSection}>
          <h3>Time of Day</h3>
          <p className={styles.timeOfDay}>
            {location.timeOfDay.charAt(0).toUpperCase() + location.timeOfDay.slice(1)}
          </p>
        </div>
      )}
    </div>
  );
}
