import type { Project, ProjectCreationPayload } from '../domain/project.entity';
import type { ProjectRepository } from '../ports/project.repository.port';

/**
 * Use Case: Create Project
 * Creates a project with provided payload
 */
export class CreateProjectUseCase {
  constructor(private projectRepository: ProjectRepository) {}

  async execute(payload: ProjectCreationPayload): Promise<Project> {
    return this.projectRepository.create(payload);
  }
}
