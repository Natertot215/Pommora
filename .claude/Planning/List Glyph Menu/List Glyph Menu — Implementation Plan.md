## List Glyph Menu — Implementation Plan

**DATE:** 11-03-2026
**STATUS:** Ratified 11-04-2026
**SOURCE:** *List Glyph Menu — Decisions & Intention* (ratified 11-03-2026, Decisions A-1 to E-4 with its *§Rejections* and *§Constraints*), *List Glyph Menu — Investigation* (Open Calls V-60 to V-67 taken as recommended), and the phase patches and reports in `Scouts/Planning/`, all in `.claude/Planning/List Glyph Menu/`.

**PLAN REVIEWS:** one round, folded (*List Glyph Menu — Plan Reviews*): simplification, 14 findings; adversarial, executed, 11 findings.

**BASELINE** {Filled at ratification; End logged during the final report}

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `9ce2d2b2b` (production as `cd813afdd`, where the phase patches were built) | 9,109 passed, 2 skipped (549 files); comments 3,511 | 11-04-2026 02:11 PM | |

**Run Start:** comments 3,511; `~/Test` hashes `e5a32a5d30d6a11310cd559ee2b1b84b261c3265`; the base worktree is `~/The Studio/Projects/Pommora-LGM-Base` at `9ce2d2b2b`.

**Net Ledger** (production lines from the Actionable column of `view-delta --exclude .claude`, cumulative from the BASELINE head; a phase's own delta is its Measured less the row above):

| Phase | Estimate | Measured |
|-------|----------|----------|
| 0 · Drives and Baseline | 0 (scripts +273: the drive +261, the harness +8, Path Links −8, the README +12) | 0 (+0 / −0) |
| 1 · The List Model | +74 (the rename 0) | +70 (+177 / −107) |
| 2 · One Switch | +143 (+69 its own) | +168 (+619 / −451) |
| 3 · The Glyph Menu | +186 (+18 its own: the patch's +16 and the click test's end rule) | +283 (+843 / −560) |
| 4 · Docs and Issues | +186 (±0 its own; docs +33) | +283 (+843 / −560) |
| **Total** | **+186 excluding comments, against the ratified +159 (+458 / −299); one file renamed, one drive added** | |

`listModel.ts` pairs with its old name at exactly 50% similarity, so `view-delta` may count it as a rename or as a delete and an add; the split moves with it, and the net doesn't.

### Context

MarkdownPM draws a list item's marker as a glyph, and today a list's type changes through two writers that disagree. The grip's **Type ▸** runs `setListKind`, which rewrites every marker in its block and counts the numbers itself by level; **Lists ▸** and the `/` menu run `setList`, which rewrites selected lines, strips the markers when every line already has the kind, and leaves counting to the renumber pass, whose walk matches siblings by exact indent text. The two counts disagree on mixed tabs and spaces and past level 3, and four bugs ride on them: a Checklist re-pick unticks items, Numbered strips a gapped list, the grip renumbers marker-like lines inside code, and a wrapped line becomes an item. A right-click on a bullet or checkbox shows no menu at all, while a number, arrow, or `+` gets the general menu with the caret seated inside the marker. The drag leaves an indented quote behind and can split a nested code block, and the outliner's rails draw past an unrelated heading or paragraph.

*Investigation · §What's True* states the code as it is, every claim re-read at `cd813afdd`. The phase patches in `Scouts/Planning/Phases/` were built at that head, folded after the plan review (*9 — Folds*), and each phase passed all three gates on its own; they replay onto `cd813afdd` to exactly the final tree. The List Types Drive ran during planning: 6 pass, 27 `AWAIT`, and 0 fail against base at `LANDED=0`, and 33 of 33 against the final tree (*9 — Folds · §The Drive*).

### Overview

Five phases should leave one list-type switch, one sibling walk, and one numbering rule behind every list menu, and deliver the feature on them. Right-clicking any list glyph should open a flat native menu of the five types for that glyph's group; **Preserve List-Level Formatting**, on by default under **Outliner Lines**, should decide its reach: on, the group's items of the clicked type; off, the group and everything nested under it. **Lists ▸** should follow the same rules from an item's text, a selection should narrow any pick to the items it touches, and the grip's **Type ▸** should keep its whole block through the same switch. A list written inside a code block should switch within that block, and nothing outside it should reach in.

The order is what makes each step land once. Phase 0 lands the drive and records the baseline, so every later checkpoint drives against it. Phase 1 renames the list model to the file that holds it, then gives it the one walk by quote depth and drawn level, which numbering and the drag read and whose line rule the rails read, so Phase 2's switch arrives on a model that already knows groups, branches, and code blocks. Phase 2 makes `setList` the one switch and moves every caller onto it, Phase 3 adds the glyph menu and the setting's row on top, and Phase 4 makes the docs and issues read true. Production should end about 186 lines heavier, with no file added to production code and the comment count flat at 3,511. *§Constraints · Adherence* states what that buys.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `listModel.ts` • File | `listDragModel.ts` renamed, since it holds the whole list model: siblings, branches, runs, moves, and the code-block read. | `Core/MarkdownPM/Engine/` |
| `readsFrom` • Function | Whether a line is open text to a reader on another line, or to one outside every block: a code block reads only from inside it, math and tables never. | `Engine/listModel.ts` |
| `itemAt` • Function | A line's list marker as a reader on a line, or outside every block, sees it, scoped. Replaces two `scope === 'page' && inSealedLine` copies. | `Engine/listModel.ts` |
| `ListRole`, `rolesAgainst` • Type, Function | One classification of a line against an item: sibling, nested, blank, or ends, by quote depth and drawn level. Replaces `renumberRun`'s indent-text test and `subBlockAt`'s own. | `Engine/listModel.ts` |
| `ownersOf` • Function | The items whose branch covers a line, its own first, read by a pick to find a line's item and by Backspace to keep an owned line's indent; the walk stops at the first line no list above reads past. | `Engine/listModel.ts` |
| `siblingsAt`, `runAt` • Functions | A group's items and the end of its nesting, each side stopping at the first sibling `joins` rejects; a numbered run within it, read through that stop. | `Engine/listModel.ts` |
| `reachEnd` • Function | Where a range's reach ends: a non-empty range ending at a line's start stops on the line before. Read by Lists, Heading, Quote, Code, the selection stats, and `clickInside`; replaces the stats' own copy. | `Engine/markdownCode.ts` |
| `clickInside`, `routeRightClick` • Functions | Whether a right-click lands inside the selection: a glyph on any line the selection touches, a text click between a non-empty selection's start and `reachEnd`; and the one right-click route the live menu and the resting cell call from their own hit tests, asking a glyph's type menu or the format menu, so a text click outside, or at a caret, acts on the word under the pointer and its list rows at the click. Beside them, `keepSeatedSelection`. | `Core/MarkdownPM/Menus/menu.ts` |
| `mapAscending` • Function | The renumber's positions mapped through a transaction in one sweep, as `mapPos(p, -1)` maps each, since mapping each on its own measured quadratic on a 20,000-line pick. | `Input/listRenumber.ts` |
| `continuesList` • Function | How a line that isn't an item reads against a list at a quote depth: nested, blank, or ends. Replaces `nestedUnder` and the walk's own tail; the walk, the block model, and the rails read it. | `Engine/detect.ts` |
| `wordAt` • Function | The one word reader every MarkdownPM word gesture reads: CodeMirror's word, carried across an apostrophe with a word character on both sides as CodeMirror reads one there, so `don't` reads whole and `'quoted'` reads `quoted`. A double-click, the group motions and selections, and a group deletion from a caret read each joined word as one atom while they run, through CodeMirror's own gestures, and both right-click seats take the word under the pointer from it. | `Input/markdownInput.ts` |
| `isWordChar` • Function | The one letter-or-digit test on a string, Unicode-aware, read by the pair markers, the `§` run, and a bare heading link's end. Replaces `isWordCh` and the section scan's `wordChar`. | `Engine/markdownCode.ts` |
| `quoteDepths` • Line Fact | Each line's quote depth, carried with the line facts so the rails read a quote boundary without re-reading every line per keystroke. | `Engine/intents.ts` |
| `drawnKind` • Function | The type a marker reads as: `+` is Arrowed, `- []` has none. | `Engine/intents.ts` |
| `listReach`, `readLine` • Functions | What a list-type pick reaches; one line read by scope. | `Input/format.ts` |
| `'glyph'` • Context Kind | The glyph's menu in the grip's model, sharing the list member's shape, flat and without Delete. | `Core/Actions/gripMenu.ts` |
| `listRows` • Function | The five type rows, built once for **Type ▸** and the glyph menu. | `Core/Actions/gripMenu.ts` |
| `glyphAt` • Function | A pointer event's list glyph on every surface, looked up once for the drag, which owns every press on a glyph, the table's sweep, the editor menu, and the resting cell's menu, whose glyphs carry the same class with the drag cursor scoped to live editors. Replaces four inline copies. | `Core/MarkdownPM/lineDom.ts` |
| `phasedItem` • Function | The drive item that prints `AWAIT` until its owning phase lands, shared by the List Types and Path Links drives. Replaces Path Links' own copy. | `.claude/scripts/drive-harness.mjs` |
| `preserveListLevels` • Setting | **Preserve List-Level Formatting**, `flag(true)`, an editor-setting key, and a row under Outliner Lines carrying Nathan's caption. | `Core/Settings/personalization.ts`, `frames.ts`, `Core/MarkdownPM/api.ts` |
| `repicked` • Parameter | The lines a pick wrote over a whole numbered marker, whose runs restart from 1 or A. | `renumberRuns`, `Input/listRenumber.ts` |
| `List Types Drive/live-drive.mjs` • File | The approved drive, port 9413, 56 items in five groups. | `.claude/scripts/` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `setListKind` • Function | The grip's private writer and its per-level counters. | `Input/format.ts` |
| `listMarkerLines` • Function | The grip's line reader. | `Input/format.ts` |
| The toggle-off • Branch | `setList` stripping markers when every line already has the kind. | `Input/format.ts:302` |
| `listMarkerText`'s `n`, `SelectedLine.kind` • Parameter, Field | Counting the switch no longer does. | `Input/format.ts` |
| `nestedUnder` • Function | The indent-text nesting test. | `Engine/detect.ts` |
| `listKind:` • Action | The grip's second name for `list:`. | `Core/Actions/gripMenu.ts` |
| `listDragModel.ts` • File | Renamed `listModel.ts`. | `Core/MarkdownPM/Engine/` |
| `subBlockAt`'s `inJoinedMath` rule • Branch | The drag's own math rule; display math reads as its opening line in the one walk. | `Engine/listModel.ts` |
| `diffAsSingleReplace` in the list model • Placement | Moved beside `applyEdits`, since it isn't list logic. | `Engine/markdownCode.ts` |
| `markerSpanOf` • Function | Backspace's marker window, folded with the callout branch's copy into `takeMarker`. | `Input/edits.ts` |
| `inJoinedMath` • Function | The grip block's math rule; the block model reads a math range as its opening line, as the list model does. | `Engine/docScan.ts` |

#### Constraints

- **Mandate (Nathan's, verbatim from *Decisions & Intention · §Constraints*):**
  - **Approach:**
    - Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
    - We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
    - We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and fewer headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
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
  - **Planning:**
    1. **Look Outward First:** before designing any piece, name every function, field, file, or rule it would add, and scout what already exists for each.
    2. **Verify Nathan's Claims:** check every architectural claim he makes against the tree and report what contradicts it, plainly; he wants it. Many previous plans had corrections that were  flagged against what went unnoticed during the brainstorming process, and each correction changed the design.
    3. **Ask, With a Read Attached:** where an answer reads more than one way, stop and ask, with what was found, what it implies, and the call put up for correction; Nathan isn't technical, so each question is explained in plain terms.
    4. **Disclose In-Flight Calls:** a judgment made during planning or execution is stated in chat when it's made, and recorded where it changes an outcome.
    5. **Write With Intent:** decisions and plans state intended behavior as intent ("should"), separate from statements of how the code works today, so a future reader never takes a decision for a fact or a fact for a decision.
- **Adherence:** how the plan holds to each principle, so a reviewer can test the plan against it:
  - **Less to Carry:** two list-type writers become one (`setListKind`, `listMarkerLines`, and the toggle leave), two numbering rules become one (the grip's counters and the indent-text walk leave), two action names become one (`listKind:` leaves), the five type rows are built once, two sealed-line copies fold into `itemAt`, and `nestedUnder` leaves for `continuesList`, which the rails read too. The +186 buys the menu and the setting Nathan asked for, the click-time range a text right-click needs, the resting cell's glyph branch, the code-block rule, and the fixes below; the +27 past the ratified +159 is what the checkpoints found: the run below an item's nesting for every edit and in loose lists, display math and a loose item's paragraph in the one walk, an owner stack that finds a line's item as the walk does, one end rule for every line transform, line transforms that edit only their lead, and a renumber that maps its positions and walks its runs once, which took a 20,000-line pick from 13.6 seconds to under 100 ms. *§Net Ledger* holds each phase to its estimate.
  - **Less to Understand:** "what changes a list's type" has one answer (`setList`, addressed by `listReach`), "which items belong together" has one (`rolesAgainst` and `siblingsAt`), "how a list numbers" has one (`renumberRuns`, with its restart and no-op rules stated in its header), and the file holding all of it is named for what it holds.
  - **Clearer Boundaries:** the list model owns structure, the switch owns what a pick writes, the renumber owns counting, and the menus only ask and route. Every new or moved file is one *§Placements* names.
  - **Reads as Designed:** the `-1` reader is named `'outside'`; no phase leaves a transitional form in the final tree. Between Phases 1 and 4, two doc lines name `listDragModel.ts` until Phase 4 rewrites them, and the no-op re-pick line lands in Phase 1 one phase before its first caller (*§Rulings*).
  - **One Way:** one sibling walk by quote depth and drawn level, which numbering, the drag, and the switch read, and one line rule (`continuesList`) the rails read with it; one rule for what a code block lets a reader see; one rule for when a run restarts; one glyph lookup from a pointer event on every surface; one right-click route the live menu and the resting cell share; one document-identity guard shared by the glyph menu and **Lists ▸**; one menu path in the resting cell; one phase-aware drive item, shared by the List Types and Path Links drives.
  - **Real Purpose:** each pin the plan adds or extends pins a behavior a decision names and goes red without its change (*6 — Phases · §New Tests and Their Red Runs*, *9 — Folds · §Pins*).
  - **Reflected Everywhere:** the glyph menu reaches every surface that draws a glyph (page, live cell, page tile, quote, callout, resting cell); **Lists ▸** follows the glyph's rules; the check follows the reach on every list menu.
- **Briefs:** every agent brief on this plan (executors, checkpoint reviewers, the final waves, and every compaction continuation) carries the Approach and Principles above in full and has its agent read *§Constraints* whole from this file before anything else. The neutral gate's brief carries them and nothing else from this plan.
- **Rulings (Not Re-Raised):** the entries in *Decisions & Intention*, its *§Rejections*, and *Investigation · §Open Calls* (V-60 to V-67, taken as recommended) aren't re-raised, and a reviewer's disagreement with one is noted unless it names a mechanism they missed. These planning calls stand too: the no-op re-pick line lands in Phase 1 with the renumber rule it belongs to rather than with its first caller (P6-Q1); I-036's recount to 23 compares and 15 defaults, with base at 22 and 14 (P6-Q2); the two doc lines naming `listDragModel.ts` wait for Phase 4 (P6-Q4).
- **Placements:** every new, moved, renamed, or deleted file is one of these, and no other file is created: `.claude/scripts/List Types Drive/live-drive.mjs` (new, approved); `Core/MarkdownPM/Engine/listModel.ts` and `listModel.test.ts`, renamed from `listDragModel.ts` and `listDragModel.test.ts` (approved); *List Glyph Menu — Results* beside this plan, the Interaction Sweep's record (ratified with it). The drive harness exports the phase-aware drive item that the List Types and Path Links drives share (approved). Ratification commits the topic's planning folder, `.claude/Planning/List Glyph Menu/`, whole, after a `git add` of it, so the run starts from a tree with nothing of its own untracked.
- **Plan Rules:** a task's AFTER is its phase patch in `Scouts/Planning/Phases/`, as if inlined, with any difference the task names; this plan stands wherever it and a report differ. Removal comes first in every phase, and every phase patch was built against `cd813afdd`; if the head has moved, `git apply --3way` lands it, and a conflict resolves toward the patch's intent and is recorded under *§Deviations*. A test that changes asserts the behavior a decision names rather than being bent to pass. Consolidation that's unambiguously right needs no sign-off; an obvious fold Nathan would answer "fix it here" to, with no architectural risk or domino effect, is included and recorded under *§Deviations*, and anything larger is recorded there for him.
- **Tests:** a test is added only where what it pins is clearly defined and genuinely needs to exist. The plan adds seven pins (P6-T1 to P6-T7) and extends two (*9 — Folds · §Pins*), each run red without its change during planning and run red again by its executor before the task commits; a rewritten case counts as that test.
- **Comments:** the production comment count, `git grep -c -E '^[[:space:]]*(//|/\*\*|/\*)' -- 'Core' 'Desktop' 'UIX' 'Sync' ':!*.test.*'` summed, reads 3,511 at the BASELINE head and 3,511 at the end; Phase 1 ends at +1 and Phase 2 at −1, and no task adds a comment the ledger in *6 — Phases · §Comment Ledger* doesn't name, as *9 — Folds* rewrote it in place. A rewrite in place counts zero.
- **Documentation:** feature documentation changes by one or two sentences; deleting a sentence the work makes false, and the setting's row in the settings table, don't count against it. *§Reconciliation* is the list.
- **The Caption:** Nathan wrote **Preserve List-Level Formatting**'s caption: *"Leave indented lists and other types unchanged when adjusting a list's format."* The row takes it in Task 3-1 and `ConfigurationPM.md`'s row in Task 4-1, verbatim with the trailing period every prose caption carries.
- **Sync:** nothing here makes decisions for sync work. `git diff --stat <BASELINE>..HEAD -- Core/Sync Sync` prints nothing at the end. The only persisted addition is `preserveListLevels`, which a Nexus stores only when it's off.
- **Gates:** "Run the gates" means `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root, lint clean. A file written by a shell command skips Biome's hook, so `npm run format` follows any scripted edit. `npm run build`, confirming `✓ built in`, runs from a clean state at the final head.
- **Commits:** each task commits once its VERIFY passes, through `git commit --only -m "…" -- <paths>` after `git add` for new or renamed files (*Development-Environment · §Gates & Commits*). Messages are past tense, one to three sentences, and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The post-commit hook pushes `active`. A Bash command carrying `git` can't contain a personal name anywhere, paths included. The plan file commits with `--only` whenever its BASELINE, Net Ledger, ticks, or *§Deviations* change.
- **The Number:** every phase's VERIFY runs `python3 ~/"The Studio/.claude/scripts/view-delta/view-delta.py" <BASELINE>..HEAD --exclude .claude` and records the **Actionable** column in the Net Ledger's Measured, cumulative. A phase whose own delta lands above its estimate is reported in chat before the next opens, with what the increase buys.
- **Live Drives:** Nathan takes no hand checks. Every outcome runs through the List Types Drive and the four existing MarkdownPM drives, each from a worktree (`.claude/scripts/editor-parity/worktree.sh <sha> "$WT"`), with `POMMORA_DRIVE_REPO="$WT"`, `POMMORA_DRIVE_SHOTS="$SHOTS/<task>-<drive>"`, and `run_in_background`. Drives run one at a time, since each backs up and restores `~/Test` and `sweepStrays` kills any other drive's instance; no agent starts one while one runs. The app is never launched from the main checkout, where Nathan's instance runs, and that instance is never stopped.

  | Drive | Command (from its folder) | Port | Time |
  |---|---|---|---|
  | List Types | `POMMORA_LGM_LANDED=<phase> node live-drive.mjs 1 2 3 4 5` | 9413 | about 1 min |
  | Text Property, group 4 | `node live-drive.mjs 4` | 9353 | about 1 min |
  | Alias, group 3 | `node live-drive.mjs 3` | 9373 | about 2 min |
  | Path Links, group 9 | `POMMORA_PL_LANDED=9 node live-drive.mjs 9` | 9383 | about 4 min |
  | Editor Parity | `./launch.sh <label> "$WT" 9444 && node run.mjs <label> 9444; ./stop.sh 9444`, then `node compare.mjs base <label>` | 9444 | about 1 min a build |

  Editor Parity raises a real, focus-taking window while it runs; its compare against Task 0-3's `base` should report 0 differing lines and every behavior `same`, since no fixture or behavior it records changes under the decisions.
- **When Drives Run:**

  | When | Run |
  |---|---|
  | Task 0-2 | List Types at `LANDED=0` against the base build |
  | Task 0-3 | Text Property 4, Alias 3, Path Links 9, and Editor Parity twice (`base`, `base2`) |
  | Phase 1's checkpoint | List Types at `LANDED=1`; Editor Parity against `base` |
  | Phase 2's checkpoint | List Types at `LANDED=2`; Path Links 9; Text Property 4 |
  | Phase 3's checkpoint, after its folds | All five, List Types at `LANDED=3` with every item passing |
  | After each folded wave | All five |

  A checkpoint's drives run after its reviewers' folds land, from a worktree of the folded head, and each checkpoint's VERIFY reads its row here as the one schedule.

- **Screenshots:** Remote Control shows what the session reads, so the orchestrator itself runs `Read` on four to six named shots per checkpoint, any `failure` shot first, with one caption line each: what it shows and whether it's right. Shots live in the session scratchpad.
- **Execution:** the plan runs end to end through `c/plan-execution`, and no step waits on Nathan before the final report; a message from him during the run is input to fold in, not a stop. An ambiguity is taken at its simplest reading and recorded under *§Deviations*. Each task goes to an `execution-agent` (`opus-medium`) informed of *§Context* and *§Overview*, which applies the task's AFTER as written and reports insights, concerns, and suggestions rather than diverging; the orchestrator checks its result against AFTER and VERIFY. PushNotification marks every checkpoint (review, compaction, the caption's stop, and each final wave) and every update to Nathan, in plain language: what landed, what the drives and reviewers found, and what's next.
- **Reviews:** a review checkpoint is two read-only agents at `opus-high`, one under `code-simplification` and one under `adversarial-review`, each weighing the phase against these constraints and its place in the plan, reading outward rather than in isolation; what holds is folded before the next phase opens. *§Final Verification* holds the waves after the last phase.
- **Cold Machine:** the run should end ice-cold, with no process, test run, drive instance, worktree, scratch Nexus, userData, fixture, or script of its own left, proven by *§Final Verification · The Cold-Machine Check*. Each task stops every process it starts before it commits, so nothing runs between tasks; the base worktree and its `results/base` are the one fixture held across tasks, for the compares, and the teardown removes them. An instance Nathan launched himself isn't the run's, and it's left alone.
- **Neutral Gate:** the post-implementation neutral reviewer (`opus-high`) gets only the BASELINE head, HEAD, the Approach and Principles, and this intention: *"Pommora's Markdown editor changed a list's type through two writers that disagreed: the block grip's Type menu counted numbers itself by level, while the right-click menu's Lists submenu rewrote selected lines, stripped markers on a repeated pick, and left counting to a renumber pass that matched siblings by exact indent text. A right-click on a bullet or checkbox showed no menu. This work should leave one list-type switch, one sibling walk by quote depth and drawn level that numbering, the drag, and the switch share, whose line rule the outliner's rails read too, and one numbering rule, and on them a menu of the five list types on every list glyph, whose reach a setting, Preserve List-Level Formatting, decides; the Lists submenu follows the same rules from an item's text, and a list inside a code block switches within that block while nothing outside reaches in; a right-click outside the selection acts on the word under it on every surface, and every word selection in the editor reads one word rule, in which an apostrophe between letters is part of the word."*
- **The Measure:** the neutral gate answers whether the result is concretely less where it could be — fewer ways to do one thing, fewer places a rule is stated — and whether a before-and-after assessment of the touched surface prefers the after, with a yes or no, its corrections, and the strengths to keep.
- **Out of Scope Everywhere:** I-036's own solution (the scope table) beyond the sites this work threads; the fixes for I-037, I-059, I-068, I-017, I-021, and I-039, whose cites alone Task 4-1 corrects; the heading outline and folding; Heading ▸ Paragraph dropping a nested item's indent (V-67); right-click on mobile.

#### Process Overview

- [x] `[Stop: Nathan ratifies; no code changes before this]`
- [x] **Phase 0** — Drives and Baseline
  - [x] Task 0-1 · Run Start
  - [x] Task 0-2 · The List Types Drive
  - [x] Task 0-3 · The baseline drives
- [x] **Phase 1** — The List Model
  - [x] Task 1-1 · The rename
  - [x] Task 1-2 · One walk, one read rule, one count
  - [x] Review Checkpoint
- [x] **Phase 2** — One Switch
  - [x] Task 2-1 · `setList` and every caller
  - [x] Review Checkpoint
  - [x] Broader Review Checkpoint
  - [x] Compaction Checkpoint
- [x] **Phase 3** — The Glyph Menu
  - [x] Task 3-1 · The glyph menu, the click-time range, the resting cell, and the row
  - [x] The Interaction Sweep
  - [x] Review Checkpoint
- [x] **Phase 4** — Docs and Issues
  - [x] Task 4-1 · Docs and issues
- [ ] *§Final Verification* over `<BASELINE>..HEAD`
- [ ] `[Stop: the final report, per §Final Verification]`

---

### Phase 0 — Drives and Baseline

**GOAL:** Every later checkpoint should drive against a recorded baseline. The List Types Drive lands first and runs against today's build, so its selectors meet the app before any production change and its owned items print `AWAIT` until their phase lands; the four existing drives prove they're green at the head the run starts from. It holds no production delta.

#### Task 0-1

The run should start from a known head and a known `~/Test`.

**PROCEDURE**

1. Ratification filled BASELINE's head, tests, and start. Confirm `git status --short` shows nothing the run will touch, and record beneath BASELINE the comment count (*§Constraints · Comments*) and `~/Test`'s hash (`find ~/Test -type f -not -path '*/.nexus/index*' -print0 | sort -z | xargs -0 shasum | shasum`).
2. Cut the base worktree: `.claude/scripts/editor-parity/worktree.sh <BASELINE> "$HOME/The Studio/Projects/Pommora-LGM-Base"`.

**VERIFY**

- [x] BASELINE reads 549 files, 9,109 passed, 2 skipped, or the head's own counts with the difference explained; the comment count reads 3,511 or the head's own.
- [x] The plan commits with the comment count and the hash recorded.

#### Task 0-2

The List Types Drive should land and meet the app.

**AFTER**

`Scouts/Planning/Phases/Phase 0 — Drives.patch`: `.claude/scripts/List Types Drive/live-drive.mjs` (new; 33 items, each tagged with its owning phase and printing what its press hit while it awaits), `.claude/scripts/drive-harness.mjs` (`rowsOf` records a row's `checked`; `phasedItem(landed)` exported), `.claude/scripts/Path Links Drive/live-drive.mjs` (its own phase-aware `item` replaced by `phasedItem`, its tally keyed by string group), and `.claude/scripts/README.md` (the drive's paragraph).

**PROCEDURE**

1. Apply the patch. The drives run from their folders in the main checkout, and `POMMORA_DRIVE_REPO` points them at a worktree's build.
2. Run the drive at `POMMORA_LGM_LANDED=0` with `POMMORA_DRIVE_REPO` at the base worktree. Every Phase 0 item should pass, and every other item should print `AWAIT` with evidence in its detail that its target was hit; a miss is fixed in the drive within this task. The planning build already ran it this way green (*9 — Folds · §The Drive*).

**VERIFY**

- [x] Run the gates; the drive's run reads every Phase 0 item `pass` and no `FAIL`, and every other item's `AWAIT` detail shows its target was hit (rows printed, or a body changed by base behavior); the orchestrator reads and captions the drive's four shots (the page's list, the cell, the resting cell, and Pages & Writing), since a native menu records as rows rather than in a shot.
- [x] The README's paragraph matches the drive's groups and port.

#### Task 0-3

The four existing MarkdownPM drives should be green at the BASELINE head.

**VERIFY**

- [x] From the base worktree, one at a time: Text Property 4 (37/37), Alias 3 (121/121), Path Links 9 (498/498, the first live run of its `phasedItem`), and Editor Parity as `base` and `base2`, whose compare reports 0 differing lines and nine behaviors `same`. `results/base` stays for the later compares.
- [x] Any red drive is reported in chat with its failure before Phase 1 opens; one red at the head the run starts from isn't this plan's to fix, and is recorded under *§Deviations*.

---

### Phase 1 — The List Model

**GOAL:** The list model should be one file, named for what it holds, with one answer to which lines belong together and one rule for what a code block lets a reader see, so numbering and the drag read the same structure, and the rails its line rule, before the switch arrives. It closes the drag's quote and fence splits and the rails' heading and paragraph shapes, and it holds the floor's two numbering regressions out (P6-T2, P6-T4). The rename is its own task, so the history follows the file and the second task's diff reads as change rather than move.

#### Task 1-1

`listDragModel.ts` should become `listModel.ts`, with its test and every importer, and nothing else.

**AFTER**

`Scouts/Planning/Phases/Phase 1a — The Rename.patch`: the rename at 100% similarity (its test at 99%, its import line), and the importers `Citations/citationEdits.ts`, `Gestures/blockDrag.ts`, `Gestures/listDrag.ts`, `Input/listRenumber.ts`, `Tables/cellStatic.tsx`, `Core/Pages/pageEditor.ts`, and `regressionPins.test.ts`.

**PROCEDURE**

1. Apply the patch, which performs both renames.
2. Once VERIFY passes, `git add -A -- Core/MarkdownPM/Engine/listDragModel.ts Core/MarkdownPM/Engine/listModel.ts Core/MarkdownPM/Engine/listDragModel.test.ts Core/MarkdownPM/Engine/listModel.test.ts`, then commit with `--only` naming those four paths and the seven importers, so the deletions land with the additions.

**VERIFY**

- [x] Run the gates: 9,109 passed, unchanged.
- [x] `git grep -n "listDragModel" -- Core` prints nothing; `git log --follow --oneline -2 -- Core/MarkdownPM/Engine/listModel.ts` reaches the file's earlier history.

#### Task 1-2

One walk by quote depth and drawn level should answer siblings, nesting, and runs for numbering, the drag, and the rails, with the code-block read rule, the old-marker gate, the re-pick restart, and the no-op re-pick in the renumber.

**Delivers:** B-5, B-6, B-9's restart, B-10, B-11, B-15, B-16, and C-7's read rule; A-10 for numbering and the drag.

**AFTER**

`Scouts/Planning/Phases/Phase 1b — The List Model.patch`:

- **`Engine/listModel.ts`:** `readsFrom(scan, k, from: number | 'outside', scope)`, `itemAt(scan, k, from, scope)`, `ListRole` and `rolesAgainst`, which returns `'outside'` only for a shallower quote depth (K4) and reads a code block it's outside of as the block's opening line (C-7), `siblingsAt`, `subBlockAt(scan, pos, scope)`, `runAt`, and `renumberRuns(scan, scope, at, arrived, repicked)`, whose run restarts from 1 or A when it holds a `repicked` line.
- **`Engine/detect.ts`:** `nestedUnder` leaves for `continuesList`, `!/^[^ \t]/` (V-45's narrower class).
- **`Engine/intents.ts`:** the rail pass reads `continuesList` and resets with `railKind.length &&= 0` (V-54's guard).
- **`Engine/blockModel.ts`**, **`Gestures/listDrag.ts`:** read `continuesList` and `itemAt`; the drag's sealed-line note leaves for `readsFrom`'s doc.
- **`Input/listRenumber.ts`:** the old-marker gate (B-10), `repicked` from writes over a whole numbered marker (B-9), deletions read from `'outside'`, the no-op re-pick, `if (repicked.size > 0 && applyEdits(scan.text, changes) === startDoc) return {}` (V-61), and the header rewritten in place.
- **Tests:** P6-T1 to P6-T4 added; P6-C2 (the rails pin), P6-C3 (the code-block pin), and P6-C4 (mechanical) changed.

**VERIFY**

- [x] Before committing, the executor makes each pin's single revert as *6 — Phases · §New Tests* and *9 — Folds · §Pins* name it, watches that pin fail as recorded, then restores it. P6-T2 pins two halves, each with its own revert: `readsFrom` forced open counts into the code, with the math pin failing beside it, and a non-item line read as `'outside'` in `rolesAgainst` stops the count at the fence, failing T2 alone.
- [x] Run the gates: 9,113 passed, 2 skipped.
- [x] `git grep -n "nestedUnder" -- Core` prints nothing; the comment count reads BASELINE + 1.
- [x] `railIntents` in the landed tree matches the patch's hunk exactly, the code V-54 measured at base cost on every document shape; any difference re-opens that measurement before the task commits.
- [x] The Number recorded for Phase 1; its own delta about +74.

#### Review Checkpoint

- [x] The list model reads one structure from every caller, and nothing outside a code block reaches its lines; both reviewers' findings folded or recorded.
- [x] *§When Drives Run*'s row for Phase 1 green, with Phase 0 and 1 items passing and the rest `AWAIT`. Four shots read and captioned.

---

### Phase 2 — One Switch

**GOAL:** Every list-type pick should run through `setList`, addressed by `listReach`, with one numbering rule behind it, and every caller should move onto it in the same step, so no second writer or second action name outlives the phase. It delivers the setting's reach, the selection rule, the check, `+` as Arrowed, the cell's literal `>`, and the grip's whole block through the switch. It's one task because the signature moves `editFor`, `setList`, `listKindOf`, and `readFormatState` together, and no smaller slice stays green; most of its whitespace-only lines are `gripMenu(scope)`'s re-indent.

#### Task 2-1

`setList` should be the one switch, and every caller should reach it with the settings and the surface's scope.

**Delivers:** A-3, B-1 to B-4, B-7, B-8, B-12, B-13, B-14, C-1, C-3 to C-5, C-7's pick, D-1 to D-3, E-1's default, and E-4.

**AFTER**

`Scouts/Planning/Phases/Phase 2 — One Switch.patch`:

- **`Input/format.ts`:** `setList(scan, from, to, kind, settings, scope)` over `listReach(scan, from, to, settings, scope)`: a caret takes its item's group (on: siblings drawn as its type; off: the siblings and their nesting), a range takes every item it touches, in one forward pass that carries the current item, and turns plain lines into items; a range ending at a line's start stops at the line before; a continuation answers for its item; a code block's lines are reached only by a pick wholly inside it, and math, tables, a callout's head, and a fence's delimiters never are. An item already drawn as the type is left alone, a numbered or lettered one is written over so the renumber restarts its run. `listKindOf` reads the reach; `readLine` reads a line by scope; `splitPrefix` takes the scope through `blockPrefix`. `setListKind`, `listMarkerLines`, the toggle-off, `listMarkerText`'s `n`, and `SelectedLine.kind` leave.
- **`Engine/intents.ts`:** `drawnKind`.
- **`Input/formatState.ts`:** `readFormatState(scan, from, to, settings, scope)` checks through `listKindOf`.
- **`Input/edits.ts`:** `blockPrefix` exported.
- **`Input/listRenumber.ts`:** `RELIST`'s doc rewritten in place.
- **`Menus/gripMenu.ts`**, **`surface.ts`:** `gripMenu(scope)`; Type ▸ through `editFor` and `applyEdit`.
- **`Menus/menu.ts`:** `applyEditorAction(view, action, scope = 'page')` reads the host's settings (V-65 keeps its default).
- **`Tables/cellStatic.tsx`:** the new `editFor` and `readFormatState` arguments.
- **`Core/Actions/gripMenu.ts`:** `listKind:` folds into `list:`.
- **`Core/MarkdownPM/api.ts`**, **`Core/Settings/personalization.ts`:** `preserveListLevels` as an editor-setting key and `flag(true)`.
- **Tests:** P6-T5 to P6-T7 added, P6-T7 and the selection pin extended (*9 — Folds · F-T1, F-T2*); P6-C5 to P6-C10 changed.

**Difference From the Patch:** `itemAt`'s reader widened to `number | 'outside'` with Phase 1's folds, and the B-10 and deletion pins in `listRenumber.test.ts` moved, so the patch lands with `--3way`, its conflict resolved toward the patch's intent.

**VERIFY**

- [x] Before committing, the executor makes each pin's single revert as *6 — Phases · §New Tests* and *9 — Folds · §Pins* name it, watches that pin fail as recorded, then restores it.
- [x] Run the gates: 9,116 passed, 2 skipped.
- [x] `git grep -n -E "setListKind|listMarkerLines|listKind:" -- Core` prints nothing; the comment count reads BASELINE.
- [x] The Number recorded for Phase 2; its own delta about +69.

#### Review Checkpoint

- [x] One writer, one action name, and one check rule hold on every list menu, and the grip's block output matches today's on the *§Decisions* example; both reviewers' findings folded or recorded.
- [x] *§When Drives Run*'s row for Phase 2 green, with Phases 0 to 2 items passing and the rest `AWAIT`. Four shots read and captioned.

#### Broader Review Checkpoint

Phase 2 takes a second review once its folds land, by Nathan's direction: three read-only `opus-high` reviewers, one on Phase 2's own work, one on the entire plan as Phases 0 to 2 left it, and one reading outward against the rest of the codebase, each weighing what it reads against the Approach and Principles.

- [x] The three reviewers' findings folded or recorded, each fold with its pin run red.
- [x] After any fold, *§When Drives Run*'s row for Phase 2 green from a worktree of the folded head.

#### Compaction Checkpoint

- [x] The orchestrator reconciles Phases 0 to 2 against the plan, ticks *§Process Overview*, records the Net Ledger and any *§Deviations*, and prepares the continuation through `c/pre-compaction`, then carries on without a stop.

---

### Phase 3 — The Glyph Menu

**GOAL:** Right-clicking any list glyph should open its flat type menu on every surface that draws one, a text right-click's list rows should act where the click landed, and the setting should be reachable in Settings. It's one task because the menu context, the live branch, and the resting branch answer one gesture together; the glyph lookup becomes one function in the same step, and the resting cell reads a glyph's line one way.

#### Task 3-1

The glyph should open its type menu, list rows should act over the click-time range, and the setting's row should appear under Outliner Lines.

**Delivers:** A-1, A-2, A-4 to A-9, A-10 for the menu, C-2, C-6, and E-2. E-3 adds no code; A-7 holds by construction and the drive proves it.

**AFTER**

`Scouts/Planning/Phases/Phase 3 — The Glyph Menu.patch`:

- **`Core/Actions/gripMenu.ts`:** `{ kind: 'list' | 'glyph'; current }`, `listRows` for Type ▸ and the glyph, no Delete on a glyph.
- **`Menus/menu.ts`:** a glyph target asks `host.menus.grip({ kind: 'glyph', current })` and prevents the default; list rows act over the click-time range behind a document-identity guard, every other row on the live selection; `applyEditorAction` takes the range.
- **`Core/MarkdownPM/lineDom.ts`:** `glyphAt(e)`, beside `gutterLineAt`; `Gestures/listDrag.ts`, `Tables/MarkdownTable.tsx`, `Menus/gripMenu.ts` (its right-press suppression), and `Menus/menu.ts` call it.
- **`Tables/cellStatic.tsx`:** one resting menu flow answering a glyph, `restingRange(cell, at, length)` taking the resolved offset with a glyph's read through `srcOf`, and `claimCheckbox` through `srcOf` (K3).
- **`Core/Settings/frames.ts`:** the toggle directly beneath Outliner Lines, with Nathan's caption (*§The Caption*).
- **Tests:** P6-C11 changed.

**Difference From the Patch:** a click counts as inside the selection by the same end rule the reach reads, so `editorMenu`'s test and `restingRange` compare against `reachEnd(doc, from, to)`, imported from `Engine/markdownCode.ts`, rather than the raw end; otherwise a glyph right-pressed just below a triple-clicked line acts on the selected line and leaves its own group untouched (B-7). One pin covers it (triple-click A, right-press B's glyph, B's group changes), run red against the patch's raw test, and the List Types Drive gains the same case as a Phase 3 item in its existing shape.

**VERIFY**

- [x] Run the gates: every test passes but the 2 skipped, the count up by this task's one pin; the comment count reads BASELINE.
- [x] The Number recorded for Phase 3; its own delta about +18.

#### The Interaction Sweep

Every interaction the feature can meet should be driven or probed, and every result should read as the feature intends, before Phase 3's reviewers open.

**PROCEDURE**

1. An agent under `interaction-testing` (`opus-high`) enumerates the matrix from *Decisions & Intention* and the landed code: each gesture (a glyph's right-press, a text right-click with and without a prior selection, a triple-click, a drag-selection ending at a line's start, ⌘A, the grip's Type ▸, Lists ▸, `/`, ⌘Z after each) on each surface (page, live cell, resting cell, page tile, quote, callout, code block, read-only file history), over each list shape (flat, nested, mixed types, loose, a loose item's second paragraph, wrapped, `+`, `- []`, checked boxes, numbered with gaps and past 1, mixed indentation, deeper than level 3, a quote, code block, or display math under an item), with the setting on and off. It also covers a glyph right-pressed at a line-shaped selection's edge (a triple-clicked line, then the next line's glyph); Heading ▸, Quote, and Code Block over a triple-click and over a partial two-line selection picked twice; Backspace on a marker, a whole-line deletion, Tab out of a run, and a drag, each reading the run below, in tight and loose lists; Enter and Tab inside display math; a range whose top line is a nested item's continuation; and a selection mixing items and plain lines, for the check.
2. Each cell is driven by the List Types Drive or probed through `vite-node`, and a case the drive lacks is added to it in its existing shape, owned by Phase 3.
3. The orchestrator reads every result against the decision it should prove and writes one line per case into *List Glyph Menu — Results* beside this plan, or into *§Deviations*: a result that's technically green but wouldn't make sense to a user is a failure, fixed here.

**VERIFY**

- [x] Every matrix cell has a driven or probed result, read and judged; none is left "not covered" without a reason in *§Deviations*.
- [x] Run the gates; the List Types Drive at `LANDED=3` passes every item, the new ones included.

#### Review Checkpoint

- [x] Every surface that draws a glyph answers its right-press with the type menu, and no list row acts on the platform's seated word; both reviewers' findings folded or recorded.
- [x] *§When Drives Run*'s row for Phase 3 green: all five, every List Types item passing. Six shots read and captioned: the List Types Drive's four (the example before B's pick, a live cell's list, a resting cell's `> a` item, and Settings › Pages & Writing with the captioned row), whose native menus the drive records as rows, and one each from Path Links and Text Property.

---

### Phase 4 — Docs and Issues

**GOAL:** Every document this work makes false should read true, and the issues index should state the code as it ends. Docs land after the last production phase so nothing they describe is still changing. It holds no production delta, so Phase 3's checkpoint drives stand for it and the final waves drive again.

#### Task 4-1

**AFTER**

`Scouts/Planning/Phases/Phase 4 — Docs and Issues.patch`: `.claude/Features/MarkdownPM.md` (the Lists bullet's last sentence rewritten as one sentence; "a list glyph" joins the right-press list), `.claude/Features/ConfigurationPM.md` (the setting's row), `.claude/Guidelines/Editor-Internals.md` (the list-numbering bullet rewritten in place to state the one rule, and the cell-model bullet naming `listModel.ts` and `itemAt`), and `.claude/IssuesPM.md` (I-036 recounted at the head, the rails issue removed once its quoted-list case is fixed, I-071 added for the right-click rule across surfaces, I-072 added for unifying MarkdownPM's drives, the lines the work moves re-cited in I-013, I-036, I-057, and I-071, `index-issues.py` run).

**Difference From the Patch:** I-017's and I-039's `Menus/gripMenu.ts` cites, already off at base, are re-cited to the final tree, since this work rewrites the file they point into. The rails issue's two quoted-list residuals P4-K1 recorded, a nested item inside a quote directly after an outer list keeping the outer rail and a wrapped line inside a quoted list ending the rails below it, are fixed at Phase 3's checkpoint, so the issue leaves the index. Every line cite the patch writes (`[^13]`, `[^17]`, `[^36]`, `[^57]`, `[^71]`, and I-017's and I-039's) and I-036's counts are re-read at the head Task 4-1 lands on, since the checkpoint folds moved `format.ts`, `listModel.ts`, `listRenumber.ts`, and `edits.ts`. `Editor-Internals.md`'s rewritten bullet names what rides an item as the code now reads it: a wrapped line, a quote, a code block, display math, or a loose item's blank-separated paragraph indented under it. `MarkdownPM.md`'s Lists text and any line it holds on selection, numbering, or Heading and Quote over a selection are re-read against the folds, so a triple-click reaching its own line and the run below an item's nesting read true there.

**VERIFY**

- [x] Run the gates; `node .claude/scripts/check-atlas.mjs` exits 0.
- [x] `git grep -n "listDragModel\|setListKind\|counts for itself" -- .claude/Features .claude/Guidelines .claude/IssuesPM.md .claude/scripts` prints nothing.
- [x] The Number recorded for Phase 4; its own delta ±0 in production.

---

### Completion Criteria

- **Conformance:** the implementation adheres to the project's guidelines, Nathan's stated preferences, and *§Constraints*; no mechanism landed that an existing one already provided, every file created, moved, or renamed is one *§Placements* names, and nothing changed outside what the plan named.
- **Correctness:** each decision is observably true, driven live, and *§The Interaction Sweep*'s matrix is covered with every result reading as the feature intends: right-clicking any glyph on a page, in a live or resting cell, or in a quote opens the five-type menu, and a page tile and a callout answer the same way by construction, since every editor mounts the same handlers (V-27), which Wave One's outward reviewer confirms; each pick changes exactly the items decided with the setting on and off, and ⌘Z undoes it in one step; **Lists ▸** from an item's text and over a selection follows the same rules; the grip's **Type ▸** still switches its whole block and restarts its numbers; numbering is right after every pick, including the run an item leaves, and mixed-indent lists number the way they look; a list inside a code block switches within it while nothing outside reaches in; the setting sits under Outliner Lines, on by default.
- **Completeness:** every task landed and is ticked; nothing was deferred, narrowed, or left as scaffolding, debug output, or an unauthorized TODO.
- **Confirmation:** every verification ran and its result was read; every new test goes red without its change.
- **Continuity:** *§Reconciliation* is walked, the project's living documents read true, and every deviation is fixed or ruled on.
- **Confidence:** gates are green from a clean state across the full range from the BASELINE head, the comment count reads as BASELINE, and the diff is the size the Net Ledger implied.
- **Cold Machine:** the machine ends ice-cold: no process, test run, drive instance, worktree, scratch Nexus, userData, fixture, or script of the run's own is left running or on disk, and the working tree holds nothing the run made beyond its commits, proven by *§Final Verification · The Cold-Machine Check*. The screenshots the report cites stay in the session scratchpad; Nathan's own instance isn't the run's and stays.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

The reviews run over `<BASELINE>..HEAD`, each wave closed before the next opens. Every reviewer brief carries the Approach and Principles verbatim and has its agent read *§Constraints* whole, except the neutral gate's. Every agent here runs at `opus-high`.

- [x] **Wave One:** two read-only reviewers briefed with `code-simplification`, one reading inward at the diff and one reading outward against the rest of MarkdownPM, the menus, and the settings; one fix agent folds what holds as numbered fixes beside a Not Taken list with reasons; the fold commits, and all five drives run from a worktree of that head.
- [x] **The Right-Click Rule and the Word Rule (I-071, Nathan's Direction):** a read-only investigation (`opus-high`) traces how the resting cell's and the live editor's right-clicks got their shapes, finds where they split, and designs the one rule both read, removal first; an `execution-agent` lands it after Wave One's fold commits, with one word rule for every word selection in MarkdownPM, in which an apostrophe between letters is part of the word; its own closeout of two read-only reviewers, one under `code-simplification` and one under `adversarial-review`, reads that fix and the word rule alone, and what holds is folded and committed; all five drives run from a worktree of that head, and I-071 leaves the index once the fix closes it.
- [x] **Wave Two:** two fresh reviewers briefed with `adversarial-review`, one inward and one outward, over the folded range and given the Not Taken list, so a fold left out returns only on new evidence; folded, committed, and driven the same way.
- [ ] **The Neutral Gate:** one agent given only `<BASELINE>..HEAD`, the Approach and Principles, and the intention under *§Constraints · Neutral Gate*. It answers *§Constraints · The Measure* with a yes or no, its corrections, and the strengths to keep, and is re-run after a fold.
- [ ] **The Own Pass:** the gates from a clean state and `npm run build`; the diff read once; `git diff --stat <BASELINE>..HEAD -- Core/Sync Sync` prints nothing; the comment count reads as BASELINE; *§Completion Criteria* ticked.
- [ ] **The Teardown:** every worktree the run cut removed with `git worktree remove --force` and `git worktree prune`; every scratch Nexus, userData, and script the run made removed, apart from `$SHOTS`, which the report cites.
- [ ] **The Cold-Machine Check:** each of these prints nothing, or only what it names: `git worktree list` (the main checkout alone); `ls -d ~/"The Studio/Projects"/Pommora-LGM-* 2>/dev/null`; `ls -d "$TMPDIR"/pommora-drive-* 2>/dev/null`; `ps -o pid,command -A | grep -E "electron|vitest|vite-node|node .*live-drive|caffeinate" | grep -v grep` (only Nathan's own instance); `git status --short` (nothing the run made); and the `~/Test` hash matching Task 0-1's. Nathan's own instance isn't the run's and stays.
- [ ] **Reconciliation:** *§Reconciliation* walked; *§Deviations* ruled on; STATUS and BASELINE's End filled, and the plan commits with `--only`.
- [ ] **The Report:** in `closeout-review`'s closeout format, with the range presented through `view-delta`, `<net> (+<added> / -<removed>)` per phase and in total, every deviation, the issue renumbering, the Cold-Machine Check's result, the screenshots' session, the caption's state, and the neutral gate's answer verbatim. PushNotification tells Nathan it's ready.

#### Reconciliation

- `.claude/Features/MarkdownPM.md:24` — "The grip menu's **Type ▸** switches a whole block between the five kinds, counting from 1 or A, and the context menu's **Lists ▸** turns each selected line into an item, removing the marker only when every selected line already has one" — Task 4-1
- `.claude/Features/MarkdownPM.md` — the paragraph listing what answers a right-press itself, which gains a list glyph — Task 4-1
- `.claude/Features/ConfigurationPM.md` — the Pages & Writing table, which gains the setting's row beneath Outliner Lines and its caption — Task 4-1
- `.claude/Guidelines/Editor-Internals.md:40` — "the grip's Type ▸ is the one writer that counts for itself, because it rewrites a whole list and restarts it" — Task 4-1
- `.claude/Guidelines/Editor-Internals.md:18` — the cell-model bullet's `listDragModel.ts` sentence — Task 4-1
- `.claude/IssuesPM.md` — I-036's counts and unscoped readers; the rails issue's removal; the new I-071 and I-072; the cites the work moves in I-013, I-017, I-036, I-039, I-057, and I-071 — Task 4-1
- `.claude/scripts/README.md` — the List Types Drive's paragraph; `Path Links Drive/live-drive.mjs`'s own phase-aware `item` — Task 0-2
- `Core/MarkdownPM/Input/listRenumber.ts` — the header's "Nothing inside a page's code, math or tables is counted" and `RELIST`'s doc — Tasks 1-2, 2-1
- `Core/MarkdownPM/Input/format.ts` — `setList`'s doc and the caret note; `setListKind`'s and `listMarkerLines`' docs leaving — Task 2-1
- `Core/MarkdownPM/Menus/gripMenu.ts`, `Menus/menu.ts`, `Tables/cellStatic.tsx` — the right-press, `applyEditorAction`, `editorMenu`, click-time, and resting-toggle comments — Task 3-1
- `Input/format.test.ts`, `Input/listRenumber.test.ts`, `Engine/intents.test.ts`, `Core/Actions/gripMenu.test.ts`, `Menus/gripMenuFlow.test.tsx`, `Tables/cellRestingMenu.test.tsx` — the toggle-off, the code-block pin, the rails pin, `listKind:`, and the resting Bold on a bullet (P6-C2 to P6-C11) — Tasks 1-2, 2-1, 3-1
- **These Hold:** `.claude/Features/MarkdownPM.md:105` (a cell's grip offering the list's type and Delete) and `:138` (the grip table's List row).

#### Open Items

- None.

#### Deviations

- **P6-T2's Red Run (Task 1-2):** A-10's revert, `readsFrom` with only its fence compare dropped, left T2 green and reddened P6-C3 instead, since that compare is what opens a code block to its own lines. T2 went red under the two reverts its VERIFY now names.
- **Display Math in the One Walk (Phase 1's Checkpoint):** the walk reads display math it's outside of as the block's opening line, as it reads a code block, so numbering counts past indented math the drag already carried whole, and `subBlockAt`'s own `inJoinedMath` rule left. B-15 named quote and code blocks only.
- **The Run an Item Leaves (Phase 1's Checkpoint):** B-10 held only for Lists ▸ and Tab, and only where the line just after the edit was the next sibling; an item with nested lines, Backspace on a marker, and a whole-line deletion left the run below uncounted, the last two as at base. The run below is now found past the item's nesting in the pre-edit document for every one of them, and a new marker no longer triggers it, since an item's own line already anchors the run it joins.
- **One End Rule for Line Transforms (Phase 2's Checkpoint, Nathan's Direction):** a triple-click reaches only its own line for Heading, Quote, and every other line transform that reads a selection's lines, as it does for a list pick, through one rule. Nathan directed the fix over an issue entry, so Heading and Quote change on a triple-click, past C-6.
- **Phase 2's Checkpoint Folds:** beyond the patch, a pick finds a line's item through a stack of the items whose branch covers it, as `subBlockAt` reads them (B-14); a pick keeps a multi-line selection, seating the caret only when it reaches one line; the check reads only the items a pick reaches (A-3); and the renumber maps its positions in one sweep and walks each run to its edges only.
- **Phase 2's Broader Review (Nathan's Direction):** a second review after the folds, with three reviewers. Its folds: every line transform edits only the lead it changes, so a selection carries to the next pick; a loose item's blank-separated paragraph rides it in the drag and the switch, so a glyph drag now carries it; the run below a loose list recounts; Enter and Tab read lists through the one read rule, so neither continues a list inside display math or a table; `reachEnd` and `diffAsSingleReplace` moved to `markdownCode.ts`; and P6-C8 left, since B-14 makes its line a continuation.
- **The Interaction Sweep's Fixes (Nathan's Direction):** the sweep found six results that wouldn't make sense to a user, four of them as at base, and each was fixed rather than filed. The drawn caret bar takes no press, so a right-click just past a triple-clicked line reaches the editor's menu; a line a pick would turn into an item counts as not sharing its type, so the check over items and a plain line marks no row, which also empties the grip's check on a block opening on an indented paragraph (the reading of A-3 taken); a drag keeps a loose list's separators with the list, carrying a separator only where the source or the slot sits between blank-separated siblings; Code Block picked inside a fence takes the fence off, as Quote toggles; Escape from a live cell hands focus back to the page, so ⌘Z after it undoes the cell's edit; and Backspace on a list marker keeps the line's indent, so a nested item's text stays in its list as its sibling's continuation. The drives' double- and triple-clicks share one harness `clicks`.
- **Phase 3's Checkpoint Folds:** a right-click's inside test is one rule, `clickInside`, which reads a glyph on any line the selection touches as inside it, so a glyph on a drag-selection's first line acts on the selection, and a text click outside the selection seats the live selection at the click, so every row of one menu acts where the click points. Every press on a glyph belongs to the list drag's handler, so the grip's right-press suppression returned to base, and a macOS Ctrl-click counts as a secondary click there and in a resting cell. Escape leaves a live cell through the dismissal stack onto the line after the table, as arrowing out does, since a binding in the cell shadowed every layer above it; `dismiss` now receives whether Escape or an outside press closed it, and a line an exit creates stays out of history. Code Block's row reads checked inside a fence, as Blockquote's does. Backspace keeps a marker's indent only where an item owns the line, read through `ownersOf`, which a pick reads too, so an indented item under a paragraph no longer leaves a tab-indented line. `dropChanges` takes its caller's scan.
- **The Quoted Rails (Phase 3's Checkpoint):** the rails read quote depth through the walk's own line rule, so a quote boundary ends an unquoted list's rails, a quoted list's wrapped line carries its rail, and a depth-0 blank no longer threads a quoted list's rail into the next quote; this closes the rails issue's quoted cases, so the issue leaves the index rather than narrowing to them. Each line's quote depth is carried with the line facts, since reading it in the rail pass doubled that pass at 20,000 lines; the per-keystroke step measured +1.6% at 20,000 lines, inside its run-to-run spread, from carrying the fourth array the step already slices like the other three.
- **The Issue Renumbering (Task 4-1):** the rails issue left the index whole, and `index-issues.py` closed the gap, so every issue from the old I-018 moved down one and the two new issues landed as I-071, the right-click rule across surfaces, and I-072, one MarkdownPM drive, which moved to I-071 once the right-click rule closed its issue; this plan and the Decisions cite open issues by their new numbers. I-036 reads 22 compares and 15 defaults at the folded head, against P6-Q2's 23 and 15, and states those.
- **Wave One's Folds:** a caret on a blank line reaches that line, so `/` on a blank inside a loose item's gap turns the blank into an item rather than rewriting the item above (C-1); Backspace reads a line's prefix and marker once for every prefix, so a plain quote's marker goes whole as a callout's does, and a caret at a quoted item's prefix end still unquotes it; `railIntents` resets its kinds in one place; the reader type has one name, `Reader`; `ListKind` moved into `Engine/detect.ts`, so the engine no longer imports it from the menus; the table's exit reads without a nested ternary; the Insert ▸ text states that Blockquote and Code Block read checked inside their blocks and take them off. **Not Taken:** one tuple for `['quote', 'code']` (the guard keeps other block rows unchecked); `applyEditorAction`'s range parameter (list rows need the click-time point); `setList` and `setBlock`'s test-only exports (as at base); `dismiss(via)` (the smallest carrier for Escape's exit); one secondary-press predicate across grips and sweeps (no evidenced defect); the cells' quote depths (harmless, keeps the two cell renderers alike); feature sentences for Escape's landing line and Backspace's kept indent (nothing in the docs reads false without them).
- **The Right-Click Rule and the Word Rule (Nathan's Direction):** the resting cell acted at a right-click's point since 10-11-2026 (`f6df420ba`), on the belief that claiming the right press stops Chromium seating its word, which a later probe disproved; Nathan ruled that a right-click acts on the word under it on every surface, and that an apostrophe is part of a word for every word gesture in MarkdownPM, then, given the trade, only between letters, and that a right-click at the caret acts on the word too. So both surfaces seat the word under the pointer, or a caret at the point where the pointer sits on no word, and refuse Chromium's own reseat, a resting cell drawing the browser selection over the range its menu acts on, so the highlight, Cut and Copy, Speech, and Share read one range; one word reader, `wordAt`, carries CodeMirror's word across an apostrophe between letters, and a double-click and the group motions, selections, and deletions read it through CodeMirror's own commands, joined words standing as atoms for that view while one runs; one Unicode letter test, `isWordChar`, serves the word reader, the typing rules, and a bare heading link's end; the format rows stand down inside inline code; and the page editor no longer imports a resting cell's selection as its caret when the table redraws under its menu. I-071 left the index, and I-072 records a word split by inline marks, whose fix needs the inline-format engine.
- **Wave Two's Folds:** a word deletion over a selection deletes exactly the selection, the joined-word atoms applying to a deletion only from a caret; the word rule moved into `Input/markdownInput.ts`, so `surface.ts` only composes and the import cycle with the menu is gone; Backspace reads a list marker through the one read rule, so it takes no marker inside display math; the inline-code stand-down reads both ends of a range; a nested pick recounts only the run the item left, so a parent's gapped run keeps its numbers; the list drag commits against the document as it stands at the drop; and a resting cell's highlight clamps to drawn text, so a mark-wrapped word shows what the menu acts on. With the setting off, a pick reaches a quoted list drawn under an item, with two or three spaces before its `>`, as the editor draws it; a `>` line indented by a tab or four spaces draws as text and stays its item's continuation, so no reader treats it as a list.
- **The Neutral Gate's Folds:** a resting cell's glyphs carry the glyph class, so `glyphAt` finds a glyph on every surface, with the grab cursor scoped to live editors, reversing Wave One's call that the class carried drag styling; a press on a resting glyph no longer starts a cell sweep, as on a live one. Both surfaces' right-clicks run through one route, `routeRightClick`, beside `clickInside` and `keepSeatedSelection` in `Menus/menu.ts`, which picks the glyph's menu or the format menu and acts with the list rows at the click and every other row on the word, so the page passes its word range explicitly and checks its document is unchanged for every row, as the cell does, and a resting cell no longer redraws a selection a click lands inside. The word rule's apostrophe reads its neighbors through CodeMirror's categorizer, as its word does. `ownersOf` stops at the first line no list above reads past, which `rolesAgainst` can't say, since it reads a parent as ending its child; `listKindOf` on a quoted list at the end of 20,000 lines went from about 3 ms to under 0.02 ms. The rails name their list-ends state, the block model reads a math range as its opening line, as the list model does, so `inJoinedMath` left, and the renumber's header states why its positions map in one sweep. I-073 records the two recount patterns.
