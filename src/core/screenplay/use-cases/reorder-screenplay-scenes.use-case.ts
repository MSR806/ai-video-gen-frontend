import type { Screenplay } from '../domain/screenplay.entity';
import type {
  ScreenplayRepository,
  ScreenplaySceneReorderPayload,
} from '../ports/screenplay.repository.port';

export class ReorderScreenplayScenesUseCase {
  constructor(private readonly screenplayRepository: ScreenplayRepository) {}

  async execute(projectId: string, payload: ScreenplaySceneReorderPayload): Promise<Screenplay> {
    return this.screenplayRepository.reorderScenes(projectId, payload);
  }
}
