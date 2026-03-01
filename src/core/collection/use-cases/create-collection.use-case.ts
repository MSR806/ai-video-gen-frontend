import type { Collection, CollectionCreationPayload } from '../domain/collection.entity';
import type { CollectionRepository } from '../ports/collection.repository.port';

/**
 * Use Case: Create Collection
 * Creates a collection under a project.
 */
export class CreateCollectionUseCase {
  constructor(private collectionRepository: CollectionRepository) {}

  async execute(payload: CollectionCreationPayload): Promise<Collection> {
    return this.collectionRepository.create(payload);
  }
}
