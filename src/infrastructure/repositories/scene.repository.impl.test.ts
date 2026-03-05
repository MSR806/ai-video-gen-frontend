import { afterEach, describe, expect, it } from 'bun:test';
import { SceneRepositoryImpl } from './scene.repository.impl';

afterEach(() => {
  delete (globalThis as Record<string, unknown>).fetch;
});

describe('SceneRepositoryImpl', () => {
  it('caches scenes after getAllByProjectId and resolves getById from cache', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            id: 'scene-1',
            projectId: 'project-1',
            name: 'Opening',
            sceneNumber: 1,
            content: { text: 'Opening scene' },
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )) as typeof fetch;

    const repository = new SceneRepositoryImpl();
    const scenes = await repository.getAllByProjectId('project-1');
    const cached = await repository.getById('scene-1');

    expect(scenes).toHaveLength(1);
    expect(cached).toEqual(scenes[0]);
  });

  it('returns empty array when create response is unsuccessful', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: false, scenes: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const repository = new SceneRepositoryImpl();
    const result = await repository.create('project-1', {
      id: 'scene-2',
      position: 2,
      name: 'New Scene',
      content: { text: 'content' },
    });

    expect(result).toEqual([]);
  });

  it('updates cache after delete and removes scene ids not returned by backend', async () => {
    let callCount = 0;
    globalThis.fetch = (async () => {
      callCount += 1;

      if (callCount === 1) {
        return new Response(
          JSON.stringify([
            {
              id: 'scene-1',
              projectId: 'project-1',
              name: 'Opening',
              sceneNumber: 1,
              content: { text: 'Opening scene' },
            },
            {
              id: 'scene-2',
              projectId: 'project-1',
              name: 'Second',
              sceneNumber: 2,
              content: { text: 'Second scene' },
            },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          scenes: [
            {
              id: 'scene-1',
              projectId: 'project-1',
              name: 'Opening',
              sceneNumber: 1,
              content: { text: 'Opening scene' },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const repository = new SceneRepositoryImpl();
    await repository.getAllByProjectId('project-1');

    const remaining = await repository.delete('project-1', 'scene-2');
    const removedFromCache = await repository.getById('scene-2');

    expect(remaining).toHaveLength(1);
    expect(removedFromCache).toBeNull();
  });

  it('stores updated scene in cache', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          id: 'scene-1',
          projectId: 'project-1',
          name: 'Renamed',
          sceneNumber: 1,
          content: { text: 'updated' },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )) as typeof fetch;

    const repository = new SceneRepositoryImpl();
    const updated = await repository.update('project-1', 'scene-1', {
      name: 'Renamed',
      content: { text: 'updated' },
    });

    const cached = await repository.getById('scene-1');
    expect(updated.name).toBe('Renamed');
    expect(cached).toEqual(updated);
  });
});
