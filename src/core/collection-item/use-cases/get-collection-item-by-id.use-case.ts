import type { CollectionItem } from '../domain/collection-item.entity';
import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: Read a collection item by id.
 */
export class GetCollectionItemByIdUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(itemId: string): Promise<CollectionItem | null> {
    return this.collectionItemRepository.getById(itemId);
  }
}
