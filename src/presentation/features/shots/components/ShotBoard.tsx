import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { CollectionItemRepository } from '@core/collection-item';
import type { Shot } from '@core/shot';
import type { ScreenplayScene } from '@core/screenplay';
import { Button } from '@presentation/components/ui';
import { useShotCollectionPreviews } from '../hooks/useShotCollectionPreviews';
import { ShotForm, type ShotFormValues } from './ShotForm';
import { ShotRow } from './ShotRow';
import styles from './ShotBoard.module.css';

interface ShotBoardProps {
  projectId: string;
  activeScene: ScreenplayScene | null;
  shots: Shot[];
  isSaving: boolean;
  isWorking: boolean;
  isGenerating: boolean;
  selectedShotIds: string[];
  shotVisualStatuses: Record<string, 'idle' | 'generating' | 'complete' | 'image' | 'failed'>;
  isBulkGeneratingVisuals: boolean;
  formMode: 'create' | 'edit' | null;
  initialFormValues: ShotFormValues;
  collectionItemRepository: CollectionItemRepository;
  onGenerateShots: () => Promise<void>;
  onToggleSelectAllShots: (selected: boolean) => void;
  onSelectShot: (shotId: string, selected: boolean) => void;
  onGenerateVisualForShot: (shotId: string) => Promise<void>;
  onGenerateVisualsForSelected: () => Promise<void>;
  onOpenCreate: () => void;
  onCancelForm: () => void;
  onSubmitForm: (values: ShotFormValues) => Promise<void>;
  onEditShot: (shot: Shot) => void;
  onDeleteShot: (shot: Shot) => Promise<void>;
}

interface ShotListProps {
  projectId: string;
  shots: Shot[];
  isWorking: boolean;
  selectedShotIds: string[];
  shotVisualStatuses: Record<string, 'idle' | 'generating' | 'complete' | 'image' | 'failed'>;
  onSelectShot: (shotId: string, selected: boolean) => void;
  onGenerateVisualForShot: (shotId: string) => Promise<void>;
  onEditShot: (shot: Shot) => void;
  onDeleteShot: (shot: Shot) => Promise<void>;
  collectionItemRepository: CollectionItemRepository;
}

function ShotList({
  projectId,
  shots,
  isWorking,
  selectedShotIds,
  shotVisualStatuses,
  onSelectShot,
  onGenerateVisualForShot,
  onEditShot,
  onDeleteShot,
  collectionItemRepository,
}: ShotListProps) {
  const [expandedShotId, setExpandedShotId] = useState<string | null>(null);
  const previewsByShotId = useShotCollectionPreviews(shots, collectionItemRepository);

  return (
    <div className={styles.list}>
      {shots.map((shot) => (
        <ShotRow
          key={shot.id}
          projectId={projectId}
          shot={shot}
          isWorking={isWorking}
          isSelected={selectedShotIds.includes(shot.id)}
          visualStatus={shotVisualStatuses[shot.id] ?? (shot.collectionId ? 'image' : 'idle')}
          collectionPreview={previewsByShotId[shot.id]}
          isExpanded={expandedShotId === shot.id}
          onToggleExpanded={(shotId) => {
            setExpandedShotId((currentShotId) => (currentShotId === shotId ? null : shotId));
          }}
          onSelectShot={onSelectShot}
          onGenerateVisual={onGenerateVisualForShot}
          onEdit={onEditShot}
          onDelete={onDeleteShot}
        />
      ))}
    </div>
  );
}

export function ShotBoard({
  projectId,
  activeScene,
  shots,
  isSaving,
  isWorking,
  isGenerating,
  selectedShotIds,
  shotVisualStatuses,
  isBulkGeneratingVisuals,
  formMode,
  initialFormValues,
  collectionItemRepository,
  onGenerateShots,
  onToggleSelectAllShots,
  onSelectShot,
  onGenerateVisualForShot,
  onGenerateVisualsForSelected,
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

  const allSelected = shots.length > 0 && selectedShotIds.length === shots.length;

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
          <Button
            type="button"
            variant="secondary"
            onClick={() => void onGenerateVisualsForSelected()}
            disabled={selectedShotIds.length === 0 || isSaving || isGenerating}
          >
            {isBulkGeneratingVisuals
              ? `Generating visuals (${selectedShotIds.length})`
              : `Generate selected visuals (${selectedShotIds.length})`}
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
        <>
          <div className={styles.selectionToolbar}>
            <label className={styles.selectAllLabel}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => onToggleSelectAllShots(event.target.checked)}
                aria-label="Select all shots"
              />
              <span>Select all</span>
            </label>
          </div>
          <ShotList
            key={activeScene.id}
            projectId={projectId}
            shots={shots}
            isWorking={isWorking}
            selectedShotIds={selectedShotIds}
            shotVisualStatuses={shotVisualStatuses}
            onSelectShot={onSelectShot}
            onGenerateVisualForShot={onGenerateVisualForShot}
            onEditShot={onEditShot}
            onDeleteShot={onDeleteShot}
            collectionItemRepository={collectionItemRepository}
          />
        </>
      )}
    </section>
  );
}
