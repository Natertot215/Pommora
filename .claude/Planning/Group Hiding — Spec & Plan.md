## Group Hiding — Spec & Plan

**Status:** built and live-verified — every scenario below driven against a running instance (folder subtree, option, date bucket, sub-value, HEG switch, stale-key flat control).

### Frame

- **Purpose:** Per-group visibility for grouped views — an eye toggle on each group row in the Grouping pane hides that group's band (and rows) from the view entirely.
- **Core Value:** Hiding is one view-level fact filtered once in the pipeline, so every view type and every grouping kind — present and future — inherits it with no per-view code and no layout residue.
- **Success Criteria:** Toggling an eye removes/returns the band in Table and Cards; hidden state persists on the view; no chrome, seam, or clearance residue remains where a hidden band was.

### Sources

- `src/shared/views.ts` — `SavedView`, `collapsed_groups` (the exact template), `ungrouped_placement` (the view-level-hoist precedent).
- `src/renderer/src/Detail/Views/pipeline/group.ts` — `resolveGroups`, bucket keys, `subtreeIds`, `pruneEmptyGroups`.
- `src/renderer/src/Detail/Views/pipeline/resolveView.ts` — the one orchestration point.
- `src/renderer/src/Components/Detail/GroupingPane.tsx` — the pane rows (chips, `LocationHierarchy`, sub chips); `PropertyPreview`/`CustomList` shared with Sorting.
- `src/renderer/src/Components/Detail/HiddenPane.tsx` + `settingsPane.css.ts` — `EyeToggle`, `accessoryButton`, `hiddenRow` ghost, `paletteButton` hover-reveal.
- `src/renderer/src/design-system/components/menu/DisclosureRow.tsx` — needs a `trailing` pass-through to its `MenuItem`.
- `src/renderer/src/Detail/Views/GroupBand.tsx` — date-bucket heading formatting to reuse.

### Decisions

#### A — The Hideable Unit

- **A-1 [confirmed]:** The unit is the individual group band: a select/status option, a Set folder, a date bucket. Never a status-section heading — sections aren't bands.
- **A-2 [confirmed]:** A hidden parent folder hides its whole subtree. Nothing is stored for descendants: the pipeline prunes the set tree before resolution, so children (and their pages) simply never exist downstream — including the Cards flatten, which rolls subtrees through the pruned tree.
- **A-3 [confirmed]:** A sub-group bucket hides **globally by value** — one toggle hides that value's bucket under every parent, mirroring the pane's global sub-order drag. Stored under a `sub/` prefix so sub values can never collide with primary keys.
- **A-4 [confirmed]:** Date groupings are included. The pane's middle region — currently collapsed for dates — lists the present buckets (derived from the container's values through the same read the views use) plus any stored hidden keys, each with an eye. A hidden bucket key made inert by a granularity switch stays stored, harmless, like a stale collapse key.
- **A-5:** The Ungrouped tail and foreign-authored checkbox groupings are mechanically hideable by the same keys but get no UI row — Prospects.

#### B — Storage & Pipeline

- **B-1 [confirmed]:** `hidden_groups: string[]` on `SavedView`, beside `collapsed_groups`, same codec shape. Keys: option values, set ids, date bucket keys, `sub/<value>`.
- **B-2 [confirmed]:** One filter, one home: `resolveGroups` receives the hidden set and (a) prunes hidden nodes from the set tree, (b) drops hidden property/date buckets, (c) drops sub-buckets whose value is hidden. Nothing downstream knows hiding exists — band chrome is per-band, so no residue handling anywhere.

#### C — Hide Empty Groups (the half-implemented sibling)

- **C-1 [confirmed]:** The footing checkbox becomes a **Switch** (the dual-option rule) and moves **above** the Ungrouped placement row.
- **C-2 [assumed]:** The knob hoists view-level — `hide_empty_groups` on `SavedView` — so it covers structural and date groupings too, not just property ones; the property-config field stays decode-parity, never read (the exact `empty_placement` → `ungrouped_placement` precedent). Default off, preserving "empty Sets show deliberately."

#### D — The Eye

- **D-1 [confirmed]:** The eye is the hoisted `EyeToggle` (HiddenPane is its first consumer, this is its second) on the shared accessory recipe; glyph pair swaps on hover; a hidden row's eye is always visible and the row wears the `hiddenRow` ghost.
- **D-2 [assumed]:** Reveal split — option-chip rows (select/status/sub-chips, and date buckets) show the ghosted eye **always** (the Visibility-pane precedent, per Nathan's call); folder `DisclosureRow`s reveal **per-row on hover** (the palette-icon precedent) since they already carry twisty + drag affordances. One class either way — trivially flippable.
- **D-3 [confirmed]:** Eyes are injected only from the Grouping pane's usage — `PropertyPreview`/`CustomList` render for the Sorting pane unchanged.

### Core

Schema + codec · the one pipeline filter (+ HEG for all kinds) · pane UI (eyes, date-bucket list, HEG switch) · tests.

#### Prospects

- Ungrouped-tail hiding — one synthetic pane row when wanted.
- Per-set (non-global) sub-bucket hiding — the composite `setId/bucket` keys already exist.
- "Hide Group" on the band's own context menu in the view.

---

### Plan

Gates per task: `npm run typecheck` · `npx vitest run` (read the summary line) · lint warnings line.

#### Task 1 — Schema

**Why:** The two view-level facts everything else reads.
**Files:** `src/shared/views.ts`.
**Steps:** Add `hidden_groups?: string[]` and `hide_empty_groups?: boolean` to `SavedView` + zod codec, mirroring `collapsed_groups` / `ungrouped_placement` patterns exactly. Expect: typecheck clean, codec tests extended.

#### Task 2 — Pipeline

**Why:** The one home for hiding; every view type inherits.
**Files:** `pipeline/group.ts`, `pipeline/resolveView.ts`, `pipeline/group.test.ts`.
**Steps:** Thread `hidden` into `resolveGroups`: recursive set-tree prune, property/date bucket drop, `sub/`-value drop. Honor view-level `hide_empty_groups` across kinds (structural empty-band drop reuses the `pruneEmptyGroups` shape; property path reads the view knob with the config field as fallback-parity). Tests: each grouping kind hides + returns; Cards-flatten excludes a hidden *nested* set's pages; **negative control** — empty `hidden_groups` resolves byte-identical groups.

#### Task 3 — The Shared Eye

**Why:** Second consumer; rule of two.
**Files:** `HiddenPane.tsx`, a shared home for `EyeToggle`, `DisclosureRow.tsx`.
**Steps:** Hoist `EyeToggle` + its css; add `trailing` pass-through to `DisclosureRow`. Expect: HiddenPane renders unchanged (its tests stay green, unmodified).

#### Task 4 — Pane Wiring

**Why:** The user-facing surface.
**Files:** `GroupingPane.tsx`, `groupingPane.css.ts`.
**Steps:** Eyes on chip rows / `CustomList` (Grouping usage only), folder rows (hover reveal), sub chips (global toggle); new date-bucket middle list via `useValuesEpoch` + `flattenContainer` + `bucketKey` + GroupBand's heading formatter; HEG switch above Ungrouped. Toggle writes `hidden_groups` through the existing `save`.

#### Task 5 — Closeout

Live UIX pass against the running app (screenshots: hide/unhide each kind, subtree cascade, sub-value cascade, date buckets, HEG switch) · docs (`ViewsPM` grouping section) · line counts · commit.
