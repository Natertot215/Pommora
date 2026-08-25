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

- **Breadcrumb** — a NavTrail of the open view's ancestry, running from the Collection down to the current node. Collection and depth-1 Set segments navigate; deeper Sub-Sets are plain; the current segment is inert. Segments past the current one trace the path down to the **deepest node visited on it** — the segments last backed out of, rendered dimmed and still clickable to re-descend — navigating back up the path preserves the directory chain only while it continues the current path; a branch onto a different path ends it.
- **The footnotes disclosure** — a page holding footnotes carries a **Show Footnotes** / **Hide Footnotes** control in the reveal band above the bar, leading from the breadcrumb's own inset and facing the bar's collapse chevron across it. Each end of the band has its own reveal region, so approaching one control never lights the other. It discloses the citations section and reads its current state at once; it is absent from a page with no citation lines and present the moment one exists, an orphan included.
- **Per-view items** — a registry keyed by view kind. **Pages** show `lines · words · characters` — lines counting the source lines the document holds, words and characters counting the prose the editor actually draws — tracking the editor's live body, so the count settles just behind the keystroke. The counter reads the editor's own scan of that body for what is chrome and what is content, so a fenced block, a lone embed tile, a list marker, a quote prefix and a heading's hashes all contribute nothing, a table counts as the cell text its widget draws rather than its pipes and delimiter row, and an inline embed's title and a link's label count as the words they read as. The footnotes section is outside all three counts, and a body marker contributes the characters its syntax holds and no word. **Collections and Sets** show a **+** add-menu; **NavView** shows a **List / Gallery** toggle; a **Space** takes the bar with its crumb alone.

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
- **The Homepage** — bring the Subfield there once it has content worth surfacing.[^1]

[^1]: [[SurfacePM]] §Pending, the Homepage's standing
