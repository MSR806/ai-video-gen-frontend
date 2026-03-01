import type { Collection, CollectionCreationPayload } from '../domain/collection.entity';

/**
 * Repository interface for Collection persistence.
 */
export interface CollectionRepository {
  getAllByProjectId(projectId: string): Promise<Collection[]>;
  getById(id: string): Promise<Collection | null>;
  create(payload: CollectionCreationPayload): Promise<Collection>;
}
