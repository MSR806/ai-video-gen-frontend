import type { ShotReorderPayload, ShotRepository } from '../ports/shot.repository.port';

export class ReorderShotsUseCase {
  constructor(private readonly shotRepository: ShotRepository) {}

  async execute(projectId: string, sceneId: string, payload: ShotReorderPayload): Promise<void> {
    await this.shotRepository.reorder(projectId, sceneId, payload);
  }
}
