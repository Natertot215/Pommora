## Subfield (Footer)

The bottom bar of every content view, named the **Subfield**. A breadcrumb on the left, per-view items on the right. Lives in `Detail/Subfield/`, mounted by `DetailPane` below the routed view.

> **v1 — deliberately small. Much more is planned** (see *Roadmap* below): user-reorderable items, user-defined items, and per-view configuration. The structure here is the seam for all of it.

### What It Shows

- **Breadcrumb** (`SubfieldBreadcrumb` + `crumbs.ts`) — the ancestor chain for the open view. Collection and depth-1 Set segments navigate (`store.select`); deeper Sub-Sets are plain; the current segment is inert. A container view also shows the **ghost crumb**: the last page you backed out of, rendered dimmed but still clickable to jump forward. The trail is `store.trail` (last-visited page per container id), recorded while a page is open.

- **Per-view items** (`subfieldItems.tsx`) — a registry keyed by view kind. v1: **pages** show `lines · words · characters` (`subfieldStats.ts` — lines count raw source, words and characters count Markdown-stripped prose), tracking the editor's `liveBody` buffer in the store rather than the saved file, so the count settles just behind the keystroke instead of waiting on the save; **Collections / Sets** show a **+** add-menu (New Page / New container); **NavView** (the `none` empty state) shows a **List / Gallery** toggle driving `store.navViewMode`; a **Space** takes the bar with its crumb alone and no items. **Homepage and Contexts show no Subfield** — the Homepage has nothing to surface yet, and a Context is a disclosure with no detail view at all. The footer shows for `none` only with a nexus open (bare `none` also renders the no-nexus prompt).

### Scoped Mounts (the floating preview)

The Subfield takes one optional **`scope`** prop (`{ target, body }`). Unscoped (the detail-pane mount) it reads the global `selection` and the store `liveBody` exactly as above. Scoped — the floating **Page Preview** passes its active page + its own live body — the footer describes *that* page instead: its container crumbs, and `PageStatsItem` counts the scope's body. Two rules hold the scope apart from the detail mount: the count comes from a **local** body the host owns (the preview never writes the single-owner `liveBody` slot — a second writer would evict the main pane's live count to its saved snapshot), and the scoped crumbs are **non-navigable** (the preview is tab-neutral, so its breadcrumb locates but never drives `select`). The item registry threads `scope` to each item via a props bag; only `PageStatsItem` reads it.

### Look

- Type is the **Subline** scale, bound to `subline.emphasized`. Text is the single **`label.control`** token; the glyphs (breadcrumb `›`, stats `·`, the `+`) are **`label.secondary`**, the separators a step larger and bolder. Fixed bar height (`--subline-h`) so switching to a view with fewer items never janks it. The top divider consumes the app's shared heading seam, `--border-heading`. Left/right indent sits at the gutter midpoint (full gutter read wonky at this size).

- **App-level collapse** — one `store.subfieldExpanded` flag shared across every detail-pane view. A hover-revealed chevron rides directly above the bar (mirrors its height, bounces with the slide); the reveal zone is a large bottom-right region tracked in `DetailPane` (`.subfield-near`) so it never blocks clicks beneath.

### Persistence

Per-nexus, in `.nexus/settings.json` under an app-specific **`subfield`** foreign key (unknown keys are preserved, so it round-trips safely): `{ order: per-view item ids, expanded }`. Read/written by `main/settings.ts` `readSubfield`/`writeSubfield`; surfaced over `subfield:get` / `subfield:set` IPC. The store reads it alongside the tree and persists on every change. Item ids from disk are validated against the registry before render.

### Roadmap (Planned)

- **Reorder** the items via PommoraDND (horizontal) — the persisted `order` is already wired; the drag UI is the next piece.
- **User-defined items**, possibly **scoped** — the registry + per-view `order` is the extensibility seam.
- **Per-view configuration UI** — choosing which items each view kind shows.
- Bring the Subfield to the **Homepage** once it has content worth surfacing.
