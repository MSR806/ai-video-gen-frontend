const SERVER_BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';
const CLIENT_BACKEND_PROXY_PREFIX = '/api/backend';

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class BackendApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(params: { status: number; code?: string; message?: string; details?: unknown }) {
    super(params.message || 'Request failed');
    this.name = 'BackendApiError';
    this.status = params.status;
    this.code = params.code || 'request_failed';
    this.details = params.details;
  }
}

function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return SERVER_BACKEND_URL.replace(/\/$/, '');
  }

  return CLIENT_BACKEND_PROXY_PREFIX;
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export async function backendApiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(buildApiUrl(path), {
    cache: 'no-store',
    ...init,
  });
}

export async function throwIfBackendApiError(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  let payload: ApiErrorPayload | null = null;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }

  throw new BackendApiError({
    status: response.status,
    code: payload?.error?.code,
    message: payload?.error?.message || `${response.status} ${response.statusText}`,
    details: payload?.error?.details,
  });
}

export async function backendApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await backendApiFetch(path, init);
  await throwIfBackendApiError(response);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
