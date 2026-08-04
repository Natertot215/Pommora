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
- **Agenda:** the calendar layer — **Tasks** (reminder-shaped; keyed with `TaskID`; located within `/Tasks`) and **Events** (calendar-shaped; keyed with `EventID`; located within `/Events`) — each Markdown files distinguished via its key and validated against its folder placement.
- **Properties:** the nexus-wide typed attributes that collections assign, and their members fill in — Select, Status, Date, and the rest; the schema is nexus-wide, collections validate properties for their pages to use.
- **Connections:** inline `[[Title]]` colored-text links that live in a Page's Markdown body (the canonical source) and resolve against an in-memory title map built from the page tree — connecting to another Page as the Content ↔ Content matrix. They **aren't** displayed in any container views *(tables, galleries, lists…)*, and content-to-content relational properties **don't** exist.

**Files are canonical for content.** Pages, Tasks, and Events are all markdown distinguishable via `PageID` / `TaskID` / `EventID`. Contexts and container sidecars are JSON. An entity's kind comes from an agreement between its folder's sidecar file and the file itself — a file whose key contradicts what its folder expects is Unknown: invisible, untouched, never stamped over. Foreign keys are preserved on every write. Agent-legibility of a user's Nexus, and future cloud-sync capability are core constructs for all development — but legibility concerns *context*, not every byte the app stores: per-machine operational info, helpers and accelerators, or derived caches belong in `nexus.db`, not in hand-editable and exposed JSON.

### Codebase Information

Pommora is an **Electron** desktop app — a **React + TypeScript** renderer over a Node main process that owns the filesystem. electron-vite · Electron 42 · React 19 · TypeScript 6 · Vite 7 + `@vitejs/plugin-react` 5 (compat pin — newer plugin-react needs Vite 8, which electron-vite doesn't support yet) · Zustand · TanStack Virtual · `react-markdown` + `remark-gfm` · `eemeli/yaml` · `lucide-react` (the curated icon registry — `design-system/symbols`; `@tabler/icons-react` stays installed as a second source to pull from per-icon) · Vitest. Editor: **MarkdownPM** — a CodeMirror 6 build behind a swappable editor seam. The codebase lives at `Pommora/` on the monorepo's main branch.

- **No dependency lock-in.** Every library sits behind a thin seam (SQLite behind `db//driver.ts`, YAML behind `pageFile.ts`, IDs behind `ids.ts`, glass behind `Surface`) so it's swappable without touching callers. Version numbers are compatibility pins, not endorsements.
- **The Figma Library** (https://www.figma.com/file/fYZ5oiK7stC3diRhaBHl1r) is used for designing; its specifics may lag behind the canonical in-code view — mirror changes into the tokens at `design-system/tokens`. The live showcase deploys from `Pommora/` to https://pommora-design-system.vercel.app.
- **Gates.** `npm run typecheck` is the *only* type gate — the build strips types unchecked — and it covers both `tsconfig` projects. `npm run test` is Vitest; `npm run lint` is Biome and runs clean, so a change that adds a diagnostic isn't done → [[Lint-And-Accessibility]]. Formatting is Biome's as well (a PostToolUse hook formats every TS/CSS/JSON write; single-quote, no semicolons): never hand-align or run Biome yourself — an Edit failing on whitespace means Biome reformatted, so re-read and retry.

#### Run Gotcha (Read Before Launching)

The GUI only launches with `ELECTRON_RUN_AS_NODE` **unset** (this env has it set to 1, which makes Electron run as plain Node → `require('electron')` returns a path string and the app crashes). Launch: `env -u ELECTRON_RUN_AS_NODE npm run dev` (HMR), or `… ./node_modules/.bin/electron .` after `npm run build`. `TEST_NEXUS_PATH` only steers tests, never the running app.

**Worktree Electron binary:** a worktree's `node_modules` is typically installed for the Vitest/Node gate only and **omits the Electron binary**, so the first `dev`/launch dies with `Error: Electron uninstall`. Fix: run `./node_modules/.bin/electron --version` once (downloads the binary), then relaunch. Kill any test instances once you're done with them — don't leave them running. Further traps live in [[Build-Gotchas]], which also covers the toolchain, chip components, and liquid glass.

### Hard Rules

- **Main owns the filesystem.** All fs/Node lives in `src/main`, exposed to the renderer only through a **narrow typed IPC** bridge in `src/preload` (contextBridge). The renderer never touches `fs`/Node.
- **`src/shared/types.ts` is the cross-process contract.** No fs, no React there. Both sides import it.
- **IPC never throws across the boundary** — data channels return the shared `Result` envelope (`{ ok: true, value } | { ok: false, error }`, the error structured with a code) and every channel is declared once in `src/shared/bridge.ts`; both sides derive from that map, so adding a channel is one entry and a mismatched end is a compile error.
- **Read and write are cleanly separable.** The read path is read-only by construction; mutations are additive, never woven into reads.
- **Condensed control flow / DRY / simplicity-first** — model finite states as unions + switch; hoist shared logic.
- **Never do expensive work "on every X," never "reload the entire Y."** No O(N) / allocating / layout-reading work on a high-frequency trigger, and no full rebuild / re-walk when an incremental or cached update works — cache, memoize, snapshot, subscribe narrowly. It's THE lag source.
- **Never** reference plans, decision logs, or any other session-dependent phrasing in documentation or code comments.
- **Docs name; code holds exacts.** These docs describe the *system* and reference the product specifications — they never restate exact code values. Name the token and its treatment ("the red solid at a low opacity"), never the literal `#hex` / `%` / line-for-line code stays in the code itself. The same discipline must be held true equally to code comments.
- **Ask before designing.** Stop to disclose assumptions and clarify direction before any design or interaction-based decision — don't guess at how something looks or behaves. *Void when Nathan's unreachable:* proceed on the best record of his design wishes and the existing design logic, but disclose every such decision and assumption as you make it.
- **Tokens must** be pulled from their sources in `design-system` — never hand-roll tokens without explicit direction; dual-option menu toggles must always use either switches or toggleable double-chevron; never dropdown pickers.

### Locked Decisions

**Never** assume locked decisions are above questioning — never implement otherwise unless you explicitly state the conflicting state, find the evidence to support the change, and Nathan gives an explicit sign-off.

- **CommonJS main/preload** (package is NOT `type: module`) — Electron's `require('electron')` fails on ESM named imports; CJS also lets the preload stay sandboxed. **`sandbox: true` + `contextIsolation: true` + `nodeIntegration: false`.**
- **Single-window now, multi-window-ready seams** — data is main-owned + Query/store-cached per renderer; the live-refresh bus is a swappable transport; windows identified by serializable refs. No global singleton holding shared mutable client state.
- **Most recent wins** is the primary philosophy around handling multi-tab, future cross-device, and outside editing conflicts.
- **TS-native on-disk format:** bare, natively typed values under wrapped title keys, zod-validated.

#### Swift Origins

Pommora was first built as a native SwiftUI app — that build was active for around one month and designed and versioned the entire paradigm; React was initially an alternative contingency but was eventually determined to be the best long-term approach. The Swift build is archived at `// The Studio // Archive // Pommora` — source; its git history lives on the `swift` branch.

- **Why This Matters:** The initial rebuild brought along now obsolete swift-based code; swift-compatibility is not a constraint — any code that may appear functional but is solely an artifact of the swift origin must be flagged for removal.

#### Project Sapphire

**Sapphire** is an Obsidian plugin and parallel sub-project that functions as the interim bridge between what Pommora will bring and what Nathan's current main system (Obsidian) actually offers in the meantime: it brings Pommora-style capabilities to Obsidian natively and keeps NexusOS Pommora-compatible, so Nathan's daily vault stays aligned as Pommora matures — at a light weekly cadence, subordinate to the daily Pommora grind.

### Codebase Map
```
// [[Project Pommora]]                       | • Monorepo root — the app, its documentation, and deploy config
├── // [[.claude]]                           | • Project documentation and Claude configuration
│   ├── [[CLAUDE]]                           | • This file.
│   ├── [[Context]]                          | • Where things stand — required session-start reading
│   ├── [[Framework]]                        | • The road to v1.0.0 and what each version closes
│   ├── [[Handoff]]                          | • Session-continuity record, newest session first
│   ├── [[History]]                          | • Changelog and locked decisions, newest first
│   ├── [[PommoraPRD]]                       | • Vision, scope, and product decisions — stack-independent
│   ├── // [[Features]]                      | • Per-feature documentation, updated with every relevant commit
│   │   ├── [[AgendaPM]]                     | • Tasks and Events — de-scaffolded; the plumbing that survives
│   │   ├── [[ArchitecturePM]]               | • The data layer — on-disk Nexus, reads, nexus.db, atomic writes, watcher
│   │   ├── [[CardViewPM]]                   | • The Cards renderer — a resizable card grid on the view pipeline
│   │   ├── [[CollectionsPM]]                | • The schema-bearing tier and its sidecars
│   │   ├── [[ConfigurationPM]]              | • Per-Nexus personalization, labels, and profile
│   │   ├── [[ConnectionsPM]]                | • Inline title links — the sole connection syntax
│   │   ├── [[ContextsPM]]                   | • The organization layer, its registry, and Context identity
│   │   ├── [[DesignPM]]                     | • The design system — primitives and the semantic aliases on them
│   │   ├── [[InteractionPM]]                | • The animation system — motion tokens and named aliases
│   │   ├── [[MarkdownPM]]                   | • The in-house Markdown editor on a CodeMirror 6 substrate
│   │   ├── [[NavigationPM]]                 | • Tabs, per-tab history, breadcrumbs, and nav search
│   │   ├── [[NexusRecordPM]]                | • Provenance and the deletion record in .trash
│   │   ├── [[PagePreviewPM]]                | • The floating, tab-neutral page window
│   │   ├── [[PageSetsPM]]                   | • The recursive sub-container inside Collections
│   │   ├── [[PagesPM]]                      | • The Page entity — frontmatter, identity, property values
│   │   ├── [[PommoraDND]]                   | • The in-house drag-and-drop engine
│   │   ├── [[PropertiesPM]]                 | • The property system and the nexus-wide registry
│   │   ├── [[QuickCapturePM]]               | • Capture from outside the main window — a design, not a record
│   │   ├── [[SidebarPM]]                    | • The ribbon and the content column that switches with it
│   │   ├── [[StructurePM]]                  | • The two-layer, PARA-aligned organization
│   │   ├── [[SubfieldPM]]                   | • The bottom bar of every content view
│   │   ├── [[SurfacePM]]                    | • The composable dashboard layer of draggable tiles
│   │   ├── [[SymbolsPM]]                    | • The curated semantic icon registry
│   │   ├── [[TableViewPM]]                  | • The Table renderer over one shared CSS grid track set
│   │   ├── [[TypographyPM]]                 | • The type system and its token source of truth
│   │   └── [[ViewsPM]]                      | • Saved presentations of a Collection — six modeled types
│   ├── // [[Guidelines]]                    | • Behavioral rules and hard-won traps, grouped by domain
│   │   ├── [[Build-Gotchas]]                | • Environment and toolchain traps — read before launching the GUI
│   │   ├── [[Design-Sources]]               | • What the design system already owns, and never to duplicate it
│   │   ├── [[Lint-And-Accessibility]]       | • The lint floor and the three rules disabled on purpose
│   │   └── [[UI-Copy]]                      | • The running app never displays build-status or meta text
│   ├── // [[Mobile]]                        | • The companion iPhone build — specs, architecture, sync
│   ├── // [[Resources]]                     | • Forward-looking reference for work not yet built
│   │   ├── [[README]]                       | • Read the Resources folder as a menu, not a commitment
│   │   ├── [[Deployment]]                   | • The Vercel deploy — the showcase only, never the app
│   │   ├── [[Distribution]]                 | • Shipping a real build — signing, packaging, updates
│   │   ├── [[Libraries]]                    | • The vetted library menu, tagged by decision state
│   │   └── [[Mac-Integration]]              | • Where Electron lands on each macOS integration surface
│   ├── // [[Planning]]                      | • Plans and temporary specifications; contents are transient
├── // [[Pommora]]                           | • The app — the codebase proper
│   ├── // [[src]]
│   │   ├── // [[main]]                      | • The Node main process — it alone touches the filesystem
│   │   │   ├── // [[connections]]           | • Link scanning, and rewriting them on rename
│   │   │   ├── // [[crud]]                  | • Mutations — writes, cascades, governed keys, options
│   │   │   ├── // [[db]]                    | • nexus.db — the driver seam, schema, device-local state
│   │   │   ├── // [[io]]                    | • Atomic writes, file locks, page and sidecar files, the walk
│   │   │   ├── // [[properties]]            | • The property registry's schema
│   │   │   ├── [[index.ts]]                 | • Main entry — window creation and app lifecycle
│   │   │   ├── [[ipc.ts]]                   | • The channel handlers sitting behind the bridge
│   │   │   ├── [[ids.ts]]                   | • The ULID seam
│   │   │   └── [[readNexus.ts]]             | • The read path — read-only by construction
│   │   ├── // [[preload]]                   | • The contextBridge — the renderer's only door into main
│   │   ├── // [[shared]]                    | • The cross-process contract — no fs, no React
│   │   │   ├── [[types.ts]]                 | • The contract both processes import
│   │   │   ├── [[bridge.ts]]                | • Every IPC channel declared once; both sides derive from it
│   │   │   ├── [[result.ts]]                | • The Result envelope IPC returns instead of throwing
│   │   │   └── [[schemas.ts]]               | • The zod schemas the on-disk format validates against
│   │   └── // [[renderer]]                  | • The React renderer — it never touches Node
│   │       └── // [[src]]
│   │           ├── // [[Blocks]]            | • Tile content for the dashboard layer
│   │           ├── // [[Components]]        | • Shared components — chips, icons, editable titles
│   │           ├── // [[Detail]]            | • The main pane — routed views, inspector, subfield, banner
│   │           ├── // [[Embeds]]            | • The embed framework's consumers
│   │           ├── // [[MarkdownPM]]        | • The editor — parser, tokens, decorations, input, tables
│   │           ├── // [[NavWindow]]         | • The standalone navigation window
│   │           ├── // [[Navigation]]        | • Tabs, history, breadcrumbs, searchr
│   │           ├── // [[PagePreview]]       | • The floating page window
│   │           ├── // [[Settings]]          | • The settings surface
│   │           ├── // [[Sidebar]]           | • The ribbon and its content column
│   │           ├── // [[SurfacePM]]         | • The dashboard engine — core and sensors
│   │           ├── // [[Tabs]]              | • The tabs + navigational overlays.
│   │           ├── // [[Toolbar]]           | • The window toolbar
│   │           ├── // [[design-system]]     | • The design system.
│   │           │   ├── // [[components]]    | • Design-system components — pickers, panes, fields
│   │           │   ├── // [[interactions]]  | • PommoraDND — the drag-and-drop engine
│   │           │   ├── // [[materials]]     | • Glass — surfaces, panes, windows, controls
│   │           │   ├── // [[showcase]]      | • The deployed component-library site
│   │           │   ├── // [[symbols]]       | • The curated icon registry — the primary glyph source
│   │           │   └── // [[tokens]]        | • Color, type, motion, chip — the token source of truth
│   │           ├── [[App.tsx]]              | • The shell — three panes and the routed surface
│   │           └── [[store.ts]]             | • The Zustand store holding renderer state
```
