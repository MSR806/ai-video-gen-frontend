import type { Project } from '../domain/project.entity';

/**
 * Repository interface for Project persistence
 * Defines WHAT we need, not HOW we get it
 */
export interface ProjectRepository {
  getAllProjects(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
}
