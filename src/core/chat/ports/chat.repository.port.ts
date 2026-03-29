import type { ChatRequest, ChatResponse } from '../domain/chat.entity';

export interface ChatRequestOptions {
  signal?: AbortSignal;
}

export interface ChatRepository {
  send(request: ChatRequest, options?: ChatRequestOptions): Promise<ChatResponse>;
}
