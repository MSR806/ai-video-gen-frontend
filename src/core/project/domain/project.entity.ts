/**
 * Project Status
 */
export type ProjectStatus = 'draft' | 'in-progress' | 'completed';

/**
 * Project Entity
 * Represents an AI video content generation project
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  style?: string | null;
  aspectRatio: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project creation payload.
 */
export interface ProjectCreationPayload {
  name: string;
  description: string;
  status?: ProjectStatus;
  style?: string | null;
  aspectRatio?: string;
}

export interface ProjectUpdatePayload {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  style?: string | null;
  aspectRatio?: string;
}
