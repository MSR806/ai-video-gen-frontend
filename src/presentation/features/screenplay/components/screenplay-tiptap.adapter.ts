import type { JSONContent } from '@tiptap/core';
import {
  canonicalizeSceneXml,
  createEmptySceneXml,
  parseSceneXmlBlocks,
  parseScreenplayBlockType,
  serializeSceneXmlBlocks,
  type ScreenplayBlockType,
  type ScreenplayScene,
} from '@core/screenplay';
import { normalizeBlockTextByType } from './screenplay-editor.utils';

const PROVISIONAL_SCENE_ID_PREFIX = 'screenplay-provisional-scene:';

export function createProvisionalSceneId(): string {
  return `${PROVISIONAL_SCENE_ID_PREFIX}${crypto.randomUUID()}`;
}

export function isProvisionalSceneId(sceneId: string): boolean {
  return sceneId.startsWith(PROVISIONAL_SCENE_ID_PREFIX);
}

export function screenplayXmlToTipTapDoc(sceneXml: string): JSONContent {
  const parsedBlocks = tryParseSceneXmlBlocks(sceneXml);
  const safeBlocks =
    parsedBlocks.length > 0 ? parsedBlocks : parseSceneXmlBlocks(createEmptySceneXml());

  return {
    type: 'doc',
    content: safeBlocks.map((block) => ({
      type: 'paragraph',
      attrs: {
        blockType: block.type,
      },
      content: block.text.length > 0 ? [{ type: 'text', text: block.text }] : undefined,
    })),
  };
}

export function tipTapDocToSceneXml(doc: JSONContent): string {
  const paragraphNodes = (doc.content ?? []).filter((node) => node.type === 'paragraph');

  if (paragraphNodes.length === 0) {
    return createEmptySceneXml();
  }

  return serializeSceneXmlBlocks(
    paragraphNodes.map((node) => {
      const blockType = parseBlockType(node.attrs?.blockType);
      return {
        type: blockType,
        text: normalizeBlockTextByType(blockType, extractText(node)),
      };
    }),
  );
}

function parseBlockType(value: unknown): ScreenplayBlockType {
  return parseScreenplayBlockType(value) ?? 'action';
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

export function isSceneContentEqual(
  left: ScreenplayScene['content'],
  right: ScreenplayScene['content'],
): boolean {
  try {
    return canonicalizeSceneXml(left) === canonicalizeSceneXml(right);
  } catch {
    return left === right;
  }
}

function tryParseSceneXmlBlocks(sceneXml: string) {
  try {
    return parseSceneXmlBlocks(sceneXml);
  } catch {
    return [];
  }
}
