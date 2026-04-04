import type { ScreenplayScene } from '../domain/screenplay.entity';
import type {
  ScreenplayRepository,
  ScreenplaySceneUpdatePayload,
} from '../ports/screenplay.repository.port';

export class UpdateScreenplaySceneUseCase {
  constructor(private readonly screenplayRepository: ScreenplayRepository) {}

  async execute(
    projectId: string,
    sceneId: string,
    payload: ScreenplaySceneUpdatePayload,
  ): Promise<ScreenplayScene> {
    return this.screenplayRepository.updateScene(projectId, sceneId, payload);
  }
}
