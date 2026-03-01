import type { Scene, SceneCreatePayload, SceneRepository, SceneUpdatePayload } from '@core/scene';
import { backendApiRequest } from '@infra/http/backend-api';

interface SceneMutationResponse {
  success: boolean;
  scenes: Scene[];
}

/**
 * API-backed implementation of SceneRepository.
 */
export class SceneRepositoryImpl implements SceneRepository {
  private cache = new Map<string, Scene>();

  async getAllByProjectId(projectId: string): Promise<Scene[]> {
    const scenes = await backendApiRequest<Scene[]>(`/api/v1/projects/${projectId}/scenes`);

    scenes.forEach((scene) => {
      this.cache.set(scene.id, scene);
    });

    return scenes;
  }

  async getById(id: string): Promise<Scene | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id) || null;
    }

    return null;
  }

  async create(projectId: string, payload: SceneCreatePayload): Promise<Scene[]> {
    const response = await backendApiRequest<SceneMutationResponse>(
      `/api/v1/projects/${projectId}/scenes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.success) {
      return [];
    }

    this.replaceProjectCache(projectId, response.scenes);
    return response.scenes;
  }

  async update(projectId: string, sceneId: string, payload: SceneUpdatePayload): Promise<Scene> {
    const scene = await backendApiRequest<Scene>(
      `/api/v1/projects/${projectId}/scenes/${sceneId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    this.cache.set(scene.id, scene);
    return scene;
  }

  async delete(projectId: string, sceneId: string): Promise<Scene[]> {
    const response = await backendApiRequest<SceneMutationResponse>(
      `/api/v1/projects/${projectId}/scenes/${sceneId}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.success) {
      return [];
    }

    this.replaceProjectCache(projectId, response.scenes);
    return response.scenes;
  }

  private replaceProjectCache(projectId: string, scenes: Scene[]): void {
    const nextSceneIds = new Set(scenes.map((scene) => scene.id));

    this.cache.forEach((scene, sceneId) => {
      if (scene.projectId === projectId && !nextSceneIds.has(sceneId)) {
        this.cache.delete(sceneId);
      }
    });

    scenes.forEach((scene) => {
      this.cache.set(scene.id, scene);
    });
  }
}
