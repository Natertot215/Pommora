### Pommora — Product Requirements Document

> Living document — the vision, scope, and product decisions for Pommora. The build is React + Electron; the on-disk model, domain, and design values are stack-independent by design.

---

### Vision

A personal management platform combining Obsidian's customization and local-first ethos with Notion's database and view capabilities. Pommora is a simpler Notion that's also a more capable Obsidian — without the trade-offs that push people to bounce between the two.

Pages are Markdown documents that live inside **Page Collections** — folder-based database entities that carry a shared property schema and saved views. A Collection nests **Page Sets** to any depth: schema-less organizing sub-folders that inherit the Collection's schema. **Contexts** are free-standing, user-defined groups of **Spaces** — the things content tags and gathers under (the registry seeds Areas, Topics, and Projects as ordinary entries). The whole product is a folder of plain files the user owns outright.

### Why

- **Obsidian** gives UI-level customization and a transparent local-first file model, but its Markdown core can't express columns, side-by-side callouts, or in-line filtered views without heavy plugins.
- **Notion's** in-line database views — filtered, sorted, and regrouped per page without altering the source — are its defining feature, and Obsidian's file-as-document model can't match it natively.
- Obsidian shines until you need real task management or cross-page coordination. Notion shines until you hit an interface decision you can't change.

Pommora's bet: a Markdown-canonical foundation with a fast property and query engine, and a clean separation between content (Pages), structure (Page Collections + Sets), and interface (Contexts) — delivering Notion's most-loved features without giving up Obsidian's open and local-first nature.

### Audience and Posture

- Personal-first, single-user, Mac-first for v1. iOS/iPad is long-term intent.
- Always open-source.
- Architected so future cross-device and cloud sync stay viable, but neither is a v1 concern. Multi-user collaboration and a plugin system are out of scope indefinitely.

---

### Domain Model

Two layers, PARA-aligned. The organization layer holds categorical anchors; the operational layer holds the actual data. Operational entities relate to organization entities through parenthesized Context keys at their frontmatter or JSON root.

#### Organization layer — Contexts

User-defined, **free-standing** Context groups holding Spaces — the registry seeds three as ordinary, fully manageable entries. No Context contains, parents, or is restricted to another — a Project is not "inside" a Topic; a Topic does not belong to an Area. Each operational entity tags whichever Spaces fit, independently.

| Seeded Context | Role                                                      |
| -------------- | --------------------------------------------------------- |
| Areas          | Broad life domains — Personal, Academics, Work            |
| Topics         | Subject areas — Productivity, Side Projects, Reading List |
| Projects       | Specifics — CS 161, Pommora, "Atomic Habits"              |

#### Operational layer

| Entity              | Role                                                                                                                      | Default UI Label  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **Page Collection** | Schema-bearing top container for Pages                                                                                    | "Collection"      |
| **Page Set**        | Recursive sub-folder inside a Collection (any depth); inherits the schema. Depth-1 carries its own views; deeper is plain | "Set" / "Sub-Set" |
| **Page**            | Markdown document — prose plus frontmatter                                                                                | "Page"            |
| **Task**            | Reminder-shaped; its field vocabulary is the Agenda work's to settle                                                      | "Task"            |
| **Event**           | Calendar-event-shaped; same                                                                                               | "Event"           |

Tasks and Events sit under the **Agenda** parent schema. The Page Collection's property schema applies to every Page inside it at any depth — all Sets inherit it whole.

#### Singletons

- **Homepage** — one composed-blocks dashboard per Nexus, the landing surface; always reachable and not user-deletable, its config file written by the first banner or heading-icon edit.
- **Settings** — per-Nexus, user-overridable UI labels and accent color.

#### Identity and linking

- **`id`** — a stable ULID assigned at creation, never changing. A content file stores it under a key that names its kind (`PageID` / `TaskID` / `EventID`), which is also how a file placed in the wrong folder is recognized and left alone. A body connection is a title, a Context link is a title, and a property value sits under its property's name — each resolved at read time, each held correct across a rename by a sweep over the files that hold it.
- **Title** — the display name, carried as the filename (minus extension), freely renameable. Renames are filesystem renames; in-memory references resolve to the current title at render time. Within a container, a colliding Page create auto-disambiguates and a rename is rejected. Titles aren't unique Nexus-wide — a connection to a title shared by two Pages resolves as ambiguous.

Operational entities tag Spaces through parenthesized Context keys — `(Projects):` over a block sequence of bare Space titles at the frontmatter root (or, for a Space, its sidecar root) — the **only** relation-type connection. Page-to-Page links are body `[[Title]]` connections. Full model and the linking catalog → `Features/StructurePM.md` plus the per-entity docs.

---

### Core Product Decisions

#### Stack

Pommora is an Electron desktop app — a React + TypeScript renderer over a Node main process that owns the filesystem, bridged by a narrow typed IPC. State lives in a Zustand store fed by one eager nexus walk; tables render over a shared CSS grid. The Pages editor is **MarkdownPM** — a CodeMirror 6 build where Markdown markers show as raw source on the caret line and render styled when the caret leaves.

**No dependency lock-in.** Every library sits behind a thin seam — the editor, YAML, IDs, SQLite, the glass material, the drag engine — so it's swappable without touching callers. Version numbers are compatibility pins, not endorsements.

The main process is the sole filesystem owner; the renderer never touches Node. One shared bridge map declares every IPC channel once — both sides derive from it, and IPC never throws across the boundary: data channels return one structured result envelope. Full architecture → `Features/ArchitecturePM.md`.

#### Core Constraints

1. **Cloud-sync-ready and cross-nexus queryable.** Collections aren't isolated silos — property definitions live nexus-wide, so one shared property id means the same thing in every Collection that assigns it and a single query matches across all of them; any Page or Context can query, link, or embed any Collection's contents regardless of where it sits on disk. The on-disk model maps cleanly onto a cloud database, so sync arrives later as an additive translation rather than a rewrite. A Nexus placed in iCloud Drive, Dropbox, or any synced folder already gets device-to-device sync for free.

2. **Agent-legible files.** External agents — Claude, MCP clients, any tool with filesystem access — read the content, and understand the context of the user's Nexus (Pages, schemas, Contexts, properties) straight from plain files. The bar is convention-aware, not instant to an outsider: a `[[wikilink]]` hides a resolver yet reads perfectly to anyone who knows the system. We strongly prefer formats readable without Pommora's running code, and treat relaxing that for a genuine need as a tradeoff to raise — but the firm line holds: no user data is trapped in a binary blob. The device-local database holds per-machine chrome, and no content.

#### Storage Philosophy

**Files are canonical.** Everything a user creates lives as a plain file in a folder they pick, and that folder is the whole product — it can sit in any synced location and travels intact. Pages, Tasks and Events are Markdown with YAML frontmatter; Contexts and all configuration are JSON. Databases are used sparingly, but aren't prohibited as a means of carrying information; they're reserved as operational-only, and an information-bearing role isn't out of the question. **The line runs at assignment.** A property *definition* — its name, type, options and formats — may move into the database, and the file format is what makes that safe: because a Page's frontmatter names its own properties, losing the registry costs presentation config rather than the ability to read a value. An *assignment* (which properties a Collection carries) stays on that Collection's sidecar, and a *value* stays in its Page's frontmatter, so a Nexus's structure and its content both remain readable from the files alone.

**Kind comes from the folder's sidecar, not the file.** Each container folder carries a small config sidecar that declares what it is and what schema its contents share — `_pagecollection.json`, `_pageset.json`, `_space.json`, `_taskconfig.json` / `_eventconfig.json`. A folder *is* a Page Collection because it holds the Page Collection sidecar — folder names stay freely renameable, and no file extension ever carries a kind. The content file inside must agree with the folder that declares it, storing its id under the key naming that kind; one whose key contradicts its folder is Unknown — invisible, untouched, never stamped over. App-internal config and the device-local database live under a hidden `.nexus/` folder that travels with the Nexus.

**Foreign data is preserved.** Frontmatter and sidecar keys Pommora doesn't recognize are carried through untouched on every write — and the page writer preserves YAML comments too, so opening a folder that's also an Obsidian vault leaves notes byte-identical until the user edits them.

**The database is off the read path and holds no content.** Reads are a single filesystem walk; nothing user-created depends on a database being present — not a hard-locked decision, and open to reconsideration. A device-local database carries per-machine chrome — folds, view selection, tabs — so losing it costs a machine its arrangement and never a Nexus its contents. Deletions move to a recoverable in-Nexus trash that mirrors the folder chain the item came from, so the layout itself records where an item lived; no surface browses or restores it yet, which makes putting one back a manual move.

Full on-disk spec → `Features/ArchitecturePM.md`.

#### Pages

A Page is a Markdown document — one continuous stream, not a stack of blocks. The filename *is* the title, and the parent Page Collection is implied by location. Pages conform to their Collection's schema, and its values live in YAML frontmatter, each under their property's own name.

Pages support everything in standard Markdown — paragraphs, headings, bulleted / numbered / task lists, fenced and inline code, images, GFM tables, blockquotes, and horizontal rules — all of which round-trip natively to any external tool. **Headings fold**, with the fold state held per-machine in the database rather than the portable `.md`. On top of that, Pages support two Pommora rendering directives, each degrading to plain Markdown for external tools:

- **Callouts** — content rendered as an outlined box, distinct from a blockquote's filled left-bar emphasis.
- **Columns** — a section rendered in evenly-divided horizontal columns; visual layout only. Specified, not built.

Each Collection decides where its Pages open — the main detail pane, or the floating Page Preview window (`Features/PagePreviewPM.md`). Editor architecture → `Features/MarkdownPM.md`; the page entity → `Features/PagesPM.md`.

#### Page Collections and Sets

A **Page Collection** is the operational container — a top-level folder whose sidecar assigns the nexus-wide properties shared by every Page inside it, plus its saved views, child ordering, and an open-in mode. It has no text editor of its own; it's a pure database surface (table and cards, with more renderers to come).

A Collection nests **Page Sets** to any depth — schema-less sub-folders that inherit the Collection's whole schema. The first level (a "Set") carries its own views and sorting and is selectable; deeper levels ("Sub-Sets") are plain organizing folders. Nesting is unbounded, with no roll-up — discovery, rendering, and navigation recurse on the real folder tree.

Moving a Page **across Collections** never strips — its values ride along, the destination shows only the properties it assigns, and the rest sit inert in frontmatter until assigned there; moving **within** a Collection (between its Sets and root, at any depth) changes nothing, since the schema is shared. The schema is edited from a Collection Settings surface; per-view configuration (sort / filter / group / layout) is a separate per-view surface. Full detail → `Features/CollectionsPM.md` + `Features/PageSetsPM.md`.

#### Contexts & Spaces

`.nexus/contexts.json` owns Context identity — id, title, singular, icon, array order as display order — and each Space is a folder at `.nexus/contexts/<Context>/<Space>/` gated by its `_space.json` sidecar (id, chip-solid color, banner, and its own relation keys); its block document is a device-local row (→ Features/SurfacePM.md). There is no `parents` field and no containment. The folder name is the title; renaming in the UI runs the journaled title cascade across every member file.

A Context link is a **dual surface**: an operational entity tags a Space by holding its title under the Context's parenthesized key, and the reverse direction — every entity tagging a Space — resolves through a query rather than a stored inbound list; Spaces carry no schema. Space-to-Space links ride the same parenthesized keys in a Space's own sidecar. Full detail → `Features/ContextsPM.md`.

#### Agenda (Tasks + Events)

The calendar layer, two peer kinds, each in its own singleton folder that the nexus registers by the config sidecar's ID — a config it does not record is inert:

- **Tasks** (`.md`, `TaskID`) — reminder-shaped.
- **Events** (`.md`, `EventID`) — calendar-event-shaped.

Their fields are an open question — what replaces the removed inherited shape is the Agenda work's to decide, the built-in **Status** among it. Both carry the same parenthesized Context keys as Pages. EventKit sync is opt-in, and being an API-only mapping it constrains nothing about what Pommora stores. Full detail → `Features/AgendaPM.md`.

#### Properties

Property **definitions** live in one nexus-wide registry (`.nexus/properties.json`) — defined once, assigned by any Collection, one shared definition and option set everywhere; an agenda config carries identity and nothing else. Property **values** live in each entity's frontmatter or JSON. A property's identity is a stable ULID held in the registry; its name is the key its values write under, unique nexus-wide, and a rename sweeps every page holding it. The v1 catalog:

- **Number**, **Checkbox**, **Date** (date-only or with-time), **Select**, **Multi-select**, **Status**, **URL**, **Context** (registry-minted, one per Context), **Last Edited Time** (derived), and **File / Attachment**.

There is no free-form text type yet — the filename is the title, and text-shaped values use creatable Select options. **Status** groups are an open set — seeded with three whose completion semantics drive calendar compatibility — with user-editable options inside each. There are no user-creatable relation properties — the Context link is the sole relation — and option lists are managed through the schema editor, not typed inline. Values are bare — a Status stores its label, a Number a number, a Date a timestamp — because the key already says which property the value belongs to. Context values are parenthesized title keys at the entity root over bare Space titles. Full catalog → `Features/PropertiesPM.md`.

#### Views

A view is a saved presentation of a Collection's (or depth-1 Set's) Pages; each container's sidecar holds an ordered list of saved views; the active view is tracked per-machine so switching it doesn't churn the synced file. A view records its renderer type, property layout (column order plus a hidden set), and its sort / filter / group config, fed by one pure pipeline: **fetch → filter → group → sort**.

The registered view types are **Table**, **Cards**, **List**, **Gallery**, **Calendar**, and **Timeline** — Table and Cards carry renderers; the rest are registered types with none. Views also embed as tiles in block-host surfaces — a **Linked View** referencing a saved view, or a **Custom View** with embed-owned, nexus-wide config. Two capabilities go beyond the baseline: multi-key sort, and recursive AND/OR filter groups. Full detail → `Features/ViewsPM.md`.

#### The Local-End Translation Principle

**The local file is the spec, not the render.** Anything Pommora computes — board contents, gallery cards, aggregated counts, relation lookups — is referenced by directive in the file, never inlined. An external agent reads the directive and understands the structure; the rendered data lives only inside Pommora.

#### Connections

Connections are body `[[Title]]` links — the sole connection syntax, rendered as styled colored inline text (Obsidian-style), never as Notion-style chips. The disk format stays plain and Obsidian-compatible: just the bracketed title, no embedded id or alias.

In v1, connections resolve by title. A uniquely-held title is live and navigable; a title held by two Pages is ambiguous; an unmatched one renders as inert literal text with the brackets visible, going live the moment a single matching Page exists. Renaming a target **cascades** — every referencing body is rewritten to the new title, per-file atomic and re-runnable rather than transactional. Resolution runs on an in-memory map and the cascade scans the page tree, so connections depend on no database at all. Typing `[[` plus at least one character opens an autocomplete over prefix-matching Pages Nexus-wide. Canonical spec → `Features/ConnectionsPM.md`.

#### Sidebar Navigation

The sidebar surfaces curated, app-relevant navigation — not a raw filesystem view. It is a fixed **ribbon** (an icon strip pinned to the left edge, the Nexus's identity icon at its top opening the Homepage) beside a **content column** that shows one mode at a time: **Collections**, **Contexts**, or **Agenda**. There is no header row and no all-at-once stack; switching modes plays the overtake sweep. The Agenda mode holds its place with an empty state, form-independent of whatever Agenda becomes.

Every entity reorders by drag-and-drop, and Pages reparent across the tree. Creation is right-click-first — a context menu offers "New X" options scoped to the cursor location. Full spec → `Features/SidebarPM.md`.

#### App Shell + Property Surfaces

A three-pane shell: sidebar / main / inspector, both side panes drag-resizable with persisted widths. The inspector is reserved for the **Claude chat** (a frontend to a local CLI, not an API integration); its own design pass is pending. Properties do *not* live there — they live with the content, in a panel attached to the Page.

Every entity opens under a consistent header. Containers can set an optional **banner** image that bleeds edge-to-edge under the side panes; when set, the title overlays its bottom-leading corner, and the banner and title lock in place while the body scrolls.

#### Navigation History

The main pane is **multi-tab**: warm, state-preserving toolbar tabs, one view mounted at a time, with **Back / Forward** stepping each tab's own history. Pinned refs dock left as compact icon tabs, an auto-tracked **Recents** stream feeds the **NavView** gallery (the new-tab page) and the floating **NavWindow**, and a footer **breadcrumb** — with a dimmed forward ghost-crumb for the last-visited page — tracks location. Full spec → `Features/NavigationPM.md`.

#### First-Launch Experience

On launch Pommora restores the last opened Nexus or opens empty — never a launch modal. The File menu's Open Nexus picks a folder, and a dropped folder opens the same way. Seeding is split by what it costs to be wrong: the Contexts registry seeds on any open that finds none, because a Nexus without one can't mint its first Context; the Tasks and Events folders seed **only** as a folder becomes a Nexus, because re-seeding an established one would recreate folders its owner deleted. Settings and the Homepage config are written into existence by the first write that needs them — a knob flip, a banner — and every read tolerates their absence. Opening a folder that isn't a Nexus runs an idempotent adoption pass that classifies each folder by position and leaves existing notes untouched until edited. No tutorial, no walkthrough wizard.

#### Design System

A two-tier token system — primitives (one neutral base at opacities, accent, tints, the type ramp) feeding semantic aliases — authored in code and sourced from a Figma library. Colors are authored as hex; the token layer is the single source. Glass uses two materials: a CSS **frost** for Window and Surface, and Apple **"Liquid Glass"** for Controls. Motion is tokenized, with a canonical bloom-and-retract for panes and menus. V1 ships one scheme plus in-app accent customization. Full philosophy → `Features/DesignSystemPM.md`; type → `Features/TypographyPM.md`; motion → `Features/InteractionPM.md`.

#### MacOS Integration

First-party where Electron reaches it — the native menu bar and dark mode are in the shell; `pommora://` deep links, notifications, and a tray icon are targets, not built. QuickLook previews, a Share Extension, and deep Spotlight indexing require a companion Swift bundle shipped alongside. Finder file-promise drag-out, true sidebar vibrancy, and Spaces-aware window restoration are Electron ceilings to ship a companion for or accept. Detail → `Resources/Mac-Integration.md`.

#### Distribution

The current build is ad-hoc-signed. A distributable release adds electron-builder packaging, electron-updater auto-update over GitHub Releases for the direct build, and `@electron/notarize` for a Developer ID identity under the hardened runtime. A Mac App Store build runs sandboxed with security-scoped access to the user-picked Nexus folder — the same constraint a sandboxed native build carries, no feature blocker. Detail → `Resources/Distribution.md`.

---

### v1 Scope

- **Contexts & Spaces** — free-standing, user-manageable Context groups holding Spaces (the registry seeds Areas / Topics / Projects), each group a sidebar disclosure. No containment, no parents.
- **Page Collections + Sets + Pages** — schema-bearing Collections, schema-less recursive Sets, and Markdown Pages. UI labels renameable. Each Collection chooses preview-window vs. main-pane opening.
- **Pages** — Markdown + frontmatter (including the wrapped Context and property keys), the MarkdownPM editor, Columns and Callouts.
- **Agenda** — Tasks and Events with a required built-in Status on each; sync opt-in; reached through the sidebar ribbon's own Agenda mode.
- **Homepage** — singleton dashboard, always reachable from the ribbon's identity icon.
- **Settings** — storage, label wiring across renameable surfaces, accent-color reading, and the full editing UI.
- Property panel driven by each entity's schema, the full v1 catalog (including Status and File / Attachment), and per-view configuration (sort / group / filter / layout / visibility).
- Connections — `[[Page]]` inline links, the sole connection syntax, with automatic rename cascade across all referencing bodies.
- A file watcher keeping the tree live, and global full-text search.
- Sidebar — the ribbon's Collections / Contexts / Agenda modes plus user-creatable Collection sections, reorderable with drag-and-drop.
- Inline editing of embedded views.
- One design scheme plus in-app accent customization.

**Out (post-v1):** additional view types beyond the v1 set, synced page-body blocks, sync, mobile, plugins, ad-hoc properties, multi-Collection pages, independent UI titles, in-line view embeds in Pages, chip-style connections, full Settings editing UI, and more — the catalog is [[FrameworkPM]] §Prospects.
