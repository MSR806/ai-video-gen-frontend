import type { Project, ProjectCreationPayload } from '../domain/project.entity';

/**
 * Repository interface for Project persistence
 * Defines WHAT we need, not HOW we get it
 */
export interface ProjectRepository {
  getAllProjects(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  create(payload: ProjectCreationPayload): Promise<Project>;
}
