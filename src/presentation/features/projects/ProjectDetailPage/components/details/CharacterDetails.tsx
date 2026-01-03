import type { Character } from '@core/character';
import styles from '../../ProjectDetailPage.module.css';

interface CharacterDetailsProps {
  character: Character;
}

export function CharacterDetails({ character }: CharacterDetailsProps) {
  return (
    <div className={styles.detailsContent}>
      <h2 className={styles.detailsTitle}>{character.name}</h2>
      <div className={styles.detailsSection}>
        <h3>Role</h3>
        <p>{character.role}</p>
      </div>
      <div className={styles.detailsSection}>
        <h3>Description</h3>
        <p>{character.description}</p>
      </div>
      {character.age && (
        <div className={styles.detailsSection}>
          <h3>Age</h3>
          <p>{character.age} years old</p>
        </div>
      )}
      <div className={styles.detailsSection}>
        <h3>Personality Traits</h3>
        <ul className={styles.traitsList}>
          {character.personalityTraits.map((trait, idx) => (
            <li key={idx} className={styles.trait}>
              {trait}
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.detailsSection}>
        <h3>Physical Description</h3>
        <p>{character.physicalDescription}</p>
      </div>
    </div>
  );
}
