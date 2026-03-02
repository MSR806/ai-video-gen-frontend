import { useRef, useState } from 'react';
import type { GenerationAspectRatio } from '@core/collection-item';
import styles from './GenerationControlBar.module.css';

interface GenerationControlBarProps {
  onGenerate: (
    prompt: string,
    referenceImages: string[],
    aspectRatio: GenerationAspectRatio,
  ) => void;
  isGenerating: boolean;
}

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const ASPECT_RATIO_OPTIONS: Array<{ value: GenerationAspectRatio; label: string }> = [
  { value: 'PORTRAIT', label: 'Portrait (9:16)' },
  { value: 'SQUARE', label: 'Square (1:1)' },
  { value: 'LANDSCAPE', label: 'Landscape (16:9)' },
];

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * GenerationControlBar Component
 * Minimal generation controls with prompt + optional references.
 */
export function GenerationControlBar({ onGenerate, isGenerating }: GenerationControlBarProps) {
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState<GenerationAspectRatio>('PORTRAIT');
  const [isDropActive, setIsDropActive] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const addReferenceUrls = (urls: string[]) => {
    const normalized = urls.map((url) => url.trim()).filter(isHttpUrl);
    if (normalized.length === 0) {
      return;
    }

    setReferenceImages((prev) => {
      const next = [...prev];
      normalized.forEach((url) => {
        if (!next.includes(url)) {
          next.push(url);
        }
      });
      return next;
    });
  };

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt.trim(), referenceImages, aspectRatio);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleRemoveReference = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const extractUrlsFromTransfer = (event: React.DragEvent<HTMLElement>): string[] => {
    const payloadUrls: string[] = [];

    const custom = event.dataTransfer.getData('application/x-ai-video-gen-item-url');
    if (custom.trim().length > 0) {
      payloadUrls.push(custom.trim());
    }

    const uriList = event.dataTransfer.getData('text/uri-list');
    if (uriList.trim().length > 0) {
      uriList
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
        .forEach((line) => payloadUrls.push(line));
    }

    const plain = event.dataTransfer.getData('text/plain');
    if (plain.trim().length > 0) {
      const matches = plain.match(URL_PATTERN);
      if (matches) {
        matches.forEach((url) => payloadUrls.push(url));
      }
    }

    return payloadUrls;
  };

  const handleDropZoneDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDropActive) {
      setIsDropActive(true);
    }
  };

  const handleDropZoneLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsDropActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropActive(false);
    addReferenceUrls(extractUrlsFromTransfer(event));
    promptRef.current?.focus();
  };

  const handlePlusClick = () => {
    promptRef.current?.focus();
  };

  const canGenerate = prompt.trim().length > 0 && !isGenerating;

  return (
    <div className={styles.container}>
      <div
        className={`${styles.composer} ${isDropActive ? styles.dropActive : ''}`}
        onDragOver={handleDropZoneDragOver}
        onDragLeave={handleDropZoneLeave}
        onDrop={handleDrop}
      >
        {referenceImages.length > 0 && (
          <div className={styles.referenceChips}>
            {referenceImages.map((img, index) => (
              <div key={`${img}-${index}`} className={styles.referenceChip}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Reference ${index + 1}`} className={styles.referenceThumb} />
                <button
                  type="button"
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

        <textarea
          ref={promptRef}
          className={styles.promptInput}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the collection item you want to generate..."
          rows={1}
          style={{ height: 'auto', minHeight: '44px', maxHeight: '120px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />

        <div className={styles.bottomRow}>
          <button
            type="button"
            className={styles.plusButton}
            onClick={handlePlusClick}
            aria-label="Focus prompt input"
          >
            +
          </button>

          <label className={styles.aspectRatioSelectWrap} aria-label="Aspect ratio">
            <select
              className={styles.aspectRatioSelect}
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value as GenerationAspectRatio)}
              disabled={isGenerating}
            >
              {ASPECT_RATIO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.modelBadge}>Nano Banana Pro x1</div>

          <button
            type="button"
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            {isGenerating ? '…' : '→'}
          </button>
        </div>
      </div>

      <p className={styles.dropHint}>
        Drag a collection image card here to attach it as reference.
      </p>
    </div>
  );
}
