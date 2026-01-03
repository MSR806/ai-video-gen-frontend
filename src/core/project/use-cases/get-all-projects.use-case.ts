import type { Project } from '../domain/project.entity';
import type { ProjectRepository } from '../ports/project.repository.port';

/**
 * Use Case: Get All Projects
 * Single responsibility - handles retrieving all projects
 */
export class GetAllProjectsUseCase {
  constructor(private projectRepository: ProjectRepository) {}

  async execute(): Promise<Project[]> {
    return this.projectRepository.getAllProjects();
  }
}
