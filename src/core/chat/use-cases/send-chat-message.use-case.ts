import type { ChatRequest, ChatResponse, ChatStreamEvent } from '../domain/chat.entity';
import type { ChatRepository, ChatRequestOptions } from '../ports/chat.repository.port';

export class SendChatMessageUseCase {
  constructor(private chatRepository: ChatRepository) {}

  async execute(request: ChatRequest, options?: ChatRequestOptions): Promise<ChatResponse> {
    return this.chatRepository.send(request, options);
  }

  stream(
    request: ChatRequest,
    options?: ChatRequestOptions,
  ): AsyncGenerator<ChatStreamEvent, ChatResponse, void> {
    return this.chatRepository.stream(request, options);
  }
}
