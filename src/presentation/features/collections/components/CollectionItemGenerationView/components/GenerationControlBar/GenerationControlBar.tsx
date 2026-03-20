import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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

interface MediaFieldDescriptor {
  key: string;
  label: string;
  compactLabel: string;
  description: string | null;
  mode: 'single' | 'multiple';
  required: boolean;
}

interface MediaGroupDescriptor {
  groupKey: string;
  layout: 'single' | 'sequence' | 'gallery';
  placement: 'top';
  fields: MediaFieldDescriptor[];
}

interface MediaFieldTarget {
  fieldKey: string;
  index: number | null;
}

interface GenerationControlBarCache {
  selectedMediaType: GenerationMediaType;
  selectedModelKey: string;
  selectedOperationKey: string;
  fieldValues: Record<string, unknown>;
}

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const GENERATION_CONTROL_CACHE_KEY_PREFIX = 'ai-video-gen:generation-control-cache';

const getGenerationControlCacheKey = (projectId: string, collectionId: string): string =>
  `${GENERATION_CONTROL_CACHE_KEY_PREFIX}:${projectId}:${collectionId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseGenerationControlBarCache = (raw: string): GenerationControlBarCache | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    const selectedMediaType = parsed.selectedMediaType;
    if (selectedMediaType !== 'image' && selectedMediaType !== 'video') {
      return null;
    }

    const selectedModelKey =
      typeof parsed.selectedModelKey === 'string' ? parsed.selectedModelKey : '';
    const selectedOperationKey =
      typeof parsed.selectedOperationKey === 'string' ? parsed.selectedOperationKey : '';
    const fieldValues = isRecord(parsed.fieldValues) ? parsed.fieldValues : {};

    return {
      selectedMediaType,
      selectedModelKey,
      selectedOperationKey,
      fieldValues,
    };
  } catch {
    return null;
  }
};

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

const toNumericBound = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const getFieldUiGroup = (field: GenerationInputFieldCapability): 'basic' | 'advanced' =>
  field.uiGroup === 'advanced' ? 'advanced' : 'basic';

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

const isUriSingleMediaField = (field: GenerationInputFieldCapability): boolean =>
  field.type === 'string' && field.format === 'uri';

const isUriArrayMediaField = (field: GenerationInputFieldCapability): boolean =>
  field.type === 'array' && field.itemsType === 'string' && field.key.includes('url');

const getFieldLabel = (field: GenerationInputFieldCapability): string =>
  field.title?.trim().length ? field.title : toLabel(field.key);

const toMediaFieldDescriptor = (
  field: GenerationInputFieldCapability,
  compactLabel?: string | null,
  isRequired = false,
): MediaFieldDescriptor => ({
  key: field.key,
  label: getFieldLabel(field),
  compactLabel: compactLabel?.trim().length
    ? compactLabel
    : toCompactLabel(getFieldLabel(field)) || getFieldLabel(field),
  description: field.description,
  mode: field.type === 'array' ? 'multiple' : 'single',
  required: isRequired,
});

const getFallbackMediaGroups = (
  operation: GenerationOperationCapability | null,
  excludedFieldKeys: Set<string>,
): MediaGroupDescriptor[] => {
  if (!operation) {
    return [];
  }

  const singleFields: MediaFieldDescriptor[] = [];
  const galleryGroups: Array<{ index: number; group: MediaGroupDescriptor }> = [];
  let firstSingleIndex: number | null = null;

  operation.fields.forEach((field, index) => {
    const isRequired = field.required || operation.required.includes(field.key);
    if (excludedFieldKeys.has(field.key)) {
      return;
    }

    if (isUriArrayMediaField(field)) {
      galleryGroups.push({
        index,
        group: {
          groupKey: `fallback:${field.key}`,
          layout: 'gallery',
          placement: 'top',
          fields: [toMediaFieldDescriptor(field, null, isRequired)],
        },
      });
      return;
    }

    if (isUriSingleMediaField(field)) {
      if (firstSingleIndex === null) {
        firstSingleIndex = index;
      }
      singleFields.push(toMediaFieldDescriptor(field, null, isRequired));
    }
  });

  const groups: Array<{ index: number; group: MediaGroupDescriptor }> = [...galleryGroups];
  if (singleFields.length > 0 && firstSingleIndex !== null) {
    groups.push({
      index: firstSingleIndex,
      group: {
        groupKey: 'fallback:sequence',
        layout: singleFields.length === 1 ? 'single' : 'sequence',
        placement: 'top',
        fields: singleFields,
      },
    });
  }

  return groups.sort((left, right) => left.index - right.index).map((entry) => entry.group);
};

const getDeclaredMediaGroups = (
  operation: GenerationOperationCapability | null,
): MediaGroupDescriptor[] => {
  if (!operation || !Array.isArray(operation.mediaGroups) || operation.mediaGroups.length === 0) {
    return [];
  }

  const fieldsByGroup = new Map<string, MediaFieldDescriptor[]>();
  operation.mediaGroups.forEach((group) => {
    fieldsByGroup.set(group.groupKey, []);
  });

  operation.fields.forEach((field) => {
    if (!field.mediaGroup) {
      return;
    }

    const groupFields = fieldsByGroup.get(field.mediaGroup);
    if (!groupFields) {
      return;
    }

    const isRequired = field.required || operation.required.includes(field.key);
    groupFields.push(toMediaFieldDescriptor(field, field.mediaName, isRequired));
  });

  return operation.mediaGroups.map((group) => {
    const groupFields = fieldsByGroup.get(group.groupKey) ?? [];
    const orderedFields =
      group.layout === 'sequence'
        ? [...groupFields].sort((left, right) => {
            const leftField = operation.fields.find((field) => field.key === left.key);
            const rightField = operation.fields.find((field) => field.key === right.key);
            const leftOrder = leftField?.mediaOrder ?? Number.MAX_SAFE_INTEGER;
            const rightOrder = rightField?.mediaOrder ?? Number.MAX_SAFE_INTEGER;
            return leftOrder - rightOrder;
          })
        : groupFields;

    return {
      groupKey: group.groupKey,
      layout: group.layout,
      placement: group.placement,
      fields: orderedFields,
    };
  });
};

const normalizeMediaUrls = (urls: string[]): string[] =>
  Array.from(
    new Set(
      urls
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
        .filter(isHttpUrl),
    ),
  );

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

const getMediaFieldValues = (
  values: Record<string, unknown>,
  field: MediaFieldDescriptor,
): string[] => {
  const raw = values[field.key];

  if (field.mode === 'multiple') {
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

const getMediaTargetId = ({ fieldKey, index }: MediaFieldTarget): string =>
  `${fieldKey}:${index === null ? 'append' : index}`;

const toCompactLabel = (label: string): string => {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return '';
  }

  return trimmed
    .replace(/\bframe\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildInputsAndErrors = (
  operation: GenerationOperationCapability,
  values: Record<string, unknown>,
): { inputs: Record<string, unknown>; errors: Record<string, string> } => {
  const inputs: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const requiredSet = new Set(operation.required);

  operation.fields.forEach((field) => {
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
  const skipNextCachePersistRef = useRef(false);
  const isCollectionStateHydratingRef = useRef(false);
  const previousCollectionIdRef = useRef(selectedCollectionId);
  const [selectedMediaType, setSelectedMediaType] = useState<GenerationMediaType>(
    chooseInitialMediaType(generationCapabilities),
  );
  const [selectedModelKey, setSelectedModelKey] = useState('');
  const [selectedOperationKey, setSelectedOperationKey] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [advancedSettingsSelectionKey, setAdvancedSettingsSelectionKey] = useState<string | null>(
    null,
  );
  const [isIngredientDragActive, setIsIngredientDragActive] = useState(false);
  const [activeDropTargetId, setActiveDropTargetId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activePickerTarget, setActivePickerTarget] = useState<MediaFieldTarget | null>(null);
  const [pickerCollectionId, setPickerCollectionId] = useState<string | null>(null);
  const [lastUsedPickerCollectionId, setLastUsedPickerCollectionId] = useState<string | null>(null);
  const [pickerContentsCache, setPickerContentsCache] = useState<
    Record<string, CollectionContents>
  >({});
  const [pickerLoadingCollectionId, setPickerLoadingCollectionId] = useState<string | null>(null);
  const [pickerErrorMessage, setPickerErrorMessage] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

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

  const mediaGroups = useMemo(() => {
    const declaredGroups = getDeclaredMediaGroups(selectedOperation);
    const declaredFieldKeys = new Set(
      declaredGroups.flatMap((group) => group.fields.map((field) => field.key)),
    );
    const fallbackGroups = getFallbackMediaGroups(selectedOperation, declaredFieldKeys);
    return [...declaredGroups, ...fallbackGroups];
  }, [selectedOperation]);

  const mediaFields = useMemo(() => mediaGroups.flatMap((group) => group.fields), [mediaGroups]);
  const cacheTransientFieldKeys = useMemo(() => {
    const keys = new Set<string>(['prompt']);

    if (!generationCapabilities) {
      mediaFields.forEach((field) => {
        keys.add(field.key);
      });
      return keys;
    }

    [...generationCapabilities.image, ...generationCapabilities.video].forEach((model) => {
      model.operations.forEach((operation) => {
        operation.fields.forEach((field) => {
          if (isUriSingleMediaField(field) || isUriArrayMediaField(field)) {
            keys.add(field.key);
          }
        });
      });
    });

    return keys;
  }, [generationCapabilities, mediaFields]);

  const composerDropTarget = useMemo<MediaFieldTarget | null>(() => {
    if (mediaFields.length !== 1) {
      return null;
    }

    return {
      fieldKey: mediaFields[0].key,
      index: null,
    };
  }, [mediaFields]);

  const activePickerField = useMemo(
    () => mediaFields.find((field) => field.key === activePickerTarget?.fieldKey) ?? null,
    [activePickerTarget, mediaFields],
  );

  const selectedPickerMediaUrls = useMemo(
    () => (activePickerField ? getMediaFieldValues(resolvedFieldValues, activePickerField) : []),
    [activePickerField, resolvedFieldValues],
  );

  const promptField = selectedOperation?.fields.find((field) => field.key === 'prompt') ?? null;
  const promptValue =
    typeof resolvedFieldValues.prompt === 'string' ? resolvedFieldValues.prompt : '';
  const requiredFieldKeys = useMemo(
    () => new Set(selectedOperation?.required ?? []),
    [selectedOperation],
  );
  const promptIsRequired =
    (promptField?.required ?? false) || requiredFieldKeys.has(promptField?.key ?? '');

  const additionalFields = useMemo(() => {
    if (!selectedOperation) {
      return [];
    }

    const mediaFieldKeys = new Set(mediaFields.map((field) => field.key));
    return selectedOperation.fields.filter((field) => {
      if (field.key === 'prompt') {
        return false;
      }

      return !mediaFieldKeys.has(field.key);
    });
  }, [mediaFields, selectedOperation]);

  const basicFields = useMemo(
    () => additionalFields.filter((field) => getFieldUiGroup(field) === 'basic'),
    [additionalFields],
  );

  const advancedFields = useMemo(
    () => additionalFields.filter((field) => getFieldUiGroup(field) === 'advanced'),
    [additionalFields],
  );

  const currentSelectionKey = `${selectedModel?.modelKey ?? ''}:${selectedOperation?.operationKey ?? ''}`;
  const showAdvancedSettings = advancedSettingsSelectionKey === currentSelectionKey;
  const shouldShowExclusiveDragState = isIngredientDragActive && mediaFields.length > 0;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const syncDragState = () => {
      setIsIngredientDragActive(document.body.classList.contains('is-dragging-ingredient'));
    };

    syncDragState();

    const observer = new MutationObserver(syncDragState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const cacheKey = getGenerationControlCacheKey(projectId, selectedCollectionId);
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(cacheKey);
    } catch {
      raw = null;
    }
    const cache = raw ? parseGenerationControlBarCache(raw) : null;
    const isCollectionSwitch = previousCollectionIdRef.current !== selectedCollectionId;

    skipNextCachePersistRef.current = true;
    isCollectionStateHydratingRef.current = isCollectionSwitch;
    previousCollectionIdRef.current = selectedCollectionId;

    const timeoutId = window.setTimeout(() => {
      if (!cache) {
        setSelectedMediaType('image');
        setSelectedModelKey('');
        setSelectedOperationKey('');
        setFieldValues({});
      } else {
        setSelectedMediaType(cache.selectedMediaType);
        setSelectedModelKey(cache.selectedModelKey);
        setSelectedOperationKey(cache.selectedOperationKey);
        setFieldValues(cache.fieldValues);
      }

      setFieldErrors({});
      setAdvancedSettingsSelectionKey(null);
      setActiveDropTargetId(null);
      setIsPickerOpen(false);
      setActivePickerTarget(null);
      isCollectionStateHydratingRef.current = false;
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [projectId, selectedCollectionId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (skipNextCachePersistRef.current) {
      skipNextCachePersistRef.current = false;
      return;
    }

    const cacheKey = getGenerationControlCacheKey(projectId, selectedCollectionId);
    const persistedFieldValues = Object.fromEntries(
      Object.entries(fieldValues).filter(([fieldKey]) => !cacheTransientFieldKeys.has(fieldKey)),
    );
    const cache: GenerationControlBarCache = {
      selectedMediaType,
      selectedModelKey: selectedModel?.modelKey ?? selectedModelKey,
      selectedOperationKey: selectedOperation?.operationKey ?? selectedOperationKey,
      fieldValues: persistedFieldValues,
    };

    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch {
      // Ignore cache write failures (storage disabled/full).
    }
  }, [
    fieldValues,
    projectId,
    selectedCollectionId,
    selectedModelKey,
    selectedOperationKey,
    selectedMediaType,
    selectedModel,
    selectedOperation,
    cacheTransientFieldKeys,
  ]);

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

  const clearFieldError = (fieldKey: string) => {
    setFieldErrors((previous) => {
      if (!previous[fieldKey]) {
        return previous;
      }

      const next = { ...previous };
      delete next[fieldKey];
      return next;
    });
  };

  const updateMediaFieldValues = (target: MediaFieldTarget, urls: string[]) => {
    const field = mediaFields.find((item) => item.key === target.fieldKey);
    if (!field) {
      return;
    }

    const normalized = normalizeMediaUrls(urls);
    if (normalized.length === 0) {
      return;
    }

    setFieldValues((previous) => {
      if (field.mode === 'single') {
        return {
          ...previous,
          [field.key]: normalized[0],
        };
      }

      const existing = getMediaFieldValues(previous, field);
      if (target.index === null) {
        const next = [...existing];

        normalized.forEach((url) => {
          if (!next.includes(url)) {
            next.push(url);
          }
        });

        return {
          ...previous,
          [field.key]: next,
        };
      }

      if (target.index < 0 || target.index >= existing.length) {
        return previous;
      }

      const next = [...existing];
      next[target.index] = normalized[0];
      return {
        ...previous,
        [field.key]: next,
      };
    });

    clearFieldError(target.fieldKey);
  };

  const handleRemoveMedia = (fieldKey: string, index: number | null) => {
    const field = mediaFields.find((item) => item.key === fieldKey);
    if (!field) {
      return;
    }

    setFieldValues((previous) => {
      if (field.mode === 'single') {
        return {
          ...previous,
          [field.key]: '',
        };
      }

      const existing = getMediaFieldValues(previous, field);
      if (index === null) {
        return previous;
      }

      return {
        ...previous,
        [field.key]: existing.filter((_, itemIndex) => itemIndex !== index),
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

  const handleComposerDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!composerDropTarget) {
      return;
    }

    event.preventDefault();
    const nextTargetId = getMediaTargetId(composerDropTarget);
    if (activeDropTargetId !== nextTargetId) {
      setActiveDropTargetId(nextTargetId);
    }
  };

  const handleComposerDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!composerDropTarget) {
      return;
    }

    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setActiveDropTargetId(null);
    }
  };

  const handleComposerDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!composerDropTarget) {
      return;
    }

    event.preventDefault();
    setActiveDropTargetId(null);
    updateMediaFieldValues(composerDropTarget, extractUrlsFromTransfer(event));
    promptRef.current?.focus();
  };

  const handleMediaTargetDragOver =
    (target: MediaFieldTarget) => (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const nextTargetId = getMediaTargetId(target);
      if (activeDropTargetId !== nextTargetId) {
        setActiveDropTargetId(nextTargetId);
      }
    };

  const handleMediaTargetDragLeave =
    (target: MediaFieldTarget) => (event: React.DragEvent<HTMLElement>) => {
      event.stopPropagation();
      const nextTarget = event.relatedTarget as Node | null;
      if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
        const targetId = getMediaTargetId(target);
        if (activeDropTargetId === targetId) {
          setActiveDropTargetId(null);
        }
      }
    };

  const handleMediaTargetDrop =
    (target: MediaFieldTarget) => (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setActiveDropTargetId(null);
      updateMediaFieldValues(target, extractUrlsFromTransfer(event));
      promptRef.current?.focus();
    };

  const openPickerForTarget = async (target: MediaFieldTarget) => {
    const field = mediaFields.find((item) => item.key === target.fieldKey);
    if (!field) {
      return;
    }

    setActivePickerTarget(target);

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

  const handleSelectPickerItem = (item: CollectionItem) => {
    const mediaUrl = item.url?.trim() ?? '';
    if (!isHttpUrl(mediaUrl) || !activePickerTarget) {
      return;
    }

    updateMediaFieldValues(activePickerTarget, [mediaUrl]);
    setLastUsedPickerCollectionId(item.collectionId);
    setIsPickerOpen(false);
    setActivePickerTarget(null);
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
    if (
      !selectedModel ||
      !selectedOperation ||
      isGenerating ||
      isCapabilitiesLoading ||
      isCollectionStateHydratingRef.current
    ) {
      return;
    }

    const { inputs, errors } = buildInputsAndErrors(selectedOperation, resolvedFieldValues);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const requestedOutputCount = selectedOperation.fields.some(
      (field) => field.key === 'num_images' && field.type === 'integer',
    )
      ? typeof inputs.num_images === 'number' &&
        Number.isInteger(inputs.num_images) &&
        inputs.num_images > 0
        ? inputs.num_images
        : 1
      : 1;

    onGenerate({
      projectId,
      collectionId: selectedCollectionId,
      mediaType: selectedModel.mediaType,
      modelKey: selectedModel.modelKey,
      operationKey: selectedOperation.operationKey,
      inputs,
      outputCount: requestedOutputCount,
    });

    setFieldValues((previous) => {
      const next = { ...previous };
      cacheTransientFieldKeys.forEach((fieldKey) => {
        delete next[fieldKey];
      });
      return next;
    });
    setFieldErrors({});
    setActiveDropTargetId(null);
    setIsPickerOpen(false);
    setActivePickerTarget(null);

    if (promptRef.current) {
      promptRef.current.style.height = '180px';
    }
  };

  const handleReset = () => {
    setFieldValues({});
    setFieldErrors({});
    setActiveDropTargetId(null);
    setIsPickerOpen(false);
    setActivePickerTarget(null);
    setAdvancedSettingsSelectionKey(null);

    if (promptRef.current) {
      promptRef.current.style.height = '180px';
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

  const mediaSectionTitle =
    mediaFields.length === 1
      ? mediaFields[0].label
      : resolvedMediaType === 'video'
        ? 'Reference Frames'
        : 'Reference Images';
  const mediaSectionHasRequired = mediaFields.some((field) => field.required);

  const renderAdditionalField = (field: GenerationInputFieldCapability) => {
    const fieldValue = resolvedFieldValues[field.key];
    const fieldError = fieldErrors[field.key];
    const label = field.title?.trim().length ? field.title : toLabel(field.key);
    const selectEnum = Array.isArray(field.enum) && field.enum.length > 0;
    const isRequired = field.required || requiredFieldKeys.has(field.key);

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
          <span className={isRequired ? styles.requiredLabel : undefined}>{label}</span>
        </label>
      );
    }

    if (field.type === 'integer' || field.type === 'number') {
      const minimum = toNumericBound(field.minimum);
      const maximum = toNumericBound(field.maximum);
      return (
        <label key={field.key} className={styles.inlineField}>
          <span className={`${styles.inlineFieldLabel} ${isRequired ? styles.requiredLabel : ''}`}>
            {label}
          </span>
          <input
            className={`${styles.inlineInput} ${fieldError ? styles.inlineInputError : ''}`}
            type="number"
            inputMode="numeric"
            min={minimum}
            max={maximum}
            value={typeof fieldValue === 'number' ? fieldValue : String(fieldValue ?? '')}
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
          <span className={`${styles.inlineFieldLabel} ${isRequired ? styles.requiredLabel : ''}`}>
            {label}
          </span>
          <select
            className={`${styles.inlineSelect} ${fieldError ? styles.inlineInputError : ''}`}
            value={typeof fieldValue === 'string' ? fieldValue : String(fieldValue ?? '')}
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
        <span className={`${styles.inlineFieldLabel} ${isRequired ? styles.requiredLabel : ''}`}>
          {label}
        </span>
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
  };

  const renderSingleMediaField = (
    field: MediaFieldDescriptor,
    options: { showMeta?: boolean; fullWidth?: boolean; dragFill?: boolean } = {},
  ) => {
    const values = getMediaFieldValues(resolvedFieldValues, field);
    const mediaUrl = values[0] ?? '';
    const fieldError = fieldErrors[field.key];
    const target: MediaFieldTarget = { fieldKey: field.key, index: null };
    const isDropActive = activeDropTargetId === getMediaTargetId(target);
    const showMeta = options.showMeta ?? true;
    const fullWidth = options.fullWidth ?? false;
    const dragFill = options.dragFill ?? false;
    const actionLabel = !showMeta && field.compactLabel ? field.compactLabel : field.label;

    return (
      <div
        key={field.key}
        className={`${styles.mediaFieldBlock} ${fullWidth ? styles.mediaFieldBlockFull : ''} ${dragFill ? styles.mediaFieldBlockDragFill : ''}`}
      >
        {showMeta ? (
          <div className={styles.mediaFieldHeader}>
            <span className={styles.mediaFieldLabel}>{field.label}</span>
          </div>
        ) : null}
        <div className={`${styles.mediaCardWrap} ${dragFill ? styles.mediaCardWrapDragFill : ''}`}>
          <button
            type="button"
            className={`${styles.mediaCard} ${mediaUrl ? styles.mediaCardFilled : ''} ${isDropActive ? styles.mediaCardActive : ''} ${dragFill ? styles.mediaCardDragFill : ''}`}
            onClick={() => void openPickerForTarget(target)}
            onDragOver={handleMediaTargetDragOver(target)}
            onDragLeave={handleMediaTargetDragLeave(target)}
            onDrop={handleMediaTargetDrop(target)}
            aria-label={mediaUrl ? `Replace ${actionLabel}` : `Add ${actionLabel}`}
            data-testid={`media-target-${field.key}`}
          >
            {mediaUrl && !dragFill ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl}
                  alt={field.label}
                  className={`${styles.mediaCardImage} ${dragFill ? styles.mediaCardImageDragFill : ''}`}
                />
                <span className={styles.mediaCardBadge}>{actionLabel}</span>
              </>
            ) : (
              <span className={`${styles.mediaCardAdd} ${dragFill ? styles.mediaCardAddFill : ''}`}>
                <span className={styles.mediaCardAddIcon}>+</span>
                <span
                  className={styles.mediaCardAddLabel}
                >{`Add ${actionLabel.toLowerCase()}`}</span>
              </span>
            )}
          </button>
          {mediaUrl && (
            <button
              type="button"
              className={styles.mediaCardRemove}
              onClick={(event) => {
                event.stopPropagation();
                handleRemoveMedia(field.key, null);
              }}
              aria-label={`Remove ${field.label}`}
            >
              ×
            </button>
          )}
        </div>
        {showMeta && field.description?.trim().length ? (
          <p className={styles.mediaFieldDescription}>{field.description}</p>
        ) : null}
        {showMeta && fieldError ? <p className={styles.mediaFieldError}>{fieldError}</p> : null}
      </div>
    );
  };

  const renderMultipleMediaField = (
    field: MediaFieldDescriptor,
    options: { showMeta?: boolean; fullWidth?: boolean; dragFill?: boolean } = {},
  ) => {
    const values = getMediaFieldValues(resolvedFieldValues, field);
    const fieldError = fieldErrors[field.key];
    const appendTarget: MediaFieldTarget = { fieldKey: field.key, index: null };
    const isAppendDropActive = activeDropTargetId === getMediaTargetId(appendTarget);
    const showMeta = options.showMeta ?? true;
    const fullWidth = options.fullWidth ?? false;
    const dragFill = options.dragFill ?? false;
    const shouldRenderFullWidthAddTarget = fullWidth && (values.length === 0 || dragFill);
    const shouldStretchAddTarget = shouldRenderFullWidthAddTarget && dragFill;
    const actionLabel = !showMeta && field.compactLabel ? field.compactLabel : field.label;

    return (
      <div
        key={field.key}
        className={`${styles.mediaFieldBlock} ${fullWidth ? styles.mediaFieldBlockFull : ''} ${shouldStretchAddTarget ? styles.mediaFieldBlockDragFill : ''}`}
      >
        {showMeta ? (
          <div className={styles.mediaFieldHeader}>
            <span className={styles.mediaFieldLabel}>{field.label}</span>
          </div>
        ) : null}
        {shouldRenderFullWidthAddTarget ? (
          <div
            className={`${styles.mediaCardWrap} ${shouldStretchAddTarget ? styles.mediaCardWrapDragFill : ''}`}
          >
            <button
              type="button"
              className={`${styles.mediaCard} ${isAppendDropActive ? styles.mediaCardActive : ''} ${shouldStretchAddTarget ? styles.mediaCardDragFill : ''}`}
              onClick={() => void openPickerForTarget(appendTarget)}
              onDragOver={handleMediaTargetDragOver(appendTarget)}
              onDragLeave={handleMediaTargetDragLeave(appendTarget)}
              onDrop={handleMediaTargetDrop(appendTarget)}
              aria-label={`Add ${actionLabel}`}
              data-testid={`media-target-${field.key}`}
            >
              <span
                className={`${styles.mediaCardAdd} ${shouldStretchAddTarget ? styles.mediaCardAddFill : ''}`}
              >
                <span className={styles.mediaCardAddIcon}>+</span>
                <span
                  className={styles.mediaCardAddLabel}
                >{`Add ${actionLabel.toLowerCase()}`}</span>
              </span>
            </button>
          </div>
        ) : (
          <div className={styles.mediaGallery}>
            {values.map((mediaUrl, index) => {
              const replaceTarget: MediaFieldTarget = { fieldKey: field.key, index };
              const isCardDropActive = activeDropTargetId === getMediaTargetId(replaceTarget);

              return (
                <div
                  key={`${mediaUrl}-${index}`}
                  className={`${styles.mediaThumbnailWrap} ${isCardDropActive ? styles.mediaThumbnailWrapActive : ''}`}
                >
                  <button
                    type="button"
                    className={`${styles.mediaThumbnailCard} ${isCardDropActive ? styles.mediaCardActive : ''}`}
                    onClick={() => void openPickerForTarget(replaceTarget)}
                    onDragOver={handleMediaTargetDragOver(replaceTarget)}
                    onDragLeave={handleMediaTargetDragLeave(replaceTarget)}
                    onDrop={handleMediaTargetDrop(replaceTarget)}
                    aria-label={`Replace ${field.label} ${index + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl}
                      alt={`${field.label} ${index + 1}`}
                      className={styles.mediaThumbnailImage}
                    />
                  </button>
                  <button
                    type="button"
                    className={styles.mediaCardRemove}
                    onClick={() => handleRemoveMedia(field.key, index)}
                    aria-label={`Remove ${field.label} ${index + 1}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              className={`${styles.mediaAddCard} ${isAppendDropActive ? styles.mediaCardActive : ''}`}
              onClick={() => void openPickerForTarget(appendTarget)}
              onDragOver={handleMediaTargetDragOver(appendTarget)}
              onDragLeave={handleMediaTargetDragLeave(appendTarget)}
              onDrop={handleMediaTargetDrop(appendTarget)}
              aria-label={`Add ${actionLabel}`}
              data-testid={`media-target-${field.key}`}
            >
              <span className={styles.mediaCardAdd}>
                <span className={styles.mediaCardAddIcon}>+</span>
                <span
                  className={styles.mediaCardAddLabel}
                >{`Add ${actionLabel.toLowerCase()}`}</span>
              </span>
            </button>
          </div>
        )}
        {showMeta && field.description?.trim().length ? (
          <p className={styles.mediaFieldDescription}>{field.description}</p>
        ) : null}
        {showMeta && fieldError ? <p className={styles.mediaFieldError}>{fieldError}</p> : null}
      </div>
    );
  };

  const renderCompactSingleMediaField = (field: MediaFieldDescriptor) => {
    const values = getMediaFieldValues(resolvedFieldValues, field);
    const mediaUrl = values[0] ?? '';
    const fieldError = fieldErrors[field.key];
    const target: MediaFieldTarget = { fieldKey: field.key, index: null };
    const isDropActive = activeDropTargetId === getMediaTargetId(target);
    const compactLabel = field.compactLabel;

    return (
      <div key={field.key} className={styles.compactMediaItem}>
        <button
          type="button"
          className={`${styles.compactMediaButton} ${mediaUrl ? styles.compactMediaButtonFilled : ''} ${isDropActive ? styles.compactMediaButtonActive : ''}`}
          onClick={() => void openPickerForTarget(target)}
          onDragOver={handleMediaTargetDragOver(target)}
          onDragLeave={handleMediaTargetDragLeave(target)}
          onDrop={handleMediaTargetDrop(target)}
          aria-label={mediaUrl ? `Replace ${field.label}` : `Add ${field.label}`}
          data-testid={`compact-media-target-${field.key}`}
        >
          {mediaUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl} alt={field.label} className={styles.compactMediaThumb} />
              <span
                className={`${styles.compactMediaLabelFilled} ${field.required ? styles.requiredLabel : ''}`}
              >
                {compactLabel || field.label}
              </span>
            </>
          ) : (
            <span
              className={`${styles.compactMediaLabel} ${field.required ? styles.requiredLabel : ''}`}
            >
              {compactLabel || field.label}
            </span>
          )}
        </button>
        {mediaUrl ? (
          <button
            type="button"
            className={styles.compactMediaRemove}
            onClick={() => handleRemoveMedia(field.key, null)}
            aria-label={`Remove ${field.label}`}
          >
            ×
          </button>
        ) : null}
        {fieldError ? <p className={styles.compactMediaError}>{fieldError}</p> : null}
      </div>
    );
  };

  const renderCompactMultipleMediaField = (field: MediaFieldDescriptor) => {
    const values = getMediaFieldValues(resolvedFieldValues, field);
    const fieldError = fieldErrors[field.key];
    const appendTarget: MediaFieldTarget = { fieldKey: field.key, index: null };
    const isDropActive = activeDropTargetId === getMediaTargetId(appendTarget);

    return (
      <div key={field.key} className={styles.compactArrayField}>
        <div className={styles.compactArrayHeader}>
          <span
            className={`${styles.compactArrayLabel} ${field.required ? styles.requiredLabel : ''}`}
          >
            {field.label}
          </span>
        </div>
        <div className={styles.compactArrayItems}>
          {values.map((mediaUrl, index) => {
            const replaceTarget: MediaFieldTarget = { fieldKey: field.key, index };
            const isCardDropActive = activeDropTargetId === getMediaTargetId(replaceTarget);

            return (
              <div key={`${mediaUrl}-${index}`} className={styles.compactArrayThumbWrap}>
                <button
                  type="button"
                  className={`${styles.compactArrayThumbButton} ${isCardDropActive ? styles.compactMediaButtonActive : ''}`}
                  onClick={() => void openPickerForTarget(replaceTarget)}
                  onDragOver={handleMediaTargetDragOver(replaceTarget)}
                  onDragLeave={handleMediaTargetDragLeave(replaceTarget)}
                  onDrop={handleMediaTargetDrop(replaceTarget)}
                  aria-label={`Replace ${field.label} ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl}
                    alt={`${field.label} ${index + 1}`}
                    className={styles.compactArrayThumb}
                  />
                </button>
                <button
                  type="button"
                  className={styles.compactArrayRemove}
                  onClick={() => handleRemoveMedia(field.key, index)}
                  aria-label={`Remove ${field.label} ${index + 1}`}
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className={`${styles.compactArrayAddButton} ${isDropActive ? styles.compactMediaButtonActive : ''}`}
            onClick={() => void openPickerForTarget(appendTarget)}
            onDragOver={handleMediaTargetDragOver(appendTarget)}
            onDragLeave={handleMediaTargetDragLeave(appendTarget)}
            onDrop={handleMediaTargetDrop(appendTarget)}
            aria-label={`Add ${field.label}`}
            data-testid={`compact-media-target-${field.key}`}
          >
            + Add
          </button>
        </div>
        {fieldError ? <p className={styles.compactMediaError}>{fieldError}</p> : null}
      </div>
    );
  };

  const renderCompactMediaGroup = (group: MediaGroupDescriptor) => {
    if (group.layout === 'gallery') {
      return renderCompactMultipleMediaField(group.fields[0]);
    }

    if (group.layout === 'single') {
      return renderCompactSingleMediaField(group.fields[0]);
    }

    return (
      <div key={group.groupKey} className={styles.compactMediaRow}>
        {group.fields.map((field, index) => (
          <Fragment key={field.key}>
            {index > 0 ? (
              <span className={styles.compactMediaConnector} aria-hidden="true">
                ↔
              </span>
            ) : null}
            {renderCompactSingleMediaField(field)}
          </Fragment>
        ))}
      </div>
    );
  };

  const renderDragMediaGroup = (group: MediaGroupDescriptor) => {
    if (group.layout === 'gallery') {
      return (
        <div key={group.groupKey} className={styles.dragGroup}>
          {renderMultipleMediaField(group.fields[0], {
            showMeta: false,
            fullWidth: true,
            dragFill: true,
          })}
        </div>
      );
    }

    if (group.layout === 'single') {
      return (
        <div key={group.groupKey} className={styles.dragGroup}>
          {renderSingleMediaField(group.fields[0], {
            showMeta: false,
            fullWidth: true,
            dragFill: true,
          })}
        </div>
      );
    }

    return (
      <div key={group.groupKey} className={`${styles.dragGroup} ${styles.dragSequenceStack}`}>
        {group.fields.map((field) =>
          renderSingleMediaField(field, {
            showMeta: false,
            fullWidth: true,
            dragFill: true,
          }),
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.composerWrap}>
        {isPickerOpen && activePickerField && (
          <ReferencePickerPopover
            collections={collections}
            currentCollectionId={pickerCollectionId}
            currentContents={pickerCurrentContents}
            isLoading={isPickerLoadingActiveCollection}
            errorMessage={pickerErrorMessage}
            selectedMediaUrls={selectedPickerMediaUrls}
            onClose={() => {
              setIsPickerOpen(false);
              setActivePickerTarget(null);
            }}
            onNavigateRoot={handleNavigatePickerRoot}
            onNavigateCollection={handleNavigatePickerCollection}
            onSelectItem={handleSelectPickerItem}
          />
        )}

        <div
          className={`${styles.composer} ${activeDropTargetId && composerDropTarget ? styles.dropActive : ''}`}
          onDragOver={handleComposerDragOver}
          onDragLeave={handleComposerDragLeave}
          onDrop={handleComposerDrop}
        >
          {shouldShowExclusiveDragState ? (
            <div
              className={`${styles.dragOnlySection} ${mediaGroups.length > 1 ? styles.dragOnlySectionSplit : ''}`}
            >
              {mediaGroups.map((group) => renderDragMediaGroup(group))}
            </div>
          ) : (
            <>
              <div className={styles.formBody}>
                <section className={styles.formSection}>
                  <div className={styles.modeSwitchRow}>
                    <div className={styles.mediaToggle}>
                      <button
                        type="button"
                        className={`${styles.mediaButton} ${resolvedMediaType === 'image' ? styles.mediaButtonActive : ''}`}
                        onClick={() => {
                          setSelectedMediaType('image');
                          setSelectedModelKey('');
                          setSelectedOperationKey('');
                          setFieldErrors({});
                          setActiveDropTargetId(null);
                          setIsPickerOpen(false);
                          setActivePickerTarget(null);
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
                          setActiveDropTargetId(null);
                          setIsPickerOpen(false);
                          setActivePickerTarget(null);
                        }}
                        disabled={isGenerating || (generationCapabilities?.video.length ?? 0) === 0}
                      >
                        Video
                      </button>
                    </div>
                  </div>

                  <div className={styles.modelSelectStack}>
                    <label className={styles.selectWrap} aria-label="Model">
                      <select
                        className={styles.select}
                        value={selectedModel?.modelKey ?? ''}
                        onChange={(event) => {
                          setSelectedModelKey(event.target.value);
                          setSelectedOperationKey('');
                          setFieldErrors({});
                          setActiveDropTargetId(null);
                          setIsPickerOpen(false);
                          setActivePickerTarget(null);
                        }}
                        disabled={
                          isGenerating || isCapabilitiesLoading || mediaTypeModels.length === 0
                        }
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

                    {!!selectedModel && selectedModel.operations.length > 1 && (
                      <label className={styles.selectWrap} aria-label="Operation">
                        <select
                          className={styles.select}
                          value={selectedOperation?.operationKey ?? ''}
                          onChange={(event) => {
                            setSelectedOperationKey(event.target.value);
                            setFieldErrors({});
                            setActiveDropTargetId(null);
                            setIsPickerOpen(false);
                            setActivePickerTarget(null);
                          }}
                          disabled={isGenerating || selectedModel.operations.length === 0}
                        >
                          {selectedModel.operations.map((operation) => (
                            <option key={operation.operationKey} value={operation.operationKey}>
                              {operation.operationName}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </section>

                {mediaGroups.length > 0 && (
                  <section className={styles.formSection}>
                    <label
                      className={`${styles.formLabel} ${mediaSectionHasRequired ? styles.requiredLabel : ''}`}
                    >
                      {mediaSectionTitle}
                    </label>
                    <div className={styles.topMediaSection}>
                      <div className={styles.compactMediaSection}>
                        {mediaGroups.map((group) => renderCompactMediaGroup(group))}
                      </div>
                    </div>
                    <p className={styles.mediaHint}>
                      Hint: drag and drop collection images, or click Add to select references.
                    </p>
                  </section>
                )}

                <section className={styles.formSection}>
                  <label
                    className={`${styles.formLabel} ${promptIsRequired ? styles.requiredLabel : ''}`}
                  >
                    Prompt
                  </label>
                  <div className={styles.promptShell}>
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
                      rows={6}
                      style={{ height: 'auto', minHeight: '180px', maxHeight: '360px' }}
                      onInput={(event) => {
                        const target = event.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${Math.min(target.scrollHeight, 360)}px`;
                      }}
                    />
                  </div>
                  {fieldErrors.prompt && <p className={styles.fieldError}>{fieldErrors.prompt}</p>}
                </section>

                {basicFields.length > 0 && (
                  <section className={styles.formSection}>
                    <div className={styles.optionsRow}>
                      {basicFields.map(renderAdditionalField)}
                    </div>
                  </section>
                )}

                {advancedFields.length > 0 && (
                  <div className={styles.advancedWrap}>
                    <button
                      type="button"
                      className={styles.advancedToggle}
                      onClick={() =>
                        setAdvancedSettingsSelectionKey((previous) =>
                          previous === currentSelectionKey ? null : currentSelectionKey,
                        )
                      }
                      disabled={isGenerating}
                      aria-expanded={showAdvancedSettings}
                    >
                      {showAdvancedSettings ? 'Hide advanced settings' : 'Show advanced settings'}
                    </button>

                    {showAdvancedSettings && (
                      <section className={styles.formSection}>
                        <div className={styles.optionsRow}>
                          {advancedFields.map(renderAdditionalField)}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.bottomRow}>
                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={handleReset}
                  disabled={isGenerating}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className={styles.generateButton}
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                >
                  {isGenerating ? 'Running...' : 'Run'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
