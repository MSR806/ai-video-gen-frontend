import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Scene, SceneCreatePayload, SceneUpdatePayload } from '@core/scene';
import styles from './ScenesEditor.module.css';

interface ScenesEditorProps {
  projectId: string;
  scenes: Scene[];
  onSceneCreate: (payload: SceneCreatePayload) => Promise<Scene[]>;
  onSceneUpdate: (sceneId: string, payload: SceneUpdatePayload) => Promise<Scene>;
  onSceneDelete: (sceneId: string) => Promise<Scene[]>;
}

type SceneDraft = Scene;

type PendingScenePatch = SceneUpdatePayload;

const SAVE_DEBOUNCE_MS = 800;

export function ScenesEditor({
  projectId,
  scenes,
  onSceneCreate,
  onSceneUpdate,
  onSceneDelete,
}: ScenesEditorProps) {
  const initialScenes = useMemo(() => normalizeScenes(projectId, scenes), [projectId, scenes]);
  const [draftScenes, setDraftScenes] = useState<SceneDraft[]>(initialScenes);
  const [activeSceneId, setActiveSceneId] = useState<string>(() => {
    return initialScenes[0]?.id ?? '';
  });
  const [isMutating, setIsMutating] = useState(false);

  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchesRef = useRef<Map<string, PendingScenePatch>>(new Map());
  const isFlushingRef = useRef(false);

  useEffect(() => {
    const normalized = normalizeScenes(projectId, scenes);
    setDraftScenes(normalized);
    setActiveSceneId((previous) => {
      if (normalized.some((scene) => scene.id === previous)) {
        return previous;
      }
      return normalized[0]?.id ?? '';
    });
  }, [projectId, scenes]);

  useEffect(() => {
    Object.values(bodyRefs.current).forEach((node) => {
      if (node) resizeBodyTextarea(node);
    });
  }, [draftScenes]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const flushPendingUpdates = useCallback(async () => {
    if (isFlushingRef.current || pendingPatchesRef.current.size === 0) {
      return;
    }

    isFlushingRef.current = true;
    const queuedPatches = Array.from(pendingPatchesRef.current.entries());
    pendingPatchesRef.current.clear();

    try {
      for (const [sceneId, patch] of queuedPatches) {
        await onSceneUpdate(sceneId, patch);
      }
    } catch (error) {
      queuedPatches.forEach(([sceneId, patch]) => {
        const existingPatch = pendingPatchesRef.current.get(sceneId) ?? {};
        pendingPatchesRef.current.set(sceneId, {
          ...patch,
          ...existingPatch,
        });
      });
      throw error;
    } finally {
      isFlushingRef.current = false;
      if (pendingPatchesRef.current.size > 0) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          void flushPendingUpdates().catch(() => {
            // Error feedback is handled by the parent callback.
          });
        }, SAVE_DEBOUNCE_MS);
      }
    }
  }, [onSceneUpdate]);

  const scheduleFlush = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void flushPendingUpdates().catch(() => {
        // Error feedback is handled by the parent callback.
      });
    }, SAVE_DEBOUNCE_MS);
  }, [flushPendingUpdates]);

  const queueScenePatch = useCallback(
    (sceneId: string, patch: PendingScenePatch) => {
      const existingPatch = pendingPatchesRef.current.get(sceneId) ?? {};
      pendingPatchesRef.current.set(sceneId, {
        ...existingPatch,
        ...patch,
      });
      scheduleFlush();
    },
    [scheduleFlush],
  );

  const sceneLabels = useMemo(
    () =>
      draftScenes.map((scene, index) =>
        scene.name.trim().length > 0 ? scene.name : `Untitled Scene ${index + 1}`,
      ),
    [draftScenes],
  );

  const handleSceneSelect = (sceneId: string) => {
    setActiveSceneId(sceneId);
    cardRefs.current[sceneId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });
  };

  const updateScene = (sceneId: string, patch: PendingScenePatch) => {
    if (isMutating) {
      return;
    }

    setDraftScenes((prev) => {
      const nextScenes = prev.map((scene) => {
        if (scene.id !== sceneId) {
          return scene;
        }

        return {
          ...scene,
          ...patch,
          content:
            patch.content !== undefined
              ? normalizeSceneContent(patch.content)
              : normalizeSceneContent(scene.content),
        };
      });
      return reindexScenes(nextScenes);
    });

    queueScenePatch(sceneId, patch);
  };

  const normalizeTitleOnBlur = (sceneId: string, rawName: string, fallbackSceneNumber: number) => {
    if (isMutating) {
      return;
    }

    const normalizedName = rawName.trim() || `Untitled Scene ${fallbackSceneNumber}`;
    setDraftScenes((prev) =>
      prev.map((scene, index) => {
        if (scene.id !== sceneId) return scene;
        const fallbackName = `Untitled Scene ${index + 1}`;
        const nextName = normalizedName.trim() || fallbackName;
        return { ...scene, name: nextName };
      }),
    );
    queueScenePatch(sceneId, { name: normalizedName });
  };

  const applyCanonicalScenes = (nextScenes: Scene[], focusSceneId?: string) => {
    const normalized = normalizeScenes(projectId, nextScenes);
    setDraftScenes(normalized);
    setActiveSceneId((previous) => {
      if (focusSceneId && normalized.some((scene) => scene.id === focusSceneId)) {
        return focusSceneId;
      }
      if (normalized.some((scene) => scene.id === previous)) {
        return previous;
      }
      return normalized[0]?.id ?? '';
    });
  };

  const insertSceneAt = async (index: number) => {
    if (isMutating) {
      return;
    }

    setIsMutating(true);
    const newSceneId = crypto.randomUUID();
    const sceneNumber = index + 1;

    try {
      await flushPendingUpdates();
      const nextScenes = await onSceneCreate({
        id: newSceneId,
        position: sceneNumber,
        name: `Untitled Scene ${sceneNumber}`,
        content: createTextContent(''),
      });

      applyCanonicalScenes(nextScenes, newSceneId);

      requestAnimationFrame(() => {
        cardRefs.current[newSceneId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } finally {
      setIsMutating(false);
    }
  };

  const deleteSceneById = async (sceneId: string) => {
    if (isMutating) {
      return;
    }

    setIsMutating(true);

    try {
      await flushPendingUpdates();
      pendingPatchesRef.current.delete(sceneId);
      const nextScenes = await onSceneDelete(sceneId);
      applyCanonicalScenes(nextScenes);
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className={styles.editorShell}>
      <aside className={styles.sceneListPanel}>
        <h2 className={styles.panelTitle}>Scenes</h2>
        <div className={styles.sceneList}>
          {draftScenes.map((scene, index) => (
            <button
              key={scene.id}
              className={`${styles.sceneListItem} ${activeSceneId === scene.id ? styles.activeSceneListItem : ''}`}
              onClick={() => handleSceneSelect(scene.id)}
            >
              {sceneLabels[index]}
            </button>
          ))}
        </div>
      </aside>

      <section className={styles.scenesColumn}>
        <InsertRow onAdd={() => void insertSceneAt(0)} disabled={isMutating} />

        {draftScenes.map((scene, index) => (
          <div key={scene.id} className={styles.sceneBlock}>
            <article
              ref={(node) => {
                cardRefs.current[scene.id] = node;
              }}
              className={`${styles.sceneCard} ${activeSceneId === scene.id ? styles.activeSceneCard : ''}`}
              onClick={() => setActiveSceneId(scene.id)}
            >
              <div className={styles.sceneHeader}>
                <span className={styles.sceneNumber}>Scene {scene.sceneNumber}</span>
                <input
                  className={styles.sceneTitleInput}
                  value={scene.name}
                  onFocus={() => setActiveSceneId(scene.id)}
                  onChange={(event) => updateScene(scene.id, { name: event.target.value })}
                  onBlur={(event) =>
                    normalizeTitleOnBlur(scene.id, event.currentTarget.value, index + 1)
                  }
                  placeholder={`Untitled Scene ${index + 1}`}
                  disabled={isMutating}
                />
                <button
                  type="button"
                  className={styles.deleteSceneButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteSceneById(scene.id);
                  }}
                  aria-label={`Delete scene ${scene.sceneNumber}`}
                  disabled={isMutating}
                >
                  Delete
                </button>
              </div>

              <textarea
                className={styles.sceneBodyInput}
                ref={(node) => {
                  bodyRefs.current[scene.id] = node;
                  if (node) resizeBodyTextarea(node);
                }}
                value={sceneText(scene.content)}
                onFocus={() => setActiveSceneId(scene.id)}
                onChange={(event) =>
                  updateScene(scene.id, { content: createTextContent(event.target.value) })
                }
                onInput={(event) => resizeBodyTextarea(event.currentTarget)}
                placeholder="Write scene text..."
                rows={1}
                disabled={isMutating}
              />
            </article>

            <InsertRow onAdd={() => void insertSceneAt(index + 1)} disabled={isMutating} />
          </div>
        ))}
      </section>
    </div>
  );
}

function InsertRow({ onAdd, disabled }: { onAdd: () => void; disabled: boolean }) {
  return (
    <div className={styles.insertRow}>
      <div className={styles.insertLine}></div>
      <button
        className={styles.insertButton}
        onClick={onAdd}
        aria-label="Insert scene"
        disabled={disabled}
      >
        +
      </button>
      <div className={styles.insertLine}></div>
    </div>
  );
}

function normalizeScenes(projectId: string, scenes: Scene[]): SceneDraft[] {
  const sorted = [...scenes].sort((a, b) => (a.sceneNumber || 0) - (b.sceneNumber || 0));

  const normalized = sorted.map((scene, index) => {
    return {
      id: scene.id || crypto.randomUUID(),
      projectId: scene.projectId || projectId,
      name: typeof scene.name === 'string' ? scene.name : `Untitled Scene ${index + 1}`,
      sceneNumber: index + 1,
      content: normalizeSceneContent(scene.content),
    };
  });

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    {
      id: crypto.randomUUID(),
      projectId,
      name: 'Untitled Scene 1',
      sceneNumber: 1,
      content: createTextContent(''),
    },
  ];
}

function reindexScenes(scenes: SceneDraft[]): SceneDraft[] {
  return scenes.map((scene, index) => ({
    ...scene,
    sceneNumber: index + 1,
  }));
}

function sceneText(content: Record<string, unknown>): string {
  return extractText(content);
}

function createTextContent(text: string): Record<string, unknown> {
  return { text };
}

function normalizeSceneContent(
  content: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!content) {
    return createTextContent('');
  }

  return content;
}

function extractText(node: unknown): string {
  if (!node) return '';

  if (typeof node === 'string') return node;

  if (Array.isArray(node)) {
    return node
      .map((item) => extractText(item))
      .filter((value) => value.length > 0)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  if (!isRecord(node)) return '';

  // v1 canonical scene content shape: { text: "..." }
  if (typeof node.text === 'string') {
    return node.text;
  }

  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text;
  }

  if (node.type === 'doc' && Array.isArray(node.content)) {
    return node.content
      .map((block) => extractText(block))
      .filter((value) => value.length > 0)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  if (Array.isArray(node.content)) {
    return node.content.map((child) => extractText(child)).join('');
  }

  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resizeBodyTextarea(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}
