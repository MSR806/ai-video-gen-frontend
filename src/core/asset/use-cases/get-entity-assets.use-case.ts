import type { Asset } from '../domain/asset.entity';
import type { AssetRepository } from '../ports/asset.repository.port';

/**
 * Use Case: Get all assets for a specific entity (character or location)
 */
export class GetEntityAssetsUseCase {
  constructor(private assetRepository: AssetRepository) {}

  async execute(entityId: string, entityType: 'character' | 'location'): Promise<Asset[]> {
    return this.assetRepository.getByEntity(entityId, entityType);
  }
}
