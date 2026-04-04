import type { Screenplay } from '../domain/screenplay.entity';
import type { ScreenplayRepository } from '../ports/screenplay.repository.port';

export class DeleteScreenplaySceneUseCase {
  constructor(private readonly screenplayRepository: ScreenplayRepository) {}

  async execute(projectId: string, sceneId: string): Promise<Screenplay> {
    return this.screenplayRepository.deleteScene(projectId, sceneId);
  }
}
