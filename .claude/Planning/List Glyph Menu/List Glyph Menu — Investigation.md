### List Glyph Menu — Investigation

**DATE:** 11-03-2026
**BASE:** `cd813afdd` · **FLOOR:** `3 — The Revised Patch.patch` · **CANDIDATES:** `4 — Consolidation Prototype.patch`

Everything below was checked in detached worktrees at `cd813afdd` (base, base + 3, base + 3 + 4, and base + 3 + 4 + the C-7 prototype; all removed). Nathan's later ruling (C-7; K2, K3, and K4 taken; K1 taken if it costs nothing per keystroke; the Prospect resolved; the rename approved) is folded in. Each "→" is observed through `vite-node` against the real modules, unless it's marked **Live, Not Re-Run** (Report 2's app checks, which this pass didn't repeat because it launched nothing) or **Read** (code reading only). Line cites are at `cd813afdd`; patched behavior names the hunk by its function.

#### What's True

V-1. Two writers change list types. `setList` (Lists ▸ and `/`) rewrites each selected line's whole body, writes every sequenced marker as `1. ` or `A. `, and returns `relist: true` — `Core/MarkdownPM/Input/format.ts:299-314`. `setListKind` (the grip's Type ▸) rewrites marker spans and numbers them with per-level counters — `format.ts:339-352`.

V-2. The grip skips the renumber. It dispatches `setListKind`'s changes as `userEvent: 'input'` — `Core/MarkdownPM/Menus/gripMenu.ts:164-166` — while its heading rows go through `applyEdit`, which takes the event from `relist` — `gripMenu.ts:114`, `Input/applyEdit.ts:26`, `Input/listRenumber.ts:11`.

V-3. The two numbering rules disagree. The grip counts by `marker.level`, and `renumberRun` counts runs keyed by exact indent text and kind — `format.ts:344-345`, `Engine/listDragModel.ts:159-209`. → `- a\n\t- x\n  - y` grip Numbered gives `1. a\n\t1. x\n  2. y`, while Lists ▸ on `y` in `- a\n\t1. x\n  - y` gives `  1. y`. → `- a\n\t\t\t- b\n\t\t\t\t- c\n\t\t\t- d` grip Numbered numbers c `2.` and d `3.`, because `indentLevel` caps at 3 — `Engine/detect.ts:522-529`.

V-4. Lists ▸ removes markers when every line already has the kind — `format.ts:302`. → `1. a\n3. b` Numbered gives `a\nb`, `- [x] a\n- [ ] b` Checklist gives `a\nb`, and `- a\n- b` with the caret on `a`, Bulleted, gives `a\n- b`.

V-5. The grip unchecks items and rewrites `+`. It writes `listMarkerText(kind)` wherever the text differs — `format.ts:227-228`, `:347-349`. → `- [x] a\n- [ ] b` grip Checklist gives two `- [ ]` items, and `+ a` grip Bulleted gives `- a`.

V-6. The grip's block ends at a blank line — `Engine/blockModel.ts:139-145` — while the renumber carries a blank line outside a quote — `listDragModel.ts:168-169`. → `1. a\n\n2. b` grip Bulleted gives `- a\n\n2. b`.

V-7. A quoted or callout list has no Type ▸. `blockAt` resolves `blockquote` and `callout` before `list` — `blockModel.ts:74-79` — and the grip offers its list context only on list blocks — `gripMenu.ts:69-72`.

V-8. Neither writer reads fences, continuations, or callout heads. → `- a\n  ```\n  - b\n  ```\n- c` grip Numbered gives `  1. b` inside the fence. → `- a\n  wrapped\n- b` selected, Numbered, gives `  1. wrapped`. → `> [!note] T` Bulleted gives `> [!note] - T`, and `> [!note] T\n> - a` selected, Numbered, gives `> [!note] 1. T`.

V-9. The renumber pushes the run below a changed line only when the new marker is sequenced — `listRenumber.ts:28-38`. → `- p\n\t1. a\n\t2. b\n\t3. c` with `b` selected, Bulleted, leaves `c` at `3.`.

V-10. The renumber re-parses every line it walks from the document string — `listDragModel.ts:159-196`. Its walk carries a line only through `nestedUnder` — `detect.ts:564-565` — so it crosses a code fence indented deeper than its items and stops at one at the items' own indent. → `- p\n\t1. x\n\t\t```\n\t1. y\n\t\t```\n\t1. z` plus Enter renumbers `\t2. y` inside the fence. → `- p\n\t1. x\n\t```\n\t1. y\n\t```\n\t1. z` plus Enter leaves `y` alone, and `z` stays `1.`.

V-11. The drag's branch breaks on any change of quote depth and at `lm.level <= head.level` — `listDragModel.ts:43-51`. → An indented quote under an item is left behind by the drag (`1. a\n  > q\n1. b` gives a branch of `1. a`), though numbering carries it (Enter on `b` gives `2. b\n3. `). → In `- p\n\t1. x\n\t```\n\t2. y\n\t```\n- q`, the branch of `x` is `\t1. x\n\t````, and dropping it at the end splits the fence: `- p\n\t1. y\n\t```\n- q\n1. x\n````.

V-12. The text right-click reads its flags over a click-time range, but its reply acts on the live selection — `Menus/menu.ts:33-36`, `:17`, `:22`. The resting cell carries its click-time range into the reply and defaults away every right-press — `Tables/cellStatic.tsx:520-535`, `:586`.

V-13. A list glyph answers only a left press — `Gestures/listDrag.ts:81-92`. The grip's right-press suppression covers the grip and heading gutter alone — `gripMenu.ts:122-126`. Desktop builds the general menu only when Chromium reports the target editable, or for a resting request — `Desktop/Actions/editorMenu.ts:136`. **Live, Not Re-Run** (P2-L2): bullets and checkboxes show no menu, and numbers, arrows, and `+` get the general menu and seat a selection inside the marker.

V-14. Every resting glyph carries `data-src="<lineStart>,<contentStart>"` and no `GLYPH_CLASS` — `cellStatic.tsx:251-266`. `claimCheckbox` finds its line another way, through the row's `data-cell-line` and `lineOffsetsOf(text.split('\n'))` — `cellStatic.tsx:483-486`.

V-15. The check on Lists ▸ reads only the first line's marker, and it reads `+` as Bulleted — `Input/formatState.ts:19-21`, `:37`. The grip's check folds `listKindOf` over its block — `format.ts:330-337`, `gripMenu.ts:70`.

V-16. One pick has two action names: `listKind:` — `Core/Actions/gripMenu.ts:20` — and `list:` — `Core/Actions/blockMenu.ts:10`, `format.ts:174-175`. Type ▸ builds its rows inline — `Actions/gripMenu.ts:68-78` — and every context except a non-editable heading gets Delete — `:99-102`.

V-17. The `/` menu opens only on a line reading exactly `/query`, and its pick clears the query outside history before running the action — `Menus/blockQuery.ts:17-18`, `Menus/useBlockMenu.ts:41-51`.

V-18. The rails let only a blank non-list line carry and never reset `railKind` on a non-list line — `Engine/intents.ts:382`, `:395-399`. They run over the whole document on every document change — `intents.ts:463-467`. → `- a\n\t- b\n# H\n\t\t- c` draws a level-0 elbow and a level-1 join on `c` (I-017). → `- a\n  wrapped\n\t- b` draws no head on `a` and a headless elbow on `b`.

V-19. An `input.list` edit is its own undo step, since CodeMirror joins only `input.type` and `delete` — `node_modules/@codemirror/commands/dist/index.js:471`. A read-only state refuses every change — `MarkdownEditor.tsx:140` — and an inert host offers no format menu — `Core/Pages/editorHost.tsx:106`.

V-20. `splitPrefix` strips a quote prefix on every surface — `format.ts:237-242` — while the key transforms use `blockPrefix(line, scope)` — `Input/edits.ts:63-64`. → In a cell, Lists ▸ Bulleted on `> a` gives `> - a`, which the cell draws as prose.

V-20a. Lists ▸ inside a code block writes markers but never counts them. `setList` reads no fences, and the renumber drops every position on a sealed line — `listRenumber.ts:39-41`, pinned by `'a list-writing edit inside a code block counts nothing'` in `Input/listRenumber.test.ts`. → In ```` ```\n- a\n- b\n``` ````, a caret on `a`, Numbered, gives `1. a\n- b`, and a range over both gives `1. a\n1. b`.

#### What the Floor Makes True

V-21. The patch makes `setList(scan, from, to, kind, settings, scope)` the only list-type writer, addressed by `listReach`. A caret takes its item's group, and a range takes every item it touches — patched `listReach`, `setList`. It removes `setListKind`, `listMarkerLines`, the toggle-off, `listMarkerText`'s `n`, `SelectedLine.kind`, and `nestedUnder`. Verified on the *§Decisions* example: B on → `\t1. B … \t2. E`, C and D unchanged. E off and B off → `\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E`. `- A\n\t- B\n- F\n\t- G`, B off → G unchanged. A selection from B through E with C and D numbered, Checklist → all four items. `plain\n- b\n1. c` → three checklist items. `- a\n- b` Bulleted on → unchanged. `- a\n\t1. x\n- b` Bulleted off → `\t- x`. `- [x] a\n- [ ] b` Checklist off or grip → `[x]` survives. E numbered, B Arrowed on → B alone.

V-22. The patch makes one sibling walk by quote depth and drawn level, which numbering, the drag, and the switch all read — patched `rolesAgainst`, `siblingsAt`, `subBlockAt`, `runAt`. → `- p\n\t1. x\n  1. y` plus Enter gives `  2. y\n  3. ` (tab and space siblings now count as one run). → `\t\t\t- b\n\t\t\t\t- c\n\t\t\t- d` numbers as three siblings. → `- A\n\t- B\n\n\t- E` keeps B and E together. → A paragraph or heading between items ends the group, and `para\n\t- x\n\t- y\n- z` makes x and y a group of their own.

V-23. The patch makes a pick that writes over a whole numbered or lettered marker restart that marker's run, while a pick that only brings lines into a run counts on — patched `listRenumber`'s `repicked` loop, `renumberRun`'s `start`. → `5. a` plus `b` gives `6. b`. `- B\n3. X\n- E` with B Numbered gives `3. B\n4. X\n5. E`. `5. a\n- b\n7. c` with `b` selected gives `5. 6. 7.`. → `5. a\n6. b\n\n7. c` by grip, `3. a\n4. b\n7. c` by range or grip, `1. a\n1. b\n1. c` by grip or caret, and `5. a\n6. b\n7. c` by selecting `b` or by a caret on `a` all give `1. 2. 3.`, and `5. a\n6. b` grip Alphabetical gives `A. B.`. → The run an item leaves is recounted: `1. a\n- b\n3. c` at the top, `\t1. a\n\t- b\n\t1. c` nested. With the restart stubbed out, only P3-T8 fails.

V-24. The patch makes continuations, code, and callout heads untouchable by a pick. → A caret on `wrapped` in `- a\n  wrapped\n- b` numbers `a` and `b`, and a range leaves `wrapped` as is. → The grip leaves `- b` inside a fence. → A range over a callout head leaves the head. → `  lead\n- a` grip Numbered gives `  1. lead\n1. a` (D-3).

V-25. The patch makes `drawnKind` the type a pick and a check read: `+` is Arrowed and `- []` has no type — patched `drawnKind` in `intents.ts`. → The check reads Arrowed on `+` and nothing on `- []`. `+ a\n→ b` Arrowed is unchanged, Bulleted gives `- a\n- b`, and `- [] a` Bulleted gives `- a`.

V-26. The patch makes every check follow the pick's reach — patched `readFormatState`, which reads `listKindOf`. → A selection over `- a\n1. b` checks nothing. A mixed group checks nothing with the setting off, and checks Bulleted with it on.

V-27. The patch makes the live glyph menu a branch of `editorMenu`. A glyph target asks `host.menus.grip({ kind: 'glyph', current })` and prevents the default. List rows act over the click-time range behind a document-identity guard, and every other row acts on the live selection — patched `editorMenu`, `applyEditorAction`. `gripMenu(scope)` adds the glyph to the right-press suppression and runs Type ▸ through `editFor` and `applyEdit` — patched `gripMenu`. Verified by a throwaway vitest mounted in jsdom, deleted after it ran. → A right-click on B's bullet asks the grip menu for `{ kind: 'glyph', current: 'bullet' }`, doesn't ask the format menu, prevents the default, and Numbered gives `\t1. B … \t2. E`. → E's bullet with the setting off gives the group and its nesting. → A text right-click on `E`, with the word seated before the reply, numbers B and E. → A change made while the menu is open cancels the pick. → A glyph inside a selection from B through C changes only B and C.

V-28. The patch makes the resting cell use one menu flow. A glyph matched by `.md-list-item > [data-src]` supplies `{ offsetNode: glyph, offset: 0 }`, and `cellOffsetAt` resolves that to the glyph's `data-src` line start — patched `restingMenu`, `restingRange`, read against `cellStatic.tsx:339-370`. → In a cell, `> a` Bulleted gives `- > a`. On a page it gives `> - a` — patched `splitPrefix` through the exported `blockPrefix`.

V-29. The patch makes the menu model one vocabulary: a `'glyph'` context, one `listRows` builder for Type ▸ and the flat menu, no Delete on a glyph, and `list:` only — patched `Actions/gripMenu.ts`. The setting is `preserveListLevels: flag(true)`, a toggle with no caption under Outliner Lines, and an `EDITOR_SETTING_KEYS` entry — patched `personalization.ts`, `frames.ts`, `api.ts`.

V-30. The patch makes numbering regress after an indented quote. `rolesAgainst` returns `'outside'` on any difference in quote depth — patched `rolesAgainst`. → `1. a\n  > q\n1. b` plus Enter gives `1. b\n2. `, where base gives `2. b\n3. `.

V-31. The patch makes numbering count into a code fence at the items' own indent. `rolesAgainst` admits `\t```` as nested through its body test and reads `scan.markers` unsealed — patched `rolesAgainst`. → `- p\n\t1. x\n\t```\n\t1. y\n\t```\n\t1. z` plus Enter gives `\t2. y` inside the fence and `3. z`, where base leaves `y` and `z` alone (V-10).

V-32. The patch makes a re-pick over an already-correct run land a transaction that changes nothing. `setList` writes `1. ` over every sequenced item, and the renumber puts the old numbers back — patched `setList`'s `isSequenced(lm) ||`. → `1. a\n2. b` with a caret, Numbered, and `1. a\n2. b\n3. c` by grip each leave the text unchanged with an undo depth of 1. Base's grip writes nothing and leaves the depth at 0.

#### What's Reusable

V-33. The relist path already serves every surface: `relist` → `editEvent` → `listRenumber` — `listRenumber.ts:11-44`, installed for the page and cell scopes at `surface.ts:25-38` — and the resting cell lands its edits through `landEdit` in `commitAtRest`, which already skips an edit that leaves the text unchanged — `cellStatic.tsx:441-447`.

V-34. `host.menus.grip` → `popMenu(gripMenuItems(ctx))` is a native flat menu with checks that needs no Desktop or contract change, and the harness already stubs it — `editorHost.tsx:102`, `Core/Testing/editorHarness.ts:125`.

V-35. The click-time range `menu.ts:33-36`, `view.posAtDOM(glyph)` `listDrag.ts:92`, `LIST_KINDS` with its short names `Actions/gripMenu.ts:36-52`, and `listKindOf`'s one-kind-or-null fold `format.ts:330-337` are each the piece the floor reuses rather than restating.

V-36. `data-src` on every resting glyph and `srcOf` — `cellStatic.tsx:251-266`, `:328-332` — give a line start without a hit test, which K3 reads for the checkbox.

V-37. `inSealedLine` is the existing rule against list counting in code, math, or tables — `Engine/docScan.ts:384-391` — and K2's `itemAt` uses it. `blockPrefix` is the existing rule that a cell draws no quote — `edits.ts:63-64` — and the floor uses it.

V-38. `settingOf` reads the editor settings handed in — `Core/Settings/personalization.ts:268-271` — and both callers of `editFor` already hold a host — `menu.ts:22`, `cellStatic.tsx:512`.

V-39. `applyEdits` applies a list of edits to a string — `Engine/markdownCode.ts:16` — which is all the P3-Q3 fix needs (V-61).

V-40. The approved drive prototype, `Scouts/Planning/2 — Drive Prototype.patch`, holds the new drive and the one-line change that makes `drive-harness.mjs` record a row's check (`.claude/scripts/drive-harness.mjs:116-117`).

#### What Contradicts the Source

V-41. *§Prospects* "Numbering Inside a Fenced Block", which Nathan ruled resolved by C-7 and K2: "as it does today" holds for a fence opener indented deeper than its items (V-10), but not for one at the items' own indent, where base stops and the floor starts counting (V-31). K2 alone closes both shapes and leaves one of its own: in `1. x\n   ```\n1. y\n   ```\n1. z`, it leaves the code alone but splits the run, so Enter gives `1. z\n2. ` and deleting `z` from `…\n1. z\n1. w` leaves `1. w`. Base renumbers `y` to `2.` inside the code in both cases. **Implies:** "resolved" holds only with the C-7 shape (V-48a), which reads a code block from outside as its opening line. With it, that shape gives `2. z` and `2. w`, and a column-0 fence still ends the list.

V-41a. Decision C-7 against the floor: the floor's switch drops sealed lines outright — patched `listReach`'s `sealed` filter — and the renumber never counts on them (V-20a, and K2's `itemAt`), so Lists ▸ inside a code block does nothing, where base at least wrote the markers. **Implies:** the switch and the renumber need one rule for which lines a reader may read, keyed to the code block the reader sits in. V-48a is the smallest shape found, and it rewrites the base pin named in V-20a.

V-42. Decision B-9 ("numbering repair shouldn't regress"): the floor regresses numbering after an indented quote (V-30) and beside a fence at the items' own indent (V-31). K4 and K2 fix them. The Decisions don't say whether an indented quote under an item belongs to that item. That's a gap rather than a conflict, and K4 answers yes, which is how CommonMark, base numbering, and the grip's block (`blockModel.ts:45`) already read it.

V-43. Decision A-7 holds: each pick is one undo step (V-19). But a re-pick that changes nothing visible still takes a step (V-32), so ⌘Z then appears to do nothing, and it costs Report 2's drive the trap noted in P2-W4. A one-line fix removes it (V-61).

V-44. The rename of `Engine/listDragModel.ts` to `listModel.ts`, with its test, is approved. The floor gives the file siblings, branches, runs, and moves, and K2 and C-7 add `itemAt` and `readsFrom`. Neither patch renames it, so the plan does.

#### The Candidates

V-45. **K1, Rails Read the List's Line Rule:**
- **Effect:** Verified. → `- a\n\t- b\n# H\n\t\t- c` and the same with a paragraph draw no rail on `c`. → `- a\n  wrapped\n\t- b` draws a head on `a`, a rail through `wrapped`, and an elbow on `b`. The rewritten test's text gives `[0,0,null],[4,0,null],[14,0,'elbow']`. The residuals reproduce: `- a\n\t- b\n> \t- c` keeps a level-0 elbow on `c`, and `> - a\n>   wrapped\n> \t- b` now draws nothing on `b`, where base drew a headless elbow.
- **Net:** +5 (+12 / −7).
- **Closes:** I-017's heading and paragraph shapes, plus the wrapped-line gap.
- **Risk:** The slowdown is real, and Report 4's cause is wrong (V-56). An unconditional `railKind.length = 0` on every non-list line that doesn't carry hits the array-length setter. On a page that's all prose, that's +60% for the whole pass. The predicate swap itself costs nothing. Writing the line as `railKind.length &&= 0` restores base on every document shape for 0 lines. Separately, `continuesList`'s `!/^\S/` treats a line led by any Unicode space (a no-break space, say) as indented, where `blockModel.ts:45` and `rolesAgainst` accepted only a space or tab. `!/^[^ \t]/` keeps the old meaning, since CodeMirror hands over `\n`-only text.
- **Verdict:** Taken under Nathan's condition, since with the guard the measurement shows no real per-keystroke cost (V-54). As Report 4 wrote it, the cost is real: about 0.8 ms on every keystroke for a 50,000-line prose page. Take it with the guard and the narrower class.

V-46. **K2, One Scoped Item Read:**
- **Effect:** Verified. → The fence shapes in V-10 and V-31 leave the code untouched. → The drag's branch of `x` now holds its whole fence, and the drop gives `- p\n- q\n1. x\n```\n2. y\n````. → It also folds the two `scope === 'page' && inSealedLine` copies (`listDrag.ts:47`, `listRenumber.ts:40-41`) and the floor's `markerAt` ternary into `itemAt`.
- **Net:** +11 (+52 / −41). I-037's counts weren't recounted in this pass.
- **Closes:** V-31 (a regression in the floor), the drag's fence split (V-11, at base), and both fence shapes from V-10.
- **Risk:** One shape is left (V-41). The renumber walk costs about 0.7 ms more at 50,000 lines and is still about 3× faster than base (V-57). It runs on Enter, Tab, Shift+Tab, line deletions, and picks, never on a plain keystroke.
- **Verdict:** Taken by Nathan, and needed anyway because the floor causes V-31. As built, outer numbering steps over a code block without counting its lines. An indented block carries the run, the way an indented quote (K4) and a wrapped line do, while a column-0 block ends it. The ruling's "stops at a fence" is read that way (V-62).

V-47. **K3, the Resting Checkbox Reads Its Glyph:**
- **Effect:** `claimCheckbox` takes its line start from `srcOf(seat)`, the same `data-src` start the floor's glyph menu reaches through `cellOffsetAt` (V-28), and drops the `text.split` it did on every tap.
- **Net:** −3 (+1 / −4).
- **Closes:** None.
- **Risk:** None found. Every resting checkbox seat carries `data-src` (`cellStatic.tsx:254`), and the full gates pass on 3 + 4.
- **Verdict:** Taken by Nathan.

V-48. **K4, an Indented Quote Rides Its Item:**
- **Effect:** `rolesAgainst` returns `'outside'` only for a shallower quote depth. → `1. a\n  > q\n1. b` plus Enter gives `2. b\n3. `, as at base. → The drag's branch of `a` becomes `1. a\n  > q`. → In both a cell and a page, `- a\n  > q\n- b` now reads `b` as `a`'s sibling (`1. a … 2. b`).
- **Net:** +2 (+5 / −3).
- **Closes:** V-30, plus the drag disagreeing with numbering and the grip's block.
- **Risk:** Low. The gates pass.
- **Verdict:** Taken by Nathan, into the floor.

V-48a. **C-7, a Code Block Reads Its Own List (Prototype on 3 + 4):**
- **Shape:** One predicate in the list model, `readsFrom(scan, k, from, scope)`, says whether line `k` is open text to a reader on line `from`. A page reads a code block's lines only from inside that block and never reads math or tables, and a cell reads every line: `code?.from === scan.fences[from]?.from && (code !== undefined || !inSealedLine(scan, k))`, keyed by `FenceInfo`'s span (`Engine/detect.ts:76`). `itemAt` gains the reader's line and reads through it. `rolesAgainst` ends a group at its code block's edge when reading inside one, and reads a block it's outside of as the block's opening line. `listReach` anchors at the pick's line, with `readsFrom` replacing its sealed filter. A deletion counts only on lines readable from outside any block (the reader is line `-1`), so editing a code sample never renumbers it, and Enter and Tab already refuse a fenced line (`Input/edits.ts:74`, Read). The collected drop targets read from the dragged item's line.
- **Effect:** Verified. → In `- p\n\t1. x\n\t```\n\t- y\n\t- y2\n\t```\n\t1. z`, a caret on `y`, Numbered, gives `\t1. y\n\t2. y2` with `x` and `z` unchanged. → ```` ```\n1. a\n3. b\n``` ```` re-picked gives `1. a\n2. b`, and bulleting `b` in a `1. 2. 3.` run inside a block gives `1. a\n- b\n3. c`. → Plain code lines selected, Bulleted, become items, and the check reads Bulleted inside a block. → From outside, nothing reaches in: the grip, a glyph with the setting off, a range across the block, and a list holding a `diff` sample all leave the code untouched. Every outer Enter shape in V-10 and V-31 leaves the code alone, V-41's shape gives `2. z` and `2. w`, and a column-0 block still ends the list. → A line deleted inside a block renumbers nothing. → The drag carries a nested block whole, including one with column-0 content, and the drop gives `- p\n- q\n1. x\n```\n2. y\n````. K4, math lines, and cells behave as on 3 + 4.
- **Net:** +23 (+41 / −18) on 3 + 4, of which about 8 lines are Biome wraps. The comment count is flat, since `readsFrom`'s doc replaces `itemAt`'s.
- **Gates:** Typecheck and lint pass. The suite passes everything except `'a list-writing edit inside a code block counts nothing'`, which C-7 makes false: it now gives ```` ```\n1. a\n2. b\n``` ````, so it's rewritten to pin counting within the block.
- **Risk:** The `-1` reader for deletions is a sentinel that the plan should name or replace. `readsFrom` adds one scope compare (I-037). The walks call `lineIndexAt` once per fenced line they meet.
- **Saved At:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/e5eec1fe-e04b-4212-9010-3f98def4b533/scratchpad/lgme/C-7 Prototype (on 3+4).patch` (session scratchpad, not the repo).

V-49. **The Set:** K1–K4 add +15 (+70 / −55) on the floor, for +131 (+432 / −301) in production against base. Tests are +2 on top of the floor, and the comment count is flat (19 added, 19 removed against base). With K1's guard (0 lines), the P3-Q3 line (+1), and C-7 (+23), the work on top of the floor comes to +39.

#### Gates and Measurements

V-50. **Floor Gates:** `npm run typecheck` exits 0 across UIX, Core, Core src, Desktop node and web, Sync, and the dashboard. `npm run test` passes 549 files, with 9,111 passed and 2 skipped. `npm run lint` checks 1,433 files with no fixes, and the comment-wrap and name-mention scans pass.

V-51. **Floor + Candidates Gates:** Identical to V-50: exit 0; 549 files, 9,111 passed, 2 skipped; 1,433 files, no fixes.

V-51a. **Floor + Candidates + C-7 Gates:** Typecheck exits 0 and lint checks 1,433 files with no fixes. The suite passes 9,110 with 2 skipped and fails one, the base pin C-7 makes false (V-48a).

V-52. **Floor Line Counts:** Production is +116 (+390 / −274), matching Report 3. Tests are +31 (+100 / −69), and docs are +1 (+10 / −9). Comment lines are 18 added and 18 removed.

V-53. **Throwaway Checks:** A vitest of the live glyph path (V-27) passed 5/5, and with the P3-Q3 line applied all 1,986 MarkdownPM tests passed (V-61). Both were removed, along with the K1 guard trials.

V-54. **Rail Pass:** This is K1's measurement. Each figure is the median of 8 interleaved runs, one process per build and warm (60 warm-up passes, then 25 samples of 10), bundled with esbuild and run under Node 24 as the production-shaped read. The documents are 50,000 lines each.

| Document | Base | Floor | Floor + K1 | Floor + K1, Guarded |
|----------|------|-------|------------|---------------------|
| Prose, No Lists | 1.34 ms | 1.31 ms | 2.14 ms | 1.34 ms |
| Mixed Pages | 3.52 ms | 3.48 ms | 3.81 ms | 3.71 ms |
| Lists Only | 4.43 ms | 4.47 ms | 4.38 ms | 4.40 ms |

Under `vite-node`, prose went from 1.93 to 2.76 ms and mixed from 3.66 to 4.05 ms, across 5 runs. The mixed document draws 78,125 rails under K1 against 65,625 at base. That's the wrapped-line fix doing its job, and it accounts for the guarded build's remaining +5%.

V-55. **Rail Pass Cause:** Same-process variant copies settle it. On prose, base reads 1.16–1.23 ms. Base's predicate plus the unconditional reset reads 1.86–1.98 ms. K1's predicate without the reset reads 1.22–1.24 ms. K1 with the guarded reset reads 1.20–1.24 ms. The floor doesn't touch the rail pass (Floor ≈ Base).

V-56. **Report 4's K1 Reading:** The "+15%, unexplained" figure came from a document mixing lists and prose. "Base pays the same imported call through `isBlank`" is true, and it doesn't matter, since the predicate isn't the cost. The inference that a production bundle behaves like the inlined run is false: bundled, prose runs +60%. The rail pass is a whole-document pass on every change (V-18), so this is the Hard Rules' case. The guard keeps K1 at base cost.

V-57. **Renumber Walk:** This times `renumberRuns` for a top-level item at line 25,000 of 50,000 lines, across 3 interleaved `vite-node` runs.

| Document | Base | Floor | Floor + K2 |
|----------|------|-------|------------|
| 50,000 Numbered Items | 20.1–20.9 ms | 6.2–6.7 ms | 7.1–7.4 ms |
| 10,000 Items With Nested Runs | 18.8–19.6 ms | 2.3–2.5 ms | 2.8–3.0 ms |

The floor reads the cached scan where base re-parsed every line.

V-58. **P3-Q3 Fix Cost:** `applyEdits` plus the string comparison takes 0.195 ms on a 50,000-line, 1.97M-character document. It runs only when a pick wrote over a whole numbered marker. Enter with a selection spanning a marker returns no edit, and Enter on an empty item (`1. a\n2. `) inserts at the caret without spanning the marker, so typing never reaches it.

V-59. **Not Re-Run:** Report 2's four baseline drives (P2-D1–D4), its live checks (P2-L1–L3), and its prototype drive (P2-W4). No app was launched.

#### Open Calls

V-60. **Approve the C-7 Shape (V-48a):** A list typed inside a code block becomes switchable from Lists ▸ there, and nothing outside the block (the surrounding list's menu, grip, numbering, or drag) touches it. The prototype does that with one "may this line be read from here" rule, at about 23 lines. It also settles two smaller questions. Deleting a line inside a code block renumbers nothing, because only the menu counts inside code. And a column-0 code block ends the list around it, while an indented one sits inside the item it's under. **Recommended:** approve it, with the plan naming the `-1` "reading from outside" reader rather than keeping a bare number.

V-61. **Make a No-Op Re-Pick a No-Op (P3-Q3):** Picking Numbered on a list that's already correctly numbered changes nothing you can see, but it still takes an undo step, so the next ⌘Z appears to do nothing. Report 3 said this couldn't be avoided. It can, with one line at the end of the renumber, `if (repicked.size > 0 && applyEdits(scan.text, changes) === startDoc) return {}`, plus `applyEdits` added to an existing import. This verified clean: undo depth 0, every MarkdownPM test green, 0.2 ms at 50,000 lines. Returning `{}` drops the whole transaction, which is safe because a re-pick never carries a selection (only a single plain line becoming an item does, and that changes the text) or a scroll request. **Recommended:** take it.

V-62. **What "Outer Numbering Stops at a Fence" Means:** The ruling can be read two ways. Under one, the numbers around a code block skip its lines and keep counting past an indented block, so `1. x`, an indented code block, then `2. z`. That's what K2 and C-7 do. Under the other, any code block ends the numbered list, which is what base does only for a block at the items' own indent. **Recommended:** the first, because an indented block belongs to the item above it, the same way an indented quote does under K4. A column-0 block still ends the list either way. If Nathan meant the second, `rolesAgainst` would return `'outside'` for every code block it reads from outside, and three of V-48a's results would change.

V-63. **I-017 After K1 (P4-Q2):** K1 meets Nathan's condition only with its guard (V-45). It fixes the outliner lines at headings, paragraphs, and wrapped lines, and leaves one rare case: a nested item inside a quote, directly after a list outside it, still draws the outer list's line. **Recommended:** narrow I-017 to that case.

V-64. **Focus After a Glyph Pick (P3-Q1):** A pick from a glyph's menu puts the cursor back in the page, as Lists ▸ already does, while the grip keeps taking no focus. **Recommended:** accept it.

V-65. **The `'page'` Fallback on `applyEditorAction` (P3-Q2):** The shortcut keys, the paste command, and the `/` menu share one runner that can't tell which surface it's on, so it assumes the page. **Recommended:** accept it and leave it for I-037.

V-66. **Which Pins Get Added:** The constraint admits a test only where the behavior is clearly defined and genuinely needed. **Recommended:** pin the setting's two reaches on the *§Decisions* example (the feature's core behavior, otherwise pinned only by the live drive), K4's indented quote, K2's fence case, and C-7's pick inside a code block that leaves the outer list alone (beside the rewritten base pin), each of which goes red without its fix and pins a regression that has already happened once. Leave Report 1's proposed glyph-row and tab-and-space pins, and the empty-step fix, to the drive and existing pins.

V-67. **Heading ▸ Paragraph on a Nested Item (P1-Q5):** It turns `\t- b` into a plain `b` at the left edge, which C-3 relies on as the way back to plain text. A paragraph can't keep a list indent without becoming a continuation. **Recommended:** leave it unrecorded.

#### Report Map

R-1. **Scout 1, 1-T1–1-T17:** Kept, each verified against base (V-1–V-9, V-15, V-17, V-20); 1-T2's renumber half for the level cap wasn't re-run.

R-2. **1-R1, 1-R2, 1-R4–1-R8:** Kept. The floor reuses each: `listMarkerText` with its `n` dropped, the relist path, `selectedLines` serving only `setHeading` beside the extracted `readLine`, `listKindOf`, `inSealedLine`, `settingOf`, and the walk's `last`.

R-3. **1-R3:** Superseded by V-22. The floor replaces the indent-text walk with one by drawn level (B-5).

R-4. **1-R9:** Kept for drawing; corrected by K1, which gives the rails the list's line rule.

R-5. **1-C1, 1-C3–1-C7:** Kept, and resolved by the ratified decisions (D-2, B-5, D-1, B-6, C-1, B-4) and the floor's rewrite of `MarkdownPM.md:24`; 1-C5 was confirmed live by P2-L1.

R-6. **1-C2:** Superseded by B-9 and V-23. The repair survives as a re-pick restart.

R-7. **1-X1–1-X3, 1-X5, 1-X6:** Kept, and done in the floor.

R-8. **1-X4:** Corrected. The hoist became `siblingsAt` by drawn level, at +21 in `listDragModel.ts` rather than +5.

R-9. **1-A1:** Kept as the built shape; its +10 estimate is corrected to +116 (V-52). **1-A2, 1-A3:** Kept as rejected.

R-10. **1-E1–1-E4, 1-E8, 1-E10–1-E13:** Kept, and verified on the floor. 1-E12's page half is superseded by C-7 (V-48a), and its cell fence half wasn't re-run.

R-11. **1-E5:** Superseded by C-5 and V-28.

R-12. **1-E6, 1-E7:** Superseded by B-5 and V-22. Tab and space siblings are one group, and four-tab items are siblings of three-tab ones.

R-13. **1-E9:** Corrected by B-13 and V-25. `+` is Arrowed, so a Bulleted pick rewrites it, and `- []` is rewritten by every pick.

R-14. **1-Q1:** Superseded by B-9, since the repair stays. **1-Q2–1-Q3, 1-Q5:** Ratified (B-6, D-1, B-4, C-4). **1-Q4:** Overturned by B-5.

R-15. **1-D1–1-D3, 1-D5–1-D10:** Kept, and done as P3-T1–P3-T7 and the doc rows. **1-D4:** Corrected. The repair pin stays (P3-T3).

R-16. **1-L1–1-L5:** Superseded by the P3-L ledger.

R-17. **Scout 2, 2-T1–2-T6, 2-T8–2-T12, 2-T14, 2-T16–2-T20:** Kept, verified against base (V-12–V-17, V-19).

R-18. **2-T7:** Corrected. It was confirmed live by P2-L1 and not re-run here.

R-19. **2-T13:** Corrected by P2-L3. The glyph begins where the 20px band ends (Live, Not Re-Run).

R-20. **2-T15:** Corrected by P2-L2. Bullets and checkboxes show no menu.

R-21. **2-R1:** Corrected. The floor puts the live glyph menu in `editorMenu` behind a document-identity guard, and `gripMenu` keeps only the right-press suppression (V-27). **2-R2–2-R9:** Kept, and reused (V-34–V-36).

R-22. **2-C1–2-C4, 2-C6:** Kept, and resolved by C-1, A-8, C-4, C-2, and V-27's placement below the `readOnly` return. **2-C5:** Superseded by P2-L2 and P2-L3.

R-23. **2-X1–2-X4:** Kept, and done in the floor.

R-24. **2-A1:** Superseded by P3-R5. It keeps 2-A1's menu, but places the glyph branch in `editorMenu`. **2-A2, 2-A3:** Kept as rejected.

R-25. **2-E1–2-E3, 2-E5–2-E8:** Kept. 2-E3 is decided by B-7, and a glyph inside a selection acts on the selection (V-27). **2-E4:** Superseded by P2-L3.

R-26. **2-Q1, 2-Q3, 2-Q4:** Ratified (C-2, C-1, A-8). **2-Q2:** Overturned by B-7. **2-Q5:** Superseded by P2-L3.

R-27. **2-D1–2-D13:** Kept, and touched as P3-T9 and P3-T11 and the doc rows; no glyph twin of 2-D3 was added.

R-28. **2-L1–2-L3:** Superseded by P3-L13 and P3-L19.

R-29. **Fresh-Eyes 1, 4:** Corrected by P2-L2 and P2-L3, and absorbed into the ratified *§Context* (Live, Not Re-Run).

R-30. **Fresh-Eyes 2, 3, 5, 7–11, 17–20, 22, 23, 28, 29:** Ratified as B-13, A-8, A-9, A-10, B-3, B-11, B-5, B-12, B-7, C-3, C-5, E-3, and E-4.

R-31. **Fresh-Eyes 6, 16, 24:** Kept, and verified (V-26, V-23, P1-E3).

R-32. **Fresh-Eyes 12–15, 21, 25–27:** Resolved by the floor: one walk for the drag and numbering, the re-pick restart (`3. 4. 7.` → `1. 2. 3.`), the `menu.ts:32` comment rewritten in place, one action name, the `'glyph'` context, and `/` as written.

R-33. **Fresh-Eyes 30:** Open as written. The floor's doc changes are a one-sentence rewrite of `MarkdownPM.md:24`, three words at `:146`, and the settings row. Its Guidelines rewrite of `Editor-Internals.md:40` replaces a sentence the work makes false, and K2 rewrites `:18` the same way.

R-34. **Report 1, P1-B1, P1-B3, P1-B4, P1-B8–P1-B10:** Kept in the floor. P1-B3 and P1-B9 lost their defaults (P3-R4).

R-35. **P1-B2, P1-B5–P1-B7, P1-B11:** Superseded by P3-R1, P3-R5, P3-R6, and P3-R7.

R-36. **P1-X1–P1-X11:** Kept, and done in the floor.

R-37. **P1-G1–P1-G3, P1-C6, P1-Net:** Superseded by V-50 and V-52.

R-38. **P1-T1–P1-T4, P1-T6, P1-T7, P1-T9–P1-T11:** Kept as P3-T1–P3-T4, P3-T6, P3-T7, P3-T9–P3-T11. **P1-T5, P1-T8:** Superseded by P3-T5 and P3-T12. **P1-T12:** Open (V-66).

R-39. **P1-C1, P1-C2:** Superseded by P3-R1 (V-23). **P1-C3, P1-C4:** Ratified as B-14 and D-3. **P1-C5:** Kept, and verified.

R-40. **P1-E1, P1-E2, P1-E4–P1-E9, P1-E11–P1-E21:** Kept, each verified on the floor. **P1-E22:** Kept; it's read from `menu.ts`'s range rule.

R-41. **P1-E3:** Corrected. The top-level case now gives `3. 4. 5.` (P3-E2), while the nested and Alphabetical cases still hold. **P1-E10:** Kept; it's V-32.

R-42. **P1-Q1:** Superseded by B-9 and P3-R1. **P1-Q2, P1-Q3:** Ratified (B-14, D-3). **P1-Q4:** Superseded by K2 and C-7. Its "sealed reads as nested" sketch would join a list across a column-0 block (V-41). **P1-Q5:** Open (V-67). **P1-Q6:** Superseded by P3-Q2. **P1-Q7:** Kept. **P1-Q8:** Approved by Nathan (V-44).

R-43. **P1-L1–P1-L19:** Superseded by the P3-L ledger.

R-44. **Report 2, P2-L1–P2-L3, P2-D1–P2-D5, P2-W2, P2-W4:** Kept (Live, Not Re-Run). **P2-W1, P2-W3:** Approved in *§Placements*.

R-45. **P2-K1–P2-K22:** Kept as the drive's case list. P2-K1, K3, K4, K8–K11, K14, K16–K18, and K20 agree with this pass's probes and throwaway. P2-K5's "leaves the text unchanged" also takes an undo step until V-61 lands.

R-46. **P2-R1–P2-R5:** Kept.

R-47. **P2-F1–P2-F4, P2-F6, P2-F9–P2-F13:** Kept, and done in the floor. **P2-F5:** Superseded. The base-keeping pin stays (P3-T5). **P2-F7:** Corrected. The test stays true with mechanical arguments. **P2-F8:** Kept true, since B-13 lands through `drawnKind` rather than the parse. **P2-F14:** Absorbed into the ratified Decisions.

R-48. **P2-C1, P2-C2:** Absorbed into the ratified *§Context*. **P2-C3:** Kept, and done (V-25). **P2-C4:** Kept, and sits in *§Prospects*.

R-49. **P2-Q1, P2-Q2:** Approved. **P2-Q3:** Ratified as B-9, and built by P3-R1. **P2-Q4:** Absorbed. **P2-Q5:** Ratified as E-4.

R-50. **Report 3, P3-R1–P3-R8:** Kept, and verified (V-21–V-29). P3-R6's line start is `data-src` through `cellOffsetAt`.

R-51. **P3-S1:** Kept, and verified: stubbing the restart fails only P3-T8. **P3-S2–P3-S10:** Kept; P3-S4's focus pin wasn't re-run apart from the gates.

R-52. **P3-G1–P3-G3, P3-T1–P3-T12, P3-L1–P3-L19, Net:** Kept, and re-run (V-50, V-52).

R-53. **P3-E1–P3-E12, P3-E14:** Kept, and verified, with P3-E12 confirmed by this pass's throwaway. **P3-E13:** Kept; it's read from `applyEditorAction` and `editorHost.tsx:106`.

R-54. **P3-C1:** Corrected. "None" misses V-30 and V-31, the two numbering regressions the floor introduces.

R-55. **P3-Q1, P3-Q2:** Open (V-64, V-65). **P3-Q3:** Corrected. One line fixes it (V-61). **P3-Q4:** Approved by Nathan (V-44).

R-56. **Report 4, P4-D1, P4-D3, P4-D5, P4-D6:** Kept. P4-D1 and P4-D3 are verified (V-18, V-11, V-30). P4-D6 wasn't re-run.

R-57. **P4-D2:** Corrected. The cited shape isn't renumbered at base, and only the floor counts it (V-31). Base counts deeper-indented fences (V-10), and the drag split is at base (V-11).

R-58. **P4-D4:** Kept. The floor's glyph menu reaches the same `data-src` through `cellOffsetAt`, not by reading it directly.

R-59. **P4-K1:** Corrected. The slowdown is the reset, not the import, and it's fixed by the guard (V-45, V-54–V-56). **P4-K2:** Taken by Nathan. It's corrected as required because of V-31, and V-41's leftover shape is closed only with C-7 (V-48a). **P4-K3, P4-K4:** Kept, and verified (V-47, V-48).

R-60. **P4-I1–P4-I6:** Kept. P4-I1 and P4-I2 are verified (V-45, V-46), and the rest weren't examined further. **P4-I7:** Corrected. K2 alone leaves V-41's shape, and the Prospect closes as Nathan ruled only together with C-7.

R-61. **P4-N1–P4-N6:** Kept.

R-62. **P4-Q1, P4-Q3:** Decided by Nathan (K2 and K4 taken). **P4-Q2:** Open (V-63). **Prototype Gates:** Kept, and re-run (V-51).
