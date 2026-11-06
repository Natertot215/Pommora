### Wave Two — Simplification

**DATE:** 11-06-2026
**RANGE:** `b7f2f17a5..lc-w1` at `148e79566`, read inward task by task, with the plan's own text. Paths are relative to the repo root, Engine, Input, and Menus paths sit under `Core/MarkdownPM/`, and bare line numbers on a plan finding cite *List Consolidation — Implementation Plan.md*.
**VERDICT:** The patches hold up: most tasks are at or near their smallest form, and Wave One's folds read as designed. 0 High, 9 Medium, 16 Low. About 15 further production lines can leave, one Medium is a small regression Task 2-1 introduced, and the plan carries about 200 lines no executor acts on.

**How to Read This:** Wave One's scale holds. High means the plan's own claim is false in the tree or a task can't be executed as written, and nothing here reaches that. Medium means a rule is stated twice or more, a name or comment says something false, or a task's patch and its text disagree. Low means residue or a clarity win. Estimates are production lines and assume the findings are taken together. No code was changed. The two probes below bundled the worktree and the main checkout read-only from the scratchpad, and the bundle is gone. No finding adds a comment; the count stays at 3,508.

#### Medium

##### 1. `splitPrefix`'s Second Argument Is a Dead Default, and One Caller Pairs Two Lines

- **Cite:** `Input/format.ts:240-246`, `:288`; `Input/formatState.ts:4`, `:17`, `:24-26`.
- **Mechanism:** Task 2-1 gave `splitPrefix` the parameter `quote = quotePrefix(line)`. Both production callers pass `leadOf`, and no test calls it, so the default and `format.ts`' `quotePrefix` import read nothing. `readFormatState` passes `line` from `underSelection`, which sits at the trimmed `from`, with `leadOf` of `lineIndexAt(scan, selFrom)`, which is untrimmed. A selection starting at a line's end pairs the next line's text with this line's lead. Probed: `plain\n> # h` over 5 to 11 and `> a\n# h` over 3 to 7 each read heading 0 at `lc-w1` and 1 at `b7f2f17a5`, so the Heading row loses its check.
- **Change:** `splitPrefix(scan, k)` reads `scan.lines[k]` and `leadOf(scan, k)`. `readLine` passes `k`, `readFormatState` passes `lineIndexAt(scan, ls)`, and `formatState.ts`' `leadOf` import and `format.ts`' `quotePrefix` import leave. One `expect` in `formatState.test.ts` pins it, red at this head on the input above.
- **Estimate:** -5.
- **Lands In:** Task 2-1.

##### 2. "What Stands Past a Line's Lead" Has Three Spellings

- **Cite:** `Input/edits.ts:675-678`, `:680-685`, `:687-690`; callers at `:720`, `:736`, `:768`, `:835`, `:850`.
- **Mechanism:** `lineBodyBefore` and `opensLine` each slice past `quotePrefix`, and Task 2-1's `opensCodeList` slices past `leadOf` for the same question. `opensLine` is `isBlank(lineBodyBefore(...))`, which `:736` and `:850` already spell that way. The two older ones also read a quote on a `lists` surface, whose scan holds none, so they're readers B-11 says should ask the scan.
- **Change:** `lineBodyBefore(scan, pos)` slices past `leadOf(scan, k)`. `opensLine` leaves for `isBlank(lineBodyBefore(scan, pos))`, and `opensCodeList` keeps only its fence test and reads the same. One behavior moves: in a cell, a line opening `> ` no longer counts as a blank lead, which is B-11's reading. Run `edits.test.ts` and `cellLists.test.tsx` on it, since this review changed nothing.
- **Estimate:** -6.
- **Lands In:** Task 2-1.

##### 3. Two Comments Say "Cell" Beside Code the Pane Also Runs

- **Cite:** `Engine/docScan.ts:71`, *"in a cell, lists"*; `Menus/blockHandles.ts:180`, *"A cell's grip"*, beside its `=== 'lists'` compare.
- **Mechanism:** Task 6-1 rewrote `detect.ts`' comment to name what a scope reads rather than a surface, and these two kept the old form. After Task 10-1 both describe the pane as well, which `markdown-pm.css:178` already states. *§Concepts*' `literalLines` row reads the same way.
- **Change:** Reword both in place, as `:43` of `blockHandles.ts` already does with `lists`.
- **Estimate:** 0 lines, comments ±0.
- **Lands In:** Task 6-1.

##### 4. Task 10-1's Patch Holds What Task 10-2's Text Claims

- **Cite:** `:1037`, `:1050`; commit `58cf0324e`, `Core/Properties/Cells/TextCell.tsx`, `UIX/Table/table.css`, `Core/Properties/Cells/Cell.test.tsx`.
- **Mechanism:** `58cf0324e` carries `TextCell`'s first-line read, `lineOffsetsOf`'s removal, `.cell-text-line + .cell-text-line`'s removal, and the two overturned `Cell.test.tsx` cases. Task 10-1's AFTER names none of them, Task 10-2's AFTER claims them, and the Decision Map gives G-7 to Task 10-2. The hunk also writes a `<span className="cell-text-line">` around one line that the next commit deletes.
- **Change:** The `TextCell.tsx`, `table.css`, and `Cell.test.tsx` hunks move to Task 10-2's patch, so the half-step span leaves. If the chain stays as it is, Task 10-1's AFTER names them and Task 10-2's drops them.
- **Estimate:** 0 at the head, about 12 lines fewer through the chain.
- **Lands In:** Tasks 10-1 and 10-2.

##### 5. List Types Runs Twice a Phase, and Task 4-2 Contradicts the Schedule

- **Cite:** `:204`, `:643`; drive VERIFYs at `:370`, `:456`, `:587`, `:688`, `:746`, `:835`, `:888`, `:1014`, `:1080`; *§When Drives Run*'s closing sentence.
- **Mechanism:** Each drive task's VERIFY runs `node live-drive.mjs 1 … N`, then its checkpoint's row runs `List Types 1 to N` again after the folds, under a table that calls itself "the one schedule". Task 4-2 alone runs `4`, while its row reads `1 to 4`.
- **Change:** Every drive task's VERIFY runs its own group, `node live-drive.mjs N`, as Task 4-2's already does, and the table stays the one place naming 1 to N. Phase 4 has no checkpoint, so its row runs at Task 4-2 in that checkpoint's place, right after the VERIFY's own group. A group's first run still happens at its task's head, ahead of the reviewers.
- **Estimate:** 0 production. 42 group-runs leave, about 52 minutes of an unattended run at 75 seconds a group.
- **Lands In:** The plan.

##### 6. Nine VERIFYs Read a Ledger Column of Placeholders

- **Cite:** `:20-30`; Task 1-1's VERIFY, and `:443`, `:573`, `:676`, `:735`, `:825`, `:878`, `:1004`, `:1068`.
- **Mechanism:** "the count reads the Net Ledger's row" compares against `{TESTS-1}` to `{TESTS-10}`. The figures exist: *Wave One — Fold Ledger · Phase Heads* reads 9,127, 9,141, 9,171, 9,178, 9,185, 9,186, 9,192, 9,197, 9,203, and 9,217. `{PLAN REVIEWS}` at the head is in the same state.
- **Change:** Fill the column once from that table, after this wave's folds, which move it.
- **Estimate:** 0.
- **Lands In:** The plan.

##### 7. Ten AFTER Code Blocks Restate Their Patches

- **Cite:** `:393-406` (2-1), `:429-436` (2-2), `:490-501` (3-2), `:522-558` (3-3), `:612-626` (4-1), `:659-663` (5-1), `:771-780` (7-1), `:856-871` (8-1), `:934-953` (9-3), `:970-984` (9-4).
- **Mechanism:** *§Plan Rules* reads a task's AFTER as its patch, so each block is a second copy that states no difference, 132 lines in all. Two copies is what cost Wave One's fold its edits: the Fold Ledger lists filter-block and bullet lines to rewrite beside each patch. Task 1-1's `scope` Leaves and Factories bullets (`:346-347`) and the per-file bullets of 2-1, 3-3, and 5-1 do the same in prose.
- **Change:** The ten blocks leave. A task keeps its patch path, one sentence on what it delivers, and only what the patch can't say. That keeps Task 3-2's paragraph on `SelectionRange.map`, Task 4-1's one-line paste rule, Task 6-2's surface table, and Task 8-1's `Prec.high` reason, which each VERIFY depends on.
- **Estimate:** 0 production, about -130 plan lines.
- **Lands In:** The plan.

##### 8. Two Rules Are Restated at Every Task

- **Cite:** Pin reverts at `:417`, `:675`, `:786`, `:811`, `:923`, `:1003`, `:1054`, against `:173` and *§Completion Criteria · Confirmation*. Comment and Number lines at `:358`, `:444`, `:510`, `:575`, `:633`, `:678`, `:736`, `:825`, `:878`, `:1004`, `:1068`, against `:174` and `:179`.
- **Mechanism:** *§Constraints · Tests* already says an executor reruns each revert before committing, and *· Comments* and *· The Number* already say every phase's VERIFY reads both. These lines add no site or value. The VERIFYs naming a specific revert, such as 3-2, 3-3, 4-1, 9-3, and 10-1, do add one, so they stay.
- **Change:** The seven generic pin lines and the eleven comment and Number clauses leave, with Task 9-2's `listRenumber.test.ts:83` note moving into its AFTER.
- **Estimate:** 0 production, about -18 plan lines.
- **Lands In:** The plan.

##### 9. Closing Rules Hold Three Homes

- **Cite:** Cold machine at `:219`, `:1116`, `:1129-1130`. The comment cap at `:174`, `:1115`, `:1128`. `Sync` at `:176`, `:1128`. `npm run build` at `:177`, `:1128`.
- **Mechanism:** Wave One's finding 21 asked for one home, and *Plan Reviews* records that "the cold machine keeps one statement", which isn't what the plan holds.
- **Change:** *§Final Verification* keeps each check. *§Constraints · Cold Machine* keeps its two working rules, that a task stops what it starts and that Nathan's instance isn't the run's, and *§Completion Criteria*'s Cold Machine bullet and Confidence's comment clause leave.
- **Estimate:** 0 production, about -5 plan lines.
- **Lands In:** The plan.

#### Low

##### 10. `punctuation`'s Pair Branch Needs No Ternary

- **Cite:** `Input/edits.ts:761-764`.
- **Mechanism:** Task 2-1 made the branch `return isLiteralAt(scan, c) ? null : {…}`. Falling through already answers null, since `PUNCTUATION['‼!']` holds nothing and `!glyph` returns.
- **Change:** `if (pair && PUNCTUATION[pair[1] + inserted] && !isLiteralAt(scan, c)) return {…}`. *a third mark stays literal in code* holds it.
- **Estimate:** -2.
- **Lands In:** Task 2-1.

##### 11. `continueBlockquoteOnEnter`'s `pfx === ''` Can't Be True

- **Cite:** `Input/edits.ts:98`, `:103`.
- **Mechanism:** Task 2-1 added `!scan.quotes[k]` to the first line. A true `scan.quotes[k]` means `isBlockquoteLine`, whose regex is `quotePrefix`'s, so the prefix holds at least a `>`.
- **Change:** The term leaves.
- **Estimate:** ±0, one term.
- **Lands In:** Task 2-1.

##### 12. The Rail Gate's `|| level >= 0`

- **Cite:** `Engine/intents.ts:357`.
- **Mechanism:** `open` itself reads as designed: a line rides only a list open above it. The added term decides nothing on any shape but one. Probed over 200,000 generated documents with `open` alone, 0 differed once items behind an indented quote were out of the alphabet. On `  > - a` it turns the item into a carried line, so the indented quote draws no rails where a flush one does.
- **Change:** `else if (open && own >= depth && ridesList(scan, i, depth))`. That's a behavior change on that one shape, rails appearing as B-9 expects, so the fold should rerun *cached assembly ≡ pure derivation* and the rail cases.
- **Estimate:** ±0, one term.
- **Lands In:** Task 7-4.

##### 13. `renumberRun`'s `from` Reads as an Offset

- **Cite:** `Engine/listModel.ts:150-162`.
- **Mechanism:** In a file where `from` is always a position, this one is a marker, and the name forced the row loop's `from` to become `at`, three changed lines with no purpose. The default parameter restates the fallback the next line already spells.
- **Change:** `held?: SequencedMarker` and `ordinalOf(held?.kind === head.kind ? held : head)`, with the loop's `from` returning.
- **Estimate:** ±0, with +3 / -3 leaving the diff.
- **Lands In:** Task 3-3.

##### 14. `seatPastMarker`'s `end` Holds Two Meanings

- **Cite:** `Engine/intents.ts:568`, `:572`.
- **Mechanism:** Task 9-5 made one `let` carry the lead's end and then the marker's.
- **Change:** `const lead = leadEnd(…)`, and `let end = marker.to` stands as it did at the baseline.
- **Estimate:** ±0.
- **Lands In:** Task 9-5.

##### 15. Wrappers and Reads Left With One Job

- **`linkSettle.of({ remembers })`:** `Links/linkSettle.ts:130`, `surface.ts:45`. Task 1-1 took `scope` out and left a one-member object. It takes `remembers` bare. ±0, Task 1-1.
- **`ValueEditor`'s `scope`:** `Core/Properties/Pickers/ValueEditor.tsx:62`, read once at `:95`. Inline it. -1, Task 10-1.
- **`listDrag`'s `scan`:** `Gestures/listDrag.ts:87-88`, whose second reader left with `subBlockAt`'s null. `subBlockAt(docScan(view.state), pos)`. -1, Task 7-3.
- **Loop-Invariant Reads:** `Gestures/listDrag.ts:38`, `:42`, where `first` feeds only `scan.fences[first]?.from` inside the per-line callback, and `Engine/listModel.ts:123`. Each hoists as `region`. ±0, Tasks 2-1 and 3-3.

##### 16. `smartBackspace` Re-Derives What `k` Holds

- **Cite:** `Input/edits.ts:213-215`.
- **Mechanism:** Task 2-1 added `k` under `ls` and `line`, which still walk the text.
- **Change:** `k` first, with `scan.lineStarts[k]` and `scan.lines[k]` under it. `continueBlockquoteOnEnter`, at `:100-102`, reads the same way.
- **Estimate:** ±0.
- **Lands In:** Task 2-1.

##### 17. Small Residue

- **`export`:** `Tables/cellStatic.tsx:63` `cellTokens` and `Guards/citationGuard.ts:14` `citationTailVerdict` have no reference outside their file at either head, and Task 1-1 rewrites beside both. The word leaves.
- **`tokens: ReturnType<typeof tokenize>`:** `Input/format.ts:209`, new in Task 2-1. `Token[]` names it.
- **Two `of`s:** `docCache.ts:80` and `:84`, a local and a method a line apart meaning different things. The local takes another name.
- **A Test-Only Export:** `Tables/cellStatic.tsx:67` `renderCellContent` lost its last production importer, `TextCell.tsx`, to `renderRestingLine` in Task 10-2, and three test files now hold the export. Whether it stays for them is the fold's call.

##### 18. `inlineLines` Could Be Born `literalLines`

- **Cite:** `:343`; Task 6-1's rename.
- **Mechanism:** Task 1-1 creates the function, and Task 6-1 renames a name nothing at the baseline held. *§Concepts* lists only the final one, so Task 1-1's AFTER cites a name the plan doesn't define.
- **Change:** Task 1-1 writes `literalLines`, and Task 6-1's clause and the Comment Ledger's Phase 1 row follow.
- **Estimate:** 0 at the head.
- **Lands In:** Tasks 1-1 and 6-1.

##### 19. Tests

- **One Fact, Two Pins:** `Engine/listModel.test.ts:235` *a lettered run past Z counts on through the wrap* sits under `Input/listRenumber.test.ts:178`, which reaches it through the filter a user meets, so it leaves. *counts every run* and *a quote carried by an item* are the only pins of their cases and stay.
- **One Rule, Two Readers Through One Function:** `Engine/blockModel.test.ts:53`'s third `expect` and the rail pin both run `ridesList` over a carried block's blank. The `expect` leaves, and the walk's pin stays, since `rolesAgainst` reads it on its own.
- **Could Be One `it`:** `Input/format.test.ts:364` and `:368`; `Input/listRenumber.test.ts:107` and `:111`, which go red together on one revert.
- **Two Tests in One:** `Tables/cellRestingMenu.test.tsx:231` unmounts and remounts mid-test to reach its glyph half. It splits at the remount.
- **A Factory With Nothing to Vary:** `Desktop/Actions/editorMenu.test.ts:24`. `req()` lost its arguments in Task 9-3 and becomes a constant, the rule Task 1-1 states.
- **Mechanism:** `Core/Properties/Pickers/TextPane.test.tsx:371` asserts `blockQuery` isn't mounted, where drive group 10 proves the behavior. Cheap, and it's the one new pin I found reading mechanism, so it stays unless the fold wants it gone.
- **Estimate:** about -15 test lines.

##### 20. The Decision Map and `**Delivers:**` State One Mapping Twice

- **Cite:** `:62-91`; 20 `**Delivers:**` lines.
- **Mechanism:** No executor acts on either, and a fold has to keep both true.
- **Change:** The map stays, since its "Holds" rows have no task to sit under, and `**Delivers:**` leaves.
- **Estimate:** about -40 plan lines with the blanks.
- **Lands In:** The plan.

##### 21. Evidence Sits Where Instructions Go

- **Cite:** `:60` (*The key merge stays at Phase 6*), `:782` (the one-table decline), `:820` (the 7-4 timings), `:986` (the paint and the fallback).
- **Mechanism:** Each is a settled reason or a measurement. *Investigation · §Calls Taken* and each phase's *Notes* already hold them.
- **Change:** Each sentence leaves.
- **Estimate:** about -6 sentences.
- **Lands In:** The plan.

##### 22. Drive Tasks List Their Patches' Items

- **Cite:** The AFTERs of Tasks 1-2, 2-3, 3-4, 4-2, 5-2, 6-3, 7-5, 8-2, 9-6, and 10-4.
- **Mechanism:** `MATRIX.md` and the patch hold the case list, and VERIFY reads "every item passing".
- **Change:** Each keeps its count, its decisions, and anything an executor must do, such as Task 9-6's clipboard restore and `seatRead`.
- **Estimate:** about -10 long lines.
- **Lands In:** The plan.

##### 23. The Compaction Paragraph Is Written Three Times

- **Cite:** `:594`, `:753`, `:1021`.
- **Change:** The sentence moves into *§Constraints · Execution* once, and *§Process Overview*'s checkboxes stand alone.
- **Estimate:** about -9 plan lines.
- **Lands In:** The plan.

##### 24. *§Reconciliation* Holds Two Paragraphs Nothing Walks

- **Cite:** `:1166`, `:1168`.
- **Mechanism:** Comments and tests change "with their task's patch", and the Comment Ledger and *Notes* already list them. The drives' rows have the same character but tie to named tasks, so they can stay.
- **Change:** Both paragraphs leave.
- **Estimate:** -3 plan lines.
- **Lands In:** The plan.

##### 25. Plan Sentences the Patches Don't Bear Out

- **Task 3-4 and Task 4-2:** `:583` says 79 items and `:639` says 16. *Drives — Notes* says 77 and 15, the group 4 patch holds 15, and `:1080`'s 611 sums only with 77 and 15.
- **Task 3-3:** `:560` says `dropChanges` rescans with `scan.scope`. Task 1-1's patch does, and the line is context in Task 3-3's diff.
- **Task 5-1:** `:669` says the table files read `scan.markers`. Task 1-1 did, and this task removes only the `{ lm, glyph }` projection.
- **Task 11-1:** `:1103` greps `setListKind`, which appears in no code or document at `b7f2f17a5`.
- **Screenshots:** `:214` says four to six a checkpoint, and each checkpoint says four.
- **§Concepts:** `:116` lists `levelAt` as a function, and it's a closure local inside `railIntents`. `:111` lists `heals` as a flag beside `fenced`, and it's derived. `levelAt`'s row and `heals` in `:111` can leave, while `held` and `fenced` are real parameters the plan names, so they stand.

#### Wave One's Folds, Read as Patches

- **`caretSeat`'s Range:** reads as designed. An early return would leave a caret inside a hidden prefix, as the Fold Ledger found, and `range === main` is what forces the write when the numbers agree.
- **`overLines`:** a gate term only, with `reshaped` carrying the real test. It holds.
- **`renumberRuns`' Delimiter Read:** one line whose reason sits in the doc. Moving it into `rolesAgainst` would need the same test at `runsAround`'s `markerIn`, so it costs a line to shed `Math.max`. It holds.
- **The Rail Gate's `open`:** holds as a name for what a line can ride, with finding 12 on its extra term. `shown[i - 1] !== LIST_ENDS` isn't a substitute: it differed on 15,061 of 200,000 documents, smallest `> - q\n>   qq`, since the item opening a quoted list records `LIST_ENDS`.
- **`docText`:** replaces `blanked` rather than sitting beside it, and the effect's compare needs it. It holds.

#### The Churn

Across the production range, 293 lines each way are whitespace alone: 1,509 / 1,789 raw against 1,216 / 1,496 with whitespace ignored. All of it is a body losing a closure level: `decorations.ts`, `gripMenu.ts`, `listRenumber.ts`, `markdownInput.ts`, `acQuery.ts`, and `linkEdit.ts` in Task 1-1, `cellStatic.tsx` in Task 9-3, and `menu.ts` in Task 9-4. Each is the factory rule Wave One ruled on, and no smaller edit keeps that rule, so nothing folds here. What does change a patch for no purpose is finding 4's span, finding 13's rename, and finding 18's name.

#### What I'd Keep Exactly

- **The Engine's New Pieces:** `markerIn`, `sealedBlock`, `lineMarker` with `readsListsIn`, `continuesList` as a boolean, `LIST_TYPES`, and `literalLines`. Each is at its smallest.
- **The Filter:** `listRenumber.ts` as a whole, 51 lines where 89 stood.
- **`runsAround` With `seen`, `rebuildMove(fenced)` With `heals` Derived:** the bodies Wave One kept read the same inward.
- **`contractions` and `wordAt`:** the cleanest removal in the range.
- **`restingRows` and `shortRows` Sharing `copyRow`, and the `menu` Union.**
- **`renderRestingLine`:** one line's drawing for both surfaces.
- **`atListEnd` and `CellEditor`'s Three-Line Keymap:** the merge's payoff, reading exactly as *§Task 6-2* claims.
- **The Reconciled Counts:** 64 `scope` sites, 182, 51, and 199 lines, 289 to 205, 45 production files, and 3,508 comments all read true at their commits, and every VERIFY grep I ran at its task's commit prints nothing.

#### Checked, and Holds

- **`readOnly ? null : glyphAt(e)`, `Menus/menu.ts:85` and `restingMenu`:** stated twice, but each surface derives `at` from the glyph before `routeRightClick` runs, so lifting it needs `readOnly` passed in as well.
- **`readLine`'s Two `pad`s:** a diff sign takes no pad, so `+added` heads as `+## added`, and the prose rule would write a space there. The `>` case is a blank line in a quoted fence. They're two rules.
- **`selection` Sent on Every Ask:** `params.selectionText` is the drawn text and `sliceDoc` the source, so a live surface's null keeps Speech and Share reading what's shown.
- **`asText` Recursing:** would write a nested member as lines, where *§Calls Taken* says one flow line.
- **`.checkbox`'s Three Rules:** two rules would restate `-0.18em`.
- **`leadEnd`'s Boolean:** a predicate at two sites reads no better.
- **`listMarkerText`'s Move at Task 3-3, Gone at Task 7-1, and Task 3-2's `seat` Rewritten at Task 9-5:** chain-only. The first buys nothing by reordering, and the second's rewrite is Task 9-5's behavior.

#### Not Re-Raised

The one-table type definition, `regionOf`, `rolesAgainst`'s body read, `quoteDepths`, `seated` and `onItemEnter`, `listKeys`' branch, the delimiter refusals at their writers, `cheapMiss` reading the facet, the Desktop menu as two reads, `sharedSurface` apart from `editorBase`, the block move's flags, and a capability predicate for I-036.

#### Ledger Effects

Taken together, Actionable moves from -277 to about -292: Phase 2's row by -13, Phase 7's and Phase 10's by -1 each. Comments stay at 3,508 and tests lose about 15 lines for one `expect` added. The plan loses about 200 lines, most of them finding 7's and finding 20's, and finding 5 takes about 52 minutes off the run.
