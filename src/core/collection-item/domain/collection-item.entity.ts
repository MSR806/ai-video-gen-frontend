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

/**
 * CollectionItem Entity
 * Represents media items (images/videos) within a collection.
 */
export interface CollectionItem {
  id: string;
  projectId: string;
  collectionId: string;
  mediaType: 'image' | 'video';
  name: string;
  description: string;
  url: string;
  metadata: ImageMetadata | VideoMetadata;
}

/**
 * Collection item creation payload.
 */
export type CollectionItemCreationPayload = Omit<CollectionItem, 'id'>;

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
 * Aspect ratio options for AI generation.
 */
export type AspectRatio = 'square' | 'portrait' | 'landscape';

/**
 * Resolution quality for generation.
 */
export type Resolution = '2k' | '4k' | '8k';

/**
 * Batch size for generating multiple variations.
 */
export type BatchSize = 1 | 2 | 3 | 4;

/**
 * Camera body for photography setup.
 */
export interface CameraBody {
  id: string;
  name: string;
  type: 'cinema' | 'dslr' | 'mirrorless';
}

/**
 * Camera lens.
 */
export interface Lens {
  id: string;
  name: string;
  brand: string;
  type: 'prime' | 'zoom';
}

/**
 * Focal length option.
 */
export interface FocalLength {
  value: number;
  label: string;
  category: 'ultra-wide' | 'wide' | 'standard' | 'portrait' | 'telephoto';
}

/**
 * Complete camera setup configuration.
 */
export interface CameraSetup {
  camera: CameraBody;
  lens: Lens;
  focalLength: FocalLength;
}

/**
 * Parameters for AI collection item generation.
 */
export interface CollectionItemGenerationParams {
  prompt: string;
  aspectRatio: AspectRatio;
  mediaType: 'image' | 'video';
  referenceImages?: string[];
  projectId: string;
  collectionId: string;
  cameraSetup?: CameraSetup;
  resolution?: Resolution;
  batchSize?: BatchSize;
}

/**
 * Response from AI generation API.
 */
export interface GeneratedCollectionItem {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: string;
  duration?: number;
}
