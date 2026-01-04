import type { Asset, AssetCreationPayload } from '../domain/asset.entity';
import type { AssetRepository } from '../ports/asset.repository.port';

/**
 * Use Case: Create a new asset (from upload or AI generation)
 */
export class CreateAssetUseCase {
  constructor(private assetRepository: AssetRepository) {}

  async execute(payload: AssetCreationPayload): Promise<Asset> {
    return this.assetRepository.create(payload);
  }
}
