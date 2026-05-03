import { describe, expect, it } from 'bun:test';
import type { Shot } from '../domain/shot.entity';
import type {
  GenerateShotVisualsPayload,
  ShotRepository,
  ShotVisualGenerationResult,
} from '../ports/shot.repository.port';
import { GenerateShotVisualsUseCase } from './generate-shot-visuals.use-case';

describe('GenerateShotVisualsUseCase', () => {
  it('delegates visuals generation to repository for selected shots', async () => {
    const payload: GenerateShotVisualsPayload = {
      shotIds: ['shot-1', 'shot-3'],
      modelKey: 'nano_banana',
      operationKey: 'text_to_image',
    };
    const expectedResult: ShotVisualGenerationResult[] = [
      {
        shotId: 'shot-1',
        collectionId: 'collection-1',
        runId: 'run-1',
        status: 'accepted',
        error: null,
      },
    ];
    const calls: Array<{
      projectId: string;
      sceneId: string;
      payload: GenerateShotVisualsPayload;
    }> = [];

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
      async generate(): Promise<Shot[]> {
        throw new Error('Not implemented in test');
      },
      async generateVisuals(
        projectId: string,
        sceneId: string,
        requestPayload: GenerateShotVisualsPayload,
      ): Promise<ShotVisualGenerationResult[]> {
        calls.push({ projectId, sceneId, payload: requestPayload });
        return expectedResult;
      },
    };

    const useCase = new GenerateShotVisualsUseCase(repository);
    const result = await useCase.execute('project-1', 'scene-1', payload);

    expect(calls).toEqual([{ projectId: 'project-1', sceneId: 'scene-1', payload }]);
    expect(result).toEqual(expectedResult);
  });
});
