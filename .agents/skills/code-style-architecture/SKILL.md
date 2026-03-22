---
name: code-style-architecture
description: Apply repository-specific clean architecture, layering boundaries, naming, styling, and delivery workflow rules.
trigger: always_on
---

# Code Style and Architecture Rules

## Purpose

Keep implementation aligned with this repository's clean architecture and code quality standards.

## When to Use This Skill

- Always on for coding tasks in this repository.
- Required when changing architecture boundaries, introducing new features, or wiring new API endpoints.

## Scope

- `src/core/**`
- `src/infrastructure/**`
- `src/presentation/**`
- `src/app/**`
- `src/**/*.test.ts` and `src/**/*.test.tsx`
- `tests/e2e/**/*.e2e.ts`

## Rules

1. Respect layer boundaries.

- Core contains pure domain entities, ports, and use-cases.
- Core must not depend on React, Next.js, or network clients.
- Infrastructure implements core ports and performs data access.
- Presentation handles UI and dependency injection.

2. Keep the core feature-first.

- Model features under `src/core/<feature>/`.
- Current feature set: `project`, `collection`, `collection-item`, and `scene`.
- Each feature should include `domain/`, `ports/`, `use-cases/`, and `index.ts`.
- Prefer imports like `@core/project` instead of deep relative paths.

3. Keep infrastructure adapters explicit.

- Define repository interfaces in `@core/*/ports`.
- Implement them in `src/infrastructure/repositories/*.impl.ts`.
- Keep adapter files focused on IO and mapping, not UI concerns.

4. Organize presentation by reuse level.

- Shared primitives belong in `src/presentation/components/ui`.
- Layout containers belong in `src/presentation/components/layout`.
- Feature-specific UI belongs in `src/presentation/features/<feature>`.
- `features/<feature>/components/` is allowed and preferred for non-trivial decomposition.

5. Follow import policy.

- `components/ui` imports only `@presentation/styles`.
- `components/layout` imports `components/ui` and `@presentation/styles`.
- `features/*` may import `@core/*`, `components/*`, `hooks/*`, and feature-to-feature modules for page composition.
- `src/app` is the wiring layer and may import from all layers.

6. Use design tokens instead of inline values.

- Colors must come from CSS variables in `globals.css`.
- Token typings belong in `@presentation/styles/tokens/colors.ts`.
- Do not add hardcoded hex/rgb values in components.

7. Keep components and hooks focused.

- Prefer composition over boolean mode flags.
- Extract repeated JSX and complex conditional blocks.
- Target limits: components 150-200 lines, hooks under 100 lines, utility functions under 50 lines.

8. Follow API endpoint integration workflow.

- Define entity in `@core/<feature>/domain`.
- Define repository port in `@core/<feature>/ports`.
- Implement use-case in `@core/<feature>/use-cases`.
- Export through `@core/<feature>/index.ts`.
- Implement repository adapter in `@infra/repositories`.
- Wire dependencies at app/page entry points.

9. Enforce testing and delivery checks.

- Unit and integration tests run with `bun test`.
- E2E smoke tests run with `bun run test:e2e`.
- Tests must not rely on a live backend.
- Before commit, run: `bun run lint`, `bun run build`, `bun run test`, `bun run test:e2e`.
- Use Conventional Commit messages (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`).

## Repo-specific Guidance

- Do not leak business logic into UI components.
- Prefer feature self-containment before introducing shared abstractions.
- Move UI to shared components only when reused across multiple features.
- Keep new work aligned with existing naming and folder conventions.

## Precedence

- `AGENTS.md` is the source of truth.
- If any rule conflicts with `AGENTS.md`, follow `AGENTS.md`.
- This skill complements, not overrides, curated feature skills.

## PR Checklist

- Are layer dependencies pointing inward as expected?
- Is any React/network logic leaking into core?
- Are imports compliant with layer rules?
- Were design tokens used instead of inline color values?
- Are large files decomposed by concern?
- Do required lint/build/test checks pass?
