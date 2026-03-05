import { afterEach, describe, expect, it } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET } from './route';

afterEach(() => {
  delete (globalThis as Record<string, unknown>).fetch;
  delete process.env.MEDIA_PROXY_ALLOWED_HOSTS;
});

describe('media proxy route', () => {
  it('returns 400 for missing url query parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/media-proxy');
    const response = await GET(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Missing required query parameter "url"',
    });
  });

  it('returns 400 for invalid URL', async () => {
    const request = new NextRequest('http://localhost:3000/api/media-proxy?url=not-a-url');
    const response = await GET(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid URL' });
  });

  it('returns 403 for disallowed hosts', async () => {
    process.env.MEDIA_PROXY_ALLOWED_HOSTS = 'allowed.example.com';

    const request = new NextRequest(
      'http://localhost:3000/api/media-proxy?url=https%3A%2F%2Fblocked.example.com%2Fimg.png',
    );
    const response = await GET(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Host is not allowed' });
  });

  it('returns 502 when upstream fetch fails', async () => {
    process.env.MEDIA_PROXY_ALLOWED_HOSTS = 'assets.example.com';

    globalThis.fetch = (async () => {
      throw new Error('network failure');
    }) as typeof fetch;

    const request = new NextRequest(
      'http://localhost:3000/api/media-proxy?url=https%3A%2F%2Fassets.example.com%2Fimg.png',
    );
    const response = await GET(request);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to fetch media from upstream host',
    });
  });

  it('forwards successful upstream responses and strips hop-by-hop headers', async () => {
    process.env.MEDIA_PROXY_ALLOWED_HOSTS = 'assets.example.com';

    globalThis.fetch = (async () =>
      new Response('binary-image-data', {
        status: 206,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=60',
          Connection: 'keep-alive',
          'Transfer-Encoding': 'chunked',
        },
      })) as typeof fetch;

    const request = new NextRequest(
      'http://localhost:3000/api/media-proxy?url=https%3A%2F%2Fassets.example.com%2Fimg.png',
    );
    const response = await GET(request);

    expect(response.status).toBe(206);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(response.headers.get('connection')).toBeNull();
    expect(response.headers.get('transfer-encoding')).toBeNull();
  });
});
