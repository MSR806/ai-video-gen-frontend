---
name: component-composition
description: Guide decomposition and composition patterns for React components to keep feature UIs modular and maintainable.
---

# Component Composition Rules (Curated)

Source baseline: `vercel-labs/agent-skills` -> `composition-patterns` (curated for this repo).

## Purpose

Keep UI workflows understandable by splitting responsibilities into explicit, composable components.

## When to Use This Skill

- When a component is growing in size or concern count.
- When new variants are being introduced in existing workflow screens.
- During refactors of feature-level orchestration components.

## Scope

- `src/presentation/components/**`
- `src/presentation/features/**`

## Rules

1. Avoid boolean-prop proliferation.

- Do not keep stacking `isX`, `showY`, and `enableZ` flags in one component.
- Prefer explicit variants over hidden state combinations.

2. Prefer explicit variant components.

- Split large mode-driven components into clear variants.
- Example pattern: `CollectionWorkspace`, `ScenesWorkspace`, `ShotsWorkspace`.

3. Use composition over configuration.

- Prefer `children`, slots, and focused subcomponents.
- Avoid deep, nested conditional trees in a single file.

4. Lift shared workflow state intentionally.

- If siblings need the same state/actions, lift to provider or orchestrator boundaries.
- Keep dependency creation in outer layers, not deep UI leaves.

5. Extract by concern, not only by line count.

- Split components mixing 3+ concerns such as data loading, mutation orchestration, layout, feedback, and interaction handling.

6. Keep primitives truly primitive.

- `components/ui` should remain presentation-first and reusable.
- Feature-specific behavior belongs in `features/*`.

## Repo-specific Guidance

- Prioritize decomposition of workflow-heavy files first.
- Extract polling and mutation orchestration into hooks when it improves testability.
- Move cross-feature generic UI into `presentation/components`.

## Precedence

- Follow `AGENTS.md` if any rule conflicts with this skill.
- This skill refines decomposition choices inside allowed architecture boundaries.

## PR Checklist

- Did this change add mode flags that should become explicit variants?
- Is any component handling too many unrelated concerns?
- Can behavior be composed from existing primitives?
- Are architecture boundaries still clear after extraction?
