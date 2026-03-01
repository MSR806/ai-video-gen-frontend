import type {
  CollectionItemGenerationParams,
  GeneratedCollectionItem,
} from '../domain/collection-item.entity';
import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: Generate a collection item using AI.
 */
export class GenerateCollectionItemUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(params: CollectionItemGenerationParams): Promise<GeneratedCollectionItem> {
    return this.collectionItemRepository.generateWithAI(params);
  }
}
