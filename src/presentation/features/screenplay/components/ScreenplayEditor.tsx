import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Scene, Character } from '@core';
import { Slugline, Action, CharacterName, Dialogue } from './extensions';
import styles from './ScreenplayEditor.module.css';

interface ScreenplayEditorProps {
  projectId: string;
  scenes: Scene[];
  characters: Character[];
  onSave: (doc: Record<string, unknown>) => void;
}

interface SuggestionState {
  active: boolean;
  type: 'slugline' | 'character' | 'block-menu' | null;
  text: string;
  coords: { top: number; left: number; bottom: number } | null;
  items: string[];
  selectedIndex: number;
}

export function ScreenplayEditor({ scenes, characters, onSave }: ScreenplayEditorProps) {
  const [suggestion, setSuggestion] = useState<SuggestionState>({
    active: false,
    type: null,
    text: '',
    coords: null,
    items: [],
    selectedIndex: 0,
  });
  const suggestionRef = useRef<SuggestionState>(suggestion);
  const editorRef = useRef<Editor | null>(null);

  // Sync ref for access inside handleKeyDown
  useEffect(() => {
    suggestionRef.current = suggestion;
  }, [suggestion]);

  // Compose initial content from scenes
  const initialContent = useMemo(() => {
    if (!scenes || scenes.length === 0) {
      return {
        type: 'doc',
        content: [{ type: 'slugline', content: [{ type: 'text', text: 'INT. NEW SCENE - DAY' }] }],
      };
    }

    const sortedScenes = [...scenes].sort((a, b) => (a.sceneNumber || 0) - (b.sceneNumber || 0));

    const allBlocks = sortedScenes.flatMap((scene) => {
      if (scene.content && scene.content.type === 'doc' && Array.isArray(scene.content.content)) {
        return scene.content.content;
      }
      return [];
    });

    return {
      type: 'doc',
      content:
        allBlocks.length > 0
          ? allBlocks
          : [{ type: 'slugline', content: [{ type: 'text', text: 'INT. NEW SCENE - DAY' }] }],
    };
  }, [scenes]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedUpdate = useCallback(
    (editor: Editor) => {
      const json = editor.getJSON();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onSave(json);
      }, 1000); // 1s debounce
    },
    [onSave],
  );

  const checkAutocomplete = (editorInstance: Editor) => {
    const { state, view } = editorInstance;
    const { selection } = state;
    const { $from, empty } = selection;

    if (!empty) {
      setSuggestion((s) => ({ ...s, active: false }));
      return;
    }

    const block = $from.parent;
    const text = block.textContent || '';
    const typeName = block.type.name;
    const isAtEnd = $from.parentOffset === text.length;

    if (!isAtEnd || text.trim() === '') {
      setSuggestion((s) => ({ ...s, active: false }));
      return;
    }

    let items: string[] = [];
    let type: 'slugline' | 'character' | 'block-menu' | null = null;
    let matchText = '';

    const cleanText = text.trim();

    if (
      (typeName === 'action' || typeName === 'paragraph' || typeName === 'slugline') &&
      cleanText.length > 0 &&
      cleanText.length <= 10
    ) {
      const prefixes = ['INT.', 'EXT.', 'INT/EXT.', 'EXT/INT.', 'EST.', 'EST/INT.'];
      const matches = prefixes.filter((p) => p.toLowerCase().startsWith(cleanText.toLowerCase()));
      if (matches.length > 0) {
        items = matches;
        type = 'slugline';
        matchText = cleanText;
      }
    } else if (typeName === 'character' && text.length > 0) {
      const charNames = characters.map((c) => c.name.toUpperCase());
      const matches = charNames.filter(
        (name) =>
          name.toLowerCase().startsWith(text.toLowerCase()) &&
          name.toLowerCase() !== text.toLowerCase(),
      );
      if (matches.length > 0) {
        items = matches;
        type = 'character';
        matchText = text;
      }
    }

    if (items.length > 0) {
      const startPos = selection.from - cleanText.length;
      const coords = view.coordsAtPos(startPos);

      setSuggestion({
        active: true,
        type,
        text: cleanText,
        coords: { top: coords.top, left: coords.left, bottom: coords.bottom },
        items,
        selectedIndex: 0,
      });
    } else {
      setSuggestion((s) => ({ ...s, active: false }));
    }
  };

  const handleSelectSuggestion = useCallback((selectedValue: string, currentEditor: Editor) => {
    if (!currentEditor) return;
    const { state } = currentEditor;
    const { selection } = state;
    const currentRef = suggestionRef.current;
    const from = selection.from - currentRef.text.length;
    const to = selection.from;

    if (currentRef.type === 'slugline') {
      currentEditor
        .chain()
        .deleteRange({ from, to })
        .setNode('slugline')
        .insertContent(selectedValue + ' ')
        .focus()
        .run();
    } else if (currentRef.type === 'character') {
      currentEditor.chain().deleteRange({ from, to }).insertContent(selectedValue).focus().run();
    } else if (currentRef.type === 'block-menu') {
      // Options: '[S] SCENE', '[A] ACTION', '[C] CHARACTER', '[D] DIALOGUE'
      let nodeType = 'action'; // Default to action
      if (selectedValue.includes('SCENE')) nodeType = 'slugline';
      else if (selectedValue.includes('CHARACTER'))
        nodeType = 'character'; // Fix characterName -> character for the node type
      else if (selectedValue.includes('DIALOGUE')) nodeType = 'dialogue';

      currentEditor
        .chain()
        .deleteRange({ from, to }) // Delete the '/' or whatever triggered the menu
        .setNode(nodeType)
        .focus()
        .run();
    }
    setSuggestion((s) => ({ ...s, active: false }));
  }, []);

  const editor = useEditor({
    extensions: [StarterKit, Slugline, Action, CharacterName, Dialogue],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      handleKeyDown(view, event) {
        const state = suggestionRef.current;

        // Trigger Block Menu on 'Enter' when on an empty Action block
        if (!state.active && event.key === 'Enter') {
          const { state: editorState } = view;
          const { selection } = editorState;
          const { $from, empty } = selection;
          if (
            empty &&
            ($from.parent.type.name === 'action' || $from.parent.type.name === 'paragraph') &&
            $from.parent.content.size === 0
          ) {
            event.preventDefault();
            const coords = view.coordsAtPos(selection.from);
            setSuggestion({
              active: true,
              type: 'block-menu',
              text: '', // No specific text to replace for Enter trigger
              coords: { top: coords.top, left: coords.left, bottom: coords.bottom },
              items: ['[S] SCENE', '[A] ACTION', '[C] CHARACTER', '[D] DIALOGUE'],
              selectedIndex: 0,
            });
            return true;
          }
        }

        if (!state.active || state.items.length === 0) return false;

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSuggestion((s) => ({ ...s, selectedIndex: (s.selectedIndex + 1) % s.items.length }));
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSuggestion((s) => ({
            ...s,
            selectedIndex: (s.selectedIndex - 1 + s.items.length) % s.items.length,
          }));
          return true;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (editorRef.current) {
            handleSelectSuggestion(state.items[state.selectedIndex], editorRef.current);
          }
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setSuggestion((s) => ({ ...s, active: false }));
          return true;
        }

        // If block menu is open but they type a letter, we should close it so they can type
        if (state.type === 'block-menu' && event.key.length === 1) {
          setSuggestion((s) => ({ ...s, active: false }));
          return false;
        }

        return false;
      },
    },
    onSelectionUpdate: ({ editor }) => {
      checkAutocomplete(editor);
    },
    onUpdate: ({ editor }) => {
      debouncedUpdate(editor);
      checkAutocomplete(editor);
    },
  });

  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
    if (editor && initialContent) {
      const currentContent = editor.getJSON();
      if (
        editor.isEmpty ||
        (currentContent.content?.length === 1 && !currentContent.content[0].content)
      ) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.editorContainer}>
      <EditorContent editor={editor} className={styles.editor} />

      {/* Autocomplete Dropdown */}
      {suggestion.active && suggestion.coords && (
        <div
          style={{
            position: 'fixed',
            zIndex: 1000,
            top: suggestion.coords.bottom + 4,
            left: suggestion.coords.left,
            backgroundColor: 'var(--bg-raised, #12121a)',
            border: '1px solid var(--border-default, #334155)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            padding: '4px',
            minWidth: '200px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {suggestion.items.map((item, i) => (
            <div
              key={item}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor:
                  i === suggestion.selectedIndex ? 'var(--accent-primary, #6366f1)' : 'transparent',
                color: i === suggestion.selectedIndex ? '#fff' : 'var(--text-primary, #f1f5f9)',
                borderRadius: '4px',
                fontFamily:
                  suggestion.type === 'block-menu'
                    ? 'inherit'
                    : 'Courier Prime, Courier, monospace',
                fontSize: '14px',
                fontWeight: suggestion.type === 'block-menu' ? 'normal' : 'bold',
              }}
              onMouseDown={(e) => {
                // Prevent Input blur allowing editor to stay focused
                e.preventDefault();
                handleSelectSuggestion(item, editor);
              }}
              onMouseEnter={() => setSuggestion((s) => ({ ...s, selectedIndex: i }))}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
