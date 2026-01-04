import { useState, useRef } from 'react';
import type { CameraSetup, Resolution, BatchSize } from '@core/asset';
import { DEFAULT_CAMERA_SETUP, getFocalLengthKeywords } from '@core/asset';
import { IterationCounter } from './components/IterationCounter';
import { ResolutionSelector } from './components/ResolutionSelector';
import { CameraSetupDropdown } from './components/CameraSetupDropdown';
import styles from './GenerationControlBar.module.css';

interface GenerationControlBarProps {
  onGenerate: (
    prompt: string,
    cameraSetup: CameraSetup,
    resolution: Resolution,
    batchSize: BatchSize,
  ) => void;
  isGenerating: boolean;
}

/**
 * GenerationControlBar Component
 * Compact bottom control bar with camera-based settings
 */
export function GenerationControlBar({ onGenerate, isGenerating }: GenerationControlBarProps) {
  const [prompt, setPrompt] = useState('');
  const [cameraSetup, setCameraSetup] = useState<CameraSetup>(DEFAULT_CAMERA_SETUP);
  const [resolution, setResolution] = useState<Resolution>('2k');
  const [batchSize, setBatchSize] = useState<BatchSize>(4);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt, cameraSetup, resolution, batchSize);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleAddReference = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
          setReferenceImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const handleRemoveReference = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const canGenerate = prompt.trim().length > 0 && !isGenerating;

  return (
    <div className={styles.container}>
      {/* Reference Images Preview */}
      {referenceImages.length > 0 && (
        <div className={styles.referenceChips}>
          {referenceImages.map((img, index) => (
            <div key={index} className={styles.referenceChip}>
              <img src={img} alt={`Reference ${index + 1}`} className={styles.referenceThumb} />
              <button
                className={styles.removeChip}
                onClick={() => handleRemoveReference(index)}
                aria-label="Remove reference"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Top Row: Reference Button + Prompt */}
      <div className={styles.topRow}>
        <button
          className={styles.addButton}
          onClick={handleAddReference}
          title="Add reference image"
        >
          +
        </button>

        <textarea
          className={styles.promptInput}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the asset you want to generate..."
          rows={1}
          style={{ height: 'auto', minHeight: '44px', maxHeight: '120px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      {/* Controls Row */}
      <div className={styles.controlsRow}>
        <IterationCounter value={batchSize} onChange={setBatchSize} />
        <ResolutionSelector selected={resolution} onSelect={setResolution} />
        <CameraSetupDropdown setup={cameraSetup} onUpdate={setCameraSetup} />

        <button className={styles.generateButton} onClick={handleGenerate} disabled={!canGenerate}>
          {isGenerating ? '⏳' : '▶'}
        </button>
      </div>
    </div>
  );
}
