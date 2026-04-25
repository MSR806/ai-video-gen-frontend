import type { Shot } from '../domain/shot.entity';
import type { ShotCreatePayload, ShotRepository } from '../ports/shot.repository.port';

export class CreateShotUseCase {
  constructor(private readonly shotRepository: ShotRepository) {}

  async execute(projectId: string, sceneId: string, payload: ShotCreatePayload): Promise<Shot> {
    return this.shotRepository.create(projectId, sceneId, payload);
  }
}
