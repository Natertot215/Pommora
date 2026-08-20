## Cohesion Queue — Implementation Plan

> **Status:** written, pending review · Queue: [[Cohesive-Cleanup]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

Ten tasks land: four surfaces stop being written twice, three action vocabularies stop being erased
to `string` before anything dispatches them, and seven live defects are fixed at their cause. What
exists afterwards that does not now — one option-reorder hook instead of two near-copies, one option
row, one properties engine, a Subfield counter that reads the app's own markdown detectors instead
of nine private regexes, and a `Clear` that does what the comment above it says.

The shape is consolidation onto what already exists. Every task either deletes a second copy or
types a seam that is already declared somewhere; none introduces a mechanism the codebase does not
run today. Four read-only sweeps established this — their corrections are in **Inherited
Reasoning**, and several overturned the plan's first draft. Where two copies differ for a reason,
the difference stays and becomes an argument or a comment; collapsing it would be a design change
wearing a refactor's clothes.

Phases are ordered by what their verification costs: typecheck-provable work first, the typed menu
seams second, the property domain last. A session can stop at any gate with the tree coherent.

This deliberately is not solving: the `main/index.ts` split, Table hoisting past its first step,
virtualization, the store split, per-tab page state, or the twenty-two latent exhaustiveness sites
catalogued in [[Cohesive-Cleanup]] §The Exhaustiveness Sweep. Each is its own session.

**Requirements**

1. `pickView` and `resolveContainerSchema` live in `Views/pipeline/`, and nothing under
   `Detail/Views/Cards/` imports from `Detail/Views/Table/TableView`.
2. The idle page-state reset has one definition per variant in `store.ts`.
3. The Subfield's three numbers agree with each other and with what the editor renders, and the
   counter reads the shared markdown detectors rather than its own regexes.
4. `runPageSendAction`, `RowMenuRequest`, and the editor's menu vocabulary carry their declared
   types to the point of dispatch.
5. No menu dispatch writes a value the user did not pick.
6. The option-reorder hook has one definition.
7. The reorderable option row has one definition, with `StatusEditor` keeping its groups.
8. `Clear` leaves the row to be refilled on both property surfaces, as both files' comments state.
9. Committing a Space does not close the Context picker.
10. The properties engine — memos, commit paths, row edit and reveal — has one definition, with each
    pane keeping its own frame, visibility rule, and chrome.

**Acceptance — the whole thing working**

With all three phases landed: the three gate commands are green; every surface in the interaction
sweeps behaves as it does today except the seven named defects; the Subfield's line, word and
character counts agree on a page holding a fence, a page embed, a task item, an arrow list and a
nested quote; `Clear` and `Remove` do different things in both property panes; and deleting one arm
from the editor's action union or from `PageSendAction` fails `npm run typecheck` rather than
compiling into a row that silently does nothing.

**Forced By**

- `z.looseObject` passes undeclared keys through, and its inferred type carries an index signature →
  `SavedView` keeps its hand-written interface. Struck from the queue, ruling in [[Cohesion-Rulings]].
- `CardsView.tsx:66` imports `resolveContainerSchema` from `../Table/TableView` → Task 1 lands before
  any task edits `CardsView`, or the cycle returns under a moved symbol.
- `select` clears `pageFrozen` at `store.ts:1404`, before its switch → the five reset sites inside
  `select` correctly omit it. Two constants, not one, so a tenth site outside `select` cannot lose
  the distinction.
- `Detail/pageEditor.ts:6` already imports from `@renderer/MarkdownPM/detect` → the Subfield reading
  the same detectors is an established coupling, not a new one.
- There is no image token anywhere in `MarkdownPM/tokens/index.ts` → the editor renders inline
  `![alt](url)` with a literal visible `!`, and the counter must stop stripping it.
- The two property panes differ in eight ways, not one → only the non-visual engine is shared. The
  visible differences — chip hover-×, add-picker semantics, value hover, label column width — each
  stay with their pane, because one shared component would force a product decision per difference.
- Both panes' `rowMenu` becomes identical once Task 8 fixes `Clear` → Task 10 can share it. Ordering
  the bug fix before the extraction is why.
- `Table.css:220`'s row tint marks the row you are inside and editing → a table mechanism, no Cards
  equivalent (Nathan's call, 08-20).
- The renderer never touches `fs` → `main/contextMenu.ts` keeps its own dispatch rather than
  importing a renderer module.

**Inherited Reasoning**

Four read-only sweeps ran against this plan's first draft. What they overturned:

- **`pageMetaRouter.ts` was going to be a second definition.** `renderer/src/pageMenuActions.ts`
  already owns this job — `runPageSendAction`, the boolean "did I take it?" partial-router that
  TableView, CardsView, NavList and TabBar all call. Extend it. Its `move:` arm is prefix-matched,
  which a `switch` cannot express, and its callers route raw strings mixed with `cell:`/`style:`/
  `add:` prefixes — so a `never` default needs narrowing first.
- **`Components/Detail/ValueRow.tsx` already exists** — the settings-pane Grouping/Sorting row. Do
  not ship a `PropertyValueRow` beside it.
- **The shared property-editing primitives already have a home:** `Detail/Views/PropertyEditing/`,
  whose `valueClick.ts` header already names "table cell, card value, inspector row" as its three
  consumers. The hook goes there, not `Components/Detail/`.
- **There is no `assertNever` helper and one must not be added.** The house idiom is an inline
  `const _exhaustive: never = x` in a braced `default:` — two instances, both main-process. The
  dominant style is no `default` at all, relying on a non-nullable return type.
- **The Subfield's character bug is four bugs**, and its word bug is five. Fixing the fence alone
  leaves four live overcounts.
- **The properties panes differ in eight ways, not one.** The first draft asserted one, and Nathan's
  scope decision was taken on that. Corrected before any code.
- **`useOptionReorder` / `useStatusReorder` share 102 of ~180 lines** and were absent from the first
  draft entirely. Highest line-count-per-risk in the plan.
- Do not re-open Cards' identity key, its commit paths, `PageCard`, the accent IPC on reconcile,
  `armAutoScroll`, or the footer lock button — all already closed.
- Two findings are ruled deliberate and stay: `valueClick`'s status-cycle branch is unreachable from
  both panes (they pass `look: undefined`), and an orphaned Context key is invisible to both. Comment
  them; do not "fix" them here.

**Grounding** *(re-open these; don't cite them)*

- `Components/Detail/PagePropertiesPane.tsx` — `rowMenu` (:166), `isShown` (:212), `setAside`, the
  `[tree]` reset (:84).
- `PagePreview/PreviewInspector.tsx` — `rowMenu` (:199), `isAssigned` (:117), its warm-cache fetch.
- `Components/Detail/useOptionReorder.ts` · `useStatusReorder.ts` — `onRowPointerDown`, `clear`,
  `resolveAt`, `destination`, `locate`.
- `Components/Detail/OptionEditor.tsx` (:129-186) · `StatusEditor.tsx` (:156-213) — the row block.
- `Detail/Subfield/subfieldStats.ts` — `stripFences`, `stripMarkdown`, `computeStats`.
- `shared/connections.ts` — `pageLinkPattern` (:47, note the `(?<!!)`), `pageEmbedPattern` (:25).
- `MarkdownPM/detect/index.ts` — `parseListMarker` (:302), `blockquotePrefixRe` (:15),
  `inlineCodeRegex` (:11), `isThematicBreakLine` (:383), `headingParts` (:404).
- `renderer/src/pageMenuActions.ts` — `runPageSendAction` (:22).
- `shared/menuModel.ts` (:43) · `shared/bridge.ts` (:323) — where `TileAction` is erased.
- `Toolbar/ViewDropdown.tsx` (:41-47) — the terminal `else`.
- `store.ts` — `RENAME_CLEARED` (:116), `select`'s unfreeze (:1404), the nine reset sites.
- `.claude/Guidelines/Cohesion-Rulings.md` · `Lint-And-Accessibility.md`.

**Environment**

- Plan directory `.claude/Planning/`. Spec input `.claude/Planning/Cohesive-Cleanup.md`.
- Four `Explore` sweeps informed this plan. Nathan dispatches agents by request only, so gate reviews
  are inline passes by the executing session unless he asks otherwise. Deliberate fallback.
- Rules directory `.claude/Guidelines/`.

**Shapes:** refactor (1, 2, 6, 7, 10) · fix (3, 4, 5, 8, 9) · user-visible (3, 4, 5, 7, 8, 9, 10)

**Global Constraints (every task inherits these)**

- Gates, run from `Pommora/`, exit codes read directly, never through a pipe:
  `npm run typecheck` · `npm run test` · `npm run lint`. All three green before any commit.
- Baseline invariant for the refactor tasks: the gates' pass/fail set does not change, and no test is
  weakened, skipped, or narrowed to reach green. A task that cannot pass as written is reported
  wrong, not adjusted.
- No new shared helper unless a task names it. Specifically: no `assertNever`.
- Formatting is Biome's. Never hand-align; an `Edit` failing on whitespace means the hook reformatted
  — re-read and retry.
- `KNOB` markers and `(Nathan's call)` / `(Nathan's spec)` comments survive every task. Grep before
  each commit.
- Comments explain why, never what.
- Stage explicit paths, never a directory. One commit per task, ticking that task's boxes in it.
- Out of scope everywhere: `main/index.ts`'s structure, `Table.css`, virtualization, the store's file
  boundary, per-tab page state, and any change to what a menu offers.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `Features/SubfieldPM.md` | any statement of how words or characters are counted | Task 3 | 3 |
| `Features/TableViewPM.md` | any pointer to `pickView` / `resolveContainerSchema` in `TableView` | Task 1 | 1 |
| `Features/PropertiesPM.md` | any statement that Clear and Remove differ, or don't | Task 8 | 8 |
| `Cohesive-Cleanup.md` | the queue entries for these items | each lands | all |

**Dead Vocabulary**

- `rg -F "from '../Table/TableView'" src` → 0. Legitimate hits: none.
- `rg -F "pageStatus: 'idle'" src/renderer/src/store.ts` → 2 (the two constants).
- `rg -F "contextRows.some" src/renderer/src` → 0 after Task 10. Legitimate: none.
- Control: `rg -F "pageStatus" src/renderer/src/store.ts` → 15 at planning time. Zero means the sweep
  never ran.

---

### Phase 1 — The typecheck-provable half

#### Task 1: Move the view pipeline's two resolvers out of the table component

**Requirement:** 1

**Why:** Two pure functions are exported from a 1,943-line view component, and `CardsView` imports
one — which is the Cards → Table cycle. `Views/pipeline/` already holds the rest of the pipeline's
pure resolvers. Zero behavior cost, and it is the step Table hoisting waits on.

**Files:**
- Create `Detail/Views/pipeline/pickView.ts` — both functions, moved verbatim with their comments.
- Modify `Detail/Views/Table/TableView.tsx` — drop both definitions; import them.
- Modify the four importers in Derivation.

**Derivation**
- `rg -F "Table/TableView'" src` → 4: `Components/Detail/SettingsPane.tsx:16`,
  `Detail/Views/ViewRenderer.tsx:5`, `Detail/Views/Cards/CardsView.tsx:66`,
  `Detail/Views/useActiveView.ts:6`.
- Control: `rg -F "Detail/Views" src` → non-zero.

**Survivors:** `ViewRenderer`'s import of `TableView` itself — it renders the component.

**Steps:**
- [ ] Re-run the Derivation against its control.
- [ ] Move both functions verbatim; repoint the four importers.
- [ ] `rg -F "from '../Table/TableView'" src` → 0.
- [ ] Gates green.
- [ ] Commit: `refactor(views): the pipeline's two resolvers leave the table component`

#### Task 2: Two constants for the idle page state

**Requirement:** 2

**Why:** The `pageStatus`/`pageDetail`/`pageError` reset is written out at nine sites, so it can be
written partially and nothing catches it. Four of those sites also clear `pageFrozen`; the other five
are inside `select`, which clears it centrally at `store.ts:1404` before its switch. Two constants
keep that distinction visible — a single blanket constant would be safe today and would erase the
reason, and `pageFrozen: true` is set after the switch, so a future reordering would strand a frozen
pane. `RENAME_CLEARED` (`store.ts:116`) is the precedent for the shape.

**Files:** `renderer/src/store.ts` — declare both constants beside `RENAME_CLEARED`; replace nine sites.

**Derivation**
- `rg -F "pageStatus: 'idle'" src/renderer/src/store.ts` → 9.
- Control: `rg -F "pageStatus" src/renderer/src/store.ts` → 15.

**Failure half:** a site setting only two of the three fields is a live bug, not a transcription
target. Compare all nine before replacing; report any that differs rather than normalizing it.

**Survivors:** both constants are module-private `const` with `satisfies Partial<SessionState>`,
matching `RENAME_CLEARED` — not exported; nothing outside the store needs them.

**Steps:**
- [ ] Re-run the Derivation against its control.
- [ ] Read all nine; confirm the split is exactly the four-with-`pageFrozen` / five-inside-`select`
      shape, and report any deviation instead of converting it.
- [ ] Declare both constants; the frozen variant spreads the plain one.
- [ ] Comment the plain one with why `select`'s five sites need no `pageFrozen`.
- [ ] `rg -F "pageStatus: 'idle'" src/renderer/src/store.ts` → 2.
- [ ] Gates green.
- [ ] Commit: `refactor(store): the idle page state is two facts, not nine`

#### Task 3: The Subfield counts what the editor renders

**Requirement:** 3

**Why:** `subfieldStats.ts` hand-rolls nine markdown regexes that all exist canonically elsewhere,
and it is wrong in five ways as a result. `MarkdownPM/detect/index.ts:302` says of one of them: *"The
single list-marker parser. Every layer reads markers through this — never its own regex."* This file
never inherited any of them. Reading the real detectors fixes the whole family at the cause rather
than patching two regexes and leaving three overcounts behind.

Measured against the current code, all five confirmed:

| Input | Today | Correct |
| --- | --- | --- |
| a three-line fence | `chars=4` | `chars=0` |
| `x \`code\` y` | `chars=5` | `chars=3` |
| `a ![alt](u) b` | `chars=5` | `chars=3`, and the `!` counts — the editor shows it |
| `a\n---\nb` | `chars=3` | `chars=2` |
| `![[Page]]` | `words=1` | `words=0` |
| `- [ ] task` | `words=3` | `words=1` |
| `→ item` | `words=2` | `words=1` |
| `>> text` | `words=2` | `words=1` |
| `one \`two\nthree\nfour\` five` | eats `three` | counts it |

Two separate causes. **The placeholders:** four `.replace(…, ' ')` sites substitute a space meaning
"nothing", and `computeStats` strips only newlines before counting, so every one inflates
`characters`. The spaces are load-bearing for `words` — without them `` a`code`b `` fuses — so the two
measurements must run against differently-substituted strings, not one. **The regexes:** the private
copies miss `(?<!!)` before `[[`, miss checkbox and arrow list markers, miss nested quote runs, and
allow inline code to span newlines.

**Files:**
- Modify `Detail/Subfield/subfieldStats.ts` — delegate to `@shared/connections`, `@shared/links`,
  `@shared/markdownCode`, and `@renderer/MarkdownPM/detect`; split the two measurements.
- Create `Detail/Subfield/subfieldStats.test.ts` — the file has no test today.

**Must agree:** the counter's idea of what is invisible must match what the editor draws. The editor
renders a page embed as a tile only when `![[Title]]` is alone on an unindented line, resolves to one
page, and is the first such line naming it; elsewhere it is a dim inert token whose title stays
visible. There is no image token in `tokens/index.ts` at all, so inline `![alt](url)` shows its `!` as
prose. Pin one test per form crossing the counter and the detector.

**Failure half:** a document that is only a fence → zero words, zero characters, line count intact.
An unterminated fence → the mask runs to the end, which is `fencedLineMask`'s existing behavior and is
not changed here. An empty body → the existing early return. A pathological body → the shared
grammars' 255/2048 caps now apply, where the private regexes were uncapped and ran per keystroke.

**Steps:**
- [ ] Write the failing tests: every row of the table above, plus the four contracts the source
      already states (trailing newline is a terminator; `## **Bold**` is one word; nested fences drop
      as one block; empty body is all zeros).
- [ ] Run them — expect failures on the character and word rows.
- [ ] Replace the private regexes with the canonical detectors, one at a time, re-running between.
- [ ] Split the character and word substitutions.
- [ ] Re-run — expect pass. Gates green.
- [ ] Commit: `fix(subfield): the counter reads the app's own markdown detectors`

#### Gate 1
- [ ] Gates green, exit codes read directly.
- [ ] Both Derivations re-run against their controls.
- [ ] `rg -F "from '../Table/TableView'" src` → 0.
- [ ] No test weakened, skipped, or narrowed.
- [ ] `KNOB` and `(Nathan's call)` markers intact in every touched file.
- [ ] The app: a page holding a fence, a page embed, a task item, an arrow list and a nested quote —
      all three Subfield numbers agree.
- [ ] `Features/SubfieldPM.md` and `Features/TableViewPM.md` rewritten in the commits that falsified them.
- [ ] Inline simplification and correctness pass over `<base>..HEAD`.
- [ ] Every concern fixed, or carrying a ruling in the Log. Progress hashes filled in.

---

### Phase 2 — Vocabularies that reach their dispatch

#### Task 4: Three erased action types, and one that writes the wrong value

**Requirements:** 4, 5

**Why:** Three unions are declared in `shared/` and thrown away before anything dispatches them, so
adding a menu row produces no compile feedback anywhere. And `ViewDropdown` is the one dispatch in the
app where a missed action does not no-op — its terminal `else` persists `view_style: 'toolbar'`, a
value the user never picked. All four are small and all four are the same defect the plan already
exists to close.

**Files:**
- `renderer/src/pageMenuActions.ts:22` — `runPageSendAction(action: PageSendAction | PageMoveAction, …)`.
  All five callers already pass exactly that.
- `shared/menuModel.ts:43` + `shared/bridge.ts:323` — make `RowMenuRequest` generic so `TileAction`
  survives to `Blocks/BlockSurface.tsx:414`.
- `Toolbar/ViewDropdown.tsx:41-47` — make the last branch explicit so the union enforces the set.

**Derivation**
- `rg -F "runPageSendAction" src` minus tests → 10: one definition (`pageMenuActions.ts:22`), four
  imports (`TabBar.tsx:11`, `NavList.tsx:11`, `CardsView.tsx:93`, `TableView.tsx:32`), and five call
  sites (`TableView.tsx:974`, `:1440`, `CardsView.tsx:1348`, `TabBar.tsx:158`, `NavList.tsx:81`).
  Only the definition's signature changes; the five call sites already pass the right type.
- Control: `rg -c "PageMetaAction" src/shared/pageMenu.ts` → 5.

**Negative control:** add a member to `ViewButtonMenuAction` — `npm run typecheck` must go red at
`ViewDropdown`. Remove it and the gate must go green. A dispatch that passes either way proves nothing.

**Survivors:** the twenty-two latent sites in [[Cohesive-Cleanup]] §The Exhaustiveness Sweep are not
touched. Retrofitting working handlers is churn; they are catalogued and ranked for a separate call.
`main/contextMenu.ts` keeps its own dispatch — the bridge runs between it and the renderer.
`App.tsx:147` keeps its untyped switch: it must ignore every `mdpm:*` action, so it wants a
discriminated split rather than a `never` arm, and that is Task 5's business.

**Steps:**
- [ ] Re-run the Derivation against its control.
- [ ] Type `runPageSendAction`; confirm all five callers compile untouched.
- [ ] Make `RowMenuRequest` generic; confirm `TileAction` reaches `BlockSurface.tsx:414`.
- [ ] Fix `ViewDropdown`'s terminal `else`.
- [ ] Negative control in both directions.
- [ ] Gates green.
- [ ] Commit: `fix(menus): three action vocabularies reach the dispatch that spends them`

#### Task 5: The editor's menu vocabulary is declared once

**Requirement:** 4

**Why:** `main/editorMenu.ts:121` names its rows as free strings — `heading:${level}`, `block:quote`,
`list:bullet` — and `editFor` (`MarkdownPM/editor/menu.ts:51`) takes the action as a bare `string`,
splits it, and casts each half four times. The vocabulary has no type anywhere. There is already a
live near-miss: `block:page` and `block:webpage` are not members of `BlockFormat` and survive only
because `menu.ts:90-91` intercepts them by hand two lines earlier. `shared/editorMenu.ts` already
holds `FormatChordAction`, so this extends an existing declaration rather than inventing one.

**Files:**
- `shared/editorMenu.ts` — declare the `heading:` / `list:` / `block:` / `format:` vocabulary beside
  `FormatChordAction`, including `block:page` and `block:webpage` explicitly.
- `main/editorMenu.ts:121` — type `act` against it.
- `MarkdownPM/editor/menu.ts:51` — type `editFor`; remove the four casts; make the two interceptors
  type-driven rather than remembered.

**Negative control:** add a `block:*` row to `main/editorMenu.ts` that nothing handles — typecheck
must go red. Remove it and it must go green.

**Failure half:** an action crossing the bridge that the union does not admit. Main and the renderer
are separated by IPC, so the runtime null fallback stays — the type gate is the authoring guard, the
fallback is the boundary guard. Adopt the resolve-through-the-offered-set shape that
`shared/columnMenu.ts:117`'s `parseStyleAction` already uses rather than casting.

**Survivors:** `list:arrow` stays absent from `main/editorMenu.ts` even though `ListKind` has four
members. Declaring the union makes the omission visible; offering the row is a product decision and
out of scope.

**Steps:**
- [ ] Read `shared/editorMenu.ts`, `main/editorMenu.ts`, and `MarkdownPM/editor/menu.ts` whole.
- [ ] Declare the vocabulary; type both ends against it.
- [ ] Remove the four casts; fold the two interceptors into the type.
- [ ] Negative control in both directions.
- [ ] Gates green.
- [ ] Commit: `fix(editor): the menu vocabulary is declared once and reaches both ends`

#### Gate 2
- [ ] Gates green, exit codes read directly. Derivation re-run against its control.
- [ ] Both negative controls demonstrated in both directions.
- [ ] The app, after a full ⌘R reload — editor extensions bake at mount, so HMR leaves a stale editor:
      every row of the block-surface tile menu, the title-cell menu, the row-grip menu, the card menu,
      the connection menu, the sidebar page-row menu, the view-button menu, and the six editor
      formatting chords, each exercised once.
- [ ] Nothing a menu offers changed.
- [ ] Inline simplification and correctness pass over `<base>..HEAD`.
- [ ] Every concern fixed, or carrying a ruling in the Log. Progress hashes filled in.

---

### Phase 3 — The property domain

Ordered so each task hands the next a smaller problem: the invisible clone first, then the row, then
the two bug fixes that make the engine shareable, then the engine.

#### Task 6: One option-reorder hook

**Requirement:** 6

**Why:** `useOptionReorder.ts` (172 lines) and `useStatusReorder.ts` (208) share 102 identical lines,
including a 47-line `onRowPointerDown` that is near-verbatim down to its comments. `useOptionReorder`
is the single-group case of `useStatusReorder`. The only real difference is that `locate` partitions
on a group axis first and the snapshot is a group array rather than a flat rect array. Zero visual
surface, both covered by the pure `optionModel` functions underneath — the highest
line-count-per-risk item in this plan.

**Files:**
- `Components/Detail/useStatusReorder.ts` — becomes the one hook, with the flat case as a group of one.
- Delete `Components/Detail/useOptionReorder.ts`.
- `Components/Detail/OptionEditor.tsx` — consume the surviving hook.

**Derivation**
- `rg -F "useOptionReorder" src` → expect 2 before (definition + `OptionEditor`), 0 after.
- Control: `rg -F "useStatusReorder" src` → 2. Zero means the search never ran.

**Failure half:** a flat list reordering to the first or last slot; a drag cancelled by Escape
mid-gesture; a drag whose container cannot scroll — the autoscroll must not be armed for it. A group
holding zero options still resolves a drop target.

**Steps:**
- [ ] Diff both hooks and record every genuine difference before editing.
- [ ] Generalize `useStatusReorder` so the flat case is a single group; keep its name or rename both
      to one that reads for both callers.
- [ ] Convert `OptionEditor`; delete `useOptionReorder.ts`.
- [ ] Gates green; the option and status suites unchanged.
- [ ] The app: reorder in both editors, including across groups in Status and to both ends in Select.
- [ ] Commit: `refactor(properties): one reorder hook under both option editors`

#### Task 7: One option row

**Requirement:** 7

**Why:** `OptionEditor.tsx:129-186` and `StatusEditor.tsx:156-213` are a 58-line block where only 12
lines differ, and all twelve reduce to four parameters: the options source, the effective color, the
chip shape, and the callback arity. Four near-identical helpers sit beside them. A Status option is a
Select option carrying a group; the row is the same row.

**Files:**
- Create `Components/Detail/OptionRow.tsx` — the chip, rename caret, palette button and its picker,
  grip, and ghost wiring, taking `{ options, effectiveColor, shape, onMenu, onColor, slot, dropLine }`.
- Modify `OptionEditor.tsx` and `StatusEditor.tsx` to consume it.
- Modify `Components/Chip.tsx` — export the shape→class map so the rename caret stops importing
  `chipLabel` / `chipPill` directly. `chipShapeForType` already owns that mapping and its comment says
  "one source, so no surface renders a status as a label by accident"; two callers currently bypass it.

**Survivors:** `StatusEditor` keeps its group headings and their double-click rename, its
group-inherited colors, its per-group add, and its `DragGhost`. `OptionEditor` keeps its flat list.
`ColorSwatchField` is *not* adopted — it carries different chrome and lifting `coloring` state is a
real change; the shared row keeps the two editors' existing button.

**Failure half:** an option with no color falls back to its group's in Status and to the neutral in
Select — the row takes the resolved color and never resolves it. A group with zero options still
renders its heading and add affordance.

**Steps:**
- [ ] List what the row needs as props versus what stays in each container.
- [ ] Export the shape map from `Chip.tsx`; drop the two direct imports.
- [ ] Extract `OptionRow`, carrying the `biome-ignore` and its justification intact — read
      `Lint-And-Accessibility.md` first.
- [ ] Convert `OptionEditor`, then `StatusEditor`.
- [ ] Gates green.
- [ ] The app: reorder, add, remove, rename an option and a group, recolor an option and a group,
      and confirm a group's color still cascades to its uncolored options.
- [ ] Commit: `refactor(properties): one option row under the select and status editors`

#### Task 8: Clear leaves the row

**Requirement:** 8

**Why:** `shared/propertyMenu.ts:12` states the contract — *"Clear empties what this one holds, Remove
also takes the row away"* — and both panes restate it in their own comments.
`PreviewInspector.tsx:204` honors it. `PagePropertiesPane.tsx:172` returns early on `value:clear`
without adding the id to `revealed`; `commitValue(id, null)` deletes the key, `isShown` goes false, and
the row disappears. Clear and Remove are behaviorally identical there on a property row. Its own
comment, three lines above, says otherwise.

Its own commit because it changes what the settings pane does, and because it is what makes both
panes' `rowMenu` identical — which is what lets Task 10 share it.

**Files:** `Components/Detail/PagePropertiesPane.tsx` — `rowMenu` (:166-175).

**Failure half:** Clear on a Context row must also leave the row — the Context branch currently uses
`setAside` for Remove only, which is already correct; confirm Clear does not set it. Clear on a row
that was revealed this session and never filled must leave it revealed. Remove must still take the row
away in both branches.

**Steps:**
- [ ] Write the failing test or, if the pane has no test seam, script the gesture in the app and
      record the before behavior.
- [ ] Make Clear add the id to `revealed`, matching `PreviewInspector.tsx:204`.
- [ ] Gates green.
- [ ] The app: Clear a filled property row — the row stays, empty. Remove it — the row goes to Add
      Property. Both again on a Context row.
- [ ] Commit: `fix(properties): Clear empties the row without taking it away`

#### Task 9: Committing a Space keeps the Context picker open

**Requirement:** 9

**Why:** `PagePropertiesPane.tsx:84-88` clears `editing`, `revealed` and `setAside` whenever `tree`
identity changes. `PageNode.contextValues` is tree data, so committing a Space produces a new tree
through main's confirming push — which closes the Context picker that `PropertyPicker.tsx:44` keeps
open for multi-toggle, and drops every empty revealed row and set-aside entry with it.
`PreviewInspector` has no such reset and stays open.

Its own commit, because the reset presumably exists to clear session state on a nexus switch, and
keying it correctly is the fix rather than deleting it.

**Files:** `Components/Detail/PagePropertiesPane.tsx` — the `[tree]` effect (:84-88).

**Failure half:** switching nexus must still clear `editing`, `revealed` and `setAside` — that is what
the effect is for. Switching pages must not leak reveal state (it currently does in both panes, by
different routes; closing that is out of scope here and noted in the Log). A tree push that changes
nothing about this page must not close an open picker.

**Steps:**
- [ ] Confirm the mechanism in the running app first: open the Context picker, pick a Space, watch it
      close. Record it.
- [ ] Key the reset on nexus identity rather than tree identity.
- [ ] Gates green.
- [ ] The app: pick two Spaces in one picker session without it closing; switch nexus and confirm
      session state clears.
- [ ] Commit: `fix(properties): committing a Space no longer closes its picker`

#### Task 10: One properties engine under both panes

**Requirement:** 10

**Why:** The two panes share 204 byte-identical lines across 21 regions — four memos, both commit
paths, `editRow`, `revealAndEdit`, `editingDef`, `isContextRow`, and the whole `PropertyEditor` block,
several of them verbatim. That is the half carrying correctness, and it is the half that can drift
silently. After Tasks 8 and 9, `rowMenu` joins it.

The eight behavioral differences do **not** collapse. Five are visible product decisions — chip
hover-×, the add-picker's Context remainder and its click gesture, the value hover affordance, the
label column width, the Add button's visibility on a schema-less page — and one shared component would
force a choice per difference, which this plan has no standing to make. Only the non-visual engine
moves; rendering, visibility and chrome stay per-pane.

**Files:**
- Create `Detail/Views/PropertyEditing/usePropertyRows.ts` — the memos, the commit paths, the row
  edit and reveal, the editing state, and (post-Task-8) `rowMenu`. Header comment "one home for both
  surfaces", matching `useViewCreation.ts:1`. Exported `PropertyRowsConfig` and `PropertyRows`
  interfaces; thunk config if it must close over render-scope values, as `useViewCreation` does.
- Modify `Components/Detail/PagePropertiesPane.tsx` and `PagePreview/PreviewInspector.tsx` — each
  keeps its frame, its visibility rule, its chrome, and its page source.
- Move `parseEditorValue` from `Detail/Views/Cards/cardValueInput.ts` into `PropertyEditing/` — two
  other domains already reach into that Cards-private module and its own docstring no longer matches.

**Free wins that ride along** *(all verified, none behavioral)*
- Both panes hand-roll `contextRows.some((t) => t.id === id)`; `isContextColumnId` exists in
  `Views/pipeline/contextIdentity.ts` and is documented as "the column-kind test every pipeline seam
  shares". `FilterPane.tsx:36` already imports it.
- Both `editRow`s carry a `row ? … : { kind: 'null' }` fallback that the guard above their only caller
  makes unreachable.
- `Cell.tsx` binds `def` at :62 then recomputes the same lookup at :156 and :174, shadowing the outer
  binding in the `number` case.
- `PreviewInspector`'s `closeEditing` is used at two of seven sites; the other five inline it, which is
  the only reason those picker blocks textually differ.

**The divergence is commented as deliberate.** Once the engine is shared, a reader meets the
visibility rules as two different call sites with no way to tell a decision from drift. Each pane
carries one line: the settings pane pre-shows every Context so a Page states what it could be filed
under before it is; the inspector shows nothing unfilled. Standing design decision, not drift.

**Must agree:** both panes write values through the same primitives the table and cards use —
`applyValueAtRoot`, `PropertyEditor`, `PropertyPicker`, `sharedValueClickAction`. The engine must not
become a fourth way to write a value. Pin one test that a value committed through the hook lands
identically to one committed through the table's path.

**Failure half:** a page whose Collection carries no schema → each pane's existing empty behavior,
unchanged. A Context deleted from the registry while a page still references it → invisible in both,
unchanged and logged as a shared gap. A preview target deleted mid-session → the inspector's existing
fetch failure path. A picker open when a watcher push deletes its property → `editingDef` goes
undefined and `PickerMenu` trips its own unmount-while-open guard; hold it through the exit rather
than letting it evaporate.

**Survivors:** every visible difference in the table above. `Cell` stays called as a plain function in
both panes rather than rendered — it returns `null` and both rely on the `??` fallback; converting to
an element is a render-tree change and is not this task. `MenuScrollFrame` is not adopted by the
inspector for the same reason.

**Steps:**
- [ ] Read both files whole; write down the engine's surface and re-confirm the eight differences.
- [ ] Extract the hook into `PropertyEditing/`; move `parseEditorValue` with it.
- [ ] Take the four free wins.
- [ ] Convert `PagePropertiesPane` first — the richer visibility rule.
- [ ] Convert `PreviewInspector`.
- [ ] Add the three deliberate-divergence comments.
- [ ] Pin the commit-agreement test. Gates green.
- [ ] The app, both surfaces side by side: every property type rendered and edited in each; a Context
      assigned and cleared in each; an unfilled Context row present in the pane and absent in the
      inspector; the chip hover-× present in the pane and absent in the inspector; each add-picker
      offering its own remainder; a rename reconciling in both.
- [ ] Commit: `refactor(properties): one engine under the pane and the inspector`

#### Gate 3
- [ ] Gates green, exit codes read directly. Derivation re-run against its control.
- [ ] Both surfaces seen running, against the checklists in Tasks 6–10.
- [ ] All eight behavioral differences still hold, each verified individually.
- [ ] No CSS changed in any Phase 3 task.
- [ ] Closing sweep run against its control.
- [ ] `Features/PropertiesPM.md` rewritten in the commit that falsified it.
- [ ] Inline simplification and correctness pass over `<base>..HEAD`.
- [ ] Every concern fixed, or carrying a ruling in the Log. Progress hashes filled in.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — The typecheck-provable half · base `<commit>`
  - [ ] Task 1 — Move the pipeline's two resolvers · `<commit>`
  - [ ] Task 2 — Two idle-page constants · `<commit>`
  - [ ] Task 3 — The Subfield reads the real detectors · `<commit>`
- [ ] **Phase 2** — Vocabularies that reach their dispatch · base `<commit>`
  - [ ] Task 4 — Three erased action types, one wrong-value dispatch · `<commit>`
  - [ ] Task 5 — The editor's vocabulary declared once · `<commit>`
- [ ] **Phase 3** — The property domain · base `<commit>`
  - [ ] Task 6 — One reorder hook · `<commit>`
  - [ ] Task 7 — One option row · `<commit>`
  - [ ] Task 8 — Clear leaves the row · `<commit>`
  - [ ] Task 9 — The Context picker stays open · `<commit>`
  - [ ] Task 10 — One properties engine · `<commit>`

### Rulings
- 08-20-2026 — Nathan: `SavedView` gets nothing added. Struck; reasoning in [[Cohesion-Rulings]].
- 08-20-2026 — Nathan: Table's row-selection tint is an editing mechanism and does not carry to Cards.
  Dropped rather than answered.
- 08-20-2026 — Nathan: the two properties panes share their code and keep their behaviors; the
  divergence is commented as a standing design decision rather than resolved.
- 08-20-2026 — Nathan: both live bugs found inside the domain are fixed, each as its own commit.

### Open Against Later Tasks
- The twenty-two latent exhaustiveness sites are catalogued in [[Cohesive-Cleanup]] §The
  Exhaustiveness Sweep, ranked, and deliberately not in this plan. Two of them —
  `ViewPane.tsx:129` and `ViewEmbedBlock.tsx:437` — carry an explicit `default: return` that actively
  suppresses the diagnosis; those are the ones to take first if the sweep is ever opened.
- `Banner.tsx`'s two callers of `titleMenu` disagree about `editIcon` within one file. Consistent
  today only because one passes `noEditIcon: true`. Not in this plan.
- Both panes leak reveal state across a page change, by different routes. Task 9 touches the
  neighbouring effect and deliberately does not close this.
- Both panes render one frame of the new page against the previous page's frontmatter. Shared flaw,
  not a difference; closing it is a behavior change.

### Deviations
### Lessons
### Sequenced After
- The `useViewHost` consolidation under `TableView` and `CardsView` — roughly 150 lines, its own
  session. Tenth queue item, deliberately excluded.
- Whether the title-cell menu should offer Open Preview. Task 4 leaves the divergence visible and
  does not decide it.
- Whether `list:arrow` should be offered in the editor's list menu. Task 5 makes the omission visible.
- Whether the five visible differences between the property panes should be unified. Task 10
  preserves all of them and comments the one it parameterises.

### Closeout
