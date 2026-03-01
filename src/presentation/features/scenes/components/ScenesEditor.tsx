import { useEffect, useMemo, useRef, useState } from 'react';
import type { Scene } from '@core/scene';
import styles from './ScenesEditor.module.css';

interface ScenesEditorProps {
  projectId: string;
  scenes: Scene[];
  onSave: (scenes: Scene[]) => void;
}

type SceneDraft = Scene;

export function ScenesEditor({ projectId, scenes, onSave }: ScenesEditorProps) {
  const initialScenes = useMemo(() => normalizeScenes(projectId, scenes), [projectId, scenes]);
  const [draftScenes, setDraftScenes] = useState<SceneDraft[]>(initialScenes);
  const [activeSceneId, setActiveSceneId] = useState<string>(() => {
    return initialScenes[0]?.id ?? '';
  });

  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitializeRef = useRef(false);

  useEffect(() => {
    Object.values(bodyRefs.current).forEach((node) => {
      if (node) resizeBodyTextarea(node);
    });
  }, [draftScenes]);

  useEffect(() => {
    if (!didInitializeRef.current) {
      didInitializeRef.current = true;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      onSave(
        draftScenes.map((scene, index) => ({
          ...scene,
          sceneNumber: index + 1,
          name: scene.name.trim() || `Untitled Scene ${index + 1}`,
          body: scene.body ?? '',
        })),
      );
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [draftScenes, onSave]);

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

  const insertSceneAt = (index: number) => {
    const newSceneId = crypto.randomUUID();
    setDraftScenes((prev) => {
      const next = [...prev];
      next.splice(index, 0, {
        id: newSceneId,
        projectId,
        name: `Untitled Scene ${index + 1}`,
        sceneNumber: index + 1,
        body: '',
      });
      return reindexScenes(next);
    });
    setActiveSceneId(newSceneId);

    requestAnimationFrame(() => {
      cardRefs.current[newSceneId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const updateScene = (sceneId: string, patch: Partial<SceneDraft>) => {
    setDraftScenes((prev) =>
      prev.map((scene) => (scene.id === sceneId ? { ...scene, ...patch } : scene)),
    );
  };

  const normalizeTitleOnBlur = (sceneId: string) => {
    setDraftScenes((prev) =>
      prev.map((scene, index) => {
        if (scene.id !== sceneId) return scene;
        const normalizedName = scene.name.trim() || `Untitled Scene ${index + 1}`;
        return { ...scene, name: normalizedName };
      }),
    );
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
        <InsertRow onAdd={() => insertSceneAt(0)} />

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
                  onBlur={() => normalizeTitleOnBlur(scene.id)}
                  placeholder={`Untitled Scene ${index + 1}`}
                />
              </div>

              <textarea
                className={styles.sceneBodyInput}
                ref={(node) => {
                  bodyRefs.current[scene.id] = node;
                  if (node) resizeBodyTextarea(node);
                }}
                value={scene.body}
                onFocus={() => setActiveSceneId(scene.id)}
                onChange={(event) => updateScene(scene.id, { body: event.target.value })}
                onInput={(event) => resizeBodyTextarea(event.currentTarget)}
                placeholder="Write scene text..."
                rows={1}
              />
            </article>

            <InsertRow onAdd={() => insertSceneAt(index + 1)} />
          </div>
        ))}
      </section>
    </div>
  );
}

function InsertRow({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={styles.insertRow}>
      <div className={styles.insertLine}></div>
      <button className={styles.insertButton} onClick={onAdd} aria-label="Insert scene">
        +
      </button>
      <div className={styles.insertLine}></div>
    </div>
  );
}

function normalizeScenes(projectId: string, scenes: Scene[]): SceneDraft[] {
  const sorted = [...scenes].sort((a, b) => (a.sceneNumber || 0) - (b.sceneNumber || 0));

  const normalized = sorted.map((scene, index) => {
    const legacyScene = scene as Scene & { content?: Record<string, unknown> };
    const body =
      typeof scene.body === 'string'
        ? scene.body
        : legacyScene.content
          ? extractLegacyBody(legacyScene.content)
          : '';

    return {
      id: scene.id || crypto.randomUUID(),
      projectId: scene.projectId || projectId,
      name: typeof scene.name === 'string' ? scene.name : `Untitled Scene ${index + 1}`,
      sceneNumber: index + 1,
      body,
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
      body: '',
    },
  ];
}

function reindexScenes(scenes: SceneDraft[]): SceneDraft[] {
  return scenes.map((scene, index) => ({
    ...scene,
    sceneNumber: index + 1,
  }));
}

function extractLegacyBody(content: Record<string, unknown>): string {
  return extractText(content).trim();
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

  if (typeof node !== 'object') return '';

  const obj = node as Record<string, unknown>;

  if (obj.type === 'text' && typeof obj.text === 'string') {
    return obj.text;
  }

  if (obj.type === 'doc' && Array.isArray(obj.content)) {
    return obj.content
      .map((block) => extractText(block))
      .filter((value) => value.length > 0)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  if (Array.isArray(obj.content)) {
    return obj.content.map((child) => extractText(child)).join('');
  }

  return '';
}

function resizeBodyTextarea(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}
