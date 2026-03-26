import type { CollectionItem } from '../domain/collection-item.entity';
import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: Set collection item favorite flag.
 */
export class SetCollectionItemFavoriteUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(
    collectionId: string,
    itemId: string,
    isFavorite: boolean,
  ): Promise<CollectionItem> {
    return this.collectionItemRepository.setFavorite(collectionId, itemId, isFavorite);
  }
}
