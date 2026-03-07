import type {
  CollectionContents,
  CollectionItem,
  CollectionItemCreationPayload,
  CollectionItemGenerationParams,
  GenerationRun,
  GenerationRunSubmitResponse,
  CollectionItemUploadPayload,
} from '../domain/collection-item.entity';

/**
 * Repository interface for CollectionItem persistence.
 */
export interface CollectionItemRepository {
  getContentsByCollectionId(collectionId: string): Promise<CollectionContents>;
  getByCollectionId(collectionId: string): Promise<CollectionItem[]>;
  getById(id: string): Promise<CollectionItem | null>;
  create(payload: CollectionItemCreationPayload): Promise<CollectionItem>;
  delete(collectionId: string, itemId: string): Promise<void>;
  upload(payload: CollectionItemUploadPayload): Promise<CollectionItem>;
  generateWithAI(params: CollectionItemGenerationParams): Promise<GenerationRunSubmitResponse>;
  getGenerationRun(runId: string): Promise<GenerationRun>;
}
