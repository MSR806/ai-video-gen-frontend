import { useState, type ChangeEvent } from 'react';
import { Button } from '@presentation/components/ui';
import type { AspectRatio } from '@core/asset';
import styles from './GenerationControls.module.css';

interface GenerationControlsProps {
  onGenerate: (
    prompt: string,
    aspectRatio: AspectRatio,
    mediaType: 'image' | 'video',
    referenceImages: string[],
  ) => void;
  isGenerating: boolean;
}

/**
 * GenerationControls Component
 * Left panel with prompt input, settings, and generate button
 */
export function GenerationControls({ onGenerate, isGenerating }: GenerationControlsProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('landscape');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [showReferences, setShowReferences] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt, aspectRatio, mediaType, referenceImages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleGenerate();
    }
  };

  const handleReferenceUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Convert files to data URLs
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setReferenceImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReference = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const canGenerate = prompt.trim().length > 0 && !isGenerating;

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <label htmlFor="prompt" className={styles.label}>
          Prompt *
        </label>
        <textarea
          id="prompt"
          className={styles.promptInput}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the asset you want to generate..."
          rows={6}
        />
        <span className={styles.counter}>{prompt.length}/500</span>
      </div>

      <div className={styles.section}>
        <button
          className={styles.referenceToggle}
          onClick={() => setShowReferences(!showReferences)}
        >
          <span>Reference Images (Optional)</span>
          <span>{showReferences ? '▼' : '▶'}</span>
        </button>

        {showReferences && (
          <div className={styles.references}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleReferenceUpload}
              className={styles.fileInput}
              id="reference-upload"
            />
            <label htmlFor="reference-upload" className={styles.uploadButton}>
              + Add Reference
            </label>

            {referenceImages.length > 0 && (
              <div className={styles.referenceList}>
                {referenceImages.map((img, index) => (
                  <div key={index} className={styles.referenceItem}>
                    <img
                      src={img}
                      alt={`Reference ${index + 1}`}
                      className={styles.referenceThumbnail}
                    />
                    <button className={styles.removeRef} onClick={() => removeReference(index)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Aspect Ratio</label>
        <div className={styles.chipGroup}>
          {(['square', 'portrait', 'landscape'] as AspectRatio[]).map((ratio) => (
            <button
              key={ratio}
              className={`${styles.chip} ${aspectRatio === ratio ? styles.chipActive : ''}`}
              onClick={() => setAspectRatio(ratio)}
            >
              {ratio.charAt(0).toUpperCase() + ratio.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>Media Type</label>
        <div className={styles.chipGroup}>
          {(['image', 'video'] as ('image' | 'video')[]).map((type) => (
            <button
              key={type}
              className={`${styles.chip} ${mediaType === type ? styles.chipActive : ''}`}
              onClick={() => setMediaType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleGenerate} variant="primary" type="button">
        {isGenerating ? '✨ Generating...' : '✨ Generate'}
      </Button>
    </div>
  );
}
