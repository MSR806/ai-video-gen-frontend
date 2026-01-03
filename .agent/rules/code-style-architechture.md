---
trigger: always_on
---

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

- **Domain (`src/core/domain`)**: Application-wide data models (Entities).
- **Application (`src/core/application`)**:
  - **Use Cases**: Specific user actions (e.g., `CreateTaskUseCase`).
  - **Ports**: Interfaces defining _what_ data is needed (e.g., `TaskRepository`), but not _how_ to get it.

### 2. Infrastructure (`src/infrastructure`) - The "Adapters"

**Handles external data and services.**

- **Repositories**: Concrete implementations of Core Ports.
  - Usage: `fetch`, `axios`, or GraphQL calls happen here.
  - Example: `ApiTaskRepository` implements `TaskRepository`.

### 3. Presentation (`src/app` / `src/presentation`) - The "Outer Circle"

- **UI**: React Components, Pages.
- **Dependency Injection**: Entry points (Pages) wire up Implementation (Infra) to Logic (Core).

---

## 📂 Core Layer Structure

```
src/core/
├── domain/              # Entities (pure data models)
│   └── index.ts
└── application/
    ├── use-cases/       # Business logic (e.g., CreateTaskUseCase)
    │   └── index.ts
    └── ports/           # Repository interfaces (what, not how)
        └── index.ts
```

---

## 📂 Infrastructure Layer Structure

```
src/infrastructure/
└── repositories/        # Implements Core Ports (fetch/axios calls)
    └── index.ts
```

---

## 📂 Presentation Layer Structure

```
src/presentation/
├── components/          # Shared/reusable components
│   ├── ui/              # Primitives (Button, Input, Card, Badge)
│   ├── layout/          # Layout components (Header, Sidebar, PageContainer)
│   └── feedback/        # Modals, Toasts, Loaders, Dialogs
├── features/            # Feature-specific components
│   └── [feature-name]/  # e.g., tasks/, users/, settings/
│       ├── components/  # Components only used by this feature
│       └── hooks/       # Hooks only used by this feature
├── hooks/               # Shared hooks used across features
└── styles/              # Global styles and design tokens
    ├── tokens/
    │   └── colors.ts    # Color definitions
    └── globals.css      # CSS variables
```

---

## 🧱 Component Rules

### When to Create a Component

| Scenario                                 | Location                          |
| ---------------------------------------- | --------------------------------- |
| Used in **1-2 places** within a feature  | `features/[feature]/components/`  |
| Used in **3+ places** OR across features | `components/ui/` or `components/` |
| Pure layout with no logic                | `components/layout/`              |
| Feedback/overlay (modal, toast)          | `components/feedback/`            |

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

#### Feature Components (`features/[name]/components/`)

- Tied to a specific domain/feature
- Can import and execute Use Cases from `@core/`
- **Must NOT** be imported by other features

---

## 🔌 Import Rules

| Layer                | Can Import From                          |
| -------------------- | ---------------------------------------- |
| `components/ui/`     | Only `@presentation/styles`              |
| `components/layout/` | `components/ui/`, `@presentation/styles` |
| `features/[x]/`      | `@core/*`, `components/*`, `hooks/*`     |
| `app/` (pages)       | Everything (this is the wiring layer)    |

**Never import from one feature into another.** If two features need the same component, move it to `components/`.

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

- All colors are defined as **CSS custom properties** in `globals.css`
- TypeScript token definitions live in `@presentation/styles/tokens/colors.ts`
- **Never use hardcoded hex values** in components — always use `var(--token-name)`
- Use semantic naming: `--bg-raised` not `--dark-gray`

### Color Token Hierarchy

- `--bg-*`: Background colors (base → raised → elevated)
- `--text-*`: Text colors (primary → secondary → muted)
- `--border-*`: Border colors (subtle → default → strong)
- `--accent-*`: Brand/action colors
- `--status-*`: Feedback colors (error, success, warning)

### Dark Mode Guidelines

- Use 2-3 background shades max. Don't go pure black `#000`, use `#0a-#12` range
- Never use pure white `#fff` for text. Use `#f1f5f9` or similar
- Shadows need higher opacity (0.4-0.6) to be visible on dark backgrounds
- Use `--shadow-sm`, `--shadow-md`, `--shadow-lg` tokens

---

## 🛠️ Best Practices

### Type Safety

- Strict TypeScript is enabled.
- **Path Aliases**:
  - `@core/*`: Business logic
  - `@infra/*`: API clients/Adapters
  - `@presentation/*`: UI Components

### Testing

- `bun test` is used for high-performance unit testing.
- **Focus**: Test **Core Use Cases** to ensure business logic is correct independent of UI or API.

---

## 🚨 Code Quality Rules

### No Inline Colors

- ❌ **Never** use inline hex/rgb values: `color: '#6366f1'` or `style={{ color: '#fff' }}`
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

1. **Define Model**: Create entity in `@core/domain`.
2. **Define Interface**: Create repository interface in `@core/application/ports`.
3. **Implement Use Case**: Create logic in `@core/application/use-cases`.
4. **Implement API Call**: Create repository in `@infra/repositories` using `fetch`.
5. **Connect UI**: Create page in `src/app`, instantiate the repo/use-case, and call it.
