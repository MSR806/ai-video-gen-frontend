import type { Character } from '../domain/character.entity';
import type { CharacterRepository } from '../ports/character.repository.port';

/**
 * Use Case: Get Project Characters
 * Retrieves all characters for a specific project
 */
export class GetProjectCharactersUseCase {
  constructor(private characterRepository: CharacterRepository) {}

  async execute(projectId: string): Promise<Character[]> {
    return this.characterRepository.getAllByProjectId(projectId);
  }
}
