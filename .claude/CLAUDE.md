## Project Pommora

Pommora is a personal management app based on Nathan's frustration with modern productivity apps that excel in certain aspects but are absolutely terrible in others. Pommora's main leverage is taking the extremely flexible, properties-based categorization of Notion and the inherently agentic-legible, local-first approach used by Obsidian, aiming to create a true local-first, all-in-one productivity and organizational platform. Pommora's structure is based on relating **Content** ↔ **Content** through *Connections*, with their attributes given through their **Collection's** schema-based **Properties,** and linking them all together through relationships to **Contexts.**

### The Model

**Contexts:** The organization layer — user-defined **Context** groups (the registry seeds Areas, Topics, and Projects as defaults) holding **Spaces**, the individual members Content relates *to*. No Context contains or parents another; an entity tags whichever Spaces fit, resolved through the registry via parenthesized title keys in front-matter.

- **Areas:** broad life domains — Personal, Academics, Work.
- **Topics:** the subject areas within them — Productivity, Side Projects, Reading List.
- **Projects:** specific efforts — CS 161, Pommora, "Atomic Habits."

**Content:** The operational layer — what you actually make, linked to each other through **Connections** for content ↔ content relations, and front-matter for content ↔ Space relations.

- **Collections & Sets:** a **Collection** is a folder that carries a shared property schema and saved views; it contains **Sets** as organizational subfolders that inherit that schema.
- **Pages:** Markdown documents inside a Collection or Set, conforming to its Collection's properties, identified via its `PageID` key. Pages use MarkdownPM for its editor surface, which includes in-line connections to other pages.
- **Agenda:** the calendar layer — **Tasks** (reminder-shaped; keyed with `TaskID`; located within `/Tasks`) and **Events** (calendar-shaped; keyed with `EventID`; located within `/Events`) — each as Markdown files distinguished via their key and validated against their folder placement.
- **Properties:** the nexus-wide typed attributes that collections assign, and their members fill in — Select, Status, Date, and the rest; the schema is nexus-wide, collections validate properties for their pages to use.
- **Connections:** inline `[[Title]]` colored-text links that live in a Page's Markdown body (the canonical source) and resolve against an in-memory title map built from the page tree — connecting to another Page as the Content ↔ Content matrix. They **aren't** displayed in any container views *(tables, galleries, lists…)*, and content-to-content relational properties **don't** exist.

**Files are canonical for content.** Pages, Tasks, and Events are all markdown distinguishable via `PageID` / `TaskID` / `EventID`. Contexts and container sidecars are JSON. An entity's kind comes from an agreement between its folder's sidecar file and the file itself — a file whose key contradicts what its folder expects is Unknown: invisible, untouched, never stamped over. Foreign keys are preserved on every write. Agent-legibility of a user's Nexus, and future cloud-sync capability are core constructs for all development — but legibility concerns *context*, not every byte the app stores: per-machine operational info, helpers and accelerators, or derived caches belong in `nexus.db`, not in hand-editable and exposed JSON.

### Codebase Information

Pommora is an **Electron** desktop app — a **React + TypeScript** renderer over a Node main process that owns the filesystem. electron-vite · Electron 42 · React 19 · TypeScript 6 · Vite 7 + `@vitejs/plugin-react` 5 (compat pin — newer plugin-react needs Vite 8, which electron-vite doesn't support yet) · Zustand · TanStack Virtual · `react-markdown` + `remark-gfm` · `eemeli/yaml` · `lucide-react` (the curated icon registry — `design-system/symbols`; `@tabler/icons-react` stays installed as a second source to pull from per-icon) · Vitest. Editor: **MarkdownPM** — a CodeMirror 6 build behind a swappable editor seam. The codebase lives at `Pommora/` on the monorepo's main branch.

- **No dependency lock-in.** Every library sits behind a thin seam (SQLite behind `db//driver.ts`, YAML behind `pageFile.ts`, IDs behind `ids.ts`, glass behind `Surface`) so it's swappable without touching callers. Version numbers are compatibility pins, not endorsements.
- **Two menu surfaces, picked by gesture.** A right-click pops a native menu, built in `src/main` and popped over the typed channel its model declares; a click on a control that opens something richer — a picker, a text popup, a multi-pane drill — opens an in-house menu from `design-system/components/menu` and `PickerMenu`. Neither is a fallback for the other and neither converts into the other.
- **The Figma Library** (https://www.figma.com/file/fYZ5oiK7stC3diRhaBHl1r) is used for designing; its specifics may lag behind the canonical in-code view — mirror changes into the tokens at `design-system/tokens`. The live showcase deploys from `Pommora/` to https://pommora-design-system.vercel.app.
- **Gates.** `npm run typecheck` is the *only* type gate — the build strips types unchecked — and it covers both `tsconfig` projects. `npm run test` is Vitest; `npm run lint` is Biome and runs clean, so a change that adds a diagnostic isn't done → [[Lint-And-Accessibility]]. Formatting is Biome's as well (a PostToolUse hook formats every TS/CSS/JSON write; single-quote, no semicolons): never hand-align or run Biome yourself — an Edit failing on whitespace means Biome reformatted, so re-read and retry.

**Read Before Launching:** The GUI only launches with `ELECTRON_RUN_AS_NODE` **unset** (this env has it set to 1, which makes Electron run as plain Node → `require('electron')` returns a path string and the app crashes). Launch: `env -u ELECTRON_RUN_AS_NODE npm run dev` (HMR), or `… ./node_modules/.bin/electron .` after `npm run build`. `TEST_NEXUS_PATH` only steers tests, never the running app.

**Worktree Electron binary:** a worktree's `node_modules` is typically installed for the Vitest/Node gate only and **omits the Electron binary**, so the first `dev`/launch dies with `Error: Electron uninstall`. Fix: run `./node_modules/.bin/electron --version` once (downloads the binary), then relaunch. Kill any test instances once you're done with them — don't leave them running. Further traps live in [[Build-Gotchas]], which also covers the toolchain, chip components, and liquid glass.

### Hard Rules

- **Main owns the filesystem.** All fs/Node lives in `src/main`, exposed to the renderer only through a **narrow typed IPC** bridge in `src/preload` (contextBridge). The renderer never touches `fs`/Node.
- **`src/shared/types.ts` is the cross-process contract.** No fs, no React there. Both sides import it.
- **IPC never throws across the boundary** — data channels return the shared `Result` envelope (`{ ok: true, value } | { ok: false, error }`, the error structured with a code) and every channel is declared once in `src/shared/bridge.ts`; both sides derive from that map, so adding a channel is one entry and a mismatched end is a compile error.
- **Read and write are cleanly separable.** The read path is read-only by construction; mutations are additive, never woven into reads.
- **Condensed control flow / DRY / simplicity-first** — model finite states as unions + switch; hoist shared logic; never allow two writers or definitions for the same thing; anything that does this and is found must be reported. 
- **Never do expensive work "on every X," never "reload the entire Y."** No O(N) / allocating / layout-reading work on a high-frequency trigger, and no full rebuild / re-walk when an incremental or cached update works — cache, memoize, snapshot, subscribe narrowly. It's THE lag source.
- **Docs name; code holds exacts.** These docs describe the *system* and reference the product specifications — they never restate exact code values. Name the token and its treatment ("the red solid at a low opacity"), never the literal `#hex` / `%` / line-for-line code stays in the code itself. The same discipline must be held true equally to code comments. **The one sanctioned exception is the token atlas** — `DesignSystemPM.md` and the `SOURCE:`-tagged tables it charters across the feature specs state literal values on purpose, and `node scripts/check-atlas.mjs` (from `Pommora/`) verifies them against their sources.
- **Ask before designing.** Stop to disclose assumptions and clarify direction before any design or interaction-based decision — don't guess at how something looks or behaves. Any in-flight decisions must be disclosed as they’re being made.
- **Tokens must** be pulled from their sources in `design-system`— never hand-roll tokens without explicit direction; dual-option toggles must always use either switches or toggleable double-chevron; never dropdown pickers.

### Locked Decisions

**Nothing is set-in-stone but *reasonable* legibility.** Agent-legibility of a user's Nexus is the one inviolable construct. Every other decision — model, structure, vocabulary, interaction — is open to challenge and rework whenever an idea earns it; Pommora is Nathan's first project, and precedent is context, not constraint. Locked Decisions keep their sign-off protocol; everything else needs only a good argument.

- **CommonJS main/preload** (package is NOT `type: module`) — Electron's `require('electron')` fails on ESM named imports; CJS also lets the preload stay sandboxed. **`sandbox: true` + `contextIsolation: true` + `nodeIntegration: false`.**
- **Single-window now, multi-window-ready seams** — data is main-owned + Query/store-cached per renderer; the live-refresh bus is a swappable transport; windows identified by serializable refs. No global singleton holding shared mutable client state.
- **Most recent wins** is the primary philosophy around handling multi-tab, future cross-device, and outside editing conflicts.
- **TS-native on-disk format:** bare, natively typed values under wrapped title keys, zod-validated.

#### Important Information

- **Swift Origins:** The repository opened 05-10-2026 on specification alone, with React and Electron named as the initial direction and SwiftUI deferred. SwiftUI was chosen instead on 05-13 and carried the build for a month, defining the entire initial paradigm, before React was returned to as the long-term approach — the first TypeScript lands 06-14 in `823ee654`. The Swift source is archived at `// The Studio // Archive // Pommora`; its commits sit in this repository's own ancestry rather than on a separate branch, so `git log` reaches them directly.
- **Why This Matters:** The initial rebuild introduced now-obsolete Swift-based code; Swift compatibility is not a constraint — any code that may appear functional but is solely an artifact of its Swift origin must be flagged for removal.
- **Project Sapphire:** Sapphire is an Obsidian plugin and parallel sub-project that functions as the interim bridge between what Pommora will bring and what Nathan's current main system (Obsidian) actually offers in the meantime: it brings Pommora-style capabilities to Obsidian natively and keeps NexusOS Pommora-compatible, so Nathan's daily vault stays aligned as Pommora matures — at a light weekly cadence, subordinate to the daily Pommora grind.
- **NexusOS** is both an Obsidian vault *and* a Pommora nexus — frontmatter appearing not to conform to Pommora's standards (e.g., bare `Areas:`, `Topics:`, `Projects:`, `Status:` etc.) isn't Pommora's concern; folders like `/Agenda`, even though Pommora pre-seeds `/Tasks` + `/Events`, aren't duplicates; they're temporary Obsidian-functionality fixtures until Pommora is actually completed.

### Codebase Map
```
// Project Pommora                       | • Monorepo root — the app, its documentation, and deploy config
├── // .claude                           | • Project documentation and Claude configuration
│   ├── // Features                      | • Per-feature documentation, updated with every relevant commit
│   │   ├── [AgendaPM.md]                | • Tasks and Events — de-scaffolded; the plumbing that survives
│   │   ├── [ArchitecturePM.md]          | • The data layer — on-disk Nexus, reads, nexus.db, atomic writes, watcher
│   │   ├── [CardViewPM.md]              | • The Cards renderer — a resizable card grid on the view pipeline
│   │   ├── [CollectionsPM.md]           | • The schema-bearing tier and its sidecars
│   │   ├── [ConfigurationPM.md]         | • Per-Nexus personalization, labels, and profile
│   │   ├── [ConnectionsPM.md]           | • Inline title links — the sole connection syntax
│   │   ├── [ContextsPM.md]              | • The organization layer, its registry, and Context identity
│   │   ├── [DesignSystemPM.md]          | • The design system — the token atlas and the materials on it
│   │   ├── [InteractionPM.md]           | • The animation system — motion tokens and named aliases
│   │   ├── [MarkdownPM.md]              | • The in-house Markdown editor on a CodeMirror 6 substrate
│   │   ├── [NavigationPM.md]            | • Tabs, per-tab history, breadcrumbs, and nav search
│   │   ├── [NexusRecordPM.md]           | • Provenance and the deletion record in .trash
│   │   ├── [PagePreviewPM.md]           | • The floating, tab-neutral page window
│   │   ├── [PageSetsPM.md]              | • The recursive sub-container inside Collections
│   │   ├── [PagesPM.md]                 | • The Page entity — frontmatter, identity, property values
│   │   ├── [PommoraDND.md]              | • The in-house drag-and-drop engine
│   │   ├── [PropertiesPM.md]            | • The property system and the nexus-wide registry
│   │   ├── [QuickCapturePM.md]          | • Capture from outside the main window — a design, not a record
│   │   ├── [SidebarPM.md]               | • The ribbon and the content column that switches with it
│   │   ├── [StructurePM.md]             | • The two-layer, PARA-aligned organization
│   │   ├── [SubfieldPM.md]              | • The bottom bar of every content view
│   │   ├── [SurfacePM.md]               | • The composable dashboard layer of draggable tiles
│   │   ├── [SymbolsPM.md]               | • The curated semantic icon registry
│   │   ├── [TableViewPM.md]             | • The Table renderer over one shared CSS grid track set
│   │   ├── [TypographyPM.md]            | • The type system and its token source of truth
│   │   └── [ViewsPM.md]                 | • Saved presentations of a Collection — six modeled types
│   ├── // Guidelines                    | • Behavioral rules and hard-won traps, grouped by domain
│   │   ├── [Build-Gotchas.md]           | • Environment and toolchain traps — read before launching the GUI
│   │   ├── [Editor-Internals.md]        | • MarkdownPM's internal invariants — read before editing the editor
│   │   ├── [Lint-And-Accessibility.md]  | • The lint floor and the three rules disabled on purpose
│   │   └── [UI-Copy.md]                 | • The running app never displays build-status or meta text
│   ├── // Mobile                        | • The companion iPhone build — specs, architecture, sync
│   ├── // Resources                     | • Reference of external resources; both in-use and future prospectives.
│   ├── // Planning                      | • Plans and temporary specifications; contents are transient
│   └── // Sessions                      | • Session transcripts — filled by /handoff retirement or /transcribe
├── // Pommora                           | • The app — the codebase proper
│   ├── // src
│   │   ├── // main                      | • The Node main process — it alone touches the filesystem
│   │   │   ├── // connections           | • Link scanning, and rewriting them on rename
│   │   │   ├── // crud                  | • Mutations — writes, cascades, governed keys, options
│   │   │   ├── // db                    | • nexus.db — the driver seam, schema, device-local state
│   │   │   ├── // io                    | • Atomic writes, file locks, page and sidecar files, the walk
│   │   │   ├── // properties            | • The property registry's schema
│   │   │   ├── index.ts                 | • Main entry — window creation and app lifecycle
│   │   │   ├── ipc.ts                   | • The channel handlers sitting behind the bridge
│   │   │   ├── ids.ts                   | • The ULID seam
│   │   │   └── readNexus.ts             | • The read path — read-only by construction
│   │   ├── // preload                   | • The contextBridge — the renderer's only door into main
│   │   ├── // shared                    | • The cross-process contract — no fs, no React
│   │   │   ├── types.ts                 | • The contract both processes import
│   │   │   ├── bridge.ts                | • Every IPC channel declared once; both sides derive from it
│   │   │   ├── result.ts                | • The Result envelope IPC returns instead of throwing
│   │   │   └── schemas.ts               | • The zod schemas the on-disk format validates against
│   │   └── // renderer                  | • The React renderer — it never touches Node
│   │       └── // src
│   │           ├── // Blocks            | • Tile content for the dashboard layer
│   │           ├── // Components        | • Shared components — chips, icons, editable titles
│   │           ├── // Detail            | • The main pane — routed views, inspector, subfield, banner
│   │           ├── // Embeds            | • The embed framework's consumers
│   │           ├── // MarkdownPM        | • The editor — parser, tokens, decorations, input, tables
│   │           ├── // NavWindow         | • The standalone navigation window
│   │           ├── // Navigation        | • Tabs, history, breadcrumbs, search
│   │           ├── // PagePreview       | • The floating page window
│   │           ├── // Settings          | • The settings surface
│   │           ├── // Sidebar           | • The ribbon and its content column
│   │           ├── // SurfacePM         | • The dashboard engine — core and sensors
│   │           ├── // Tabs              | • The tabs + navigational overlays
│   │           ├── // Toolbar           | • The window toolbar
│   │           ├── // design-system     | • The design system
│   │           │   ├── // components    | • Design-system components — pickers, panes, fields
│   │           │   ├── // interactions  | • PommoraDND — the drag-and-drop engine
│   │           │   ├── // materials     | • Glass — surfaces, panes, windows, controls
│   │           │   ├── // showcase      | • The deployed component-library site
│   │           │   ├── // symbols       | • The curated icon registry — the primary glyph source
│   │           │   └── // tokens        | • Color, type, motion, chip — the token source of truth
│   │           ├── App.tsx              | • The shell — three panes and the routed surface
│   │           └── store.ts             | • The Zustand store holding renderer state
```
