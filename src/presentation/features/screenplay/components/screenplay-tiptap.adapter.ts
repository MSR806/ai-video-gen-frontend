import type { JSONContent } from '@tiptap/core';
import {
  createScreenplayBlockId,
  type ScreenplayBlock,
  type ScreenplayScene,
} from '@core/screenplay';
import { normalizeBlockTextByType } from './screenplay-editor.utils';

const PROVISIONAL_SCENE_ID_PREFIX = 'screenplay-provisional-scene:';

export function createProvisionalSceneId(): string {
  return `${PROVISIONAL_SCENE_ID_PREFIX}${createScreenplayBlockId()}`;
}

export function isProvisionalSceneId(sceneId: string): boolean {
  return sceneId.startsWith(PROVISIONAL_SCENE_ID_PREFIX);
}

export function screenplayBlocksToTipTapDoc(blocks: ScreenplayBlock[]): JSONContent {
  const safeBlocks =
    blocks.length > 0
      ? blocks
      : [{ id: createScreenplayBlockId(), type: 'action', text: '' as const }];

  return {
    type: 'doc',
    content: safeBlocks.map((block) => ({
      type: 'paragraph',
      attrs: {
        blockId: block.id,
        blockType: block.type,
      },
      content: block.text.length > 0 ? [{ type: 'text', text: block.text }] : undefined,
    })),
  };
}

export function tipTapDocToScreenplayBlocks(
  doc: JSONContent,
  previousBlocks: ScreenplayBlock[],
): ScreenplayBlock[] {
  const paragraphNodes = (doc.content ?? []).filter((node) => node.type === 'paragraph');

  if (paragraphNodes.length === 0) {
    return [
      {
        id: previousBlocks[0]?.id ?? createScreenplayBlockId(),
        type: 'action',
        text: '',
      },
    ];
  }

  const usedBlockIds = new Set<string>();

  return paragraphNodes.map((node, index) => {
    const blockType = parseBlockType(node.attrs?.blockType);
    const candidateBlockId =
      (typeof node.attrs?.blockId === 'string' && node.attrs.blockId.trim().length > 0
        ? node.attrs.blockId
        : null) ??
      previousBlocks[index]?.id ??
      createScreenplayBlockId();

    // TipTap split/transform operations can transiently duplicate node attrs.
    // We must enforce unique block ids per scene payload to satisfy backend validation.
    const blockId = usedBlockIds.has(candidateBlockId)
      ? createScreenplayBlockId()
      : candidateBlockId;
    usedBlockIds.add(blockId);

    return {
      id: blockId,
      type: blockType,
      text: normalizeBlockTextByType(blockType, extractText(node)),
    };
  });
}

function parseBlockType(value: unknown): ScreenplayBlock['type'] {
  if (
    value === 'slugline' ||
    value === 'action' ||
    value === 'character' ||
    value === 'parenthetical' ||
    value === 'dialogue' ||
    value === 'transition'
  ) {
    return value;
  }

  return 'action';
}

function extractText(node: JSONContent): string {
  if (!Array.isArray(node.content)) {
    return '';
  }

  return node.content
    .map((child) => {
      if (child.type === 'text' && typeof child.text === 'string') {
        return child.text;
      }

      return '';
    })
    .join('');
}

export function isBlockListEqual(
  left: ScreenplayScene['content']['blocks'],
  right: ScreenplayScene['content']['blocks'],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((block, index) => {
    const other = right[index];
    return block.id === other.id && block.type === other.type && block.text === other.text;
  });
}
