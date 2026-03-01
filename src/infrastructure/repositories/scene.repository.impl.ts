import type { Scene } from '@core/scene';
import type { SceneRepository } from '@core/scene';

/**
 * Implementation of SceneRepository
 */
declare global {
  var __mockScenes: Scene[] | undefined;
}

export class SceneRepositoryImpl implements SceneRepository {
  private get scenes(): Scene[] {
    if (!global.__mockScenes) {
      global.__mockScenes = [];
    }
    return global.__mockScenes;
  }

  private set scenes(value: Scene[]) {
    global.__mockScenes = value;
  }

  async getAllByProjectId(projectId: string): Promise<Scene[]> {
    const filtered = this.scenes.filter((s) => s.projectId === projectId);
    return Promise.resolve(filtered);
  }

  async getById(id: string): Promise<Scene | null> {
    const scene = this.scenes.find((s) => s.id === id);
    return Promise.resolve(scene || null);
  }

  async bulkSave(scenes: Scene[]): Promise<void> {
    // Replace all scenes for the project represented by this payload.
    if (scenes.length === 0) return Promise.resolve();

    const projectId = scenes[0].projectId;

    // Remove all old scenes for this project
    this.scenes = this.scenes.filter((s) => s.projectId !== projectId);

    // Add new scenes
    this.scenes.push(...scenes);

    return Promise.resolve();
  }
}
