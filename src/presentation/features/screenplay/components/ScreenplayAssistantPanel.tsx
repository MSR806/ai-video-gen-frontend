'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantTransportRuntime,
  useAuiState,
  type ThreadMessage,
} from '@assistant-ui/react';
import { ArrowRight, PanelLeftClose } from 'lucide-react';
import type { Screenplay } from '@core/screenplay';
import type { ScreenplayWorkspaceHandle } from './ScreenplayWorkspace';
import styles from './ScreenplayAssistantPanel.module.css';

interface ScreenplayAssistantPanelProps {
  projectId: string;
  screenplayId: string | null;
  isScreenplayContextReady: boolean;
  workspaceRef: RefObject<ScreenplayWorkspaceHandle | null>;
  onCollapseSidebar?: () => void;
}

interface ScreenplayAssistantTransportState {
  threadId: string | null;
  messages: ThreadMessage[];
  isRunning: boolean;
  toolActivity?: string | null;
  updatedScreenplay?: Screenplay;
  screenplayRevision?: string | number;
}

const SCREENPLAY_LOADING_MESSAGE =
  'Screenplay is still loading. Please wait before sending assistant requests.';

export const SCREENPLAY_ASSISTANT_TRANSPORT_PROTOCOL = 'data-stream';

const EMPTY_TRANSPORT_STATE: ScreenplayAssistantTransportState = {
  threadId: null,
  messages: [],
  isRunning: false,
  toolActivity: null,
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getAssistantTransportExternalState = (extras: unknown): unknown => {
  if (!isObject(extras) || !('state' in extras)) {
    return null;
  }

  return (extras as { state?: unknown }).state ?? null;
};

export const getAssistantTransportStateFromThread = (thread: unknown): unknown => {
  if (!isObject(thread)) {
    return null;
  }

  const extrasState = getAssistantTransportExternalState(thread.extras);
  if (extrasState) {
    return extrasState;
  }

  if (isObject(thread.state)) {
    return thread.state;
  }

  return null;
};

const asScreenplay = (value: unknown): Screenplay | null => {
  if (!isObject(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.projectId !== 'string' ||
    typeof value.title !== 'string' ||
    !Array.isArray(value.scenes)
  ) {
    return null;
  }

  return value as unknown as Screenplay;
};

const asScreenplayStateValue = (value: unknown): Screenplay | null => {
  const direct = asScreenplay(value);
  if (direct) {
    return direct;
  }

  if (typeof value !== 'string') {
    return null;
  }

  try {
    return asScreenplay(JSON.parse(value));
  } catch {
    return null;
  }
};

const asThreadMessage = (message: unknown, index: number): ThreadMessage | null => {
  if (!isObject(message)) {
    return null;
  }

  if (Array.isArray(message.content) && typeof message.role === 'string') {
    return message as ThreadMessage;
  }

  if (!Array.isArray(message.parts) || (message.role !== 'user' && message.role !== 'assistant')) {
    return null;
  }

  const parts = message.parts
    .map((part) => {
      if (!isObject(part) || typeof part.type !== 'string') {
        return null;
      }

      if (part.type === 'text' && typeof part.text === 'string') {
        return { type: 'text' as const, text: part.text };
      }

      if (part.type === 'image' && typeof part.image === 'string') {
        return { type: 'image' as const, image: part.image };
      }

      if (part.type === 'data' && typeof part.name === 'string' && isObject(part.data)) {
        return {
          type: 'data' as const,
          name: part.name,
          data: part.data,
        };
      }

      return null;
    })
    .filter((part): part is NonNullable<typeof part> => part !== null);

  const createdAt =
    typeof message.createdAt === 'string' || message.createdAt instanceof Date
      ? new Date(message.createdAt)
      : new Date();
  const id = typeof message.id === 'string' ? message.id : `${message.role}-${index}`;

  if (message.role === 'user') {
    const content = parts.filter((part) => part.type === 'text' || part.type === 'image');
    return {
      id,
      role: 'user',
      createdAt,
      content,
      attachments: [],
      metadata: { custom: {} },
    };
  }

  return {
    id,
    role: 'assistant',
    createdAt,
    content: parts,
    status: { type: 'complete', reason: 'unknown' },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  };
};

const normalizeTransportMessages = (value: unknown): ThreadMessage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((message, index) => asThreadMessage(message, index))
    .filter((message): message is ThreadMessage => message !== null);
};

export const getTransportState = (state: unknown): ScreenplayAssistantTransportState => {
  if (!isObject(state)) {
    return EMPTY_TRANSPORT_STATE;
  }

  const nestedState = isObject(state.state) ? state.state : null;
  const threadEnvelope =
    (nestedState && isObject(nestedState.thread) ? nestedState.thread : null) ||
    (isObject(state.thread) ? state.thread : null);

  const messages = normalizeTransportMessages(
    (nestedState ? nestedState.messages : undefined) ??
      state.messages ??
      (threadEnvelope ? threadEnvelope.messages : undefined),
  );
  const threadId =
    (nestedState && typeof nestedState.threadId === 'string' ? nestedState.threadId : null) ||
    (nestedState && typeof nestedState.thread_id === 'string' ? nestedState.thread_id : null) ||
    (typeof state.threadId === 'string' ? state.threadId : null) ||
    (typeof state.thread_id === 'string' ? state.thread_id : null) ||
    (threadEnvelope && typeof threadEnvelope.threadId === 'string'
      ? threadEnvelope.threadId
      : null) ||
    (threadEnvelope && typeof threadEnvelope.thread_id === 'string'
      ? threadEnvelope.thread_id
      : null);
  const isRunning =
    (nestedState && typeof nestedState.isRunning === 'boolean' ? nestedState.isRunning : null) ??
    (nestedState && typeof nestedState.is_running === 'boolean' ? nestedState.is_running : null) ??
    (typeof state.isRunning === 'boolean' ? state.isRunning : null) ??
    (typeof state.is_running === 'boolean' ? state.is_running : null) ??
    false;

  return {
    threadId,
    messages,
    isRunning,
    toolActivity:
      (nestedState && typeof nestedState.toolActivity === 'string'
        ? nestedState.toolActivity
        : null) ??
      (nestedState && typeof nestedState.tool_activity === 'string'
        ? nestedState.tool_activity
        : null) ??
      (typeof state.toolActivity === 'string' ? state.toolActivity : null) ??
      (typeof state.tool_activity === 'string' ? state.tool_activity : null) ??
      null,
    // Backend primarily emits `updatedScreenplay`; keep legacy `screenplay` + snapshot fallbacks.
    updatedScreenplay:
      asScreenplayStateValue(nestedState?.screenplay) ??
      asScreenplayStateValue(state.screenplay) ??
      asScreenplayStateValue(nestedState?.updatedScreenplay) ??
      asScreenplayStateValue(state.updatedScreenplay) ??
      asScreenplayStateValue(nestedState?.screenplaySnapshot) ??
      asScreenplayStateValue(state.screenplaySnapshot) ??
      undefined,
    screenplayRevision:
      typeof nestedState?.screenplayRevision === 'string' ||
      typeof nestedState?.screenplayRevision === 'number'
        ? nestedState.screenplayRevision
        : typeof state.screenplayRevision === 'string' ||
            typeof state.screenplayRevision === 'number'
          ? state.screenplayRevision
          : undefined,
  };
};

export const resolveOutgoingThreadId = (
  didBoundaryChange: boolean,
  runtimeThreadId: string | null,
  requestThreadId: unknown,
): string | null => {
  if (didBoundaryChange) {
    return null;
  }

  if (runtimeThreadId) {
    return runtimeThreadId;
  }

  return typeof requestThreadId === 'string' ? requestThreadId : null;
};

export const buildScreenplayMutationToken = (
  state: ScreenplayAssistantTransportState,
): string | null => {
  if (!state.updatedScreenplay) {
    return null;
  }

  if (state.screenplayRevision !== undefined) {
    return `revision:${String(state.screenplayRevision)}`;
  }

  return `snapshot:${JSON.stringify(state.updatedScreenplay)}`;
};

function ScreenplayTransportMutationBridge({
  workspaceRef,
  isScreenplayContextReady,
}: {
  workspaceRef: RefObject<ScreenplayWorkspaceHandle | null>;
  isScreenplayContextReady: boolean;
}) {
  const transportState = useAuiState((storeState) =>
    getAssistantTransportStateFromThread(storeState.thread),
  );
  const state = getTransportState(transportState);
  const applyQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastAppliedMutationRef = useRef<string | null>(null);
  const pendingMutationRef = useRef<{ token: string; screenplay: Screenplay } | null>(null);

  const applyPendingMutation = useCallback(() => {
    const pending = pendingMutationRef.current;
    if (!pending || !isScreenplayContextReady) {
      return;
    }

    applyQueueRef.current = applyQueueRef.current.then(async () => {
      const workspace = workspaceRef.current;
      if (!workspace) {
        return;
      }

      await workspace.applyRemoteScreenplay(pending.screenplay);
      if (pendingMutationRef.current?.token === pending.token) {
        lastAppliedMutationRef.current = pending.token;
        pendingMutationRef.current = null;
      }
    });
  }, [isScreenplayContextReady, workspaceRef]);

  useEffect(() => {
    const mutationToken = buildScreenplayMutationToken(state);
    if (!mutationToken || !state.updatedScreenplay) {
      return;
    }

    if (lastAppliedMutationRef.current === mutationToken) {
      return;
    }

    pendingMutationRef.current = {
      token: mutationToken,
      screenplay: state.updatedScreenplay,
    };
    // Keep remote screenplay applies strictly ordered when state snapshots advance quickly.
    applyPendingMutation();
  }, [applyPendingMutation, state]);

  useEffect(() => {
    applyPendingMutation();
  }, [applyPendingMutation]);

  return null;
}

function TransportToolActivityView() {
  const transportState = useAuiState((storeState) =>
    getAssistantTransportStateFromThread(storeState.thread),
  );
  const state = getTransportState(transportState);
  if (!state.toolActivity) {
    return null;
  }

  return (
    <section className={styles.transportToolActivityBlock} aria-live="polite" aria-atomic="false">
      <p className={styles.toolActivityText}>{state.toolActivity}</p>
    </section>
  );
}

function ChatMessageView() {
  return (
    <MessagePrimitive.Root className={styles.messageRoot}>
      <MessagePrimitive.If user>
        <div className={styles.userMessageRow}>
          <div className={styles.userMessageBubble}>
            <MessagePrimitive.Parts>
              {({ part }) =>
                part.type === 'text' ? (
                  <p className={styles.messageText}>
                    <MessagePartPrimitive.Text />
                  </p>
                ) : null
              }
            </MessagePrimitive.Parts>
          </div>
        </div>
      </MessagePrimitive.If>

      <MessagePrimitive.If assistant>
        <div className={styles.assistantMessageRow}>
          <div className={styles.assistantMessageContent}>
            <MessagePrimitive.Parts>
              {({ part }) => {
                if (part.type === 'text') {
                  return (
                    <div className={styles.assistantMessageBubble}>
                      <p className={styles.messageText}>
                        <MessagePartPrimitive.Text />
                      </p>
                    </div>
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

export function ScreenplayAssistantPanel({
  projectId,
  screenplayId,
  isScreenplayContextReady,
  workspaceRef,
  onCollapseSidebar,
}: ScreenplayAssistantPanelProps) {
  const [composerError, setComposerError] = useState<string | null>(null);
  const latestTransportStateRef = useRef<ScreenplayAssistantTransportState>(EMPTY_TRANSPORT_STATE);
  const requestBoundaryRef = useRef<{
    projectId: string;
    screenplayId: string | null;
  }>({
    projectId,
    screenplayId,
  });

  const runtime = useAssistantTransportRuntime<ScreenplayAssistantTransportState>({
    initialState: EMPTY_TRANSPORT_STATE,
    api: '/api/backend/api/v1/chat/stream',
    protocol: SCREENPLAY_ASSISTANT_TRANSPORT_PROTOCOL,
    headers: async () => ({
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    }),
    converter: (rawState, connectionMetadata) => {
      const state = getTransportState(rawState);
      latestTransportStateRef.current = state;
      return {
        messages: state.messages,
        isRunning: state.isRunning || connectionMetadata.isSending,
        state: {
          threadId: state.threadId,
          screenplayRevision: state.screenplayRevision ?? null,
          screenplaySnapshot: state.updatedScreenplay
            ? JSON.stringify(state.updatedScreenplay)
            : null,
          hasUpdatedScreenplay: Boolean(state.updatedScreenplay),
        },
      };
    },
    prepareSendCommandsRequest: async (body) => {
      const workspace = workspaceRef.current;
      const activeScreenplayId = workspace?.getScreenplayId() ?? screenplayId;
      if (!activeScreenplayId) {
        throw new Error(SCREENPLAY_LOADING_MESSAGE);
      }

      const didBoundaryChange =
        requestBoundaryRef.current.projectId !== projectId ||
        requestBoundaryRef.current.screenplayId !== activeScreenplayId;
      requestBoundaryRef.current = {
        projectId,
        screenplayId: activeScreenplayId,
      };

      await workspace?.flushPendingUpdates();

      return {
        ...body,
        threadId: resolveOutgoingThreadId(
          didBoundaryChange,
          latestTransportStateRef.current.threadId,
          body.threadId,
        ),
        agentType: 'screenplay_assistant',
        projectId,
        screenplayId: activeScreenplayId,
        activeSceneId: workspace?.getActiveSceneId() ?? null,
      };
    },
    onError: async (error) => {
      setComposerError(error.message || 'Unable to send message');
    },
    onFinish: () => {
      setComposerError(null);
    },
  });

  return (
    <aside className={styles.panel} aria-label="Screenplay assistant">
      <header className={styles.header}>
        <div className={styles.headerTopRow}>
          <h2 className={styles.title}>Screenplay Assistant</h2>
          {onCollapseSidebar ? (
            <button
              type="button"
              className={styles.collapseButton}
              onClick={onCollapseSidebar}
              aria-label="Collapse screenplay assistant sidebar"
              title="Collapse screenplay assistant sidebar"
            >
              <PanelLeftClose size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className={styles.subtitle}>Ask for suggestions or targeted screenplay revisions.</p>
      </header>

      <AssistantRuntimeProvider runtime={runtime}>
        <ScreenplayTransportMutationBridge
          workspaceRef={workspaceRef}
          isScreenplayContextReady={isScreenplayContextReady}
        />
        <ThreadPrimitive.Root className={styles.threadRoot}>
          <ThreadPrimitive.Viewport className={styles.viewport}>
            <ThreadPrimitive.Messages>{() => <ChatMessageView />}</ThreadPrimitive.Messages>
            <TransportToolActivityView />
          </ThreadPrimitive.Viewport>

          <ComposerPrimitive.Root className={styles.composer}>
            <div className={styles.composerInputShell}>
              <ComposerPrimitive.Input
                className={styles.messageInput}
                placeholder="Ask screenplay assistant..."
                aria-label="Screenplay assistant message"
              />
              <ComposerPrimitive.Send className={styles.sendButton} aria-label="Send message">
                <ArrowRight size={16} aria-hidden="true" />
              </ComposerPrimitive.Send>
            </div>

            {!isScreenplayContextReady ? (
              <p className={styles.contextHint} role="status" aria-live="polite">
                Loading screenplay context… you can start typing now, and early sends will wait.
              </p>
            ) : null}

            {composerError ? <p className={styles.composerError}>{composerError}</p> : null}
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
    </aside>
  );
}
