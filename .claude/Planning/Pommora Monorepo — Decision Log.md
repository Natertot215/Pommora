## Pommora Monorepo — Decision Log

> **Standing (09-05-2026):** ratified for planning. Every open item took Nathan's ruling the same day; [proposed] items stand as decided unless he strikes one. The implementation plan is written from this log; nothing has moved yet. Every architecture rule in the project's CLAUDE.md files, the Locked Decisions included, was treated as non-binding for the audit. This log closes the Mobile Companion decision log's A-6 ("the repository is restructured into a monorepo first; its exact architecture is decided at the plan's stop before Task 0 runs") and supersedes that plan's Task 0 and Phase 8 where it rules differently.

### Frame

- **Purpose:** Take Pommora apart and put it back together as a monorepo whose folders say what they hold, so the desktop app, the coming mobile companion, the sync server, and the shared core are one codebase with one filing system rather than a desktop package with attachments. Stale layers, code that outlived what created it, and pass-through indirection leave during the reassembly.
- **Core Value:** Non-technical Nathan should be able to navigate his own codebase. Flipping through the folders should pick out old junk, put things filed a long time ago where they actually belong, or remove them entirely. Nathan keeps being able to read the codebase through future large-scale arcs (Agenda, Mobile, Accounts, and the rest). A folder passes when opening it tells you what belongs in it and what doesn't.
- **Success Criteria:** The desktop app is the same app afterward: same features, same look, same feel, no behavior moved. Every file has a purposeful home, or its homelessness is a stated decision. A new feature or a tweak knows where it slots without a planning session. The implementation nets a negative line delta with layers removed rather than moved. The test, lint, typecheck, and build gates are green from the repo root.
- **Filing Rule:** A folder earns its place by the category it names, not by its file count. Two or three files that are the closest thing Pommora has to an API for webpages is a Web folder, placed as high as the category deserves, because what comes next in that category lands there too. A folder fails when nothing states what belongs in it. Condensation is never the goal; the negative delta comes from removed layers and collapsed duplicates, not from cramming. A file that clearly belongs to another owner goes there; a small area kept isolated because its future members will live there too is a correct decision.

### Sources

- The twenty audit reports of 09-05-2026: placement and dead-code lenses per scope, the host-seam autopsy, the native-menu subsystem, duplicate definitions codebase-wide, build and harness configuration, docs reconciliation, and the tooling research.
- [[Mobile Companion & Pommora Sync — Decision Log]] A-6, B-1..B-3, D-1..D-5, K-1 — the incumbent candidate (Core/Desktop/Mobile/Sync with a host seam in Core/engine) this log stress-tested.
- [[Mobile Companion & Pommora Sync — Implementation Plan]] Task 0 (the folders-only monorepo) and Phase 8 Tasks 30–38 (the renderer port behind the seam) — superseded by decisions A-3, B-2, and B-4 below; the rest of that plan re-derives its paths through this log's tree.
- [[ArchitecturePM]] — the current shape; the rules that go false are under H.
- [[ContextPM]] §Pending Focuses Three (the `main/index.ts` split, `mutate.ts` organization) and §Open Calls (the renderer's filing rulings) — absorbed here.

### What the Audit Found, In Plain Terms

The logic is sound and the filing is not. Three facts carry the whole restructure:

1. **The seams are already right.** The interface never touches a file or Electron directly; it asks through one typed list of 149 requests. The engine never draws anything. The view pipeline, the tile layout math, the Markdown parser, and the property value rules are already pure functions. Nothing has to be re-thought; it has to be re-shelved.
2. **The folders were filed by birth date.** Forty-one engine files sit at main's root with no rule for what belongs there. The renderer's twenty-five folders hold five folders' worth of one domain (Views), a "utilities" drawer, an "interface" drawer, an "actions" drawer, and a "shared" folder that is sixty percent core model, thirty percent interface vocabulary, and ten percent desktop fact. Every placement audit converged independently on the same set of domains; what changed after them is that each domain holds its engine half and its interface half in one folder.
3. **Two things are fused that a phone needs apart.** The main process is an engine (about 12,000 lines that only need "read, write, list, lock") welded to an Electron host (about 2,900 lines of windows, dialogs, native menus, the file watcher, the database driver). And the right-click menus are a 5,500-line three-layer system where the generic path already exists and twelve menus still hand-build their own. Cutting the first apart and collapsing the second is what makes "Electron is one host among several" true.

**Is this a hole?** No. It is a filing problem plus one fusion plus one oversized layer. Nearly every file moves, almost no logic changes, and about two to four percent of the source leaves. The desktop app comes out the other side identical.

### Decisions

#### A — Shape

- **A-1:** [confirmed] The repository becomes a monorepo at the current root. The `Pommora/` package folder dissolves. Workspace folders are PascalCase: `Core`, `UIX`, `Desktop`, `Mobile`, `Sync`, `Showcase`. Root holds the workspace manifest, one Biome config (the Studio format hook resolves it upward and it must sit at the root), one Vitest config with a project per workspace, one root TypeScript file that lists the workspaces for the editor, and `.claude/`.
- **A-2:** [confirmed] "Rebuild" means disassembly and reassembly by moves, with stale and pass-through code discarded on the way. No logic is rewritten from scratch; the 4,669 commits of behavior stay intact by construction.
- **A-3:** [proposed] The Mobile plan's Task 0 (folders-only) and Phase 8 (a 2,900-line phone subset moved behind a seam) are superseded. The audit showed the engine is about 12,000 host-neutral lines, not 2,900; the smaller number was a phone-first sequencing choice mistaken for placement. The `TreeHolder` indirection that plan added is unnecessary because the live tree has no Node imports and simply moves.
- **A-4:** [proposed] The `shared/` name dissolves. It named a location (what two Electron processes both import), not a category. Its contents split Core / UIX / Desktop at roughly 3,650 / 1,700 / 600 lines. The 654-line `types.ts` is seven files under one name and is the root of the whole import graph; it splits first or nothing else can move cleanly.
- **A-5:** [confirmed] `Mobile/` and `Sync/` are seated now with a package manifest each and nothing else, named in the root workspaces list. They are not placeholders in the UI sense; the workspace tooling knows them, and their first real file lands in a home that already exists.
- **A-6:** [proposed] `Showcase/` becomes a sibling workspace, never in scope. Two constants it reaches into the Settings window for move to a small bounds file so it stops bundling the store graph.
- **A-9:** [confirmed] Names. `flavor` is retired as a word for a variant; `kind` replaces it (09-05-2026). `Shell` → `Interface`; the tile-grid chassis folder is `UIX/Canvas` (tiles are the building block, a canvas is what they lay on; Slates was the alternative, and the folder name is the only thing to change); `Paths` → `Locations`; `Watch` → `FileWatch`; `Host` → `Platform` in both Core and Desktop; the menu row models are `Core/Actions` and their native poppers `Desktop/Actions`, with `UIX/Menus` the chassis; the inspector pane is `SidePane`; no `Primitives` folder, UIX's categories sit at its root with `Animations` beside `Interactions`; `MarkdownPM` keeps its name. Alternatives considered for every non-feature folder are tabled on the audit page.
- **A-8:** [confirmed] The split axis. Core is Pommora: every domain holds its logic, its surfaces, and its stylesheets in one folder (Core/Views holds the pipeline and the table renderer and its CSS; Core/MarkdownPM holds the model and the editor). UIX is the design kit Pommora is built from and holds design only: theme, primitives, gestures; it imports nothing from Core. Desktop, Mobile, and Sync are hosts. Dependency runs one way: UIX ← Core ← hosts. Inside a Core domain the pure part and the React part sit in separate subfolders when the domain is large; a domain under about thirty files stays flat rather than nesting for its own sake. The sync server imports only pure files either way; its TypeScript project carries no DOM library, and a React import there fails the typecheck.
- **A-7:** [proposed] The channel table (`bridge.ts`) survives as the one contract between any interface and any host, shrunk from 149 channels to about 110 by the menu collapse (C-6) and by folding four file-picker channels into one. What does not survive: the preload's hand-grouped `api` object (a pure rename table with three naming conventions; a twenty-line dialer replaces it and saves about 145 lines), the Electron-shaped handler-kind union in `ipc.ts`, and the single 1,250-line handler literal in `main/index.ts`, which splits by domain so a host spreads what it serves and the compiler names what it doesn't.

#### B — Core

- **B-1:** [proposed] Core is Pommora minus the kit and minus any host: the engine, the data model, and every domain's interface. No Electron anywhere; Node reached only through the Platform seam (B-2); React allowed, because React runs on every host, but confined to each domain's surface subfolder.
- **B-2:** [proposed] The Platform seam (`Core/Platform`; the word Host retires by ruling) is one interface Core declares and each workspace implements: read, write, stat, list, rename, remove, mkdir that reports "exists," a per-path lock, sha256, posix path helpers, plus the five the Mobile plan omitted and the audit found in use: `utimes` (every sweep preserves modification time), `realpath` (five sites, with a lexical fallback), birth time in stat (two sites), a raw write that records no watcher echo, and a re-entrancy rule for the lock (the current one uses `AsyncLocalStorage`, which a browser lacks). The key-value chrome store, the content index, and the snapshot store are three more interfaces behind it; the phone implements the first and defers the other two.
- **B-3:** [proposed] Core is filed by domain, not by mechanism and not by process. One folder per thing Pommora has, holding everything about that thing; a future feature lands in the folder named for what it touches:

  ```
  // Core                | • Pommora itself: no Electron, pulls its kit from UIX
  ├── // Contract        | • The channel table, the Result envelope, the HostContext type: what any interface may ask of any host
  ├── // Platform        | • What Core needs the platform to provide, as interfaces only: the machine seam (read, write, list, lock, hash) and the interface dialer; Desktop and Mobile implement both
  ├── // IO              | • Atomic write, file lock, the walk and its parse cache, the page-file envelope, the sidecar reader; knows no domain type
  ├── // Locations       | • Every on-disk name and path builder, exclusion, path safety, ids, ordering, disambiguation
  ├── // Nexus           | • The open Nexus in the engine: reading the tree, the live tree and its patches, identity and adoption, the open sequence, the one mutation dispatcher
  ├── // Session         | • The open Nexus in the interface: the store composer, one tree index, selection, the page-detail cache, the save scheduler, the neutral slices
  ├── // Interface       | • The frame around content: the pane router, the entity header, Sidebar, Toolbar, SidePane (the inspector, renamed), Subfield, the floating Windows, Notifications, Confirm, Glance, the layout slice, the menu adapters
  ├── // Pages           | • The page: create, rename, move, body write, the link-rename cascade, the file-history capture rule; the page surface, its menu
  ├── // Properties      | • Registry, schema, assignment, options, values, the governed-key sweep and its journals; cells, pickers, the page's property rows (one component), the schema editor
  ├── // Contexts        | • Registry, Space write, the Context cascade
  ├── // Views           | • The pure pipeline (columns, filter, group, sort), view pick, the saved-view codec; the host, bands, Table, Cards, and the frames that configure a view, with their stylesheets
  ├── // Tiles           | • Layout model and math, the tile document; the host, kinds, handle menu, every tile kind (Markdown, View, Page, Web), the Space and Homepage boards
  ├── // MarkdownPM      | • The pure Markdown model (parse, detect, tokens, document scan, block and table models) in its own subfolder; the CodeMirror editor beside it, its 41-file Editor bin dissolved into Render, Guards, Gestures, Links, Citations, Embeds, Menus, Widgets, Autocomplete
  ├── // Connections     | • Link grammar, the mention scanner, the rename rewriter, one title-resolution index
  ├── // Navigation      | • navigation.json and NavRef; recents, pins, favorites, search, tabs, history, their slice, and the list, gallery, bar, and pane that render them
  ├── // Trash           | • The deletion record, gather, resolve, spend, restore scrub; the Trash frame
  ├── // Assets          | • Asset map, roots, write, migration, mime, crop geometry; the image component, the crop editor, the entity icon, the Nexus photo, the icon-picker binding
  ├── // Settings        | • The settings.json codec and personalization types, exclusion input, the app-config shape; the Settings window and its frames (Account and Sync land here)
  ├── // Index           | • The content-index interface and its seed
  ├── // Actions         | • The user's commands (toggle-ribbon, toggle-nav, paste-inverse) and every list menu's rows as pure models (C-6); the native popper in Desktop and the in-app presenter in Interface both read them
  ├── // Web             | • Webpage-embed grammar, the link-title scanner, the web-surface slot a host fills
  └── // Utilities       | • Helpers the user never invokes and no domain owns: the four data helpers, the iteration window
  ```

  Inside a large domain, the pure and the React parts are separate subfolders named for what they are (Views has `pipeline/` beside `Table/`; MarkdownPM has `Model/` beside `Render/`); a domain under about thirty files stays flat; no domain is forced into a model-versus-ui template.

- **B-4:** [proposed] The engine handlers (the 1,250-line literal in `main/index.ts`) move into Core beside their domains, taking a `HostContext` instead of closing over the window. About 1,000 of those lines are engine once three Electron handles are injected. `mutate.ts` drops from 784 to about 190 lines when its nine inline bodies become modules beside the arms that already are.
- **B-5:** [proposed] Two correctness fixes ride along because the audit found them and they are cheaper inside the move than after: sidecar files have four write paths and one skips the lock; `homepage.json` bypasses its write funnel at five sites.
- **B-6:** [confirmed] Every tile kind lives in Core/Tiles, the Page and Web tiles included (ruled 09-05-2026). A tile is a Tiles thing that calls into its subject's domain for actions, so the page tile asks Pages to save and open and the web tile asks Web to open a link or fetch a title; neither tile moves to that domain. The web tile stays a `<webview>` surface, which a phone host never mounts.

#### C — The Kit (UIX) and the Interface Rules

- **C-1:** [confirmed] UIX is the design kit and nothing else. It imports nothing from Core and knows no Pommora entity, no exceptions; the Showcase renders it alone. Its categories sit at the root rather than under a Primitives folder, by ruling:

  ```
  // UIX                 | • Design only; what Pommora is built from
  ├── // Theme           | • The values: color, type, size, glass recipes, the CSS-variable bridge; exports no component
  ├── // Animations      | • Motion tokens, keyframes, presence and entrance hooks; one definition of every duration and ease
  ├── // Interactions    | • Pointer, drag, resize, dismissal, and keyboard engines and their pure reorder math; its two hand-rolled pointer skeletons rebase onto the one gesture engine
  ├── // Buttons  // Labels  // Controls  // Fields  // Elements
  ├── // Glass  // Menus  // Pickers  // Symbols
  └── // Windows  // Cards  // Canvas  // Table  // Caret     | • The chassis: a floating window's frame, the card, the canvas tiles lay on (TileGrid inside; the folder name is the changeable part), the table chrome, the drawn caret, each knowing nothing of what it hosts
  ```

  The seven files the audit found filed in the design system that belong to Pommora (the image crop editor, the settings applier, the entity-icon policy, the tile size knobs, the four data helpers, the one-line shell wrapper) leave for their Core domains.
- **C-8:** [confirmed] The `DesignSystem` folder name retires and no `Primitives` folder replaces it; the kit's categories sit at UIX's root. `Animations` stands beside `Interactions` as its own category. Motion's one definition lives in Animations, which ends the tokens-import-Animation leak the audit found. The design-system vocabulary stays for the Figma library, the showcase, and the Features doc.
- **C-2:** [confirmed] Store slices live with their domain (navigation's slice in Core/Navigation, the windows slice in Core/Interface) and one composer in Core/Session spreads them, versus one Store folder holding every slice. Recommendation: with their domain. A slice about navigation belongs in Navigation; the composer is the one file that knows the list. The existing rule that a slice imports nothing that imports the store stays.
- **C-3:** [proposed] `Interface/`, `Actions/`, `Frames/`, `Tables/`, `Cards/`, `Tabs/`, `Toolbar/`, `Windows/`, `Store/`, `Content/`, and `shared/` dissolve as top-level names. Each was a place things opened from, a kind of file, or a process, not a thing. `Utilities/` stays, as `Core/Utilities`, by ruling (09-05-2026): what the user never invokes and no domain owns: the four data helpers from the kit and the iteration window. The commands the user does invoke (toggle-ribbon, toggle-nav, paste-inverse) are Core/Actions'; the chord matcher itself is UIX/Interactions.
- **C-4:** [proposed] Files whose owner is elsewhere move to it: the Toolbar's outline menu is an editor feature (sole consumer of the live-editor registry) and goes to MarkdownPM; the Toolbar's Space menu is Tiles' (the Space board's); `PageHeader` is page chrome, not editor; the four "util" data helpers in the design kit are Core's; the Settings icon-picker binding has fifteen importers and none in Settings and goes to Assets beside the entity-icon policy (the unbound picker is UIX's); `tileCache` has zero Tiles importers and both are MarkdownPM's.
- **C-5:** [proposed] Motion has one definition, in UIX/Animations. Today it is read four ways and has drifted (one fallback says 240ms, the token says 280ms).
- **C-6:** [confirmed] Every list menu runs through one shared model (Core/Actions, the rows every menu says; UIX/Menus is the chassis that draws rows), one channel, one native popper on desktop (Desktop/Actions), and one in-app presenter (Core/Interface) that mobile uses always and desktop uses when native menus are off. The generic path already exists and eleven menus ride it; twelve still hand-build their own with no visible reason. Collapsing them removes about 19 files and 600 net lines, takes the menu channels from 26 to 1, and is the mobile prerequisite since a phone has nothing else to show. The editor's context menu and the app menu bar stay host-specific (about 700 lines). This moves from the Mobile log's Prospects into this mandate.
- **C-7:** [proposed] The Markdown editor takes an `EditorHost` object from whoever mounts it (settings, aliases, link titles, clipboard, menus, tile rendering) instead of reading the store and the bridge at about sixty sites in twenty-one files. Its own menu code already models this correctly; the other four menus never got the same treatment. With that cut, 51 of its 72 files ship to a phone unchanged.

#### D — Desktop

- **D-1:** [proposed] Desktop is everything that is only true on Electron, in both processes:

  ```
  // Desktop
  ├── main.ts             | • App lifecycle, window creation, protocol registration
  ├── // Bridge           | • The IPC binding of Core/Contract and the preload (the preload stays CommonJS; the sandbox requires it)
  ├── // Platform         | • The Node implementation of Core/Platform
  ├── // Store            | • The SQLite driver, open and schema, the key-value and index SQL, the snapshot store
  ├── // FileWatch        | • The chokidar arm of the file watcher; the settle-and-classify half stays in Core
  ├── // Actions          | • The native poppers, the returning menu, the editor context menu, the app menu bar; the Electron side of Core/Actions
  ├── // Web              | • Webpage guests, the link-title fetcher, and the two renderer surfaces outside Tiles that are `<webview>` end to end: the web window, the glance's site branch
  ├── // Capture          | • Thumbnails
  ├── // Config           | • pommora.json, window state, the recent-Nexus list
  ├── // Renderer         | • The Electron entry for Core's interface, its Host implementation (dialer over IPC, native-menu presenter, dialogs), the drag-region and traffic-light CSS
  └── electron.vite.config.ts · electron-builder.yml · build/
  ```

- **D-2:** [proposed] Web is the worked example of the Filing Rule: about 900 lines today across seven folders, becoming Core/Web (grammar, title scanner, the surface slot) and Desktop/Web (guests, the web window and glance site surfaces, the title fetch); the web tile itself stays in Core/Tiles with every other tile kind (B-6). Small, and correctly its own category.

#### E — Mobile and Sync

- **E-1:** [proposed] Seated per A-5. The Mobile plan's Tasks 17–23 and 3–6 land inside them and re-derive every path through this log's tree.
- **E-2:** [proposed] The real mobile gap is fingers, not files: zero touch handling, drags that activate on pointer distance, hover-only affordances. That is interaction work in UIX/Interactions and Core's surfaces and belongs to the Mobile plan's Phase 8, made visible by this restructure rather than solved by it.

#### F — Removals

- **F-1:** [proposed] The honest number. Removable at high confidence about 2,100 lines (the F-3 compatibility paths now counted); with medium-confidence items about 3,900; against roughly 85,000 non-test lines, two to four percent. New code the seams require (the Host interface and its Node implementation, the in-app menu presenter, the editor host object, the store composer) is about 600 lines. Net somewhere between −1,500 and −3,300. The monorepo itself unlocks only about 60 lines of that; the rest is cleanup that rides along. Six dependencies, three build configs, and 385 MB of regenerable output leave on top.
- **F-2:** [proposed] What goes, by kind:
  - **Layers:** the native-menu bespoke poppers and their 24 channels; the preload `api` object; the second React-in-widget chassis in the editor; the exponent-then-log zoom mapping written as two halves in two packages.
  - **Duplicates:** two frontmatter parsers with different fence grammars; one URL regex written twice inside the same folder; a plain-object check hand-spelled twenty times; five case-fold normalizers, one missing NFC; the asset URL built twice with divergent encoding; four warm-state caches with three eviction policies; four nav-ref resolvers; three tree walkers beside the index that declares sole ownership; the page-property rows rendered twice (88 verbatim lines); the connections API built identically four times; four drag contexts sharing one 40-line skeleton; two glass recipes proven byte-identical; three inline copies of one hold-value hook; a date-format label table that contradicts itself.
  - **Dead:** three store actions with no caller; a nav search "can't be opened" path that is provably unreachable; a test fixture in a source folder; two predecessor implementations kept alive only by tests; a session close with 17 test importers and zero production callers; about 120 `export` keywords on symbols only their own file uses; two empty Settings frames; the Agenda sidebar placeholder and its plumbing.
  - **Stale:** three dependencies with zero importers (`pngjs`, `react-markdown`, `remark-gfm`; the three CodeMirror language packs the audit also listed are live through dynamic imports); the July mobile-web build config and its output folder and scripts; 385 MB of regenerable build output in the tree; a comment-ledger script that already fails its own verify; an electron-builder provision for a database library the app no longer uses; the icon registry's tree-shaking rationale (the registry imports all of Lucide anyway, and Tabler is namespace-imported so the whole library ships for 23 glyphs); 21 bridged CSS variables and 26 of 40 emitted typography classes with no reader; a drag-zone prop passed at nine sites and discarded.
- **F-3:** [confirmed] Nothing the docs call "retired" is dead: the trash record, restore, remint, and alias code all have live producers. The record file shrinks by about 25 lines (it still writes labels for a drift diff removed 08-08-2026) and is renamed for what it now does. Every compatibility path for old on-disk shapes goes: the asset migration (245 lines, a one-shot probed on every open), raw mode (about 40 lines across eight files), the bare-record `properties.json` reader, the invented-name rename. There are no users, and Nathan migrates his own Nexus by hand if anything needs it.
- **F-4:** [confirmed] The inspector pane ships as is, renamed `SidePane`; every window toolbar keeps its disabled Settings button for now.
- **F-5:** [confirmed] The drawn caret (`nativeCaret.ts`, 359 lines) is `UIX/Caret`, every host; never Desktop's.

#### G — Tooling

- **G-1:** [proposed] npm workspaces, no task runner. Five packages and one developer do not earn Turborepo. Root scripts forward with `-w`. The Electron binary and native modules hoist to the root `node_modules`; one React instance follows.
- **G-2:** [proposed] No cross-workspace TypeScript project references and no `composite`: the research found they fail across workspaces (TS6305/TS6307) and every consumer here reads TypeScript source directly. Instead UIX and Core declare `exports` pointing at their source entries, so tsc, Vite, electron-vite, and Vitest all resolve the same files. One tsconfig per workspace (UIX, Core, Desktop-node, Desktop-web, Sync with no DOM library); the root file lists them for the editor. TypeScript 6 retires `baseUrl` and the `node10` resolution, so the alias paths go with `shared`. `shared` is compiled twice today; that ends.
- **G-3:** [proposed] Vitest `projects` at the root with a `defineProject` per workspace; Core's surface tests run under `jsdom` and its engine tests under `node`, as the per-file pragma already selects today. The current single setup file is four guarded stubs that are a no-op under `node`; main's ninety test files never needed it.
- **G-4:** [proposed] UIX and Core are dev dependencies of Desktop, never dependencies. electron-vite externalizes every runtime dependency the Desktop manifest lists, and Electron's Node refuses TypeScript under `node_modules` (verified against Electron 42), so a Core listed as a dependency would fail at launch. The deprecated `externalizeDepsPlugin` import goes. The Mobile plan's Task 0 did not account for this.
- **G-5:** [proposed] Module format: the sandboxed preload stays CommonJS (Electron requires it); main may move to ESM under Electron 42; Core's format is unconstrained because it is only ever bundled. The "named imports fail" claim in the dev guideline is a transpiler caveat, not an Electron limit.
- **G-6:** [proposed] The `.claude` harness scripts (`comment-ledger.mjs`, `comment-manifest.mjs`, `check-atlas.mjs`, `loc.py`) hard-code `Pommora/src` at about twenty lines and key their ledgers by `src/...`. The comment ledgers are retired (they already fail verify); `loc.py` and `check-atlas.mjs` are rewritten against the new roots at Task 0 so the line-count series continues unbroken.
- **G-7:** [proposed] The `Window.nexus` type moves off the preload declaration onto the Contract, so the web project stops pulling Electron typings through the preload and the renderer types against the contract rather than against `typeof api`.

#### H — Reconciliation (what goes false)

- **H-1:** [proposed] "Main owns the filesystem. All fs/Node lives in `src/main`" restates as: the host owns the machine. Core reaches it only through `Core/Platform`; Desktop's implementation is the only place Node and Electron are called on desktop. UIX reaches nothing outside itself.
- **H-2:** [proposed] "`src/shared/types.ts` is the cross-process contract" restates as: `Core/Contract` is the contract between any interface and any host; the data model lives beside its domain in Core.
- **H-3:** [proposed] "IPC never throws across the boundary" stays true and widens: every host binding of the Contract answers the Result envelope; the phone's in-process binding included.
- **H-4:** [proposed] "Every channel is declared once in `bridge.ts`" stays true; the file moves to `Core/Contract`.
- **H-5:** [proposed] The three Locked Decisions stand unchanged. Single-window-now-multi-window-ready is strengthened: the live-refresh push becomes a sink the host supplies, which is the swappable transport that decision named.
- **H-6:** [proposed] The docs ledger: 103 rule-shaped statements, of which 55 stay true, 38 restate as word swaps (main → Core's engine subfolders, renderer → Core's surfaces, DesignSystem → UIX) plus path prefixes, and 10 go false in three shapes ("Pommora is Electron," "the host affordance is universal," "sync and mobile are later"). The path sweep is 199 prefixed citations plus 120 bare folder names, concentrated in DesignSystemPM, MarkdownPM, Context, InterfacePM, and InteractionPM. `Features/` stays flat with a workspace tag per doc rather than re-nesting, since seven of eighteen docs are cross-cutting at the section level; `ArchitecturePM` splits at its own headings into a Core map and a Desktop host doc so Electron-only material stops reading as Pommora-wide rule; `DesignSystemPM`, the one doc whose whole spine is the folder tree, re-spines with the folders. 38 stale claims found by the probe (21 casing errors, retired `PageID`-family keys still described in the PRD, a property catalog in three vocabularies) are corrected in the same pass. `Development-Environment` gains the root-run gates and drops the CJS claim.
- **H-7:** [proposed] The Mobile decision log's A-6 closes as decided; its K-1 (the restated filesystem rule) is replaced by H-1; its Prospect "the list-menu generalization" moves into this mandate (C-6).

### Core (must-have)

- The workspace layout of A-1 with every file in a home named by B-3, C-1, and D-1, or its homelessness stated.
- The Platform seam (B-2) declared in Core and implemented by Desktop; the handler literal split by domain (B-4).
- The menu collapse (C-6) and the editor host object (C-7).
- The removals of F-2 at high confidence; the two-writer fixes of B-5.
- Gates green from the root; the desktop app launched against a scratch Nexus and walked through the manual checklist (open a page, edit a body, right-click every menu family, drag a tile, open every window, change a setting) with nothing moved.
- Docs reconciled per H-6; the Mobile plan's path table rewritten against the new tree.

#### Prospects (allowed later, not now)

- Moving main to ESM (G-5) — no behavior gain; a separate small change.
- Table virtualization, the two-host lost update, the fire-and-forget persist helper — Context's Pending Focuses, unrelated to filing.
- The phone's touch layer (E-2) — the Mobile plan's Phase 8.
- Promoting `Shell/Windows` to a top-level folder if Account or Sync add windows.

#### Out of Scope

- Any behavior change visible in the desktop app.
- Showcase beyond compiling (A-6).
- The Mobile and Sync implementations themselves (E-1).
- Redesigning any menu's contents; C-6 is mechanism only.

#### Considered & Rejected

- **A rewrite from scratch** — rejected 09-05-2026: loses behavior no one can enumerate and violates "the same app"; disassembly by moves gives the same end shape at no behavioral risk.
- **The folders-only monorepo** (the Mobile plan's Task 0 as written) — rejected as the end state: it renames the desktop-centric layout without fixing it; kept only as the first mechanical step inside the real move.
- **`packages/` and `apps/` naming** — rejected by Nathan's convention; PascalCase workspaces, a rename if he ever decides otherwise.
- **Replacing the channel table with a service interface, REST shape, or query layer** — rejected: it would re-derive 149 signatures under new names for no behavioral gain; the table survives as the contract.
- **A shared declarative table for the preload's `api` grouping** (the Mobile plan's Task 35) — rejected: the grouping is a second definition of the surface; deleting it saves 205 lines against the table.
- **`Shell/` as "the folder mobile replaces wholesale"** — rejected: Sidebar, Toolbar, Tabs, Windows, and Settings are host-neutral React the phone reuses; only the drag-region CSS, the web window, and the glance site branch are desktop, and those go to Desktop.
- **Core as engine and UIX as interface** (this log's first draft) — rejected 09-05-2026 by Nathan: it put Views, Properties, and Tiles in two workspaces at once and made the interface a second thing called by a mechanism name. Core is Pommora; UIX is the kit.
- **Ten renderer folders** — rejected in favor of one folder per Pommora thing: Assets, Settings, Web, Menus, and Animations apart from Interactions each name a category with members coming; folding them saves nothing and re-creates the drawer.
- **Moving the icon picker into `Utilities/`** (Context's standing debt row) — rejected: it deepens the drawer; the picker binding is Assets'.
- **Keeping `Actions/`** as a verb catalog — rejected: "an imperative a surface calls" is how junk drawers start; confirmations go beside the confirmation window, notifications beside their label, commands to Interactions, selection to Session.

#### Lessons

- A folder named for a mechanism (IO, CRUD, Store, Actions, Utilities, Interface) accretes whatever was convenient; a folder named for a thing the product has (Pages, Tiles, Navigation) does not. → [[Development-Environment]]
- A comment claiming "the one place X happens" is a claim, not a fact; the audit found four tree walkers beside an index that declared sole ownership and two frontmatter parsers beside a doc that named one. Grep for the second writer before trusting the first. → [[Development-Environment]]
- A rule that feels load-bearing may be one import wide: "main owns the filesystem" was held in place by a dispatcher importing the IPC module for a single constant.
