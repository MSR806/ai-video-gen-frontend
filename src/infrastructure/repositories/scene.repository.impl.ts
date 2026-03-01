import type { Scene, SceneRepository } from '@core/scene';
import { BackendApiError, backendApiRequest } from '@infra/http/backend-api';

interface SceneSyncResponse {
  success: boolean;
  scenes: Scene[];
}

interface SceneSyncInput {
  id?: string;
  name?: string;
  sceneNumber?: number;
  content?: Record<string, unknown>;
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

  async bulkSave(scenes: Scene[]): Promise<void> {
    if (scenes.length === 0) return;

    const projectId = scenes[0].projectId;
    const payloadScenes: SceneSyncInput[] = scenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      sceneNumber: scene.sceneNumber,
      content: scene.content,
    }));

    try {
      const response = await backendApiRequest<SceneSyncResponse>(
        `/api/v1/projects/${projectId}/scenes`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scenes: payloadScenes }),
        },
      );

      if (response.success) {
        response.scenes.forEach((scene) => {
          this.cache.set(scene.id, scene);
        });
      }
    } catch (error) {
      if (error instanceof BackendApiError && error.status === 404) {
        return;
      }
      throw error;
    }
  }
}
