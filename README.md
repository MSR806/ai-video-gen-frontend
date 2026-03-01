# AI Video Content Generator

A platform for creating, managing, and organizing AI-generated video content. The current model is built around projects, collections, collection items, and scenes.

## 🚀 Features

- **Project Management**: Create and track video projects with status workflows (Draft, In Progress, Completed).
- **Collections**: Organize project context into flexible collections with free-form tags.
- **Collection Items**: Upload or generate image/video items scoped to a selected collection.
- **Scenes Editor**: Edit plain-text scene cards with continuous scroll and autosave.
- **Interactive UI**: Desktop-focused project workspace for collections, scenes, and shots.

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules with Design Tokens (no Tailwind)
- **Architecture**: Clean Architecture (Feature-First Core)
- **Runtime**: Bun

## 🏗 Architecture

The project follows a **Feature-First Clean Architecture**:

- **Core** (`@core/*`): Pure business logic organized by feature (Project, Collection, CollectionItem, Scene).
- **Infrastructure** (`@infra/*`): Implementation details (API calls, Repositories).
- **Presentation** (`@presentation/*`): React components and UI logic.

## 🏁 Getting Started

1. **Install Dependencies**:

   ```bash
   bun install
   ```

2. **Configure Backend URL**:

   ```bash
   cp .env.example .env.local
   ```

3. **Run Development Server**:

   ```bash
   bun run dev
   ```

4. **Open Application**:
   Visit [http://localhost:3000](http://localhost:3000) inside your browser.

The frontend expects the backend API at `BACKEND_API_URL` (default `http://localhost:8000`).

## 📦 Project Structure

```bash
src/
├── app/                  # Next.js App Router pages
├── core/                 # Business logic (Entities, Use Cases, Ports)
│   ├── project/
│   ├── collection/
│   ├── collection-item/
│   └── scene/
├── infrastructure/       # Repository implementations
└── presentation/         # UI components and features
```
