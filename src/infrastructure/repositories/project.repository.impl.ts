import type { Project, ProjectCreationPayload, ProjectRepository } from '@core/project';
import { BackendApiError, backendApiRequest } from '@infra/http/backend-api';

interface ProjectDto {
  id: string;
  name: string;
  description: string;
  status: Project['status'];
  createdAt: string;
  updatedAt: string;
}

function toProject(dto: ProjectDto): Project {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    status: dto.status,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

/**
 * API-backed implementation of ProjectRepository.
 */
export class ProjectRepositoryImpl implements ProjectRepository {
  async getAllProjects(): Promise<Project[]> {
    const response = await backendApiRequest<ProjectDto[]>('/api/v1/projects');
    return response.map(toProject);
  }

  async getById(id: string): Promise<Project | null> {
    try {
      const response = await backendApiRequest<ProjectDto>(`/api/v1/projects/${id}`);
      return toProject(response);
    } catch (error) {
      if (error instanceof BackendApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async create(payload: ProjectCreationPayload): Promise<Project> {
    const response = await backendApiRequest<ProjectDto>('/api/v1/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: payload.name,
        description: payload.description,
        status: payload.status || 'draft',
      }),
    });
    return toProject(response);
  }
}
