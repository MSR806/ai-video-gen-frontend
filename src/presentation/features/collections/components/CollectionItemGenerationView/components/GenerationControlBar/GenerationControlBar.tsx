import { useEffect, useRef, useState } from 'react';
import type { Collection } from '@core/collection';
import type {
  CollectionContents,
  CollectionItem,
  GenerationAspectRatio,
} from '@core/collection-item';
import styles from './GenerationControlBar.module.css';
import { ReferencePickerPopover } from './ReferencePickerPopover';

interface GenerationControlBarProps {
  onGenerate: (
    prompt: string,
    referenceImages: string[],
    aspectRatio: GenerationAspectRatio,
    outputCount: number,
  ) => void;
  isGenerating: boolean;
  collections: Collection[];
  selectedCollectionId: string;
  selectedCollectionItems: CollectionItem[];
  selectedCollectionChildCollections: Collection[];
  loadCollectionContentsForPicker: (collectionId: string) => Promise<CollectionContents | null>;
}

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const MAX_REFERENCE_IMAGES = 4;
const ASPECT_RATIO_OPTIONS: Array<{ value: GenerationAspectRatio; label: string }> = [
  { value: 'PORTRAIT', label: 'Portrait (9:16)' },
  { value: 'SQUARE', label: 'Square (1:1)' },
  { value: 'LANDSCAPE', label: 'Landscape (16:9)' },
];
const OUTPUT_COUNT_OPTIONS = [1, 2, 3, 4];

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
export function GenerationControlBar({
  onGenerate,
  isGenerating,
  collections,
  selectedCollectionId,
  selectedCollectionItems,
  selectedCollectionChildCollections,
  loadCollectionContentsForPicker,
}: GenerationControlBarProps) {
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState<GenerationAspectRatio>('PORTRAIT');
  const [outputCount, setOutputCount] = useState<number>(1);
  const [isDropActive, setIsDropActive] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerCollectionId, setPickerCollectionId] = useState<string | null>(null);
  const [lastUsedPickerCollectionId, setLastUsedPickerCollectionId] = useState<string | null>(null);
  const [pickerContentsCache, setPickerContentsCache] = useState<
    Record<string, CollectionContents>
  >({});
  const [pickerLoadingCollectionId, setPickerLoadingCollectionId] = useState<string | null>(null);
  const [pickerErrorMessage, setPickerErrorMessage] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!pickerContainerRef.current) {
        return;
      }

      if (!pickerContainerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPickerOpen]);

  const ensurePickerCollectionLoaded = async (collectionId: string): Promise<void> => {
    if (collectionId === selectedCollectionId) {
      return;
    }

    if (pickerContentsCache[collectionId]) {
      return;
    }

    setPickerLoadingCollectionId(collectionId);
    setPickerErrorMessage(null);
    const contents = await loadCollectionContentsForPicker(collectionId);
    if (contents) {
      setPickerContentsCache((prev) => ({
        ...prev,
        [collectionId]: contents,
      }));
    } else {
      setPickerErrorMessage('Failed to load collection contents.');
    }
    setPickerLoadingCollectionId((current) => (current === collectionId ? null : current));
  };

  const normalizeReferenceUrls = (urls: string[]): string[] =>
    urls.map((url) => url.trim()).filter(isHttpUrl);

  const addReferenceUrls = (urls: string[]) => {
    const normalized = normalizeReferenceUrls(urls);
    if (normalized.length === 0) {
      return;
    }

    setReferenceImages((prev) => {
      const next = [...prev];
      normalized.forEach((url) => {
        if (!next.includes(url) && next.length < MAX_REFERENCE_IMAGES) {
          next.push(url);
        }
      });
      return next;
    });
  };

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt.trim(), referenceImages, aspectRatio, outputCount);
    setPrompt('');
    setReferenceImages([]);
    setIsDropActive(false);

    if (promptRef.current) {
      promptRef.current.style.height = '44px';
    }
  };

  const getCollectionExists = (collectionId: string | null): boolean => {
    if (!collectionId) {
      return false;
    }

    return collections.some((collection) => collection.id === collectionId);
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

  const handleOpenPicker = async () => {
    let startCollectionId: string | null = null;

    if (lastUsedPickerCollectionId && getCollectionExists(lastUsedPickerCollectionId)) {
      startCollectionId = lastUsedPickerCollectionId;
    }

    setPickerCollectionId(startCollectionId);
    setPickerErrorMessage(null);
    setIsPickerOpen(true);

    if (startCollectionId) {
      await ensurePickerCollectionLoaded(startCollectionId);
    }
  };

  const handleNavigatePickerCollection = (collectionId: string) => {
    setPickerCollectionId(collectionId);
    setPickerErrorMessage(null);
    void ensurePickerCollectionLoaded(collectionId);
  };

  const handleNavigatePickerRoot = () => {
    setPickerCollectionId(null);
    setPickerErrorMessage(null);
  };

  const handleSelectPickerReference = (item: CollectionItem) => {
    const mediaUrl = item.url?.trim() ?? '';
    if (!isHttpUrl(mediaUrl)) {
      return;
    }

    if (referenceImages.length >= MAX_REFERENCE_IMAGES && !referenceImages.includes(mediaUrl)) {
      return;
    }

    addReferenceUrls([mediaUrl]);
    setLastUsedPickerCollectionId(item.collectionId);
    setIsPickerOpen(false);
    promptRef.current?.focus();
  };

  const canGenerate = prompt.trim().length > 0 && !isGenerating;
  const pickerCurrentContents =
    pickerCollectionId === null
      ? null
      : pickerCollectionId === selectedCollectionId
        ? {
            items: selectedCollectionItems,
            childCollections: selectedCollectionChildCollections,
          }
        : (pickerContentsCache[pickerCollectionId] ?? null);
  const isPickerLoadingActiveCollection =
    pickerCollectionId !== null && pickerLoadingCollectionId === pickerCollectionId;

  return (
    <div className={styles.container}>
      <div className={styles.composerWrap} ref={pickerContainerRef}>
        {isPickerOpen && (
          <ReferencePickerPopover
            collections={collections}
            currentCollectionId={pickerCollectionId}
            currentContents={pickerCurrentContents}
            isLoading={isPickerLoadingActiveCollection}
            errorMessage={pickerErrorMessage}
            selectedReferenceImages={referenceImages}
            maxReferenceImages={MAX_REFERENCE_IMAGES}
            onClose={() => setIsPickerOpen(false)}
            onNavigateRoot={handleNavigatePickerRoot}
            onNavigateCollection={handleNavigatePickerCollection}
            onSelectReferenceItem={handleSelectPickerReference}
          />
        )}

        <div
          className={`${styles.composer} ${isDropActive ? styles.dropActive : ''}`}
          onDragOver={handleDropZoneDragOver}
          onDragLeave={handleDropZoneLeave}
          onDrop={handleDrop}
        >
          <div className={styles.dropZoneOverlay}>+ Add Ingredients</div>

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
            placeholder="What magic should we do today?"
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
              onClick={() => void handleOpenPicker()}
              aria-label="Open reference picker"
              aria-expanded={isPickerOpen}
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

            <label className={styles.aspectRatioSelectWrap} aria-label="Output count">
              <select
                className={styles.aspectRatioSelect}
                value={outputCount}
                onChange={(event) => setOutputCount(Number(event.target.value))}
                disabled={isGenerating}
              >
                {OUTPUT_COUNT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} output{option > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.modelBadge}>{`Nano Banana Pro x${outputCount}`}</div>

            <button
              type="button"
              className={styles.generateButton}
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              {isGenerating ? (
                '…'
              ) : (
                <svg
                  className={styles.generateIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M21.5 2.5L10.5 13.5"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21.5 2.5L14.5 21.5L10.5 13.5L2.5 9.5L21.5 2.5Z"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
