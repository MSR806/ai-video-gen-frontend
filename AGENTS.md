# Agent Rules - Clean Architecture & Code Style

This project follows **Clean Architecture** principles to maintain strict separation of concerns.

---

## 🏛️ Architecture Principles

- **Separation of Concerns**: UI, Business Logic, and Data Fetching must be separate.
- **Dependency Rule**: Dependencies point inwards. Core does not depend on Infrastructure or Presentation.

---

## 📂 Architecture Layers

### 1. Core (`src/core`) - The "Inner Circle"

**Contains pure business logic and types. NO React code. NO Fetch calls.**

- Feature-first organization:
  - `domain/`: Entities and feature data contracts.
  - `ports/`: Repository interfaces.
  - `use-cases/`: Application actions and orchestration logic.

### 2. Infrastructure (`src/infrastructure`) - The "Adapters"

**Handles external data and services.**

- **Repositories**: Concrete implementations of Core Ports.
  - Usage: `fetch`, `axios`, or GraphQL calls happen here.
  - Example: `ApiTaskRepository` implements `TaskRepository`.

### 3. Presentation (`src/app` / `src/presentation`) - The "Outer Circle"

- **UI**: React Components, Pages.
- **Dependency Injection**: Entry points (Pages) wire up Implementation (Infra) to Logic (Core).

---

## 📂 Core Layer Structure (Feature-First)

**We use Feature-First organization** - each feature is self-contained:

```
src/core/
├── project/
│   ├── domain/              # project.entity.ts
│   ├── ports/               # project.repository.port.ts
│   ├── use-cases/           # get-all-projects.use-case.ts, etc.
│   └── index.ts             # Barrel export for public API
├── collection/
│   ├── domain/
│   ├── ports/
│   ├── use-cases/
│   └── index.ts
├── collection-item/
│   ├── data/                # camera-equipment.ts, etc.
│   ├── domain/
│   ├── ports/
│   ├── use-cases/
│   └── index.ts
├── scene/
│   └── ... (same structure)
└── index.ts                 # Unified export: project/collection/collection-item/scene
```

**Benefits**:

- Each feature is self-contained and easy to delete/modify
- Clear boundaries between features
- Scalable - add new features without cluttering shared folders
- Clean imports: `import { Project, GetProjectByIdUseCase } from '@core/project'`

---

## 📂 Infrastructure Layer Structure

```
src/infrastructure/
└── repositories/
    ├── project.repository.impl.ts      # ProjectRepositoryImpl
    ├── collection.repository.impl.ts   # CollectionRepositoryImpl
    ├── collection-item.repository.impl.ts # CollectionItemRepositoryImpl
    ├── scene.repository.impl.ts        # SceneRepositoryImpl
    └── index.ts                        # Barrel export
```

**Naming Convention**:

- Interface: `ProjectRepository` (in `@core/project/ports`)
- Implementation: `ProjectRepositoryImpl` (in `@infra/repositories`)
- File suffix: `.impl.ts` to distinguish from port files

---

## 📂 Presentation Layer Structure

```
src/presentation/
├── components/          # Shared/reusable components
│   ├── ui/              # Primitives (Button, Input, Card, Badge)
│   ├── layout/          # Layout components (Header, Sidebar, PageContainer)
│   └── feedback/        # Modals, Toasts, Loaders, Dialogs
├── features/            # Feature-specific components
│   ├── projects/        # Project workspace composition and page-level orchestration
│   ├── collections/     # Collection list, details, and collection-item UI
│   └── scenes/          # Plain-text scenes editor
├── hooks/               # Shared hooks used across features
└── styles/              # Global styles and design tokens
    └── globals.css      # CSS variables (Catppuccin Macchiato default)
```

**IMPORTANT**:

- `features/[feature]/components/` is allowed and preferred for non-trivial features.
- Keep shared generic UI in `presentation/components/`.
- Keep project-level composition in `features/projects/` while reusable domain UI lives in its own feature folder.

---

## 🧱 Component Rules

### When to Create a Component

| Scenario                                 | Location                            |
| ---------------------------------------- | ----------------------------------- |
| Used in **1-2 places** within a feature  | `features/[feature]/ComponentName/` |
| Used in **3+ places** OR across features | `components/ui/` or `components/`   |
| Pure layout with no logic                | `components/layout/`                |
| Feedback/overlay (modal, toast)          | `components/feedback/`              |

### Component File Structure

**Simple component** (single file):

```
Button.tsx
```

**Complex component** (multiple concerns):

```
Button/
├── Button.tsx           # Component implementation
├── Button.module.css    # Styles
├── Button.types.ts      # Props interface (if complex)
└── index.ts             # Re-export
```

### Component Categories

#### UI Primitives (`components/ui/`)

- **Stateless** — controlled via props
- **No business logic** — pure presentation
- **Composable** — accept `children`, forward `ref` when needed
- Examples: `Button`, `Input`, `Card`, `Badge`, `Avatar`, `Skeleton`

#### Layout Components (`components/layout/`)

- Handle page structure and responsive behavior
- Can manage layout-specific state (sidebar open/closed)
- Examples: `Header`, `Sidebar`, `PageContainer`, `Footer`

#### Feature Components (`features/[name]/`)

- Tied to a specific domain/feature
- Can import and execute Use Cases from `@core/[feature]`
- Can be imported by an orchestrator feature (for example `projects`) when composing the workspace UI
- Break down large components (>200 lines) into sub-components in a `components/` subfolder

---

## 🔌 Import Rules

| Layer                | Can Import From                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `components/ui/`     | Only `@presentation/styles`                                                               |
| `components/layout/` | `components/ui/`, `@presentation/styles`                                                  |
| `features/[x]/`      | `@core/*`, `components/*`, `hooks/*`, and feature-to-feature imports for page composition |
| `app/` (pages)       | Everything (this is the wiring layer)                                                     |

Prefer avoiding circular feature dependencies. If two features need the same generic component, move it to `components/`.

---

## 📝 Naming Conventions

| Type              | Convention                  | Example               |
| ----------------- | --------------------------- | --------------------- |
| Component files   | PascalCase                  | `TaskCard.tsx`        |
| Component folders | PascalCase                  | `TaskCard/`           |
| Hook files        | camelCase with `use` prefix | `useTaskList.ts`      |
| Utility files     | camelCase                   | `formatDate.ts`       |
| CSS Modules       | ComponentName.module.css    | `TaskCard.module.css` |
| Types/Props       | PascalCase + `Props` suffix | `TaskCardProps`       |

---

## 🎨 Styling Rules

### Color Management

- All colors are defined as **CSS custom properties** in `@presentation/styles/globals.css`
- Default theme direction is **Catppuccin Macchiato** through semantic tokens (not direct palette literals in components)
- Theme baseline was introduced in commit `460b2f4` (`feat: migrated to Catppuccin Macchiato theme`); preserve this palette unless a redesign is explicitly requested
- **Never use hardcoded hex values** in components — always use `var(--token-name)`
- Use semantic naming: `--bg-raised` not `--dark-gray`

### Color Token Hierarchy

- `--bg-*`: Background colors (base → raised → elevated)
- `--text-*`: Text colors (primary → secondary → muted)
- `--border-*`: Border colors (subtle → default → strong)
- `--accent-*`: Brand/action colors
- `--status-*`: Feedback colors (error, success, warning)
- `--overlay-*`: Media overlays, badge chips, and destructive hover layers
- `--shadow-*`: Elevation and accent glow shadows

### Dark Mode Guidelines

- Keep dark surfaces within the Catppuccin Macchiato ramp (`--bg-base` → `--bg-raised` → `--bg-elevated`)
- Never use pure black `#000` or pure white `#fff` in feature styles; use semantic tokens (`--bg-*`, `--text-*`, `--overlay-*`)
- Shadows need higher opacity (0.4-0.6) to be visible on dark backgrounds
- Use `--shadow-sm`, `--shadow-md`, `--shadow-lg`, and `--shadow-accent` tokens

### Iconography

- Use `lucide-react` as the default icon set for UI controls and status cues
- Prefer Lucide components over inline SVGs for common icons; use custom SVG only for brand-specific artwork
- Keep icon sizes consistent with surrounding controls (typically 16-20px) and style via CSS tokens

---

## 🛠️ Best Practices

### Type Safety

- Strict TypeScript is enabled.
- **Path Aliases**:
  - `@core/*`: Business logic
  - `@infra/*`: API clients/Adapters
  - `@presentation/*`: UI Components

### Testing

- Non-E2E tests run with `bun test`.
- Component tests use Happy DOM via Bun preload (`bunfig.toml` + `tests/setup/*`).
- E2E smoke tests run with Playwright via `bun run test:e2e`.
- Coverage reports are generated with `bun run test:coverage` (output: `coverage/lcov.info`).
- Test placement:
  - `src/**/**/*.test.ts` and `src/**/**/*.test.tsx` for unit/integration/presentation.
  - `tests/e2e/**/*.e2e.ts` for Playwright smoke tests.
- Tests must not depend on a live backend:
  - Unit/integration tests mock network boundaries.
  - E2E tests mock backend traffic (route interception + local mock backend support).
- **Focus**: Prioritize **Core Use Cases**, high-risk infrastructure adapters, route handlers, and complex UI orchestration flows.

---

## 🚨 Code Quality Rules

### No Inline Colors

- ❌ **Never** use inline hex/rgb/rgba values in feature code: `color: '#8aadf4'` or `style={{ color: '#fff' }}`
- ❌ **Never** mix with raw `black`/`white` in component styles when `color-mix()` is used; mix semantic tokens instead
- ✅ **Always** use CSS variables: `color: var(--accent-primary)` or `className={styles.text}`

### Modular UI

- Build **small, focused components**. Each component should do ONE thing well.
- If a component is doing too much, split it into smaller sub-components.
- Prefer **composition over configuration** — use `children` and slots instead of many props.

### File Size Limits

- **Components**: Keep under **150-200 lines**. If larger, extract sub-components.
- **Hooks**: Keep under **100 lines**. Extract helper functions if needed.
- **Utilities**: Keep each function under **50 lines**. Single responsibility.

### When to Extract a Component

| Signal                                    | Action                                  |
| ----------------------------------------- | --------------------------------------- |
| **Repeated JSX** in same file (2+ times)  | Extract to local component in same file |
| **Repeated JSX** across files (2+ places) | Extract to `components/`                |
| **Complex conditional rendering**         | Extract to separate component           |
| **Component file > 200 lines**            | Split into sub-components               |
| **Deeply nested JSX** (3+ levels)         | Extract inner pieces                    |

### Component Hygiene

- Each component file should have **one default export** (the component).
- Keep **props interfaces** at the top of the file or in a separate `.types.ts` file.
- **Avoid prop drilling** — if passing props through 3+ levels, consider context or composition.
- **Export types** that consumers need alongside the component.

---

## 📝 Workflow: Consuming a New API Endpoint

1. **Define Model**: Create entity in `@core/[feature]/domain/[feature].entity.ts`.
2. **Define Interface**: Create repository interface in `@core/[feature]/ports/[feature].repository.port.ts`.
3. **Implement Use Case**: Create logic in `@core/[feature]/use-cases/[action].use-case.ts`.
4. **Update Feature Export**: Add exports to `@core/[feature]/index.ts`.
5. **Implement API Call**: Create repository in `@infra/repositories/[feature].repository.impl.ts` using `fetch`.
6. **Connect UI**: Create page in `src/app`, instantiate the repo/use-case with dependency injection.

---

## 🔐 Git Commit Guidelines (Mandatory)

1. Commit preparation:

- Run commits from this repo root only (`ai-video-gen-frontend`).
- Check staged diff before commit (`git diff --staged`).

2. Required checks before commit:

- `bun run lint`
- `bun run build`
- `bun run test`
- `bun run test:e2e`

3. Hook policy:

- `.husky/pre-commit` runs `bunx lint-staged`, `bun run test`, and `bun run test:e2e`.
- Ensure Playwright browser binaries are installed locally (`bunx playwright install chromium`).
- Do not use `git commit --no-verify` unless the user explicitly asks.
- If a `.pre-commit-config.yaml` is added later, run `pre-commit run --all-files` before commit.

4. Commit message policy:

- Use Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`).
- Keep messages specific to the change set.

---

## 📚 Curated External Rules

Use the following curated rule packs for implementation and review. These are adapted from `vercel-labs/agent-skills` and intentionally reduced to high-impact items for this repository.

1. React + Next performance:

- `.agent/rules/react-next-performance.curated.md`

2. Component composition and decomposition:

- `.agent/rules/component-composition.curated.md`

3. UI/UX and accessibility checklist:

- `.agent/rules/web-ui-ux-a11y-checklist.md`

4. Frontend design direction (optional; net-new UI surfaces):

- `.agent/rules/frontend-design.curated.md`

### Precedence

- `AGENTS.md` remains the primary architecture and workflow policy.
- Curated rule packs are applied as supporting standards.
- If there is a conflict, follow `AGENTS.md` first.
- The frontend design direction pack is opt-in for major UI creation/redesign work.
