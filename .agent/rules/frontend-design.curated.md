# Frontend Design Direction (Curated)

Source baseline: `anthropics/claude-code` -> `frontend-design` (adapted for this repo).

## Purpose

Use for net-new UI surfaces that need stronger visual direction and better UX polish.

## Scope

- New pages, new feature surfaces, and major redesigns in `src/presentation/**`.
- Optional for small maintenance edits or bug fixes.

## Design Thinking (Adopt)

Before implementation, define and document:

1. Purpose

- What the interface solves.
- Who the primary user is.

2. Tone

- Pick one clear direction (for example: minimal, editorial, utilitarian, playful, premium).
- Keep the same direction within the feature.

3. Constraints

- Accessibility, performance, and architecture boundaries.
- Existing design token system and component patterns.

4. Differentiation

- Add one memorable interaction or visual motif that improves comprehension or delight.
- Avoid novelty that hurts usability.

## Aesthetics Guidelines (Adopt with guardrails)

1. Typography

- Use purposeful type scale and hierarchy.
- For new surfaces, non-default font choices are allowed only when they do not conflict with product consistency.
- Do not globally replace app typography without explicit approval.

2. Color and theming

- Use CSS variables/tokens as the source of truth.
- Extend tokens first, then consume them in components.
- Avoid hardcoded colors in feature components.

3. Motion

- Use a small number of meaningful motion moments.
- Prefer property-specific transitions (`opacity`, `transform`, `color`, etc.), never `transition: all`.
- Respect reduced motion preferences.

4. Composition and layout

- Use intentional composition; asymmetry/grid-breaking is allowed only when it improves hierarchy.
- Default to readable, scannable workflows for productivity screens.

5. Backgrounds and detail

- Add atmosphere with restraint (subtle gradients, texture, layering).
- Ensure contrast and legibility stay high.

## Explicit constraints

1. Do not force aesthetic churn.

- Do not alternate themes/styles per generation.
- Keep intra-feature consistency.

2. Do not apply absolute font bans.

- Avoid rigid rules like "never use X font."
- Match existing system unless the task is explicitly a design refresh.

3. Do not break architecture for design.

- Keep clean boundaries: presentation only in UI layer.
- No business logic hidden in styling components.

## PR checklist

- Is design intent (purpose/tone/differentiation) clear?
- Are tokens used for color/spacing/shadows?
- Are motion choices meaningful and accessible?
- Is readability/scannability preserved for dense workflows?
- Any style decision likely to conflict with existing product language?
