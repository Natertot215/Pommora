## SymbolsPM

Pommora's standard semantic icons — the canonical glyph for each pane, property type, and recurring concept. The curated registry behind `design-system/symbols` is the primary source and the app's own vocabulary. A caller with no assigned glyph renders `DashIcon`, the dashed-square placeholder, until a symbol is chosen — a placeholder is intentional, not a gap to fill arbitrarily — while an id that resolves in neither source falls back to `square-dashed`.

### The Registry

**Only a registered glyph ships.** The registry is an explicit import list, so adding an icon means registering it; nothing arrives by wildcard, and the bundle carries exactly what's named.

**Keys are Pommora's vocabulary, not the library's.** Most match the lucide.dev name because that's the least surprising choice, but a key is renamed only when its glyph changes *identity* — never to chase library spelling. That's what lets a stored id stay valid across a library bump.

**Lucide is the default; Tabler is a per-icon opt-in** through the same seam, and both default to the same stroke weight, so they sit together with no override. Custom glyphs are registry-conforming SVG components drawn at that same weight.

The registry itself is the roster — this doc names the concepts and their assignments, never the full inventory.

### View Settings Panes

The settings menu's root rows:

| Pane          | Icon                 |
| ------------- | -------------------- |
| Configuration | `sliders-horizontal` |
| Properties    | `server`             |
| Visibility    | `eye`                |
| Layout        | `layout-dashboard`   |
| Group         | `layers`             |
| Filter        | `list-filter`        |
| Sort          | `arrow-up-down`      |

`eye` is the shown state and `eye-off` the hidden one — the pair every visibility toggle wears.

### Property Types

The type glyphs, shown in the type picker and on each property row. Label, icon, and the creatable set are one source:

| Type         | Icon             |
| ------------ | ---------------- |
| Number       | `hash`           |
| Checkbox     | `square-check`   |
| Date         | `calendar`       |
| Status       | `progress-check` |
| Link         | `link`           |
| File         | `import`         |
| Context      | `layout-grid`    |
| Select       | `send`           |
| Multi-Select | `tags`           |

**Link is the user-facing name for the `url` type** — the label is what the type picker shows and what a new property of that type is named; the on-disk type key stays `url`.

**Title** wears `text-align-justify` — the reserved heading column isn't a user property type, but its glyph lives beside the type map so every surface renders it from one source. The reserved timestamp columns carry header glyphs too: **Modified** rides the last-edited type's `history`, and **Created**, which has no property type, gets `clock-plus` at the table header.

### View Types

The saved-view type roster and its grid glyphs (the ViewSettings type picker):

| Type     | Icon               |
| -------- | ------------------ |
| Table    | `table`            |
| Cards    | `cards-grid`       |
| List     | `list-rounded`     |
| Gallery  | `layout-dashboard` |
| Calendar | `calendar-days`    |
| Timeline | `chart-gantt`      |

`table` is THE table glyph wherever a table view is named — one glyph per concept, on every surface that names it. `cards-grid` and `list-rounded` are the two customs, registry-conforming SVG components drawn at Lucide's stroke weight so they sit at the same height beside it.

Every type carries a glyph, but only **Table and Cards have renderers** — the remaining tiles show their glyph and don't select.

### Misc

`list-tree` is the page outline's glyph — the toolbar button that opens a page's heading tree (→ [[PagesPM]]). It reads as nested structure rather than a flat list, which is what separates it from `list-rounded`'s view type and `list-filter`'s predicate.

`link-2` is the Connections glyph — registered and reserved for the `[[Title]]` connections surface, which doesn't render it. The Context property type wears `layout-grid`, matching the sidebar Contexts.

### The Picker

The curated registry above is the app's own **semantic vocabulary** — the fixed glyphs the UI reaches for by name. The **Icon Picker** the user opens to assign an entity's icon is a separate, wider surface: it exposes the **entire Lucide set**, kebab-keyed and searchable, so a user isn't limited to the curated names. Favorites persist with the nexus's personalization. A picked id is stored as its bare Lucide kebab id, the same convention the curated keys follow, and resolution reads the curated registry first, then the full set.

### Known Issues

- **Two curated keys shadow real Lucide ids.** `table` and `lock` name Pommora's own glyphs in the registry and are also the ids of different Lucide glyphs, which the picker offers as cells drawn from the full set. Because resolution reads the curated registry first, picking either renders Pommora's glyph instead of the one the picker cell showed. The resolution is open.
