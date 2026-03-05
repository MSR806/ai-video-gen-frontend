import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

export interface MockProjectDto {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface MockCollectionDto {
  id: string;
  projectId: string;
  parentCollectionId: string | null;
  name: string;
  tag: string;
  description: string;
}

export interface MockSceneDto {
  id: string;
  projectId: string;
  name: string;
  sceneNumber: number;
  content: Record<string, unknown>;
}

interface MockBackendFixture {
  projects: MockProjectDto[];
  collectionsByProject: Record<string, MockCollectionDto[]>;
  scenesByProject: Record<string, MockSceneDto[]>;
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

function normalizeScenes(scenes: MockSceneDto[]): MockSceneDto[] {
  return [...scenes]
    .sort((a, b) => a.sceneNumber - b.sceneNumber)
    .map((scene, index) => ({
      ...scene,
      sceneNumber: index + 1,
      name:
        typeof scene.name === 'string' && scene.name.trim().length > 0
          ? scene.name
          : `Untitled Scene ${index + 1}`,
    }));
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
    scenesByProject: {
      [projectId]: [
        {
          id: 'scene-e2e-1',
          projectId,
          name: 'Opening Scene',
          sceneNumber: 1,
          content: { text: 'Initial mocked scene content.' },
        },
      ],
    },
  };
}

export async function startMockBackendServer(
  options: StartMockBackendServerOptions = {},
): Promise<StartedMockBackendServer> {
  const fixture = options.fixture ?? createDefaultMockFixture();
  const port = options.port ?? 18080;

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
      fixture.scenesByProject[id] = [];
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

    const scenesPathMatch = pathname.match(/^\/api\/v1\/projects\/([^/]+)\/scenes$/);
    if (method === 'GET' && scenesPathMatch) {
      const [, projectId] = scenesPathMatch;
      const scenes = fixture.scenesByProject[projectId];
      if (!scenes) {
        notFound(response, 'Project not found');
        return;
      }

      json(response, 200, normalizeScenes(scenes));
      return;
    }

    const patchScenePathMatch = pathname.match(/^\/api\/v1\/projects\/([^/]+)\/scenes\/([^/]+)$/);
    if (method === 'PATCH' && patchScenePathMatch) {
      const [, projectId, sceneId] = patchScenePathMatch;
      const scenes = fixture.scenesByProject[projectId];
      if (!scenes) {
        notFound(response, 'Project not found');
        return;
      }

      const sceneIndex = scenes.findIndex((scene) => scene.id === sceneId);
      if (sceneIndex === -1) {
        notFound(response, 'Scene not found');
        return;
      }

      const body = await readJsonBody(request);
      const next = {
        ...scenes[sceneIndex],
        ...(typeof body.name === 'string' ? { name: body.name } : {}),
        ...(body.content && typeof body.content === 'object'
          ? { content: body.content as Record<string, unknown> }
          : {}),
      };

      scenes[sceneIndex] = next;
      fixture.scenesByProject[projectId] = normalizeScenes(scenes);
      json(response, 200, next);
      return;
    }

    const deleteScenePathMatch = pathname.match(/^\/api\/v1\/projects\/([^/]+)\/scenes\/([^/]+)$/);
    if (method === 'DELETE' && deleteScenePathMatch) {
      const [, projectId, sceneId] = deleteScenePathMatch;
      const scenes = fixture.scenesByProject[projectId];
      if (!scenes) {
        notFound(response, 'Project not found');
        return;
      }

      const nextScenes = normalizeScenes(scenes.filter((scene) => scene.id !== sceneId));
      fixture.scenesByProject[projectId] = nextScenes;
      json(response, 200, { success: true, scenes: nextScenes });
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
