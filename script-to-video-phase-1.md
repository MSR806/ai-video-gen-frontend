# Phase 1: Foundation (The Screenplay Editor) - Detailed Implementation

This document provides a detailed breakdown of Phase 1 of the Script-to-Video architecture. The primary goal of this phase is to construct a continuous, rich-text screenwriting environment that acts as a visual wrapper for underlying `Scene` entities.

## 1. Architectural Changes (Core Layer)

### 1.1 The "Screenplay is a Wrapper" Philosophy

We will **not** create a separate `Screenplay` database entity. The "Screenplay" is purely a UI presentation choice—a wrapper that makes the editing experience feel like a single continuous flowing document.

Under the hood, **the `Scene` entity is the single source of truth**. As the user writes, the continuous document is automatically sliced by sluglines (either on the fly or during autosave) and packaged into individual `Scene` records.

### 1.2 Updating the Scene Entity

We will update our `Scene` domain entity to act as a sequential container for its piece of the script content.

- **Location:** `src/core/scene/domain/scene.entity.ts`
- **Domain Entity Update:**

  ```typescript
  export interface Scene {
    id: string;
    projectId: string;
    sceneNumber: number; // Critical for ordering the scenes when displaying the full seamless screenplay
    content: any; // The JSON representation of the TipTap editor blocks for *just this scene*

    // Kept for AI Prompt Construction later:
    locationId: string;
    characterIds: string[];
  }
  ```

  _(Note: We will remove `description`, `objective`, and `duration` as they are now fully derived from the actual script content and shot data)._

## 2. Business Logic (Use Cases)

We need logic to bridge the continuous rich-text editor with our discrete `Scene` database records.

### 2.1 Parsing and Syncing the Editor

We need a Use Case that intercepts the continuous JSON tree from the editor, splits it by scenes, and updates the `scene.repository`.

- **Use Case:** `SyncScreenplayToScenesUseCase`
- **Location:** `src/core/scene/use-cases/`
- **Logic:**
  1.  Receives the massive continuous JSON document state from the UI editor.
  2.  Iterates through top-level nodes looking for standard `slugline` blocks (e.g., `INT. COFFEE SHOP - DAY`). Every slugline denotes the start of a new `Scene`.
  3.  It bundles the slugline and all subsequent action/dialogue blocks until the _next_ slugline into a single `content` object.
  4.  It assigns/updates the `sceneNumber` based on its physical top-to-bottom order in the editor.
  5.  It creates, updates, or deletes `Scene` records via the repository port to perfectly mirror the blocks present in the editor.

## 3. Storage (Infrastructure Layer)

### 3.1 Repositories

Because there is no "Screenplay" entity, we only need to interact with the existing Scene repos.

- **`SceneRepositoryImpl`:** Ensure the mock `save/update/delete` methods can handle batch operations efficiently, as the `SyncScreenplayToScenesUseCase` might update ordering for 10+ scenes dynamically just by the user inserting a new scene in the middle of the document.

## 4. UI Implementation (Presentation Layer)

### 4.1 Update Sidebar Navigation

- **File:** `src/presentation/features/projects/ProjectDetailPage/components/TabNavigation.tsx`
- **Change:** Replace the "Scenes" tab with two new tabs: "Screenplay" and "Shots".

### 4.2 The Screenplay Editor Component (The Wrapper)

This is the heaviest UI lift of Phase 1. We strongly recommend using **Tiptap** (a headless wrapper around ProseMirror). It will allow us to define custom node types that map strictly to our concepts while looking like a standard word processor.

- **Location:** `src/presentation/features/screenplay/components/ScreenplayEditor.tsx`
- **Initialization:** When the component mounts, it fetches all `Scenes` from the database, sorts them by `sceneNumber`, and concatenates their individual `content` block arrays into one massive array to feed to the Tiptap editor.
- **Tiptap Custom Nodes:**
  - `SluglineNode`: Styled bold, uppercase.
  - `ActionNode`: Standard Courier text, full width.
  - `CharacterNameNode`: Centered uppercase text.
  - `DialogueNode`: Centered text block with narrow margins, appearing directly after a CharacterNameNode.
- **Autosave Hook:** Implement a React hook (`useAutosaveScreenplay`) that debounces the editor's `onUpdate` event. Every time it debounces, it sends the _entire_ document JSON state to the `SyncScreenplayToScenesUseCase` for slicing and saving.

## 5. Phase 1 Completion Criteria

- [ ] User can click the "Screenplay" tab and see a blank, full-width text editor.
- [ ] User can type a slugline, action, character, and dialogue, and it visually formats like a standard screenplay.
- [ ] Automatically, behind the scenes, the document is sliced up by sluglines and saved as ordered `Scene` entities.
- [ ] If the user refreshes the page, the heavily-formatted screenplay text accurately loads back into the editor by perfectly concatenating the ordered `Scene` contents.
