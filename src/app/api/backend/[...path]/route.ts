import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

async function proxyToBackend(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await params;

  if (!Array.isArray(path) || path.length === 0) {
    return NextResponse.json({ error: 'Missing backend path' }, { status: 400 });
  }

  const targetBase = BACKEND_API_URL.replace(/\/$/, '');
  const targetPath = path.join('/');
  const targetUrl = new URL(`${targetBase}/${targetPath}`);
  targetUrl.search = new URL(request.url).search;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const method = request.method.toUpperCase();
  const requestBody = BODYLESS_METHODS.has(method) ? undefined : await request.arrayBuffer();

  const upstreamResponse = await fetch(targetUrl.toString(), {
    method,
    headers,
    body: requestBody && requestBody.byteLength > 0 ? requestBody : undefined,
    cache: 'no-store',
    redirect: 'manual',
  });

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export const dynamic = 'force-dynamic';

export const GET = proxyToBackend;
export const POST = proxyToBackend;
export const PUT = proxyToBackend;
export const PATCH = proxyToBackend;
export const DELETE = proxyToBackend;
export const OPTIONS = proxyToBackend;
export const HEAD = proxyToBackend;
