import type { Collection, CollectionCreationPayload, CollectionRepository } from '@core/collection';
import { BackendApiError, backendApiRequest } from '@infra/http/backend-api';

interface CollectionDto {
  id: string;
  projectId: string;
  name: string;
  tag: string;
  description: string;
}

function toCollection(dto: CollectionDto): Collection {
  return {
    id: dto.id,
    projectId: dto.projectId,
    name: dto.name,
    tag: dto.tag,
    description: dto.description,
  };
}

/**
 * API-backed implementation of CollectionRepository.
 */
export class CollectionRepositoryImpl implements CollectionRepository {
  async getAllByProjectId(projectId: string): Promise<Collection[]> {
    const response = await backendApiRequest<CollectionDto[]>(
      `/api/v1/projects/${projectId}/collections`,
    );
    return response.map(toCollection);
  }

  async getById(id: string): Promise<Collection | null> {
    try {
      const response = await backendApiRequest<CollectionDto>(`/api/v1/collections/${id}`);
      return toCollection(response);
    } catch (error) {
      if (error instanceof BackendApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async create(payload: CollectionCreationPayload): Promise<Collection> {
    const response = await backendApiRequest<CollectionDto>(
      `/api/v1/projects/${payload.projectId}/collections`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: payload.name,
          tag: payload.tag,
          description: payload.description,
        }),
      },
    );
    return toCollection(response);
  }
}
