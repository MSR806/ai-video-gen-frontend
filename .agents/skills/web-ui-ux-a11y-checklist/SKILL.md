---
name: web-ui-ux-a11y-checklist
description: Apply practical web UI, UX, and accessibility checks during implementation and review.
---

# Web UI, UX, and Accessibility Checklist (Curated)

Source baseline: `vercel-labs/agent-skills` -> `web-design-guidelines` (curated for this repo).

## Purpose

Prevent common usability and accessibility regressions while building and reviewing frontend features.

## When to Use This Skill

- Any UI implementation touching interactivity, forms, media, or feedback.
- Final review pass before opening a pull request.

## Scope

- `src/presentation/**`
- `src/app/**`

## Rules

1. Use semantic interactive elements.

- Use `<button>` for actions and `<a>` or `<Link>` for navigation.
- Avoid clickable `div` and `span` for primary interaction.

2. Label icon-only controls.

- Add `aria-label` to icon-only buttons.
- Mark decorative icons with `aria-hidden="true"`.

3. Preserve visible keyboard focus.

- Keep strong `:focus-visible` styles.
- Do not remove outlines without equivalent replacement.

4. Announce async feedback.

- Toasts and status updates should use `aria-live="polite"` (or a suitable live region).
- Error messages should be clear and actionable.

5. Enforce form basics.

- Inputs must have labels or explicit accessible labels.
- Use meaningful `name`, `type`, and `autocomplete` where relevant.

6. Keep motion controlled.

- Do not use `transition: all`; transition specific properties only.
- Respect reduced-motion preferences.

7. Treat media and large lists carefully.

- Provide image dimensions when possible.
- Lazy-load below-the-fold media.
- Use virtualization or `content-visibility` for very large lists.

8. Reflect meaningful UI state in URL.

- Keep filters, tabs, and drill-down state deep-linkable when it improves user workflows.

## Repo-specific Guidance

- Prefer reusable accessible primitives from shared components.
- Keep token-based styling; avoid inline color literals in feature components.
- Re-check focus order and keyboard paths after layout refactors.

## Precedence

- `AGENTS.md` remains the primary source of truth.
- If this checklist conflicts with architecture rules, follow `AGENTS.md`.

## PR Checklist

- Any clickable non-semantic element left?
- Any icon-only control missing `aria-label`?
- Any missing live-region behavior for async feedback?
- Any `transition: all` introduced?
- Any keyboard focus regression introduced?
