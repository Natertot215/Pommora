## Contexts & Spaces

```
Contexts & Spaces
├── The Registry Model
├── Writes
├── Surfaces
└── Pending
```

The organization layer. A **Context** is a user-defined group — a fresh Nexus seeds Areas, Topics, and Projects as ordinary, fully manageable entries — and a **Space** is one member inside a Context. Content relates *to* Spaces: a Page, Task, or Event tags whichever Spaces fit, independently, and no Context contains or parents another. Contexts carry no pages and no schema; a Space is a categorical anchor with a block surface of its own.[^1]

### The Registry Model

Context identity lives in one file, `.nexus/contexts.json`, modeled by `contextsRegistry` in `src/shared/contexts.ts`: each entry carries an `id` (a minted ULID, seeded and user-created alike), a `title`, an optional `singular` (the seeded three carry one, so their create entries read "New Area" rather than "New Space"), and an optional `icon`, with array position as the display order. Everything else about the layer follows from the filesystem and the files that name a Space.

- **Spaces are folders** at `.nexus/contexts/<Context>/<Space>/`, each gated by a `_space.json` sidecar holding the Space's id, icon, chip color, banner, and its own relation keys. A folder without the sidecar isn't a Space. The Space's Context is its parent folder and nothing else records it, so re-homing a Space is a move, and a Context rename is a folder rename plus a cascade.
- **Membership lives in member files** as parenthesized title keys at the root, over an array of bare Space titles — the same shape in a page's frontmatter and in a `_space.json`, where JSON quotes the key. Member files carry no ids; the registry resolves titles at read time, and an emptied key is removed rather than written empty.
- **Validation is registry membership at read.** A key must exactly match a registry title; a value matches through one normalizer (`normalizeContextValue`) that folds case, whitespace, composition, and scalar drift, so `- 2024` still finds the Space titled "2024". A drifted-but-resolvable value displays and repairs on that file's next context write; an unknown value sits inert. Any other membership shape is a foreign key, preserved and read by nothing.
- **Title uniqueness folds case** at create and rename, since the filesystem does; a case-only rename of an entity itself passes.

```yaml
(Projects):
  - Pommora
```

### Writes

Every Context write runs through `src/main/crud/contextWrite.ts` and `contextCascade.ts`, serialized on the registry file's own lock and under per-file locks for each root it rewrites.

- **Membership** — one write per entity kind (a content file, or a Space's sidecar), reconciling the whole root it rewrites. Space-to-Space links take the same shape: a Space tags other Spaces through its own sidecar keys, in its own Context or another.
- **Renames** are journaled and cascade the title across every context-bearing root — each page's frontmatter and each Space's sidecar — with the registry committed last, so a crash replays forward on the next open and a failed commit reverses the cascade.[^2] The key is renamed where it sits, keeping its position and any comment attached to it.
- **Deletes unlink first.** A Space's title, or a Context's whole key and registry entry, is stripped from every member file before the folder moves to the trash, and the stripped membership is captured in the deletion record so a restore re-applies it.[^3] A page that loses a tag is re-dated; a rename never re-dates.
- **Creates** — a new Context appends to the registry and opens straight into an inline rename; a new Space is written with its 2×2 block board seeded.

### Surfaces

Contexts appear in three places, each reading the registry through the walk-resolved tree.

- **Sidebar (Contexts mode)** — every Context renders as a disclosure of Space rows. Group headers drag to reorder the registry, Spaces drag within their group, right-click inside a group creates a Space (labeled from the Context's singular), right-click on the background creates a Context, and the header's native menu carries New, Rename, and Delete. A Context is a disclosure rather than a destination: selecting one renders nothing.[^4]
- **SpaceView** — selecting a Space renders its banner scaffold over its block surface, the second block host beside the Homepage, with a per-Space board lock and its Subfield breadcrumb.[^1]
- **The Space settings pane** — reached from the toolbar's settings button: the icon and title heading, outlined in the Space's color, over the footer's board lock. Right-clicking the heading offers Rename, Edit Icon, and Hide Icon, with Change Color below them. The app-level Settings window is separate.[^5]
- **Views** — each registry Context is one column, off by default, so creating a Context never changes an existing view. Cells read each row's resolved context values, and chips everywhere wear the Space's icon and assigned color.[^6]

---

#### Pending

- **Space-to-Space relation rows** — the settings pane's rows for a Space's own memberships. The write path is live; the UI isn't, and Context keys are outside the content index.
- **Space-create labels** — the entries read a stored singular, so a renamed seeded Context keeps its old label.
- **ContextView and Linked-From** — a Context's own aggregate surface, and the inbound list of every entity tagging a Space. Both need a reverse query the index doesn't yet answer.

[^1]: [[SurfacePM]]
[^2]: [[ArchitecturePM]] §Mutations
[^3]: [[NexusRecordPM]]
[^4]: [[InterfacePM]] §The Sidebar
[^5]: [[ConfigurationPM]]
[^6]: [[ViewTypesPM]] §Columns
