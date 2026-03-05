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
    });
    expect(result.status).toBe('draft');
  });
});
