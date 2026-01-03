import type { Character } from '../domain/character.entity';

/**
 * Repository interface for Character persistence
 */
export interface CharacterRepository {
  getAllByProjectId(projectId: string): Promise<Character[]>;
  getById(id: string): Promise<Character | null>;
}
