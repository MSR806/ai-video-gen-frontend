import type { Scene } from '../domain/scene.entity';
import type { SceneCreatePayload, SceneRepository } from '../ports/scene.repository.port';

/**
 * Use Case: Create Scene
 * Inserts a scene into the project and returns the canonical ordered scene list.
 */
export class CreateSceneUseCase {
  constructor(private sceneRepository: SceneRepository) {}

  async execute(projectId: string, payload: SceneCreatePayload): Promise<Scene[]> {
    return this.sceneRepository.create(projectId, payload);
  }
}
