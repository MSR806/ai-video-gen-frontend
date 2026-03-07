import type { GenerationRun } from '../domain/collection-item.entity';
import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: Read generation run status.
 */
export class GetGenerationRunUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(runId: string): Promise<GenerationRun> {
    return this.collectionItemRepository.getGenerationRun(runId);
  }
}
