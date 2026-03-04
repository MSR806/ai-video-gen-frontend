# Web UI/UX + Accessibility Checklist (Curated)

Source baseline: `vercel-labs/agent-skills` -> `web-design-guidelines` (curated for this repo).

## Purpose

Apply practical UI/UX/accessibility checks during implementation and review.

## Scope

- `src/presentation/**`
- `src/app/**`

## Core checks

1. Use semantic interactive elements.

- Use `<button>` for actions and `<a>/<Link>` for navigation.
- Avoid clickable `div/span` for interactive behavior.

2. Icon-only controls must be labeled.

- Provide `aria-label` for icon-only buttons.
- Decorative icons should use `aria-hidden="true"`.

3. Keyboard and focus behavior must be visible and usable.

- Keep visible `:focus-visible` styles.
- Do not use `outline: none` without an equivalent focus treatment.

4. Announce async feedback.

- Toasts/status messages should use `aria-live="polite"` or appropriate live regions.
- Important errors should be clear and actionable.

5. Form basics are mandatory.

- Inputs should have labels (or explicit accessible labels).
- Use meaningful `name`, `type`, and `autocomplete` where relevant.

6. Motion should be controlled.

- Avoid `transition: all`; transition specific properties only.
- Respect reduced-motion preferences for non-essential animation.

7. Media and list performance.

- Images should define dimensions where possible.
- Use lazy loading for below-the-fold media.
- Consider virtualization or `content-visibility` for large lists.

8. URL should reflect meaningful UI state.

- Tabs, filters, and drill-down state should be deep-linkable where useful.

## Anti-patterns to reject

- Click handlers on non-semantic containers for primary actions.
- `transition: all` in reusable components.
- Removing focus outlines without replacement.
- Inline hardcoded colors in feature components when tokens exist.

## PR checklist

- Any clickable non-semantic element left?
- Any icon button missing `aria-label`?
- Any missing live-region behavior for async feedback?
- Any `transition: all` left in touched files?
- Any focus style regressions introduced?
