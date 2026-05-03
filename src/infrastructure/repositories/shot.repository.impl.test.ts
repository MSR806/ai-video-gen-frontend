import { afterEach, describe, expect, it } from 'bun:test';
import { ShotRepositoryImpl } from './shot.repository.impl';

afterEach(() => {
  delete (globalThis as Record<string, unknown>).fetch;
});

describe('ShotRepositoryImpl', () => {
  it('loads shots for a scene and sorts by order index', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            id: 'shot-2',
            sceneId: 'scene-1',
            collectionId: 'collection-7',
            orderIndex: 2,
            title: 'Close-up on hand',
            description: 'Character opens a letter.',
            cameraFraming: 'Close-up',
            cameraMovement: 'Static',
            mood: 'Tense',
          },
          {
            id: 'shot-1',
            sceneId: 'scene-1',
            collectionId: null,
            orderIndex: 1,
            title: 'Wide hallway',
            description: 'Character enters frame.',
            cameraFraming: 'Wide',
            cameraMovement: 'Dolly in',
            mood: 'Uneasy',
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )) as typeof fetch;

    const repository = new ShotRepositoryImpl();
    const shots = await repository.getBySceneId('project-1', 'scene-1');

    expect(shots.map((shot) => shot.id)).toEqual(['shot-1', 'shot-2']);
    expect(shots[0]?.cameraFraming).toBe('Wide');
    expect((shots[0] as unknown as { collectionId: string | null }).collectionId).toBeNull();
    expect((shots[1] as unknown as { collectionId: string | null }).collectionId).toBe(
      'collection-7',
    );
  });

  it('posts create payload to scene shots endpoint', async () => {
    let requestPath = '';
    let requestBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestPath = String(input);
      requestBody = JSON.parse(String(init?.body));

      return new Response(
        JSON.stringify({
          id: 'shot-3',
          sceneId: 'scene-1',
          orderIndex: 3,
          title: 'Insert detail',
          description: 'A phone buzzes on the table.',
          cameraFraming: 'Insert',
          cameraMovement: 'Static',
          mood: 'Urgent',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const repository = new ShotRepositoryImpl();
    const shot = await repository.create('project-1', 'scene-1', {
      title: 'Insert detail',
      description: 'A phone buzzes on the table.',
      cameraFraming: 'Insert',
      cameraMovement: 'Static',
      mood: 'Urgent',
    });

    expect(requestPath).toContain('/api/v1/projects/project-1/screenplays/scenes/scene-1/shots');
    expect(requestBody).toEqual({
      title: 'Insert detail',
      description: 'A phone buzzes on the table.',
      cameraFraming: 'Insert',
      cameraMovement: 'Static',
      mood: 'Urgent',
    });
    expect(shot.id).toBe('shot-3');
  });

  it('posts reorder payload with shot ids', async () => {
    let requestPath = '';
    let requestMethod = '';
    let requestBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestPath = String(input);
      requestMethod = String(init?.method);
      requestBody = JSON.parse(String(init?.body));

      return new Response(null, { status: 204 });
    }) as typeof fetch;

    const repository = new ShotRepositoryImpl();
    await repository.reorder('project-1', 'scene-1', {
      shotIds: ['shot-3', 'shot-1', 'shot-2'],
    });

    expect(requestPath).toContain(
      '/api/v1/projects/project-1/screenplays/scenes/scene-1/shots/reorder',
    );
    expect(requestMethod).toBe('POST');
    expect(requestBody).toEqual({ shotIds: ['shot-3', 'shot-1', 'shot-2'] });
  });

  it('posts generate request and returns generated shots sorted by order index', async () => {
    let requestPath = '';
    let requestMethod = '';

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestPath = String(input);
      requestMethod = String(init?.method);

      return new Response(
        JSON.stringify({
          shots: [
            {
              id: 'shot-2',
              sceneId: 'scene-1',
              orderIndex: 2,
              title: 'Second generated shot',
              description: 'Generated second',
              cameraFraming: 'Close-up',
              cameraMovement: 'Tilt',
              mood: 'Tense',
            },
            {
              id: 'shot-1',
              sceneId: 'scene-1',
              orderIndex: 1,
              title: 'First generated shot',
              description: 'Generated first',
              cameraFraming: 'Wide',
              cameraMovement: 'Static',
              mood: 'Calm',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const repository = new ShotRepositoryImpl();
    const shots = await repository.generate('project-1', 'scene-1');

    expect(requestPath).toContain(
      '/api/v1/projects/project-1/screenplays/scenes/scene-1/shots/generate',
    );
    expect(requestMethod).toBe('POST');
    expect(shots.map((shot) => shot.id)).toEqual(['shot-1', 'shot-2']);
  });

  it('posts generate visuals payload and returns accepted runs', async () => {
    let requestPath = '';
    let requestMethod = '';
    let requestBody: Record<string, unknown> | null = null;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestPath = String(input);
      requestMethod = String(init?.method);
      requestBody = JSON.parse(String(init?.body));

      return new Response(
        JSON.stringify([
          {
            shotId: 'shot-1',
            collectionId: 'collection-11',
            runId: 'run-11',
            status: 'accepted',
            error: null,
          },
          {
            shotId: 'shot-2',
            collectionId: null,
            runId: 'run-12',
            status: 'failed',
            error: 'prompt unavailable',
          },
        ]),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }) as typeof fetch;

    const repository = new ShotRepositoryImpl();
    const result = await repository.generateVisuals('project-1', 'scene-1', {
      shotIds: ['shot-1', 'shot-2'],
      modelKey: 'nano_banana',
      operationKey: 'text_to_image',
    });

    expect(requestPath).toContain(
      '/api/v1/projects/project-1/screenplays/scenes/scene-1/shots/generate-visuals',
    );
    expect(requestMethod).toBe('POST');
    expect(requestBody).toEqual({
      shotIds: ['shot-1', 'shot-2'],
      modelKey: 'nano_banana',
      operationKey: 'text_to_image',
    });
    expect(result).toEqual([
      {
        shotId: 'shot-1',
        collectionId: 'collection-11',
        runId: 'run-11',
        status: 'accepted',
        error: null,
      },
      {
        shotId: 'shot-2',
        collectionId: null,
        runId: 'run-12',
        status: 'failed',
        error: 'prompt unavailable',
      },
    ]);
  });
});
