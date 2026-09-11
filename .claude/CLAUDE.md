## Project Pommora

Pommora is Nathan’s main project — a personal management and all-in-one productivity app aimed at providing an extremely flexible, properties-based categorization framework through an inherently agentic-legible, local-first approach to create a true local-first, cross-domain organizational platform. Pommora's current structure is based on relating **Content** ↔ **Content** through *Connections*, with their attributes given through their **Collection's** schema-based **Properties,** and linking them all together through relationships to **Contexts.**

### The Model

**Contexts:** The organization layer — user-defined **Context** groups (the registry seeds Areas, Topics, and Projects as defaults) hold **Spaces**, the individual members Content entities can relate to, resolved through the registry via `<Title>:` fromt

**Content:** The operational layer — what you actually make, linked to each other through **Connections** for content ↔ content relations, and front-matter for content ↔ Space relations.

- **Collections & Sets:** a **Collection** is a folder that carries a shared property schema and saved views; it contains **Sets** as organizational subfolders that inherit that schema.
- **Pages:** Markdown documents inside a Collection or Set, conforming to its Collection's properties, identified via its `ID` key. Pages use MarkdownPM for its editor surface, which includes in-line connections to other pages.
- **Agenda:** the calendar layer — **Tasks** (reminder-shaped; located within `/Tasks`) and **Events** (calendar-shaped; located within `/Events`) — each as Markdown files distinguished via their id's kind mark and validated against their folder placement.
- **Properties:** the nexus-wide typed attributes that collections assign, and their members fill in — Select, Status, Date, and the rest; the schema is nexus-wide, collections validate properties for their pages to use; written as bare `Property`: so any application that reads frontmatter reads them.
- **Connections:** inline `[[Title]]` colored-text links inside MarkdownPM surfaces and resolve against an in-memory title map built from the page tree — connecting to another Page as the Content ↔ Content matrix. 

**Files are canonical for content.** Pages, Tasks, and Events are all Markdown carrying one `ID` key, the kind marked inside the ULID itself. Contexts and container sidecars are JSON. An entity's kind comes from an agreement between its folder's sidecar file and the file itself — contradictions are ignored.

### Codebase Information

**Pommora —**  `Core` (the app), `UIX` (the design kit), and `Desktop` (the Electron host), with `Mobile` + `Sync` as near-term priorities. **Stack —** electron-vite • Electron 42• React 19 • TypeScript 6 • Vite 7 + `@vitejs/plugin-react` 5 • Zustand • TanStack Virtual • YAML • vitest • `lucide-react` + `@tabler/icons-react`  as a secondary source to pull from per-icon. **MarkdownPM** — a CodeMirror 6 custom-build Markdown editor.

- **No dependency lock-in.** Every library sits behind a thin seam (SQLite behind `Desktop/Store/driver.ts`, YAML behind `pageFile.ts`, IDs behind `ids.ts`, glass behind `Surface`) so it's swappable without touching callers. Version numbers are compatibility pins, not endorsements.
- **The [Figma Library](https://www.figma.com/file/EBJXShPFA50yUwmBti452p)** is where the design presentation happens beforehand. The showcase website at [pommora-design-system](https://pommora-design-system.vercel.app) deploys from `Showcase/`  via `vercel.json`; it's the origin-synced showcase of the design system. The showcase is **never** a priority during development.

### Hard Rules

- **The host owns the machine.** Core reaches it only through `Core/Platform`; Desktop's implementation is the only place Node and Electron are called; UIX reaches nothing outside itself.
- **`Core/Contract` is the contract between any interface and any host.** Every channel is declared once in `bridge.ts`, and both sides derive from it; every channel answers with the `Result` envelope, and never throws across the boundary, so adding a channel is one entry and a mismatched end is a compile error.
- **The engine never depends on the renderer.** The host-run half of Core must never import React or depend on an interface — three gates go red the moment it does.
- **Read and write are cleanly separable.** The read path is read-only by construction; mutations are additive, never woven into reads.
- **Condensed control flow / DRY / simplicity-first** — model finite states as unions + switch, and hoist shared logic; duplication = debt, and repetition = regression.
- **Never do expensive work "on every X," never "reload the entire Y."** No O(N) / allocating / layout-reading work on a high-frequency trigger, and no full-nexus rebuild / re-walk when an incremental or cached update works — it’s *the* lag source.
- **Placeholders** never display build-status or meta text — an unbuilt surface is simply blank.
- **Ask before designing.** Stop to disclose assumptions and clarify direction before any design or interaction-based decision — present your implementation design first.
- **Most recent wins** is the primary philosophy around handling concurrency, cross-device, and external editing conflicts.
- **Don’t** waste time on screenshots, CDP driving, or DOM inspection to test something Nathan can see on his own — unless I’m asleep or specifically ask, don’t waste your efforts.
- **Don’t** treat comments as authoritative — a constraint a comment claims isn’t a law, and change-scoping shouldn’t treat them as fact.

#### Testing Conventions

- **The visual iteration scratchpad** — `Core/Interface/Windows/IterationWindow.tsx`, opened by ⌘⇧T, is for rapid iteration of an otherwise-scoped asset.
- **Gates**, all from the repo root. `npm run typecheck` is the *only* type gate — the build strips types unchecked — and it covers every `tsconfig` project. `npm run test` is Vitest; `npm run lint` is `biome check` and runs clean, so a change that adds a diagnostic or leaves a file unformatted isn't done. Formatting is Biome's (a PostToolUse hook formats every TS/CSS/JSON write; single quotes, no semicolons): never hand-align — an Edit failing on whitespace means Biome reformatted, so re-read and retry. A shell-driven edit bypasses the hook, which is why the gate checks it; `npm run format` repairs it.
- **Launch the GUI** by copy-pasting from the repo’s root:  `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`
-  `POMMORA_DEBUG_PORT` arms CDP; the `--remote-debugging-port` flag does not survive the hop into `Desktop`. The `env -u` is mandatory: this environment sets `ELECTRON_RUN_AS_NODE=1`, which makes Electron run as plain Node and the app crashes. 
- **Native context menus over CDP:** send a real right-click with Input.dispatchMouseEvent (button 'right', mousePressed then mouseReleased, at the target's box); a JS-dispatched contextmenu event never reaches main's context-menu listener. Dismiss with osascript 'tell application "System Events" to key code 53'.


### Locked Decisions

**Nothing is set in stone but these:** Every other decision — model, structure, vocabulary, interaction — is open to challenge and rework whenever an idea earns it. These decisions need explicit sign-offs to change; everything else needs only a good reason.

- **Reasonable Legibility:** The user's Nexus, its filesystem structure, and the general context of the content within it must be understandable through the filesystem structure itself, be reasonably app-agnostic, or clearly understood through a single user guide. 
- **Reasonable Translation:** The general structure of the file tree and on-disk data must be translatable between other filesystem-based applications. App-unique syntax is an acceptable per-case decision, but legibility concerns context, not every byte the app stores: per-machine operational info, accelerators, file metadata, or similar information may be better stored in the `nexus.db` rather than hand-editable data.

#### Important Information

- **Swift Origins:** Pommora was originally built in Swift for about a month before switching to TypeScript and React for better long-term maintainability. Its commits are archived on its own branch; `git log` reaches them directly.
- **Project Sapphire:** Sapphire is an Obsidian plugin and parallel sub-project that functions as the interim bridge between what Pommora will bring and what Nathan's current main system (Obsidian) actually offers in the meantime — subordinate to the daily Pommora grind — it brings similar capabilities to Obsidian and keeps NexusOS Pommora-compatible on a per-case basis.
- **NexusOS** is both an Obsidian vault *and* a Pommora Nexus — frontmatter appearing not to conform to Pommora's standards (e.g., bare `Areas:`, `Topics:`, `Projects:`, `Status:` etc.) isn't Pommora's concern; folders like `/Agenda`, even though Pommora pre-seeds `/Tasks` + `/Events`, aren't duplicates; they're temporary Obsidian fixtures until Pommora is completed.
- **Mobile Companion:** A mobile companion app is a near-term focus; it’s been discussed yet hasn’t been formally planned.

#### Codebase Structure


```
// Core              | • Pommora itself — every interface and its logic
├── // Actions       | • Context-menu commands and their row builders
├── // Assets        | • Images, icons, and file adoption
├── // Connections   | • Content ↔ content links and their rewriting
├── // Contexts      | • The Context registry, cascade, and resolution
├── // Contract      | • The interface ↔ host channel declaration
├── // Files         | • Atomic writes, page files, and sidecars
├── // Index         | • The content index and its seeding
├── // Interface     | • The application shell and its windows
├── // MarkdownPM    | • The CodeMirror Markdown editor
├── // Navigation    | • Nav views, the tab bar, and recents
├── // Nexus         | • Nexus admission, adoption, and cascade
├── // Pages         | • The page view, its header, and file history
├── // Paths         | • Path safety, exclusion, and disambiguation
├── // Platform      | • The only seam Core uses to reach the host
├── // Properties    | • Typed attributes and their editors
├── // Session       | • Store slices and per-tab state
├── // Settings      | • The settings window and its rows
├── // Testing       | • The shared test tree builder
├── // Tiles         | • The homepage and Space tile surfaces
├── // Trash         | • Deletion, bundling, and restore records
├── // Views         | • Collections rendered as views
└── // Web           | • Web link opening and guest partitions

// UIX               | • The design kit — reaches nothing outside itself
├── // Animations    | • Motion primitives and the shared slides
├── // Buttons
├── // Cards
├── // Controls      | • Checkbox, slider, and switches
├── // Elements      | • Small composed display parts
├── // Fields        | • Text input, search, and renamable labels
├── // Glass         | • The frosted and liquid surface recipes
├── // Interactions  | • Drag, drop, resize, autoscroll, activation, and the pointer harness
├── // Labels
├── // Menus         | • Menu frames and their growth and slide
├── // Pickers       | • The picker control and its typed variants
├── // Symbols       | • The curated icon registry
├── // Table         | • Shared table tokens and styles
├── // Theme         | • Color ramps, tokens, the caret, and theme variables
├── // Utilities     | • Small pure helpers
└── // Windows       | • Window chrome and bounds

// Desktop           | • The Electron host — the only caller of Node
// Mobile            | • The mobile companion
// Showcase          | • The deployed design-system showcase
// Sync              | • The cross-device sync layer
```
