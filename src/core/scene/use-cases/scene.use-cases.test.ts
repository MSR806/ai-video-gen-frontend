import { describe, expect, it } from 'bun:test';
import { CreateSceneUseCase } from './create-scene.use-case';
import { DeleteSceneUseCase } from './delete-scene.use-case';
import { GetProjectScenesUseCase } from './get-project-scenes.use-case';
import { UpdateSceneUseCase } from './update-scene.use-case';
import type { Scene, SceneCreatePayload, SceneRepository, SceneUpdatePayload } from '../index';

const sampleScene: Scene = {
  id: 'scene-1',
  projectId: 'project-1',
  name: 'Opening',
  sceneNumber: 1,
  content: { text: 'Opening shot' },
};

const sampleCreatePayload: SceneCreatePayload = {
  id: 'scene-2',
  position: 2,
  name: 'Second',
  content: { text: 'Second scene' },
};

const sampleUpdatePayload: SceneUpdatePayload = {
  name: 'Updated Scene',
  content: { text: 'Updated content' },
};

describe('scene use cases', () => {
  it('CreateSceneUseCase delegates project id + payload and returns canonical list', async () => {
    const calls: Array<{ projectId: string; payload: SceneCreatePayload }> = [];
    const repository: SceneRepository = {
      getAllByProjectId: async () => [sampleScene],
      getById: async () => sampleScene,
      create: async (projectId, payload) => {
        calls.push({ projectId, payload });
        return [sampleScene];
      },
      update: async () => sampleScene,
      delete: async () => [sampleScene],
    };

    const useCase = new CreateSceneUseCase(repository);
    const result = await useCase.execute('project-1', sampleCreatePayload);

    expect(calls).toEqual([{ projectId: 'project-1', payload: sampleCreatePayload }]);
    expect(result).toEqual([sampleScene]);
  });

  it('DeleteSceneUseCase delegates project id + scene id and returns canonical list', async () => {
    const calls: Array<{ projectId: string; sceneId: string }> = [];
    const repository: SceneRepository = {
      getAllByProjectId: async () => [sampleScene],
      getById: async () => sampleScene,
      create: async () => [sampleScene],
      update: async () => sampleScene,
      delete: async (projectId, sceneId) => {
        calls.push({ projectId, sceneId });
        return [sampleScene];
      },
    };

    const useCase = new DeleteSceneUseCase(repository);
    const result = await useCase.execute('project-1', 'scene-1');

    expect(calls).toEqual([{ projectId: 'project-1', sceneId: 'scene-1' }]);
    expect(result).toEqual([sampleScene]);
  });

  it('GetProjectScenesUseCase delegates project id and returns scenes', async () => {
    const calls: string[] = [];
    const repository: SceneRepository = {
      getAllByProjectId: async (projectId) => {
        calls.push(projectId);
        return [sampleScene];
      },
      getById: async () => sampleScene,
      create: async () => [sampleScene],
      update: async () => sampleScene,
      delete: async () => [sampleScene],
    };

    const useCase = new GetProjectScenesUseCase(repository);
    const result = await useCase.execute('project-1');

    expect(calls).toEqual(['project-1']);
    expect(result).toEqual([sampleScene]);
  });

  it('UpdateSceneUseCase delegates project id + scene id + payload and returns scene', async () => {
    const calls: Array<{ projectId: string; sceneId: string; payload: SceneUpdatePayload }> = [];
    const repository: SceneRepository = {
      getAllByProjectId: async () => [sampleScene],
      getById: async () => sampleScene,
      create: async () => [sampleScene],
      update: async (projectId, sceneId, payload) => {
        calls.push({ projectId, sceneId, payload });
        return sampleScene;
      },
      delete: async () => [sampleScene],
    };

    const useCase = new UpdateSceneUseCase(repository);
    const result = await useCase.execute('project-1', 'scene-1', sampleUpdatePayload);

    expect(calls).toEqual([
      { projectId: 'project-1', sceneId: 'scene-1', payload: sampleUpdatePayload },
    ]);
    expect(result).toEqual(sampleScene);
  });

  it('scene use cases propagate repository errors', async () => {
    const failure = new Error('scene operation failed');
    const repository: SceneRepository = {
      getAllByProjectId: async () => {
        throw failure;
      },
      getById: async () => sampleScene,
      create: async () => {
        throw failure;
      },
      update: async () => {
        throw failure;
      },
      delete: async () => {
        throw failure;
      },
    };

    await expect(
      new CreateSceneUseCase(repository).execute('project-1', sampleCreatePayload),
    ).rejects.toBe(failure);
    await expect(new DeleteSceneUseCase(repository).execute('project-1', 'scene-1')).rejects.toBe(
      failure,
    );
    await expect(new GetProjectScenesUseCase(repository).execute('project-1')).rejects.toBe(
      failure,
    );
    await expect(
      new UpdateSceneUseCase(repository).execute('project-1', 'scene-1', sampleUpdatePayload),
    ).rejects.toBe(failure);
  });
});
