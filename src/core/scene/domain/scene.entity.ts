/**
 * Scene Entity
 * Represents a scene in a video project.
 */
export type SceneContent = Record<string, unknown>;

export interface Scene {
  id: string;
  projectId: string;
  name: string;
  sceneNumber: number;
  content: SceneContent;
}
