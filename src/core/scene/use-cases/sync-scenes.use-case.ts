import type { Scene } from '../domain/scene.entity';
import type { SceneRepository } from '../ports/scene.repository.port';

export interface SceneInput {
  id?: string;
  name?: string;
  sceneNumber?: number;
  body?: string;
  content?: Record<string, unknown>;
}

/**
 * Use Case: Sync Scenes
 * Validates a list of scenes, normalizes numbering and plain text body,
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

      const bodyFromInput =
        typeof sceneInput.body === 'string' ? sceneInput.body : this.extractLegacyBody(sceneInput);

      return {
        id:
          typeof sceneInput.id === 'string' && sceneInput.id.trim().length > 0
            ? sceneInput.id
            : crypto.randomUUID(),
        projectId,
        name,
        sceneNumber: fallbackIndex,
        body: bodyFromInput,
      };
    });
  }

  private extractLegacyBody(sceneInput: SceneInput): string {
    if (!sceneInput.content || typeof sceneInput.content !== 'object') {
      return '';
    }

    return this.extractTextFromNode(sceneInput.content).trim();
  }

  private extractTextFromNode(node: unknown): string {
    if (!node) return '';

    if (typeof node === 'string') return node;

    if (Array.isArray(node)) {
      return node
        .map((item) => this.extractTextFromNode(item))
        .filter((text) => text.length > 0)
        .join('\n')
        .replace(/\n{3,}/g, '\n\n');
    }

    if (typeof node !== 'object') return '';

    const obj = node as Record<string, unknown>;

    if (obj.type === 'text' && typeof obj.text === 'string') {
      return obj.text;
    }

    if (obj.type === 'doc' && Array.isArray(obj.content)) {
      return obj.content
        .map((block) => this.extractTextFromNode(block))
        .filter((text) => text.length > 0)
        .join('\n\n')
        .replace(/\n{3,}/g, '\n\n');
    }

    if (Array.isArray(obj.content)) {
      return obj.content.map((child) => this.extractTextFromNode(child)).join('');
    }

    return '';
  }

  private createDefaultScene(projectId: string, sceneNumber: number): Scene {
    return {
      id: crypto.randomUUID(),
      projectId,
      name: `Untitled Scene ${sceneNumber}`,
      sceneNumber,
      body: '',
    };
  }
}
