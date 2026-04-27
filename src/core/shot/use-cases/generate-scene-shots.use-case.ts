import type { Shot } from '../domain/shot.entity';
import type { ShotRepository } from '../ports/shot.repository.port';

export class GenerateSceneShotsUseCase {
  constructor(private readonly shotRepository: ShotRepository) {}

  async execute(projectId: string, sceneId: string): Promise<Shot[]> {
    return this.shotRepository.generate(projectId, sceneId);
  }
}
