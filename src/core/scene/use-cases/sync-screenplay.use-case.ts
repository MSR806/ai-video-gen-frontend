import type { Scene } from '../domain/scene.entity';
import type { SceneRepository } from '../ports/scene.repository.port';

/**
 * Use Case: Sync Screenplay To Scenes
 * Parses the continuous JSON document from the editor, extracts all text between Slugline blocks,
 * and synchronizes them against the SceneRepository.
 */
export class SyncScreenplayToScenesUseCase {
  constructor(private sceneRepository: SceneRepository) {}

  async execute(projectId: string, screenplayDoc: Record<string, unknown> | null): Promise<void> {
    if (!screenplayDoc || !screenplayDoc.content || !Array.isArray(screenplayDoc.content)) {
      return; // Invalid document
    }

    const blocks = screenplayDoc.content as Record<string, unknown>[];
    const scenesToSave: Scene[] = [];

    let currentSceneBlocks: Record<string, unknown>[] = [];
    let currentSceneId: string | null = null;
    let sceneCounter = 0;

    for (const block of blocks) {
      if (block.type === 'slugline') {
        // Save the previous scene if it exists.
        if (currentSceneBlocks.length > 0 || currentSceneId) {
          if (!currentSceneId) {
            currentSceneId = crypto.randomUUID();
          }
          sceneCounter++;
          scenesToSave.push({
            id: currentSceneId,
            projectId,
            sceneNumber: sceneCounter,
            name: this.extractTextFromBlock(currentSceneBlocks[0]),
            content: { type: 'doc', content: currentSceneBlocks },
            locationId: '', // To be filled later
            characterIds: [], // To be filled later
          });
        }

        // Start a new scene block collection
        currentSceneBlocks = [block];
        // If the slugline has an ID attribute, preserve it, else generate one.
        const attrs = (block.attrs as Record<string, unknown>) || {};
        currentSceneId = (attrs.id as string) || crypto.randomUUID();

        // Ensure the block in the doc also gets this ID
        attrs.id = currentSceneId;
        block.attrs = attrs;
      } else {
        // Add to current scene blocks
        if (!currentSceneId && currentSceneBlocks.length === 0) {
          currentSceneId = crypto.randomUUID();
        }
        currentSceneBlocks.push(block);
      }
    }

    // Save the last scene
    if (currentSceneBlocks.length > 0) {
      sceneCounter++;
      scenesToSave.push({
        id: currentSceneId!,
        projectId,
        sceneNumber: sceneCounter,
        name: this.extractTextFromBlock(currentSceneBlocks[0]),
        content: { type: 'doc', content: currentSceneBlocks },
        locationId: '',
        characterIds: [],
      });
    }

    await this.sceneRepository.bulkSave(scenesToSave);
  }

  private extractTextFromBlock(block: Record<string, unknown>): string {
    if (!block || !block.content || !Array.isArray(block.content)) return 'Untitled Scene';
    const texts = block.content
      .filter((c: Record<string, unknown>) => c.type === 'text')
      .map((c: Record<string, unknown>) => c.text as string);
    return texts.join(' ') || 'Untitled Scene';
  }
}
