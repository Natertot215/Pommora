## Cards And Tables — Extraction Plan

Three phases: Views leaves `Detail/` for the renderer root, then the card chassis consolidates into `src/Cards`, then the table chrome becomes a root-level `src/Tables` asset. Every path below is relative to `Pommora/src/renderer/src/`.

#### Scope Count

| Bucket | Code lines (excl. tests) | Files |
| --- | --- | --- |
| `Detail/Views/` (top: bands, hooks, mint, renderer) | 1,659 | 20 |
| `Detail/Views/Cards/` | 2,515 (CardsView.tsx 1,524 · CardsView.css 259) | 13 |
| `Detail/Views/Table/` | 3,433 (TableView.tsx 1,930 · Table.css 402 · table-tokens.css 61) | 34 |
| `Detail/Views/pipeline/` | 1,700 | 21 |
| `Detail/Views/PropertyEditing/` | 963 | 15 |
| `Navigation/` (NavGallery.tsx 149 · navGallery.css 105 · navList.css 104) | 1,105 | 16 |
| `Settings/TrashLeaf.tsx` + `trashLeaf.css` | 373 + 150 | 2 |
| `DesignSystem/Tokens/card-tokens.css` | 92 | 1 |

**Import graph for the Views move:** 29 files outside `Detail/Views` import from it (26 via `@renderer/Detail/Views` or `../Detail/Views`, 3 inside `Detail/` via `./Views`), plus `main.tsx:19-20` for the two table stylesheets. Views reaches up into `Detail/` at exactly two modules: `Scope.findCollectionForSet` (TableView, CardsView) and `Banner/useBannerMenu` (CardsView). Nothing in Views touches `ViewSettingsScope`, `pageEditor`, `pageFlush`, or `Detail.css`.

**Docs carrying paths or values that move:** `Features/ViewTypesPM.md` (paths at 44, 91, 109, 137, 153, 155; the Table Sheet and Card Tokens tables), `Features/DesignSystemPM.md:355`, `Guidelines/Build-Gotchas.md:67` (the borrowed-heading entry), `Guidelines/Cohesion-Rulings.md:125,128` (path cites), `CLAUDE.md` codebase map.

**Out of scope:** `MarkdownPM/Tables/` is a CodeMirror pipe-table widget with its own `.mdpm-tbl-*` family and zero shared CSS with the view table — it stays where it is. The name collision (`MarkdownPM/Tables/TableView.tsx` vs the view table) is the only contact point.

---

### Phase 0: Views To The Root

`Detail/Views/` → `Views/`, whole, including `pipeline/`, `PropertyEditing/`, `GroupBand`, `BandDnd`, and the hooks. The `@renderer/*` alias covers every consumer; the relative importers get their `../` depth corrected.

1. `git mv Detail/Views Views`; `Views/Cards` → `Views/CardView`, `Views/Table` → `Views/TableView`.
2. Rewrite the 29 external importers + the 2 upward imports (`../../Scope` → `@renderer/Detail/Scope`; `useBannerMenu` already aliased).
3. `main.tsx:19-20` → `./Views/Table/…`.
4. Docs: the six ViewTypesPM path cites, DesignSystemPM:355, Cohesion-Rulings:125/128, the CLAUDE.md map (`// Views` as a root entry).
5. Gates. No behavior change; no class renames, so `Detail.css`'s `:has(.table-head)` / `:has(.cards-view)` rules are untouched.

---

### Phase 1: Cards

**What exists today.** `card-tokens.css` already holds the shared geometry (floor, gaps, thumb share, cover zoom on `:root`) and the shared chassis rules — but every shared rule is written as a two-selector pair (`.page-card-thumb`, `.nav-gallery-thumb`; `.page-card-text`, `.nav-gallery-text`; …). The two families then diverge in their own sheets. The gallery card is the structural twin of the Set Card, not the page card.

**Where the two families differ:**

| Axis | Gallery (`navGallery.css`) | Cards (`CardsView.css`) |
| --- | --- | --- |
| Aspect | `125/90` locked | none on `.page-card` (grows with content; row-stretch); `125/90` on `.set-card` only |
| Thumb | `--thumb-share` 65% | fixed `--thumb-h` = 104px × `--card-scale`; set cards fall back to share |
| Body floor | none | `--card-body-min` = thumb × 0.54; compact recomputes |
| Cover zoom | 1.25, all imgs, `top` | 1, preview (`.is-capture`) only, `top`; **cover** mode goes through `AssetImage` (`center`, no zoom) |
| Border / radius / bg / transition / hover-pop / drag opacity | identical | identical (ghost card 2px) |
| Selected state | `.is-active` → `--accent-stroke` | none anywhere |
| Typography | `container-type: inline-size` + cqi clamps (11–18 / 9–14px) overriding the ramp class | fixed `text.body.semibold` / `text.caption.standard`, no container query; scale via `--card-scale` and embed `zoom` |
| Grid | `auto-fit` (stretch), `.is-fill` → `auto-fill` while searching | `auto-fill` always; set row `auto-fill` fixed tracks (no 1fr) |
| Shelf divider | always | removed in `.is-compact` |
| Extras | pin button | properties, loc footing, naming input, chip density knobs, ghost, drag overlay |

**Traps the move must carry:**

- `--card-gap-v` is upstream of the whole cards band rhythm: `--band-clearance: var(--card-gap-v)` in CardsView.css, `--band-gap` in GroupBand.css, and `paddingBottom: var(--band-clearance)` in `Blocks/viewEmbed.css.ts:179`.
- The `:root` scope of the card vars is load-bearing: the drag overlay is portaled to `document.body` and re-declares its carrier (`CardsView.tsx:772-787`). The file moves; the vars stay on `:root`.
- `ViewSettings.tsx:69-72` writes `--card-scale` straight to the DOM during the slider scrub; the var name is a contract.
- `--navwindow-inset` is shared with `navList.css` and hijacked by `trashLeaf.css` for an unrelated inset — not a card token; leave it alone here.

**Steps:**

1. Create `Cards/` at the root: `Cards/cards.css` (the moved `card-tokens.css`, `:root` block intact) and `Cards/Card.tsx`, the chassis component — root drag shell → body (`hover-pop`, border) → thumb (img / placeholder) → text (title row, optional trail). One class family (`.card`, `.card-body`, `.card-thumb`, `.card-ph`, `.card-text`, `.card-title`, `.card-title-icon`, `.card-loc`), the two-selector pairs collapsed.
2. NavGallery mounts `Card`; its own sheet keeps only the grid regime, the pin, and its knobs (cover zoom, cqi if kept). `.nav-gallery-*` class names retire.
3. CardsView mounts `Card` for page cards, set cards, the ghost, and the drag overlay; `CardsView.css` keeps only the collection layer (properties, footing, compact, naming, band seams, set row). `.page-card-*` names retire where the chassis owns them.
4. Sweep every class rename: `Blocks/viewEmbed.css.ts` (`.cards-grid`, `.set-cards-row`, `.group-band-row` are collection-layer and stay), `Detail.css` (`:has(.cards-view)` stays), tests.
5. `main.tsx:11` → `./Cards/cards.css`.
6. Docs: ViewTypesPM Card Tokens table moves under a new Cards section (or `CardsPM`), DesignSystemPM:355 points at `Cards/`, NavigationPM's gallery prose names the shared chassis.
7. Gates, KNOB grep, then eyeball both surfaces.

**Settled:**

- Nomenclature: `Views/CardView/`, `Views/TableView/`, `src/Cards/`, `src/Tables/`; `MarkdownPM/Tables/` unchanged.
- One chassis, reflow by default; `is-locked` (aspect `125/90` + thumb share) on Set Cards and gallery cards, whose auto-fit stretch needs the aspect to hold. Page cards reflow.
- Titles are `text.body.semibold` everywhere; the cqi clamps and `container-type` retire. `--card-scale` sizes the card, never the type.
- `--cover-zoom` → `--preview-zoom`, default `1.25`, applied to every captured-preview image. `AssetImage` covers stay unzoomed (user-cropped).
- The active stroke (`is-active` → `--accent-stroke`) lives in `Cards/cards.css`; page cards gain it.
- The pin is a `Cards` mechanism surfaces opt into; the gallery opts in, CardView doesn't.

---

### Phase 2: Tables

**What exists today.** `TableView.tsx` mixes generic chrome with collection logic. Generic: column resize/hide/reorder (`:485-552`, `:1227-1352`), width/align resolution (`:1024-1072`), overflow probe, `ColumnHeader` (`:1638-1722`), the `DataRow` shell (`:1795-1930`). Collection-specific: the pipeline, band drops, cell click/edit/pickers (`:651-1023`), reassign/relocate writes, ghost creation. The generic shell is nonetheless parameterized by collection types (`ResolvedColumn`, `ResolveContext`, `RowCellApi`, `Cell`).

`Table.css` groups cleanly: heading band (66–99), segments (177–199), hairlines (167–209), column DnD (100–121), resizer, borderless (`no-borders`, 224–269), cell content types, gutter (337–367), band rhythm. `table-tokens.css` scopes every var to `.table-view, .table-empty, .trash-leaf`.

**The Trash leaf today** wears `.table-head` and `.col-header` on its own elements, joins the token scope, then undoes the heading fill/seam and redraws an inset `--width-100 solid --border-light` hairline, suppresses the leading cap, re-implements the segment bar as `::after` on two non-table elements, and re-implements the row hairline on `.nav-item + .nav-item`. It imports `table-tokens.css` and `Table.css` a second time (both are already global from `main.tsx`), which is what the `.trash-leaf.trash-leaf` specificity hack defends against.

**Three "borderless" mechanisms exist, each on its own layer:**

| Mechanism | Layer | Where |
| --- | --- | --- |
| View `hide_borders` → `.no-borders` | body hairlines only; heading keeps fill + seam + segments | `Table.css:224-269`, `LayoutToggles.tsx:42` |
| Embed heading strip | heading fill + bottom seam removed; leading cap re-anchored | `Blocks/viewEmbed.css.ts:200-210` |
| Tile `is-borderless` | the block frame (`tile-chassis`), unrelated to the table | `SurfacePM/surfacepm.css:186`, `BlockSurface.tsx:277` |

**Settled:** extraction depth A — the chrome kit consolidates into `Tables/` now. Heading fill, heading-divider width, and `is-clear` are Tables variables the consuming surface binds; the body hairline width stays one standard; `hide_borders` (`.no-borders`) moves into Tables. The embed's title strip stays the embed's. `columnStyles`, `columnLabel`, `columnAlign`, `checkboxLook`, `solidColor`, `Cell` move to `Tables/` as root mechanisms surfaces opt into (an archive or the Trash may want them).

**Steps:**

1. Create `Tables/` at the root: `tables.css` (the moved `table-tokens.css`, scope list reduced to the kit's own root class), `Table.css` split — the chrome half (shell, grid tracks, heading band, segments, hairlines, resizer, column DnD, `no-borders`, gutter) moves; the cell-content-type and band-rhythm rules stay with the view.
2.  Heading variant as a class on the table root: `is-clear` (no fill, no seam) beside the default filled band — one definition the embed and the Trash both wear instead of stripping.
3. Trash joins the kit as a proper consumer: its head is a kit heading; rows keep `.nav-item` but the hairline and segment bars come from kit classes rather than hand-rolled pseudos. The double import and the `.trash-leaf.trash-leaf` hack go; the Build-Gotchas entry is rewritten to describe the kit.
4. `Blocks/viewEmbed.css.ts:200-210` swaps its strip rules for the variant class.
5. The generic TSX moves: `tableDnd`, `columnWidths`, `columnReorder`, `columnAlign`, `columnStyles`, `columnLabel`, `checkboxLook`, `solidColor`, `Cell`, and `ColumnHeader` lifted out of TableView.
6. `main.tsx:19-20` → `./Tables/…`; `Views/Table/TableView.tsx` imports the kit.
7. Docs: ViewTypesPM's Table Sheet moves to a `TablesPM` (or a section of DesignSystemPM's component ledger); the gutter row and separator cites in that table are stale already and get rewritten in the same pass.
8. Gates, KNOB grep, then eyeball the view table, an embedded table, and the Trash.
