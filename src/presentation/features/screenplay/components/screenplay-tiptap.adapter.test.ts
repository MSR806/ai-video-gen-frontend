import { describe, expect, it } from 'bun:test';
import {
  createProvisionalSceneId,
  isProvisionalSceneId,
  screenplayXmlToTipTapDoc,
  tipTapDocToSceneXml,
} from './screenplay-tiptap.adapter';
import {
  clampSelectionToParentheticalInnerRange,
  getBlockCueText,
  getSlashCommandSuggestions,
  normalizeBlockTextByType,
  resolveNextBlockTypeOnEnter,
} from './screenplay-editor.utils';
import { createSplitBlockAttrs, isImeComposingEvent } from './screenplay-editor-keyboard.utils';
import {
  applyTextReplacementsBottomUp,
  type TextReplacement,
} from './screenplay-editor-transforms.utils';

describe('screenplay-tiptap.adapter', () => {
  it('maps scene xml to tiptap paragraphs with block types', () => {
    const doc = screenplayXmlToTipTapDoc(
      '<scene><slugline>INT. OFFICE - DAY</slugline><action>A neon sign flickers.</action></scene>',
    );
    expect(doc.type).toBe('doc');
    expect(doc.content?.[0]).toMatchObject({
      type: 'paragraph',
      attrs: { blockType: 'slugline' },
    });
    expect(doc.content?.[1]).toMatchObject({
      type: 'paragraph',
      attrs: { blockType: 'action' },
    });
  });

  it('serializes tiptap doc to canonical scene xml', () => {
    const parsed = tipTapDocToSceneXml({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { blockType: 'slugline' },
          content: [{ type: 'text', text: 'int. office - day' }],
        },
        {
          type: 'paragraph',
          attrs: { blockType: 'character' },
          content: [{ type: 'text', text: 'maya' }],
        },
      ],
    });

    expect(parsed).toBe(
      '<scene><slugline>INT. OFFICE - DAY</slugline><character>MAYA</character></scene>',
    );
  });

  it('normalizes parenthetical paragraphs to a single wrapper', () => {
    const parsed = tipTapDocToSceneXml({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { blockType: 'parenthetical' },
          content: [{ type: 'text', text: '(( whispering ))' }],
        },
      ],
    });

    expect(parsed).toBe('<scene><parenthetical>(whispering)</parenthetical></scene>');
  });

  it('mints and detects provisional scene ids', () => {
    const sceneId = createProvisionalSceneId();
    expect(isProvisionalSceneId(sceneId)).toBeTrue();
  });
});

describe('screenplay editor keyboard utilities', () => {
  it('applies locked Enter block transitions', () => {
    expect(resolveNextBlockTypeOnEnter('slugline')).toBe('action');
    expect(resolveNextBlockTypeOnEnter('action')).toBe('action');
    expect(resolveNextBlockTypeOnEnter('character')).toBe('dialogue');
    expect(resolveNextBlockTypeOnEnter('parenthetical')).toBe('dialogue');
    expect(resolveNextBlockTypeOnEnter('dialogue')).toBe('action');
    expect(resolveNextBlockTypeOnEnter('transition')).toBe('slugline');
  });

  it('returns only screenplay slash commands', () => {
    expect(getSlashCommandSuggestions('')).toEqual([
      'slugline',
      'action',
      'character',
      'parenthetical',
      'dialogue',
      'transition',
    ]);
    expect(getSlashCommandSuggestions('dia')).toEqual(['dialogue']);
  });

  it('uppercases only slugline and character blocks', () => {
    expect(normalizeBlockTextByType('slugline', 'int. attic - night')).toBe('INT. ATTIC - NIGHT');
    expect(normalizeBlockTextByType('character', 'lucas')).toBe('LUCAS');
    expect(normalizeBlockTextByType('parenthetical', '')).toBe('');
    expect(normalizeBlockTextByType('parenthetical', 'leaning in')).toBe('(leaning in)');
    expect(normalizeBlockTextByType('parenthetical', '(whispering)')).toBe('(whispering)');
    expect(normalizeBlockTextByType('parenthetical', '((whispering))')).toBe('(whispering)');
    expect(normalizeBlockTextByType('action', 'keep lowercase')).toBe('keep lowercase');
  });

  it('uses parenthetical cue text requested by users', () => {
    expect(getBlockCueText('parenthetical')).toBe('(parenthetical...)');
  });

  it('clamps parenthetical caret range inside wrapper characters', () => {
    expect(clampSelectionToParentheticalInnerRange(10, 12, 10, 12)).toEqual({ from: 11, to: 11 });
    expect(clampSelectionToParentheticalInnerRange(20, 30, 19, 31)).toEqual({ from: 21, to: 29 });
  });

  it('keeps only block type attrs for split blocks', () => {
    const firstSplit = createSplitBlockAttrs({ custom: 'value' }, 'action');
    const secondSplit = createSplitBlockAttrs(firstSplit, 'action');

    expect(firstSplit).toMatchObject({ custom: 'value', blockType: 'action' });
    expect(secondSplit).toMatchObject({ custom: 'value', blockType: 'action' });
  });

  it('detects IME composition keyboard events', () => {
    expect(isImeComposingEvent({ isComposing: true, keyCode: 13 })).toBeTrue();
    expect(isImeComposingEvent({ isComposing: false, keyCode: 229 })).toBeTrue();
    expect(isImeComposingEvent({ isComposing: false, keyCode: 13 })).toBeFalse();
  });
});

describe('screenplay editor transform utilities', () => {
  it('applies multiple replacements bottom-up to avoid stale ranges', () => {
    const original = 'A ((first)) B ((second)) C';
    const firstToken = '((first))';
    const secondToken = '((second))';

    const firstStart = original.indexOf(firstToken);
    const secondStart = original.indexOf(secondToken);

    const replacements: TextReplacement[] = [
      { from: firstStart, to: firstStart + firstToken.length, text: '(first)' },
      { from: secondStart, to: secondStart + secondToken.length, text: '(second)' },
    ];

    const applyReplacement = (source: string, replacement: TextReplacement): string =>
      `${source.slice(0, replacement.from)}${replacement.text}${source.slice(replacement.to)}`;

    const naiveResult = replacements.reduce(
      (value, replacement) => applyReplacement(value, replacement),
      original,
    );

    let bottomUpResult = original;
    applyTextReplacementsBottomUp(replacements, (replacement) => {
      bottomUpResult = applyReplacement(bottomUpResult, replacement);
    });

    expect(naiveResult).not.toBe('A (first) B (second) C');
    expect(bottomUpResult).toBe('A (first) B (second) C');
  });
});
