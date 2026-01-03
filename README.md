# AI Video Content Generator

A next-generation platform for creating, managing, and organizing AI-generated video content. This application assists creators in structuring their video projects with characters, locations, and scenes.

## 🚀 Features

- **Project Management**: Create and track video projects with status workflows (Draft, In Progress, Completed).
- **Character Hub**: Define detailed character profiles with roles, personality traits, and physical descriptions.
- **Location Scout**: Manage virtual filming locations with type (Interior/Exterior), lighting, and mood settings.
- **Scene Builder**: Organize narrative flows with detailed scene breakdowns, durations, and objectives.
- **Interactive UI**: Modern, glassmorphism-inspired interface with responsive design.

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules with Design Tokens (no Tailwind)
- **Architecture**: Clean Architecture (Feature-First Core)
- **Runtime**: Bun

## 🏗 Architecture

The project follows a **Feature-First Clean Architecture**:

- **Core** (`@core/*`): Pure business logic organized by feature (Project, Character, Location, Scene).
- **Infrastructure** (`@infra/*`): Implementation details (API calls, Repositories).
- **Presentation** (`@presentation/*`): React components and UI logic.

## 🏁 Getting Started

1. **Install Dependencies**:

   ```bash
   bun install
   ```

2. **Run Development Server**:

   ```bash
   bun run dev
   ```

3. **Open Application**:
   Visit [http://localhost:3000](http://localhost:3000) inside your browser.

## 📦 Project Structure

```bash
src/
├── app/                  # Next.js App Router pages
├── core/                 # Business logic (Entities, Use Cases, Ports)
│   ├── project/
│   ├── character/
│   ├── location/
│   └── scene/
├── infrastructure/       # Data Access & External Services
└── presentation/         # UI Components & Features
```
