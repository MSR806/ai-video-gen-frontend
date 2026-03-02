import type { GenerationJob, ListGenerationJobsParams } from '../domain/collection-item.entity';
import type { CollectionItemRepository } from '../ports/collection-item.repository.port';

/**
 * Use Case: List generation jobs with optional scope/status filters.
 */
export class ListGenerationJobsUseCase {
  constructor(private collectionItemRepository: CollectionItemRepository) {}

  async execute(params: ListGenerationJobsParams): Promise<GenerationJob[]> {
    return this.collectionItemRepository.listGenerationJobs(params);
  }
}
