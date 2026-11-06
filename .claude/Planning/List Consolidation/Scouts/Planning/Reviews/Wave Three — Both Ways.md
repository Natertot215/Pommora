### Wave Three — Both Ways

**DATE:** 11-06-2026
**RANGE:** `b7f2f17a5..b380728f4` on `lc-w2`, read in the final tree at `lc/wt-adv1`, with `lc-docs3` at `43ff98c3f`, every patch in `Scouts/Planning/Phases/`, *List Consolidation — Implementation Plan*, *Decisions & Intention*, *Plan Reviews*, both Fold Ledgers, and the two Wave Two reports. Read inward at each task and outward at `Core/MarkdownPM`, `Core/Properties`, `Core/Actions`, and `Desktop/Actions`. Model `fable-high`. No code changed; the one probe ran as a throwaway test in the worktree and was removed, and the worktree stands clean.
**VERDICT:** Ready once two Medium findings fold. 0 High, 2 Medium, 2 Low. Every fold *Plan Reviews* records lands in the code the way the record says, every plan sentence agrees with its patch, and the trimmed AFTERs lose nothing an executor needs. The after is the tree a neutral reader prefers.

**How to Read This:** Wave One's scale holds. High means a task can't run as written or a plan claim is false in the tree. Medium means a gate's claim overstates, or a VERIFY asks for something the schedule can't produce. Low is residue or a clarity win. Nothing in *Decisions & Intention*, *§Calls Taken*, or either Not Taken list is re-raised.

#### Findings

##### 1. A Fold Left an Unused Parameter, and It Is the Tree's One Lint Warning — Medium

- **Cite:** `Core/Interface/Glance/GlancePane.tsx:367`, `onPointerDownCapture={(e) => {`; *Phase 9c — The Short Menu.patch* line 196.
- **Mechanism:** Wave Two's E2 fold removed `if (e.button !== 0) return`, the parameter's only read, and left `(e) =>`. `npx biome lint Core Desktop UIX` on the final tree reports exactly one warning, `lint/correctness/noUnusedFunctionParameters` at this line, and `npm run lint` prints it while exiting 0. The baseline file reads clean, so the fold introduced it. *§Constraints · Gates* reads "lint runs clean", and both Fold Ledgers record "lint 0", which the exit code bears out and the output doesn't. This is the one place a wave's fold reads as a patch on a patch: the line kept the shape of the code it removed.
- **Change:** the 9c patch writes `onPointerDownCapture={() => {`. ±0 lines, comments unchanged.
- **Lands In:** Task 9-3.

##### 2. Path Links Group 1 Changes in Task 10-4 and Has No Row to Run It — Medium

- **Cite:** Task 10-4's VERIFY, "Path Links 9 reads 498/498 and its group 1 226/226"; *§Constraints · Live Drives*, the Path Links row, `POMMORA_PL_LANDED=9 node live-drive.mjs 9`; *§When Drives Run*, the last row, "Every drive in the table above, each whole".
- **Mechanism:** *Phase 10 — Drive Group 10.patch* edits `Path Links Drive/live-drive.mjs` at `@@ -358 @@ async function group1(cdp)` and `@@ -403 @@ async function group1(cdp)`, the `.cell-text` and tag-on-line-one reads, so group 1 is what Task 10-4 changes and asks for. The drive table names group 9 alone, and "each whole" over a table whose rows are subsets names nothing further. The plan calls that table "the one place naming" groups, so an executor following it runs group 9 and can't tick the VERIFY, or guesses a command the plan never wrote. `node live-drive.mjs 1` runs it, with `POMMORA_PL_LANDED` defaulting to 1.
- **Change:** the Path Links row reads `POMMORA_PL_LANDED=9 node live-drive.mjs 9` through Phase 9 and `POMMORA_PL_LANDED=9 node live-drive.mjs 1 9` from Task 10-4, as the Text Property row already does for its groups, with its time adjusted; `LANDED` is read once for the whole run, so the variable stays on both forms. Task 10-4's VERIFY then reads the row.
- **Lands In:** The plan.

##### 3. Two Pin Titles Spell an Apostrophe the Tests Don't — Low

- **Cite:** Task 3-2's VERIFY, *a line selected through the start of a carried block keeps the block's lead*; Task 9-3's VERIFY, *selects and focuses the page from a read-only table's Select All, so ⌘C reads it*.
- **Mechanism:** `prefixSeat.test.tsx:163` and `editorMenu.test.tsx:205` spell both with `’`. Wave Two moved every cite to a title so an executor finds a pin by its name, and `git grep -F` on the plan's spelling finds neither, while the plan already writes `’` in Task 9-1's and 9-3's other titles. The twenty-six other titles the plan names each match one test, and the two it says leave are gone.
- **Change:** the two titles take the tests' `’`.
- **Lands In:** Tasks 3-2 and 9-3.

##### 4. Three Drives First Run Whole at Phase 10 With No Baseline — Low

- **Cite:** Task 0-2's VERIFY, which baselines Text Property 4, Alias 3, Path Links 9, and Editor Parity; *§When Drives Run*'s last row, which runs Properties, Archive, and Option Picker whole.
- **Mechanism:** nothing in the plan touches those three drives or what they drive, and Task 0-2's second bullet rules only on a drive it ran. A red in one of them at Phase 10's checkpoint has no rule saying whether it's the run's to fix, so an unattended orchestrator either stops on a drive this work never changed or has to reason it out from scratch.
- **Change:** Task 0-2's second bullet reads "one red at the head the run starts from, or in a drive this work never changed, isn't this plan's to fix", or the three join Task 0-2's list at about 26 minutes once.
- **Lands In:** The plan.

#### What I Traced

**Every Fold, in the Code:**

| Fold | Record | In the Tree |
|---|---|---|
| `caretSeat`'s inverted range (W1 A6) | A caret at `main.to`, ahead of the seat | `decorations.ts:781`, `main.from > main.to ? EditorSelection.cursor(main.to) : main`, with `range === main` in the early return |
| The forward head (W1 A10, Task 9-5's rewrite) | Stands; a caret and a backward head seat | `decorations.ts:785`, `head > anchor ? head : Math.max(head, prefixEndAt(…))`. Task 3-2's pin revert names `head <= anchor`, which is 3b's spelling at line 78 of its patch; 9e rewrites it at line 110, so the revert runs at its own head |
| `renumberRuns`' delimiter read (W1 A1, W2 E1) | Walks out of every adjacent block | `listModel.ts:143`, `while (fenceDelimiter(scan, i) && openerOf(scan, i) > 0) i = openerOf(scan, i) - 1` |
| `overLines` (W1 A7) | A keystroke over a selection crossing lines recounts, no scan on a plain keystroke | `listRenumber.ts:17-19`, sliced from `tr.startState` ahead of both scans |
| `LIST_MARKER_RE` (W1 A4, A9) | Ends at its spacing; nine digits | `detect.ts:557`, `/^([ \t]*)(?:(\d{1,9}\|[A-Z])\.\|→\|[-+](?:[ \t]+(\[([ xX])\]))?)([ \t]+)/d` |
| The rail gate (W1 A5, W2 S12 over E3) | `open` alone | `intents.ts:357`, `else if (open && own >= depth && ridesList(scan, i, depth))` |
| Select All focuses (W1 M2) | `view.focus()` after `selectAll` | `menu.ts:32-34` |
| `splitPrefix(scan, k)` (W2 S1) | One line for text and lead; the dead default leaves | `format.ts:246-251`, and `formatState.ts:23` passes `lineIndexAt(scan, ls)` |
| `lineBodyBefore` (W2 S2) | One reading past `leadOf`; `opensLine` leaves | `edits.ts:674-682`, five callers, `opensCodeList` keeps only its fence test |
| `focusBefore` on any press (W2 E2) | `if (e.button !== 0) return` leaves | `GlancePane.tsx:367-370`, with the contract at `:38` rewritten; finding 1 for what it left |
| `mirrorBody(view, next)` (W2 E4) | The outside write lands the text as the document holds it | `ValueEditor.tsx:193` |
| `markerIn`, `sealedBlock`, `fenceDelimiter` (W1 S3, S11) | One compare, one block answer | `docScan.ts:411-431`, read by `rolesAgainst`, `runsAround`, `ownersOf`, `listReach`, `railIntents`, `openerOf` |
| `restingRows`, `shortRows`, `menu` (W1 S13) | Two lists sharing `copyRow`; a finite state on the request | `Core/Actions/editorMenu.ts:27`, `:58-74`; `Desktop/Actions/editorMenu.ts:59`, `:122` |
| `renderCellContent` private (W2 S17) | No export for tests alone | `cellStatic.tsx:67`, called by `renderRestingLine` and `renderCellBody` |
| `literalLines` at birth (W2 S18) | Named in Task 1-1 | `docScan.ts:72`, and no rename in 6a |
| `linkSettle.of(remembers)`, factories as constants (W1 S7, W2 S15) | A factory stays only where a mount needs closure state | `surface.ts:45`, `blockHandles.ts:38`, `decorations.ts:773`, `:840`; `pointerReveal()` keeps its `hotLine` |

**Every Plan Sentence Against Its Patch:** the seven VERIFY greps print nothing at `b380728f4`; `scope` reads 64 at `98becb14b` and 65 at the head, which Task 1-1 and *§Overview* each state; `listModel.ts` 179, `listRenumber.ts` 51, `CellEditor.tsx` 199; comments 3,508 by the log's command; Placements are exactly `blockMove.ts`, `blockMove.test.ts`, `MATRIX.md`, and the `textScope` to `inlineScope` move, by `git diff --name-status -M`; the Net and Comment Ledgers match the Wave Two phase-head table row for row. The Phase 11 and Phase 0 patches apply clean onto the head by `git apply --check`. Twenty-eight pin titles the plan or a phase's *Notes* names exist in the tree, the two the plan says leave are gone, and finding 3 covers the two of those twenty-eight spelled apart. Task 2-2's `fenceDelimiter` conditions stand in `setBlock`'s `quote` and `callout` cases; Task 6-1's `=== 'page'` stands at `autocomplete.ts:104`; Task 6-2's table reads as `listKeys(scope)` at `markdownInput.ts:248`, `markdownInput`'s Tab hold at `:326`, and `CellEditor.tsx:123-131`; Task 7-1's two records stand at `detect.ts:539` and `gripMenu.ts:35`; Task 8-1's `Prec.high(contractions)` at `surface.ts:58`; Task 9-4's `.then` at `cellStatic.tsx:594`; Task 10-2's `is-continued` at `TextCell.tsx:81` and `table.css:250`; Task 10-3's `asText` at `propertyValue.ts:42`. The docs commit changes the five files *§Reconciliation* lists and no other, and I-073's number carries the Option+Up issue as *Phase 11 — Notes* rules.

**The Trimmed AFTERs:** each task keeps its patch path and what the patch can't say, and I found nothing an executor now lacks. Task 3-2 keeps the `SelectionRange.map` paragraph its three pins depend on, Task 4-1 the one-line paste rule, Task 6-2 the surface table, Task 8-1 the `Prec.high` reason, Task 10-1 the `\r\n` sentence, and every revert names its text as the patch at that head spells it.

**Both Ways, Outward:** `Core/MarkdownPM` holds one marker grammar, one list end (`continuesList` through `openerOf` and `ridesList`), one key set, one right-click route over one range, one word rule, and one scope facet; `Core/Properties` reaches it through `editorBase` with a scope and nothing of its own; `Core/Actions` holds the menu's rows and the request's shape; `Desktop/Actions` reads `menu` and builds. What reads as two is settled and reasoned where a reader meets it: `LIST_TYPES` beside `LIST_KINDS` (*Phase 7 — Notes*, *B-7's Record*), `editorMenuRequest.scope` restating the three scope names (I-036, open by A-3), `readOnly ? null : glyphAt(e)` at both surfaces (Wave Two, *Checked, and Holds*), and `TextCell`'s bare `parseListMarker(first)` (*Phase 10 — Notes*, a scan for one line would build the rest for nothing). Probed and not raised: a Blockquote on a diff line lands `->  removed` where a list lands `- 1. removed`; the quote prefixes before a line's indent on a page too, so it's the page's own rule in code, and the Build Log records the acceptance.

**The Whole Plan:** the order holds as *§Overview* argues it, the scan before the masks before the walks before the grammar, with Phase 10 riding the keys and the short menu rather than adding to them. Removal-first reads in every task's prose and in *§Concepts · REMOVED* against *ADDED*. *§Constraints* contradict nothing: the comment cap's early overrun is stated and the ledger bears it out, *§The Number* reads the working tree as the VERIFY order needs, *§Unattended* names the override of `c/plan-execution`'s stop, and the Cold-Machine Check's `find` works under zsh. *§When Drives Run* is one schedule apart from finding 2. *§Final Verification* runs from the last phase to the report with every stop the orchestrator's own.

#### Verdict

A neutral before-and-after reader prefers the after: one classification of a marker, one definition per type, one list end, one key set, one range, and one short menu stand where three, two, three, two, two, and none stood, at -286 production lines with nothing on disk changed; the plan is ready to ratify once the GlancePane parameter and the Path Links row fold, and nothing else here needs a hand.
