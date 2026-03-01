import type { CollectionItem, CollectionItemUploadPayload } from '../domain/collection-item.entity';
import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: Upload a new collection item using multipart file upload.
 */
export class UploadCollectionItemUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(payload: CollectionItemUploadPayload): Promise<CollectionItem> {
    return this.collectionItemRepository.upload(payload);
  }
}
