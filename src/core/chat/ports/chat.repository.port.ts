import type { ChatRequest, ChatResponse, ChatStreamEvent } from '../domain/chat.entity';

export interface ChatRequestOptions {
  signal?: AbortSignal;
}

export interface ChatRepository {
  send(request: ChatRequest, options?: ChatRequestOptions): Promise<ChatResponse>;
  stream(
    request: ChatRequest,
    options?: ChatRequestOptions,
  ): AsyncGenerator<ChatStreamEvent, ChatResponse, void>;
}
