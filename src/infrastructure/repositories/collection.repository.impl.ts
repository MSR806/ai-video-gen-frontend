import type { Collection, CollectionCreationPayload, CollectionRepository } from '@core/collection';
import { BackendApiError, backendApiRequest } from '@infra/http/backend-api';

interface CollectionDto {
  id: string;
  projectId: string;
  parentCollectionId: string | null;
  name: string;
  tag: string;
  description: string;
  thumbnailUrl?: string | null;
}

function normalizeThumbnailUrl(thumbnailUrl: string | null | undefined): string | null {
  if (typeof thumbnailUrl !== 'string') {
    return null;
  }

  const trimmedThumbnailUrl = thumbnailUrl.trim();
  return trimmedThumbnailUrl.length > 0 ? trimmedThumbnailUrl : null;
}

function toCollection(dto: CollectionDto): Collection {
  return {
    id: dto.id,
    projectId: dto.projectId,
    parentCollectionId: dto.parentCollectionId,
    name: dto.name,
    tag: dto.tag,
    description: dto.description,
    thumbnailUrl: normalizeThumbnailUrl(dto.thumbnailUrl),
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
          parentCollectionId: payload.parentCollectionId ?? null,
        }),
      },
    );
    return toCollection(response);
  }
}
