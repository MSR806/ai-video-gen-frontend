import type {
  ChatMessage,
  ChatRepository,
  ChatRequest,
  ChatRequestOptions,
  ChatResponse,
} from '@core/chat';
import { backendApiRequest } from '@infra/http/backend-api';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeImages = (value: unknown): ChatMessage['images'] => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const images = value
    .map((entry) => (isRecord(entry) ? asString(entry.url) : null))
    .filter((url): url is string => Boolean(url))
    .map((url) => ({ url }));

  return images.length > 0 ? images : undefined;
};

const normalizeRole = (value: unknown): ChatMessage['role'] => {
  if (value === 'assistant') {
    return value;
  }

  return 'assistant';
};

const normalizeRequestRole = (value: unknown): ChatMessage['role'] => {
  if (value === 'assistant') {
    return 'assistant';
  }

  return 'user';
};

const normalizeMessage = (value: unknown): ChatMessage | null => {
  if (typeof value === 'string') {
    const text = asString(value);
    return text ? { role: 'assistant', text } : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const text = asString(value.text);
  if (!text) {
    return null;
  }

  return {
    role: normalizeRole(value.role),
    text,
    images: normalizeImages(value.images),
  };
};

const resolveMessage = (payload: unknown): ChatMessage => {
  if (isRecord(payload)) {
    const directMessage =
      normalizeMessage(payload.message) ||
      normalizeMessage(payload.response) ||
      normalizeMessage(payload.output);

    if (directMessage) {
      return directMessage;
    }

    if (Array.isArray(payload.messages)) {
      const assistantMessage = [...payload.messages]
        .reverse()
        .map((entry) => normalizeMessage(entry))
        .find((entry) => entry && entry.role === 'assistant');

      if (assistantMessage) {
        return assistantMessage;
      }

      const lastMessage = [...payload.messages]
        .reverse()
        .map((entry) => normalizeMessage(entry))
        .find((entry) => entry !== null);

      if (lastMessage) {
        return lastMessage;
      }
    }
  }

  throw new Error('Chat API returned an invalid response payload');
};

const resolveThreadId = (payload: unknown): string | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  return asString(payload.threadId) || asString(payload.thread_id) || undefined;
};

const buildRequestBody = (request: ChatRequest): ChatRequest => {
  const normalizedMessages = request.messages.map((message) => ({
    ...message,
    role: normalizeRequestRole(message.role),
  }));

  if (!request.threadId) {
    return { messages: normalizedMessages };
  }

  return {
    ...request,
    messages: normalizedMessages,
  };
};

export class ChatRepositoryImpl implements ChatRepository {
  async send(request: ChatRequest, options?: ChatRequestOptions): Promise<ChatResponse> {
    const payload = await backendApiRequest<unknown>('/api/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildRequestBody(request)),
      signal: options?.signal,
    });

    return {
      threadId: resolveThreadId(payload),
      message: resolveMessage(payload),
    };
  }
}
