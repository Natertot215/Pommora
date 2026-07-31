## Project Pommora

Pommora is a personal management app based on Nathan’s frustration with modern productivity apps that excel in one aspect but are absolutely terrible in others. Pommora’s main leverage is taking the extremely flexible, properties-based categorization of Notion and the inherently agentic-legible, local-first approach used by Obsidian, aiming to create a true local-first, all-in-one productivity and organizational platform. Pommora’s structure is based on relating **Content** ↔ **Content** through *Connections*, with their attributes given through their **Collection’s** schema-based **Properties,** and linking them all together through relationships to **Contexts.** 

**Contexts:** The organization layer — user-defined **Context** groups (a registry seeds Areas, Topics, and Projects as ordinary entries) holding **Spaces**, the individual members Content relates *to*. No Context contains or parents another; an entity tags whichever Spaces fit.

- **Areas:** broad life domains — Personal, Academics, Work.
- **Topics:** the subject areas within them — Productivity, Side Projects, Reading List. 
- **Projects:** specific efforts — CS 161, Pommora, "Atomic Habits." 

**Content:** The operational layer — what you actually make, linked to each other through **Connections** for content ↔ content relations, and with **Front-matter** for content ↔ Space relations. 

- **Collections & Sets:** a **Collection** is a folder that carries a shared property schema and saved views; it nests Sets to any depth as organizing subfolders that inherit that schema.
- **Pages:** Markdown documents inside a Collection or Set, conforming to its Collection’s properties. Pages use MarkdownPM for its editor surface, which includes in-line connections to other pages. 
- **Agenda:** the calendar layer — **Tasks** (reminder-shaped) and **Events** (calendar-shaped), each with a built-in Status.
- **Properties:** the nexus-wide typed attributes that collections inherit, and their members fill in — Select, Status, Date, and the rest; the schema is nexus-wide, collections validate properties for their pages to use. 
- **Connections:** inline `[[Title]]` colored-text links that live in a Page's Markdown body (the canonical source) and resolve against an in-memory title map built from the page tree — connecting to another Page as the Content ↔ Content matrix.

**Files are canonical for content.** Pages, Tasks and Events are all `.md` (YAML frontmatter + body); Contexts and container sidecars are JSON. An entity's kind comes from its folder's sidecar, never the extension — and a content file must AGREE, storing its id under the key that names its kind (`PageID` / `TaskID` / `EventID`). A file whose key contradicts its folder is Unknown: invisible, untouched, never stamped over. Foreign keys are preserved on every write. Agent-legibility of a user's Nexus, and future cloud-sync capability are core constructs for all development — but legibility is a claim about *content*, not about every byte the app stores: per-machine chrome and derived caches belong in `nexus.db`, not in hand-readable JSON, and the line for content runs at assignment — a property definition may move there, an assignment or a value may not. A **content** index — the one Linked-From, backlinks and full-text search all wait on — is unbuilt, and gets written alongside the query layer that reads it.

### Stack

Pommora is an **Electron** desktop app — a **React + TypeScript** renderer over a Node main process that owns the filesystem. electron-vite · Electron 42 · React 19 · TypeScript 6 · Vite 7 + `@vitejs/plugin-react` 5 (compat pin — newer plugin-react needs Vite 8, which electron-vite doesn't support yet) · Zustand · TanStack Virtual · `react-markdown` + `remark-gfm` · `eemeli/yaml` · `lucide-react` (the curated icon registry — `design-system/symbols`; `@tabler/icons-react` stays installed as a second source to pull from per-icon) · Vitest. Editor: **MarkdownPM** — a CodeMirror 6 build behind a swappable editor seam. The codebase lives at `Pommora/` on the monorepo's main branch.

**No dependency lock-in.** Every library sits behind a thin seam (SQLite behind `db//driver.ts`, YAML behind `pageFile.ts`, IDs behind `ids.ts`, glass behind `Surface`) so it's swappable without touching callers. Version numbers are compatibility pins, not endorsements.

**The Figma Library** (https://www.figma.com/file/fYZ5oiK7stC3diRhaBHl1r) is used for designing; its specifics may lag behind the canonical in-code vie— mirror changes into the tokens at `/design-system.` The live showcase deploys from `Pommora/` to https://pommora-design-system.vercel.app.

### Hard Rules

- **Main owns the filesystem.** All fs/Node lives in `src/main`, exposed to the renderer only through a **narrow typed IPC** bridge in `src/preload` (contextBridge). The renderer never touches `fs`/Node.
- **`src/shared/types.ts` is the cross-process contract.** No fs, no React there. Both sides import it.
- **IPC never throws across the boundary** — data channels return the shared `Result` envelope (`{ ok: true, value } | { ok: false, error }`, the error structured with a code) and every channel is declared once in `src/shared/bridge.ts`; both sides derive from that map, so adding a channel is one entry and a mismatched end is a compile error.
- **Read and write are cleanly separable.** The read path is read-only by construction; mutations are additive, never woven into reads.
- **Condensed control flow / DRY / simplicity-first** — model finite states as unions + switch; hoist shared logic; don't add unrequested complexity.
- **Never do expensive work "on every X," never "reload the entire Y."** No O(N) / allocating / layout-reading work on a high-frequency trigger, and no full rebuild / re-walk when an incremental or cached update works — cache, memoize, snapshot, subscribe narrowly. It's THE lag source.
- **Never** reference plans, decision logs, or any other session-dependent phrasing in documentation or code comments.
- **Never** assume locked decisions are above questioning — never implement otherwise unless you explicitly state the conflicting state, find the evidence to support the change, and Nathan gives an explicit sign-off. 
- **Docs name; code holds exacts.** These docs describe the *system* and reference the product specifications — they never restate exact code values. Name the token and its treatment ("the red solid at a low opacity"), never the literal `#hex` / `%` / line-for-line code stays in the code itself. The same discipline must be held true equally to code comments.

#### Design Rules

- **Dual-option** menu toggles must always use either switches or toggleable double-chevron; never dropdown pickers.
- **Tokens must** be pulled from their sources in `design-system` — never hand-roll tokens without explicit direction. 

### Working Discipline

- **Ask before designing.** Stop to disclose assumptions and clarify direction before any design or interaction-based decision — don't guess at how something looks or behaves. *Void when Nathan's unreachable:* proceed on the best record of his design wishes and the existing design logic, but disclose every such decision and assumption as you make it.

### Locked Decisions

- **CommonJS main/preload** (package is NOT `type: module`) — Electron's `require('electron')` fails on ESM named imports; CJS also lets the preload stay sandboxed. **`sandbox: true` + `contextIsolation: true` + `nodeIntegration: false`.**
- **Single-window now, multi-window-ready seams** — data is main-owned + Query/store-cached per renderer; the live-refresh bus is a swappable transport; windows identified by serializable refs. No global singleton holding shared mutable client state.
- **Most recent wins** is the primary philosophy around handling multi-tab, future cross-device, and outside editing conflicts.
- **TS-native on-disk format** (bare, natively-typed values under wrapped title keys, zod-validated) — built and tested against a dedicated **test nexus at `~/test`** (override via `TEST_NEXUS_PATH`).

### Run Gotcha (Read Before Launching)

The GUI only launches with `ELECTRON_RUN_AS_NODE` **unset** (this env has it set to 1, which makes Electron run as plain Node → `require('electron')` returns a path string and the app crashes). Launch: `env -u ELECTRON_RUN_AS_NODE npm run dev` (HMR), or `… ./node_modules/.bin/electron .` after `npm run build`. `TEST_NEXUS_PATH` only steers tests, never the running app. Full notes in `Guidelines/Build-Gotchas.md`.

**Worktree Electron binary:** a worktree's `node_modules` is typically installed for the Vitest/Node gate only and **omits the Electron binary**, so the first `dev`/launch dies with `Error: Electron uninstall`. Fix: run `./node_modules/.bin/electron --version` once (downloads the binary), then relaunch.

### Important Information 

- **Formatting is Biome's** (a PostToolUse hook formats every TS/CSS/JSON write; single-quote, no semicolons): never hand-align or run Biome yourself — an Edit failing on whitespace means Biome reformatted, so re-read and retry. `npm run typecheck` stays the *only* type gate (the build strips types unchecked). 
- **Connections** are in-line `[[Title]]`, resolved against an in-memory title map built from the page tree, and **aren’t** displayed in any container views *(tables, galleries, lists…)*. **Contexts** resolve via parenthesized title keys in front-matter through the registry; content ↔ content relational properties **don’t** exist. 

#### II. Swift Origins

Pommora was first built as a native SwiftUI app — that build was active for around one month and designed and versioned the entire paradigm; React was initially scoped as an alternative contingenc but was eventually determined to be the best long-term approach. The Swift build is archived at `// The Studio // Archive // Pommora` — source; its git history lives on the `swift` branch.

- **Why This Matters:** The initial rebuild brought along now obsolete swift-based code; swift-compatibility is not a constraint — any code that may appear functional but is solely an artifact of the swift origin must be flagged for removal.

#### II. Project Sapphire

**Sapphire** is an Obsidian plugin and parallel sub-project that functions as the interim bridge between what Pommora will bring and what Nathan's current main system (Obsidian) actually offers in the meantime: it brings Pommora-style capabilities to Obsidian natively and keeps NexusOS Pommora-compatible, so Nathan's daily vault stays aligned as Pommora matures — at a light weekly cadence, subordinate to the daily Pommora grind. 

#### II. Documentation

Feature specifications live in `Features/`; root docs (PRD · Handoff · History · Framework) sit at the `.claude` root.
- **Features //** → Feature-specific documentation that **must** be updated every time relevant code is committed. 
- **Guidelines //** → Read [[Build-Gotchas]] before running the GUI + for information on the toolchain, chip-components, and liquid glass.
- **Planning //** → Self-explanatory; location for all planning and temporary specifications.
