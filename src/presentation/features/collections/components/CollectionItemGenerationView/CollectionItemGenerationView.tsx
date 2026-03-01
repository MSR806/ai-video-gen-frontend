import { useState } from 'react';
import {
  GenerateCollectionItemUseCase,
  CreateCollectionItemUseCase,
  type CameraSetup,
  type Resolution,
  type BatchSize,
  type GeneratedCollectionItem,
  type CollectionItemGenerationParams,
  type CollectionItemCreationPayload,
  getFocalLengthKeywords,
} from '@core/collection-item';
import { CollectionItemRepositoryImpl } from '@infra/repositories';
import { GenerationControlBar } from './components/GenerationControlBar/GenerationControlBar';
import { GenerationPreview } from './components/GenerationPreview';
import styles from './CollectionItemGenerationView.module.css';

interface CollectionItemGenerationViewProps {
  collectionId: string;
  projectId: string;
  onBack: () => void;
  onItemCreated: () => void;
}

type PreviewState = 'empty' | 'generating' | 'result';

/**
 * CollectionItemGenerationView Component
 * Full-width generation interface with camera-based controls
 */
export function CollectionItemGenerationView({
  collectionId,
  projectId,
  onBack,
  onItemCreated,
}: CollectionItemGenerationViewProps) {
  const [previewState, setPreviewState] = useState<PreviewState>('empty');
  const [generatedItem, setGeneratedItem] = useState<GeneratedCollectionItem | null>(null);
  const [currentCameraSetup, setCurrentCameraSetup] = useState<CameraSetup | null>(null);

  // Save form state
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');

  const handleGenerate = async (
    prompt: string,
    cameraSetup: CameraSetup,
    resolution: Resolution,
    batchSize: BatchSize,
  ) => {
    setPreviewState('generating');
    setCurrentCameraSetup(cameraSetup);

    // Enhance prompt with camera setup
    const cameraKeywords = [
      `shot on ${cameraSetup.camera.name}`,
      `${cameraSetup.lens.name} lens`,
      `${cameraSetup.focalLength.label} focal length`,
      ...getFocalLengthKeywords(cameraSetup.focalLength.category),
    ];
    const enhancedPrompt = `${prompt}, ${cameraKeywords.join(', ')}`;

    const params: CollectionItemGenerationParams = {
      prompt: enhancedPrompt,
      aspectRatio: 'landscape',
      mediaType: 'image',
      projectId,
      collectionId,
      cameraSetup,
      resolution,
      batchSize,
    };

    try {
      const repository = new CollectionItemRepositoryImpl();
      const generateUseCase = new GenerateCollectionItemUseCase(repository);
      const result = await generateUseCase.execute(params);

      setGeneratedItem(result);
      setPreviewState('result');

      // Auto-fill save form
      const nameFromPrompt = prompt.split(' ').slice(0, 4).join(' ');
      setItemName(nameFromPrompt);
      setItemDescription(prompt);
    } catch (error) {
      console.error('Generation failed:', error);
      setPreviewState('empty');
    }
  };

  const handleRegenerate = () => {
    setPreviewState('generating');
    setTimeout(() => {
      if (generatedItem) {
        const newItem = { ...generatedItem, url: `${generatedItem.url}?v=${Date.now()}` };
        setGeneratedItem(newItem);
        setPreviewState('result');
      }
    }, 2500);
  };

  const handleUseItem = () => {
    setShowSaveForm(true);
  };

  const handleSaveItem = async () => {
    if (!generatedItem) return;

    const payload: CollectionItemCreationPayload = {
      projectId,
      collectionId,
      mediaType: generatedItem.duration ? 'video' : 'image',
      name: itemName,
      description: itemDescription,
      url: generatedItem.url,
      metadata: generatedItem.duration
        ? {
            width: generatedItem.width,
            height: generatedItem.height,
            format: generatedItem.format,
            duration: generatedItem.duration,
            thumbnailUrl: generatedItem.thumbnailUrl,
          }
        : {
            width: generatedItem.width,
            height: generatedItem.height,
            format: generatedItem.format,
            thumbnailUrl: generatedItem.thumbnailUrl,
          },
    };

    try {
      const repository = new CollectionItemRepositoryImpl();
      const createUseCase = new CreateCollectionItemUseCase(repository);
      await createUseCase.execute(payload);

      onItemCreated();
    } catch (error) {
      console.error('Failed to save collection item:', error);
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
          ← Back to Items
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
            <h2 className={styles.saveTitle}>Save Generated Collection Item</h2>
            <div className={styles.formField}>
              <label htmlFor="item-name" className={styles.label}>
                Name *
              </label>
              <input
                id="item-name"
                type="text"
                className={styles.input}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="item-description" className={styles.label}>
                Description
              </label>
              <textarea
                id="item-description"
                className={styles.textarea}
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Enter item description"
                rows={3}
              />
            </div>
            <div className={styles.formActions}>
              <button className={styles.cancelButton} onClick={handleCancelSave}>
                Cancel
              </button>
              <button className={styles.saveButton} onClick={handleSaveItem} disabled={!itemName}>
                Save Item
              </button>
            </div>
          </div>
        ) : (
          <GenerationPreview
            state={previewState}
            generatedItem={generatedItem}
            onRegenerate={handleRegenerate}
            onUseItem={handleUseItem}
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
