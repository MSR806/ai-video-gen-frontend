# Implementation Plan: Script-to-Video

This document breaks down the "Script-to-Screen" technical architecture into a concrete, multi-phase implementation roadmap. We will follow the Feature-First Clean Architecture across the Core, Infrastructure, and Presentation layers.

---

## Phase 1: Foundation (The Screenplay Editor)

**Goal:** Build the continuous scripting experience. We need users to be able to write screenplays and have the system automatically extract the `Scene` data.

### 1A. Core & Infrastructure (Backend)

- [ ] Update `Scene` domain entity to include `sceneNumber` and `content` (JSON tree).
- [ ] Create `SyncScreenplayToScenesUseCase` (in `src/core/scene/use-cases`) to parse the massive continuous JSON document from the editor, slice it by `INT/EXT` sluglines, and bulk sync `Scene` records.
- [ ] Update `SceneRepositoryImpl` to handle bulk ordering/saving efficiently.

### 1B. Presentation (Frontend)

- [ ] Implement the new 4-tab Layout in `ProjectDetailPage` (`Characters | Locations | Screenplay | Shots`).
- [ ] Create `src/presentation/features/screenplay/ScreenplayEditor`.
- [ ] When the editor mounts, fetch all `Scenes` sorted by `sceneNumber`, concatenate their `content`, and load it into the Tiptap editor.
- [ ] Wire the editor to auto-save document state and trigger `SyncScreenplayToScenesUseCase` on a debounce hook.

---

## Phase 2: The Directing Engine (Shots & Storyboarding)

**Goal:** Implement the "Lock & Storyboard" phase where Scenes are broken down into explicitly directed Shots.

### 2A. Core & Infrastructure (Backend)

- [ ] Create `shot` feature module (`src/core/shot`).
- [ ] Define `Shot` domain entity (including `ShotSize` and `CameraMovement` enums).
- [ ] Define `ShotRepositoryPort`.
- [ ] Implement `ShotRepositoryImpl`.
- [ ] Create `ParseSceneShotsUseCase` to extract Action and Dialog blocks from a locked Scene's screenplay chunk and create initial drafting `Shot` entities.

### 2B. Presentation (Frontend)

- [ ] Create the `Shots` tab view (`src/presentation/features/shots`).
- [ ] Build `SceneSelectorSidebar` to list all extracted Scenes.
- [ ] Build the `ShotStoryboard` view.
- [ ] Build the editable `ShotCard` component (Action input, Camera Size dropdown, Camera Movement dropdown).
- [ ] Wire UI to fetch Shots for the selected Scene and update the `ShotRepository` on edits.

---

## Phase 3: The AI Pipeline (Generation)

**Goal:** Connect the structured Shot data to an external AI Video API to generate actual clips.

### 3A. Core & Infrastructure (Backend)

- [ ] Define `AIVideoProviderPort` in `src/core/shot/ports`.
- [ ] Implement `RunwayVideoApiImpl` (or similar provider) in `src/infrastructure/services`.
- [ ] Create `BuildVideoPromptUseCase` to assemble the ultimate prompt text: `[Location] + [Character traits] + [Action] + [Camera directives]`.
- [ ] Create `GenerateShotVideoUseCase` to handle the API call, status polling, and saving the result.
- [ ] _Update `AssetRepository`: Add `shot` to the `entityType` enum to store generated videos._

### 3B. Presentation (Frontend)

- [ ] Add the "Generate" button logic to `ShotCard`.
- [ ] Implement polling/status indicators (`DRAFT`, `GENERATING`, `COMPLETED`, `FAILED`) on the `ShotCard`.
- [ ] Link successful generations to display the video thumbnail/player within the `ShotCard`.

---

## Phase 4: The Premiere (Timeline Playback)

**Goal:** Stitch the individual Shot video assets together into a cohesive, sequential preview.

### 4A. Presentation (Frontend)

- [ ] Build `TimelinePreview` component at the bottom of the `Shots` tab.
- [ ] Query all `COMPLETED` shots for the active Scene sorted by `order`.
- [ ] Assemble the `assetId` video URLs into a sequential `<video>` playlist or utilizing a library like Remotion.
- [ ] Sync the dialogue (`content` from the Shot if it was a Dialog beat) as overlay subtitles during playback.

---

## Post-Phase Launch Requirements

- [ ] Ensure strict error handling for external AI API timeouts.
- [ ] Implement generic fallbacks if a user requests a Shot generation but hasn't defined physical character traits in the generic Character tab.
