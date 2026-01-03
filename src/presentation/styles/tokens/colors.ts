/**
 * Color Design Tokens
 *
 * This is the single source of truth for all colors in the application.
 * Use these tokens in TypeScript when you need the actual value.
 * For CSS, use the CSS variables defined in globals.css.
 */

export const colors = {
  // Background layers (darkest to lightest)
  bg: {
    base: '#0a0a0f', // App background
    raised: '#12121a', // Cards, modals
    elevated: '#1a1a24', // Hover states, dropdowns
    overlay: 'rgba(0,0,0,0.6)', // Modal backdrops
  },

  // Text hierarchy
  text: {
    primary: '#f1f5f9', // Headings, important text
    secondary: '#94a3b8', // Body text, descriptions
    muted: '#64748b', // Placeholders, disabled
    inverse: '#0f172a', // Text on light backgrounds (buttons)
  },

  // Borders & dividers
  border: {
    subtle: '#1e293b', // Dividers
    default: '#334155', // Input borders
    strong: '#475569', // Hover borders
  },

  // Brand / accent
  accent: {
    primary: '#6366f1', // Primary actions
    primaryHover: '#818cf8',
    primaryMuted: 'rgba(99,102,241,0.15)', // Subtle backgrounds
  },

  // Feedback / status
  status: {
    error: '#f87171',
    errorMuted: 'rgba(248,113,113,0.15)',
    success: '#4ade80',
    successMuted: 'rgba(74,222,128,0.15)',
    warning: '#fbbf24',
    warningMuted: 'rgba(251,191,36,0.15)',
  },
} as const;

// Type helpers for TypeScript autocompletion
export type BgColor = keyof typeof colors.bg;
export type TextColor = keyof typeof colors.text;
export type BorderColor = keyof typeof colors.border;
export type AccentColor = keyof typeof colors.accent;
export type StatusColor = keyof typeof colors.status;
