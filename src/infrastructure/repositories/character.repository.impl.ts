import type { Character } from '@core/character';
import type { CharacterRepository } from '@core/character';

/**
 * Implementation of CharacterRepository
 */
export class CharacterRepositoryImpl implements CharacterRepository {
  private characters: Character[] = [
    {
      id: 'char-1',
      projectId: '1',
      name: 'Alex Morgan',
      role: 'Narrator',
      description:
        'Professional voice-over artist who guides viewers through the product demonstration with clear, engaging narration.',
      age: 35,
      personalityTraits: ['Professional', 'Enthusiastic', 'Clear communicator'],
      physicalDescription: 'Warm, approachable presence with professional demeanor',
    },
    {
      id: 'char-2',
      projectId: '1',
      name: 'Sarah Chen',
      role: 'Product Lead',
      description:
        'Lead product manager who demonstrates key features and explains technical capabilities in accessible language.',
      age: 32,
      personalityTraits: ['Expert', 'Approachable', 'Detail-oriented'],
      physicalDescription:
        'Confident presenter in business casual attire, Asian woman with glasses',
    },
    {
      id: 'char-3',
      projectId: '1',
      name: 'Marcus Johnson',
      role: 'Customer Persona',
      description:
        'Represents the target customer experiencing pain points and discovering solutions through the product.',
      age: 28,
      personalityTraits: ['Relatable', 'Curious', 'Problem-solver'],
      physicalDescription: 'Young professional, African American male in casual business wear',
    },
    {
      id: 'char-4',
      projectId: '1',
      name: 'Emily Rodriguez',
      role: 'Success Story',
      description:
        'Existing customer sharing testimonial and real-world results from using the platform.',
      age: 40,
      personalityTraits: ['Authentic', 'Results-driven', 'Persuasive'],
      physicalDescription: 'Experienced executive, Hispanic woman in professional setting',
    },
  ];

  async getAllByProjectId(projectId: string): Promise<Character[]> {
    const filtered = this.characters.filter((c) => c.projectId === projectId);
    return Promise.resolve(filtered);
  }

  async getById(id: string): Promise<Character | null> {
    const character = this.characters.find((c) => c.id === id);
    return Promise.resolve(character || null);
  }
}
