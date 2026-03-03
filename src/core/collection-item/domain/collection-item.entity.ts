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
export type GenerationAspectRatio = 'SQUARE' | 'PORTRAIT' | 'LANDSCAPE';

/**
 * CollectionItem Entity
 * Represents media items (images/videos) within a collection.
 */
export interface CollectionItem {
  id: string;
  projectId: string;
  collectionId: string;
  jobId?: string | null;
  mediaType: 'image' | 'video';
  status: CollectionItemStatus;
  name: string;
  description: string;
  url: string | null;
  metadata: ImageMetadata | VideoMetadata;
  generationErrorMessage?: string | null;
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
  prompt: string;
  referenceImages?: string[];
  aspectRatio: GenerationAspectRatio;
  projectId: string;
  collectionId: string;
}

export type GenerationSubmissionStatus = 'QUEUED' | 'IN_PROGRESS';

export interface GenerationSubmission {
  jobId: string;
  itemId: string;
  status: GenerationSubmissionStatus;
}

export type GenerationJobStatus = 'QUEUED' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface GenerationJobError {
  code?: string | null;
  message?: string | null;
}

export interface GenerationJob {
  id: string;
  status: GenerationJobStatus;
  operation: 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE';
  provider: string;
  modelKey: string;
  projectId: string;
  collectionId: string;
  itemId: string | null;
  error?: GenerationJobError | null;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  completedAt?: string | null;
}

/**
 * Response from AI generation API.
 */
export interface GeneratedCollectionItem {
  itemId?: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: string;
  duration?: number;
}
