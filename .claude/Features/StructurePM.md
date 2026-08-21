## Structure

```
Structure
├── The Organization Layer
├── The Operational Layer
├── Singletons
├── Identity & Linking
└── Pending
```

Pommora is organized as **two layers** with PARA-aligned naming. The organization layer (Contexts) holds categorical anchors; the operational layer (Pages + Agenda) holds the data, relating to the organization layer through parenthesized Context keys at its frontmatter or JSON root. A **Nexus** is the root — one folder holding everything.

| PARA Term   | Pommora Term               | Layer        |
| ----------- | -------------------------- | ------------ |
| (workspace) | **Nexus**                  | Root         |
| Areas       | **Areas** (seeded Context) | Organization |
| Topics      | **Topics** (seeded Context) | Organization |
| Projects    | **Projects** (seeded Context) | Organization |
| Resources   | **Pages + Agenda**         | Operational  |
| (dashboard) | **Homepage**               | Singleton    |

### The Organization Layer

A **[[ContextsPM|Context]]** is a user-defined, free-standing group of **Spaces**, owned by a registry at `.nexus/contexts.json`, with Areas, Topics, and Projects seeded as ordinary entries. No Context contains, parents, or is restricted to another; operational entities tag whichever Spaces fit, independently. Contexts carry no pages and no schema — Spaces are the categorical anchors things point at, each with its own block surface.

### The Operational Layer

| Entity              | Role                                                          | Default UI Label  |
| ------------------- | ------------------------------------------------------------- | ----------------- |
| **Page Collection** | Top container for Pages; assigns their nexus-wide properties  | "Collection"      |
| **Page Set**        | Recursive sub-folder inside a Collection; inherits the schema | "Set" / "Sub-Set" |
| **Page**            | Markdown document — prose plus frontmatter                    | "Page"            |
| **Task**            | Reminder-shaped `.md`, keyed `TaskID`                         | "Task"            |
| **Event**           | Calendar-shaped `.md`, keyed `EventID`                        | "Event"           |

A [[CollectionsPM|Collection]] assigns which registry properties its [[PagesPM|Pages]] validate, and that schema applies at any depth. Tasks and Events are [[AgendaPM|Agenda’s]] two peer kinds, each in its own singleton folder; the [[PropertiesPM|properties]] catalog spans all kinds.

### Singletons

- **Homepage** — one per Nexus, always reachable and never user-deletable, with the file location as its identity. The ribbon's identity icon opens it in the main pane, where its title doubles as the nexus rename affordance, and it hosts a live block surface under its banner.[^1]
- **Settings** — per-Nexus config at `.nexus/settings.json`: UI labels, the profile, and personalization.[^2]

### Identity & Linking

Every entity carries a stable **`id`** — a ULID assigned at creation, stored under the key naming its kind for content files and in the sidecar for containers — and a **title**, the filename or folder name, freely renameable

| Link                       | Stored As                                                           | Purpose                |
| -------------------------- | ------------------------------------------------------------------- | ---------------------- |
| Page → Page (connection)   | Plain `[[Title]]` in the body, resolved by unique title             | Inline reference       |
| Operational entity → Space | `(Context):` at the frontmatter / JSON root, over bare Space titles | Categorical assignment |
| Space → Space              | The same parenthesized keys in the Space's own `_space.json`        | Cross-Context links    |
| Page → Collection / Set    | Implicit by file location                                           | Membership             |

Every link form is stored as a title and resolved at read time, and property values follow the same discipline — a value writes under its property's name. Context links are the only relation-type connection; markdown links are [[ConnectionsPM|’Connections’]].

### Pending

- **Homepage's final shape** — a developer surface standing in for a settled one; its final form is its own design pass, with a graph-view host carrying custom widgets as the leading direction.

[^1]: [[SurfacePM]]
[^2]: [[ConfigurationPM]]
