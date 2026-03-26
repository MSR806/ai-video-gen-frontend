import type { Collection } from '../../collection/domain/collection.entity';

/**
 * Metadata for image collection items.
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  thumbnailUrl: string;
}

/**
 * Metadata for video collection items.
 */
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  thumbnailUrl: string;
}

export type CollectionItemStatus = 'GENERATING' | 'READY' | 'FAILED';
export type GenerationMediaType = 'image' | 'video';
export type GenerationInputFieldType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'union';

/**
 * CollectionItem Entity
 * Represents media items (images/videos) within a collection.
 */
export interface CollectionItem {
  id: string;
  projectId: string;
  collectionId: string;
  isFavorite: boolean;
  runId?: string | null;
  generationRunOutputId?: string | null;
  mediaType: 'image' | 'video';
  status: CollectionItemStatus;
  name: string;
  description: string;
  url: string | null;
  metadata: ImageMetadata | VideoMetadata;
  generationErrorMessage?: string | null;
}

export interface CollectionContents {
  items: CollectionItem[];
  childCollections: Collection[];
}

/**
 * Collection item creation payload.
 */
export interface CollectionItemCreationPayload {
  projectId: string;
  collectionId: string;
  mediaType: 'image' | 'video';
  name: string;
  description: string;
  url: string;
  metadata: ImageMetadata | VideoMetadata;
  generationSource?: string;
}

/**
 * Multipart upload payload for collection item creation.
 */
export interface CollectionItemUploadPayload {
  projectId: string;
  collectionId: string;
  name?: string;
  description?: string;
  file: File;
  metadata?: ImageMetadata | VideoMetadata;
}

/**
 * Parameters for AI collection item generation.
 */
export interface CollectionItemGenerationParams {
  projectId: string;
  collectionId: string;
  mediaType: GenerationMediaType;
  modelKey: string;
  operationKey: string;
  inputs: Record<string, unknown>;
  outputCount: number;
}

export interface GenerationInputFieldCapability {
  key: string;
  type: GenerationInputFieldType;
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

export interface GenerationMediaGroupCapability {
  groupKey: string;
  layout: 'single' | 'sequence' | 'gallery';
  placement: 'top';
}

export interface GenerationOperationCapability {
  operationKey: string;
  operationType: string;
  operationName: string;
  endpointId: string;
  required: string[];
  fields: GenerationInputFieldCapability[];
  mediaGroups?: GenerationMediaGroupCapability[] | null;
}

export interface GenerationModelCapability {
  model: string;
  modelKey: string;
  provider: string;
  mediaType: GenerationMediaType;
  operations: GenerationOperationCapability[];
}

export interface GenerationCapabilities {
  image: GenerationModelCapability[];
  video: GenerationModelCapability[];
}

export type GenerationRunStatus =
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'SUCCEEDED'
  | 'PARTIAL_FAILED'
  | 'FAILED'
  | 'CANCELLED';

export interface GenerationRunError {
  code?: string | null;
  message?: string | null;
}

export interface GenerationRunOutput {
  outputId: string;
  outputIndex: number;
  status: 'QUEUED' | 'READY' | 'FAILED';
  collectionItemId: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  providerOutput?: Record<string, unknown> | null;
  storedOutput?: Record<string, unknown> | null;
}

export interface GenerationRun {
  runId: string;
  status: GenerationRunStatus;
  operationKey: string;
  provider: string;
  modelKey: string;
  endpointId?: string | null;
  projectId: string;
  requestedOutputCount: number;
  outputs: GenerationRunOutput[];
  error?: GenerationRunError | null;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  completedAt?: string | null;
}

export interface GenerationRunSubmitResponse {
  runId: string;
  status: GenerationRunStatus;
  modelKey: string;
  operationKey: string;
  outputs: Array<{
    outputId: string;
    outputIndex: number;
    status: 'QUEUED' | 'READY' | 'FAILED';
    collectionItemId: string;
  }>;
}
