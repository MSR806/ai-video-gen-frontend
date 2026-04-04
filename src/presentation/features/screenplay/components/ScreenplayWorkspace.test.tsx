import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import type {
  Screenplay,
  ScreenplayRepository,
  ScreenplayScene,
  ScreenplaySceneCreatePayload,
  ScreenplaySceneUpdatePayload,
  ScreenplayUpdatePayload,
} from '@core/screenplay';
import { BackendApiError } from '@infra/http/backend-api';
import type { ScreenplayWorkspaceHandle } from './ScreenplayWorkspace';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

interface RepositoryHarness {
  screenplay: Screenplay;
  addSceneCalls: Array<{ projectId: string; payload: ScreenplaySceneCreatePayload }>;
  updateSceneCalls: Array<{
    projectId: string;
    sceneId: string;
    payload: ScreenplaySceneUpdatePayload;
  }>;
  deleteSceneCalls: Array<{ projectId: string; sceneId: string }>;
  reorderSceneCalls: Array<{ projectId: string; sceneIds: string[] }>;
  dropPersistedSceneOnAdd: boolean;
  updateSceneAwaiter: Promise<void> | null;
  nextSceneSequence: number;
}

const repositoryHarness: RepositoryHarness = {
  screenplay: {
    id: 'screenplay-1',
    projectId: 'project-1',
    title: 'Untitled Screenplay',
    scenes: [],
  },
  addSceneCalls: [],
  updateSceneCalls: [],
  deleteSceneCalls: [],
  reorderSceneCalls: [],
  dropPersistedSceneOnAdd: false,
  updateSceneAwaiter: null,
  nextSceneSequence: 1,
};

const editorHarness = {
  onSceneContentChange: null as
    | ((sceneId: string, content: ScreenplayScene['content']) => void)
    | null,
};

function cloneScreenplay(screenplay: Screenplay): Screenplay {
  return JSON.parse(JSON.stringify(screenplay)) as Screenplay;
}

function renumberScenes(scenes: ScreenplayScene[]): ScreenplayScene[] {
  return scenes.map((scene, index) => ({
    ...scene,
    sceneNumber: index + 1,
    name: scene.name || `Scene ${index + 1}`,
  }));
}

mock.module('./ScreenplayTipTapEditor', () => ({
  ScreenplayTipTapEditor: ({
    scene,
    onSceneContentChange,
  }: {
    scene: ScreenplayScene | null;
    onSceneContentChange: (sceneId: string, content: ScreenplayScene['content']) => void;
  }) => {
    editorHarness.onSceneContentChange = onSceneContentChange;

    return (
      <button
        type="button"
        onClick={() => {
          if (!scene) {
            return;
          }

          onSceneContentChange(
            scene.id,
            '<scene><slugline>INT. GARAGE - DAY</slugline><action>A prototype flickers to life.</action></scene>',
          );
        }}
      >
        Emit Edit
      </button>
    );
  },
}));

function createScreenplayRepositoryStub(): ScreenplayRepository {
  return {
    async getByProjectId() {
      return cloneScreenplay(repositoryHarness.screenplay);
    },
    async create(_projectId: string, payload: { title?: string }) {
      repositoryHarness.screenplay = {
        ...repositoryHarness.screenplay,
        title: payload.title ?? repositoryHarness.screenplay.title,
      };
      return cloneScreenplay(repositoryHarness.screenplay);
    },
    async update(_projectId: string, payload: ScreenplayUpdatePayload) {
      repositoryHarness.screenplay = {
        ...repositoryHarness.screenplay,
        title: payload.title,
      };
      return cloneScreenplay(repositoryHarness.screenplay);
    },
    async addScene(projectId: string, payload: ScreenplaySceneCreatePayload) {
      repositoryHarness.addSceneCalls.push({ projectId, payload });

      if (repositoryHarness.dropPersistedSceneOnAdd) {
        repositoryHarness.dropPersistedSceneOnAdd = false;
        return cloneScreenplay(repositoryHarness.screenplay);
      }

      const sceneId = `scene-${repositoryHarness.nextSceneSequence}`;
      repositoryHarness.nextSceneSequence += 1;
      const nextScene: ScreenplayScene = {
        id: sceneId,
        name: payload.name ?? `Scene ${repositoryHarness.screenplay.scenes.length + 1}`,
        sceneNumber: payload.position ?? repositoryHarness.screenplay.scenes.length + 1,
        content: payload.content ?? '<scene><action></action></scene>',
      };
      const insertionIndex = Math.max(
        0,
        Math.min(
          (payload.position ?? repositoryHarness.screenplay.scenes.length + 1) - 1,
          repositoryHarness.screenplay.scenes.length,
        ),
      );
      const scenes = [...repositoryHarness.screenplay.scenes];
      scenes.splice(insertionIndex, 0, nextScene);

      repositoryHarness.screenplay = {
        ...repositoryHarness.screenplay,
        scenes: renumberScenes(scenes),
      };

      return cloneScreenplay(repositoryHarness.screenplay);
    },
    async updateScene(projectId: string, sceneId: string, payload: ScreenplaySceneUpdatePayload) {
      repositoryHarness.updateSceneCalls.push({ projectId, sceneId, payload });

      if (repositoryHarness.updateSceneAwaiter) {
        await repositoryHarness.updateSceneAwaiter;
      }

      repositoryHarness.screenplay = {
        ...repositoryHarness.screenplay,
        scenes: repositoryHarness.screenplay.scenes.map((scene) =>
          scene.id === sceneId ? { ...scene, content: payload.content ?? scene.content } : scene,
        ),
      };

      return JSON.parse(
        JSON.stringify(
          repositoryHarness.screenplay.scenes.find((scene) => scene.id === sceneId) ??
            repositoryHarness.screenplay.scenes[0],
        ),
      ) as ScreenplayScene;
    },
    async deleteScene(projectId: string, sceneId: string) {
      repositoryHarness.deleteSceneCalls.push({ projectId, sceneId });

      repositoryHarness.screenplay = {
        ...repositoryHarness.screenplay,
        scenes: renumberScenes(
          repositoryHarness.screenplay.scenes.filter((scene) => scene.id !== sceneId),
        ),
      };

      return cloneScreenplay(repositoryHarness.screenplay);
    },
    async reorderScenes(projectId: string, payload: { sceneIds: string[] }) {
      repositoryHarness.reorderSceneCalls.push({ projectId, sceneIds: payload.sceneIds });

      const sceneById = new Map(
        repositoryHarness.screenplay.scenes.map((scene) => [scene.id, scene]),
      );
      repositoryHarness.screenplay = {
        ...repositoryHarness.screenplay,
        scenes: renumberScenes(
          payload.sceneIds
            .map((sceneId) => sceneById.get(sceneId))
            .filter((scene): scene is ScreenplayScene => Boolean(scene)),
        ),
      };

      return cloneScreenplay(repositoryHarness.screenplay);
    },
  };
}

describe('ScreenplayWorkspace', () => {
  beforeEach(() => {
    repositoryHarness.screenplay = {
      id: 'screenplay-1',
      projectId: 'project-1',
      title: 'Untitled Screenplay',
      scenes: [],
    };
    repositoryHarness.addSceneCalls = [];
    repositoryHarness.updateSceneCalls = [];
    repositoryHarness.deleteSceneCalls = [];
    repositoryHarness.reorderSceneCalls = [];
    repositoryHarness.dropPersistedSceneOnAdd = false;
    repositoryHarness.updateSceneAwaiter = null;
    repositoryHarness.nextSceneSequence = 1;
    editorHarness.onSceneContentChange = null;
  });

  afterEach(() => {
    editorHarness.onSceneContentChange = null;
  });

  it('persists first edit when screenplay starts with zero scenes', async () => {
    const { ScreenplayWorkspace } = await import('./ScreenplayWorkspace');
    const { getByText } = render(
      <ScreenplayWorkspace
        projectId="project-1"
        screenplayRepository={createScreenplayRepositoryStub()}
      />,
    );

    await waitFor(() => expect(editorHarness.onSceneContentChange).toBeTruthy());

    await act(async () => {
      getByText('Emit Edit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await wait(900);
    });

    expect(repositoryHarness.addSceneCalls).toHaveLength(1);
    expect(repositoryHarness.addSceneCalls[0].payload.content ?? '').toContain(
      '<action>A prototype flickers to life.</action>',
    );
    expect(repositoryHarness.updateSceneCalls).toHaveLength(0);
  });

  it('creates screenplay on initial load when project has none', async () => {
    let getCalls = 0;
    let createCalls = 0;
    const createdScreenplay: Screenplay = {
      id: 'screenplay-created',
      projectId: 'project-1',
      title: 'Untitled Screenplay',
      scenes: [],
    };

    const repository: ScreenplayRepository = {
      async getByProjectId() {
        getCalls += 1;
        return null;
      },
      async create() {
        createCalls += 1;
        return cloneScreenplay(createdScreenplay);
      },
      async update() {
        return cloneScreenplay(createdScreenplay);
      },
      async addScene() {
        return cloneScreenplay(createdScreenplay);
      },
      async updateScene() {
        return {
          id: 'scene-1',
          name: 'Scene 1',
          sceneNumber: 1,
          content: '<scene><action></action></scene>',
        };
      },
      async deleteScene() {
        return cloneScreenplay(createdScreenplay);
      },
      async reorderScenes() {
        return cloneScreenplay(createdScreenplay);
      },
    };

    const { ScreenplayWorkspace } = await import('./ScreenplayWorkspace');
    const { queryByText } = render(
      <ScreenplayWorkspace projectId="project-1" screenplayRepository={repository} />,
    );

    await waitFor(() => expect(queryByText('Screenplay')).toBeTruthy());

    expect(getCalls).toBe(1);
    expect(createCalls).toBe(1);
  });

  it('recovers from duplicate screenplay create conflicts by refetching', async () => {
    let getCalls = 0;
    let createCalls = 0;
    const existingScreenplay: Screenplay = {
      id: 'screenplay-existing',
      projectId: 'project-1',
      title: 'Untitled Screenplay',
      scenes: [],
    };

    const repository: ScreenplayRepository = {
      async getByProjectId() {
        getCalls += 1;
        if (getCalls === 1) {
          return null;
        }

        return cloneScreenplay(existingScreenplay);
      },
      async create() {
        createCalls += 1;
        throw new BackendApiError({
          status: 409,
          code: 'screenplay_already_exists',
          message: 'Screenplay already exists',
        });
      },
      async update() {
        return cloneScreenplay(existingScreenplay);
      },
      async addScene() {
        return cloneScreenplay(existingScreenplay);
      },
      async updateScene() {
        return {
          id: 'scene-1',
          name: 'Scene 1',
          sceneNumber: 1,
          content: '<scene><action></action></scene>',
        };
      },
      async deleteScene() {
        return cloneScreenplay(existingScreenplay);
      },
      async reorderScenes() {
        return cloneScreenplay(existingScreenplay);
      },
    };

    const { ScreenplayWorkspace } = await import('./ScreenplayWorkspace');
    const { queryByText } = render(
      <ScreenplayWorkspace projectId="project-1" screenplayRepository={repository} />,
    );

    await waitFor(() => expect(queryByText('Screenplay')).toBeTruthy());

    expect(createCalls).toBe(1);
    expect(getCalls).toBe(2);
    expect(queryByText('Failed to load screenplay. Please refresh to retry.')).toBeNull();
  });

  it('best-effort flushes pending scene patches on unmount', async () => {
    repositoryHarness.screenplay = {
      id: 'screenplay-1',
      projectId: 'project-1',
      title: 'Untitled Screenplay',
      scenes: [
        {
          id: 'scene-1',
          name: 'Scene 1',
          sceneNumber: 1,
          content:
            '<scene><slugline>INT. OFFICE - DAY</slugline><action>Old action</action></scene>',
        },
      ],
    };

    const { ScreenplayWorkspace } = await import('./ScreenplayWorkspace');
    const { unmount, getByText } = render(
      <ScreenplayWorkspace
        projectId="project-1"
        screenplayRepository={createScreenplayRepositoryStub()}
      />,
    );

    await waitFor(() => expect(editorHarness.onSceneContentChange).toBeTruthy());

    act(() => {
      getByText('Emit Edit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    unmount();

    await act(async () => {
      await wait(100);
    });

    expect(repositoryHarness.updateSceneCalls).toHaveLength(1);
    expect(repositoryHarness.updateSceneCalls[0].payload.content ?? '').toContain(
      '<action>A prototype flickers to life.</action>',
    );
  });

  it('shows safe reorder state when provisional scenes remain unresolved', async () => {
    repositoryHarness.screenplay = {
      id: 'screenplay-1',
      projectId: 'project-1',
      title: 'Untitled Screenplay',
      scenes: [
        {
          id: 'scene-1',
          name: 'Scene 1',
          sceneNumber: 1,
          content:
            '<scene><slugline>INT. OFFICE - DAY</slugline><action>Persisted scene.</action></scene>',
        },
        {
          id: 'screenplay-provisional-scene:stuck-scene',
          name: 'Scene 2',
          sceneNumber: 2,
          content:
            '<scene><slugline>INT. LAB - NIGHT</slugline><action>Still provisional after sync.</action></scene>',
        },
      ],
    };

    const { ScreenplayWorkspace } = await import('./ScreenplayWorkspace');
    const { getByRole, getByText } = render(
      <ScreenplayWorkspace
        projectId="project-1"
        screenplayRepository={createScreenplayRepositoryStub()}
      />,
    );

    await waitFor(() => expect(editorHarness.onSceneContentChange).toBeTruthy());

    await act(async () => {
      getByText('Scene 1').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      getByRole('button', { name: 'Move scene down' }).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await wait(50);
    });

    expect(repositoryHarness.reorderSceneCalls).toHaveLength(0);
    expect(getByText('Scenes are still syncing. Reorder is temporarily unavailable.')).toBeTruthy();
  });

  it('does not replay manual scene delete from autosave queue', async () => {
    repositoryHarness.screenplay = {
      id: 'screenplay-1',
      projectId: 'project-1',
      title: 'Untitled Screenplay',
      scenes: [
        {
          id: 'scene-1',
          name: 'Scene 1',
          sceneNumber: 1,
          content:
            '<scene><slugline>INT. OFFICE - DAY</slugline><action>First scene.</action></scene>',
        },
        {
          id: 'scene-2',
          name: 'Scene 2',
          sceneNumber: 2,
          content:
            '<scene><slugline>EXT. STREET - NIGHT</slugline><action>Second scene.</action></scene>',
        },
      ],
    };

    const { ScreenplayWorkspace } = await import('./ScreenplayWorkspace');
    const { getByRole } = render(
      <ScreenplayWorkspace
        projectId="project-1"
        screenplayRepository={createScreenplayRepositoryStub()}
      />,
    );

    await waitFor(() => expect(editorHarness.onSceneContentChange).toBeTruthy());

    await act(async () => {
      getByRole('button', { name: 'Delete scene' }).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await wait(900);
    });

    await act(async () => {
      await wait(900);
    });

    expect(repositoryHarness.deleteSceneCalls).toHaveLength(1);
    expect(repositoryHarness.deleteSceneCalls[0]).toEqual({
      projectId: 'project-1',
      sceneId: 'scene-1',
    });
  });

  it('waits for in-flight flush before running add-scene mutation', async () => {
    const deferred = createDeferred<void>();
    repositoryHarness.updateSceneAwaiter = deferred.promise;
    repositoryHarness.screenplay = {
      id: 'screenplay-1',
      projectId: 'project-1',
      title: 'Untitled Screenplay',
      scenes: [
        {
          id: 'scene-1',
          name: 'Scene 1',
          sceneNumber: 1,
          content:
            '<scene><slugline>INT. OFFICE - DAY</slugline><action>Old action.</action></scene>',
        },
      ],
    };
    repositoryHarness.nextSceneSequence = 2;

    const { ScreenplayWorkspace } = await import('./ScreenplayWorkspace');
    const { getByText } = render(
      <ScreenplayWorkspace
        projectId="project-1"
        screenplayRepository={createScreenplayRepositoryStub()}
      />,
    );

    await waitFor(() => expect(editorHarness.onSceneContentChange).toBeTruthy());

    await act(async () => {
      getByText('Emit Edit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await wait(750);
    });
    await waitFor(() => expect(repositoryHarness.updateSceneCalls).toHaveLength(1));

    await act(async () => {
      getByText('Add Scene').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await wait(50);
    });

    expect(repositoryHarness.addSceneCalls).toHaveLength(0);

    deferred.resolve();
    await waitFor(() => expect(repositoryHarness.addSceneCalls).toHaveLength(1));
  });

  it('clears queued autosave patches when applying remote screenplay', async () => {
    repositoryHarness.screenplay = {
      id: 'screenplay-1',
      projectId: 'project-1',
      title: 'Untitled Screenplay',
      scenes: [
        {
          id: 'scene-1',
          name: 'Scene 1',
          sceneNumber: 1,
          content:
            '<scene><slugline>INT. OFFICE - DAY</slugline><action>Old action.</action></scene>',
        },
      ],
    };

    const { ScreenplayWorkspace } = await import('./ScreenplayWorkspace');
    const workspaceRef = createRef<ScreenplayWorkspaceHandle>();
    const { getByText } = render(
      <ScreenplayWorkspace
        ref={workspaceRef}
        projectId="project-1"
        screenplayRepository={createScreenplayRepositoryStub()}
      />,
    );

    await waitFor(() => expect(editorHarness.onSceneContentChange).toBeTruthy());

    act(() => {
      getByText('Emit Edit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      await workspaceRef.current?.applyRemoteScreenplay({
        id: 'screenplay-1',
        projectId: 'project-1',
        title: 'Remote Title',
        scenes: [
          {
            id: 'scene-1',
            name: 'Remote Scene 1',
            sceneNumber: 1,
            content:
              '<scene><slugline>INT. LAB - NIGHT</slugline><action>Remote authority.</action></scene>',
          },
        ],
      });
    });

    await act(async () => {
      await wait(900);
    });

    expect(repositoryHarness.updateSceneCalls).toHaveLength(0);
    expect(getByText('Remote Scene 1')).toBeTruthy();
  });
});
