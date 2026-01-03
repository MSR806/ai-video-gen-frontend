import type { Project } from '../domain/project.entity';
import type { ProjectRepository } from '../ports/project.repository.port';

/**
 * Use Case: Get Project By ID
 * Retrieves a single project by its ID
 */
export class GetProjectByIdUseCase {
  constructor(private projectRepository: ProjectRepository) {}

  async execute(id: string): Promise<Project | null> {
    return this.projectRepository.getById(id);
  }
}
