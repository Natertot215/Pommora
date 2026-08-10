## Contexts & Spaces

```
Contexts & Spaces
├── The Registry Model
├── Writes
├── Surfaces
└── Pending
```

The organization layer. A **Context** is a user-defined group — a fresh nexus seeds Areas, Topics, and Projects from its entity labels on open, as ordinary, fully manageable entries — and a **Space** is an individual member inside one Context. Content relates *to* Spaces; no Context contains or parents another, and an entity tags whichever Spaces fit, independently.

### The Registry Model

- **`.nexus/contexts.json` owns Context identity** — id, title, singular, icon, with array position as the display order. Every entry carries an ordinary minted ULID, seeded and user-created alike. Title uniqueness folds case at create and rename, since the filesystem is case-insensitive; a case-only rename of an entity itself passes.
- **Spaces are folders** at `.nexus/contexts/<Context>/<Space>/`, gated by their `_space.json` sidecar — a folder without the sidecar isn't a Space. Banner bytes live under `.nexus/assets/<id>/`, served over the read-only asset scheme.
- **Membership lives in member files as parenthesized title keys** at the root, over arrays of bare Space titles — identical in content-file frontmatter and `_space.json`, where JSON quotes the key. Values are always arrays of Space titles; an emptied key is removed, never written empty. Member files carry no ULIDs — the registry resolves titles to ids at read.
- **Validation is registry membership at read** — keys exact-match a registry title, and values match through one normalizer, so case, whitespace, composition, and scalar drift all still resolve. A drifted-but-resolvable value displays fine and repairs on that file's next context write; an unknown value sits inert.
- **The parenthesized key is the only membership shape.** A file carrying another form keeps it as foreign keys, preserved by value and read by nothing.

### Writes

- **Membership** — one membership write per entity kind (content file / Space), under per-file locks, reconciling the whole root it rewrites. Space-to-Space links use the same shape: a Space tags Spaces through its own sidecar keys, in its own Context or another.
- **Renames are journaled** — a rename writes the pending-rename journal first, cascades the title across every context-bearing root (each page's frontmatter and each Space's sidecar), commits the registry, then settles; a crash replays forward on the next open, and a live registry-commit failure reverses the cascade. The key is renamed where it sits, keeping its position and any comment attached to it. Renames are id-keyed, and a Context rename also renames a folder — the journal covers the window nothing on disk records. The generic path-addressed rename can't name a Context or a Space.
- **Deletes unlink first, and capture what they unlink** — a Space's title value (or a Context's whole parenthesized key plus registry entry) strips from every member file before the folder moves to the recoverable trash. The sweep never reaches inside the folder being trashed; roots there are passengers whose links stay true in the trash. The record holds the stripped membership by id, so a restored Space's tag re-applies to every surviving root, and a restored Context re-enters the registry under a collision-free final title with its membership re-applied. A stripped page is re-dated — losing a tag is a content edit; a rename is not (→ [[NexusRecordPM]]).
- **Creates** — a new Context appends to the registry and opens straight into inline rename; a new Space seeds the 2×2 block board, files written first. The seeded Contexts carry a singular from the nexus labels, so their Space-create entries read "New Area" / "New Topic" / "New Project"; every other Context reads the flat "New Space".

### Surfaces

- **Sidebar (Contexts mode)** — every Context renders as a disclosure of Space rows. Group headers drag to reorder the registry, Spaces drag within their group, in-group right-click creates a Space, background right-click creates a Context, and the group header's native menu carries New / Rename / Delete. A Context is a disclosure, not a destination — selecting one renders nothing.
- **SpaceView** — a Space selection renders its banner scaffold over its block surface (a Space is the second BlockHost beside the Homepage, with a per-Space board lock) plus its Subfield breadcrumb. Its heading wears the Space's icon through the shared banner title header.
- **The Space settings pane** rides the toolbar trio's settings button: the (Icon)(Title) heading over the footer's board lock, with the icon button and title field outlined in the Space's color through the input-field OutlineTint channel. Right-clicking the heading offers Change Color. Spaces manage through this pane; the app-level Settings window is separate (→ [[ConfigurationPM]]).
- **Pipeline** — context columns are default-off; creating a Context never changes an existing view (→ [[ViewsPM]] §Columns). Cells read each row's walk-resolved context values, and chips everywhere wear the Space's icon and chip-solid color.

### Pending

- **Space-to-Space relation rows** — the settings pane's assign-reveal rows for a Space's own memberships; the write path and index are live, the UI isn't.
- **Space-create labels** — the entries read a stored singular, so a renamed seeded Context keeps its old label. The ruled behavior keys off the Context's exact title instead, letting the label follow a rename; per-Context custom singulars follow behind it.
- **ContextView + Linked-From** — a Context's own aggregate surface, and the inbound list of every entity tagging a Space. Both ride the reverse query a content index would answer, and no index exists (→ [[ArchitecturePM]]).
