/**
 * Scene Entity
 * Represents a scene in a video project
 */
export interface Scene {
  id: string;
  projectId: string;
  name: string;
  sceneNumber: number;
  content: Record<string, unknown>; // The JSON representation of the TipTap editor blocks for *just this scene*
  locationId: string;
  characterIds: string[];
}
