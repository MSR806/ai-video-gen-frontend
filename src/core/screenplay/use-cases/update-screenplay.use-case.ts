import type { Screenplay } from '../domain/screenplay.entity';
import type {
  ScreenplayRepository,
  ScreenplayUpdatePayload,
} from '../ports/screenplay.repository.port';

export class UpdateScreenplayUseCase {
  constructor(private readonly screenplayRepository: ScreenplayRepository) {}

  async execute(projectId: string, payload: ScreenplayUpdatePayload): Promise<Screenplay> {
    return this.screenplayRepository.update(projectId, payload);
  }
}
