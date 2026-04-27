import { describe, expect, it } from 'bun:test';
import type { Shot } from '../domain/shot.entity';
import type { ShotRepository } from '../ports/shot.repository.port';
import { GenerateSceneShotsUseCase } from './generate-scene-shots.use-case';

describe('GenerateSceneShotsUseCase', () => {
  it('delegates shot generation to repository for the selected scene', async () => {
    const expectedShots: Shot[] = [
      {
        id: 'shot-1',
        sceneId: 'scene-1',
        orderIndex: 1,
        title: 'Opening wide',
        description: 'The scene begins with an establishing shot.',
        cameraFraming: 'Wide',
        cameraMovement: 'Static',
        mood: 'Calm',
      },
    ];

    const calls: Array<{ projectId: string; sceneId: string }> = [];

    const repository: ShotRepository = {
      async getBySceneId(): Promise<Shot[]> {
        return [];
      },
      async create(): Promise<Shot> {
        throw new Error('Not implemented in test');
      },
      async update(): Promise<Shot> {
        throw new Error('Not implemented in test');
      },
      async delete(): Promise<void> {
        throw new Error('Not implemented in test');
      },
      async reorder(): Promise<void> {
        throw new Error('Not implemented in test');
      },
      async generate(projectId: string, sceneId: string): Promise<Shot[]> {
        calls.push({ projectId, sceneId });
        return expectedShots;
      },
    };

    const useCase = new GenerateSceneShotsUseCase(repository);
    const result = await useCase.execute('project-1', 'scene-1');

    expect(calls).toEqual([{ projectId: 'project-1', sceneId: 'scene-1' }]);
    expect(result).toEqual(expectedShots);
  });
});
