import type { Scene } from '../domain/scene.entity';
import type { SceneRepository } from '../ports/scene.repository.port';

/**
 * Use Case: Delete Scene
 * Deletes one scene and returns the canonical ordered scene list.
 */
export class DeleteSceneUseCase {
  constructor(private sceneRepository: SceneRepository) {}

  async execute(projectId: string, sceneId: string): Promise<Scene[]> {
    return this.sceneRepository.delete(projectId, sceneId);
  }
}
