export type ChatRole = 'user' | 'assistant';

export interface ChatImage {
  url: string;
}

export interface ChatMessage {
  role: ChatRole;
  text: string;
  images?: ChatImage[];
}

export interface ChatRequest {
  threadId?: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  threadId?: string;
  message: ChatMessage;
}
