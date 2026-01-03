import type { Location } from '../domain/location.entity';
import type { LocationRepository } from '../ports/location.repository.port';

/**
 * Use Case: Get Project Locations
 * Retrieves all locations for a specific project
 */
export class GetProjectLocationsUseCase {
  constructor(private locationRepository: LocationRepository) {}

  async execute(projectId: string): Promise<Location[]> {
    return this.locationRepository.getAllByProjectId(projectId);
  }
}
