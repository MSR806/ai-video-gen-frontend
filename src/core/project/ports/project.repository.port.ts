import type {
  Project,
  ProjectCreationPayload,
  ProjectUpdatePayload,
} from '../domain/project.entity';

/**
 * Repository interface for Project persistence
 * Defines WHAT we need, not HOW we get it
 */
export interface ProjectRepository {
  getAllProjects(): Promise<Project[]>;
  getById(id: string): Promise<Project | null>;
  create(payload: ProjectCreationPayload): Promise<Project>;
  update(id: string, payload: ProjectUpdatePayload): Promise<Project>;
}
