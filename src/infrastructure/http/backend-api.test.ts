import { afterEach, describe, expect, it } from 'bun:test';
import { BackendApiError, backendApiRequest } from './backend-api';

afterEach(() => {
  delete (globalThis as Record<string, unknown>).fetch;
});

describe('backendApiRequest', () => {
  it('returns parsed JSON on success', async () => {
    let requestedUrl = '';
    let requestedInit: RequestInit | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(input);
      requestedInit = init;

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const result = await backendApiRequest<{ ok: boolean }>('/api/v1/projects');

    expect(result).toEqual({ ok: true });
    expect(requestedUrl).toBe('/api/backend/api/v1/projects');
    expect(requestedInit?.cache).toBe('no-store');
  });

  it('returns undefined for 204 responses', async () => {
    globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch;

    const result = await backendApiRequest<void>('/api/v1/projects');

    expect(result).toBeUndefined();
  });

  it('maps structured error payloads to BackendApiError', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'collection_not_found',
            message: 'Collection not found',
            details: { collectionId: 'collection-1' },
          },
        }),
        {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        },
      )) as typeof fetch;

    await expect(backendApiRequest('/api/v1/collections/collection-1')).rejects.toEqual(
      expect.objectContaining({
        name: 'BackendApiError',
        status: 404,
        code: 'collection_not_found',
        message: 'Collection not found',
        details: { collectionId: 'collection-1' },
      }),
    );
  });

  it('maps non-JSON error bodies to BackendApiError with status text fallback', async () => {
    globalThis.fetch = (async () =>
      new Response('upstream exploded', {
        status: 502,
        statusText: 'Bad Gateway',
      })) as typeof fetch;

    await expect(backendApiRequest('/api/v1/projects')).rejects.toEqual(
      expect.objectContaining({
        name: 'BackendApiError',
        status: 502,
        code: 'request_failed',
        message: '502 Bad Gateway',
      }),
    );
  });

  it('uses server absolute base and client proxy prefix', async () => {
    const originalWindow = (globalThis as Record<string, unknown>).window;

    let requestedUrl = '';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      (globalThis as Record<string, unknown>).window = undefined;

      await backendApiRequest('/api/v1/health');
      expect(requestedUrl).toBe('http://localhost:8000/api/v1/health');

      (globalThis as Record<string, unknown>).window = originalWindow;
      await backendApiRequest('/api/v1/health');
      expect(requestedUrl).toBe('/api/backend/api/v1/health');
    } finally {
      (globalThis as Record<string, unknown>).window = originalWindow;
    }
  });

  it('throws BackendApiError instances', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'No access' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    try {
      await backendApiRequest('/api/v1/projects');
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(BackendApiError);
    }
  });
});
