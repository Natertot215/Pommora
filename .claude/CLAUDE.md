## Project Pommora

Pommora is Nathan’s main project — a personal management and all-in-one productivity app aimed at providing an extremely flexible, properties-based categorization framework through an inherently agentic-legible, local-first approach to create a true local-first, cross-domain organizational platform. The long-term vision is an alternative to cloud-based enterprise organizational and project management tools that provides local-first security, case-specific customization, and an agentic-accessible and advantaged platform. Pommora's current structure is based on relating **Content** ↔ **Content** through *Connections*, with their attributes given through their **Collection's** schema-based **Properties,** and linking them all together through relationships to **Contexts.**

### The Model

**Contexts:** The organization layer — user-defined **Context** groups (the registry seeds Areas, Topics, and Projects as defaults) hold **Spaces**, the individual members Content relates *to*. No Context contains or parents another; an entity tags whichever Spaces fit, resolved through the registry via parenthesized `(Title):` keys in frontmatter.

**Content:** The operational layer — what you actually make, linked to each other through **Connections** for content ↔ content relations, and front-matter for content ↔ Space relations.

- **Collections & Sets:** a **Collection** is a folder that carries a shared property schema and saved views; it contains **Sets** as organizational subfolders that inherit that schema.
- **Pages:** Markdown documents inside a Collection or Set, conforming to its Collection's properties, identified via its `PageID` key. Pages use MarkdownPM for its editor surface, which includes in-line connections to other pages.
- **Agenda:** the calendar layer — **Tasks** (reminder-shaped; keyed with `TaskID`; located within `/Tasks`) and **Events** (calendar-shaped; keyed with `EventID`; located within `/Events`) — each as Markdown files distinguished via their key and validated against their folder placement.
- **Properties:** the nexus-wide typed attributes that collections assign, and their members fill in — Select, Status, Date, and the rest; the schema is nexus-wide, collections validate properties for their pages to use; assigned as frontmatter via `<Property>:` syntax.
- **Connections:** inline `[[Title]]` colored-text links inside MarkdownPM surfaces and resolve against an in-memory title map built from the page tree — connecting to another Page as the Content ↔ Content matrix. They **aren't** displayed anywhere outside the Markdown body, and content-to-content relational properties **don't** exist.

**Files are canonical for content.** Pages, Tasks, and Events are all Markdown distinguishable via `PageID` / `TaskID` / `EventID`. Contexts and container sidecars are JSON. An entity's kind comes from an agreement between its folder's sidecar file and the file itself — a file whose key contradicts what its folder expects is Unknown: invisible, untouched, never stamped over. 

### Codebase Information

Pommora is an **Electron** desktop app — a **React + TypeScript** renderer over a Node main process that owns the filesystem. electron-vite · Electron 42 · React 19 · TypeScript 6 · Vite 7 + `@vitejs/plugin-react` 5  · Zustand · TanStack Virtual · `eemeli/yaml` · `lucide-react` (the curated icon registry — `DesignSystem/Symbols`; `@tabler/icons-react` stays installed as a second source to pull from per-icon) · Vitest. Editor: **MarkdownPM** — a CodeMirror 6 custom-build Markdown editor on the Pommora monorepo. 

- **No dependency lock-in.** Every library sits behind a thin seam (SQLite behind `db//driver.ts`, YAML behind `pageFile.ts`, IDs behind `ids.ts`, glass behind `Surface`) so it's swappable without touching callers. Version numbers are compatibility pins, not endorsements.
- **The Figma Library** (https://www.figma.com/file/fYZ5oiK7stC3diRhaBHl1r) is used for designing; the live showcase deploys from `Pommora/` to https://pommora-design-system.vercel.app.
- **Gates.** `npm run typecheck` is the *only* type gate — the build strips types unchecked — and it covers both `tsconfig` projects. `npm run test` is Vitest; `npm run lint` is `biome check` — the linter AND the formatter — and runs clean, so a change that adds a diagnostic or leaves a file unformatted isn't done → [[Lint-And-Accessibility]]. Formatting is Biome's (a PostToolUse hook formats every TS/CSS/JSON write; single-quote, no semicolons): never hand-align — an Edit failing on whitespace means Biome reformatted, so re-read and retry. A write that bypasses the hook (a shell-driven edit) bypasses the formatter, which is why the gate checks it; `npm run format` repairs one.
- **CommonJS main/preload** (package is NOT `type: module`) — Electron's `require('electron')` fails on ESM named imports; CJS also lets the preload stay sandboxed. **`sandbox: true` + `contextIsolation: true` + `nodeIntegration: false`.**
- **TS-native on-disk format:** bare, natively typed values under wrapped title keys, zod-validated.

**Read Before Launching:** The GUI only launches with `ELECTRON_RUN_AS_NODE` **unset** (this env has it set to 1, which makes Electron run as plain Node → `require('electron')` returns a path string and the app crashes). Launch: `env -u ELECTRON_RUN_AS_NODE npm run dev` (HMR), or `… ./node_modules/.bin/electron .` after `npm run build`. `TEST_NEXUS_PATH` only steers tests, never the running app.

**Worktree Electron binary:** a worktree's `node_modules` is typically installed for the Vitest/Node gate only and **omits the Electron binary**, so the first `dev`/launch dies with `Error: Electron uninstall`. Fix: run `./node_modules/.bin/electron --version` once (downloads the binary), then relaunch. Kill any test instances once you're done with them — don't leave them running.

### Hard Rules

- **Main owns the filesystem.** All fs/Node lives in `src/main`, exposed to the renderer only through a **narrow typed IPC** bridge in `src/preload` (contextBridge). The renderer never touches `fs`/Node.
- **`src/shared/types.ts` is the cross-process contract.** No fs, no React there. Both sides import it.
- **IPC never throws across the boundary** — data channels return the shared `Result` envelope (`{ ok: true, value } | { ok: false, error }`, the error structured with a code) and every channel is declared once in `src/shared/bridge.ts`; both sides derive from that map, so adding a channel is one entry and a mismatched end is a compile error.
- **Read and write are cleanly separable.** The read path is read-only by construction; mutations are additive, never woven into reads.
- **Condensed control flow / DRY / simplicity-first** — model finite states as unions + switch; hoist shared logic; never allow two writers or definitions for the same thing; anything that does this and is found must be reported. 
- **Never do expensive work "on every X," never "reload the entire Y."** No O(N) / allocating / layout-reading work on a high-frequency trigger, and no full-nexus rebuild / re-walk when an incremental or cached update works — it’s *the* lag source.
- **Placeholders** never display build-status or meta text — an unbuilt surface is simply blank.
- **Ask before designing.** Stop to disclose assumptions and clarify direction before any design or interaction-based decision — don't guess at how something looks or behaves; the codebase usually describes something that already exists. Any in-flight decisions must be disclosed as they’re being made.
- **Tokens must** be pulled from their sources in `/DesignSystem` — never hand-roll tokens without explicit direction; what you're looking for almost *always* already exists. 
- **Most recent wins** is the primary philosophy around handling concurrency, cross-device, and external editing conflicts.

### Locked Decisions

The decisions that need explicit sign-off to change live at the bottom of [[PommoraPRD]] §Locked Decisions; everything else needs only a good reason.

#### Important Information

- **Swift Origins:** Pommora was originally built in Swift for about a month before switching to an Electron + TypeScript + React architecture for better long-term maintainability. The Swift source is archived at `// The Studio // Archive // Pommora`; its commits sit in this repository's own ancestry rather than on a separate branch, so `git log` reaches them directly.
- **Project Sapphire:** Sapphire is an Obsidian plugin and parallel sub-project that functions as the interim bridge between what Pommora will bring and what Nathan's current main system (Obsidian) actually offers in the meantime — subordinate to the daily Pommora grind — it brings similar capabilities to Obsidian and keeps NexusOS Pommora-compatible on a per-case basis.
- **NexusOS** is both an Obsidian vault *and* a Pommora nexus — frontmatter appearing not to conform to Pommora's standards (e.g., bare `Areas:`, `Topics:`, `Projects:`, `Status:` etc.) isn't Pommora's concern; folders like `/Agenda`, even though Pommora pre-seeds `/Tasks` + `/Events`, aren't duplicates; they're temporary Obsidian-functionality fixtures until Pommora is actually completed.

### Codebase Map
```
// Project Pommora                       | • Monorepo root — the app, its documentation, and deploy config
├── // .claude                           | • Project documentation and Claude configuration
│   ├── // Features                      | • Per-feature documentation, updated with every relevant commit
│   │   ├── [ArchitecturePM.md]          | • The whole-app architecture guide — processes, data layer, boundary, renderer
│   │   ├── [CollectionsPM.md]           | • The schema-bearing tier, its Sets, and their sidecars
│   │   ├── [ConfigurationPM.md]         | • The one roster of every knob — Nexus, Collection, Page, device
│   │   ├── [ConnectionsPM.md]           | • Page-to-page links in both syntaxes, the link menu, autocomplete
│   │   ├── [ContextsPM.md]              | • The organization layer, its registry, and Context identity
│   │   ├── [DesignSystemPM.md]          | • The design system — the one-look ledger of tokens, materials, and components
│   │   ├── [InteractionPM.md]           | • The named motions and the interaction primitives
│   │   ├── [InterfacePM.md]             | • The shell's surfaces — toolbar, sidebar, subfield, floating windows, hover card
│   │   ├── [MarkdownPM.md]              | • The in-house Markdown editor on a CodeMirror 6 substrate
│   │   ├── [NavigationPM.md]            | • The navigation layer, tabs, per-tab history, and NavView
│   │   ├── [NexusRecordPM.md]           | • Provenance and the deletion record in .trash
│   │   ├── [PagesPM.md]                 | • The Page entity — frontmatter, identity, the creation act
│   │   ├── [PommoraDND.md]              | • The in-house drag-and-drop engine
│   │   ├── [PropertiesPM.md]            | • The property system and the nexus-wide registry
│   │   ├── [SurfacePM.md]               | • The dashboard layer of draggable tiles, and the embed framework
│   │   ├── [SymbolsPM.md]               | • The curated semantic icon registry
│   │   ├── [ViewTypesPM.md]             | • Saved presentations of a Collection — the pipeline and each view type
│   │   └── [WebviewPM.md]               | • The web layer — webpage embeds, the browser, sessions, hover previews
│   ├── // Guidelines                    | • Behavioral rules and hard-won traps, grouped by domain
│   │   ├── [Build-Gotchas.md]           | • Environment and toolchain traps — read before launching the GUI
│   │   ├── [Cohesion-Rulings.md]        | • What a sweep re-derives wrongly, and what to stop re-proposing
│   │   ├── [Editor-Internals.md]        | • MarkdownPM's internal invariants — read before editing the editor
│   │   ├── [Lint-And-Accessibility.md]  | • The lint floor and the three rules disabled on purpose
│   │   └── [Web-Guests.md]              | • Webview guest traps — read before touching any web surface
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
│   │           ├── // SurfacePM         | • The tile-based dashboard engine
│   │           ├── // Tabs              | • The tabs + navigational overlays
│   │           ├── // Toolbar           | • The window toolbar
│   │           ├── // DesignSystem      | • The design system — DesignSystemPM is its ledger
│   │           │   ├── // Tokens        | • Color, type, geometry — the token source of truth
│   │           │   ├── // Materials     | • Glass — surfaces, panes, windows, controls
│   │           │   ├── // Labels        | • Labels and chips
│   │           │   ├── // Elements      | • The atomic bits — outline, chevron, trail, segment
│   │           │   ├── // Components    | • Controls, pickers, menus, fields
│   │           │   ├── // Detail        | • The composite shells — preview and side panes
│   │           │   ├── // Interactions  | • PommoraDND and the pointer/scroll layer
│   │           │   ├── // Animation     | • Motion tokens, the feel, and the enter/exit primitives
│   │           │   ├── // Symbols       | • The curated icon registry — the primary glyph source
│   │           │   └── // Showcase      | • The deployed component-library site
│   │           ├── App.tsx              | • The shell — three panes and the routed surface
│   │           └── store.ts             | • The Zustand store holding renderer state
```
