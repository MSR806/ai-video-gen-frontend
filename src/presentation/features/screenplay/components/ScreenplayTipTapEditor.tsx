'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import History from '@tiptap/extension-history';
import type { ScreenplayBlock, ScreenplayScene } from '@core/screenplay';
import {
  clampSelectionToParentheticalInnerRange,
  getBlockCueText,
  getSlashCommandSuggestions,
  normalizeBlockTextByType,
  resolveNextBlockTypeOnEnter,
  resolveNextBlockTypeOnTab,
  SLUGLINE_PREFIX_SUGGESTIONS,
} from './screenplay-editor.utils';
import { createSplitBlockAttrs, isImeComposingEvent } from './screenplay-editor-keyboard.utils';
import {
  applyTextReplacementsBottomUp,
  type TextReplacement,
} from './screenplay-editor-transforms.utils';
import {
  isBlockListEqual,
  screenplayBlocksToTipTapDoc,
  tipTapDocToScreenplayBlocks,
} from './screenplay-tiptap.adapter';
import styles from './ScreenplayWorkspace.module.css';

interface ScreenplayTipTapEditorProps {
  scene: ScreenplayScene | null;
  characterSuggestions: string[];
  onSceneContentChange: (sceneId: string, content: ScreenplayScene['content']) => void;
}

const ScreenplayParagraph = Paragraph.extend({
  addAttributes() {
    return {
      blockType: {
        default: 'action',
        parseHTML: (element) => element.getAttribute('data-block-type') ?? 'action',
        renderHTML: (attributes) => {
          const blockType = parseBlockType(attributes.blockType);
          return {
            'data-block-type': blockType,
            'data-placeholder': getBlockCueText(blockType),
          };
        },
      },
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-id'),
        renderHTML: (attributes) =>
          typeof attributes.blockId === 'string' && attributes.blockId.length > 0
            ? { 'data-block-id': attributes.blockId }
            : {},
      },
    };
  },
});

type ScreenplayBlockType = ScreenplayBlock['type'];

export function ScreenplayTipTapEditor({
  scene,
  characterSuggestions,
  onSceneContentChange,
}: ScreenplayTipTapEditorProps) {
  const [slashQuery, setSlashQuery] = useState('');
  const [activeAutocomplete, setActiveAutocomplete] = useState<string[]>([]);
  const [activeAutocompleteType, setActiveAutocompleteType] = useState<ScreenplayBlockType | null>(
    null,
  );
  const [autocompleteSelectedIndex, setAutocompleteSelectedIndex] = useState(0);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [suggestionPosition, setSuggestionPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const isApplyingExternalContentRef = useRef(false);
  const isNormalizingParentheticalRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    // Next.js renders client components during SSR pass for hydration prep.
    // TipTap requires deferred rendering to avoid SSR hydration mismatches.
    immediatelyRender: false,
    extensions: [Document, ScreenplayParagraph, Text, History],
    editorProps: {
      attributes: {
        class: styles.screenplayEditor,
      },
    },
    content: screenplayBlocksToTipTapDoc(scene?.content.blocks ?? []),
    onUpdate: ({ editor: nextEditor }) => {
      if (!scene || isApplyingExternalContentRef.current || isNormalizingParentheticalRef.current) {
        return;
      }

      if (normalizeParentheticalBlocksInEditor(nextEditor, isNormalizingParentheticalRef)) {
        return;
      }

      const blocks = tipTapDocToScreenplayBlocks(nextEditor.getJSON(), scene.content.blocks).map(
        (block) => ({
          ...block,
          text: normalizeBlockTextByType(block.type, block.text),
        }),
      );

      onSceneContentChange(scene.id, { blocks });
      syncInlineSuggestions(
        nextEditor,
        characterSuggestions,
        setSlashQuery,
        setActiveAutocomplete,
        setActiveAutocompleteType,
        setSuggestionPosition,
        wrapRef.current,
      );
    },
    onSelectionUpdate: ({ editor: nextEditor }) => {
      clampParentheticalCaret(nextEditor);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    syncInlineSuggestions(
      editor,
      characterSuggestions,
      setSlashQuery,
      setActiveAutocomplete,
      setActiveAutocompleteType,
      setSuggestionPosition,
      wrapRef.current,
    );
  }, [characterSuggestions, editor]);

  useEffect(() => {
    if (!editor || !scene) {
      return;
    }

    const currentBlocks = tipTapDocToScreenplayBlocks(editor.getJSON(), scene.content.blocks);
    if (isBlockListEqual(currentBlocks, scene.content.blocks)) {
      return;
    }

    isApplyingExternalContentRef.current = true;
    editor.commands.setContent(screenplayBlocksToTipTapDoc(scene.content.blocks), {
      emitUpdate: false,
    });
    queueMicrotask(() => {
      isApplyingExternalContentRef.current = false;
    });
  }, [editor, scene]);

  const slashSuggestions = useMemo(() => getSlashCommandSuggestions(slashQuery), [slashQuery]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!editor || !scene) {
      return;
    }

    if (isImeComposingEvent(event.nativeEvent)) {
      return;
    }

    const current = getCurrentLineState(editor);
    if (!current) {
      return;
    }

    const isSlashLine = current.text.trimStart().startsWith('/');
    const hasAutocomplete = activeAutocomplete.length > 0 && !isSlashLine;

    if (hasAutocomplete) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setAutocompleteSelectedIndex((index) => (index + 1) % activeAutocomplete.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setAutocompleteSelectedIndex((index) =>
          index === 0 ? activeAutocomplete.length - 1 : index - 1,
        );
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        const selectedValue =
          activeAutocomplete[Math.min(autocompleteSelectedIndex, activeAutocomplete.length - 1)] ??
          activeAutocomplete[0];
        applyAutocomplete(editor, selectedValue);
        setActiveAutocomplete([]);
        setActiveAutocompleteType(null);
        setSuggestionPosition(null);
        return;
      }
    }

    if (isSlashLine && slashSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setSlashSelectedIndex((currentIndex) => (currentIndex + 1) % slashSuggestions.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setSlashSelectedIndex((currentIndex) =>
          currentIndex === 0 ? slashSuggestions.length - 1 : currentIndex - 1,
        );
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        applySlashCommand(editor, slashSuggestions[slashSelectedIndex] ?? slashSuggestions[0]);
        setSlashQuery('');
        setActiveAutocomplete([]);
        setActiveAutocompleteType(null);
        setSuggestionPosition(null);
        setSlashSelectedIndex(0);
        return;
      }
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();

      cycleLineBlockType(editor, current.blockType, event.shiftKey ? 'backward' : 'forward');
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (current.text.trim().length === 0) {
      return;
    }

    const nextType = resolveNextBlockTypeOnEnter(current.blockType);
    editor
      .chain()
      .focus()
      .splitBlock()
      .command(({ tr }) => {
        const position = tr.selection.$from.before();
        const node = tr.doc.nodeAt(position);
        if (!node) {
          return true;
        }

        tr.setNodeMarkup(position, undefined, {
          ...createSplitBlockAttrs(node.attrs, nextType),
        });

        return true;
      })
      .run();
  };

  if (!scene) {
    return <div className={styles.emptyState}>Select or add a scene to begin writing.</div>;
  }

  const currentLineState = editor ? getCurrentLineState(editor) : null;
  const showSlashSuggestions =
    slashSuggestions.length > 0 && currentLineState?.text.trimStart().startsWith('/');
  const showAutocomplete = activeAutocomplete.length > 0 && !showSlashSuggestions;
  const selectedAutocompleteValue =
    activeAutocomplete[Math.min(autocompleteSelectedIndex, activeAutocomplete.length - 1)] ??
    activeAutocomplete[0];

  return (
    <div className={styles.tipTapEditorWrap}>
      <div ref={wrapRef} className={styles.editorContentHost}>
        <EditorContent editor={editor} onKeyDown={handleKeyDown} onKeyDownCapture={handleKeyDown} />

        {showSlashSuggestions ? (
          <ul
            className={styles.inlineSuggestions}
            style={
              suggestionPosition
                ? { top: suggestionPosition.top, left: suggestionPosition.left }
                : undefined
            }
          >
            {slashSuggestions.map((type, index) => (
              <li
                key={type}
                className={index === slashSelectedIndex ? styles.activeSuggestion : ''}
              >
                /{type}
              </li>
            ))}
          </ul>
        ) : null}

        {showAutocomplete ? (
          <ul
            className={styles.inlineSuggestions}
            style={
              suggestionPosition
                ? { top: suggestionPosition.top, left: suggestionPosition.left }
                : undefined
            }
          >
            {activeAutocomplete.map((value) => (
              <li
                key={`${activeAutocompleteType ?? 'value'}:${value}`}
                className={value === selectedAutocompleteValue ? styles.activeSuggestion : ''}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (editor) {
                    applyAutocomplete(editor, value);
                    setActiveAutocomplete([]);
                    setActiveAutocompleteType(null);
                    setSuggestionPosition(null);
                  }
                }}
              >
                {value}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function normalizeParentheticalBlocksInEditor(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  isNormalizingParentheticalRef: MutableRefObject<boolean>,
): boolean {
  const { state } = editor;
  const tr = state.tr;
  const replacements: TextReplacement[] = [];
  let hasChanges = false;

  state.doc.descendants((node, position) => {
    if (node.type.name !== 'paragraph') {
      return;
    }

    const blockType = parseBlockType((node.attrs as { blockType?: string }).blockType);
    if (blockType !== 'parenthetical') {
      return;
    }

    const normalized = normalizeBlockTextByType('parenthetical', node.textContent);
    if (node.textContent === normalized) {
      return;
    }

    hasChanges = true;
    replacements.push({
      from: position + 1,
      to: position + node.content.size + 1,
      text: normalized,
    });
  });

  if (!hasChanges) {
    return false;
  }

  // Apply replacements from later ranges to earlier ones so position shifts from
  // one normalization do not invalidate the next write in this same transaction.
  applyTextReplacementsBottomUp(replacements, ({ from, to, text }) => {
    tr.insertText(text, from, to);
  });

  isNormalizingParentheticalRef.current = true;
  editor.view.dispatch(tr);
  // Guard against re-entrant update loops caused by our normalization dispatch.
  queueMicrotask(() => {
    isNormalizingParentheticalRef.current = false;
    clampParentheticalCaret(editor);
  });

  return true;
}

function clampParentheticalCaret(editor: NonNullable<ReturnType<typeof useEditor>>): void {
  const current = getCurrentLineState(editor);
  if (!current || current.blockType !== 'parenthetical') {
    return;
  }

  const trimmed = current.text.trim();
  if (!(trimmed.startsWith('(') && trimmed.endsWith(')'))) {
    return;
  }

  const { from, to } = editor.state.selection;
  const clamped = clampSelectionToParentheticalInnerRange(current.from, current.to, from, to);

  if (clamped.from === from && clamped.to === to) {
    return;
  }

  // Parenthetical lines must keep the caret inside "(" and ")" while editing.
  editor.commands.setTextSelection(clamped);
}

function cycleLineBlockType(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  currentType: ScreenplayBlockType,
  direction: 'forward' | 'backward',
) {
  const nextType = resolveNextBlockTypeOnTab(currentType, direction);
  const current = getCurrentLineState(editor);
  if (!current) {
    return;
  }

  editor
    .chain()
    .focus()
    .setTextSelection({ from: current.from, to: current.to })
    .command(({ tr }) => {
      const position = tr.selection.$from.before();
      const node = tr.doc.nodeAt(position);
      if (!node) {
        return true;
      }

      tr.setNodeMarkup(position, undefined, {
        ...node.attrs,
        blockType: nextType,
      });

      return true;
    })
    .run();
}

function syncInlineSuggestions(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  characterSuggestions: string[],
  setSlashQuery: (value: string) => void,
  setActiveAutocomplete: (value: string[]) => void,
  setActiveAutocompleteType: (value: ScreenplayBlockType | null) => void,
  setSuggestionPosition: (value: { top: number; left: number } | null) => void,
  suggestionContainer: HTMLElement | null,
) {
  const current = getCurrentLineState(editor);
  if (!current) {
    setSlashQuery('');
    setActiveAutocomplete([]);
    setActiveAutocompleteType(null);
    setSuggestionPosition(null);
    return;
  }

  setSuggestionPosition(getSuggestionAnchor(editor, suggestionContainer));

  const trimmedStart = current.text.trimStart();
  if (trimmedStart.startsWith('/')) {
    setSlashQuery(trimmedStart.slice(1));
  } else {
    setSlashQuery('');
  }

  if (current.blockType === 'slugline') {
    const query = current.text.trim().toUpperCase();
    if (query.length === 0) {
      setActiveAutocomplete([]);
      setActiveAutocompleteType(null);
      setSuggestionPosition(null);
      return;
    }
    const suggestions = SLUGLINE_PREFIX_SUGGESTIONS.filter((prefix) =>
      prefix.startsWith(query),
    ).slice(0, 4);
    setActiveAutocomplete(suggestions);
    setActiveAutocompleteType(suggestions.length > 0 ? 'slugline' : null);
    if (suggestions.length === 0) {
      setSuggestionPosition(null);
    }
    return;
  }

  if (current.blockType === 'character') {
    const query = current.text.trim().toUpperCase();
    if (query.length === 0) {
      setActiveAutocomplete([]);
      setActiveAutocompleteType(null);
      setSuggestionPosition(null);
      return;
    }
    const suggestions = characterSuggestions
      .filter((name) => name.startsWith(query) && name !== query)
      .slice(0, 6);
    setActiveAutocomplete(suggestions);
    setActiveAutocompleteType(suggestions.length > 0 ? 'character' : null);
    if (suggestions.length === 0) {
      setSuggestionPosition(null);
    }
    return;
  }

  setActiveAutocomplete([]);
  setActiveAutocompleteType(null);
  setSuggestionPosition(null);
}

function getSuggestionAnchor(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  suggestionContainer: HTMLElement | null,
): { top: number; left: number } {
  const { from } = editor.state.selection;
  const caretRect = editor.view.coordsAtPos(from);
  const hostRect =
    suggestionContainer?.getBoundingClientRect() ?? editor.view.dom.getBoundingClientRect();

  return {
    top: caretRect.bottom - hostRect.top + 12,
    left: Math.max(12, caretRect.left - hostRect.left),
  };
}

function getCurrentLineState(editor: ReturnType<typeof useEditor>): {
  blockType: ScreenplayBlockType;
  text: string;
  from: number;
  to: number;
} | null {
  if (!editor) {
    return null;
  }

  const { $from } = editor.state.selection;
  const from = $from.start();
  const to = $from.end();
  const attrs = $from.parent.attrs as { blockType?: string };
  const blockType = parseBlockType(attrs.blockType);

  return {
    blockType,
    text: $from.parent.textContent,
    from,
    to,
  };
}

function applySlashCommand(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  blockType: ScreenplayBlockType,
) {
  const current = getCurrentLineState(editor);
  if (!current) {
    return;
  }

  editor
    .chain()
    .focus()
    .setTextSelection({ from: current.from, to: current.to })
    .deleteSelection()
    .command(({ tr }) => {
      const position = tr.selection.$from.before();
      const node = tr.doc.nodeAt(position);
      if (!node) {
        return true;
      }

      tr.setNodeMarkup(position, undefined, {
        ...node.attrs,
        blockType,
      });

      return true;
    })
    .run();
}

function applyAutocomplete(editor: NonNullable<ReturnType<typeof useEditor>>, value: string) {
  const current = getCurrentLineState(editor);
  if (!current) {
    return;
  }

  editor
    .chain()
    .focus()
    .setTextSelection({ from: current.from, to: current.to })
    .insertContent(value)
    .run();
}

function parseBlockType(value: unknown): ScreenplayBlockType {
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
