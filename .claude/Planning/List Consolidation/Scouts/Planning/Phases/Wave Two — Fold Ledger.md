### Wave Two — Fold Ledger

**DATE:** 11-06-2026
**FOR:** the plan writer.
**CHAIN:** `lc-w2` in `lc/wt-w2`, head `b380728f4`, 23 commits on `b7f2f17a5`, in `lc-w1`'s order. `lc-w1` stood at `148e79566`. Wave Three's parameter moved the tail to `lc-w3`, head `18b7ea4cc`, with Tasks 9-3 to 10-3 taking new hashes.
**DOCS:** `lc-docs3` in `lc/wt-docs`, head `43ff98c3f`, on `b380728f4`.
**GATES AT THE HEAD:** typecheck 0, lint 0, 9,219 passed, 2 skipped (9,221), 550 files, a clean full run. Actionable -286 (+1464 / -1750). Comments 3,508.

**How to Read This:** the AFTER code blocks and `**Delivers:**` lines are being cut, so this lists only what a task's remaining prose must change. Tasks are named rather than lines, since the plan is moving.

#### Plan Rows

##### *§Net Ledger*

| Phase | Measured Actionable | Own | Passed at the Head |
|---|---|---|---|
| 1 · One Scan Per Surface | -108 (+687 / -795) | -108 | 9,127 |
| 2 · Markdown Code Blocks and Masked Markers | -39 (+838 / -877) | +69 | 9,140 |
| 3 · Blank Lines and Numbering | -126 (+1000 / -1126) | -87 | 9,170 |
| 4 · Paste | -124 (+1002 / -1126) | +2 | 9,177 |
| 5 · One Marker Grammar | -173 (+1040 / -1213) | -49 | 9,184 |
| 6 · One Set of List Keys, and the Scope's Name | -201 (+1108 / -1309) | -28 | 9,185 |
| 7 · One Definition Per Type | -260 (+1153 / -1413) | -59 | 9,191 |
| 8 · The Word Rule | -307 (+1172 / -1479) | -47 | 9,196 |
| 9 · Right-Click | -308 (+1385 / -1693) | -1 | 9,204 |
| 10 · Text Properties | -286 (+1464 / -1750) | +22 | 9,219 |
| 11 · Docs and Issues | -286 | ±0 | 9,219 |
| **Total** | **-286 (+1464 / -1750); one production file added, none removed** | | |

##### *§Comment Ledger*

| Phase | Count | Own | Change From the Old Row |
|---|---|---|---|
| 1 | 3,512 | +1 | `inlineLines`' doc reads `literalLines`' |
| 2 | 3,515 | +3 | None |
| 3 | 3,515 | 0 | None |
| 4 | 3,515 | 0 | None |
| 5 | 3,511 | -4 | None |
| 6 | 3,510 | -1 | None; `literalLines`' doc and `cheapMiss`' comment reword here |
| 7 | 3,509 | -1 | None |
| 8 | 3,509 | 0 | None |
| 9 | 3,507 | -2 | None; four `GlancePane.tsx` comments reword here |
| 10 | 3,508 | +1 | None |
| 11 | 3,508 | 0 | Documents only |

#### Task Prose

- **Task 1-1, VERIFY:** "`inlineLines`' branch" reads "`literalLines`' branch".
- **Task 3-3, AFTER:** "`renumberRuns`' `i` reads a fence's delimiter from outside its block" reads "`renumberRuns`' `i` walks out of every block a position's delimiter stands against".
- **Task 3-3, VERIFY:** "*typing recounts the run it joins* and *Enter recounts the run it joins* read red" reads "*typing or Enter recounts the run it joins* reads red". It gains "*taking the item between two blocks counts past both* and *removing the blank below two blocks merges the lists and recounts them* read red with the `while` as an `if`."
- **Task 4-1, VERIFY:** "3 red of 50" reads "3 red of 51".
- **Task 6-1, AFTER:** "`inlineLines` becomes `literalLines`, " leaves. Task 1-1 writes the name.
- **Task 7-4, AFTER:** gains "`ridesList` runs only while a list is open, so a list behind an indented quote draws a flush quote's rails."
- **Task 7-4, VERIFY:** gains "*a wrapped line carries the rail…*'s row on `  > - u\n> \t- r` reads red with `open || level >= 0` as the gate."
- **Task 9-3, AFTER:** gains "A glance's `onPointerDownCapture` records `focusBefore` on any button, so a right press hands focus back on close, and its contract comment states that a row can ask for focus."
- **Task 9-3, VERIFY:** gains "*hands focus back after a right press, whose row can ask for focus* reads red with `if (e.button !== 0) return` back."
- **Task 10-1, AFTER:** "`ValueEditor` compares against the text as the document holds it" gains ", and an outside write lands that text".
- **Task 10-1, VERIFY:** gains "*takes an outside write with \r\n as the document holds it, and closes with nothing to save* reads red with `mirrorBody(view, initial)`."
- **Task 10-2, AFTER:** gains "`renderCellContent` loses its export, and its three test files call `renderRestingLine`." `TextCell.tsx`, `table.css`, and `Cell.test.tsx` now sit in this patch, as its prose already claimed.
- ***§Behavior Changes*:** gains three rows, under *§Behavior That Moved* below.
- **Task 11-1:** *Phase 11 — Docs and Issues.patch* exists, written by `lc/fold/save-patches-w2.sh`.

#### Pins

| Task | Pin | Reverted | Red |
|---|---|---|---|
| 2-1 | `formatState.test.ts` *reads the caret line heading level*, `plain\n> # h` over 5 to 11 (S1) | `lineIndexAt(scan, selFrom)` | `expected +0 to be 1`; 1 failed of 10 |
| 3-3 | `listRenumber.test.ts` *taking the item between two blocks counts past both* (E1, case A) | `while` as `if` | 2 failed of 44 with the next |
| 3-3 | `listRenumber.test.ts` *removing the blank below two blocks merges the lists and recounts them* (E1, case B) | `while` as `if` | As above |
| 7-4 | `intents.test.ts` *a wrapped line carries the rail…*, `  > - u\n> \t- r` (S12, E3) | `open \|\| level >= 0` | `expected [] to deeply equal [ Array(2) ]`; 1 failed of 99 |
| 9-3 | `GlancePane.test.tsx` *hands focus back after a right press, whose row can ask for focus* (E2) | `if (e.button !== 0) return` back | `document.activeElement` reads `body`; 1 failed of 49 |
| 10-1 | `TextPane.test.tsx` *takes an outside write with \r\n as the document holds it, and closes with nothing to save* (E4) | `mirrorBody(view, initial)` | `c\n\nd` against `c\nd`; 1 failed of 23 |

#### Behavior That Moved

- **Off a Page, a `> ` Lead (S2, Task 2-1):** on a `lists` or `inline` surface a line opening `> ` no longer counts as a blank lead, so `> ##` writes `§` there as `x ##` does. A page reads the same: a quote's prefix is `leadOf` there, and every caller returns on `isLiteralAt` in code first. `edits.test.ts` and `cellLists.test.tsx` hold.
- **Rails Behind an Indented Quote (S12, Task 7-4):** `  > - u\n> \t- r` drew no rails, and now draws `> - u\n> \t- r`'s two exactly. `  > - a` draws none, as `> - a` does, and `  > - a\n  > - b\n  > \t- c` reads its flush twin. *cached assembly ≡ pure derivation* and the rail cases hold.
- **A Right Press in a Glance (E2, Task 9-3):** it records `focusBefore`, so Select All from a read-only cell hands focus back on close rather than dropping it on `body`.
- **Regressions Closed:** the Heading row's check on a selection starting at a line's end (S1), two adjacent carried blocks recounting (E1), and an outside `\r\n` write doubling its breaks (E4).

#### Phase Heads

| Phase | Head | Comments | Actionable, Cumulative | Tests Cell | Full Suite |
|---|---|---|---|---|---|
| 1 | `98becb14b` | 3,512 | -108 (+687 / -795) | +44 (+212 / -168) | 9,127 passed, 2 skipped (9,129), 549 files |
| 2 | `c85eb6cd2` | 3,515 | -39 (+838 / -877) | +175 (+398 / -223) | 9,140 passed, 2 skipped (9,142), 549 files |
| 3 | `018cb5f4f` | 3,515 | -126 (+1000 / -1126) | +410 (+793 / -383) | 9,170 passed, 2 skipped (9,172), 550 files |
| 4 | `1ea13c25e` | 3,515 | -124 (+1002 / -1126) | +460 (+844 / -384) | 9,177 passed, 2 skipped (9,179), 550 files |
| 5 | `b36d3177b` | 3,511 | -173 (+1040 / -1213) | +522 (+936 / -414) | 9,184 passed, 2 skipped (9,186), 550 files |
| 6 | `e9674162f` | 3,510 | -201 (+1108 / -1309) | +536 (+966 / -430) | 9,185 passed, 2 skipped (9,187), 550 files |
| 7 | `9e657f17e` | 3,509 | -260 (+1153 / -1413) | +580 (+1030 / -450) | 9,191 passed, 2 skipped (9,193), 550 files |
| 8 | `65b3ae617` | 3,509 | -307 (+1172 / -1479) | +634 (+1098 / -464) | 9,196 passed, 2 skipped (9,198), 550 files |
| 9 | `33b84adb6` | 3,507 | -308 (+1385 / -1693) | +738 (+1311 / -573) | 9,204 passed, 2 skipped (9,206), 550 files |
| 10 | `b380728f4` | 3,508 | -286 (+1464 / -1750) | +902 (+1511 / -609) | 9,219 passed, 2 skipped (9,221), 550 files |

Every full run read clean. Typecheck read 0 at each of the 23 commits, and `biome format` reported nothing at each.

**Task Commits:** 1-1 `98becb14b`; 2-1 `a8bc8985e`; 2-2 `c85eb6cd2`; 3-1 `dfce3c801`; 3-2 `fc852d3d7`; 3-3 `018cb5f4f`; 4-1 `1ea13c25e`; 5-1 `b36d3177b`; 6-1 `246f39199`; 6-2 `e9674162f`; 7-1 `79cdcab2c`; 7-2 `3bc63fc17`; 7-3 `0c968d586`; 7-4 `9e657f17e`; 8-1 `65b3ae617`; 9-1 `7c8c20c03`; 9-2 `c38022cbe`; 9-3 `e3833a5c4`; 9-4 `26a384c57`; 9-5 `33b84adb6`; 10-1 `3a7bedaf1`; 10-2 `6e1d42716`; 10-3 `b380728f4`.

**Subjects:** 22 match `lc-w1`. Task 10-1's loses ", and a resting value read and drew its first line alone", which S4 moved to Task 10-2.

#### Calls Taken

- **`Token[]`:** the line arrives at Task 2-1, so S17's type lands there rather than at Task 1-1. Its import opens to eight lines under the formatter, which is most of why Phase 2's row moves by -4 where the report estimated -13.
- **`GlancePane.tsx`:** beyond `:38`, `keepFocus`' comment and the two suppressions restated the absolute, so they reword in place, count unchanged.
- **`renderCellContent`:** private, since `renderRestingLine` and `renderCellBody` read it. *text holding no token is the bare string* reads `container.innerHTML`, since `renderRestingLine` returns a fragment.
- **Phase 1's Pin Table:** the `[^1]:` pin's row cell read 36, the Investigation's row on a cell's list keys, and reads B-11 now.

#### Folded and Not Taken

##### Folded

- **S1:** Task 2-1, pinned.
- **S2:** Task 2-1.
- **S3:** Task 6-1, count unchanged.
- **S4:** Tasks 10-1 and 10-2, so the half-step span never exists.
- **S10, S11, S16:** Task 2-1.
- **S12:** Task 7-4, over E3.
- **S13:** Task 3-3.
- **S14:** Task 9-5.
- **S15:** `linkSettle.of(remembers)` at 1-1, `region` at 2-1 and 3-3, `listDrag`'s `scan` at 7-3. `ValueEditor`'s `scope` below.
- **S17:** the `export`s and `perScope` at 1-1, `Token[]` at 2-1, `renderCellContent` at 10-2.
- **S18:** Task 1-1, with Task 6-1's clause gone.
- **S19:** Tasks 2-2, 3-3, and 9-3. *blockQuery isn't mounted* stays.
- **E1:** Task 3-3, both cases pinned.
- **E2:** Task 9-3.
- **E3:** answered by S12's row.
- **E4:** Task 10-1.
- **E6:** *Phase 11 — Docs and Issues.patch* written.
- **E16's Notes:** *Phase 2 — Notes* reads 5 of 190, *Phase 10 — Notes* names neither `blockGestures` nor `inlineLines`, and *Phase 1 — Notes* reads rows 34 and 35.

##### Not Taken

- **S15's `ValueEditor` `scope`:** inlining the ternary pushes the `editorBase` call to 102 columns, so the formatter opens it to seven lines: +4, where the report estimates -1. The local names the read and keeps the call on one line.

##### Not for This Fold

- **The Plan's:** S5 to S9, S20 to S25, E5, and E7 to E15.
