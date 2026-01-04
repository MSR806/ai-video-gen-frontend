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
