## Project Pommora

Pommora is Nathan’s main project — a personal management and all-in-one productivity app aimed at providing an extremely flexible, properties-based categorization framework through an inherently agentic-legible, local-first approach to create a true local-first, cross-domain organizational platform. The long-term vision is an alternative to cloud-based enterprise organizational and project management tools that provides local-first security, case-specific customization, and an agentic-accessible and advantaged platform. Pommora's current structure is based on relating **Content** ↔ **Content** through *Connections*, with their attributes given through their **Collection's** schema-based **Properties,** and linking them all together through relationships to **Contexts.**

### The Model

**Contexts:** The organization layer — user-defined **Context** groups (the registry seeds Areas, Topics, and Projects as defaults) hold **Spaces**, the individual members Content relates *to*. No Context contains or parents another; an entity tags whichever Spaces fit, resolved through the registry via `<Title>:` keys in frontmatter.

**Content:** The operational layer — what you actually make, linked to each other through **Connections** for content ↔ content relations, and front-matter for content ↔ Space relations.

- **Collections & Sets:** a **Collection** is a folder that carries a shared property schema and saved views; it contains **Sets** as organizational subfolders that inherit that schema.
- **Pages:** Markdown documents inside a Collection or Set, conforming to its Collection's properties, identified via its `ID` key. Pages use MarkdownPM for its editor surface, which includes in-line connections to other pages.
- **Agenda:** the calendar layer — **Tasks** (reminder-shaped; located within `/Tasks`) and **Events** (calendar-shaped; located within `/Events`) — each as Markdown files distinguished via their id's kind mark and validated against their folder placement.
- **Properties:** the nexus-wide typed attributes that collections assign, and their members fill in — Select, Status, Date, and the rest; the schema is nexus-wide, collections validate properties for their pages to use; written as bare frontmatter keys named exactly as the property (`Status:`), so any application that reads frontmatter reads them.
- **Connections:** inline `[[Title]]` colored-text links inside MarkdownPM surfaces and resolve against an in-memory title map built from the page tree — connecting to another Page as the Content ↔ Content matrix. They **aren't** displayed anywhere outside the Markdown body, and content-to-content relational properties **don't** exist.

**Files are canonical for content.** Pages, Tasks, and Events are all Markdown carrying one `ID` key, the kind marked inside the ULID itself. Contexts and container sidecars are JSON. An entity's kind comes from an agreement between its folder's sidecar file and the file itself — a file whose mark contradicts what its folder expects is un

### Codebase Information

Pommora is an **Electron** desktop app. electron-vite · Electron 42 · React 19 · TypeScript 6 · Vite 7 + `@vitejs/plugin-react` 5  · Zustand · TanStack Virtual · `eemeli/yaml` · `lucide-react` (the curated icon registry — `DesignSystem/Symbols`; `@tabler/icons-react` stays installed as a second source to pull from per-icon) · Vitest. Editor: **MarkdownPM** — a CodeMirror 6 custom-build Markdown editor on the Pommora monorepo. 

- **No dependency lock-in.** Every library sits behind a thin seam (SQLite behind `Database//driver.ts`, YAML behind `pageFile.ts`, IDs behind `ids.ts`, glass behind `Surface`) so it's swappable without touching callers. Version numbers are compatibility pins, not endorsements.
- **The [Figma Library](https://www.figma.com/file/EBJXShPFA50yUwmBti452p)** is where the design iteration happens beforehand, and codebase synchronization is intended but not guaranteed. The showcase website at [pommora-design-system](https://pommora-design-system.vercel.app) deploys from `Pommora/` (`npm run build:showcase`) via `vercel.json`; it's the origin-synced showcase of the design system.
- **TS-native on-disk format:** bare, natively typed values under bare property-name keys and `<Context>` keys, zod-validated.

### Hard Rules

- **Main owns the filesystem.** All fs/Node lives in `src/main`, reached from the renderer only through the **narrow typed IPC** bridge in `src/preload` (contextBridge).
- **`src/shared/types.ts` is the cross-process contract.** No fs, no React there.
- **IPC never throws across the boundary** — data channels return the shared `Result` envelope (`{ ok: true, value } | { ok: false, error }`, the error structured with a code) and every channel is declared once in `src/shared/bridge.ts`; both sides derive from that map, so adding a channel is one entry and a mismatched end is a compile error.
- **Read and write are cleanly separable.** The read path is read-only by construction; mutations are additive, never woven into reads.
- **Condensed control flow / DRY / simplicity-first** — model finite states as unions + switch; hoist shared logic; never allow two writers or definitions for the same thing; anything that does this and is found must be reported. 
- **Never do expensive work "on every X," never "reload the entire Y."** No O(N) / allocating / layout-reading work on a high-frequency trigger, and no full-nexus rebuild / re-walk when an incremental or cached update works — it’s *the* lag source.
- **Placeholders** never display build-status or meta text — an unbuilt surface is simply blank.
- **Ask before designing.** Stop to disclose assumptions and clarify direction before any design or interaction-based decision — don't guess at how something looks or behaves; the codebase usually describes something that already exists. Any in-flight decisions must be disclosed as they’re being made.
- **Most recent wins** is the primary philosophy around handling concurrency, cross-device, and external editing conflicts.

#### Testing Conventions

- **The visual iteration scratchpad** — `renderer/Utilities/iteration-window`, opened by ⌘⇧T — is for rapid iteration of an otherwise-scoped asset.
- **Live instances are yours to drive.** Kill and manipulate Nathan's running instances freely — scratch pages, data manipulation, and the rest are accepted, and the preferred verification when Nathan can't visually confirm; the one requirement is that any change made is reverted when done.
- **Gates.** `npm run typecheck` is the *only* type gate — the build strips types unchecked — and it covers both `tsconfig` projects. `npm run test` is Vitest; `npm run lint` is `biome check` — the linter AND the formatter — and runs clean, so a change that adds a diagnostic or leaves a file unformatted isn't done → [[Development-Environment]]. Formatting is Biome's (a PostToolUse hook formats every TS/CSS/JSON write; single-quote, no semicolons): never hand-align — an Edit failing on whitespace means Biome reformatted, so re-read and retry. A write that bypasses the hook (a shell-driven edit) bypasses the formatter, which is why the gate checks it; `npm run format` repairs one.
- **Launch the GUI** — copy-paste, run from `Pommora/` (HMR + CDP armed on `9333`):
  ```
  env -u ELECTRON_RUN_AS_NODE npm run dev -- --remote-debugging-port=9333
  ```
  The `env -u` is mandatory: this environment sets `ELECTRON_RUN_AS_NODE=1`, which makes Electron run as plain Node → `require('electron')` returns a path string and the app crashes. After `npm run build`, `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron .` runs the built binary instead. `TEST_NEXUS_PATH` only steers tests, never the running app.
- **Worktree Electron binary:** a worktree's `node_modules` is typically installed for the Vitest/Node gate only and **omits the Electron binary**, so the first `dev`/launch dies with `Error: Electron uninstall`. Fix: run `./node_modules/.bin/electron --version` once (downloads the binary), then relaunch. Kill any test instances once you're done with them — don't leave them running.

### Locked Decisions

**Nothing is set in stone but these:** Every other decision — model, structure, vocabulary, interaction — is open to challenge and rework whenever an idea earns it. These decisions need explicit sign-offs to change; everything else needs only a good reason.

- **Reasonable Legibility:** The user's Nexus, its filesystem structure, and the general context of the content within it must be understandable through the filesystem structure itself, be reasonably app-agnostic, or clearly understood through a single user guide. 
- **Reasonable Translation:** The general structure of the file tree and on-disk data must be translatable between other filesystem-based applications. App-unique syntax is an acceptable per-case decision — but legibility concerns *context*, not every byte the app stores: per-machine operational info, accelerators, file metadata, or similar information may be more appropriate to store in the `nexus.db` rather than hand-editable and exposed data.
- **Single-window now, multi-window-ready seams** — data is main-owned + Query/store-cached per renderer; the live-refresh bus is a swappable transport; windows identified by serializable refs. No global singleton holding shared mutable client state.

#### Important Information

- **Swift Origins:** Pommora was originally built in Swift for about a month before switching to an Electron + TypeScript + React architecture for better long-term maintainability. The Swift source is archived at `// The Studio // Archive // Pommora`; its commits sit in this repository's own ancestry rather than on a separate branch, so `git log` reaches them directly.
- **Project Sapphire:** Sapphire is an Obsidian plugin and parallel sub-project that functions as the interim bridge between what Pommora will bring and what Nathan's current main system (Obsidian) actually offers in the meantime — subordinate to the daily Pommora grind — it brings similar capabilities to Obsidian and keeps NexusOS Pommora-compatible on a per-case basis.
- **NexusOS** is both an Obsidian vault *and* a Pommora Nexus — frontmatter appearing not to conform to Pommora's standards (e.g., bare `Areas:`, `Topics:`, `Projects:`, `Status:` etc.) isn't Pommora's concern; folders like `/Agenda`, even though Pommora pre-seeds `/Tasks` + `/Events`, aren't duplicates; they're temporary Obsidian-functionality fixtures until Pommora is actually completed.
- **Mobile Companion:** A mobile companion app is a near-term focus, which has already been discussed but without formal planning.
