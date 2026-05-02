'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreateShotUseCase,
  DeleteShotUseCase,
  GenerateSceneShotsUseCase,
  GetSceneShotsUseCase,
  type Shot,
  type ShotRepository,
  UpdateShotUseCase,
} from '@core/shot';
import {
  GetProjectScreenplayUseCase,
  type ScreenplayScene,
  type ScreenplayRepository,
} from '@core/screenplay';
import { ScreenplayRepositoryImpl, ShotRepositoryImpl } from '@infra/repositories';
import { SceneShotList } from './SceneShotList';
import { ShotBoard } from './ShotBoard';
import { EMPTY_SHOT_FORM_VALUES, type ShotFormValues } from './ShotForm';
import styles from './ShotsWorkspace.module.css';

interface ShotsWorkspaceProps {
  projectId: string;
  screenplayRepository?: ScreenplayRepository;
  shotRepository?: ShotRepository;
  createScreenplayRepository?: () => ScreenplayRepository;
  createShotRepository?: () => ShotRepository;
}

type ShotMap = Record<string, Shot[]>;

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
  createScreenplayRepository,
  createShotRepository,
}: ShotsWorkspaceProps) {
  const screenplayRepo = useMemo(
    () => screenplayRepository ?? createScreenplayRepository?.() ?? new ScreenplayRepositoryImpl(),
    [createScreenplayRepository, screenplayRepository],
  );
  const shotsRepo = useMemo(
    () => shotRepository ?? createShotRepository?.() ?? new ShotRepositoryImpl(),
    [createShotRepository, shotRepository],
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
      setScenes(loadedScenes);
      setShotsByScene(nextShotsByScene);
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
    } catch (error) {
      console.error('Failed to generate shots:', error);
      setErrorMessage('Failed to generate shots. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <p className={styles.stateMessage}>Loading shots workspace…</p>;
  }

  return (
    <div className={styles.workspace}>
      <SceneShotList
        scenes={scenes}
        activeSceneId={activeSceneId}
        shotCounts={shotCounts}
        onSceneSelect={setActiveSceneId}
      />

      <div className={styles.boardPane}>
        {errorMessage ? (
          <div className={styles.errorBanner} role="alert">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => void loadWorkspace()}>
              Retry
            </button>
          </div>
        ) : null}

        <ShotBoard
          activeScene={activeScene}
          shots={activeSceneShots}
          isSaving={isSaving}
          isWorking={isWorking || isGenerating}
          isGenerating={isGenerating}
          formMode={formMode}
          initialFormValues={initialFormValues}
          onGenerateShots={handleGenerateShots}
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
