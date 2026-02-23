# Technical Specification: Script-to-Video Architecture

This document maps the "Script to Screen" product concept into our Feature-First Clean Architecture structure. It outlines the new entities, use cases, and UI patterns required to implement the four-tab workflow (Characters, Locations, Screenplay, Shots).

---

## 1. Domain Layer (Core Entities)

The existing `Character` and `Location` entities remain the foundation. We are introducing two major conceptual models: the **Screenplay Document** and the **Shot**.

### A. The Screenplay Wrapper (No dedicated entity)

The continuous editor in the "Screenplay" tab represents a single document per Project. Rather than saving a massive text string or creating a separate `Screenplay` entity, the entire editor is a visual wrapper around the `Scene` entity.

When the user writes in the editor, the document is sliced by Sluglines (`INT. COFFEE SHOP`) and parsed into ordered `Scene` records.

```typescript
// src/core/scene/domain/scene.entity.ts
export interface Scene {
  id: string;
  projectId: string;
  sceneNumber: number; // Important for ordering the scenes when displaying the full seamless screenplay
  content: any; // The JSON representation of the TipTap editor blocks for *just this scene*

  // Kept for AI Prompt Construction later:
  locationId: string;
  characterIds: string[];
}
```

### B. The Shot Model (New Feature: `shot`)

A `Shot` is child of a `Scene` and represents a specific, renderable unit of video.

```typescript
// src/core/shot/domain/shot.entity.ts
export type ShotSize = 'EXTREME_CLOSE_UP' | 'CLOSE_UP' | 'MEDIUM' | 'WIDE' | 'EXTREME_WIDE';
export type CameraMovement =
  | 'STATIC'
  | 'PAN_LEFT'
  | 'PAN_RIGHT'
  | 'TILT_UP'
  | 'TILT_DOWN'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'TRACKING';
export type ShotStatus = 'DRAFT' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface Shot {
  id: string;
  sceneId: string;
  order: number;

  // Directorial Data
  actionDescription: string;
  duration: number; // e.g., 3s, 5s
  camera: {
    size: ShotSize;
    movement: CameraMovement;
  };
  characterIds: string[]; // Characters specifically visible in this shot

  // AI Generation Data
  status: ShotStatus;
  generationJobId?: string; // Reference to background job polling the AI API
  promptText?: string; // The exact engineered prompt sent to the AI

  // Result
  assetId?: string; // Reference to the generated video Asset ID
}
```

---

## 2. Application Layer (Use Cases & Ports)

### A. Screenplay Parsing

When the user edits the continuous Screenplay, the backend needs to slice the document by scene headings (`INT. COFFEE SHOP`) to automatically update the `SceneRepository`.

- **`SyncScreenplayToScenesUseCase`**: Takes the massive continuous JSON representation of the editor, extracts all text between Slugline blocks, and synchronizes them against the `SceneRepository`. It assigns a `sceneNumber` to each, creating or deleting `Scenes` as needed to perfectly match the editor.

### B. Storyboarding (The "Lock")

When the user moves to the Shots tab, they transition a Scene into a storyboard.

- **`InitializeSceneShotsUseCase`**: Takes a `Scene` ID and automatically parses the corresponding action/dialogue blocks from the screenplay text, creating initial drafting `Shot` entities in the `ShotRepository`.

### C. The AI Generation Pipeline

- **`Port: AIVideoProviderPort`**: An interface (`generateVideo(prompt: string): Promise<string>`) to be implemented in Infrastructure by a specific provider (e.g., `RunwayMLServiceImpl` or `LumaServiceImpl`).
- **`BuildVideoPromptUseCase`**:
  1. Fetches the `Shot`.
  2. Fetches the parent `Scene` and its associated `Location`.
  3. Fetches the `Character` entities associated with the Shot.
  4. Concatenates physical descriptions, location atmosphere, action text, and camera enums into a highly optimized text prompt.
- **`GenerateShotVideoUseCase`**: Orchestrates `BuildVideoPromptUseCase` and calls the `AIVideoProviderPort`. Sets Shot status to `GENERATING` and kicks off polling/webhook listening for completion.

---

## 3. Infrastructure Layer (Adapters)

- **Repositories**:
  - `ShotRepositoryImpl` (CRUD for Shot entities).
  - _Update `AssetRepositoryImpl`_: Add `shot` to the `entityType` enum to store generated videos.
- **External Services**:
  - `RunwayVideoApiImpl` (or similar): Implements `AIVideoProviderPort`. Handles API rate limits, authentication, and HTTP requests to the external generation service.

---

## 4. Presentation Layer (UI Architecture)

Following the Feature-First structure:

### Layout Elements

- **`SidebarNavigation`**: Contains the four main tabs mapping to routes or state (`/projects/[id]?tab=characters`, `...=locations`, `...=screenplay`, `...=shots`).

### The Screenplay Feature (`src/presentation/features/screenplay/`)

- **`ScreenplayEditor`**: A rich-text editor component. Highly recommended to use a framework like **TipTap** to enforce custom block types (Slugline, Action, Character, Dialogue) that force styling (Courier font, specific indents) to mimic standard scripts while maintaining valid JSON structure under the hood.

### The Shots Feature (`src/presentation/features/shots/`)

- **`SceneSelectorSidebar`**: A list of all Scenes parsed from the screenplay. Clicking one sets the active context.
- **`ShotStoryboard`**: The main view displaying the selected Scene's text alongside a vertical array of `ShotCard` components.
- **`ShotCard`**: A complex component that includes:
  - Text input for tweaking the Action Description.
  - UI primitives (`Dropdown` or `Select`) for Camera Size and Camera Movement.
  - A "Generate" button that calls the backend generation pipeline.
  - A video player (or thumbnail) that appears once the `assetId` is populated.
- **`TimelinePreview`**: A component at the bottom of the screen (perhaps built with Remotion or a standard `<video>` sequencer) that stitches together the `assetId` URLs for all `COMPLETED` shots in the scene to play them sequentially.
