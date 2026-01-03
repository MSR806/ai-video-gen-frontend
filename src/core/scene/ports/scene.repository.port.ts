import type { Scene } from '../domain/scene.entity';

/**
 * Repository interface for Scene persistence
 */
export interface SceneRepository {
  getAllByProjectId(projectId: string): Promise<Scene[]>;
  getById(id: string): Promise<Scene | null>;
}
