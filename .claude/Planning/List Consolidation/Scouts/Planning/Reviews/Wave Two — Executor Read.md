#### Adversarial Review: List Consolidation, Wave Two, the Executor's Read

**DATE:** 11-06-2026
**SUBJECT:** *List Consolidation — Implementation Plan* and every patch in `Scouts/Planning/Phases/`, read inward, as the agent who has to run them from `b7f2f17a5` with nobody to ask.
**METHOD:** every finding came from something run. A private export of `b7f2f17a5` under `lc/`, with its own repository so nothing touched the real one, took every patch in *§Process Overview*'s order, one commit per task. Each reproduction below runs from a test file in `Core/MarkdownPM/` on that tree, or on `148e79566`, which is byte-identical in production.

**Verdict:** solid after the listed findings: the patches replay exactly and every pin holds, one patch the plan names doesn't exist, and one fold has a wrong edge. 1 High, 4 Medium, 11 Low.

The plan, as a run: 34 of its 35 patches apply clean in order with no hand edits, and `Core`, `Desktop`, `UIX`, `Sync`, and `Mobile` land byte-identical to `148e79566`. Task 11-1's patch isn't on disk. Every number in the Net Ledger and the Comment Ledger reads exact at its head.

#### Findings

##### Correctness

###### 1. `renumberRuns`' Delimiter Read Stops on Another Block's Closer — `< MEDIUM — CONFIRMED >`

- **Input:** two carried code blocks one above the other. Case A is `1. a`, a block, `2. b`, a block, `3. c`: triple-click `2. b` and press Backspace. Case B is `1. a`, two blocks under it, a blank line, `1. b`, `2. c`: Backspace on the blank.
- **Result:** A lands `1. a`, both blocks, `3. c`, where `2. c` is right. B lands `1. b`, `2. c`, where `2. b`, `3. c` is right. Case C, the same as B with one block, lands right, which is the pin the fold carries. B reads the same at the baseline, where no fold had reached it; A is new, since the baseline's head took the block's lead.
- **Breaks:** B-5's merge and recount, and B-10's "the recount of the run an item leaves", at the edge Wave One's finding 1 meant to close. The fold's `i = openerOf(scan, k) - 1` steps one line above the opener, and when that line is another block's closer `rolesAgainst` reads it as inside that block, so the outer list never counts. Task 3-2's forward-head fold is what makes A reachable: a triple-click's head now stands on the opener, so `fromB` lands there.
- **Reproduction:**

```tsx
const doc = '1. a\n   ```js\n   x\n   ```\n2. b\n   ```js\n   y\n   ```\n3. c'
const from = doc.indexOf('2. b')
const v = await mountEditor({ initialBody: doc })
await act(async () => { v.focus(); v.dispatch({ selection: { anchor: from, head: from + 5 }, userEvent: 'select.pointer' }) })
await act(async () => { runScopeHandlers(v, new KeyboardEvent('keydown', { key: 'Backspace' }), 'editor') })
v.state.doc.toString() // ends '…```\n3. c', wanted '…```\n2. c'
```

- **Fix:** walk out of every adjacent block, Task 3-3, net 0 lines. Tried: A and B land right, and `listRenumber`, `listModel`, and `blockMove` stay green. Two pins, one per case, join *a change resting on a carried block's delimiter*.

```ts
let i = lineIndexAt(scan, p)
while (fenceDelimiter(scan, i) && openerOf(scan, i) > 0) i = openerOf(scan, i) - 1
```

###### 2. Select All's `view.focus()` Reaches a Glance, and Its Close Can't Hand Focus Back — `< MEDIUM — CONFIRMED >`

- **Input:** the caret in a page, a glance open over a link, a right press on a word or a read-only cell in the glance, Select All, then the pointer leaves.
- **Result:** `applyEditorAction` focuses the glance's tile, since `PageTile` is read-only rather than non-editable, so `GlancePane.tsx:38`'s contract breaks. `close()` then hands focus back only to `focusBefore`, and `onPointerDownCapture` records that for `button === 0` alone. A right press records nothing, so `document.activeElement` ends on `body` when the tile unmounts, and typing goes nowhere until the next click. `Phase 9 — Notes · Concerns` says "the pane's close path restores `focusBefore`", which is false on this route.
- **Reproduction:** in `GlancePane.test.tsx`, change `pressInside`'s `button: 0` to `button: 2`. *hands focus back to the element that held it before the press* and *a second press inside the pane does not re-record* both fail, reading `body`. That's jsdom on the close path; the app route to it is traced, since live time went to the drive agent, and whether Chromium's own right press already focuses a glance's text at the baseline wasn't driven. The resting cell route is new either way, since a press on a cell doesn't focus.
- **Fix:** remove `if (e.button !== 0) return` from `GlancePane.tsx`'s `onPointerDownCapture`, -1 line, in Task 9-3. Tried: all of `Core/Interface/Glance` stays green, and both right-press cases pass. Pin it as a right-press twin of *hands focus back*. The glance's own comment should then stand as "never takes focus unless a row asks it to", which `view.focus()` does.

###### 3. `(open || level >= 0)`'s Second Term Has No Pin — `< LOW — CONFIRMED >`

- **Input:** Task 7-4's gate with `|| level >= 0` removed, the whole of `Core/MarkdownPM`.
- **Result:** 2,080 of 2,080 green. A differential of 500,000 documents on a wider alphabet than the fold's (indented quotes, callouts, delimiters, math, tables, `lists` and `page`) read 0 differences against the ungated walk, so the gate is sound, and 640 differences against `open` alone. The shortest is `  > - u\n> \t- r`.
- **Breaks:** nothing today. The next reader simplifying that condition goes unnoticed, and the Notes' 5,661 differing documents rest on a deleted script.
- **Fix:** one row in *a wrapped line carries the rail…*, on `  > - u\n> \t- r`, reading the two lines' rails.

###### 4. `docText`'s Fold Opens a Route That Doubles a `\r\n` Value's Breaks — `< LOW — CONFIRMED >`

- **Input:** a pane open on `a\r\nb`, and a tool writing `c\r\nd` to that value while it's open, then the pane closing untouched.
- **Result:** the pane holds `c\n\nd`, and the close commits `c\n\nd` to disk: a blank line nobody typed, on the path G-4 says writes nothing. `mirrorBody(view, initial)` passes the raw text, and `changesTo`'s diff reads `\r` and `\n` as a break each. The baseline's `initial !== committed.current` compare refused this write for a `\r\n` value, since its document never equalled its text, so the fold opens it. An LF value taking a `\r\n` write reads the same at both trees.
- **Reproduction:** mount `ValueEditor` with `initial: 'a\r\nb'`, rerender it with `initial: 'c\r\nd'`, unmount, and read `onCommit`.
- **Fix:** `mirrorBody(view, next)`, one word, since `next` is already the text as the document holds it. Tried: both cases land `c\nd` and commit nothing, and `Core/Properties/Pickers` stays green at 151. It wants one row beside the `\r\n` pin.

###### 5. A Split's Nested Lower List Keeps Its Numbers Only Until the Next Recount — `< LOW — CONFIRMED >`

- **Input:** `1. a`, `\t1. n`, a blank line, `\t2. m`, `\t3. k`, `2. b`, which is what B-5's split of a nested run leaves, and Enter at the end of `\t2. m`.
- **Result:** the lower list renumbers to `\t1. m`, `\t2. `, `\t3. k`. The flat twin, `3. m`, `4. k` under a blank, keeps its start and reads `3. m`, `4. `, `5. k`.
- **Breaks:** B-5's "the lower list keeping its numbers" holds at the split and gives way at the next list edit. `renumberRun`'s `head.level > 0 ? 1` reads a list opening on an indented item as nested, though nothing sits above it. *Investigation · §Calls Taken* settles "a nested run counts from 1", and it doesn't weigh a run with no parent, which the split produces. An item's Delete Line at a parentless run reads the same way: `\n  1. n\n  2. m` leaves `  2. m`, which `renumberRuns` over the whole document would write as `1.`.
- **Fix:** none in the code, since a number moving on the next edit is cosmetic and the rule's simplest form. One sentence in *§Behavior Changes* row 12 states it, so a later reader doesn't take it for a miss.

**Swept:** gates at all 23 production task heads, with the drive patches on the tree, so `no-wrapped-comments --scan` read them too. 120,000 random documents through `listKindOf`, five rows, and `subBlockAt` on every item, at both scopes, threw nothing, so the `!`s Phase 7 leaves hold. Every name in *§Concepts · ADDED* stands in the tree, and every name in *REMOVED* is gone from production, the survivors being unrelated words.

##### Cohesiveness

None.

**Swept:** all ten of the plan's inline code blocks match their task's head line for line. The twins of the delimiter read: `rolesAgainst`, `runsAround`, `ownersOf`, `listReach`, and `collectBoundaries` compare a region through `markerIn`, and `renumberRuns` is the one site stepping out of a block, which finding 1 covers.

##### Architecture

None.

**Swept:** the ask is an end-to-end run from `b7f2f17a5` to the promised tree. The chain answers it: Placements holds exactly four added or moved paths, and `git diff --stat <BASELINE>..HEAD -- Core/Sync Sync` prints nothing.

##### Completion

###### 6. Task 11-1's Patch Doesn't Exist — `< HIGH — CONFIRMED >`

- **Input:** Task 11-1's AFTER, `Scouts/Planning/Phases/Phase 11 — Docs and Issues.patch`.
- **Result:** no such file. `ls Scouts/Planning/Phases | grep -c "Phase 11 — Docs"` reads 0, and `*§Constraints · Plan Rules*` says a task's AFTER is its patch. The work exists only as commit `e74905159` on `lc-docs2`, which `Phase 11 — Notes` names and the plan doesn't. `lc/fold/save-patches-w1.sh` writes 23 patches, none of them this one.
- **Breaks:** the last phase of an unattended run. An executor either writes five documents from *§Reconciliation* by hand, or goes looking for a branch the plan never mentions.
- **Fix:** `git diff --binary 148e79566 e74905159 > "…/Phase 11 — Docs and Issues.patch"`. Run against my replay's head, with every drive patch on it, that diff applied clean, `node .claude/scripts/check-atlas.mjs` read 17 tables and exit 0, and the VERIFY `git grep` printed nothing, so the file is all that's missing. If Wave Two's folds change `listRenumber` or the menu, regenerate it after they land.

###### 7. E-4's Info Pane Holds No Proof — `< LOW — CONFIRMED >`

- **Input:** *§Decision Map* maps E-1 and E-4 to Task 9-3, and E-4 names four surfaces: the page reader, a tile, a read-only cell, and the info pane.
- **Result:** three hold pins and group 9 items. The info pane holds neither: `InfoButton` has no caller outside `Core/Info/`, `InfoButton.test.tsx` holds no right-click, and group 9 has no item. It's also the one surface built with `editable={false}` (`InfoButton.tsx:87`), so it's the one surface where `view.focus()` in Select All can't take focus: `contenteditable="false"` with no tabindex isn't focusable.
- **Breaks:** *§Completion Criteria*'s "every read-only surface offers Copy and Select All" reads as proven. Every other decision maps to a named pin or drive item; this is the only gap.
- **Fix:** state it. *§Decision Map*'s row reads "the info pane has no mount, so E-4 reaches it by `MarkdownEditor`'s shell and stands unproven until something mounts it", and the morning report carries the same line.

###### 8. A False Setting Caption Has No Owner — `< LOW — CONFIRMED >`

- **Input:** `Core/Settings/frames.ts:729`, "Leave indented lists and other types unchanged when adjusting a list's format."
- **Result:** D-2 makes the grip change every item whatever the setting reads, and Task 11-1's commit states that exception in `ConfigurationPM.md:152`, while the in-app caption stays false. `Phase 11 — Notes · By Hand` raises it; no task, row, or *§Reconciliation* line picks it up, and `frames.ts` appears nowhere in the plan.
- **Fix:** copy is Nathan's call, so it goes in the morning report, or takes one clause in Task 3-3 if he's written it.

###### 9. The Test Column Is Unfilled, So Nine VERIFY Lines Can't Run — `< MEDIUM — CONFIRMED >`

- **Input:** "the count reads the Net Ledger's row" or its like, at Tasks 1-1, 2-2, 3-3, 5-1, 6-2, 7-4, 8-1, 9-5, and 10-3.
- **Result:** the Net Ledger's column reads `{TESTS-1}` through `{TESTS-10}`, and nothing in the plan says what fills them. BASELINE and PLAN REVIEWS each say when they're filled; this column doesn't.
- **Fix:** fill it. Measured here, passed, with 2 skipped at every head: **1:** 9,127; **2:** 9,141; **3:** 9,171; **4:** 9,178; **5:** 9,185; **6:** 9,186; **7:** 9,192; **8:** 9,197; **9:** 9,203; **10:** 9,217. Phase 11 reads Phase 10's. Phases 6 and 9 each counted one load red, passing alone, as a passed test.

###### 10. The Number Reads Last Task's Head, Since VERIFY Runs Before the Commit — `< MEDIUM — CONFIRMED >`

- **Input:** *§Constraints · Commits*, "each task commits once its VERIFY passes", against *§The Number*, whose command reads `<BASELINE>..HEAD`.
- **Result:** with Phase 4's patch applied and uncommitted, the command as written reads -119 (+983 / -1102), which is Phase 3's row. An executor following the order records the wrong Measured, or reports a phase over its estimate that isn't.
- **Fix:** *§The Number* runs `view-delta.py <BASELINE> --exclude .claude --save <file>`, a working-tree diff that reads -117 (+985 / -1102) here, or the sentence says it's recorded after the commit.

###### 11. *§Completion Criteria* Asks a Proof Planning Didn't Make — `< LOW — CONFIRMED >`

- **Input:** "every new test goes red without its change", and *§Tests*' "each pin a patch carries ran red".
- **Result:** I ran each task's tests against the production of the task before it. At Task 3-3, 12 of 37 new tests stay green, and 9 of those have no revert named anywhere, such as *a list starting at 5 stays at 5 whichever way an item moves*. At Task 4-1, 4 of 7 stay green, which its own VERIFY expects. They pin behavior the change had to preserve, so the tests aren't wrong; the sentence is.
- **Fix:** "every pin a phase's *Notes* names goes red without its change".

###### 12. Line Cites at the Baseline's Numbering Read as This Head's — `< LOW — CONFIRMED >`

- **Input:** Task 9-2, "`listRenumber.test.ts:83` selects the whole line". Task 10-1, "`:179`, `:193`, `:236` hold".
- **Result:** each is a baseline line. At Task 9-2's head `:83` is `land`'s body, and the test's call sits at `:134`. At Task 10-1's head the three read `})`, `})`, and `typeAtEnd('c')`, and the tests sit at `:181`, `:205`, and `:261`.
- **Fix:** name each by title.

###### 13. The Cold-Machine Check's Glob Fails on a Cold Machine — `< LOW — CONFIRMED >`

- **Input:** `ls -d "$TMPDIR"/pommora-drive-* 2>/dev/null` under `/bin/zsh`, which is this session's shell.
- **Result:** with nothing there it prints `no matches found` and exits 1, since zsh raises that itself, past the redirect. "Prints nothing" fails exactly when the machine is cold.
- **Fix:** `find "$TMPDIR" -maxdepth 1 -name 'pommora-drive-*'`.

###### 14. A Checkout Isn't a Build for Editor Parity — `< LOW — CONFIRMED >`

- **Input:** RUN START, "each later drive checks the worktree out at its task's commit", against *§Live Drives*, "each from a worktree (`worktree.sh <sha> "$WT"`)".
- **Result:** the harness's `launch` runs `npm run build`, while `editor-parity/launch.sh` doesn't, so Parity run first after a checkout launches the last build and reads 0 differing lines: a pass checking nothing. *§When Drives Run* happens to list it after a drive that builds, so only an executor who reorders a row meets it. Also, `../../.claude` only reaches `$SCRATCHPAD/.claude` from a worktree two folders deep.
- **Fix:** one clause under *§Live Drives*: Editor Parity runs on a tree a drive or `worktree.sh` just built.

###### 15. `c/plan-execution` Says Wait Where the Plan Says Continue — `< LOW — CONFIRMED >`

- **Input:** its `<compaction-checkpoints>`, "Invoke `c/pre-compaction` and await further direction", against the plan's "records state in this file, and continues" and *§Execution*'s "no step waits on Nathan".
- **Result:** *§Unattended* settles it by implication, but nothing names the override, and an executor told to run through that command meets a stop three times. `pre-compaction` is also user-invoked.
- **Fix:** one clause in *§Unattended*: the plan's Compaction Checkpoint replaces the command's.

###### 16. Prose That Reads Wrong Against Its Patch — `< LOW — CONFIRMED >`

- **Task 5-1:** "`lm.kind` at its three sites". The patch and *Notes* read four: `listReach` twice, `listKindOf`, and `setList`.
- **Phase 3's GOAL:** "`ridesList` joins them for the walks, the block model, and the rails". `rolesAgainst` calls `openerOf` and `continuesList` itself, as `Phase 11 — Notes` already says.
- ***Phase 2 — Notes*:** reads "6 failed of 191" for `readsListsIn` answering false, where Wave One's merged pin leaves 5 of 190.
- ***§Gates*:** names three tests that time out under load. `Core/Sync/handlers.test.ts`' *rotates the ring on revoke for the remaining device alone* is a fourth: red once in a full run at Task 9-5 at a load near 12, and 3 of 3 alone. An executor reads it as real.
- ***§Reconciliation*:** `Editor-Internals.md:24`, `:37` are listed, and the commit edits `:18`, `:26`, and `:40`, its *Notes* reading the other two as still true. `MarkdownPM.md:130`'s "citations, where files moved" is the pane's inset in the commit.
- ***Phase 10 — Notes*:** still names `blockGestures` and `inlineLines`, both gone by Phase 1 and Phase 6.

**Swept:** every decision A-1 to G-13 appears in *§Decision Map*, and each resolves to a pin or a drive item but E-4's info pane. F-1's grip past the document's end rests on `firstItemOf` leaving, which its VERIFY's grep proves, and C-4's `.md` path holds a group 2 item at `notes/a.md`. *§Constraints* read line by line: the Comments ledger's early overrun is stated and holds, `git commit --only` carries `textScope`'s rename when both paths are named, run at Task 6-1, the `~/Test` hash command runs, every VERIFY `git grep` matches at the prior head so none is vacuous, and the Overview's `scope` 64, `listModel.ts` 182, `listRenumber.ts` 51, and `CellEditor.tsx` 199 read true.

##### Interaction

None beyond findings 1 and 2.

**Swept:** real keys in a mounted editor, baseline against head: Enter, typing, and Backspace over six selections, Tab and Shift-Tab over nine (0 differ), Shift+Arrow through a quote, a callout, a carried block, a quoted fence, and an indented list. A triple-click above each of seven hidden leads, then Backspace, Delete, typing, six rows, and the arrows: 84 cases, every difference from the baseline an improvement but one noted under *§Unsure*.

##### Implications

None.

**Swept:** all fifteen `'lists'` sites, for logic that meant a table cell and now catches the pane: each reads what the scope holds or is a table's own. Every `onContextMenu` above an editor, for what the shell's stop and Task 9-1's bubble would cut off: only the cancelling layers the stop means to.

##### Oversight

None.

**Swept:** the obvious path, a typed list with Enter, Tab, Backspace, and a pick, is what groups 1 to 6 and the suite already walk, and the 2,080 tests of `Core/MarkdownPM` hold at every head. Who would notice a subtly wrong line: every fold line I mutated goes red but `level >= 0`, which finding 3 covers.

#### Fold Attacks

| Fold | Attack | Outcome |
|---|---|---|
| `caretSeat`'s inverted range | A swallowing replace at a hidden prefix, the Notes' two routes, `range === main` dropped | Holds. `mirrorBody` skips filters, but its `changesTo` diff didn't produce an inverted range in two probes |
| `caretSeat`'s forward head | Seven hidden leads, 84 cases against the baseline, then Shift+Arrow through five of them | Holds, and fixes more than its pin says: Bold, Heading, a list pick, and Blockquote all stop writing into the next line |
| `renumberRuns`' delimiter read | 48,484 line edits on well-formed lists with carried and Markdown blocks: blanks removed, Delete Line, cuts, pastes, typing and deletes over a selection, each then read by a recount of the whole document | **Finding 1.** Exactly two classes stay unsettled: 23 cuts, finding 1's, and 1,372 runs opening on a nested item, finding 5's. Nothing else |
| `overLines` | Real Enter and typing over six selections, in a Markdown block, across a blank, across lists | Holds. `allowMultipleSelections` is never mounted, so `main` is the one range |
| `markerIn` | 120,000 documents with `- ```md`, `~~~md`, quoted and indented fences: no delimiter holds a marker, and no reader throws | Holds |
| `(open \|\| level >= 0)` | 500,000 documents, two scopes | Holds; **finding 3** for its pin |
| `docText` | `\r\n`, lone `\r`, `\r\r\n`, trailing and blank values, and U+2028 in both modes, closed untouched: 14 of 14 commit nothing. An outside write | **Finding 4** on the outside write; the close itself holds |
| `view.focus()` | Does it reach a glance | **Finding 2.** Yes |

#### Unsure

- **Typing Over a Triple-Clicked Line Above a Quote:** `abc\n> quote` lands `Z> quote`, with the `> ` now literal, where the baseline landed `Zquote`. The forward-head fold is the cause, and it's a raw join either way. Neither reads clearly better, so it's a judgment for whoever owns the fold.
- **`Core/Interface/Glance/GlancePane.tsx:370`:** whether Chromium's right press on a glance's text already moves focus into the tile at the baseline. Ten seconds live: right-click text in a glance and read `document.activeElement`. It sizes finding 2's text route, not its cell route.

#### Killed

- **The One-Line Field Flattening a List:** mounted bare, `ValueEditor` turns `- milk\n- eggs` into `- milk - eggsx` on a keystroke. `PropertyValueInput` hands it `editorText`'s first line alone and `textFromEdit` rejoins the lines behind, so nothing reaches it.
- **An Inverted Selection Through `mirrorBody`:** `filter: false` skips `caretSeat`, but two probes of a swallowing mirror left no inverted range.
- **Callout Stripping `- ` in Code:** `> [!callout] foo` from `- foo` reads the same at every head, and C-7 keeps Insert ▸ as it is today.
- **A Link's Right-Click Skipping the Wrap's Glance Close:** Task 9-1's bubble handler misses a claimed event, and `linkGestures`' `onContextMenu` runs `dismiss` first, as row 14 says.
- **Tab Over a Range After Phase 6:** 18 cases read the same at the baseline and head.
- **Multi-Cursor Under `overLines` and `caretSeat`:** `allowMultipleSelections` appears nowhere in production.
- **The `lists` Rename Catching the Pane in Cell-Only Logic:** all fifteen `'lists'` sites read; each is either a reader of what the scope holds or a table's own call.

#### What I Ran

- **Replay:** all 34 patches on disk, in order, one commit each, in a private repository. Production trees compare equal to `148e79566` by hash.
- **Gates:** `gates.sh` at the baseline (9,121 passed, 2 skipped, 549 files) and at all 23 production task heads, with the drive patches interleaved, which no planning run did. 21 heads read clean. Two read one red each at a load near 12, with the drive agent running: `matrixRuntime` at Task 6-2, which *§Gates* names, and `Core/Sync/handlers.test.ts` at Task 9-5, which it doesn't (finding 16). Each passes alone at that head, and typecheck and lint read 0 at all 23.
- **Ledgers:** comments and Actionable at every head, by the plan's own commands. All match, ending at 3,508 and -277 (+1446 / -1723). `scope` reads 64 at Task 1-1 and at the end.
- **VERIFY Lines:** every `git grep` exactly as written at its task's head, and each against the head before it.
- **Pin Reverts:** every one the plan or a *Notes* names, R1 to R19 included, each watched red with the failure the *Notes* quote, the one stale count aside (finding 16). Task 8-1's Run A, B, and C. Each task's tests against the production before it.
- **Mutations Beyond the Plan:** the rail gate both ways, `Math.max`, `range === main`.
- **Fuzzes:** the rail differential, 500,000 documents. A settled-count run of 48,484 edits on well-formed lists, classified above, and a noisier one of 104,814 on a random alphabet, whose unsettled results I read by sample rather than class by class. 120,000 documents through the list readers and rows.
- **Task 11-1:** the VERIFY lines on `e74905159`'s diff, since its patch is missing.

#### Not Checked

- **Drives:** none ran, per the brief. Task 0-1's `node live-drive.mjs` exit 2 is read from the code at `:99-103`, ahead of any launch: the session's permission check refused the run as interference with the drive under way, and I didn't retry it. Item counts and `MATRIX.md` weren't read, since the drive patches were being rebuilt: the replay's `.claude/scripts` differs from `lc-drive2` in four files.
- **`npm run build`:** not run; the production tree is the one `wt-adv1` built.
- **Checkpoints, Reviews, and Notifications:** read, not run.
