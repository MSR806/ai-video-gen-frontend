import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

export interface MockProjectDto {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

interface MockCollectionDto {
  id: string;
  projectId: string;
  parentCollectionId: string | null;
  name: string;
  tag: string;
  description: string;
}

interface MockScreenplayBlockDto {
  id: string;
  type: string;
  text: string;
}

export interface MockScreenplaySceneDto {
  id: string;
  orderIndex: number;
  content: MockScreenplayBlockDto[];
}

export interface MockScreenplayDto {
  id: string;
  projectId: string;
  title: string;
  scenes: MockScreenplaySceneDto[];
}

interface MockShotDto {
  id: string;
  sceneId: string;
  orderIndex: number;
  title: string;
  description: string;
  cameraFraming: string;
  cameraMovement: string;
  mood: string;
}

interface MockBackendFixture {
  projects: MockProjectDto[];
  collectionsByProject: Record<string, MockCollectionDto[]>;
  screenplaysByProject: Record<string, MockScreenplayDto | null>;
}

interface StartMockBackendServerOptions {
  fixture?: MockBackendFixture;
  port?: number;
}

interface StartedMockBackendServer {
  fixture: MockBackendFixture;
  stop: () => Promise<void>;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const BASE_TIMESTAMP = '2026-03-05T12:00:00.000Z';

function json(response: ServerResponse<IncomingMessage>, status: number, body: unknown): void {
  response.writeHead(status, JSON_HEADERS);
  response.end(JSON.stringify(body));
}

function notFound(response: ServerResponse<IncomingMessage>, message: string): void {
  json(response, 404, {
    error: {
      code: 'not_found',
      message,
    },
  });
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  let payload = '';
  for await (const chunk of request) {
    payload += chunk.toString();
  }

  if (payload.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeScreenplayScenes(scenes: MockScreenplaySceneDto[]): MockScreenplaySceneDto[] {
  return [...scenes]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((scene, index) => ({
      ...scene,
      orderIndex: index + 1,
    }));
}

function cloneScreenplay(screenplay: MockScreenplayDto): MockScreenplayDto {
  return JSON.parse(JSON.stringify(screenplay)) as MockScreenplayDto;
}

function cloneScreenplayScene(scene: MockScreenplaySceneDto): MockScreenplaySceneDto {
  return JSON.parse(JSON.stringify(scene)) as MockScreenplaySceneDto;
}

export function createDefaultMockFixture(projectId = 'project-e2e-1'): MockBackendFixture {
  return {
    projects: [
      {
        id: projectId,
        name: 'E2E Demo Project',
        description: 'Playwright smoke test project',
        status: 'draft',
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
      },
    ],
    collectionsByProject: {
      [projectId]: [
        {
          id: 'collection-e2e-1',
          projectId,
          parentCollectionId: null,
          name: 'Root Collection',
          tag: 'root',
          description: 'Root collection for smoke tests',
        },
      ],
    },
    screenplaysByProject: {
      [projectId]: {
        id: 'screenplay-e2e-1',
        projectId,
        title: 'Untitled Screenplay',
        scenes: [
          {
            id: 'screenplay-scene-e2e-1',
            orderIndex: 1,
            content: [{ id: 'blk-1', type: 'action', text: 'Initial mocked screenplay content.' }],
          },
        ],
      },
    },
  };
}

export async function startMockBackendServer(
  options: StartMockBackendServerOptions = {},
): Promise<StartedMockBackendServer> {
  const fixture = options.fixture ?? createDefaultMockFixture();
  const port = options.port ?? 18080;
  const shotsByScene = new Map<string, MockShotDto[]>();

  const server = createServer(async (request, response) => {
    const method = request.method?.toUpperCase() ?? 'GET';
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const pathname = requestUrl.pathname;

    if (method === 'GET' && pathname === '/api/v1/projects') {
      json(response, 200, fixture.projects);
      return;
    }

    if (method === 'POST' && pathname === '/api/v1/projects') {
      const body = await readJsonBody(request);
      const id = `project-e2e-${fixture.projects.length + 1}`;
      const created: MockProjectDto = {
        id,
        name: typeof body.name === 'string' ? body.name : 'Untitled Project',
        description: typeof body.description === 'string' ? body.description : '',
        status:
          body.status === 'completed' || body.status === 'in-progress' ? body.status : 'draft',
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
      };
      fixture.projects = [created, ...fixture.projects];
      fixture.collectionsByProject[id] = [];
      fixture.screenplaysByProject[id] = null;
      json(response, 200, created);
      return;
    }

    const projectPathMatch = pathname.match(/^\/api\/v1\/projects\/([^/]+)$/);
    if (method === 'GET' && projectPathMatch) {
      const [, projectId] = projectPathMatch;
      const project = fixture.projects.find((entry) => entry.id === projectId);
      if (!project) {
        notFound(response, 'Project not found');
        return;
      }

      json(response, 200, project);
      return;
    }

    const collectionsPathMatch = pathname.match(/^\/api\/v1\/projects\/([^/]+)\/collections$/);
    if (method === 'GET' && collectionsPathMatch) {
      const [, projectId] = collectionsPathMatch;
      const collections = fixture.collectionsByProject[projectId];
      if (!collections) {
        notFound(response, 'Project not found');
        return;
      }

      json(response, 200, collections);
      return;
    }

    const screenplayPathMatch = pathname.match(/^\/api\/v1\/projects\/([^/]+)\/screenplays$/);
    if (method === 'GET' && screenplayPathMatch) {
      const [, projectId] = screenplayPathMatch;
      if (!(projectId in fixture.screenplaysByProject)) {
        notFound(response, 'Project not found');
        return;
      }

      json(response, 200, fixture.screenplaysByProject[projectId]);
      return;
    }

    if (method === 'POST' && screenplayPathMatch) {
      const [, projectId] = screenplayPathMatch;
      if (!(projectId in fixture.screenplaysByProject)) {
        notFound(response, 'Project not found');
        return;
      }

      const body = await readJsonBody(request);
      const created: MockScreenplayDto = {
        id: `screenplay-${projectId}`,
        projectId,
        title: typeof body.title === 'string' ? body.title : 'Untitled Screenplay',
        scenes: [],
      };

      fixture.screenplaysByProject[projectId] = created;
      json(response, 200, created);
      return;
    }

    if (method === 'PATCH' && screenplayPathMatch) {
      const [, projectId] = screenplayPathMatch;
      const screenplay = fixture.screenplaysByProject[projectId];
      if (!screenplay) {
        notFound(response, 'Screenplay not found');
        return;
      }

      const body = await readJsonBody(request);
      screenplay.title = typeof body.title === 'string' ? body.title : screenplay.title;
      json(response, 200, cloneScreenplay(screenplay));
      return;
    }

    const screenplayScenesPathMatch = pathname.match(
      /^\/api\/v1\/projects\/([^/]+)\/screenplays\/scenes$/,
    );
    if (method === 'POST' && screenplayScenesPathMatch) {
      const [, projectId] = screenplayScenesPathMatch;
      const screenplay = fixture.screenplaysByProject[projectId];
      if (!screenplay) {
        notFound(response, 'Screenplay not found');
        return;
      }

      const body = await readJsonBody(request);
      const requestedPosition =
        typeof body.position === 'number' && Number.isFinite(body.position)
          ? Math.max(1, Math.floor(body.position))
          : screenplay.scenes.length + 1;
      const content = Array.isArray(body.content) ? (body.content as MockScreenplayBlockDto[]) : [];
      const nextScene: MockScreenplaySceneDto = {
        id: `screenplay-scene-${Date.now()}`,
        orderIndex: requestedPosition,
        content,
      };

      const nextScenes = [...screenplay.scenes];
      nextScenes.splice(Math.min(nextScenes.length, requestedPosition - 1), 0, nextScene);
      screenplay.scenes = normalizeScreenplayScenes(nextScenes);

      json(response, 200, cloneScreenplay(screenplay));
      return;
    }

    const screenplayScenePathMatch = pathname.match(
      /^\/api\/v1\/projects\/([^/]+)\/screenplays\/scenes\/([^/]+)$/,
    );
    if (method === 'PATCH' && screenplayScenePathMatch) {
      const [, projectId, sceneId] = screenplayScenePathMatch;
      const screenplay = fixture.screenplaysByProject[projectId];
      if (!screenplay) {
        notFound(response, 'Screenplay not found');
        return;
      }

      const scene = screenplay.scenes.find((entry) => entry.id === sceneId);
      if (!scene) {
        notFound(response, 'Screenplay scene not found');
        return;
      }

      const body = await readJsonBody(request);
      if (Array.isArray(body.content)) {
        scene.content = body.content as MockScreenplayBlockDto[];
      }

      json(response, 200, cloneScreenplayScene(scene));
      return;
    }

    if (method === 'DELETE' && screenplayScenePathMatch) {
      const [, projectId, sceneId] = screenplayScenePathMatch;
      const screenplay = fixture.screenplaysByProject[projectId];
      if (!screenplay) {
        notFound(response, 'Screenplay not found');
        return;
      }

      screenplay.scenes = normalizeScreenplayScenes(
        screenplay.scenes.filter((scene) => scene.id !== sceneId),
      );
      json(response, 200, cloneScreenplay(screenplay));
      return;
    }

    const reorderPathMatch = pathname.match(
      /^\/api\/v1\/projects\/([^/]+)\/screenplays\/scenes\/reorder$/,
    );
    if (method === 'POST' && reorderPathMatch) {
      const [, projectId] = reorderPathMatch;
      const screenplay = fixture.screenplaysByProject[projectId];
      if (!screenplay) {
        notFound(response, 'Screenplay not found');
        return;
      }

      const body = await readJsonBody(request);
      const sceneIds = Array.isArray(body.sceneIds)
        ? body.sceneIds.filter((value): value is string => typeof value === 'string')
        : [];

      const byId = new Map(screenplay.scenes.map((scene) => [scene.id, scene]));
      screenplay.scenes = normalizeScreenplayScenes(
        sceneIds
          .map((sceneId) => byId.get(sceneId))
          .filter((scene): scene is MockScreenplaySceneDto => Boolean(scene)),
      );

      json(response, 200, cloneScreenplay(screenplay));
      return;
    }

    const sceneShotsPathMatch = pathname.match(
      /^\/api\/v1\/projects\/([^/]+)\/screenplays\/scenes\/([^/]+)\/shots$/,
    );
    if (method === 'GET' && sceneShotsPathMatch) {
      const [, projectId, sceneId] = sceneShotsPathMatch;
      const screenplay = fixture.screenplaysByProject[projectId];
      if (!screenplay) {
        notFound(response, 'Screenplay not found');
        return;
      }

      const hasScene = screenplay.scenes.some((scene) => scene.id === sceneId);
      if (!hasScene) {
        notFound(response, 'Screenplay scene not found');
        return;
      }

      json(response, 200, shotsByScene.get(sceneId) ?? []);
      return;
    }

    const generateSceneShotsPathMatch = pathname.match(
      /^\/api\/v1\/projects\/([^/]+)\/screenplays\/scenes\/([^/]+)\/shots\/generate$/,
    );
    if (method === 'POST' && generateSceneShotsPathMatch) {
      const [, projectId, sceneId] = generateSceneShotsPathMatch;
      const screenplay = fixture.screenplaysByProject[projectId];
      if (!screenplay) {
        notFound(response, 'Screenplay not found');
        return;
      }

      const hasScene = screenplay.scenes.some((scene) => scene.id === sceneId);
      if (!hasScene) {
        notFound(response, 'Screenplay scene not found');
        return;
      }

      const generatedShots: MockShotDto[] = [
        {
          id: `${sceneId}-generated-1`,
          sceneId,
          orderIndex: 1,
          title: 'Generated establishing shot',
          description: 'Auto-generated opening shot for the selected scene.',
          cameraFraming: 'Wide',
          cameraMovement: 'Static',
          mood: 'Neutral',
        },
        {
          id: `${sceneId}-generated-2`,
          sceneId,
          orderIndex: 2,
          title: 'Generated follow-up shot',
          description: 'Auto-generated follow-up framing for the scene beat.',
          cameraFraming: 'Medium',
          cameraMovement: 'Push in',
          mood: 'Tense',
        },
      ];

      shotsByScene.set(sceneId, generatedShots);
      json(response, 200, generatedShots);
      return;
    }

    const generateShotVisualsPathMatch = pathname.match(
      /^\/api\/v1\/projects\/([^/]+)\/screenplays\/scenes\/([^/]+)\/shots\/generate-visuals$/,
    );
    if (method === 'POST' && generateShotVisualsPathMatch) {
      const [, projectId, sceneId] = generateShotVisualsPathMatch;
      const screenplay = fixture.screenplaysByProject[projectId];
      if (!screenplay) {
        notFound(response, 'Screenplay not found');
        return;
      }

      const hasScene = screenplay.scenes.some((scene) => scene.id === sceneId);
      if (!hasScene) {
        notFound(response, 'Screenplay scene not found');
        return;
      }

      const body = await readJsonBody(request);
      const shotIds = Array.isArray(body.shotIds)
        ? body.shotIds.filter((value): value is string => typeof value === 'string')
        : [];
      const result = shotIds.map((shotId, index) => ({
        shotId,
        collectionId: `collection-${shotId}`,
        runId: `run-${sceneId}-${index + 1}`,
        status: 'accepted',
        error: null,
      }));

      json(response, 202, result);
      return;
    }

    const collectionContentsMatch = pathname.match(/^\/api\/v1\/collections\/([^/]+)\/items$/);
    if (method === 'GET' && collectionContentsMatch) {
      const [, collectionId] = collectionContentsMatch;
      const projectCollections = Object.values(fixture.collectionsByProject).flat();
      const hasCollection = projectCollections.some((collection) => collection.id === collectionId);
      if (!hasCollection) {
        notFound(response, 'Collection not found');
        return;
      }

      json(response, 200, { items: [], childCollections: [] });
      return;
    }

    json(response, 404, {
      error: {
        code: 'not_found',
        message: `Unhandled mock backend route: ${method} ${pathname}`,
      },
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });

  return {
    fixture,
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
