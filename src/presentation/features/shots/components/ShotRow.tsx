import { ChevronDown, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Dropdown, DropdownItem } from '@presentation/components/ui';
import type { Shot } from '@core/shot';
import styles from './ShotRow.module.css';

interface ShotRowProps {
  shot: Shot;
  isWorking: boolean;
  isExpanded: boolean;
  onToggleExpanded: (shotId: string) => void;
  onEdit: (shot: Shot) => void;
  onDelete: (shot: Shot) => Promise<void>;
}

const MAX_TAG_WORDS = 3;

const splitOnMeaningfulBreak = (value: string): string => {
  const [firstSegment] = value
    .split(/\s+(?:and|as|while|with|of|on|at|for)\s+|[,;:]/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return firstSegment ?? value.trim();
};

const trimWords = (value: string, maxWords = MAX_TAG_WORDS): string => {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return value.trim();
  }

  return words.slice(0, maxWords).join(' ');
};

const toTitleCase = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const summarizeFraming = (value: string): string | null => {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  if (!normalized) return null;
  if (lower.includes('extreme close')) return 'Extreme close-up';
  if (lower.includes('close-up') || lower.includes('close up')) return 'Close-up';
  if (lower.includes('over-the-shoulder') || lower.includes('over the shoulder')) {
    return 'Over-the-shoulder';
  }
  if (lower.includes('wide') && lower.includes('establish')) return 'Wide establishing';
  if (lower.includes('establish')) return 'Establishing shot';
  if (lower.includes('wide')) return lower.includes('shot') ? 'Wide shot' : 'Wide';
  if (lower.includes('long')) return lower.includes('shot') ? 'Long shot' : 'Long';
  if (lower.includes('medium')) return lower.includes('shot') ? 'Medium shot' : 'Medium';

  return trimWords(splitOnMeaningfulBreak(normalized));
};

const summarizeMovement = (value: string): string | null => {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  if (!normalized) return null;
  if (lower.includes('static') || lower.includes('locked')) return 'Static';
  if ((lower.includes('slow') || lower.includes('subtle')) && lower.includes('push')) {
    return `${toTitleCase(lower.includes('slow') ? 'slow' : 'subtle')} push-in`;
  }
  if (lower.includes('push') || lower.includes('dolly in')) return 'Push-in';
  if (lower.includes('tilt')) return lower.includes('subtle') ? 'Subtle tilt' : 'Tilt';
  if (lower.includes('pan')) return lower.includes('gentle') ? 'Gentle pan' : 'Pan';
  if (lower.includes('track')) return 'Tracking';
  if (lower.includes('handheld')) return 'Handheld';

  return trimWords(splitOnMeaningfulBreak(normalized));
};

const summarizeMood = (value: string): string | null => {
  const normalized = value.trim();

  if (!normalized) return null;

  return trimWords(splitOnMeaningfulBreak(normalized), 2);
};

const buildSummaryTags = (shot: Shot): string[] =>
  [
    summarizeFraming(shot.cameraFraming),
    summarizeMovement(shot.cameraMovement),
    summarizeMood(shot.mood),
  ]
    .filter((tag): tag is string => Boolean(tag))
    .slice(0, 3);

export function ShotRow({
  shot,
  isWorking,
  isExpanded,
  onToggleExpanded,
  onEdit,
  onDelete,
}: ShotRowProps) {
  const detailsId = useId();
  const summaryTags = buildSummaryTags(shot);

  return (
    <article className={`${styles.row} ${isExpanded ? styles.expanded : ''}`}>
      <div className={styles.summary}>
        <button
          type="button"
          className={styles.summaryButton}
          aria-expanded={isExpanded}
          aria-controls={detailsId}
          aria-label={
            isExpanded ? `Hide details for ${shot.title}` : `Show details for ${shot.title}`
          }
          onClick={() => onToggleExpanded(shot.id)}
        >
          <ChevronDown
            className={styles.expandIcon}
            aria-hidden="true"
            size={18}
            strokeWidth={2.4}
          />

          <span className={styles.orderBadge}>#{shot.orderIndex}</span>

          <span className={styles.summaryCopy}>
            <span className={styles.title}>{shot.title}</span>
            <span className={styles.preview}>{shot.description}</span>
            {summaryTags.length > 0 ? (
              <span className={styles.tagList} aria-label={`Shot ${shot.orderIndex} summary`}>
                {summaryTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </span>
            ) : null}
          </span>
        </button>

        <Dropdown
          menuClassName={styles.actionMenu}
          trigger={
            <MoreVertical
              className={styles.menuIcon}
              aria-hidden="true"
              size={16}
              strokeWidth={2.2}
            />
          }
          triggerClassName={styles.menuButton}
          triggerAriaLabel={isWorking ? `Updating ${shot.title}` : `Open actions for ${shot.title}`}
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

      {isExpanded ? (
        <div id={detailsId} className={styles.details}>
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
        </div>
      ) : null}
    </article>
  );
}
