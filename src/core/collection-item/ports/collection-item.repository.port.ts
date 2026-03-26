import type {
  CollectionContents,
  CollectionItem,
  CollectionItemCreationPayload,
  GenerationCapabilities,
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
  setFavorite(collectionId: string, itemId: string, isFavorite: boolean): Promise<CollectionItem>;
  create(payload: CollectionItemCreationPayload): Promise<CollectionItem>;
  delete(collectionId: string, itemId: string): Promise<void>;
  upload(payload: CollectionItemUploadPayload): Promise<CollectionItem>;
  getGenerationCapabilities(): Promise<GenerationCapabilities>;
  generateWithAI(params: CollectionItemGenerationParams): Promise<GenerationRunSubmitResponse>;
  getGenerationRun(runId: string): Promise<GenerationRun>;
}
