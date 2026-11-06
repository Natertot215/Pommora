### 4 — What Each Behavior Costs

**DATE:** 11-05-2026
**COMMIT:** `b7f2f17a5`

Each behavior below was removed in a throwaway worktree, measured, and restored. Lines are production lines, formatted by Biome, excluding comments and blanks. Reds come from `Core/MarkdownPM`, `Core/Actions`, `Core/Settings`, and `Desktop`, 2,753 tests in all. Every cut typechecked clean in production across `Core` and both `Desktop` projects.

The planner's rulings replaced part of the original list. Code-block lists, Alphabetical, and Arrowed stay, so their removal isn't priced; rails stay under bullets, checklists, and lettered lists only; diff blocks stay out of parity. *§The Prices* carries what the rulings asked for in their place.

#### The Prices

**Reading The Reds:** *Pin* means the test states the behavior. *Mechanism* means it only touched the machinery, or used the behavior as a sample.

| ID | Behavior | Lines | What Leaves | Reds | What A User Would Notice |
|---|---|---|---|---|---|
| 4-T1 | **Ruled:** Markdown-only code-block parity | -11 +8 (**-3**) | Four of the six `'outside'` call sites, the deletion's read guard, `readsFrom` from `listRenumber.ts` | 2, both pin a pick in a bare code block, which the ruling makes plain code | A list in a Markdown code block takes Enter, Tab, Shift-Tab, Backspace, numbering, and picks; every other block is plain code. |
| 4-T2 | **Ruled:** `+` is a bullet, `- [] x` is a bullet, no box after an ordinal | -92 +56 (**-36**) | `drawnKind`, `listGlyphOf`, `ListGlyph`, the `bullet` field, the bullet's `box`, `Box.inner`, the cell's `{ lm, glyph }` wrapper | 9: 6 pin the old reading, 3 mechanism (a `bullet` key in an expected object) | `+` items draw as dots and gain rails, `- [] x` shows its `[]`, and `1. [x] a` shows its `[x]`. |
| 4-T3 | Re-pick of the same type lands no edit | -2 +1 (**-1**) | The `applyEdits` comparison in `listRenumber.ts` | 0; nothing tests it | A same-type re-pick would add an empty undo step. |
| 4-T4 | A pick restarts numbered items from 1 or A (includes 4-T3) | -12 +4 (**-8**) | `repicked`, `rewritten`, the `isSequenced` clause in `setList` | 3, all pin | Re-picking Numbered does nothing, so it no longer repairs a broken `1. 1. 1.` list. |
| 4-T5 | An item leaving a run recounts the run below | -27 +10 (**-17**) | `runsBelow`, `below`, the sibling walk in the filter | 4, all pin | Tab or a deleted item with children leaves gaps such as `1, 3`. |
| 4-T6 | A run keeps its start: replaced by always counting from 1 (includes 4-T3 and 4-T4) | -41 +9 (**-32**) | `arrived`, `repicked`, `settled`, the `start` rule, `renumberRuns`' two extra parameters | 11: 9 pin the start, 2 pin the restart | A list starting at 5 rewrites to 1 on the first edit that touches it. |
| 4-T7 | A run keeps its start: replaced by the first item's number | -14 +3 (**-11**) | `arrived`, `settled` | 4, all pin | Dragging a list's first item down shifts where the whole list starts. |
| 4-T8 | Preserve List-Level Formatting, keeping its on reading | -43 +16 (**-27**) | The setting and its row, `settings` from 5 functions, `siblingsAt`'s `last` | 3 pin; 16 raw before test call sites were updated | The toggle disappears, and a pick never reaches nested items. |
| 4-T9 | Preserve List-Level Formatting, keeping its off reading | -38 +10 (**-28**) | The same, except `last` stays | 5 pin; 17 raw | The toggle disappears, and a pick always rewrites everything nested and every other type beside it. |
| 4-T10 | A caret reaches its item's group (Preserve goes with it) | -58 +21 (**-37**) | The caret branch, Preserve, `settings`, `last` | 9 pin; 19 raw | A pick changes one item, and a glyph or grip pick stops converting the list. |
| 4-T11 | A selection narrows a pick to the items it touches | -38 +20 (**-18**) | The range branch, `to` from 3 functions, the `reader` fallback | 16 pin; 36 raw | Selecting lines and picking a type only acts from where the selection starts. |
| 4-T12 | A selection turns plain lines into items | -1 +2 (**+1**) | Nothing; the removal costs a line | 9, all pin | Selected paragraphs stop becoming a list. |
| 4-T13 | A continuation line answers for its item (added) | -12 +3 (**-9**) | The `open` stack, `endOf` | 3, all pin | Selecting a wrapped line and picking a type makes it an item of its own. |
| 4-T14 | A quote, code block, or math rides its item | -20 +9 (**-11**) | `openerOf` and its cases | 8, all pin | An indented code block ends the list: drags tear it off, and numbering restarts below it. |
| 4-T15 | Items a blank line apart read as one loose list | -46 +21 (**-25**) | The `blank` role, `MoveSeams`, the drag's gap reading, `Slot.line` | 12: 10 pin, 2 mechanism | `1. a`, a blank line, `1. b` stays that way, and a blank line ends the rails. |
| 4-T16 | The drag carrying loose separators, alone | -32 +14 (**-18**) | `gapBefore`, `looseSource`, `looseSlot`, `Drop.line` | 3, all pin | Dragging in a loose list leaves stray blank lines and half-tight spacing. |
| 4-T17 | Tabs and spaces read by drawn depth | -2 +2 (**0**) | Nothing | 1 pin | Mixed tabs and spaces can stop nesting the way they're drawn. |
| 4-T18 | The grip's Type submenu | -34 +9 (**-25**) | `firstItemOf`, the `list` grip context, `gripMenu`'s `scope` parameter | 6: 5 pin, 1 mechanism | A list's grip offers Delete only; its glyph and **Lists ▸** still switch type. |
| 4-T19 | The glyph's menu, keeping the grip's Type instead | -48 +32 (**-16**) | The `glyph` route in `routeRightClick`, the `glyph` grip context | 3, all pin | Right-clicking a glyph opens the ordinary menu and seats the caret there. |
| 4-T20 | A resting cell drawing its own glyphs | -127 +11 (**-116**) | `MarkerGlyph`, the cell's list layout, `claimCheckbox`, `isFiller`, `data-base`, `data-cell-line` | 10: 7 pin, 3 mechanism | Tables show raw `- a` text until clicked, and resting checkboxes stop toggling. |
| 4-T21 | A resting cell's glyph answering its own menu, alone | -9 +3 (**-6**) | The cell's glyph hit test | 1 pin | Right-clicking a glyph in a resting cell opens the ordinary menu. |
| 4-T22 | Outliner rails reading quote depth | -30 +8 (**-22**) | `quoteDepths` from the cached line facts and `railIntents` | 1 pin | With Outliner Lines on, a rail breaks at a quoted wrapped line and can run across a quote's edge. |
| 4-T23 | Backspace keeping a marker's indent under an owning item | -12 +4 (**-8**) | The owner check and 2 `takeMarker` parameters | 2: 1 pin, 1 mechanism | Backspacing a nested marker sends its text to the left margin. |
| 4-T24 | A glyph click inside a selection acts on the selection (added) | -6 +4 (**-2**) | The `glyph` parameter of `clickInside` | 2, both pin | A glyph's menu acts on its own group rather than the selection. |
| 4-T25 | The nesting cap at three levels (added) | -4 +2 (**-2**) | `MAX_NESTING_LEVEL` | 3, all pin | Tab keeps indenting past three levels. |
| 4-T26 | The whole recount filter, as an upper bound (added) | -119 +20 (**-99**) | `listRenumber.ts`, `relist`, `editEvent`, `landEdit`, `arrived`, `repicked` | 8 reds and 4 suites unloadable, so 304 tests never ran | Numbers stop updating, except on a drag. |

**Figures To Read Carefully:**

- **4-T2:** 13 lines in each column are `listMarkerText` moving to `detect.ts` so that Enter can reuse it, which puts the real churn near -79 +43 at the same net.
- **4-T8 To 4-T11:** The raw counts are mostly tests still passing the old argument, so those tests were updated mechanically in the worktree and rerun, and the table's pin counts come from that rerun. 4-T11 keeps 34 type errors in that rerun, all from one test helper's `Parameters<typeof setList>[3]` index shifting, so they're type-only and its 16 reds stand.
- **4-T12 And 4-T14:** Each raw run held one extra red, `embedAbsorb` and `citationBreakage`. Both pass alone under the same patch, so they're suite-load flakes and aren't counted.
- **4-T18:** Counted ignoring whitespace, since dropping `scope` re-indents the handler; the raw diff reads -85 +60 at the same net.

#### Shared Machinery

- **4-T27 — The Numbering Trio:** Dropping the restart, the recount below, and the kept start together costs -71 +12 (**-59**) with 14 reds, against -49 for 4-T5 and 4-T6 added up. The extra 10 lines are `mapAscending` and the old-document walk, which leave only when both callers do, and `renumberRuns` collapses to `(scan, at, scope)`. The trio also carries 4-T5's visible gaps and 4-T6's rewritten lists.
- **4-T28 — Preserve And Caret Reach:** 4-T10 already holds this pair. A caret reaching one item leaves Preserve nothing to decide, so it's -37 against -27 for Preserve alone.
- **4-T29 — Preserve And The Grip:** The two share `firstItemOf`'s pick and its `host.settings()` calls, and together they cost -75 +23 (**-52**), counted ignoring whitespace, with 20 raw reds before call sites are updated. That equals the sum, so neither makes the other cheaper.
- **4-T30 — What A Marker Is:** The two readings in 4-T2 only pay off together. With both gone, `drawnKind(lm)` equals `lm.kind`, which ends the three classifications of one marker in the decision log's Open Item 1, and `listGlyphOf` has nothing left to return null for.
- **4-T31 — Riding And Loose:** They both live in `rolesAgainst` but stack exactly additively, -66 +30 (**-36**), so they don't need to be decided together.
- **4-T32 — Parity And The Grip:** After 4-T1, the `Reader` type's `'outside'` is set by only `listReach` and `firstItemOf`. Taking 4-T18 leaves `listReach` alone.

#### What Couldn't Be Priced

- **4-T33 — Drawn Depth:** This is a rule rather than machinery, because `indentLevel` stays for drawing and for Tab. 4-T17 is the cheapest stand-in, comparing written indent instead, so its net of 0 shows there's nothing to save rather than a true removal price.
- **4-T34 — The Right-Click's Lists Submenu:** It wasn't cut. It's built from the block menu's rows, which the `/` pane needs either way, so 4-T18 and 4-T19 price the two doors that can actually leave.
- **4-T35 — Riding's Rails:** 4-T14 ends rails at an indented quote, but they still draw through indented code, because `railIntents` sees lines and no fences. A clean cut would add a fence input to the rails, so -11 is slightly generous.
- **4-T36 — The Recount Filter's Reds:** 4-T26's count is a floor, since its deletion stops 4 test files from loading.
- **4-T37 — Keeping A Start Without `arrived`:** 4-T6 and 4-T7 bracket it, but the smallest-ordinal rule without `arrived` wasn't measured.
- **4-T38 — Coverage:** Lint didn't run, and neither did `Sync`'s or the dashboard's typecheck, whose path doesn't resolve from a worktree. 4-T6 keeps `ordinalOf` for Enter, which could shrink further.

#### Approaches and Insights

**My Stance:** Take the two rulings, then cut Preserve, the grip's Type, the restart, and the rails' quote depth. Keep everything else. That's roughly -121 lines added up, which is an estimate rather than a stacked measurement, since these patches overlap in `format.ts`.

**Costs Far More Than It Gives:**

- **4-T39 — Preserve:** A personal toggle threads `settings` through five functions and every caller, for a difference three tests notice. Keep the on reading: it's today's default and the safer pick, and it lets `last` leave too.
- **4-T40 — The Grip's Type:** It's the third door to one pick, and it needs its own `firstItemOf` to get there. With Preserve, it's -52 for a menu nobody needs, since the glyph is right there.
- **4-T41 — The Restart:** It's only -8, but it's the exception to "an item already of the type is left alone". The one real loss is repairing a broken list, and retyping or Enter handles that. 4-T3 dies free with it.
- **4-T42 — Rails Reading Quote Depth:** This is my weakest call. It's -22, it sits in the per-version cache, one test pins it, and Outliner Lines is off by default. The trade is a visibly wrong rail in a quoted list, which is worth seeing on screen before it goes.

**Cheap And Worth Keeping:**

- **4-T43 — The Recount Below:** It reads like a menu detail but it's load-bearing: without it, plain Tab and plain deletion leave gaps. Don't let the trio's -59 tempt anyone.
- **4-T44 — The Kept Start:** Always-from-1 saves the most, but it rewrites text in the user's own files. A list resumed at `3.` after a paragraph becomes `1.` on the first edit, and Markdown writers do that on purpose. 4-T7 isn't an escape either, as it breaks the drag.
- **4-T45 — Loose Lists, Riding, And Selection Reach:** These are how Markdown lists actually behave, and 4-T15, 4-T14, and 4-T11 each break something a person would see in a real document.
- **4-T46 — The Resting Cell:** It's the biggest single price at -116, and it's still worth it. Raw `- a` in every table is the most visible regression on this list. Its menu alone (4-T21) saves too little to matter.
- **4-T47 — Leave Alone:** 4-T17, 4-T23, 4-T24, and 4-T25 are too small to spend a decision on.

**What Surprised Me:**

- **4-T48 — Parity Costs Less Than Nothing:** Giving Markdown blocks more behavior removes 3 lines, because the special case was the old split between gestures that read inside a block and gestures that didn't. Narrowing it to Markdown is one added line, so the pick's reach into other languages has no removal price of its own.
- **4-T49 — A Live Defect:** On today's tree, a pick inside a diff block overwrites the sign: `- removed` becomes `1. removed`, and `+ added` becomes `- [ ] added`. 4-T1 fixes that at no extra cost, and it tests `tally` rather than `signedLine`, because `signedLine` misses a diff's unsigned lines.
- **4-T50 — Two Answers To One Question:** On `1. a`, blank, `2. b`, blank, `3. c`, `blockAt` returns `1. a` alone while `siblingsAt` returns all three items. The grip and the numbering disagree about where a loose list ends. Neither is a bug alone, but it's the one real seam left between the two list owners.
- **4-T51 — An Untested Rule:** 4-T3's no-edit check is described in `Editor-Internals.md`, yet no test notices it leaving.

**Decisions The Rulings Left Open:**

- **4-T52 — `-[] x` Without A Space:** Today it's a bullet reading `x`. Under 4-T2 it's plain prose, because nothing separates the `-` from the bracket any more. The ruling only named `- [] x`, so this needs a yes.
- **4-T53 — Enter On A `+` Item:** It writes `- ` under 4-T2, and `+ [ ] a` continues as `- [ ] `, because dropping the `bullet` field is what buys the savings. The file ends up mixing `+` and `-`, drawn identically. `canonicalizeCheckbox` still writes back the typed character, so `+[]` and a space gives `+ [ ] `, which Enter then continues as `- [ ] `. Keeping the written character would keep the field.
- **4-T54 — Backspace In A Markdown Block:** From reading `takeMarker`, a caret anywhere past a marker's first character takes the whole marker, which matches a page. In a code block the marker stays visible as text, so `12|. a` losing `12. ` may read oddly. This wasn't run.

#### Patches

All live in `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/`, applied against `b7f2f17a5`:

- **4-T1:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/code-parity-markdown-only.patch`
- **4-T2:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/plus-and-empty-box.patch`
- **4-T3:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/repick-noedit-check.patch`
- **4-T4:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/repick-restart.patch`
- **4-T5:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/recount-below.patch`
- **4-T6:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/start-always-one.patch`
- **4-T7:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/start-head-ordinal.patch`
- **4-T8:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/preserve-keep-on.patch`
- **4-T9:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/preserve-keep-off.patch`
- **4-T10:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/caret-item-alone.patch`
- **4-T11:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/selection-as-caret.patch`
- **4-T12:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/selection-no-plain-lines.patch`
- **4-T13:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/selection-continuation.patch`
- **4-T14:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/constructs-ride.patch`
- **4-T15:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/loose-lists.patch`
- **4-T16:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/drag-separators.patch`
- **4-T17:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/indent-by-text.patch`
- **4-T18:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/grip-type.patch`
- **4-T19:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/glyph-menu.patch`
- **4-T20:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/cell-draws-no-list.patch`
- **4-T21:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/cell-glyph-menu.patch`
- **4-T22:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/rails-quote-depth.patch`
- **4-T23:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/backspace-indent.patch`
- **4-T24:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/glyph-on-selection.patch`
- **4-T25:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/nesting-cap.patch`
- **4-T26:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/whole-recount-filter.patch`
- **4-T27:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/numbering-trio.patch`
- **4-T29:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/pair-preserve-grip.patch`
- **4-T31:** `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/patches/pair-ride-loose.patch`
