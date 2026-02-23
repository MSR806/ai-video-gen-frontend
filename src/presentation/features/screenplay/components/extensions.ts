import { Node, mergeAttributes } from '@tiptap/core';

export const Slugline = Node.create({
  name: 'slugline',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'p[data-type="slugline"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(HTMLAttributes, { 'data-type': 'slugline', class: 'slugline' }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.insertContent({ type: 'action' }),
    };
  },
});

export const Action = Node.create({
  name: 'action',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'p[data-type="action"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'action', class: 'action' }), 0];
  },

  addKeyboardShortcuts() {
    return {
      // Basic shortcut, Tab to switch from Action to Character
      Tab: () => this.editor.commands.insertContent({ type: 'character' }),
    };
  },
});

export const CharacterName = Node.create({
  name: 'character',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'p[data-type="character"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(HTMLAttributes, { 'data-type': 'character', class: 'character-name' }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.insertContent({ type: 'dialogue' }),
    };
  },
});

export const Dialogue = Node.create({
  name: 'dialogue',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'p[data-type="dialogue"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(HTMLAttributes, { 'data-type': 'dialogue', class: 'dialogue' }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.insertContent({ type: 'action' }),
    };
  },
});
