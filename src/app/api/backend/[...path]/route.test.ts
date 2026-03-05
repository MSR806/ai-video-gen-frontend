import { afterEach, describe, expect, it } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

afterEach(() => {
  delete (globalThis as Record<string, unknown>).fetch;
});

describe('backend proxy route', () => {
  it('returns 400 when path params are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/backend');

    const response = await GET(request, {
      params: Promise.resolve({ path: [] }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing backend path' });
  });

  it('forwards method, query and body to backend', async () => {
    let upstreamUrl = '';
    let upstreamInit: RequestInit | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      upstreamUrl = String(input);
      upstreamInit = init;

      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'X-Upstream': 'yes',
          'Transfer-Encoding': 'chunked',
        },
      });
    }) as typeof fetch;

    const request = new NextRequest(
      'http://localhost:3000/api/backend/api/v1/projects?draft=true',
      {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          connection: 'keep-alive',
          'content-type': 'application/json',
          'x-client': 'frontend',
        },
        body: JSON.stringify({ name: 'Project One' }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ path: ['api', 'v1', 'projects'] }),
    });

    expect(upstreamUrl).toBe('http://localhost:8000/api/v1/projects?draft=true');
    expect(upstreamInit?.method).toBe('POST');
    expect((upstreamInit?.headers as Headers).get('host')).toBeNull();
    expect((upstreamInit?.headers as Headers).get('x-client')).toBe('frontend');
    expect(response.status).toBe(201);
    expect(response.headers.get('x-upstream')).toBe('yes');
    expect(response.headers.get('transfer-encoding')).toBeNull();
  });

  it('does not forward body for GET requests', async () => {
    let upstreamInit: RequestInit | undefined;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      upstreamInit = init;
      return new Response('ok', { status: 200 });
    }) as typeof fetch;

    const request = new NextRequest('http://localhost:3000/api/backend/api/v1/projects', {
      method: 'GET',
    });

    await GET(request, {
      params: Promise.resolve({ path: ['api', 'v1', 'projects'] }),
    });

    expect(upstreamInit?.method).toBe('GET');
    expect(upstreamInit?.body).toBeUndefined();
  });
});
