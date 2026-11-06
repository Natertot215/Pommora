### List Consolidation — Plan Reviews

Each wave's findings, what folded into *List Consolidation — Implementation Plan* and the patches in `Scouts/Planning/Phases/`, and what didn't, with the reason. Each wave's reports sit in `Scouts/Planning/Reviews/`.

#### Wave One · Outward (`opus-xhigh`)

**Simplification:** 21 findings (2 High, 6 Medium, 13 Low), about 50 further production lines. **Adversarial:** 10 findings (1 High, 1 Medium, 8 Low), four more unsure. The adversarial reviewer replayed the 23 patches onto a clean export, reached the expected tree exactly, and ran property fuzzes, baseline differentials, and a live drive, so its findings were executed rather than read. Two of its unsure items were then settled by a live probe of both trees (*Wave One — Menu Probes*). Each fold landed in the task it belongs to, the chain rebuilt commit by commit with typecheck at every commit and full gates at every phase head. *Scouts/Planning/Phases/Wave One — Fold Ledger* holds each change, its pin, and its red run.

**Folded, Correctness:**

- **A Drag Past a Selection (High, Also Wrong at the Baseline):** CodeMirror's range mapping left a selection inverted, so Enter did nothing and Backspace took 24 characters after 4 were selected. `caretSeat`'s filter turns an inverted range into a caret, ahead of the seat, so that caret can't rest in a hidden prefix. Task 3-2.
- **A Blank Removed Below a Carried Block:** the two lists merged without recounting, since the edit's position sat on the fence's closer. `renumberRuns` reads a delimiter from outside its block. Task 3-3.
- **A Forward Selection's Head:** `caretSeat` moved a triple-click's head past a carried block's hidden lead, so Backspace took the lead and the block stopped riding. A forward head now stands. A caret and a backward head still seat, since Shift+Home mustn't select a hidden prefix. Task 3-2, narrower than the report's form for that reason.
- **Typing or Enter Over a Selection Across Items:** recounts as Delete and paste do, with a plain keystroke paying no scan. Task 3-3.
- **Carriage Returns and Line Separators:** `LIST_MARKER_RE` ends at its spacing, so `- a\r` and a line holding U+2028 read as items, and a pane closed untouched leaves a `\r\n` value on disk as it was. Tasks 5-1 and 10-1.
- **An Ordinal Past Nine Digits:** reads as standard Markdown reads it, in one spelling beside the scan's. Task 5-1.
- **Rails on a List-Free Document:** Task 7-4 cost 0.5 to 1.1 ms a keystroke at 20,000 lines. `ridesList` now runs only with a list open, proven equal over 480,000 documents, and the list-free rows read level with the baseline.
- **Select All From a Read-Only Cell:** left focus elsewhere, so ⌘C copied nothing or the page's text. The row focuses the view. Task 9-3.

**Folded, Simplification:**

- **A Scope the Scan Already Holds:** `blockHandles` reads the scan as a constant, `tagReveal` mounts in `MarkdownEditor`, `pointerReveal()` takes nothing, and `blockGestures`, `BlockScope`, and `CELL_KINDS` leave. Task 1-1.
- **C-2's Mask:** one `markerIn`, where the rule was spelled six times over three phases. Tasks 2-1, 3-3, and 7-4. **`sealedBlock`** answers "which block seals this line" once. Task 3-3.
- **Factories:** `markdownDecorations`, `decorationPlugin`, `caretSeat`, and `acQuery` become constants, under one rule: a factory stays only where a mount needs its own closure state. Task 1-1.
- **Names:** `pageChrome` to `lineChrome` with its false comment gone, `inlineSurface` to `sharedSurface`, `inlineLines` to `literalLines`, `showSource` to `paintSeat`, `textScope.test.tsx` to `inlineScope.test.tsx`, and `Extent` leaves for `BlockSpan`.
- **`checkboxToggleChange`:** reads the scan, and `parseListMarkerPrefixed` folds into `lineMarker`. Task 5-1, since `lineMarker` doesn't exist at Task 1-1.
- **Smaller Folds:** `pushConstruct` takes what the scan holds; `subBlockAt`'s null leaves; `outOfReach` gives each branch one reading; `seatPastMarker` and `prefixEndAt` share a walk; `restingRows` and `shortRows` replace a switch that only saw literals; the list knobs share `:root`; `tokenHidden` reads its scope; `asText` reads `linkEntry` once; the small residue and the tests in finding 20.

**Folded, Plan:**

- **The Drives:** the twelve missing patches saved, every placeholder filled, and *§When Drives Run* written out, each row then run at its own phase head.
- **The Alias Drive:** named in *§Reconciliation* and Task 10-4, where G-10 turns its second Enter around. Metadata's `[a, b]` Text case joins it.
- **VERIFY Lines:** Tasks 1-1 and 5-1 put `-P` after the pattern, so one read as passing while searching nothing.
- **`§Adherence`:** removed, since the checkpoints and *§Completion Criteria* hold what's testable and two of its bullets had gone false. The cold machine keeps one statement.

**Not Taken:**

- **`LIST_MARKER_RE` and `LIST_LINE` as One Definition:** `LIST_LINE` reads `*` and `1)` as a parser does, and B-1 keeps those out of the grammar, so the two read different things. They now spell the ordinal the same way.
- **The Live Ask Over a Non-Editable Target (Unsure):** driven on both trees. Four targets pop the live menu where the baseline asked, moved the caret, and popped nothing: a connection glyph, an empty label, a code line number, and a citation reference. Its rows work, with Paste enabled, so restoring the old branch would bring back a dead click. It stands as a new row in *§Behavior Changes*.
- **A Second Right-Click While the First Reply Is in Flight (Unsure):** macOS swallows that click, and nothing here reaches Windows' menu order. The worst case is one highlight clearing early, and a guard needs a shown cause, so it stands as an open note in the morning report.

**Net Effect:** Actionable moves from -252 to -277 (+1446 / -1723), with `caretSeat`'s reindent and the renames accounting for the larger churn. Comments read 3,508 against the cap of 3,511: two correctness fixes each needed a line.

#### Wave Two · Inward (`opus-xhigh`)

**Executor Read:** 16 findings (1 High, 4 Medium, 11 Low), each from a run: all 34 patches replayed onto a clean export, every VERIFY line run as written at its head, every named pin reverted, and gates at all 23 task heads with the drive patches on the tree. **Simplification:** 25 findings (9 Medium, 16 Low). The chain rebuilt once more, one fold per task it belongs to, with typecheck at every commit and full gates at each phase head. *Scouts/Planning/Phases/Wave Two — Fold Ledger* holds each change.

**Folded, Correctness:**

- **The Heading Row's Check:** Task 2-1 paired one line's text with another's lead when a selection started at a line's end, a regression. `splitPrefix(scan, k)` reads both from one line, and a dead default leaves. Task 2-1.
- **Two Carried Blocks:** `renumberRuns`' delimiter read stopped on the next block's closer, so a triple-click and Backspace between two blocks left a wrong number. `i` walks out of every adjacent block. Task 3-3.
- **Select All in a Glance:** `view.focus()` reached a glance, and its close couldn't hand focus back, since `focusBefore` recorded only a left press. It records any press, and its contract comment states that a row can ask for focus. Task 9-3.
- **A `\r\n` Outside Write:** Wave One's `docText` opened a route doubling a value's breaks. `mirrorBody` takes the text as the document holds it. Task 10-1.
- **Rails Behind an Indented Quote:** the two reviewers disagreed here. The executor asked to pin `(open || level >= 0)`'s second term, and simplification asked to drop it. It left: `open` alone draws an indented quote's list as a flush quote's, which B-9 expects, and one row pins it. Task 7-4.

**Folded, Simplification:**

- **Past a Line's Lead:** one reading through `lineBodyBefore(scan, pos)`, where three spellings stood, and `opensLine` leaves. A `> ` lead off a page now reads as the scan does. Task 2-1.
- **Task 10-1's Patch:** `TextCell.tsx`, `table.css`, and `Cell.test.tsx` move to Task 10-2, so a half-step span never exists.
- **`renderCellContent`:** private, since no export stands for tests alone. Task 10-2.
- **`literalLines`:** named at birth in Task 1-1, with no rename at Task 6-1.
- **Smaller Folds:** `punctuation`'s ternary, a `pfx` term that couldn't be true, `renumberRun`'s `held`, `seatPastMarker`'s two meanings of `end`, `linkSettle.of(remembers)`, hoisted `region` reads, `smartBackspace`'s `k`, two comments naming a cell beside code the pane runs, two needless `export`s, and the tests in finding 19.

**Folded, Plan:**

- **Task 11-1's Patch (High):** it didn't exist, so Phase 11 held no AFTER. It's saved, and the patch script no longer deletes the drive patches.
- **The Plan's Weight:** 1,176 lines to 926. Ten AFTER code blocks that restated their patches leave, along with `**Delivers:**` lines, generic VERIFY clauses, and evidence sitting where instructions go. A task keeps its patch and what the patch can't say.
- **One Schedule:** a drive task's VERIFY runs its own group, and *§When Drives Run* alone names 1 to N, about 52 minutes less per run.
- **The Number:** reads the working tree, since VERIFY runs before the commit. **The Test Column:** filled. **The Cold-Machine Check:** its glob failed on a cold machine under zsh.
- **Smaller Folds:** Editor Parity runs on a built tree; the Compaction Checkpoint replaces `c/plan-execution`'s stop; *§Completion Criteria* asks only for the pins a phase's *Notes* names; line cites became titles; the info pane's unproven E-4 is stated in the Decision Map; *§Gates* names its fourth load test.

**Not Taken:**

- **`ValueEditor`'s `scope` Inlined:** the formatter opens that call to seven lines, +4 where the report read -1.
- **A Caption:** `Core/Settings/frames.ts:729`'s caption reads false under D-2, and copy is Nathan's, so it goes to the morning report.
- **A Split's Nested Lower List:** resets at its next edit, since `renumberRun` counts a nested run from 1. The number moving is cosmetic, and the rule's form is settled, so row 12 states it.
- **Typing Over a Triple-Clicked Line Above a Quote:** lands `Z> quote` where the baseline landed `Zquote`, a raw join either way, with the forward-head fold fixing far more. The morning report names it.

**Net Effect:** Actionable moves from -277 to -286 (+1464 / -1750). Comments hold at 3,508.

#### Wave Three · Both Ways (`fable-high`)

**Findings:** 4 (2 Medium, 2 Low). The reviewer traced every fold from Waves One and Two into the code it lands on and found each holds, ran the VERIFY greps, read the ledgers against the phase heads, and found that the trimmed AFTERs lose nothing an executor needs.

**Folded:**

- **`GlancePane.tsx`'s Unread Parameter:** Wave Two's fold left `(e) =>` with `e` unread, the tree's one Biome warning, which exits 0 and so read as clean. Task 9-3.
- **Path Links Group 1:** Task 10-4's VERIFY asked for it and no row ran it. The table now reads `1 9` from Task 10-4.
- **Two Pin Titles:** spelled `'` where the tests spell `’`, so a search found neither. Tasks 3-2 and 9-3.
- **Three Drives With No Baseline:** Properties, Archive, and Option Picker first run at Phase 10, so Task 0-2 now rules on a red there: one reproduced at the BASELINE head isn't this plan's to fix.

**Verdict, Quoted:** "A neutral before-and-after reader prefers the after: one classification of a marker, one definition per type, one list end, one key set, one range, and one short menu stand where three, two, three, two, two, and none stood, at -286 production lines with nothing on disk changed; the plan is ready to ratify once the GlancePane parameter and the Path Links row fold, and nothing else here needs a hand."

#### Closing Proof

All 35 patches replayed in the plan's order onto a clean `b7f2f17a5`, each matching its chain commit, and the final tree matched the production, drive, and docs chains exactly. Typecheck read clean at Tasks 9-3 to 10-3. List Types 1 to 9 read 522/522 at Phase 9's head on the final chain, which closed the one item the schedule had read red on the Wave One chain. The head read 9,219 passed, 2 skipped, 550 files, with typecheck and lint clean, `npm run build` passing, comments at 3,508, and Actionable -286 (+1465 / -1751). Every drive read whole and green at the final head, and `~/Test` hashed the same before and after each run (*Scouts/Planning/Phases/Drives — Notes*).
