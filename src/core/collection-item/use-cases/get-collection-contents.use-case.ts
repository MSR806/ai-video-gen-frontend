import type { CollectionContents } from '../domain/collection-item.entity';
import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: Get collection contents (items + child collections).
 */
export class GetCollectionContentsUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(collectionId: string): Promise<CollectionContents> {
    return this.collectionItemRepository.getContentsByCollectionId(collectionId);
  }
}
