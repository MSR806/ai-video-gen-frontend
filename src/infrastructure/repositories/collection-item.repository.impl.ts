import type {
  CollectionItem,
  CollectionItemCreationPayload,
  CollectionItemGenerationParams,
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
