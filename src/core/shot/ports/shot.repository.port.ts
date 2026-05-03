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

export interface GenerateShotVisualsPayload {
  shotIds: string[];
  modelKey: 'nano_banana';
  operationKey: 'text_to_image';
}

export interface ShotVisualGenerationResult {
  shotId: string;
  collectionId: string | null;
  runId: string | null;
  status: string;
  error: string | null;
}

export interface ShotRepository {
  getBySceneId(projectId: string, sceneId: string): Promise<Shot[]>;
  generate(projectId: string, sceneId: string): Promise<Shot[]>;
  generateVisuals(
    projectId: string,
    sceneId: string,
    payload: GenerateShotVisualsPayload,
  ): Promise<ShotVisualGenerationResult[]>;
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
