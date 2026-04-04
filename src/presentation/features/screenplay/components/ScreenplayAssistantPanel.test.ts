import { describe, expect, it } from 'bun:test';
import type { ThreadMessage } from '@assistant-ui/react';
import type { Screenplay } from '@core/screenplay';
import {
  buildScreenplayMutationToken,
  getAssistantTransportExternalState,
  getAssistantTransportStateFromThread,
  SCREENPLAY_ASSISTANT_TRANSPORT_PROTOCOL,
  getTransportState,
  resolveOutgoingThreadId,
} from './ScreenplayAssistantPanel';

const SAMPLE_MESSAGES: ThreadMessage[] = [
  {
    id: 'u-1',
    role: 'user',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    content: [{ type: 'text', text: 'Revise scene one.' }],
    attachments: [],
    metadata: { custom: {} },
  },
];

const UPDATED_SCREENPLAY: Screenplay = {
  id: 'screenplay-1',
  projectId: 'project-1',
  title: 'Act One',
  scenes: [
    {
      id: 'scene-1',
      name: 'Scene 1',
      sceneNumber: 1,
      content: '<scene><action>Updated action.</action></scene>',
    },
  ],
};

describe('ScreenplayAssistantPanel transport helpers', () => {
  it('uses data-stream protocol for backend aui-state chunks', () => {
    expect(SCREENPLAY_ASSISTANT_TRANSPORT_PROTOCOL).toBe('data-stream');
  });

  it('safely reads transport external state from runtime extras', () => {
    expect(getAssistantTransportExternalState({ state: { threadId: 'thread-1' } })).toEqual({
      threadId: 'thread-1',
    });
  });

  it('returns null when runtime extras are not transport extras', () => {
    expect(getAssistantTransportExternalState(undefined)).toBeNull();
    expect(getAssistantTransportExternalState({ foo: 'bar' })).toBeNull();
  });

  it('reads transport state from thread extras first', () => {
    expect(
      getAssistantTransportStateFromThread({
        extras: { state: { screenplay: UPDATED_SCREENPLAY } },
        state: { screenplay: null },
      }),
    ).toEqual({ screenplay: UPDATED_SCREENPLAY });
  });

  it('falls back to thread state when extras state is unavailable', () => {
    expect(
      getAssistantTransportStateFromThread({
        extras: null,
        state: { screenplay: UPDATED_SCREENPLAY },
      }),
    ).toEqual({ screenplay: UPDATED_SCREENPLAY });
  });

  it('normalizes unknown transport state to a safe empty shape', () => {
    expect(getTransportState(null)).toEqual({
      threadId: null,
      messages: [],
      isRunning: false,
      toolActivity: null,
      updatedScreenplay: undefined,
      screenplayRevision: undefined,
    });
  });

  it('extracts native transport state fields for runtime conversion', () => {
    expect(
      getTransportState({
        threadId: 'thread-1',
        messages: SAMPLE_MESSAGES,
        isRunning: true,
        updatedScreenplay: UPDATED_SCREENPLAY,
        screenplayRevision: 8,
      }),
    ).toEqual({
      threadId: 'thread-1',
      messages: SAMPLE_MESSAGES,
      isRunning: true,
      toolActivity: null,
      updatedScreenplay: UPDATED_SCREENPLAY,
      screenplayRevision: 8,
    });
  });

  it('supports nested/snake_case transport state for thread continuity', () => {
    const result = getTransportState({
      state: {
        thread_id: 'thread-2',
        is_running: true,
        messages: SAMPLE_MESSAGES,
      },
    });

    expect(result.threadId).toBe('thread-2');
    expect(result.isRunning).toBe(true);
    expect(result.messages).toHaveLength(1);
  });

  it('reads streaming tool activity from transport state', () => {
    expect(getTransportState({ toolActivity: 'Reading scene content...' }).toolActivity).toBe(
      'Reading scene content...',
    );
    expect(
      getTransportState({ state: { tool_activity: 'Created a new scene.' } }).toolActivity,
    ).toBe('Created a new scene.');
  });

  it('reads screenplay mutation from root state when nested state exists', () => {
    const result = getTransportState({
      state: {
        threadId: 'thread-4',
        isRunning: false,
        messages: SAMPLE_MESSAGES,
      },
      screenplay: UPDATED_SCREENPLAY,
    });

    expect(result.updatedScreenplay).toEqual(UPDATED_SCREENPLAY);
  });

  it('normalizes message-like `parts` payload into assistant-ui message content', () => {
    const result = getTransportState({
      threadId: 'thread-3',
      messages: [
        {
          id: 'u-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Revise this scene' }],
        },
        {
          id: 'a-1',
          role: 'assistant',
          parts: [
            {
              type: 'data',
              name: 'tool_activity',
              data: { text: 'Applying changes...' },
            },
            { type: 'text', text: 'Done.' },
          ],
        },
      ],
    });

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]?.content[0]).toEqual({ type: 'text', text: 'Revise this scene' });
    expect(result.messages[1]?.content[0]).toEqual({
      type: 'data',
      name: 'tool_activity',
      data: { text: 'Applying changes...' },
    });
  });

  it('accepts legacy screenplay key as a temporary fallback', () => {
    expect(
      getTransportState({
        threadId: 'thread-1',
        messages: SAMPLE_MESSAGES,
        isRunning: true,
        screenplay: UPDATED_SCREENPLAY,
      }),
    ).toEqual({
      threadId: 'thread-1',
      messages: SAMPLE_MESSAGES,
      isRunning: true,
      toolActivity: null,
      updatedScreenplay: UPDATED_SCREENPLAY,
      screenplayRevision: undefined,
    });
  });

  it('reads screenplay mutation state from `screenplay` transport key', () => {
    expect(
      getTransportState({
        threadId: 'thread-1',
        messages: SAMPLE_MESSAGES,
        isRunning: true,
        screenplay: UPDATED_SCREENPLAY,
      }),
    ).toEqual({
      threadId: 'thread-1',
      messages: SAMPLE_MESSAGES,
      isRunning: true,
      toolActivity: null,
      updatedScreenplay: UPDATED_SCREENPLAY,
      screenplayRevision: undefined,
    });
  });

  it('falls back to `updatedScreenplay` when `screenplay` is absent', () => {
    const result = getTransportState({
      threadId: 'thread-1',
      messages: SAMPLE_MESSAGES,
      isRunning: true,
      updatedScreenplay: UPDATED_SCREENPLAY,
    });

    expect(result.updatedScreenplay).toEqual(UPDATED_SCREENPLAY);
  });

  it('parses serialized screenplay snapshot from transport state', () => {
    const result = getTransportState({
      threadId: 'thread-1',
      messages: SAMPLE_MESSAGES,
      isRunning: true,
      screenplaySnapshot: JSON.stringify(UPDATED_SCREENPLAY),
    });

    expect(result.updatedScreenplay).toEqual(UPDATED_SCREENPLAY);
  });

  it('prefers screenplay revision token when present', () => {
    expect(
      buildScreenplayMutationToken({
        threadId: 'thread-1',
        messages: SAMPLE_MESSAGES,
        isRunning: false,
        updatedScreenplay: UPDATED_SCREENPLAY,
        screenplayRevision: 'rev-9',
      }),
    ).toBe('revision:rev-9');
  });

  it('falls back to snapshot token when revision is absent', () => {
    const token = buildScreenplayMutationToken({
      threadId: 'thread-1',
      messages: SAMPLE_MESSAGES,
      isRunning: false,
      updatedScreenplay: UPDATED_SCREENPLAY,
    });

    expect(token?.startsWith('snapshot:')).toBe(true);
  });

  it('prefers backend runtime thread id for follow-up requests', () => {
    expect(resolveOutgoingThreadId(false, 'backend-uuid', '__LOCALID_123')).toBe('backend-uuid');
    expect(resolveOutgoingThreadId(false, null, '__LOCALID_123')).toBe('__LOCALID_123');
    expect(resolveOutgoingThreadId(true, 'backend-uuid', '__LOCALID_123')).toBeNull();
  });
});
