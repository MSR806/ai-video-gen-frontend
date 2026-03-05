import { describe, expect, it } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ScenesEditor } from './ScenesEditor';
import type { Scene } from '@core/scene';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const baseScene: Scene = {
  id: 'scene-1',
  projectId: 'project-1',
  name: 'Scene One',
  sceneNumber: 1,
  content: { text: 'Initial content' },
};

describe('ScenesEditor', () => {
  it('initializes a default scene when scenes input is empty', () => {
    render(
      <ScenesEditor
        projectId="project-1"
        scenes={[]}
        onSceneCreate={async () => []}
        onSceneUpdate={async () => baseScene}
        onSceneDelete={async () => []}
      />,
    );

    expect(screen.getByRole('button', { name: 'Untitled Scene 1' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write scene text...')).toBeInTheDocument();
  });

  it('debounces scene updates and sends normalized content payload', async () => {
    const updateCalls: Array<{ sceneId: string; payload: Record<string, unknown> }> = [];

    render(
      <ScenesEditor
        projectId="project-1"
        scenes={[baseScene]}
        onSceneCreate={async () => [baseScene]}
        onSceneUpdate={async (sceneId, payload) => {
          updateCalls.push({ sceneId, payload: payload as Record<string, unknown> });
          return { ...baseScene, ...payload } as Scene;
        }}
        onSceneDelete={async () => [baseScene]}
      />,
    );

    const textarea = screen.getByPlaceholderText('Write scene text...');
    fireEvent.change(textarea, { target: { value: 'Updated scene text' } });

    await act(async () => {
      await wait(900);
    });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toEqual({
      sceneId: 'scene-1',
      payload: { content: { text: 'Updated scene text' } },
    });
  });

  it('flushes pending updates before creating a scene', async () => {
    const callOrder: string[] = [];

    render(
      <ScenesEditor
        projectId="project-1"
        scenes={[baseScene]}
        onSceneCreate={async (payload) => {
          callOrder.push('create');
          return [
            baseScene,
            {
              id: String(payload.id),
              projectId: 'project-1',
              name: String(payload.name),
              sceneNumber: 2,
              content: payload.content ?? { text: '' },
            },
          ];
        }}
        onSceneUpdate={async () => {
          callOrder.push('update');
          return baseScene;
        }}
        onSceneDelete={async () => [baseScene]}
      />,
    );

    const titleInput = screen.getByDisplayValue('Scene One');
    fireEvent.change(titleInput, { target: { value: 'Renamed Scene' } });

    const insertButtons = screen.getAllByRole('button', { name: 'Insert scene' });
    fireEvent.click(insertButtons[0]);

    await act(async () => {
      await wait(50);
    });

    expect(callOrder[0]).toBe('update');
    expect(callOrder[1]).toBe('create');
  });

  it('flushes pending updates before deleting a scene', async () => {
    const callOrder: string[] = [];

    render(
      <ScenesEditor
        projectId="project-1"
        scenes={[baseScene]}
        onSceneCreate={async () => [baseScene]}
        onSceneUpdate={async () => {
          callOrder.push('update');
          return baseScene;
        }}
        onSceneDelete={async () => {
          callOrder.push('delete');
          return [];
        }}
      />,
    );

    const titleInput = screen.getByDisplayValue('Scene One');
    fireEvent.change(titleInput, { target: { value: 'Rename before delete' } });

    fireEvent.click(screen.getByRole('button', { name: 'Delete scene 1' }));

    await act(async () => {
      await wait(50);
    });

    expect(callOrder[0]).toBe('update');
    expect(callOrder[1]).toBe('delete');
  });
});
