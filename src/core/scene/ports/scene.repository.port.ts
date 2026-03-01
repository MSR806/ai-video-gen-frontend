import type { Scene } from '../domain/scene.entity';

export interface SceneCreatePayload {
  id?: string;
  position?: number;
  name?: string;
  content?: Record<string, unknown>;
}

export interface SceneUpdatePayload {
  name?: string;
  content?: Record<string, unknown>;
}

/**
 * Repository interface for Scene persistence
 */
export interface SceneRepository {
  getAllByProjectId(projectId: string): Promise<Scene[]>;
  getById(id: string): Promise<Scene | null>;
  create(projectId: string, payload: SceneCreatePayload): Promise<Scene[]>;
  update(projectId: string, sceneId: string, payload: SceneUpdatePayload): Promise<Scene>;
  delete(projectId: string, sceneId: string): Promise<Scene[]>;
}
