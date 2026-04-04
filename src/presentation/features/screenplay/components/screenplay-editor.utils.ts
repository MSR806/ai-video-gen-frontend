import {
  createScreenplayBlockId,
  type ScreenplayBlock,
  type ScreenplayScene,
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
  blockId: string;
  message: string;
}

export interface SceneValidationResult {
  warnings: BlockWarning[];
}

export const BLOCK_TYPE_LABELS: Record<ScreenplayBlock['type'], string> = {
  slugline: 'Slugline',
  action: 'Action',
  character: 'Character',
  parenthetical: 'Parenthetical',
  dialogue: 'Dialogue',
  transition: 'Transition',
};

export const BLOCK_TYPE_CUES: Record<ScreenplayBlock['type'], string> = {
  slugline: 'Slugline...',
  action: 'Action...',
  character: 'Character...',
  parenthetical: '(parenthetical...)',
  dialogue: 'Dialogue...',
  transition: 'Transition...',
};

export const SLUGLINE_PREFIX_SUGGESTIONS = ['INT.', 'EXT.', 'INT./EXT.', 'EST.'] as const;

const ENTER_TRANSITIONS: Record<ScreenplayBlock['type'], ScreenplayBlock['type']> = {
  slugline: 'action',
  action: 'action',
  character: 'dialogue',
  parenthetical: 'dialogue',
  dialogue: 'action',
  transition: 'slugline',
};

const TAB_CYCLE_ORDER: ScreenplayBlock['type'][] = [
  'slugline',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
];

export function resolveNextBlockTypeOnEnter(
  type: ScreenplayBlock['type'],
): ScreenplayBlock['type'] {
  return ENTER_TRANSITIONS[type];
}

export function resolveNextBlockTypeOnTab(
  type: ScreenplayBlock['type'],
  direction: 'forward' | 'backward' = 'forward',
): ScreenplayBlock['type'] {
  const index = TAB_CYCLE_ORDER.indexOf(type);
  if (index < 0) {
    return 'action';
  }

  const delta = direction === 'forward' ? 1 : -1;
  const nextIndex = (index + delta + TAB_CYCLE_ORDER.length) % TAB_CYCLE_ORDER.length;
  return TAB_CYCLE_ORDER[nextIndex];
}

export function normalizeBlockTextByType(type: ScreenplayBlock['type'], text: string): string {
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

export function getBlockCueText(type: ScreenplayBlock['type']): string {
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

export function getSlashCommandSuggestions(query: string): ScreenplayBlock['type'][] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return [...SCREENPLAY_BLOCK_TYPES];
  }

  return SCREENPLAY_BLOCK_TYPES.filter(
    (type) =>
      type.startsWith(normalized) || BLOCK_TYPE_LABELS[type].toLowerCase().startsWith(normalized),
  );
}

export function makeBlock(type: ScreenplayBlock['type'] = 'action'): ScreenplayBlock {
  return {
    id: createScreenplayBlockId(),
    type,
    text: '',
  };
}

export function validateScene(scene: ScreenplayScene): SceneValidationResult {
  const warnings: BlockWarning[] = [];

  scene.content.blocks.forEach((block) => {
    const text = block.text.trim();

    if (text.length === 0) {
      warnings.push({
        blockId: block.id,
        message: `${BLOCK_TYPE_LABELS[block.type]} block is empty.`,
      });
      return;
    }

    if (block.type === 'slugline' && !/^(INT\.|EXT\.|INT\/EXT\.|EST\.)/i.test(text)) {
      warnings.push({
        blockId: block.id,
        message: 'Slugline should begin with INT., EXT., INT/EXT., or EST.',
      });
    }

    if (block.type === 'character' && text !== text.toUpperCase()) {
      warnings.push({
        blockId: block.id,
        message: 'Character cues are usually uppercase.',
      });
    }

    if (block.type === 'parenthetical' && !(text.startsWith('(') && text.endsWith(')'))) {
      warnings.push({
        blockId: block.id,
        message: 'Parentheticals should be wrapped in parentheses.',
      });
    }

    if (block.type === 'transition' && !/TO:$/.test(text.toUpperCase())) {
      warnings.push({
        blockId: block.id,
        message: 'Transitions should typically end with “TO:”.',
      });
    }
  });

  return { warnings };
}

export function ensureSceneHasBlocks(scene: ScreenplayScene): ScreenplayScene {
  if (scene.content.blocks.length > 0) {
    return scene;
  }

  return {
    ...scene,
    content: {
      blocks: [makeBlock('action')],
    },
  };
}

export function reorder<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}
