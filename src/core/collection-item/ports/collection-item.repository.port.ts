import type {
  CollectionItem,
  CollectionItemCreationPayload,
  CollectionItemGenerationParams,
  CollectionItemUploadPayload,
  GeneratedCollectionItem,
} from '../domain/collection-item.entity';

/**
 * Repository interface for CollectionItem persistence.
 */
export interface CollectionItemRepository {
  getByCollectionId(collectionId: string): Promise<CollectionItem[]>;
  getById(id: string): Promise<CollectionItem | null>;
  create(payload: CollectionItemCreationPayload): Promise<CollectionItem>;
  upload(payload: CollectionItemUploadPayload): Promise<CollectionItem>;
  generateWithAI(params: CollectionItemGenerationParams): Promise<GeneratedCollectionItem>;
}
