import {
  createEmptySceneXml,
  parseSceneXmlBlocks,
  validateSceneXml,
  type ScreenplayScene,
  type ScreenplayBlockType,
  type ScreenplayXmlBlock,
} from '@core/screenplay';

export const SCREENPLAY_BLOCK_TYPES = [
  'slugline',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
] as const;

export interface BlockWarning {
  blockKey: string;
  message: string;
}

export interface SceneValidationResult {
  warnings: BlockWarning[];
}

export const BLOCK_TYPE_LABELS: Record<ScreenplayBlockType, string> = {
  slugline: 'Slugline',
  action: 'Action',
  character: 'Character',
  parenthetical: 'Parenthetical',
  dialogue: 'Dialogue',
  transition: 'Transition',
};

export const BLOCK_TYPE_CUES: Record<ScreenplayBlockType, string> = {
  slugline: 'Slugline...',
  action: 'Action...',
  character: 'Character...',
  parenthetical: '(parenthetical...)',
  dialogue: 'Dialogue...',
  transition: 'Transition...',
};

export const SLUGLINE_PREFIX_SUGGESTIONS = ['INT.', 'EXT.', 'INT./EXT.', 'EST.'] as const;

const ENTER_TRANSITIONS: Record<ScreenplayBlockType, ScreenplayBlockType> = {
  slugline: 'action',
  action: 'action',
  character: 'dialogue',
  parenthetical: 'dialogue',
  dialogue: 'action',
  transition: 'slugline',
};

const TAB_CYCLE_ORDER: ScreenplayBlockType[] = [
  'slugline',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
];

export function resolveNextBlockTypeOnEnter(type: ScreenplayBlockType): ScreenplayBlockType {
  return ENTER_TRANSITIONS[type];
}

export function resolveNextBlockTypeOnTab(
  type: ScreenplayBlockType,
  direction: 'forward' | 'backward' = 'forward',
): ScreenplayBlockType {
  const index = TAB_CYCLE_ORDER.indexOf(type);
  if (index < 0) {
    return 'action';
  }

  const delta = direction === 'forward' ? 1 : -1;
  const nextIndex = (index + delta + TAB_CYCLE_ORDER.length) % TAB_CYCLE_ORDER.length;
  return TAB_CYCLE_ORDER[nextIndex];
}

export function normalizeBlockTextByType(type: ScreenplayBlockType, text: string): string {
  if (type === 'slugline' || type === 'character') {
    return text.toUpperCase();
  }

  if (type === 'parenthetical') {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return '';
    }

    const inner = trimmed.replace(/^\(+/, '').replace(/\)+$/, '').trim();
    if (inner.length === 0) {
      return '';
    }

    return `(${inner})`;
  }

  return text;
}

export function getBlockCueText(type: ScreenplayBlockType): string {
  return BLOCK_TYPE_CUES[type];
}

export function clampSelectionToParentheticalInnerRange(
  blockFrom: number,
  blockTo: number,
  selectionFrom: number,
  selectionTo: number,
): { from: number; to: number } {
  const min = blockFrom + 1;
  const max = Math.max(min, blockTo - 1);

  const from = Math.min(Math.max(selectionFrom, min), max);
  const to = Math.min(Math.max(selectionTo, min), max);

  return { from, to };
}

export function getSlashCommandSuggestions(query: string): ScreenplayBlockType[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return [...SCREENPLAY_BLOCK_TYPES];
  }

  return SCREENPLAY_BLOCK_TYPES.filter(
    (type) =>
      type.startsWith(normalized) || BLOCK_TYPE_LABELS[type].toLowerCase().startsWith(normalized),
  );
}

export function validateScene(scene: ScreenplayScene): SceneValidationResult {
  const warnings: BlockWarning[] = [];
  const xmlValidation = validateSceneXml(scene.content);
  if (!xmlValidation.isValid) {
    return {
      warnings: [
        {
          blockKey: 'scene:xml',
          message: 'Scene XML is invalid and cannot be fully validated.',
        },
      ],
    };
  }

  const blocks = parseSceneXmlBlocks(scene.content);

  blocks.forEach((block, index) => {
    const text = block.text.trim();
    const blockKey = `${index}:${block.type}`;

    if (text.length === 0) {
      warnings.push({
        blockKey,
        message: `${BLOCK_TYPE_LABELS[block.type]} block is empty.`,
      });
      return;
    }

    if (block.type === 'slugline' && !/^(INT\.|EXT\.|INT\/EXT\.|EST\.)/i.test(text)) {
      warnings.push({
        blockKey,
        message: 'Slugline should begin with INT., EXT., INT/EXT., or EST.',
      });
    }

    if (block.type === 'character' && text !== text.toUpperCase()) {
      warnings.push({
        blockKey,
        message: 'Character cues are usually uppercase.',
      });
    }

    if (block.type === 'parenthetical' && !(text.startsWith('(') && text.endsWith(')'))) {
      warnings.push({
        blockKey,
        message: 'Parentheticals should be wrapped in parentheses.',
      });
    }

    if (block.type === 'transition' && !/TO:$/.test(text.toUpperCase())) {
      warnings.push({
        blockKey,
        message: 'Transitions should typically end with “TO:”.',
      });
    }
  });

  return { warnings };
}

export function ensureSceneHasBlocks(scene: ScreenplayScene): ScreenplayScene {
  const xmlValidation = validateSceneXml(scene.content);
  if (!xmlValidation.isValid) {
    // Preserve invalid payloads so the workspace does not silently overwrite them.
    return scene;
  }

  if (parseSceneXmlBlocks(scene.content).length > 0) {
    return scene;
  }

  return {
    ...scene,
    content: createEmptySceneXml(),
  };
}

export function getCharacterCueSuggestionsFromScenes(scenes: ScreenplayScene[]): string[] {
  const unique = new Set<string>();

  scenes.forEach((scene) => {
    if (!validateSceneXml(scene.content).isValid) {
      return;
    }

    parseSceneXmlBlocks(scene.content).forEach((block: ScreenplayXmlBlock) => {
      if (block.type !== 'character') {
        return;
      }

      const value = block.text.trim().toUpperCase();
      if (value.length > 0) {
        unique.add(value);
      }
    });
  });

  return Array.from(unique);
}

export function reorder<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}
