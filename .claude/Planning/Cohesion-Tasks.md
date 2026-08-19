## Cohesion Pass — Task Tracking

The operational checklist for the pass specified in [[Cohesion-Audit]]. Each step is a commit. Gates
run green before any step is ticked: `npm run typecheck`, `npm run lint` at zero diagnostics, and the
full Vitest suite.

### Banked

- [x] Group By and Sort By read through the shared `PickerControl` — `f1d8e03e`
- [x] A filter field's leading glyph reads the dimmer tone — `f1d8e03e`
- [x] `MenuOption` retired; `PickerOption` is the only picker row — `a5cb11a5`
- [x] The `pickerSelection` setting, Outlined and Checked — `a5cb11a5`
- [x] SymbolsPM carries the icon ladder and its roles

### Step 1 — Icons

The ladder mirrors the type ramp one-to-one: eleven names over eight values, `footnote` the floor.

- [x] `size.css.ts` — the ladder becomes `largeTitle` 26 · `title1` 22 · `title2` 17 · `title3` 15 ·
      `headline` 13 · `body` 13 · `callout` 12 · `control` 12 · `caption` 11 · `footnote` 10 ·
      `subline` 10, with `ICON_PX` carrying the same values as numbers
- [x] `theme-vars.css.ts` — every step bridged
- [x] Rename the sites already sitting on a step
- [x] Move the sites with no step: 14 → `body`, 16 → `title3`, 18 → `title2`, 20 → `title1`,
      24 → `title1`
- [x] Unify the two tab closes — both name `caption` (Nathan's call)
- [x] `settingsPane.css.ts` — the private `ICON` map names ladder steps
- [x] `tabBar.css` — `--tab-icon`, `--tab-x`, and `--tab-plus` retire; all three were unconsumed
- [x] `SettingsPane.tsx` and `PageMenu.tsx` — the two raw `lucide-react` imports go through the registry
- [x] Zero numeric `size={n}` remain outside the showcase

### Step 2 — CSS

Bridge the token gaps first; converting consumers before that just hardcodes around the same holes.

- [x] `theme-vars.css.ts` — the full type ramp and the control-size bundles bridged
- [x] Convert the hardcoded `font-size` values and the restatements of the large-button height —
      `navView.css:34` keeps its own, a KNOB set deliberately off the ramp
- [x] Delete `--row-h`, `.section-header`, `.detail-detail`, `TITLE_X_TWISTY_ONLY`
- [x] Token swaps — `navList.css` opacity · `calendarPicker.css.ts` z-index · `feel.tsx` easing
      constant. The Carets easings were already keywords rather than literals, and the ribbon divider
      stays `--fill-secondary`: it is a painted fill band, not a hairline (Nathan's call)
- [x] `.open-btn` rests transparent and brightens on hover. Neither cited comment was wrong — the
      tokens read as documented; only the button consumed them backwards
- [x] Extract the card chassis from `CardsView.css` and `navGallery.css`, carrying the descender fix
- [x] Extract the reveal bar and its chevron from `previewPane.css` and `subfield.css`, keeping
      `:focus-visible` — the subfield toggle gains the focus reveal it lacked
- [x] Fold four resize strips into `.sidepane-resize`
- [x] One base for the two Sidebar icon buttons
- [x] Name the constants — park clearance, close-button clearance, banner shadow geometry,
      container-title size. The 1px divider has exactly one shipped consumer, so it stays inline
- [x] `PickerOption` reads the `--menu-row-size` knob rather than hardcoding its ramp

### Step 3 — Native Menus

- [x] `pageMenuTemplate` merges into `rowTemplate`, carrying the move-row submenu case —
      `main/pageMenu.ts` retires, its ten consumers repointed
- [x] `pageMenu.ts:18` gains the leading-separator guard its twin has (carried by the merge)
- [x] `shared/pageMenu.ts:152`'s copy of the separator drop stays — a test asserts the MODEL drops a
      leading separator, which is a contract on the model rather than an artifact of rendering
- [x] Label and enable logic moves into `shared/` per menu, following `shared/viewRowMenu.ts` —
      `tableMenu` (52→11), `viewEmbedMenu` (47→26), `viewButtonMenu` (22→13); `viewStyleSubmenu`
      retires with its last caller
- [x] The six editor format chords are declared once in `shared/editorMenu.ts` and formatted by each
      side, so the menu can no longer display a shortcut the editor doesn't bind
- [x] The heading ladder and the list-marker labels are named once in `shared/gripMenu.ts`
- [x] Main-side files collapse to popping the converted model
- [x] Tests in `shared/` for the moved logic — 11 across three files

Left where they are, with reason: `gripMenu` resolves object actions through an arbitrary-depth pick
tree, which `ActionItem` cannot express; `trashMenu` already keeps its labels in `shared/` and pops
through the nesting primitive its own comment names; `contextMenu` runs its writes inline rather than
resolving an action, so it is a different chassis rather than a model. The table's Align rows read as
checkmarks rather than radios (Nathan's call).

### Step 4 — MarkdownPM

- [ ] `blockDrag.ts:32` — hoist the document string and block starts into `startBlockDrag`; use
      `docString` and scope to `visibleRanges` as `listDrag.ts` does
- [ ] `decorations.ts:406` — the `↔` scan moves into the per-version cached derivation
- [ ] `Tables/widget.tsx:317` — `docString` rather than a fresh rope join
- [ ] `gripMenu.ts:102` — `focusRange`, as the same file uses at `:173`
- [ ] `links.ts` gains the ⌘-click bypass branch
- [ ] `links.ts` gains the `actedOnLink` post-menu suppression
- [ ] Both body context-menu paths pair `closeActiveHoverCard()` with `intent.cancel()`
- [ ] `MarkdownPM/Tables/TableView.tsx:344` — `activation: 0`

### Step 5 — Documentation

- [ ] Broken markup — `PagesPM:59`, `ViewsPM:74`, `ArchitecturePM:87`, `PropertiesPM:83` and `:149`,
      `StructurePM:25`
- [ ] Build-status content — `CardViewPM`'s empty Pending, `ConfigurationPM`'s three empty tables and
      its "unimplemented" cell
- [ ] Implementation-note sections rewritten behind a `**SOURCE:**` line — `ArchitecturePM` §The IPC
      Bridge and §The Device-Local Database, `PommoraDND` §The Seam, `PagePreviewPM` §The Token Contract
- [ ] `InteractionPM` lines 32 and 91 stop claiming the `out` token has consumers
- [ ] Restatement gets one owner each — `ViewsPM` the hover ghost, `PagesPM` the creation act,
      `ConnectionsPM` the alias record, `PagePreviewPM` the hover card
- [ ] Batch pass — seven headings missing a blank line, two TOC mismatches, two omitted TOC sections,
      four missing spaces before inline code, trailing whitespace across sixteen files
- [ ] `SymbolsPM` and `DesignSystemPM` carry the final ladder

### Step 6 — Loose Ends

Small, found during the picker work.

- [ ] `ValueRow` is defined identically in `GroupingPane` and `SortingPane` — one component
- [ ] `CalendarPicker` draws its own checkmark outside the picker system and never answers
      `pickerSelection`
- [ ] BlockHandleMenu's Style and Scale lists read centered since losing `MenuOption` — confirm or
      give them glyphs

### Phase 2 — Verification and Close

- [ ] `code-simplifier` over the working diff, serialized
- [ ] `build-breaking-agent` over the finished diff, briefed with [[Cohesion-Audit]]
- [ ] Every cited `file:line` opened and confirmed before any finding is folded
- [ ] Gates re-run after the last fold
- [ ] [[Cohesion-Audit]] reconciled — every finding marked done, deferred to a named session, or not
      applicable
- [ ] Codemap changelog of everything that moved, with per-step line deltas
- [ ] `HistoryPM` gains one milestone entry
- [ ] `ContextPM` names MarkdownPM cleanup and Table hoisting as the next two focuses
- [ ] The remaining audit findings explained, and ordered as prerequisites for those two sessions
