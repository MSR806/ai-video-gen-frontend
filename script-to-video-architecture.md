# Product Concept: AI Video Generator - "Script to Screen"

## 1. The Core Philosophy

The beauty of screenwriting is in its simplicity—just a blank page where a writer tells a story. However, AI video models don't undestand "stories"; they understand highly specific, technical prompts about camera angles, environments, and physical character descriptions.

Our product bridges this gap in two distinct phases: The creative writing phase (where it functions like industry standard script software like Final Draft) and the technical direction phase (where the script is translated into AI prompts).

---

## 2. The User Journey & Interface Navigation

The entire creation workflow is anchored by a persistent sidebar with four main tabs: **Characters, Locations, Screenplay, and Shots**.

### Tab 1 & 2: World Building (Characters & Locations)

Before or during the writing process, the user establishes the physical parameters of their world.

- **Locations Tab:** The user creates scenes settings (e.g., "Coffee Shop"), uploading reference images or describing the cozy, dimly lit atmosphere.
- **Characters Tab:** The user creates the cast (e.g., "John" and "Sarah"), defining their ages, what they are wearing, and their physical appearances.

_Why this matters:_ By defining these globally in dedicated tabs, the system simply _knows_ who John is and what the Coffee Shop looks like. The user never has to repeat these physical descriptions in the script.

### Tab 3: The Scripting Phase (Screenplay)

When the user clicks the **Screenplay** tab, they enter a clean, continuous document editor designed to look and feel exactly like industry-standard screenplay software.

- The user types normally, telling their story from top to bottom.
- As they type, the system's "smart blocks" automatically format the text into the correct industry layout (Sluglines become bold `INT. COFFEE SHOP - DAY`, character names center themselves, dialogue follows underneath action).
- **Auto-Population:** Behind the scenes, the editor is intelligent. When the user types a new Slugline, the system automatically extracts it and populates the project database with a new `Scene`.
- The writer stays in the flow state, focused entirely on the narrative.

### Tab 4: The Directing Phase (Shots)

Once the screenplay is written, the user clicks over to the **Shots** tab. This is the visual storyboard where the written script is converted into directed camera angles.

1.  The layout shifts: A list of auto-extracted `Scenes` appears on the left (e.g., Scene 1: INT. COFFEE SHOP).
2.  The user selects a Scene. The relevant script text for that scene appears alongside an empty Storyboard.
3.  The user begins creating **Shots** to cover the scene's action and dialogue.

For each **Shot** created on the storyboard, the user defines:

- **Action Description:** What exactly happens in this 3-to-5 second window.
- **Location:** (Auto-populated from the Scene).
- **Camera Options:**
  - _Shot Size:_ (e.g., Extreme Close Up, Medium Shot, Wide Shot)
  - _Shot Type:_ (e.g., Over the Shoulder, Point of View)
  - _Camera Movement:_ (e.g., Static, Pan Left, Tracking, Zoom In)

### The Final Step: Action! (AI Generation)

While still in the **Shots** tab, the user clicks to **"Generate Scene"**.

The platform perfectly combines all the established data:

1.  It pulls the physical description of "John" from the **Characters** tab.
2.  It pulls the environment details from the **Locations** tab.
3.  It applies the user's chosen "Close Up" and "Pan Left" from the Shot card.
4.  It fires off a highly-engineered text prompt to the AI video model.

The storyboard cards fill in with actual generated video clips, which the user can then preview in a sequential Timeline view right there in the Shots tab. If a specific 3-second shot looks weird, the user can regenerate just that single shot card without affecting the rest of the scene.

---

## 3. Why Users Will Love This

- **Familiar Navigation:** The four tabs (Characters, Locations, Screenplay, Shots) perfectly mirror the mental model of pre-production, production, and directing.
- **Familiar Writing First:** Screenwriters love writing screenplays. By keeping the Screenplay tab continuous and formatted to industry standards, there is zero learning curve.
- **No Prompt Engineering Required:** Users never have to learn how to write complicated AI prompts. They just write a script and pick camera angles from a menu.
- **Painless Editing:** If the middle 4 seconds of a 30-second scene is bad, the user regenerates a single Shot card, not the whole movie.
