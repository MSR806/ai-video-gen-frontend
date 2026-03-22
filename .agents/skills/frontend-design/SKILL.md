---
name: frontend-design
description: Define visual direction, UX polish, and implementation guardrails for net-new UI surfaces and major redesigns.
---

# Frontend Design Direction (Curated)

Source baseline: `anthropics/claude-code` -> `frontend-design` (adapted for this repo).

## Purpose

Create visually intentional interfaces without breaking product consistency, accessibility, or architecture boundaries.

## When to Use This Skill

- Net-new pages and major feature surfaces.
- Significant visual redesigns or UX refreshes.
- Not required for small bug fixes or maintenance edits.

## Scope

- `src/presentation/**`
- `src/app/**`

## Rules

1. Define intent before implementation.

- Document purpose, primary users, and key task flow.
- Choose one tone (for example: minimal, editorial, utilitarian, playful, premium) and keep it consistent.

2. Design within constraints.

- Keep accessibility, performance, and architecture boundaries intact.
- Use existing design tokens and component patterns first.

3. Use tokens as source of truth.

- Extend CSS variables when needed, then consume them in components.
- Avoid hardcoded color values in feature components.

4. Apply meaningful motion.

- Use only a few motion moments that improve comprehension.
- Transition specific properties only; never use `transition: all`.
- Respect reduced-motion preferences.

5. Keep composition readable.

- Use clear visual hierarchy and scannable layouts for productivity-heavy screens.
- Use asymmetry only when it improves hierarchy and comprehension.

6. Add atmosphere with restraint.

- Use subtle gradients, texture, or layering carefully.
- Maintain high contrast and legibility.

## Repo-specific Guidance

- Do not force stylistic churn across existing surfaces.
- Match established typography and visual language unless redesign is explicit.
- Keep business logic out of styling and presentation utilities.

## Precedence

- `AGENTS.md` is the primary authority.
- If this skill conflicts with repository architecture or styling rules, follow `AGENTS.md`.

## PR Checklist

- Is design intent clear (purpose, tone, differentiation)?
- Are tokens used for color, spacing, and shadows?
- Are motion choices meaningful and accessible?
- Is readability preserved for dense workflows?
- Does the update stay consistent with existing product language?
