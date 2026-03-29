'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunResult,
  type ThreadMessage,
} from '@assistant-ui/react';
import { ArrowRight, PanelLeftClose, X } from 'lucide-react';
import type { ChatImage, ChatMessage, SendChatMessageUseCase } from '@core/chat';
import styles from './CollectionChatPanel.module.css';

interface CollectionChatPanelProps {
  sendChatMessageUseCase: SendChatMessageUseCase;
  onCollapseSidebar?: () => void;
}

export interface CollectionChatRuntimeState {
  threadId?: string;
  userImageUrlsByIndex: string[][];
  pendingUserImageUrls: string[];
}

export const createCollectionChatRuntimeState = (): CollectionChatRuntimeState => ({
  threadId: undefined,
  userImageUrlsByIndex: [],
  pendingUserImageUrls: [],
});

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const CLIPBOARD_UNAVAILABLE_MESSAGE = 'Clipboard access is not available in this browser.';
const CLIPBOARD_NO_URLS_MESSAGE = 'No valid http/https URLs found in your clipboard.';
const CLIPBOARD_READ_ERROR_MESSAGE = 'Unable to read clipboard. Check permissions and try again.';

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export interface TransferDataReader {
  getData: (type: string) => string;
}

export interface ClipboardTextReader {
  readText: () => Promise<string>;
}

export const extractHttpUrlsFromText = (value: string): string[] => {
  const matches = value.match(URL_PATTERN);
  if (!matches) {
    return [];
  }

  return Array.from(
    new Set(
      matches
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
        .filter((url) => isHttpUrl(url)),
    ),
  );
};

export const extractHttpUrlsFromTransferData = (transferData: TransferDataReader): string[] => {
  const payloadUrls: string[] = [];

  const custom = transferData.getData('application/x-ai-video-gen-item-url');
  if (custom.trim().length > 0) {
    payloadUrls.push(custom.trim());
  }

  const uriList = transferData.getData('text/uri-list');
  if (uriList.trim().length > 0) {
    uriList
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .forEach((line) => payloadUrls.push(line));
  }

  const plain = transferData.getData('text/plain');
  if (plain.trim().length > 0) {
    extractHttpUrlsFromText(plain).forEach((url) => payloadUrls.push(url));
  }

  return Array.from(
    new Set(
      payloadUrls
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
        .filter((url) => isHttpUrl(url)),
    ),
  );
};

export const readClipboardAttachmentUrls = async (
  clipboard: ClipboardTextReader | null | undefined,
): Promise<{ urls: string[]; error: string | null }> => {
  if (!clipboard?.readText) {
    return {
      urls: [],
      error: CLIPBOARD_UNAVAILABLE_MESSAGE,
    };
  }

  try {
    const clipboardText = await clipboard.readText();
    const urls = extractHttpUrlsFromText(clipboardText);

    if (urls.length === 0) {
      return {
        urls: [],
        error: CLIPBOARD_NO_URLS_MESSAGE,
      };
    }

    return {
      urls,
      error: null,
    };
  } catch {
    return {
      urls: [],
      error: CLIPBOARD_READ_ERROR_MESSAGE,
    };
  }
};

const extractTextFromMessage = (message: ThreadMessage): string => {
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join('\n\n');
};

const extractInlineImageParts = (message: ThreadMessage): ChatImage[] => {
  const images = message.content
    .filter((part) => part.type === 'image')
    .map((part) => part.image.trim())
    .filter(Boolean)
    .map((url) => ({ url }));

  return images;
};

const mapRuntimeMessagesToRequest = (
  messages: readonly ThreadMessage[],
  userImageUrlsByIndex: readonly string[][],
): ChatMessage[] => {
  let userMessageIndex = 0;

  return messages
    .map((message) => {
      const text = extractTextFromMessage(message);
      const inlineImages = extractInlineImageParts(message);

      let images: ChatImage[] = inlineImages;
      if (message.role === 'user') {
        const attachedImages = (userImageUrlsByIndex[userMessageIndex] || [])
          .map((url) => url.trim())
          .filter(Boolean)
          .map((url) => ({ url }));

        images = attachedImages.length > 0 ? attachedImages : inlineImages;
        userMessageIndex += 1;
      }

      if (!text && images.length === 0) {
        return null;
      }

      return {
        role: message.role,
        text,
        images: images.length > 0 ? images : undefined,
      } as ChatMessage;
    })
    .filter((message): message is ChatMessage => message !== null);
};

interface RunCollectionChatTurnParams {
  messages: readonly ThreadMessage[];
  abortSignal: AbortSignal;
  state: CollectionChatRuntimeState;
  sendChatMessageUseCase: SendChatMessageUseCase;
  onError: (message: string | null) => void;
}

export async function runCollectionChatTurn({
  messages,
  abortSignal,
  state,
  sendChatMessageUseCase,
  onError,
}: RunCollectionChatTurnParams): Promise<ChatModelRunResult> {
  const userMessageCount = messages.filter((message) => message.role === 'user').length;

  if (state.userImageUrlsByIndex.length < userMessageCount) {
    state.userImageUrlsByIndex = [...state.userImageUrlsByIndex, state.pendingUserImageUrls];
    state.pendingUserImageUrls = [];
  }

  const normalizedMessages = mapRuntimeMessagesToRequest(messages, state.userImageUrlsByIndex);

  try {
    const response = await sendChatMessageUseCase.execute(
      {
        threadId: state.threadId,
        messages: normalizedMessages,
      },
      { signal: abortSignal },
    );

    state.threadId = response.threadId || state.threadId;
    onError(null);

    return {
      content: [
        {
          type: 'text',
          text: response.message.text,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unable to send message';
    onError(errorMessage);

    return {
      status: {
        type: 'incomplete',
        reason: 'error',
        error: errorMessage,
      },
      content: [
        {
          type: 'text',
          text: 'Unable to reach assistant right now. Please try again.',
        },
      ],
    };
  }
}

function ChatMessageView() {
  return (
    <MessagePrimitive.Root className={styles.messageRoot}>
      <MessagePrimitive.If user>
        <div className={styles.userMessageRow}>
          <div className={styles.userMessageBubble}>
            <MessagePrimitive.Parts>
              {({ part }) => {
                if (part.type === 'text') {
                  return (
                    <p className={styles.messageText}>
                      <MessagePartPrimitive.Text />
                    </p>
                  );
                }

                if (part.type === 'image') {
                  return (
                    <a
                      href={part.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.inlineImagePreviewLink}
                    >
                      <Image
                        src={part.image}
                        alt="Shared image"
                        className={styles.inlineImagePreview}
                        width={128}
                        height={128}
                      />
                    </a>
                  );
                }

                return null;
              }}
            </MessagePrimitive.Parts>
          </div>
        </div>
      </MessagePrimitive.If>

      <MessagePrimitive.If assistant>
        <div className={styles.assistantMessageRow}>
          <div className={styles.assistantMessageBubble}>
            <MessagePrimitive.Parts>
              {({ part }) => {
                if (part.type === 'text') {
                  return (
                    <p className={styles.messageText}>
                      <MessagePartPrimitive.Text />
                    </p>
                  );
                }

                if (part.type === 'image') {
                  return (
                    <a
                      href={part.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.inlineImagePreviewLink}
                    >
                      <Image
                        src={part.image}
                        alt="Shared image"
                        className={styles.inlineImagePreview}
                        width={128}
                        height={128}
                      />
                    </a>
                  );
                }

                return null;
              }}
            </MessagePrimitive.Parts>
            <MessagePrimitive.Error>
              <p className={styles.messageError}>Assistant request failed. Try again.</p>
            </MessagePrimitive.Error>
          </div>
        </div>
      </MessagePrimitive.If>
    </MessagePrimitive.Root>
  );
}

export function CollectionChatPanel({
  sendChatMessageUseCase,
  onCollapseSidebar,
}: CollectionChatPanelProps) {
  const runtimeStateRef = useRef<CollectionChatRuntimeState>(createCollectionChatRuntimeState());
  const [pendingDroppedImageUrls, setPendingDroppedImageUrls] = useState<string[]>([]);
  const [isDropActive, setIsDropActive] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  const updatePendingImageUrls = useCallback((updater: (previous: string[]) => string[]) => {
    setPendingDroppedImageUrls((previous) => {
      const next = updater(previous);
      runtimeStateRef.current.pendingUserImageUrls = next;
      return next;
    });
  }, []);

  const handleComposerDragOver = useCallback(
    (event: React.DragEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isDropActive) {
        setIsDropActive(true);
      }
    },
    [isDropActive],
  );

  const handleComposerDragLeave = useCallback((event: React.DragEvent<HTMLFormElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsDropActive(false);
    }
  }, []);

  const handleComposerDrop = useCallback(
    (event: React.DragEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsDropActive(false);

      const droppedUrls = extractHttpUrlsFromTransferData(event.dataTransfer);
      if (droppedUrls.length === 0) {
        return;
      }

      updatePendingImageUrls((previous) => Array.from(new Set([...previous, ...droppedUrls])));
      setComposerError(null);
    },
    [updatePendingImageUrls],
  );

  const handleRemovePendingImageUrl = useCallback(
    (urlToRemove: string) => {
      updatePendingImageUrls((previous) => previous.filter((url) => url !== urlToRemove));
    },
    [updatePendingImageUrls],
  );

  const handleComposerSubmit = useCallback(() => {
    setPendingDroppedImageUrls([]);
    setComposerError(null);
  }, []);

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async run({ messages, abortSignal }) {
        return runCollectionChatTurn({
          messages,
          abortSignal,
          state: runtimeStateRef.current,
          sendChatMessageUseCase,
          onError: setComposerError,
        });
      },
    }),
    [sendChatMessageUseCase],
  );

  const runtime = useLocalRuntime(adapter);

  return (
    <aside className={styles.panel} aria-label="Chat assistant">
      <header className={styles.header}>
        <div className={styles.headerTopRow}>
          <h2 className={styles.title}>Assistant</h2>
          {onCollapseSidebar ? (
            <button
              type="button"
              className={styles.collapseButton}
              onClick={onCollapseSidebar}
              aria-label="Collapse chat sidebar"
              title="Collapse chat sidebar"
            >
              <PanelLeftClose size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className={styles.subtitle}>Ask for quick help with this collection workspace.</p>
      </header>

      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitive.Root className={styles.threadRoot}>
          <ThreadPrimitive.Viewport className={styles.viewport}>
            <ThreadPrimitive.Messages>{() => <ChatMessageView />}</ThreadPrimitive.Messages>
          </ThreadPrimitive.Viewport>

          <ComposerPrimitive.Root
            className={`${styles.composer} ${isDropActive ? styles.dropActive : ''}`}
            onSubmit={handleComposerSubmit}
            onDragOver={handleComposerDragOver}
            onDragLeave={handleComposerDragLeave}
            onDrop={handleComposerDrop}
          >
            {pendingDroppedImageUrls.length > 0 ? (
              <div className={styles.pendingAttachmentGrid}>
                {pendingDroppedImageUrls.map((url, index) => (
                  <div key={url} className={styles.pendingAttachmentThumb}>
                    <Image
                      src={url}
                      alt="Pending attachment preview"
                      className={styles.pendingAttachmentImage}
                      width={128}
                      height={128}
                    />
                    <button
                      type="button"
                      className={styles.removeAttachmentButton}
                      onClick={() => handleRemovePendingImageUrl(url)}
                      aria-label={`Remove attachment ${index + 1}`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={styles.composerInputShell}>
              <ComposerPrimitive.Input
                className={styles.messageInput}
                placeholder="Ask assistant..."
                aria-label="Assistant message"
              />
              <ComposerPrimitive.Send className={styles.sendButton} aria-label="Send message">
                <ArrowRight size={16} aria-hidden="true" />
              </ComposerPrimitive.Send>
            </div>

            {composerError ? <p className={styles.composerError}>{composerError}</p> : null}
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
    </aside>
  );
}
