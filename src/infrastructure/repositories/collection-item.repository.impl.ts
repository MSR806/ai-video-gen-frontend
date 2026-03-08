import type {
  CollectionContents,
  CollectionItem,
  CollectionItemCreationPayload,
  CollectionItemGenerationParams,
  GenerationCapabilities,
  GenerationInputFieldType,
  GenerationMediaType,
  GenerationModelCapability,
  GenerationOperationCapability,
  GenerationRun,
  GenerationRunSubmitResponse,
  CollectionItemStatus,
  CollectionItemUploadPayload,
  CollectionItemRepository,
  ImageMetadata,
  VideoMetadata,
} from '@core/collection-item';
import type { Collection } from '@core/collection';
import { BackendApiError, backendApiRequest } from '@infra/http/backend-api';

interface ApiCollectionItem {
  id: string;
  projectId: string;
  collectionId: string;
  runId?: string | null;
  generationRunOutputId?: string | null;
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

interface ApiGenerationRunSubmitResponse {
  runId: string;
  status: GenerationRun['status'];
  modelKey: string;
  operationKey: string;
  outputs: Array<{
    outputId: string;
    outputIndex: number;
    status: 'QUEUED' | 'READY' | 'FAILED';
    collectionItemId: string;
  }>;
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
  operationType: string;
  operationName: string;
  endpointId: string;
  required: string[];
  fields: ApiGenerationInputFieldCapability[];
  mediaGroups?: ApiGenerationMediaGroupCapability[];
}

interface ApiGenerationInputFieldCapability {
  key: string;
  type: string;
  required: boolean;
  uiGroup?: string | null;
  title?: string | null;
  description: string | null;
  default?: unknown;
  enum?: unknown[] | null;
  format?: string | null;
  itemsType?: string | null;
  minimum?: number | string | null;
  maximum?: number | string | null;
  mediaGroup?: string | null;
  mediaOrder?: number | null;
  mediaName?: string | null;
}

interface ApiGenerationMediaGroupCapability {
  groupKey: string;
  layout: 'single' | 'sequence' | 'gallery';
  placement: 'top';
}

interface ApiGenerationRunError {
  code?: string | null;
  message?: string | null;
}

interface ApiGenerationRunOutput {
  outputId: string;
  outputIndex: number;
  status: 'QUEUED' | 'READY' | 'FAILED';
  collectionItemId: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  providerOutput?: Record<string, unknown> | null;
  storedOutput?: Record<string, unknown> | null;
}

interface ApiGenerationRun {
  runId: string;
  status: GenerationRun['status'];
  operationKey: string;
  provider: string;
  modelKey: string;
  endpointId?: string | null;
  projectId: string;
  requestedOutputCount: number;
  outputs: ApiGenerationRunOutput[];
  error?: ApiGenerationRunError | null;
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
    runId: item.runId ?? null,
    generationRunOutputId: item.generationRunOutputId ?? null,
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

const mapApiGenerationRun = (run: ApiGenerationRun): GenerationRun => {
  return {
    runId: run.runId,
    status: run.status,
    operationKey: run.operationKey,
    provider: run.provider,
    modelKey: run.modelKey,
    endpointId: run.endpointId ?? null,
    projectId: run.projectId,
    requestedOutputCount: run.requestedOutputCount,
    outputs: Array.isArray(run.outputs)
      ? run.outputs.map((output) => ({
          outputId: output.outputId,
          outputIndex: output.outputIndex,
          status: output.status,
          collectionItemId: output.collectionItemId,
          errorCode: output.errorCode ?? null,
          errorMessage: output.errorMessage ?? null,
          providerOutput: output.providerOutput ?? null,
          storedOutput: output.storedOutput ?? null,
        }))
      : [],
    error: run.error ?? null,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    submittedAt: run.submittedAt ?? null,
    completedAt: run.completedAt ?? null,
  };
};

const mapApiGenerationOperations = (
  operations: ApiGenerationOperationCapability[] | undefined,
): GenerationOperationCapability[] =>
  Array.isArray(operations)
    ? operations.map((operation) => ({
        operationKey: operation.operationKey,
        operationType: operation.operationType,
        operationName: operation.operationName,
        endpointId: operation.endpointId,
        required: Array.isArray(operation.required) ? operation.required : [],
        fields: Array.isArray(operation.fields)
          ? operation.fields.map((field) => ({
              key: field.key,
              type: field.type as GenerationInputFieldType,
              required: field.required,
              uiGroup: field.uiGroup ?? null,
              title: field.title ?? null,
              description: field.description,
              default: field.default,
              enum: field.enum ?? null,
              format: field.format ?? null,
              itemsType: field.itemsType ?? null,
              minimum: field.minimum ?? null,
              maximum: field.maximum ?? null,
              mediaGroup: field.mediaGroup ?? null,
              mediaOrder: field.mediaOrder ?? null,
              mediaName: field.mediaName ?? null,
            }))
          : [],
        mediaGroups: Array.isArray(operation.mediaGroups)
          ? operation.mediaGroups.map((group) => ({
              groupKey: group.groupKey,
              layout: group.layout,
              placement: group.placement,
            }))
          : [],
      }))
    : [];

const mapApiGenerationModels = (
  models: ApiGenerationModelCapability[] | undefined,
  mediaType: GenerationMediaType,
): GenerationModelCapability[] =>
  Array.isArray(models)
    ? models.map((model) => ({
        model: model.model,
        modelKey: model.modelKey,
        provider: model.provider,
        mediaType,
        operations: mapApiGenerationOperations(model.operations),
      }))
    : [];

/**
 * API-backed implementation of CollectionItemRepository.
 */
export class CollectionItemRepositoryImpl implements CollectionItemRepository {
  private cache = new Map<string, CollectionItem>();

  async getGenerationCapabilities(): Promise<GenerationCapabilities> {
    const response = await backendApiRequest<ApiGenerationCapabilitiesResponse>(
      '/api/v1/generation/capabilities',
    );

    return {
      image: mapApiGenerationModels(response.image, 'image'),
      video: mapApiGenerationModels(response.video, 'video'),
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

  async generateWithAI(
    params: CollectionItemGenerationParams,
  ): Promise<GenerationRunSubmitResponse> {
    const requestBody = {
      projectId: params.projectId,
      modelKey: params.modelKey,
      operationKey: params.operationKey,
      inputs: params.inputs,
      outputCount: params.outputCount,
    };

    const submitResponse = await backendApiRequest<ApiGenerationRunSubmitResponse>(
      `/api/v1/collections/${params.collectionId}/generation-runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );

    return {
      runId: submitResponse.runId,
      status: submitResponse.status,
      modelKey: submitResponse.modelKey,
      operationKey: submitResponse.operationKey,
      outputs: Array.isArray(submitResponse.outputs)
        ? submitResponse.outputs.map((output) => ({
            outputId: output.outputId,
            outputIndex: output.outputIndex,
            status: output.status,
            collectionItemId: output.collectionItemId,
          }))
        : [],
    };
  }

  async getGenerationRun(runId: string): Promise<GenerationRun> {
    const response = await backendApiRequest<ApiGenerationRun>(`/api/v1/generation-runs/${runId}`);
    return mapApiGenerationRun(response);
  }
}
