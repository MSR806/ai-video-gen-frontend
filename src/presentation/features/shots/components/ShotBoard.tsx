import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { Shot } from '@core/shot';
import type { ScreenplayScene } from '@core/screenplay';
import { Button } from '@presentation/components/ui';
import { ShotForm, type ShotFormValues } from './ShotForm';
import { ShotRow } from './ShotRow';
import styles from './ShotBoard.module.css';

interface ShotBoardProps {
  activeScene: ScreenplayScene | null;
  shots: Shot[];
  isSaving: boolean;
  isWorking: boolean;
  isGenerating: boolean;
  formMode: 'create' | 'edit' | null;
  initialFormValues: ShotFormValues;
  onGenerateShots: () => Promise<void>;
  onOpenCreate: () => void;
  onCancelForm: () => void;
  onSubmitForm: (values: ShotFormValues) => Promise<void>;
  onEditShot: (shot: Shot) => void;
  onDeleteShot: (shot: Shot) => Promise<void>;
}

interface ShotListProps {
  shots: Shot[];
  isWorking: boolean;
  onEditShot: (shot: Shot) => void;
  onDeleteShot: (shot: Shot) => Promise<void>;
}

function ShotList({ shots, isWorking, onEditShot, onDeleteShot }: ShotListProps) {
  const [expandedShotId, setExpandedShotId] = useState<string | null>(null);

  return (
    <div className={styles.list}>
      {shots.map((shot) => (
        <ShotRow
          key={shot.id}
          shot={shot}
          isWorking={isWorking}
          isExpanded={expandedShotId === shot.id}
          onToggleExpanded={(shotId) => {
            setExpandedShotId((currentShotId) => (currentShotId === shotId ? null : shotId));
          }}
          onEdit={onEditShot}
          onDelete={onDeleteShot}
        />
      ))}
    </div>
  );
}

export function ShotBoard({
  activeScene,
  shots,
  isSaving,
  isWorking,
  isGenerating,
  formMode,
  initialFormValues,
  onGenerateShots,
  onOpenCreate,
  onCancelForm,
  onSubmitForm,
  onEditShot,
  onDeleteShot,
}: ShotBoardProps) {
  if (!activeScene) {
    return (
      <section className={styles.board}>
        <p className={styles.emptyMessage}>Select a scene to start building shots.</p>
      </section>
    );
  }

  return (
    <section className={styles.board} aria-label="Shots board">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Selected scene</p>
          <h2 className={styles.title}>{activeScene.name}</h2>
        </div>
        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void onGenerateShots()}
            disabled={isWorking || isGenerating || isSaving}
          >
            {shots.length === 0 ? 'Generate shots' : 'Regenerate shots'}
          </Button>

          {formMode === null ? (
            <Button
              type="button"
              variant="primary"
              onClick={onOpenCreate}
              disabled={isWorking || isGenerating}
            >
              <Plus aria-hidden="true" size={14} strokeWidth={2.6} />
              Add shot
            </Button>
          ) : null}
        </div>
      </header>

      {formMode !== null ? (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>{formMode === 'create' ? 'Add shot' : 'Edit shot'}</h3>
          <ShotForm
            initialValues={initialFormValues}
            submitLabel={formMode === 'create' ? 'Create shot' : 'Save shot'}
            isSubmitting={isSaving}
            onSubmit={(payload) => onSubmitForm(payload)}
            onCancel={onCancelForm}
          />
        </div>
      ) : null}

      {shots.length === 0 ? (
        <p className={styles.emptyMessage}>
          No shots yet for this scene. Generate shots or add one.
        </p>
      ) : (
        <ShotList
          key={activeScene.id}
          shots={shots}
          isWorking={isWorking}
          onEditShot={onEditShot}
          onDeleteShot={onDeleteShot}
        />
      )}
    </section>
  );
}
