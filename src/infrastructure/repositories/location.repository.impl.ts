import type { Location } from '@core/location';
import type { LocationRepository } from '@core/location';

/**
 * Implementation of LocationRepository
 */
export class LocationRepositoryImpl implements LocationRepository {
  private locations: Location[] = [
    {
      id: 'loc-1',
      projectId: '1',
      name: 'Modern Office Conference Room',
      description:
        'Bright, contemporary conference room with glass walls, modern furniture, and clean aesthetic perfect for professional demonstrations.',
      locationType: 'interior',
      mood: 'Professional and inspiring',
      timeOfDay: 'afternoon',
    },
    {
      id: 'loc-2',
      projectId: '1',
      name: 'Product Studio',
      description:
        'Dedicated product showcase studio with controlled lighting, green screen, and equipment for close-up demonstrations.',
      locationType: 'interior',
      mood: 'Tech-forward and clean',
      timeOfDay: 'morning',
    },
    {
      id: 'loc-3',
      projectId: '1',
      name: 'Customer Office - Startup Workspace',
      description:
        'Energetic co-working space with exposed brick, creative atmosphere, representing modern startup environment.',
      locationType: 'interior',
      mood: 'Dynamic and creative',
      timeOfDay: 'afternoon',
    },
    {
      id: 'loc-4',
      projectId: '1',
      name: 'Executive Board Room',
      description:
        'Elegant board room with dark wood paneling, large conference table, for high-stakes decision-making scenes.',
      locationType: 'interior',
      mood: 'Sophisticated and authoritative',
      timeOfDay: 'morning',
    },
  ];

  async getAllByProjectId(projectId: string): Promise<Location[]> {
    const filtered = this.locations.filter((l) => l.projectId === projectId);
    return Promise.resolve(filtered);
  }

  async getById(id: string): Promise<Location | null> {
    const location = this.locations.find((l) => l.id === id);
    return Promise.resolve(location || null);
  }
}
