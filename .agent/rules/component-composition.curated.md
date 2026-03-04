# Component Composition Rules (Curated)

Source baseline: `vercel-labs/agent-skills` -> `composition-patterns` (curated for this repo).

## Purpose

Keep UI modular and maintainable as feature workflows grow.

## Scope

- `src/presentation/components/**`
- `src/presentation/features/**`

## Rules

1. Avoid boolean-prop proliferation.

- Do not keep adding mode flags like `isX`, `showY`, `enableZ` to one component.
- Each boolean doubles state combinations and increases hidden behavior.

2. Prefer explicit variant components.

- Replace one mega component with mode flags by explicit variants.
- Example pattern: `CollectionWorkspace`, `ScenesWorkspace`, `ShotsWorkspace`.

3. Use composition over configuration.

- Prefer children/slots and small composed pieces.
- Avoid deep trees of conditional rendering in one file.

4. Lift shared workflow state intentionally.

- If state/actions are needed across sibling UI areas, move them into a provider or orchestrator boundary.
- Keep dependencies injected from outer layers, not created deep in UI leaves.

5. Extract components by concern, not only by line count.

- Split when a component mixes 3+ concerns (data loading, mutation orchestration, layout, feedback, keyboard/mouse behavior).

6. Keep primitives truly primitive.

- `components/ui` stays presentation-first and reusable.
- Feature-specific behavior belongs in `features/*`.

## Repo-specific guidance

- Prioritize decomposition of workflow-heavy files first.
- Extract polling/mutation orchestration into hooks or feature services when it improves testability.
- Keep cross-feature generic pieces in `presentation/components`, not feature folders.

## PR checklist

- Did this change add new boolean mode props that should be variants?
- Is any component handling too many concerns?
- Can this behavior be composed from existing primitives?
- Are architecture boundaries still clear after extraction?
