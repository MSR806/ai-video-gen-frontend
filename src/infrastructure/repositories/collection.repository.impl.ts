import type { Collection, CollectionRepository } from '@core/collection';

/**
 * Implementation of CollectionRepository.
 */
export class CollectionRepositoryImpl implements CollectionRepository {
  private collections: Collection[] = [
    {
      id: 'coll-1',
      projectId: '1',
      name: 'Narration Shots',
      tag: 'voiceover',
      description:
        'Primary narration-focused visuals for intro, transitions, and closing voice-over moments.',
    },
    {
      id: 'coll-2',
      projectId: '1',
      name: 'Presenter Angles',
      tag: 'presenter',
      description: 'Presenter-led visuals that explain product capabilities and walkthrough steps.',
    },
    {
      id: 'coll-3',
      projectId: '1',
      name: 'Customer Moments',
      tag: 'customer',
      description: 'Customer journey visuals focused on problem, discovery, and product adoption.',
    },
    {
      id: 'coll-4',
      projectId: '1',
      name: 'Testimonial Clips',
      tag: 'testimonial',
      description: 'Short interview and testimonial moments with proof points and outcomes.',
    },
    {
      id: 'coll-5',
      projectId: '1',
      name: 'Office Environments',
      tag: 'workspace',
      description:
        'Clean workplace backgrounds for collaboration, demos, and product usage scenarios.',
    },
    {
      id: 'coll-6',
      projectId: '1',
      name: 'Studio Setups',
      tag: 'studio',
      description: 'Controlled studio visuals with close-up framing and polished lighting.',
    },
    {
      id: 'coll-7',
      projectId: '1',
      name: 'Coworking Spaces',
      tag: 'environment',
      description: 'Energetic collaborative spaces that support startup and growth visuals.',
    },
    {
      id: 'coll-8',
      projectId: '1',
      name: 'Boardroom Scenes',
      tag: 'meeting',
      description: 'Formal meeting visuals for planning, alignment, and decision moments.',
    },
  ];

  async getAllByProjectId(projectId: string): Promise<Collection[]> {
    const filtered = this.collections.filter((collection) => collection.projectId === projectId);
    return Promise.resolve(filtered);
  }

  async getById(id: string): Promise<Collection | null> {
    const collection = this.collections.find((item) => item.id === id);
    return Promise.resolve(collection || null);
  }
}
