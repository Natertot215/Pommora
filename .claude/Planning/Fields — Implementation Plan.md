## Fields — Implementation Plan

> **Status:** ratified — in execution · Spec: the 08-23 session decisions (recorded under Goal and Rulings) · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

A `design-system/fields/` family — the one home for every input surface's look and behavior. At the end, one primitive (`InputField`) owns the field box, one stylesheet owns the axes every field look composes from (boxed fill · hairline · bare), one helper owns the ring channel and its presets (rest, focus, error), and the editing behaviors (commit/cancel caret, rename semantics, press-to-edit) live beside the chrome they animate. Anyone building a field afterwards composes; today they re-roll — the inventory found six independent bare-input resets and a full restatement of the field recipe.

Why this shape: the labels family is the proven template — an axes stylesheet, one primitive, thin recipes, an explicit barrel — and the field code already half-follows it (`interactionField.css.ts` is the axes in embryo; `fieldRing.ts` is already the channel helper). One component with content axes was chosen over a split InputField/ValueField pair because the looks and the contents vary independently: a hairline field can hold a caret (FilterPane's text rule), labels (PathField), chips (FilterPane's chips rule), or a caret *and* labels (the press-to-edit direction) — two components would each need every content mode anyway. The [[Cohesion-Rulings]] FileLabel/FileChip ruling already fixes the content vocabulary: a value inside a field is content and takes no chrome of its own; a chip is a boxed value and stays a chip.

Constraints: the design-system boundary holds — nothing in `fields/` imports the store or IPC, which is why `RenamableTitle` (six `useSession` reads and the rename-claim fence) stays in `Components/` as the app-side adapter. This deliberately isn't solving the Subfield breadcrumb's hand-drawn `›` run, the Table file cell's hand-composed chip run, or any picker/menu surface beyond the ring-literal fix — those are field-adjacent, not fields.

**Requirements**

1. `design-system/fields/` exists holding the chrome axes, the ring helper, `InputField` (the renamed `InteractionField`), `SearchField`, `PathField`, `EditableInput`, `RenamableLabel`, and the press-to-edit behavior, with an explicit named barrel.
2. `--input-field` / `inputFieldVar` are gone with zero trace; the field fill is `fill.quaternary` stated once in the family's stylesheet.
3. One `bare` reset — every hand-rolled twin (optionInput, `.property-editor`, DetailTitleHeader, Banner, `titleInput`, `timeSegInput`) composes it.
4. One placeholder treatment — `label.tertiary`, owned by the family; the `.nav-search-row` UA-default omission fixes itself by inheriting it.
5. The ring channel is composed everywhere it is painted — `pickerMenu.css.ts`'s literal `RING`/`SIDES` strings route through `fieldRing()`.
6. `ErrorRing` exists as a preset on the channel, derived from the existing `--error`.
7. Overflow inside a field fades through family-owned pieces, never per-site wiring: `EditableInput` already carries the caret fade, `SegmentRun`/`OverScroll` carry the run fade, and `InputField` gains an opt-in content-row cap for the caret+labels composition. (Honest scope: most field chrome is consumed as *classes* on consumer-owned elements — those keep owning their markup, and the fade rides the family piece inside them.)
8. PathField's draft-edit becomes a reusable behavior, and `InputField` can host a caret and labels together — proven on FilterPane's Location cell: typing searches the available values, and Enter applies the typed entry as a `FileLabel` with its path stored even when nothing fulfills it yet.
9. `DesignSystemPM.md` documents the family (a Fields table on the Labels & Chips model); every doc claim the work falsifies is rewritten in the falsifying commit.

**Acceptance — the whole thing working:** `npm run typecheck && npm run test && npm run lint` green; the app launches and every field surface (Nav searches, Trash search, IconPicker search, PageSettings/ViewSettings headers, FilterPane rules, Settings path rows, GroupBand rename, table/card value editors, chip renames) renders and edits as before except the ratified visible changes (GroupBand's rename collapses to the bare in-line caret; `.nav-search-row` placeholders gain `label.tertiary`; Trash's search row rises to NavWindow's positioning; FilterPane's Location cell gains press-to-edit); `rg -F -- '--input-field' Pommora/src` and `rg -F 'inputFieldVar' Pommora/src` both return 0 against their controls; and a new field-shaped surface can be built by composing `fields/` exports with no restated chrome.

**Forced By**

- `--over-scroll-fade` is registered `inherits: false` (`overScroll.css:15-20`) → at-source application must sit on the element carrying the axis class; only a component owning its content row can do it once for all consumers.
- vanilla-extract stylesheets cannot export functions (`fieldRing.ts:1-3`) → the ring helper stays a plain sibling module inside `fields/`.
- Plain-CSS hosts (`Table.css`, `DetailTitleHeader.css`, `Banner.css`) cannot import a hashed class → `bare` reaches them through the component's `className` (`cx(bare, hostClass)`), never through a CSS copy.
- `RenamableTitle` calls `useSession` six times and drives the rename-claim protocol (`RenamableTitle.tsx:25-49`) → it stays in `Components/`, importing `RenamableLabel` from its new home. Type-only `@shared` imports are fine (precedent: `labels.css.ts:2`, `theme-vars.css.ts:2`).
- A mask fades an element whole (`EditableInput.tsx:31-33`) → the boxed/bare OverScroll exception stays encoded in `EditableInput`; the box's *content row* is what fades in boxed mode.
- `--error` already exists at `theme-vars.css.ts:114` (full-strength `solid.red`) → ErrorRing derives from it (`tintAt('var(--error)', TINT_STEPS.primary)`); no second red token is minted.
- The Design-Coherence-Report's standing constraint: `EditableInput` moves into the design system *before* the `Components/Detail` rehome → Phase 1 satisfies it.
- Biome PostToolUse hook formats every TS/CSS write → never hand-align; an Edit failing on whitespace means re-read and retry.

**Inherited Reasoning**

- FileLabel vs FileChip is settled two-recipes-on-purpose ([[Cohesion-Rulings]]) — the family must not merge them or re-chrome field content.
- `SearchField` was deliberately minimized to behavior-only ("Only what every search field agrees on," `searchField.css.ts:3-4`); the four host looks were designed as host-owned. This plan narrows that: the transparent look and the placeholder tone become family-owned, host classes keep only genuine deltas (NavView's banner metrics).
- `hairlineField` variants deliberately set only the ring *color*, never `boxShadow` — overriding the shadow stomps the channel for ancestors (`interactionField.css.ts:27-31`). Every new composition follows this.
- The settingsPane `header` ancestor-ring pattern (one `--field-ring` ringing icon button + title as one) is a feature of the channel, not a duplication — keep it whole: the class seeds the grey default and `InlineEditHeader.tsx:44`'s inline style is the sole carrier of a caller's color (`SpaceSettings` passes the Space's tint), not a re-plumbing to remove.
- The report ruled the `RenamableTitle → RenamableLabel → EditableInput` chain verified healthy — behavior is not what's being refactored; it's being *relocated* with its seams intact.

**Grounding** *(re-open these; don't cite them)*

- `design-system/components/interactionField.css.ts` + `InteractionField.tsx` — the established chrome and its ring-channel contract.
- `design-system/components/fieldRing.ts` — `fieldRing()`, `focusRing()`, `ROW_RING`.
- `design-system/labels/` — the family template (axes `§` sections, primitive, recipes, explicit barrel, KNOB markers).
- `design-system/interactions/OverScroll/OverScroll.tsx` + `overScroll.css` — the at-source composition precedents (`Label.tsx:69`, `HoverRemove.tsx:8`, `EditableInput.tsx:56`).
- `Components/EditableInput.tsx` (+ `.css.ts`), `Components/RenamableLabel.tsx`, `Components/RenamableTitle.tsx` — the behavior chain and the boundary verdict.
- `Components/Detail/filterPane.css.ts` + `FilterPane.tsx` — the largest composer and the caret+labels proving ground.
- `Components/iconPicker.css.ts`, `Detail/Views/GroupBand.css`, `Components/Detail/settingsPane.css.ts`, `design-system/components/PickerMenu/pickerMenu.css.ts` — the hand-rolled parallels.
- `.claude/Features/DesignSystemPM.md` (:66, :218-227, :282-297) and `.claude/Features/InteractionPM.md` (OverScroll section) — the doc surface.

**Environment:** Plans live in `.claude/Planning/`. Explorer: `Explore` agent (used for the two scouting sweeps). Code reviewer: `feature-dev:code-reviewer`. Attack reviewer: `build-breaking-agent`. Simplification: `code-simplifier` + `comment-killer-agent`. Gates: `npm run typecheck` · `npm run test` · `npm run lint` (exit codes read directly — `set -o pipefail` if ever piped). Rules: `.claude/Guidelines/` (Cohesion-Rulings and Lint-And-Accessibility read).

**Shapes:** refactor (behavior-preserving moves + consolidation) · removal (`--input-field`, the superseded files) · additive (ErrorRing, press-to-edit on FilterPane) · user-visible (two ratified deltas + the FilterPane behavior).

**Global Constraints (every task inherits these):**

- Gates: `npm run typecheck` · `npm run test` · `npm run lint`, each read directly, all green before any commit.
- No file in `design-system/` imports `@renderer`-app code, the store, or IPC; type-only `@shared` is permitted.
- Tokens come from `design-system/tokens` — no hand-rolled colors, durations, or type.
- `KNOB` and `(Nathan's call)` markers survive every move — grep-verify after each file move.
- Stage explicit files only; Nathan's unattributed doc edits ride along, never get reset out.
- Comments carried by moved code move verbatim; no narration of the move, no "was previously" notes.
- Out of scope everywhere: the Subfield breadcrumb run, the Table file-cell chip run, MarkdownPM/CodeMirror editors, PhotoCropModal, showcase-only styles beyond the new Fields section.
- **The plan's total code-line delta lands negative** (comments and tests excluded). Each phase gate carries a mandatory look-back: what duplication did this phase introduce, and where did it deviate from the core mandate — one family, composed not restated. A deviation found at a gate is fixed there, not carried.
- **The doc pass deletes, never amends.** Any claim a phase makes stale is removed or rewritten as currently true in the falsifying commit — no "(pending)" markers, no supersede notes, nothing left reading as open once it's done.

**Made False** *(each rewrite lands in the commit that falsifies it)*

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| DesignSystemPM.md:66 | `Interaction Field \| inputFieldVar · --input-field \| fill.quaternary` (Surfaces row) | The token is deleted | 3 |
| DesignSystemPM.md:222 | `PathField \| PathField.tsx \|` under SOURCE `design-system/components/` | PathField moves to `fields/` | 9 |
| Design-Coherence-Report §III/§VII | `EditableInput` destination `components/EditableInput/`; `InteractionField` listed as a components/ folder | Both land in `fields/` instead | 2 |
| ContextPM.md (Current Focus) | "consolidated onto the `InteractionField` chrome" | The component is renamed `InputField` | 9 |
| InteractionPM.md (OverScroll SOURCE trail) | Consumer-placed fade var described as the opt-in for field content | Fields apply it at source | 8 |

**Dead Vocabulary** *(the closing sweep searches for)*

- `--input-field` → expect 0. Legitimate hits: none. (`rg -F -- '--input-field' Pommora/src`)
- `inputFieldVar` → expect 0. Legitimate hits: none.
- `InteractionField` → expect 0 in `Pommora/src`. Legitimate hits: none — the rename is total.
- `interactionField.css` → expect 0.
- Control: `fieldRing` → non-zero (the helper survives, relocated). Zero here means the sweep never ran.

**Open Questions**

None — all four pre-ratification questions were answered 08-23 and are recorded under Rulings.

---

### Phase 1 — The family lands

Base commit recorded in the Log when the phase opens. All moves are `git mv` so history follows.

#### Task 1: Create `fields/` — the axes, the ring helper, and the primitive

**Requirement:** 1, 2 (the family half), 6

**Why:** Everything later composes from this file set; landing it first means every subsequent task is a re-point, not an invention. The axes stylesheet is `interactionField.css.ts` grown to family scope: it absorbs `bare` (from `EditableInput.css.ts`), the placeholder treatment, and states the fill as `fill.quaternary` directly — which is what lets Task 3 delete the token. `InteractionField` renames to `InputField` in the same stroke because the end state has one name and a temporary alias is residue.

**Files:**
- Create `design-system/fields/fields.css.ts` — `git mv` of `interactionField.css.ts`, then: fill becomes `derived.color.fill.quaternary` (import from `tokens/color.css`); absorb `bare` from `Components/EditableInput.css.ts` **and grow it `font: 'inherit'`** — an `<input>` never inherits font on its own (the UA hard-sets it), and every twin Task 5 retires carries the line; without it three surfaces (table cell editor, banner rename, detail title) revert to UA type mid-edit. The two existing `bare` composers (`numberEditor.css.ts`, `pickerControl.css.ts`) sit inside styled chips and are unaffected. Add `placeholder` (`label.tertiary`) and a `::placeholder` selector on `input`; `§` banner comments per the labels convention (§ BOX · § BARE · § CONTENT).
- Create `design-system/fields/fieldRing.ts` — `git mv` from `components/fieldRing.ts`; add `errorRing()`: the channel set to `tintAt('var(--error)', TINT_STEPS.primary)` (mirror `focusRing`'s fragment shape, no transition unless focus-driven).
- Create `design-system/fields/InputField.tsx` — `git mv` + rename of `InteractionField.tsx`; component `InputField`, `fieldInputClass` kept.
- Create `design-system/fields/index.ts` — explicit named barrel (labels style, no `export *`).

**Interfaces**
- Produces: `InputField` (props unchanged: `children/className/onClick/outline`), `fieldInputClass`, `field`, `hairlineField`, `input`, `bare`, `placeholder`, `fieldRing()`, `focusRing()`, `errorRing()`, `ROW_RING`.
- Assumed by: every later task; consumers re-point in Task 2.

**Steps:**
- [x] `git mv` the three files; apply the rename and the fill inline; write the barrel.
- [x] Re-point the two old-path importer sets the type gate names (expect: `pathField.css.ts`, `filterPane.css.ts`, `textPicker.css.ts`, `iconPicker.css.ts`, `settingsPane.css.ts`, `pickerMenu.css.ts`, `menu/menu.css.ts`, `InlineEditHeader.tsx`, `SettingsScaffold.tsx`, `numberEditor.css.ts`, `pickerControl.css.ts` — let typecheck enumerate; a file the gate misses is a stale string import, sweep `rg -F "interactionField"` and `rg -F "components/fieldRing"`).
- [x] Gates green. Grep `KNOB` count in moved files matches pre-move.
- [x] Commit: `refactor(fields): the field chrome becomes a family`

#### Task 2: The behavior chain moves in

**Requirement:** 1; satisfies the report's rehome constraint

**Why:** `EditableInput` and `RenamableLabel` are design-system members in everything but location (only outward edge: `cx`), and the report requires the move before the `Components/Detail` rehome. `RenamableTitle` stays — its store binding is app orchestration.

**Files:**
- `git mv Components/EditableInput.tsx → design-system/fields/EditableInput.tsx`; its `.css.ts` merges into `fields.css.ts` (autoSize trio joins § BARE/§ CONTENT; `bare` already moved in Task 1 — delete the emptied file).
- `git mv Components/RenamableLabel.tsx → design-system/fields/RenamableLabel.tsx`.
- `git mv design-system/components/SearchField.tsx (+ .test.tsx) → design-system/fields/`; its two-line reset (`border`/`outline` only) folds into `fields.css.ts` as the search reset **and stays that narrow** — it must NOT become `bare`: `bare`'s `padding: 0`/`background: transparent` emit after § BOX in the family stylesheet and would beat the boxed chrome on any host composing both (verified against the real vanilla-extract emission order), which is exactly what Task 4's IconPicker composition does. The family `::placeholder` class joins it; delete `searchField.css.ts`.
- `SearchField.test.tsx:31` asserts `classList.length === 2` — an exact-count invariant the composition breaks by design; rewrite to membership assertions (`contains('mine')` + each family class) in this task, not as a surprise red gate.
- `git mv design-system/components/PathField.tsx + pathField.css.ts → design-system/fields/`.
- Re-point all importers (Derivation below); update the barrel.

**Derivation**
- `rg -Fl "Components/EditableInput" Pommora/src` + relative `./EditableInput` in `Components/` → 7 files at planning time (RenamableLabel, NumberEditor, PickerControl, GhostOptionChip, TextPicker, numberEditor.css + pickerControl.css for `bare`; RenamableTitle mentions it in a doc comment only — no import to re-point).
- `rg -Fl "RenamableLabel" Pommora/src` → 9 files; `rg -Fl "components/SearchField" ` → 4; `rg -Fl "components/PathField"` → 2.
- Control: `rg -F "design-system/fields" Pommora/src` after → ≥ 20. Zero means the re-point never landed.

**Failure half:** a missed importer is a compile error (module not found) — the gate enumerates; no silent misses possible for TS. The one silent class is a *string* class reference: sweep `rg -F "over-scroll-x" design-system/fields` to confirm `EditableInput`'s bare-mode class survived the move.

**Steps:**
- [ ] Move, merge the stylesheet, re-point, barrel.
- [ ] `.nav-search-row` and NavView placeholder rules: delete `navView.css:41`'s `::placeholder` block (now family-owned); confirm `navList.css` needs no addition (inherits the family rule).
- [ ] Gates green; `SearchField.test.tsx` and `renamableTitle.test.tsx` pass from new import paths.
- [ ] Update the Design-Coherence-Report §III/§VII arrival rows in this commit (Made False).
- [ ] Commit: `refactor(fields): the editing chain lives beside its chrome`

#### Task 3: `--input-field` dies with zero trace

**Requirement:** 2

**Why:** The token aliased one fill for one named purpose; the family now states that fill once, so the indirection carries nothing.

**Files:** `tokens/color.css.ts:77-84` (the comment, the var, the export) · `Components/iconPicker.css.ts:31` → `fields` composition (Task 4 finishes it; here it takes `derived.color.fill.quaternary` if Task 4 is not same-session) · `Components/Detail/settingsPane.css.ts:100` → `fill.quaternary` direct · `Detail/Views/GroupBand.css:77` — the `background` line deletes outright (the rest of `.band-title-input` dies in Task 5) · `DesignSystemPM.md:66` row deleted (Made False).

**Derivation**
- `rg -F -- '--input-field' Pommora/src` → 4 hits across 2 files at planning time (color.css.ts ×3: comment, decl, export string · GroupBand.css ×1). `rg -F 'inputFieldVar' Pommora/src` → 4 files.
- Control: `rg -F -- '--fill-quaternary' Pommora/src` → ≥ 1 (the bridge). Zero means the sweep never ran.

**Steps:**
- [ ] Re-point the four consumers, delete the token block, delete the doc row.
- [ ] Both sweeps → 0 against the control; gates green.
- [ ] Commit: `refactor(tokens): the input fill is the quaternary fill, stated once`

#### Gate 1 — the family stands, nothing looks different
- [ ] Gates green, exit codes read directly.
- [ ] Derivations re-run against controls; counts matched or the divergence rewrote the plan.
- [ ] `rg -F "InteractionField" Pommora/src` → 0; `rg -F "KNOB" design-system/fields` count equals the pre-move sum.
- [ ] Simplification (`code-simplifier`) + review (`feature-dev:code-reviewer`) dispatched against `<base>..HEAD` scoped to the phase's paths; concerns fixed or ruled.
- [ ] App launched (`env -u ELECTRON_RUN_AS_NODE npm run dev`): Nav/Trash/IconPicker searches, a PageSettings header rename, a FilterPane rule, a Settings path row — all render and edit as before. (Full-restart, not HMR — extension-adjacent CSS moves.)
- [ ] Look-back: no duplication introduced by this phase, no deviation from the core mandate (one family, composed not restated) — anything found is fixed at this gate, not carried.
- [ ] Progress hashes filled in.

---

### Phase 2 — The parallels fold

#### Task 4: The search surfaces — IconPicker composes, Trash aligns

**Requirement:** 3, 4 (partially), the SearchField decision

**Why:** `iconPicker.css.ts:23-41` restates `input` byte-for-concept (fill, radius, ring, type, placeholder, focus). Per ruling, IconPicker is an `InputField`-chromed `SearchField` with the standard placeholder — the style body reduces to layout deltas only (portal type pinning stays; the comment explains why).

**Files:** `Components/iconPicker.css.ts` (`search` → compose `input` + `focusRing()`, keep only `textAlign`/width/type-pin deltas) · `Components/IconPicker.tsx:135` (className updated) · `Settings/trashLeaf.css` — Trash's search row rises to NavWindow's vertical positioning (NavWindow is the reference; the delta is in the leaf's own head spacing, since both wear the same `.nav-search-row`).

**Steps:**
- [ ] Recompose; visually confirm in the running app (icon picker from a page header).
- [ ] Align the Trash search row against NavWindow side-by-side in the running app.
- [ ] Gates green. Commit: `refactor(fields): the icon search wears the family chrome`

#### Task 5: The bare twins adopt `bare`

**Requirement:** 3

**Why:** Six independent resets of the same idea is the exact drift the family exists to end. Plain-CSS hosts can't import the class, so the *component* carries it: `PropertyEditor`, `DetailTitleHeader`'s and `Banner`'s `RenamableLabel` calls pass `cx(bare, hostClass)`, and the host CSS drops its reset lines, keeping only metrics/layout.

**Files:**
- `Detail/Views/GroupBand.css:73-80` `.band-title-input` — the whole block dies. The rename was shipped broken (a bordered, filled box where the intent was an in-line caret); it collapses onto the bare mechanism: no box, no ring, no select-all highlight — the caret lands in place (the `caretAtEnd` seat, threaded through `RenamableTitle`'s call, which today hard-sets the select-all `row` mode). `Detail/Views/GroupBand.tsx` is a named file of this task — its `className` is a plain CSS string, so the composition change lands in the tsx, and its `boxed` flag drops with the box.
- `Components/Detail/settingsPane.css.ts:356` `optionInput` → `style([bare, { … }])`, twin lines deleted.
- `design-system/components/menu/menu.css.ts:175` `titleInput` → composes `bare`, keeps `width/minWidth/font: inherit` and the dimensional-identity comment.
- `Detail/Views/PropertyEditing/PropertyEditor.tsx:51` → `cx(bare, 'property-editor', …)`; `Table.css:144` drops the reset half, keeps layout + ghost.
- `Detail/DetailTitleHeader.tsx` + `.css`, `Detail/Banner/Banner.tsx` + `.css` — same split; the two cross-referencing DRY-claim comments die with the duplication they apologized for.
- `design-system/components/CalendarPicker/calendarPicker.css.ts:244` `timeSegInput` → composes `bare`, keeps `2.4ch`, radius, `::selection`, placeholder-opacity notes.

**Survivors:** each host keeps its genuine deltas — sizes, `fieldSizing`, colors, host-specific selectors. Nothing visual moves.

**Derivation**
- The twin fingerprint: `rg -F "outline: none" Pommora/src/renderer/src --type css -l` + the named six at planning time. After: the named sites compose; other `outline: none` hits (buttons, menus) are out of scope and survive.
- Control: `rg -F "bare" design-system/fields/fields.css.ts` → 1 definition.

**Steps:**
- [ ] Convert the six; gates green; spot the running app (a table cell edit, a title rename, a banner rename, a chip rename, a time edit).
- [ ] Commit: `refactor(fields): one bare reset, six twins retired`

#### Task 6: The ring channel is composed everywhere it paints

**Requirement:** 5

**Why:** `pickerMenu.css.ts:40-45` restates the channel literal four times (`RING`/`SIDES`); `filterPane.css.ts:176` `cellInput` restates `hairlineField`'s padding and color; `InlineEditHeader.tsx:44` re-plumbs `InputField`'s own `outline` prop on a sibling div.

**Files:** `pickerMenu.css.ts` (SIDES built from `fieldRing`-composed fragments — the per-side geometry stays, the `var()` literal routes through one helper or a shared const *imported* from `fields/fieldRing.ts`) · `filterPane.css.ts:176` (`cellInput` composes `hairlineField`, keeps `fieldSizing`/flex/minWidth — and check the composition doesn't clip the caret: `hairlineField` brings `overflow: hidden`/`nowrap` onto a raw `<input>`; type a value longer than the cell and confirm the caret stays visible).

**Survivors:** `InlineEditHeader.tsx:44`'s inline `--field-ring` style stays — it is not a duplication of `InputField`'s prop plumbing but the *sole carrier* of the Space's color ring: the settingsPane `header` class only seeds the grey default, and `SpaceSettings` passes `outline` with the Space's own tint. `ContextsPM.md` documents the behavior as shipped.

**Steps:**
- [ ] Convert; gates green; FilterPane text rule (long-value caret check included) + menu-row selection + a colored Space's settings header ring checked running.
- [ ] Commit: `refactor(fields): the ring channel has one spelling`

#### Gate 2 — no restated chrome
- [ ] Gates green; derivations re-run.
- [ ] Simplification + review against `<base>..HEAD`; `comment-killer-agent` over the phase diff.
- [ ] Every converted surface seen running (list in Tasks 4–6).
- [ ] Look-back: no duplication introduced by this phase, no deviation from the core mandate (one family, composed not restated) — anything found is fixed at this gate, not carried.
- [ ] Progress hashes filled in.

---

### Phase 3 — Behavior: press-to-edit and content at source

#### Task 7: The fade rides the family's own pieces

**Requirement:** 7

**Why:** The original at-source ambition — `InputField` capping every field's content — doesn't reach the tree as it stands: the chrome is consumed as *classes* on consumer-owned elements at nearly every surface (`InputField` the component has exactly two consumers: InlineEditHeader and SettingsScaffold), so a component-owned cap would cover almost nothing while visibly changing the two headers it does reach — an unratified delta. The honest shape: the fade lives in the family piece that owns each scroller, which is already mostly true — `EditableInput` carries the caret fade (`over-scroll-x` unless `boxed`), `SegmentRun` carries the run fade, FilterPane's chip run mounts `OverScroll`. This task closes the gap rather than rebuilding it: `InputField` gains an *opt-in* content-row cap (§ CONTENT, the `Label.tsx:69` pattern) that Task 8's caret+labels composition mounts, and the family states the fade default once as a KNOB.

**Files:** `fields/InputField.tsx` + `fields.css.ts` (§ CONTENT: the opt-in row class carrying the cap and the `--over-scroll-fade` KNOB default).

**Survivors:** `segmentRun.css.ts:30` keeps its own fade — SegmentRun is itself an at-source component; a field hosting a run defers to the run's. `textPicker.css.ts:46`'s `12px` stays — the input *is* the scroller and the var is non-inheriting, so no ancestor cap can supply it; the value is a KNOB, not a hand-roll. InlineEditHeader's and SettingsScaffold's children stay uncapped — capping them is a look change nobody ratified.

**Failure half:** content that fits — the OverScroll timeline stays inactive and the mask no-ops (`overScroll.css:1-4`); zero children — an empty content row renders nothing extra; a boxed field — the fade rides the inner row, never the box (the mask-dissolves-the-box rule).

**Steps:**
- [ ] Implement the opt-in content row; prove it on the Task 8 composition (its long-labels case fades with no per-site var).
- [ ] Gates green. Commit: `refactor(fields): the field content row caps itself`

#### Task 8: Press-to-edit extracted; caret + labels in one field

**Requirement:** 8

**Why:** PathField's model — rest content, click pins width and swaps in a caret, select-on-open, unmount flush — is the behavior Nathan wants reusable. Extracted as `fields/useDraftEdit.ts` (state + refs + commit rules), PathField becomes its first consumer unchanged; `InputField` gains the composition where rest-labels and an edit caret coexist. The proving consumer is FilterPane's Location cell — the only picker field taking this (Nathan's call, 08-23): typing searches the available Space values live, and Enter applies the typed entry as a `FileLabel` whose path is stored as-is, so a Space created later fulfills the rule without it being rewritten.

**Interfaces**
- Produces: `useDraftEdit({ value, onCommit }): { draft, openEdit(el), inputProps, restProps }` — exact shape settled at implementation against PathField's needs, recorded here before Task 9 consumes the docs.
- Assumed by: PathField, (conditionally) FilterPane's `FieldPicker`.

**Failure half:** commit-on-unmount with an unchanged draft → no write (PathField's `last.trim() !== was` guard moves into the hook); Escape mid-edit → draft drops, no commit; empty draft → the caller's guard decides (RenamableLabel's cancel-on-empty stays caller policy).

**Steps:**
- [ ] Extract; PathField re-composes with zero behavior delta (both consumers checked running).
- [ ] InputField caret+labels composition demonstrated (showcase entry doubles as the proof surface).
- [ ] Gates green. Commit: `refactor(fields): press-to-edit is a behavior, not a component's secret`

#### Gate 3 — behaviors proven running
- [ ] Gates green; both PathField consumers + TextPicker + FilterPane exercised in the app.
- [ ] Simplification + review against `<base>..HEAD`; concerns fixed or ruled.
- [ ] Look-back: no duplication introduced by this phase, no deviation from the core mandate (one family, composed not restated) — anything found is fixed at this gate, not carried.
- [ ] Progress hashes filled in.

---

### Phase 4 — The record

#### Task 9: Documentation and showcase

**Requirement:** 9

**Why:** The family exists when the reference says so — DesignSystemPM's absence of SearchField/TextPicker/InteractionField rows is a report finding this work closes for its own corner.

**Files:**
- `DesignSystemPM.md`: a `#### Interactive Fields` heading on the Labels & Chips model — SOURCE `design-system/fields/`, one row per export with a *reach-for-it-when* use case; the `:222` PathField row moves in; the `:66` Surfaces row is already gone (Task 3); Component Chrome's field-adjacent lines reconciled.
- `InteractionPM.md`: the OverScroll section notes field content as an at-source composer (one sentence, current-truth voice).
- `ContextPM.md`: amended LIGHTLY — the Current Focus sentence names `InputField` and states the fields arm as landed; no new sections, no expansion.
- Design-Coherence-Report: §VI's field-relevant rows marked landed the way OverScroll/HoverRemove were; §VII tree updated (`fields/` exists; `components/` loses the five).
- Showcase: a Fields section inside `ComponentsLeaf` (the LabelsLeaf registration mode) showing the axes, the ring presets including ErrorRing, and the caret+labels composition.

**Steps:**
- [ ] Write all five; full-width prose lines, no wrap.
- [ ] The full-prose pass over every doc this plan touched: nothing reads as pending, open, or upcoming once it's done — stale claims are DELETED or restated as currently true, never amended with notes.
- [ ] Gates green (showcase compiles). Commit: `docs(fields): the family is on the record`

#### Gate 4 / Closeout
- [ ] Dead Vocabulary sweeps → 0 against the control.
- [ ] Delivery Claim written; neutral verifier dispatched (claim vs this plan's Requirements); then `build-breaking-agent` attack on the shipped family.
- [ ] Line ledger: report the net code-line delta (comments and tests excluded) — **must be negative**; a positive total means Phase 2's consolidation under-delivered and reopens it.
- [ ] Lessons routed to `.claude/Guidelines/`; HistoryPM entry drafted.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — the family lands · base `e932f2b6`
  - [ ] Task 1 — axes, ring, primitive · `<commit>`
  - [ ] Task 2 — behavior chain moves · `<commit>`
  - [ ] Task 3 — `--input-field` zero trace · `<commit>`
- [ ] **Phase 2** — the parallels fold
  - [ ] Task 4 — IconPicker search · `<commit>`
  - [ ] Task 5 — bare twins · `<commit>`
  - [ ] Task 6 — ring channel spelling · `<commit>`
- [ ] **Phase 3** — behavior
  - [ ] Task 7 — OverScroll at source · `<commit>`
  - [ ] Task 8 — press-to-edit · `<commit>`
- [ ] **Phase 4** — the record
  - [ ] Task 9 — docs + showcase · `<commit>`

### Rulings
- 08-23 (Nathan): one field family; IconPicker takes the standard chrome + "Search" placeholder; press-to-edit becomes a shared behavior reaching FilterPane; `--input-field` dies zero-trace; error state seeded cheap; end-state minimality is the target, steps may churn.
- 08-23 (Nathan): Location is the only picker field taking press-to-edit — typing searches available values; Enter applies the entry as a `FileLabel` with the path stored for future fulfillment.
- 08-23 (Nathan): GroupBand's rename was shipped broken; it collapses to the bare in-line caret — no box, no ring, no select-all highlight.
- 08-23 (Nathan): ErrorRing derives from the existing `--error`; no second red token.
- 08-23 (Nathan): NavView's search keeps its banner-slot metrics as ordinary host deltas, not a framed exception; Trash's search row rises to match NavWindow's positioning (NavWindow is correct).

### Open Against Later Tasks
- (Task 5 or Gate 2) `filterPane.css.ts` defines its own `placeholder` class (`label.tertiary`) — a twin of the family's; fold it when FilterPane is next touched.
- (Task 6) `cellInput` composing `hairlineField` brings `overflow: hidden` + `nowrap` onto a raw `<input>` — unproven whether Chromium's internal editor scroller keeps the caret visible past the clip. Ten-second check at implementation: type past the cell width in a FilterPane text rule.

### Deviations
- 08-23 plan-attack round (pre-ratification): six findings, five folded — InlineEditHeader's inline ring style reclassified from duplication to sole carrier of the Space color (Task 6 Survivors); `bare` grew `font: 'inherit'` (Task 1); SearchField keeps a narrow border/outline reset instead of wearing `bare` (Task 2 — cascade-order conflict with Task 4's boxed IconPicker chrome, verified against real vanilla-extract emission); `SearchField.test.tsx`'s exact-class-count assertion rewritten in-task (Task 2); Task 7 re-scoped from "cap every field" to "the family piece that owns each scroller carries the fade" — the chrome is class-consumed, so a component cap reached two surfaces and changed both without ratification. Three derivation counts corrected. The GroupBand finding was already superseded by Nathan's bare-caret ruling.
### Lessons
### Sequenced After
- A shared placeholder/copy source ("Search…" and friends) — Nathan flagged as a possible future ContextPM focus.
- The Subfield breadcrumb's hand-drawn `›` run and the Table file cell's hand-composed chip run — field-adjacent SegmentRun candidates, deliberately not this plan's.

### Closeout
