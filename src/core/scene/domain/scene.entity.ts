/**
 * Scene Entity
 * Represents a scene in a video project.
 */
export interface Scene {
  id: string;
  projectId: string;
  name: string;
  sceneNumber: number;
  body: string;
}
