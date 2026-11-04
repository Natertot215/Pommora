### 4 — Consolidation — Planning Report

**BASE:** `cd813afdd` · **FLOOR:** `3 — The Revised Patch.patch`. The investigation and first prototype ran on `1 — The Patch.patch`. When the revision landed, the prototype was rebased onto it, with two conflicts resolved by hand: `listReach`'s `page` local and `listRenumber`'s `repicked` loop. The gates were run again on the revision, along with the fence, drag, indented-quote, cell, and I-017 probes. The revision doesn't touch the rails' code. The revision leaves `rolesAgainst`, `siblingsAt`, `subBlockAt`, and `runAt` as patch 1 wrote them, so P4-D2 and P4-D3 hold on it unchanged. "Patched hunk" below names a function in the revision.

Probes ran through `vite-node` against the base modules (main checkout) and the patched or prototyped modules (worktree `Pommora-LGM-D`, since removed). Every "→" is observed. **Inferred** marks what isn't.

The short answer is no, there isn't a large net-negative consolidation beyond the floor. The patch already did the big fold (two writers become one, two numbering rules become one, `setListKind`, `nestedUnder`, and `subBlockAt`'s private classification all go). Beyond it there are three small folds and one floor fix. Together they cost **+15** and close I-017, the Decisions' *§Prospects* fenced-numbering bug, a drag bug that splits a code fence, and five of I-037's unscoped readers.

#### Duplicated Answers

P4-D1. **Does a line that isn't an item keep the list open above it?** Three readers answer it, and none of them shares code with the others:
- the grip's block treats it as a continuation when it's indented and not blank — `Core/MarkdownPM/Engine/blockModel.ts:45`;
- the walk does the same test on the line's text past its quote prefix — patched hunk, `rolesAgainst` (base `Core/MarkdownPM/Engine/listDragModel.ts:49`);
- the rails let only a blank line through, and treat every other non-item line as a break with nothing reset — `Core/MarkdownPM/Engine/intents.ts:382`, `:395-399`.

The rails' answer is the odd one out, and it causes two observed effects. One is I-017: `- a\n\t- b\n# H\n\t\t- c` draws rails at levels 0 and 1 on `c`. The other is new: a wrapped line breaks the rail but leaves the ancestors in place, so `- a\n  wrapped\n\t- b` draws no head on `a`, nothing on `wrapped`, and a headless elbow on `b`.

P4-D2. **Does the line hold an item on this surface?** The answer is spread across:
- `scan.markers`, which is page-shaped and reads quote prefixes — `Core/MarkdownPM/Engine/docScan.ts:83`;
- the revision's own scoped read, `page ? scan.markers[k] : parseListMarker(...)` with `const page = scope === 'page'` — patched hunk, `listReach`'s `markerAt`;
- three copies of `scope === 'page' && inSealedLine(...)` — `Core/MarkdownPM/Gestures/listDrag.ts:47`, `Core/MarkdownPM/Input/listRenumber.ts:40-41`, patched `listReach`'s `sealed`;
- `listLineAt`'s fence check — `Core/MarkdownPM/Input/edits.ts:74`.

Meanwhile `rolesAgainst`, `siblingsAt`, `subBlockAt`, and `renumberRuns` read `scan.markers` raw. Because of that, the walk takes a marker-lookalike inside a code block for an item. Observed:
- numbering, base and both patches: `- p\n\t1. x\n\t```\n\t1. y\n\t```\n\t1. z` plus Enter → `\t2. y` inside the fence;
- the drag: `\t1. x`'s branch in `- p\n\t1. x\n\t```\n\t2. y\n\t```\n- q` is `\t1. x\n\t```` (base `listDragModel.ts:49`, unchanged by either patch), so dropping it at the end splits the fence and renumbers the code: `- p\n\t1. y\n\t```\n- q\n1. x\n````.

P4-D3. **Is an indented quote under an item part of that item?** The base gave two answers. Numbering said yes, because `nestedUnder` carries it (`listDragModel.ts:168-169`), and so does the grip's list block (`blockModel.ts:45` admits it). The drag said no, because it breaks on any change in quote depth (`listDragModel.ts:45`). Both patches pick the drag's answer, which **regresses numbering**. `1. a\n  > q\n1. b` plus Enter on `b` gives `2. b\n3. ` at base, and `1. b\n2. ` on patch 1. The revision's `rolesAgainst` is the same code. CommonMark reads the quote as inside the item, as base numbering and the grip did.

P4-D4. **Which line does a resting glyph sit on?** `claimCheckbox` maps the row's `data-cell-line` index through `lineOffsetsOf(text.split('\n'))` (`Core/MarkdownPM/Tables/cellStatic.tsx:482-486`). The patch's resting glyph menu reads the same line start from the glyph's own `data-src` (patched hunk, `restingMenu`), which `MarkerGlyph` writes on every resting glyph, the checkbox seat included (`cellStatic.tsx:251`).

P4-D5. **What type is an item drawn as?** `listGlyphOf` (`Core/MarkdownPM/Engine/intents.ts:125-130`), the patch's `drawnKind` (patched hunk), and `railTypeClass` (`intents.ts:97-102`) all answer it. On every drawn marker, `railTypeClass` is a fixed map over `drawnKind`: bullet, checklist, and alphabetical draw a rail, while numbered and arrowed (`+` included) don't. They don't disagree. See P4-N4.

P4-D6. **Is the caret on a list line?** Two private functions named `listLineAt` answer different questions. `Core/MarkdownPM/Input/edits.ts:67-81` reads the raw parse, so Enter on a page's glyph-less `- [] x` continues it with `- `. `Core/MarkdownPM/Tables/CellEditor.tsx:59-63` and `atListEnd` at `:92-99` read the drawn glyph, so a cell's keys ignore the same line. See P4-N5.

#### Candidates

P4-K1. **Rails Read the List's Line Rule:**
- **Folds:** P4-D1's three continuation tests become one predicate, `continuesList(line)` ("blank or indented"), in `Engine/detect.ts`, in the slot the patch frees by deleting `nestedUnder`. `blockModel`'s `isListCont` and `rolesAgainst` read it. `railIntents`' `blank` widens to `carries`, so a wrapped line carries the rail the way a blank line already does, and a line that doesn't carry clears the ancestor stack.
- **Removes:** two inline copies of the indent regex, and the rails' private blank rule.
- **Adds:** the predicate and one `railKind.length = 0`.
- **Estimated net:** +5 (+12 / −7), no comments.
- **Closes:** I-017, by the rule its own Solution names, and the continuation gap in P4-D1. The resting cell gets the fix too, since `renderCellBody` calls the same `railIntents` (`cellStatic.tsx:289-294`).
- **Risk:** low.
  - `'a non-list line between siblings breaks the run (caps on both sides of the gap)'` (`Core/MarkdownPM/Engine/intents.test.ts:768-773`) pins the bug. It's rewritten in place as `'a wrapped line carries the rail and a line outside the list ends it, so a later indented item draws no ancestor rail'`, one test pinning both halves; the reset and the widening each turn it red on their own.
  - The rail pass already runs over the whole document on every keystroke (`intents.ts:463-467`, `:504`), and K1 keeps it a single linear pass, since calling the walk per line would be O(n²). Measured at 50,000 lines with base and K1 interleaved in one process, three runs each. With the rails calling the shared `continuesList`, it's 2.38–2.44 ms against 2.76–2.84 ms (+15%). With the same test written inline, it's 2.39 ms against 2.46 ms (+3%). Base pays the same kind of imported call through `isBlank`, so the gap isn't explained. The production bundle is **Inferred** to behave like the inline run. Inlining would cost the rails their share of the one predicate.
  - Residuals, observed. A nested item directly inside a quote after an unquoted list keeps the outer rail (`- a\n\t- b\n> \t- c` → a level-0 elbow on `c`), unchanged from base. A wrapped line inside a quoted list now ends the rails below it, where base drew a headless one. Both need the line's quote depth, which only the cached line facts could carry cheaply (P4-Q2).
- **Verdict:** take. It fixes incorrect drawing at +5, gives the continuation rule one definition across three readers, and closes I-017 by construction.

P4-K2. **One Scoped Item Read for the List Model:**
- **Folds:** `itemAt(scan, k, scope)` in the list model answers P4-D2 once. A page reads quoted items, and a marker-lookalike inside its code, math, or tables is that block's text. A cell reads its lines bare. `rolesAgainst`, `siblingsAt`, `subBlockAt`, `runAt`, `renumberRuns`, and `dropChanges` take the scope and read it, and so do `listRenumber`'s gathering, `collectBoundaries`, and `listReach`'s `markerAt`.
- **Removes:**
  - two scope compares, `listDrag.ts:47` and `listRenumber.ts:40-41`, plus the revision's `markerAt` ternary, whose `page` local `listReach`'s `sealed` now spells out;
  - `listRenumber`'s `counted` filter and `listDrag`'s `sealed` local, whose comment moves into `itemAt`'s doc (comments flat);
  - two `inSealedLine` imports;
  - the module's `parseListMarkerPrefixed as parseListMarker` alias.
- **Adds:** `itemAt`, plus `scope` on six signatures. Biome wraps `siblingsAt` and `dropChanges`, which is most of the cost. `listReach`'s `markerAt` is left a one-line alias of `itemAt`, and it can be inlined in the hunk the revising agent owns.
- **Estimated net:** +11 (+52 / −41) on the revision, comments flat, no new `= 'page'` defaults.
- **Closes:**
  - the *§Prospects* "Numbering Inside a Fenced Block" bug (→ `\t1. x … \t1. y (in the fence) … \t2. z\n\t3. w`), so there's nothing to record as a new issue;
  - the drag's fence split (the branch is now the item plus its whole fence → `- p\n- q\n1. x\n```\n2. y\n````);
  - I-037's unscoped readers at `Gestures/listDrag.ts:44`, `Input/listRenumber.ts:30`, `renumberRuns`, `dropChanges`, and `subBlockAt`.

  I-037 goes from the revision's 22 compares and 14 defaults to 21 and 14.
- **Risk:** moderate.
  - It touches the renumber, which runs on Enter, Tab, and line-joining deletes, as well as the drag and the switch.
  - `inSealedLine` is a fence read plus two binary searches (`Core/MarkdownPM/Engine/docScan.ts:384-391`, `:322-336`), called per walked line, never per keystroke.
  - 23 test lines gain a mechanical `'page'` (22 in `listDragModel.test.ts`, one at `regressionPins.test.ts:183`).
  - With K1, K3, and K4 on the revision, the full gates stayed green (P4 *§Prototype*).
- **Verdict:** take with Nathan's call. It fixes two observed bugs and removes one more compare than it adds, but it pulls the list-path half of a Deferred issue forward (P4-Q1).

P4-K3. **The Resting Checkbox Reads Its Glyph:**
- **Folds:** `claimCheckbox` takes its line start from `srcOf(seat)` the way the patch's glyph menu does (P4-D4), dropping the row-index lookup and the `text.split` it allocated per tap.
- **Removes:** four lines. **Adds:** one.
- **Estimated net:** −3.
- **Closes:** none.
- **Risk:** none. Every checkbox seat carries `data-src` (`cellStatic.tsx:251`), and all 190 Tables tests pass.
- **Verdict:** take. There's one way to find a resting glyph's line.

P4-K4. **Floor Fix: An Indented Quote Rides Its Item:**
- **Folds:** `rolesAgainst` returns `'outside'` only for a *shallower* quote depth. A deeper one falls to the continuation rule, so an indented `  > q` is nested and a column-0 `> q` is outside (P4-D3).
- **Adds:** two lines (+5 / −3).
- **Closes:** the patch's numbering regression. `1. a\n  > q\n1. b` plus Enter → `2. b\n3. `, as at base. The drag now moves the quote with its item, matching the grip's list block. It also closes a cell divergence: `- a\n  > q\n- b` in a cell now reads `b` as `a`'s sibling, where the patch dropped it.
- **Risk:** low. The `'subBlockAt does NOT swallow a top-level indented sibling across the box boundary'` pin and its siblings still pass.
- **Verdict:** take. The regression is in the floor, and the revision still carries it, so the fix belongs in the floor (P4-Q3).

#### Issues Assessed

P4-I1. **I-017:** foldable, closed by K1, observed (`- a\n\t- b\n# H\n\t\t- c` and `…para…` → no rail on `c`; `- a\n  wrapped\n\t- b` → rails through `wrapped`). Its entry should narrow to the quote-boundary shape in P4-K1's residuals rather than be deleted (P4-Q2).

P4-I2. **I-037:** partly foldable through K2, by the counts above. The rest of its Solution (`surfaces.ts`, the capability predicates, removing the 18 defaults) isn't cheaper now. The revision already took the defaults off the four pure functions (its P3-R4). The one it keeps, on `applyEditorAction`, serves the scope-blind keymap and `/` callers, which don't run through the list model. Its remaining unscoped readers are `lineBodyBefore` and `opensLine` (`Core/MarkdownPM/Input/edits.ts:702-710`), `blockDrag.ts:32`, `checkboxToggleChange`, and `tableGuard`.

P4-I3. **I-038:** not foldable. It's about the editor host's surface options (`readOnly`, `inert`, the sentinel ancestors in `Core/Pages/editorHost.tsx`), and no list reader touches them.

P4-I4. **I-069:** not foldable. `tableRegions` runs while the scan is being built (`Core/MarkdownPM/Engine/docScan.ts:72`), before any walk exists. Its fix is a row rule against the header's own indent (`Core/MarkdownPM/Engine/Tables/regions.ts:28-31`), which is a different test from "blank or indented".

P4-I5. **I-060:** not foldable. It's the UIX line-row drag description (`useLineRow`, `useDragItem`), with nothing in MarkdownPM.

P4-I6. **I-018 and I-022:** not foldable. They're heading names and fold mapping, with no list involvement.

P4-I7. ***§Prospects* "Numbering Inside a Fenced Block"** (and P1-Q4): closed by K2 (P4-D2), so the prospect is removed rather than recorded.

#### Not Worth Touching

P4-N1. **`outlineTree`, `headingSections`, and folding against the walk:** `outlineTree` (`Core/MarkdownPM/Engine/outlineTree.ts:6-19`) builds a whole tree from flat heading rows for the outline menu and autocomplete. The walk answers one item's group on demand with list-only edges (quote depth, blank lines, continuations). Building a list tree would cost O(region) per question, and nothing needs it.

P4-N2. **`BulletWidget` and `CheckboxWidget` against `MarkerGlyph`:** they're two renderers of the same markup, one a CodeMirror DOM widget (`Core/MarkdownPM/decorations.ts:155-182`) and one React (`cellStatic.tsx:240-270`), because a resting cell mounts no editor.

P4-N3. **`claimCheckbox` against `clickAction`:** having both is inherent (Scout 2's 2-C2), and their shared core is already `checkboxToggleChange`. Only the line lookup folds (K3).

P4-N4. **`railTypeClass` keyed by `drawnKind`:** a `Record<ListKind, string | null>` restates the same five answers at about +1 line and fixes nothing. The right time is the deferred prospect "Outliner rails on numbered, arrow, and `+` lists" (`.claude/Features/MarkdownPM.md:257`), which would key on the drawn type anyway.

P4-N5. **The two `listLineAt`s:** folding `edits.ts`' copy onto `itemAt` removes one compare (`edits.ts:74`), but it changes Enter inside display math (`inFenceAt` becomes `inSealedLine`) and re-bases three transforms' offsets onto the prefixed marker, on the hottest key path, for −1 line. The real divergence is parsed against drawn (`- []`, P4-D6), which is a product call rather than a consolidation.

P4-N6. **The grip's block against the walk's group:** D-1 keeps the grip at its block, which ends at a blank line (`blockModel.ts:139-145`), while a group spans one. They differ by design and now share the continuation predicate (K1).

#### Prototype

Built in a detached worktree at `cd813afdd` with the floor applied and staged, first patch 1, then rebuilt on `3 — The Revised Patch.patch`. The prototype diff (K1–K4) is saved, reverse-apply checked, at `.claude/Planning/List Glyph Menu/Scouts/Planning/4 — Consolidation Prototype.patch`, applying on top of the revision.
- **Gates on the revision:** `npm run typecheck` passes. `npm run test` gives 549 files and 9,111 passed, 2 skipped. `npm run lint` reports 1,433 files and no fixes.
- **Production:** **+15 (+70 / −55)**, comment count flat (+1 `itemAt` doc, −1 `listDrag` sealed note). Per candidate: K1 +5 (+12 / −7), K2 +11 (+52 / −41), K3 −3 (+1 / −4), K4 +2 (+5 / −3). On patch 1 the total was +16, with K2 at +12. Tests **+2 (+30 / −28)**: the one rails test rewritten, plus the mechanical scope arguments.
- **Docs, not in the patch:**
  - K1 narrows I-017 (P4-Q2).
  - K2 rewrites one sentence of `.claude/Guidelines/Editor-Internals.md:18`. "The same holds for `Engine/listDragModel.ts`, whose whole module reads the prefixed marker grammar" becomes "The list model reads every item through `itemAt`, which takes the scope."
  - I-037's counts and site list drop to 21 and 14, and the *§Prospects* entry goes.
- **Proposed pins, not added:** K2's fence numbering (`listRenumber.test.ts`, "a marker inside a code block nested in a list neither counts nor is counted") and K4's indented quote (`regressionPins.test.ts` beside `:180-185`). Each goes red without its fix, and each pins a bug that has already happened once.

#### Open Calls for Nathan

P4-Q1. **Should the list code learn which surface it's on now, instead of waiting?** I-037 is deferred until a fourth surface exists. Meanwhile, the code that counts numbers and drags items can't tell a list item from list-shaped text inside a code block, so it renumbers lines inside code and can split a code block in two when you drag the item above it. I saw both happen. Teaching that code which surface it's on fixes both, removes one net "is this the page?" check, and costs about 11 lines. **Recommended:** take it now. It's the list-path half of I-037's own solution, it adds no new defaults, and the patch already passes the surface through the switch.

P4-Q2. **What happens to I-017's remaining case?** After K1, the outliner lines stop at a heading or paragraph and run through wrapped lines. One rare shape stays wrong: a nested item inside a quote, directly after a list outside it, still draws the outer list's line. Fixing that means remembering each line's quote depth alongside what the editor already caches, about +6 more lines. **Recommended:** narrow I-017 to that shape and leave it, since it's rare and the cache change belongs with I-019's work on those same cached line facts.

P4-Q3. **Is a quote indented under a list item part of that item?** Before the patch, numbering said yes (`1. a`, an indented quote, `2. b`) and dragging said no. Both patches went with the drag, so the number after an indented quote now restarts at 1. **Recommended:** yes, it's part of the item. That's how Markdown reads it, how numbering behaved before, and how the list's grip already groups it. K4 is the two-line fix, and it should go into the floor.
