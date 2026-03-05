import type {
  CollectionContents,
  CollectionItem,
  CollectionItemCreationPayload,
  CollectionItemGenerationParams,
  GenerationAspectRatio,
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

interface ApiGenerationSubmitResponse {
  jobId: string;
  status: GenerationJob['status'];
  modelKey: string;
  operationKey: string;
}

interface ApiGenerationCapabilitiesResponse {
  image: ApiGenerationModelCapability[];
  video: ApiGenerationModelCapability[];
}

interface ApiGenerationModelCapability {
  model: string;
  modelKey: string;
  provider: string;
  operations: ApiGenerationOperationCapability[];
}

interface ApiGenerationOperationCapability {
  operationKey: string;
  endpointId: string;
  required: string[];
  fields: ApiGenerationInputFieldCapability[];
}

interface ApiGenerationInputFieldCapability {
  key: string;
  type: string;
  required: boolean;
  description: string | null;
  default?: unknown;
  enum?: unknown[] | null;
  format?: string | null;
  itemsType?: string | null;
}

interface ApiGenerationJobError {
  code?: string | null;
  message?: string | null;
}

interface ApiGenerationJob {
  id: string;
  status: GenerationJob['status'];
  operationKey: string;
  provider: string;
  modelKey: string;
  endpointId?: string | null;
  projectId: string;
  collectionId: string;
  itemId: string | null;
  outputs?: Array<Record<string, unknown>>;
  error?: ApiGenerationJobError | null;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  completedAt?: string | null;
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

const mapApiGenerationJob = (job: ApiGenerationJob): GenerationJob => {
  return {
    id: job.id,
    status: job.status,
    operationKey: job.operationKey,
    provider: job.provider,
    modelKey: job.modelKey,
    endpointId: job.endpointId ?? null,
    projectId: job.projectId,
    collectionId: job.collectionId,
    itemId: job.itemId ?? null,
    outputs: Array.isArray(job.outputs) ? job.outputs : [],
    error: job.error ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    submittedAt: job.submittedAt ?? null,
    completedAt: job.completedAt ?? null,
  };
};

const UI_ASPECT_RATIO_TO_BACKEND_VALUE: Record<GenerationAspectRatio, string> = {
  SQUARE: '1:1',
  PORTRAIT: '9:16',
  LANDSCAPE: '16:9',
};

const GENERATION_JOB_LOOKUP_MAX_ATTEMPTS = 5;
const GENERATION_ITEM_LOOKUP_MAX_ATTEMPTS = 5;
const LOOKUP_DELAY_MS = 250;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * API-backed implementation of CollectionItemRepository.
 */
export class CollectionItemRepositoryImpl implements CollectionItemRepository {
  private cache = new Map<string, CollectionItem>();

  private async getGenerationCapabilities(): Promise<ApiGenerationCapabilitiesResponse> {
    const response = await backendApiRequest<ApiGenerationCapabilitiesResponse>(
      '/api/v1/generation/capabilities',
    );

    return {
      image: Array.isArray(response.image) ? response.image : [],
      video: Array.isArray(response.video) ? response.video : [],
    };
  }

  private resolveImageOperation(
    capabilities: ApiGenerationCapabilitiesResponse,
    isImageToImage: boolean,
  ): { modelKey: string; operation: ApiGenerationOperationCapability } {
    const desiredOperationKey = isImageToImage ? 'image_to_image' : 'text_to_image';

    for (const model of capabilities.image) {
      const matchedOperation = model.operations.find(
        (operation) => operation.operationKey === desiredOperationKey,
      );

      if (matchedOperation) {
        return {
          modelKey: model.modelKey,
          operation: matchedOperation,
        };
      }
    }

    throw new Error(`No image model available for operation "${desiredOperationKey}".`);
  }

  private buildGenerationInputs(params: {
    prompt: string;
    referenceUrls: string[];
    aspectRatio: GenerationAspectRatio;
    operation: ApiGenerationOperationCapability;
  }): Record<string, unknown> {
    const { prompt, referenceUrls, aspectRatio, operation } = params;
    const inputs: Record<string, unknown> = {};
    const fieldsByKey = new Map(operation.fields.map((field) => [field.key, field]));
    const requiredSet = new Set(operation.required);

    if (fieldsByKey.has('prompt')) {
      inputs.prompt = prompt;
    } else if (requiredSet.has('prompt')) {
      throw new Error('Selected image model requires a prompt field that is not exposed.');
    }

    if (referenceUrls.length > 0) {
      if (fieldsByKey.has('image_urls')) {
        inputs.image_urls = referenceUrls;
      } else if (fieldsByKey.has('image_url')) {
        inputs.image_url = referenceUrls[0];
      } else if (requiredSet.has('image_urls') || requiredSet.has('image_url')) {
        throw new Error('Selected image edit model requires image reference fields.');
      }
    }

    if (fieldsByKey.has('aspect_ratio')) {
      const targetAspectRatio = UI_ASPECT_RATIO_TO_BACKEND_VALUE[aspectRatio];
      const aspectRatioField = fieldsByKey.get('aspect_ratio');
      const enumValues = Array.isArray(aspectRatioField?.enum)
        ? aspectRatioField.enum.filter((value): value is string => typeof value === 'string')
        : [];

      if (enumValues.length === 0 || enumValues.includes(targetAspectRatio)) {
        inputs.aspect_ratio = targetAspectRatio;
      } else if (typeof aspectRatioField?.default === 'string') {
        inputs.aspect_ratio = aspectRatioField.default;
      } else {
        inputs.aspect_ratio = enumValues[0];
      }
    }

    return inputs;
  }

  private async waitForGenerationJob(jobId: string): Promise<GenerationJob> {
    let lastJob: GenerationJob | null = null;

    for (let attempt = 1; attempt <= GENERATION_JOB_LOOKUP_MAX_ATTEMPTS; attempt += 1) {
      lastJob = await this.getGenerationJob(jobId);
      if (lastJob.itemId && lastJob.itemId.trim().length > 0) {
        return lastJob;
      }

      if (attempt < GENERATION_JOB_LOOKUP_MAX_ATTEMPTS) {
        await sleep(LOOKUP_DELAY_MS);
      }
    }

    if (lastJob) {
      return lastJob;
    }

    throw new Error('Generation job was created but could not be loaded.');
  }

  private async waitForCollectionItem(itemId: string): Promise<CollectionItem | null> {
    for (let attempt = 1; attempt <= GENERATION_ITEM_LOOKUP_MAX_ATTEMPTS; attempt += 1) {
      const item = await this.getById(itemId);
      if (item) {
        return item;
      }

      if (attempt < GENERATION_ITEM_LOOKUP_MAX_ATTEMPTS) {
        await sleep(LOOKUP_DELAY_MS);
      }
    }

    return null;
  }

  private createGeneratingFallbackItem(params: {
    itemId: string;
    jobId: string;
    projectId: string;
    collectionId: string;
    prompt: string;
  }): CollectionItem {
    return {
      id: params.itemId,
      projectId: params.projectId,
      collectionId: params.collectionId,
      jobId: params.jobId,
      mediaType: 'image',
      status: 'GENERATING',
      name: 'Generating image',
      description: params.prompt,
      url: null,
      metadata: {
        width: 0,
        height: 0,
        format: 'png',
        thumbnailUrl: '',
      },
      generationErrorMessage: null,
    };
  }

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
    const capabilities = await this.getGenerationCapabilities();
    const { modelKey, operation } = this.resolveImageOperation(capabilities, isImageToImage);
    const requestBody = {
      projectId: params.projectId,
      modelKey,
      operationKey: operation.operationKey,
      inputs: this.buildGenerationInputs({
        prompt: params.prompt,
        referenceUrls,
        aspectRatio: params.aspectRatio,
        operation,
      }),
    };

    const submitResponse = await backendApiRequest<ApiGenerationSubmitResponse>(
      `/api/v1/collections/${params.collectionId}/items/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );
    const job = await this.waitForGenerationJob(submitResponse.jobId);
    const itemId = job.itemId?.trim();

    if (!itemId) {
      throw new Error(
        'Generation started but placeholder item is not available yet. Please refresh shortly.',
      );
    }

    const generatedPlaceholder = await this.waitForCollectionItem(itemId);
    if (generatedPlaceholder) {
      return generatedPlaceholder;
    }

    const fallbackItem = this.createGeneratingFallbackItem({
      itemId,
      jobId: submitResponse.jobId,
      projectId: params.projectId,
      collectionId: params.collectionId,
      prompt: params.prompt,
    });
    this.cache.set(fallbackItem.id, fallbackItem);
    return fallbackItem;
  }

  async getGenerationJob(jobId: string): Promise<GenerationJob> {
    const response = await backendApiRequest<ApiGenerationJob>(`/api/v1/generation-jobs/${jobId}`);
    return mapApiGenerationJob(response);
  }
}
