import type {
  CollectionItem,
  CollectionItemCreationPayload,
} from '../domain/collection-item.entity';
import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: Create a new collection item (from upload or AI generation).
 */
export class CreateCollectionItemUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(payload: CollectionItemCreationPayload): Promise<CollectionItem> {
    return this.collectionItemRepository.create(payload);
  }
}
