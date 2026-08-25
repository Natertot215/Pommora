## SymbolsPM

```
SymbolsPM
├── The Registry
│   └── II. Sizes
├── Assignments
│   ├── II. View Settings Panes
│   ├── II. Property Types
│   ├── II. View Types
│   └── II. File Types
├── The Picker
└── Known Issues
```

Pommora's standard semantic icons: the canonical glyph for each pane, property type, and recurring concept. The curated registry in `DesignSystem/Symbols/` is the primary source and the app's own vocabulary; a caller with no assigned glyph renders `DashIcon`, the dashed-square placeholder, until a symbol is chosen, and an id that resolves in neither source falls back to `square-dashed`.

### The Registry

The registry (`Symbols/index.tsx`) is an explicit import list: adding an icon means registering it, and nothing arrives by wildcard. Its keys are Pommora's vocabulary rather than the library's — most match the lucide.dev name because that's the least surprising choice, but a key is renamed only when its glyph changes identity, never to chase library spelling, so stored ids stay valid across a library bump. Lucide is the default source and Tabler is a per-icon opt-in through the same seam, drawn at the same stroke weight and scaled slightly to sit level with Lucide's; custom glyphs (`customGlyphs.tsx`) are registry-conforming SVG components at that weight, and `masks.ts` holds the grip, fold-chevron, code-chevron, and link glyphs as CSS masks.

Every glyph draws at a size from one ladder: a step sets the icon's `font-size` and the glyph renders at `1em`, which keeps stroke weight proportional and lets a symbol inherit its surrounding type when no step is named.

#### II. Sizes

The ladder is the design system's icon ladder,[^1] stated again here.

| Step | Size |
| --- | --- |
| `largeTitle` | 26px |
| `title1` | 22px |
| `title2` | 17px |
| `title3` | 15px |
| `headline` | 13px |
| `body` | 13px |
| `callout` | 12px |
| `control` | 12px |
| `caption` | 11px |
| `footnote` | 10px |
| `subline` | 10px |

### Assignments

Which glyph each recurring concept uses. The app decides these — the panes in `SettingsPane.tsx`, the property types in `PropertyTypes.tsx`, the view types in `ViewSettings.tsx` — and the registry supplies them.

#### II. View Settings Panes

| Pane | Icon |
| --- | --- |
| Configuration | `sliders-horizontal` |
| Properties | `server` |
| Visibility | `eye` / `eye-off` |
| Layout | `layout-dashboard` |
| Group | `layers` |
| Filter | `list-filter` |
| Sort | `arrow-up-down` |

#### II. Property Types

| Type | Icon |
| --- | --- |
| Number | `hash` |
| Checkbox | `square-check` |
| Date | `calendar` |
| Status | `progress-check` |
| Link | `link` |
| File | `file-chart-column` |
| Context | the Context entity's own glyph (`layout-grid`) |
| Select | `send` |
| Multi-Select | `tags` |
| Last Edited | `history` |
| Title | `text-align-justify` |

The Context property type draws the Context entity kind's own glyph rather than naming one, so a column and the Context it points at can never wear different marks. `list-tree` is the page outline's glyph, distinct from `list-rounded`'s view type and `list-filter`'s predicate.

#### II. View Types

| Type | Icon |
| --- | --- |
| Table | `table` |
| Cards | `cards-grid` (custom) |
| List | `list-rounded` (custom) |
| Gallery | `layout-dashboard` |
| Calendar | `calendar-days` |
| Timeline | `chart-gantt` |

#### II. File Types

A second family, keyed `file-type-<ext>` and drawn from Tabler's set (`fileTypes.ts`), gives a file label the mark of what it holds, per extension rather than per family so `.ts` and `.tsx` keep their distinction. Twenty-three extensions draw their own: `bmp` `css` `csv` `doc` `docx` `html` `jpg` `js` `jsx` `pdf` `php` `png` `ppt` `rs` `sql` `svg` `ts` `tsx` `txt` `vue` `xls` `xml` `zip`. Six common alternate spellings route to the glyph they mean — `jpeg`→`jpg`, `htm`→`html`, `xlsx`→`xls`, `pptx`→`ppt`, `mjs`/`cjs`→`js`. The name is read case-insensitively, and anything the roster doesn't name — a name with no extension, a dotfile, a bare trailing dot — takes `file-chart-column`, the File property's own glyph.

### The Picker

The Icon Picker a user opens to assign an entity's icon (`Components/Pickers/IconPicker`) is a separate, wider surface exposing the entire Lucide set (`AllSymbols.ts`), kebab-keyed and searchable, with a reorderable favorites strip that persists with the Nexus's personalization.[^2] A picked id is stored as its bare Lucide kebab id, the same convention the curated keys follow, and resolution reads the curated registry first, then the full set.

---

#### Known Issues

- **Two curated keys shadow real Lucide ids.** `table` and `lock` name Pommora's own glyphs in the registry and are also the ids of different Lucide glyphs the picker offers from the full set; registry-first resolution renders Pommora's glyph instead of the one the picker cell showed.

[^1]: [[DesignSystemPM]] §Geometry
[^2]: [[ConfigurationPM]] §Personalization
