import { useState } from 'react';
import {
  GenerateAssetUseCase,
  CreateAssetUseCase,
  type CameraSetup,
  type Resolution,
  type BatchSize,
  type GeneratedAsset,
  type GenerationParams,
  type AssetCreationPayload,
  getFocalLengthKeywords,
} from '@core/asset';
import { AssetRepositoryImpl } from '@infra/repositories';
import { GenerationControlBar } from './components/GenerationControlBar/GenerationControlBar';
import { GenerationPreview } from './components/GenerationPreview';
import styles from './AssetGenerationView.module.css';

interface AssetGenerationViewProps {
  entityId: string;
  entityType: 'character' | 'location';
  projectId: string;
  onBack: () => void;
  onAssetCreated: () => void;
}

type PreviewState = 'empty' | 'generating' | 'result';

/**
 * AssetGenerationView Component
 * Full-width generation interface with camera-based controls
 */
export function AssetGenerationView({
  entityId,
  entityType,
  projectId,
  onBack,
  onAssetCreated,
}: AssetGenerationViewProps) {
  const [previewState, setPreviewState] = useState<PreviewState>('empty');
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [currentCameraSetup, setCurrentCameraSetup] = useState<CameraSetup | null>(null);

  // Save form state
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetDescription, setAssetDescription] = useState('');

  const handleGenerate = async (
    prompt: string,
    cameraSetup: CameraSetup,
    resolution: Resolution,
    batchSize: BatchSize,
  ) => {
    setPreviewState('generating');
    setCurrentPrompt(prompt);
    setCurrentCameraSetup(cameraSetup);

    // Enhance prompt with camera setup
    const cameraKeywords = [
      `shot on ${cameraSetup.camera.name}`,
      `${cameraSetup.lens.name} lens`,
      `${cameraSetup.focalLength.label} focal length`,
      ...getFocalLengthKeywords(cameraSetup.focalLength.category),
    ];
    const enhancedPrompt = `${prompt}, ${cameraKeywords.join(', ')}`;

    const params: GenerationParams = {
      prompt: enhancedPrompt,
      aspectRatio: 'landscape',
      mediaType: 'image',
      projectId,
      entityId,
      entityType,
      cameraSetup,
      resolution,
      batchSize,
    };

    try {
      const repository = new AssetRepositoryImpl();
      const generateUseCase = new GenerateAssetUseCase(repository);
      const result = await generateUseCase.execute(params);

      setGeneratedAsset(result);
      setPreviewState('result');

      // Auto-fill save form
      const nameFromPrompt = prompt.split(' ').slice(0, 4).join(' ');
      setAssetName(nameFromPrompt);
      setAssetDescription(prompt);
    } catch (error) {
      console.error('Generation failed:', error);
      setPreviewState('empty');
    }
  };

  const handleRegenerate = () => {
    setPreviewState('generating');
    setTimeout(() => {
      if (generatedAsset) {
        const newAsset = { ...generatedAsset, url: `${generatedAsset.url}?v=${Date.now()}` };
        setGeneratedAsset(newAsset);
        setPreviewState('result');
      }
    }, 2500);
  };

  const handleUseAsset = () => {
    setShowSaveForm(true);
  };

  const handleSaveAsset = async () => {
    if (!generatedAsset) return;

    const payload: AssetCreationPayload = {
      projectId,
      entityId,
      entityType,
      mediaType: generatedAsset.duration ? 'video' : 'image',
      name: assetName,
      description: assetDescription,
      url: generatedAsset.url,
      metadata: generatedAsset.duration
        ? {
            width: generatedAsset.width,
            height: generatedAsset.height,
            format: generatedAsset.format,
            duration: generatedAsset.duration,
            thumbnailUrl: generatedAsset.thumbnailUrl,
          }
        : {
            width: generatedAsset.width,
            height: generatedAsset.height,
            format: generatedAsset.format,
            thumbnailUrl: generatedAsset.thumbnailUrl,
          },
    };

    try {
      const repository = new AssetRepositoryImpl();
      const createUseCase = new CreateAssetUseCase(repository);
      await createUseCase.execute(payload);

      onAssetCreated();
    } catch (error) {
      console.error('Failed to save asset:', error);
    }
  };

  const handleCancelSave = () => {
    setShowSaveForm(false);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back to Assets
        </button>
        {currentCameraSetup && (
          <div className={styles.cameraBadge}>
            <span>{currentCameraSetup.camera.name}</span>
            <span className={styles.cameraDetail}>{currentCameraSetup.lens.name}</span>
            <span className={styles.cameraDetail}>{currentCameraSetup.focalLength.label}</span>
          </div>
        )}
      </div>

      {/* Preview Area - Full Width */}
      <div className={styles.previewArea}>
        {showSaveForm ? (
          <div className={styles.saveForm}>
            <h2 className={styles.saveTitle}>Save Generated Asset</h2>
            <div className={styles.formField}>
              <label htmlFor="asset-name" className={styles.label}>
                Name *
              </label>
              <input
                id="asset-name"
                type="text"
                className={styles.input}
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Enter asset name"
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="asset-description" className={styles.label}>
                Description
              </label>
              <textarea
                id="asset-description"
                className={styles.textarea}
                value={assetDescription}
                onChange={(e) => setAssetDescription(e.target.value)}
                placeholder="Enter asset description"
                rows={3}
              />
            </div>
            <div className={styles.formActions}>
              <button className={styles.cancelButton} onClick={handleCancelSave}>
                Cancel
              </button>
              <button className={styles.saveButton} onClick={handleSaveAsset} disabled={!assetName}>
                Save Asset
              </button>
            </div>
          </div>
        ) : (
          <GenerationPreview
            state={previewState}
            generatedAsset={generatedAsset}
            onRegenerate={handleRegenerate}
            onUseAsset={handleUseAsset}
          />
        )}
      </div>

      {/* Control Bar - Bottom, Sticky */}
      {!showSaveForm && (
        <GenerationControlBar
          onGenerate={handleGenerate}
          isGenerating={previewState === 'generating'}
        />
      )}
    </div>
  );
}
