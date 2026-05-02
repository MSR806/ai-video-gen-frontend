import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { Dropdown, DropdownItem } from '@presentation/components/ui';
import type { Shot } from '@core/shot';
import styles from './ShotCard.module.css';

interface ShotCardProps {
  shot: Shot;
  isMoveUpDisabled: boolean;
  isMoveDownDisabled: boolean;
  isWorking: boolean;
  onEdit: (shot: Shot) => void;
  onDelete: (shot: Shot) => Promise<void>;
  onMoveUp: (shot: Shot) => Promise<void>;
  onMoveDown: (shot: Shot) => Promise<void>;
}

export function ShotCard({
  shot,
  isMoveUpDisabled,
  isMoveDownDisabled,
  isWorking,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ShotCardProps) {
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <span className={styles.orderBadge}>#{shot.orderIndex}</span>
          <h3 className={styles.title}>{shot.title}</h3>
        </div>
        <div className={styles.reorderActions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => void onMoveUp(shot)}
            disabled={isWorking || isMoveUpDisabled}
            aria-label={`Move ${shot.title} up`}
          >
            <ArrowUp aria-hidden="true" size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => void onMoveDown(shot)}
            disabled={isWorking || isMoveDownDisabled}
            aria-label={`Move ${shot.title} down`}
          >
            <ArrowDown aria-hidden="true" size={14} strokeWidth={2.5} />
          </button>
          <Dropdown
            menuClassName={styles.actionMenu}
            trigger={<span aria-hidden="true">⋮</span>}
            triggerClassName={styles.menuButton}
            triggerAriaLabel={
              isWorking ? `Updating ${shot.title}` : `Open actions for ${shot.title}`
            }
            disabled={isWorking}
          >
            <DropdownItem
              icon={<Pencil aria-hidden="true" size={14} strokeWidth={2.4} />}
              label="Edit"
              className={styles.actionItem}
              onClick={() => onEdit(shot)}
              disabled={isWorking}
            />
            <div className={styles.menuDivider} role="separator" aria-orientation="horizontal" />
            <DropdownItem
              icon={<Trash2 aria-hidden="true" size={14} strokeWidth={2.3} />}
              label="Delete"
              className={styles.actionItem}
              danger
              onClick={() => void onDelete(shot)}
              disabled={isWorking}
            />
          </Dropdown>
        </div>
      </header>

      <p className={styles.description}>{shot.description}</p>

      <dl className={styles.metaList}>
        <div className={styles.metaItem}>
          <dt>Framing</dt>
          <dd>{shot.cameraFraming || '-'}</dd>
        </div>
        <div className={styles.metaItem}>
          <dt>Movement</dt>
          <dd>{shot.cameraMovement || '-'}</dd>
        </div>
        <div className={styles.metaItem}>
          <dt>Mood</dt>
          <dd>{shot.mood || '-'}</dd>
        </div>
      </dl>
    </article>
  );
}
