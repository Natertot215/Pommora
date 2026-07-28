### Structure (Domain Model)

Pommora is organized as **two layers** with PARA-aligned naming. The organization layer (Contexts) holds categorical anchors; the operational layer (Pages + Agenda) holds the data. Operational entities relate to organization entities through bracketed Context keys in their frontmatter or JSON root. Per-entity detail lives in the dedicated feature docs.

The organization layer is user-defined **Context** groups holding **Spaces**, the registry seeding Areas, Topics, and Projects as ordinary entries; the operational layer is Pages and Agenda, with two singletons beside them. A **Nexus** is the root — one folder holding everything.

| PARA term | Pommora term | Layer |
|---|---|---|
| (workspace) | **Nexus** | Root |
| Areas | **Areas** (seeded Context) | Organization |
| Topics | **Topics** (seeded Context) | Organization |
| Projects | **Projects** (seeded Context) | Organization |
| Resources | **Pages + Agenda** | Operational |
| (dashboard) | **Homepage** | Singleton |

### Organization Layer

#### II. Contexts

A **Context** is a user-defined, free-standing group of **Spaces**, owned by a registry at `.nexus/contexts.json`. No Context contains, parents, or is restricted to another; operational entities tag whichever Spaces fit, independently. Contexts carry no pages and no schema — Spaces are the categorical anchors things point at, each with its own block surface. Full spec → `Contexts.md`.

### Operational Layer

#### II. Pages

| Entity | Role | Default UI label |
|---|---|---|
| **Page Collection** | Top container for Pages; assigns their nexus-wide properties | "Collection" |
| **Page Set** | Recursive sub-folder inside a Collection (any depth); inherits the schema | "Set" / "Sub-Set" |
| **Page** | Markdown document — prose plus frontmatter | "Page" |

Property definitions live in the nexus-wide registry; a Collection assigns which ones its Pages validate, and that assigned schema applies at any depth — all Sets inherit it. On disk: a Collection is `_pagecollection.json`, every Set is `_pageset.json`, a Page is a `.md` file. Full spec → `Collections.md` + `PageSets.md` + `Pages.md`.

#### II. Agenda

The parent schema holding two peer kinds, each with its own config sidecar and the shared property catalog plus Context links:

- **Task** (`.task.json`) — reminder-shaped: due date, completion, priority.
- **Event** (`.event.json`) — calendar-event-shaped: start, end, location.

Full spec → `Agenda.md`; the property catalog across all kinds → `Properties.md`.

### Singletons

#### II. Homepage

One per Nexus — always reachable and never user-deletable, with no `id`, Context links, or `parents`; the file location is its identity. Its `.nexus/homepage.json` config is written on the first block or banner edit. The **Homepage ribbon icon** is its entry point: selecting it opens the Homepage in the main pane, where its title doubles as the nexus rename affordance. It hosts a live block surface under its banner (→ [[SurfacePM]]).

#### II. Settings

Per-Nexus config at `.nexus/settings.json` — UI labels, a profile image and subtitle, the app's `subfield` key, and the `personalization` block. Labels feed every renameable surface. The full config model → `Configuration.md`.

### Identity + Linking

#### II. Entity Identity vs Title

- **`id`** — a stable ULID assigned at creation, never changing. It identifies the entity itself; no on-disk link form carries it. An entity read from a folder Pommora hasn't adopted yet reads under a stable id hashed from its Nexus-relative path, held until adoption mints a real one.

- **Title** — the display name, carried as the filename minus extension, freely renameable. Renames are filesystem renames; in-memory references resolve to the current title at render time.

Names are unique within a folder (filename = title): a colliding Page create auto-disambiguates, and a colliding rename is rejected. Titles aren't unique Nexus-wide — Pages in different folders may share one, and a connection to a shared title resolves as ambiguous (→ `Connections.md`).

#### II. The Linking Model

| Link                       | Stored as                                                        | Purpose                |
| -------------------------- | ---------------------------------------------------------------- | ---------------------- |
| Page → Page (connection)   | plain `[[Title]]` in the body, resolved by unique title          | Inline reference       |
| Operational entity → Space | `"[<Context>]": [<Space titles>]` at the frontmatter / JSON root | Categorical assignment |
| Space → Space              | The same bracketed keys in the Space's own `_space.json`         | Cross-Context links    |
| Page → Collection / Set    | Implicit by file location                                        | Membership             |

Every link is stored as a title and resolved at read time — an id never reaches disk on either form. Context links are the only relation-type connection, resolved through the registry and held correct across a rename by a journaled cascade over every member file; body connections are held correct by a nexus-wide body rewrite. Full rules → `Contexts.md` + `Connections.md`.

### Architecture

#### II. On-Disk Model

Files are canonical: Pages are `.md` (YAML frontmatter + body); Contexts, Agenda, sidecars, and all config are JSON. **A container's kind is its folder's sidecar filename**, never a frontmatter field; an **Agenda item's kind is its file extension**. Foreign keys — and YAML comments on pages — are preserved by value on every write. A device-local database beside the read path currently holds per-machine chrome — view selection, editor state, tabs, and each block host's document — so a Nexus stays complete without it. Full on-disk spec and the read/IPC engine → `Architecture.md`.

#### II. The NexusTree Contract

The read side is one eager, read-only walk producing a pre-ordered `NexusTree` — every node, ordering, label, and resolved setting the renderer needs, consumed without re-sorting. Agenda singletons are discovered but not surfaced. Full shape → `Architecture.md`.

### Pending

**Homepage's Final Shape:** A developer surface for now — its final form is its own design pass (a graph-view host with custom widgets is the current direction).
