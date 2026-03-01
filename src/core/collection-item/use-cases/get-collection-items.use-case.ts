import type { CollectionItem } from '../domain/collection-item.entity';
import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: Get all collection items for a specific collection.
 */
export class GetCollectionItemsUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(collectionId: string): Promise<CollectionItem[]> {
    return this.collectionItemRepository.getByCollectionId(collectionId);
  }
}
