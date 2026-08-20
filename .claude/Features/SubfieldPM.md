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

- **Breadcrumb** — the path for the open view, running from the Collection down to the current node. Collection and depth-1 Set segments navigate; deeper Sub-Sets are plain; the current segment is inert. Segments past the current one trace the path down to the **deepest node visited on it** — the segments last backed out of, rendered dimmed and still clickable to re-descend — navigating back up the path preserves the directory chain only while it continues the current path; a branch onto a different path ends it.
- **Per-view items** — a registry keyed by view kind. **Pages** show `lines · words · characters` — lines counting the source lines the document holds, words and characters counting the prose the editor actually draws — tracking the editor's live body, so the count settles just behind the keystroke. The counter reads the editor's own detectors for what is chrome and what is content, so a fenced block, a lone embed tile, a list marker, a quote prefix and a heading's hashes all contribute nothing, while an inline embed's title and a link's label count as the words they read as. The footnotes section is outside all three counts, and a body marker contributes the characters its syntax holds and no word. **Collections and Sets** show a **+** add-menu; **NavView** shows a **List / Gallery** toggle; a **Space** takes the bar with its crumb alone.

### Scoped Mounts

The Subfield takes one optional **`scope`**. Unscoped, at the detail-pane mount, it reads the global selection and live body as above. Scoped — the floating **Page Preview** mounts it in the PreviewPane footer slot, passing its active page and its own live body — the footer describes that page instead, re-scoping on tab switch. The count comes from a local body the host owns rather than the app-wide live-body slot, and the scoped crumbs are non-navigable, the preview being tab-neutral.

### Look

Type is the **Subline** scale, bound to its emphasized variant. Text is the single **`label.control`** token; the glyphs are **`label.secondary`**, the separators a step larger and bolder. The bar height is fixed, holding steady across views with fewer items. The top divider consumes the app's shared heading seam, and the left and right indent sit at the gutter midpoint.

**App-level collapse** — one flag shared across every detail-pane view. A hover-revealed chevron rides directly above the bar, mirroring its height and bouncing with the slide; its reveal zone is a large bottom-right region that never blocks clicks beneath.

### Persistence

Per-nexus, in `.nexus/settings.json` under an app-specific **`subfield`** key holding the per-view item order and the expanded flag; unknown keys are preserved, so it round-trips safely. Item ids from disk are validated against the registry before render.

### Pending

- **The counter reads the editor's cached document scan** — it derives its own today, which is why a table's pipes still count as prose and why the scan is paid for again on every edit. Settle this before any other Subfield work: every item below sits on the surface this one corrects.
- **Reorder** the items via PommoraDND (horizontal) — the persisted `order` is wired; the drag UI is the next piece.
- **User-defined items**, possibly scoped — the registry plus per-view `order` is the extensibility seam.
- **Per-view configuration UI** — choosing which items each view kind shows.
- **The Homepage** — bring the Subfield there once it has content worth surfacing (→ [[SurfacePM]] §Pending, the Homepage's standing).
