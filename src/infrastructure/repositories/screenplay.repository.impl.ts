import {
  canonicalizeSceneXml,
  createEmptySceneXml,
  tryCanonicalizeSceneXml,
  type Screenplay,
  type ScreenplayScene,
  type ScreenplayRepository,
  type ScreenplayCreatePayload,
  type ScreenplayUpdatePayload,
  type ScreenplaySceneCreatePayload,
  type ScreenplaySceneUpdatePayload,
  type ScreenplaySceneReorderPayload,
} from '@core/screenplay';
import { BackendApiError, backendApiRequest } from '@infra/http/backend-api';

type ScreenplayResponse = ScreenplayApiResponse | { screenplay: ScreenplayApiResponse };

const SCREENPLAY_TITLE_FALLBACK = 'Untitled Screenplay';

export class ScreenplayRepositoryImpl implements ScreenplayRepository {
  async getByProjectId(projectId: string): Promise<Screenplay | null> {
    try {
      const response = await backendApiRequest<ScreenplayResponse | null>(
        `/api/v1/projects/${projectId}/screenplays`,
      );

      if (response === null) {
        return null;
      }

      return normalizeScreenplay(mapScreenplayFromApi(extractScreenplay(response), projectId));
    } catch (error) {
      if (error instanceof BackendApiError && error.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async create(projectId: string, payload: ScreenplayCreatePayload): Promise<Screenplay> {
    const response = await backendApiRequest<ScreenplayResponse>(
      `/api/v1/projects/${projectId}/screenplays`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    return normalizeScreenplay(mapScreenplayFromApi(extractScreenplay(response), projectId));
  }

  async update(projectId: string, payload: ScreenplayUpdatePayload): Promise<Screenplay> {
    const response = await backendApiRequest<ScreenplayResponse>(
      `/api/v1/projects/${projectId}/screenplays`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    return normalizeScreenplay(mapScreenplayFromApi(extractScreenplay(response), projectId));
  }

  async addScene(projectId: string, payload: ScreenplaySceneCreatePayload): Promise<Screenplay> {
    const response = await backendApiRequest<ScreenplayResponse>(
      `/api/v1/projects/${projectId}/screenplays/scenes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mapSceneCreatePayloadToApi(payload)),
      },
    );

    return normalizeScreenplay(mapScreenplayFromApi(extractScreenplay(response), projectId));
  }

  async updateScene(
    projectId: string,
    sceneId: string,
    payload: ScreenplaySceneUpdatePayload,
  ): Promise<ScreenplayScene> {
    const response = await backendApiRequest<ScreenplaySceneApiResponse>(
      `/api/v1/projects/${projectId}/screenplays/scenes/${sceneId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mapSceneUpdatePayloadToApi(payload)),
      },
    );

    return normalizeScene(mapSceneFromApi(response, 0), 0);
  }

  async deleteScene(projectId: string, sceneId: string): Promise<Screenplay> {
    const response = await backendApiRequest<ScreenplayResponse>(
      `/api/v1/projects/${projectId}/screenplays/scenes/${sceneId}`,
      {
        method: 'DELETE',
      },
    );

    return normalizeScreenplay(mapScreenplayFromApi(extractScreenplay(response), projectId));
  }

  async reorderScenes(
    projectId: string,
    payload: ScreenplaySceneReorderPayload,
  ): Promise<Screenplay> {
    const response = await backendApiRequest<ScreenplayResponse>(
      `/api/v1/projects/${projectId}/screenplays/scenes/reorder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    return normalizeScreenplay(mapScreenplayFromApi(extractScreenplay(response), projectId));
  }
}

interface ScreenplaySceneApiResponse {
  id: string;
  orderIndex?: number;
  sceneNumber?: number;
  content?: string;
}

interface ScreenplayApiResponse {
  id: string;
  projectId?: string;
  title?: string;
  scenes?: ScreenplaySceneApiResponse[];
  createdAt?: string;
  updatedAt?: string;
}

interface SceneCreateApiRequest {
  position?: number;
  content: string;
}

interface SceneUpdateApiRequest {
  content: string;
}

function extractScreenplay(payload: ScreenplayResponse): ScreenplayApiResponse {
  if ('screenplay' in payload) {
    return payload.screenplay;
  }

  return payload;
}

function mapScreenplayFromApi(payload: ScreenplayApiResponse, projectId: string): Screenplay {
  return {
    id: payload.id,
    projectId: payload.projectId || projectId,
    title: payload.title || SCREENPLAY_TITLE_FALLBACK,
    scenes: (payload.scenes ?? []).map((scene, index) => mapSceneFromApi(scene, index)),
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };
}

function mapSceneFromApi(payload: ScreenplaySceneApiResponse, index: number): ScreenplayScene {
  return {
    id: payload.id,
    name: `Scene ${index + 1}`,
    sceneNumber: payload.orderIndex ?? payload.sceneNumber ?? index + 1,
    content: normalizeSceneContentFromApi(payload.content),
  };
}

function mapSceneCreatePayloadToApi(payload: ScreenplaySceneCreatePayload): SceneCreateApiRequest {
  return {
    position: payload.position,
    content: normalizeSceneContentForRequest(payload.content, 'create'),
  };
}

function mapSceneUpdatePayloadToApi(payload: ScreenplaySceneUpdatePayload): SceneUpdateApiRequest {
  return {
    content: normalizeSceneContentForRequest(payload.content, 'update'),
  };
}

function normalizeScreenplay(screenplay: Screenplay): Screenplay {
  const orderedScenes = [...(screenplay.scenes ?? [])].sort(
    (a, b) => a.sceneNumber - b.sceneNumber,
  );

  return {
    ...screenplay,
    projectId: screenplay.projectId,
    title: screenplay.title?.trim() || SCREENPLAY_TITLE_FALLBACK,
    scenes: orderedScenes.map((scene, index) => normalizeScene(scene, index)),
  };
}

function normalizeScene(scene: ScreenplayScene, index: number): ScreenplayScene {
  return {
    id: scene.id,
    name: scene.name?.trim() || `Scene ${index + 1}`,
    sceneNumber: Number.isFinite(scene.sceneNumber) ? scene.sceneNumber : index + 1,
    content: normalizeSceneContentFromApi(scene.content),
  };
}

function normalizeSceneContentFromApi(content: string | null | undefined): string {
  if (typeof content !== 'string' || content.trim().length === 0) {
    return createEmptySceneXml();
  }

  const canonicalContent = tryCanonicalizeSceneXml(content);
  if (!canonicalContent) {
    // Preserve invalid backend payloads verbatim so we do not silently drop data.
    return content;
  }

  return canonicalContent;
}

function normalizeSceneContentForRequest(
  content: string | null | undefined,
  operation: 'create' | 'update',
): string {
  if (typeof content !== 'string') {
    if (operation === 'create') {
      return createEmptySceneXml();
    }

    throw new Error('Screenplay scene update requires XML content.');
  }

  if (content.trim().length === 0) {
    return createEmptySceneXml();
  }

  return canonicalizeSceneXml(content);
}
