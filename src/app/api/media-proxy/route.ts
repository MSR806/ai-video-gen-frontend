import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_ALLOWED_MEDIA_HOSTS = ['dev.assets.mindumpai.com'];

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

const getAllowedMediaHosts = (): Set<string> => {
  const rawHosts = process.env.MEDIA_PROXY_ALLOWED_HOSTS;
  const hosts =
    typeof rawHosts === 'string' && rawHosts.trim().length > 0
      ? rawHosts.split(',')
      : DEFAULT_ALLOWED_MEDIA_HOSTS;

  return new Set(hosts.map((host) => host.trim().toLowerCase()).filter((host) => host.length > 0));
};

const isAllowedProtocol = (protocol: string): boolean => protocol === 'https:' || protocol === 'http:';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const encodedUrl = request.nextUrl.searchParams.get('url');
  if (typeof encodedUrl !== 'string' || encodedUrl.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing required query parameter "url"' },
      { status: 400 },
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(encodedUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!isAllowedProtocol(targetUrl.protocol)) {
    return NextResponse.json({ error: 'Only HTTP(S) URLs are supported' }, { status: 400 });
  }

  const allowedHosts = getAllowedMediaHosts();
  if (!allowedHosts.has(targetUrl.hostname.toLowerCase())) {
    return NextResponse.json({ error: 'Host is not allowed' }, { status: 403 });
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
      redirect: 'follow',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch media from upstream host' }, { status: 502 });
  }

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
