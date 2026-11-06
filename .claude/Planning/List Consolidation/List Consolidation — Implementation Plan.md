## List Consolidation — Implementation Plan

**DATE:** 11-06-2026
**STATUS:** Ratified 11-06-2026
**SOURCE:** *List Consolidation — Decisions & Intention* (ratified 11-05-2026, Decisions A-1 to G-13 with its *§Rejections* and *§Constraints*), *List Consolidation — Investigation*, and the phase patches and reports in `Scouts/`, all in `.claude/Planning/List Consolidation/`.

**PLAN REVIEWS:** three waves, folded (*List Consolidation — Plan Reviews*): Wave One outward, 31 findings; Wave Two inward, 41; Wave Three both ways, 4; then a closing proof that replayed all 35 patches onto a clean `b7f2f17a5`.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `7bfbdf5ab` (production as `b7f2f17a5`, where the phase patches were built) | 9,121 passed, 2 skipped (549 files); comments 3,511 | 11-06-2026 10:57 AM | |

**Run Start:** comments 3,511; `~/Test` hash `e5a32a5d30d6a11310cd559ee2b1b84b261c3265`.

**Run State:** resume from what's ticked. The run's helpers sit in the session scratchpad's `run/`: `env.sh`, `row.sh <label> <sha> <spec…>` for a drive row, `executor-rules.md`, and `reviewer-rules.md`. The drive worktree is the scratchpad's `wt`, holding Editor Parity's `results/base`, and shots sit in its `shots/`. Each phase takes one `execution-agent` continued task by task, its checkpoint two reviewers and the row run side by side, one fold commit by the same executor, then the row again at the folded head.

**Net Ledger** (production lines from the Actionable cell of `view-delta --exclude .claude`, cumulative from the BASELINE head. Estimate is what the phase patches measured at build; Measured is filled during the run):

| Phase | Estimate | Tests at the Phase's Head | Measured |
|-------|----------|---------------------------|----------|
| 0 · Drives and Baseline | 0 | 9,121 | 0 |
| 1 · One Scan Per Surface | -108 (+687 / -795) | 9,127 | -91 (+740 / -831), 9,134 tests |
| 2 · Markdown Code Blocks and Masked Markers | -39 (+838 / -877), +69 its own | 9,140 | -31 (+894 / -925), 9,157 tests |
| 3 · Blank Lines and Numbering | -126 (+1000 / -1126), -87 its own | 9,170 | -117 (+1059 / -1176), 9,192 tests |
| 4 · Paste | -124 (+1002 / -1126), +2 its own | 9,177 | -115 (+1061 / -1176), 9,199 tests |
| 5 · One Marker Grammar | -173 (+1040 / -1213), -49 its own | 9,184 | -166 (+1100 / -1266), 9,211 tests |
| 6 · One Set of List Keys, and the Scope's Name | -201 (+1108 / -1309), -28 its own | 9,185 | -199 (+1164 / -1363), 9,215 tests |
| 7 · One Definition Per Type | -260 (+1153 / -1413), -59 its own | 9,191 | -259 (+1223 / -1482), 9,222 tests |
| 8 · The Word Rule | -307 (+1172 / -1479), -47 its own | 9,196 | -294 (+1254 / -1548), 9,228 tests |
| 9 · Right-Click | -308 (+1386 / -1694), -1 its own | 9,204 | |
| 10 · Text Properties | -286 (+1465 / -1751), +22 its own | 9,219 | |
| 11 · Docs and Issues | -286, ±0 its own | 9,219 | |
| **Total** | **-286 (+1465 / -1751); one production file added, none removed** | | |

**Comment Ledger** (the log's command; a phase's row is its head's count, and a phase over its row corrects before it closes):

| Phase | Reads | Its Own | What Leaves and Arrives |
|-------|-------|---------|-------------------------|
| Baseline | 3,511 | | |
| 1 | 3,512 | +1 | Arrive: `literalLines`' doc, `surfaceScope`'s doc, and `tagReveal`'s comment, split from `pointerReveal`'s. Leave: `edits.ts`' "A cell draws neither, so neither question applies there", `intents.ts`' "A cell holds no box" |
| 2 | 3,515 | +3 | Arrive: `readsListsIn`'s, `lineMarker`'s, and `leadOf`'s docs, and `format.ts`' two lines on a diff sign and a code line. Leave: `readsFrom`'s docblock, `edits.ts`' "A cell draws no quote" |
| 3 | 3,515 | 0 | **Leaves: `listDrag.ts:11`.** Arrives: `caretSeat`'s inverted-range line, so that departure nets 0. Task 3-3 nets 0: `blockMove.ts`' flags, `ridesList`'s, and `runsAround`'s docs arrive; `blockModel.ts`' "Only where a run actually holds a marker", the smallest-ordinal line, and `firstItemOf`'s doc leave |
| 4 | 3,515 | 0 | |
| 5 | 3,511 | -4 | Leave: `intents.ts:128` and `:129` ("The form a marker is DRAWN as"), `CellEditor.tsx`' "The glyph, not the parse", and `cellStatic.tsx`' "A marker nothing draws is prose here". Five reworded in place |
| 6 | 3,510 | -1 | Leave: four of `CellEditor.tsx`' key comments. Arrive: `nest`'s, `onItemEnter`'s, and `listKeys`' lines in `markdownInput.ts`. Two move with their code |
| 7 | 3,509 | -1 | **Leaves: `intents.ts:103`, with `railTypeClass`** |
| 8 | 3,509 | 0 | `wordAt`'s comment replaced by `CONTRACTION_REACH`'s |
| 9 | 3,507 | -2 | **Leave: `MarkdownTable.tsx:494`, `pasteLink.ts:128`, `atClick`'s doc at `Desktop/Actions/editorMenu.ts:37`,** and `CellEditor`'s `posAt` note. Arrive: two Biome suppressions, on the table wrap and `MarkdownEditor`'s shell. Four of `GlancePane.tsx`' reword in place |
| 10 | 3,508 | +1 | Leaves: `table.css`' "Every line is drawn on its own". Arrive: `renderRestingLine`'s doc, `docText`'s comment in `ValueEditor.tsx`. The grip's comment moves with its rule |
| 11 | 3,508 | 0 | Documents only |

### Context

MarkdownPM reads a list through a marker grammar (`Engine/detect.ts`), a per-line scan (`Engine/docScan.ts`), and a list model (`Engine/listModel.ts`), and changes a list's type through one switch, `setList` in `Input/format.ts`. The List Glyph Menu work landed most of this at +476 lines and left a marker classified three ways, three readers of where a list ends, list keys written twice, a right-click route carrying two ranges and guards against states nothing reaches, a word rule built from joined atoms and wrapped commands, and a Text property's pane that shares a mode with a one-line field and so reads no lists. A cell's document model is page-shaped, so `scope` runs through 223 sites in production `Core/MarkdownPM`.

*Investigation · §What's True* states the code as it is, each claim read or run at `b7f2f17a5`. The patches in `Scouts/Planning/Phases/` were built at that head, one per task, and replay in order onto it to exactly the final tree, with all three gates green at each task and every pin run red once (*Scouts/Planning/Phases/Build Log*, and each phase's *Notes* beside it). The rewritten drives ran live during planning: each row of *§When Drives Run* at its phase's head on the Wave One chain, then Phase 10's whole row at the final head, with `~/Test` hashing the same before and after every run (*Scouts/Planning/Phases/Drives — Notes*).

### Overview

Twelve phases should leave MarkdownPM's list handling smaller, stated once, and easier to change. Phase 0 lands the rewritten drive's frame and records the baseline. Phase 1 makes each surface's scan hold what that surface reads, so a list reader asks the scan rather than taking a scope. Phase 2 opens Markdown code blocks to every list behavior and shuts every other block, through a scan whose markers hold only what a line truly has. Phase 3 ends a list at a blank line for every reader and counts a list rather than a run. Phase 4 lets a paste recount. Phase 5 gives a marker one classification, Phase 6 names the scope for what it reads and writes the list keys once, and Phase 7 gives each type one definition and one name. Phase 8 rides CodeMirror's own word characters. Phase 9 shrinks the right-click route and gives every read-only surface one short menu. Phase 10 lets a Text property's pane take lists on the reworked system, and Phase 11 makes the documents read true.

The order is what makes each step land once. The scan goes first, since every later step then writes its signatures once, and masking precedes the walks, since numbering reads a region rather than a reader. The grammar follows numbering because Enter's read of a bullet's character is gone by then, and the arrow folds into its one regex there, so the parser's groups are set once. Production ends 286 lines lighter (+1465 / -1751), with one file added (`Engine/blockMove.ts`), `scope` down from 223 sites to 65, `listModel.ts` from 323 lines to 179, `listRenumber.ts` from 89 to 51, `CellEditor.tsx` from 302 to 199, and the comment count at 3,508 against a cap of 3,511.

#### Decision Map

| Decisions | Where |
|---|---|
| A-1, A-2, A-3, A-4, A-5 | Scope and process: *§Constraints* and every task |
| A-6 | Task 0-1, and each phase's drive group; both drives hold no gate |
| B-1, B-2, B-3 | Task 5-1 |
| B-4 | Task 3-3 (Enter), Task 5-1 |
| B-5, B-6, B-10 | Task 3-3 |
| B-7 | Tasks 5-1 (the arrow's fold) and 7-1 |
| B-8 | Holds: nothing draws differently, and group 1 pins each type's drawing |
| B-9 | Tasks 3-3 and 5-1 |
| B-11 | Task 1-1 |
| C-1 to C-7 | Tasks 2-1 and 2-2 |
| D-1 | Holds: Preserve List-Level Formatting stays, and group 3 reads both settings |
| D-2 | Task 3-3 (the grip), Task 9-1 (a glyph) |
| D-3, D-6 | Task 7-2 |
| D-4 | Task 3-3 |
| D-5 | Task 9-2 |
| E-1, E-4 | Task 9-3. The info pane has no mount, so E-4 reaches it through `MarkdownEditor`'s shell and stands unproven until something mounts it |
| E-2, E-3 | Task 9-4 |
| E-5, E-6 | Task 8-1 |
| E-7 | Tasks 9-1, 9-2, 9-3, and 9-5 |
| F-1 | Table header, diff sign, `-[x]`: Task 2-1. Grip past the document's end, run past Z, flush-line rail, block drag: Task 3-3. `2. [x] foo`: Task 5-1. Callout head: Task 7-3 |
| F-2 | Task 4-1 |
| G-9 | Tasks 6-1, 6-2, and 10-1 |
| G-1, G-2, G-5, G-6, G-10 | Task 10-1 |
| G-3, G-7, G-8, G-12 | Task 10-2 |
| G-13 | Task 10-3 |
| G-4, G-11 | Hold: nothing on disk changes, and nothing is stored to mark a list. Task 10-1 keeps a `\r\n` value as it was through an untouched close |

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `Engine/blockMove.ts` • File | Block moves: `rebuildMove`, `moveRange`, `Slot`, and `reindentBlock`, list-free and out of `listModel.ts`. `blockModel.ts` imports `listModel.ts`, so a new leaf is the home with no cycle | `Core/MarkdownPM/Engine/blockMove.ts` |
| `surfaceScope` • Facet | What a surface reads, stated once where the surface is built | `docCache.ts` |
| `literalLines` • Function | A scan for a surface reading only inline marks and lists; a cell's keeps `html` and `fenceLines` | `Engine/docScan.ts` |
| `DocScan.scope` • Field | The scope a scan was read for | `Engine/docScan.ts` |
| `PerScopedDoc.of` • Method | A derivation keyed on a document and a scope, for a site holding no state | `docCache.ts` |
| `lineMarker`, `readsListsIn` • Functions | The marker a line holds where it stands, and whether a code block reads lists | `Engine/detect.ts` |
| `fenceDelimiter` • Function | Whether a line is a block's delimiter | `Engine/docScan.ts` |
| `markerIn` • Function | The marker a line holds to a reader in one block, or outside every block | `Engine/docScan.ts` |
| `sealedBlock` • Function | The code, math, or table block sealing a line | `Engine/docScan.ts` |
| `leadOf`, `opensCodeList` • Functions | What stands before a line's own text, and whether a shorthand opens a list in a Markdown block | `Input/edits.ts` |
| `ridesList`, `runsAround` • Functions | Whether a line rides the item above it, and the runs of the list a line belongs to | `Engine/listModel.ts` |
| `held` • Parameter | A drag's pre-move head, handing its landing run the start it had | `Engine/listModel.ts` |
| `fenced` • Flag | How a block seats at a slot and heals the hole it leaves | `Engine/blockMove.ts` |
| `textMarkerClass` • Function | The class a text marker and a resting glyph share | `Engine/intents.ts` |
| `tagReveal` • Extension | A page's code tags revealing their copy mark | `Menus/blockHandles.ts` |
| `listKeys`, `onItemEnter`, `seated` • Extension, Functions | The one set of list keys every surface mounts | `Input/markdownInput.ts` |
| `LIST_TYPES` • Constant | Each type's written marker and its rail | `Engine/detect.ts` |
| `contractions`, `CONTRACTION_REACH` • Extension, Constant | The word rule, answered by position | `Input/markdownInput.ts` |
| `menu`, `selection` • Request Fields | Which menu a surface asks, as a finite state, and what's selected there | `Core/Actions/editorMenu.ts` |
| `edit:selectAll` • Action | A renderer-answered Select All | `Core/Actions/editorMenu.ts` |
| `restingRows`, `shortRows` • Functions | The resting and read-only menu's rows | `Core/Actions/editorMenu.ts` |
| `mdpm-seat` • Highlight | A resting word's seat, painted in the selection color | `Tables/cellStatic.tsx`, `markdown-tables.css` |
| `renderRestingLine` • Function | One resting line with its glyph, a cell's and a Text value's first | `Tables/cellStatic.tsx` |
| `is-continued` • Class | Marks a value running onto another line | `TextCell.tsx`, `UIX/Table/table.css` |
| `List Types Drive/MATRIX.md` • File | The drive's matrix, each pruned cell's reason beside it | `.claude/scripts/` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `Reader`, `'outside'`, `readsFrom`, `itemAt`, `blockPrefix` | The reader a line was asked from, which a masked scan replaces | `Engine/listModel.ts`, `Input/edits.ts` |
| `runAt`, `mapAscending`, `firstItemOf`, `gapBefore`, `looseSource`, `looseSlot`, `MoveSeams` | Numbering's and the drag's walks past a blank | `Engine/listModel.ts`, `Input/listRenumber.ts`, `Menus/gripMenu.ts` |
| `arrived`, `settled`, `repicked`, `rewritten`, `runsBelow`, `below` | What the filter inferred from an edit's shape | `Input/listRenumber.ts`, `Engine/listModel.ts` |
| `ListGlyph`, `listGlyphOf`, `drawnKind`, `ListMarker.bullet`, `Box` | The second and third classifications | `Engine/intents.ts`, `Engine/detect.ts` |
| `ARROW_MARKER_RE`, `BARE_MARKER`, `BARE_TASK` | Restatements of the grammar | `Engine/detect.ts`, `Tables/codec.ts` |
| `listMarkerText`, `railTypeClass` | Replaced by `LIST_TYPES` | `Input/format.ts`, `Engine/intents.ts` |
| `listLevels`, `listKinds` | Cached facts the scan already holds | `Engine/intents.ts`, `docCache.ts` |
| `listEdit`, `continueList`, `nestList`, `unnestList`, `listLineAt`, `listClaims` | The cell's own list keys | `Tables/CellEditor.tsx` |
| `'cell'`, `'text'` | The scope's old values, now `'lists'` and `'inline'` | `Engine/detect.ts` |
| `joins`, `JOINED`, `grouping`, `wordPress`, `joinedWords`, `wordGestures`, `DELETES`, `GROUPS`, `byWords` | The word rule's atoms and wrapped commands | `Input/markdownInput.ts` |
| `atClick`, `takeEditorMenu`, the click's `x` and `y`, `resting`, `RESTING_EDITS`, `restingEditItems` | The stranded-ask guard and the menu's old signal | `Desktop/Actions/editorMenu.ts`, `Core/Actions/editorMenu.ts` |
| `oneLine` | A flag beside the scope, which says the same thing | `surface.ts` |
| `.cell-text-line` • Class | A wrapper with only one line left to hold | `TextCell.tsx`, `UIX/Table/table.css` |
| `blockGestures`, `BlockScope`, `CELL_KINDS` | What a surface mounts by scope, which `readsLists` answers | `surface.ts`, `Menus/blockHandles.ts` |
| `parseListMarkerPrefixed` | Folded into `lineMarker` | `Engine/detect.ts` |
| `pageChrome` | Renamed `lineChrome` | `Engine/intents.ts` |

#### Constraints

- **Mandate (Nathan's, verbatim from *Decisions & Intention · §Constraints*):**
  - **Approach:**
    - Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
    - We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
    - We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and fewer headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our principles.
    - Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
    - Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
    - The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.
  - **Principles:**
    - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
    - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
    - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
    - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
    - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
    - **Real Purpose:** Anything added to the codebase should have its purpose clearly stated from the perspective of its value in enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
    - Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
    - Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
    - Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.
- **Removal First:** every phase, task, and candidate is assessed for what leaves before what arrives; nothing is added unless its absence would leave a real gap, and in-scope cleanup that's obvious to take is taken rather than deferred.
- **Caution Code:** none without a named, reachable cause. A suspected bug is shown to exist against the tree before anything reconciles it, and the reconciliation follows the Approach and Principles rather than guarding the symptom.
- **Briefs:** every agent brief on this plan (executors, checkpoint reviewers, the final waves, the neutral gate, and every compaction continuation) carries the Approach and Principles above in full. Every agent but the neutral gate reads *§Constraints* whole from this file before anything else. The neutral gate's brief carries the Approach, the Principles, and its intention, and nothing else from this plan. Every dispatch states its model and effort.
- **Rulings (Not Re-Raised):** every entry in *Decisions & Intention* and its *§Rejections*, *Investigation · §Calls Taken*, and *Plan Reviews*' Not Taken lists aren't re-raised, and a reviewer's disagreement with one is noted unless it names a mechanism they missed.
- **Plan Rules:** a task's AFTER is its patch in `Scouts/Planning/Phases/`, as if inlined, with any difference the task names; this plan stands wherever it and a report differ. Every patch was built against `b7f2f17a5` and replays in order; if the head has moved, `git apply --3way` lands it, and a conflict resolves toward the patch's intent and is recorded under *§Deviations*. A checkpoint's fold that changes a line a later patch touches lands the later patch the same way. A test that changes asserts the behavior a decision names rather than being bent to pass (A-4). An obvious fold that would be answered "fix it here", with no architectural risk or domino effect, is taken and recorded under *§Deviations*, and anything larger is recorded there for the morning.
- **Placements:** every new, moved, or deleted file is one of these, and no other is created: `Core/MarkdownPM/Engine/blockMove.ts` and `blockMove.test.ts` (new), `.claude/scripts/List Types Drive/MATRIX.md` (new), and `Core/MarkdownPM/textScope.test.tsx`, moved to `Core/MarkdownPM/inlineScope.test.tsx`. Ratification commits the topic's planning folder, `.claude/Planning/List Consolidation/`, whole, so the run starts from a tree with nothing of its own untracked.
- **Tests:** a test is added only where what it pins is clearly defined and genuinely needs to exist. Each pin a phase's *Notes* names ran red during planning, and its executor runs that revert again before the task commits. Nathan's direction during the run: stop adding tests. A saved patch lands with the tests it carries, reviewers don't report an untested line as a finding or run mutation sweeps, and a fold adds a test only for a real defect a user could hit, named one by one by the orchestrator.
- **Comments:** the production comment count, `git grep -c -E '^[[:space:]]*(//|/\*\*|/\*)' -- 'Core' 'Desktop' 'UIX' 'Sync' ':!*.test.*'` summed, reads 3,511 at `b7f2f17a5` and doesn't exceed it at the end, and no comment grows to carry what another held. It's counted at every phase's VERIFY against the Comment Ledger. It sits over the cap by up to 4 through Phase 4, as the ledger shows, and reads 3,511 at Phase 5; the constraint reads at the end. No task adds a comment the ledger doesn't name, and a rewrite in place counts zero.
- **Documentation:** documents change once, in Phase 11, so nothing they describe is still moving. Comments and tests change with their code. *§Reconciliation* is the list.
- **Sync:** nothing here makes decisions for sync work. `git diff --stat <BASELINE>..HEAD -- Core/Sync Sync` prints nothing at the end.
- **Gates:** "Run the gates" means `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root, lint clean. A file written by a shell command skips Biome's hook, so `npm run format` follows any scripted edit. A VERIFY grep that uses `\b` runs under `git grep -P`, since this toolchain's `git grep -E` matches nothing at a `\b`. `npm run build`, confirming `✓ built in`, runs from a clean state at the final head. `citationBreakage`, `embedAbsorb`, `Matrix/matrixRuntime.test.ts`, and `Core/Sync/handlers.test.ts` can time out under load, so a lone failure there reruns by file before it's read as real. A worktree in the session scratchpad needs `$SCRATCHPAD/.claude` linked to `~/The Studio/.claude`, for typecheck's dashboard and lint's name check.
- **Commits:** each task commits once its VERIFY passes, through `git commit --only -m "…" -- <paths>` after `git add` for new or renamed files. Messages are past tense, one to three sentences, and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The post-commit hook pushes `active`. A Bash command carrying `git` can't contain a personal name anywhere, paths and heredocs included. The plan file commits with `--only` whenever its BASELINE, ledgers, ticks, or *§Deviations* change.
- **The Number:** net lines are measured from `b7f2f17a5` across the whole work, section G and the new menu included. Every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <BASELINE> --exclude .claude --save <scratch file>`, a working-tree diff, since VERIFY runs before the commit, and records the **Actionable** cell in the Net Ledger's Measured, cumulative. Without `--save` the script opens a viewer, so it's always passed. A phase whose own delta lands above its estimate is reported by notification before the next opens, with what the increase buys.
- **Live Drives:** Nathan takes no hand checks (A-6). Every outcome runs through the List Types Drive and the existing MarkdownPM drives, each from a worktree (`.claude/scripts/editor-parity/worktree.sh <sha> "$WT"`), with `POMMORA_DRIVE_REPO="$WT"`, `POMMORA_DRIVE_SHOTS="$SHOTS/<task>-<drive>"`, and `run_in_background`. Drives run one at a time, since each backs up and restores `~/Test` and `sweepStrays` kills any other drive's instance; no agent starts one while one runs. The app is never launched from the main checkout, where Nathan's instance runs, and that instance is never stopped. A drive's groups grow with the phases, so group N exists from Phase N on and an item asserts only what's true from its phase forward. Neither rewritten drive keeps a gate: a failing item fails the run, and it's fixed in the code, or in the drive where the case misreads a decision, never bent to pass.

  | Drive | Command (from its folder) | Port | Time |
  |---|---|---|---|
  | List Types | `node live-drive.mjs <groups>`, as *§When Drives Run* names them | 9413 | about 75 s a group, 13 min at ten |
  | Text Property | `node live-drive.mjs 4` through Phase 9; `node live-drive.mjs 1 2 3 4` from Task 10-4 | 9353 | about 1 min, then 3 min |
  | Alias, group 3 | `node live-drive.mjs 3` | 9373 | about 2 min |
  | Path Links | `POMMORA_PL_LANDED=9 node live-drive.mjs 9` through Phase 9; `POMMORA_PL_LANDED=9 node live-drive.mjs 1 9` from Task 10-4 | 9383 | about 4 min, then 5 min |
  | Metadata | `node live-drive.mjs 1 2 3 4 5 6 7 8 9` | 9363 | about 4 min |
  | Properties | `node live-drive.mjs` with all nineteen groups | 9403 | about 18 min |
  | Option Picker | `node live-drive.mjs` | 9343 | about 2 min |
  | Archive | `node live-drive.mjs` with every group | 9393 | about 6 min |
  | Editor Parity | `./launch.sh <label> "$WT" 9444 && node run.mjs <label> 9444; ./stop.sh 9444`, then `node compare.mjs base <label>` | 9444 | about 1 min a build |

  Editor Parity raises a real, focus-taking window while it runs, and it runs on a tree a drive or `worktree.sh` just built. Its compare against Task 0-2's `base` reads 0 differing lines through Phase 4, and from Phase 5 on one, `+ plus bullet` drawing `•`, which is B-1, with all nine behaviors `same` at every head.

- **When Drives Run:**

  | When | Run |
  |---|---|
  | Task 0-2 | Text Property 4, Alias 3, Path Links 9, Editor Parity twice (`base`, `base2`) |
  | Phase 1's checkpoint | List Types 1; Text Property 4; Editor Parity against `base` |
  | Phase 2's checkpoint | List Types 1 to 2; Alias 3 |
  | Phase 3's checkpoint | List Types 1 to 3; Text Property 4; Path Links 9 |
  | Task 4-2 | List Types 1 to 4 |
  | Phase 5's checkpoint | List Types 1 to 5; Editor Parity against `base` |
  | Phase 6's checkpoint | List Types 1 to 6; Text Property 4; Alias 3 |
  | Phase 7's checkpoint | List Types 1 to 7; Path Links 9 |
  | Phase 8's checkpoint | List Types 1 to 8; Editor Parity against `base` |
  | Phase 9's checkpoint | List Types 1 to 9; Text Property 4; Alias 3; Path Links 9 |
  | Phase 10's checkpoint, and after each folded wave | Every drive in the table above, each whole |

  A checkpoint's drives run after its reviewers' folds land, from a worktree of the folded head, and each checkpoint's VERIFY reads its row here as the one schedule. A drive task's VERIFY runs its own group alone, so this table is the one place naming 1 to N. Phase 4 has no checkpoint, so its row runs at Task 4-2, right after that task's VERIFY.

- **Screenshots:** Remote Control shows what the session reads, so the orchestrator itself runs `Read` on four named shots per checkpoint, any `failure` shot first, with one caption line each: what it shows and whether it's right. Shots live in the session scratchpad.
- **Execution:** the plan runs end to end through `c/plan-execution`, and no step waits on Nathan before the final report. Each task goes to an `execution-agent` (`opus-medium`) informed of *§Context* and *§Overview*, which applies the task's patch, runs its pins' reverts, reports insights, concerns, and suggestions rather than diverging, and leaves the orchestrator to check its result against AFTER and VERIFY. At each Compaction Checkpoint the orchestrator records state in this file and continues, and after any compaction it rereads *§Constraints* from this file rather than from a summary before the next phase opens.
- **Unattended:** every stop in *§Process Overview* is the orchestrator's to handle, the plan's Compaction Checkpoint replaces `c/plan-execution`'s, so nothing waits, an ambiguity takes its simplest reading and is recorded under *§Deviations*, and the run carries on. A message from Nathan during the run is input to fold in, not a stop.
- **Notifications:** PushNotification marks every checkpoint and every update to Nathan, in plain language: what landed, what the drives and reviewers found, and what's next.
- **Reviews:** a review checkpoint is two read-only agents at `opus-high`, one under `code-simplification` and one under `adversarial-review`, each weighing the phase against these constraints and its place in the plan, reading outward rather than in isolation; what holds is folded before the next phase opens. *§Final Verification* holds the waves after the last phase.
- **Cold Machine:** each task stops every process it starts before it commits. An instance Nathan launched himself isn't the run's, and it's left alone.
- **Neutral Gate:** the post-implementation neutral reviewer (`fable-high`) gets only the BASELINE head, HEAD, the Approach and Principles, and this intention: *"Pommora's Markdown editor classified a list marker three ways, by what it parsed as, what it drew as, and what the menus called it. Its readers answered differently where a list ended, lists in code blocks were read by a menu pick in any language and by no key in any language, the list keys were written twice, the right-click route carried two ranges and guards against states nothing reached, word gestures ran through joined atoms and wrapped commands, and a Text property's pane refused lists. This work should leave list handling smaller, stated once, and easier to change: one classification of a marker, one definition per list type, a blank line ending a list for every reader, each surface's scan holding what that surface reads, a list inside a Markdown code block behaving as any other list while every other code block stays plain code, a right-click route and a word rule shrunk to what their surfaces genuinely need, with a resting table cell keeping its deliberate behavior, every read-only surface offering one short menu, and a Text property's pane taking lists in full, with nothing on disk changing."*
- **The Measure:** the neutral gate answers whether the result is concretely less where it could be — fewer ways to do one thing, fewer places a rule is stated — and whether a before-and-after assessment of the touched surface prefers the after, with a yes or no, its corrections, and the strengths to keep.
- **Out of Scope Everywhere:** I-036 and I-071 as targets of their own (A-3); drawing numbers and arrows as widgets; rails under every type; a list tree; lists in plain code blocks; a real YAML list for a Text value; Option+Up, Option+Down, and dragged text, filed as an issue in Task 11-1; right-click on mobile.

#### Process Overview

- [x] `[Stop: ratified; no code changes before this]`
- [x] **Phase 0** — Drives and Baseline
  - [x] Task 0-1 · The List Types Drive's frame
  - [x] Task 0-2 · The baseline drives
- [x] **Phase 1** — One Scan Per Surface
  - [x] Task 1-1 · One scan per surface
  - [x] Task 1-2 · Drive group 1
  - [x] Review Checkpoint
- [x] **Phase 2** — Markdown Code Blocks and Masked Markers
  - [x] Task 2-1 · Code blocks and masked markers
  - [x] Task 2-2 · Pins and delimiters
  - [x] Task 2-3 · Drive group 2
  - [x] Review Checkpoint
- [x] **Phase 3** — Blank Lines and Numbering
  - [x] Task 3-1 · Block move's home
  - [x] Task 3-2 · The stale drop
  - [x] Task 3-3 · Blank lines and numbering
  - [x] Task 3-4 · Drive group 3
  - [x] Review Checkpoint
  - [x] Compaction Checkpoint
- [x] **Phase 4** — Paste
  - [x] Task 4-1 · Paste
  - [x] Task 4-2 · Drive group 4
- [x] **Phase 5** — One Marker Grammar
  - [x] Task 5-1 · One grammar
  - [x] Task 5-2 · Drive group 5
  - [x] Review Checkpoint
- [x] **Phase 6** — One Set of List Keys, and the Scope's Name
  - [x] Task 6-1 · The scope's name
  - [x] Task 6-2 · `listKeys`
  - [x] Task 6-3 · Drive group 6
  - [x] Review Checkpoint
  - [x] Compaction Checkpoint
- [x] **Phase 7** — One Definition Per Type
  - [x] Task 7-1 · The record
  - [x] Task 7-2 · One name
  - [x] Task 7-3 · The callout head
  - [x] Task 7-4 · Rails read the scan
  - [x] Task 7-5 · Drive group 7
  - [x] Review Checkpoint
- [x] **Phase 8** — The Word Rule
  - [x] Task 8-1 · The word rule
  - [x] Task 8-2 · Drive group 8
  - [x] Review Checkpoint
- [ ] **Phase 9** — Right-Click
  - [ ] Task 9-1 · Removal that stands alone
  - [ ] Task 9-2 · One range
  - [ ] Task 9-3 · The short menu
  - [ ] Task 9-4 · The resting seat
  - [ ] Task 9-5 · The marker seat
  - [ ] Task 9-6 · Drive group 9
  - [ ] Review Checkpoint
  - [ ] Compaction Checkpoint
- [ ] **Phase 10** — Text Properties
  - [ ] Task 10-1 · The pane
  - [ ] Task 10-2 · At rest
  - [ ] Task 10-3 · YAML lists
  - [ ] Task 10-4 · Drive group 10 and the drives that follow
  - [ ] Review Checkpoint
- [ ] **Phase 11** — Docs and Issues
  - [ ] Task 11-1 · Docs and issues
- [ ] *§Final Verification* over `<BASELINE>..HEAD`
- [ ] `[Stop: the final report, per §Final Verification]`

---

### Phase 0 — Drives and Baseline

**GOAL:** Every later checkpoint should drive against a recorded baseline. The rewritten List Types Drive's frame lands first, with today's gated groups gone, and the existing drives prove they're green at the head the run starts from. It holds no production delta.

**RUN START** (before Task 0-1):

1. Start `caffeinate -dims` with `run_in_background`, since rendering stops on a sleeping display.
2. Confirm `git status --short` shows nothing the run will touch. Record beneath BASELINE the comment count and `~/Test`'s hash (`find ~/Test -type f -not -path '*/.DS_Store' -print0 | sort -z | xargs -0 shasum | shasum`).
3. Cut the base worktree in the scratchpad with `.claude/scripts/editor-parity/worktree.sh <BASELINE> "$WT"`, link `$SCRATCHPAD/.claude` to `~/The Studio/.claude` if the worktree sits there, and set `SHOTS` to a fresh scratchpad folder. Each later drive checks the worktree out at its task's commit.

#### Task 0-1

The List Types Drive should stop being gated and take its one-group-per-phase shape, with every still-wanted item returning in the group that owns it.

**AFTER**

`Scouts/Planning/Phases/Phase 0 — Drive Frame.patch`: `.claude/scripts/List Types Drive/live-drive.mjs` (rewritten from 380 lines to a frame: its selectors in one table `S`, `TYPES`, the page and table seeding, and a `GROUPS` table that the usage line and the dispatch both read; `phasedItem`, `POMMORA_LGM_LANDED`, and today's five groups leave), `MATRIX.md` (new), `.claude/scripts/README.md` (the drive's paragraph).

**VERIFY**

- [x] `git grep -n "POMMORA_LGM_LANDED" -- .claude/scripts` prints nothing, and `phasedItem` stands only in the harness and the Path Links Drive.
- [x] With no group yet landed, `node live-drive.mjs` exits 2 at its usage line.

#### Task 0-2

The existing MarkdownPM drives should be green at the BASELINE head.

**VERIFY**

- [x] From the base worktree, one at a time: Text Property group 4 (37/37), Alias group 3 (121/121), Path Links group 9 (498/498), and Editor Parity as `base` and `base2`, whose compare reports 0 differing lines and nine behaviors `same`. Editor Parity's `results/base` stays for later compares.
- [x] A red drive is reported by notification with its failure before Phase 1 opens; one red at the head the run starts from isn't this plan's to fix, and is recorded under *§Deviations*. The same holds at Phase 10 for Properties, Archive, or Option Picker, which this work never changes, once the red reproduces at the BASELINE head.

---

### Phase 1 — One Scan Per Surface

**GOAL:** Each surface should say once what it reads, and its scan should hold exactly that, so a list reader asks the scan rather than taking a scope. It goes first because nothing depends on behavior it changes and every later step then writes its signatures once.

#### Task 1-1

`surfaceScope` should state what a surface reads, a cell's scan should read lists and inline marks alone, and `scope` should leave every reader that can ask the scan.

**AFTER**

`Scouts/Planning/Phases/Phase 1 — One Scan Per Surface.patch` (45 production files, mostly `docScan(view.state.doc)` becoming `docScan(view.state)`). A factory stays only where a mount needs its own closure state, which keeps `linkPointer()`, `citationPointer()`, and `pointerReveal()`.

**VERIFY**

- [x] Before committing, the executor makes each pin's revert as *Phase 1 — Notes* names it (`literalLines`' branch and `withCitations`' scope test removed, and `pastedCellText` on `scanDoc(doc)`), watches the pins fail, then restores them.
- [x] Run the gates; the test count reads the Net Ledger's row.
- [x] `git grep -n -P "readsFrom\b" -- Core/MarkdownPM` still prints its Phase 1 readers, and `git grep -P "\bscope\b" -- Core/MarkdownPM ':!*.test.*' | wc -l` reads 64, from 223.

#### Task 1-2

Drive group 1 should prove each surface reads what it should.

**AFTER**

`Scouts/Planning/Phases/Phase 1 — Drive Group 1.patch`: 27 items at B-11.

**VERIFY**

- [x] `node live-drive.mjs 1` reads 27/27 at this task's head.

#### Review Checkpoint

- [x] Every reader that can ask the scan does, and no surface holds a block it doesn't read; both reviewers' findings folded or recorded.
- [x] *§When Drives Run*'s row for Phase 1 green. Four shots read and captioned.

---

### Phase 2 — Markdown Code Blocks and Masked Markers

**GOAL:** A list inside a Markdown code block should behave as any other list, every other block should stay plain code, and a marker on a sealed line should read as none. `scan.markers` holding only what a line truly has is the whole of C-3, and one field compare carries C-2. It precedes the walks because numbering reads a region rather than a reader.

#### Task 2-1

The scan should mask what a line doesn't hold, and the reader, its `'outside'`, and each refusal built around them should leave.

**AFTER**

`Scouts/Planning/Phases/Phase 2a — Markdown Code Blocks and Masked Markers.patch`.

**VERIFY**

- [x] Run the gates.
- [x] `git grep -n -E "readsFrom|itemAt|'outside'|blockPrefix" -- Core/MarkdownPM ':!*.test.*'` prints nothing.

#### Task 2-2

C-5, C-6, and C-7 should each hold a pin, and a Blockquote or Callout on a lone delimiter line should refuse as every other row does.

**AFTER**

`Scouts/Planning/Phases/Phase 2b — Code-Block Pins and Delimiters.patch`. `setBlock` takes a `fenceDelimiter` condition in its `quote` and `callout` cases. A selection across a whole block still quotes it, since that's a real way to quote a code block.

**VERIFY**

- [x] The delimiter pin reads red without the two conditions.
- [x] Run the gates; the count reads the Net Ledger's row.

#### Task 2-3

Drive group 2 should prove section C live.

**AFTER**

`Scouts/Planning/Phases/Phase 2 — Drive Group 2.patch`: 83 items at C-1 to C-7 and F-1's table header, diff sign, and `-[x]`.

**VERIFY**

- [x] `node live-drive.mjs 2` reads every item passing at this task's head.

#### Review Checkpoint

- [x] A list in a Markdown block is reachable only from inside it, and no reader treats a line in plain code as an item; both reviewers' findings folded or recorded.
- [x] *§When Drives Run*'s row for Phase 2 green. Four shots read and captioned.

---

### Phase 3 — Blank Lines and Numbering

**GOAL:** A blank line should end a list for every reader, and numbers should count a list rather than a run. Three facts each get one owner: `continuesList` says whether a line continues a list, `openerOf` which line speaks for a block, through `sealedBlock`, and `ridesList` joins them for the block model and the rails. It removes the only inference the filter held.

#### Task 3-1

Block moves should leave the list model for a file of their own, unchanged.

**AFTER**

`Scouts/Planning/Phases/Phase 3a — Block Move's Home.patch`. The private `leadOf` takes the name `quoteAndIndent`, since `Input/edits.ts` exports a `leadOf` meaning something else.

**VERIFY**

- [x] Run the gates. Actionable moves by 0.
- [x] `git grep -n "moveRange" -- Core/MarkdownPM/Engine/listModel.ts` prints nothing.

#### Task 3-2

A drop should refuse once the document it was pressed on has changed, at one site for both drags, and a replace swallowing a selection should leave a caret.

**AFTER**

`Scouts/Planning/Phases/Phase 3b — The Stale Drop.patch`. jsdom draws no slots, so group 3's stale-drop items are the refusal's proof.

CodeMirror's `SelectionRange.map` maps `from` forward and `to` backward, so a replace swallowing a selection inverts it, reachable by a drop and by a pick. `caretSeat`'s filter in `decorations.ts` turns that into a caret, and a forward range's head stands, so a line selected through the next line's start leaves that line's hidden lead. A caret and a backward head still seat, so Shift+Home can't select a hidden prefix. `prefixSeat.test.tsx` takes the three pins under *a selection a change or a keystroke has to answer for*.

**VERIFY**

- [x] Each pin's revert as *Phase 3 — Notes* names it, watched red and restored: *a drop past a selection leaves a caret at the change, and typing lands there* and *a pick replacing the marker a selection sits in leaves a caret, and typing lands there* read red with `range` reading `main`, and *a line selected through the start of a carried block keeps the block’s lead* reads red with `head <= anchor` removed.
- [x] Run the gates.

#### Task 3-3

A blank line should end a list, and an edit that reshapes a numbered list should recount that whole list.

**AFTER**

`Scouts/Planning/Phases/Phase 3c — Blank Lines and Numbering.patch`. The filter's `overLines` gate recounts a keystroke over a selection crossing lines, and `renumberRuns`' `i` walks out of every block a position's delimiter stands against.

**VERIFY**

- [x] Each pin's revert as *Phase 3 — Notes* names it, watched red and restored: in `listRenumber.test.ts`, *removing the blank below the block merges the two lists and recounts them* and *taking the item above the block counts past it from its opener* read red with the `while` removed, *taking the item between two blocks counts past both* and *removing the blank below two blocks merges the lists and recounts them* read red with the `while` as an `if`, and *typing or Enter recounts the run it joins* reads red with `overLines` out of the gate.
- [x] Run the gates; the count reads the Net Ledger's row.
- [x] `git grep -n -E "mapAscending|repicked|arrived|runsBelow|runAt|firstItemOf" -- Core/MarkdownPM ':!*.test.*'` prints nothing.

#### Task 3-4

Drive group 3 should prove the walks live, since drop geometry and the rail's draw have no unit pin.

**AFTER**

`Scouts/Planning/Phases/Phase 3 — Drive Group 3.patch`: 82 items at B-5, B-6, B-10, D-2, D-4, and F-1's block drag and flush-line rail, with the stale drop by a glyph and a grip.

**VERIFY**

- [x] `node live-drive.mjs 3` reads every item passing at this task's head.

#### Review Checkpoint

- [x] The walks, the block model, the rails, and the grip end a list at one place, and numbering holds one rule with the drag's stated exception; both reviewers' findings folded or recorded.
- [x] *§When Drives Run*'s row for Phase 3 green. Four shots read and captioned.

---

### Phase 4 — Paste

**GOAL:** A paste that reshapes a numbered list should recount it in the same undo step. It's its own piece of work by F-2, and it follows Phase 3 only because its edits sit in the filter Phase 3 rewrites.

#### Task 4-1

The renumber filter should take a paste, so a paste that reshapes a numbered list recounts in its own undo step.

**AFTER**

`Scouts/Planning/Phases/Phase 4 — Paste.patch`. `Input/listRenumber.test.ts` takes *a paste into a numbered list*, seven cases, each pasting what the app's paste can deliver. A one-line paste keeps `MarkdownPM.md`'s edge rule: it lands without the whitespace at its own edges, so a copied line's trailing break doesn't reach this filter.

**VERIFY**

- [x] `input.paste` out of the gate reads 3 red of 51, and dropping `toB` reads red on the assertion *Phase 4 — Notes* names; both restored.
- [x] Run the gates.

#### Task 4-2

**AFTER**

`Scouts/Planning/Phases/Phase 4 — Drive Group 4.patch`: 15 items at F-2, each sentence of *§Behavior Changes* row 20 through the real paste path.

**VERIFY**

- [x] `node live-drive.mjs 4` reads every item passing at this task's head.

---

### Phase 5 — One Marker Grammar

**GOAL:** A marker should have one classification, so `+` is a plain bullet, `- [] x` is a bullet whose text is `[] x`, the no-space spellings read as plain text, and a box reads only after a bullet. Every later phase then reads `kind` alone.

#### Task 5-1

`LIST_MARKER_RE` should be the one grammar, and `kind` the only classification a reader asks.

**AFTER**

`Scouts/Planning/Phases/Phase 5 — One Marker Grammar.patch`. *Investigation · §The Grammar on the Stack*'s *Observed on That Build* is the behavior contract, and *Phase 5 — Notes* states each row's pin.

**VERIFY**

- [x] Run the gates; the count reads the Net Ledger's row.
- [x] `git grep -n -P "listGlyphOf|drawnKind|ListGlyph|ARROW_MARKER_RE|\.bullet\b" -- Core/MarkdownPM ':!*.test.*'` prints nothing.

#### Task 5-2

**AFTER**

`Scouts/Planning/Phases/Phase 5 — Drive Group 5.patch`: 44 items at B-1, B-2, B-3, B-4, B-9, and F-1's `2. [x] foo`.

**VERIFY**

- [x] `node live-drive.mjs 5` reads every item passing at this task's head.

#### Review Checkpoint

- [x] No reader works around a second classification; both reviewers' findings folded or recorded.
- [x] *§When Drives Run*'s row for Phase 5 green. Four shots read and captioned.

---

### Phase 6 — One Set of List Keys, and the Scope's Name

**GOAL:** A scope should be named for what it reads, and the list keys should be written once, each surface stating only what's left when no list claims a key. This is where Text's third reader of these keys is made one line, without being built.

#### Task 6-1

`MarkdownScope` should read `'page' | 'lists' | 'inline'`, each value naming what a scope reads.

**AFTER**

`Scouts/Planning/Phases/Phase 6a — The Scope's Name.patch`. The word `cell` stays wherever it names a table cell, and no bridge channel changes. `autocomplete.ts`' `!== 'cell'` becomes `=== 'page'`, which the embed pin holds. `inlineSurface` becomes `sharedSurface`, and `textScope.test.tsx` becomes `inlineScope.test.tsx`.

**VERIFY**

- [x] The embed pin reads red with `!== 'lists'`.
- [x] Run the gates. `git grep -n -E "scope: '(cell|text)'|'cell' \| 'text'" -- Core Desktop` prints nothing.

#### Task 6-2

The list keys should be written once in `listKeys`, which `editorBase` mounts for every surface, with each surface stating only what's left when no list claims a key.

**AFTER**

`Scouts/Planning/Phases/Phase 6b — One Set of List Keys.patch`:

| Surface | What It States When No List Claims the Key |
|---|---|
| Page | Tab and Shift-Tab hold; Enter runs its own chain at `Prec.high`, which still calls `continueListOnEnter` between its closers and its quotes |
| Table Cell | Tab, Shift-Tab, and Enter navigate; Shift-Enter stays the cell's own |
| One-Line Field | Enter leaves; Tab is unbound, so the focus moves |

`listKeys` keeps one page-or-not branch, since a page's Enter and deletes hold closers, citations, and quotes a list doesn't.

Two small differences a reader may notice: a cell's list keys scroll the caret into view, and a Backspace on a pane's empty first line takes the break from here on, which Phase 10 brings regardless.

**VERIFY**

- [x] The page's Tab-hold pin reads red without its bindings.
- [x] Run the gates; the count reads the Net Ledger's row.

#### Task 6-3

**AFTER**

`Scouts/Planning/Phases/Phase 6 — Drive Group 6.patch`: 147 items at G-9's key merge, every type on a page and in a focused cell. Phase 6 changes nothing a user sees in these keys, so all 147 are floor items, and they read green at Phase 5's head too.

**VERIFY**

- [x] `node live-drive.mjs 6` reads every item passing at this task's head.

#### Review Checkpoint

- [x] No key is stated twice, and a cell's and a page's keymaps hold only what no list claims; both reviewers' findings folded or recorded.
- [x] *§When Drives Run*'s row for Phase 6 green. Four shots read and captioned.

---

### Phase 7 — One Definition Per Type

**GOAL:** Each list type should have one definition the walks, keys, and menus read, and one name everywhere, with counting and checking the only behaviors that differ. A callout head's dead glyph leaves with the second parse that made it.

#### Task 7-1

Each type's written marker and rail should live in one record, `LIST_TYPES`, with `LIST_KINDS` keeping wording and icons in Actions.

**AFTER**

`Scouts/Planning/Phases/Phase 7a — The Type Record.patch`.

**VERIFY**

- [x] Run the gates. `git grep -n -E "BARE_MARKER|BARE_TASK|listMarkerText|railTypeClass" -- Core` prints nothing.

#### Task 7-2

Every menu should read each type's one name: Bulleted, Numbered, Alphabetical, Checklist, and Arrowed.

**AFTER**

`Scouts/Planning/Phases/Phase 7b — One Name.patch`. A list grip's row reads Format, and the general menu's Lists ▸ stays.

**VERIFY**

- [x] Run the gates. `git grep -n -E "Bullet List|Task List|Numbered List" -- Core ':!*.test.*'` prints nothing.

#### Task 7-3

A callout head should draw no glyph, with its `- foo` showing as text, through `scan.markers` in place of a second parse.

**AFTER**

`Scouts/Planning/Phases/Phase 7c — The Callout Head.patch`. `cached assembly ≡ pure derivation` stays green.

**VERIFY**

- [x] Run the gates.

#### Task 7-4

Rails should read the scan rather than arrays the drawing pass filled as a side effect.

**AFTER**

`Scouts/Planning/Phases/Phase 7d — Rails Read the Scan.patch`. `ridesList` runs only while a list is open, so a list behind an indented quote draws a flush quote's rails.

**VERIFY**

- [x] *an item inside a Markdown code block takes no rail* reads red with `levelAt` reading `scan.markers[i]` bare, and *a wrapped line carries the rail…*'s row on `  > - u\n> \t- r` reads red with `open || level >= 0` as the gate.
- [x] Run the gates; the count reads the Net Ledger's row.

#### Task 7-5

**AFTER**

`Scouts/Planning/Phases/Phase 7 — Drive Group 7.patch`: 29 items at D-3, D-6, and F-1's callout head.

**VERIFY**

- [x] `node live-drive.mjs 7` reads every item passing at this task's head.

#### Review Checkpoint

- [x] A type's text and rail have one home and its wording another, and no reader names a type by hand; both reviewers' findings folded or recorded.
- [x] *§When Drives Run*'s row for Phase 7 green. Four shots read and captioned.

---

### Phase 8 — The Word Rule

**GOAL:** An apostrophe with a letter or digit on both sides should read as part of its word for every word gesture, through CodeMirror's own word characters rather than joined atoms and wrapped commands. It's one answer in one place, and the resting cell Phase 9 seats reads it too.

#### Task 8-1

Every word gesture should read a contraction whole, through `contractions`' answer to CodeMirror's `wordChars`.

**AFTER**

`Scouts/Planning/Phases/Phase 8 — The Word Rule.patch`. `surface.ts` mounts `Prec.high(contractions)`: `charCategorizer` reads the first `wordChars` answer, and `markdown()` mounts ahead of `editorBase()`, so at a bare mount a JS or CSS fence's own answer would win and `don't` there would read `don`.

**VERIFY**

- [x] The pins' reds as *Phase 8 — Notes* names them, including *answers ahead of a fence's language* without the `Prec`.
- [x] Run the gates; the count reads the Net Ledger's row.

#### Task 8-2

**AFTER**

`Scouts/Planning/Phases/Phase 8 — Drive Group 8.patch`: 25 items at E-5 and E-6.

**VERIFY**

- [x] `node live-drive.mjs 8` reads every item passing at this task's head.

#### Review Checkpoint

- [x] Every word gesture reads the one answer, and each accepted departure holds a pin; both reviewers' findings folded or recorded.
- [x] *§When Drives Run*'s row for Phase 8 green. Four shots read and captioned.

---

### Phase 9 — Right-Click

**GOAL:** The right-click route should shrink to what its surfaces genuinely need, with a resting cell keeping its deliberate behavior. One range replaces two, one finite state says which menu a surface asks, a seated word stops being the document's selection, and every read-only surface answers Copy and Select All. Tasks land in this order for a reason: the short menu has to reach every surface before the guards built around surfaces that don't ask can leave.

#### Task 9-1

Guards against states nothing reaches should leave, and a glyph should act on its group.

**AFTER**

`Scouts/Planning/Phases/Phase 9a — Removal That Stands Alone.patch`: rows 2, 3, 6, 10, 12, and 14 of *Gestures Reconciliation · §Verified Removal List*.

**VERIFY**

- [ ] Run the gates. *keeps the page caret and a resting cell’s seated word when the table redraws under its menu* left with the event.

#### Task 9-2

One range should reach every row, and `listReach` should take D-5's rule: a selection inside one line acts as a caret does, and a selection holding a whole line narrows to that item.

**AFTER**

`Scouts/Planning/Phases/Phase 9b — One Range.patch`. Text rows act on the live selection, which CodeMirror maps through a link's settle, so `doc === opened` stays for a glyph alone. `listRenumber.test.ts`' *switching a numbered item out of its run recounts the run below* selects the whole line.

**VERIFY**

- [ ] Run the gates.

#### Task 9-3

Every read-only surface should answer one short menu, and `menu`'s finite state should replace `resting` as the signal.

**AFTER**

`Scouts/Planning/Phases/Phase 9c — The Short Menu.patch`. `MarkdownEditor`'s shell stops `contextmenu`'s bubble, since a glance sits under the same cancelling `PickerMenu` layer as the info pane. Select All focuses the view, so ⌘C reads it from a read-only cell, and a glance records `focusBefore` on any button, so a right press hands focus back on close. A glyph on a read-only surface reads as text.

**VERIFY**

- [ ] Each pin's revert as *Phase 9 — Notes* names it, watched red and restored, with *selects and focuses the page from a read-only table’s Select All, so ⌘C reads it* reading red on its focus assertion with `view.focus()` removed, and *hands focus back after a right press, whose row can ask for focus* reading red with `if (e.button !== 0) return` back.
- [ ] Run the gates. `Desktop/Actions/editorMenu.test.ts`' *matching an editor’s ask to the click* left with `atClick`.

#### Task 9-4

A resting cell's seated word should paint as the `mdpm-seat` highlight rather than the document's selection, and clear when the menu closes.

**AFTER**

`Scouts/Planning/Phases/Phase 9d — The Resting Seat.patch`. `routeRightClick` returns a `Promise<void>` whose `.then` clears the highlight, the one signal, since main resolves on a row and on the popup's close.

**VERIFY**

- [ ] The new pin reads red without the `.then`.
- [ ] Run the gates.

#### Task 9-5

A press left of a glyph should seat at the content in all five shapes, on a right press and a left one, since a seat at the line's start let Bold write `****- First item here`.

**AFTER**

`Scouts/Planning/Phases/Phase 9e — The Marker Seat.patch`. Phase 7's checkpoint settled `seatPastMarker`: its class read leaves here for `const lm = markerIn(scan, k, undefined)` and `return lm && pos >= ls + lm.markerStart && pos <= ls + lm.markerEnd ? ls + lm.contentStart : null`, with `ls` hoisted above 9e's `lead` line, proven at zero differences over 10.8M positions, and `GLYPH_CLASS` stays for its drawing readers. This phase's checkpoint weighs two seats in 9e's shape: a press in a text marker's hidden wide gap stays in the gap (`→   foo`), and a press left of the marker on `- [ ] [^1] y` seats past the footnote.

**VERIFY**

- [ ] Run the gates; the count reads the Net Ledger's row.

#### Task 9-6

**AFTER**

`Scouts/Planning/Phases/Phase 9 — Drive Group 9.patch`: 70 items at D-1, D-2, D-5, E-1 to E-4, E-7, F-2, and B-10. It reads and restores the system clipboard, and `seatRead` reads the registered `mdpm-seat` ranges between `popNative` and `pickNative`.

**VERIFY**

- [ ] `node live-drive.mjs 9` reads every item passing at this task's head, and the orchestrator reads the paint shots itself.

#### Review Checkpoint

- [ ] One range reaches every row, every surface asks, and a resting cell leaves no caret and no document selection behind; both reviewers' findings folded or recorded.
- [ ] *§When Drives Run*'s row for Phase 9 green. Four shots read and captioned.

---

### Phase 10 — Text Properties

**GOAL:** A Text property's pane should take lists in full on the reworked system, reading as always intended, with nothing on disk changing and nothing stored to mark a list. It sits near the end by G-1, so it rides the scan, the keys, and the short menu rather than adding to them.

#### Task 10-1

A Text value's pane should read the `lists` scope and the one-line field `inline`, so the pane takes lists with no pane code.

**AFTER**

`Scouts/Planning/Phases/Phase 10a — The Pane.patch`. The grip's cell rule moves from `markdown-tables.css` to `markdown-pm.css`, since the former loads only by a dynamic import. `ValueEditor` compares against the text as the document holds it, and an outside write lands that text, so a pane closed untouched leaves a `\r\n` value on disk as it was.

**VERIFY**

- [ ] Each pin's revert as *Phase 10 — Notes* names it, watched red and restored, with `TextPane.test.tsx`'s *leaves a value a tool wrote with \r\n as it was when closed untouched, and saves it as written once edited* reading red with `docText`'s replace removed, and *takes an outside write with \r\n as the document holds it, and closes with nothing to save* reading red with `mirrorBody(view, initial)`. `TextPane.test.tsx`'s named assertions changed, and *Escape commits the typed text once, then closes; a second close commits nothing*, *the × commits and closes; an unchanged document commits nothing; a blanked document commits null*, and *%s with the `[[` pane open picks its row, and the pane stays* hold.
- [ ] Run the gates.

#### Task 10-2

A Text value should draw its first line at rest through `renderRestingLine`, marked when it runs on.

**AFTER**

`Scouts/Planning/Phases/Phase 10b — At Rest.patch`. A press on a resting list opens the plain one-line field, and `renderCellContent` loses its export for `renderRestingLine`.

**VERIFY**

- [ ] Run the gates.

#### Task 10-3

A real YAML list should draw as a list.

**AFTER**

`Scouts/Planning/Phases/Phase 10c — YAML Lists.patch`. `writtenSpelling`'s existing compare keeps its shape on disk until the first edit.

**VERIFY**

- [ ] `propertyValue.test.ts`' *free text reads a string as itself, an unquoted wikilink as the connection it spells, a list as its items’ lines, and any other shape as the yaml that spells it* and `governedRoot.test.ts`' *a string keeps a number, a list, and an unquoted wikilink the file spells when it reads as that text, and takes a typed string over anything else* read the new behavior.
- [ ] Run the gates; the count reads the Net Ledger's row.

#### Task 10-4

The List Types Drive's group 10 and the Text Property Drive's rewrite should prove section G live, and the drives reading a resting value should follow the fold.

**AFTER**

`Scouts/Planning/Phases/Phase 10 — Drive Group 10.patch`: 97 items at G-1, G-2, G-5, and G-10. The patch also carries the Text Property Drive rewritten to the log (127 items across its four groups), the Metadata and Path Links drives reading `.cell-text` and a tag on line one, Metadata's `[a, b]` Text case (`•a`, unchanged write, `[a, b]` on disk by G-13), and the Alias Drive's second Enter, which breaks the line, with Escape closing.

**VERIFY**

- [ ] `node live-drive.mjs 10` reads every item passing at this task's head, and the Text Property Drive's four groups read 127/127 with Mute Checked Items turned on by the item that reads a checked box.
- [ ] Alias 3 reads 122/122, Path Links 1 and 9 read 722/722, and Metadata's nine groups read 261/261. Metadata's seed timed out once at planning ("Timed out waiting for 179 seeded pages indexed") and held on two reruns with no change, so one such stop reruns once before it's read as real.

#### Review Checkpoint

- [ ] The pane reads what a cell reads through the same code, the field stays plain, and nothing on disk changed; both reviewers' findings folded or recorded.
- [ ] *§When Drives Run*'s row for Phase 10 green. Four shots read and captioned.

---

### Phase 11 — Docs and Issues

**GOAL:** Every document this work makes false should read true, once, after the last production phase. It holds no production delta, so Phase 10's drives stand for it.

#### Task 11-1

**AFTER**

`Scouts/Planning/Phases/Phase 11 — Docs and Issues.patch`: the five documents *§Reconciliation · Documents* lists, as a true description of the finished editor. I-073 closes and its number carries the new issue for Option+Up, Option+Down, and dragged text; I-036 recounts its compares and defaults at this head.

Nathan's direction during the run: documents change surgically, and whether each one needs changing at all is an open question. The patch is a starting point rather than the AFTER here. Each hunk stays only if a sentence went false, it changes the words that went false rather than the paragraph around them, and a hunk that rephrases, adds description, or restates what still holds leaves. An issue's cite moves only where the cited line did.

**VERIFY**

- [ ] Run the gates; `node .claude/scripts/check-atlas.mjs` exits 0.
- [ ] `git grep -n -E "listGlyphOf|drawnKind|itemAt|readsFrom|wordGestures|joinedWords|Type ▸|Task List|Bullet List" -- .claude/Features .claude/Guidelines .claude/IssuesPM.md` prints nothing false.
- [ ] Every cite in `.claude/IssuesPM.md` the work moved is re-read at this head.

---

### Completion Criteria

- **Conformance:** the implementation adheres to the project's guidelines, Nathan's stated preferences, and *§Constraints*; no mechanism landed that an existing one already provided, every file created or moved is one *§Constraints · Placements* names, and nothing changed outside what the plan named.
- **Correctness:** each decision is observably true, driven live: each surface reads what it should; a marker reads as standard Markdown reads it, within the log's limits; a blank line ends a list for every reader; a list in a Markdown block behaves as any other and draws no glyph, and every other block stays plain code; each type carries one name; a word gesture reads a contraction whole; a right-click on a resting cell acts as if focused and leaves no caret; every read-only surface offers Copy and Select All, with the unmounted info pane standing unproven; and a Text pane takes lists in full, draws its first line at rest, and writes nothing new to disk.
- **Completeness:** every task landed and is ticked; nothing was deferred, narrowed, or left as scaffolding, debug output, or an unauthorized TODO.
- **Confirmation:** every verification ran and its result was read; every pin a phase's *Notes* names goes red without its change.
- **Continuity:** *§Reconciliation* is walked, the project's living documents read true, and every deviation is fixed or ruled on.
- **Confidence:** gates are green from a clean state across the full range from the BASELINE head, and the diff is the size the Net Ledger implied.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

The reviews run over `<BASELINE>..HEAD`, each wave closed before the next opens. Every reviewer brief carries the Approach and Principles verbatim and has its agent read *§Constraints* whole, except the neutral gate's. Every agent here but the neutral gate runs at `opus-xhigh`.

- [ ] **Wave One:** two read-only reviewers briefed with `code-simplification`, one reading inward at the diff and one reading outward against the rest of Core, Desktop, and UIX; one fix agent folds what holds as numbered fixes beside a Not Taken list with reasons; the fold commits, and every drive in *§When Drives Run*'s last row runs from a worktree of that head.
- [ ] **Wave Two:** two fresh reviewers briefed with `adversarial-review`, one inward and one outward, over the folded range and given the Not Taken list, so a fold left out returns only on new evidence; folded, committed, and driven the same way.
- [ ] **Wave Three, Only If It Helps:** run it where Wave Two's folds were structural, as a final look rather than churn for its own sake. The orchestrator states why it ran or didn't.
- [ ] **The Neutral Gate:** one `fable-high` agent given only `<BASELINE>..HEAD`, the Approach and Principles, and the intention under *§Constraints · Neutral Gate*. It answers *§Constraints · The Measure* with a yes or no, its corrections, and the strengths to keep, and is re-run after a fold.
- [ ] **The Own Pass:** the gates from a clean state and `npm run build`; the diff read once; `git diff --stat <BASELINE>..HEAD -- Core/Sync Sync` prints nothing; the comment count sits at or under 3,511; *§Completion Criteria* ticked.
- [ ] **The Teardown:** every worktree the run cut removed with `git worktree remove --force` and `git worktree prune`; `caffeinate` stopped by its task; every scratch Nexus, userData, and script the run made removed, apart from `$SHOTS`, which the report cites.
- [ ] **The Cold-Machine Check:** each of these prints nothing, or only what it names: `git worktree list` (the main checkout alone); `find "$TMPDIR" -maxdepth 1 -name 'pommora-drive-*'`; `ps -o pid,command -A | grep -E "electron|vitest|vite-node|node .*live-drive|caffeinate" | grep -v grep` (only Nathan's own instance); `git status --short` (nothing the run made); and the `~/Test` hash matching Run Start's.
- [ ] **Reconciliation:** *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled, and the plan commits with `--only`.
- [ ] **The Report:** in `closeout-review`'s closeout format, with the range presented through `view-delta`, `<net> (+<added> / -<removed>)` per phase and in total, every deviation, the Cold-Machine Check's result, the screenshots' session, and the neutral gate's answer verbatim. PushNotification tells Nathan it's ready.

#### Reconciliation

Each row's detail sits in *Investigation · §The Reconciliation List*. Tests and comments change with their task's patch; documents change in Task 11-1.

**Documents, Task 11-1:**

- `.claude/Guidelines/Editor-Internals.md:18` — "A cell's document model is page-shaped" — leaves whole.
- `.claude/Guidelines/Editor-Internals.md:40` — the writers, the start rule, siblings, the code-block sentence, and "a blank line carries a run" — rewritten whole, with paste, a keystroke over a selection crossing lines, and the drag's stated exception.
- `.claude/Guidelines/Editor-Internals.md:26` — the grip entry gains the Menu Seat.
- `.claude/Features/MarkdownPM.md:10` — the scope line: Markdown code blocks read lists, and a pane reads what a cell reads.
- `.claude/Features/MarkdownPM.md:22`, `:32`, `:142` — where each states the list rule the work changes.
- `.claude/Features/MarkdownPM.md:24` — `+`, "one indent zone", loose lists, the start rule, the Preserve clause, Format ▸.
- `.claude/Features/MarkdownPM.md:25`, `:257` — `+` takes a rail.
- `.claude/Features/MarkdownPM.md:88` — the shorthand writes `- [ ] `.
- `.claude/Features/MarkdownPM.md:105` — cell keys, the shared scope, a pane's lists.
- `.claude/Features/MarkdownPM.md:130` — the list inset also serves a Text value's pane.
- `.claude/Features/MarkdownPM.md:138`, `:258` — Format ▸.
- `.claude/Features/MarkdownPM.md:146` — one range, read-only menus, a resting seat, the word rule.
- `.claude/Features/MarkdownPM.md:153` — each type's one name.
- `.claude/Features/PropertiesPM.md:60` — a pane's lists and the resting value's mark.
- `.claude/Features/ConfigurationPM.md:152` — Preserve doesn't reach a grip.
- `.claude/IssuesPM.md` — I-073 closes; I-036's text and footnote recount; I-016's `- [] hello` example; I-068 narrows if its fix landed; I-072's footnote cites the moved lines; a new issue for Option+Up, Option+Down, and dragged text.

**Drives, Each Group's Task:**

- `.claude/scripts/README.md:100` — the List Types Drive's and Text Property Drive's paragraphs — Tasks 0-1 and 10-4.
- `List Types Drive/live-drive.mjs` — the gate and every item it held — Task 0-1, rebuilt group by group.
- `Text Property Drive/live-drive.mjs` — the list-as-prose pins, "Enter saves and closes", and a value's later lines — Task 10-4.
- `Path Links Drive/live-drive.mjs:364`, `:408`, `Metadata Drive/live-drive.mjs:237` — `.cell-text-line` and a tag past a value's first line — Task 10-4.
- `Metadata Drive/live-drive.mjs`, group 2's `[a, b]` Text case — reads `•a` and an unchanged write — Task 10-4.
- `Alias Drive/live-drive.mjs:581-582` — a second Enter breaks the line and Escape closes the pane — Task 10-4.

**These Hold:** `.claude/Planning/Text Properties — Implementation Plan.md`, *§Context*, a record of its time, whose reversal the log's *§Sources* names; `editor-parity/run.mjs`.

#### Open Items

None survives ratification. *Morning Report* lists the calls taken for Nathan's eye.

#### Deviations

- **Phase 1's Fold (`1c4888010`, `da068b25d`):** the checkpoint found three readers of cell and Text strings still reading fence-shaped lines through `codeMask` after their surfaces stopped, so a resting cell and a focused cell disagreed on a `§` run, and a Text value drew a link the index and sort couldn't see. `inlineCodeMask` joined `markdownCode.ts` and serves `sectionRunsIn`, `shownProse`, `valueLinks`, and a rename's reach into a Text value, which threads `inCode` through `rewriteConnections`, `rewriteHeadingConnections`, and `fileRewrites`. `listReach`'s `blank` returned to `splitPrefix`'s body, since Phase 1 had changed a pick on an empty callout head. Smaller folds took `cellScan`, `docScan.after(tr)`, and a required `tokenizeChunk` scope, and `citationRowMenu` became a constant. Later rows read about 17 lines, 7 tests, and 2 `scope` sites above their estimates, and every later Measured carries that offset. Phase 2a's `blank` lands as `splitPrefix`'s body rather than the patch's slice.
- **Phase 2's Fold (`842f21193`):** the checkpoint found a row ending on a delimiter writing onto it, so ⌘A then ⌘B on a page ending in a block dissolved the block, and the refusal took one shape in `onDelimiter`. Enter on a blank line in a quoted block stopped ejecting it, `splitPrefix` reads the scan so a callout-shaped line inside a fence is code, a closer indented past its opener holds no list, and `||` and `-[] ` stay literal in display math. `pastSign` states the sign clamp once, and `setBlock`, `canonicalizeCheckbox`, and `takeMarker` read from `k`. Phases 3c, 5, 6b, 7a, and 7c land with `--3way`, keeping `role !== 'content'`, the single `from`, `fenceDelimiter(scan, k)`, `pastSign`, and the `splitPrefix` body. The running offset after Phase 2 is +8 lines and +17 tests.
- **Phase 3's Fold (`7a34e9f8b`):** the checkpoint found a list or block drag recounting whenever lines stood selected elsewhere, since `overLines` read the selection and a drag dispatched bare `input`. Both drags now dispatch `move.drop`, CodeMirror's event for moved content, and no reader needs a move counted as typing. `rolesAgainst` reads `ridesList`, `numbered` hoisted, `runsAround`'s `seen` takes a default, and `blankBody` reads a quote's blank line as blank when a move heals its hole. Phase 4 lands with `--3way`. The running offset after Phase 3 is +9 lines and +22 tests.
- **Phase 5's Fold (`4ca3472d2`):** `parseListMarker` dropped a capture group nothing read, and five pins joined lines nothing checked, among them a box's toggle past a document's first line. Phase 5's patch took `cellScan(text)` where it wrote `scanDoc(text, 'cell')`, so Phase 6a renames the scope once, at `cellScan`'s definition. Phase 7a keeps `const b = m.indices?.[3]` above `if (b)`. The running offset after Phase 5 is +7 lines and +27 tests.
- **Phase 6's Fold (`db74ec96a`):** a cell's Shift-Enter took `insertNewline`, since Enter's move to it left the two keys disagreeing over a selection across items, and Enter's recount there is a third difference beyond Task 6-2's two, one that matches a page. Shift-Backspace joined `editorBase` for every surface, since a cell's eroded a marker. `seatPastMarkerNow` left: a cell's mount dispatches `select.pointer`, and `seated` inlines its seat. Phase 9a's `CellEditor` hunk keeps that event and the reworded comment, and Drive Groups 7 and 8 keep `MATRIX.md`'s new quote line. The running offset after Phase 6 is +2 lines and +30 tests.
- **Phase 7's Fold (`896ed6e9d`):** `readLine` read a marker the scan says isn't there, so Heading or Paragraph on a head like `> [!note] - foo` deleted its visible `- `, and on `$$\n- b\n$$` a formula's dash. `readLine` and `setBlock`'s callout now read `scan.markers[k]`, and `stripInnerMarkers` left. A depth-two `> > - foo` picked Callout now writes `> [!callout] foo`, which goes further than *§Behavior Changes* row 64 states, and a plain code block's `- foo` keeps its dash under Callout. `seatPastMarker`'s fold moved to Task 9-5. The running offset after Phase 7 is +1 line and +31 tests.
- **Phase 8's Fold (`96cd023e4`):** both reviewers found Option-arrow crossing a line break stopping inside a contraction, since CodeMirror takes one categorizer at a gesture's start and `contractions` read only that line, a regression from the joined atoms that planning's single-line differential missed. `contractions` now answers over a window from the previous text line to the next, at +12 lines, so *§Behavior Changes* row 51's quote riding crosses a break too, and row 63 reaches a neighbor word beside a contraction in a language fence. `MATRIX.md`'s two word-rule lines read true, so Drive Groups 9 and 10 keep the new wording, and Task 11-1's sentence on a fence's word characters takes that clause if it stays. The running offset after Phase 8 is +13 lines and +32 tests.
- **For the Morning:** Blockquote and Callout inside a plain code block don't write unaware as C-5's other rows do, and a partial selection reaching a delimiter can still dissolve a block. That matches the baseline, and C-7 keeps Insert ▸ as it was, so it stands until Nathan rules.
- **For the Morning:** dropping an item just under another takes that item's wrapped text or carried block with it, as it does at the baseline, since the bottom boundary reads the item's own line. Reading its sub-block's end is about two lines, but it moves where a parent's drop lands, which is a drag-feel decision.
- **For the Morning:** a code block an item carries draws flush with the page, so the rail crosses its box and text, and a flush line in a cell does the same. Both shots are in `$SHOTS/p3-list-types`. No decision names it.
- **For the Morning:** Enter under a `+` item writes `-`, as B-4 rules, and standard Markdown reads `+ a` then `- b` as two lists, which other apps may space apart. Pommora reads one list, and NexusOS holds no `+` items outside code blocks.
- **For the Morning:** a typed `![[Notes]]` standing alone in a Text value loses its alias when a rename gives the link a path, since `embedLine` reads the value as an embed's line while autocomplete now says only a page draws one. A picked link keeps its alias, so only the bare typed form is exposed.

