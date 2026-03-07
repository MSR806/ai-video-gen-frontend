import type { GenerationCapabilities } from '../domain/collection-item.entity';
import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: Read supported generation models/operations/fields.
 */
export class GetGenerationCapabilitiesUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(): Promise<GenerationCapabilities> {
    return this.collectionItemRepository.getGenerationCapabilities();
  }
}
