import type {
  CollectionItem,
  CollectionItemRepository,
  CollectionItemCreationPayload,
  CollectionItemGenerationParams,
  GeneratedCollectionItem,
  AspectRatio,
} from '@core/collection-item';

/**
 * Implementation of CollectionItemRepository with in-memory mock data.
 */
export class CollectionItemRepositoryImpl implements CollectionItemRepository {
  private items: CollectionItem[] = [
    {
      id: 'item-1',
      projectId: '1',
      collectionId: 'coll-1',
      mediaType: 'image',
      name: 'Narrator Portrait',
      description: 'Clean portrait for opening and voice-over sections',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      metadata: {
        width: 800,
        height: 1000,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
      },
    },
    {
      id: 'item-2',
      projectId: '1',
      collectionId: 'coll-1',
      mediaType: 'image',
      name: 'Narration Session',
      description: 'Voice-over recording setup with production equipment',
      url: 'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=800',
      metadata: {
        width: 800,
        height: 600,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=300',
      },
    },
    {
      id: 'item-3',
      projectId: '1',
      collectionId: 'coll-2',
      mediaType: 'image',
      name: 'Presenter Portrait',
      description: 'Presenter portrait in a clean professional environment',
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
      metadata: {
        width: 800,
        height: 1000,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
      },
    },
    {
      id: 'item-4',
      projectId: '1',
      collectionId: 'coll-2',
      mediaType: 'video',
      name: 'Product Demo Intro',
      description: 'Presenter-led intro highlighting core product capabilities',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      metadata: {
        duration: 15,
        width: 1920,
        height: 1080,
        format: 'mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300',
      },
    },
    {
      id: 'item-5',
      projectId: '1',
      collectionId: 'coll-3',
      mediaType: 'image',
      name: 'Customer Journey Portrait',
      description: 'Approachable visual for customer-oriented storytelling',
      url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
      metadata: {
        width: 800,
        height: 1000,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300',
      },
    },
    {
      id: 'item-6',
      projectId: '1',
      collectionId: 'coll-5',
      mediaType: 'image',
      name: 'Office Wide Shot',
      description: 'Spacious workspace with natural lighting',
      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
      metadata: {
        width: 1200,
        height: 800,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300',
      },
    },
    {
      id: 'item-7',
      projectId: '1',
      collectionId: 'coll-5',
      mediaType: 'image',
      name: 'Workspace Detail Shot',
      description: 'Desk-level detail showing day-to-day working setup',
      url: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800',
      metadata: {
        width: 1200,
        height: 800,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=300',
      },
    },
    {
      id: 'item-8',
      projectId: '1',
      collectionId: 'coll-5',
      mediaType: 'video',
      name: 'Office Walkthrough',
      description: 'Smooth walkthrough clip of the workspace',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      metadata: {
        duration: 15,
        width: 1920,
        height: 1080,
        format: 'mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300',
      },
    },
    {
      id: 'item-9',
      projectId: '1',
      collectionId: 'coll-6',
      mediaType: 'image',
      name: 'Studio Interior',
      description: 'Warm interior setup for interview and close-up shots',
      url: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800',
      metadata: {
        width: 1200,
        height: 800,
        format: 'jpg',
        thumbnailUrl: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=300',
      },
    },
  ];

  async getByCollectionId(collectionId: string): Promise<CollectionItem[]> {
    const filtered = this.items.filter((item) => item.collectionId === collectionId);
    return Promise.resolve(filtered);
  }

  async getById(id: string): Promise<CollectionItem | null> {
    const item = this.items.find((entry) => entry.id === id);
    return Promise.resolve(item || null);
  }

  async create(payload: CollectionItemCreationPayload): Promise<CollectionItem> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newId = `item-${Date.now()}`;

    const newItem: CollectionItem = {
      id: newId,
      ...payload,
    };

    this.items.push(newItem);

    return newItem;
  }

  async generateWithAI(params: CollectionItemGenerationParams): Promise<GeneratedCollectionItem> {
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const dimensions = this.getDimensionsForResolution(
      params.aspectRatio,
      params.resolution || '2k',
    );

    const randomSeed = Date.now();
    const mockImageUrl = `https://picsum.photos/seed/${randomSeed}/${dimensions.width}/${dimensions.height}`;
    const mockThumbnailUrl = `https://picsum.photos/seed/${randomSeed}/300/300`;

    const generatedItem: GeneratedCollectionItem = {
      url: params.mediaType === 'image' ? mockImageUrl : mockThumbnailUrl,
      thumbnailUrl: mockThumbnailUrl,
      width: dimensions.width,
      height: dimensions.height,
      format: params.mediaType === 'image' ? 'jpg' : 'mp4',
      ...(params.mediaType === 'video' && { duration: 10 }),
    };

    return generatedItem;
  }

  private getDimensionsForResolution(
    aspectRatio: AspectRatio,
    resolution: '2k' | '4k' | '8k' = '2k',
  ): { width: number; height: number } {
    const baseWidths = {
      '2k': 2048,
      '4k': 4096,
      '8k': 8192,
    };

    const width = baseWidths[resolution];

    switch (aspectRatio) {
      case 'square': {
        return { width, height: width };
      }
      case 'portrait': {
        const height = Math.round(width * 1.5);
        return { width, height };
      }
      case 'landscape': {
        const height = Math.round(width / 1.9);
        return { width, height };
      }
    }
  }
}
