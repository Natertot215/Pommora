## Open In Preview Rules — Implementation Plan

**DATE:** 10-13-2026
**STATUS:** Ratified
**SOURCE:** The 10-13-2026 conversation with Nathan (the request, its answers, and the ratified approach and folding options).

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `84e26b529` | 7682 passed · 2 skipped · 529 files | — | — |

### Context

Today a Collection decides where its pages open through a per-Collection `open_in` sidecar field (Full Page or Preview), set from the only row of the view toolbar's **Configuration** leaf. Two hand-copied checks honor it — the sidebar's `selectRow` and the views' `openPage` — while the Matrix, the Navigation surfaces, page tiles, and connections ignore it. Connections carry their own toggle, **Open Connections In Preview**. Nathan's NexusOS has four Collections set to Preview: Resources, Index, Ideas, and Assets.

Filtering is already one system: Views and the Matrix share the rule model (`Core/Views/views.ts`), the editor (`Core/Views/Settings/FilterFrame.tsx`), and the evaluator (`Core/Views/Pipeline/filter.ts`). Excluded Directories (`Core/Settings/ExcludedDirectoriesRow.tsx`) is a count, a Manage button, and a popover of path rows — the row shape this work shares. Settings persist in three tiers: `.nexus/settings.json` (`personalization`, syncs across devices), the per-machine Nexus database, and the app config; there is no per-user tier.

### Overview

One Nexus-level rule list replaces the per-Collection field: an **Open In Preview** row in Settings › Navigation opens the shared filter editor in a Manage pane, and every plain-click page open asks one session action, `openTarget`, which sends a page matching the enabled rules to the Page Window, ⌘-click to a new tab, and everything else through `select`. The rules are judged synchronously from what the tree already holds — Title, Location, Created, Contexts — against a test compiled once per change to the rules or the folder tree, so routing a click costs no file read; widening the vocabulary later is additive.

The shared filter editor changes for every surface it serves: per-row And/Or connectors go (the footer's All/Any is the only combinator, defaulting to Any), text Is/Isn't fold case, Contexts take multi-select's Is Any / Is All / Isn't, and the Location value field becomes the design kit's new `TokenField` — typing narrows the folder picker, and under Contains and Doesn't Contain, Enter adds a folder-name chip. Its hand-built remove and add buttons fold into the shared accessory buttons, as do Excluded Directories', and the count + Manage row becomes one component. `open_in` and the Configuration leaf leave no trace in code, docs, or Nathan's sidecars.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `filterRules.ts` • File | The filter-rule model — schema, types, ops, and rule helpers — moved out of `views.ts`, plus the standalone filter shape the Matrix and the setting share. | `Core/Views/filterRules.ts` |
| `StandaloneFilter` / `standaloneFilter` • Type, Schema | `{ rules: FilterGroup \| null; enabled: boolean }`, the filter that isn't attached to a view; per-field lenient. | `Core/Views/filterRules.ts` |
| `NO_FILTER` • Constant | `{ rules: null, enabled: true }`, the standalone filter's default. | `Core/Views/filterRules.ts` |
| `localIso` • Function | The local-clock ISO stamp `pageValuesOf` writes, moved from `loadValues.ts` beside `localDayKey` so the renderer can derive Created. | `UIX/Utilities/pad.ts` |
| `previewRules.ts` • File | `opensInPreview(tree, page)`, judging a page's `toRow` row against the memoized compiled rules. | `Core/Navigation/previewRules.ts` |
| `openTarget` • Session Action | The one plain-click open: ⌘ → new tab, a matching page → Page Window, else `select`; returns `'tab' \| 'window'`. | `Core/Session/navigationSlice.ts` |
| `openInPreview` • Personalization Key | The rule list, a `StandaloneFilter`. | `Core/Settings/personalization.ts` |
| `filterViewOf` / `standalonePatch` • Functions | The adapters between a `StandaloneFilter` and the editor's `FilterView` / `FilterPatch`, hoisted from `MatrixMenu`. | `Core/Views/Settings/FilterFrame.tsx` |
| `TokenField` • Component | Values standing in a field beside a bare caret: Enter offers the draft to its host, Backspace on an empty caret removes the last value. | `UIX/Fields/TokenField.tsx` |
| `LocationTree` • Component | The location picker's body: the full tree, or the tree pruned to the draft. | `Core/Views/Settings/FilterFrame.tsx` |
| `editStandalone` • Function | Strips a standalone filter's rules for a configuration pass; serves the Matrix and the setting. | `Core/Nexus/configReach.ts` |
| `ManageRow.tsx` • File | The count + Manage + bare-pane settings row. | `Core/Settings/ManageRow.tsx` |
| `PreviewRulesRow.tsx` • File | The Open In Preview row. | `Core/Settings/PreviewRulesRow.tsx` |
| `'previewRules'` • Row Kind | The frames entry kind for the row. | `Core/Settings/frames.ts` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `OPEN_INS` / `OpenIn` | The per-Collection open target. | `Core/Views/viewRow.ts` |
| `openInField` / `coerceOpenIn` | Its decoder. | `Core/Nexus/schemas.ts` |
| `CollectionNode.openIn` | Its tree field. | `Core/Nexus/tree.ts` |
| Configuration leaf | `'configuration'` frame id, entry, `OPEN_IN_OPTIONS`, `setOpenIn`, `configurationLeaf`, the scope filter. | `Core/Views/Settings/SettingsFrame.tsx` |
| `definedOnly` / the Set-write guard | The patch filter and guard only `open_in` needed. | `Core/Views/containerConfig.ts` |
| `Connector` / `FilterRow` / `connectorFor` / `encodeFilter` / `isAllOfLeaves` | The per-row connector model. | `Core/Views/filterModel.ts` |
| `CONTEXT_OPS` / `OperatorChoice.multi` | Context's own operator list; a flag nothing reads. | `Core/Views/filterModel.ts` |
| `ConnectorButton` / `RemoveButton` / `whatCell` | Hand-built editor pieces. | `Core/Views/Settings/FilterFrame.tsx` |
| `connector` / `whatCell` / `removeButton` / `REMOVE_INSET` styles | Their CSS. | `Core/Views/Settings/filter-frame.css.ts` |
| `addRow` / `addButton` styles | Excluded Directories' labeled add button. | `Core/Settings/settings-rows.css.ts` |
| `AccessoryButton`'s `box` prop / `--accessory-box` | Every caller passes the CSS default; nothing else sets the variable. | `UIX/Menus/MenuRows.tsx`, `menu-row.css.ts`, `UIX/Table/table.css` |
| `buildSetTree` | The `{ id, children }` copy of the tree's Collection and Set nodes; the filter and grouping read the nodes themselves. | `Core/Views/Pipeline/group.ts` |
| `filtering` in `matrixConfig.ts`, `filterViewOf` in `MatrixMenu.tsx` | Moved to the shared homes above. | — |

#### Constraints

- **Agents:** Implementation runs on opus-medium, phase reviews on opus-high, and the final review and neutral verification on opus at xhigh effort.
- **Gates:** `npm run typecheck`, `npm run test`, `npm run lint` from the repo root; lint runs clean; typecheck covers tests. Biome formats every write — an Edit failing on whitespace means it reformatted; re-read and retry. Every task ends with the gates green.
- **Greps:** Apple Git's `git grep -E` doesn't support `\b`; every word-boundary grep in this plan uses `git grep -P`.
- **Settled Decisions (Nathan's):** Footer-only All/Any everywhere, default **Any** on every surface. Vocabulary is Title, Location, Created, Contexts. Name chips are whole-name, case-insensitive, any-of, added only under Contains / Doesn't Contain; typing in the Location field narrows the picker under all four Location operators. The Location field is `TokenField`, built on `InputField`; a typed name that equals an existing folder's title stays a name. Connections: toggle on → always preview; off → the rules. Storage in `personalization`. Hint copy: "Pages matching these rules open within preview windows by default." Both remove buttons and both add buttons are the shared, icon-only accessory buttons. The Matrix Window and the Page Window keep sharing one floating slot: a matching page opened from any surface while the Matrix stands in its window swaps it for the Page Window, as the Preview rows already do.
- **Known Consequence:** `select` records Recents and `openWindowTab` doesn't, so a page the rules preview never enters Recents from any surface — Recents record only an opened tab (NavigationPM), as today's Preview rows and `open_in` already behave, now with the wider reach.
- **Copy:** The row label is **Open In Preview**. No other user-facing copy is added; existing hints stay as written.
- **Frozen:** `select`'s signature and behavior; `openWindowTab`; the explicit Preview / New Tab / Open menu rows, breadcrumbs, `promoteWindowTab`, `createActions`, and tab-strip drops keep calling `select` / `openWindowTab` directly. The `view_button` path (`container:configure`, `setContainerConfig`, `coerceViewButton`, `NEEDS_CONFIG_PATCH`, `VIEW_BUTTONS`) survives. `GroupFrame` and `SortFrame` keep `label` / `onBack` — only `FilterFrame` has a host without a slide.
- **Hard Rules:** Core's host half imports no React; no O(N) work per click; finite states as unions + switch.
- **Removal:** Zero trace — no `open_in`, `openIn` (the field), `OpenIn`, `page-preview`, `full-page`, or Configuration leaf survives in code, tests, docs, or Nathan's sidecars. Never delete: `matrixOpenIn` / `MatrixOpenIn` / `MATRIX_OPEN_INS`, `connectionsOpenInPreview`, `isOpenInTabs`, `scanLabel = 'Open Full Page'`, `.claude/HistoryPM.md`, `.claude/sessions/`.
- **Migration:** Backup every file the script writes before writing; the script is idempotent and lives in the scratchpad, never in the repo.

#### Process Overview

- [x] **Phase 1** — Filter Model & Evaluator
  - [x] Task 1-1
  - [x] Task 1-2
  - [x] Task 1-3
  - [x] Review Checkpoint
- [ ] **Phase 2** — The Shared Filter Editor
  - [ ] Task 2-1
  - [ ] Task 2-2
  - [ ] Task 2-3
  - [ ] Task 2-4
  - [ ] Review Checkpoint
- [ ] **Phase 3** — The Setting & One Page-Open
  - [ ] Task 3-1
  - [ ] Task 3-2
  - [ ] Task 3-3
  - [ ] Task 3-4
  - [ ] Review Checkpoint
- [ ] **Phase 4** — The Settings Row & `open_in` Removal
  - [ ] Task 4-1
  - [ ] Task 4-2
  - [ ] Task 4-3
  - [ ] Review Checkpoint
- [ ] **Phase 5** — Migration & Reconciliation
  - [ ] Task 5-1
  - [ ] Task 5-2
  - [ ] Task 5-3
- [ ] **Closing** — Final Verification, the HistoryPM entry, and `c/view-changes`

---

### Phase 1 — Filter Model & Evaluator

**GOAL:** Give the filter-rule model one home free of the `views.ts` ↔ `personalization.ts` import cycle, define the standalone filter once, and land the evaluator-level changes — case folding, name chips, the filter and grouping reading the tree's own nodes, Context operators, and Any-filter seeding. The editor renders the new operator labels and nothing else changes yet; every later phase builds on these shapes.

#### Task 1-1

**TASK:** Move the filter-rule model from `views.ts` into `Core/Views/filterRules.ts`, add the standalone filter shape, and move the Matrix onto it.

**NOW:** `views.ts:8` imports `TENTHS_SCALE, ZOOM` from `personalization.ts`, so `personalization.ts` can't import `filterGroup` from `views.ts` without a load-order crash. The Matrix hand-parses `{ rules, enabled }` (`matrixConfig.ts:10,46,53-55,82-85`). `idArray` (`views.ts:76`) serves both filter rules and view fields.

**CHANGE**

- [ ] Move `idArray` into `Core/Files/decoders.ts` as an export; `views.ts` imports it.
- [ ] Create `Core/Views/filterRules.ts` holding, verbatim, `MATCH_MODES`/`MatchMode`, `filterRule`/`FilterRule`, `FilterGroup`, `filterGroup`, `FILTER_OPS`, `OPERANDLESS_OPS`, `SUBSTRING_OPS`, `ruleOperands`, `answerable`, `isGroup`, `mapRules`, plus the standalone filter below. Delete them from `views.ts`; `views.ts` imports what its saved-view schema needs.
- [ ] Repoint every importer (`git grep -lP "\b(FilterRule|FilterGroup|filterGroup|MatchMode|FILTER_OPS|OPERANDLESS_OPS|SUBSTRING_OPS|ruleOperands|answerable|isGroup|mapRules)\b" Core` — 12 files) at `filterRules`, including names inside multi-line import blocks; no re-export from `views.ts`.
- [ ] `matrixConfig.ts`: `filter: StandaloneFilter`, default `NO_FILTER`, parse `standaloneFilter.parse(section(raw, 'filter'))`, delete its `filtering`; `matrixInput.ts` and `Core/Session/matrixSlice.ts` import `filtering` from `filterRules`.

**AFTER**

```Core/Views/filterRules.ts diff
+import { z } from 'zod'
+import { isPlainObject } from '../Contract/validators'
+import { eachOf, idArray } from '../Files/decoders'
+
+const MATCH_MODES = ['all', 'any'] as const
+export type MatchMode = (typeof MATCH_MODES)[number]
+  … filterRule, FilterRule, FilterGroup, filterGroup, FILTER_OPS, OPERANDLESS_OPS, SUBSTRING_OPS,
+    ruleOperands, answerable, isGroup, mapRules — moved verbatim …
+
+/** A filter that isn't a view's: its rules and whether they apply travel together. */
+export const standaloneFilter = z.object({
+  rules: filterGroup.nullable().catch(null),
+  enabled: z.boolean().catch(true),
+})
+export type StandaloneFilter = z.infer<typeof standaloneFilter>
+export const NO_FILTER: StandaloneFilter = { rules: null, enabled: true }
+
+export const filtering = (f: StandaloneFilter): f is { rules: FilterGroup; enabled: true } =>
+  f.enabled && f.rules !== null
```

```Core/Matrix/matrixConfig.ts diff
@@ MatrixConfig @@
-  filter: { rules: FilterGroup | null; enabled: boolean }
+  filter: StandaloneFilter
@@ DEFAULT_MATRIX_CONFIG @@
-  filter: { rules: null, enabled: true },
+  filter: NO_FILTER,
@@ parseMatrixConfig @@
-    filter: {
-      rules: filterGroup.safeParse(filter.rules).data ?? null,
-      enabled: bool(filter.enabled, d.filter.enabled),
-    },
+    filter: standaloneFilter.parse(section(raw, 'filter')),
```

**VERIFY**

- [ ] Typecheck is green and no import block that names a moved symbol imports it from `views` (`git grep -nP "from '[./]*(Views/)?views'" Core` — read each hit's import block).
- [ ] `matrixConfig.test.ts` passes unchanged (parse leniency is per field, as before).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-2

**TASK:** Export the group compiler, fold text Is/Isn't, let the filter and grouping read the Nexus tree's own Collection and Set nodes instead of a rebuilt copy, and teach Location Contains / Doesn't Contain to match folder names.

**NOW:** `prepareGroup` is private; `applyFilter` returns every row when a group has no applicable test (`filter.ts:57`). `evaluateText` — the evaluator for Title, Text, Link, and Select/Status (`:118-121`) — compares Is/Isn't exactly (`:244-247`) and folds Contains per row (`:249-253`). `SetTreeNode` (`group.ts:37-40`) is a `{ id, children }` copy of what the tree's own `CollectionNode` / `SetNode` already are (`id`, `title`, `sets`): `buildSetTree` rebuilds it on every view resolve (`flattenContainer`, `:141`) and `matrixVisible` rebuilds a Collection-rooted one on every pass (`matrixInput.ts:103`); its readers use only `id` and `children` (`filter.ts:84-104`; `group.ts:72-80,261-330`; `resolveView.ts:47`). `iso` lives in host-side `loadValues.ts:12`; `matrixGraph.test.ts:6,64,65,67` imports it.

**CHANGE**

- [ ] Write the failing tests first in `filter.test.ts`: Title, Text, and Select Is/Isn't fold case (`'Bread'` matches `'bread'`; Isn't excludes it); Location Contains `['Docs']` matches a page under `X/Docs` and under a folder titled `docs`, not under `My Docs`; Doesn't Contain inverts; a mix of a picked id and a name is any-of; a name matching no folder matches nothing under Contains and everything under Doesn't Contain, while a dead id still abstains (`:805` stays true); `prepareGroup` returns `undefined` for `{ match: 'any', rules: [] }` and for a group whose every rule abstains. Rename `'text: is is exact, contains folds'` to what it now asserts.
- [ ] Export `prepareGroup` unchanged in name, with a doc comment.
- [ ] Fold text operands once in `prepareRule` when the evaluator is `evaluateText`; `evaluateText` folds the row value once and compares against the pre-folded operands for Is, Isn't, Contains, Doesn't Contain, Starts With. Select and Status values are canonicalized by fold at decode (`propertyValue.ts:49-60`), so their Is/Isn't read the same either way.
- [ ] Redefine `SetTreeNode` as the shape the tree's Collection and Set nodes already have, `{ id: string; title: string; sets?: SetTreeNode[] }`, and delete `buildSetTree`. `flattenContainer` returns `setTree: node.sets ?? []`; `matrixVisible` passes `tree.collections` and drops its inline build and `buildSetTree` import; `pruneHiddenSets` returns `{ ...node, sets: … }`; `subtreeIds`, `structural`, and `prepareLocation` read `.sets ?? []` for `.children`. The `{ id, children }` literals in `filter.test.ts` (`:493, 516, 530-532, 542, 754-755`) become `{ id, title, sets }`.
- [ ] `prepareLocation`'s inside walk hits a node when its id is an operand or its folded title is a folded operand. Is / Isn't stay id-only. With nothing inside, the rule abstains only when every operand is an id (`isUlidShaped`) — a deleted folder's id is stripped by `configReach`, while a typed name is a lasting pattern that matches nothing. Reword the `:83` comment to say Contains also matches by folder name.
- [ ] Export `prepareRule` beside `prepareGroup`, for creation seeding to judge one rule.
- [ ] Move `iso` from `loadValues.ts` to `UIX/Utilities/pad.ts` beside `localDayKey` as exported `localIso`; `pageValuesOf` and `matrixGraph.test.ts:6,64,65,67` use it.

**AFTER**

```Core/Views/Pipeline/group.ts diff
-export interface SetTreeNode {
-  id: string
-  children: SetTreeNode[]
-}
+/** A Collection or Set as the tree holds it. */
+export interface SetTreeNode {
+  id: string
+  title: string
+  sets?: SetTreeNode[]
+}
-export function buildSetTree(sets: SetNode[] | undefined): SetTreeNode[] {
-  return (sets ?? []).map((s) => ({ id: s.id, children: buildSetTree(s.sets) }))
-}
 function subtreeIds(node: SetTreeNode): string[] {
-  return [node.id, ...node.children.flatMap(subtreeIds)]
+  return [node.id, ...(node.sets ?? []).flatMap(subtreeIds)]
 }
@@ pruneHiddenSets @@
-    hidden.has(node.id) ? [] : [{ id: node.id, children: pruneHiddenSets(node.children, hidden) }],
+    hidden.has(node.id) ? [] : [{ ...node, sets: pruneHiddenSets(node.sets ?? [], hidden) }],
@@ flattenContainer @@
-  return { rows, setTree: buildSetTree(node.sets) }
+  return { rows, setTree: node.sets ?? [] }
@@ structural @@
-    const children = node.children.map(build)
+    const children = (node.sets ?? []).map(build)
```

```Core/Views/Pipeline/filter.ts diff
@@ prepareGroup @@
-function prepareGroup(
+/** `undefined` when no rule applies. */
+export function prepareGroup(
@@ prepareRule @@
   const evaluate = t === 'title' ? evaluateText : evaluatorOf(PROPERTY_TYPES[t].kind)
-  return (row) => evaluate(resolveFieldValue(row, id, schema), op, want)
+  const operands = evaluate === evaluateText ? want.map(foldKey) : want
+  return (row) => evaluate(resolveFieldValue(row, id, schema), op, operands)
@@ prepareLocation isInside/isNotInside @@
       const inside = new Set<string>()
+      const names = new Set(want.map(foldKey))
+      const hit = (n: SetTreeNode): boolean => want.includes(n.id) || names.has(foldKey(n.title))
       const walk = (nodes: SetTreeNode[], within: boolean): void => {
         for (const n of nodes) {
-          const hit = within || want.includes(n.id)
-          if (hit) inside.add(n.id)
-          walk(n.children, hit)
+          const held = within || hit(n)
+          if (held) inside.add(n.id)
+          walk(n.sets ?? [], held)
@@ evaluateText @@
~ // `want` arrives folded; the value folds once here.
~ const f = s === null ? null : foldKey(s)
~ is: f !== null && want.includes(f) · isNot: f === null || !want.includes(f)
~ contains / doesNotContain / startsWith compare f against want[0]
```

```Core/Matrix/matrixInput.ts diff
-  // Collections are the roots, so a Location rule can name a Collection as well as a Set.
-  const setTree = tree.collections.map((c) => ({ id: c.id, children: buildSetTree(c.sets) }))
-  const ids = new Set(applyFilter(rows, rules, schema, setTree, contextIds).map((r) => r.id))
+  // Collections are the roots, so a Location rule can name a Collection as well as a Set.
+  const ids = new Set(applyFilter(rows, rules, schema, tree.collections, contextIds).map((r) => r.id))
```

**VERIFY**

- [ ] The new `filter.test.ts` cases fail before the change and pass after.
- [ ] `matrixInput.test.ts`, `matrixGraph.test.ts`, `group.test.ts`, `resolveView.test.ts` pass.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-3

**TASK:** Give Contexts multi-select's operators, mark which Location operators accept names, drop the `multi` flag nothing reads, and let an Any filter seed the pages created under it when a blank page doesn't already meet it.

**NOW:** `CONTEXT_OPS` labels `contains_any` "Contains" (`filterModel.ts:116-120`); `LOCATION_OPS` has no name flag (`:146-151`); `OperatorChoice.multi` (`:82`) is set on 11 entries and read only by `filterModel.test.ts:140,195`. `filterSeeds` returns early from any non-All group of several rules (`creationSeeds.ts:46`), so under the Any default a page created in a filtered view takes no values and drops out of the view it was made in.

**CHANGE**

- [ ] Update `filterModel.test.ts` first: a Context reads Is Any / Is All / Isn't / Is Empty / Isn't Empty with `contains_any` / `contains_all` / `does_not_contain`; Location Contains and Doesn't Contain carry `names: true`, Is and Isn't don't; drop the two `multi` assertions.
- [ ] Write the failing `creationSeeds.test.ts` cases first: an Any group of `[Status is Done, Area Is Any Work]` seeds Status alone; an Any group whose first rule can't seed (`Title contains x`) seeds from the next one that can; an Any group a blank page already meets seeds nothing — `[Status Isn't Done, Priority Is High]`, `[Created On Or After yesterday, Status Is Done]`, `[Status Is Empty, Priority Is High]`, `[Status Is Done, Status Isn't Done]`; `Any[All[Status Is Done, Title contains x], Priority Is High]` seeds Priority alone; an Any group with no seedable rule seeds nothing; All groups seed exactly as before. The two tests that assert an Any group derives nothing flip: `:64-75`'s two-rule Any seeds `p_status` alone, and `:89-104`'s Any nested under All seeds `p_status` beside `p_sel`.
- [ ] Delete `CONTEXT_OPS`; `KIND_OPS.context = SET_OPS`. Delete `multi` from `OperatorChoice` and every entry. Add `names?: true`; set it on the two Location Contains entries.
- [ ] `filterSeeds` judges the blank new page — a `ViewRow` with the create's title, its landing `parentSetId` (`flattenContainer`'s convention), `{ ID }` frontmatter, and `createdAt: localIso(Date.now())` — against the view's `setTree` with the evaluator's own `prepareRule` / `prepareGroup`. Each node returns its seeds and whether it's met: a leaf is met when the blank passes it (an abstaining rule passes) or it seeds; an All group merges its children's seeds, met when every child is; an Any group seeds nothing when the blank passes it (or every child abstains), else takes only the seeds of its first applying child that ends up met, else nothing. The caller passes the filter only while `filter_enabled` holds, as `resolveView` does. `useViewCreation`'s `impliedSeeds` builds the blank from where each gesture lands. Rewrite `creationSeeds.ts:1` so a Context reads Is Any / Is All and states the Any rule.

**AFTER**

```Core/Views/Pipeline/creationSeeds.ts diff
-  const walk = (group: FilterGroup): void => {
-    if (group.match !== 'all' && group.rules.length > 1) return
-    …
+  // Each node answers with its seeds and whether the page, so seeded, meets it.
+  const judge = (node: FilterRule | FilterGroup): Judged => …
+    leaf: met when the blank passes its prepareRule test (abstaining passes) or ruleSeed seeds it
+    all:  merge every child's seeds; met when every child is met
+    any:  {} and met when the blank passes it; else the first applying, met child's seeds alone; else {} unmet
```

```Core/Views/filterModel.ts diff
@@ OperatorChoice @@
-  multi?: boolean
   impliedValue?: string
+  /** A typed folder name is an operand as well as a picked folder. */
+  names?: true
@@ LOCATION_OPS @@
-  { op: FILTER_OPS.isInside, label: 'Contains', slot: 'set', multi: true },
-  { op: FILTER_OPS.isNotInside, label: "Doesn't Contain", slot: 'set', multi: true },
+  { op: FILTER_OPS.isInside, label: 'Contains', slot: 'set', names: true },
+  { op: FILTER_OPS.isNotInside, label: "Doesn't Contain", slot: 'set', names: true },
@@ KIND_OPS @@
-  context: CONTEXT_OPS,
+  context: SET_OPS,
```

**VERIFY**

- [ ] `filterModel.test.ts` passes; the new and flipped `creationSeeds.test.ts` cases fail before and pass after, and the rest pass unchanged; `git grep -nP "\bmulti\??:" Core/Views` is empty.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] One definition of each filter-model name, in `filterRules.ts`; no import cycle (`personalization.ts` can import `standaloneFilter`).
- [ ] Every evaluator change is covered by a test that fails without it, including `prepareGroup` → `undefined` for an emptied group.
- [ ] Gates green at the phase's end.

---

### Phase 2 — The Shared Filter Editor

**GOAL:** Bring the model and `FilterFrame` onto flat groups together, fold the editor's buttons, give it the two seams its Settings host needs (an optional back row and a supplied target list), and build `TokenField` for the Location value field. Views, the Matrix, and the coming Settings pane all receive the same editor.

#### Task 2-1

**TASK:** Remove per-row connectors from the model and the editor in one step, and default the empty filter to Any.

**NOW:** `filterModel.ts:17-74` derives And-runs from per-row connectors and reads `decodeFilter(undefined)` as `'all'`. `FilterFrame.tsx` imports that model (`:47-57`), holds `draft: Connector | null | false` (`:370`), bulk-rewrites connectors in `pickMatch` (`:396-408`), resets the lead connector in `removeRow` (`:416-420`), toggles one in `toggleConnector` (`:422-428`), renders `ConnectorButton` (`:323-330`, `:560-562`, `:630-635`), and falls back to `'all'` (`:376`).

**CHANGE**

- [ ] Update the tests first. `filterModel.test.ts`: delete the `encodeFilter` describe and the connector round-trips (`:16-84`); an any-of-runs group and an any with an all-run inside decode `locked`; `decodeFilter(undefined)` is `{ kind: 'rows', mode: 'any', rules: [] }`. `FilterFrame.test.tsx`: delete the connector tests (`:197-231`, `:334-348`) and the `Toggle connector` assertion (`:145-149`); the empty-filter mode test expects a click to pick **All** and land `match: 'all'`; `:250-278` uses the Matches toggle as its second write; `:378-394` expects `match: 'any'`.
- [ ] `filterModel.ts`: delete `Connector`, `FilterRow`, `isAllOfLeaves`, `connectorFor`, `encodeFilter`; `DecodedFilter` carries `rules`; rewrite `decodeFilter` and its doc comment as below.
- [ ] `FilterFrame.tsx`: rows become `FilterRule[]`; `save` builds the flat group; `liveRows` returns rules; `pickMatch` saves the live rules under the pick or parks it; `removeRow` filters; `completeDraft` appends `mintRule(...)`; Reset calls `save(mode, [])`; `draft` becomes `drafting: boolean`; the locked fallback mode is `'any'`; delete `toggleConnector`, `ConnectorButton`, the `whatCell` wrapper, and their imports.
- [ ] `filter-frame.css.ts`: delete `connector`, `whatCell`, and the `fieldBase` import.

**AFTER**

```Core/Views/filterModel.ts diff
-export type Connector = 'and' | 'or'
-export interface FilterRow { connector: Connector | null; rule: FilterRule }
 export type DecodedFilter =
-  | { kind: 'rows'; mode: MatchMode; rows: FilterRow[] }
+  | { kind: 'rows'; mode: MatchMode; rules: FilterRule[] }
   | { kind: 'locked' }
-  … isAllOfLeaves, connectorFor, encodeFilter …
-/** The frame writes two shapes: … */
+/** The pane writes one shape, a flat group under the footer's mode; anything nested was authored elsewhere and locks. */
 export function decodeFilter(filter: FilterGroup | undefined): DecodedFilter {
-  … connector derivation …
+  if (!filter) return { kind: 'rows', mode: 'any', rules: [] }
+  return filter.rules.some(isGroup)
+    ? { kind: 'locked' }
+    : { kind: 'rows', mode: filter.match, rules: filter.rules as FilterRule[] }
 }
```

```Core/Views/Settings/FilterFrame.tsx diff
-  const [draft, setDraft] = useState<Connector | null | false>(false)
+  const [drafting, setDrafting] = useState(false)
   const decoded: DecodedFilter = decodeFilter(view.filter)
-  const rows: FilterRow[] = decoded.kind === 'rows' ? decoded.rows : []
-  const decodedMode: MatchMode = decoded.kind === 'rows' ? decoded.mode : 'all'
+  const rules: FilterRule[] = decoded.kind === 'rows' ? decoded.rules : []
+  const decodedMode: MatchMode = decoded.kind === 'rows' ? decoded.mode : 'any'
-  const save = (nextMode: MatchMode, nextRows: FilterRow[]): void =>
-    onCommit({ filter: encodeFilter(nextMode, nextRows) })
+  const save = (nextMode: MatchMode, next: FilterRule[]): void =>
+    onCommit({ filter: next.length ? { match: nextMode, rules: next } : undefined })
@@ pickMatch @@
-    const bulk = connectorFor(pick)
-    save(pick, current.map((row, i) => ({ ...row, connector: i === 0 ? null : bulk })))
+    save(pick, current)
@@ removeRow @@
-    const next = liveRows().filter((_, i) => i !== index)
-    if (next.length > 0) next[0] = { ...next[0], connector: null }
-    save(mode, next)
+    save(mode, liveRows().filter((_, i) => i !== index))
-  const toggleConnector = …
@@ ruleRow @@
-          <span className={fp.whatCell}>
-            {row.connector !== null && ( <ConnectorButton … /> )}
             <FieldPicker ariaLabel="Filter property" …>
-          </span>
```

**VERIFY**

- [ ] `filterModel.test.ts` and `FilterFrame.test.tsx` pass; `git grep -n "onnector" Core/Views` is empty.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-2

**TASK:** Fold the editor's remove and add buttons into the shared accessory buttons, and drop `AccessoryButton`'s dead `box` prop and its variable.

**NOW:** `RemoveButton` is a raw `<button>` with `fp.removeButton` (`FilterFrame.tsx:332-338`, `filter-frame.css.ts:17-18,76-88`); the add button hand-copies `AccessoryButton create` (`:688-699`). Every `box` caller passes `20`; the prop is the only setter of `--accessory-box` (`MenuRows.tsx:306`), whose four readers fall back to `20px` (`menu-row.css.ts:261`, `UIX/Table/table.css:220,240,241`).

**CHANGE**

- [ ] Replace both `RemoveButton` uses with `<AccessoryButton icon="x" size="control" ariaLabel="Remove filter" onClick={…} />` and the add button with `<FootingCreate ariaLabel="Add filter rule" onClick={…} />`; delete `RemoveButton`, `fp.removeButton`, `REMOVE_INSET`, and the now-unused `Button` / `accessoryButton` imports.
- [ ] Delete `box` from `AccessoryButton`'s props and inline style, and from `FootingCreate`, `ViewFrame.tsx:113`, and `ViewItemMenu.tsx:35`; write `20px` where the four readers read `var(--accessory-box, 20px)`.

**AFTER**

```UIX/Menus/MenuRows.tsx diff
@@ FootingCreate @@
-      box={20}
@@ AccessoryButton @@
-  box,
-  box?: number
-      style={box ? ({ '--accessory-box': `${box}px` } as CSSProperties) : undefined}
```

```UIX/Menus/menu-row.css.ts diff
-  width: 'var(--accessory-box, 20px)',
+  width: '20px',
```

**VERIFY**

- [ ] `FilterFrame.test.tsx`'s `Remove filter` / `Add filter rule` queries pass unchanged.
- [ ] `git grep -n "accessory-box" UIX Core` is empty, and no `AccessoryButton` / `FootingCreate` caller passes `box`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-3

**TASK:** Give `FilterFrame` an optional back row and an optional supplied target list, and hoist the standalone-filter adapters beside its types.

**NOW:** `FilterFrame` requires `label` and `onBack` for a `MenuTopRow` header (`:655`) — `MenuTopRow` is the back control itself — and computes `targets` itself (`:392`). `MatrixMenu.tsx:43-46,136-143` owns `filterViewOf` and the inverse mapping. `FilterFrame` is the only frame mounted outside a slide, so only it takes an optional back.

**CHANGE**

- [ ] Replace `label` / `onBack` with `back?: { label: string; onBack: () => void }`; the header renders only when `back` is given. Add `targets?: PaneTarget[]`, defaulting to `filterTargets(schema, tree, locations.length > 0)`.
- [ ] Export `filterViewOf(f: StandaloneFilter): FilterView` and `standalonePatch(p: FilterPatch): Partial<StandaloneFilter>` beside `FilterView` / `FilterPatch`.
- [ ] `ViewLeaf` passes `back={{ label, onBack }}`; `MatrixMenu` passes `back`, uses `filterViewOf`, commits `patch({ filter: standalonePatch(next) })`, and drops its `FilterView` import; `FilterFrame.test.tsx`'s harness (`:66-74`) passes `back`.

**AFTER**

```Core/Views/Settings/FilterFrame.tsx diff
 export type FilterView = Pick<SavedView, 'filter' | 'filter_enabled' | 'column_styles'>
 export type FilterPatch = { filter: SavedView['filter'] } | { filter_enabled: boolean }
+
+export const filterViewOf = (f: StandaloneFilter): FilterView => ({
+  filter: f.rules ?? undefined,
+  filter_enabled: f.enabled,
+})
+export const standalonePatch = (p: FilterPatch): Partial<StandaloneFilter> =>
+  'filter' in p ? { rules: p.filter ?? null } : { enabled: p.filter_enabled }
@@ FilterFrame props @@
-  label: string
-  onBack: () => void
+  back?: { label: string; onBack: () => void }
+  targets?: PaneTarget[]
@@ body @@
-  const targets = filterTargets(schema, tree, locations.length > 0)
+  const targets = supplied ?? filterTargets(schema, tree, locations.length > 0)
@@ render @@
-      header={<MenuTopRow label={label} current="Filtering" onBack={onBack} />}
+      header={back && <MenuTopRow label={back.label} current="Filtering" onBack={back.onBack} />}
```

**VERIFY**

- [ ] The View and Matrix filter panes render their back row as before (`FilterFrame.test.tsx`, Matrix menu tests).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-4

**TASK:** Build `TokenField` in `UIX/Fields` — the ContextPM backlog's field of values beside a bare caret — and make it the Location filter's value field: typing narrows the folder picker under every Location operator, and under Contains / Doesn't Contain, Enter adds the typed folder name as a chip.

**NOW:** `LocationField` (`FilterFrame.tsx:179-260`) is a `ValueFieldShell` (a `role="button"` div) showing picks as a `FieldRun` and opening a `DisclosureRow` tree in a `PickerMenu`; the operator menu keeps values across any `set`-slot switch (`:597-608`). `.claude/ContextPM.md:33` plans `TokenField` — "an InputField holding a run of labels beside a bare caret, where Enter turns the draft into a segment … and Backspace on an empty caret removes the last" — naming the Location filter its first consumer; the showcase sketches it as `<InputField capped>` holding labels and a `base` input (`Dashboard/Leaves/FieldsLeaf.tsx:44-54`). `InputField` takes no `ref` (`UIX/Fields/InputField.tsx:21-41`).

**CHANGE**

- [ ] Write the failing tests first. `UIX/Fields/TokenField.test.tsx`: typing reports the draft; Enter offers the trimmed draft and nothing when it's blank; Backspace on an empty caret runs the last entry's `onRemove`, and on a non-empty caret only edits; the placeholder shows only while there are no entries. `FilterFrame.test.tsx`: Tab into the Location field opens the picker unfiltered; typing narrows it to matching folders with their ancestors open; Enter under Contains adds the typed name as a chip and clears the draft, including a name equal to an existing folder's title; Enter under Is adds nothing; a name equal by fold to a shown one isn't added twice; a picked folder joins as today and clears the draft; switching Contains → Is keeps picked ids and drops names; `:411-448` (location picks) moves onto the field.
- [ ] `InputField` takes an optional `ref` (React 19's ref prop) on its field element, so a picker can anchor to it.
- [ ] Create `TokenField`: an `InputField` (its `editable` focus ring, the host's `chrome` and `className`) holding the `FieldRun` of `entries`, then a controlled caret in the `base` chrome. `FieldRun` is already the field's one scroll region with its trailing fade (`field-run.css.ts:11-19`), so the field isn't `capped` — a capped row would nest a second. The run keeps its natural width until it overflows into its fade, and the caret takes the rest of the row, never narrower than a few characters, so a press on the field's empty space lands in it. Enter offers the trimmed draft to `onEnter`; Backspace on an empty caret runs the last entry's `onRemove`; Escape is left to the host's surface. The host owns the draft, its picker, and what Enter makes.
- [ ] `LocationField` takes `names` (from the current `OperatorChoice`) and renders a `TokenField` with `chrome="bordered"`, `className={fp.valueField}`, `placeholder="Value"`, `ariaLabel="Filter values"`, `ref` as the `PickerMenu`'s `triggerRef`; the caret's focus opens the picker (`focus="keep"`, so picking a row never blurs the caret), and editing the draft opens it too. `onEnter` adds the draft as a name chip when `names` holds and no shown value folds equal to it, then clears the draft; an exact folder title stays a name. `pick` toggles a picked id and clears the draft; the picker's `onDismiss` closes it and clears the draft. `ValueFieldShell` stays with `ChipsField` alone.
- [ ] `LocationTree` renders the picker body from `nodes`, `shown`, and the draft, owning the `useDisclosureSet` that moves out of `LocationField`: an empty draft renders today's disclosure tree; a draft renders the tree pruned to nodes the app's search matcher accepts (`matchScore(foldKey(title), foldKey(draft)) !== null`, as Navigation, View Search, and Trash narrow), plus their ancestors, all expanded, with the same `DisclosureRow` and `pickRuns`.
- [ ] A value found in the node map renders as today; any other value renders `label: v` with the `folder-search` glyph and the same `onRemove`. Add `'folder-search': FolderSearch` to the curated `icons` map in `UIX/Symbols/index.tsx`.
- [ ] The operator menu, switching to a `set` operator without `names`, keeps only values in `liveIds` — `new Set(flattenNodes(locations).map((n) => n.id))`, computed once where the operator menu renders — omitting `values` when none remain.
- [ ] The showcase's capped sketch (`FieldsLeaf.tsx:44-54`) becomes a live `TokenField` over its `draft` state; the caret's width rule is `tokenCaret` beside the other field chrome in `UIX/Fields/fields.css.ts`.

**AFTER**

```UIX/Fields/TokenField.tsx diff
+/** Values standing in a field beside a bare caret: Enter offers the draft, and Backspace on an empty caret removes the last value. The host owns the draft and decides what Enter makes. */
+export function TokenField({ entries, draft, onDraftChange, onEnter, onFocus, placeholder, ariaLabel, chrome, className, ref }: {
+  entries: RunEntry[]
+  draft: string
+  onDraftChange: (draft: string) => void
+  onEnter: (draft: string) => void
+  onFocus?: () => void
+  placeholder?: string
+  ariaLabel?: string
+  chrome?: 'boxed' | 'bordered'
+  className?: string
+  ref?: Ref<HTMLDivElement>
+}): React.JSX.Element {
+  return (
+    <InputField ref={ref} chrome={chrome} className={cx(s.editable, className)}>
+      {entries.length > 0 && <FieldRun entries={entries} />}
+      <input
+        className={cx(s.base, s.tokenCaret)}
+        value={draft}
+        placeholder={entries.length > 0 ? undefined : placeholder}
+        aria-label={ariaLabel}
+        spellCheck={false}
+        onFocus={onFocus}
+        onChange={(e) => onDraftChange(e.target.value)}
+        onKeyDown={(e) => {
+          if (e.key === 'Enter') {
+            e.preventDefault()
+            if (draft.trim()) onEnter(draft.trim())
+          } else if (e.key === 'Backspace' && draft === '') entries.at(-1)?.onRemove?.()
+        }}
+      />
+    </InputField>
+  )
+}
```

```Core/Views/Settings/FilterFrame.tsx diff
@@ LocationField @@
-function LocationField({ values, nodes, onCommit }: { … }): React.JSX.Element {
+function LocationField({ values, nodes, names, onCommit }: {
+  values: string[]; nodes: (CollectionNode | SetNode)[]; names: boolean; onCommit: (next: string[]) => void
+}): React.JSX.Element {
+  const [draft, setDraft] = useState('')
@@ field @@
-      <ValueFieldShell hostRef={ref} onOpen={() => setOpen(true)}>
-        {shown.length === 0 ? <span className={fp.placeholder}>Value</span> : <FieldRun entries={…} />}
-      </ValueFieldShell>
+      <TokenField ref={ref} chrome="bordered" className={fp.valueField} entries={entries} draft={draft}
+        placeholder="Value" ariaLabel="Filter values" onFocus={() => setOpen(true)}
+        onDraftChange={(d) => { setDraft(d); setOpen(true) }} onEnter={enter} />
@@ entries @@
-              const node = byId.get(v)
-              return { key: v, label: node?.title ?? v, icon: <EntityIcon kind={node?.kind ?? 'set'} … />, … }
+              const node = byId.get(v)
+              return node
+                ? { key: v, label: node.title, icon: <EntityIcon kind={node.kind} icon={node.icon} … />, onRemove: () => toggle(v) }
+                : { key: v, label: v, icon: <Icon name="folder-search" … />, onRemove: () => toggle(v) }
@@ PickerMenu @@
-      <PickerMenu open={open} onDismiss={() => setOpen(false)} triggerRef={ref} origin="left" contentClassName={treePane}>
-        <MenuScrollFrame maxHeight={PICKER_MAX_HEIGHT}>{… renderLevel(nodes)}</MenuScrollFrame>
+      <PickerMenu open={open} onDismiss={dismiss} triggerRef={ref} origin="left" contentClassName={treePane} focus="keep">
+        {open && <LocationTree nodes={nodes} shown={shown} query={draft} onPick={pick} />}
@@ operator switch @@
+                      const kept = o.slot === 'set' && !o.names && row.rule.values
+                        ? row.rule.values.filter((v) => liveIds.has(v)) : row.rule.values
```

**VERIFY**

- [ ] The new tests fail before and pass after.
- [ ] `grep -n "'folder-search'" UIX/Symbols/index.tsx` hits the curated map; `npm run build:dashboard` builds the showcase's live `TokenField`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] The editor reads as always flat — no connector residue in names, CSS, tests, or comments.
- [ ] View and Matrix panes behave as before apart from the settled changes (default Any, folded Is, Context labels, typeable Location, folded buttons).
- [ ] `LocationTree` reuses `DisclosureRow` and `pickRuns`; nothing hand-rolls a second tree row.

---

### Phase 3 — The Setting & One Page-Open

**GOAL:** Declare the setting, judge it synchronously from the tree, and route every plain-click page open through one session action, so the rules work end to end before the row that edits them exists. Rule upkeep lands here because it writes the same key.

#### Task 3-1

**TASK:** Declare `openInPreview` and make "a row at its default stores no key" hold for object values.

**NOW:** `setPersonalization` compares `settled === SETTING_DEFAULTS[key]` (`configSlice.ts:66`), an identity test an object never passes.

**CHANGE**

- [ ] Write the failing tests first: `settingValue('openInPreview', junk)` reads as absent; a stored rule set reads back whole; `setPersonalization('openInPreview', NO_FILTER)` stores no key (configSlice level).
- [ ] Add `openInPreview: setting(standaloneFilter, NO_FILTER)` directly under `connectionsOpenInPreview` in `SETTINGS`.
- [ ] `configSlice.ts:66` compares with `same`, imported from `Core/Files/stableJson.ts`.

**AFTER**

```Core/Settings/personalization.ts diff
   connectionsOpenInPreview: flag(false),
+  openInPreview: setting(standaloneFilter, NO_FILTER),
```

```Core/Session/configSlice.ts diff
-    const value = settled === SETTING_DEFAULTS[key] ? undefined : settled
+    const value = same(settled, SETTING_DEFAULTS[key]) ? undefined : settled
```

**VERIFY**

- [ ] The new tests fail before and pass after; `personalization.test.ts` and `readNexus.test.ts` pass.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-2

**TASK:** Add `opensInPreview`: the page judged from the tree against rules compiled once per change to the rules or the folder tree.

**NOW:** No surface judges a page against rules without loaded values. `toRow` (`group.ts:107-128`) already builds a filter row from a `PageNode` — title, path, its folder, `page.contextValues`, and the `{ ID }` frontmatter fallback (`:102-105`) — and the Matrix builds its rows the same way (`matrixInput.ts:101`). `containerAt` (`treePatch.ts:103`) finds a page's folder from its path.

**CHANGE**

- [ ] Write `previewRules.test.ts` first, against a `Core/Testing` tree: no rules → false; disabled → false; an emptied group (`{ match: 'any', rules: [] }`) → false; Location Is a Collection for a page directly in it; Contains a Set for a page two levels down; Contains a typed name; Contains a name no folder holds → false; Title Contains folds; a Context Is Any; Created On Or After; a path that no longer holds the page → false.
- [ ] Create `Core/Navigation/previewRules.ts`; the row is `toRow`'s, with Created derived from the id.

**AFTER**

```Core/Navigation/previewRules.ts diff
+// The rules judge what the tree already holds, so routing a click costs no read; a rule on a page's own properties would load its values first.
+
+const previewTestOf = entityMemo(
+  [(t) => t.config.personalization.openInPreview, (t) => t.contexts, (t) => t.collections],
+  (tree) => {
+    const rules = settingOf(tree.config.personalization, 'openInPreview')
+    return filtering(rules)
+      ? prepareGroup(rules.rules, [], tree.collections, contextIdsOf(tree))
+      : undefined
+  },
+)
+
+export function opensInPreview(tree: NexusTree, { id, path }: { id: string; path: string }): boolean {
+  const test = previewTestOf(tree)
+  if (!test) return false
+  const folder = containerAt(tree, relDirname(path))
+  const page = folder?.pages.find((p) => p.id === id)
+  if (!folder || !page) return false
+  const created = { frontmatter: { [ID_KEY]: id }, createdAt: localIso(idTime(id)), modifiedAt: null }
+  return test(toRow(page, folder.id, { [id]: created }, tree.config.pageMetadata))
+}
```

**VERIFY**

- [ ] `previewRules.test.ts` passes; each case fails when its clause is removed.
- [ ] `previewRules.ts` imports nothing host-side (`git grep -nP "loadValues|readNexus" Core/Navigation/previewRules.ts` is empty).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-3

**TASK:** Add `openTarget` and route every plain-click page open through it.

**NOW:** The sidebar (`Sidebar.tsx:97-107`) and views (`useViewInteractions.tsx:367-382`) each hand-copy an `open_in` check; the Matrix (`MatrixView.tsx:35,57-60`), Navigation (`useNavData.ts:21,48-57`), page tiles (`TileHost.tsx:89,237-240,262`), Set opens (`useViewInteractions.tsx:135-136`), and connections (`pageConnections.ts:17,21,37-41`) call `select` or `openWindowTab` directly. `go` always fires `onDone`, which closes the NavWindow under **Close Navigation On Select** — after a preview open it would close the window the page just opened into (`NavWindow.tsx:66-69`, `windowSlice.ts:150-152`).

**CHANGE**

- [ ] Write the failing tests first: `openTarget` with `newTab` → `select(target, { newTab: true, heading: undefined })`; a matching page → `openWindowTab` and `'window'`; a non-matching page and a non-page → `select(target, { newTab: undefined, heading })` and `'tab'`; `pageConnections` 'preview' mode with the toggle off routes a matching page to `openWindowTab`; the NavWindow stays open when its row opens a matching page.
- [ ] Update the store-`select` spies' expectations to the `(target, { newTab: undefined, heading: undefined })` shape: `cardGestures.test.tsx:115-116` (and its "No second argument" comment), `cellGestures.test.tsx:451`, `bandCommits.test.tsx:749,776,786`.
- [ ] Add `openTarget` to `NavigationSlice` beside `select`.
- [ ] Rewrite each call site as below; drop the `owningCollection` imports from `Sidebar.tsx` and `useViewInteractions.tsx`; drop the `select` subscriptions and deps in `MatrixView` (`:35`), `useNavData` (`:21`, `:57`), and `TileHost` (`:89`, `:262`) in favor of `openTarget`; swap the view host's `select` for `openTarget` (`useViewHost.ts:48,264`, `useViewInteractions.tsx:105`).
- [ ] Reword `pageConnections.ts:15` (`preview` previews every connection under Open Connections In Preview and otherwise follows Open In Preview) and `:21` (`openTarget` and `openWindowTab` are the stable actions).

**AFTER**

```Core/Session/navigationSlice.ts diff
@@ NavigationSlice @@
   select: (…) => Promise<void>
+  /** A plain click's open: ⌘ takes a new tab, a page the Open In Preview rules match takes the Page Window, anything else follows Default Opening Behavior. */
+  openTarget: (target: SelectTarget, opts?: { newTab?: boolean; heading?: string }) => 'tab' | 'window'
@@ createNavigationSlice @@
+    openTarget: (target, { newTab, heading } = {}) => {
+      const s = get()
+      if (!newTab && target.kind === 'page' && s.tree && opensInPreview(s.tree, target)) {
+        s.openWindowTab(target, { heading })
+        return 'window'
+      }
+      void s.select(target, { newTab: newTab || undefined, heading })
+      return 'tab'
+    },
```

```Core/Interface/Sidebar/Sidebar.tsx diff
 function selectRow(node: { kind: NodeKind; id: string; path: string }, e?: React.MouseEvent): void {
-  const s = useSession.getState()
-  const target = selectTargetOf(node)
-  if (e && isCmd(e)) void s.select(target, { newTab: true })
-  else if (target.kind === 'page' && owningCollection(s.tree, target.path)?.openIn === 'page-preview')
-    s.openWindowTab(target)
-  else void s.select(target)
+  useSession.getState().openTarget(selectTargetOf(node), { newTab: e !== undefined && isCmd(e) })
 }
```

```Core/Views/Host/useViewInteractions.tsx diff
   const openSet = (set: SetNode, newTab: boolean): void =>
-    void select(selectTargetOf(set), newTab ? { newTab: true } : undefined)
+    openTarget(selectTargetOf(set), { newTab })
@@ openPage @@
-    const target = pageTarget(row)
-    // A plain click passes NO option, …
-    if (newTab) { void select(target, { newTab: true }); return }
-    // A tile that states its own route owns every page it opens; …
-    if (tile?.openPage) { tile.openPage({ … }); return }
-    if (owningCollection(tree, source)?.openIn === 'page-preview') useSession.getState().openWindowTab(target)
-    else void select(target)
+    // A tile that states its own route owns every page it opens.
+    if (!newTab && tile?.openPage) tile.openPage({ id: row.id, title: row.title, path: row.path })
+    else openTarget(pageTarget(row), { newTab })
```

```Core/Matrix/MatrixView.tsx diff
-    if (rec) void select(selectTargetOf(rec), newTab ? { newTab: true } : undefined)
+    if (rec) openTarget(selectTargetOf(rec), { newTab })
```

```Core/Navigation/useNavData.ts diff
-      void select(live, opts?.newTab ? { newTab: true } : undefined)
-      onDone?.()
+      // A page the rules send to the window lands in it — closing the window behind it would close the page too.
+      if (openTarget(live, { newTab: opts?.newTab }) === 'tab') onDone?.()
```

```Core/Tiles/TileHost.tsx diff
           if (openRoute) openRoute(page)
-          else select({ kind: 'page', id: page.id, path: page.path })
+          else openTarget({ kind: 'page', id: page.id, path: page.path })
```

```Core/Session/pageConnections.ts diff
-  const { tree, headings, select, openWindowTab } = s
+  const { tree, headings, openTarget, openWindowTab } = s
@@ open @@
-        if (inWindow && !newTab) openWindowTab({ kind: 'page', id, path }, { heading })
-        else void select({ kind: 'page', id, path }, { newTab: newTab || undefined, heading })
+        const target = { kind: 'page', id, path } as const
+        if (inWindow && !newTab) openWindowTab(target, { heading })
+        else openTarget(target, { newTab, heading })
```

**VERIFY**

- [ ] The new tests fail before and pass after; the three updated gesture suites, `pageConnections.test.tsx`, `windowTabs.test.ts`, `connectionMenuActions.test.ts`, and the routed surfaces' existing coverage — `TileHost.test.tsx:694-721` (a tile's Open) and `MatrixView.test.tsx` (node taps) — pass.
- [ ] `git grep -nP "newTab \? \{ newTab: true \} : undefined|isCmd\(e\)\) void s\.select" -- Core ':!Core/Session/windowSlice.ts'` is empty.
- [ ] The store test suite boots (`navigationSlice` → `previewRules` adds no cycle).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-4

**TASK:** Strip deleted Collections, Sets, Spaces, and Contexts from the preview rules with the same function that strips the Matrix's.

**NOW:** `reachConfig` edits Matrix rules inline through `updateNexusConfig(root, 'matrix', …)` inside `if (!under)` (`configReach.ts:373-380`); `settings.json` isn't touched.

**CHANGE**

- [ ] Extend `configReach.test.ts` first: seed `personalization.openInPreview` beside the Matrix seeds (`:135`, `:469`); a Collection delete strips its id and its Sets' ids; a Space delete strips its id; a Context delete drops its rules; a second run writes nothing (`:224`, `:529`); a folder-limited pass leaves the rules alone (`:381`); an unparseable `settings.json` counts one skip and keeps its bytes; an absent one isn't created. The delete path's end-to-end suite covers the key too: `seedConfigSurfaces` (`Core/Testing/configSurfaces.ts:11-16,57-67`) seeds `personalization.openInPreview` with the same filter and `ConfigViews` reads it back as `preview`; the four "every view, tile, and the Matrix" cases in `deleteReach.test.ts` (`:143, 193, 269, 382`) assert `v.preview` as well.
- [ ] Hoist the Matrix block's edit into `editStandalone` and use it for both files.

**AFTER**

```Core/Nexus/configReach.ts diff
   if (!under) {
-    const edited = await updateNexusConfig(root, 'matrix', (cur) => {
-      if (!isPlainObject(cur.filter)) return null
-      const rules = editRules(cur.filter.rules, rule)
-      return same(rules, cur.filter.rules) ? null : { ...cur, filter: { ...cur.filter, rules } }
-    })
-    if (!edited.ok) reach.skipped++
+    // A standalone filter — the Matrix's, and the Open In Preview rules — loses what the edit removed.
+    const editStandalone = (held: unknown): unknown => {
+      if (!isPlainObject(held)) return held
+      const rules = editRules(held.rules, rule)
+      return same(rules, held.rules) ? held : { ...held, rules }
+    }
+    const matrix = await updateNexusConfig(root, 'matrix', (cur) => {
+      const filter = editStandalone(cur.filter)
+      return filter === cur.filter ? null : { ...cur, filter }
+    })
+    const settings = await updateNexusConfig(root, 'settings', (cur) => {
+      const p = cur.personalization
+      if (!isPlainObject(p)) return null
+      const openInPreview = editStandalone(p.openInPreview)
+      return openInPreview === p.openInPreview ? null : { ...cur, personalization: { ...p, openInPreview } }
+    })
+    reach.skipped += [matrix, settings].filter((r) => !r.ok).length
   }
```

**VERIFY**

- [ ] The new `configReach.test.ts` cases fail before and pass after; the existing Matrix cases pass unchanged.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Every routed surface calls `openTarget`; every frozen surface still calls `select` / `openWindowTab`.
- [ ] A click compiles nothing: the test is memoized per rule change, and a click is one folder lookup and one test.
- [ ] An emptied, disabled, or unreadable rule set opens nothing in the window.

---

### Phase 4 — The Settings Row & `open_in` Removal

**GOAL:** Ship the row that edits the rules on a shared Manage row, and remove the per-Collection field with nothing left pointing at it.

#### Task 4-1

**TASK:** Extract the count + Manage + bare-pane row into `ManageRow`, and fold Excluded Directories' buttons.

**NOW:** `ExcludedDirectoriesRow.tsx:86-103` owns the shell; its pane body (`:104-134`) keeps `drafting` and `busy`, resets `drafting` in `dismiss`, and uses a plain `Button` × and a labeled "Add Exclusion".

**CHANGE**

- [ ] Update `ExclusionRows.test.tsx` first: find the add button by `aria-label="Add exclusion"`; the remove button keeps `Remove exclusion`.
- [ ] Create `ManageRow` (label, hint, count, style, children).
- [ ] `ExcludedDirectoriesRow` renders `ManageRow` around an `ExclusionPane` that owns `drafting`, `busy`, and the rows; `dismiss` goes (the pane unmounts on close). Its × becomes `<AccessoryButton icon="x" size="control" ariaLabel="Remove exclusion" … />`; its add becomes `<FootingCreate ariaLabel="Add exclusion" disabled={drafting || busy} … />`. Delete `x.addRow` / `x.addButton`.

**AFTER**

```Core/Settings/ManageRow.tsx diff
+/** A settings row whose value is a list edited in its own pane: the count, and Manage to open it. */
+export function ManageRow({ label, hint, count, style, children }: {
+  label: string; hint?: string; count: number; style?: CSSProperties; children: ReactNode
+}): React.JSX.Element {
+  const [open, setOpen] = useState(false)
+  const triggerRef = useRef<HTMLButtonElement>(null)
+  return (
+    <SettingsFieldRow label={label} hint={hint}>
+      <span className={x.manageCluster}>
+        <span className={x.count}>{count}</span>
+        <Button ref={triggerRef} type="filled" label="Manage" pressed={open} onClick={() => setOpen((o) => !o)} />
+        <PickerMenu open={open} onDismiss={() => setOpen(false)} triggerRef={triggerRef} bareSurface style={style}>
+          {children}
+        </PickerMenu>
+      </span>
+    </SettingsFieldRow>
+  )
+}
```

**VERIFY**

- [ ] `ExclusionRows.test.tsx` passes (count, Manage pressed state, outside-press and Escape dismissal, add, remove).
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-2

**TASK:** Add the Open In Preview row.

**NOW:** Nothing edits `openInPreview`.

**CHANGE**

- [ ] Write `PreviewRulesRow.test.tsx` first: the count reads the rule count; adding a rule through the pane writes the key; turning the footer to Off keeps the rules and writes `enabled: false`; clearing the last rule with the filter on stores no key; the target list offers Title, Location, Created, and each Context, and not Last Modified or a user property.
- [ ] Add `| (RowText & { kind: 'previewRules' })` to `Row`, the frames entry under **Open Connections In Preview**, and `case 'previewRules'` in `RowControl`.
- [ ] Create `PreviewRulesRow`: reads `useSetting('openInPreview')` and the tree (rendering nothing without one), and renders `ManageRow` with `count={value.rules?.rules.length ?? 0}` and `style={{ minWidth: PANE_MIN_W }}`, holding `FilterFrame` with `locations={tree.collections}`, `schema={[]}`, `targets={filterTargets([], tree, tree.collections.length > 0).filter((t) => t.id !== RESERVED_PROPERTY_ID.modifiedAt)}`, `view={filterViewOf(value)}`, `read` from the live store, no `back`, and an `onCommit` that merges onto the live value rather than the render's: `const live = () => settingOf(personalizationOf(useSession.getState()), 'openInPreview')`, `read={() => filterViewOf(live())}`, `onCommit={(p) => setPersonalization('openInPreview', { ...live(), ...standalonePatch(p) })}`.

**AFTER**

```Core/Settings/frames.ts diff
           {
             kind: 'toggle',
             key: 'connectionsOpenInPreview',
             …
           },
+          {
+            kind: 'previewRules',
+            label: 'Open In Preview',
+            hint: 'Pages matching these rules open within preview windows by default.',
+          },
```

**VERIFY**

- [ ] `PreviewRulesRow.test.tsx` passes.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-3

**TASK:** Remove `open_in` and the Configuration leaf with nothing left pointing at them.

**NOW:** See *§Concepts › Removed*; the field reads through `schemas.ts:6,9,12`, `containerFields.ts:6,72`, `tree.ts:65`, `viewRow.ts:3-4`, writes through `containerConfig.ts:1,4,8-11,14-18,25-27` and `Views/handlers.ts:4,55-62`, and renders from `SettingsFrame.tsx:1,4,27,30-33,40,42,45,51-54,91,98-102,109-123,192-193`.

**CHANGE**

- [ ] Delete the `open_in` describe in `schemas.containerConfig.test.ts` and `viewWrite.test.tsx:202-209`; re-key the foreign-key stand-ins in `sidecar.test.ts:38,43` (drop `open_in`; `plugin` already proves the round trip) and `viewsFile.test.ts:218` (`plugin_mode: 'x'`).
- [ ] Delete every listed definition and consumer. `SettingsFrame` maps `ENTRIES` directly and drops the imports only the leaf used (`reportRefusal`, `OpenIn`, `pickerRow`, `PickerOption`, `dialer`, `MenuRowView`, `MenuTopRow`).
- [ ] `ContainerConfigPatch` becomes `{ view_button: ViewButton }`; `setContainerConfig` spreads it; the handler refuses a patch whose `view_button` doesn't coerce.

**AFTER**

```Core/Views/containerConfig.ts diff
-// open_in is collection-owned; a Set write is refused.
-import type { OpenIn, ViewButton } from './viewRow'
+import type { ViewButton } from './viewRow'
-export type ContainerConfigPatch = { open_in?: OpenIn; view_button?: ViewButton }
-function definedOnly(…) { … }
+export type ContainerConfigPatch = { view_button: ViewButton }
 export async function setContainerConfig(folder, kind, patch): Promise<Result<null>> {
-  if (kind === 'set' && patch.open_in !== undefined) return fault('Open In is collection-owned.')
-  const written = await patchSidecar(folder, kind, (cur) => ({ ...cur, ...definedOnly(patch) }))
+  const written = await patchSidecar(folder, kind, (cur) => ({ ...cur, ...patch }))
```

```Core/Views/handlers.ts diff
-  'container:configure': containerWrite(async (folder, kind, patch: unknown) =>
-    isPlainObject(patch)
-      ? setContainerConfig(folder, kind, { open_in: coerceOpenIn(patch.open_in), view_button: coerceViewButton(patch.view_button) })
-      : NEEDS_CONFIG_PATCH,
-  ),
+  'container:configure': containerWrite(async (folder, kind, patch: unknown) => {
+    const view_button = isPlainObject(patch) ? coerceViewButton(patch.view_button) : undefined
+    return view_button ? setContainerConfig(folder, kind, { view_button }) : NEEDS_CONFIG_PATCH
+  }),
```

**VERIFY**

- [ ] `git grep -nP "open_in|(?<![A-Za-z])openIn\b|(?<![A-Za-z])OpenIn\b|(?<!MATRIX_)OPEN_INS|page-preview|full-page|coerceOpenIn|configurationLeaf" -- Core UIX Desktop Sync` and `git grep -n "'configuration'" -- Core/Views` are empty.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] The Manage row is one component with two users; neither re-implements its shell.
- [ ] The zero-trace greps are empty across code and tests; `view_button` still writes.
- [ ] The app launches against `~/Test`, and the Open In Preview row opens its pane with the editor and no back row.

---

### Phase 5 — Migration & Reconciliation

**GOAL:** Carry Nathan's four Preview Collections into the rule, strip `open_in` from his Nexuses, move the parity harness onto the rule, and rewrite every document the work made false.

#### Task 5-1

**TASK:** Run the one-off migration against `~/NexusOS` and `~/Test`.

**NOW:** NexusOS: Resources `01KVRMV34DRVXCDX4TWAC2VPQ0`, Index `01KT098DR84WF1HDDDC4P2GAK8`, Ideas `01KTS8ZYBZJHP3EJDGYQB0XKPA`, Assets `01M03W7Z1S8XST07GC5FHS591B` carry `page-preview`; Studio carries `full-page`; `~/Test` carries none. Sidecars round-trip byte-identically through `JSON.stringify(obj, null, 2) + '\n'`; `settings.json` is written with recursively sorted keys (the app's `jsonText` shape). The watcher applies a `settings.json` change live.

**CHANGE**

- [ ] Write the script in the session scratchpad: copy every file it will write into a scratchpad backup folder first; set NexusOS's `personalization.openInPreview` to the rule below unless already equal, writing `settings.json` with recursively sorted keys; delete `open_in` from every `_pagecollection.json` / `_pageset.json` under both Nexuses, rewriting with `JSON.stringify(obj, null, 2) + '\n'` in the file's existing key order.
- [ ] Dry-run (print the diff), then run, then run again to prove it writes nothing.

**AFTER**

```~/NexusOS/.nexus/settings.json diff
   "personalization": {
     …
+    "openInPreview": {
+      "enabled": true,
+      "rules": {
+        "match": "any",
+        "rules": [
+          {
+            "op": "is_inside",
+            "property_id": "_location",
+            "values": ["01KVRMV34DRVXCDX4TWAC2VPQ0", "01KT098DR84WF1HDDDC4P2GAK8", "01KTS8ZYBZJHP3EJDGYQB0XKPA", "01M03W7Z1S8XST07GC5FHS591B"]
+          }
+        ]
+      }
+    },
```

**VERIFY**

- [ ] `grep -rl '"open_in"' ~/NexusOS ~/Test --include='_page*.json'` is empty; each rewritten sidecar's diff is the one removed line; `settings.json`'s diff is the added key alone.
- [ ] Opening NexusOS, a sidebar click on a Resources page opens the Page Window and a Studio page opens in the main view.

#### Task 5-2

**TASK:** Move the reveal-parity harness onto the rule.

**NOW:** `.claude/scripts/reveal-parity/fixtures.mjs:23-25` sets `open_in` on Collection C; `run.mjs:301-309` relies on it; the fixture already merges `.nexus/settings.json` (`fixtures.mjs:84`).

**CHANGE**

- [ ] The fixture reads Collection C's `id` from its sidecar and adds `personalization.openInPreview` (Location Contains that id) in its existing `settings.json` merge; reword `run.mjs:301`'s comment to name the rule.

**VERIFY**

- [ ] `git grep -n "open_in" .claude/scripts` is empty.

#### Task 5-3

**TASK:** Rewrite every claim the work made false.

**CHANGE**

- [ ] Walk *§Reconciliation* entry by entry, reading `r/Studio-Documentation` first.

**VERIFY**

- [ ] `git grep -nP "open_in|Open In\b(?! (Preview|Browser|New Tab))|page-preview|Configuration (pane|leaf)|\| Configuration \|" -- .claude/Features .claude/Planning .claude/Guidelines .claude/ContextPM.md` returns only this plan and history records.

---

### Completion Criteria

- **Conformance:** The implementation follows the project's instructions, Nathan's settled decisions, and *§Constraints*; no mechanism landed that an existing one already provided; nothing changed outside what the plan names.
- **Correctness:** A plain click on a matching page opens the Page Window from the sidebar, a view row and card, a main-pane view tile, NavView and the NavWindow (which stays open), the Matrix, and a page tile's Open; ⌘-click opens a new tab from each; a connection previews under its toggle and follows the rules without it; the menus, breadcrumbs, and promote behave as before.
- **Completeness:** Every task is ticked; nothing deferred, narrowed, or left as scaffolding.
- **Confirmation:** Every new test goes red without its change; every VERIFY ran and its result was read; Nathan's visual items carry his word.
- **Continuity:** *§Reconciliation* is walked and the zero-trace greps are empty.
- **Confidence:** Gates green from a clean state over `{baseline}..HEAD`; the diff is the size the plan implies.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [ ] Phase review (opus-high, simplification and adversarial in parallel): Phase 1 · Phase 2 · Phase 3 · Phase 4
- [ ] Final review (opus, xhigh) over `{baseline}..HEAD`: one agent inward at the change, one outward against the codebase; reconciled with an advisor
- [ ] Neutral verification (opus, xhigh) over `{baseline}..HEAD`, given only the intention
- [ ] Own pass: gates, plus `npm run build` and `npm run build:dashboard` (`.claude/Guidelines/Development-Environment.md:41`) · diff · deviations · criteria
- [ ] Live drive on `~/Test` (CDP): each routed surface, the NavWindow staying open, the Settings row and pane, typing and Enter in the Location field; then reverted
- [ ] Nathan's own pass: the Settings row and pane's size; the folded × and + in the filter pane and Excluded Directories; the Location `TokenField` — typing, Enter, Backspace, the `folder-search` name chip — and the pruned search tree
- [ ] Reconciliation walked
- [ ] `.claude/HistoryPM.md` gains **Previews & Filtering Improvements** — an index row and an entry in PM-149's brief past-tense form, with its commit range and diff
- [ ] `c/view-changes` published over `{baseline}..HEAD` once the entry is written and the code is final
- [ ] Report delivered

#### Reconciliation

- `.claude/Features/CollectionsPM.md:14` — the sidecar field list names `open_in` — Task 5-3
- `.claude/Features/CollectionsPM.md:22-24` — the *§Open In* section — removed — Task 5-3
- `.claude/Features/CollectionsPM.md:49` — the Collection/Set delete sweep list gains the Open In Preview rules — Task 5-3
- `.claude/Features/ConfigurationPM.md:59` — Close Navigation On Select: a page the Open In Preview rules send to the Page Window keeps the window open — Task 5-3
- `.claude/Features/ConfigurationPM.md:61` — Open Connections In Preview: add that, off, connection clicks follow Open In Preview — Task 5-3
- `.claude/Features/ConfigurationPM.md` Navigation table — add the Open In Preview row (`openInPreview`, the rule list edited from Manage) — Task 5-3
- `.claude/Features/ConfigurationPM.md:127-131` — the empty Exclusions table gains Excluded Directories (`excluded_folders`, at the settings root) and Clear Exclusion Cache — Task 5-3
- `.claude/Features/ConfigurationPM.md:219-225` — the Collections section's Configuration-pane claim, the `open_in` exception, and its table row; Show Title is set from the view button's right-click — Task 5-3
- `.claude/Features/InterfacePM.md:68` — "a Collection whose **Open In** is the Page Window sends its title clicks and sidebar rows here" — Task 5-3
- `.claude/Features/PagesPM.md:20` — "A Collection can instead route its Pages … through its **Open In** setting" — Task 5-3
- `.claude/Features/ConnectionsPM.md:36` — connection routing "by default" — Task 5-3
- `.claude/Features/ContextsPM.md:28` — the Space-delete sweep list gains the Open In Preview rules — Task 5-3
- `.claude/Features/NavigationPM.md` — one sentence: a plain click on a page the Open In Preview rules match opens the Page Window — Task 5-3
- `.claude/Features/ViewTypesPM.md:14` — creation seeding names "a Contains rule on a Context" and skips an Any group of several; it's Is Any or Is All, and an Any group seeds nothing when a blank page already meets it, else from its first rule or group that seeding meets — Task 5-3
- `.claude/Features/ViewTypesPM.md:24` — the filter's mode: the pane writes flat groups under All/Any, default Any — Task 5-3
- `.claude/Features/ViewTypesPM.md:30-31` — Is/Isn't fold case for Title, Text, Link, Select, and Status — Task 5-3
- `.claude/Features/ViewTypesPM.md:37` — Context operators become Is Any · Is All · Isn't · Is Empty · Isn't Empty — Task 5-3
- `.claude/Features/ViewTypesPM.md:39` — Location: the value field is a `TokenField` whose typing narrows the picker; typed folder names under Contains / Doesn't Contain — Task 5-3
- `.claude/ContextPM.md:33` — the TokenField backlog entry: the field exists with the Location filter as its consumer; what remains is file properties and Context assignment taking it — Task 5-3
- `.claude/Features/PommoraUIX.md` *§Fields* table — add `TokenField`; `InputField` takes a `ref`; the Chrome row gains `tokenCaret` — Task 5-3
- `.claude/Features/ViewTypesPM.md:61` — SettingsFrame's **Configuration** entry — Task 5-3
- `.claude/Features/SymbolsPM.md:24` — the Settings Frames table's `| Configuration | sliders-horizontal |` row — removed — Task 5-3
- `.claude/Features/ViewTypesPM.md:64` — Filtering's `(connector)(what)…` row and run serialization; the Location `TokenField` — Task 5-3
- `.claude/Planning/Navigation Improvements — Design Specification.md:114,123` — "page-preview Collection" — Task 5-3
- `.claude/Planning/Cross-Device Mutation Checklist.md:68` — "Set Open In or the view button"; add the Open In Preview write — Task 5-3
- `.claude/Planning/Data Layer — Investigation Reports/A — Model & Read Path.md:355` — `openIn` in the container-builder list — Task 5-3
- `Core/Views/filterModel.ts:33,48` — the connector doc comments — Task 2-1
- `Core/Views/Pipeline/filter.ts:83` — Location's comment — Task 1-2
- `Core/Views/Pipeline/creationSeeds.ts:1` — "Contains rule on … a Context"; Any groups — Task 1-3
- `Core/Session/pageConnections.ts:15,21` — "follows the Open in Preview preference"; "`select` and `openWindowTab` are stable" — Task 3-3
- `Core/Views/Host/useViewInteractions.tsx:369,374` — the newTab and Open In comments — Task 3-3
- `Core/Views/containerConfig.ts:1` — "open_in is collection-owned" — Task 4-3
- `.claude/scripts/reveal-parity/fixtures.mjs:23-25`, `run.mjs:301` — Task 5-2

#### Open Items

#### Deviations

- **Task 1-2 — Unmatched Names:** The ratified plan had a typed folder name that matches no folder abstain like a dead id; Phase 1's review showed that silently widens an All group (or the Matrix, or the preview rules) to everything once a folder is renamed, since nothing strips names the way `configReach` strips dead ids. A name that matches nothing now matches nothing; dead ids still abstain.
