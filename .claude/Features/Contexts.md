## Contexts & Spaces

The organization layer. A **Context** is a user-defined group — a fresh nexus seeds Areas, Topics, and Projects from its entity labels on open, as ordinary, fully manageable entries — and a **Space** is an individual member inside one Context. Content relates *to* Spaces; no Context contains or parents another, and an entity tags whichever Spaces fit, independently.

### Features

#### II. The Registry Model

- **`.nexus/contexts.json` owns Context identity** — id, title, singular, icon; array position IS the display order. Every entry carries an ordinary minted ULID, seeded and user-created alike, and nothing resolves a Context by a reserved id. Title uniqueness folds case at create/rename — the filesystem is case-insensitive, so a case-variant twin would silently share one folder — while a case-only rename of an entity itself passes.

- **Spaces are folders** at `.nexus/contexts/<Context>/<Space>/`, gated by their `_space.json` sidecar (id, chip-solid color, banner, the block doc, and the Space's own relation keys). A folder without the sidecar isn't a Space. Banner bytes live under `.nexus/assets/<id>/`, served over the read-only asset scheme.

- **Membership lives in member files as quoted bracketed title keys** at the root — `"[Projects]": [Pommora]` — identical in page frontmatter, agenda JSON, and `_space.json`. Values are always arrays of Space titles; an emptied key is removed, never written empty. No ULIDs in member files: the registry resolves titles to ids at read, and ids resolve back to titles only at main's write boundary.

- **Validation is registry membership at read**: keys exact-match a registry title; values match through one normalizer, so case, whitespace, composition, and scalar drift all still resolve. A drifted-but-resolvable value displays fine and repairs on that file's next context write; an unknown value sits inert — never guessed, never dropped on read.

- **The bracketed key is the only membership shape.** Nothing reads or converts the pre-registry `tierN` arrays — a file still carrying them keeps them as foreign keys, preserved by value and otherwise ignored.

#### II. Writes

- **`setContext`** is the one membership write per entity kind (page / agenda / space), under per-file locks, reconciling the whole root it rewrites. Space-to-Space links use the same shape: a Space tags Spaces through its own sidecar keys, in its own Context or another.

- **Renames are journaled**: a rename writes the pending-rename journal first, cascades the title across all three file scopes, commits the registry, then settles — a crash replays forward on the next open (with re-mint guards), and a live registry-commit failure reverses the cascade. Renames are id-keyed; ids never change.

- **Deletes unlink first**: a Space's title value (or a Context's whole bracketed key plus registry entry) strips from every member file before the folder moves to the recoverable trash.

- **Creates**: a new Context appends to the registry (minted with the contexts glyph) and opens straight into inline rename; a new Space seeds the 2×2 block board — four empty markdown tiles, files written first. The seeded Contexts carry a singular from the nexus labels, so their Space-create entries read "New Area" / "New Topic" / "New Project"; every other Context reads the flat "New Space".

#### II. Surfaces

- **Sidebar (Contexts mode)**: every Context renders as a disclosure of Space rows. Group headers drag to reorder the registry; Spaces drag within their group (`space_orders` in state.json); in-group right-click creates a Space, background right-click creates a Context, and the group header's native menu carries New / Rename / Delete. A Context is a disclosure, not a destination — selecting one renders nothing. A create always lands visible: the new row's inline rename forces its collapsed ancestor disclosures open, and a click that settles a header's own rename never doubles as a disclosure toggle.

- **SpaceView**: a Space selection renders its banner scaffold over its block surface — `_space.json` is the second BlockHost beside the homepage, with a per-Space board lock — plus its Subfield breadcrumb. Its heading wears the Space's icon through the shared banner title header — the same hide/reveal slide, right-click menu, and inline rename as Collection and Set views, banner or no banner.

- **The Space settings pane** rides the toolbar trio's settings button: the (Icon)(Title) heading over the footer's board lock, with the icon button and title field outlined in the Space's color through the input-field OutlineTint channel. Right-clicking the heading offers Change Color (the shared ColorPicker). Spaces have no floating settings surface of their own — they manage through this pane; the app-level Settings window is a separate surface (→ `Configuration.md`).

- **Pipeline**: context columns are default-OFF — absence from a view's `property_order` IS hidden, so creating a Context never changes an existing view. Cells read each row's walk-resolved context values with an optimistic rider on the override layer, and chips everywhere wear the Space's icon + chip-solid color from one identity seam.

#### II. Index

The SQLite index holds a `contexts` row per Space (keyed by its Context id) and a `context_links` row per membership value across page, agenda, and space sources, with a target-keyed index ready for a reverse lookup. Nothing reads any of it yet — resolution runs at walk assembly off the registry, so losing the index loses nothing. The reverse query that Linked-From and ContextView both need is unwritten, and it's the single dependency blocking them.

### Pending

**Space-to-Space Relation Rows:** the settings pane's assign-reveal rows for a Space's own memberships — the write path and index are live, the UI isn't.

**Space-Create Labels:** the "New Area" / "New Topic" / "New Project" entries key off the Context's exact title; per-Context custom singulars, and any wider set of recognized titles, follow behind it.

**ContextView + Linked-From:** a Context's own aggregate surface, and the inbound list of every entity tagging a Space — both ride the indexed reverse query.
