import { describe, expect, it, mock } from 'bun:test';
import type { ThreadMessage } from '@assistant-ui/react';
import type { SendChatMessageUseCase } from '@core/chat';
import {
  createCollectionChatRuntimeState,
  extractHttpUrlsFromText,
  extractHttpUrlsFromTransferData,
  readClipboardAttachmentUrls,
  runCollectionChatTurn,
} from './CollectionChatPanel';

const createUserMessage = (id: string, text: string): ThreadMessage => ({
  id,
  createdAt: new Date(),
  role: 'user',
  content: [{ type: 'text', text }],
  metadata: { custom: {} },
  attachments: [],
});

describe('CollectionChatPanel runtime behavior', () => {
  it('extracts http and https URLs from drag transfer payloads', () => {
    const urls = extractHttpUrlsFromTransferData({
      getData(type) {
        if (type === 'application/x-ai-video-gen-item-url') {
          return 'https://example.com/custom.png';
        }

        if (type === 'text/uri-list') {
          return '# comment\nhttps://example.com/uri-list.png\nftp://example.com/skip.png';
        }

        if (type === 'text/plain') {
          return 'refs: https://example.com/custom.png and http://example.com/plain.jpg plus data:image/png;base64,abc';
        }

        return '';
      },
    });

    expect(urls).toEqual([
      'https://example.com/custom.png',
      'https://example.com/uri-list.png',
      'http://example.com/plain.jpg',
    ]);
  });

  it('extracts http and https URLs from plain text content', () => {
    const urls = extractHttpUrlsFromText(
      'refs: https://example.com/a.png ftp://example.com/nope and http://example.com/b.jpg and https://example.com/a.png',
    );

    expect(urls).toEqual(['https://example.com/a.png', 'http://example.com/b.jpg']);
  });

  it('returns no transfer URLs when payload does not include valid links', () => {
    const urls = extractHttpUrlsFromTransferData({
      getData: () => 'not-a-url',
    });

    expect(urls).toEqual([]);
  });

  it('returns user feedback when clipboard text has no valid URLs', async () => {
    const result = await readClipboardAttachmentUrls({
      readText: async () => 'clipboard text without links',
    });

    expect(result).toEqual({
      urls: [],
      error: 'No valid http/https URLs found in your clipboard.',
    });
  });

  it('returns parsed URLs from clipboard text when available', async () => {
    const result = await readClipboardAttachmentUrls({
      readText: async () =>
        'Try https://example.com/from-clipboard.png and http://example.com/also-valid.jpg and https://example.com/from-clipboard.png',
    });

    expect(result).toEqual({
      urls: ['https://example.com/from-clipboard.png', 'http://example.com/also-valid.jpg'],
      error: null,
    });
  });

  it('creates thread on first turn and continues it afterwards', async () => {
    const executeSpy = mock(async (request: { threadId?: string; messages: unknown[] }) => {
      if (!request.threadId) {
        return {
          threadId: 'thread-1',
          message: { role: 'assistant' as const, text: 'First response' },
        };
      }

      return {
        threadId: request.threadId,
        message: { role: 'assistant' as const, text: 'Follow-up response' },
      };
    });

    const state = createCollectionChatRuntimeState();
    state.pendingUserImageUrls = ['https://example.com/reference.png'];

    await runCollectionChatTurn({
      messages: [createUserMessage('u-1', 'Help with this reference')],
      abortSignal: new AbortController().signal,
      state,
      sendChatMessageUseCase: { execute: executeSpy } as unknown as SendChatMessageUseCase,
      onError: () => undefined,
    });

    const firstRequest = executeSpy.mock.calls[0]?.[0] as {
      threadId?: string;
      messages: Array<{ role: string; text: string; images?: Array<{ url: string }> }>;
    };

    expect(firstRequest.threadId).toBeUndefined();
    expect(firstRequest.messages[firstRequest.messages.length - 1]).toEqual({
      role: 'user',
      text: 'Help with this reference',
      images: [{ url: 'https://example.com/reference.png' }],
    });
    expect(state.threadId).toBe('thread-1');

    await runCollectionChatTurn({
      messages: [
        createUserMessage('u-1', 'Help with this reference'),
        {
          id: 'a-1',
          createdAt: new Date(),
          role: 'assistant',
          content: [{ type: 'text', text: 'First response' }],
          metadata: {
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
          status: { type: 'complete', reason: 'stop' },
        },
        createUserMessage('u-2', 'Continue'),
      ],
      abortSignal: new AbortController().signal,
      state,
      sendChatMessageUseCase: { execute: executeSpy } as unknown as SendChatMessageUseCase,
      onError: () => undefined,
    });

    const secondRequest = executeSpy.mock.calls[1]?.[0] as {
      threadId?: string;
      messages: Array<{ role: string; text: string; images?: Array<{ url: string }> }>;
    };

    expect(secondRequest.threadId).toBe('thread-1');
    expect(secondRequest.messages[secondRequest.messages.length - 1]).toEqual({
      role: 'user',
      text: 'Continue',
      images: undefined,
    });
  });

  it('returns incomplete status and surfaces error message on failures', async () => {
    const executeSpy = mock(async () => {
      throw new Error('Chat backend unavailable');
    });
    const onErrorSpy = mock(() => undefined);
    const state = createCollectionChatRuntimeState();

    const result = await runCollectionChatTurn({
      messages: [createUserMessage('u-1', 'Hello')],
      abortSignal: new AbortController().signal,
      state,
      sendChatMessageUseCase: { execute: executeSpy } as unknown as SendChatMessageUseCase,
      onError: onErrorSpy,
    });

    expect(result.status).toEqual({
      type: 'incomplete',
      reason: 'error',
      error: 'Chat backend unavailable',
    });
    expect(onErrorSpy).toHaveBeenCalledWith('Chat backend unavailable');
  });
});
