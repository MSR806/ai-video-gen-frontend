# Modern UI Refactor Playbook

## Purpose

This document is the single source of truth for the full-app visual modernization requested by the user. Any agent can open this file and immediately understand:

- Why this refactor exists.
- What has already been completed.
- What remains.
- Which files are in scope for each phase.
- How to safely continue without re-discovering context.

## Primary Goal

Transform the app from a functional but bland UI into a modern, premium workspace experience while preserving existing clean architecture boundaries and behavior.

## Approved Visual Direction (Current Baseline)

- **Monochrome + Emerald Accent** is now the approved and active direction across redesigned surfaces.
- Base surfaces are dark neutral monochrome (charcoal/graphite) with emerald reserved for primary action and emphasis.
- Purple/lavender atmospheric treatment from earlier iterations is deprecated and should not be reintroduced.

## Constraints (Must Keep)

- Keep business logic and data orchestration untouched (`src/core/**`, `src/infrastructure/**`).
- Apply visual changes in presentation and app layers only (`src/presentation/**`, `src/app/**`).
- Use CSS variables/tokens; avoid hardcoded feature-level color literals.
- Preserve accessibility basics: semantic controls, visible focus, keyboard paths, reduced-motion support.

## Baseline Findings Before Refactor

Observed prior to refactor kickoff:

- Typography felt generic/mixed (`src/presentation/styles/globals.css`, `src/app/globals.css`).
- Global scrollbar chrome was hidden, reducing affordance (`src/presentation/styles/globals.css`).
- Workspace nav used emoji markers instead of a product-grade icon set (`src/presentation/features/projects/ProjectDetailPage/components/TabNavigation.tsx`).
- UI primitives had minimal depth and outdated interaction polish:
  - `src/presentation/components/ui/Button.module.css`
  - `src/presentation/components/ui/Card.module.css`
  - `src/presentation/components/ui/Badge.module.css`
  - `src/presentation/components/ui/Modal.module.css`
  - `src/presentation/components/ui/Dropdown.module.css`
  - `src/presentation/components/feedback/Toast.module.css`
- Core page shells were structurally fine but visually flat:
  - `src/app/page.module.css`
  - `src/presentation/features/projects/ProjectsList.module.css`
  - `src/presentation/features/projects/ProjectCard.module.css`
  - `src/presentation/features/projects/ProjectOverviewPage.module.css`
  - `src/presentation/features/projects/ProjectDetailPage/ProjectDetailPage.module.css`

## Phase Plan and Status

Legend: `pending` | `in_progress` | `completed` | `blocked`

### Phase 1 - Foundation and Global Styling

Status: `completed`

Scope:

- `src/presentation/styles/globals.css`
- `src/app/layout.tsx`
- `src/app/globals.css`

Tasks:

1. Introduce a modernized token system (surfaces, elevation, typography, motion).
2. Unify body/heading font usage via font variables.
3. Replace hidden scrollbar behavior with styled, visible scrollbars.
4. Add subtle atmospheric background layers and reduced-motion-safe defaults.

### Phase 2 - Shared Primitive Refresh

Status: `completed`

Scope:

- `src/presentation/components/ui/Button.module.css`
- `src/presentation/components/ui/Card.module.css`
- `src/presentation/components/ui/Badge.module.css`
- `src/presentation/components/ui/Modal.module.css`
- `src/presentation/components/ui/Dropdown.module.css`
- `src/presentation/components/feedback/Toast.module.css`

Tasks:

1. Rework states and depth for buttons/cards/badges.
2. Upgrade modal and dropdown shell aesthetics and motion.
3. Improve toast visual hierarchy and status clarity.
4. Keep primitive component APIs stable.

### Phase 3 - Projects Home + Overview Modernization

Status: `completed`

Scope:

- `src/app/page.module.css`
- `src/presentation/features/projects/ProjectsList.module.css`
- `src/presentation/features/projects/ProjectCard.module.css`
- `src/presentation/features/projects/ProjectOverviewPage.module.css`

Tasks:

1. Build a stronger first impression on home and overview routes.
2. Improve content hierarchy, spacing, and CTA emphasis.
3. Polish empty/loading/error states using the refreshed primitives.

### Phase 4 - Workspace Shell and Navigation Refresh

Status: `completed`

Scope:

- `src/presentation/features/projects/ProjectDetailPage/ProjectDetailPage.module.css`
- `src/presentation/features/projects/ProjectDetailPage/components/TabNavigation.tsx`
- `src/presentation/features/projects/ProjectDetailPage/components/CollectionsCardList.module.css`
- `src/presentation/features/scenes/components/ScenesEditor.module.css`

Tasks:

1. Redesign workspace shell (pane surfaces, nav clarity, path bar).
2. Replace emoji tab markers with `lucide-react` icons.
3. Improve responsive layout behavior for tablet/mobile widths.

### Phase 5 - Modal/Form Consistency and Feature Polish

Status: `completed`

Scope:

- `src/presentation/features/projects/ProjectCreateModal.module.css`
- `src/presentation/features/collections/components/CollectionCreateModal.module.css`
- `src/presentation/features/collections/components/PastedImageConfirmModal.module.css`
- `src/presentation/features/collections/components/ChildCollectionCard.module.css` (if needed)
- `src/presentation/features/collections/components/CollectionItemCard.module.css` (targeted only)

Tasks:

1. Apply coherent form styling language across project/collection creation flows.
2. Align spacing/radius/border treatments with refreshed primitives.
3. Avoid regressions in media-heavy collection cards.

### Phase 6 - Validation and Stabilization

Status: `in_progress`

Tasks:

1. Run `bun run lint`.
2. Run `bun run build`.
3. Run `bun run test`.
4. Run `bun run test:e2e`.
5. Fix any regressions and update this document.

## Work Log

Use this running log for handoff safety.

- 2026-03-26: Document created and baseline analysis captured. Refactor execution started.
- 2026-03-26: Phase 1 completed. Updated global tokens, base typography/background, scrollbar styling, focus/reduced-motion defaults, and font variable pipeline. Files changed: `src/presentation/styles/globals.css`, `src/app/globals.css`, `src/app/layout.tsx`, `docs/modern-ui-refactor-status.md`.
- 2026-03-26: Phase 2 completed. Refreshed shared primitive depth, hierarchy, interaction states, and responsive behavior for buttons, cards, badges, modal, dropdown, and toast while preserving existing component APIs and accessibility labels/focus states. Files changed: `src/presentation/components/ui/Button.module.css`, `src/presentation/components/ui/Card.module.css`, `src/presentation/components/ui/Badge.module.css`, `src/presentation/components/ui/Modal.module.css`, `src/presentation/components/ui/Dropdown.module.css`, `src/presentation/components/feedback/Toast.module.css`, `docs/modern-ui-refactor-status.md`.
- 2026-03-26: Phase 3 completed. Modernized Projects home and project overview first-impression surfaces, improved hierarchy and CTA emphasis, and polished loading/empty/error presentation states while preserving behavior/navigation and responsive accessibility. Files changed: `src/app/page.module.css`, `src/presentation/features/projects/ProjectsHomePage.tsx`, `src/presentation/features/projects/ProjectsList.module.css`, `src/presentation/features/projects/ProjectsList.tsx`, `src/presentation/features/projects/ProjectCard.module.css`, `src/presentation/features/projects/ProjectCard.tsx`, `src/presentation/features/projects/ProjectOverviewPage.module.css`, `src/presentation/features/projects/ProjectOverviewPage.tsx`, `docs/modern-ui-refactor-status.md`.
- 2026-03-26: Phase 4 completed. Refreshed workspace shell surfaces and hierarchy across project detail and scenes, replaced emoji tab markers with Lucide icons, and improved tablet/mobile layout behavior while preserving existing navigation/workflows. Files changed: `src/presentation/features/projects/ProjectDetailPage/ProjectDetailPage.module.css`, `src/presentation/features/projects/ProjectDetailPage/components/TabNavigation.tsx`, `src/presentation/features/projects/ProjectDetailPage/components/CollectionsCardList.module.css`, `src/presentation/features/scenes/components/ScenesEditor.module.css`, `src/presentation/features/projects/ProjectDetailPage/ProjectDetailPage.tsx`, `docs/modern-ui-refactor-status.md`.
- 2026-03-26: Added a Monochrome + Accent style preview on the home experience (hero, empty state, and project cards) to evaluate alternate visual direction before continuing global rollout. Files changed: `src/app/page.module.css`, `src/presentation/features/projects/ProjectsList.module.css`, `src/presentation/features/projects/ProjectCard.module.css`, `docs/modern-ui-refactor-status.md`.
- 2026-03-26: Updated the home Monochrome + Accent preview to **Emerald accent** with route-scoped token overrides and neutralized background treatment for stricter monochrome presentation while keeping existing behavior intact. Files changed: `src/app/page.module.css`, `docs/modern-ui-refactor-status.md`.
- 2026-03-26: Adopted **Monochrome + Emerald Accent** as the global baseline across redesigned surfaces by updating shared theme tokens/atmosphere, reconciling home route overrides with global defaults, aligning projects/workspace/scenes modules to emerald-forward accents, and completing Phase 5 modal/form and collection-card consistency polish without behavior/API changes. Files changed: `src/presentation/styles/globals.css`, `src/app/page.module.css`, `src/presentation/features/projects/ProjectOverviewPage.module.css`, `src/presentation/features/projects/ProjectCard.module.css`, `src/presentation/features/projects/ProjectsList.module.css`, `src/presentation/features/projects/ProjectDetailPage/ProjectDetailPage.module.css`, `src/presentation/features/projects/ProjectDetailPage/components/CollectionsCardList.module.css`, `src/presentation/features/scenes/components/ScenesEditor.module.css`, `src/presentation/features/projects/ProjectCreateModal.module.css`, `src/presentation/features/collections/components/CollectionCreateModal.module.css`, `src/presentation/features/collections/components/PastedImageConfirmModal.module.css`, `src/presentation/features/collections/components/ChildCollectionCard.module.css`, `src/presentation/features/collections/components/CollectionItemCard.module.css`, `docs/modern-ui-refactor-status.md`.
- 2026-03-26: Removed decorative background flares (global and home-specific radial/glow layers) per user feedback to keep the monochrome + emerald theme cleaner and more restrained. Files changed: `src/presentation/styles/globals.css`, `src/app/page.module.css`, `docs/modern-ui-refactor-status.md`.
- 2026-03-26: Removed remaining flare-like gradients from the workspace left navbar and scenes surfaces for a flatter monochrome presentation. Files changed: `src/presentation/features/projects/ProjectDetailPage/ProjectDetailPage.module.css`, `src/presentation/features/scenes/components/ScenesEditor.module.css`, `docs/modern-ui-refactor-status.md`.
- 2026-03-26: Upgraded the collections generation widget UI from basic to modernized monochrome+emerald styling (improved panel hierarchy, segmented media toggle polish, refined select/input shells, elevated media target cards, and stronger action row/button treatment) without changing component behavior/API. Files changed: `src/presentation/features/collections/components/CollectionItemGenerationView/components/GenerationControlBar/GenerationControlBar.module.css`, `docs/modern-ui-refactor-status.md`.
- 2026-03-26: Modernized dropdown menu and select control styling for consistency with the monochrome+emerald design language (shared dropdown menu chrome + item states, generation control select affordance, project-create status select arrow treatment). Files changed: `src/presentation/components/ui/Dropdown.module.css`, `src/presentation/features/collections/components/CollectionItemGenerationView/components/GenerationControlBar/GenerationControlBar.module.css`, `src/presentation/features/projects/ProjectCreateModal.module.css`, `docs/modern-ui-refactor-status.md`.

## Current Focus

Actively executing: **Phase 6 - Validation and Stabilization**.

## Handoff Quick Start for New Agent

1. Read this document first.
2. Check git diff to see in-flight edits.
3. Continue the earliest phase marked `in_progress`.
4. After completing a phase:
   - Update phase status.
   - Add a Work Log entry with date and changed files.
   - Move the next phase to `in_progress`.

## Definition of Done

- All phases marked `completed`.
- Visual language is modern and consistent across major routes.
- Accessibility and responsive behavior are preserved.
- Validation commands pass or documented issues are listed with mitigation.
