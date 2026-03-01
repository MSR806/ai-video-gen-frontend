/**
 * Collection Entity
 * Represents a group of media items in a project.
 */
export interface Collection {
  id: string;
  projectId: string;
  name: string;
  tag: string;
  description: string;
}
