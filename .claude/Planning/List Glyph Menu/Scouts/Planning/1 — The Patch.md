### 1 — The Patch — Planning Report

**BASE:** `cd813afdd` · **PATCH:** `1 — The Patch.patch`

Built in a detached worktree at `cd813afdd` (`~/The Studio/Projects/Pommora-LGM-A`, since removed). Every "→" below is observed through `vite-node` against the patched modules unless marked **Inferred**. "patched" cites name the hunk by its function.

#### What Was Built

P1-B1. `Core/MarkdownPM/Engine/listDragModel.ts`: the one walk by drawn depth. `rolesAgainst(scan, i)` classifies every line against the item on line `i` as `'sibling' | 'nested' | 'blank' | 'outside'` by quote depth and level (patched, `rolesAgainst`); `siblingsAt(scan, i)` returns the group's items and the last line its nesting reaches (patched, `siblingsAt`); `subBlockAt` keeps only its math rule and reads the same roles (patched, `subBlockAt`); `renumberRuns` takes a `DocScan`, counts each run once by line, and `runAt` slices the contiguous same-kind siblings out of `siblingsAt` (patched, `renumberRuns`/`runAt`/`renumberRun`). `dropChanges` scans the moved document once at commit. Serves B-5, B-6, B-11, A-10, D-2.

P1-B2. `Core/MarkdownPM/Input/listRenumber.ts`: `Relist = 'count' | 'restart'` with one `RELIST` record mapping each to its user event (`input.list`, `input.list.restart`); a run holding a line the restart edit wrote counts from 1 or A (patched, `renumberRun`'s `start`). The 1-T10 gate also pushes the run below when a changed line's *old* marker was sequenced, read from the start state's cached scan (patched, `listRenumber`). Serves B-9, B-10. `Input/edits.ts`' Enter, Tab, and Shift+Tab say `'count'`.

P1-B3. `Core/MarkdownPM/Input/format.ts`: `setList(scan, from, to, kind, settings, scope)` is the only list-type writer. `listReach` addresses it: a caret takes its item's group (setting on → siblings of the clicked item's drawn type; off → every marker from the first sibling through the group's nesting), a range takes every item it touches plus its plain lines, a continuation answers for its item, and sealed lines and callout heads are skipped on a page. One write rule: an item is rewritten when `isSequenced(lm) || drawnKind(lm) !== kind`, a plain line becomes an item through the extracted `readLine`. `listKindOf` folds `drawnKind` over the same reach (A-3, C-4). `editFor` takes `settings` and `scope`; `splitPrefix` takes the scope and returns no prefix off the page (C-5). Serves A-3, B-1–B-4, B-7, B-8, B-12, C-1, C-3, C-5, D-1, D-2.

P1-B4. `Core/MarkdownPM/Engine/intents.ts`: `drawnKind(lm)` beside `listGlyphOf`, so a `+` item is Arrowed and a glyph-less `- []` has no type, with the glyph comment rewritten in place to name it (B-13, A-9).

P1-B5. `Core/MarkdownPM/Menus/gripMenu.ts`: `gripMenu(scope)`; the right-press suppression covers `.md-list-glyph`; `contextmenu` asks the glyph after the `readOnly` return and before the grip band (A-5, A-6, A-9); `popGlyphMenu` pops `{ kind: 'glyph', current }` through `host.menus.grip`, reads the click range from `clickRange`, and stands down if the document changed while the menu was open. The grip's list rows reply `list:<kind>` and run `editFor` over the block through `applyEdit`, as its heading rows already do (D-1). `surface.ts` passes the scope.

P1-B6. `Core/MarkdownPM/Menus/menu.ts`: `clickRange(view, at)` hoists the existing click-time read (`menu.ts:33-36`) for both menus; `applyEditorAction(view, action, scope = 'page', range?)` reads the host's settings; `editorMenu`'s reply runs list rows over the click-time range with a document-identity guard and every other row over the live selection (C-2, C-6). The comment at `:32` is rewritten in place to carry the exception.

P1-B7. `Core/MarkdownPM/Tables/cellStatic.tsx`: `restingMenu` recognizes a resting glyph as `.md-list-item > [data-src]`, prevents the default, pops the glyph context, and hands the pick to `restingAction` (A-8); `restingRange` takes the offset instead of the point, so the glyph passes its line start; `restingAction` and the format request read `host.settings()` and the `'cell'` scope (C-5).

P1-B8. `Core/Actions/gripMenu.ts`: a `'glyph'` arm on `GripMenuContext`; `listRows(current)` builds the five rows once for Type ▸ and the flat menu (A-2); `listKind:` folds into `list:`; Delete is offered by one ternary over the union.

P1-B9. `Core/MarkdownPM/Input/formatState.ts`: `readFormatState(scan, from, to, settings = {}, scope = 'page')` reads `list` through `listKindOf`; the heading read takes the scope.

P1-B10. The setting: `preserveListLevels: flag(true)` (`Core/Settings/personalization.ts`), a caption-less toggle under Outliner Lines (`Core/Settings/frames.ts`), and an `EDITOR_SETTING_KEYS` entry (`Core/MarkdownPM/api.ts`) (E-1, E-2). The stored key is proposed as `preserveListLevels`, verb-first like `repairOnOpen` and `hideChevrons`.

P1-B11. Docs: one sentence of `.claude/Features/MarkdownPM.md:24` rewritten, a clause at `:105`, "a list glyph" added to `:146`. That's three touches against the one-to-two-sentence cap: `:146` corrects a list that would otherwise leave out the glyph's `preventDefault`, but `:105` is new prose, and you can strike it; the settings row in `.claude/Features/ConfigurationPM.md:151`; `.claude/Guidelines/Editor-Internals.md:40` drops the grip's self-counting clause and names the restart event and the one walk; `.claude/IssuesPM.md`'s I-037 counts, site list, and footnote updated (P1-Q6).

#### What Was Removed

P1-X1. `setListKind` and its per-level counters: the grip calls the one switch — `Core/MarkdownPM/Input/format.ts:339-352`
P1-X2. `listMarkerLines`: addressing reads `scan.markers` — `format.ts:316-328`
P1-X3. `setList`'s toggle-off: C-3 — `format.ts:302`
P1-X4. `SelectedLine.kind`: its only reader was the toggle — `format.ts:266`, `:290`
P1-X5. `listMarkerText`'s `n` parameter: only the counters passed one — `format.ts:222`
P1-X6. The grip's raw `userEvent: 'input'` dispatch that bypassed the renumber — `Core/MarkdownPM/Menus/gripMenu.ts:164-166`
P1-X7. `listKind:${ListKind}` and its row builder copy — `Core/Actions/gripMenu.ts:20`, `:68-78`
P1-X8. `nestedUnder`: no reader after the hoist — `Core/MarkdownPM/Engine/detect.ts:564-565`
P1-X9. `renumberRun`'s indent-string walk (both directions) and `renumberRuns`' `seen` change filter, which runs-counted-once replaces — `Core/MarkdownPM/Engine/listDragModel.ts:153-156`, `:165-196`
P1-X10. `subBlockAt`'s private line classification — `listDragModel.ts:43-51`
P1-X11. `readFormatState`'s single-line list read — `Core/MarkdownPM/Input/formatState.ts:19-21`, `:37`

#### Gates

P1-G1. `npm run typecheck`: passes (all six projects plus the dashboard).
P1-G2. `npm run test`: 549 files, 9,110 passed, 2 skipped, exit 0 (baseline 549 files, 9,109 passed; the one added test is P1-T7).
P1-G3. `npm run lint`: 1,433 files, no errors, warnings, or fixes.

#### Tests Changed

P1-T1. `'re-applying the same kind clears it'` → `'re-applying the kind an item already has changes nothing'` (C-3) — `Core/MarkdownPM/Input/format.test.ts:165-167`
P1-T2. `'clears only where every line already reads that way'` → `'leaves the items already of the kind and makes the plain lines items'`; the mixed half keeps its expectation (C-3, B-7) — `format.test.ts:186-191`
P1-T3. The `setListKind` describe becomes `'setList over a whole block'` with all six expectations unchanged, `'repairs a broken ordered sequence'` included, since B-9 keeps it and 1-D4's deletion no longer applies — `format.test.ts:234-264`
P1-T4. `setList` and `listKindOf` take a scan (mechanical) — `format.test.ts:158-232`, `Core/MarkdownPM/regressionPins.test.ts:175`, `Core/MarkdownPM/Input/listRenumber.test.ts:95`; `renumberRuns` takes a scan — `regressionPins.test.ts:183`, `Core/MarkdownPM/Engine/listDragModel.test.ts:170`, `:174`
P1-T5. `'a run that began past 1 keeps its base'` (`5. a\nb` → `5. a\n6. b`) → `'a list-type pick restarts the run it joins from 1'` (→ `1. a\n2. b`), by B-9's literal reading; see P1-Q1 — `listRenumber.test.ts:105-107`
P1-T6. `'a nested line continues its own level'`: the input gains a blank line (`1. a\n  1. b\n\n  c`), because the original `  c` sits directly under `  1. b`, which 1-A1 makes b's continuation; the behavior pinned (an indented plain line becomes an item at its level and joins that run) still holds. See P1-Q2 — `listRenumber.test.ts:111-113`
P1-T7. Added, 1-D8: `'switching a numbered item out of its run recounts the run below'` (`- p\n\t1. a\n\t2. b\n\t3. c`, b selected → Bulleted → `\t1. c`), placed in the "run it left" describe beside the Shift+Tab pins rather than in the Enter describe at `:82-84` — `listRenumber.test.ts:73-75`
P1-T8. `relist: true` → `'count'` (the union) — `listRenumber.test.ts:130`, `:136`; `regressionPins.test.ts:133`, `:156`
P1-T9. `listKind:` → `list:` — `Core/MarkdownPM/Menus/gripMenuFlow.test.tsx:83`, `:91`, `:94`, `:189`; `Core/Actions/gripMenu.test.ts:54-58`
P1-T10. The bare view in the fenced-line chord test gains `editorHost.of(testHost())`, as every mounted editor has; `applyEditorAction` now reads the host's settings — `Core/MarkdownPM/Input/formatKeymap.test.ts:38-44`
P1-T11. `'enters with the caret in the slot Bold writes at a point on a list glyph'` pinned the format menu answering a resting glyph; A-1/A-8 give the glyph its type menu, so it becomes `'answers a list glyph with its type menu and commits the pick at rest'` (`- ab`, pick Numbered → `1. ab`, still resting, default prevented) — `Core/MarkdownPM/Tables/cellRestingMenu.test.tsx:262-268`
P1-T12. Proposed, not added: (a) the setting's two reaches on the *§Decisions* example (B-1 on → B and E; off → B, C, D, E), since the feature's core behavior is otherwise unpinned; (b) the glyph context's five flat rows without Delete beside `Core/Actions/gripMenu.test.ts:51-60` (A-2), matching that file's one pin per context; (c) tab-and-space siblings numbering as one run (B-5), the one numbering change the patch makes. A glyph twin of the grip's right-press suppression pin (`gripMenuFlow.test.tsx:172-185`) isn't worth adding: the live drives cover it.

#### What Contradicts the Decisions

P1-C1. Decision B-9 (mechanism): the existing "an arrived line never sets a top-level base" rule can't produce "from 1 or A" on its own. The grip's block stops at a blank line (`Engine/blockModel.ts:139-145`) while a run spans it, so `1. a\n2. b\n\n3. c` re-picked Numbered from block one's grip would have read 3, 4, 5 (c is settled at 3); the same shape hits a pick that joins an unreached sibling (`- B\n3. X\n- E` → B Numbered). The patch adds the `'restart'` signal (P1-B2), which gives `1. a\n2. b\n\n3. c` and `1. B\n2. X\n3. E`. This is a small new concept, the union and one record entry.

P1-C2. Decision B-9 (reach): read literally, any pick that writes into a run restarts it, including Lists ▸ joining a plain line below a run that begins at 5 (`5. a\nb` → `1. a\n2. b`, today `5. a\n6. b`) and a selection over one item of `5. a\n- b\n7. c` (→ `1. a\n2. b\n3. c`). Fresh-Eyes 13 asked "restart at 1 or keep 3" about re-picking an existing run, not about extending one (P1-Q1).

P1-C3. Decision B-7 against 1-A1's continuation rule: an indented non-marker line under an item draws no glyph, so it looks like a plain line, but 1-A1 makes it the item's continuation (as the drag and `blockAt` already do). Under it, neither a caret nor a selection on `  c` in `1. a\n  1. b\n  c` turns `c` into an item, which `listRenumber.test.ts:111-113` pinned (P1-T6, P1-Q2).

P1-C4. Decision D-1 with the range rule: the grip's block can start on an indented paragraph (`Engine/blockModel.ts:44-59`), and the block range now turns it into an item: `  lead\n- a` → Numbered → `  1. lead\n1. a`, where `setListKind` skipped it (P1-Q3).

P1-C5. Decision B-5 and the level cap: drawn depth caps at level 3, so `\t\t\t- b\n\t\t\t\t- c\n\t\t\t- d` are three siblings for numbering (`1. 2. 3.`), the switch, and the drag (b's branch is b alone, as `subBlockAt` already read it). The Fresh-Eyes "Drag Branch Past Level 3" prospect dissolves rather than being fixed: the drag already agreed with the drawing, and now numbering does too.

P1-C6. The estimates: production lands at +139 against +27 (P1-Net).

#### Edge Cases Verified

P1-E1. *§Decisions* example, B on → `\t1. B … \t2. E`, C and D unchanged; off → `\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E`; E on → same as B (B-1, B-3).
P1-E2. E numbered, B → Arrowed (on) → B alone becomes `→ B` (B-1).
P1-E3. `- A\n\t- B\n\t3. X\n\t- E`, B Numbered (on) → `1. B / 2. X / 3. E`; top-level `- B\n3. X\n- E` → `1. 2. 3.`; Alphabetical → `A. B / 3. X / A. E` (B-4, Fresh-Eyes 16).
P1-E4. `- A\n\t- B\n- F\n\t- G`, B Numbered (off) → G unchanged (B-2).
P1-E5. `- a\n\t- x\n  - y`, x Numbered → `\t1. x\n  2. y`; the renumber alone on `- p\n\t1. x\n  1. y` → `  2. y` (B-5).
P1-E6. `- a\n\n- b\n- c`, a Numbered → `1. a\n\n2. b\n3. c`; nested `- A\n\t- B\n\n\t- E` → `\t1. B\n\n\t2. E` (B-6, B-11).
P1-E7. A paragraph or heading between items ends the group; an indented list under a paragraph is its own group (B-11).
P1-E8. A selection over B through E with numbered C and D → all four Checklist; a selection over `plain\n- b\n1. c` → three checklist items (B-7).
P1-E9. `- a\n- b`, Bulleted (on) → unchanged; `- a\n\t1. x\n- b`, Bulleted (off) → x becomes `- x` (B-8).
P1-E10. `1. a\n1. b\n1. c` and `3. a\n4. b\n7. c` re-picked Numbered → `1. 2. 3.` (B-9). A re-pick over an already correct `1. a\n2. b` writes placeholders that the renumber restores, so the transaction changes nothing visible but still takes an undo step.
P1-E11. `1. a\n2. b\n3. c`, b selected → Bulleted → `1. a\n- b\n3. c`; nested → `\t1. a\n\t- b\n\t1. c` (B-10, 1-T10).
P1-E12. `- [x] a\n- [ ] b`, Checklist (off) → unchanged (B-12).
P1-E13. `+ a\n→ b`: Arrowed → unchanged; Bulleted → `- a\n- b`; the check reads `arrow`; `+ a\n→ b\n- c` with a picked Bulleted → all three bullets (B-13).
P1-E14. `- [] a`, Bulleted → `- a` (A-9: no glyph, no type, so every pick rewrites it).
P1-E15. `> - a\n> - b` → `> 1. a\n> 2. b`; `> - a\n>\n> - b` → b unchanged; a callout body numbers inside the box; a range over a callout head leaves the head (A-10, 1-E2).
P1-E16. Cell scope, `> a` → `- > a`; page scope, `> a` → `> - a` (C-5).
P1-E17. `- a\n  wrapped\n- b`: a caret on `wrapped` or a range over all three → `1. a\n  wrapped\n2. b` (1-T9 closed).
P1-E18. `- a\n  ```\n  - b\n  ```\n- c` over the block → `- b` inside the fence untouched (1-T8 closed).
P1-E19. **Heading ▸ Paragraph** (`setHeading` level 0): `- item` → `item`, `1. a` → `a`; a nested `- a\n\t- b` with the caret on b → `- a\nb`, dropping the indent (C-3 holds; the dropped indent is `setHeading`'s, see P1-Q5).
P1-E20. A-3: with the setting on, the check is always the clicked item's type (Fresh-Eyes 6); off, `- B` over a mixed `1. C` → no row checked.
P1-E21. Enter on `5. a` still writes `6.` (typing keeps the base).
P1-E22. **Inferred:** a glyph counts as inside a selection by its marker's position, so a selection covering an item's text but not its marker addresses the glyph's group, not the selection.

#### Open Calls for Nathan

P1-Q1. **Should converting a line under a list that starts at 5 restart it at 1?** B-9 says a list-type pick recounts every run it reaches from 1. Taken literally, that also covers turning the line under `5. a` into an item (`5. a` and `b` → `1. a`, `2. b`; today it's `5.` and `6.`), and selecting one bullet in `5. a`, `- b`, `7. c` and numbering it. The patch builds the literal reading. **Recommended:** restart only a run in which the pick rewrote an item that was already numbered or lettered (a re-pick, which is B-9's repair case), so a plain line or a bullet joining a run keeps its base. The renumber already reads the old markers for the 1-T10 gate, so this is about +3 lines. "Restart only runs the pick reached in full" doesn't work, because it brings back P1-C1's loose-list 3, 4, 5. The trade: the recommendation keeps the base both when a line joins a run (`5. a` plus a line → 5, 6) and when top-level bullets around a numbered sibling are numbered (`- B\n3. X\n- E` → 3, 4, 5, where the built reading gives P1-E3's 1, 2, 3). Loose-list and gapped re-picks restart under both readings, and nested runs always count from 1. Say which you meant.

P1-Q2. **Can an indented line under an item become its own item from the menu?** A line indented under an item draws no glyph, but the editor already treats it as part of that item: the drag moves it along and the grip counts it in the block. The patch follows that, so right-clicking or selecting it changes its owner rather than making it an item, and the only way to make it an item is typing a marker. **Recommended:** keep it, since every other layer already reads the line this way, and record that Lists ▸ no longer converts such a line.

P1-Q3. **Should the grip's Type ▸ turn a block's leading indented paragraph into an item?** A list block can start on an indented paragraph line, and the grip's whole-block switch now makes that line an item (`  lead` → `  1. lead`), where today it skips it. **Recommended:** accept it. It only happens on a malformed list, and a grip that skips a line it drew a grip for would be its own rule.

P1-Q4. **Where should the renumber stop inside a fenced code block inside a list?** Numbering walks through an indented code fence inside a list, so `\t2. y` inside the fence counts as a sibling and gets renumbered. That's true today too (the indent-text walk does the same), and the switch already skips those lines. **Recommended:** record it as an issue. The fix is for `rolesAgainst` to treat a sealed line as nested on a page, and the walk would need the scope for that, which belongs with I-037.

P1-Q5. **Heading ▸ Paragraph drops a nested item's indent** (`\t- b` → `b`). C-3 relies on this path as the way back to plain lines. **Recommended:** record it against `setHeading` rather than fixing it here. A paragraph can't keep a list indent without becoming a code block or a continuation, so dropping it is arguably right.

P1-Q6. **I-037 grows.** Threading the scope (C-5) adds three scope comparisons (`splitPrefix`, `listReach` ×2) and five `= 'page'` defaults (`editFor`, `setList`, `listKindOf`, `readFormatState`, `applyEditorAction`). The defaults follow `edits.ts`' pattern, and only tests and the scope-blind keymap and `/` callers rely on them. The I-037 entry is updated to 24 and 18. **Recommended:** accept, since I-037's own solution removes every default at once.

P1-Q7. **The entry-side stale guard is stricter than the grip's.** The glyph menu and the list rows of the right-click menu stand down if the document changed at all while the native menu was open, where the grip re-finds its block and compares its text. **Recommended:** keep the identity check. A carried range is invalid after any change, and the grip's re-find has no equivalent for a group.

P1-Q8. **One placement note, no new file:** the walk lives in `Engine/listDragModel.ts`, which is now the list model (siblings, branches, runs, moves), not only the drag's. Renaming it to `listModel.ts` would make it easier to find. It's a rename, so it's yours to approve.

#### Comment Ledger

P1-L1. Removed: `listMarkerLines`' doc — `Core/MarkdownPM/Input/format.ts:316`
P1-L2. Removed: `setListKind`'s doc — `format.ts:339`
P1-L3. Rewritten in place: `setList`'s doc now states the write rule — `format.ts:298` (patched, `setList`)
P1-L4. Rewritten in place: the caret-placement note — `format.ts:310` (patched, `setList`)
P1-L5. Added: `listReach`'s doc, the addressing rule (patched, `listReach`)
P1-L6. Moved: the item-indent note into `readLine` — `format.ts:279` (patched, `readLine`)
P1-L7. Rewritten in place: the glyph comment names `drawnKind` and the `+` rule — `Core/MarkdownPM/Engine/intents.ts:121`
P1-L8. Added: `siblingsAt`'s doc, carrying the blank and quote rules split out of `renumberRun`'s comment (patched, `siblingsAt`)
P1-L9. Rewritten in place: `renumberRun`'s comment keeps only the base rule — `Core/MarkdownPM/Engine/listDragModel.ts:167`
P1-L10. Rewritten in place: `renumberRuns`' doc gains the restart clause — `listDragModel.ts:147`
P1-L11. Moved: the continuation note into `rolesAgainst` — `listDragModel.ts:48`
P1-L12. Rewritten in place: the relist event doc becomes `Relist`'s — `Core/MarkdownPM/Input/listRenumber.ts:8`
P1-L13. Rewritten in place: the renumber header names the old-marker gate — `listRenumber.ts:13`
P1-L14. Rewritten in place: the right-press comment covers the glyph and the cell order — `Core/MarkdownPM/Menus/gripMenu.ts:121`
P1-L15. Re-indented, unchanged: the two action-chain comments — `gripMenu.ts:154`, `:168`
P1-L16. Rewritten in place: `applyEditorAction`'s doc — `Core/MarkdownPM/Menus/menu.ts:14`
P1-L17. Rewritten in place: the click-time comment carries the list-row exception — `menu.ts:32`
P1-L18. Rewritten in place: the heading-state comment — `Core/MarkdownPM/Input/formatState.ts:19`
P1-L19. Rewritten in place: the resting cell's toggle comment covers the type menu — `Core/MarkdownPM/Tables/cellStatic.tsx:479`

Net: two removed (P1-L1, P1-L2) and two added (P1-L5, P1-L8), so the count stays the same; 18 comment lines out and 18 in across the diff.

#### Net

Production code **+139 (+406 / −267)**, comment lines flat, whitespace-only re-indentation of `gripMenu`'s handlers excluded by `-w` (+351 / −212). Tests **+24 (+74 / −50)**. Docs **+1 (+11 / −10)**.

Against the estimates (+27 in all):
- **Setting:** +3, against +8.
- **Write side** (`format.ts` +39, `listDragModel.ts` +21, `listRenumber.ts` +8, `edits.ts` +7 of which +6 is Biome splitting Enter's return once `'count'` lengthened it, `intents.ts` +6, `formatState.ts` +1, `detect.ts` −3): +79, against +10.
- **Entry side** (`gripMenu.ts` +29, `menu.ts` +15, `cellStatic.tsx` +12, `Actions/gripMenu.ts` +1): +57, against +9.

The increase buys:
- The restart signal B-9 needs (P1-C1).
- The old-marker gate (1-T10).
- The click-time range and stale guard for list rows (C-2).
- Scope through five signatures (C-5).
- The resting glyph menu (A-8).
- `drawnKind` (B-13).
- Continuation, sealed-line, and callout-head handling, which close 1-T8 and 1-T9.

It removes a second writer, a second numbering rule, a second row builder, a second action name, the indent-text sibling test, and `subBlockAt`'s private classification. The estimates counted signatures at one line each, and Biome wraps most of them.
