import type { Screenplay } from '../domain/screenplay.entity';
import type {
  ScreenplayCreatePayload,
  ScreenplayRepository,
} from '../ports/screenplay.repository.port';

export class CreateScreenplayUseCase {
  constructor(private readonly screenplayRepository: ScreenplayRepository) {}

  async execute(projectId: string, payload: ScreenplayCreatePayload): Promise<Screenplay> {
    return this.screenplayRepository.create(projectId, payload);
  }
}
