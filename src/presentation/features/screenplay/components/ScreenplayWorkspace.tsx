'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AddScreenplaySceneUseCase,
  CreateScreenplayUseCase,
  DeleteScreenplaySceneUseCase,
  GetProjectScreenplayUseCase,
  ReorderScreenplayScenesUseCase,
  createEmptySceneXml,
  parseSceneXmlBlocks,
  serializeSceneXmlBlocks,
  type ScreenplayRepository,
  type Screenplay,
  type ScreenplayScene,
  UpdateScreenplaySceneUseCase,
  UpdateScreenplayUseCase,
} from '@core/screenplay';
import { BackendApiError } from '@infra/http/backend-api';
import { ScreenplayRepositoryImpl } from '@infra/repositories';
import { AlertTriangle, ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { ScreenplayTipTapEditor } from './ScreenplayTipTapEditor';
import styles from './ScreenplayWorkspace.module.css';
import {
  ensureSceneHasBlocks,
  getCharacterCueSuggestionsFromScenes,
  reorder,
  validateScene,
} from './screenplay-editor.utils';
import {
  createProvisionalSceneId,
  isSceneContentEqual,
  isProvisionalSceneId,
} from './screenplay-tiptap.adapter';

interface ScreenplayWorkspaceProps {
  projectId: string;
  // Test-only DI seam for deterministic repository behavior in component tests.
  screenplayRepository?: ScreenplayRepository;
  createScreenplayRepository?: () => ScreenplayRepository;
  onContextChange?: (context: {
    screenplayId: string | null;
    activeSceneId: string | null;
    isReady: boolean;
  }) => void;
}

export interface ScreenplayWorkspaceHandle {
  flushPendingUpdates: () => Promise<void>;
  getScreenplaySnapshot: () => Screenplay | null;
  getScreenplayId: () => string | null;
  getActiveSceneId: () => string | null;
  applyRemoteScreenplay: (updatedScreenplay: Screenplay) => Promise<void>;
}

const SAVE_DEBOUNCE_MS = 700;

export const ScreenplayWorkspace = forwardRef<ScreenplayWorkspaceHandle, ScreenplayWorkspaceProps>(
  function ScreenplayWorkspace(
    {
      projectId,
      screenplayRepository,
      createScreenplayRepository,
      onContextChange,
    }: ScreenplayWorkspaceProps,
    ref,
  ) {
    // Allow tests to provide an isolated repository and avoid cross-test module singleton state.
    const repository = useMemo(
      () =>
        screenplayRepository ?? createScreenplayRepository?.() ?? new ScreenplayRepositoryImpl(),
      [createScreenplayRepository, screenplayRepository],
    );
    const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
    const [activeSceneId, setActiveSceneId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);
    const [isAutosaving, setIsAutosaving] = useState(false);
    const [workspaceError, setWorkspaceError] = useState<string | null>(null);
    const [sceneSyncNotice, setSceneSyncNotice] = useState<string | null>(null);

    const screenplayRef = useRef<Screenplay | null>(null);
    const activeSceneIdRef = useRef('');
    const isMountedRef = useRef(true);
    const pendingScenePatchesRef = useRef<Map<string, { content: ScreenplayScene['content'] }>>(
      new Map(),
    );
    const pendingSceneDeletionIdsRef = useRef<Set<string>>(new Set());
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFlushingRef = useRef(false);
    const flushInFlightPromiseRef = useRef<Promise<void> | null>(null);
    const flushPendingSceneUpdatesRef = useRef<() => Promise<void>>(async () => {});

    useEffect(() => {
      screenplayRef.current = screenplay;
    }, [screenplay]);

    useEffect(() => {
      activeSceneIdRef.current = activeSceneId;
    }, [activeSceneId]);

    useEffect(() => {
      if (!screenplay) {
        return;
      }

      if (screenplay.scenes.some((scene) => scene.id === activeSceneId)) {
        return;
      }

      setActiveSceneId(screenplay.scenes[0]?.id ?? '');
    }, [activeSceneId, screenplay]);

    const scheduleAutosaveFlush = useCallback(() => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        void flushPendingSceneUpdatesRef.current();
      }, SAVE_DEBOUNCE_MS);
    }, []);

    const queueScenePatch = useCallback(
      (sceneId: string, content: ScreenplayScene['content']) => {
        pendingSceneDeletionIdsRef.current.delete(sceneId);
        pendingScenePatchesRef.current.set(sceneId, { content });
        scheduleAutosaveFlush();
      },
      [scheduleAutosaveFlush],
    );

    const handleActiveSceneContentChange = useCallback(
      (sceneId: string, content: ScreenplayScene['content']) => {
        setScreenplay((previous) => {
          if (!previous) {
            return previous;
          }

          const nextScenes = previous.scenes.map((scene) => {
            if (scene.id !== sceneId || isSceneContentEqual(scene.content, content)) {
              return scene;
            }

            return {
              ...scene,
              content,
            };
          });

          const changed = nextScenes.some((scene, index) => scene !== previous.scenes[index]);
          if (!changed) {
            return previous;
          }

          queueScenePatch(sceneId, content);
          return {
            ...previous,
            scenes: nextScenes,
          };
        });
      },
      [queueScenePatch],
    );

    useEffect(() => {
      isMountedRef.current = true;

      return () => {
        isMountedRef.current = false;
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        void flushPendingSceneUpdatesRef.current();
      };
    }, []);

    useEffect(() => {
      let isCancelled = false;

      const load = async () => {
        setIsLoading(true);
        setWorkspaceError(null);

        try {
          const getUseCase = new GetProjectScreenplayUseCase(repository);
          const createUseCase = new CreateScreenplayUseCase(repository);

          let loaded = await getUseCase.execute(projectId);
          if (loaded === null) {
            try {
              loaded = await createUseCase.execute(projectId, { title: 'Untitled Screenplay' });
            } catch (error) {
              if (!isScreenplayCreateConflictError(error)) {
                throw error;
              }

              // Another client/effect created the screenplay between our GET and POST.
              // Recover by re-fetching the canonical screenplay instead of treating it as fatal.
              loaded = await getUseCase.execute(projectId);
              if (loaded === null) {
                throw error;
              }
            }
          }

          if (isCancelled) {
            return;
          }

          const normalized = normalizeScreenplayDraft(loaded);
          setScreenplay(normalized);
          setActiveSceneId(normalized.scenes[0]?.id ?? '');
        } catch (error) {
          console.error('Failed to load screenplay workspace:', error);
          if (!isCancelled) {
            setWorkspaceError('Failed to load screenplay. Please refresh to retry.');
          }
        } finally {
          if (!isCancelled) {
            setIsLoading(false);
          }
        }
      };

      void load();

      return () => {
        isCancelled = true;
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }, [projectId, repository]);

    const flushPendingSceneUpdates = useCallback(async () => {
      if (isFlushingRef.current) {
        await flushInFlightPromiseRef.current;
        return;
      }

      if (
        pendingScenePatchesRef.current.size === 0 &&
        pendingSceneDeletionIdsRef.current.size === 0
      ) {
        return;
      }

      const currentScreenplay = screenplayRef.current;
      if (!currentScreenplay) {
        return;
      }

      isFlushingRef.current = true;
      const flushPromise = (async () => {
        if (isMountedRef.current) {
          setIsAutosaving(true);
        }

        const activeSceneBeforeFlush = activeSceneIdRef.current;
        const queued = orderQueuedScenePatchesByScreenplay(
          Array.from(pendingScenePatchesRef.current.entries()),
          currentScreenplay,
        );
        const queuedSceneDeletions = Array.from(pendingSceneDeletionIdsRef.current.values());
        const processedDeletionIds = new Set<string>();
        const processedScenePatchIds = new Set<string>();
        pendingScenePatchesRef.current.clear();
        pendingSceneDeletionIdsRef.current.clear();

        try {
          const addSceneUseCase = new AddScreenplaySceneUseCase(repository);
          const deleteSceneUseCase = new DeleteScreenplaySceneUseCase(repository);
          const updateSceneUseCase = new UpdateScreenplaySceneUseCase(repository);
          let workingScreenplay = currentScreenplay;
          const queuedSceneDeletionIds = new Set(queuedSceneDeletions);
          let hasScreenplayStructureUpdate = false;

          for (const sceneId of queuedSceneDeletions) {
            workingScreenplay = normalizeScreenplayDraft(
              await deleteSceneUseCase.execute(projectId, sceneId),
            );
            processedDeletionIds.add(sceneId);
            hasScreenplayStructureUpdate = true;
          }

          const persistedScenePatches = queued.filter(
            ([sceneId]) => !isProvisionalSceneId(sceneId) && !queuedSceneDeletionIds.has(sceneId),
          );
          const provisionalScenePatches = queued.filter(([sceneId]) =>
            isProvisionalSceneId(sceneId),
          );

          for (const [sceneId, patch] of persistedScenePatches) {
            await updateSceneUseCase.execute(projectId, sceneId, patch);
            processedScenePatchIds.add(sceneId);
          }

          for (const [sceneId, patch] of provisionalScenePatches) {
            const insertPosition = resolveScenePosition(currentScreenplay.scenes, sceneId);
            workingScreenplay = normalizeScreenplayDraft(
              await addSceneUseCase.execute(projectId, {
                position: insertPosition,
                content: patch.content,
              }),
            );
            processedScenePatchIds.add(sceneId);
            hasScreenplayStructureUpdate = true;
          }

          if (hasScreenplayStructureUpdate) {
            screenplayRef.current = workingScreenplay;
            if (isMountedRef.current) {
              setScreenplay(workingScreenplay);
              const resolvedActiveSceneId = resolveSceneIdForMutation(
                activeSceneBeforeFlush,
                currentScreenplay.scenes,
                workingScreenplay.scenes,
              );
              setActiveSceneId(
                resolvedActiveSceneId ??
                  (workingScreenplay.scenes.some((scene) => scene.id === activeSceneBeforeFlush)
                    ? activeSceneBeforeFlush
                    : (workingScreenplay.scenes[0]?.id ?? '')),
              );
            }
          }
        } catch (error) {
          queuedSceneDeletions
            .filter((sceneId) => !processedDeletionIds.has(sceneId))
            .forEach((sceneId) => {
              pendingSceneDeletionIdsRef.current.add(sceneId);
            });
          queued
            .filter(([sceneId]) => !processedScenePatchIds.has(sceneId))
            .forEach(([sceneId, patch]) => {
              pendingScenePatchesRef.current.set(sceneId, patch);
            });
          console.error('Failed to autosave screenplay scene updates:', error);
        } finally {
          isFlushingRef.current = false;
          if (isMountedRef.current) {
            setIsAutosaving(false);
          }

          if (
            pendingScenePatchesRef.current.size > 0 ||
            pendingSceneDeletionIdsRef.current.size > 0
          ) {
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
              void flushPendingSceneUpdates();
            }, SAVE_DEBOUNCE_MS);
          }
        }
      })();

      flushInFlightPromiseRef.current = flushPromise;
      await flushPromise;

      if (flushInFlightPromiseRef.current === flushPromise) {
        flushInFlightPromiseRef.current = null;
      }
    }, [projectId, repository]);

    useEffect(() => {
      flushPendingSceneUpdatesRef.current = flushPendingSceneUpdates;
    }, [flushPendingSceneUpdates]);

    useEffect(() => {
      onContextChange?.({
        screenplayId: screenplay?.id ?? null,
        activeSceneId: activeSceneId || null,
        isReady: !isLoading && Boolean(screenplay?.id),
      });
    }, [activeSceneId, isLoading, onContextChange, screenplay?.id]);

    const clearPendingAutosaveQueue = useCallback(() => {
      pendingScenePatchesRef.current.clear();
      pendingSceneDeletionIdsRef.current.clear();

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      if (isMountedRef.current) {
        setIsAutosaving(false);
      }
    }, []);

    const applyRemoteScreenplay = useCallback(
      async (updatedScreenplay: Screenplay) => {
        // Let any currently running flush settle before swapping in server-authoritative screenplay data.
        if (flushInFlightPromiseRef.current) {
          await flushInFlightPromiseRef.current;
        }

        clearPendingAutosaveQueue();
        const normalized = normalizeScreenplayDraft(updatedScreenplay);
        screenplayRef.current = normalized;

        if (!isMountedRef.current) {
          return;
        }

        setSceneSyncNotice(null);
        setScreenplay(normalized);
        setActiveSceneId((current) =>
          normalized.scenes.some((scene) => scene.id === current)
            ? current
            : (normalized.scenes[0]?.id ?? ''),
        );
      },
      [clearPendingAutosaveQueue],
    );

    useImperativeHandle(
      ref,
      () => ({
        flushPendingUpdates: flushPendingSceneUpdates,
        getScreenplaySnapshot: () => screenplayRef.current,
        getScreenplayId: () => screenplayRef.current?.id ?? null,
        getActiveSceneId: () => activeSceneIdRef.current || null,
        applyRemoteScreenplay,
      }),
      [applyRemoteScreenplay, flushPendingSceneUpdates],
    );

    const activeScene = useMemo(
      () => screenplay?.scenes.find((scene) => scene.id === activeSceneId) ?? null,
      [screenplay, activeSceneId],
    );

    const characterCueSuggestions = useMemo(() => {
      if (!screenplay) {
        return [];
      }

      return getCharacterCueSuggestionsFromScenes(screenplay.scenes);
    }, [screenplay]);

    const validationBySceneId = useMemo(() => {
      if (!screenplay) {
        return new Map<string, ReturnType<typeof validateScene>>();
      }

      return new Map(screenplay.scenes.map((scene) => [scene.id, validateScene(scene)]));
    }, [screenplay]);

    const handleTitleBlur = async (nextTitle: string) => {
      if (!screenplay) {
        return;
      }

      const sanitizedTitle = nextTitle.trim() || 'Untitled Screenplay';
      setScreenplay({ ...screenplay, title: sanitizedTitle });

      try {
        const updateUseCase = new UpdateScreenplayUseCase(repository);
        const updated = await updateUseCase.execute(projectId, { title: sanitizedTitle });
        setScreenplay(normalizeScreenplayDraft(updated));
      } catch (error) {
        console.error('Failed to update screenplay title:', error);
      }
    };

    const handleAddScene = async () => {
      if (!screenplay || isMutating) {
        return;
      }

      setIsMutating(true);
      await flushPendingSceneUpdates();

      const latestScreenplay = screenplayRef.current;
      if (!latestScreenplay) {
        setIsMutating(false);
        return;
      }

      try {
        setSceneSyncNotice(null);
        const addUseCase = new AddScreenplaySceneUseCase(repository);
        const nextPosition = latestScreenplay.scenes.length + 1;
        const created = await addUseCase.execute(projectId, {
          position: nextPosition,
          content: serializeSceneXmlBlocks([
            { type: 'slugline', text: '' },
            { type: 'action', text: '' },
          ]),
        });

        const normalized = normalizeScreenplayDraft(created);
        setScreenplay(normalized);
        setActiveSceneId(normalized.scenes[normalized.scenes.length - 1]?.id ?? '');
      } catch (error) {
        console.error('Failed to add scene:', error);
      } finally {
        setIsMutating(false);
      }
    };

    const handleDeleteScene = async (sceneId: string) => {
      if (!screenplay || isMutating) {
        return;
      }

      const beforeFlushScenes = screenplay.scenes;
      setIsMutating(true);
      await flushPendingSceneUpdates();

      const latestScreenplay = screenplayRef.current;
      if (!latestScreenplay) {
        setIsMutating(false);
        return;
      }

      const resolvedSceneId = resolveSceneIdForMutation(
        sceneId,
        beforeFlushScenes,
        latestScreenplay.scenes,
      );
      if (!resolvedSceneId) {
        setSceneSyncNotice('Scenes are still syncing. Action skipped to keep scene order safe.');
        setIsMutating(false);
        return;
      }

      try {
        setSceneSyncNotice(null);
        const deleteUseCase = new DeleteScreenplaySceneUseCase(repository);
        const updated = await deleteUseCase.execute(projectId, resolvedSceneId);
        const normalized = normalizeScreenplayDraft(updated);
        setScreenplay(normalized);
        setActiveSceneId((current) =>
          normalized.scenes.some((scene) => scene.id === current)
            ? current
            : (normalized.scenes[0]?.id ?? ''),
        );
      } catch (error) {
        console.error('Failed to delete scene:', error);
      } finally {
        setIsMutating(false);
      }
    };

    const handleMoveScene = async (sceneId: string, direction: 'up' | 'down') => {
      if (!screenplay || isMutating) {
        return;
      }

      const beforeFlushScenes = screenplay.scenes;

      setIsMutating(true);
      await flushPendingSceneUpdates();

      let latestScreenplay = screenplayRef.current;
      if (!latestScreenplay) {
        setIsMutating(false);
        return;
      }

      if (hasProvisionalSceneIds(latestScreenplay.scenes)) {
        latestScreenplay = await reconcileScreenplayWithServer(projectId, repository);

        if (latestScreenplay) {
          const reconciledScreenplay = latestScreenplay;
          screenplayRef.current = reconciledScreenplay;
          setScreenplay(reconciledScreenplay);
          setActiveSceneId((current) =>
            reconciledScreenplay.scenes.some((scene) => scene.id === current)
              ? current
              : (reconciledScreenplay.scenes[0]?.id ?? ''),
          );
        }
      }

      if (!latestScreenplay || hasProvisionalSceneIds(latestScreenplay.scenes)) {
        setSceneSyncNotice('Scenes are still syncing. Reorder is temporarily unavailable.');
        setIsMutating(false);
        return;
      }

      const resolvedSceneId = resolveSceneIdForMutation(
        sceneId,
        beforeFlushScenes,
        latestScreenplay.scenes,
      );
      if (!resolvedSceneId) {
        setSceneSyncNotice('Scenes are still syncing. Action skipped to keep scene order safe.');
        setIsMutating(false);
        return;
      }

      const index = latestScreenplay.scenes.findIndex((scene) => scene.id === resolvedSceneId);
      if (index < 0) {
        setIsMutating(false);
        return;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= latestScreenplay.scenes.length) {
        setIsMutating(false);
        return;
      }

      try {
        setSceneSyncNotice(null);
        const reorderedScenes = reorder(latestScreenplay.scenes, index, targetIndex);
        const reorderUseCase = new ReorderScreenplayScenesUseCase(repository);
        const updated = await reorderUseCase.execute(projectId, {
          sceneIds: reorderedScenes.map((scene) => scene.id),
        });

        const normalized = normalizeScreenplayDraft(updated);
        setScreenplay(normalized);
      } catch (error) {
        console.error('Failed to reorder scenes:', error);
      } finally {
        setIsMutating(false);
      }
    };

    if (isLoading) {
      return <div className={styles.loading}>Loading screenplay workspace...</div>;
    }

    if (workspaceError || !screenplay) {
      return <div className={styles.loading}>{workspaceError ?? 'Unable to load screenplay.'}</div>;
    }

    const activeSceneWarnings = activeScene
      ? (validationBySceneId.get(activeScene.id)?.warnings ?? [])
      : [];

    return (
      <div className={styles.shell}>
        <aside className={styles.sceneListPanel}>
          <div className={styles.sceneListHeader}>
            <h2>Screenplay</h2>
            <button type="button" onClick={() => void handleAddScene()} disabled={isMutating}>
              <Plus size={14} aria-hidden="true" />
              Add Scene
            </button>
          </div>

          <div className={styles.sceneList}>
            {screenplay.scenes.map((scene, index) => {
              const warnings = validationBySceneId.get(scene.id)?.warnings.length ?? 0;
              return (
                <button
                  key={scene.id}
                  type="button"
                  className={`${styles.sceneListItem} ${activeSceneId === scene.id ? styles.activeScene : ''}`}
                  onClick={() => setActiveSceneId(scene.id)}
                >
                  <span className={styles.sceneListTitle}>
                    {scene.name || `Scene ${index + 1}`}
                  </span>
                  {warnings > 0 ? (
                    <span className={styles.warningBadge}>{warnings} warnings</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {activeScene ? (
            <div className={styles.sceneControls}>
              <div className={styles.sceneActions}>
                <button
                  type="button"
                  onClick={() => void handleMoveScene(activeScene.id, 'up')}
                  disabled={isMutating || activeScene.sceneNumber <= 1}
                  aria-label="Move scene up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleMoveScene(activeScene.id, 'down')}
                  disabled={isMutating || activeScene.sceneNumber >= screenplay.scenes.length}
                  aria-label="Move scene down"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteScene(activeScene.id)}
                  disabled={isMutating || screenplay.scenes.length <= 1}
                  aria-label="Delete scene"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {activeSceneWarnings.length > 0 ? (
                <ul className={styles.warningList}>
                  {activeSceneWarnings.map((warning) => (
                    <li key={`${warning.blockKey}:${warning.message}`}>
                      <AlertTriangle size={14} aria-hidden="true" />
                      <span>{warning.message}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {sceneSyncNotice ? <p className={styles.sceneSyncNotice}>{sceneSyncNotice}</p> : null}
            </div>
          ) : null}
        </aside>

        <section className={styles.editorPanel}>
          <header className={styles.editorHeader}>
            <input
              className={styles.screenplayTitle}
              defaultValue={screenplay.title}
              onBlur={(event) => void handleTitleBlur(event.currentTarget.value)}
              aria-label="Screenplay title"
            />
            <span className={styles.saveState}>{isAutosaving ? 'Saving…' : 'Saved locally'}</span>
          </header>

          <div className={styles.editorBody}>
            <ScreenplayTipTapEditor
              scene={activeScene}
              characterSuggestions={characterCueSuggestions}
              onSceneContentChange={handleActiveSceneContentChange}
            />
          </div>
        </section>
      </div>
    );
  },
);

ScreenplayWorkspace.displayName = 'ScreenplayWorkspace';

function normalizeScreenplayDraft(screenplay: Screenplay): Screenplay {
  if (screenplay.scenes.length === 0) {
    return {
      ...screenplay,
      title: screenplay.title || 'Untitled Screenplay',
      scenes: [createEmptyLocalScene(1)],
    };
  }

  const scenes = screenplay.scenes.map((scene, index) =>
    ensureSceneHasBlocks({
      ...scene,
      sceneNumber: index + 1,
      name: scene.name || `Scene ${index + 1}`,
    }),
  );

  return {
    ...screenplay,
    scenes,
    title: screenplay.title || 'Untitled Screenplay',
  };
}

function isScreenplayCreateConflictError(error: unknown): boolean {
  return error instanceof BackendApiError && error.status === 409;
}

function createEmptyLocalScene(sceneNumber: number): ScreenplayScene {
  return {
    id: createProvisionalSceneId(),
    name: `Scene ${sceneNumber}`,
    sceneNumber,
    content: createEmptySceneXml(),
  };
}

function orderQueuedScenePatchesByScreenplay(
  queued: Array<[string, { content: ScreenplayScene['content'] }]>,
  screenplay: Screenplay,
): Array<[string, { content: ScreenplayScene['content'] }]> {
  const queueBySceneId = new Map(queued);
  const ordered = screenplay.scenes
    .filter((scene) => queueBySceneId.has(scene.id))
    .map(
      (scene) =>
        [scene.id, queueBySceneId.get(scene.id)!] as [
          string,
          { content: ScreenplayScene['content'] },
        ],
    );

  const seenSceneIds = new Set(ordered.map(([sceneId]) => sceneId));
  queued.forEach(([sceneId, patch]) => {
    if (seenSceneIds.has(sceneId)) {
      return;
    }

    ordered.push([sceneId, patch]);
  });

  return ordered;
}

function resolveScenePosition(scenes: ScreenplayScene[], sceneId: string): number {
  const index = scenes.findIndex((scene) => scene.id === sceneId);
  return (index >= 0 ? index : scenes.length) + 1;
}

function hasProvisionalSceneIds(scenes: ScreenplayScene[]): boolean {
  return scenes.some((scene) => isProvisionalSceneId(scene.id));
}

async function reconcileScreenplayWithServer(
  projectId: string,
  screenplayRepository: ScreenplayRepository,
): Promise<Screenplay | null> {
  try {
    const getUseCase = new GetProjectScreenplayUseCase(screenplayRepository);
    const loaded = await getUseCase.execute(projectId);
    return loaded ? normalizeScreenplayDraft(loaded) : null;
  } catch (error) {
    console.error('Failed to reconcile screenplay structure with server:', error);
    return null;
  }
}

function resolveSceneIdForMutation(
  requestedSceneId: string,
  beforeFlushScenes: ScreenplayScene[],
  afterFlushScenes: ScreenplayScene[],
): string | null {
  if (afterFlushScenes.some((scene) => scene.id === requestedSceneId)) {
    return requestedSceneId;
  }

  const beforeFlushIndex = beforeFlushScenes.findIndex((scene) => scene.id === requestedSceneId);
  if (beforeFlushIndex < 0) {
    return null;
  }

  const beforeFlushScene = beforeFlushScenes[beforeFlushIndex];

  if (!isProvisionalSceneId(requestedSceneId)) {
    return null;
  }

  const provisionalSignature = sceneIdentitySignature(beforeFlushScene);
  if (provisionalSignature) {
    const bySignature = afterFlushScenes.find(
      (scene) => sceneIdentitySignature(scene) === provisionalSignature,
    );
    if (bySignature) {
      return bySignature.id;
    }
  }

  const beforeSlugline = parseSceneXmlBlocksSafe(beforeFlushScene.content).find(
    (block) => block.type === 'slugline',
  )?.text;
  if (beforeSlugline) {
    const bySlugline = afterFlushScenes.find(
      (scene) =>
        parseSceneXmlBlocksSafe(scene.content).find((block) => block.type === 'slugline')?.text ===
        beforeSlugline,
    );
    if (bySlugline) {
      return bySlugline.id;
    }
  }

  return null;
}

function sceneIdentitySignature(scene: ScreenplayScene): string | null {
  const blocks = parseSceneXmlBlocksSafe(scene.content);
  const slugline = blocks.find((block) => block.type === 'slugline')?.text?.trim();
  if (!slugline) {
    return null;
  }

  const firstActionOrDialogue = blocks
    .find((block) => block.type === 'action' || block.type === 'dialogue')
    ?.text?.trim();

  return `${slugline}::${firstActionOrDialogue ?? ''}`;
}

function parseSceneXmlBlocksSafe(content: string) {
  try {
    return parseSceneXmlBlocks(content);
  } catch {
    return [];
  }
}
