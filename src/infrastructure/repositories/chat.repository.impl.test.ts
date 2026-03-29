import { afterEach, describe, expect, it, mock } from 'bun:test';
import { ChatRepositoryImpl } from './chat.repository.impl';

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
});
