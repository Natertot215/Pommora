## SymbolsPM

```
SymbolsPM
├── The Registry
│   ├── View Settings Panes
│   ├── Property Types
│   └── View Types
├── Sizes
├── Additional Assignments
├── The Picker
├── Known Issues
└── Pending
```

Pommora's standard semantic icons — the canonical glyph for each pane, property type, and recurring concept. The curated registry behind `design-system/symbols` is the primary source and the app's own vocabulary. A caller with no assigned glyph renders `DashIcon`, the dashed-square placeholder, until a symbol is chosen; an id that resolves in neither source falls back to `square-dashed`.

### The Registry

- **Only a registered glyph ships.** The registry is an explicit import list, so adding an icon means registering it; nothing arrives by wildcard, and the bundle carries exactly what's named.
- **Keys are Pommora's vocabulary, not the library's.** Most match the lucide.dev name because that's the least surprising choice, but a key is renamed only when its glyph changes identity — never to chase library spelling — keeping stored ids valid across a library bump.
- **Lucide is the default; Tabler is a per-icon opt-in** through the same seam, and both default to the same stroke weight, so they sit together with no override. Custom glyphs are registry-conforming SVG components drawn at that same weight.

#### View Settings Panes

| Pane          | Icon                 |
| ------------- | -------------------- |
| Configuration | `sliders-horizontal` |
| Properties    | `server`             |
| Visibility    | `eye` / `eye-off`    |
| Layout        | `layout-dashboard`   |
| Group         | `layers`             |
| Filter        | `list-filter`        |
| Sort          | `arrow-up-down`      |

#### Property Types

| Type         | Icon                 |
| ------------ | -------------------- |
| Number       | `hash`               |
| Checkbox     | `square-check`       |
| Date         | `calendar`           |
| Status       | `progress-check`     |
| Link         | `link`               |
| File         | `file-chart-column`  |
| Context      | `layout-grid`        |
| Select       | `send`               |
| Multi-Select | `tags`               |
| Modified     | `history`            |
| Title        | `text-align-justify` |
| Created      | `clock-plus`         |

#### View Types

| Type     | Icon                    |
| -------- | ----------------------- |
| Table    | `table`                 |
| Cards    | `cards-grid` (Custom)   |
| List     | `list-rounded` (Custom) |
| Gallery  | `layout-dashboard`      |
| Calendar | `calendar-days`         |
| Timeline | `chart-gantt`           |

### Sizes

Every glyph draws at a size taken from one ladder, so a symbol's scale is a named step rather than a per-surface number. A step sets the icon's `font-size` and the glyph renders at `1em`, which keeps stroke weight proportional and lets a symbol inherit its surrounding type when no step is named.

The ladder's names mirror the type ramp one for one, so a glyph and the text beside it name the same step. Eleven names carry eight values, repeating wherever the type ramp itself repeats.

| Step         | Size |
| ------------ | ---- |
| `largeTitle` | 26px |
| `title1`     | 22px |
| `title2`     | 17px |
| `title3`     | 15px |
| `headline`   | 13px |
| `body`       | 13px |
| `callout`    | 12px |
| `control`    | 12px |
| `caption`    | 11px |
| `footnote`   | 10px |
| `subline`    | 10px |

**SOURCE:** `design-system/tokens/size.css.ts` — the ladder, bridged to CSS variables in `theme-vars.css.ts`. The same file exports the ladder as bare numbers for the few consumers that size an element rather than a font, such as a profile photo's width and height.

#### Roles

A handful of glyph roles recur across the app, each carrying a consistent meaning wherever it appears. A role's scale is a property of the role, not of the surface hosting it.

| Role | What it marks | Scale |
| ---- | ------------- | ----- |
| Chip remove | The × dismissing a value inside a chip | Smallest — it sits within a chip's own box |
| Action button | A standalone add, remove, or close affordance — a tab's ×, a filter row's remove, a pane's + | One step above the chip remove |
| Disclosure | The double-chevron toggle opening a picker or a value control | Matched to the control's label |
| Footing symbol | The leading glyph on a pane footer row | Matched to the control's label |
| Entity glyph | A page, Set, Context, or property's own assigned icon | Matched to the surrounding row's text |
| Confirmation | A checkmark inside a checkbox or a picker row | Matched to the box containing it |
| Lock | The state marker on a locked pane footer | Matched to the surrounding row's text |

### Additional Assignments

`list-tree` is the page outline's glyph — the toolbar button that opens a page's heading tree (→ [[PagesPM]]). It reads as nested structure rather than a flat list, distinct from `list-rounded`'s view type and `list-filter`'s predicate. The Context property type draws the Context entity kind's own glyph rather than naming one, so a column and the Context it points at can never wear different marks.

### The Picker

The curated registry above is the app's own semantic vocabulary — the fixed glyphs the UI reaches for by name. The **Icon Picker** the user opens to assign an entity's icon is a separate, wider surface exposing the entire Lucide set, kebab-keyed and searchable. Favorites persist with the nexus's personalization. A picked id is stored as its bare Lucide kebab id, the same convention the curated keys follow, and resolution reads the curated registry first, then the full set.

### Known Issues

- **Two curated keys shadow real Lucide ids.** `table` and `lock` name Pommora's own glyphs in the registry and are also the ids of different Lucide glyphs the picker offers from the full set. Registry-first resolution renders Pommora's glyph instead of the one the picker cell showed. The resolution is open.

### Pending

- **`link-2`** — registered and reserved as the Connections glyph; the `[[Title]]` connections surface doesn't render it.
