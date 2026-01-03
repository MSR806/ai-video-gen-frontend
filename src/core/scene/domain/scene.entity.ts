/**
 * Scene Entity
 * Represents a scene in a video project
 */
export interface Scene {
  id: string;
  projectId: string;
  name: string;
  description: string;
  duration: number; // in seconds
  locationId: string;
  characterIds: string[];
  objective: string; // What the scene aims to accomplish
}
