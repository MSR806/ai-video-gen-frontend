import { useEffect, useMemo, useRef, useState } from 'react';
import type { Collection } from '@core/collection';
import type {
  CollectionContents,
  CollectionItem,
  CollectionItemGenerationParams,
  GenerationCapabilities,
  GenerationInputFieldCapability,
  GenerationMediaType,
  GenerationModelCapability,
  GenerationOperationCapability,
} from '@core/collection-item';
import styles from './GenerationControlBar.module.css';
import { ReferencePickerPopover } from './ReferencePickerPopover';

interface GenerationControlBarProps {
  onGenerate: (params: CollectionItemGenerationParams) => void;
  isGenerating: boolean;
  projectId: string;
  generationCapabilities: GenerationCapabilities | null;
  isCapabilitiesLoading: boolean;
  collections: Collection[];
  selectedCollectionId: string;
  selectedCollectionItems: CollectionItem[];
  selectedCollectionChildCollections: Collection[];
  loadCollectionContentsForPicker: (collectionId: string) => Promise<CollectionContents | null>;
}

interface ReferenceFieldTarget {
  key: string;
  mode: 'single' | 'multiple';
}

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const MAX_REFERENCE_IMAGES = 4;
const OUTPUT_COUNT_OPTIONS = [1, 2, 3, 4];

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const toLabel = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toOperationLabel = (value: string): string => toLabel(value);

const chooseInitialMediaType = (
  capabilities: GenerationCapabilities | null,
): GenerationMediaType => {
  if (capabilities && capabilities.image.length === 0 && capabilities.video.length > 0) {
    return 'video';
  }

  return 'image';
};

const getModelsByType = (
  capabilities: GenerationCapabilities | null,
  mediaType: GenerationMediaType,
): GenerationModelCapability[] => {
  if (!capabilities) {
    return [];
  }

  return mediaType === 'image' ? capabilities.image : capabilities.video;
};

const supportsNativeBatch = (operation: GenerationOperationCapability | null): boolean => {
  if (!operation) {
    return false;
  }

  return operation.fields.some((field) => field.key === 'num_images' && field.type === 'integer');
};

const isReferenceSingleField = (field: GenerationInputFieldCapability): boolean => {
  return (
    field.type === 'string' &&
    field.format === 'uri' &&
    (field.key === 'image_url' || (field.key.includes('image') && field.key.includes('url')))
  );
};

const isReferenceArrayField = (field: GenerationInputFieldCapability): boolean => {
  return (
    field.type === 'array' &&
    field.itemsType === 'string' &&
    (field.key === 'image_urls' || (field.key.includes('image') && field.key.includes('url')))
  );
};

const findReferenceFieldTarget = (
  operation: GenerationOperationCapability | null,
): ReferenceFieldTarget | null => {
  if (!operation) {
    return null;
  }

  const fields = operation.fields;
  const imageUrlsArray = fields.find(
    (field) => field.key === 'image_urls' && isReferenceArrayField(field),
  );
  if (imageUrlsArray) {
    return { key: imageUrlsArray.key, mode: 'multiple' };
  }

  const fallbackArray = fields.find(isReferenceArrayField);
  if (fallbackArray) {
    return { key: fallbackArray.key, mode: 'multiple' };
  }

  const imageUrl = fields.find(
    (field) => field.key === 'image_url' && isReferenceSingleField(field),
  );
  if (imageUrl) {
    return { key: imageUrl.key, mode: 'single' };
  }

  const fallbackSingle = fields.find(isReferenceSingleField);
  if (fallbackSingle) {
    return { key: fallbackSingle.key, mode: 'single' };
  }

  return null;
};

const normalizeReferenceUrls = (urls: string[]): string[] =>
  urls
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .filter(isHttpUrl);

const pickDefaultFieldValue = (field: GenerationInputFieldCapability): unknown => {
  if (field.default !== undefined && field.default !== null) {
    return field.default;
  }

  if (Array.isArray(field.enum) && field.enum.length > 0) {
    return field.enum[0];
  }

  if (field.type === 'array') {
    return [];
  }

  if (field.type === 'boolean') {
    return false;
  }

  return '';
};

const resolveOperationFieldValues = (
  fields: GenerationInputFieldCapability[],
  overrides: Record<string, unknown>,
): Record<string, unknown> => {
  const resolvedValues: Record<string, unknown> = {};

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(overrides, field.key)) {
      resolvedValues[field.key] = overrides[field.key];
      return;
    }

    resolvedValues[field.key] = pickDefaultFieldValue(field);
  });

  return resolvedValues;
};

const getReferenceValues = (
  values: Record<string, unknown>,
  target: ReferenceFieldTarget | null,
): string[] => {
  if (!target) {
    return [];
  }

  const raw = values[target.key];
  if (target.mode === 'multiple') {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.filter((value): value is string => typeof value === 'string').filter(isHttpUrl);
  }

  if (typeof raw !== 'string') {
    return [];
  }

  return isHttpUrl(raw) ? [raw] : [];
};

const buildInputsAndErrors = (
  operation: GenerationOperationCapability,
  values: Record<string, unknown>,
): { inputs: Record<string, unknown>; errors: Record<string, string> } => {
  const inputs: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const requiredSet = new Set(operation.required);

  operation.fields.forEach((field) => {
    if (field.key === 'num_images') {
      return;
    }

    const rawValue = values[field.key];
    const isRequired = field.required || requiredSet.has(field.key);

    if (field.type === 'string') {
      const value = typeof rawValue === 'string' ? rawValue.trim() : '';
      if (isRequired && value.length === 0) {
        errors[field.key] = 'Required';
        return;
      }
      if (value.length === 0) {
        return;
      }
      if (field.format === 'uri' && !isHttpUrl(value)) {
        errors[field.key] = 'Must be a valid URL';
        return;
      }
      inputs[field.key] = value;
      return;
    }

    if (field.type === 'integer' || field.type === 'number') {
      if (rawValue === '' || rawValue === undefined || rawValue === null) {
        if (isRequired) {
          errors[field.key] = 'Required';
        }
        return;
      }

      const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        errors[field.key] = 'Must be a number';
        return;
      }

      inputs[field.key] = field.type === 'integer' ? Math.trunc(numericValue) : numericValue;
      return;
    }

    if (field.type === 'boolean') {
      if (typeof rawValue !== 'boolean') {
        if (isRequired) {
          errors[field.key] = 'Required';
        }
        return;
      }
      inputs[field.key] = rawValue;
      return;
    }

    if (field.type === 'array') {
      const valuesList = Array.isArray(rawValue) ? rawValue : [];
      const normalizedList = valuesList
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      if (isRequired && normalizedList.length === 0) {
        errors[field.key] = 'Required';
        return;
      }

      if (normalizedList.length > 0) {
        if (field.itemsType === 'string' && field.key.includes('url')) {
          const invalidUrl = normalizedList.find((value) => !isHttpUrl(value));
          if (invalidUrl) {
            errors[field.key] = 'Contains an invalid URL';
            return;
          }
        }
        inputs[field.key] = normalizedList;
      }
      return;
    }

    if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
      inputs[field.key] = rawValue;
      return;
    }

    if (isRequired) {
      errors[field.key] = 'Required';
    }
  });

  return { inputs, errors };
};

/**
 * GenerationControlBar Component
 * Dynamic generation controls driven by backend model capabilities.
 */
export function GenerationControlBar({
  onGenerate,
  isGenerating,
  projectId,
  generationCapabilities,
  isCapabilitiesLoading,
  collections,
  selectedCollectionId,
  selectedCollectionItems,
  selectedCollectionChildCollections,
  loadCollectionContentsForPicker,
}: GenerationControlBarProps) {
  const [selectedMediaType, setSelectedMediaType] = useState<GenerationMediaType>(
    chooseInitialMediaType(generationCapabilities),
  );
  const [selectedModelKey, setSelectedModelKey] = useState('');
  const [selectedOperationKey, setSelectedOperationKey] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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

  const resolvedMediaType: GenerationMediaType = useMemo(() => {
    if (!generationCapabilities) {
      return selectedMediaType;
    }

    const requestedModels = getModelsByType(generationCapabilities, selectedMediaType);
    if (requestedModels.length > 0) {
      return selectedMediaType;
    }

    return chooseInitialMediaType(generationCapabilities);
  }, [generationCapabilities, selectedMediaType]);

  const mediaTypeModels = useMemo(
    () => getModelsByType(generationCapabilities, resolvedMediaType),
    [generationCapabilities, resolvedMediaType],
  );

  const selectedModel = useMemo(() => {
    const explicitlySelected = mediaTypeModels.find((model) => model.modelKey === selectedModelKey);
    if (explicitlySelected) {
      return explicitlySelected;
    }

    return mediaTypeModels[0] ?? null;
  }, [mediaTypeModels, selectedModelKey]);

  const selectedOperation = useMemo(() => {
    if (!selectedModel) {
      return null;
    }

    const explicitlySelected = selectedModel.operations.find(
      (operation) => operation.operationKey === selectedOperationKey,
    );
    if (explicitlySelected) {
      return explicitlySelected;
    }

    return selectedModel.operations[0] ?? null;
  }, [selectedModel, selectedOperationKey]);

  const resolvedFieldValues = useMemo(
    () =>
      selectedOperation
        ? resolveOperationFieldValues(selectedOperation.fields, fieldValues)
        : ({} as Record<string, unknown>),
    [fieldValues, selectedOperation],
  );

  const referenceTarget = useMemo(
    () => findReferenceFieldTarget(selectedOperation),
    [selectedOperation],
  );

  const referenceImages = useMemo(
    () => getReferenceValues(resolvedFieldValues, referenceTarget),
    [resolvedFieldValues, referenceTarget],
  );

  const supportsBatch = supportsNativeBatch(selectedOperation);

  const promptField = selectedOperation?.fields.find((field) => field.key === 'prompt') ?? null;
  const promptValue =
    typeof resolvedFieldValues.prompt === 'string' ? resolvedFieldValues.prompt : '';

  const additionalFields = useMemo(() => {
    if (!selectedOperation) {
      return [];
    }

    return selectedOperation.fields.filter((field) => {
      if (field.key === 'prompt' || field.key === 'num_images') {
        return false;
      }
      if (referenceTarget && field.key === referenceTarget.key) {
        return false;
      }
      return true;
    });
  }, [referenceTarget, selectedOperation]);

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

  const getCollectionExists = (collectionId: string | null): boolean => {
    if (!collectionId) {
      return false;
    }

    return collections.some((collection) => collection.id === collectionId);
  };

  const updateReferenceValues = (urls: string[]) => {
    if (!referenceTarget) {
      return;
    }

    const normalized = normalizeReferenceUrls(urls);
    if (normalized.length === 0) {
      return;
    }

    setFieldValues((previous) => {
      if (referenceTarget.mode === 'multiple') {
        const existing = getReferenceValues(previous, referenceTarget);
        const next = [...existing];

        normalized.forEach((url) => {
          if (!next.includes(url) && next.length < MAX_REFERENCE_IMAGES) {
            next.push(url);
          }
        });

        return {
          ...previous,
          [referenceTarget.key]: next,
        };
      }

      return {
        ...previous,
        [referenceTarget.key]: normalized[0],
      };
    });

    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[referenceTarget.key];
      return next;
    });
  };

  const handleRemoveReference = (index: number) => {
    if (!referenceTarget) {
      return;
    }

    setFieldValues((previous) => {
      if (referenceTarget.mode === 'single') {
        return {
          ...previous,
          [referenceTarget.key]: '',
        };
      }

      const existing = getReferenceValues(previous, referenceTarget);
      const next = existing.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...previous,
        [referenceTarget.key]: next,
      };
    });
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
    if (!referenceTarget) {
      return;
    }

    event.preventDefault();
    if (!isDropActive) {
      setIsDropActive(true);
    }
  };

  const handleDropZoneLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!referenceTarget) {
      return;
    }

    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsDropActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!referenceTarget) {
      return;
    }

    event.preventDefault();
    setIsDropActive(false);
    updateReferenceValues(extractUrlsFromTransfer(event));
    promptRef.current?.focus();
  };

  const handleOpenPicker = async () => {
    if (!referenceTarget) {
      return;
    }

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
    if (!isHttpUrl(mediaUrl) || !referenceTarget) {
      return;
    }

    if (
      referenceTarget.mode === 'multiple' &&
      referenceImages.length >= MAX_REFERENCE_IMAGES &&
      !referenceImages.includes(mediaUrl)
    ) {
      return;
    }

    updateReferenceValues([mediaUrl]);
    setLastUsedPickerCollectionId(item.collectionId);
    setIsPickerOpen(false);
    promptRef.current?.focus();
  };

  const handlePromptChange = (value: string) => {
    setFieldValues((previous) => ({
      ...previous,
      prompt: value,
    }));

    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next.prompt;
      return next;
    });
  };

  const handleGenerate = () => {
    if (!selectedModel || !selectedOperation || isGenerating || isCapabilitiesLoading) {
      return;
    }

    const { inputs, errors } = buildInputsAndErrors(selectedOperation, resolvedFieldValues);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    onGenerate({
      projectId,
      collectionId: selectedCollectionId,
      mediaType: selectedModel.mediaType,
      modelKey: selectedModel.modelKey,
      operationKey: selectedOperation.operationKey,
      inputs,
      outputCount: supportsBatch ? outputCount : 1,
    });

    setFieldValues({});
    setFieldErrors({});
    setOutputCount(1);
    setIsDropActive(false);
    setIsPickerOpen(false);

    if (promptRef.current) {
      promptRef.current.style.height = '44px';
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleGenerate();
    }
  };

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

  const canGenerate =
    !isGenerating &&
    !isCapabilitiesLoading &&
    !!selectedModel &&
    !!selectedOperation &&
    (!promptField || promptValue.trim().length > 0);

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
          {referenceTarget && <div className={styles.dropZoneOverlay}>+ Add Reference</div>}

          <div className={styles.modelRow}>
            <div className={styles.mediaToggle}>
              <button
                type="button"
                className={`${styles.mediaButton} ${resolvedMediaType === 'image' ? styles.mediaButtonActive : ''}`}
                onClick={() => {
                  setSelectedMediaType('image');
                  setSelectedModelKey('');
                  setSelectedOperationKey('');
                  setFieldErrors({});
                }}
                disabled={isGenerating || (generationCapabilities?.image.length ?? 0) === 0}
              >
                Image
              </button>
              <button
                type="button"
                className={`${styles.mediaButton} ${resolvedMediaType === 'video' ? styles.mediaButtonActive : ''}`}
                onClick={() => {
                  setSelectedMediaType('video');
                  setSelectedModelKey('');
                  setSelectedOperationKey('');
                  setFieldErrors({});
                }}
                disabled={isGenerating || (generationCapabilities?.video.length ?? 0) === 0}
              >
                Video
              </button>
            </div>

            <label className={styles.selectWrap} aria-label="Model">
              <select
                className={styles.select}
                value={selectedModel?.modelKey ?? ''}
                onChange={(event) => {
                  setSelectedModelKey(event.target.value);
                  setSelectedOperationKey('');
                  setFieldErrors({});
                }}
                disabled={isGenerating || isCapabilitiesLoading || mediaTypeModels.length === 0}
              >
                {mediaTypeModels.length === 0 ? (
                  <option value="">No models</option>
                ) : (
                  mediaTypeModels.map((model) => (
                    <option key={model.modelKey} value={model.modelKey}>
                      {model.model}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className={styles.selectWrap} aria-label="Operation">
              <select
                className={styles.select}
                value={selectedOperation?.operationKey ?? ''}
                onChange={(event) => {
                  setSelectedOperationKey(event.target.value);
                  setFieldErrors({});
                }}
                disabled={isGenerating || !selectedModel || selectedModel.operations.length === 0}
              >
                {!selectedModel || selectedModel.operations.length === 0 ? (
                  <option value="">No operations</option>
                ) : (
                  selectedModel.operations.map((operation) => (
                    <option key={operation.operationKey} value={operation.operationKey}>
                      {toOperationLabel(operation.operationKey)}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

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

          {additionalFields.length > 0 && (
            <div className={styles.optionsRow}>
              {additionalFields.map((field) => {
                const fieldValue = resolvedFieldValues[field.key];
                const fieldError = fieldErrors[field.key];
                const label = toLabel(field.key);
                const selectEnum = Array.isArray(field.enum) && field.enum.length > 0;

                if (field.type === 'boolean') {
                  return (
                    <label key={field.key} className={styles.checkboxField}>
                      <input
                        type="checkbox"
                        checked={fieldValue === true}
                        onChange={(event) =>
                          setFieldValues((previous) => ({
                            ...previous,
                            [field.key]: event.target.checked,
                          }))
                        }
                        disabled={isGenerating}
                      />
                      <span>{label}</span>
                    </label>
                  );
                }

                if (field.type === 'integer' || field.type === 'number') {
                  return (
                    <label key={field.key} className={styles.inlineField}>
                      <span className={styles.inlineFieldLabel}>{label}</span>
                      <input
                        className={`${styles.inlineInput} ${fieldError ? styles.inlineInputError : ''}`}
                        type="number"
                        inputMode="numeric"
                        value={
                          typeof fieldValue === 'number' ? fieldValue : String(fieldValue ?? '')
                        }
                        onChange={(event) => {
                          const value = event.target.value;
                          setFieldValues((previous) => ({
                            ...previous,
                            [field.key]: value,
                          }));
                        }}
                        disabled={isGenerating}
                      />
                    </label>
                  );
                }

                if (selectEnum) {
                  return (
                    <label key={field.key} className={styles.inlineField}>
                      <span className={styles.inlineFieldLabel}>{label}</span>
                      <select
                        className={`${styles.inlineSelect} ${fieldError ? styles.inlineInputError : ''}`}
                        value={
                          typeof fieldValue === 'string' ? fieldValue : String(fieldValue ?? '')
                        }
                        onChange={(event) =>
                          setFieldValues((previous) => ({
                            ...previous,
                            [field.key]: event.target.value,
                          }))
                        }
                        disabled={isGenerating}
                      >
                        {field.enum?.map((option) => {
                          const optionValue = String(option);
                          return (
                            <option key={optionValue} value={optionValue}>
                              {optionValue}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  );
                }

                return (
                  <label key={field.key} className={styles.inlineField}>
                    <span className={styles.inlineFieldLabel}>{label}</span>
                    <input
                      className={`${styles.inlineInput} ${fieldError ? styles.inlineInputError : ''}`}
                      type="text"
                      value={typeof fieldValue === 'string' ? fieldValue : String(fieldValue ?? '')}
                      onChange={(event) =>
                        setFieldValues((previous) => ({
                          ...previous,
                          [field.key]: event.target.value,
                        }))
                      }
                      disabled={isGenerating}
                      placeholder={field.description ?? ''}
                    />
                  </label>
                );
              })}
            </div>
          )}

          <textarea
            ref={promptRef}
            className={`${styles.promptInput} ${fieldErrors.prompt ? styles.promptInputError : ''}`}
            value={promptValue}
            onChange={(event) => handlePromptChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              promptField?.description?.trim().length
                ? promptField.description
                : 'Describe what you want to generate'
            }
            rows={1}
            style={{ height: 'auto', minHeight: '44px', maxHeight: '120px' }}
            onInput={(event) => {
              const target = event.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          {fieldErrors.prompt && <p className={styles.fieldError}>{fieldErrors.prompt}</p>}

          <div className={styles.bottomRow}>
            {referenceTarget ? (
              <button
                type="button"
                className={styles.plusButton}
                onClick={() => void handleOpenPicker()}
                aria-label="Open reference picker"
                aria-expanded={isPickerOpen}
              >
                +
              </button>
            ) : (
              <span className={styles.plusButtonSpacer} />
            )}

            <label className={styles.selectWrap} aria-label="Output count">
              <select
                className={styles.select}
                value={supportsBatch ? outputCount : 1}
                onChange={(event) => setOutputCount(Number(event.target.value))}
                disabled={isGenerating || !supportsBatch}
              >
                {OUTPUT_COUNT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} output{option > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </label>

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
