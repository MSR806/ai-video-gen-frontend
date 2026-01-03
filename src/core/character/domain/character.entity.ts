/**
 * Character Entity
 * Represents a character in a video project
 */
export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: string; // e.g., "Protagonist", "Narrator", "Supporting"
  description: string;
  age?: number;
  personalityTraits: string[];
  physicalDescription: string;
}
