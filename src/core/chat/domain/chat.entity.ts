import type { Screenplay } from '@core/screenplay';

export type ChatRole = 'user' | 'assistant';

export type ChatAgentType = 'default' | 'screenplay_assistant';

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
  agentType?: ChatAgentType;
  projectId?: string;
  screenplayId?: string;
  activeSceneId?: string | null;
}

export interface ChatResponse {
  threadId?: string;
  message: ChatMessage;
  didMutate?: boolean;
  updatedScreenplay?: Screenplay;
}

export type ChatStreamAssistantPart =
  | {
      type: 'data';
      name: 'tool_activity';
      data: {
        text: string;
      };
    }
  | {
      type: 'text';
      text: string;
    };

export type ChatStreamMessagePayload = { kind: 'part'; part: ChatStreamAssistantPart };

export type ChatStreamEvent =
  | { type: 'message'; payload: ChatStreamMessagePayload }
  | { type: 'done'; threadId: string };
