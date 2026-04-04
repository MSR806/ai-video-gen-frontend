import type { ScreenplayBlockType } from './screenplay.entity';

export const SCREENPLAY_XML_ROOT_TAG = 'scene';

export const SCREENPLAY_XML_BLOCK_TAGS: ScreenplayBlockType[] = [
  'slugline',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
];

const SCREENPLAY_XML_BLOCK_TAG_SET = new Set<string>(SCREENPLAY_XML_BLOCK_TAGS);

export interface ScreenplayXmlBlock {
  type: ScreenplayBlockType;
  text: string;
}

export interface SceneXmlValidationResult {
  isValid: boolean;
  error: string | null;
}

export function createEmptySceneXml(type: ScreenplayBlockType = 'action'): string {
  return serializeSceneXmlBlocks([{ type, text: '' }]);
}

export function parseSceneXmlBlocks(content: string): ScreenplayXmlBlock[] {
  return parseValidatedSceneXml(content).blocks;
}

export function serializeSceneXmlBlocks(blocks: ScreenplayXmlBlock[]): string {
  const payload = blocks
    .filter((block) => SCREENPLAY_XML_BLOCK_TAG_SET.has(block.type))
    .map((block) => `<${block.type}>${escapeXmlText(block.text)}</${block.type}>`)
    .join('');

  return `<${SCREENPLAY_XML_ROOT_TAG}>${payload}</${SCREENPLAY_XML_ROOT_TAG}>`;
}

export function canonicalizeSceneXml(content: string): string {
  return serializeSceneXmlBlocks(parseValidatedSceneXml(content).blocks);
}

export function tryCanonicalizeSceneXml(content: string): string | null {
  try {
    return canonicalizeSceneXml(content);
  } catch {
    return null;
  }
}

export function validateSceneXml(content: string): SceneXmlValidationResult {
  try {
    parseValidatedSceneXml(content);
    return {
      isValid: true,
      error: null,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid scene XML.',
    };
  }
}

export function parseScreenplayBlockType(value: unknown): ScreenplayBlockType | null {
  if (typeof value !== 'string') {
    return null;
  }

  if (SCREENPLAY_XML_BLOCK_TAG_SET.has(value)) {
    return value as ScreenplayBlockType;
  }

  return null;
}

function parseSceneXmlDocument(content: string): XMLDocument | null {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(
    content || `<${SCREENPLAY_XML_ROOT_TAG}></${SCREENPLAY_XML_ROOT_TAG}>`,
    'application/xml',
  );
  const hasParserErrors = document.getElementsByTagName('parsererror').length > 0;
  if (hasParserErrors) {
    return null;
  }

  if (document.documentElement.tagName !== SCREENPLAY_XML_ROOT_TAG) {
    return null;
  }

  return document;
}

function parseValidatedSceneXml(content: string): {
  document: XMLDocument;
  blocks: ScreenplayXmlBlock[];
} {
  const document = parseSceneXmlDocument(content);
  if (!document) {
    throw new Error('Scene content must be well-formed XML with a <scene> root.');
  }

  const root = document.documentElement;
  if (root.attributes.length > 0) {
    throw new Error('Scene root must not include attributes.');
  }

  if (hasCommentNode(document)) {
    throw new Error('Scene XML must not include comments.');
  }

  const blocks: ScreenplayXmlBlock[] = [];

  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
      if ((node.textContent ?? '').trim().length > 0) {
        throw new Error('Scene XML cannot include text outside screenplay block tags.');
      }

      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      throw new Error('Scene XML contains unsupported nodes at root level.');
    }

    const element = node as Element;
    if (element.attributes.length > 0) {
      throw new Error(`Screenplay block <${element.tagName}> must not include attributes.`);
    }

    const type = parseScreenplayBlockType(element.tagName);
    if (!type) {
      throw new Error(`Scene XML contains unsupported block tag <${element.tagName}>.`);
    }

    let text = '';
    Array.from(element.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
        text += child.textContent ?? '';
        return;
      }

      if (child.nodeType === Node.ELEMENT_NODE) {
        throw new Error(`Block <${type}> must contain text only and no nested tags.`);
      }

      throw new Error(`Block <${type}> contains unsupported XML nodes.`);
    });

    blocks.push({
      type,
      text,
    });
  });

  return {
    document,
    blocks,
  };
}

function hasCommentNode(node: Node): boolean {
  if (node.nodeType === Node.COMMENT_NODE) {
    return true;
  }

  return Array.from(node.childNodes).some((child) => hasCommentNode(child));
}

function escapeXmlText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
