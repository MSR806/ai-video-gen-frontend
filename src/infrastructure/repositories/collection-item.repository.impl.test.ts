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

  it('chooses image_to_image generation operation when reference images are provided', async () => {
    let submitRequestBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/api/backend/api/v1/generation/capabilities')) {
        return new Response(
          JSON.stringify({
            image: [
              {
                model: 'Nano Banana',
                modelKey: 'nano-banana-pro',
                provider: 'provider',
                operations: [
                  {
                    operationKey: 'text_to_image',
                    endpointId: 'text-endpoint',
                    required: ['prompt'],
                    fields: [
                      { key: 'prompt', type: 'string', required: true, description: null },
                      {
                        key: 'aspect_ratio',
                        type: 'string',
                        required: false,
                        description: null,
                        enum: ['1:1', '9:16', '16:9'],
                      },
                    ],
                  },
                  {
                    operationKey: 'image_to_image',
                    endpointId: 'image-endpoint',
                    required: ['prompt', 'image_urls'],
                    fields: [
                      { key: 'prompt', type: 'string', required: true, description: null },
                      { key: 'image_urls', type: 'array', required: true, description: null },
                      {
                        key: 'aspect_ratio',
                        type: 'string',
                        required: false,
                        description: null,
                        enum: ['1:1', '9:16', '16:9'],
                      },
                    ],
                  },
                ],
              },
            ],
            video: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      if (url.endsWith('/api/backend/api/v1/collections/collection-1/items/generate')) {
        submitRequestBody = JSON.parse(String(init?.body));

        return new Response(
          JSON.stringify({
            jobId: 'job-1',
            status: 'QUEUED',
            modelKey: 'nano-banana-pro',
            operationKey: 'image_to_image',
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      if (url.endsWith('/api/backend/api/v1/generation-jobs/job-1')) {
        return new Response(
          JSON.stringify({
            id: 'job-1',
            status: 'IN_PROGRESS',
            operationKey: 'image_to_image',
            provider: 'provider',
            modelKey: 'nano-banana-pro',
            projectId: 'project-1',
            collectionId: 'collection-1',
            itemId: 'item-1',
            outputs: [],
            error: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
            submittedAt: null,
            completedAt: null,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      if (url.endsWith('/api/backend/api/v1/collection-items/item-1')) {
        return new Response(
          JSON.stringify({
            id: 'item-1',
            projectId: 'project-1',
            collectionId: 'collection-1',
            mediaType: 'image',
            status: 'GENERATING',
            name: 'Generating image',
            description: 'cinematic prompt',
            url: null,
            metadata: {
              width: 0,
              height: 0,
              format: 'png',
              thumbnailUrl: '',
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
    await repository.generateWithAI({
      projectId: 'project-1',
      collectionId: 'collection-1',
      prompt: 'cinematic prompt',
      aspectRatio: 'PORTRAIT',
      referenceImages: [' https://assets.example.com/ref-1.png '],
    });

    expect(submitRequestBody).toEqual({
      projectId: 'project-1',
      modelKey: 'nano-banana-pro',
      operationKey: 'image_to_image',
      inputs: {
        prompt: 'cinematic prompt',
        image_urls: ['https://assets.example.com/ref-1.png'],
        aspect_ratio: '9:16',
      },
    });
  });

  it('returns generation fallback item when placeholder item is still unavailable', async () => {
    const originalSetTimeout = globalThis.setTimeout;

    globalThis.setTimeout = ((callback: (...args: unknown[]) => void) => {
      callback();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/backend/api/v1/generation/capabilities')) {
        return new Response(
          JSON.stringify({
            image: [
              {
                model: 'Nano Banana',
                modelKey: 'nano-banana-pro',
                provider: 'provider',
                operations: [
                  {
                    operationKey: 'text_to_image',
                    endpointId: 'text-endpoint',
                    required: ['prompt'],
                    fields: [{ key: 'prompt', type: 'string', required: true, description: null }],
                  },
                ],
              },
            ],
            video: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      if (url.endsWith('/api/backend/api/v1/collections/collection-1/items/generate')) {
        return new Response(
          JSON.stringify({
            jobId: 'job-2',
            status: 'QUEUED',
            modelKey: 'nano-banana-pro',
            operationKey: 'text_to_image',
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      if (url.endsWith('/api/backend/api/v1/generation-jobs/job-2')) {
        return new Response(
          JSON.stringify({
            id: 'job-2',
            status: 'IN_PROGRESS',
            operationKey: 'text_to_image',
            provider: 'provider',
            modelKey: 'nano-banana-pro',
            projectId: 'project-1',
            collectionId: 'collection-1',
            itemId: 'item-2',
            outputs: [],
            error: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
            submittedAt: null,
            completedAt: null,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      if (url.endsWith('/api/backend/api/v1/collection-items/item-2')) {
        return new Response(JSON.stringify({ error: { message: 'Not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Unexpected request URL: ${url}`);
    }) as typeof fetch;

    try {
      const repository = new CollectionItemRepositoryImpl();
      const result = await repository.generateWithAI({
        projectId: 'project-1',
        collectionId: 'collection-1',
        prompt: 'fallback prompt',
        aspectRatio: 'SQUARE',
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'item-2',
          projectId: 'project-1',
          collectionId: 'collection-1',
          jobId: 'job-2',
          status: 'GENERATING',
          name: 'Generating image',
          description: 'fallback prompt',
          url: null,
        }),
      );
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
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
