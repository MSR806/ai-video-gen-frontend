import type {
  Screenplay,
  ScreenplayScene,
  ScreenplaySceneContent,
} from '../domain/screenplay.entity';

export interface ScreenplayCreatePayload {
  title?: string;
}

export interface ScreenplayUpdatePayload {
  title: string;
}

export interface ScreenplaySceneCreatePayload {
  id?: string;
  name?: string;
  position?: number;
  content?: ScreenplaySceneContent;
}

export interface ScreenplaySceneUpdatePayload {
  name?: string;
  content?: ScreenplaySceneContent;
}

export interface ScreenplaySceneReorderPayload {
  sceneIds: string[];
}

export interface ScreenplayRepository {
  getByProjectId(projectId: string): Promise<Screenplay | null>;
  create(projectId: string, payload: ScreenplayCreatePayload): Promise<Screenplay>;
  update(projectId: string, payload: ScreenplayUpdatePayload): Promise<Screenplay>;
  addScene(projectId: string, payload: ScreenplaySceneCreatePayload): Promise<Screenplay>;
  updateScene(
    projectId: string,
    sceneId: string,
    payload: ScreenplaySceneUpdatePayload,
  ): Promise<ScreenplayScene>;
  deleteScene(projectId: string, sceneId: string): Promise<Screenplay>;
  reorderScenes(projectId: string, payload: ScreenplaySceneReorderPayload): Promise<Screenplay>;
}
