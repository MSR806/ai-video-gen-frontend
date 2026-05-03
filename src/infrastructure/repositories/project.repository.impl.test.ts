import { afterEach, describe, expect, it } from 'bun:test';
import { ProjectRepositoryImpl } from './project.repository.impl';

afterEach(() => {
  delete (globalThis as Record<string, unknown>).fetch;
});

describe('ProjectRepositoryImpl', () => {
  it('maps project DTOs to domain entities', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            id: 'project-1',
            name: 'Project One',
            description: 'Description',
            status: 'draft',
            style: 'cinematic, moody, high-contrast',
            aspectRatio: '16:9',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-02T00:00:00.000Z',
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )) as typeof fetch;

    const repository = new ProjectRepositoryImpl();
    const result = await repository.getAllProjects();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'project-1',
        name: 'Project One',
        description: 'Description',
        status: 'draft',
        style: 'cinematic, moody, high-contrast',
        aspectRatio: '16:9',
      }),
    );
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].updatedAt).toBeInstanceOf(Date);
  });

  it('returns null for 404 in getById', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'Not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const repository = new ProjectRepositoryImpl();

    await expect(repository.getById('missing-project')).resolves.toBeNull();
  });

  it('posts create payload and applies draft default status', async () => {
    let requestedUrl = '';
    let requestedBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(input);
      requestedBody = JSON.parse(String(init?.body));

      return new Response(
        JSON.stringify({
          id: 'project-1',
          name: 'New Project',
          description: 'Created',
          status: 'draft',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const repository = new ProjectRepositoryImpl();
    const result = await repository.create({
      name: 'New Project',
      description: 'Created',
    });

    expect(requestedUrl).toBe('/api/backend/api/v1/projects');
    expect(requestedBody).toEqual({
      name: 'New Project',
      description: 'Created',
      status: 'draft',
      aspectRatio: '16:9',
    });
    expect(result.status).toBe('draft');
  });

  it('posts create payload with optional style and default aspect ratio when omitted', async () => {
    let requestedBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestedBody = JSON.parse(String(init?.body));

      return new Response(
        JSON.stringify({
          id: 'project-2',
          name: 'Styled Project',
          description: 'Created',
          status: 'draft',
          style: 'documentary realism',
          aspectRatio: '16:9',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const repository = new ProjectRepositoryImpl();
    await repository.create({
      name: 'Styled Project',
      description: 'Created',
      style: 'documentary realism',
    } as never);

    expect(requestedBody).toEqual({
      name: 'Styled Project',
      description: 'Created',
      status: 'draft',
      style: 'documentary realism',
      aspectRatio: '16:9',
    });
  });

  it('posts create payload with as-provided aspect ratio when supplied', async () => {
    let requestedBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestedBody = JSON.parse(String(init?.body));

      return new Response(
        JSON.stringify({
          id: 'project-3',
          name: 'Vertical Project',
          description: 'Created',
          status: 'draft',
          style: null,
          aspectRatio: '9:16',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const repository = new ProjectRepositoryImpl();
    await repository.create({
      name: 'Vertical Project',
      description: 'Created',
      aspectRatio: '9:16',
    } as never);

    expect(requestedBody).toEqual({
      name: 'Vertical Project',
      description: 'Created',
      status: 'draft',
      aspectRatio: '9:16',
    });
  });

  it('exposes update flow and sends style/aspect ratio fields', async () => {
    let requestMethod = '';
    let requestedBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestMethod = String(init?.method);
      requestedBody = JSON.parse(String(init?.body));

      return new Response(
        JSON.stringify({
          id: 'project-1',
          name: 'Project One',
          description: 'Description',
          status: 'draft',
          style: 'anime storyboard',
          aspectRatio: '21:9',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const repository = new ProjectRepositoryImpl() as unknown as {
      update: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
    };

    await repository.update('project-1', {
      style: 'anime storyboard',
      aspectRatio: '21:9',
    });

    expect(requestMethod).toBe('PATCH');
    expect(requestedBody).toEqual(
      expect.objectContaining({
        style: 'anime storyboard',
        aspectRatio: '21:9',
      }),
    );
  });
});
