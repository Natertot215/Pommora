### 6 — Phases — Planning Report

**BASE:** `cd813afdd` · **FINAL:** `Phases/Final.patch`

The final change was assembled in a detached worktree at `cd813afdd` (`~/The Studio/Projects/Pommora-LGM-F`, since removed) from the floor (patch 3), K1–K4 (patch 4), C-7 (patch 5), and the drive prototype (patch 2), with the Investigation's Open Calls V-60 to V-67 taken as recommended and the seams in *§Seams Resolved* folded in. It was gated green whole, then rebuilt from base phase by phase, each phase checkpointed with `git add -A && git write-tree` (no commit, so no hook ran). Every phase patch is `git diff -M <previous tree> <this tree>`, and the six patches replay onto `cd813afdd` to exactly the final tree (`19b0a1d87`). **Production** below means `Core`, `Desktop`, `UIX`, and `Sync` minus `*.test.*`, which is exactly what `Final.patch` holds; **tests** are `*.test.*`; **docs** are `.claude/**/*.md`; the drive is counted on its own. Gates are `npm run typecheck`, `npm run test`, and `npm run lint` from the worktree root. No app was launched.

#### The Phases

P6-1. **Phase 0 — Drives:** `.claude/scripts/List Types Drive/live-drive.mjs` (new), `.claude/scripts/drive-harness.mjs` (the one-line `checked` record in `rowsOf`), `.claude/scripts/README.md` (the drive's paragraph). Delivers the approved drive (P2-W1, P2-W3) with every case Report 2's *§The Case List* names, P2-K1 to P2-K22, in five groups, each item tagged with its owning phase and printing `AWAIT` while `POMMORA_LGM_LANDED` (default 0) is below it, in Path Links' `item(group, phase, decision, …)` shape. **Gates:** typecheck exit 0; 549 files, 9,109 passed, 2 skipped; lint 1,433 files, no fixes, both scans pass. **Net:** production 0, tests 0, docs +12 (+12 / −0), drive +264 (+265 / −1).

P6-2. **Phase 1a — The Rename:** `Core/MarkdownPM/Engine/listDragModel.ts` → `listModel.ts` (100% similarity) and its test (99%, its import line), with the six importers: `Citations/citationEdits.ts`, `Gestures/blockDrag.ts`, `Gestures/listDrag.ts`, `Input/listRenumber.ts`, `Tables/cellStatic.tsx`, `Core/Pages/pageEditor.ts`, and `regressionPins.test.ts`. Delivers the approved placement (V-44). **Gates:** typecheck exit 0; 549 files, 9,109 passed, 2 skipped; lint 1,433, no fixes. **Net:** production 0 (+6 / −6), tests 0 (+2 / −2), docs 0.

P6-3. **Phase 1b — The List Model:** `Engine/listModel.ts`, `Engine/detect.ts`, `Engine/blockModel.ts`, `Engine/intents.ts` (the rail pass only), `Gestures/listDrag.ts`, `Input/listRenumber.ts`. Delivers the one walk by quote depth and drawn level (B-5, B-6, B-11, V-22) with K4's indented quote (B-15, V-48), K2's `itemAt` (V-46) and C-7's `readsFrom` read rule (C-7, V-48a) with its outside reader named (P6-S2), `nestedUnder` removed for `continuesList`, the renumber's old-marker gate (B-10), the re-pick restart (B-9), the no-op re-pick line (V-61), and K1's rails with the guard and the narrower `[^ \t]` class (B-16, V-45), plus four pins (P6-T1 to P6-T4). The base `format.ts` and grip still write lists, unchanged, so the phase stands on today's writers. **Gates:** typecheck exit 0; 549 files, 9,113 passed, 2 skipped; lint 1,433, no fixes. **Net:** production +76 (+171 / −95; no whitespace-only lines), tests +19 (+49 / −30), docs 0.

P6-4. **Phase 2 — One Switch:** `Input/format.ts`, `Input/formatState.ts`, `Input/edits.ts` (the `blockPrefix` export), `Engine/intents.ts` (`drawnKind`), `Input/listRenumber.ts` (the `RELIST` doc), `Menus/gripMenu.ts` (the `gripMenu(scope)` factory; Type ▸ through `editFor` and `applyEdit`), `Menus/menu.ts` (`applyEditorAction`'s scope and settings; `editorMenu` reads the check through the settings), `Tables/cellStatic.tsx` (the new `editFor` and `readFormatState` arguments), `Core/Actions/gripMenu.ts` (`listKind:` folded into `list:`), `api.ts` (the editor key), `surface.ts` (`gripMenu(scope)`), `Core/Settings/personalization.ts` (`preserveListLevels: flag(true)`). Delivers `setList` as the one switch addressed by `listReach` (B-1 to B-4, B-7, B-8, B-12, B-14, C-1, C-3, D-1, D-2, D-3), `setListKind`, `listMarkerLines`, the toggle-off, `listMarkerText`'s `n`, and `SelectedLine.kind` removed (V-21), `drawnKind` (B-13, V-25), the check over the reach (A-3, C-4, V-26), `splitPrefix` through `blockPrefix` (C-5, V-28), the setting's default and key (E-1, E-4), and every caller moved, plus three pins (P6-T5 to P6-T7). **Gates:** typecheck exit 0; 549 files, 9,116 passed, 2 skipped; lint 1,433, no fixes. **Net:** production +63 (+230 / −167, of which 58 / 58 are whitespace-only, 53 / 53 of them `gripMenu.ts`'s factory re-indent), tests +31 (+93 / −62), docs 0.

P6-5. **Phase 3 — The Glyph Menu:** `Core/Actions/gripMenu.ts` (the `'glyph'` context, `listRows`, no Delete on a glyph), `Menus/menu.ts` (the live glyph branch, the click-time range and document guard for list rows, `applyEditorAction`'s range), `Menus/gripMenu.ts` (`glyphAt` in the right-press suppression), `Tables/cellStatic.tsx` (one resting menu flow answering a glyph, `restingRange` taking a caret position, K3's checkbox through `srcOf`), `Core/Settings/frames.ts` (the caption-less row under Outliner Lines). Delivers A-1, A-2, A-4, A-5, A-6, A-8, A-9, C-2, E-2, V-27, V-29, V-47, V-64. **Gates:** typecheck exit 0; 549 files, 9,116 passed, 2 skipped; lint 1,433, no fixes. **Net:** production +21 (+71 / −50, of which 12 / 12 are whitespace-only, the two menu ternaries), tests +10 (+15 / −5), docs 0.

P6-6. **Phase 4 — Docs and Issues:** `.claude/Features/MarkdownPM.md` (the Lists bullet's last sentence rewritten as one sentence; "a list glyph" joins the right-press list at the context-menu paragraph), `.claude/Features/ConfigurationPM.md` (the settings row), `.claude/Guidelines/Editor-Internals.md` (the list-numbering bullet rewritten in place to state the one rule: the re-pick restart, the no-op re-pick, the one walk and the rails' line rule, `readsFrom`'s code-block read; and the cell-model bullet's `listDragModel.ts` sentence rewritten to name `listModel.ts` and `itemAt`), `.claude/IssuesPM.md` (I-037 recounted, I-017 narrowed, I-072 added, `index-issues.py` run, totals 71 → 72 and Low 37 → 38). **Gates:** typecheck exit 0; 549 files, 9,116 passed, 2 skipped; lint 1,433, no fixes. **Net:** production 0, tests 0, docs +17 (+35 / −18).

#### New Tests and Their Red Runs

Each test was run twice red: once with its phase's production files checked out from the previous tree, and once with only the lines of its own fix reverted, since a phase revert that changes a signature fails on the call rather than the behavior.

P6-T1. **`'switching a numbered item out of its run recounts the run below'`, Phase 1b, `Core/MarkdownPM/Input/listRenumber.test.ts`:** pins B-10's old-marker gate, `- p\n\t1. a\n\t2. b\n\t3. c` with `b` bulleted → `\t1. c`. Written against today's `setList(doc, from, to, kind)`, so Phase 1b's own writers reach it; Phase 2 moves it onto the new signature. **Phase reverted:** `expected '- p\n\t1. a\n\t- b\n\t3. c'`. **Gate line alone removed** (`sequenced = true` in the `was` loop): the same, and only this test fails in the file.

P6-T2. **`'counts past a code block nested in the list, and never counts the code'`, Phase 1b, `listRenumber.test.ts`:** pins K2 and C-7 together on V-31's shape, Enter after `\t1. x` in `- p\n\t1. x\n\t```\n\t1. y\n\t```\n\t1. z` → `\t2. ` inserted, `y` untouched in the fence, `z` counted to `3.` (V-41's C-7 result, not K2-alone's `1. z`). **Phase reverted:** fails past the fence, where base stops counting and leaves `z` at `1.` (V-10). **`readsFrom` forced open** (the floor without K2 and C-7): `expected '… \t```\n\t3. y …'`, counting into the code; the base math pin `'a list-writing edit inside display math counts nothing'` fails beside it (`2. b`).

P6-T3. **`'a pick over a numbered item restarts its run from 1, past the items it missed'`, Phase 1b, `listRenumber.test.ts`:** pins B-9's re-pick restart, Lists ▸ Numbered over `5. a` and `- b` in `5. a\n- b\n\n7. c` → `1. a\n2. b\n\n3. c`. **Phase reverted:** `expected '7. a\n8. b\n\n9. c'`. **`repicked` stubbed:** the same, and it's the only test of 1,988 in MarkdownPM that fails (P3-S1 held). See P6-S9 for why its text differs from P3-T8's.

P6-T4. **`'counts past a quote indented under an item, which rides that item'`, Phase 1b, `Core/MarkdownPM/regressionPins.test.ts`:** pins K4, `renumberRuns` on `1. a\n  > q\n1. b` → `[{ from: 11, to: 12, insert: '2' }]`. **Phase reverted:** fails on the call (`at.flatMap is not a function`, base `renumberRuns` taking a string); base numbering itself carried the quote (V-48), so the behavior this pins is the floor's regression. **K4 alone reverted** (`own < depth` back to `own !== depth`): `expected [] to deeply equal [ { from: 11, to: 12, insert: '2' } ]`, the only failure of 1,988.

P6-T5. **`'with Preserve List-Level Formatting on, reaches the group's items of its type'`, Phase 2, `Core/MarkdownPM/Input/format.test.ts`:** pins B-1 on the *§Decisions* example, a caret on B with `{ preserveListLevels: true }`, Numbered → `- A\n\t1. B\n\t\t- C\n\t\t- D\n\t2. E\n- F`. **Phase reverted:** `TypeError: doc.lastIndexOf is not a function` (base `setList` takes a string). **Setting read inverted** in `listReach`: `expected '- A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2.…'`.

P6-T6. **`'off, reaches the group and everything nested under it'`, Phase 2, `format.test.ts`:** pins B-1 off and B-3, a caret on E with `{ preserveListLevels: false }` → `- A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n- F`. **Phase reverted:** the same `TypeError`. **Setting read inverted:** `expected '- A\n\t1. B\n\t\t- C\n\t\t- D\n\t2. E…'`.

P6-T7. **`'a pick inside a code block switches its own list and leaves the list around it'`, Phase 2, `listRenumber.test.ts`:** pins C-7's pick, a caret on `y` in `- p\n\t1. x\n\t```\n\t- y\n\t- y2\n\t```\n\t1. z`, Numbered → `\t1. y\n\t2. y2` with `x` and `z` unchanged. **Phase reverted:** the same `TypeError`. **`listReach` reading from outside every block** (the floor with K2): `expected '… \t```\n\t- y\n\t- y2 …'`, the pick reaching nothing.

#### Tests Changed

P6-C1. **`listModel.test.ts` import, Phase 1a:** `'./listDragModel'` → `'./listModel'` (the approved rename).

P6-C2. **`'a non-list line between siblings breaks the run (caps on both sides of the gap)'` → `'a wrapped line carries the rail and a line outside the list ends it, so a later indented item draws no ancestor rail'`, Phase 1b, `Core/MarkdownPM/Engine/intents.test.ts`:** pinned two caps around `prose` with the ancestors left standing (I-017's bug) → B-16 and K1: `- A\n  wrapped\n\t- B\nprose\n\t- C` draws `[0,0,null],[4,0,null],[14,0,'elbow']`. With Phase 1b reverted it reads `[[14,0,'elbow'], …]`.

P6-C3. **`'a list-writing edit inside a code block counts nothing'` → `'… counts within the block'`, Phase 1b, `listRenumber.test.ts`:** pinned ```` ```\n1. a\n5. b\n``` ```` → C-7 (V-41a, V-48a): `2. b`. With Phase 1b reverted it reads `5. b`.

P6-C4. **Mechanical, Phase 1b:** `subBlockAt`, `dropChanges`, and `renumberRuns` take the scope and a scan, 22 lines in `listModel.test.ts` and one in `regressionPins.test.ts` (K2, P3-T4). No expectation moves.

P6-C5. **`'re-applying the same kind clears it'` → `'re-applying the kind an item already has changes nothing'`, Phase 2, `format.test.ts`:** pinned the toggle-off (`- item` → `item`) → C-3 and B-8 (`- item` unchanged).

P6-C6. **`'clears only where every line already reads that way'` → `'leaves the items already of the kind and makes the plain lines items'`, Phase 2, `format.test.ts`:** pinned `- one\n- two` → `one\ntwo` → C-3 and B-7 (unchanged); the mixed half keeps its expectation.

P6-C7. **The `setListKind` describe → `'setList over a whole block'`, Phase 2, `format.test.ts`:** pinned the grip's private writer and its per-level counters → D-2 and B-9 through the one switch; all six expectations hold unchanged, the per-level numbering now coming from the renumber.

P6-C8. **`'a nested line continues its own level'`, Phase 2, `listRenumber.test.ts`:** pinned `1. a\n  1. b\n  c` with `c` listed → `  2. c` → B-14 makes `  c` directly under `  1. b` its continuation, so the input gains a blank line (`1. a\n  1. b\n\n  c` → `  2. c`) and still pins a nested plain line joining its level's run.

P6-C9. **`listKind:` → `list:`, Phase 2, `Core/Actions/gripMenu.test.ts` and `Core/MarkdownPM/Menus/gripMenuFlow.test.tsx`:** pinned the grip's own action name → D-2 and V-16's one name.

P6-C10. **Mechanical, Phase 2:** `setList`, `listKindOf`, `editFor`, and `readFormatState` take a scan, settings, and scope (`format.test.ts`, `formatState.test.ts`, `listRenumber.test.ts`, `regressionPins.test.ts`); `formatKeymap.test.ts`'s bare view gains `editorHost.of(testHost())`, since `applyEditorAction` reads the host's settings (P3-T10). No expectation moves.

P6-C11. **`'enters with the caret in the slot Bold writes at a point on a list glyph'` → `'answers a list glyph with its type menu and commits the pick at rest'`, Phase 3, `Core/MarkdownPM/Tables/cellRestingMenu.test.tsx`:** pinned the general menu's Bold on a resting `•` (`- ****ab`, entered) → A-1 and A-8: the grip menu is asked `{ kind: 'glyph', current: 'bullet' }`, the default is prevented, and Numbered commits `1. ab` at rest. Against Phase 3 the old test fails (`expected … [ 1, +0, '- ****ab' ]`); against Phase 2 the new one fails (`expected "vi.fn()" to be called with …`).

#### Seams Resolved

P6-S1. **`itemAt`'s and `readsFrom`'s argument order:** C-7 appended the reader line to K2's `itemAt(scan, k, scope)` as `itemAt(scan, k, scope, from)`, while its own `readsFrom` took `(scan, k, from, scope)`. Both now take `(scan, k, from, scope)`, scope last as on `siblingsAt`, `subBlockAt`, and `dropChanges` — Phase 1b, `Engine/listModel.ts`, with every caller in `listDrag.ts`, `listRenumber.ts`, and `format.ts`.

P6-S2. **The `-1` reader:** the deletion branch's `readsFrom(scan, k, -1, scope)` leaned on `scan.fences[-1]` being `undefined`. `readsFrom` now takes `from: number | 'outside'`, its doc names the outside reader, and the deletion passes `'outside'` (+5 lines, four of them Biome's signature wrap) — Phase 1b, `listModel.ts`, `listRenumber.ts`. The plain `!inSealedLine` at the call site was the alternative, and it would have put back the scope compare K2 removed.

P6-S3. **`listReach`'s two reads of the caret's line:** C-7 added `anchor = lineIndexAt(scan, from)` while the floor's caret branch kept its own `at = lineIndexAt(scan, from)` and its range loop a third. One `anchor` serves all three (−1 line) — Phase 2, `Input/format.ts`.

P6-S4. **`listReach`'s doc against C-7:** the floor's "code, math, tables and a callout's head are never reached" is false once a pick reaches a code block's own list; rewritten in place as "a code block is reached only from inside it, and math, tables and a callout's head never are" — Phase 2, `format.ts`.

P6-S5. **The renumber's header against C-7:** base's "Nothing inside a page's code, math or tables is counted," kept by the floor, is false once a marker-writing edit counts within its block. Rewritten in place, and the same header now names the no-op re-pick so V-61's line needs no comment of its own — Phase 1b, `Input/listRenumber.ts`.

P6-S6. **`RELIST`'s doc against D-2:** "Enter continuing a list, Tab and Shift+Tab, and the Lists menu" missed the grip and glyph once they relist; rewritten in place as "every list-type pick" — Phase 2, `listRenumber.ts`.

P6-S7. **K2's `itemAt` doc against C-7's `readsFrom` doc:** K2 moved `listDrag`'s sealed-line comment onto `itemAt`, and C-7 replaced it with `readsFrom`'s; `readsFrom` keeps the one doc, since it states the rule `itemAt` reads through — Phase 1b, `listModel.ts`.

P6-S8. **K1's reset and class against the Investigation:** patch 4 carried `railKind.length = 0` and `!/^\S/`; both land as V-45 requires, `railKind.length &&= 0` and `!/^[^ \t]/` — Phase 1b, `Engine/intents.ts`, `Engine/detect.ts`.

P6-S9. **P3-T8's text against the phase line:** `5. a\n6. b\n\n7. c` over the whole first block is a pick over items all already Numbered, which today's `setList` toggles off, so it can't go red-then-green in Phase 1b where the restart lands. The pin uses `5. a\n- b\n\n7. c` over `a` and `b` instead, which today's writer and the switch both write over, and which stays true through Phase 2 with only its signature moving.

P6-S10. **`listReach`'s `markerAt`:** Report 4 left it as a one-line alias of `itemAt` to inline; under C-7 it binds the pick's anchor line, so it stays as the closure the reach reads — Phase 2, `format.ts`.

P6-S11. **`Editor-Internals.md:18`:** Report 4's sentence for K2 was in no patch; it's written in Phase 4, naming `Engine/listModel.ts` and `itemAt`.

#### Comment Ledger

Counted as production lines matching `^[[:space:]]*(//|/\*\*|/\*)`: 3,511 at base, 3,511 at the end.

P6-L1. **Phase 1a:** none.
P6-L2. **Phase 1b, `Engine/listModel.ts`:** added `readsFrom`'s doc (C-7's read rule and the outside reader); added `siblingsAt`'s doc (the blank-line and quote rules split out of `renumberRun`'s comment); rewritten in place, `renumberRuns`' doc (names `repicked`) and `renumberRun`'s base rule; moved, the continuation note into `rolesAgainst`.
P6-L3. **Phase 1b, `Gestures/listDrag.ts`:** removed the sealed-line note, which `readsFrom`'s doc now states.
P6-L4. **Phase 1b, `Input/listRenumber.ts`:** rewritten in place, the header (the old-marker gate, the re-pick restart, the no-op re-pick, the code-block rule). Phase 1b ends at +1.
P6-L5. **Phase 2, `Input/format.ts`:** removed `listMarkerLines`' and `setListKind`'s docs; rewritten in place, `setList`'s doc and the caret note; added `listReach`'s doc; moved, the item-indent note into `readLine`. Net −1.
P6-L6. **Phase 2, `Engine/intents.ts`:** rewritten in place, the glyph comment names the type a form reads as and the `+` rule.
P6-L7. **Phase 2, `Input/formatState.ts`:** rewritten in place, the heading-state comment.
P6-L8. **Phase 2, `Input/listRenumber.ts`:** rewritten in place, `RELIST`'s doc.
P6-L9. **Phase 2, `Menus/gripMenu.ts`:** re-indented, unchanged: the right-press comment and the two action-chain comments. Phase 2 ends at −1.
P6-L10. **Phase 3, `Menus/gripMenu.ts`:** rewritten in place, the right-press comment covers the glyph.
P6-L11. **Phase 3, `Menus/menu.ts`:** rewritten in place, `applyEditorAction`'s doc, `editorMenu`'s doc, and the click-time comment.
P6-L12. **Phase 3, `Tables/cellStatic.tsx`:** rewritten in place, the resting toggle comment covers the type menu.

Total **±0** (3,511 → 3,511).

#### The Drive

`.claude/scripts/List Types Drive/live-drive.mjs`, port 9413, groups 1–5. Every page case is seeded through the page's view with a trailing `Tail.` line holding the caret; "the example" is `- A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n- F`, and "mixed" is it with C and D numbered. Owning phases were assigned by reading what each phase lands: an item that holds at base is Phase 0, one that needs the reach, the check, or `blockPrefix` is Phase 2, and one that needs the glyph menu, the click-time range, the right-press suppression, or the settings row is Phase 3. The file passes `node --check` and its harness imports resolve; it wasn't run.

P6-D1. **A-1, A-2, A-3 (P2-K1):** the example → right-click B's bullet → rows `Bulleted ✓, Numbered, Alphabetical, Checklist, Arrowed`; Phase 3.
P6-D2. **B-1 on (P2-K1):** the example → B's glyph ▸ Numbered → `- A\n\t1. B\n\t\t- C\n\t\t- D\n\t2. E\n- F`; Phase 3.
P6-D3. **A-7 (P2-K2):** that result → ⌘Z → the example; Phase 3.
P6-D4. **B-1 off, B-3 (P2-K3):** the example, setting off → E's glyph ▸ Numbered → `- A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n- F`; Phase 3.
P6-D5. **A-3 (P2-K4):** mixed → B's glyph menu → no row checked with the setting off, `Bulleted ✓` on; Phase 3.
P6-D6. **A-1, A-4, B-8, B-12, B-13 (P2-K5):** `1. one\n2. two`, `- [ ] open\n- [x] done`, `→ a\n→ b`, `+ p` → each first glyph checks Numbered, Checklist, Arrowed, Arrowed, and picking the checked row leaves the text; Phase 3.
P6-D7. **A-9 (P2-K6):** `1. one\n2. two\n→ arrow` → right-press `1.`, then `→`, menu closed → the selection is unchanged; Phase 3.
P6-D8. **A-9, C-2 (P2-K7):** the example, caret at 0 so `-` draws → right-click the `-` ▸ Lists ▸ Numbered List → `1. A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n2. F`; Phase 3.
P6-D9. **A-9 (P2-K8):** `- [] bare` → right-click `bare` ▸ Lists ▸ Task List → `- [ ] bare`; Phase 2 (it may print `AHEAD` at base, since base `setList` may already write it).
P6-D10. **A-10, B-11 (P2-K9):** `> - q1\n> - q2\n>\n> - q3` → q2's glyph ▸ Numbered → `> 1. q1\n> 2. q2\n>\n> - q3`; Phase 3.
P6-D11. **B-7 (P2-K10):** mixed, selection from B through E → C's glyph ▸ Checklist → `- A\n\t- [ ] B\n\t\t- [ ] C\n\t\t- [ ] D\n\t- [ ] E\n- F`; Phase 3.
P6-D12. **B-7 (P2-K11):** the example, selection over B → F's glyph ▸ Numbered → `1. A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n2. F`; Phase 3.
P6-D13. **A-4, A-5 (P2-K12):** a cell `- a<br>- b`, focused by a click on `b` → the first glyph opens the glyph menu; Phase 3.
P6-D14. **A-5 (P2-K12):** the same cell → right-click 10px into the first line → `Type ▸` first; Phase 0.
P6-D15. **A-4 (P2-K12):** the same cell → the second glyph ▸ Numbered → the row reads `| 1. a<br>2. b | x |`; Phase 3.
P6-D16. **A-8 (P2-K13):** resting cells `- a<br>- b`, `1. a<br>2. b`, `→ a<br>→ b` → the first resting glyph ▸ Checklist → five rows, no cell editor mounted, `| - [ ] a<br>- [ ] b | x |`; Phase 3.
P6-D17. **C-5 (P2-K18):** a resting cell `> a` → right-click `a` ▸ Lists ▸ Bullet List → `| - > a | x |`; Phase 2.
P6-D18. **C-1, C-2 (P2-K14):** the example → right-click E's word ▸ Lists ▸ Numbered List → P6-D2's text; Phase 3.
P6-D19. **C-1 (P2-K15):** `Plain.` → right-click it ▸ Lists ▸ Bullet List → `- Plain.`; Phase 0.
P6-D20. **C-3, B-7 (P2-K16):** the example, A through F selected → Lists ▸ Bullet List → the example; Phase 2.
P6-D21. **C-4 (P2-K17):** mixed → right-click B's word → Lists ▸ checks nothing off, `Bullet List ✓` on; Phase 2.
P6-D22. **C-6 (P2-K19):** `plain word here` → right-click `word` ▸ Format ▸ Bold → `plain **word** here`; Phase 0.
P6-D23. **D-1 (P2-K20):** `- a\n- b\n\n- c` → the grip ▸ Type ▸ Numbered → `1. a\n2. b\n\n- c`; Phase 0.
P6-D24. **D-1 (prototype's item):** the example → A's grip ▸ Type ▸ Numbered → `1. A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n2. F`; Phase 0.
P6-D25. **C-1, D-2 (P2-K21):** an empty line → type `/bul`, Enter → `- `; Phase 0.
P6-D26. **E-1, E-2 (P2-K22):** Settings › Pages & Writing → the switches read Outliner Lines, Preserve List-Level Formatting (on), Show Icon In Title in order; Phase 3.
P6-D27. **E-1 (P2-K22):** turned off there, Settings closed, the example → E's glyph ▸ Numbered → P6-D4's text without a reload; Phase 3.

#### Net

| Phase | Production | Whitespace-Only | Tests | Docs | Drive |
|-------|------------|-----------------|-------|------|-------|
| 0 — Drives | 0 | 0 | 0 | +12 (+12 / −0) | +264 (+265 / −1) |
| 1a — The Rename | 0 (+6 / −6) | 0 | 0 (+2 / −2) | 0 | 0 |
| 1b — The List Model | +76 (+171 / −95) | 0 | +19 (+49 / −30) | 0 | 0 |
| 2 — One Switch | +63 (+230 / −167) | 58 / 58 | +31 (+93 / −62) | 0 | 0 |
| 3 — The Glyph Menu | +21 (+71 / −50) | 12 / 12 | +10 (+15 / −5) | 0 | 0 |
| 4 — Docs and Issues | 0 | 0 | 0 | +17 (+35 / −18) | 0 |
| **Total** | **+160 (+631 / −471)** | 68 / 68 over the whole range (+160, +563 / −403 under `-w`); each phase's `-w` diff aligns its hunks on its own, so the cells don't sum exactly | **+60 (+158 / −98)** | **+29 (+47 / −18)** | **+264 (+265 / −1)** |

Against the Investigation's +155 (the floor's +116, K1–K4's +15, C-7's +23, the V-61 line), the final's +5 is P6-S2's union reader (+5, four lines of signature wrap) and P6-S3's shared anchor (−1), with the rename and comment rewrites at 0. Per file, Phase 1b is `listModel.ts` +66, `listRenumber.ts` +12, `listDrag.ts` −3, `intents.ts` +2, `detect.ts` −1, `blockModel.ts` 0; Phase 2 is `format.ts` +36, `gripMenu.ts` +9, `menu.ts` +9, `intents.ts` +6, `formatState.ts`, `api.ts`, and `personalization.ts` +1 each, the rest 0; Phase 3 is `cellStatic.tsx` +9, `menu.ts` +8, `gripMenu.ts` +2, `Actions/gripMenu.ts` +1, `frames.ts` +1.

#### Open Calls

P6-Q1. **The no-op re-pick line lands in Phase 1b, where nothing reaches it yet:** `if (repicked.size > 0 && applyEdits(scan.text, changes) === startDoc) return {}` (`Input/listRenumber.ts`) only fires on a pick that writes over already-correct numbered markers, and in Phase 1b today's `setList` toggles those off while the grip doesn't relist; removing the line in 1b leaves all 1,988 MarkdownPM tests green. It first runs in Phase 2. **Recommended:** keep it in 1b as the brief places it, since it's the renumber's own rule and the drive's P6-D6 is its live proof once Phase 3 lands; moving it to Phase 2 is a one-line, one-import shift if the plan prefers each line arriving with its first caller.

P6-Q2. **I-037's counts include two sites the old count missed:** the same grep that gives the issue's sites finds `scope !== 'cell'` at `Autocomplete/autocomplete.ts:105` and a `= 'page'` default at `:56` at base too, so base reads 22 and 14, not 21 and 13. The final code reads 23 compares and 15 defaults, and the entry now says so, with its sites re-cited at the final lines and `listDrag`, `listRenumber`, `renumberRuns`, `dropChanges`, `subBlockAt`, and `format.ts`'s Lists ▸ dropped from its unscoped readers. **Recommended:** accept the recount, which states the code rather than carrying the old figure forward.

P6-Q3. **The drive is unrun:** its selectors for the revealed `-` (P6-D8), the resting cell's text (P6-D16, P6-D17), and the Settings switch order (P6-D26) follow the harness and the prototype but haven't met the app. **Recommended:** the plan's first execution step runs `node live-drive.mjs 1 2 3 4 5` at `POMMORA_LGM_LANDED=0` against the base build, expecting every Phase 0 item to pass and the rest to print `AWAIT`, and fixes any selector there before Phase 1 lands.

P6-Q4. **Docs name the old file between Phase 1a and Phase 4:** `Editor-Internals.md:18` and I-037's footnote say `listDragModel.ts` until Phase 4 rewrites them. The lint's name-mention scan doesn't read paths, so the gates stay green. **Recommended:** accept, since Phase 4 is where the brief puts every doc change; alternatively move those two lines into 1a.
