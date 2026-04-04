import type { Screenplay } from '../domain/screenplay.entity';
import type { ScreenplayRepository } from '../ports/screenplay.repository.port';

export class GetProjectScreenplayUseCase {
  constructor(private readonly screenplayRepository: ScreenplayRepository) {}

  async execute(projectId: string): Promise<Screenplay | null> {
    return this.screenplayRepository.getByProjectId(projectId);
  }
}
