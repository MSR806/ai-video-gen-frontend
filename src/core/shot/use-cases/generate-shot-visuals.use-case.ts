import type {
  GenerateShotVisualsPayload,
  ShotRepository,
  ShotVisualGenerationResult,
} from '../ports/shot.repository.port';

export class GenerateShotVisualsUseCase {
  constructor(private readonly shotRepository: ShotRepository) {}

  async execute(
    projectId: string,
    sceneId: string,
    payload: GenerateShotVisualsPayload,
  ): Promise<ShotVisualGenerationResult[]> {
    return this.shotRepository.generateVisuals(projectId, sceneId, payload);
  }
}
