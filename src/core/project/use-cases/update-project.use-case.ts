import type { Project, ProjectUpdatePayload } from '../domain/project.entity';
import type { ProjectRepository } from '../ports/project.repository.port';

export class UpdateProjectUseCase {
  constructor(private projectRepository: ProjectRepository) {}

  async execute(id: string, payload: ProjectUpdatePayload): Promise<Project> {
    return this.projectRepository.update(id, payload);
  }
}
