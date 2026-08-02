## Subfield (Footer)

The bottom bar of every content view, named the **Subfield**. A breadcrumb on the left, per-view items on the right. Lives in `Detail/Subfield/`, mounted by `DetailPane` below the routed view.

> **v1 — deliberately small. Much more is planned** (see *Roadmap* below): user-reorderable items, user-defined items, and per-view configuration. The structure here is the seam for all of it.

### What It Shows

- **Breadcrumb** — the ancestor chain for the open view. Collection and depth-1 Set segments navigate; deeper Sub-Sets are plain; the current segment is inert. A container view also shows the **ghost crumb**: the last page you backed out of, rendered dimmed but still clickable to jump forward. The trail records the last-visited page per container while a page is open.

- **Per-view items** — a registry keyed by view kind. **Pages** show `lines · words · characters` — lines counting raw source, words and characters counting Markdown-stripped prose — tracking the editor's live-body buffer rather than the saved file, so the count settles just behind the keystroke instead of waiting on the save. **Collections and Sets** show a **+** add-menu; **NavView** shows a **List / Gallery** toggle; a **Space** takes the bar with its crumb alone and no items. **Homepage and Contexts show no Subfield** — the Homepage has nothing to surface, and a Context is a disclosure with no detail view at all. The footer shows for the empty state only with a nexus open.

### Scoped Mounts (the floating preview)

The Subfield takes one optional **`scope`**. Unscoped, at the detail-pane mount, it reads the global selection and live body exactly as above. Scoped — the floating **Page Preview** passes its active page and its own live body — the footer describes *that* page instead. Two rules hold the scope apart from the detail mount: the count comes from a **local** body the host owns, since a second writer to the single-owner live-body slot would evict the main pane's live count to its saved snapshot, and the scoped crumbs are **non-navigable**, the preview being tab-neutral. The registry threads the scope to each item; only the stats item reads it.

### Look

- Type is the **Subline** scale, bound to its emphasized variant. Text is the single **`label.control`** token; the glyphs are **`label.secondary`**, the separators a step larger and bolder. The bar height is fixed, so switching to a view with fewer items never janks it. The top divider consumes the app's shared heading seam. Left and right indent sit at the gutter midpoint — the full gutter reads wonky at this size.

- **App-level collapse** — one flag shared across every detail-pane view. A hover-revealed chevron rides directly above the bar, mirroring its height and bouncing with the slide; its reveal zone is a large bottom-right region that never blocks clicks beneath.

### Persistence

Per-nexus, in `.nexus/settings.json` under an app-specific **`subfield`** key holding the per-view item order and the expanded flag; unknown keys are preserved, so it round-trips safely. The store reads it alongside the tree and persists on every change. Item ids from disk are validated against the registry before render.

### Roadmap (Planned)

- **Reorder** the items via PommoraDND (horizontal) — the persisted `order` is already wired; the drag UI is the next piece.
- **User-defined items**, possibly **scoped** — the registry + per-view `order` is the extensibility seam.
- **Per-view configuration UI** — choosing which items each view kind shows.
- Bring the Subfield to the **Homepage** once it has content worth surfacing.
