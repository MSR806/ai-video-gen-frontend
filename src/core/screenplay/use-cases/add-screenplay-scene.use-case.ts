import type { Screenplay } from '../domain/screenplay.entity';
import type {
  ScreenplayRepository,
  ScreenplaySceneCreatePayload,
} from '../ports/screenplay.repository.port';

export class AddScreenplaySceneUseCase {
  constructor(private readonly screenplayRepository: ScreenplayRepository) {}

  async execute(projectId: string, payload: ScreenplaySceneCreatePayload): Promise<Screenplay> {
    return this.screenplayRepository.addScene(projectId, payload);
  }
}
