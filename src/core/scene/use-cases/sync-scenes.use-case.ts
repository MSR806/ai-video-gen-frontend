import type { Scene } from '../domain/scene.entity';
import type { SceneRepository } from '../ports/scene.repository.port';

export interface SceneInput {
  id?: string;
  name?: string;
  sceneNumber?: number;
  content?: Record<string, unknown>;
}

/**
 * Use Case: Sync Scenes
 * Validates a list of scenes, normalizes numbering and content payload,
 * and synchronizes them against the SceneRepository.
 */
export class SyncScenesUseCase {
  constructor(private sceneRepository: SceneRepository) {}

  async execute(projectId: string, sceneInputs: SceneInput[]): Promise<void> {
    const normalized = this.normalizeScenes(projectId, sceneInputs);
    await this.sceneRepository.bulkSave(normalized);
  }

  private normalizeScenes(projectId: string, sceneInputs: SceneInput[]): Scene[] {
    if (!Array.isArray(sceneInputs) || sceneInputs.length === 0) {
      return [this.createDefaultScene(projectId, 1)];
    }

    return sceneInputs.map((sceneInput, index) => {
      const fallbackIndex = index + 1;
      const name =
        typeof sceneInput.name === 'string' && sceneInput.name.trim().length > 0
          ? sceneInput.name.trim()
          : `Untitled Scene ${fallbackIndex}`;

      return {
        id:
          typeof sceneInput.id === 'string' && sceneInput.id.trim().length > 0
            ? sceneInput.id
            : crypto.randomUUID(),
        projectId,
        name,
        sceneNumber: fallbackIndex,
        content: this.normalizeContent(sceneInput.content),
      };
    });
  }

  private normalizeContent(content: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return { text: '' };
    }

    return content;
  }

  private createDefaultScene(projectId: string, sceneNumber: number): Scene {
    return {
      id: crypto.randomUUID(),
      projectId,
      name: `Untitled Scene ${sceneNumber}`,
      sceneNumber,
      content: { text: '' },
    };
  }
}
