/**
 * Location Entity
 * Represents a filming location in a video project
 */
export interface Location {
  id: string;
  projectId: string;
  name: string;
  description: string;
  locationType: 'interior' | 'exterior';
  mood: string; // e.g., "Dark and mysterious", "Bright and cheerful"
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
}
