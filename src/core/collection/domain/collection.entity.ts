/**
 * Collection Entity
 * Represents a group of media items in a project.
 */
export interface Collection {
  id: string;
  projectId: string;
  parentCollectionId: string | null;
  name: string;
  tag: string;
  description: string;
  thumbnailUrl?: string | null;
}

/**
 * Collection creation payload.
 */
export interface CollectionCreationPayload {
  projectId: string;
  parentCollectionId?: string | null;
  name: string;
  tag: string;
  description: string;
}
