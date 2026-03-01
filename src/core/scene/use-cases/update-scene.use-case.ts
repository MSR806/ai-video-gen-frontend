import type { Scene } from '../domain/scene.entity';
import type { SceneRepository, SceneUpdatePayload } from '../ports/scene.repository.port';

/**
 * Use Case: Update Scene
 * Applies partial updates to a single scene (title/content).
 */
export class UpdateSceneUseCase {
  constructor(private sceneRepository: SceneRepository) {}

  async execute(projectId: string, sceneId: string, payload: SceneUpdatePayload): Promise<Scene> {
    return this.sceneRepository.update(projectId, sceneId, payload);
  }
}
