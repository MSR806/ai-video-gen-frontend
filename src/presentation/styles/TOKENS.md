# Design Tokens

Single source of truth: [`globals.css`](./globals.css).
**Never write raw colors in feature CSS.** `stylelint` will fail the build if you do — the only file allowed to define hex/rgb/hsl values is `globals.css`.

The current palette is a **pitch-black minimalist** theme: pure-black canvas, a near-monochrome neutral ramp, with a soft mint-green primary accent. Functional status colors (error / success / warning) are the only other chromatic tokens.

---

## When to use what

### Backgrounds — `--bg-*`

A 5-step ramp from pure black to a faint grey. Pick the smallest step that still reads as a distinct surface against its parent.

| Token           | Value     | Use for                                                                     |
| --------------- | --------- | --------------------------------------------------------------------------- |
| `--bg-canvas`   | `#000000` | The page itself. The outermost layer.                                       |
| `--bg-base`     | `#0a0a0a` | Default content surface. Image-grid tiles (`CollectionItemCard`).           |
| `--bg-muted`    | `#0f0f0f` | Inset wells / subtle depressions. Rare.                                     |
| `--bg-raised`   | `#141414` | **Cards** (`Card`, `ProjectCard`), settings panels, modal bodies, sidebars. |
| `--bg-elevated` | `#1a1a1a` | Input fields, dropdowns, popovers, hover states, the `+Add` button.         |

> **Rule of thumb:** card on a canvas page = `--bg-raised`. Input inside a card = `--bg-elevated`. Skip levels rather than stacking similar shades.

### Overlays — `--bg-overlay`, `--overlay-*`

For semi-transparent layers on top of images or below modals.

| Token               | Value                       | Use for                                                                  |
| ------------------- | --------------------------- | ------------------------------------------------------------------------ |
| `--bg-overlay`      | `rgba(0, 0, 0, 0.72)`       | Modal backdrops, badges over thumbnails.                                 |
| `--bg-glass`        | `rgba(20, 20, 20, 0.72)`    | Frosted-style surfaces (rare; we mostly use solid).                      |
| `--overlay-soft`    | `rgba(0, 0, 0, 0.56)`       | Light dimming over content.                                              |
| `--overlay-default` | `rgba(0, 0, 0, 0.76)`       | Stronger dimming; bottom-fade gradients over images for text legibility. |
| `--overlay-danger`  | `rgba(248, 113, 113, 0.86)` | Destructive-action hover state (e.g. red on the "remove media" button).  |

### Text — `--text-*`

Three steps for hierarchy, plus disabled and inverse.

| Token              | Value     | Use for                                            |
| ------------------ | --------- | -------------------------------------------------- |
| `--text-primary`   | `#ededed` | Body copy, headings, labels, filled input values.  |
| `--text-secondary` | `#a3a3a3` | Sub-labels, captions, description text.            |
| `--text-muted`     | `#737373` | Hints, helper text ("drag and drop…"), connectors. |
| `--text-subtle`    | `#525252` | Decorative meta (date stamps, divider labels).     |
| `--text-disabled`  | `#404040` | Disabled controls only.                            |
| `--text-inverse`   | `#0a0a0a` | Text on light/inverse surfaces. Rare.              |

### Borders & Dividers — `--border-*`, `--divider-default`

Low-contrast neutrals — borders are felt, not seen.

| Token               | Value                       | Use for                                                         |
| ------------------- | --------------------------- | --------------------------------------------------------------- |
| `--border-subtle`   | `#1f1f1f`                   | Section separators, footer dividers, low-emphasis card borders. |
| `--border-default`  | `#2a2a2a`                   | Default input / button borders, card outlines.                  |
| `--border-strong`   | `#3a3a3a`                   | Hover & active state borders.                                   |
| `--border-accent`   | `#525252`                   | Strong emphasis (rare).                                         |
| `--divider-default` | `rgba(255, 255, 255, 0.06)` | Horizontal rules between blocks of text.                        |

### Accent — `--accent-*`

The **primary** accent is a soft mint-green. Used **only** for primary calls-to-action (the "Run" button, the active "Generate") and focus indicators.

| Token                    | Value                      | Use for                                                                                                   |
| ------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `--accent-primary`       | `#86efac`                  | Primary button backgrounds, focus outlines, active-tab indicators.                                        |
| `--accent-primary-hover` | `#a7f3d0`                  | Primary button hover state.                                                                               |
| `--accent-primary-muted` | `rgba(134, 239, 172, 0.1)` | Drag-active highlights, very subtle accent-tinted surfaces.                                               |
| `--accent-secondary`     | `#a3a3a3`                  | Currently neutral grey — reserved for secondary emphasis.                                                 |
| `--accent-tertiary`      | `#737373`                  | Currently neutral grey — reserved for tertiary emphasis.                                                  |
| `--accent-gradient-text` | `#042f1d`                  | Dark forest-green text colour for content sitting **on** an accent-primary background (Run button label). |

> **Don't** use accent colours for status, decorations, or "to make something pop." The whole UI works in monochrome — the green is reserved for one role: _"this is the primary action."_

### Status — `--status-*`

Functional indicators only. Never the brand colour.

| Token                    | Value                       | Use for                                                                                                         |
| ------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `--status-error`         | `#f87171`                   | Error icons, required-field asterisks (`*`), validation borders.                                                |
| `--status-error-soft`    | `#fca5a5`                   | Error message text.                                                                                             |
| `--status-error-muted`   | `rgba(248, 113, 113, 0.12)` | Soft error backgrounds (failure-state cards).                                                                   |
| `--status-success`       | `#4ade80`                   | Completed state, success toasts. **Distinct** from `--accent-primary` so primary buttons don't read as success. |
| `--status-success-muted` | `rgba(74, 222, 128, 0.12)`  | Soft success backgrounds.                                                                                       |
| `--status-warning`       | `#fbbf24`                   | Pending / cautionary indicators.                                                                                |
| `--status-warning-muted` | `rgba(251, 191, 36, 0.12)`  | Soft warning backgrounds.                                                                                       |

### Shadows — `--shadow-*`

Neutral black shadows for elevation. No coloured glows.

| Token             | Use for                                                      |
| ----------------- | ------------------------------------------------------------ |
| `--shadow-sm`     | Default raised cards, hover lifts.                           |
| `--shadow-md`     | Dropdowns, popovers.                                         |
| `--shadow-lg`     | Modal containers.                                            |
| `--shadow-xl`     | Lightbox / full-screen overlays.                             |
| `--shadow-accent` | `none` — reserved token, currently disabled (no green glow). |

### Spacing — `--space-*`

A 9-step scale (0.25rem → 3rem). Use for padding, gap, margin. Never write raw `rem`/`px` for layout spacing.

```
--space-1: 0.25rem    --space-4: 1rem       --space-7: 2rem
--space-2: 0.5rem     --space-5: 1.25rem    --space-8: 2.5rem
--space-3: 0.75rem    --space-6: 1.5rem     --space-9: 3rem
```

### Radii — `--radius-*`

```
--radius-xs: 0.25rem   --radius-md: 0.75rem   --radius-xl: 1.25rem
--radius-sm: 0.5rem    --radius-lg: 1rem      --radius-2xl: 1.5rem
--radius-full: 9999px
```

| Token           | Use for                     |
| --------------- | --------------------------- |
| `--radius-sm`   | Inline chips, small inputs. |
| `--radius-md`   | Buttons, default inputs.    |
| `--radius-lg`   | Cards, panels.              |
| `--radius-xl`   | Modals, large cards.        |
| `--radius-full` | Avatars, pill badges.       |

### Motion & Transitions — `--motion-*`, `--transition-*`

```
--transition-fast    150ms   Button hovers, input focus, micro-interactions.
--transition-normal  220ms   Cards, panels, page-level state.
--transition-slow    320ms   Modal open/close, layout shifts.
```

### Typography — `--font-*`, `--font-size-*`, `--line-height-*`, `--tracking-*`

| Token                   | Use for                                        |
| ----------------------- | ---------------------------------------------- |
| `--font-family-body`    | Geist (sans). Default for all UI text.         |
| `--font-family-display` | Space Grotesk. Page titles and large headings. |
| `--font-family-mono`    | Geist Mono. Code, durations, kbd.              |
| `--font-size-xs … 3xl`  | Use the scale; never hardcode `rem`.           |

### Focus Ring — `--focus-ring-*`

Used by `:focus-visible` styles globally.

```
--focus-ring-size:    2px
--focus-ring-color:   rgba(134, 239, 172, 0.5)    /* green at 50% */
--focus-ring-shadow:  0 0 0 2px rgba(134, 239, 172, 0.2)
```

---

## What's forbidden

The `stylelint.config.mjs` blocks these in every CSS file **except** `globals.css`:

| Disallowed                                | Why                                  |
| ----------------------------------------- | ------------------------------------ |
| `#abc123`, `#fff`                         | Hex literals — use a token.          |
| `white`, `black`, `red`, …                | Named colours — use a token.         |
| `rgb(…)`, `rgba(…)`, `hsl(…)`             | Raw colour functions — use a token.  |
| Inline `style={{ color: '#fff' }}` in TSX | Use a CSS module class with a token. |

`color-mix(in srgb, var(--token), …)` is **allowed** because it composes existing tokens — used for functional transparency fades over images.

---

## Adding a new token

1. Add it to `:root` in `src/presentation/styles/globals.css` with a semantic name (`--bg-floating`, not `--very-dark-grey`).
2. Add a row to this file describing **what it's for** (not just the value — the colour is in `globals.css`).
3. Reference it from feature CSS as `var(--bg-floating)`.

Don't introduce a new token if an existing one fits — fewer tokens means a more coherent system.

---

## Enforcement

- **Local:** `bun run lint:css`
- **Pre-commit:** runs automatically on staged `.css` files via lint-staged.
- **CI:** part of `bun run lint`.
