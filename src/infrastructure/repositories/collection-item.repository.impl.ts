import type {
  CollectionItem,
  CollectionItemCreationPayload,
  CollectionItemGenerationParams,
  CollectionItemUploadPayload,
  CollectionItemRepository,
  GeneratedCollectionItem,
} from '@core/collection-item';
import { backendApiRequest } from '@infra/http/backend-api';

/**
 * API-backed implementation of CollectionItemRepository.
 */
export class CollectionItemRepositoryImpl implements CollectionItemRepository {
  private cache = new Map<string, CollectionItem>();

  async getByCollectionId(collectionId: string): Promise<CollectionItem[]> {
    const items = await backendApiRequest<CollectionItem[]>(
      `/api/v1/collections/${collectionId}/items`,
    );

    items.forEach((item) => {
      this.cache.set(item.id, item);
    });

    return items;
  }

  async getById(id: string): Promise<CollectionItem | null> {
    return this.cache.get(id) || null;
  }

  async create(payload: CollectionItemCreationPayload): Promise<CollectionItem> {
    const { collectionId, ...requestBody } = payload;

    const created = await backendApiRequest<CollectionItem>(
      `/api/v1/collections/${collectionId}/items`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );

    this.cache.set(created.id, created);
    return created;
  }

  async upload(payload: CollectionItemUploadPayload): Promise<CollectionItem> {
    const formData = new FormData();
    formData.set('projectId', payload.projectId);
    if (typeof payload.name === 'string' && payload.name.trim().length > 0) {
      formData.set('name', payload.name);
    }
    formData.set('description', payload.description || '');
    if (payload.metadata) {
      formData.set('metadata', JSON.stringify(payload.metadata));
    }
    formData.set('file', payload.file);

    const created = await backendApiRequest<CollectionItem>(
      `/api/v1/collections/${payload.collectionId}/items/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    this.cache.set(created.id, created);
    return created;
  }

  async generateWithAI(params: CollectionItemGenerationParams): Promise<GeneratedCollectionItem> {
    const { collectionId, ...requestBody } = params;

    return backendApiRequest<GeneratedCollectionItem>(
      `/api/v1/collections/${collectionId}/items/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );
  }
}
