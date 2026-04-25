import type { Shot } from '../domain/shot.entity';
import type { ShotRepository, ShotUpdatePayload } from '../ports/shot.repository.port';

export class UpdateShotUseCase {
  constructor(private readonly shotRepository: ShotRepository) {}

  async execute(
    projectId: string,
    sceneId: string,
    shotId: string,
    payload: ShotUpdatePayload,
  ): Promise<Shot> {
    return this.shotRepository.update(projectId, sceneId, shotId, payload);
  }
}
