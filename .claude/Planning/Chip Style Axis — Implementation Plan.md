## Chip Style Axis — Implementation Plan

The chip recipe (`Label`) is already compositional (shape × color × fill × outline × roomy). This arc folds the per-property *presentation choice* into one **Style** axis — **Standard** (labeled) and **Compact** (icon-only) — that applies to Status **and** Select / Multi-select, and consolidates the scattered option-chip rendering into one recipe entry point.

### The Model

Shape stays the type's fixed identity; radius rides the shape and never changes with Style. The only thing separating Status from Select is the shape.

| Type | Shape (radius) | Standard | Compact |
| ---- | -------------- | -------- | ------- |
| Status | pill (10px) | labeled pill | icon-only, group glyph (per-group defaults) |
| Select | tag (6px) | labeled tag | icon-only, per-option icon → default single-tag |
| Multi-select | tag (6px) | labeled tags | icon-only, per-option icon → default `tags` |
| Space | tag, neutral | purposefully separate — untouched | — |

### Locked Decisions

- **Axis label** — "Style", values Standard / Compact. (`styleMenuLabel` already returns 'Style' for these types.)
- **`box` leaves the Label shape roster entirely** — the real checkbox control composes `boxGeometry` directly; the showcase demo follows.
- **`selectOption` gains `icon?: string`** — the one additive on-disk change. Right-click a Compact chip → Edit Icon → the existing IconPicker. Status uses group glyphs, no per-option icon.
- **Clean break, no legacy aliasing** — `pill`/`capsule`/status-`checkbox` are dropped from the union outright, per `columnStyles.ts`'s own documented philosophy. A status column saved Compact under the old vocabulary flips to Standard once and is re-picked.
- **`ContextChip → SpaceChip`** across the board (drift cleanup).

### Prospect (out of scope)

A second axis toggling fill on/off (colored vs bordered), which would take the "Style" name and rename this axis to "Size". Cheap later because `fill` is already an independent recipe axis. → ContextPM candidate.

### Phases

- [x] **Phase 1 — The spine: contract + recipe.**
  - [x] `shared/columnStyles.ts` — `COLUMN_LOOKS` drops `pill`/`capsule`, adds `standard`/`compact`; keeps `checkbox`/`switch`. `defaultStyleFor` status/select/multi → `{ look: 'standard' }`; stale comment fixed.
  - [x] `shared/columnMenu.ts` — status + select + multi_select → Standard/Compact rows; the only non-addressable type is now context.
  - [x] `shared/properties.ts` — `selectOption` gains `icon?: string`.
  - [x] `OptionChip` — landed at `Detail/Views/PropertyEditing/OptionChip.tsx` (renderer, not the design system: it resolves the status group glyph via `statusCycle`). Owns `optionShapeFor` + the Standard/Compact branch + the compact-icon fallback (status group glyph · select `tag` · multi `tags`). `ContextChip → SpaceChip`.
  - [x] `labels.css.ts` — `box` **and** `chip` removed from the `shape` roster (both dead after the fold); new `checkboxBox` = base + geometry for the real checkbox; `boxGeometry` still exported.

- [x] **Phase 2 — Consumers onto `OptionChip`.**
  - [x] Cell.tsx + PropertyPicker.tsx (compact-capable) and GroupBand / FilterPane / GroupingPane (standard) → `OptionChip`; `StatusCapsule` deleted. (StatusEditor / OptionEditor keep `optionShapeFor` — their `OptionSlot` is an editable chip, not a display chip.)
  - [x] `checkboxLook.tsx` + LabelsLeaf → `checkboxBox`; the two dead showcase shape rows removed.
  - [x] `columnWidths.ts` — one `OPTION_MIN` (`compact 45 / standard 80`) shared across status, select, multi-select.
  - [x] `PagePropertiesPane.tsx` + `PreviewInspector.tsx` — hardcoded `look:'pill'` → `'standard'`.
  - [x] `SpaceChip` rename across all consumers (0 `ContextChip` left).
  - [x] **Click-to-cycle removed** — the status cycle in `valueClick.ts` fired only on the erased `look:'checkbox'`, so it was dead; `nextCycleValue` + its params/tests removed. (See Open Call.)

- [x] **Phase 3 — Compact editing.** *(entirely renderer-side + existing `saveOptions`/`saveColumnStyle` — no new IPC; select options persist as a whole array through `optionModel`.)*
  - [x] **Per-option icon** — right-click a select/multi option → **Edit Icon** (new `option:edit-icon`, gated by `canEditIcon` so status never shows it) → the favorites-bound IconPicker, writing `selectOption.icon` via `setOptionIcon` + the existing `saveOptions`. Default falls to `tag` / `tags`.
  - [x] **(a) Compact rename reveals the full name** — already inherent: `OptionRow`'s rename branch swaps to `OptionNameCaret` (shape + full label). Left clean, now shared by all three via the required `type` prop.
  - [x] **(a-inverse) Edit Icon previews the Compact variant** — while the picker is open on an option, that row renders its icon-only chip (`defaultOptionIcon` shared with `OptionChip`).
  - [x] **(b) In-pane Style toggle** — one shared `OptionStyleRow` (Standard/Compact `PickerControl`) at the top of `StatusEditor` and `OptionEditor`, identical position across status/select/multi, writing the active view's `saveColumnStyle`.
  - Note: the native **Edit Icon** menu item is main-process — a dev-server restart (not ⌘R) is needed to see it.

- [ ] **Phase 4 — Sweep, gates, docs.**
  - [x] Tests pinning old status looks updated/removed (cellMenu, columnMenu, columnStyles, Cell, cellGestures, columnWidths, viewMerge, valueClick, statusCycle).
  - [ ] Reconcile DesignSystemPM (Chips table, SpaceChip rename) + PropertiesPM / ViewsPM / TableViewPM.
  - [ ] Simplification → comment cleanup → the four gates. *(typecheck currently red from the parallel `labels` refactor, not this work — my files pass typecheck + lint + their tests.)*

### Open Call

**Click-to-cycle:** advancing a status by clicking rode the erased checkbox look, so it's gone. Options: leave it removed (all status clicks open the picker), or re-wire the cycle onto the Compact look.
