import { afterEach, describe, expect, it, mock } from 'bun:test';
import { ChatRepositoryImpl } from './chat.repository.impl';

const collectStream = async <TEvent, TReturn>(
  stream: AsyncGenerator<TEvent, TReturn, void>,
): Promise<{ events: TEvent[]; result: TReturn }> => {
  const events: TEvent[] = [];

  while (true) {
    const next = await stream.next();
    if (next.done) {
      return {
        events,
        result: next.value,
      };
    }

    events.push(next.value);
  }
};

afterEach(() => {
  delete (globalThis as Record<string, unknown>).fetch;
});

describe('ChatRepositoryImpl', () => {
  it('sends minimal payload without threadId for the first turn', async () => {
    const fetchSpy = mock(
      async () =>
        new Response(
          JSON.stringify({
            threadId: 'thread-1',
            message: {
              role: 'assistant',
              text: 'Hello from backend',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    );

    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const repository = new ChatRepositoryImpl();
    const response = await repository.send({
      messages: [{ role: 'user', text: 'Hi there' }],
    });

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      messages: [{ role: 'user', text: 'Hi there' }],
    });
    expect(response).toEqual({
      threadId: 'thread-1',
      message: {
        role: 'assistant',
        text: 'Hello from backend',
        images: undefined,
      },
    });
  });

  it('includes threadId and forwards image URLs for follow-up turns', async () => {
    const fetchSpy = mock(
      async () =>
        new Response(
          JSON.stringify({
            thread_id: 'thread-1',
            messages: [
              {
                role: 'assistant',
                text: 'Got your image',
                images: [{ url: 'https://img.local/a.png' }],
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    );

    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const repository = new ChatRepositoryImpl();
    const response = await repository.send({
      threadId: 'thread-1',
      messages: [
        {
          role: 'user',
          text: 'Analyze this',
          images: [{ url: 'https://img.local/a.png' }],
        },
      ],
    });

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      threadId: 'thread-1',
      messages: [
        {
          role: 'user',
          text: 'Analyze this',
          images: [{ url: 'https://img.local/a.png' }],
        },
      ],
    });
    expect(response).toEqual({
      threadId: 'thread-1',
      message: {
        role: 'assistant',
        text: 'Got your image',
        images: [{ url: 'https://img.local/a.png' }],
      },
    });
  });

  it('normalizes outbound message roles to backend-supported values', async () => {
    const fetchSpy = mock(
      async () =>
        new Response(
          JSON.stringify({
            threadId: 'thread-1',
            message: {
              role: 'assistant',
              text: 'ok',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    );

    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const repository = new ChatRepositoryImpl();
    await repository.send({
      threadId: 'thread-1',
      messages: [{ role: 'system' as unknown as 'user', text: 'Instruction' }],
    });

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      threadId: 'thread-1',
      messages: [{ role: 'user', text: 'Instruction' }],
    });
  });

  it('parses optional mutation fields from screenplay assistant responses', async () => {
    const fetchSpy = mock(
      async () =>
        new Response(
          JSON.stringify({
            threadId: 'thread-screenplay',
            message: {
              role: 'assistant',
              text: 'I updated the draft.',
            },
            didMutate: true,
            updatedScreenplay: {
              id: 'screenplay-1',
              projectId: 'project-1',
              title: 'Act One',
              scenes: [
                {
                  id: 'scene-1',
                  name: 'Opening',
                  sceneNumber: 1,
                  content: '<scene><action>Updated action.</action></scene>',
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    );

    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const repository = new ChatRepositoryImpl();
    const response = await repository.send({
      messages: [{ role: 'user', text: 'Update opening scene' }],
    });

    expect(response.didMutate).toBe(true);
    expect(response.updatedScreenplay?.id).toBe('screenplay-1');
    expect(response.updatedScreenplay?.scenes[0]?.content).toContain('Updated action');
  });

  it('returns stream events from the send response shape', async () => {
    const fetchSpy = mock(
      async () =>
        new Response(
          JSON.stringify({
            threadId: 'thread-stream',
            message: {
              role: 'assistant',
              text: 'Applied changes.',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    );

    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const repository = new ChatRepositoryImpl();
    const streamed = await collectStream(
      repository.stream({
        agentType: 'screenplay_assistant',
        projectId: 'project-1',
        screenplayId: 'screenplay-1',
        activeSceneId: 'scene-1',
        messages: [{ role: 'user', text: 'Revise scene one' }],
      }),
    );

    expect(fetchSpy.mock.calls).toHaveLength(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/backend/api/v1/chat');
    expect(streamed.events).toEqual([
      {
        type: 'message',
        payload: {
          kind: 'part',
          part: {
            type: 'text',
            text: 'Applied changes.',
          },
        },
      },
      {
        type: 'done',
        threadId: 'thread-stream',
      },
    ]);
  });
});
