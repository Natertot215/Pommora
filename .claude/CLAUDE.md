## Project Pommora

Pommora is Nathan’s main project — a personal management and all-in-one productivity app leveraging an extremely flexible, properties-based categorization framework through an inherently agentic-legible, local-first approach as an alternative to popular applications, offering the best of both worlds. Pommora's long-term vision is an alternative to cloud-based enterprise organizational and project management tools, providing local-first security, case-specific customization, and an agentic-accessible, advantaged platform.

### The Model

Pommora’s model revolves around an individual user-picked folder that’s designated as the “Nexus” that contains all of the content that Pommora’s interacts with — similar to Obsidian's “vault” framework — and the `.nexus/` configuration directory used to define the workspace itself.

The Nexus’ structure is based on relating **Content** ↔ **Content** through *Connections*, with their attributes given through their **Collection's** schema-based **Properties**, and linking them all together through relationships to **Contexts**.

**Contexts:** The organization layer — user-defined **Context** groups (the registry seeds Areas, Topics, and Projects as defaults) hold **Spaces**, the individual members Content entities can relate to, resolved through the registry via `<Title>:` keys. A Space links other Spaces and holds values for any registry property on its own sidecar.

**Content:** The operational layer — what you actually make, linked to each other through **Connections** for content ↔ content relations, and front-matter for content ↔ Space relations.

- **Collections & Sets:** a **Collection** is a folder that carries a shared property schema and saved views via its `.pagecollection.json` at the folder’s root; it contains **Sets** as organizational subfolders that inherit that schema.
- **Pages:** Markdown documents inside a Collection or Set, conforming to its Collection's properties, identified via its `ID` key. Pages use MarkdownPM as their editor surface, which includes inline connections to other pages.
- **Agenda:** the calendar layer — **Tasks** (reminder-shaped; located within `/Tasks`) and **Events** (calendar-shaped; located within `/Events`) — each as Markdown files distinguished via their ID’s kind mark and validated against their folder placement. Agenda’s *scaffolding* exists; the feature itself doesn’t yet.
- **Properties:** the Nexus-wide typed attributes that collections assign, and their members fill in — Select, Status, Date, and the rest; the schema is nexus-wide, collections validate properties for their pages to use; written as bare `Property: `so any application that reads YAML reads them.
- **Connections:** inline `[[Title]]` colored-text links inside MarkdownPM surfaces and resolve against an in-memory title map built from the page tree — connecting to another Page, or a heading within one, as the Content ↔ Content relation.

**Files are canonical for content.** Pages, Tasks, and Events are all Markdown files carrying one `ID` key, the kind marked inside the ULID itself. Contexts and container sidecars are JSON. An entity's kind comes from an agreement between its folder's sidecar file and the file itself — contradictions are ignored.

### Codebase Information

**Pommora —** `Core` (the app), `UIX` (the design kit), and `Desktop` (the Electron host), with `Mobile` + `Sync` as near-term priorities. **Stack —** electron-vite • Electron 42 • React 19 • TypeScript 6 • Vite 7 + `@vitejs/plugin-react` 5 • Zustand • TanStack Virtual • YAML • vitest • `lucide-react` + `@tabler/icons-react` as a secondary source to pull from per icon. **MarkdownPM** — a CodeMirror 6 custom-built Markdown editor.

- **Dependencies:** They're all placed behind thin replacement-enabling seams so they’re swappable without touching callers. Version numbers are compatibility pins, not endorsements.
- **The [Figma Library](https://www.figma.com/file/EBJXShPFA50yUwmBti452p)** is where the design presentation happens beforehand. `Dashboard/` builds the Pommora Dashboard, a Vercel-hosted site holding the line ledger, the codebase audit, and the Showcase (the design system). The commit hooks keep it current; don’t emphasize it in-chat.
- **Nathan Role:** Nathan *doesn’t* understand much of the architectural design, codebase complexities, or the app's inner workings — his familiarity and focus are primarily on the vision, design, features, and interaction. Most behind-the-scenes design *isn’t* Nathan’s own decision; don’t assume he’s always on the same page or understands what you’re talking about regarding these topics.
- **Branches:** `active` is the development branch, where every commit is automatically pushed; `main` is GitHub's default branch, regenerated from `active` on request without `.claude/`, `Dashboard/`, or the tests, so it's never committed to directly.

### Hard Rules

- **The host owns the machine:** Core reaches it only through `Core/Platform`; Desktop's implementation is the only place the app calls Node and Electron; `Sync/` is a separate process on Node's built-ins alone; UIX reaches nothing outside itself.
- **`Core/Contract` is the contract between any interface and any host:** Every channel is declared once in `bridge.ts`, and both sides derive from it; every channel answers with the `Result` envelope, and never throws across the boundary, so adding a channel is one entry and a mismatched end is a compile error.
- **The app never depends on the renderer:** The host-run half of Core imports no React and depends on no interface; `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` fails the moment it does.
- **Finite states are unions + switch:** Shared logic is hoisted rather than repeated.
- **Read-Write Separation:** The read path is read-only by construction, with mutations being clearly separable in processes.
- **Never do expensive work "on every X," never "reload the entire Y:”** No O(N), allocating, or layout-reading work on a high-frequency trigger, and no full-Nexus rebuild or re-walk when an incremental or cached update works — it's *the* lag source.
- **Comments aren't authoritative:** A constraint a comment claims isn't a law, and change-scoping doesn't treat it as fact.

#### Testing Conventions

`Guidelines/Development-Environment.md` holds the full operational layer — launching, CDP, toolchain pins, and commit mechanics — and is required reading before driving the app. Don't treat Nathan's live instance as constraining.

- **Gates:** `npm run typecheck` (the only type gate), `npm run test`, and `npm run lint`, all from the repo root; lint runs clean. Biome formats every TS/CSS/JSON write, so an Edit failing on whitespace means it reformatted — re-read and retry.
- **Launch:** `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev` from the repo root; `POMMORA_DEBUG_PORT` arms CDP, and the `env -u` is mandatory. 
- **Test Nexus:** `~/Test` is pre-seeded with scratch collections, sets, pages, and contexts for live-drive testing.
- **Iteration Scratchpad:** `Core/Interface/Windows/IterationWindow.tsx`, opened by ⌘⇧T, is for rapid iteration of an otherwise-scoped asset.
- **Native Context Menus Over CDP:** a real right-click through `Input.dispatchMouseEvent` (`mousePressed` then `mouseReleased` at the target's box) reaches main's listener, where a JS-dispatched `contextmenu` event doesn't; `osascript -e 'tell application "System Events" to key code 53'` dismisses it.
- **Benchmarks:** `node .claude/Benchmarks/make-benchmark-nexus.mjs small|medium|large|xlarge` builds `~/Benchmark-<Size>` (1k → 50k pages; option types 1 → 10 per type x 10 → 50 options, other types 1 → 10) after sweeping earlier builds.

### Locked Decisions

Everything about Pommora’s design — what it builds and how it’s built — needs only a good reason to change, while these define the foundational identity itself. Everything else — model, architecture, vocabulary, interaction — is open to challenge and full-on rework whenever an idea earns it.

- **Legibility & Translation:** The user's Nexus, its filesystem structure, and the general layout of the content within it must be reasonably understandable through the filesystem structure itself, app-agnostic, and clearly understood through a single user guide.
- **Database:** The database shouldn’t be expected to contain anything that would need to be persistent through cross-device synchronization, and should be limited to what’s appropriate as a regenerative index.
- **Concurrency:** Recency-first resolution is the *current* approach for cross-device or external editing conflicts, with per-section updates to synced configuration files.
- **Scalability:** All product decisions must be handled through the perspectives of platform-scaling eventualities and potential enablement.

#### Important Information

- **Project Sapphire:** Sapphire is an Obsidian plugin and parallel sub-project — subordinate to the daily Pommora grind — that functions as the interim bridge bringing similar capabilities to Obsidian and keeps NexusOS Pommora-compatible on a per-case basis.
- **NexusOS** is both an Obsidian vault *and* a Pommora Nexus — frontmatter appearing not to conform to Pommora's standards (e.g., bare `Areas:`, `Topics:`, `Projects:`, `Status:` etc.) isn't Pommora's concern; folders like `/Agenda`, even though Pommora pre-seeds `/Tasks` + `/Events`, aren't duplicates; they're temporary Obsidian fixtures until Pommora is completed.
- **Mobile Companion:** A near-term focus; it runs this same interface in a Capacitor WebView, and `Mobile/` holds no code yet.

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
├── // Matrix        | • The graph view: its engine, surface, and window
├── // Navigation    | • Nav views, the tab bar, and recents
├── // Nexus         | • Nexus admission, adoption, and cascade
├── // Pages         | • The page view, its header, and file history
├── // Paths         | • Path safety, exclusion, and disambiguation
├── // Platform      | • The only seam Core uses to reach the host
├── // Properties    | • Typed attributes and their editors
├── // Session       | • Store slices and per-tab state
├── // Settings      | • The settings window and its rows
├── // Sync          | • The wire contract, the signing string, and the device client
├── // Testing       | • The shared test tree builder
├── // Tiles         | • The homepage and Space tile surfaces
├── // Trash         | • Deletion, bundling, and restore records
├── // Views         | • Collections rendered as views
└── // Web           | • The web guest element, link opening, and guest partitions

// UIX               | • The design kit — reaches nothing outside itself
// Desktop           | • The Electron host — the app's only caller of Node
// Mobile            | • The mobile companion
// Dashboard         | • The line ledger and design-system showcase pages
// Sync              | • The cross-device sync layer
```
