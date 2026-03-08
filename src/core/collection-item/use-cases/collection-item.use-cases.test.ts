import { describe, expect, it } from 'bun:test';
import { CreateCollectionItemUseCase } from './create-collection-item.use-case';
import { DeleteCollectionItemUseCase } from './delete-collection-item.use-case';
import { GenerateCollectionItemUseCase } from './generate-collection-item.use-case';
import { GetCollectionContentsUseCase } from './get-collection-contents.use-case';
import { GetCollectionItemByIdUseCase } from './get-collection-item-by-id.use-case';
import { GetCollectionItemsUseCase } from './get-collection-items.use-case';
import { GetGenerationCapabilitiesUseCase } from './get-generation-capabilities.use-case';
import { GetGenerationRunUseCase } from './get-generation-run.use-case';
import { UploadCollectionItemUseCase } from './upload-collection-item.use-case';
import type {
  CollectionContents,
  CollectionItem,
  CollectionItemCreationPayload,
  CollectionItemGenerationParams,
  GenerationCapabilities,
  CollectionItemRepository,
  CollectionItemUploadPayload,
  GenerationRun,
  GenerationRunSubmitResponse,
} from '../index';

const sampleCollectionItem: CollectionItem = {
  id: 'item-1',
  projectId: 'project-1',
  collectionId: 'collection-1',
  runId: null,
  generationRunOutputId: null,
  mediaType: 'image',
  status: 'READY',
  name: 'Hero image',
  description: 'A hero image',
  url: 'https://example.com/image.png',
  metadata: {
    width: 1024,
    height: 1024,
    format: 'png',
    thumbnailUrl: 'https://example.com/thumb.png',
  },
  generationErrorMessage: null,
};

const sampleContents: CollectionContents = {
  items: [sampleCollectionItem],
  childCollections: [
    {
      id: 'collection-2',
      projectId: 'project-1',
      parentCollectionId: 'collection-1',
      name: 'Children',
      tag: 'child',
      description: 'Child collection',
    },
  ],
};

const sampleCreationPayload: CollectionItemCreationPayload = {
  projectId: 'project-1',
  collectionId: 'collection-1',
  mediaType: 'image',
  name: 'Hero image',
  description: 'A hero image',
  url: 'https://example.com/image.png',
  metadata: {
    width: 1024,
    height: 1024,
    format: 'png',
    thumbnailUrl: 'https://example.com/thumb.png',
  },
};

const sampleGenerationPayload: CollectionItemGenerationParams = {
  projectId: 'project-1',
  collectionId: 'collection-1',
  mediaType: 'image',
  modelKey: 'nano_banana',
  operationKey: 'image_to_image',
  inputs: {
    prompt: 'cinematic portrait',
    image_urls: ['https://example.com/ref.png'],
    aspect_ratio: '9:16',
  },
  outputCount: 2,
};

const sampleGenerationCapabilities: GenerationCapabilities = {
  image: [
    {
      model: 'Nano Banana',
      modelKey: 'nano_banana',
      provider: 'fal',
      mediaType: 'image',
      operations: [
        {
          operationKey: 'text_to_image',
          operationType: 'text_to_image',
          operationName: 'Text to Image',
          endpointId: 'fal-ai/nano-banana',
          required: ['prompt'],
          fields: [
            {
              key: 'prompt',
              type: 'string',
              required: true,
              description: 'Prompt',
            },
          ],
        },
      ],
    },
  ],
  video: [],
};

const sampleUploadPayload: CollectionItemUploadPayload = {
  projectId: 'project-1',
  collectionId: 'collection-1',
  name: 'Uploaded image',
  description: 'Upload',
  file: new File(['image-bytes'], 'image.png', { type: 'image/png' }),
};

const sampleGenerationRunSubmit: GenerationRunSubmitResponse = {
  runId: 'run-1',
  status: 'IN_PROGRESS',
  modelKey: 'model',
  operationKey: 'text_to_image',
  outputs: [
    {
      outputId: 'output-0',
      outputIndex: 0,
      status: 'QUEUED',
      collectionItemId: 'item-1',
    },
    {
      outputId: 'output-1',
      outputIndex: 1,
      status: 'QUEUED',
      collectionItemId: 'item-2',
    },
  ],
};

const sampleGenerationRun: GenerationRun = {
  runId: 'run-1',
  status: 'IN_PROGRESS',
  operationKey: 'text_to_image',
  provider: 'provider',
  modelKey: 'model',
  endpointId: null,
  projectId: 'project-1',
  requestedOutputCount: 2,
  outputs: [
    {
      outputId: 'output-0',
      outputIndex: 0,
      status: 'QUEUED',
      collectionItemId: 'item-1',
    },
    {
      outputId: 'output-1',
      outputIndex: 1,
      status: 'QUEUED',
      collectionItemId: 'item-2',
    },
  ],
  error: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  submittedAt: null,
  completedAt: null,
};

function createRepository(
  overrides: Partial<CollectionItemRepository> = {},
): CollectionItemRepository {
  return {
    getContentsByCollectionId: async () => sampleContents,
    getByCollectionId: async () => [sampleCollectionItem],
    getById: async () => sampleCollectionItem,
    create: async () => sampleCollectionItem,
    delete: async () => undefined,
    upload: async () => sampleCollectionItem,
    getGenerationCapabilities: async () => sampleGenerationCapabilities,
    generateWithAI: async () => sampleGenerationRunSubmit,
    getGenerationRun: async () => sampleGenerationRun,
    ...overrides,
  };
}

describe('collection-item use cases', () => {
  it('CreateCollectionItemUseCase delegates payload and returns created item', async () => {
    const calls: CollectionItemCreationPayload[] = [];
    const repository = createRepository({
      create: async (payload) => {
        calls.push(payload);
        return sampleCollectionItem;
      },
    });

    const useCase = new CreateCollectionItemUseCase(repository);
    const result = await useCase.execute(sampleCreationPayload);

    expect(calls).toEqual([sampleCreationPayload]);
    expect(result).toEqual(sampleCollectionItem);
  });

  it('DeleteCollectionItemUseCase delegates collection and item ids', async () => {
    const calls: Array<{ collectionId: string; itemId: string }> = [];
    const repository = createRepository({
      delete: async (collectionId, itemId) => {
        calls.push({ collectionId, itemId });
      },
    });

    const useCase = new DeleteCollectionItemUseCase(repository);
    await useCase.execute('collection-1', 'item-1');

    expect(calls).toEqual([{ collectionId: 'collection-1', itemId: 'item-1' }]);
  });

  it('GenerateCollectionItemUseCase delegates params and returns generated placeholder', async () => {
    const calls: CollectionItemGenerationParams[] = [];
    const repository = createRepository({
      generateWithAI: async (params) => {
        calls.push(params);
        return sampleGenerationRunSubmit;
      },
    });

    const useCase = new GenerateCollectionItemUseCase(repository);
    const result = await useCase.execute(sampleGenerationPayload);

    expect(calls).toEqual([sampleGenerationPayload]);
    expect(result).toEqual(sampleGenerationRunSubmit);
  });

  it('GetCollectionContentsUseCase delegates collection id and returns collection contents', async () => {
    const calls: string[] = [];
    const repository = createRepository({
      getContentsByCollectionId: async (collectionId) => {
        calls.push(collectionId);
        return sampleContents;
      },
    });

    const useCase = new GetCollectionContentsUseCase(repository);
    const result = await useCase.execute('collection-1');

    expect(calls).toEqual(['collection-1']);
    expect(result).toEqual(sampleContents);
  });

  it('GetCollectionItemsUseCase delegates collection id and returns items', async () => {
    const calls: string[] = [];
    const repository = createRepository({
      getByCollectionId: async (collectionId) => {
        calls.push(collectionId);
        return [sampleCollectionItem];
      },
    });

    const useCase = new GetCollectionItemsUseCase(repository);
    const result = await useCase.execute('collection-1');

    expect(calls).toEqual(['collection-1']);
    expect(result).toEqual([sampleCollectionItem]);
  });

  it('GetCollectionItemByIdUseCase delegates item id and returns item', async () => {
    const calls: string[] = [];
    const repository = createRepository({
      getById: async (itemId) => {
        calls.push(itemId);
        return sampleCollectionItem;
      },
    });

    const useCase = new GetCollectionItemByIdUseCase(repository);
    const result = await useCase.execute('item-1');

    expect(calls).toEqual(['item-1']);
    expect(result).toEqual(sampleCollectionItem);
  });

  it('GetGenerationRunUseCase delegates run id and returns generation run', async () => {
    const calls: string[] = [];
    const repository = createRepository({
      getGenerationRun: async (runId) => {
        calls.push(runId);
        return sampleGenerationRun;
      },
    });

    const useCase = new GetGenerationRunUseCase(repository);
    const result = await useCase.execute('run-1');

    expect(calls).toEqual(['run-1']);
    expect(result).toEqual(sampleGenerationRun);
  });

  it('GetGenerationCapabilitiesUseCase delegates and returns capabilities', async () => {
    const calls: string[] = [];
    const repository = createRepository({
      getGenerationCapabilities: async () => {
        calls.push('called');
        return sampleGenerationCapabilities;
      },
    });

    const useCase = new GetGenerationCapabilitiesUseCase(repository);
    const result = await useCase.execute();

    expect(calls).toEqual(['called']);
    expect(result).toEqual(sampleGenerationCapabilities);
  });

  it('UploadCollectionItemUseCase delegates payload and returns uploaded item', async () => {
    const calls: CollectionItemUploadPayload[] = [];
    const repository = createRepository({
      upload: async (payload) => {
        calls.push(payload);
        return sampleCollectionItem;
      },
    });

    const useCase = new UploadCollectionItemUseCase(repository);
    const result = await useCase.execute(sampleUploadPayload);

    expect(calls).toEqual([sampleUploadPayload]);
    expect(result).toEqual(sampleCollectionItem);
  });

  it('collection-item use cases propagate repository errors', async () => {
    const failure = new Error('collection-item failure');
    const failingRepo = createRepository({
      create: async () => {
        throw failure;
      },
      delete: async () => {
        throw failure;
      },
      generateWithAI: async () => {
        throw failure;
      },
      getGenerationCapabilities: async () => {
        throw failure;
      },
      getContentsByCollectionId: async () => {
        throw failure;
      },
      getByCollectionId: async () => {
        throw failure;
      },
      getById: async () => {
        throw failure;
      },
      getGenerationRun: async () => {
        throw failure;
      },
      upload: async () => {
        throw failure;
      },
    });

    await expect(
      new CreateCollectionItemUseCase(failingRepo).execute(sampleCreationPayload),
    ).rejects.toBe(failure);
    await expect(
      new DeleteCollectionItemUseCase(failingRepo).execute('collection-1', 'item-1'),
    ).rejects.toBe(failure);
    await expect(
      new GenerateCollectionItemUseCase(failingRepo).execute(sampleGenerationPayload),
    ).rejects.toBe(failure);
    await expect(
      new GetCollectionContentsUseCase(failingRepo).execute('collection-1'),
    ).rejects.toBe(failure);
    await expect(new GetCollectionItemsUseCase(failingRepo).execute('collection-1')).rejects.toBe(
      failure,
    );
    await expect(new GetCollectionItemByIdUseCase(failingRepo).execute('item-1')).rejects.toBe(
      failure,
    );
    await expect(new GetGenerationRunUseCase(failingRepo).execute('run-1')).rejects.toBe(failure);
    await expect(new GetGenerationCapabilitiesUseCase(failingRepo).execute()).rejects.toBe(failure);
    await expect(
      new UploadCollectionItemUseCase(failingRepo).execute(sampleUploadPayload),
    ).rejects.toBe(failure);
  });
});
