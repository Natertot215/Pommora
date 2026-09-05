## Contexts & Spaces

The organization layer. A **Context** is a user-defined group — a fresh nexus seeds Areas, Topics, and Projects on open, as ordinary, fully manageable entries — and a **Space** is an individual member inside one Context. Content relates *to* Spaces; no Context contains or parents another, and an entity tags whichever Spaces fit, independently. Contexts carry no pages and no schema; a Space is a categorical anchor with a tile surface of its own.

### The Registry Model

Context identity lives in one file, `.nexus/contexts.json`, modeled by `contextsRegistry` in `src/shared/contexts.ts`: each entry carries an `id` (a minted ULID, seeded and user-created alike), a `title`, an optional `singular` (the seeded three carry one, so their create entries read "New Area" rather than "New Space"), and an optional `icon`, with array position as the display order. Everything else about the layer follows from the filesystem and the files that name a Space.

- **Spaces are folders** at `.nexus/contexts/<Context>/<Space>/`, each gated by a `_space.json` sidecar holding the Space's id, icon, chip color, banner, and its own relation keys. A folder without the sidecar isn't a Space. The Space's Context is its parent folder and nothing else records it, so re-homing a Space is a move, and a Context rename is a folder rename plus a cascade.
- **Membership lives in member files** as `<Title>` keys at the root, over an array of bare Space titles — the same shape in a page's frontmatter and in a `_space.json`, where JSON quotes the key. Member files carry no ids; the registry resolves titles at read time, and an emptied key is removed rather than written empty.
- **Validation is registry membership at read.** A key must exactly match a registry title; a value matches through one normalizer (`normalizeContextValue`) that folds case, whitespace, composition, and scalar drift, so `- 2024` still finds the Space titled "2024". A drifted-but-resolvable value displays and repairs on that file's next context write; an unknown value sits inert. Any other membership shape is a foreign key, preserved and read by nothing.
- **Title uniqueness folds case** at create and rename, since the filesystem does; a case-only rename of an entity itself passes.

```yaml
<Projects>:
  - Pommora
```

### Writes

Every Context write runs through `src/main/CRUD/contextWrite.ts` and `contextCascade.ts`, serialized on the registry file's own lock and under per-file locks for each root it rewrites.

- **Membership** — one write per entity kind (a content file, or a Space's sidecar), reconciling the whole root it rewrites. Space-to-Space links take the same shape: a Space tags other Spaces through its own sidecar keys, in its own Context or another.
- **Renames** are journaled and cascade the title across every context-bearing root — each page's frontmatter and each Space's sidecar — with the registry committed last, so a crash replays forward on the next open and a failed commit reverses the cascade. The key is renamed where it sits, keeping its position and any comment attached to it.
- **Deletes unlink first.** A Space's title, or a Context's whole key and registry entry, is stripped from every member file before the folder moves to the trash, and the stripped membership is captured in the deletion record so a restore re-applies it. A page that loses a tag is re-dated; a rename never re-dates.
- **Creates** — a new Context appends to the registry and opens straight into an inline rename; a new Space is written with its 2×2 tile board seeded.

### Surfaces

Contexts appear in three places, each reading the registry through the walk-resolved tree.

- **Sidebar (Contexts mode)** — every Context renders as a disclosure of Space rows. Group headers drag to reorder the registry, Spaces drag within their group, right-click inside a group creates a Space (labeled from the Context's singular), right-click on the background creates a Context, and the header's native menu carries New, Rename, and Delete. A Context is a disclosure rather than a destination: selecting one renders nothing.
- **SpaceView** — selecting a Space renders its banner scaffold over its tile surface, the second tile host beside the Homepage, with a per-Space board lock and its Subfield breadcrumb.
- **The Space settings pane** — reached from the toolbar's settings button: the icon and title heading, outlined in the Space's color, over the footer's board lock. Right-clicking the heading offers Rename, Edit Icon, and Hide Icon, with Change Color below them. The app-level Settings window is separate.
- **Views** — each registry Context is one column, off by default, so creating a Context never changes an existing view. Cells read each row's resolved context values, and chips everywhere wear the Space's icon and assigned color.

---

#### Pending

- **Space-to-Space relation rows** — the settings pane's rows for a Space's own memberships. The write path is live; the UI isn't, and Context keys are outside the content index.
- **Space-create labels** — the entries read a stored singular, so a renamed seeded Context keeps its old label.
- **ContextView and Linked-From** — a Context's own aggregate surface, and the inbound list of every entity tagging a Space. Both need a reverse query the index doesn't yet answer.
