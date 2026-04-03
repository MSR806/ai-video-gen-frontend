import { afterEach, describe, expect, it } from 'bun:test';
import { CollectionRepositoryImpl } from './collection.repository.impl';

afterEach(() => {
  delete (globalThis as Record<string, unknown>).fetch;
});

describe('CollectionRepositoryImpl', () => {
  it('maps collection DTOs to domain entities', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            id: 'collection-1',
            projectId: 'project-1',
            parentCollectionId: null,
            name: 'Characters',
            tag: 'character',
            description: 'Character refs',
            thumbnailUrl: 'https://assets.example.com/characters.jpg',
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )) as typeof fetch;

    const repository = new CollectionRepositoryImpl();
    const result = await repository.getAllByProjectId('project-1');

    expect(result).toEqual([
      {
        id: 'collection-1',
        projectId: 'project-1',
        parentCollectionId: null,
        name: 'Characters',
        tag: 'character',
        description: 'Character refs',
        thumbnailUrl: 'https://assets.example.com/characters.jpg',
      },
    ]);
  });

  it('normalizes blank thumbnail urls to null', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          id: 'collection-1',
          projectId: 'project-1',
          parentCollectionId: null,
          name: 'Characters',
          tag: 'character',
          description: 'Character refs',
          thumbnailUrl: '   ',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )) as typeof fetch;

    const repository = new CollectionRepositoryImpl();
    const result = await repository.getById('collection-1');

    expect(result?.thumbnailUrl).toBeNull();
  });

  it('returns null for 404 in getById', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'Not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const repository = new CollectionRepositoryImpl();

    await expect(repository.getById('missing')).resolves.toBeNull();
  });

  it('posts create payload including parentCollectionId', async () => {
    let requestedBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestedBody = JSON.parse(String(init?.body));

      return new Response(
        JSON.stringify({
          id: 'collection-2',
          projectId: 'project-1',
          parentCollectionId: 'collection-1',
          name: 'Shots',
          tag: 'shot',
          description: 'Shot refs',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const repository = new CollectionRepositoryImpl();
    const result = await repository.create({
      projectId: 'project-1',
      parentCollectionId: 'collection-1',
      name: 'Shots',
      tag: 'shot',
      description: 'Shot refs',
    });

    expect(requestedBody).toEqual({
      name: 'Shots',
      tag: 'shot',
      description: 'Shot refs',
      parentCollectionId: 'collection-1',
    });
    expect(result.parentCollectionId).toBe('collection-1');
  });
});
