### Engine Reconciliation

**DATE:** 11-06-2026
**READ AT:** `b7f2f17a5`
**SCOPE:** The list engine: Scouts 1, 2, 4, 7, 8, and 9 and their patches, read against the ratified *Decisions & Intention* and the *Fresh-Eyes Read*. The right-click, word, and Text pane reports sit with a sibling reconciliation.
**RUN:** Claims were re-read at the tree, and behavior claims were re-run through vitest probes in a throwaway worktree, on `b7f2f17a5` and on the finished stack. The worktree is gone, nothing was committed, and the app wasn't launched. The trial's result is saved at `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/recon/Engine Stack.patch`, which applies to `b7f2f17a5` and lasts as long as the scratchpad does.

#### The Result

The patches stack. Landing *Scan Stack*, then *Numbering and Edges* rebased onto it, then *Paste Recount* as four line edits delivers B-5, B-6, B-10, B-11, all of C, D-2, D-4, F-2, and seven of F-1's nine defects at **-106 (+760 / -866)** production lines, against the -48 Scout 7 planned and the -67 Scout 9 measured alone. The full suite reads 9,145 passed, 2 skipped, and the same 5 reds *8-T31* already rules on. Every `tsc` project but the dashboard's is clean. The grammar (B-1 to B-3), the per-type record (B-7), and the callout glyph remain unbuilt, and *§Unbuilt* lists them.

---

#### The Patch Stack

Every patch applies alone to `b7f2f17a5`, so each is a whole tree rather than a step. Rebuilding each reproduced every line count the scouts reported.

| Patch | Net on `b7f2f17a5` | Holds | Standing |
|---|---|---|---|
| *Scan Per Scope* | -87 (+502 / -589) | One scan per surface, `surfaceScope` | **Lands first** |
| *Code-Block Parity Prototype* | +56 (+125 / -69) | C-1 to C-7, on today's shape | Superseded by *Scan Stack* |
| *Masked Markers* | +68 (+176 / -108) | Parity plus masking, on today's shape | Superseded by *Scan Stack* |
| *Scan Stack* | -24 (+618 / -642) | *Scan Per Scope*, parity, and masking | **Lands second**, as its step of +63 over *Scan Per Scope* |
| *Blank-Line Walks* | -48 (+632 / -680) | *Scan Stack* plus B-5 on the walks | Superseded by *Numbering and Edges* |
| *Numbering and Edges* | -67 (+209 / -276) | B-5, B-6, B-10, D-2, D-4, the rails, `blockMove.ts` | **Lands third**, rebased |
| *Paste Recount* | +7 (+10 / -3) | F-2 on today's filter | **Lands fourth**, as *9-T27*'s edits |
| *List Tree* | -26 (+680 / -706) | *Blank-Line Walks* plus the tree | Declined |

##### Where They Overlap

- **Same Work, Three Forms:** Parity exists in *Code-Block Parity Prototype*, *Masked Markers*, and *Scan Stack*. The last is the one that fits the scan change, and the other two need `regionOf`, a gated `leadOf`, and `itemAt` kept for a cell.
- **Same Ruling, Two Designs:** *Blank-Line Walks* and *Numbering and Edges* each deliver B-5, and they touch the same functions. Every line of the former's step is either inside the latter or replaced by it.
- **Same Defect, Two Cures:** The table-header defect closes through masking and through the block model's rewrite. Both land, and the rewrite's `itemAt` read becomes a plain read of the masked scan.
- **Same File, Line-Level:** *Scan Stack* and *Numbering and Edges* share 14 files. *Paste Recount* shares `listRenumber.ts`, whose filter *Numbering and Edges* rewrites.

##### Where They Conflict in Substance

| Conflict | *Scan Stack* Says | *Numbering and Edges* Says | Resolved |
|---|---|---|---|
| What `scan.markers[k]` means | An item to someone inside its own region | Read through `itemAt` with a reader | Every outside read takes the region compare. `runsAround` needs it, or a carried Markdown block's items count into the list around it |
| `firstItemOf` | Keeps it with a fence test | Removes it, sending `block.from` and `block.to` | Removed: D-2 asks for the block, and the forward rule opens a list block on an item. Fuzz: 0 of 60,000 open elsewhere |
| `Drop.line` | *Blank-Line Walks* removes it | Keeps it for `held` | Kept: the first-item start needs it |
| The block move's flags | *Blank-Line Walks*: one `spaced` boolean | `fenced` and `heals` | `fenced` and `heals`. **Observed:** on `spaced`, dropping an item that was its whole list leaves `a`, two blanks, `b`, and on `fenced` it leaves one |
| The start of a run | Smallest ordinal, with `arrived` and `settled` | The first item, with `held` for a drag | First item: **Observed:** `Y. Z. A.` recounts from A on *Blank-Line Walks* and holds on the stack |
| How rails read a line | Raw `continuesList`, through *Blank-Line Walks* | A `rides` callback, with a cell passing `continuesList` over its lines | Neither: on the scan change a resting cell holds a scan, so `railIntents` takes `scan` and reads `ridesList`, and the callback never exists |
| `readsFrom` in the filter | Gone | Kept in the deletion arm | Gone, as Scout 9 predicted: `numbered` reads `s.markers[k]`, and a deletion in a Markdown block counts |

*Blank-Line Walks* also leaves three things *Numbering and Edges* fixes. **Observed on it:** the flush-line rail still breaks, `  para` above `- a` stays one list block, and `- a` above `> - b` still swallows the quote.

##### The Landing Order

| Step | Step Delta | Cumulative | Reds in the Suite |
|---|---|---|---|
| 1. *Scan Per Scope* | -87 (+502 / -589) | -87 | 0 once its 17 test files migrate |
| 2. *Scan Stack*'s remainder | +63 (+165 / -102) | -24 (+618 / -642) | *8-T31*'s 5 |
| 3. *Numbering and Edges*, rebased | -83 | -107 | *8-T31*'s 5, with its test changes carried |
| 4. *Paste Recount*, as *9-T27*'s edits | +1 | **-106 (+760 / -866)** | *8-T31*'s 5 |

The scan change goes first because every later step then writes its signatures once. Numbering rests on masking, since its walks read a region rather than a reader. Paste goes last because its base patch sits in filter code numbering deletes. *Scan Stack* can't be split into parity and masking steps from the saved patches, so it lands as one.

##### The Trial

*Numbering and Edges* went onto *Scan Stack* with `git apply --3way`: 21 conflict hunks in 8 files, 9 of them in `listModel.ts`, plus `blockModel.ts`, which merged cleanly and then failed to compile on its `itemAt` read. None needed a new design. The translation was:

- `openerOf` keeps the scan's signature, stays private, and takes Scout 9's `?? spanAt(scan.tables, at)`.
- `ridesList(scan, k, depth)` loses its scope.
- `rolesAgainst` keeps *Scan Stack*'s `block` arm and takes Scout 9's `level` default.
- `runsAround` reads `scan.fences[k]?.from === scan.fences[i]?.from ? scan.markers[k] : null`.
- `blockContext` reads `quoteDepthOf(lines[i]) === 0 && scan.fences[i] === undefined && scan.markers[i] !== null`, or a line riding the one above.
- The filter's `numbered` reads `s.markers[k]`.
- `railIntents` takes `scan`, and `cellStatic.tsx` passes its own.

**Evidence on the Finished Stack:**

- **Suite:** 9,145 passed, 2 skipped, 5 red, and the 5 are *8-T31*'s by name.
- **Types:** `UIX`, `Core`, `Core/tsconfig.src.json`, both `Desktop` projects, and `Sync` are clean. The dashboard's doesn't resolve from a worktree.
- **Biome:** clean in `Core/MarkdownPM` apart from `noAssignInExpressions` in *Paste Recount*'s undo test helper, which needs a block body.
- **Fuzz:** 60,000 documents over items, riders, blanks, plain, Markdown, and indented fences, math, tables, and quotes: 0 where the block's end disagrees with the walk, 0 sub-blocks escaping their block, 0 list blocks opening off an item, 0 non-idempotent renumbers, and 0 throws.
- **Residue:** `Reader`, `'outside'`, `readsFrom`, `itemAt`, `firstItemOf`, `mapAscending`, and `repicked` read 0 in list code.
- **`scope`:** 230 occurrences to 78 in `Core/MarkdownPM`, and `listModel.ts` and `blockMove.ts` hold none. `listModel.ts` goes from 323 lines to 185 and `listRenumber.ts` from 89 to 48, with 98 lines in `blockMove.ts`.

##### Landing Notes

- **Comments:** the log's command reads 3,515 on the stack, 4 over its cap of 3,511. All 4 come from *Scan Stack*. The trial shortened the comments it rewrote, so the plan needs those 4 back from elsewhere, and `listRenumber.ts:12`, a second copy of *Editor-Internals* line 40, is the obvious place.
- **`Editor-Internals`:** *Numbering and Edges* rewrites its numbering entry against `b7f2f17a5`, and that text needs the scan and parity steps' wording folded in.
- **`rolesAgainst`'s Body Read:** its two arms stay one call choosing a body and a depth. Scout 8 expected them to collapse further, and passing an offset to `continuesList` is the remaining option at landing, worth one line at most.
- **`leadOf`:** `Input/edits.ts` and `Engine/blockMove.ts` each hold one, meaning different things. The private one takes another name.

---

#### Claims Corrected

| Report | Claim | What's True | Evidence |
|---|---|---|---|
| 1-T6.3 | `inSealedLine` leaves the list model, and with it the pick | It leaves `listModel.ts` and stays in `listReach`'s `outOfReach` | Read at the stack: `(region === undefined && inSealedLine(scan, k))` |
| 1-T6.3 | `outOfReach` gains the plain-fence case | It gains none, since C-5 writes in plain code | Probe: `1. - a` |
| 1-T2.6, 1-T6.5, 1-T7 | The block drag leaves stale numbers, and `moveRange` should recount | Under B-5 those are three lists | *9-T2*, re-run |
| 1-T7 | `itemAt` is how the walk reads, and `blockContext` contradicts it | Line 18 speaks of the walk, which does read `itemAt`; the block model reads apart | *2-T9* holds |
| 4-T7 | The first item's number breaks the drag | True of the bare rule; `held` repairs it | Probe: `5,6,7` keeps 5 with the last dragged up or the first dragged down |
| 4-T15, 7-T16 | `Slot.line` and `Drop.line` leave | They stay, and only the loose reader leaves | *9-T5*, and the trial |
| 4-T1, 4-T48 | Parity costs less than nothing, -3 | It costs +56 alone and +54 on the scan change, because 4-T1 predates C-5 to C-7 | Reproduced |
| 7-T15 | The fence test stays in `firstItemOf`, because a block can open on an indented Markdown fence | `firstItemOf` leaves, and no list block opens there | Probe: `code`, then `list`; fuzz: 0 |
| 7 | The stack lands at -48 | -106, since *Numbering and Edges* replaces its last step | Measured |
| 7-T2 | 228, 79, 78 mentions and 75, 22 declarations | 230, 80, 78 and 73, 20 by whole-word count; the shape holds | Recounted |
| 8-T32 | `Reader` stays, with `'outside'` keeping two readers | Both leave whole | Residue count |
| 9-T6 | A resting cell holds no scan, so rails take a callback | It holds one from the scan change, so rails take `scan` | Trial |
| 9-T21 | A stale drop's throw left with `siblingsAt` | A stale block's did. A stale slot past the document's end still throws, alone and on the stack | Probe: `Cannot read properties of undefined (reading 'level')` |
| 9-T27 | Paste after numbering nets 0 | +1, since Biome wraps the gate | Measured |
| 9, Paste | The base patch's `'outside'` reader | Leaves on the stack, and a paste in a Markdown block counts | Probe |
| 2-T19 | 43 item sites | 44 by grep, with 38 at phase 2 or 3, and A-6 removes the gate | Counted |
| 2-T22 | A bare block takes no menu pick, and the drive asserts a pick changes nothing | C-5: a pick writes its marker with no counting | The log, and the probe |

**Confirmed As Written:** the table-header blocks, `- a` over `> - b`, the flush-line rail, the hidden box, the dead callout glyph and its `setBlock` producer, `Math.min`'s throw at 130,000 rows, the diff overwrite, `-[x]` in `js`, `Y. Z. A.`, fence naming for all ten infos tried, 8-T9's quote continuation and 8-T16's callout shorthand in code, 9-T8's torn table, 9-T4's unrecounted `move.line`, the 32 reds of Scout 9's patch alone, the 17 of *Blank-Line Walks*, and 8-T31's five. A scripted pass over 89 of Scout 1's cites found each at the operative line. Benchmarks and the 4-T prices weren't re-run.

---

#### Disagreements Resolved

| Disagreement | Resolution | Why |
|---|---|---|
| **`inSealedLine`:** 1-T6.3 against 7-T14 | 7. It leaves the walks and stays in the pick | A null marker means writable plain code or sealed math, and C-5 needs the two told apart. 7 built it, and 1 inferred it |
| **A Block Drag's Numbers:** 1-T2.6 and 1-T6.5 against 9-T2 | 9. It leaves with B-5, and `moveRange` stays numbering-free | B-5 makes the case three lists. `fenced` always seats a blank on each side, so a block move can't join or split a run, which held for a whole list moved past a paragraph |
| **`Slot.line`:** 4-T15 and 7-T16 against 9-T5 | 9. It stays | 4-T15 priced it under the loose reading. B-10 keeps the start, F-1 ends the smallest-ordinal rule, and the pre-move head is the only source for a drag |
| **The Start Rule:** 4-T7 and 4-T37 against 1-T6.5 and 9-T17 | 1 and 9. The first item, with `held` for a drag | 4-T7 measured the rule alone. 4-T44's objection is to always counting from 1, which nothing proposes |
| **`firstItemOf`:** 7-T15 against 9 and D-2 | 9 | D-2 asks for the block |
| **Rails:** 1-T6.6 against 9-T6 | Neither as written. Rails take `scan` and read `ridesList` | 9's fix lands and the scan change removes its callback. 1's array removal stays unbuilt |
| **`openerOf`'s Home:** 1-T6.3 against 9-T6 | 9. Private in `listModel.ts`, behind `ridesList` | One exported answer serves the block model and the rails |
| **`moveRange`'s Home:** 1-T6.8 against 9-T11 | 9. `Engine/blockMove.ts` | `blockModel.ts` imports `listModel.ts`, so a move there is a cycle. The Fresh-Eyes Read found the same misfiling |
| **Numbering's Reach:** 4-T43's recount below against 9-T14's whole list | 9. The recount below is a subset | *§Settled* |
| **The Pick's Restart:** 1-T6.5 against D-4 | D-4. `input.list.restart` and I-073's direction drop | The restart leaves |
| **Reds:** 7's 12 against 9's 17 | Both, on different trees | 9's 17 hold 7's 12 plus D-2's and D-4's, and 7's *a pick over a numbered item restarts* is the one both count |
| **Comment Effect:** 9's "holds" against 7's +4 | 7's +4, since numbering nets 0 | Measured at 3,515 |
| **Preserve, the Grip, Rails' Depth:** 4's stance against D-1, D-2, and silence | D-1 and D-2 overrule it. `quoteDepths` stays, with no decision taking it | The log |

---

#### Settled

Each of these was open in a report, and a ruling, a stated principle, or the simplest reading answers it.

| Question | Answer | Reason |
|---|---|---|
| The grip's extent (1-T7) | The block | D-2 |
| Typed shorthands in a Markdown block (1-T7, 4-T52) | `-[]` and `->` work at a line's start | C-6 |
| Lists ▸ in plain code (1-T7) | Rows stay and write | C-5 |
| `notes.md` (1-T7, 2-T22) | Reads as Markdown | C-4 |
| Whether Preserve earns its row (1-T7) | It stays | D-1 |
| The draw path (1-T6.2) | Stays, so no glyph field and no live test | B-8 and *§Rejections* |
| Does parity draw? (2-T22) | No glyph, drag, or box click in a block | C-1 |
| The outside run (2-T22) | Steps past the block | C-2 |
| A `+` picked Bulleted (2-T23) | Stays `+` | D-4 and B-4 |
| `- [] bare` picked Checklist (2-T24) | `- [ ] [] bare` | B-1: `[] bare` is its text |
| Enter on `+` (4-T53, 1-T6.1) | Writes `-`, and `+ [ ] a` continues `- [ ] ` (**Observed on the Stack**) | B-4 |
| `+[]` (4-T53) | Writes `- [ ] ` | B-2 |
| `12\|. a` in a block (4-T54) | Takes the whole marker | *8-T6*, as on a page |
| A row picked twice in code (8, Q1) | Writes again | C-5 |
| ⌘B in code (8, Q2) | Follows its row | One Way |
| A selection crossing into plain code (8, Q3) | List picks leave the code alone, and Heading and Bold write | C-2 states the list rule, C-5's rows are unaware, and it costs no code |
| Rows on a delimiter line (8, Q4) | Refuse | A delimiter isn't code, and the broken block is a named cause |
| A nested ` ```js ` in ` ````md ` (8-T12) | Its lines read as items | C-1: lists are the only Markdown the block reads |
| Whole-list recount (9, Q1) | Yes | B-5 and B-10's "as simply as it allows": 24 fewer lines and one rule |
| `1.`, `1.`, `1.` (9, Q2) | Accepted | B-5 |
| A dragged block's number (9, Q3) | Keeps it | B-5 |
| A line above a list at 5 (9, Q4) | Lands `1.`, `2.` | The first-item rule; B-10's start belongs to the list as it stands |
| A list's first item deleted (9, Q5) | The rest keep `2.`, `3.` | B-10 |
| Option+Up, Option+Down, dragged text (9, Q6) | Outside this work, filed as an issue | No decision names them, and they need the drag's care |
| I-073 (2-T15, 9-T16) | Closes, with the drag's exception stated in `dropChanges`' comment | D-4 and *One Way* |
| I-036 (2-T11, 7-T9) | Stays open, rewritten to the surfaces' 15 compares and 6 defaults | A-3 |
| `regionOf` (7-T22) | Stays inline | A field read at 7 sites, and a wrapper adds to *Less to Carry* |
| Where the start rule's prose lives (9) | *Editor-Internals*, with `renumberRuns`' comment staying its own | *Comments* |
| The stale drop (1-T4, 9-T21) | One compare of `view.state.doc` in `beginRelocateDrag`'s `onDrop`, for both drags, removing `bStart < 0`, `tLine < 0`, and `listDrag.ts:11`'s comment | *Caution Code*: the cause is named and reachable through `mirrorBody` at `bodyMount.ts:44`, and `gripMenu.ts:164` already guards the same race |
| A glyph click inside a selection (4-T24) | The `glyph` parameter of `clickInside` leaves | D-2: a glyph acts on its group. It belongs with E-7's work, so the sibling reconciliation should agree |

Nothing in the engine's scope is left that can't be settled. Three visible changes follow from these and deserve a line in the morning report: a keystroke can correct a number elsewhere in its own list, a line added above a list at 5 restarts it at 1, and a pick over separated paragraphs lands `1.`, `1.`, `1.`.

---

#### Unbuilt

What the log requires of the engine that no patch delivers.

| Decision | What's Missing | Starting Point |
|---|---|---|
| B-1, B-2, B-3 | The grammar: `+` as a bullet, `- [] x` as text, no-space spellings as plain text, a box only after a bullet, and with them `listGlyphOf`, `drawnKind`, `ListGlyph`, the `bullet` field, `Box.inner`, and the glyph checks in `CellEditor.tsx` and `cellStatic.tsx` | *1-T6.1*, and *4-T2*'s cut at -36, which conflicts with the stack in 14 hunks across 6 files and predates B-2. It lands after step 4, since Enter's use of `bullet` is gone by then |
| B-2's shorthand | `+[]` writing `- [ ] `, whichever bullet typed it | `canonicalizeCheckbox` |
| B-3's pick | `2. [x] foo` switched to Bulleted writing a real checkbox | Falls out of the grammar: the text `[x] foo` lands `- [x] foo` |
| B-4 | The `bullet` field's removal; Enter's half is done | With the grammar |
| B-7 | The per-type record, of which `listMarkerText`'s move is the first step | *1-T6.2* |
| B-9 | `+`'s rail | Falls out of B-1 |
| D-3, D-6 | Format ▸ on the grip, and one name per type, which also retires `LIST_KINDS`' two labels | Sibling scope for the rows, and `Core/Actions/gripMenu.ts` |
| D-5 | A one-line selection acting as a caret, and the right-click's second range leaving | `listReach`, with *8-T29* needing nothing block-specific |
| F-1, the callout head | A head drawing no glyph, with `setBlock('callout')` stripping through the prefix | `pushConstruct` reading `scan.markers` (*7-T13*, *1-T6.6*) |
| F-1, `2. [x] foo` | Falls out of B-3 | With the grammar |
| A-6 | Both drives rewritten with no phase gate | *Scouts/2*, *§The Drive Rewrite* |
| A-4 | *8-T31*'s five, *7-T7*'s missing cell pins, and the Paste helper's lint | *8-T31* |
| Docs | *Editor-Internals* lines 18 and 40, `MarkdownPM.md`, and the README's drive paragraph | *Scouts/2*, *§Documentation a Consolidation Rewrites* |
| Optional | `listLevels` and `listKinds` leaving the cached line facts, once B-1 lands | *1-T6.6* |

**F-1's Nine:** the table header and the diff sign and `-[x]` close in step 2, the grip past the document's end, the run past Z, and the flush-line rail in step 3, and the block drag's numbers dissolve with B-5. The callout head and `2. [x] foo` are unbuilt.

---

#### Sources

- **Reconciled Reports:** `1 — Readers and Writers.md`, `2 — Tests, Docs, Issues, and Drives.md`, `4 — What Each Behavior Costs.md`, `7 — Scans and Structure.md`, `8 — Code-Block Parity.md`, and `9 — Blank Lines and Numbering.md`, beside this file.
- **Each Keeps Its Finding Numbers:** a report's closing table says where a dropped finding went.
