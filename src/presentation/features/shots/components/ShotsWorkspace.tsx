'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CollectionItemRepository } from '@core/collection-item';
import {
  CreateShotUseCase,
  DeleteShotUseCase,
  GenerateSceneShotsUseCase,
  GenerateShotVisualsUseCase,
  GetSceneShotsUseCase,
  type GenerateShotVisualsPayload,
  type Shot,
  type ShotRepository,
  type ShotVisualGenerationResult,
  UpdateShotUseCase,
} from '@core/shot';
import {
  GetProjectScreenplayUseCase,
  type ScreenplayScene,
  type ScreenplayRepository,
} from '@core/screenplay';
import {
  CollectionItemRepositoryImpl,
  ScreenplayRepositoryImpl,
  ShotRepositoryImpl,
} from '@infra/repositories';
import { ShotBoard } from './ShotBoard';
import { EMPTY_SHOT_FORM_VALUES, type ShotFormValues } from './ShotForm';
import styles from './ShotsWorkspace.module.css';

interface ShotsWorkspaceProps {
  projectId: string;
  screenplayRepository?: ScreenplayRepository;
  shotRepository?: ShotRepository;
  collectionItemRepository?: CollectionItemRepository;
  createScreenplayRepository?: () => ScreenplayRepository;
  createShotRepository?: () => ShotRepository;
  createCollectionItemRepository?: () => CollectionItemRepository;
}

type ShotMap = Record<string, Shot[]>;
type ShotVisualStatus = 'idle' | 'generating' | 'complete' | 'image' | 'failed';

const VISUAL_GENERATION_PAYLOAD_DEFAULTS: Pick<
  GenerateShotVisualsPayload,
  'modelKey' | 'operationKey'
> = {
  modelKey: 'nano_banana',
  operationKey: 'text_to_image',
};

const reindexShotsInCurrentOrder = (shots: Shot[]): Shot[] => {
  return shots.map((shot, index) => ({
    ...shot,
    orderIndex: index + 1,
  }));
};

const sortAndReindexShots = (shots: Shot[]): Shot[] => {
  const ordered = [...shots].sort((a, b) => a.orderIndex - b.orderIndex);
  return reindexShotsInCurrentOrder(ordered);
};

const shotToFormValues = (shot: Shot): ShotFormValues => ({
  title: shot.title,
  description: shot.description,
  cameraFraming: shot.cameraFraming,
  cameraMovement: shot.cameraMovement,
  mood: shot.mood,
});

export function ShotsWorkspace({
  projectId,
  screenplayRepository,
  shotRepository,
  collectionItemRepository,
  createScreenplayRepository,
  createShotRepository,
  createCollectionItemRepository,
}: ShotsWorkspaceProps) {
  const screenplayRepo = useMemo(
    () => screenplayRepository ?? createScreenplayRepository?.() ?? new ScreenplayRepositoryImpl(),
    [createScreenplayRepository, screenplayRepository],
  );
  const shotsRepo = useMemo(
    () => shotRepository ?? createShotRepository?.() ?? new ShotRepositoryImpl(),
    [createShotRepository, shotRepository],
  );
  const collectionItemsRepo = useMemo(
    () =>
      collectionItemRepository ??
      createCollectionItemRepository?.() ??
      new CollectionItemRepositoryImpl(),
    [collectionItemRepository, createCollectionItemRepository],
  );

  const [scenes, setScenes] = useState<ScreenplayScene[]>([]);
  const [shotsByScene, setShotsByScene] = useState<ShotMap>({});
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingShotId, setEditingShotId] = useState<string | null>(null);
  const [selectedShotIdsByScene, setSelectedShotIdsByScene] = useState<Record<string, string[]>>(
    {},
  );
  const [shotVisualStatusesByScene, setShotVisualStatusesByScene] = useState<
    Record<string, Record<string, ShotVisualStatus>>
  >({});
  const [isBulkGeneratingVisuals, setIsBulkGeneratingVisuals] = useState(false);

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const getScreenplayUseCase = new GetProjectScreenplayUseCase(screenplayRepo);
      const getSceneShotsUseCase = new GetSceneShotsUseCase(shotsRepo);
      const screenplay = await getScreenplayUseCase.execute(projectId);
      const loadedScenes = screenplay?.scenes ?? [];

      if (loadedScenes.length === 0) {
        setScenes([]);
        setShotsByScene({});
        setActiveSceneId(null);
        return;
      }

      const shotEntries = await Promise.all(
        loadedScenes.map(async (scene) => {
          const sceneShots = await getSceneShotsUseCase.execute(projectId, scene.id);
          return [scene.id, sortAndReindexShots(sceneShots)] as const;
        }),
      );

      const nextShotsByScene = Object.fromEntries(shotEntries);
      const nextShotVisualStatusesByScene: Record<
        string,
        Record<string, ShotVisualStatus>
      > = Object.fromEntries(
        loadedScenes.map((scene) => [
          scene.id,
          Object.fromEntries(
            (nextShotsByScene[scene.id] ?? []).map((shot) => [
              shot.id,
              shot.collectionId ? 'image' : 'idle',
            ]),
          ) as Record<string, ShotVisualStatus>,
        ]),
      );

      setScenes(loadedScenes);
      setShotsByScene(nextShotsByScene);
      setSelectedShotIdsByScene(Object.fromEntries(loadedScenes.map((scene) => [scene.id, []])));
      setShotVisualStatusesByScene(nextShotVisualStatusesByScene);
      setActiveSceneId((previous) =>
        previous && loadedScenes.some((scene) => scene.id === previous)
          ? previous
          : loadedScenes[0].id,
      );
    } catch (error) {
      console.error('Failed to load shots workspace:', error);
      setErrorMessage('Failed to load shots workspace. Please retry.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, screenplayRepo, shotsRepo]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const activeScene = useMemo(
    () => scenes.find((scene) => scene.id === activeSceneId) ?? null,
    [activeSceneId, scenes],
  );
  const activeSceneShots = useMemo(
    () => (activeSceneId ? (shotsByScene[activeSceneId] ?? []) : []),
    [activeSceneId, shotsByScene],
  );
  const shotCounts = useMemo(
    () => new Map(scenes.map((scene) => [scene.id, shotsByScene[scene.id]?.length ?? 0])),
    [scenes, shotsByScene],
  );
  const editingShot = useMemo(
    () => activeSceneShots.find((shot) => shot.id === editingShotId) ?? null,
    [activeSceneShots, editingShotId],
  );
  const initialFormValues = editingShot ? shotToFormValues(editingShot) : EMPTY_SHOT_FORM_VALUES;
  const selectedShotIds = activeSceneId ? (selectedShotIdsByScene[activeSceneId] ?? []) : [];
  const shotVisualStatuses = activeSceneId ? (shotVisualStatusesByScene[activeSceneId] ?? {}) : {};

  const resetFormState = useCallback(() => {
    setFormMode(null);
    setEditingShotId(null);
  }, []);

  useEffect(() => {
    resetFormState();
  }, [activeSceneId, resetFormState]);

  const handleSubmitForm = async (values: ShotFormValues): Promise<void> => {
    if (!activeSceneId) {
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      if (formMode === 'create') {
        const createShotUseCase = new CreateShotUseCase(shotsRepo);
        const createdShot = await createShotUseCase.execute(projectId, activeSceneId, values);
        setShotsByScene((previous) => ({
          ...previous,
          [activeSceneId]: sortAndReindexShots([...(previous[activeSceneId] ?? []), createdShot]),
        }));
        setShotVisualStatusesByScene((previous) => ({
          ...previous,
          [activeSceneId]: {
            ...(previous[activeSceneId] ?? {}),
            [createdShot.id]: createdShot.collectionId ? 'image' : 'idle',
          },
        }));
      } else if (formMode === 'edit' && editingShotId) {
        const updateShotUseCase = new UpdateShotUseCase(shotsRepo);
        const updatedShot = await updateShotUseCase.execute(
          projectId,
          activeSceneId,
          editingShotId,
          values,
        );
        setShotsByScene((previous) => ({
          ...previous,
          [activeSceneId]: sortAndReindexShots(
            (previous[activeSceneId] ?? []).map((shot) =>
              shot.id === editingShotId ? { ...shot, ...updatedShot } : shot,
            ),
          ),
        }));
      }

      resetFormState();
    } catch (error) {
      console.error('Failed to save shot:', error);
      setErrorMessage('Failed to save shot. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShot = async (shot: Shot): Promise<void> => {
    if (!activeSceneId) {
      return;
    }

    setErrorMessage(null);
    setIsWorking(true);

    try {
      const deleteShotUseCase = new DeleteShotUseCase(shotsRepo);
      await deleteShotUseCase.execute(projectId, activeSceneId, shot.id);

      setShotsByScene((previous) => ({
        ...previous,
        [activeSceneId]: reindexShotsInCurrentOrder(
          (previous[activeSceneId] ?? []).filter((currentShot) => currentShot.id !== shot.id),
        ),
      }));
      setSelectedShotIdsByScene((previous) => ({
        ...previous,
        [activeSceneId]: (previous[activeSceneId] ?? []).filter((id) => id !== shot.id),
      }));
      setShotVisualStatusesByScene((previous) => {
        const sceneStatuses = { ...(previous[activeSceneId] ?? {}) };
        delete sceneStatuses[shot.id];
        return {
          ...previous,
          [activeSceneId]: sceneStatuses,
        };
      });

      if (editingShotId === shot.id) {
        resetFormState();
      }
    } catch (error) {
      console.error('Failed to delete shot:', error);
      setErrorMessage('Failed to delete shot. Please try again.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleGenerateShots = async (): Promise<void> => {
    if (!activeSceneId) {
      return;
    }

    const hasExistingShots = activeSceneShots.length > 0;
    if (hasExistingShots) {
      const confirmed = window.confirm(
        'Regenerating shots will replace the existing shots for this scene. Continue?',
      );
      if (!confirmed) {
        return;
      }
    }

    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const generateSceneShotsUseCase = new GenerateSceneShotsUseCase(shotsRepo);
      const generatedShots = await generateSceneShotsUseCase.execute(projectId, activeSceneId);

      resetFormState();
      setShotsByScene((previous) => ({
        ...previous,
        [activeSceneId]: sortAndReindexShots(generatedShots),
      }));
      setSelectedShotIdsByScene((previous) => ({
        ...previous,
        [activeSceneId]: [],
      }));
      setShotVisualStatusesByScene((previous) => ({
        ...previous,
        [activeSceneId]: Object.fromEntries(
          generatedShots.map((shot) => [shot.id, shot.collectionId ? 'image' : 'idle']),
        ) as Record<string, ShotVisualStatus>,
      }));
    } catch (error) {
      console.error('Failed to generate shots:', error);
      setErrorMessage('Failed to generate shots. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateShotStatuses = useCallback(
    (
      sceneId: string,
      shotIds: string[],
      resultByShotId?: Map<string, ShotVisualGenerationResult>,
      failureFallback = false,
    ) => {
      setShotVisualStatusesByScene((previous) => {
        const currentSceneStatuses = previous[sceneId] ?? {};
        const nextSceneStatuses = { ...currentSceneStatuses };

        shotIds.forEach((shotId) => {
          const responseEntry = resultByShotId?.get(shotId);
          if (!responseEntry) {
            nextSceneStatuses[shotId] = failureFallback
              ? 'failed'
              : (currentSceneStatuses[shotId] ?? 'idle');
            return;
          }

          if (responseEntry.error || responseEntry.status.toLowerCase().includes('fail')) {
            nextSceneStatuses[shotId] = 'failed';
            return;
          }

          if (responseEntry.collectionId) {
            nextSceneStatuses[shotId] = 'image';
            return;
          }

          nextSceneStatuses[shotId] = 'complete';
        });

        return {
          ...previous,
          [sceneId]: nextSceneStatuses,
        };
      });
    },
    [],
  );

  const requestGenerateVisuals = useCallback(
    async (sceneId: string, shotIds: string[]) => {
      setShotVisualStatusesByScene((previous) => {
        const sceneStatuses = previous[sceneId] ?? {};
        const nextSceneStatuses = { ...sceneStatuses };
        shotIds.forEach((shotId) => {
          nextSceneStatuses[shotId] = 'generating';
        });
        return {
          ...previous,
          [sceneId]: nextSceneStatuses,
        };
      });

      try {
        const generateShotVisualsUseCase = new GenerateShotVisualsUseCase(shotsRepo);
        const result = await generateShotVisualsUseCase.execute(projectId, sceneId, {
          shotIds,
          ...VISUAL_GENERATION_PAYLOAD_DEFAULTS,
        });
        const resultByShotId = new Map(result.map((entry) => [entry.shotId, entry]));
        setShotsByScene((previous) => ({
          ...previous,
          [sceneId]: (previous[sceneId] ?? []).map((shot) => {
            const responseEntry = resultByShotId.get(shot.id);
            if (!responseEntry?.collectionId) {
              return shot;
            }
            return {
              ...shot,
              collectionId: responseEntry.collectionId,
            };
          }),
        }));
        updateShotStatuses(sceneId, shotIds, resultByShotId, true);
      } catch (error) {
        console.error('Failed to generate visuals:', error);
        updateShotStatuses(sceneId, shotIds, undefined, true);
        setErrorMessage('Failed to generate visuals. Please try again.');
      }
    },
    [projectId, shotsRepo, updateShotStatuses],
  );

  const handleSelectShot = (shotId: string, selected: boolean): void => {
    if (!activeSceneId) {
      return;
    }

    setSelectedShotIdsByScene((previous) => {
      const current = previous[activeSceneId] ?? [];
      const next = selected
        ? Array.from(new Set([...current, shotId]))
        : current.filter((id) => id !== shotId);
      return {
        ...previous,
        [activeSceneId]: next,
      };
    });
  };

  const handleToggleSelectAllShots = (selected: boolean): void => {
    if (!activeSceneId) {
      return;
    }

    setSelectedShotIdsByScene((previous) => ({
      ...previous,
      [activeSceneId]: selected ? activeSceneShots.map((shot) => shot.id) : [],
    }));
  };

  const handleGenerateVisualForShot = async (shotId: string): Promise<void> => {
    if (!activeSceneId) {
      return;
    }

    setErrorMessage(null);
    await requestGenerateVisuals(activeSceneId, [shotId]);
  };

  const handleGenerateVisualsForSelected = async (): Promise<void> => {
    if (!activeSceneId || selectedShotIds.length === 0) {
      return;
    }

    setErrorMessage(null);
    setIsBulkGeneratingVisuals(true);
    try {
      await requestGenerateVisuals(activeSceneId, selectedShotIds);
    } finally {
      setIsBulkGeneratingVisuals(false);
    }
  };

  if (isLoading) {
    return <p className={styles.stateMessage}>Loading shots workspace…</p>;
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.boardPane}>
        {scenes.length > 0 ? (
          <div className={styles.sceneSelectorRow}>
            <label className={styles.sceneSelectorLabel} htmlFor="scene-selector">
              Scene
            </label>
            <select
              id="scene-selector"
              className={styles.sceneSelector}
              value={activeSceneId ?? ''}
              onChange={(event) => setActiveSceneId(event.target.value)}
              aria-label="Select scene"
            >
              {scenes.map((scene) => {
                const shotCount = shotCounts.get(scene.id) ?? 0;
                return (
                  <option key={scene.id} value={scene.id}>
                    {`${scene.name} (${shotCount} shots)`}
                  </option>
                );
              })}
            </select>
          </div>
        ) : null}

        {errorMessage ? (
          <div className={styles.errorBanner} role="alert">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => void loadWorkspace()}>
              Retry
            </button>
          </div>
        ) : null}

        <ShotBoard
          projectId={projectId}
          activeScene={activeScene}
          shots={activeSceneShots}
          isSaving={isSaving}
          isWorking={isWorking || isGenerating}
          isGenerating={isGenerating}
          selectedShotIds={selectedShotIds}
          shotVisualStatuses={shotVisualStatuses}
          isBulkGeneratingVisuals={isBulkGeneratingVisuals}
          formMode={formMode}
          initialFormValues={initialFormValues}
          collectionItemRepository={collectionItemsRepo}
          onGenerateShots={handleGenerateShots}
          onToggleSelectAllShots={handleToggleSelectAllShots}
          onSelectShot={handleSelectShot}
          onGenerateVisualForShot={handleGenerateVisualForShot}
          onGenerateVisualsForSelected={handleGenerateVisualsForSelected}
          onOpenCreate={() => {
            setEditingShotId(null);
            setFormMode('create');
          }}
          onCancelForm={resetFormState}
          onSubmitForm={handleSubmitForm}
          onEditShot={(shot) => {
            setEditingShotId(shot.id);
            setFormMode('edit');
          }}
          onDeleteShot={handleDeleteShot}
        />
      </div>
    </div>
  );
}
