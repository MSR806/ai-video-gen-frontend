import type { GenerationJob } from '../domain/collection-item.entity';
import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: Read generation job status.
 */
export class GetGenerationJobUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(jobId: string): Promise<GenerationJob> {
    return this.collectionItemRepository.getGenerationJob(jobId);
  }
}
