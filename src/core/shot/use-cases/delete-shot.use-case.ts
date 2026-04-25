import type { ShotRepository } from '../ports/shot.repository.port';

export class DeleteShotUseCase {
  constructor(private readonly shotRepository: ShotRepository) {}

  async execute(projectId: string, sceneId: string, shotId: string): Promise<void> {
    await this.shotRepository.delete(projectId, sceneId, shotId);
  }
}
