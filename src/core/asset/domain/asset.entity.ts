/**
 * Metadata for image assets
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string; // e.g., 'jpg', 'png', 'webp'
  thumbnailUrl: string;
}

/**
 * Metadata for video assets
 */
export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  format: string; // e.g., 'mp4', 'webm', 'mov'
  thumbnailUrl: string;
}

/**
 * Asset Entity
 * Represents media assets (images/videos) associated with characters or locations
 */
export interface Asset {
  id: string;
  projectId: string;
  entityId: string; // Generic ID - references characterId OR locationId
  entityType: 'character' | 'location';
  mediaType: 'image' | 'video';
  name: string;
  description: string;
  url: string; // URL to the actual media file
  metadata: ImageMetadata | VideoMetadata;
}

/**
 * Asset creation payload (without ID, as it's generated)
 */
export type AssetCreationPayload = Omit<Asset, 'id'>;

/**
 * Aspect ratio options for AI generation
 */
export type AspectRatio = 'square' | 'portrait' | 'landscape';

/**
 * Resolution quality for generation
 */
export type Resolution = '2k' | '4k' | '8k';

/**
 * Batch size for generating multiple variations
 */
export type BatchSize = 1 | 2 | 3 | 4;

/**
 * Camera body for photography setup
 */
export interface CameraBody {
  id: string;
  name: string;
  type: 'cinema' | 'dslr' | 'mirrorless';
}

/**
 * Camera lens
 */
export interface Lens {
  id: string;
  name: string;
  brand: string;
  type: 'prime' | 'zoom';
}

/**
 * Focal length option
 */
export interface FocalLength {
  value: number; // in mm
  label: string; // '24 mm'
  category: 'ultra-wide' | 'wide' | 'standard' | 'portrait' | 'telephoto';
}

/**
 * Complete camera setup configuration
 */
export interface CameraSetup {
  camera: CameraBody;
  lens: Lens;
  focalLength: FocalLength;
}

/**
 * Parameters for AI asset generation
 */
export interface GenerationParams {
  prompt: string;
  aspectRatio: AspectRatio;
  mediaType: 'image' | 'video';
  referenceImages?: string[]; // URLs or base64 of reference images
  projectId: string;
  entityId: string;
  entityType: 'character' | 'location';
  // New fields for enhanced generation
  cameraSetup?: CameraSetup;
  resolution?: Resolution;
  batchSize?: BatchSize;
}

/**
 * Response from AI generation API
 */
export interface GeneratedAsset {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: string;
  duration?: number; // For videos
}
