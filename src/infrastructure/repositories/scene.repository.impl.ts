import type { Scene } from '@core/scene';
import type { SceneRepository } from '@core/scene';

/**
 * Implementation of SceneRepository
 */
export class SceneRepositoryImpl implements SceneRepository {
  private scenes: Scene[] = [
    {
      id: 'scene-1',
      projectId: '1',
      name: 'Opening Hook - Problem Statement',
      description:
        'Marcus struggles with current workflow inefficiencies, showing frustration with existing tools and manual processes.',
      duration: 15,
      locationId: 'loc-3',
      characterIds: ['char-3'],
      objective: 'Establish relatable pain points that the target audience experiences',
    },
    {
      id: 'scene-2',
      projectId: '1',
      name: 'Product Introduction',
      description:
        'Sarah introduces the SaaS platform with overview of core value proposition and how it solves the established problems.',
      duration: 30,
      locationId: 'loc-2',
      characterIds: ['char-2', 'char-1'],
      objective: 'Present the solution and capture viewer interest with key benefits',
    },
    {
      id: 'scene-3',
      projectId: '1',
      name: 'Feature Demonstration',
      description:
        'Detailed walkthrough of 3 key features with screen recordings and Sarah explaining functionality in accessible terms.',
      duration: 90,
      locationId: 'loc-2',
      characterIds: ['char-2', 'char-1'],
      objective: 'Educate viewers on core capabilities and build confidence in product',
    },
    {
      id: 'scene-4',
      projectId: '1',
      name: 'Customer Success Story',
      description:
        'Emily shares her company results after implementing the platform, including specific metrics and ROI.',
      duration: 45,
      locationId: 'loc-4',
      characterIds: ['char-4'],
      objective: 'Provide social proof and demonstrate real-world business impact',
    },
    {
      id: 'scene-5',
      projectId: '1',
      name: 'Call to Action',
      description:
        'Clear next steps with trial offer, product tour invitation, and contact information over professional backdrop.',
      duration: 20,
      locationId: 'loc-1',
      characterIds: ['char-1', 'char-2'],
      objective: 'Convert viewers to trial signups or demo requests',
    },
  ];

  async getAllByProjectId(projectId: string): Promise<Scene[]> {
    const filtered = this.scenes.filter((s) => s.projectId === projectId);
    return Promise.resolve(filtered);
  }

  async getById(id: string): Promise<Scene | null> {
    const scene = this.scenes.find((s) => s.id === id);
    return Promise.resolve(scene || null);
  }
}
