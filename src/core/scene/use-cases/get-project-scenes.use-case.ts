import type { Scene } from '../domain/scene.entity';
import type { SceneRepository } from '../ports/scene.repository.port';

/**
 * Use Case: Get Project Scenes
 * Retrieves all scenes for a specific project
 */
export class GetProjectScenesUseCase {
  constructor(private sceneRepository: SceneRepository) {}

  async execute(projectId: string): Promise<Scene[]> {
    return this.sceneRepository.getAllByProjectId(projectId);
  }
}
