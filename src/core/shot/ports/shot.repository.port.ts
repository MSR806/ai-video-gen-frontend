import type { Shot } from '../domain/shot.entity';

export interface ShotCreatePayload {
  title: string;
  description: string;
  cameraFraming: string;
  cameraMovement: string;
  mood: string;
}

export interface ShotUpdatePayload {
  title?: string;
  description?: string;
  cameraFraming?: string;
  cameraMovement?: string;
  mood?: string;
}

export interface ShotReorderPayload {
  shotIds: string[];
}

export interface ShotRepository {
  getBySceneId(projectId: string, sceneId: string): Promise<Shot[]>;
  create(projectId: string, sceneId: string, payload: ShotCreatePayload): Promise<Shot>;
  update(
    projectId: string,
    sceneId: string,
    shotId: string,
    payload: ShotUpdatePayload,
  ): Promise<Shot>;
  delete(projectId: string, sceneId: string, shotId: string): Promise<void>;
  reorder(projectId: string, sceneId: string, payload: ShotReorderPayload): Promise<void>;
}
