import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: Delete a collection item from a collection.
 */
export class DeleteCollectionItemUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(collectionId: string, itemId: string): Promise<void> {
    await this.collectionItemRepository.delete(collectionId, itemId);
  }
}
