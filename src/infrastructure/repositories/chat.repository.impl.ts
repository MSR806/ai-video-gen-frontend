import type {
  ChatMessage,
  ChatRepository,
  ChatRequest,
  ChatRequestOptions,
  ChatResponse,
  ChatStreamEvent,
} from '@core/chat';
import { createEmptySceneXml, type Screenplay, type ScreenplayScene } from '@core/screenplay';
import { backendApiRequest } from '@infra/http/backend-api';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const asStringPreserveWhitespace = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

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

const resolveDidMutate = (payload: unknown): boolean | undefined => {
  if (!isRecord(payload) || typeof payload.didMutate !== 'boolean') {
    return undefined;
  }

  return payload.didMutate;
};

const normalizeSceneFromPayload = (scene: unknown, index: number): ScreenplayScene | null => {
  if (!isRecord(scene)) {
    return null;
  }

  const id = asString(scene.id);
  if (!id) {
    return null;
  }

  const content = asStringPreserveWhitespace(scene.content) || createEmptySceneXml();
  const rawSceneNumber = typeof scene.sceneNumber === 'number' ? scene.sceneNumber : null;
  const sceneNumber =
    rawSceneNumber !== null && Number.isFinite(rawSceneNumber) ? rawSceneNumber : index + 1;

  return {
    id,
    name: asString(scene.name) || `Scene ${index + 1}`,
    sceneNumber,
    content,
  };
};

const resolveUpdatedScreenplay = (payload: unknown): Screenplay | undefined => {
  if (!isRecord(payload) || !isRecord(payload.updatedScreenplay)) {
    return undefined;
  }

  const screenplayPayload = payload.updatedScreenplay;
  const screenplayId = asString(screenplayPayload.id);
  const projectId = asString(screenplayPayload.projectId);
  const title = asString(screenplayPayload.title);

  if (!screenplayId || !projectId || !title) {
    return undefined;
  }

  const scenes = Array.isArray(screenplayPayload.scenes)
    ? screenplayPayload.scenes
        .map((scene, index) => normalizeSceneFromPayload(scene, index))
        .filter((scene): scene is ScreenplayScene => scene !== null)
    : [];

  return {
    id: screenplayId,
    projectId,
    title,
    scenes,
    createdAt: asString(screenplayPayload.createdAt) || undefined,
    updatedAt: asString(screenplayPayload.updatedAt) || undefined,
  };
};

const buildRequestBody = (request: ChatRequest): ChatRequest => {
  const normalizedMessages = request.messages.map((message) => ({
    ...message,
    role: normalizeRequestRole(message.role),
  }));

  return {
    ...request,
    threadId: request.threadId || undefined,
    messages: normalizedMessages,
  };
};

export class ChatRepositoryImpl implements ChatRepository {
  async send(request: ChatRequest, options?: ChatRequestOptions): Promise<ChatResponse> {
    const normalizedRequest = buildRequestBody(request);

    const payload = await backendApiRequest<unknown>('/api/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedRequest),
      signal: options?.signal,
    });

    return {
      threadId: resolveThreadId(payload),
      message: resolveMessage(payload),
      didMutate: resolveDidMutate(payload),
      updatedScreenplay: resolveUpdatedScreenplay(payload),
    };
  }

  async *stream(
    request: ChatRequest,
    options?: ChatRequestOptions,
  ): AsyncGenerator<ChatStreamEvent, ChatResponse, void> {
    const response = await this.send(request, options);
    yield {
      type: 'message',
      payload: {
        kind: 'part',
        part: {
          type: 'text',
          text: response.message.text,
        },
      },
    };

    if (response.threadId) {
      yield {
        type: 'done',
        threadId: response.threadId,
      };
    }

    return response;
  }
}
