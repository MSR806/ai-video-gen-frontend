import type { Collection } from '../domain/collection.entity';
import type { CollectionRepository } from '../ports/collection.repository.port';

/**
 * Use Case: Get Project Collections
 * Retrieves all collections for a specific project.
 */
export class GetProjectCollectionsUseCase {
  constructor(private collectionRepository: CollectionRepository) {}

  async execute(projectId: string): Promise<Collection[]> {
    return this.collectionRepository.getAllByProjectId(projectId);
  }
}
