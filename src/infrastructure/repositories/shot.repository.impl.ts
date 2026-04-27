import type {
  Shot,
  ShotCreatePayload,
  ShotReorderPayload,
  ShotRepository,
  ShotUpdatePayload,
} from '@core/shot';
import { backendApiRequest } from '@infra/http/backend-api';

interface ShotApiResponse {
  id: string;
  sceneId?: string;
  scene_id?: string;
  orderIndex?: number;
  order_index?: number;
  title?: string;
  description?: string;
  cameraFraming?: string;
  camera_framing?: string;
  cameraMovement?: string;
  camera_movement?: string;
  mood?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

type ShotListResponse = ShotApiResponse[] | { shots: ShotApiResponse[] };
type ShotMutationResponse = ShotApiResponse | { shot: ShotApiResponse };

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asRequiredString = (value: unknown): string => (typeof value === 'string' ? value : '');

const asOrderIndex = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const mapShotFromApi = (payload: ShotApiResponse, fallbackOrderIndex: number): Shot => {
  return {
    id: payload.id,
    sceneId: asRequiredString(payload.sceneId ?? payload.scene_id),
    orderIndex: asOrderIndex(payload.orderIndex ?? payload.order_index, fallbackOrderIndex),
    title: asRequiredString(payload.title),
    description: asRequiredString(payload.description),
    cameraFraming: asRequiredString(payload.cameraFraming ?? payload.camera_framing),
    cameraMovement: asRequiredString(payload.cameraMovement ?? payload.camera_movement),
    mood: asRequiredString(payload.mood),
    createdAt: asOptionalString(payload.createdAt ?? payload.created_at),
    updatedAt: asOptionalString(payload.updatedAt ?? payload.updated_at),
  };
};

const extractShotList = (payload: ShotListResponse): ShotApiResponse[] =>
  Array.isArray(payload) ? payload : payload.shots;

const extractShot = (payload: ShotMutationResponse): ShotApiResponse =>
  'shot' in payload ? payload.shot : payload;

const mapShotPayloadForRequest = (
  payload: ShotCreatePayload | ShotUpdatePayload,
): Record<string, string> => {
  const normalizedPayload: Record<string, string> = {};

  if (typeof payload.title === 'string') {
    normalizedPayload.title = payload.title;
  }
  if (typeof payload.description === 'string') {
    normalizedPayload.description = payload.description;
  }
  if (typeof payload.cameraFraming === 'string') {
    normalizedPayload.cameraFraming = payload.cameraFraming;
  }
  if (typeof payload.cameraMovement === 'string') {
    normalizedPayload.cameraMovement = payload.cameraMovement;
  }
  if (typeof payload.mood === 'string') {
    normalizedPayload.mood = payload.mood;
  }

  return normalizedPayload;
};

const getSceneShotsBasePath = (projectId: string, sceneId: string): string =>
  `/api/v1/projects/${projectId}/screenplays/scenes/${sceneId}/shots`;

export class ShotRepositoryImpl implements ShotRepository {
  async getBySceneId(projectId: string, sceneId: string): Promise<Shot[]> {
    const response = await backendApiRequest<ShotListResponse>(
      getSceneShotsBasePath(projectId, sceneId),
    );
    return mapAndSortShotList(response);
  }

  async generate(projectId: string, sceneId: string): Promise<Shot[]> {
    const response = await backendApiRequest<ShotListResponse>(
      `${getSceneShotsBasePath(projectId, sceneId)}/generate`,
      {
        method: 'POST',
      },
    );

    return mapAndSortShotList(response);
  }

  async create(projectId: string, sceneId: string, payload: ShotCreatePayload): Promise<Shot> {
    const response = await backendApiRequest<ShotMutationResponse>(
      getSceneShotsBasePath(projectId, sceneId),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mapShotPayloadForRequest(payload)),
      },
    );

    return mapShotFromApi(extractShot(response), 0);
  }

  async update(
    projectId: string,
    sceneId: string,
    shotId: string,
    payload: ShotUpdatePayload,
  ): Promise<Shot> {
    const response = await backendApiRequest<ShotMutationResponse>(
      `${getSceneShotsBasePath(projectId, sceneId)}/${shotId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mapShotPayloadForRequest(payload)),
      },
    );

    return mapShotFromApi(extractShot(response), 0);
  }

  async delete(projectId: string, sceneId: string, shotId: string): Promise<void> {
    await backendApiRequest<void>(`${getSceneShotsBasePath(projectId, sceneId)}/${shotId}`, {
      method: 'DELETE',
    });
  }

  async reorder(projectId: string, sceneId: string, payload: ShotReorderPayload): Promise<void> {
    await backendApiRequest<void>(`${getSceneShotsBasePath(projectId, sceneId)}/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }
}

function mapAndSortShotList(payload: ShotListResponse): Shot[] {
  const shots = extractShotList(payload).map((shot, index) => mapShotFromApi(shot, index + 1));
  return [...shots].sort((a, b) => a.orderIndex - b.orderIndex);
}
