# Prograde Orion - Frontend Clean Architecture Template

This is a **Frontend-Only** application built with **Next.js** and **Bun**. It is designed to consume external backend APIs while maintaining a strict separation of concerns using **Clean Architecture**.

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)

### Installation

```bash
bun install
```

### Running the Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🏛️ Why Clean Architecture for Frontend?

In large frontend applications, tight coupling between UI components and API structures allows backend changes to break the UI easily.

We solve this by separating responsibilities:

1.  **UI Component**: "I need a list of tasks." (Doesn't care _how_ they are fetched).
2.  **Core (Use Case)**: "I will get the tasks and ensure they are valid."
3.  **Infrastructure (Repository)**: "I will fetch `/api/v1/tasks` and map the JSON to our internal Task model."

If the Backend API changes (e.g., field rename), you only update the **Repository**. The UI remains untouched.

## 📂 Architecture Layers

### 1. Core (`src/core`) - The "Inner Circle"

Contains pure business logic and types. **No React code. No Fetch calls.**

- **Domain (`src/core/domain`)**: Application-wide data models (Entities).
- **Application (`src/core/application`)**:
  - **Use Cases**: Specific user actions (e.g., `CreateTaskUseCase`).
  - **Ports**: Interfaces defining _what_ data we need (e.g., `TaskRepository`), but not _how_ to get it.

### 2. Infrastructure (`src/infrastructure`) - The "Adapters"

Handles the "dirty details" of the outside world.

- **Repositories**: Concrete implementations of Core Ports. This is where `fetch`, `axios`, or GraphQL calls happen.
  - _Example_: `ApiTaskRepository` implements `TaskRepository` by calling `GET /tasks`.

### 3. Presentation (`src/app` / `src/presentation`) - The "Outer Circle"

- **UI**: React Components, Pages.
- **Dependency Injection**: The entry points (Pages) wire up the implementation (Infra) to the logic (Core).

## 🛠️ Best Practices & Workflow

### 1. Type Safety

- Strict TypeScript is enabled.
- Path aliases:
  - `@core/*`: Business logic
  - `@infra/*`: API clients/Adapters
  - `@presentation/*`: UI Components

### 2. Code Quality

We use a suite of tools to ensure code quality **before** code is committed:

- **Husky** & **Lint-Staged**: Pre-commit checks.
- **Prettier**: Automatic formatting.
- **Commitlint**: Enforces [Conventional Commits](https://www.conventionalcommits.org/).

### 3. Testing

We use `bun test` for high-performance unit testing.

```bash
bun test
```

Focus usage: Test **Core Use Cases** to ensure business logic is correct independent of the UI or API availability.

## 📝 Workflow Example: Consuming a New API Endpoint

1.  **Define Model**: Create entity in `@core/domain`.
2.  **Define Interface**: Create repository interface in `@core/application/ports`.
3.  **Implement Use Case**: Create logic in `@core/application/use-cases`.
4.  **Implement API Call**: Create repository in `@infra/repositories` using `fetch`.
5.  **Connect UI**: Create page in `src/app`, instantiate the repo/use-case, and call it.
