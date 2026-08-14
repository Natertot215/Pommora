## Subfield

```
Subfield
├── What It Shows
├── Scoped Mounts
├── Look
├── Persistence
└── Pending
```

The bottom bar of every content view — a breadcrumb on the left, per-view items on the right. The structure is the seam for the configuration and custom items planned on it.

### What It Shows

- **Breadcrumb** — the ancestor chain for the open view. Collection and depth-1 Set segments navigate; deeper Sub-Sets are plain; the current segment is inert. A container view also shows the **ghost crumb** — the last page backed out of, rendered dimmed but still clickable to jump forward. The trail records the last-visited page per container while a page is open.
- **Per-view items** — a registry keyed by view kind. **Pages** show `lines · words · characters` — lines counting raw source, words and characters counting Markdown-stripped prose — tracking the editor's live body, so the count settles just behind the keystroke. **Collections and Sets** show a **+** add-menu; **NavView** shows a **List / Gallery** toggle; a **Space** takes the bar with its crumb alone. **Homepage and Contexts show no Subfield** — the Homepage has nothing to surface, and a Context is a disclosure with no detail view. The footer shows for the empty state only with a nexus open.

### Scoped Mounts

The Subfield takes one optional **`scope`**. Unscoped, at the detail-pane mount, it reads the global selection and live body as above. Scoped — the floating **Page Preview** mounts it in the PreviewPane footer slot, passing its active page and its own live body — the footer describes that page instead, re-scoping on tab switch. The count comes from a local body the host owns rather than the app-wide live-body slot, and the scoped crumbs are non-navigable, the preview being tab-neutral.

### Look

Type is the **Subline** scale, bound to its emphasized variant. Text is the single **`label.control`** token; the glyphs are **`label.secondary`**, the separators a step larger and bolder. The bar height is fixed, holding steady across views with fewer items. The top divider consumes the app's shared heading seam, and the left and right indent sit at the gutter midpoint.

**App-level collapse** — one flag shared across every detail-pane view. A hover-revealed chevron rides directly above the bar, mirroring its height and bouncing with the slide; its reveal zone is a large bottom-right region that never blocks clicks beneath.

### Persistence

Per-nexus, in `.nexus/settings.json` under an app-specific **`subfield`** key holding the per-view item order and the expanded flag; unknown keys are preserved, so it round-trips safely. Item ids from disk are validated against the registry before render.

### Pending

- **Reorder** the items via PommoraDND (horizontal) — the persisted `order` is wired; the drag UI is the next piece.
- **User-defined items**, possibly scoped — the registry plus per-view `order` is the extensibility seam.
- **Per-view configuration UI** — choosing which items each view kind shows.
- **The Homepage** — bring the Subfield there once it has content worth surfacing (→ [[SurfacePM]] §Pending, the Homepage's standing).
