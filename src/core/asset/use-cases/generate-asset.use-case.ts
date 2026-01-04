import type { GenerationParams, GeneratedAsset } from '../domain/asset.entity';
import type { AssetRepository } from '../ports/asset.repository.port';

/**
 * Use Case: Generate an asset using AI
 */
export class GenerateAssetUseCase {
  constructor(private assetRepository: AssetRepository) {}

  async execute(params: GenerationParams): Promise<GeneratedAsset> {
    return this.assetRepository.generateWithAI(params);
  }
}
