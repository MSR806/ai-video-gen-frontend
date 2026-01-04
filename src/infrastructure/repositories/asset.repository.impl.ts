import type {
  Asset,
  AssetRepository,
  AssetCreationPayload,
  GenerationParams,
  GeneratedAsset,
  AspectRatio,
} from '@core/asset';

/**
 * Implementation of AssetRepository with in-memory mock data
 */
export class AssetRepositoryImpl implements AssetRepository {
  private assets: Asset[] = [
    // Character Assets - Alex Morgan (char-1)
    {
      id: 'asset-1',
      projectId: '1',
      entityId: 'char-1',
      entityType: 'character',
      mediaType: 'image',
      name: 'Alex Morgan - Professional Headshot',
      description: 'Professional studio headshot with neutral background',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      metadata: {
        width: 800,
        height: 1000,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
      },
    },
    {
      id: 'asset-2',
      projectId: '1',
      entityId: 'char-1',
      entityType: 'character',
      mediaType: 'image',
      name: 'Alex Morgan - Recording Session',
      description: 'In the voice-over recording booth with professional equipment',
      url: 'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=800',
      metadata: {
        width: 800,
        height: 600,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=300',
      },
    },

    // Character Assets - Sarah Chen (char-2)
    {
      id: 'asset-3',
      projectId: '1',
      entityId: 'char-2',
      entityType: 'character',
      mediaType: 'image',
      name: 'Sarah Chen - Professional Portrait',
      description: 'Business professional portrait in modern office setting',
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
      metadata: {
        width: 800,
        height: 1000,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
      },
    },
    {
      id: 'asset-4',
      projectId: '1',
      entityId: 'char-2',
      entityType: 'character',
      mediaType: 'video',
      name: 'Sarah Chen - Product Demo Introduction',
      description: 'Video introduction explaining product features',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      metadata: {
        duration: 15,
        width: 1920,
        height: 1080,
        format: 'mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
      },
    },

    // Character Assets - Marcus Johnson (char-3)
    {
      id: 'asset-5',
      projectId: '1',
      entityId: 'char-3',
      entityType: 'character',
      mediaType: 'image',
      name: 'Marcus Johnson - Casual Portrait',
      description: 'Approachable portrait representing the customer persona',
      url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
      metadata: {
        width: 800,
        height: 1000,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300',
      },
    },

    // Location Assets - Modern Office (assuming loc-1)
    {
      id: 'asset-6',
      projectId: '1',
      entityId: 'loc-1',
      entityType: 'location',
      mediaType: 'image',
      name: 'Modern Office - Wide Shot',
      description: 'Spacious modern office with natural lighting and minimalist design',
      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
      metadata: {
        width: 1200,
        height: 800,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300',
      },
    },
    {
      id: 'asset-7',
      projectId: '1',
      entityId: 'loc-1',
      entityType: 'location',
      mediaType: 'image',
      name: 'Modern Office - Detail Shot',
      description: 'Close-up of workspace with laptop and coffee',
      url: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800',
      metadata: {
        width: 1200,
        height: 800,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=300',
      },
    },
    {
      id: 'asset-8',
      projectId: '1',
      entityId: 'loc-1',
      entityType: 'location',
      mediaType: 'video',
      name: 'Modern Office - Walkthrough',
      description: 'Smooth walkthrough of the modern office space',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      metadata: {
        duration: 15,
        width: 1920,
        height: 1080,
        format: 'mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300',
      },
    },

    // Location Assets - Coffee Shop (assuming loc-2)
    {
      id: 'asset-9',
      projectId: '1',
      entityId: 'loc-2',
      entityType: 'location',
      mediaType: 'image',
      name: 'Coffee Shop - Interior',
      description: 'Cozy coffee shop interior with warm lighting',
      url: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800',
      metadata: {
        width: 1200,
        height: 800,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=300',
      },
    },
  ];

  async getByEntity(entityId: string, entityType: 'character' | 'location'): Promise<Asset[]> {
    const filtered = this.assets.filter(
      (a) => a.entityId === entityId && a.entityType === entityType,
    );
    return Promise.resolve(filtered);
  }

  async getById(id: string): Promise<Asset | null> {
    const asset = this.assets.find((a) => a.id === id);
    return Promise.resolve(asset || null);
  }

  async create(payload: AssetCreationPayload): Promise<Asset> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate new ID
    const newId = `asset-${Date.now()}`;

    const newAsset: Asset = {
      id: newId,
      ...payload,
    };

    // Add to in-memory storage
    this.assets.push(newAsset);

    return newAsset;
  }

  async generateWithAI(params: GenerationParams): Promise<GeneratedAsset> {
    // Simulate AI generation delay (2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Get dimensions based on resolution
    const dimensions = this.getDimensionsForResolution(
      params.aspectRatio,
      params.mediaType,
      params.resolution || '2k',
    );

    // Mock generated asset URLs (using picsum for variety)
    const randomSeed = Date.now();
    const mockImageUrl = `https://picsum.photos/seed/${randomSeed}/${dimensions.width}/${dimensions.height}`;
    const mockThumbnailUrl = `https://picsum.photos/seed/${randomSeed}/300/300`;

    const generatedAsset: GeneratedAsset = {
      url: params.mediaType === 'image' ? mockImageUrl : mockThumbnailUrl,
      thumbnailUrl: mockThumbnailUrl,
      width: dimensions.width,
      height: dimensions.height,
      format: params.mediaType === 'image' ? 'jpg' : 'mp4',
      ...(params.mediaType === 'video' && { duration: 10 }),
    };

    return generatedAsset;
  }

  private getDimensionsForResolution(
    aspectRatio: AspectRatio,
    mediaType: 'image' | 'video',
    resolution: '2k' | '4k' | '8k' = '2k',
  ): { width: number; height: number } {
    // Base width by resolution (standard is landscape 16:9-ish)
    const baseWidths = {
      '2k': 2048,
      '4k': 4096,
      '8k': 8192,
    };

    const width = baseWidths[resolution];

    // Calculate height based on aspect ratio
    switch (aspectRatio) {
      case 'square': {
        return { width, height: width }; // 1:1
      }
      case 'portrait': {
        const height = Math.round(width * 1.5); // 2:3
        return { width, height };
      }
      case 'landscape': {
        const height = Math.round(width / 1.9); // ~16:9
        return { width, height };
      }
    }
  }
}
