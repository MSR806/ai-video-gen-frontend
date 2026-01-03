import type { Location } from '../domain/location.entity';

/**
 * Repository interface for Location persistence
 */
export interface LocationRepository {
  getAllByProjectId(projectId: string): Promise<Location[]>;
  getById(id: string): Promise<Location | null>;
}
