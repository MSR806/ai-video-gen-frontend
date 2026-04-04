import { afterEach, describe, expect, it } from 'bun:test';
import { ScreenplayRepositoryImpl } from './screenplay.repository.impl';

afterEach(() => {
  delete (globalThis as Record<string, unknown>).fetch;
});

describe('ScreenplayRepositoryImpl XML safeguards', () => {
  it('preserves invalid API scene xml instead of silently replacing it', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          id: 'screenplay-1',
          projectId: 'project-1',
          title: 'Untitled Screenplay',
          scenes: [
            {
              id: 'scene-1',
              orderIndex: 1,
              content: '<sequence><action>broken</action></sequence>',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )) as typeof fetch;

    const repository = new ScreenplayRepositoryImpl();
    const screenplay = await repository.getByProjectId('project-1');

    expect(screenplay?.scenes[0]?.content).toBe('<sequence><action>broken</action></sequence>');
  });

  it('throws for invalid update payload xml instead of coercing to empty scene', async () => {
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    const repository = new ScreenplayRepositoryImpl();

    await expect(
      repository.updateScene('project-1', 'scene-1', {
        content: '<scene><action><em>bad</em></action></scene>',
      }),
    ).rejects.toThrow();
    expect(fetchCalled).toBeFalse();
  });
});
