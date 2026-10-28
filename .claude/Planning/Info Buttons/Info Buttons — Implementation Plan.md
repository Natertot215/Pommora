## Info Buttons — Implementation Plan

**DATE:** 10-27-2026
**STATUS:** Ratified 10-27-2026
**SOURCE:** *Info Buttons — Decisions & Intention* (ratified 10-27-2026, with its *§Planning Rulings*), *Info Buttons — Investigation* and its cleaned reports in `Scouts/`, and *Info Buttons — Scout Findings* (the brainstorm's).

**BASELINE** (filled after ratification; the end logged in the final report)

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `6f283376f` | 8,948 passed, 2 skipped (544 files) | 10-27-2026 | |

### Context

Pommora explains a row only through its caption, the one-line secondary text under its title. The code names that line three ways: Settings' `RowText.hint` (63 entries in `Core/Settings/frames.ts`), `MenuRow`'s `caption`, and `MenuItem`'s `subLabel`, renamed at three seams (`SettingsWindow.tsx:57`, `SettingsFieldRow.tsx:16`, `ManageRow.tsx:37`), while `caption` is also the style of `MenuCaption`, the centered note an empty pane shows. `SettingsFieldRow` is a second copy of `settingsRow`'s map from a Settings row to a menu row.

What an InfoButton needs mostly exists. `MenuItem` (`UIX/Menus/MenuRows.tsx`) ends every titled row; `Button` carries every type, an outline, and an icon; `PickerMenu` (`UIX/Pickers/PickerMenu.tsx`) at `focus="keep"` is modal with no shield, so Escape and an outside press close it and its trigger counts as inside; `useHoverReveal` (`UIX/Interactions/hoverReveal.ts`) dwells and grants grace on enter and leave, though its dwell is a fixed 1,500 ms, it keeps `reset` to itself, and on touch it rests open; a read-only `MarkdownEditor` renders an entry's Markdown, though it stays selectable by design; Vite's `?raw` import reads a Markdown file as text under the build, dev, and vitest; and the mirror watcher (`~/.claude/scripts/cross-file-mirroring/`) keeps a codebase document and a NexusOS note in two-way sync.

### Overview

A row's secondary line takes one name, `caption`, from Settings through `MenuItem`; the centered empty-pane note becomes `MenuDesc`; `SettingsFieldRow` leaves, every Settings row component taking its whole row, and `settingsRow` moves beside `RowText` in `frames.ts`. The shared pieces gain what the InfoButton needs and nothing else: `useHoverReveal` takes `dwellMs` in place of `dwell`, returns `reset`, and exports `coarse`; `MarkdownEditor` gains a `selectable` opt-out that takes its text out of the keyboard's reach; and the row accessory's width and overhang become one class, `rowAccessory`, which `accessoryButton` composes. The InfoPane opens through `PickerMenu` exactly as every dropdown does.

**InfoButton** (`Core/Info/InfoButton.tsx`) is a small UIX `Button` that sits right after a row's title through `MenuItem`'s new `info` slot: a 0.5-second rest opens its pane below it, a click holds the pane open and a second click closes it, Escape or an outside press closes it, a tap opens it on touch, it works on a disabled row, and one pane shows at a time. Its look is three independent props (glyph, type, border), defaulting to the `info` glyph, the `filled` type, and no border, its three glyphs curated in the icon registry; its accessible name is "Title - Info." The same file holds `infoFor(id, title, look?)`, the one call a row cites an entry through, which hands a row an InfoButton whose **InfoPane** shows the entry as read-only, unselectable Markdown with no hover behavior. **InfoIndex** (`Core/Info/InfoIndex.md`) holds each entry once, wrapped in a tag naming its ID, and `Core/Info/infoIndex.ts` reads its format once into its entries by ID.

Four example entries, cited by the Label Format and Value Format rows, Settings' Date Format row, and a page's Aliases row, and an Iteration window preview of a disabled row and the look's variants, carry the build and its verification through a live drive; they leave after verification, so the InfoIndex ships empty and rows cite their first real entries later. Last, `.claude/Resources/` returns holding a symlink to the InfoIndex, so the folder's existing mirror row carries it to NexusOS; the three outdated notes the folder once held aren't restored.

**The Number:** about +325 / −155 across Phases 1–3, roughly +170 net counting code alone (tests, documents, and `.claude/` excluded), of which about +55 is the examples and the Iteration window's preview that Phase 5 removes, so about +115 ships. Phase 1 removes more than it adds (`SettingsFieldRow`, four split props, two translation seams); the InfoButton, its pane, and its stylesheet (about +110) are the behavior the decisions require that nothing in the tree did, built from the kit's button, hover reveal, dropdown, and read-only editor. Each phase's measured delta is recorded in the Net Ledger, and growth past an estimate is reported with what it buys.

**Net Ledger** (the Actionable column of `view-delta --exclude .claude`, per phase, cumulative from the BASELINE head):

| Phase | Estimate | Measured | Cumulative |
| ----- | -------- | -------- | ---------- |
| 1 | +75 / −125 | +284 / −254 (+30) | +30 |
| 2 | +135 / −18 | +147 / −32 (+115) | +145 |
| 3 | +115 / −13 | +128 / −11 (+117) | +262 |
| 4 | 0 | +16 / −3 (+13) | +275 |
| 5 | 0 / −55 | | |

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `InfoButton` • Component | A row's info glyph and its pane: dwell, hold, close, touch, one open at a time, and the click boundary, built from UIX's button, hover reveal, and dropdown. | `Core/Info/InfoButton.tsx` |
| `info-button.css` • File | The InfoButton's host, which keeps the pointer on a disabled row, and its pane: the width, the editor's chrome, and the pointer rule that leaves the pane no hover behavior. | `Core/Info/info-button.css` |
| `info` · `circle-question-mark` · `circle-alert` • Registry Entries | The InfoButton's three glyphs, curated so they draw without the full icon set. | `UIX/Symbols/index.tsx` |
| `InfoButton.test.tsx` • File | The InfoButton's behavior, apart from any row. | `Core/Info/InfoButton.test.tsx` |
| `Info` • Folder | In-app information: the InfoButton with its citation call and pane, the InfoIndex and its format, and their tests. UIX gains no file. | `Core/Info/` |
| `InfoIndex.md` • File | Every entry once, each wrapped in a tag naming its ID; mirrored to NexusOS as `PM-Info-Index.md`. | `Core/Info/InfoIndex.md` |
| `infoIndex.ts` • File | The InfoIndex's format: `parseInfoIndex` and `ENTRIES`, with no React or editor in its imports. | `Core/Info/infoIndex.ts` |
| `parseInfoIndex` • Function | An InfoIndex's text as its entries by ID. | `Core/Info/infoIndex.ts` |
| `ENTRIES` • Constant | The InfoIndex's entries, read once when the module loads. | `Core/Info/infoIndex.ts` |
| `infoFor` • Function | The InfoButton a row carries for the entry its ID names. | `Core/Info/InfoButton.tsx` |
| `Entry` • Component | The pane's contents: an entry as read-only, unselectable Markdown under an inert host with no connections, built only while the pane is open. | `Core/Info/InfoButton.tsx` |
| `infoIndex.test.ts` • File | The InfoIndex's format and its citations. | `Core/Info/infoIndex.test.ts` |
| `RowText.info` • Field | What a Settings row shows right after its title, its InfoButton through `infoFor`, which `settingsRow` and the two managed Settings rows pass on. | `Core/Settings/frames.ts` |
| `ManageRow.info` • Prop | What a managed list's row shows right after its title. | `UIX/Menus/ManageRow.tsx` |
| `MenuItem.info` · `MenuRow.info` • Fields | What a row shows right after its title, an InfoButton for one. | `UIX/Menus/MenuRows.tsx`, `UIX/Menus/MenuIndex.tsx` |
| `titleLine` • Class | The title laid out as a line, for a row carrying something after it. | `UIX/Menus/menu-row.css.ts` |
| `rowAccessory` • Class | A row-borne button's width and overhang, composed by `accessoryButton` and worn alone by the InfoButton. | `UIX/Menus/menu-row.css.ts` |
| `MenuItem.caption` • Prop · `caption` • Class | A row's secondary line, in place of `subLabel`. | `UIX/Menus/MenuRows.tsx`, `UIX/Menus/menu-row.css.ts` |
| `MenuDesc` • Component · `desc` • Class | The centered note a pane shows on its own, in place of `MenuCaption`. | `UIX/Menus/MenuRows.tsx`, `UIX/Menus/menu-row.css.ts` |
| `RowText.caption` · `ManageRow`'s `caption` • Field · Prop | A Settings row's secondary line, in place of `hint`. | `Core/Settings/frames.ts`, `UIX/Menus/ManageRow.tsx` |
| `dwellMs` • Option | A reveal's dwell, given by its caller, in place of `dwell`. | `UIX/Interactions/hoverReveal.ts` |
| `HoverReveal.reset` • Field | Closes a reveal now and forgets the pointer. | `UIX/Interactions/hoverReveal.ts` |
| `MarkdownEditor.selectable` • Prop | False takes the content out of the keyboard's reach and out of selection, a press on it moving no focus. | `Core/MarkdownPM/MarkdownEditor.tsx` |
| `Resources` • Folder | `PM-Info-Index.md`, a symlink to the InfoIndex, which the folder's doc-tree row mirrors to NexusOS. | `.claude/Resources/` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `SettingsFieldRow.tsx` • File | A second map from a label and a hint to a menu row. | `Core/Settings/SettingsFieldRow.tsx` |
| `MenuItem.subLabel` • Prop · `subLabel` • Class | Renamed `caption`. | `UIX/Menus/MenuRows.tsx`, `UIX/Menus/menu-row.css.ts` |
| `MenuCaption` • Component · its `caption` class | Renamed `MenuDesc` and `desc`. | `UIX/Menus/MenuRows.tsx`, `UIX/Menus/menu-row.css.ts` |
| `RowText.hint` · `ManageRow`'s `hint` • Field · Prop | Renamed `caption`. | `Core/Settings/frames.ts`, `UIX/Menus/ManageRow.tsx` |
| `label` · `hint` • Props | The four special Settings rows' split props, replaced by `row`. | `Core/Settings/AssetDirectoryRow.tsx`, `ClearActionRow.tsx`, `ExcludedDirectoriesRow.tsx`, `PreviewRulesRow.tsx` |
| `dwell` • Option | Replaced by `dwellMs`. | `UIX/Interactions/hoverReveal.ts` |
| `// Dashboard` • Structure line | A folder Pommora no longer has. | `.claude/CLAUDE.md` |

#### Constraints

- **Mandate (Nathan's, verbatim from *Info Buttons — Decisions & Intention*):**
  - **Approach:**
    - **Removal First:** any approach first assesses what's true *now* that could be removed, deleted, changed, consolidated, or replaced. The design isn't based on what's currently there with its course adjusted; it ensures totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what's ultimately going to be replaced.
    - **Consolidation First:** the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
    - **Less Stuff:** nothing new is added unless there's evidence it's required. The work ends with cumulatively less in the codebase overall — fewer ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, fewer things to maintain, and fewer headaches in future work — while the line count *may* end up positive. Net-negative lines are the north star, and any net-positive gain has its rationale genuinely backed by this framework and the principles below.
    - **Always Intentional:** anything within the surface area reads as always-intentional, without odd-ones-out designs, and reflects the broader codebase's resulting shape rather than remnants of, or adherence to, what's true now and is ultimately going to change. The approach reflects the outcome and isn't bound by constraints that were only relevant before.
    - **Look Outward:** look for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted to fit. This work doesn't start from scratch.
    - **The Data Layer:** the complex data-level mechanics least reflect Nathan's intentions and mostly reflect what past session agents judged appropriate. Treat them with care and respect, without assuming they're beyond reasonable change; presenting an approach to Nathan may be all it takes to change the codebase for the betterment of everything in it and of future iterations.
  - **Principles:**
    - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
    - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
    - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
    - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
    - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
    - **Real Purpose:** Anything added to the codebase should have its purpose clearly stated with the perspective of its value enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
    - Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
    - Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct
    - Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered
- **Briefs:** every agent brief — executors and reviewers — and every handoff or compaction continuation carries the Mandate above (the Approach and the Principles) in full and *§Constraints* whole, except the neutral gate's, which carries the Mandate alone.
- **Rulings (Not Re-Raised):** every entry in *Info Buttons — Decisions & Intention*, its *§Planning Rulings*, and its *§Rejected* list. The ones a task leans on: rows cite by ID (D-2); no real row carries an InfoButton, and the examples leave after verification (F-1, G-2); captions stay (F-2); `MenuCaption` becomes `MenuDesc` (F-4); the look's three props are independent, defaulting to `info`, `filled`, and no border (A-2); the dwell is the InfoButton's own 0.5 seconds (B-2); no missing-entry guard; the Resources link lands last.
- **Placements:** as *§Concepts* names them, every one approved by Nathan (H-1); no other new file.
- **Gates:** `npm run typecheck && npm run test && npm run lint` from the repo root; each prints its own failures, and lint runs clean. `npm run build`, confirming `✓ built in`, runs at Task 3-3 (the InfoIndex's `?raw` emit, once rows cite it) and from a clean state at the final head. Pommora's typecheck compiles The Studio's dashboard (`package.json:20`). Biome formats every TS and CSS write, so an edit failing on whitespace means it reformatted: re-read and retry. "Run the gates" in a task means those three.
- **Commits:** each task commits once its VERIFY passes, through `git commit --only -m "…" -- <paths>` after `git add` for new files (*Development-Environment · §Gates & Commits*); messages are past tense and one to three sentences, ending with the session's attribution lines. A Bash command carrying `git` or `gh` can't contain a personal name anywhere, paths included (`no-name-mentions.mjs`). Pommora's post-commit hook pushes `active` and refreshes the dashboard. The Studio's `MenuLeaf.tsx` edit commits in The Studio's repo (Task 1-2).
- **Comments:** docstrings in the house register where a neighbor has one, and a comment only where the code would otherwise be misread; an AFTER block's comments are the ones that land.
- **Tests:** each new behavior gets a test that fails without its change; a rewritten case counts as that test. The InfoPane's pointer rule (Task 3-2), a CSS hit rule jsdom can't apply, is held by the drive's Group 3 instead. The InfoIndex's citation test is written last (D-3), in Task 4-2, while the examples still cite their entries.
- **Docs:** feature docs fix only what's false, in place, at its length or shorter, and the InfoButton gains its description where *§Reconciliation* names; nothing else in `.claude/Features` changes.
- **Temporary:** the four example entries, their citations (`formatRows.ts`, the Date Format roster row's `info` key and `frames.ts`'s `infoFor` import, `AliasesRow.tsx`), the Iteration window's preview, and the drive exist only from Phase 3 or 4 through Phase 5's first task. Nothing else in the plan is temporary.
- **Frozen:** `PickerMenu`'s API and behavior, the InfoPane opening as every dropdown does; the glance, its stylesheet, and its dismissal entry, since each surface holds its own overrides of the editor's chrome (`glance-pane.css`, `page-window.css`, `text-pane.css`, and now `info-button.css`); captions' content; `Core/Sync/`; Project Sapphire.
- **Execution:** the plan runs end to end through `c/plan-execution`, headlessly and overnight: no step waits on Nathan; an ambiguity is taken at its simplest reading and recorded under *§Deviations*, and anything that needs his ruling is recorded there for the final report. Each task goes to an `execution-agent` (`opus-medium`) informed of *§Context* and *§Overview*, which reports insights, concerns, and suggestions rather than diverging; the orchestrator checks its result against the task's AFTER and VERIFY. Every phase ends with its review checkpoint, which dispatches one read-only `opus-high` agent: it loads `code-simplification` and then `adversarial-review`, and it weighs the phase against the Approach, the Principles, and these constraints, reading outward across Core, UIX, and Desktop for twins, duplication, hand-rolling, and odd-ones-out rather than at the diff in isolation, with no implementation running meanwhile; the orchestrator reconciles its findings before the next phase opens. An in-flight call is disclosed in chat and recorded under *§Deviations* only where it changes an outcome. After any compaction, the orchestrator rereads *§Constraints* and `c/plan-execution` from the files before the next task opens, with no stop.
- **Neutral Gate:** the post-implementation neutral reviewer (`fable-high`) gets only the BASELINE head, the head before Phase 5, the Mandate, and this intention: *"Pommora explained its rows only through a one-line caption, which the code named three ways. This work gives the line one name, removes a duplicate Settings row helper, and adds an in-app information mechanism: a small button right after a row's title that opens, on a short rest, a click, or a tap, a dropdown reading one entry of a single Markdown file in which each explanation lives once under an ID that rows cite. The button reuses the kit's button, hover reveal, and dropdown, and the pane renders through the app's read-only Markdown editor, its text taking no pointer but its web links. Four example entries, cited by the property format rows, a Settings row, and a page's Aliases row, carry the work's verification and leave after it; real rows cite their first entries later, so the mechanism ships with no caller."* It answers, without hedging, whether the result holds to every principle under **Mandate**, and what it would correct. Every phase is written so that review passes.

#### Process Overview

- [x] **Phase 1** — One Name for a Caption
  - [x] Task 1-1 · `MenuCaption` becomes `MenuDesc`
  - [x] Task 1-2 · `subLabel` becomes `caption`
  - [x] Task 1-3 · Settings' `hint` becomes `caption`, and `SettingsFieldRow` leaves
  - [x] Review Checkpoint
- [x] **Phase 2** — The InfoButton
  - [x] Task 2-1 · The reveal's dwell, reset, and coarse test
  - [x] Task 2-2 · One fit for a row's accessory
  - [x] Task 2-3 · The InfoButton
  - [x] Task 2-4 · A row's info slot
  - [x] Review Checkpoint
- [x] **Phase 3** — The InfoIndex and Its Pane
  - [x] Task 3-1 · An editor out of the keyboard's reach
  - [x] Task 3-2 · The InfoIndex, its format, and the pane
  - [x] Task 3-3 · The examples
  - [x] Review Checkpoint
- [ ] `[After any compaction: reread §Constraints and c/plan-execution from the files before the next task opens; no stop]`
- [x] **Phase 4** — Verification and the Documents
  - [x] Task 4-1 · The Info Buttons Drive
  - [x] Task 4-2 · The citation test
  - [x] Task 4-3 · The documents
  - [x] Review Checkpoint
- [x] *§Final Verification* over `{baseline}..{head before Phase 5}`, the examples live
- [ ] **Phase 5** — Removal and Wiring
  - [x] Task 5-1 · The examples leave
  - [ ] Task 5-2 · The Resources link
  - [ ] Spotcheck
- [ ] `[Stop: the final report, per §Final Verification]`

---

### Phase 1 — One Name for a Caption

**GOAL:** A row's secondary line reads `caption` from Settings' row text to `MenuItem`'s markup, and the centered empty-pane note reads `MenuDesc`, so the word means one thing in UIX; `SettingsFieldRow` leaves, and every Settings row component takes its whole row. Removal first: the InfoButton's slot lands in Phase 2 on these final names. The phase changes names and one helper's home, not behavior, and the gates prove it.

#### Task 1-1

`MenuCaption` and its style take the name `MenuDesc` and `desc`, freeing `caption` for the row's line before Task 1-2 takes it.

**AFTER**

```UIX/Menus/menu-row.css.ts diff
@@ caption → desc @@

-export const caption = style([
+export const desc = style([
   text.body.standard,
   { padding: '28px 8px', textAlign: 'center', color: c.label.secondary, userSelect: 'none' },
 ])
```

```UIX/Menus/MenuRows.tsx diff
@@ MenuCaption → MenuDesc @@

-export function MenuCaption({ children }: { children: ReactNode }): React.JSX.Element {
-  return <div className={s.caption}>{children}</div>
+export function MenuDesc({ children }: { children: ReactNode }): React.JSX.Element {
+  return <div className={s.desc}>{children}</div>
 }
```

```UIX/Menus/index.ts diff
@@ exports @@

   MenuSeparator,
-  MenuCaption,
+  MenuDesc,
   MenuTopRow,
```

```Core/Interface/Toolbar/OutlineMenu.tsx diff
@@ import, :92 @@

-  MenuCaption,
+  MenuDesc,
 …
-        <MenuCaption>No headings</MenuCaption>
+        <MenuDesc>No headings</MenuDesc>
```

The same two-line change lands in `Core/Properties/Schema/PropertyFrame.tsx` (`:22`, `:99`, "No properties yet."), `Core/Views/Settings/FilterFrame.tsx` (`:17`, `:520`), and `Core/Views/Settings/LocationField.tsx` (`:9`, `:86`).

**VERIFY**

- [ ] `git grep -n "MenuCaption" -- Core UIX` prints nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-2

`MenuItem`'s `subLabel` prop and class become `caption`, so `MenuRowView` passes its row's `caption` straight through. The Studio's dashboard showcase passes the prop by its new name in The Studio's own commit, since Pommora's typecheck compiles it.

**PROCEDURE**

1. Apply the Pommora edits and the dashboard's, and run the gates.
2. Commit `~/The Studio/.claude/dashboard/src/showcase/MenuLeaf.tsx` in The Studio's repo alone, then Pommora's files in Pommora's.

**AFTER**

```UIX/Menus/menu-row.css.ts diff
@@ subLabel → caption @@

-export const subLabel = style([text.caption.standard, { color: c.label.secondary }])
+export const caption = style([text.caption.standard, { color: c.label.secondary }])
```

```UIX/Menus/MenuRows.tsx diff
@@ MenuItemProps @@

   leading?: ReactNode
-  subLabel?: ReactNode
+  caption?: ReactNode
   detail?: ReactNode

@@ MenuItem @@

   leading,
-  subLabel,
+  caption,
   detail,
 …
         <span className={cx(s.titleText, overScrollEllipsis)}>{children}</span>
-        {subLabel != null && <span className={s.subLabel}>{subLabel}</span>}
+        {caption != null && <span className={s.caption}>{caption}</span>}
       </span>
```

```UIX/Menus/MenuIndex.tsx diff
@@ rowNode @@

           leading={row.icon}
-          subLabel={row.caption}
+          caption={row.caption}
           trailing={t && trailingNode(t)}
```

```Core/Interface/Windows/PageReaderWindow.tsx diff
@@ :227, :239 @@

-          subLabel={modifiedAt === null ? undefined : when(modifiedAt)}
+          caption={modifiedAt === null ? undefined : when(modifiedAt)}
 …
-            subLabel={when(ts)}
+            caption={when(ts)}
```

```Core/MarkdownPM/Autocomplete/AutocompletePane.tsx diff
@@ :99 @@

-          subLabel={
+          caption={
```

```~/The Studio/.claude/dashboard/src/showcase/MenuLeaf.tsx diff
@@ :32, :59 @@

-            <MenuItem leading={dashed} subLabel="Sub-label">
+            <MenuItem leading={dashed} caption="Caption">
 …
-              subLabel="Sub-label"
+              caption="Caption"
```

**VERIFY**

- [ ] `git grep -n "subLabel" -- Core UIX` and `grep -rni "subLabel\|sub-label" ~/"The Studio/.claude/dashboard/src"` print nothing.
- [ ] The Studio's commit holds `MenuLeaf.tsx` alone, and Pommora's typecheck passes over the dashboard.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-3

Settings' row text names its secondary line `caption`, `settingsRow` moves beside `RowText` as the one map from a Settings row to a menu row, and `SettingsFieldRow` leaves: the path and clear rows build through `settingsRow`, the exclusions and preview-rules rows hand their label and caption to `ManageRow`, and `NexusRows`' five field rows build through it too. `RowText` gains its `info` field in Task 3-3, with the first Settings citation.

**PROCEDURE**

1. In `Core/Settings/frames.ts` alone, rename every `hint:` key to `caption:` (63, line-anchored) and `RowText.hint` to `caption`.
2. Move `settingsRow`, delete `SettingsFieldRow.tsx`, and apply the edits below.

**AFTER**

```Core/Settings/frames.ts diff
@@ imports @@

 import { TrashFrame } from './TrashFrame'
+import type { MenuRow, Trailing } from '@pommora/uix/Menus'

@@ RowText @@

 export interface RowText {
   label: string
-  hint?: string
+  caption?: string
   when?: (s: SessionState) => boolean
 }
+
+export const settingsRow = (row: RowText, trailing: Trailing): MenuRow => ({
+  kind: 'item',
+  label: row.label,
+  caption: row.caption,
+  trailing,
+})

@@ the roster, 63 keys @@

-            hint: 'How a date reads wherever a column has not chosen its own form.',
+            caption: 'How a date reads wherever a column has not chosen its own form.',
 …
```

```Core/Settings/SettingsWindow.tsx diff
@@ imports @@

 import {
   Menu,
   MenuItem,
   MenuRowView,
   MenuSeparator,
-  type MenuRow,
-  type Trailing,
 } from '@pommora/uix/Menus'
 …
 import {
   type CategoryKey,
   FRAMES,
   frameFor,
   PERCENT,
   type Row,
   type RowOf,
-  type RowText,
+  settingsRow,
 } from './frames'

@@ settingsRow @@

-const settingsRow = (row: RowText, trailing: Trailing): MenuRow => ({
-  kind: 'item',
-  label: row.label,
-  caption: row.hint,
-  trailing,
-})

@@ RowControl @@

     case 'path':
-      return <AssetDirectoryRow label={row.label} hint={row.hint} />
+      return <AssetDirectoryRow row={row} />
     case 'exclusions':
-      return <ExcludedDirectoriesRow label={row.label} hint={row.hint} />
+      return <ExcludedDirectoriesRow row={row} />
     case 'previewRules':
-      return <PreviewRulesRow label={row.label} hint={row.hint} />
+      return <PreviewRulesRow row={row} />
     case 'clear':
-      return <ClearActionRow label={row.label} hint={row.hint} clear={row.clear} />
+      return <ClearActionRow row={row} />
```

```Core/Settings/AssetDirectoryRow.tsx diff
@@ imports @@

 import { PathField } from '@pommora/uix/Fields/PathField'
-import { SettingsFieldRow } from './SettingsFieldRow'
+import { MenuRowView } from '@pommora/uix/Menus'
+import { type RowOf, settingsRow } from './frames'

@@ AssetDirectoryRow @@

-export function AssetDirectoryRow({
-  label,
-  hint,
-}: {
-  label: string
-  hint?: string
-}): React.JSX.Element {
+export function AssetDirectoryRow({ row }: { row: RowOf<'path'> }): React.JSX.Element {
 …
   return (
-    <SettingsFieldRow label={label} hint={hint}>
-      <PathField
-        label={label}
-        value={stored}
-        empty="No folder"
-        onCommit={setDir}
-        onBrowse={browse}
-      />
-    </SettingsFieldRow>
+    <MenuRowView
+      row={settingsRow(row, {
+        kind: 'field',
+        children: (
+          <PathField
+            label={row.label}
+            value={stored}
+            empty="No folder"
+            onCommit={setDir}
+            onBrowse={browse}
+          />
+        ),
+      })}
+    />
   )
```

```Core/Settings/ClearActionRow.tsx diff
@@ ClearActionRow @@

 import { Button } from '@pommora/uix/Buttons/Button'
 import { useTimedLabel } from '@pommora/uix/Animations/useTimedLabel'
-import { SettingsFieldRow } from './SettingsFieldRow'
+import { MenuRowView } from '@pommora/uix/Menus'
+import { type RowOf, settingsRow } from './frames'

-export function ClearActionRow({
-  label,
-  hint,
-  clear,
-}: {
-  label: string
-  hint?: string
-  clear: () => Promise<boolean>
-}): React.JSX.Element {
+export function ClearActionRow({ row }: { row: RowOf<'clear'> }): React.JSX.Element {
   const [buttonLabel, mark] = useTimedLabel('Clear', 'Cleared')
   const run = async (): Promise<void> => {
-    if (await clear()) mark()
+    if (await row.clear()) mark()
   }
   return (
-    <SettingsFieldRow label={label} hint={hint}>
-      <Button type="destructive" label={buttonLabel} onClick={() => void run()} />
-    </SettingsFieldRow>
+    <MenuRowView
+      row={settingsRow(row, {
+        kind: 'field',
+        children: <Button type="destructive" label={buttonLabel} onClick={() => void run()} />,
+      })}
+    />
   )
 }
```

```Core/Settings/ExcludedDirectoriesRow.tsx diff
@@ ExcludedDirectoriesRow @@

+import type { RowOf } from './frames'
 …
-export function ExcludedDirectoriesRow({
-  label,
-  hint,
-}: {
-  label: string
-  hint?: string
-}): React.JSX.Element {
+export function ExcludedDirectoriesRow({ row }: { row: RowOf<'exclusions'> }): React.JSX.Element {
   const count = useSession((s) => s.tree?.config.excluded.length ?? 0)
   return (
-    <ManageRow label={label} hint={hint} count={count}>
+    <ManageRow label={row.label} caption={row.caption} count={count}>
```

```Core/Settings/PreviewRulesRow.tsx diff
@@ PreviewRulesRow @@

+import type { RowOf } from './frames'
 …
-export function PreviewRulesRow({
-  label,
-  hint,
-}: {
-  label: string
-  hint?: string
-}): React.JSX.Element | null {
+export function PreviewRulesRow({ row }: { row: RowOf<'previewRules'> }): React.JSX.Element | null {
 …
-    <ManageRow label={label} hint={hint} count={value.rules?.rules.length ?? 0}>
+    <ManageRow label={row.label} caption={row.caption} count={value.rules?.rules.length ?? 0}>
```

```UIX/Menus/ManageRow.tsx diff
@@ ManageRow @@

 export function ManageRow({
   label,
-  hint,
+  caption,
   icon,
 …
   label: string
-  hint?: string
+  caption?: string
   icon?: IconName
 …
         label,
-        caption: hint,
+        caption,
         trailing: {
```

```Core/Settings/NexusRows.tsx diff
@@ imports @@

-import { SettingsFieldRow } from './SettingsFieldRow'
+import { settingsRow } from './frames'

@@ This Device, Nexus ID, Nexus Password @@

-        <SettingsFieldRow label="This Device">
-          <InputField
-            …
-          </InputField>
-        </SettingsFieldRow>
+        <MenuRowView
+          row={settingsRow({ label: 'This Device' }, { kind: 'field', children: <InputField … /> })}
+        />
       )}
-      <SettingsFieldRow label="Nexus ID">
-        <span className={trailingFigure}>{nexusId}</span>
-      </SettingsFieldRow>
+      <MenuRowView
+        row={settingsRow(
+          { label: 'Nexus ID' },
+          { kind: 'field', children: <span className={trailingFigure}>{nexusId}</span> },
+        )}
+      />

@@ Server, Sync @@

-          <SettingsFieldRow label="Server" hint={binding ? captionFor(binding) : undefined}>
-            <span className={trailingCluster}>
-              …
-            </span>
-          </SettingsFieldRow>
+          <MenuRowView
+            row={settingsRow(
+              { label: 'Server', caption: binding ? captionFor(binding) : undefined },
+              { kind: 'field', children: <span className={trailingCluster}>…</span> },
+            )}
+          />
-          <SettingsFieldRow label="Sync" hint={syncCaption(state.status, clock)}>
-            <Button … />
-          </SettingsFieldRow>
+          <MenuRowView
+            row={settingsRow(
+              { label: 'Sync', caption: syncCaption(state.status, clock) },
+              { kind: 'field', children: <Button … /> },
+            )}
+          />
```

Nexus Password's field row takes the same form as This Device's; the file's inert rows (the keychain row and the device list) stay literal, since `settingsRow` builds a labeled control row and they carry none.

```Core/Settings/ExclusionRows.test.tsx diff
@@ :30 @@

-    root.render(<ExcludedDirectoriesRow label="Excluded Directories" hint="h" />),
+    root.render(<ExcludedDirectoriesRow row={{ kind: 'exclusions', label: 'Excluded Directories' }} />),
```

```Core/Settings/PreviewRulesRow.test.tsx diff
@@ :39-44 @@

       <PreviewRulesRow
-        label="Open In Preview"
-        hint="Pages matching these rules open within preview windows by default."
+        row={{
+          kind: 'previewRules',
+          label: 'Open In Preview',
+          caption: 'Pages matching these rules open within preview windows by default.',
+        }}
       />,
```

**VERIFY**

- [ ] `Core/Settings/SettingsFieldRow.tsx` is gone and `git grep -n "SettingsFieldRow" -- Core UIX` prints nothing.
- [ ] `git grep -c "caption:" -- Core/Settings/frames.ts` reads 64 (the roster's 63 and `settingsRow`'s), and `git grep -n "hint" -- Core/Settings UIX/Menus` prints nothing.
- [ ] Run the gates; `ExclusionRows.test.tsx` and `PreviewRulesRow.test.tsx` pass.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Among UIX's props and components, `caption` names only a row's secondary line (the type ramp's `caption` step and icon size are type tokens); `MenuDesc` names the centered note; `hint` survives only as a field's value affix (`EditableInput`, `FieldPicker`).
- [ ] Every Settings row component takes its whole row; `settingsRow` is the only map from a labeled Settings control to a menu row, `NexusRows`' five field rows included.
- [ ] Every Settings frame and the Nexus rows draw exactly as at the baseline (captions, controls, the Sync and Server captions).

### Phase 2 — The InfoButton

**GOAL:** The InfoButton exists in Core, and a row can carry one right after its title; UIX gains no file. The kit pieces it reuses gain exactly what it needs first, each complete and testable on its existing callers: the hover reveal takes its dwell from its caller, hands back `reset`, and exports its coarse-pointer test, and a row accessory's fit becomes one class the accessory composes. Then the button, built from the kit's button, hover reveal, and dropdown and proven by its tests apart from any row; then the generic slot UIX's row gains, a separate task because it changes `MenuItem`, every row's renderer.

#### Task 2-1

`useHoverReveal` takes `dwellMs` in place of `dwell`, so a reveal dwells for its caller's duration; the title-search hint and the ViewTile strip pass `REVEAL_DWELL_MS` and keep 1.5 seconds. It returns `reset`, which closes the reveal and forgets the pointer, and it exports `coarse`, the app's one coarse-pointer test.

**PROCEDURE**

1. Write the two new `hoverReveal.test.tsx` cases and watch them fail.
2. Apply the edits below.

**AFTER**

```UIX/Interactions/hoverReveal.ts diff
@@ coarse @@

-const coarse = (): boolean => window.matchMedia?.('(hover: none)').matches === true
+export const coarse = (): boolean => window.matchMedia?.('(hover: none)').matches === true

@@ HoverReveal @@

   /** Called by a toggle's own press, before it flips `engaged`. */
   press: () => void
+  /** Closes the reveal now and forgets the pointer, as a dismissal does. */
+  reset: () => void
 }

-// A dwell opens on REVEAL_DWELL_MS and closes on the grace. …
+// A dwell opens on the caller's `dwellMs` and closes on the grace. …
 export function useHoverReveal({
   active = true,
-  dwell = false,
+  dwellMs,
   held = false,
 …
   active?: boolean
-  dwell?: boolean
+  dwellMs?: number
   held?: boolean
 …
   const live = useRef({
     on,
     held,
-    dwell,
+    dwellMs,
 …
-  Object.assign(live.current, { on, held, dwell })
+  Object.assign(live.current, { on, held, dwellMs })

@@ settle @@

-      const open = s.on ? s.inside || s.held || s.hold !== null : s.dwell && s.inside && !s.holding
+      const open = s.on
+        ? s.inside || s.held || s.hold !== null
+        : s.dwellMs !== undefined && s.inside && !s.holding
 …
-        open ? REVEAL_DWELL_MS : REVEAL_GRACE_MS,
+        // Only the closed branch opens, and only with a dwell.
+        open ? s.dwellMs : REVEAL_GRACE_MS,

@@ flip @@

-      setOn(s.dwell || side !== undefined)
+      setOn(s.dwellMs !== undefined || side !== undefined)

@@ effects and return @@

+  const dwells = dwellMs !== undefined
   useEffect(() => {
-    if (!dwell) return
+    if (!dwells) return
 …
-  }, [held, dwell])
+  }, [held, dwells])
 …
   useEffect(() => {
-    if (!dwell) return
+    if (!dwells) return
 …
-  }, [api, dwell])
+  }, [api, dwells])

-  return { on: dwell && coarse() ? active : active && on, hover: api.hover, press: api.press }
+  return {
+    on: dwells && coarse() ? active : active && on,
+    hover: api.hover,
+    press: api.press,
+    reset: api.reset,
+  }
```

```Core/Interface/Header/DetailTitleHeader.tsx diff
@@ the hint @@

   const hint = useHoverReveal({
     active: search !== undefined && !searching && !editing,
-    dwell: true,
+    dwellMs: REVEAL_DWELL_MS,
   })
```

```Core/Tiles/Surfaces/ViewTile.tsx diff
@@ the strip @@

   const reveal = useHoverReveal({
-    dwell: true,
+    dwellMs: REVEAL_DWELL_MS,
     held: !viewsShown && anchoredOpen,
```

Each imports `REVEAL_DWELL_MS` from `@pommora/uix/Interactions/hoverReveal` beside `useHoverReveal`.

```UIX/Interactions/hoverReveal.test.tsx diff
@@ beforeEach @@

-  props = { active: true, dwell: true, held: false }
+  props = { active: true, dwellMs: REVEAL_DWELL_MS, held: false }

@@ useHoverReveal with a dwell @@

+  it("opens on the caller's own dwell", async () => {
+    await render({ dwellMs: 500 })
+    await run(() => api.hover(true))
+    await tick(499)
+    expect(api.on).toBe(false)
+    await tick(1)
+    expect(api.on).toBe(true)
+  })
+
+  it('reset closes an open reveal at once and forgets the pointer', async () => {
+    await run(() => api.hover(true))
+    await tick(REVEAL_DWELL_MS)
+    expect(api.on).toBe(true)
+    await run(() => api.reset())
+    expect(api.on).toBe(false)
+    await pointer('pointerdown')
+    await pointer('pointerup')
+    await tick(REVEAL_DWELL_MS)
+    expect(api.on).toBe(false)
+  })

@@ useHoverReveal without a dwell @@

-    await render({ dwell: false, engaged: false })
+    await render({ dwellMs: undefined, engaged: false })
```

**VERIFY**

- [ ] The two new cases fail before the hook's edit and pass after; every existing case passes unchanged in substance, the touch cases (`:191`, `:269`) included.
- [ ] `git grep -n "dwell: \(true\|false\)\|dwell = false\|s\.dwell &&\|s\.dwell ||" -- Core UIX` prints nothing.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-2

A row accessory's width and its overhang into the row's padding become one class, `rowAccessory`, which `accessoryButton` composes beneath its own tertiary ink; every style that composes `accessoryButton` today (`EyeToggle`'s, the option row's edit button, the image picker's corner glyphs) keeps both, and the InfoButton wears `rowAccessory` alone in Task 2-3, so the fit is written once while the ink stays the accessory's.

**AFTER**

```UIX/Menus/menu-row.css.ts diff
@@ accessoryButton @@

-/** A row's accessory overhangs into the row's padding, so an eye or × row stands as tall as a plain one. */
-export const accessoryButton = style({
+/** A row's accessory overhangs into the row's padding, so a row carrying one stands as tall as a plain one. */
+export const rowAccessory = style({
   width: '20px',
-  color: c.label.tertiary,
   selectors: {
-    '&&:disabled': { opacity: STATE_OPACITY.ghost },
     [`${rowBox} &`]: {
       marginBlock: 'max(calc(-1 * var(--row-pad-y)), calc((var(--row-line) - var(--btn-h)) / 2))',
     },
   },
 })
+
+export const accessoryButton = style([
+  rowAccessory,
+  { color: c.label.tertiary, selectors: { '&&:disabled': { opacity: STATE_OPACITY.ghost } } },
+])
```

**VERIFY**

- [ ] Every accessory measures as at the baseline, 20px wide with its row's height unchanged: an `AccessoryButton` (a ×, a footing's create, a row's trailing button), an `EyeToggle` in the Visibility frame, an option row's edit button, and an image picker's corner glyph.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-3

The InfoButton lives in `Core/Info/`, beside the pane it opens, and reaches UIX only through the kit's exports, as Core does everywhere; UIX gains no InfoButton file. It's a `Button` at the inline size wearing `rowAccessory`, its type, border, and glyph its props, named "Title - Info." A host span around the glyph and its `PickerMenu` carries the hover, so the pane, a child of the host in React's tree, keeps it alive as the pointer crosses in; the host also stops clicks, so neither the glyph's nor the pane's reach a clickable row. With a cursor the reveal dwells 500 ms and graces 150 ms; on a coarse screen it gets no dwell, so it never rests open and a tap's click opens it. A click holds the pane, a second click, Escape, or an outside press closes it through one `close`, and a module slot closes whichever pane was open when another opens. The host's pointer rule, which its glyph inherits, keeps the glyph reachable on a disabled row, dimmed with the row. The three glyphs A-2 names join the icon registry, since `IconName` is the registry's keys and an uncurated name draws the placeholder until the full set loads (`UIX/Symbols/index.tsx:208`, `:242-249`).

**PROCEDURE**

1. Write `Core/Info/InfoButton.test.tsx` below and watch it fail.
2. Write the component and its stylesheet, and register the glyphs.

**AFTER**

```Core/Info/InfoButton.tsx diff
+import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
+import { Button, type ButtonType } from '@pommora/uix/Buttons/Button'
+import { coarse, useHoverReveal } from '@pommora/uix/Interactions/hoverReveal'
+import { rowAccessory } from '@pommora/uix/Menus/menu-row.css'
+import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
+import type { IconName } from '@pommora/uix/Symbols'
+import './info-button.css'
+
+const INFO_DWELL_MS = 500 // KNOB
+
+// One pane shows at a time: an opening pane closes whichever was open, which the dismissal stack doesn't do, closing only on presses and Escape.
+let shown: (() => void) | null = null
+
+type InfoLook = { icon?: IconName; type?: ButtonType; outline?: boolean }
+
+/** The glyph a row carries after its title, opening the row's explanation: resting on it opens the pane, a click holds it open, and a tap opens it on touch. */
+export function InfoButton({
+  title,
+  icon = 'info',
+  type = 'filled',
+  outline = false,
+  children,
+}: { title: string; children: ReactNode } & InfoLook): React.JSX.Element {
+  const [held, setHeld] = useState(false)
+  const triggerRef = useRef<HTMLButtonElement>(null)
+  // A dwelling reveal rests open on a touch screen, so there the pane takes no dwell and opens on a tap alone.
+  const { on, hover, reset } = useHoverReveal({ dwellMs: coarse() ? undefined : INFO_DWELL_MS })
+  const open = held || on
+  const close = useCallback((): void => {
+    setHeld(false)
+    reset()
+  }, [reset])
+  useEffect(() => {
+    if (!open) return
+    shown?.()
+    shown = close
+    return () => {
+      if (shown === close) shown = null
+    }
+  }, [open, close])
+  return (
+    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a hover host and a click boundary; the glyph inside is the keyboard's control
+    <span
+      className="info-button"
+      onPointerEnter={() => hover(true)}
+      onPointerLeave={() => hover(false)}
+      onClick={(e) => e.stopPropagation()}
+    >
+      <Button
+        ref={triggerRef}
+        type={type}
+        outline={outline}
+        size="button-inline"
+        paddingX="0"
+        icon={icon}
+        pressed={open}
+        className={rowAccessory}
+        aria-label={`${title} - Info`}
+        onClick={() => (held ? close() : setHeld(true))}
+      />
+      <PickerMenu
+        open={open}
+        onDismiss={close}
+        triggerRef={triggerRef}
+        focus="keep"
+        contentClassName="info-pane"
+      >
+        {children}
+      </PickerMenu>
+    </span>
+  )
+}
```

```Core/Info/info-button.css diff
+/* A disabled row takes the pointer from its contents; the host takes it back for its glyph, so the row's explanation stays reachable. */
+.info-button {
+  display: inline-flex;
+  pointer-events: auto;
+}
+/* The pane's size is its own, as the text pane's is (`text-pane.css`), so its contents bring their own inset. */
+.info-pane {
+  width: 285px; /* KNOB */
+  padding: 0;
+}
```

```UIX/Symbols/index.tsx diff
@@ imports, in the list's order @@

+  CircleAlert,
+  CircleQuestionMark,
 …
+  Info,

@@ icons @@

   'triangle-alert': TriangleAlert,
+  info: Info,
+  'circle-question-mark': CircleQuestionMark,
+  'circle-alert': CircleAlert,
```

```Core/Info/InfoButton.test.tsx diff
+// @vitest-environment jsdom
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { REVEAL_GRACE_MS } from '@pommora/uix/Interactions/hoverReveal'
+import { InfoButton } from './InfoButton'
+;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
+
+let host: HTMLDivElement
+let root: Root
+const clicked = vi.fn()
+
+const stubCoarse = (matches: boolean): void => {
+  window.matchMedia = ((query: string) => ({ matches: matches && query === '(hover: none)' })) as never
+}
+const render = (): Promise<void> =>
+  act(async () =>
+    root.render(
+      // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a clickable row's stand-in
+      <div onClick={clicked}>
+        <InfoButton title="Label Format">
+          <p data-id="label">Label</p>
+        </InfoButton>
+        <InfoButton title="Value Format">
+          <p data-id="value">Value</p>
+        </InfoButton>
+      </div>,
+    ),
+  )
+const glyph = (title: string): HTMLButtonElement =>
+  document.querySelector(`button[aria-label="${title} - Info"]`) as HTMLButtonElement
+const isOpen = (title: string): boolean => glyph(title).getAttribute('aria-pressed') === 'true'
+const pane = (id: string): HTMLElement => document.querySelector(`[data-id="${id}"]`) as HTMLElement
+const run = async (fn: () => void): Promise<void> => {
+  await act(async () => fn())
+}
+const tick = (ms: number): Promise<void> => run(() => vi.advanceTimersByTime(ms))
+const move = (type: 'pointerover' | 'pointerout', el: Element, relatedTarget: Element): Promise<void> =>
+  run(() => el.dispatchEvent(new PointerEvent(type, { bubbles: true, relatedTarget })))
+const enter = (el: Element): Promise<void> => move('pointerover', el, document.body)
+const leave = (el: Element): Promise<void> => move('pointerout', el, document.body)
+const pressEsc = (): Promise<void> =>
+  run(() =>
+    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })),
+  )
+
+beforeEach(async () => {
+  vi.useFakeTimers()
+  stubCoarse(false)
+  clicked.mockReset()
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+  await render()
+})
+afterEach(async () => {
+  await act(async () => root.unmount())
+  host.remove()
+  vi.useRealTimers()
+})
+
+describe('the InfoButton', () => {
+  it('opens on a half-second rest', async () => {
+    await enter(glyph('Label Format'))
+    await tick(499)
+    expect(isOpen('Label Format')).toBe(false)
+    await tick(1)
+    expect(isOpen('Label Format')).toBe(true)
+  })
+
+  it('stays open as the pointer crosses into its pane, and closes on the grace once it leaves', async () => {
+    await enter(glyph('Label Format'))
+    await tick(500)
+    await move('pointerout', glyph('Label Format'), pane('label'))
+    await tick(REVEAL_GRACE_MS)
+    expect(isOpen('Label Format')).toBe(true)
+    await leave(pane('label'))
+    await tick(REVEAL_GRACE_MS)
+    expect(isOpen('Label Format')).toBe(false)
+  })
+
+  it('holds on a click past a leave, and a second click closes it', async () => {
+    await run(() => glyph('Label Format').click())
+    await leave(glyph('Label Format'))
+    await tick(REVEAL_GRACE_MS)
+    expect(isOpen('Label Format')).toBe(true)
+    await run(() => glyph('Label Format').click())
+    expect(isOpen('Label Format')).toBe(false)
+  })
+
+  it('closes on Escape while the pointer still rests on it', async () => {
+    await enter(glyph('Label Format'))
+    await tick(500)
+    await pressEsc()
+    expect(isOpen('Label Format')).toBe(false)
+  })
+
+  it('shows one pane at a time', async () => {
+    await run(() => glyph('Label Format').click())
+    await enter(glyph('Value Format'))
+    await tick(500)
+    expect(isOpen('Value Format')).toBe(true)
+    expect(isOpen('Label Format')).toBe(false)
+  })
+
+  it('opens on a tap under (hover: none), and never on a rest', async () => {
+    stubCoarse(true)
+    await render()
+    await enter(glyph('Label Format'))
+    await tick(1000)
+    expect(isOpen('Label Format')).toBe(false)
+    await run(() => glyph('Label Format').click())
+    expect(isOpen('Label Format')).toBe(true)
+  })
+
+  it("keeps the glyph's and the pane's clicks from the row beneath", async () => {
+    await run(() => glyph('Label Format').click())
+    await run(() => pane('label').click())
+    expect(clicked).not.toHaveBeenCalled()
+  })
+})
```

**VERIFY**

- [ ] Every `InfoButton.test.tsx` case fails before the component exists and passes after; `glyph` finding "Label Format - Info" pins the accessible name in every case. A held pane's Escape and an outside press are `PickerMenu`'s and the dismissal stack's, already pinned there (`UIX/Pickers/PickerMenu.test.tsx`, `UIX/Interactions/dismissalStack.test.tsx`).
- [ ] `INFO_DWELL_MS` and the pane's `285px` are each written once in `Core/Info/`, both marked `KNOB`.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-4

`MenuItem` takes `info`, what a row shows right after its title (Core's InfoButton, for one), and `MenuRow`'s item branch carries it through `rowNode`; the slot is generic, and nothing in UIX names the InfoButton. A row carrying one lays its title out as a line, so the glyph sits right after the text and pins to the line's end once a long title ellipsizes (the title's cap carries `min-width: 0`, `UIX/Interactions/over-scroll.css:3`); every other title keeps filling its row, as a rename's field (`titleInput`, `width: 100%`) needs, so their markup doesn't change. A disabled row stays unwashed, and reveals none of its controls, when the pointer rests on a control inside it that takes the pointer back, as the InfoButton does.

**PROCEDURE**

1. Add the `MenuIndex.test.tsx` case below and watch it fail.
2. Apply the edits below.

**AFTER**

```UIX/Menus/menu-row.css.ts diff
@@ titleText @@

 export const titleText = style({ vars: { '--scroll-fade': 'var(--fade-base)' } })
+
+/** A title with something after it (a row's `info`) runs as a line, so that sits right after the text; every other title fills its row, as a rename's field needs. */
+export const titleLine = style({ display: 'flex', alignItems: 'center', gap: '4px' })

@@ rowDisabled @@

+/** A disabled row takes no pointer, no wash, and no reveal, even when a control inside it takes the pointer back, as a row's information button does. */
 export const rowDisabled = style({
   selectors: {
-    '&&': { opacity: STATE_OPACITY.inactive, pointerEvents: 'none' },
+    '&&': {
+      opacity: STATE_OPACITY.inactive,
+      pointerEvents: 'none',
+      vars: { '--reveal': '0', '--reveal-hits': 'none' },
+    },
+    '&&:hover': { backgroundColor: 'transparent' },
   },
 })
```

```UIX/Menus/MenuRows.tsx diff
@@ MenuItemProps @@

   caption?: ReactNode
+  info?: ReactNode
   detail?: ReactNode

@@ MenuItem @@

   caption,
+  info,
   detail,
 …
+  const title = <span className={cx(s.titleText, overScrollEllipsis)}>{children}</span>
   return (
 …
       <span className={cx(s.titleWrap, centered && s.titleCentered)}>
-        <span className={cx(s.titleText, overScrollEllipsis)}>{children}</span>
+        {info == null ? (
+          title
+        ) : (
+          <span className={s.titleLine}>
+            {title}
+            {info}
+          </span>
+        )}
         {caption != null && <span className={s.caption}>{caption}</span>}
       </span>
```

```UIX/Menus/MenuIndex.tsx diff
@@ MenuRow @@

       label: ReactNode
       caption?: ReactNode
+      info?: ReactNode
       trailing?: Trailing

@@ rowNode @@

           caption={row.caption}
+          info={row.info}
           trailing={t && trailingNode(t)}
```

```UIX/Menus/MenuIndex.test.tsx diff
@@ the info slot @@

+describe('a row carrying info', () => {
+  it('draws the button inside the title line, after the title', () => {
+    row({ kind: 'item', label: 'Format', info: <i data-id="info" /> })
+    const line = host.querySelector('[class*="titleText"]')?.parentElement
+    expect(line?.className).toContain('titleLine')
+    expect(line?.lastElementChild?.getAttribute('data-id')).toBe('info')
+  })
+
+  it('draws a row without info as a bare title', () => {
+    row({ kind: 'item', label: 'Format' })
+    expect(host.querySelector('[class*="titleLine"]')).toBeNull()
+  })
+})
```

**VERIFY**

- [ ] The first case fails before the edit and both pass after; `MenuIndex.test.tsx:117` passes unchanged.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] The title-search hint and the ViewTile strip dwell 1.5 seconds and rest open on touch, as at the baseline; every accessory measures as it did.
- [ ] The InfoButton's behavior lives in its one file, its reveal from the hook, its pane from `PickerMenu`, its fit from `rowAccessory`; nothing restates any of them.
- [ ] Every existing row renders the markup it rendered at the baseline; a sidebar rename's field still fills its row, and the slot's two shapes carry their reason in `titleLine`'s docstring.

### Phase 3 — The InfoIndex and Its Pane

**GOAL:** Rows can cite entries: the editor gains its opt-out of the keyboard's reach, the InfoIndex holds the entries and is read once when its module loads, `infoFor` hands a row an InfoButton whose pane shows the entry's read-only Markdown with no hover behavior, and the four examples make it visible on the Label Format, Value Format, Date Format, and Aliases rows and in the Iteration window.

#### Task 3-1

`MarkdownEditor` takes `selectable` (default true); false adds `EditorView.editable.of(false)` and the press claim below, and every other editor carries neither, since true is the facet's own default and nothing else in the tree provides it. False makes `.cm-content` `contenteditable="false"`, which takes it out of tab order and lets `body`'s `user-select: none` apply (`Core/Interface/styles.css:30-38`), so Tab and ⌘A can't reach it, and a lowest-precedence `mousedown` claim keeps a press that reaches the text (a double or shifted press on a link, which the link handlers hand back) from starting CodeMirror's mouse selection, which would blur whatever held focus. The pointer half belongs to the surface, as each surface keeps its own overrides of the editor: the InfoPane's stylesheet takes it (Task 3-2). Every other editor keeps its selectable read-only content.

**PROCEDURE**

1. Write the new `readOnlySelection.test.tsx` case and watch it fail.
2. Apply the edits below.

**AFTER**

```Core/MarkdownPM/MarkdownEditor.tsx diff
@@ Props @@

   readOnly?: boolean
+  /** False takes the content out of the keyboard's reach and out of selection: a press on it selects nothing and moves no focus, after the link handlers have read it. Read once, at mount. */
+  selectable?: boolean
   edgeFade?: boolean

@@ MarkdownEditor @@

   readOnly = false,
+  selectable = true,
   edgeFade = false,

@@ extensions @@

     const extensions = [
       readOnlyGate.current.of(EditorState.readOnly.of(lastReadOnly.current)),
+      selectable ? [] : [EditorView.editable.of(false), claimPresses],

@@ beside WARM_FIELDS @@

+const claimPresses = Prec.lowest(
+  EditorView.domEventHandlers({
+    mousedown: (event) => {
+      event.preventDefault()
+      return true
+    },
+  }),
+)
```

```Core/MarkdownPM/readOnlySelection.test.tsx diff
@@ the selectable case @@

-// A read-only portal must stay SELECTABLE: …
+// A read-only portal stays SELECTABLE unless it opts out: …
 describe('read-only portal keeps its content selectable', () => {
 …
 })
+
+describe('an unselectable editor keeps its content out of reach', () => {
+  it("leaves .cm-content out of the keyboard's reach", async () => {
+    const view = await mountEditor({ initialBody: 'hello world', readOnly: true, selectable: false })
+    expect(view.contentDOM.getAttribute('contenteditable')).toBe('false')
+  })
+
+  it('claims a press on it, so a double press moves no focus', async () => {
+    const view = await mountEditor({ initialBody: 'hello world', readOnly: true, selectable: false })
+    const held = document.body.appendChild(document.createElement('button'))
+    held.focus()
+    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 2 }))
+    expect(document.activeElement).toBe(held)
+    held.remove()
+  })
+})
```

**VERIFY**

- [ ] The two new cases fail before the edit and pass after; the existing describes pass unchanged, every selectable editor carrying nothing new.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-2

`Core/Info/infoIndex.ts` owns the InfoIndex's format: it reads the file through `?raw` and parses it once into `ENTRIES`, its entries by ID (a tag line naming a kebab-case ID, the Markdown, and its closing tag line, either tag line tolerating trailing spaces an editor leaves; headings and anything between entries are the file's own), with no React and no editor in its imports, so the format's test loads text alone. `InfoButton.tsx` gains `infoFor(id, title, look?)` and the pane's contents, a private `Entry` that runs `MarkdownEditor` as the history reader does (`Core/Interface/Windows/PageReaderWindow.tsx:113-120`): read-only, unselectable, under an inert host with no connections, so `[[links]]` carry no meaning and embeds don't build. `PickerMenu` renders nothing closed (`UIX/Pickers/PickerMenu.tsx:305`), so a frame of citing rows builds no host and no editor until a pane opens. `info-button.css` gains the pane's overrides of the editor's chrome, as each surface's own stylesheet holds them (`glance-pane.css`, `page-window.css`, `text-pane.css`): no rail, the scroller capped and scrolling, the content's inset, and the pointer rule. The pane's text and everything inside it take no pointer, so the pane has no hover behavior at all, with a pointer or on touch: a press lands on the scroller, nothing reveals, no reveal can hand a control the pointer back, and nothing selects, focuses, copies, or starts a gesture. A web link in the prose takes the pointer back and follows on `click` (`Core/MarkdownPM/Gestures/pointerPath.ts:82`), its `mousedown` claimed before CodeMirror's own, so focus stays where it was; a link in a table cell stays out, since in the pane it has nothing to follow (`Core/MarkdownPM/Tables/cellStatic.tsx:648`). The scroller keeps the pointer, so the wheel still scrolls, and a code line wider than the pane follows the reader's Scroll Long Lines In Code Blocks setting, as in every editor: it wraps by default, and with the setting on it rests clipped at its ellipsis. A link's pointer still reaches the editor's own reveal tracking, so the pane holds every reveal host inside it shut. A cited entry that's missing or empty opens an empty pane, which D-3's test keeps from landing, and the placeholder host list hides "Click to type" there. The InfoIndex holds the examples, in Claude's wording: `label-format` and `value-format` below, and `date-format` and `aliases` in the same shape. Every one of the four exercises every construct the editor draws but a heading, which an entry never carries since the row's title already names what the pane explains: bold, italic, strikethrough, `==highlights==`, inline code, a bulleted list with a nested level, a numbered list, a checklist, a quote, a callout, a table (one with a link in a cell), a code block with a long line, a web link in the prose, a divider, and a body long enough to scroll; the two below are the minimum shape, and the executor fills each entry out to that list.

**AFTER**

```Core/Info/infoIndex.ts diff
+import infoIndex from './InfoIndex.md?raw'
+
+const ENTRY = /^<([a-z0-9]+(?:-[a-z0-9]+)*)>[ \t]*\r?\n([\s\S]*?)\r?\n<\/\1>[ \t]*$/gm
+
+/** An InfoIndex's entries by ID: each a tag line naming the ID, its Markdown, and the closing tag line; headings and anything between entries are the file's own. */
+export const parseInfoIndex = (text: string): Map<string, string> =>
+  new Map([...text.matchAll(ENTRY)].map(([, id, body]) => [id, body.trim()]))
+
+/** The InfoIndex's entries, read once when the module loads. */
+export const ENTRIES = parseInfoIndex(infoIndex)
```

```Core/Info/InfoButton.tsx diff
@@ imports @@

+import { MarkdownEditor } from '../MarkdownPM/MarkdownEditor'
+import { useEditorHost } from '../Pages/editorHost'
+import { ENTRIES } from './infoIndex'

@@ after InfoButton @@

+/** The InfoButton a row carries for the InfoIndex entry its ID names. */
+export const infoFor = (id: string, title: string, look?: InfoLook): React.JSX.Element => (
+  <InfoButton title={title} {...look}>
+    <Entry body={ENTRIES.get(id) ?? ''} />
+  </InfoButton>
+)
+
+function Entry({ body }: { body: string }): React.JSX.Element {
+  const host = useEditorHost({ inert: true })
+  return <MarkdownEditor initialBody={body} onChange={() => {}} host={host} readOnly selectable={false} />
+}
```

```Core/Info/info-button.css diff
@@ the pane @@

 .info-pane {
   width: 285px; /* KNOB */
   padding: 0;
+  --rail-inset: 0px;
 }
+.info-pane .cm-scroller {
+  max-height: 320px; /* KNOB */
+  /* biome-ignore lint/complexity/noImportantStyles: must beat CM6's runtime overflow rule. */
+  overflow-x: hidden !important;
+  /* biome-ignore lint/complexity/noImportantStyles: as above. */
+  overflow-y: auto !important;
+}
+/* KNOB — the pane's interior inset. */
+.info-pane .mdpm-editor .cm-content {
+  padding: 12px 14px;
+}
+/* The pane's text takes no pointer, so nothing in it hovers, reveals, selects, focuses, copies, or starts a gesture, with a pointer or on touch; its prose's web links keep theirs, and nothing they pass near reveals. */
+.info-pane .mdpm-editor .cm-content,
+.info-pane .mdpm-editor .cm-content * {
+  pointer-events: none;
+}
+.info-pane .mdpm-editor .cm-line :is(.md-link, .md-link *) {
+  pointer-events: auto;
+}
+.info-pane .mdpm-editor [data-reveal-host] {
+  --reveal: 0;
+}
```

```Core/MarkdownPM/markdown-pm.css diff
@@ the placeholder's hosts @@

-:is(.tile.is-locked, .tile-base.is-inert, .page-reader-page, .glance-body) .cm-placeholder {
+:is(.tile.is-locked, .tile-base.is-inert, .page-reader-page, .glance-body, .info-pane) .cm-placeholder {
```

````Core/Info/InfoIndex.md diff
+<label-format>
+
+A property shows its **label** in the app and writes its **key** into each page's metadata. Label Format decides how the key is spelled from the label:
+
+- **Match Title** writes the label as it reads.
+- The *conventions* rewrite it, such as `lowercase` or `kebab-case`.
+
+Changing it renames the key in every page that holds the property.
+
+</label-format>
+
+<value-format>
+
+Value Format spells each option's key from its label, as Label Format does for the property itself.
+
+1. Pick a convention.
+2. Every page holding an option is rewritten to its new key.
+3. Views, filters, and tiles keep working.
+
+> A change counts the pages it rewrites before it runs.
+
+| Label | `kebab-case` |
+| ----- | ------------ |
+| In Progress | `in-progress` |
+| Done | `done` |
+| Learn More | [CommonMark](https://commonmark.org/help/) |
+
+```text
+Status: in-progress
+Status: in-progress  # the key a page stores for the In Progress option, whatever its label reads
+```
+
+Formatting follows [CommonMark](https://commonmark.org/help/). The rest of this entry runs long enough to scroll: an option keeps its label wherever the app shows it, its key wherever a page stores it, and a format change moves only the key, so a view that names the option by its label reads it unchanged before and after the change. A page another app wrote keeps its own spelling until the property's adoption reads it.
+
+</value-format>
````

**VERIFY**

- [ ] `git grep -n "?raw" -- Core UIX Desktop` prints only `infoIndex.ts`; `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` pass.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-3

The Label Format and Value Format rows cite their examples, adding `info` to the item row `pickerRow` builds; Settings' Date Format row cites `date-format` through `RowText.info`, which `settingsRow` passes to its row and the exclusions and preview-rules rows pass to `ManageRow`; and a page's Aliases row cites `aliases` through `ManageRow`'s new `info`. `RowText.info` with its three pass-throughs and `ManageRow.info` are the slots Settings rows and managed lists cite through, and stay, so every citation is one `infoFor('id', 'Title')` call; the citations themselves are temporary. With a Settings row citing, a frame switch or the window's exit can unmount an open pane mid-exit, which `PickerMenu`'s dev guard logs as `ManageRow`'s pane already does; the drive records it. The Iteration window holds a disabled citing row and the look's variants, the three glyphs and every type with and without a border, for the drive. All of it is temporary and leaves in Task 5-1.

**AFTER**

```Core/Properties/Schema/formatRows.ts diff
@@ imports @@

+import type { ReactNode } from 'react'
+import { infoFor } from '../../Info/InfoButton'

@@ formatRows @@

   const row = (
     glyph: IconName,
     label: string,
     value: KeyFormat | undefined,
     change: (format: KeyFormat) => FormatChange,
+    info: ReactNode,
-  ): MenuRow =>
-    pickerRow(
+  ): MenuRow => {
+    const built = pickerRow(
       glyph,
       label,
       value ?? DEFAULT_KEY_FORMAT,
       FORMAT_OPTIONS,
       (v: KeyFormat) => onPick(change(v)),
       { inert: true },
     )
+    return built.kind === 'item' ? { ...built, info } : built
+  }
-  const label = row('metadata-label', 'Label Format', def.key_format, (key_format) => ({
-    key_format,
-  }))
+  const label = row(
+    'metadata-label',
+    'Label Format',
+    def.key_format,
+    (key_format) => ({ key_format }),
+    infoFor('label-format', 'Label Format'),
+  )
 …
-        row('layout-list', 'Value Format', def.value_format, (value_format) => ({ value_format })),
+        row(
+          'layout-list',
+          'Value Format',
+          def.value_format,
+          (value_format) => ({ value_format }),
+          infoFor('value-format', 'Value Format'),
+        ),
```

```Core/Settings/frames.ts diff
@@ imports @@

+import { infoFor } from '../Info/InfoButton'
+import type { ReactNode } from 'react'

@@ RowText @@

   caption?: string
+  info?: ReactNode
   when?: (s: SessionState) => boolean

@@ settingsRow @@

   caption: row.caption,
+  info: row.info,
   trailing,

@@ the Date Format row (temporary) @@

             label: 'Date Format',
             caption: 'How a date reads wherever a column has not chosen its own form.',
+            info: infoFor('date-format', 'Date Format'),
```

```Core/Settings/ExcludedDirectoriesRow.tsx diff
-    <ManageRow label={row.label} caption={row.caption} count={count}>
+    <ManageRow label={row.label} caption={row.caption} info={row.info} count={count}>
```

The same `info={row.info}` lands in `PreviewRulesRow.tsx`, so every Settings row that takes its `RowText` carries its `info`.

```UIX/Menus/ManageRow.tsx diff
@@ ManageRow @@

   caption,
+  info,
   icon,
 …
   caption?: string
+  info?: ReactNode
   icon?: IconName
 …
         caption,
+        info,
         trailing: {
```

```Core/Pages/AliasesRow.tsx diff
@@ imports @@

+import { infoFor } from '../Info/InfoButton'

@@ AliasesRow (temporary) @@

-    <ManageRow label="Aliases" icon={ALIAS_ICON} count={aliases.length} solid menu>
+    <ManageRow
+      label="Aliases"
+      icon={ALIAS_ICON}
+      count={aliases.length}
+      info={infoFor('aliases', 'Aliases')}
+      solid
+      menu
+    >
```

```Core/Interface/Windows/IterationWindow.tsx diff
@@ imports @@

+import { Menu, MenuItem } from '@pommora/uix/Menus'
+import { infoFor } from '../../Info/InfoButton'
+
+const VARIANTS = [
+  ...(['info', 'circle-question-mark', 'circle-alert'] as const).map((icon) => ({ icon })),
+  ...(['base', 'filled', 'tinted', 'solid', 'destructive'] as const).flatMap((type) => [
+    { type },
+    { type, outline: true },
+  ]),
+]

@@ the preview slot @@

-        {/* drop JSX here to preview it */}
+        <Menu>
+          <MenuItem disabled info={infoFor('label-format', 'Disabled Row')}>
+            Disabled Row
+          </MenuItem>
+          {VARIANTS.map((look) => {
+            const title = JSON.stringify(look)
+            return (
+              <MenuItem key={title} info={infoFor('value-format', title, look)}>
+                {title}
+              </MenuItem>
+            )
+          })}
+        </Menu>
```

**VERIFY**

- [ ] Run `npm run build`; the renderer bundle carries the InfoIndex's text.
- [ ] In `~/Test`, a Select's settings show the glyph right after "Label Format" and "Value Format," Settings › General shows it after "Date Format," a page's settings show it after "Aliases," and the Iteration window (⌘⇧T) shows the disabled row and thirteen variants: three glyphs, and five types each with and without a border.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] No read-only surface changed but the InfoPane: the history reader and the glance select and behave as before.
- [ ] The InfoIndex is read once; nothing parses or reads it per open or per render, and the pane's host passes no connections.
- [ ] Every temporary line sits in `formatRows.ts`, `IterationWindow.tsx`, `AliasesRow.tsx`, the Date Format row's `info` key and `frames.ts`'s `infoFor` import, and the InfoIndex's four entries; nothing else needs undoing in Task 5-1.

### Phase 4 — Verification and the Documents

**GOAL:** What the unit tests can't hold is watched in the built app, the InfoIndex's format and citations are pinned, written last while the examples still cite (D-3), and every document the work makes false reads true. The drive's fixes land in the tasks they belong to.

#### Task 4-1

`.claude/scripts/Info Buttons Drive/` holds `live-drive.mjs` and `MATRIX.md`, with no README paragraph, on port 9413 with shots under `info-shots`, built on `drive-harness.mjs` (`launch`, `restore`, `hover`, `mouseAt`, `mouseClick`, `sweep`, `pressKey`, `shot`, `item`, `tally`) and the Metadata Drive's `openEditor` and `trigger`, copied in, since drives share only the harness. Each check prints as `[g<group> <decisions>] <name>`.

**AFTER**

```.claude/scripts/Info Buttons Drive/MATRIX.md diff
+## Info Buttons Drive — Matrix
+
+The drive's cases, from *Info Buttons — Decisions & Intention*, against the build at the head of Phase 3. A Select in Collection A seeds the format rows; the harness restores `~/Test` when the run ends.
+
+#### Group 1 — The Glyph and the Pane
+
+| Case | Operation | Expected | Decisions |
+| --- | --- | --- | --- |
+| Placement | open the Select's settings | `button[aria-label="Label Format - Info"]` sits right after the title text, inside the title line; the row stands as tall as it did at the baseline; a shot | A-1, F-1 |
+| The look | as above | the glyph wears `filled`, no outline, the `info` icon | A-2 |
+| The pane | with Hover Previews set to Off, rest on the glyph 600 ms | the pane opens below the glyph, 285px wide, with no resize edges; a shot | B-1, B-2, C-4 |
+| The other rows | open Settings and rest on Date Format's glyph; open a page's settings and rest on Aliases' glyph | each glyph sits right after its title and opens its pane; a shot of each | A-1, F-1 |
+| The entries | open each of the four panes and scroll each through | every construct in each entry draws (emphasis, strikethrough, highlights, lists, checklist, quote, callout, tables, code, links, divider); a shot of each pane, top and scrolled | C-2 |
+| A frame switch | hold Date Format's pane open and switch Settings frames | record what the console logs | — |
+| The entry | as above | bold, the list, and inline code draw, with no heading above them; Value Format's table, quote, code block, and link draw, and its body scrolls past 320px | C-2 |
+| The long code line | open Value Format's pane, with Scroll Long Lines In Code Blocks off and then on | off, the long line wraps; on, it rests clipped at its ellipsis; it never scrolls sideways, and the body still wheels | C-2 |
+
+#### Group 2 — The Disabled Row and the Variants
+
+| Case | Operation | Expected | Decisions |
+| --- | --- | --- | --- |
+| A disabled row | the Iteration window's Disabled Row: rest, click | the glyph dims with the row and opens its pane; the row draws no hover wash | A-4 |
+| The variants | on a fresh launch, before any Icon Picker opens, the Iteration window | all thirteen draw at once, every glyph, type, and border in its own ink; a shot | A-2 |
+
+#### Group 3 — The Pane's Text
+
+| Case | Operation | Expected | Decisions |
+| --- | --- | --- | --- |
+| The crossing | rest on Label Format's glyph until the pane opens, move into the pane's body, and rest there past the grace | the pane stays open; leaving it closes it after the grace | B-1 |
+| No hover | move across the body, its lists, its table, and its code block, and rest on Value Format's prose link beside its code block | nothing reveals or highlights, and the pointer stays the arrow but on a web link, which shows a link's hand | C-3 |
+| No selection | drag across the body and across the table's cells; double-click and shift-click Value Format's prose link | nothing highlights, no selection draws, focus stays where it was, and `getSelection().toString()` is empty | C-3 |
+| No copy | press in the body, ⌘A, ⌘C; click the code block's language tag | the clipboard holds what it held | C-3 |
+| No focus | press the body, a bullet, a checkbox, and the left inset beside a line | nothing moves or toggles, and `document.activeElement` is where it was | C-3 |
+| No menu | right-click the body and a table cell | nothing opens | C-3 |
+| The web link | click Value Format's prose link | the link opens as a web link does, and focus stays where it was | C-2 |
+| The cell's link | click the link in Value Format's table | nothing opens | C-2 |
+| The scroll | wheel inside the body | the body scrolls; the settings behind don't | C-2 |
+
+#### Group 4 — The Tags in Pommora
+
+| Case | Operation | Expected | Decisions |
+| --- | --- | --- | --- |
+| HTML Formatting on | a page in `~/Test` holding the InfoIndex's text, opened with HTML Formatting on | the Markdown between the tags renders; a shot | *§Planning Rulings* |
+| HTML Formatting off | as above, off | as above; a shot | *§Planning Rulings* |
```

**PROCEDURE**

1. Write `live-drive.mjs` to the matrix, run it from a clean build, and read every result.
2. A failing case is fixed in the task it belongs to, or in the drive where the case misreads a decision, never bent to pass; record each fix's commit.
3. Read every shot with the Read tool as it's taken, show it in chat, and state in one line what it shows against its case's Expected; a shot that doesn't match is a failing case.

**VERIFY**

- [ ] Every group runs from a clean build, and every case passes or is recorded under *§Deviations* for Nathan's ruling.
- [ ] The run left `~/Test` as it found it.

#### Task 4-2

`Core/Info/infoIndex.test.ts` pins the format on inline samples and walks Core's source the way `Core/manifest.test.ts:48-50` already does, for `infoFor` calls: each names its entry by a string literal, and that entry has wording. An entry no row cites passes as a draft; the file being empty or uncited isn't pinned.

**PROCEDURE**

1. Write the test; break an example's closing tag and watch the citation case fail; restore it.

**AFTER**

```Core/Info/infoIndex.test.ts diff
+import { readdirSync, readFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { describe, expect, it } from 'vitest'
+import { REPO_ROOT } from '../Testing/engineGraph'
+import { ENTRIES, parseInfoIndex } from './infoIndex'
+
+const CORE = join(REPO_ROOT, 'Core')
+const CITATION = /\binfoFor\(\s*(['"])([^'"]*)\1/g
+
+describe('the InfoIndex format', () => {
+  it('reads each tagged entry, trimmed', () => {
+    expect(parseInfoIndex('<a-b>\n\nOne **two**.\n\n</a-b>\n')).toEqual(new Map([['a-b', 'One **two**.']]))
+  })
+  it('leaves headings, frontmatter, and text between entries to the file', () => {
+    const text = '---\ndescription: x\n---\n### Group\n\n<a>\nBody\n</a>\n\nLoose.\n'
+    expect(parseInfoIndex(text)).toEqual(new Map([['a', 'Body']]))
+  })
+  it('reads a Windows checkout and the trailing spaces an editor leaves on a tag line', () => {
+    expect(parseInfoIndex('<a>\r\nBody\r\n</a>\r\n')).toEqual(new Map([['a', 'Body']]))
+    expect(parseInfoIndex('<a> \nBody\n</a>\t\n')).toEqual(new Map([['a', 'Body']]))
+  })
+  it('reads nothing from a mismatched tag, an ID outside kebab case, or an empty file', () => {
+    expect(parseInfoIndex('<a>\nBody\n</b>\n').size).toBe(0)
+    expect(parseInfoIndex('<Date_Format>\nBody\n</Date_Format>\n').size).toBe(0)
+    expect(parseInfoIndex('').size).toBe(0)
+  })
+})
+
+describe('citations', () => {
+  it('cite an entry with wording by a literal ID', () => {
+    for (const rel of readdirSync(CORE, { recursive: true, encoding: 'utf8' })) {
+      if (!/\.tsx?$/.test(rel) || /\.test\.tsx?$/.test(rel) || rel.startsWith('node_modules')) continue
+      const text = readFileSync(join(CORE, rel), 'utf8')
+      const ids = [...text.matchAll(CITATION)].map((m) => m[2])
+      expect(ids.length, `${rel}: every infoFor call names a literal ID`).toBe(text.match(/\binfoFor\(/g)?.length ?? 0)
+      for (const id of ids) expect(ENTRIES.get(id), `${rel}: ${id}`).toBeTruthy()
+    }
+  })
+})
```

**VERIFY**

- [ ] With an example's closing tag broken, the citation case fails, naming a citing file and the ID; restored, it passes.
- [ ] Run the gates.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-3

Every line *§Reconciliation* assigns this task is rewritten in place, plainly, at its length or shorter, and the InfoButton gains its description in `InterfacePM.md`, in its own register; the docs gain about four lines in all, and nothing else in `.claude/Features` changes. The feature docs describe the state at this head: InfoButtons are a mechanism rows cite entries through, and no row carries one yet; the mirror is Task 5-2's to describe, once it exists.

**PROCEDURE**

1. Walk *§Reconciliation* top to bottom, ticking each line as it's rewritten.
2. Land the two new descriptions below, adjusting only where the doc's neighbors read otherwise.

**AFTER**

```.claude/Features/InterfacePM.md diff
@@ after Confirmation & Notifications @@

+### InfoPanes
+
+A row can carry an **InfoButton** right after its title (`Core/Info/InfoButton.tsx`): resting on it, clicking it, or tapping it opens a read-only **InfoPane** of Markdown from the **InfoIndex** (`Core/Info/InfoIndex.md`), where each explanation lives once under the ID rows cite through `infoFor`.
```

**VERIFY**

- [ ] Every *§Reconciliation* line assigned Task 4-3 is ticked and reads true against the code at this head; none describes the mirror.
- [ ] `git grep -n "subLabel\|MenuCaption\|SettingsFieldRow" -- .claude/Features .claude/CLAUDE.md .claude/IssuesPM.md` prints nothing; `.claude/CLAUDE.md`'s structure lists `// Info` under Core and none under UIX; the docs gained about four lines in all.
- [ ] Check for unnecessary changes or mistakes.

#### Review Checkpoint

- [ ] Every fix the drive caused landed in the task that owns it, with its test where a unit test can hold it.
- [ ] The test pins the format and the citations without pinning today's temporary state.
- [ ] Every document reads true at this head, and none describes the examples as shipping.

---

### Phase 5 — Removal and Wiring

**GOAL:** After *§Final Verification* passes with the examples live, the examples leave and the InfoIndex ships empty; then the Resources folder returns holding the InfoIndex's link, so nothing of Claude's wording ever reaches NexusOS.

#### Task 5-1

The examples leave in one commit: the four InfoIndex entries (the file stays, empty), every citation (`formatRows.ts`, the Date Format roster row's `info` key and `frames.ts`'s `infoFor` import, `AliasesRow.tsx`), the Iteration window's preview, and the drive, its matrix and results kept in *Info Buttons — Results*. `formatRows.ts`, `IterationWindow.tsx`, and `AliasesRow.tsx` return byte-for-byte to their state before Task 3-3; `RowText.info` with its pass-throughs and `ManageRow.info` stay as the slots real rows cite through.

**PROCEDURE**

1. Copy the drive's `MATRIX.md` and its last run's results into `.claude/Planning/Info Buttons/Info Buttons — Results.md`.
2. Restore `formatRows.ts`, `IterationWindow.tsx`, and `AliasesRow.tsx` from the commit before Task 3-3's, drop the Date Format row's `info` and `frames.ts`'s `infoFor` import, empty `InfoIndex.md`, and delete `.claude/scripts/Info Buttons Drive/`.
3. Re-point IssuesPM's `[^61]`, `[^74]`, and `[^79]` to their `formatRows.ts` and `frames.ts` lines at the new head.
4. Run the gates; launch the build and confirm no `[aria-label$=" - Info"]` exists in a Select's settings or the Iteration window.

**AFTER**

```Core/Info/InfoIndex.md diff
-<label-format>
-…
-</value-format>
```

**VERIFY**

- [ ] `git diff <the commit before Task 3-3's> -- Core/Properties/Schema/formatRows.ts Core/Interface/Windows/IterationWindow.tsx Core/Pages/AliasesRow.tsx` prints nothing, and `git grep -n "Info/InfoButton" -- Core/Settings/frames.ts` prints nothing.
- [ ] `git grep -n "infoFor(" -- Core UIX` prints nothing, `InfoButton.tsx` defining it as `infoFor = (`; `Core/Info/InfoIndex.md` is tracked and empty.
- [ ] Run the gates; `infoIndex.test.ts` passes with no citation.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-2

`.claude/Resources/` returns holding one file, `PM-Info-Index.md`, a symlink to `../../Core/Info/InfoIndex.md`, so the folder's own doc-tree row (`mirror-map.md:101`) carries the InfoIndex to NexusOS as `II. Resources/PM-Info-Index.md` and the mirror map gains nothing. The watcher reads and writes through the link: its tree scan keeps a linked file (`f.is_file()`, `cross-file-mirroring:1028-1030`), and its writes open the path, which writes the target (`:751`); NexusOS's frontmatter stays on the vault side but for the mirror's Metadata keys (`description`, `version`), which cross both ways as for every mirrored note and which the parse reads as the file's own. `Deployment.md`, `Distribution.md`, and `Libraries.md`, which the folder held before, describe a tree that's gone and aren't restored; once the scope is back online, the watcher's prune moves those three recorded notes to the vault's `.trash`, where they stay recoverable (`:1270-1291`).

**PROCEDURE**

1. Read the watcher's pruning (`prune_orphans`, `_judge`) and confirm that, with `// Resources` online again, it trashes exactly the three recorded notes and leaves the rest of `II. Resources` (its `_pageset.json` included) alone; stop and report if anything else would move.
2. `mkdir .claude/Resources` and `ln -s ../../Core/Info/InfoIndex.md .claude/Resources/PM-Info-Index.md`, from the repo root.
3. Watch `mirror.log` through a pass and the prune's settle: `II. Resources/PM-Info-Index.md` is seeded with an empty body, and the three old notes sit in the vault's `.trash`.
4. Write the *§Reconciliation* line assigned Task 5-2 (`InterfacePM.md` *§InfoPanes*).
5. Commit the link and `InterfacePM.md`.

**AFTER**

```.claude/Resources/PM-Info-Index.md diff
+../../Core/Info/InfoIndex.md (symlink)
```

**VERIFY**

- [ ] `git ls-files -s .claude/Resources` lists one entry of mode `120000`, and `readlink .claude/Resources/PM-Info-Index.md` prints `../../Core/Info/InfoIndex.md`.
- [ ] The three old notes sit in the vault's `.trash`, and nothing else in `II. Resources` moved or changed.
- [ ] `II. Resources/PM-Info-Index.md` exists, its body empty; an edit to it reaches `Core/Info/InfoIndex.md` within a pass with the link intact (`test -L`), and is reverted from the codebase side (`git checkout -- Core/Info/InfoIndex.md`), since a revert from the vault would leave the file a single newline (`cross-file-mirroring:868`); the next pass empties the vault note and `git status` shows the InfoIndex clean.
- [ ] Check for unnecessary changes or mistakes.

#### Spotcheck

- [ ] One `opus-high` agent reads Phase 5's range against the Mandate alone: nothing of the examples remains, and nothing the examples needed lingers.
- [ ] Run the gates and `npm run build` from a clean state.

---

### Completion Criteria

- **Conformance:** every change sits under *§Constraints*; one name for a caption, one map from a Settings row to a menu row, one dwell mechanism, one pane mechanism, one renderer for an entry, and one citation call; nothing changed outside the files the tasks name.
- **Correctness:** each behavior the decisions name was watched happen in the drive: the glyph after the title, the 0.5-second rest, the hold, the second click, Escape, the outside press, one pane at a time, the tap on touch, the disabled row, the variants' inks, no hover, selection, or copy (the table's cells included), the web link, and the entries' formatting; every Settings frame draws as at the baseline.
- **Completeness:** every task and checkpoint in *§Process Overview* is ticked; every *§Concepts* removal is gone; nothing of the examples remains; no scaffolding, debug output, or unauthorized TODO remains.
- **Confirmation:** every new or rewritten test went red without its change; every VERIFY ran and its output was read; the drive's shots were delivered.
- **Continuity:** *§Reconciliation* is walked; the mirror works as Task 5-2's VERIFY proves; every deviation is fixed or ruled on.
- **Confidence:** the gates are green from a clean state at the final head; `view-delta <BASELINE>..HEAD` is reported with additions and removals apart, per phase and in total, against *§Overview · The Number*.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity encountered during execution was taken at its simplest reading and recorded; it didn't stop the run.

The reviews run over `<BASELINE>..<head before Phase 5>` with the examples live (G-2), each wave closed before the next opens. Every reviewer brief carries the Mandate verbatim and *§Constraints* whole, except the neutral gate's, which carries the Mandate alone.

- [x] Phase Review: Phase 1 · Phase 2 · Phase 3 · Phase 4
- [x] **Wave One:** two read-only `opus-xhigh` reviewers, briefed with `code-simplification`, one reading inward at the diff and one outward against the rest of Core, UIX, and Desktop; one fix agent folds what holds as numbered fixes beside a Not Taken list with reasons, and the fold commits.
- [x] **Wave Two:** two fresh `opus-xhigh` reviewers, inward and outward, briefed with `adversarial-review` over the folded range and given the Not Taken list, so a fold left out returns only on new evidence; folded and committed the same way.
- [x] **Neutral Gate:** one `fable-high` agent given only the BASELINE head, the head before Phase 5, the Mandate, and the intention under *§Constraints · Neutral Gate*; a yes-or-no verdict, its corrections, and the strengths to keep, re-run after each fold until it answers yes.
- [ ] **Phase 5 and Its Spotcheck:** the examples leave and the wiring lands; any fold after the gate gets the spotcheck against the Mandate alone.
- [ ] **Own Pass:** gates from clean, baseline counts, the diff read once, *§Completion Criteria* ticked.
- [ ] **Reconciliation:** *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled.
- [ ] **Report:** in `closeout-review`'s closeout format, with the range presented through `/view-changes`, the per-phase and total delta, every deviation, and the neutral gate's answer verbatim.

#### Reconciliation

**Code and Tests**

- `UIX/Interactions/hoverReveal.ts:28` — "A dwell opens on REVEAL_DWELL_MS and closes on the grace." — Task 2-1
- `UIX/Menus/menu-row.css.ts:258` — "A row's accessory overhangs into the row's padding, so an eye or × row stands as tall as a plain one." — Task 2-2
- `Core/MarkdownPM/readOnlySelection.test.tsx:12` — "A read-only portal must stay SELECTABLE" — Task 3-1

**Feature Docs**

- `.claude/Features/InterfacePM.md` — *§InfoPanes*, after *§Confirmation & Notifications*, as Task 4-3's AFTER writes it — Task 4-3
- `.claude/Features/InterfacePM.md` *§InfoPanes* — one sentence: the InfoIndex mirrors to NexusOS as `PM-Info-Index.md`, where its wording is edited — Task 5-2
- `.claude/Features/PommoraUIX.md:361` — "`MenuCaption`" and "`subLabel`" read `MenuDesc` and `caption`, and `MenuItem`'s slots name `info`, in place — Task 4-3

**Issues**

- `.claude/IssuesPM.md:79`, `:98`, `:996`, `:1004`, `:1008`, `:1142`, `:1150`, `:1154`, `:1439`, `:1457` — a renamed identifier (`hint`, `subLabel`, `SettingsFieldRow`) reads its new name, in place, and `[^16]`–`[^18]`'s `MarkdownEditor.tsx` range reads true — Task 4-3
- `.claude/IssuesPM.md` `[^61]`, `[^74]`, `[^79]` — their `formatRows.ts` and `frames.ts` line references read true once the examples leave — Task 5-1

**Structure and History**

- `.claude/CLAUDE.md` *§Codebase Structure* — `// Info` under Core ("In-app information: the InfoButton, its pane, and the InfoIndex") — Task 4-3
- `.claude/HistoryPM.md` — one entry titled *App Information Index*, in the file's own entry format, written with the final report

#### Open Items

- **A Picker Row Citing an Entry:** `pickerRow` returns the whole `MenuRow` union (`UIX/Menus/MenuIndex.tsx`), so the format rows' temporary citation narrows it to attach `info`; the first real picker-row citation gives `PickerRowLook` an `info` it passes through, the one obvious place for it.
- **`PickerMenu` and Clicks:** `PickerMenu` stops a press's and a context menu's bubbling but not a click's, so the InfoButton's host and `ValueEditor` each stop it; once `PickerMenu` unfreezes, it takes the click too and the pane half of each stop leaves.

#### Deviations

- **The Neutral Gate (Final Verification, for Nathan's ruling):** it answered no twice, run on the Mandate and the intention alone. Each fold it named that held landed (the press claim's reason, the touch opt-out's reason); its standing blockers rest on rulings it can't see: the look's dials (A-2, its own entry above) and the citation call over one `InfoButton({ id, title })` (D-2, G-2). Its answer is in the final report verbatim.

- **The Look's Dials After the Preview (Final Verification, for Nathan's ruling):** A-2 rules the look's three independent props (`icon`, `type`, `outline`) and its three glyphs, so `InfoLook`, `infoFor`'s `look` argument, and the `circle-question-mark` and `circle-alert` registry entries ship; once the Iteration preview leaves, no row overrides the default look and those two glyphs are uncited. They stand as ruled until a look is chosen, when the dials no row uses can go.

- **A Hover-Closed InfoPane and the Next Press (Final Verification, for Nathan's ruling):** when the pointer leaves a hover-opened pane, its grace closes it, and a press outside in the 255ms exit that follows dismisses nothing beneath it, so closing the settings pane behind takes a second press. The dismissal stack holds every press while any modal layer is exiting (`UIX/Interactions/dismissalStack.ts:50,65`), a gate every other modal `PickerMenu` only meets after a press of its own, and the InfoPane is the first modal pane that closes without one; the glance, also dwell-opened, passes `modal={false}`. Two fixes, each outside the rulings: the stack's gate holds presses only while a layer it dismissed is exiting (about +3 / −1 in `dismissalStack.ts`, its purpose otherwise unwritten), or the pane is modal only while held (`modal={held}`), which gives up Escape closing a hover-opened pane. It stands as built.

- **The InfoPane Near the Window's Bottom (Task 4-1, for Nathan's ruling):** a pane whose glyph sits low in the window opens downward and runs past the window's edge, where Label Format's own picker flips up. `PickerMenu` decides its side once, at its first measure (`UIX/Pickers/PickerMenu.tsx:201-211`), and the InfoPane is empty then, since `MarkdownEditor` builds its view in an effect after that measure (`Core/MarkdownPM/MarkdownEditor.tsx:132`); the pane then grows to its 320px cap with its side locked. `PickerMenu` is frozen, so the pane stands as built. The fix that keeps every dropdown on one rule is `PickerMenu` deciding its side once its pane first has content.
