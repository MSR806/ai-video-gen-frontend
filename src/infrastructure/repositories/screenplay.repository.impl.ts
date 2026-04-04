import {
  createScreenplayBlockId,
  type Screenplay,
  type ScreenplayBlock,
  type ScreenplayScene,
  type ScreenplaySceneContent,
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

interface ScreenplayBlockApiModel {
  id: string;
  type: string;
  text: string;
}

interface ScreenplaySceneApiResponse {
  id: string;
  orderIndex?: number;
  sceneNumber?: number;
  content?: ScreenplayBlockApiModel[] | ScreenplaySceneContent;
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
  content: ScreenplayBlockApiModel[];
}

interface SceneUpdateApiRequest {
  content: ScreenplayBlockApiModel[];
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
    content: mapSceneContentFromApi(payload.content),
  };
}

function mapSceneContentFromApi(
  payload: ScreenplayBlockApiModel[] | ScreenplaySceneContent | undefined,
): ScreenplaySceneContent {
  if (Array.isArray(payload)) {
    return {
      blocks: payload.map((block) => normalizeBlock(block)).filter((block) => block !== null),
    };
  }

  return normalizeSceneContent(payload);
}

function mapSceneCreatePayloadToApi(payload: ScreenplaySceneCreatePayload): SceneCreateApiRequest {
  return {
    position: payload.position,
    content: mapSceneContentToApi(payload.content),
  };
}

function mapSceneUpdatePayloadToApi(payload: ScreenplaySceneUpdatePayload): SceneUpdateApiRequest {
  return {
    content: mapSceneContentToApi(payload.content),
  };
}

function mapSceneContentToApi(
  content: ScreenplaySceneContent | undefined,
): ScreenplayBlockApiModel[] {
  return (content?.blocks ?? []).map((block) => ({
    id: block.id,
    type: block.type,
    text: block.text,
  }));
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
    content: normalizeSceneContent(scene.content),
  };
}

function normalizeSceneContent(
  content: ScreenplaySceneContent | null | undefined,
): ScreenplaySceneContent {
  if (!content || !Array.isArray(content.blocks)) {
    return { blocks: [] };
  }

  return {
    blocks: content.blocks.map((block) => normalizeBlock(block)).filter((block) => block !== null),
  };
}

function normalizeBlock(
  block: { id?: unknown; type?: unknown; text?: unknown } | null | undefined,
): ScreenplayBlock | null {
  if (!block) {
    return null;
  }

  const id =
    typeof block.id === 'string' && block.id.trim().length > 0
      ? block.id
      : createScreenplayBlockId();
  const text = typeof block.text === 'string' ? block.text : '';
  const type = normalizeBlockType(typeof block.type === 'string' ? block.type : '');

  return {
    id,
    text,
    type,
  };
}

function normalizeBlockType(rawType: string): ScreenplayBlock['type'] {
  switch (rawType) {
    case 'slugline':
    case 'action':
    case 'character':
    case 'parenthetical':
    case 'dialogue':
    case 'transition':
      return rawType;
    default:
      return 'action';
  }
}
