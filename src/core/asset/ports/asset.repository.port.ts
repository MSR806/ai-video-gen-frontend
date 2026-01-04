import type { Asset } from '../domain/asset.entity';

/**
 * Repository interface for Asset persistence
 */
export interface AssetRepository {
  getByEntity(entityId: string, entityType: 'character' | 'location'): Promise<Asset[]>;
  getById(id: string): Promise<Asset | null>;
}
