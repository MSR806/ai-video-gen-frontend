import { afterEach, describe, expect, it } from 'bun:test';
import { CollectionItemRepositoryImpl } from './collection-item.repository.impl';

afterEach(() => {
  delete (globalThis as Record<string, unknown>).fetch;
});

describe('CollectionItemRepositoryImpl', () => {
  it('maps getContentsByCollectionId items and child collections with normalized status/metadata', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'item-1',
              projectId: 'project-1',
              collectionId: 'collection-1',
              mediaType: 'image',
              name: 'Generated',
              description: 'Placeholder',
              url: null,
              metadata: null,
            },
          ],
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
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )) as typeof fetch;

    const repository = new CollectionItemRepositoryImpl();
    const result = await repository.getContentsByCollectionId('collection-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'item-1',
        status: 'GENERATING',
        url: null,
        metadata: expect.objectContaining({
          width: 0,
          height: 0,
          format: 'png',
          thumbnailUrl: '',
        }),
      }),
    );
    expect(result.childCollections).toEqual([
      {
        id: 'collection-2',
        projectId: 'project-1',
        parentCollectionId: 'collection-1',
        name: 'Children',
        tag: 'child',
        description: 'Child collection',
      },
    ]);
  });

  it('returns null for getById on 404', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'Not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const repository = new CollectionItemRepositoryImpl();

    await expect(repository.getById('missing-item')).resolves.toBeNull();
  });

  it('patches item favorite state and returns updated item', async () => {
    let requestBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/backend/api/v1/collections/collection-1/items/item-1')) {
        requestBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            id: 'item-1',
            projectId: 'project-1',
            collectionId: 'collection-1',
            isFavorite: true,
            mediaType: 'image',
            status: 'READY',
            name: 'Item One',
            description: 'Favorite item',
            url: 'https://assets.example.com/item-1.png',
            metadata: {
              width: 768,
              height: 1024,
              format: 'png',
              thumbnailUrl: 'https://assets.example.com/item-1-thumb.png',
            },
            generationErrorMessage: null,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      throw new Error(`Unexpected request URL: ${url}`);
    }) as typeof fetch;

    const repository = new CollectionItemRepositoryImpl();
    const updated = await repository.setFavorite('collection-1', 'item-1', true);

    expect(requestBody).toEqual({ isFavorite: true });
    expect(updated.isFavorite).toBe(true);
    expect(updated.id).toBe('item-1');
  });

  it('loads and maps generation capabilities for image and video models', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/backend/api/v1/generation/capabilities')) {
        return new Response(
          JSON.stringify({
            image: [
              {
                model: 'Nano Banana',
                modelKey: 'nano-banana-pro',
                provider: 'fal',
                operations: [
                  {
                    operationKey: 'text_to_image',
                    operationType: 'text_to_image',
                    operationName: 'Text to Image',
                    endpointId: 'text-endpoint',
                    required: ['prompt'],
                    mediaGroups: [
                      {
                        groupKey: 'references',
                        layout: 'gallery',
                        placement: 'top',
                      },
                    ],
                    fields: [
                      { key: 'prompt', type: 'string', required: true, description: null },
                      {
                        key: 'aspect_ratio',
                        uiGroup: 'basic',
                        title: 'Aspect Ratio',
                        type: 'string',
                        required: false,
                        description: null,
                        enum: ['1:1', '9:16', '16:9'],
                      },
                      {
                        key: 'image_urls',
                        type: 'array',
                        required: false,
                        description: 'Reference images',
                        itemsType: 'string',
                        mediaGroup: 'references',
                        mediaName: 'Reference Images',
                      },
                    ],
                  },
                ],
              },
            ],
            video: [
              {
                model: 'Veo 3.1',
                modelKey: 'veo_3_1',
                provider: 'fal',
                operations: [
                  {
                    operationKey: 'text_to_video',
                    operationType: 'text_to_video',
                    operationName: 'Text to Video',
                    endpointId: 'video-endpoint',
                    required: ['prompt'],
                    fields: [{ key: 'prompt', type: 'string', required: true, description: null }],
                  },
                ],
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      throw new Error(`Unexpected request URL: ${url}`);
    }) as typeof fetch;

    const repository = new CollectionItemRepositoryImpl();
    const capabilities = await repository.getGenerationCapabilities();

    expect(capabilities.image).toHaveLength(1);
    expect(capabilities.image[0]).toEqual(
      expect.objectContaining({
        modelKey: 'nano-banana-pro',
        mediaType: 'image',
      }),
    );
    expect(capabilities.image[0].operations[0]).toEqual(
      expect.objectContaining({
        operationKey: 'text_to_image',
        operationType: 'text_to_image',
        operationName: 'Text to Image',
        mediaGroups: [
          {
            groupKey: 'references',
            layout: 'gallery',
            placement: 'top',
          },
        ],
      }),
    );
    expect(capabilities.image[0].operations[0].fields[1]).toEqual(
      expect.objectContaining({
        key: 'aspect_ratio',
        uiGroup: 'basic',
        title: 'Aspect Ratio',
      }),
    );
    expect(capabilities.image[0].operations[0].fields[2]).toEqual(
      expect.objectContaining({
        key: 'image_urls',
        mediaGroup: 'references',
        mediaName: 'Reference Images',
      }),
    );
    expect(capabilities.video).toHaveLength(1);
    expect(capabilities.video[0]).toEqual(
      expect.objectContaining({
        modelKey: 'veo_3_1',
        mediaType: 'video',
      }),
    );
  });

  it('submits selected model, operation and inputs for generation', async () => {
    let submitRequestBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/api/backend/api/v1/collections/collection-1/generation-runs')) {
        submitRequestBody = JSON.parse(String(init?.body));

        return new Response(
          JSON.stringify({
            runId: 'run-1',
            status: 'IN_PROGRESS',
            modelKey: 'veo_3_1',
            operationKey: 'text_to_video',
            outputs: [
              {
                outputId: 'output-1',
                outputIndex: 0,
                status: 'QUEUED',
                collectionItemId: 'item-1',
              },
            ],
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      throw new Error(`Unexpected request URL: ${url}`);
    }) as typeof fetch;

    const repository = new CollectionItemRepositoryImpl();
    const result = await repository.generateWithAI({
      projectId: 'project-1',
      collectionId: 'collection-1',
      mediaType: 'video',
      modelKey: 'veo_3_1',
      operationKey: 'text_to_video',
      inputs: {
        prompt: 'cinematic prompt',
        duration: 8,
      },
      outputCount: 1,
    });

    expect(submitRequestBody).toEqual({
      projectId: 'project-1',
      modelKey: 'veo_3_1',
      operationKey: 'text_to_video',
      inputs: {
        prompt: 'cinematic prompt',
        duration: 8,
      },
      outputCount: 1,
    });
    expect(result.runId).toBe('run-1');
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].collectionItemId).toBe('item-1');
  });

  it('loads generation run details', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/backend/api/v1/generation-runs/run-2')) {
        return new Response(
          JSON.stringify({
            runId: 'run-2',
            status: 'PARTIAL_FAILED',
            operationKey: 'text_to_image',
            provider: 'provider',
            modelKey: 'nano-banana-pro',
            endpointId: 'text-endpoint',
            projectId: 'project-1',
            requestedOutputCount: 2,
            outputs: [
              {
                outputId: 'output-1',
                outputIndex: 0,
                status: 'READY',
                collectionItemId: 'item-1',
                providerOutput: { provider_url: 'https://provider/image.png' },
                storedOutput: { storedUrl: 'https://cdn/image.png' },
              },
              {
                outputId: 'output-2',
                outputIndex: 1,
                status: 'FAILED',
                collectionItemId: 'item-2',
                errorCode: 'provider_generation_failed',
                errorMessage: 'Generation failed on provider',
              },
            ],
            error: {
              code: 'partial_failed',
              message: 'Some outputs failed',
            },
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:01:00.000Z',
            submittedAt: '2025-01-01T00:00:10.000Z',
            completedAt: '2025-01-01T00:01:00.000Z',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      throw new Error(`Unexpected request URL: ${url}`);
    }) as typeof fetch;

    const repository = new CollectionItemRepositoryImpl();
    const result = await repository.getGenerationRun('run-2');

    expect(result.runId).toBe('run-2');
    expect(result.status).toBe('PARTIAL_FAILED');
    expect(result.outputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          outputId: 'output-1',
          status: 'READY',
          collectionItemId: 'item-1',
        }),
        expect.objectContaining({
          outputId: 'output-2',
          status: 'FAILED',
          collectionItemId: 'item-2',
        }),
      ]),
    );
  });

  it('builds upload FormData payload with optional fields', async () => {
    let uploadBody: FormData | null = null;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/backend/api/v1/collections/collection-1/items/upload')) {
        uploadBody = init?.body as FormData;

        return new Response(
          JSON.stringify({
            id: 'item-uploaded',
            projectId: 'project-1',
            collectionId: 'collection-1',
            mediaType: 'image',
            status: 'READY',
            name: 'Upload One',
            description: 'Uploaded via form',
            url: 'https://assets.example.com/uploaded.png',
            metadata: {
              width: 1024,
              height: 1024,
              format: 'png',
              thumbnailUrl: 'https://assets.example.com/thumb.png',
            },
            generationErrorMessage: null,
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      throw new Error(`Unexpected request URL: ${url}`);
    }) as typeof fetch;

    const repository = new CollectionItemRepositoryImpl();
    const uploaded = await repository.upload({
      projectId: 'project-1',
      collectionId: 'collection-1',
      name: ' Upload One ',
      description: 'Uploaded via form',
      file: new File(['binary-data'], 'upload.png', { type: 'image/png' }),
      metadata: {
        width: 1024,
        height: 1024,
        format: 'png',
        thumbnailUrl: 'https://assets.example.com/thumb.png',
      },
    });

    expect(uploaded.id).toBe('item-uploaded');
    expect(uploadBody).toBeInstanceOf(FormData);

    const body = uploadBody as FormData;
    expect(body.get('projectId')).toBe('project-1');
    expect(body.get('name')).toBe(' Upload One ');
    expect(body.get('description')).toBe('Uploaded via form');
    expect(typeof body.get('metadata')).toBe('string');
    expect(body.get('file')).toBeInstanceOf(File);
  });
});
