import type {
  CollectionContents,
  CollectionItem,
  CollectionItemCreationPayload,
  CollectionItemGenerationParams,
  CollectionItemStatus,
  CollectionItemUploadPayload,
  CollectionItemRepository,
  GenerationJob,
  ImageMetadata,
  VideoMetadata,
} from '@core/collection-item';
import type { Collection } from '@core/collection';
import { BackendApiError, backendApiRequest } from '@infra/http/backend-api';

interface ApiCollectionItem {
  id: string;
  projectId: string;
  collectionId: string;
  jobId?: string | null;
  mediaType: 'image' | 'video';
  status?: CollectionItemStatus;
  name: string;
  description: string;
  url: string | null;
  metadata?: unknown;
  generationErrorMessage?: string | null;
}

interface ApiCollection {
  id: string;
  projectId: string;
  parentCollectionId: string | null;
  name: string;
  tag: string;
  description: string;
}

interface ApiCollectionContentsResponse {
  items: ApiCollectionItem[];
  childCollections: ApiCollection[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeMetadata = (
  mediaType: 'image' | 'video',
  metadata: unknown,
): ImageMetadata | VideoMetadata => {
  const source = isRecord(metadata) ? metadata : {};
  const normalizedBase = {
    width: asNumber(source.width),
    height: asNumber(source.height),
    format: asString(source.format, 'png'),
    thumbnailUrl: asString(source.thumbnailUrl),
  };

  if (mediaType === 'video') {
    return {
      ...normalizedBase,
      duration: asNumber(source.duration),
    };
  }

  return normalizedBase;
};

const mapApiCollectionItem = (item: ApiCollectionItem): CollectionItem => {
  const normalizedUrl =
    typeof item.url === 'string' && item.url.trim().length > 0 ? item.url : null;

  return {
    id: item.id,
    projectId: item.projectId,
    collectionId: item.collectionId,
    jobId: item.jobId ?? null,
    mediaType: item.mediaType,
    status: item.status ?? (normalizedUrl ? 'READY' : 'GENERATING'),
    name: item.name,
    description: item.description,
    url: normalizedUrl,
    metadata: normalizeMetadata(item.mediaType, item.metadata),
    generationErrorMessage: item.generationErrorMessage ?? null,
  };
};

const mapApiCollection = (collection: ApiCollection): Collection => {
  return {
    id: collection.id,
    projectId: collection.projectId,
    parentCollectionId: collection.parentCollectionId,
    name: collection.name,
    tag: collection.tag,
    description: collection.description,
  };
};

/**
 * API-backed implementation of CollectionItemRepository.
 */
export class CollectionItemRepositoryImpl implements CollectionItemRepository {
  private cache = new Map<string, CollectionItem>();

  async getContentsByCollectionId(collectionId: string): Promise<CollectionContents> {
    const response = await backendApiRequest<ApiCollectionContentsResponse>(
      `/api/v1/collections/${collectionId}/items`,
    );
    const mappedItems = response.items.map(mapApiCollectionItem);
    const mappedChildCollections = response.childCollections.map(mapApiCollection);

    mappedItems.forEach((item) => {
      this.cache.set(item.id, item);
    });

    return {
      items: mappedItems,
      childCollections: mappedChildCollections,
    };
  }

  async getByCollectionId(collectionId: string): Promise<CollectionItem[]> {
    const contents = await this.getContentsByCollectionId(collectionId);
    return contents.items;
  }

  async getById(id: string): Promise<CollectionItem | null> {
    try {
      const item = await backendApiRequest<ApiCollectionItem>(`/api/v1/collection-items/${id}`);
      const mappedItem = mapApiCollectionItem(item);
      this.cache.set(mappedItem.id, mappedItem);
      return mappedItem;
    } catch (error) {
      if (error instanceof BackendApiError && error.status === 404) {
        this.cache.delete(id);
        return null;
      }
      throw error;
    }
  }

  async create(payload: CollectionItemCreationPayload): Promise<CollectionItem> {
    const { collectionId, ...requestBody } = payload;

    const created = await backendApiRequest<ApiCollectionItem>(
      `/api/v1/collections/${collectionId}/items`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );

    const mappedCreated = mapApiCollectionItem(created);
    this.cache.set(mappedCreated.id, mappedCreated);
    return mappedCreated;
  }

  async delete(collectionId: string, itemId: string): Promise<void> {
    await backendApiRequest<void>(`/api/v1/collections/${collectionId}/items/${itemId}`, {
      method: 'DELETE',
    });

    this.cache.delete(itemId);
  }

  async upload(payload: CollectionItemUploadPayload): Promise<CollectionItem> {
    const formData = new FormData();
    formData.set('projectId', payload.projectId);
    if (typeof payload.name === 'string' && payload.name.trim().length > 0) {
      formData.set('name', payload.name);
    }
    formData.set('description', payload.description || '');
    if (payload.metadata) {
      formData.set('metadata', JSON.stringify(payload.metadata));
    }
    formData.set('file', payload.file);

    const created = await backendApiRequest<ApiCollectionItem>(
      `/api/v1/collections/${payload.collectionId}/items/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    const mappedCreated = mapApiCollectionItem(created);
    this.cache.set(mappedCreated.id, mappedCreated);
    return mappedCreated;
  }

  async generateWithAI(params: CollectionItemGenerationParams): Promise<CollectionItem> {
    const referenceUrls = (params.referenceImages ?? [])
      .map((url) => url.trim())
      .filter((url) => /^https?:\/\//i.test(url));
    const isImageToImage = referenceUrls.length > 0;

    const requestBody: Record<string, unknown> = {
      projectId: params.projectId,
      operation: isImageToImage ? 'IMAGE_TO_IMAGE' : 'TEXT_TO_IMAGE',
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
    };

    if (isImageToImage) {
      requestBody.sourceImageUrls = [referenceUrls[0]];
    }

    const generatedPlaceholder = await backendApiRequest<ApiCollectionItem>(
      `/api/v1/collections/${params.collectionId}/items/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );

    const mappedGeneratedPlaceholder = mapApiCollectionItem(generatedPlaceholder);
    this.cache.set(mappedGeneratedPlaceholder.id, mappedGeneratedPlaceholder);
    return mappedGeneratedPlaceholder;
  }

  async getGenerationJob(jobId: string): Promise<GenerationJob> {
    return backendApiRequest<GenerationJob>(`/api/v1/generation-jobs/${jobId}`);
  }
}
