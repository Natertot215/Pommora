### List Consolidation — Investigation

**DATE:** 11-06-2026
**HEAD:** `b7f2f17a5` on `active`, read and run against that tree.
**LOG:** *List Consolidation — Decisions & Intention*, ratified 11-05-2026. Decisions are cited by number and keep the log's words.

This document is the one planning designs from. It gathers nine reconciled scout reports, *Engine Reconciliation*, *Gestures Reconciliation*, the *Fresh-Eyes Read*, and the prototypes in `Scouts/Planning/` against the log, then checks the claims the plan leans on hardest at the tree. Facts sit in *§What's True* and *§What's Built*. Intent sits in the log and in *§Phases*. Each scout report keeps its finding numbers, so `9-T14` means *Scouts/Reconciled/9*, finding T14.

**Result:** eleven phases, estimated here at a production delta of about **-190 lines** from `b7f2f17a5`, which *Implementation Plan · Net Ledger* measures at -286 as built, with section G and the new menu counted, of which **-188** is built and measured across Phases 1 to 5 and 8. The comment count peaks at 3,515 and closes at about 3,510 against the cap of 3,511 once five named comments leave. Two points wait on a live run, one word-rule departure is wider than the log wrote, and nothing blocks planning.

| Phase | Name | Production Delta | Basis |
|---|---|---|---|
| 1 | One Scan Per Surface | -87 (+502 / -589) | Built, measured |
| 2 | Markdown Code Blocks and Masked Markers | +63 (+165 / -102) | Built, measured |
| 3 | Blank Lines and Numbering | -83 | Built on the stack, measured with Phase 4 at -82 |
| 4 | Paste | +1 | Built on the stack |
| 5 | One Marker Grammar | -32 (+41 / -73) | Built on the stack in this pass, measured |
| 6 | One Set of List Keys, and the Scope's Name | About -15 | Prototype's key files read -14 on `b7f2f17a5`; the rename nets 0 |
| 7 | One Definition Per Type | About -20 | Estimated from *1-T6.2*'s sites |
| 8 | The Word Rule | -50 (+16 / -66) | Built on the stack in this pass, measured |
| 9 | Right-Click | About +12 | E-7 about -30 and D-5 about +1 from a trial; E-4 about +30 and E-2 with E-3 about +12 estimated |
| 10 | Text Properties | About +20 | Prototype's pane files read +15; G-10 and G-13 add +7; the grammar takes about 2 back |
| 11 | Drives, Docs, and Closeout | 0 | No production code |
| | **Total** | **About -190** | -188 built, about -2 estimated; a fair range is -170 to -210 |

Every delta counts as the scouts counted: `git diff -U0 -- . ':!*.test.*'`, lines beginning `+` or `-` that aren't blank and don't open with `//`, `/*`, or `*`, across `Core`, `Desktop`, `UIX`, and `Sync`, CSS included. The cumulative patches reproduced to the line (*§The Baseline*).

---

#### How This Was Checked

Runs happened in throwaway exports of `b7f2f17a5` under the scratchpad, which were removed. The repository wasn't touched and the app wasn't launched.

- **Reproduced:** every patch's line and comment count from the saved patch, then each cumulative tree from its patch: *Scan Per Scope*, *Scan Stack*, and *Engine Stack*.
- **Run:** the full suite on `b7f2f17a5` and on *Engine Stack*, every `tsc` project on the stack, `npm run typecheck` and the lint gate on the real tree at head, and Biome on the stack.
- **Built Here:** the grammar on the stack, and the tightened word rule on the stack. Neither is saved as a patch, since this pass writes one file; *§What's Built* states each exactly enough to rebuild.
- **Probed:** eight marker spellings, six picks, and three block shapes at head; the same spellings, shorthands, Enter, and picks on the grammar build; and a word differential of 3,992 readings across 50 lines.

**Marks:** each claim in *§What's True* says what this pass did with it. **Observed** was run here. **Read** was opened at the cite here. **Inferred** was reasoned, or carried from a report without re-running. A report cite after a mark names who ran it first, so `Read; Observed by 9-T7` means this pass confirmed the code and the run belongs to Scout 9.

---

#### What's True

Paths are relative to `Core/MarkdownPM/` unless they start with `Core/`, `Desktop/`, `UIX/`, or `.claude/`. Line numbers read at `b7f2f17a5`. An arrow gives a run's result.

##### Grammar and Classification

V-1. One regex parses a marker, with its box group sitting after every kind, so a box also matches after an ordinal — `Engine/detect.ts:552`. An arrow has a regex and an early return of its own — `:553`, `:574-585`. **Read.**

V-2. Spellings parse wider than Markdown reads them. → `-[ ] x` and `-[x] x` are checkboxes, `-[] x` and `- [] x` are bullets holding a box, `1.[ ] a` is ordered with content at 6, and `1. [ ] a` and `2. [x] foo` are ordered with content at 7, their box hidden in the marker's gap. **Observed.**

V-3. A marker is classified three ways. The parser gives `kind`, `listGlyphOf` gives the drawn form, and `drawnKind` gives what the menus call it — `detect.ts:552`, `Engine/intents.ts:133`, `:140`. → `+ x` parses `bullet`, draws `arrow`, and reads as `arrow` to a menu. `- [] x` parses `bullet` and draws nothing. **Observed.**

V-4. `Input/format.ts` imports `drawnKind` from the drawing module, and `CellEditor.tsx:62`, `:96` and `cellStatic.tsx:288` each repeat a glyph check — `format.ts:322`, `:329`, `:358`, `:384`. **Read.**

V-5. A switch deletes a hidden box. → `2. [x] foo` picked Bulleted lands `- foo`. **Observed.**

V-6. The typing shorthand matches `-[]`, `+[]`, and a box's other spellings at a line's start, and keeps the bullet it was typed with — `Input/edits.ts:54`, `:261`. **Read.**

V-7. `Tables/codec.ts:17-18` restates the grammar in two regexes, `BARE_MARKER` and `BARE_TASK`, to restore an empty last item GFM trimmed. `BARE_TASK` still admits `-[ ]` with no space, which B-2 reads as plain text. No report names this. **Read.**

V-8. Three other line patterns ask a different question and stay: `LIST_LINE` (`Engine/docScan.ts:105`) and `LIST_ITEM` (`:248`) ask what micromark's parser holds, and `Engine/Tables/regions.ts:28` what ends a table body. They disagree with the grammar on `*`, `1)`, `A.`, and `→` by design, and *Editor-Internals* line 44 records that letting arrows resync broke table headers. **Read;** 1-T6.9.

V-9. `codeHighlight.ts:55` colors a task marker inside a Markdown fence by GFM's rule, so `1. [ ] a` colors as a box there. **Read.**

##### The Scan and Surfaces

V-10. `MarkdownScope` is `'page' | 'cell' | 'text'`, and the same three strings are declared again as a zod enum on the menu request — `detect.ts:509`, `Core/Actions/editorMenu.ts:26`. **Read.**

V-11. The document scan takes no scope: `scan.markers` holds every line's prefixed parse whatever the surface reads — `docScan.ts:82`. A cell's model is therefore page-shaped, which *Editor-Internals* line 18 states as a constraint. **Read.**

V-12. `scope` appears 230 times in production `Core/MarkdownPM`, with 73 declarations, 22 bare compares, and 15 `= 'page'` defaults. **Inferred;** 7-T2, *Engine Reconciliation*.

V-13. `docScan` has about 100 production sites, about 45 of them on a surface that can be a cell or a Text value, many holding no scope to pass — `caret.ts:60`, `Links/pasteLink.ts:112`, `Citations/citationPointer.ts:55`, `Gestures/blockDrag.ts:31`. **Inferred;** 7-T1.

V-14. `perScopedDoc` already keys derivations by scope — `docCache.ts:75`, `:84`. **Read.**

V-15. `readsLists` decides whether a line reads a marker on the intent path, the list model's path, and the shorthand's — `detect.ts:511`, `intents.ts:663`, `listModel.ts:59`, `edits.ts:268`. **Read.**

##### Structure and Walks

V-16. A list's end has three readers. `blockContext` stops at a blank — `Engine/blockModel.ts:45-60`. `rolesAgainst` walks past one — `Engine/listModel.ts:66`, `detect.ts:566`. `railIntents` reads raw lines — `intents.ts:387`, `:402`. → `- a`, blank, `- b`, blank, a tabbed `- c` gives three list blocks at 0, 5, and 10, while `siblingsAt` on `b` returns lines 0 and 2. **Observed.**

V-17. The block model reads raw `markers` through `openerOf`, with no table or quote filter — `blockModel.ts:45`. → `- x`, `→ a | b`, `--|--`, `| 1 | 2 |` gives a list block `{0, 11}`. → `- a`, `> - b`, `> - c` gives a list block `{0, 15}`, so a grip's Delete takes the quote. **Observed.**

V-18. `itemAt` and `readsFrom` filter fences, math, and tables by a `Reader` of a line number or `'outside'`, and a cell reparses on each call — `listModel.ts:41`, `:53`. `tableGuard.ts:39` reads raw `scan.markers`. **Read.**

V-19. `firstItemOf` loops until `itemAt` isn't null and stops only because `scan.markers[n]` is undefined — `Menus/gripMenu.ts:61-65`. **Read;** Traced by 1-T4.

V-20. `rebuildMove`, `moveRange`, `Slot`, and `leadOf` sit in `listModel.ts` though `moveRange` serves every non-list block drag and the outline's heading move — `listModel.ts:150`, `:320`, `Gestures/blockDrag.ts:83`, `Core/Pages/pageEditor.ts:52`. **Read.**

V-21. A carried Markdown fence's indent counts as nesting, since `indentLevel` measures the whole lead — `detect.ts:523`. **Read;** Observed by 8-T1.

V-22. A flush line inside a block an item carries breaks the rails, because `railIntents` reads the raw line where the walk reads the block's opener — `intents.ts:402`. **Read;** Observed by 1-T2.3.

##### Numbering

V-23. Numbers count in `listRenumber`, a transaction filter running for `input.list` and `delete` — `Input/listRenumber.ts:13-17`. `input.paste` isn't read, so a paste leaves stale numbers. **Read.**

V-24. The filter walks the old document, infers a re-pick from a whole-marker geometry, and carries `arrived`, `rewritten`, `runsBelow`, `mapAscending`, and a `{}` cancel — `listRenumber.ts:21-58`. **Read.**

V-25. Enter counts for itself, against the "one writer" statement in *Editor-Internals* line 40 — `edits.ts:88`. **Read.**

V-26. A run's start is the smallest ordinal — `listModel.ts:282`. The spread throws at 130,000 rows. **Read;** Observed by 1-T6.5.

V-27. A drag builds, renumbers, and diffs its own document — `listModel.ts:293`. `moveRange` doesn't renumber — `:320`. **Read.**

V-28. `bStart < 0` and `tLine < 0` are the only stale-document handling a drag has, and `beginRelocateDrag` carries no document compare, while `mirrorBody` can move the document mid-drag — `listModel.ts:180`, `:185`, `Gestures/editorGesture.ts:92`, `Core/Pages/bodyMount.ts:44`. `gripMenu.ts:164` already guards the same race. **Read;** Traced by 1-T4.

##### Picks and Menus

V-29. `setList` is the one type switch, and `editFor` routes the glyph, Lists ▸, the grip, and the `/` menu into it — `format.ts:364`. **Read;** *Fresh-Eyes Read*.

V-30. `listReach` is the single answer for a pick's reach, and the one reader of `preserveListLevels` — `format.ts:302`, `:323`. **Read.**

V-31. A re-pick writes over any sequenced marker, and the filter restarts that run — `format.ts:363`, `:384`. **Read.**

V-32. The grip's Type ▸ acts through `firstItemOf`, as its first item's glyph does, so Preserve decides its reach — `gripMenu.ts:60-65`. **Read.**

V-33. `LIST_KINDS` gives each type two labels, so the `/` menu and Lists ▸ read Bullet List and Task List where the glyph menu and grip read Bulleted and Checklist — `Core/Actions/gripMenu.ts:35-52`, `Core/Actions/blockMenu.ts:28`. **Read.**

V-34. The general menu holds Lists ▸ beside an inline Format ▸ — `Core/Actions/editorMenu.ts:147`, `:162`. The grip's list row reads Type — `Core/Actions/gripMenu.ts:74-75`. **Read.**

##### Code Blocks

V-35. The fence's own reading already says what a block is: `FenceInfo.name === 'Markdown'` with no `tally`. `md`, `markdown`, and `notes.md` read as Markdown, and `md diff`, no language, and `mdx` don't — `Engine/codeLangs.ts:65`, `detect.ts:104-115`. **Read;** Observed by 1-T6.3 and 8-T13.

V-36. A code block's list is read by a pick in any language and by no key in any language. `listReach` reads from the anchor line, while `listLineAt` and `smartBackspace` read from `'outside'` — `format.ts:311`, `edits.ts:68`, `:240`. **Read.**

V-37. A pick inside a diff overwrites the sign. → ` ```diff `, `- removed` picked Numbered lands `1. removed`. **Observed.**

V-38. `canonicalizeCheckbox` reads no fence. → `-[x]` plus a space in a ` ```js ` block rewrites to `- [x] `. **Observed.**

V-39. Three typing defects sit past the log's named ones: `continueBlockquoteOnEnter` writes `> ` in any fence (`edits.ts:96`), `calloutShorthand` reads no fence (`:114`), and `punctuation`'s third-mark arm runs before its literal check (`:769`). **Read;** Observed by 8-T9, 8-T16.

V-40. `toggleInline` and `link:insert` refuse on a fenced line — `format.ts:114`, `:174`. `blockQueryAt` closes the `/` menu in code — `Menus/blockQuery.ts:19`. **Read.**

##### Right-Click

V-41. Every surface's right-click routes through `routeRightClick`, which carries two ranges: `from, to` for the click, and `start, end` for the word — `Menus/menu.ts:50-99`. List rows act on the first and every other row on the second — `:96-97`. **Read.**

V-42. The seat is a bare dispatch, so `seatPastMarker` never runs and rows act on the pre-filter range — `menu.ts:133`, `decorations.ts:788-790`. → At a numbered marker's end Bold writes `1.**** one`. **Read;** Observed by 3-T15.

V-43. A page's reply requires `view.state.doc === opened`, which a link settle's `setTimeout(collapse, 0)` defeats, so a pick is dropped — `menu.ts:140`, `Links/linkSettle.ts:167`. **Read;** Observed by 3-T14.

V-44. A resting cell has no `EditorView`: its menu runs `caretPositionFromPoint`, reads a throwaway `EditorState` for the word, seats through the DOM selection, and swaps the role rows for renderer-answered Cut, Copy, and Paste — `Tables/cellStatic.tsx:551-588`, `:439-443`, `Desktop/Actions/editorMenu.ts:77-97`. **Read.**

V-45. A right press on a resting cell is defaulted away, which keeps focus and the Press Seat out of the cell — `cellStatic.tsx:639`. **Read;** Observed live by 5-T46.

V-46. Chromium seats twice: a caret at `mousedown` and a word at `contextmenu`, and the second fires only where the selection doesn't hold the click. **Inferred;** Observed live by 5-T1, 5-T6.

V-47. `markdown-pm.css:1168` clears `::selection` under `.cm-content`, and a resting cell draws inside the page's `.cm-content`, so a seated word paints nothing unless Use Native Highlighting is on. **Read;** Observed live by 5-T22, 5-T38.

V-48. After a dismissed resting menu, the DOM range stays in the cell and typing goes nowhere. `routeRightClick`'s reply returns on a null action — `menu.ts:95`. **Read;** Observed live by 5-T51.

V-49. `--text-selection` at `UIX/Theme/caret.css:12` is the one definition of the selection color, read by the pills and a table's rectangle — `markdown-pm.css:1166`. **Read.**

V-50. Main parks an ask until Chromium's `context-menu`, and `atClick` compares coordinates to match them — `Desktop/Actions/editorMenu.ts:30-54`. The mismatch state was reached only by injection. **Read;** Observed live by 5-T48.

##### Read-Only Surfaces

V-51. A read-only editor returns early from the menu, and a resting cell does the same — `menu.ts:106`, `cellStatic.tsx:605`. Main then shows system rows wherever `params.isEditable` holds, and `EditorState.readOnly` leaves `contenteditable="true"`, so a read-only page offers Undo through Paste — `Desktop/Actions/editorMenu.ts:82-97`, `:136`. **Read.**

V-52. `resting`'s presence means "this surface isn't editable" to main — `Desktop/Actions/editorMenu.ts:77`, `:97`, `:136`. **Read.**

V-53. The info pane sits inside a `PickerMenu` layer that cancels the event, so Chromium sends no `context-menu` — `UIX/Pickers/PickerMenu.tsx:332`, `Core/Info/InfoButton.tsx:87`. `ValueEditor.tsx:196-200` already stops the same bubble. **Read.**

V-54. `format` on the host is absent only for inert hosts — `api.ts:191`, `Core/Pages/editorHost.tsx:106`. **Read.**

##### Words

V-55. Word gestures run through joined-word atoms and wrapped commands: `joins`, `JOINED`, `grouping`, `wordPress`, `joinedWords`, `wordGestures`, `DELETES`, `GROUPS`, and `byWords` — `Input/markdownInput.ts:295-355`. **Read.**

V-56. `joins` admits `_`, so `a'_b` and `a_'b` read whole, against E-5's letter or digit. **Observed.**

V-57. CodeMirror takes one word-character answer per gesture, from position alone. `byGroup`, `groupAt`, `deleteByGroup`, and `state.wordAt` each call `charCategorizer(pos)` once and scan with it — `@codemirror/view` `index.js:3584`, `:3679`, `@codemirror/commands` `index.js:1224`, `@codemirror/state` `index.js:2827`, at 6.43.1, 6.10.3, and 6.6.0. **Read.**

V-58. A resting cell reads its word from a bare `EditorState.create({ doc: text })`, so a rule carried by editor configuration won't reach it unaided — `cellStatic.tsx:574`. **Read.**

##### Text Properties

V-59. A pane and a one-line field are the same `ValueEditor` at `scope: 'text'`, told apart by `oneLine` — `Core/Properties/Pickers/ValueEditor.tsx:61`, `:93`, `:96`, `:124-139`. **Read.**

V-60. Enter saves and closes the pane, Shift-Enter breaks a line, and Tab is held — `ValueEditor.tsx:126-137`. **Read.**

V-61. A resting value draws every line through `renderCellContent` and hides all but the first, so `milk`, `eggs` shows `milk` with no mark — `Core/Properties/Cells/TextCell.tsx:76-81`, `UIX/Table/table.css:251`. **Read.**

V-62. The list keys are written twice, in `Input/markdownInput.ts:283-287` and `Tables/CellEditor.tsx:186-231`, and `editorBase` holds neither — `surface.ts:95-101`. **Read.**

V-63. `blockGestures` returns nothing for `'text'`, the menu's third arm drops Lists ▸, and the grip's cell geometry lives in `markdown-tables.css:193-196`, which loads only by a dynamic import — `surface.ts:42`, `Core/Actions/editorMenu.ts:168`. **Read;** 6-T3.

V-64. `autocomplete.ts:105` tests `scope !== 'cell'` where the rule means `scope === 'page'`, so Text takes a page's embed reading. **Read.**

V-65. A YAML sequence under a Text key reads as `[item, two]`, and `writtenSpelling` keeps `raw` wherever `asText(raw) === next`, which is what holds the shape on disk — `Core/Properties/propertyValue.ts:40`, `:181`, `Core/Nexus/governedRoot.ts:73`. **Read;** round trip in the log's *§Sources*.

V-66. A Text value holds no `claimCheckbox`, so a press on a box at rest falls through to the value's own click. **Read;** 6-T33.

##### Tests, Drives, and Docs

V-67. `b7f2f17a5` passes 9,121 tests with 2 skipped in 549 files. `npm run typecheck` and the lint gate pass. **Observed.**

V-68. The List Types Drive calls `phasedItem` with `POMMORA_LGM_LANDED`, whose default is 0, so 38 of its 44 `item(` sites print `AWAIT` and can't fail — `.claude/scripts/List Types Drive/live-drive.mjs:12`. The Text Property Drive holds no gate. The Path Links Drive also calls `phasedItem`, so the helper stays. **Read;** count by 2-T19.

V-69. The List Types Drive covers the type switch alone: no Enter, Tab, Backspace, drag, rails, or renumber. **Inferred;** 2-T17.

V-70. Drop geometry, the rail's draw, a list row's Delete, and a glyph drag in a cell have no pin — `Gestures/listDrag.ts:33`. **Inferred;** 2-T8.

V-71. `.claude/Guidelines/Editor-Internals.md:40` and the comment at `Input/listRenumber.ts:12` state the numbering design twice, near sentence for sentence. **Read.**

V-72. NexusOS holds items separated by a blank line in 24 files, 9 of them numbered, and no alphabetical, arrowed, `+`, empty-box, or quoted items in human-written files. **Inferred;** log *§Sources*.

---

#### What's Built

Every patch in `Scouts/Planning/` applies to `b7f2f17a5` on its own, so each is a whole tree rather than a step. Comments count by the log's command. **Status** reads against the log: *Lands* means the work carries it, *Superseded* names what replaced it, and *Declined* points at a ruling.

##### The Prototypes

| Patch | Net on `b7f2f17a5` | Comments | Proves | Status |
|---|---|---|---|---|
| *Scan Per Scope* | -87 (+502 / -589) | +1 | B-11: one scan per surface through the `surfaceScope` facet, across 43 production files, with 0 behavior reds in `Core/MarkdownPM` after 17 test files migrate | **Lands,** Phase 1 |
| *Code-Block Parity Prototype* | +56 (+125 / -69) | +5 | C-1 to C-7 on today's shape: two readings carry the whole section, and the host contract doesn't change | Superseded by *Scan Stack*, which needs no `regionOf`, gated `leadOf`, or kept `itemAt` |
| *Masked Markers* | +68 (+176 / -108) | +5 | Parity plus masking on today's shape, and the cost of skipping the scan change | Superseded by *Scan Stack* |
| *Scan Stack* | -24 (+618 / -642) | +4 | *Scan Per Scope*, parity, and masking together: `Reader`, `'outside'`, `readsFrom`, `itemAt`, and `blockPrefix` leave, and a null marker becomes the one answer | **Lands,** Phase 2, as its step of +63 (+165 / -102) |
| *Blank-Line Walks* | -48 (+632 / -680) | +4 | B-5 on the walks alone | Superseded by *Numbering and Edges*. **Observed by** *Engine Reconciliation:* it leaves the flush-line rail, `  para` above `- a`, and `- a` above `> - b` unfixed |
| *Numbering and Edges* | -67 (+209 / -276) | 0 | B-5, B-6, B-10, D-2's grip, D-4, the rails, `blockMove.ts`, and five of F-1's defects | **Lands,** Phase 3, rebased as -83 |
| *Paste Recount* | +7 (+10 / -3) | 0 | F-2: one more event at the filter's gate, and a shape test | **Lands,** Phase 4, as *9-T27*'s four edits, +1 |
| *List Tree* | -26 (+680 / -706) | +5 | A list tree's price: +22 on the walks and 2 ms per list edit at 20,000 lines | Declined, *§Rejections* |
| *Engine Stack* | **-106 (+760 / -866)** | +4 | The trial landing of Phases 1 to 4, saved as one patch with its tests and `Editor-Internals` entry | **The reference tree** for Phases 1 to 4 |
| *Word Rule Prototype* | -51 (+14 / -65) | +1 | E-6's mechanism: `wordChars` by position in place of atoms, passing every word test | **Lands with the corrections below,** Phase 8 |
| *Text Pane Prototype* | +1 (+138 / -137) | +1 | G-1 to G-3 and G-7's mark through a shared scope and `listKeys`. It predates G-10 and G-13 | **Lands in two parts,** Phases 6 and 10, and needs rebasing |

**Counting Note:** *6-T14* gives the Text Pane Prototype as +6 (+156 / -150), which is every changed line. By the rule all other figures use it reads +1, and the "about +13" with G-10 and G-13 reads about +8.

##### What the Engine Stack Delivers

**Observed Here:** the patch applies to `b7f2f17a5` with `git apply --index`. The suite reads 9,145 passed, 5 failed, 2 skipped in 550 files, and the five are *8-T31*'s by name. `UIX`, `Core`, `Core/tsconfig.src.json`, both `Desktop` projects, and `Sync` are clean. Biome reports one error, `noAssignInExpressions` at `Input/listRenumber.test.ts:252`, *Paste Recount*'s test helper. `no-wrapped-comments --scan` prints nothing. `Reader`, `'outside'`, `readsFrom`, `itemAt`, `firstItemOf`, `mapAscending`, `repicked`, `arrived`, `runsBelow`, `runAt`, and `blockPrefix` read 0 in production `Core/MarkdownPM`. `inSealedLine` stands in `listReach`.

**Carried From Reports, Not Re-Run:** the 60,000-document fuzz with 0 disagreements (9-T7), the rescan property at 6,000 seeds (7-T12), and the 20,000-line timings (7-T8, 9-T28).

**Delivers:** B-4's Enter half, B-5, B-6, B-10, B-11, C-1 to C-7, D-2's grip reach and unchecked mixed block, D-4, F-2, and seven of F-1's nine defects. The table header and the diff sign and `-[x]` close in Phase 2. The grip past the document's end, the run past Z, and the flush-line rail close in Phase 3. The block drag's numbers dissolve with B-5.

##### The Grammar on the Stack

**Built Here:** `Removal Trials/plus-and-empty-box.patch` (4-T2) conflicts with the stack in 14 hunks across 6 files and predates B-2. Resolved onto the stack and widened to B-2, it reads **-32 (+41 / -73)**, comments **-3 (+2 / -5)**, 6 files, typecheck clean. It was taken in these steps, so it can be rebuilt:

- **The Regex:** `/^([ \t]*)(?:(\d+|[A-Z])\.|[-+](?:[ \t]+(\[([ xX])\]))?)([ \t]+)(.*)$/d`, with `[ \t]+` before the box where 4-T2 kept `[ \t]*`. That one character delivers B-2.
- **`ListMarker`:** `bullet`, the bullet's `box?`, and `Box.inner` leave, and `checked` reads `m[4] !== ' '`.
- **`intents.ts`:** `ListGlyph`, `listGlyphOf`, and `drawnKind` leave. `railTypeClass` tests `kind === 'bullet'`. `pushConstruct` reads `lm.kind`, and `textMarkerClass` names the class a text marker and a resting glyph share.
- **`format.ts`:** `drawnKind(lm)` becomes `lm.kind` at its three sites, and the import from `Engine/intents` leaves.
- **`CellEditor.tsx`:** `listLineAt` returns `scan.markers[...]`, and `atListEnd` tests `scan.markers[i]`.
- **`cellStatic.tsx`:** the `{ lm, glyph }` projection leaves, and `renderCellBody` reads `markers` directly.
- **`edits.ts`:** `shorthandCheckboxRe` stops capturing the bullet, and `canonicalizeCheckbox` writes `- `.

**Observed on That Build:**

| Input | Reads |
|---|---|
| `+ x` | bullet, content at 2, checks Bulleted |
| `- [] x` | bullet, content at 2, so its text is `[] x`; checks Bulleted |
| `-[] x`, `-[ ] x`, `-[x] x`, `1.[ ] a` | plain text |
| `1. [ ] a`, `2. [x] foo` | ordered, content at 3, the box shown as text |
| `- [ ] a`, `+ [x] a` | checkbox, content at 6 |
| `* a`, `1) a` | plain text |
| `→ a`, `A. a` | arrow, alphabetical |
| `+[]`, `-[]`, `-[x]`, `  +[x]` plus a space | `- [ ] `, `- [ ] `, `- [x] `, `  - [x] ` |
| Enter on `+ a`, `+ [ ] a`, `9. a` | `- `, `- [ ] `, `10. ` |
| `2. [x] foo` picked Bulleted | `- [x] foo` |
| `+ a` picked Bulleted | stays `+ a` |
| `- [] x` picked Checklist | `- [ ] [] x` |

**Reds:** 14 in the full suite, *8-T31*'s five plus nine the grammar turns, all named by 2-T23 and 2-T24 and none a regression:

| Test | Decision |
|---|---|
| `Engine/detect.test.ts`, "bullet: ranges + level", "checkbox: bracket span", "arrow: `→ ` is a list marker" | Shape only: the record loses `bullet` and `Box.inner` |
| `Engine/detect.test.ts`, "empty [] is a bullet (box present…)" | B-1, B-2 |
| `Engine/intents.test.ts`, "plus item with no text", "plus list → marker kept as literal source" | B-1 |
| `Engine/intents.test.ts`, "rails are scoped to bullets, checkboxes, and letters" | B-9 |
| `Tables/cellLists.test.tsx`, "calls a bullet carrying an empty box prose", "treats a marker nothing draws as prose" | B-1 |

**A Pin to Add:** no test holds `+[]` plus a space writing `- [ ] `.

**Beyond 4-T2:** B-1's "one classification" also reaches `Tables/codec.ts:17-18` (V-7). Phase 7 takes it.

##### The Word Rule

**What the Saved Patch Needs:**

- **`_` Joins Against E-5:** its test reads `[\p{L}\p{N}_]['’][\p{L}\p{N}_]`, so `a'_b` reads whole.
- **The Window Is Quadratic:** `/[…]*\s*$/u` is unanchored. *Gestures Reconciliation* ran a 100,000-character run at 21 s and the same shape over spaces at 11 s after a lookbehind.
- **An Unused Import:** `isWordChar` stays imported in `markdownInput.ts`, and lint refuses it. `Input/edits.ts` keeps its own use.
- **The Window Is Wider Than the Mechanism:** it tests the whole token at a position, so a position standing outside a quote mark answers yes.

**The Tightened Rule, Built Here:** a position answers yes when a walk from it, left or right, across any space and over letters, digits, and `_`, reaches an apostrophe with a letter or digit on both sides. One sticky regex states it and needs no slicing, which makes it linear in the line:

```ts
const CONTRACTION_REACH =
  /(?=\s*[\p{L}\p{N}_]*(?<=[\p{L}\p{N}])['’][\p{L}\p{N}])|(?<=[\p{L}\p{N}]['’](?=[\p{L}\p{N}])[\p{L}\p{N}_]*\s*)/uy

export const contractions = EditorState.languageData.of((state, pos) => {
  const { from, text } = state.doc.lineAt(pos)
  CONTRACTION_REACH.lastIndex = pos - from
  return CONTRACTION_REACH.test(text) ? [{ wordChars: "'’" }] : []
})
```

**Observed on the Stack:** **-50 (+16 / -66)**, comments +1 (+2 / -1), with `surface.ts` resolved by hand (`typedInput` beside `contractions`) and `isWordChar`'s import gone. `textScope`, `editorMenu`, and `cellRestingMenu` pass, 75 tests in 5 files, and Core's source project typechecks. The reconciliation's pins hold: `say 'don't' now` reads 4 to 11, `a'_b` reads `a`, and `students' don't` and `don't 'quoted'` land at 0 and 14. A 100,000-character run reads in about 1 ms, and 100,000 spaces in about 0.5 ms.

**The Differential:** 3,992 readings over 50 lines, each position taking group left and right, group deletion both ways, a double-click on both sides, and a right-click on both sides, against today's tree.

| Reading | Differ From Today |
|---|---|
| The saved window | 691 |
| The tightened rule | 643 |
| Readings the tightening returns to today | 104 |
| `a'_b` and `a_'b` changing to read `a`, as E-5 asks | 56 of the 643 |
| Astral letters joining, shape C | 22 of the 643 |

**What the Tightening Returns:** every position strictly outside a quote mark. Before an opening quote and past a closing one the walk stops at the mark, so it never reaches the apostrophe. `'don't'` at 0 and 7, `x 'don't` in its gap, and `don't' y` in its gap all read as today. A press on a closing quote's far side reads `'` or nothing, as today.

**What Stays, and Why:** the remaining 565 are forced, and they are the departures *Gestures Reconciliation* named, shapes A and B. One position serves both directions and CodeMirror asks once, so any position whose left or right walk crosses a contraction has to answer yes, and that answer applies to the whole scan. Inside `'don't'` the outer quotes ride. At `students'| don't` a group right must cross `don't` whole, so the same answer carries `students'` whole on a group left. The result is narrower than the saved prototype and no narrower than one answer per gesture allows.

**Pins to Add:** beside the three in *Gestures Reconciliation*, a group right from 0 in `'don't'` lands at 1, and from 1 in `x 'don't` lands at 3.

##### The Trials That Ran and Weren't Saved

- **One Range (*Gestures Reconciliation*):** D-5's route, `menu.ts` +17 / -20, `cellStatic.tsx` +5 / -2, `format.ts` +2 / -1. 8,181 tests pass and `listRenumber.test.ts:83` falls.
- **Section G (*6-T24*, *6-T35*):** the Text Pane Prototype with G-10's keys and G-13's `asText`. Three `TextPane.test.tsx` pins fall.
- **The Key Merge Against the Stack (Here):** *Text Pane Prototype* onto *Engine Stack* by `git apply --3way` gives 9 conflict hunks in 6 files: `CellEditor.tsx` 3, `surface.ts` 2, and one each in `autocomplete.ts`, `markdownInput.ts`, `cellStatic.tsx`, and `ValueEditor.tsx`. *Word Rule Prototype* gives 1 hunk, the `surface.ts` line above. Three of the nine are `CellEditor.tsx`'s `listGlyphOf` checks, which Phase 5 removes first.

##### The Removal Trials

`Scouts/Planning/Removal Trials/` holds 29 prices, each one behavior cut alone from `b7f2f17a5` before the log was ratified. A price measures that cut and doesn't stack. All 29 read as *Scouts/4* reported.

| Trial | ID | Net | Status Against the Log |
|---|---|---|---|
| `plus-and-empty-box` | 4-T2 | -36 | **The grammar's guide.** Lands as -32 on the stack, above |
| `glyph-on-selection` | 4-T24 | -2 | **Taken** with Phase 9, under D-2 |
| `whole-recount-filter` | 4-T26 | -99 | An upper bound only. B-10 keeps the filter |
| `cell-draws-no-list`, `cell-glyph-menu` | 4-T20, 4-T21 | -116, -6 | Kept by G-3 and E-1 |
| `preserve-keep-on`, `preserve-keep-off`, `caret-item-alone`, `pair-preserve-grip` | 4-T8, 4-T9, 4-T10, 4-T29 | -27, -28, -37, -52 | Overruled by D-1 |
| `grip-type`, `glyph-menu` | 4-T18, 4-T19 | -25, -16 | Overruled by D-2 and D-3 |
| `recount-below`, `start-always-one`, `numbering-trio` | 4-T5, 4-T6, 4-T27 | -17, -32, -59 | Overruled by B-10 |
| `start-head-ordinal` | 4-T7 | -11 | Superseded: the first-item rule lands with `held` (9-T18) |
| `repick-noedit-check`, `repick-restart` | 4-T3, 4-T4 | -1, -8 | Superseded by Phase 3, under D-4 |
| `loose-lists`, `drag-separators` | 4-T15, 4-T16 | -25, -18 | Superseded by Phase 3, where `Slot.line` stays |
| `selection-as-caret`, `selection-no-plain-lines`, `selection-continuation`, `constructs-ride`, `pair-ride-loose` | 4-T11 to 4-T14, 4-T31 | -18, +1, -9, -11, -36 | Overruled by B-6 and B-10 |
| `code-parity-markdown-only` | 4-T1 | -3 | Superseded: it predates C-5 to C-7 |
| `indent-by-text`, `backspace-indent`, `nesting-cap`, `rails-quote-depth` | 4-T17, 4-T23, 4-T25, 4-T22 | 0, -8, -2, -22 | Declined: too small, or no decision takes them |

---

#### What's Reusable

Each row already exists at `b7f2f17a5`, and the work reads or adjusts it rather than building a second.

| What | Where | Serves |
|---|---|---|
| `perScopedDoc` | `docCache.ts:75` | B-11: `docScan`, `docLineIntentsOf`, and `docAtomics` become three instances of one keyed derivation |
| `parseListMarker`'s `offset` | `detect.ts:572` | C-1: a level measured from the fence's body with spans still line-relative |
| `fenceBodyStart` | `detect.ts:153` | C-1: where a fenced line's text begins |
| `FenceInfo.name` and `tally` | `detect.ts:104-115` | C-4: the whole Markdown test, with no new reading of the fence |
| `signSeatAt` | `Engine/docScan.ts:338` | C-7: where a diff line's code starts, already serving the caret |
| `scan.quotes` | `Engine/docScan.ts` | 8-T9: a top-level fence already owns its bytes there |
| `inSealedLine` | `Engine/docScan.ts:376` | C-5: tells sealed math from writable plain code, and keeps the `/` menu closed |
| `openerOf` | `listModel.ts:48` | B-6: already reads a fence or math as its opener, and takes tables with one more `??` |
| `rolesAgainst`, `subBlockAt`, `ownersOf` | `listModel.ts:66-127` | B-5, B-6: the one statement of how a line reads to an item |
| `renumberRun`, `ordinalText` | `listModel.ts`, `detect.ts` | B-10, F-1: `ordinalText` already wraps past Z |
| `landEdit` | `Input/listRenumber.ts:80` | A resting cell's write through the real filter, and the suite's adapter |
| `editFor` | `format.ts` | One action table for the menu, the grip, and rest |
| `seatPastMarker` | `intents.ts:617` | E-7: a pointer's seat, reached by seating with `select.pointer` |
| `citationSeatAt`, `embedSeatAt` defaults | `Citations/citationActions.ts:36`, `Embeds/embedInsert.ts:34` | D-5: both already default to the selection |
| `--text-selection` | `UIX/Theme/caret.css:12` | E-3's color |
| `keepSeatedSelection`'s refusal | `menu.ts:44-46` | E-2: stops the Menu Seat once a resting word stops being a real selection |
| `RESTING_EDITS`, `restingEditItems` | `Core/Actions/editorMenu.ts:52-58` | E-4: Copy's row, off with nothing selected |
| The bubble stop | `ValueEditor.tsx:196-200` | E-4: the info pane's `Entry` wraps its editor the same way |
| CodeMirror's `selectAll` | `@codemirror/commands` | E-4: Select All acts on the surface, where a native one acts on focus (5-T37) |
| `EditorState.languageData`, `charCategorizer` | `@codemirror/state` | E-6: every group command honors the answer with no wrapper |
| `blockGestures`, `editorBase` | `surface.ts:36`, `:83` | G-9: a list-reading scope brings drag, renumbering, grips, and the menu with no pane code |
| `MarkerGlyph`, `renderCellContent` | `cellStatic.tsx:245` | G-3: a resting value draws what a resting cell draws |
| `overScrollEllipsis` | `TextCell.tsx` | G-7: the clip's ellipsis stays, and the mark sits beside it |
| `writtenSpelling`'s compare | `Core/Nexus/governedRoot.ts:73` | G-13: keeps a YAML list's shape on disk with no new code |
| `LIST_KINDS` | `Core/Actions/gripMenu.ts:35` | D-6: already the one source of rows |
| `styleLabel` | `Core/Properties/typeDisplay`, read at `Core/Actions/columnMenu.ts:91` | D-3: Format ▸ already reads this way on a link's and a column's menu |
| `drive-harness.mjs` | `.claude/scripts/` | A-6: `launch`, `popNative`, `pickNative`, `boxOf`, `mouseAt`, `sweep`, `pressKey`, `typeText`, `writeBody`, `createPage`, `shot`, `tally`, and `until` serve both rewrites |

---

#### What Leaves

By proposed phase. **Consumers** names who reads it today, so a planner sees what each removal touches. Phases 1 to 5 and 8 are measured, and the rest read from the reports.

##### Phase 1 · One Scan Per Surface

| What Leaves | Kind | Consumers |
|---|---|---|
| `scope` on `rolesAgainst`, `siblingsAt`, `subBlockAt`, `ownersOf`, `renumberRuns`, `dropChanges` | Parameter | `listModel.ts` internals, `listDrag.ts`, `format.ts`, `listRenumber.ts`, `edits.ts:201` |
| `scope` on `listReach`, `listKindOf`, `setList`, `editFor`, `readLine`, `readFormatState` | Parameter | `gripMenu.ts`, `menu.ts`, `cellStatic.tsx`, `formatState.ts` |
| `scope` on `applyEditorAction` | Parameter | `menu.ts:141` |
| `scope` on `continueListOnEnter`, `indentListOnTab`, `outdentListOnShiftTab`, `smartBackspace`, `canonicalizeCheckbox` | Parameter, 9 of 15 `= 'page'` defaults | `markdownInput.ts`, `CellEditor.tsx`, 6 test files |
| The factories `listRenumber`, `listDragExtension`, `gripMenu`, `typedInput`, `smartDelete`, `commitAliasOnEnter`, `stepDocs` | Each becomes a constant | `surface.ts`, `editorBase` |
| `useConnectionAutocomplete`'s scope argument | Parameter | `MarkdownEditor.tsx`, `CellEditor.tsx`, `ValueEditor.tsx:61` |
| The `page` gates in `caretSeat` and its five readers, `lineIntentsInto`, `stepLineIntents`, `smartBackspace` | Branches | `decorations.ts:701`, `intents.ts:372`, `:535`, `edits.ts:230` |
| `parseListMarker` second reads | Calls | `CellEditor.tsx:61`, `:95`, `cellStatic.tsx:287` |
| *Editor-Internals* line 18, "A cell's document model is page-shaped" | Doc | Every cell-side reader |

**Arrives:** `surfaceScope`, `inlineLines`, a `scope` field on `DocScan`, `.of` on `PerScopedDoc`, and `tokenize`'s scope argument. `scope` falls from 230 to 80 occurrences, and declarations from 73 to 20 (7-T2).

##### Phase 2 · Markdown Code Blocks and Masked Markers

| What Leaves | Kind | Consumers |
|---|---|---|
| `Reader`, `'outside'` | Type, value | `itemAt`, `readsFrom`, `ownersOf` |
| `readsFrom` | Function | `itemAt`, `rolesAgainst`, `format.ts:311`, `:341`, `listRenumber.ts:49` |
| `itemAt` | Function | 13 sites in 6 files |
| `blockPrefix` | Function | `splitPrefix`, `listLineAt`, `smartBackspace`. Observed here: it leaves in this step, where 7-T2 lists it under Phase 1 |
| `inSealedLine` in `listModel.ts` | Read | The walks. It stays in `listReach`'s `outOfReach` |
| `readsFrom`'s `own`, `rolesAgainst:75-78`, `relist ? i : 'outside'`, `listRenumber.ts:49`'s guard | Branches | The filter, the walk |
| `toggleInline`'s fence refusal and `link:insert`'s | Branches | `format.ts:114`, `:174` |
| A repeated fence test in `readFormatState` | Branch | `formatState.ts` |
| `smartBackspace`'s `inCodeAt` return | Moves below `takeMarker` | `edits.ts:236` |

**Tests Leaving or Changing:** *8-T31*'s five, by A-4. `format.test.ts:98` and `formatKeymap.test.ts:38` leave, `format.test.ts:147` keeps its inline-code half, and `listRenumber.test.ts:168` and `:174` re-aim at ` ```md `.

**Arrives:** `lineMarker`, `readsListsIn`, `fenceDelimiter`, `opensCodeList`, and `leadOf` in `Input/edits.ts`.

##### Phase 3 · Blank Lines and Numbering

| What Leaves | Kind | Consumers |
|---|---|---|
| `continuesList`'s `'blank'` answer and `depth === 0` branch | Return value | `listModel.ts:84`, `blockModel.ts:47`, `intents.ts:402` |
| `rolesAgainst`'s and `openerOf`'s exports | Export | `listRenumber.ts:32`, `blockModel.ts` |
| `siblingsAt`'s `joins` and blank branch | Parameter, branch | `runAt`, `dropChanges`, `format.ts:321` |
| `runAt` | Function | `renumberRuns` |
| `arrived`, `settled`, `repicked`, `rewritten`, `runsBelow`, `below` | Parameters, locals | `renumberRuns`, `renumberRun`, `listRenumber.ts` |
| `mapAscending` | Function | `listRenumber.ts` |
| `Math.min(...)` | Expression | `listModel.ts:282` |
| `gapBefore`, `looseSource`, `looseSlot`, `MoveSeams` | Locals, type | `dropChanges`, `rebuildMove`, `moveRange` |
| `renumberRuns`' blank skip | Branch | Itself |
| The `{}` cancel at `listRenumber.ts:63`, `applyEdits` there, `isSequenced(lm) ||` at `format.ts:384`, I-073's reference at `:363` | Branches, comment | D-4's restart |
| `ordinalOf`, `ordinalText` from `edits.ts` | Imports | `continueListOnEnter` |
| `firstItemOf` | Function | `contextFor`, the grip's reply |
| `blockContext`'s two-pass scan | Block | `listMember` |
| `lines`, `lineStarts` on `railIntents` | Parameters | `withRails`, `cellStatic.tsx:294` |
| `format.ts`' `listMarkerText` | Moves to `detect.ts` | `setList`, Enter |
| `rebuildMove`, `moveRange`, `Slot`, `reindentBlock`, the private `leadOf` | Move to `Engine/blockMove.ts` | `blockDrag.ts`, `pageEditor.ts`, `dropChanges` |

**Arrives:** `ridesList`, `runsAround`, `held`, the `fenced` and `heals` flags, and `blockMove.ts`. `listModel.ts` goes from 323 lines to 185 and `listRenumber.ts` from 89 to 48.

**Tests Leaving or Changing:** Scout 9's 17 (*§The Reconciliation List*).

##### Phase 4 · Paste

No function leaves. `listRenumber.ts`' gate gains `input.paste`, and its compare gains a newline test.

##### Phase 5 · One Marker Grammar

| What Leaves | Kind | Consumers |
|---|---|---|
| `listGlyphOf` | Function | `drawnKind`, `pushConstruct`, `CellEditor.tsx:62`, `:96`, `cellStatic.tsx:288` |
| `drawnKind` | Function | `format.ts:322`, `:329`, `:358`, `:384` |
| `ListGlyph` | Type | `MarkerGlyph` |
| `ListMarker.bullet`, the bullet's `box?`, `Box.inner` | Fields | `parseListMarker`, `railTypeClass`, `listGlyphOf` |
| The `{ lm, glyph }` projection | Local | `renderCellBody`, `MarkerGlyph` |
| `Input/format.ts`' import from `Engine/intents` | Import | One layer crossing |
| The comments at `intents.ts:128-131`, `CellEditor.tsx:59`, `cellStatic.tsx:285` | Comments | -3 net |

**Arrives:** `textMarkerClass`.

##### Phase 6 · One Set of List Keys, and the Scope's Name

| What Leaves | Kind | Consumers |
|---|---|---|
| `listEdit`, `continueList`, `nestList`, `unnestList` | Functions | `CellEditor.tsx`'s keymap |
| The bodies of the cell's Tab, Shift-Tab, Enter, Backspace, and Delete bindings | Blocks | The cell's keymap, down to its navigation |
| `seatPastMarkerNow`, `joinEmptyHead` | Move to the shared keys | The cell's Backspace, Delete, and mount |
| The page's Tab and Shift-Tab list bindings | Moved into `listKeys` | `markdownInput.ts:286-287` |
| `'cell'`, `'text'` | Values, become `'lists'`, `'inline'` | `blockHandles.ts` ×4, `intents.ts:625`, `Core/Actions/editorMenu.ts:26`, `:168`, `docCache.ts:84`, `surface.ts:42`, `ValueEditor.tsx:61`, `:93`, and the test sites |
| `autocomplete.ts:105`'s `!== 'cell'` | Compare | Becomes `=== 'page'` |

**Arrives:** `listKeys`, `onItemEnter`, and `seated`.

##### Phase 7 · One Definition Per Type

| What Leaves | Kind | Consumers |
|---|---|---|
| `listMarkerText` | Function, becomes the record's `marker` | `setList`, `continueListOnEnter` |
| `railTypeClass` | Function, becomes the record's `rail` | `intents.ts:487`, `cellStatic.tsx:298` |
| `ARROW_MARKER_RE` and `parseListMarker`'s early return | Regex, branch | `parseListMarker` |
| `BARE_MARKER`, `BARE_TASK` | Regexes | `restoreTrailingItem` |
| `LIST_KINDS`' `short`, or its `label` | Field | `listRows`, `blockMenu.ts:28`, `editorMenu.ts:43` |
| `pushConstruct`'s `parseListMarker(inner)` | Call | The second parse behind the dead callout glyph |
| The list row's `Type` label | String | `Core/Actions/gripMenu.ts:75` |

**Optional, If It Pays:** `listLevels`, `listKinds`, and `lineIntentsInto`'s return value can read `scan.markers` once Phase 5 lands (*1-T6.6*), with `Core/Testing/markdownEngine.ts` following. `quoteDepths` stays.

##### Phase 8 · The Word Rule

| What Leaves | Kind | Consumers |
|---|---|---|
| `joins`, `JOINED`, `grouping`, `wordPress`, `joinedWords` | Functions, constants | `wordAt`, the atoms |
| `wordGestures` | Export | `surface.ts`, replaced by `contractions` |
| `DELETES`, `GROUPS`, `byWords` | Constants, function | `editorKeymap` |
| `wordAt`'s two `while` loops | Loops | `menu.ts:118`, `cellStatic.tsx:574` |
| `Command`, `Decoration`, the six group-command imports, `isWordChar`'s import | Imports | `markdownInput.ts` |

##### Phase 9 · Right-Click

Verdicts are *Gestures Reconciliation*'s, and row numbers follow its *§Verified Removal List*.

| Row | What Leaves or Changes | Site | Under |
|---|---|---|---|
| 1 | `if (!ask) return`, the `click` thunk, `menus.format?`, `format: inert ? undefined` | `menu.ts:55`, `:72-74`, `api.ts:191`, `editorHost.tsx:106` | E-4, E-7 |
| 2 | `at === null`, `at: number \| null`, through `posAndSideAtCoords(event, false)` | `menu.ts:56`, `:75`, `:111`, `:127` | E-7 |
| 3 | `view.dom.isConnected` | `menu.ts:140`, `pasteLink.ts:129` | E-7 |
| 4 | `doc === opened` for text rows, which act on the live selection; it stays for a glyph | `menu.ts:108`, `:140` | E-7 |
| 5 | The seat's bare dispatch, which becomes `select.pointer` and reads the selection back | `menu.ts:133` | E-7, D-5 |
| 6 | The synthetic `selectionchange`, with its pin `editorMenu.test.tsx:235` | `menu.ts:43` | E-7 |
| 9 | `atClick`, its slack, `x`, `y`, and `takeEditorMenu`'s compare, with pins at `Desktop/Actions/editorMenu.test.ts:45-59` | `Desktop/Actions/editorMenu.ts:37-54`, `Core/Actions/editorMenu.ts:27-28`, `menu.ts:90-91` | E-7 |
| 10 | `posAt`'s `try`/`catch` | `CellEditor.tsx:263-270` | E-7 |
| 12 | `e.stopPropagation()` in the resting handler | `cellStatic.tsx:606` | E-7 |
| 14 | The table wrap's capture, which becomes `onContextMenu`, with its comment | `MarkdownTable.tsx:494-497` | E-7 |
| 19 | `readOnly` returns, which pick the short menu | `menu.ts:106`, `cellStatic.tsx:605` | E-4 |
| 20 | `resting`'s presence as "not editable", which becomes one finite state | `Desktop/Actions/editorMenu.ts:77-81`, `:97`, `:136` | E-4 |
| — | `clickInside`'s `glyph` parameter (4-T24) | `menu.ts:36-39` | D-2 |
| — | `[start, end]`, `request`'s four arguments, `list ? from : start`, and the doc at `menu.ts:49` | `menu.ts:63-68`, `:76-78`, `:92`, `:96-97`, `cellStatic.tsx:580` | D-5 |
| — | `embedSeatAt`'s and `citationSeatAt`'s `at` | `embedInsert.ts:34`, `citationActions.ts:36`, read at `menu.ts:135-136` | D-5 |

**Stays, Deliberately:** the `selectstart` refusal and its `setTimeout` (7, 8), `!!edge` (11), `linkGestures`' `stopPropagation` (13), `cellStatic.tsx:639` (15), `pointerPath.ts:49` with a truer comment (16), `gripMenu.ts:139` (17), `clickInside` and `reachEnd` at a selection's edge (18), `showSource` and `pointAt` retargeted (21), and `blockDrag` without `isSecondaryClick` (22).

##### Phase 10 · Text Properties

| What Leaves | Kind | Consumers |
|---|---|---|
| `oneLine` through `editorBase` and `inlineSurface` | Parameter | `surface.ts:50`, `:83`, `:90`, `:94`, since `scope === 'inline'` then holds exactly when `oneLine` does |
| `TextCell`'s per-line loop, `lineOffsetsOf` there | Block | `TextCell.tsx:76-81` |
| `.cell-text-line + .cell-text-line` and its comment | CSS | `table.css:251` |
| `{ key: 'Enter', run: leave }` on the pane | Binding | `ValueEditor.tsx:126`, which stays the field's |
| The grip's cell rule | CSS, moves | `markdown-tables.css:193-196` to `markdown-pm.css` |

`readsLists`, `blockGestures`' empty arm, and the menu's third arm stay, since the one-line field still needs them.

##### Phase 11 · Drives, Docs, and Closeout

`phasedItem`'s use and `POMMORA_LGM_LANDED` leave the List Types Drive, and the helper stays for the Path Links Drive. The drive's C-6 word and Bold items leave with the word rule's own pins. *§The Reconciliation List* holds the rest.

---

#### What's Unbuilt

Every decision no prototype delivers yet. **Size** reads Small under 20 lines touched, Medium under 80, and Large past that, with **Risk** naming what's hard about it.

##### Picks, Types, and Words

| Decision | What It Needs | Size | Risk |
|---|---|---|---|
| **B-1 to B-4, B-9, F-1's `2. [x] foo`** | Built on the stack (*§The Grammar on the Stack*), so the work is landing it, retiring 9 pins, and adding `+[]`'s pin | Medium | Low. It needs Enter's `bullet` read gone, so it follows Phase 3 |
| **B-7** | A `LIST_TYPES` record in `detect.ts` beside `ListKind`, holding each type's `marker` and `rail`, read by `setList`, Enter, and the rails; `→` joining the marker alternation, folding `:574-585`; `restoreTrailingItem` reading `parseListMarker(last + ' ')`; D-6's labels. *§Approaches Weighed* sets its shape | Medium | Moderate: `parseListMarker`'s group indices move, and `codec.ts` needs `contentStart` to tell a bare marker from a full one |
| **D-2** | The grip's reach and mixed check are built. What's left is a glyph inside a selection acting on its group, which removes `clickInside`'s `glyph` parameter and `editorMenu.test.tsx:116`'s and `cellRestingMenu.test.tsx:311`'s assertion of the old reach | Small | Low |
| **D-3** | `label: 'Format'` at `Core/Actions/gripMenu.ts:75`, the doc lines, and `gripMenuFlow.test.tsx`'s describe | Small | None |
| **D-5** | One range in `routeRightClick`, the rule in `listReach`, and `readFormatState` reading the seat. Trial run at about +1 | Medium | Moderate: `citationSeatAt` has to read the selection's last character first (3-T32), or a Footnote row writes into inline code. `listRenumber.test.ts:83` selects a whole line instead |
| **D-6** | One label per type across `LIST_KINDS`, and the `/` menu's filter reading it: Bulleted, Numbered, Alphabetical, Checklist, Arrowed | Small | Low. `Core/Actions/blockMenu.test.ts`' narrowing and the doc at `MarkdownPM.md:153` follow |
| **F-1, the Callout Head** | `pushConstruct` reads `scan.markers` in place of its own parse, so a head draws no glyph and `- foo` shows as text, and `setBlock('callout')` strips through the prefix at `format.ts:433` | Medium | Moderate: `scan.markers` offsets are line-relative where `pushConstruct` adds `innerStart`, about ten sites, and `cached assembly ≡ pure derivation` must stay green |
| **E-5, E-6** | Built on the stack (*§The Word Rule*), so the work is landing it and pinning the departures | Small | Low |

##### Right-Click and Read-Only Surfaces

| Decision | What It Needs | Size | Risk |
|---|---|---|---|
| **E-1** | Nothing new: the resting menu stays, and this phase consolidates it. `cellStatic.test.tsx:113` starts exercising the menu once `format` is required (3-T57) | Small | Low |
| **E-2** | The seat stops being the document's selection and clears on every reply, since Copy, a re-pick, and an empty paste also leave the cell undrawn. `pick.then` is the one signal | Medium | Moderate: Inferred until driven. The harness needs a `CSS.highlights` stub, since jsdom lacks it |
| **E-3** | `showSource` writes a `CSS.highlights` entry and one `::highlight()` rule paints `--text-selection` | Small | Moderate: only a screenshot proves paint (5-T54), and the plan should run it in Phase 9 rather than Phase 11 |
| **E-4** | One finite state on `EditorMenuRequest` saying which menu; `menu.ts:106` and `cellStatic.tsx:605` routing into it; Copy through `RESTING_EDITS.copy`; a renderer-answered Select All running `selectAll` on the view; `InfoButton`'s `Entry` stopping the bubble; a glyph on a read-only surface reading as text | Large | Moderate: the only section adding a new row kind. It has to land before rows 1 and 9, which assume every surface asks and the info pane stops its bubble |
| **E-7** | *§What Leaves*, Phase 9, plus one open gap: a press left of a glyph on a page may seat at the line's start, so Bold writes `****- item`. The arm at `intents.ts:625` widens only if the drive shows it | Medium | Low, and each row is one site |
| **3-T14, 3-T15** | Fall out of rows 4 and 5 | Small | Low |
| **3-T32** | `citationSeatAt` reads the selection's last character for a range | Small | Low |

##### Text Properties

| Decision | What It Needs | Size | Risk |
|---|---|---|---|
| **G-1, G-2, G-3, G-7** | Rebase the prototype's pane files, reading the scan rather than `itemAt` and `restingItem`'s glyph test. `is-continued` and `::after` carry G-7's mark | Medium | Moderate: 9 conflict hunks on the stack, 3 gone after Phase 5 |
| **G-3's Mute Checked** | `listLineClass` on the line and `.cell-text` added at `markdown-pm.css:544` (6-T32) | Small | Low |
| **G-4, G-11** | Nothing: on-disk format holds and no flag exists | None | None |
| **G-5** | Nothing: the field keeps `'inline'` | None | None |
| **G-6, G-9** | The pane passes `oneLine ? 'inline' : 'lists'`. Phase 6 delivers the name and the keys | Small | Low |
| **G-8** | Nothing: a Text value holds no `claimCheckbox` | None | None |
| **G-10** | `ValueEditor.tsx`'s `Enter` becomes the field's alone, the pane's Enter runs `insertNewline`, and the pane's arm gains `{ key: 'Escape', run: leave }` (6-T36) | Small | Low; trial run |
| **G-12** | Nothing new: the field already shows the first line, trimmed | None | None |
| **G-13** | `asText` reads a sequence as its items' lines, `linkEntry` first (6-T35) | Small | Low; trial run. The drive's `inline` and `shown` helpers follow |

##### Proof and Record

| Decision | What It Needs | Size | Risk |
|---|---|---|---|
| **A-6, the List Types Drive** | The rewrite in *2, §The Drive Rewrite*: no `phasedItem`, every type × page, callout, quote, focused cell, resting cell, editing tile, and Markdown block × keys, picks, drag, rails, drawing, renumbering, and menus, plus the 18 Drive Only and 22 Neither rows each kept, moved to a pure test, or dropped. `shown` reads the seated range and a screenshot proves paint | Large | High: the only proof of drop geometry, rails, and a resting highlight, and the largest single task. It also carries a press left of a glyph |
| **A-6, the Text Property Drive** | Flip `:145-151`, `:532-533`, `:542`, `:578`, `:596-597`, `:634`, and `:649`, and its helpers `inline` and `shown` feed `:213` and `:217`. `Drive List` adds one check: the first edit lands a string | Medium | Low. It holds no gate to remove |
| **A-4** | *8-T31*'s five, *7-T7*'s missing cell pins, and the Paste helper's block body | Small | None |
| **Docs** | *§The Reconciliation List* | Large | Low, and `Editor-Internals` line 40 needs the scan and parity wording folded into the numbering text *Numbering and Edges* wrote |
| **Issues** | I-073 closes, I-036 rewrites to 15 compares and 6 defaults, I-016's example changes, and Option+Up, Option+Down, and dragged text file as a new issue | Small | None |

---

#### Approaches Weighed

Each fork names what was considered, what's recommended, and why, read against the log's *Approach* and *Principles*. **Settled** means a ruling or a measurement decided it and it's recorded for the reader. **Recommended** means planning may still choose otherwise.

##### How a Surface Says What It Reads (Settled)

- **Considered:** a `scope` parameter threaded through `docScan`, or a facet read inside it.
- **Taken:** the facet, by B-11. About 55 of `docScan`'s 100 sites sit in page-only modules and would take a literal or a default, which restates I-036, and many of the other 45 hold no scope to pass. Each site changes by deleting `.doc`.
- **Why:** *One Way* and *Less to Carry*: the reader asks one question and the answer already holds the surface. It's the largest removal in sight, at -87, and asks nothing of the hot path (7-T8).

##### Where the Code-Block Rule Lives (Settled)

- **Considered:** gating each reader, parity alone (+56), parity with masking on today's shape (+68), or masking on the scan change (+63 as a step).
- **Taken:** *Scan Stack*. `scan.markers` holds what the block reads, so a null marker is the whole of C-3 and one field compare carries C-2.
- **Why:** alone, masking needs `regionOf`, a gated `leadOf`, and `itemAt` kept for a cell, which is residue the scan change removes. The step's +63 is behavior the log requires: list levels past a fence's lead, a pick that writes in plain code, two shorthands, and rows that clear a diff sign. The table-header defect closes as a side effect, because `blockContext` and `tableGuard` can't read the wrong array any more.

##### The Scope Rename

- **Considered:** keeping `'page' | 'cell' | 'text'`; a fourth scope for the pane; or `'page' | 'lists' | 'inline'`.
- **Recommended:** `'page' | 'lists' | 'inline'`, with `ValueEditor` passing `oneLine ? 'inline' : 'lists'`.
- **Why:** G-9 asks for a name saying what a scope reads, and a fourth scope adds a case everywhere `MarkdownScope` is switched on. *6-T14*'s trial compiled at net 0, across 6 more files than the prototype touches, plus 42 test lines.
- **When:** at the head of Phase 6. After Phases 1 to 5 the fewest readers hold a scope (7-T10), and every saved patch still applies against today's names. Before the key merge, so `listKeys` is written once against its final vocabulary.
- **What It Touches:** the zod enum at `Core/Actions/editorMenu.ts:26` crosses to `Desktop`, so it changes in the same commit. No bridge channel changes (6-T2).

##### `listKeys`

- **Considered:** a third key set in the pane, `CellEditor` mounted in the pane, or one set on `editorBase` beside `smartDelete`.
- **Recommended:** one `listKeys` on `editorBase`, each surface stating only what's left when no list claims the key.
- **Why:** *One Way* and *Clearer Boundaries*: both sets call the same transforms and differ only in what claims a key. G-6 rules out `CellEditor`, which would take stubs for `onNavigate`, `onFill`, `onUndo`, `onRedo`, and `ordinalOf`, and it commits per keystroke where a pane saves once.
- **What's Left of the Fork:** `listKeys` keeps one page-or-not branch, since a page's Enter and deletes hold closers, citations, and quotes a list doesn't. That branch is a surface choosing behavior and stays. The prototype's `nest` guards a range and a non-item, and `listClaims` guards the same today, so that's two statements becoming one. Under B-11 `onItem` reads `scan.markers`, and the prototype's `itemAt` read goes.
- **The Field:** `listKeys` mounts on the one-line field too, uniformly. Its Enter and Backspace can't claim a key there, since an `'inline'` scan holds no markers and `joinEmptyHead` needs two lines.
- **Placement:** after Phase 5, whose grammar removes the keys' disagreement over a marker nothing draws, and well before Phase 10. *6-T20* calls for it early because Phase 2 opens code blocks to these same keys.

##### The Pane's Shape (Settled)

- **Considered:** `CellEditor` itself, a fourth scope, or the shared list-reading scope.
- **Taken:** the shared scope, by G-6 and G-9. The Text plan's first version mounted the pane in `'cell'` with a shared `cellKeys(ac, exit?)` (`b80a7b12a`), and nothing records a technical failure; a ruling G-1 reverses dropped it.

##### Numbering's Reach (Settled)

- **Considered:** today's exact reach, kept by walking the new document for the sibling below, at +24 lines; or recounting the whole list an edit touches.
- **Taken:** the whole list, under B-5 and B-10's "as simply as it allows".
- **Why:** `below`, `runsBelow`, `mapAscending`, the sort, and the old-document walk all exist to find the run an item left, which is a subset of the list once a blank line bounds it. A keystroke can correct a number elsewhere in its own list, and that's the price (*§Behavior Changes*). The gate keeps Enter on a bullet paying nothing.

##### The Start of a Run (Settled)

- **Considered:** the smallest ordinal, with `arrived` and `settled`; always 1; the smallest with no predecessor; extending past Z to `AA.`; or the first item, with `held` for a drag.
- **Taken:** a nested run counts from 1, and any other from its first item, a drag handing its landing run the start it had.
- **Why:** it removes every ordering assumption, which is what broke past Z, and it removes `arrived`, `settled`, and the `Math.min` spread. Always counting from 1 rewrites a list resumed at `3.` on purpose (4-T44). `AA.` would read `OK.` as a marker. 4-T7's objection was to the bare rule, which `held` repairs: `5, 6, 7` keeps 5 with the last dragged to the top.

##### Who Recounts a Drag (Settled)

- **Considered:** routing a move through the filter, or keeping its own recount over the shared counter.
- **Taken:** its own, as *One Way*'s stated exception. A move permutes its run, so the start can't be read from the result, and routing it would need an annotation carrying what `dropChanges` already holds. One counter stands, with two entrances, and the reason sits in `dropChanges`' comment and *Editor-Internals*. I-073 closes on that.

##### The Block Move's Flags (Settled)

- **Considered:** one `spaced` boolean, or `fenced` and `heals`.
- **Taken:** `fenced` and `heals`. On `spaced`, dropping an item that was its whole list leaves `a`, two blanks, `b` (*Engine Reconciliation*).

##### How Rails Read a Line (Settled)

- **Considered:** raw `continuesList`, a `rides` callback, or `scan` and `ridesList`.
- **Taken:** `scan` and `ridesList`, which the scan change makes available to a resting cell, so the callback never exists.

##### B-7's Record

- **Considered:** the full record in *1-T6.2* with `marker`, `sequence`, and `rail`, plus one CSS class per type; a smaller record; or no record, with `listMarkerText` and `railTypeClass` left as two small functions.
- **Recommended:** the smaller record, `Record<ListKind, { marker: string; rail?: string }>` in `detect.ts`, with `isSequenced`, `ordinalOf`, and `ordinalText` staying as they are, `→` folded into the one regex, and `restoreTrailingItem` reading the parser.
- **Why:** B-7 asks for one definition the walks, keys, and menus read, with counting and checking the only differences, so the record should name what differs and nothing more. `isSequenced` has to stay as a type guard for `SequencedMarker`, so a `sequence` field would state counting twice. The CSS change in *1-T6.2* serves drawing, which B-8 keeps, and it would churn the selector pins in 2-T6 with nothing a user sees. `LIST_KINDS` stays in Actions, since wording belongs there, and becomes `Record<ListKind, …>` only if that removes lines.
- **Residual:** with the grammar landed the record's value is mostly *Less to Understand*. If the built delta reads positive, the fallback is the arrow fold and the `codec.ts` read alone, which are pure removal, and B-7 is met by what's left being one definition per concern.

##### The Callout Head's Fix

- **Considered:** `pushConstruct` reading `scan.markers`, or one condition stopping it parsing on a head.
- **Recommended:** reading the scan, by B-11's "a list reader asks the scan". It removes the second parse that let a drawn glyph and a null marker disagree, at the price of rebasing about ten offsets from `innerStart` to the line. If `cached assembly ≡ pure derivation` turns that into a design rather than a change, the one condition is the fallback.

##### `CSS.highlights` Against Its Fallback

- **Considered:** (a) keep the DOM seat, add one `::selection` rule under `.mdpm-tbl-cell-static` reading `--text-selection`, and on the reply return the selection to whichever editor holds focus; (b) hand the range to a `CSS.highlights` entry, paint it with one `::highlight()` rule, and clear it on the reply.
- **Recommended:** (b).
- **Why:** it removes E-2's cause rather than restoring after it. The page's caret, its selection, and any live cell's focus are never touched, so typing behaves as it always does. A restore needs the page's `view.focus()`, which is wrong when a live cell holds focus (5-T30) or the page was blurred (5-T46). The setting stops mattering, which is what E-3 asks.
- **What Follows:** Chromium's Menu Seat then fires on a resting word, since nothing holds the click, and the installed refusal stops it (5-T5). `restingSelection` stops seeing a seated word on the next click, which D-5 makes harmless, since a one-line selection acts as a caret does.
- **Evidence:** Inferred. Electron 42.4.0 sits far past the Chromium release that shipped the API, jsdom lacks it, and `getComputedStyle` can't read this kind of paint (5-T54). Nothing has painted it yet.
- **Decide in Phase 9:** drive the paint when E-3 lands. A failure takes (a), which is a small change from the same seat, and Phase 11 never carries the doubt.

##### E-4's Signal

- **Considered:** keeping `resting`'s presence as the meaning and adding a flag, or one finite state.
- **Recommended:** one finite state on the request naming the menu, with `resting` holding only its `selection`. *Finite states are unions + switch*, and `:136` then reads `!params.isEditable && !editor`.

##### The Word Rule's Mechanism

- **Considered:** keeping the atoms and wrapped commands; the prototype as saved; the prototype with its three corrections; or the tightened walk.
- **Recommended:** the tightened walk.
- **Why:** the atoms read exact today and cost 41 lines, three mechanisms, and a command list that every future group command has to join. The mechanism is one answer in one place, and CodeMirror applies it to every word gesture, resting cell included through `extensions: contractions`. Against the saved window the walk is linear rather than quadratic, drops `_` where E-5 says letter or digit, and returns 104 readings to today at no cost in lines.
- **The Price:** shapes A and B stay (*§What's Built*), and that is what the atoms would buy back at 50 lines. E-5 asks for "the simplest mechanism that makes sense", and E-6 accepts the departures "at the smallest reach the mechanism allows". The walk is that reach.

##### The Stale Drop (Settled)

- **Considered:** keeping `bStart < 0` and `tLine < 0`, or one compare of `view.state.doc` in `beginRelocateDrag`'s `onDrop`.
- **Taken:** the compare, for both drags. The cause is named and reachable through `mirrorBody`, and a stale slot past the document's end still throws on the stack (*1-T4*). This is the one piece of guard code the plan adds, and it removes two.

##### What Declined to Be Consolidated

- **`regionOf`:** a field read at 7 sites stays inline, since a wrapper adds to *Less to Carry*.
- **`LIST_LINE`, `LIST_ITEM`, `MAY_OPEN`:** a parser's question rather than the grammar's (V-8).
- **`renderCellBody` Beside `pushConstruct`:** a resting cell has no view, and they share the glyph, the classes, and the rails.
- **`quoteDepths`:** no decision takes it, and reading depth per line doubled the rail pass (*1-T6.6*, Unconfirmed).
- **A Capability Predicate for I-036:** 15 compares remain, each a surface choosing behavior, so it buys little.

---

#### Phases

Removal comes first in each phase. Every phase ends with `npm run typecheck`, `npm run test`, and the lint gate green, and its comment count entered in *§The Baseline*. Phases 1 to 4 land from the saved patches: *Scan Per Scope*, the difference between it and *Scan Stack*, then *Engine Stack*'s remainder, with *9-T27*'s four edits held back for Phase 4.

##### Phase 1 · One Scan Per Surface

**Delivers:** B-11. **Why First:** nothing depends on behavior it changes, and every later step then writes its signatures once. The churn is 43 production files, which is the reason to take it before anything else is in flight. **Adds Pins:** *7-T7*'s cell-side literal constructs, which moved with no test red. **Gate:** 0 reds after 17 test files migrate.

##### Phase 2 · Markdown Code Blocks and Masked Markers

**Delivers:** C-1 to C-7, and F-1's table header, diff sign, and `-[x]`. **Why Here:** Phase 3's walks read a region rather than a reader, so masking comes first. *Scan Stack* can't be split into parity and masking from the saved patches, so it lands as one. **Removal First:** `Reader`, `readsFrom`, `itemAt`, `blockPrefix`, and the refusals. **Gate:** *8-T31*'s five handled by A-4, leaving 0 reds. The generator's alphabet takes Markdown fences in the same change.

##### Phase 3 · Blank Lines and Numbering

**Delivers:** B-5, B-6, B-10, B-4's Enter, D-2's grip reach, D-4, and F-1's grip, run past Z, flush-line rail, and block drag. **Why Here:** D-4 removes the only inference the filter held, and `listMarkerText`'s move sets up Phase 5. **Adds:** the stale-drop compare, which *Engine Stack* doesn't hold. **Gate:** Scout 9's 17 pins, already rewritten in the patch.

##### Phase 4 · Paste

**Delivers:** F-2, as *9-T27*'s four line edits. **Why Separate:** F-2 asks for its own piece of work, and nothing else depends on it, so it can land, wait, or come back with no effect on any other phase. It follows Phase 3 only because its base patch sits in filter code Phase 3 deletes. **Adds:** the block body in the Paste test helper, for lint.

##### Phase 5 · One Marker Grammar

**Delivers:** B-1, B-2, B-3, B-4, B-9, and F-1's `2. [x] foo`. **Why Here:** Enter's read of `bullet` is gone, and every later phase then reads `kind` alone. **Removal First:** `listGlyphOf`, `drawnKind`, `ListGlyph`, and the fields. **Gate:** 9 pins by name, plus the `+[]` pin.

##### Phase 6 · One Set of List Keys, and the Scope's Name

**Delivers:** G-9's rename and key merge, and 6-T10's drift. **Order Within:** rename first, then the merge. **Why Here:** this is as early as the merge can land without being resolved again. Phases 1 to 5 land saved trees in a fixed order, so a merge ahead of them would conflict with each one, and Phase 6 is the first phase designed fresh. It sits ahead of everything section G needs, and the grammar has already settled what a key claims. **Against 6-T20:** a cell's scan holds no fences after Phase 1, so C-1's keys reach code blocks through the page's keymap alone, and the merge has no technical reason to precede Phase 2.

##### Phase 7 · One Definition Per Type

**Delivers:** B-7, D-3, D-6, and F-1's callout head. **Why Here:** the record's shape only reads clearly once the grammar and the keys have settled, and it stays ahead of the menus' rework.

##### Phase 8 · The Word Rule

**Delivers:** E-5 and E-6. It touches `markdownInput.ts`, `surface.ts`, and one line of `cellStatic.tsx`, so it's independent of Phases 6 and 7 and can move earlier if a run prefers. **Why Before Phase 9:** the resting word it reads is the word Phase 9 seats.

##### Phase 9 · Right-Click

**Delivers:** E-1 to E-4, E-7, D-5, D-2's glyph, 3-T14, 3-T15, and 3-T32. **Order Within:**

1. **Removal That Stands Alone:** rows 2, 3, 6, 10, 12, 14, and `clickInside`'s `glyph`.
2. **D-5:** `citationSeatAt`'s fix first, then the one range, rows 4 and 5, and `listReach`'s rule.
3. **E-4:** the finite state, the short menu, the info pane's bubble stop, then rows 1, 9, 19, and 20. Removal follows addition here for a stated reason: row 1 assumes every surface asks, and row 9 would otherwise create the stranded ask it guards.
4. **E-2, E-3:** the seat moves to `CSS.highlights`, and its paint is driven before the phase closes.

##### Phase 10 · Text Properties

**Delivers:** G-1 to G-13, on the reworked list system as G-1 asks. **Order Within:** `oneLine` and the `display: none` rule leave first, then the pane's flip, `TextCell`'s one line and mark, G-10's bindings, and G-13.

##### Phase 11 · Drives, Docs, and Closeout

**Delivers:** A-6 and the record. Both drives are rewritten to the log, carry no gate, and run whole. *§The Reconciliation List* closes. The plan's reviews follow the log's *Reviews* constraint: `code-simplification`, then `adversarial-review`, then a neutral gate. **Why Last:** with no gate, a drive written earlier fails until the work ends, and A-6 wants a failing item to fail the run.

##### Where the Phases Could Break Each Other

| Phases | How | What Holds It |
|---|---|---|
| 1, 2, 3 | The order isn't free: 16 and 21 conflict hunks were resolved on this order, and numbering reads the masked scan | Land from the saved trees, in order |
| 2, 3 | `runsAround` needs the region compare, or a carried Markdown block's items count into the list around it | *Engine Reconciliation*'s translation; a pin on the carried block |
| 2, 3 | `leadOf` exists twice, in `Input/edits.ts` and `Engine/blockMove.ts`, meaning different things | The private one takes another name in Phase 3 |
| 3, 4 | Paste's base patch sits in filter code Phase 3 rewrites | Apply *9-T27*'s edits, never the saved patch |
| 3, 5 | The grammar reads `listMarkerText` in `detect.ts` and Enter's marker write | Phase 5 follows Phase 3 |
| 5, 6 | `CellEditor.tsx`'s `listLineAt` and `atListEnd` change in both; 3 of the pane's 9 conflict hunks fall to Phase 5 | Phase 5 first |
| 5, 10 | `restingItem`'s glyph test and `renderCellBody`'s `items` no longer exist after Phase 5 | Rebase `renderRestingLine` on `markers` |
| 6, every patch | The rename changes strings the saved prototypes hold | The rename follows every saved-patch landing except the two rebased ones |
| 6, 9 | The zod enum and `editorContextItems`' switch change in Phase 6, and Phase 9 adds its finite state beside them | Separate fields, same file |
| 7, 5 | The arrow fold moves `parseListMarker`'s group indices that Phase 5 just set | Phase 7 re-pins `detect.test.ts` |
| 8, Stack | The prototype's `surface.ts` hunk conflicts at the line Phase 1 changed, `typedInput(scope)` to `typedInput` | One line, resolved in *§The Word Rule* |
| 8, 9 | Phase 9's seat reads `wordAt`, whose reading changes in Phase 8 | Phase 8 first; `wordAt` keeps its contract |
| 9, within | Rows 1 and 9 need E-4 first; D-5 and E-4 both rewrite `routeRightClick` and `menu.ts:106`; removing `clickInside`'s `glyph` sits in the function D-5 rewrites | The order within Phase 9 |
| 9, 10 | `linkGestures` is shared with `TextCell`, and row 13 stays for it | Don't take `:678` with `:606` |
| 10, 3 | The pane's rails and drag rest on `ridesList` and `collectBoundaries`, which only a drive proves | The rewritten drive carries a pane drag |
| Comments, all | The cap can be crossed in Phases 1 to 4 and has to come back | *§The Baseline*'s tally at each phase |

---

#### Behavior Changes

Every change a user would notice, in plain words, so the morning report can state them. **Flag** marks the ones *§Calls Taken* decided rather than the log naming them outright, which are the ones most worth a reader's eye.

##### What a List Is

| # | What Changes | Decision | Flag |
|---|---|---|---|
| 1 | A `+` item draws a `•` and reads Bulleted in every menu, where it read Arrowed. It takes a bullet's rail. An existing `+` stays `+` in the file | B-1, B-4, B-9 | |
| 2 | Enter under a `+` item writes `-`, and under `+ [ ] a` writes `- [ ] ` | B-4 | |
| 3 | `- [] x` draws a bullet whose text is `[] x`, where it drew nothing and Enter silently continued it | B-1 | |
| 4 | `-[] x`, `-[ ] x`, `-[x] x`, and `1.[ ] a` read as plain text, where they read as items. Typing `-[]` plus a space still makes a checkbox | B-2 | |
| 5 | Typing `+[]` plus a space writes `- [ ] `, where it wrote `+ [ ] ` | B-2 | |
| 6 | `1. [ ] a` shows its `[ ]` as text. `2. [x] foo` shows `[x]`, and switching it to Bulleted writes a real checkbox rather than deleting the box | B-3, F-1 | |
| 7 | A blank line ends a list for everything. Numbering, picks, drags, rails, and the grip all stop there, and items a blank line apart are separate lists | B-5 | |
| 8 | An indented paragraph below a blank line stands alone, so a drag or a pick on the item above leaves it | B-6 | |
| 9 | A paragraph indented directly above a list is its own block, where it opened the list block | B-6 | Yes |
| 10 | A table or code block an item carries rides whole even where a line inside it sits flush, and the rails run through it | F-1, B-6 | |
| 11 | A list block stops swallowing a table's header row or a quote below it, so a grip's Delete takes the list alone | F-1 | |

##### Numbering

| # | What Changes | Decision | Flag |
|---|---|---|---|
| 12 | Adding a blank line inside a numbered list splits it, and the lower list keeps its numbers. Enter in the upper half can then write a number the lower half already shows. Removing the blank merges the two and recounts. A nested lower half has no parent, so its numbers hold at the split and reset to 1 at the next list edit | B-5 | |
| 13 | **A keystroke can correct a number elsewhere in its own list:** `3. p`, a nested `1. a`, `5. q` switched at `a` lands `4. q`. A blank line still protects what's below it | B-5, B-10 | Yes |
| 14 | **A line added above a list at 5 restarts it at 1:** `b` above `5. a` picked Numbered lands `1.`, `2.`. A list at 5 keeps 5 through Enter, Tab, deletion, and a drag | B-10 | Yes |
| 15 | **A pick over separated paragraphs lands `1.`, `1.`, `1.`,** since each is its own one-item list | B-5 | Yes |
| 16 | Picking a list's own type changes nothing, where a numbered re-pick restarted it. Repairing a broken list takes Bulleted, then Numbered | D-4 | |
| 17 | An item's drag carries nothing past a blank line, and an item can still drop into another list, taking its place in that list's count | B-5 | |
| 18 | A lettered list past Z holds its place: `Y. Z. A.` keeps `Y`, where it recounted from A | F-1 | |
| 19 | Dragging blocks a blank line apart leaves `3.`, `1.`, `2.` as drawn. That's what a user sees today, and it now reads as three lists rather than a defect | B-5 | Yes |
| 20 | Pasting into a numbered list recounts it, with one undo taking both. Pasted words inside an item recount nothing, a pasted list's own numbers don't count, and a list pasted above a run starting past 1 takes the pasted start | F-2 | |

##### Code Blocks

| # | What Changes | Decision | Flag |
|---|---|---|---|
| 21 | A list in a ` ```md ` block takes Enter, Tab, Shift-Tab, Backspace, deletion's recount, picks, and paste, and draws no glyph | C-1 | |
| 22 | `-[]` and `->` work at a line's start there, and no other typing transform does | C-6 | |
| 23 | Picks on the surrounding list leave that block's lines alone, and its numbers count on their own | C-2 | |
| 24 | Inside every other block, a no-language block included, nothing treats a line as an item. A pick writes its marker on the lines it touches with no counting: `- foo` Numbered writes `1. - foo`, and picking again writes `1. 1. - foo` | C-3, C-4, C-5 | |
| 25 | Bold, Heading, Insert Link, and the other rows write into code, where several refused: `**word**`, `## `, `[[foo]]`. ⌘B follows its row | C-5 | Yes |
| 26 | A selection running from prose through a code block: list picks leave the code alone, while Heading and Bold keep writing | C-2, C-5 | Yes |
| 27 | Rows refuse on a block's delimiter lines, so Heading can't write `## ```js` and destroy the block | C-5 | Yes |
| 28 | On a diff line a row writes after the sign, so `- removed` survives as `- 1. removed` | C-7, F-1 | |
| 29 | `-[x]`, `||`, and `‼!` stay literal in plain code, where they rewrote the text | C-6, F-1 | |
| 30 | Enter on `> x` inside a fence makes a plain line, where it continued a quote | C-1, C-3 | |
| 31 | A table pasted onto a list-shaped code line lands as text, where it was refused | C-3 | |
| 32 | Inside a ` ````md ` block, a nested ` ```js ` sample's dash lines read as items | C-1 | Yes |
| 33 | Nothing reads a marker inside a math block or a table: a dash in math counts in the footer's stats, and a pipe-less table row like `- a \| b` takes no list intents or rail | C-2, F-1 | Yes |

##### Table Cells

| # | What Changes | Decision | Flag |
|---|---|---|---|
| 34 | In a cell, fence-shaped lines are just lines: `(` pairs, a list between ` ``` ` lines takes a grip, and `*a*` there reads italic | B-11 | Yes |
| 35 | `$$` lines in a live cell read as text, matching how a resting cell draws them | B-11 | Yes |
| 36 | A cell's list keys scroll the caret into view as a page's do, and `-[ ]` in a cell stops gaining a trailing space | G-9, B-2 | Yes |

##### Picks and Menus

| # | What Changes | Decision | Flag |
|---|---|---|---|
| 37 | The grip's menu changes every item in its block whatever Preserve List-Level Formatting reads, and a block of mixed types checks no row | D-2 | |
| 38 | A list grip's submenu reads Format ▸, where it read Type ▸ | D-3 | |
| 39 | Each type carries one name everywhere: the `/` menu and Lists ▸ read Bulleted and Checklist, where they read Bullet List and Task List | D-6 | |
| 40 | A glyph right-clicked inside a selection acts on its group, where it acted on the selection | D-2 | Yes |
| 41 | A selection inside one line acts as a caret does, on the item's group, and a selection holding a whole line narrows to that item. A word filling its item counts as inside the line | D-5 | Yes |
| 42 | A callout head stops drawing a dead glyph, and its `- foo` shows as text | F-1 | |

##### Right-Click

| # | What Changes | Decision | Flag |
|---|---|---|---|
| 43 | A right-click's rows can't write into a marker: at a number's end Bold writes `1. ****one`, where it wrote `1.**** one` | E-7 | |
| 44 | Bold on a word no longer drops silently after a link settles on the same line | E-7 | Yes |
| 45 | A selection ending in an inline code span stops offering a footnote, which wrote `` `abc[^1]` `` into the code | E-7 | Yes |
| 46 | A right-click on `_it_`'s outer edge checks Italic, which the row missed before | D-5 | Yes |
| 47 | Typing after a dismissed resting menu lands at the page's caret, where it went nowhere. The same holds after Copy, a pick that changes nothing, or an empty paste | E-2 | |
| 48 | A word seated in a resting cell shows a highlight in the selection color whatever Use Native Highlighting reads, and it clears when the menu closes | E-2, E-3 | |
| 49 | Every read-only surface offers Copy and Select All: the page reader, a glance, an unentered tile or tab or embed, a read-only table's cells, and the info pane. Undo through Paste, Speech, and Share leave. A link's or heading's own menu answers first, and a glyph there reads as text | E-4 | |

##### Words

| # | What Changes | Decision | Flag |
|---|---|---|---|
| 50 | A word gesture touching a contraction takes a quote it touches: double-clicking inside `'don't'` selects both quotes, and `'I don't'` reads `don't'` | E-6 | Yes |
| 51 | **Wider than the log wrote:** a contraction's neighbor across one gap can carry its own quote. A group left from `students' don't`'s gap runs to the word's start. A group right from `don't`'s end runs past `'quoted'`. Double-clicking `'quoted'`'s opening quote after a contraction selects `'quoted'` whole, and pressing `s`'s right half in `'tis don't` reads `'tis` | E-6 | Yes |
| 52 | `a'_b` reads `a`, where it read whole, and `𝒶'b` reads whole, where it stopped at the apostrophe | E-5 | |

##### Text Properties

| # | What Changes | Decision | Flag |
|---|---|---|---|
| 53 | A Text pane takes lists in full: `- milk` draws a glyph, and Lists ▸, the glyph menu, drag, the grip, rails, renumbering, and Preserve List-Level Formatting all reach it | G-1, G-10 | |
| 54 | In the pane Enter makes the next line, continuing an item on a list line and breaking a plain line elsewhere. **It no longer saves and closes.** Escape and the × do, with Escape closing in one press over a selection | G-10 | |
| 55 | Tab and Shift-Tab nest and outdent in the pane, and Shift-Enter stays a plain break, even on a list's last item | G-10 | Yes |
| 56 | A list value at rest draws its glyph and first item in tables, cards, and the Properties panel, with one `…` at the line's end when more lines follow, as in `• text text…` | G-3, G-7 | |
| 57 | That `…` also marks a plain value running onto a second line, which showed no sign before. One mark serves both clipped and continued, and a hover's scroll tells them apart | G-7 | Yes |
| 58 | A link on a value's later line no longer renders at rest, since only the first line draws | G-7 | Yes |
| 59 | A checkbox in a value at rest isn't clickable, and a click on a resting list opens the plain field showing its dash | G-8, G-12 | |
| 60 | A real YAML list under a Text key reads as its items' lines and draws as a list, where it read `[item, two]`. It keeps its shape on disk until the first edit | G-13 | |

##### Found While Building

| # | What Changes | Decision | Flag |
|---|---|---|---|
| 61 | A left press left of a bullet or box seats at the item's content, where it seated at the line's start, and at `****- item` a Bold no longer lands ahead of the marker | E-7 | Yes |
| 62 | Typing `/task`, `/bullet list`, or `/numbered list` in the `/` menu finds nothing, since each type carries one name | D-6 | Yes |
| 63 | In a language fence, a word gesture reaching a contraction drops that language's word characters: `$a's` in JS reads `a's` | E-5 | Yes |
| 64 | Callouts: `# > a` picked Callout writes `> [!callout] > a`, `> # a` writes `> [!callout] a`, a depth-two quote keeps its second marker, and a wide gap between quote markers in a callout body shows text, where it drew a dead glyph | F-1 | Yes |
| 65 | A right-aligned surface draws a value's box at the seat's start, so `☑ bought…` reads whole on Standard cards and the Properties panel | G-3 | Yes |
| 66 | A Standard card holding a box or a list draws its row a few pixels taller than one holding plain text | G-3 | Yes |
| 67 | A right-click on a connection glyph, an empty label, a code line number, or a citation reference, with the caret inside it, pops the live menu, where it moved the caret and popped nothing | E-1 | Yes |
| 68 | A right-click on a read-only cell, dismissed, leaves nothing for ⌘C, where Chromium's seated word stayed selected | E-4 | Yes |
| 69 | Select All from a read-only cell focuses its surface, so ⌘C copies the whole document, and a glance takes focus for it, against its rule of never taking focus | E-4 | Yes |
| 70 | Dragging a glyph past a selection leaves a caret, where the selection turned inside out and Backspace took lines nobody selected. A pick replacing a marker a selection sits in does the same | B-10, C-1 | Yes |
| 71 | A forward selection reaching a carried block's line stops at that line's start, so a triple-click and Backspace keeps the block riding | F-1 | Yes |
| 72 | Typing or Enter over a selection across items recounts the list, as Delete and paste do | B-10 | Yes |
| 73 | An ordinal past nine digits reads as text, as standard Markdown reads it, where a recount rounded its digits | B-1 | Yes |
| 74 | A value a tool wrote with `\r\n` draws its glyph at rest and stays as written through an untouched close, and an outside write lands as the document holds it | G-3, G-4 | Yes |
| 75 | On a cell or a Text pane, a line opening `> ` no longer counts as a blank lead, so `> ##` writes `§` there as `x ##` does | B-11 | Yes |
| 76 | A list behind an indented quote draws a flush quote's rails, where it drew none | B-9 | Yes |
| 77 | A right press in a glance records where focus was, so Select All from a read-only cell hands focus back when the glance closes | E-4 | Yes |

---

#### Contradictions

Everything the reports found against the log, and how it resolved. **Stands** marks what still contradicts something and stays that way.

##### Resolved

| Contradiction | Resolution |
|---|---|
| **F-1 names the block drag's stale numbers, and the patches change nothing a user sees** | Under B-5 the observed case is three lists, each keeping its number (9-T2). `moveRange` can't join or split a run, since `fenced` seats a blank on each side. The defect leaves with the reading that produced it, and #19 records it |
| **B-10 keeps a list's start, and a line above a list at 5 restarts it** | B-10's start belongs to the list as it stands. The first-item rule is what removes `arrived` and `settled`, and it's named in #14 |
| **B-10 names "the run an item leaves", and the stack recounts the whole list** | The run is a subset once a blank bounds a list, and "as simply as it allows" takes it (9-T14). #13 records the visible change |
| **D-4 says a re-pick leaves an item alone, and a keystroke can now repair numbers** | Both hold: a pick stops repairing, and a reshaping edit recounts its list. The log's repair path still works |
| **E-1 keeps Select All off a resting cell, and E-4 gives one to a read-only table's cells** | E-1 speaks of a cell in an editable table, which holds no editor to act on. E-4's row answers in the renderer and selects the page's view (5-T37), so a read-only table's Select All selects the page |
| **E-1's "no caret" and Bold's typing slot** | "As if the cell were focused" comes first, and `****` left at rest is a broken outcome. "No caret" describes a pick with nothing left to type |
| **C-5 keeps rows in every code block, and rows refuse on delimiters** | A delimiter holds the block rather than its code, and writing there destroys it: a named, reachable cause under *Caution Code* |
| **C-1 limits the block to lists, and a nested ` ```js ` reads as items** | C-1 as written: a nested fence is Markdown the block doesn't read, and pairing inside would be the second pass *Editor-Internals* forbids |
| **F-1's `-[x]` names one defect, and C-6's "other transforms stay off" wasn't true** | `||` and `‼!` also wrote in code (8-T16), and both close in Phase 2 |
| **`inSealedLine`: 1-T6.3 said it leaves, 7-T14 that it stays** | It leaves the walks and stays in the pick, since a null marker means writable plain code or sealed math and C-5 tells them apart |
| **`outOfReach`: 1-T6.3 gave it a plain-fence case** | It gains none. C-5 writes in plain code |
| **A glyph inside a selection: *Engine Reconciliation* removes `clickInside`'s `glyph`, and *Gestures Reconciliation* lists a glyph's pick as "its point, or the selection touching it"** | Resolved against the code and D-2: "a glyph acts on its group". Today `clickInside(…, glyph)` widens to the selection's lines (`menu.ts:36-39`). The parameter leaves, a glyph's pick reads its point alone, and that matches *Gestures Reconciliation*'s own *§Stays* line. `clickInside` stays for text rows, its row 18 |
| **7-T2 lists `blockPrefix` under the scan change** | Observed: it stands through *Scan Per Scope* and leaves in *Scan Stack* |
| **2-T19 says A-6 removes a gate from the Text Property Drive** | Read: that drive holds none. A-6 is satisfied there as it stands |
| **6-T14's +6 and "about +13"** | Every changed line. By the plan's rule the prototype reads +1 and section G's first figure about +8 |
| **4-T2's -36 as the grammar's price** | Base-only, and it predates B-2. On the stack the grammar reads -32 |
| **Engine's "`listRenumber.ts:12` is the obvious place" for 4 comment lines** | That comment is already one line on the stack, so it holds no recovery. *§The Baseline* names the real ones |
| **Gestures' "`'don't'` isn't the only departure"** | The log's E-6 names `'don't'`. Its own sentence accepts departures "at the smallest reach the mechanism allows", and *§The Word Rule* states that reach exactly. Resolved by acceptance, and it goes in the morning report as #51 |

##### Stands

| Contradiction | Why It Stays |
|---|---|
| **B-3 departs from GFM.** Other readers draw a box on `1. [ ] a` | The log rules it deliberately |
| **`codeHighlight.ts:55` colors `1. [ ] a` as a task inside a ` ```md ` block, where B-3 reads `[ ]` as text** | A language's own grammar colors the sample. No decision reaches it, and changing it would fork the Markdown language |
| **B-5 departs from other Markdown readers,** which read blank-separated items as one list, against the spirit of the Legibility lock | Ratified with its price known: 24 NexusOS files, 9 of them numbered |
| **The one mark for clipped and continued** | G-7 asks for an ellipsis, and the two meanings share one glyph |
| **The saved *Word Rule Prototype* against E-5** | It stays saved as it stands, and Phase 8 lands the rule in *§What's Built* |

---

#### Calls Taken

Every open question settled during reconciliation, one line each with its reason. None waits on a person. Where a report's number is given, its full reasoning sits there.

##### The Engine

- **The grip's extent:** the block, by D-2.
- **`firstItemOf`:** leaves, since D-2 asks for the block and a list block always opens on an item (0 of 60,000 fuzzed documents open elsewhere).
- **Typed shorthands in a Markdown block:** `-[]` and `->` work at a line's start, by C-6.
- **Lists ▸ in plain code:** rows stay and write, by C-5.
- **`notes.md`:** reads as Markdown, by C-4.
- **Whether Preserve earns its row:** it stays, by D-1.
- **The draw path:** stays, so the record needs no glyph field, by B-8 and *§Rejections*.
- **Does parity draw:** no glyph, drag, or box click in a block, by C-1.
- **The outside run:** steps past the block, by C-2.
- **A `+` picked Bulleted:** stays `+`, by D-4 and B-4.
- **`- [] bare` picked Checklist:** `- [ ] [] bare`, since `[] bare` is its text, by B-1.
- **Enter on `+`:** writes `-`, and `+ [ ] a` continues `- [ ] `, by B-4.
- **`+[]`:** writes `- [ ] `, by B-2.
- **`12|. a` in a block:** Backspace takes the whole marker, as on a page.
- **`Drop.line` and `Slot.line`:** stay, since a drag's start needs the pre-move head.
- **The block move's flags:** `fenced` and `heals`, since `spaced` leaves two blanks.
- **`rolesAgainst`'s body read:** stays one call choosing a body and a depth, with an offset to `continuesList` the remaining option at landing.
- **`moveRange`'s home:** `Engine/blockMove.ts`, since `blockModel.ts` imports `listModel.ts` and a move there is a cycle.
- **`openerOf`'s home:** private in `listModel.ts` behind `ridesList`, so one exported answer serves the block model and the rails.
- **`regionOf`:** stays inline, a field read at 7 sites.
- **`leadOf` twice:** the private one takes another name.
- **The table-header defect:** closes through masking and the block model's rewrite, both landing.
- **`Reader`:** leaves whole, since masking removes `'outside'`.
- **Whole-list recount:** yes, 24 fewer lines and one rule.
- **`1.`, `1.`, `1.`:** accepted, by B-5.
- **A dragged block's number:** keeps it, by B-5.
- **A line above a list at 5:** lands `1.`, `2.`, by the first-item rule.
- **A list's first item deleted:** the rest keep `2.`, `3.`, by B-10.
- **A writer stating more than `input.list`:** no, it would leave a selection deletion to the comparison and add a second route (9-T13).
- **Option+Up, Option+Down, dragged text:** outside this work and filed as an issue, since no decision names them and a swap needs a drag's care.
- **I-073:** closes, with the drag's exception stated in `dropChanges`' comment, by D-4 and *One Way*.
- **I-036:** stays open, rewritten to 15 compares and 6 defaults, by A-3.
- **I-071:** untouched, by A-3.
- **Where the start rule's prose lives:** *Editor-Internals*, with `renumberRuns`' comment staying its own, by *Comments*.
- **The stale drop:** one compare in `beginRelocateDrag`'s `onDrop` for both drags, removing `bStart < 0`, `tLine < 0`, and `listDrag.ts:11`'s comment, by *Caution Code*.
- **A glyph click inside a selection:** `clickInside`'s `glyph` parameter leaves, by D-2.
- **`listRenumber`'s `readsFrom`:** gone on the stack, and a deletion in a Markdown block counts.
- **`quoteDepths`:** stays, with no decision taking it.
- **A price against a later patch:** 4-T prices measure a cut alone, and only 4-T2's survives as a guide.

##### Code Blocks

- **A row picked twice in code:** writes again, `****word****` and `1. 1. - foo`, by C-5.
- **⌘B in code:** does what the Bold row does, by *One Way*, and `formatKeymap.test.ts:38` leaves.
- **A selection crossing into plain code:** list picks leave the code alone, Heading and Bold write, since `outOfReach` already holds that and it costs no code.
- **Rows on a delimiter line:** refuse, a named and reachable cause.
- **A nested ` ```js ` in ` ````md `:** its lines read as items, by C-1.
- **`> - item` in a top-level Markdown block:** isn't an item, since a quote isn't read there (8-T11).
- **Tabs and spaces mixed between fence and content:** accepted, hand-typed only (8-T5).
- **A nested fence's pairing:** declined, since *Editor-Internals* forbids a second pass.
- **`EditorMenuRequest` for code:** unchanged, since the ruling removes the host question.

##### Right-Click

- **Should a right-click enter the cell:** no, by E-1.
- **Should Chromium's word stand in place of a seat:** no, since E-5 needs one rule on every surface and the Menu Seat doesn't fire on a held selection.
- **Does Chromium reseat at a selection's edge:** no, Scout 5 observed it, so `clickInside` stands.
- **Why `cellStatic.tsx:639` exists:** it keeps focus and the Press Seat out of a resting cell, so it stays.
- **What the seat does at rest:** paints nothing by default, and E-3 fixes that.
- **Which seating model holds:** two seats, one at the press and one at the menu (5-T1).
- **The refusal and the synthetic event:** the refusal is earned and the event unreached.
- **`stopPropagation` at rest:** `:606` leaves and `:678` stays, since it protects a Text value's row menu.
- **A Ctrl-click's armed drag:** no guard, it self-cancels.
- **A right-click elsewhere demoting a live cell:** left alone, since no decision names it and nothing writes wrongly.
- **Bold's typing slot under E-1:** stays, since "as if focused" comes first.
- **A word filling an item, for D-5:** isn't a whole line, which includes its marker.
- **What a glyph's pick acts on after D-5:** its point, since it seats nothing.
- **The citation row's end rule:** a defect, fixed at `citationSeatAt`.
- **Should the refusal be scoped to caret seats:** no, a condition to save a listener that fires nothing.
- **Does Windows change any of this:** no, every lever is a DOM event.
- **`!!edge`:** stays, unconfirmed and the type asks for it.
- **E-2's route:** the seat leaves the document's selection, by `CSS.highlights`, with its fallback named.

##### Read-Only Surfaces

- **Which surfaces count for E-4:** every `EditorView` that can't be edited, a glance being a tile not edited.
- **Do resting Text and Link values count:** no, they answer with their row's menu.
- **Do Speech and Share stay:** no, E-4 names Copy and Select All.
- **Is Copy off with nothing selected:** yes, as `restingEditItems` does.
- **A glyph on a read-only surface:** reads as text, since a type menu would offer a write.

##### Words

- **E-6 against the atoms:** keep E-6, since every departure is a quote joining a real word at a contraction's edge, and no word breaks wrongly inside.
- **Does the rule hold in code:** yes, as today, since C-3 concerns lists.
- **`_`:** leaves the test and stays in the walk, by E-5.
- **The resting call site:** takes `extensions: contractions`, since it has no view.
- **A neighbor's quote:** rides only where a walk reaches a contraction, by this pass's tightening.

##### Text Properties

- **Is sharing a cell's reading rules acceptable:** yes, by G-6 and G-9.
- **Should Enter off a list close the pane:** no, by G-10.
- **Do the keys need the pane's keymap touched:** yes, in one place.
- **Shift-Enter on the last item:** a plain line, since a pane has its own exits.
- **Escape over a selection:** the pane binds it, so one press saves and closes.
- **Is a list being Pommora's alone fine:** yes, by G-4 and G-11.
- **Is `- milk` in the field fine:** yes, by G-12.
- **The `/` menu in the pane:** no, by G-10.
- **One `…` for clipped and continued:** fine, since the hover scroll tells them apart.
- **A nested or multi-line YAML member:** one flow line, or its own lines if it holds a break, and the compare keeps the file whole.

##### This Pass

- **`restoreTrailingItem`:** reads the parser in Phase 7, since `BARE_TASK` restates the grammar and B-1 asks for one classification.
- **B-7's record:** `marker` and `rail` only, and CSS stays out, since B-8 keeps drawing.
- **The rename's timing:** the head of Phase 6, once every saved patch has landed.
- **The drives' timing:** last, since neither keeps a gate. E-3's paint is driven in Phase 9, so its fallback can still be taken.
- **The key merge's place:** after the grammar, so the keys' disagreement over a marker nothing draws has already left.

---

#### The Reconciliation List

Everything the work makes false, by kind. Phases say when each changes.

##### Documents

| Site | What Changes | Phase |
|---|---|---|
| `.claude/Guidelines/Editor-Internals.md:18` | A cell's model stops being page-shaped; the paragraph leaves whole | 1 |
| `Editor-Internals.md:40` | Whole: the writers, the start rule, siblings, the code-block sentence, and "a blank line carries a run". *Numbering and Edges* carries a rewrite against `b7f2f17a5`, which needs the scan and parity wording folded in | 2, 3 |
| `Editor-Internals.md:24`, `:37` | Only if the list gesture or rail emission moves | 3 |
| `Editor-Internals.md`, the grip entry | 5-T39's Menu Seat, which it omits | 9 |
| `.claude/Features/MarkdownPM.md:10` | The scope line: Markdown code blocks read lists, and a pane reads what a cell reads | 2, 10 |
| `MarkdownPM.md:24` | `+`, "one indent zone", loose lists, the start rule, the Preserve clause, Format ▸ | 3, 5, 7 |
| `MarkdownPM.md:25`, `:257` | `+` takes a rail | 5 |
| `MarkdownPM.md:88` | The shorthand writes `- [ ] ` | 5 |
| `MarkdownPM.md:105` | Cell keys, the shared scope, and a pane's lists | 6, 10 |
| `MarkdownPM.md:138`, `:258` | Format ▸ | 7 |
| `MarkdownPM.md:146` | One range, read-only menus, a resting seat | 9 |
| `MarkdownPM.md:153` | Each type's one name | 7 |
| `MarkdownPM.md:130` | Citations, if files move | 3 |
| `.claude/Features/PropertiesPM.md:60` | A pane's lists and the resting value's mark | 10 |
| `.claude/Features/ConfigurationPM.md:152` | Preserve doesn't reach a grip | 3 |
| `.claude/scripts/README.md:100` | The List Types Drive paragraph, its "item drawing no glyph", and the Text Property paragraph | 11 |
| `.claude/IssuesPM.md` | I-073 closes; I-036's text and footnote; I-016's `- [] hello` example; I-068 narrows if its fix lands; a new issue for Option+Up, Option+Down, and dragged text | 3, 5, 11 |
| `.claude/Planning/Text Properties — Implementation Plan.md`, *§Context* | Says the pane mounts `'cell'`, against its own *§Deviations*. A record of its time, so it stays, and the log's *§Sources* already names what reverses it | — |

##### Comments

| Site | What's False | Phase |
|---|---|---|
| `Input/listRenumber.ts:12` | A second copy of *Editor-Internals* line 40; one line on the stack | 3 |
| `readsFrom`'s docblock | Leaves with it | 2 |
| `detect.ts:508` | "Every reader that walks a line takes the scope it is walking for" | 1 |
| `Input/edits.ts:229` | "the scan, which is always page-shaped" | 1 |
| `format.ts:267` | "Read by every formatter": two callers | 3 |
| `format.ts:363` | The re-pick restart and I-073 | 3 |
| `intents.ts:128-131`, `CellEditor.tsx:59`, `cellStatic.tsx:285` | "a `+` item is Arrowed", "a marker nothing draws" | 5 |
| `intents.ts:104` | `+` among the rail-less | 5 |
| `Gestures/listDrag.ts:11` | "the doc is static during a drag" | 3 |
| `Input/markdownInput.ts:300` | `wordAt`'s doc | 8 |
| `menu.ts:41` | Narrows to the Menu Seat (5-T41) and loses the announced event | 9 |
| `menu.ts:49` | The two ranges | 9 |
| `Gestures/pointerPath.ts:48` | "The menu never appears" fails; the caret would end inside the link (5-T40) | 9 |
| `Tables/MarkdownTable.tsx:494` | "Captured, because a cell's own menu handler claims the event" | 9 |
| `Links/pasteLink.ts:128` | Leaves with `isConnected` | 9 |
| `Core/Properties/propertyValue.ts:39` | `asText`'s doc | 10 |
| `UIX/Table/table.css:246`, `TextCell.tsx`, `ValueEditor.tsx:134` | Wrapping container, per-line draw, the pane's keys | 10 |

##### Tests

| Tests | Decision | Do | Phase |
|---|---|---|---|
| `format.test.ts:98`, `formatKeymap.test.ts:38` | C-5 | Leave | 2 |
| `format.test.ts:147` | C-5 | Keep its inline-code half | 2 |
| `listRenumber.test.ts:168`, `:174` | C-3 | Re-aim at ` ```md ` | 2 |
| `docScan.test.ts` generator | *Editor-Internals* | Alphabet takes Markdown fence lines | 2 |
| `intents.test.ts:740` | B-5 | Patch rewrites | 3 |
| `listModel.test.ts:55`, `:75`, `:94`, `:106` | B-5, B-6 | Patch rewrites | 3 |
| `format.test.ts:304`, `:335` | B-6, D-4 | Patch rewrites | 3 |
| `listRenumber.test.ts:54`, `:116`, `:143`, `:149`, `:152`, `:174` | B-5, D-4 | Patch rewrites | 3 |
| `listRenumber.test.ts:83`, `:105` | B-5, 9-T14 | Patch rewrites | 3 |
| `gripMenuFlow.test.tsx:94`, `:109`, `:117` | D-2, B-6 | Patch rewrites | 3 |
| 15 `moveRange` cases | 9-T11 | Move to `blockMove.test.ts` | 3 |
| *Paste Recount*'s helper | Lint | Takes a block body | 4 |
| The nine in *§The Grammar on the Stack* | B-1, B-2, B-9 | Rewrite | 5 |
| `cellLists.test.tsx:349` | B-1 | Overturned, and the keys read one way | 5 |
| `Core/Actions/blockMenu.test.ts:19-23`, `:60`, `:68`, `:104-105`, `Core/Actions/gripMenu.test.ts:51`, `gripMenuFlow.test.tsx` rows | D-3, D-6 | Rewrite | 7 |
| `textScope.test.tsx`, `describe('a word')` | E-6 | Add the pins | 8 |
| `editorMenu.test.tsx:235` | E-7 | Leaves with the synthetic event | 9 |
| `Desktop/Actions/editorMenu.test.ts:45-59` | E-7 | Leaves with `atClick` | 9 |
| `editorMenu.test.tsx:116`, `cellRestingMenu.test.tsx:311` | D-2 | Change the glyph's reach | 9 |
| `listRenumber.test.ts:83` | D-5 | Selects the whole line | 9 |
| `cellRestingMenu.test.tsx:221` | E-4 | Overturned | 9 |
| `cellStatic.test.tsx:113`, `Core/Testing/editorHarness.ts:124-130` | E-4 | Harness gains `format`, and the test runs the menu | 9 |
| The resting harness | E-2 | A `CSS.highlights` stub | 9 |
| `Cell.test.tsx:269`, `:288` | G-7 | Overturned | 10 |
| `TextPane.test.tsx:117`, `:137`, `:150` | G-10 | The named assertions change; `:179`, `:193`, `:236` hold | 10 |
| `textScope.test.tsx` negatives | G-5 | Hold for the field | 10 |
| `propertyValue.test.ts:55`, `:62`, `:66-69`, `governedRoot.test.ts:278` | G-13 | Rewrite | 10 |

**Pins to Add:** *7-T7*'s cell literal constructs, ` ```md ` counterparts of `edits.test.ts:82-99`, `:172`, and `listRenumber.test.ts:46`, `+[]`, a `blockMove.test.ts` pin that a block move can't join a run, a carried block's own run, and the word rule's five.

**Mechanism Pins:** 2-T5 lists what goes false while behavior holds, and 2-T6 the selector version. *Where Fewer Tests Could Prove the Same* in Report 2 names about twelve redundant recount pins and five near-identical `moveRange` cases, available for simplification review.

##### Drives

| Drive | What's False | Phase |
|---|---|---|
| `List Types Drive/live-drive.mjs:3`, `:12` | `phasedItem` and `POMMORA_LGM_LANDED` leave, and A-6's decision ids replace the plan's | 11 |
| `List Types Drive`, `:58-62` and `:248`, `:255`, `:315` | `shown` reads a range; it reads the seated range, with a screenshot for paint | 9, 11 |
| `List Types Drive`, group 1 `+ p`, group 3 `+ a<br>+ b` | Check Bulleted, not Arrowed | 11 |
| `List Types Drive`, group 1 `- [] bare` | The pick writes `- [ ] [] bare` | 11 |
| `List Types Drive`, `:128-132`, `:234`, `:242`, `:264-303` | `Task List`, `Bullet List`, `Numbered List` become each type's one name | 11 |
| `List Types Drive`, the code-block items | C-5's pick writes with no counting (2-T22's correction) | 11 |
| `List Types Drive`, group 3 and 4's C-6 word and Bold items | Move to the word rule's pins | 11 |
| `Text Property Drive/live-drive.mjs:145-146` | `Drive List` reads `•milk` | 11 |
| `Text Property Drive`, `:147-149` | "Drive Prose's cell draws every line": only the first renders. No report names this one | 11 |
| `Text Property Drive`, `:151`, `:532-533`, `:542`, `:578`, `:634`, `:649` | The list-as-prose pins | 11 |
| `Text Property Drive`, `:596-597` | "Enter saves and closes" | 11 |
| `Text Property Drive`, `:37`, `:40`, `:213`, `:217` | `inline` and `shown` read a list as its lines | 11 |
| `Text Property Drive`, `:157-160` | Holds, and is the pin for "keeping its shape" | — |
| `editor-parity/run.mjs` | Holds: checkboxes and one flat drag | — |

---

#### The Baseline

##### Gates

| Gate | `b7f2f17a5` | *Engine Stack* | Stack + Grammar |
|---|---|---|---|
| Test Files | 549 passed | 547 passed, 3 failed, 550 total | 544 passed, 6 failed, 550 total |
| Tests | 9,121 passed, 2 skipped, 9,123 total | 9,145 passed, 5 failed, 2 skipped, 9,152 total | 9,136 passed, 14 failed, 2 skipped, 9,152 total |
| `npm run typecheck` | Clean, every project | Clean on `UIX`, `Core`, `Core/tsconfig.src.json`, both `Desktop` projects, and `Sync`; the dashboard's doesn't resolve from an export | `Core` and its source project clean; the rest not re-run |
| `biome check .` | Clean, 1,433 files | 1 error, the Paste helper | Not run |
| `no-wrapped-comments`, `no-name-mentions` | Clean | The first clean; the second not run, since it lives outside the export | Not run |
| `npm run build` | Not run | Not run | Not run |

The suite took about 68 seconds. The extra test file on the stack is `blockMove.test.ts`.

**Known Flaky Suites:** `citationBreakage` and `embedAbsorb` timed out once under load in Scouts 4 and 9, and they passed in every later run, including all three here. `Sync/handlers.test.ts` and two others were dropped as flakes by *6-T22*, since the full Core run showed none. No flake appeared in this pass.

##### The Comment Ledger

Counted by the log's command, `git grep -c -E '^[[:space:]]*(//|/\*\*|/\*)' -- 'Core' 'Desktop' 'UIX' 'Sync' ':!*.test.*'` summed. The cap reads 3,511.

| Patch | Comment Delta | Applies To |
|---|---|---|
| *Scan Per Scope* | +1 (+9 / -8) | Phase 1 |
| *Code-Block Parity Prototype* | +5 (+9 / -4) | Superseded |
| *Masked Markers* | +5 (+9 / -4) | Superseded |
| *Scan Stack* | +4 (+14 / -10) | Phases 1 and 2 |
| *Blank-Line Walks* | +4 (+14 / -10) | Superseded |
| *Numbering and Edges* | 0 (+12 / -12) | Phase 3 |
| *Paste Recount* | 0 (+1 / -1) | Phase 4 |
| *List Tree* | +5 (+16 / -11) | Declined |
| *Engine Stack* | +4 (+25 / -21) | Phases 1 to 4 |
| *Word Rule Prototype* | +1 (+2 / -1) | Phase 8 |
| *Text Pane Prototype* | +1 (+9 / -8) | Phases 6 and 10 |

| After Phase | Count | Over Cap | Basis |
|---|---|---|---|
| Head | 3,511 | 0 | Observed |
| 1 | 3,512 | +1 | Observed |
| 2 | 3,515 | +4 | Observed |
| 3, 4 | 3,514 | +3 | Observed at 3,515 on the stack; `listDrag.ts:11` leaves with the stale-drop compare, -1 if that compare's reason sits in `editorGesture.ts`' existing doc rather than a new line |
| 5 | 3,511 | 0 | Observed as -3 |
| 6 | 3,511 | 0 | The prototype's key files read 0: `markdownInput.ts` +5, `CellEditor.tsx` -5 |
| 7 | About 3,510 | -1 | `intents.ts:104` leaves with `railTypeClass` |
| 8 | About 3,511 | 0 | Observed as +1 on the stack |
| 9 | About 3,509 | -2 | Three leave and E-2 with E-4 adds about one, below |
| 10 | About 3,510 | -1 | The prototype's pane files read +1, in `cellStatic.tsx` |
| 11 | About 3,510 | -1 | No production comments |

**Where the Lines Come Back:** five comments leave with the code they explain. The stale-drop compare takes `listDrag.ts:11` in Phase 3, Phase 7's record takes `intents.ts:104`, and Phase 9's rows take `MarkdownTable.tsx:494`, `pasteLink.ts:128`, and `atClick`'s doc at `Desktop/Actions/editorMenu.ts:37`. *Engine Reconciliation*'s named source, `listRenumber.ts:12`, is already one line on the stack and yields nothing more.

**The Cap Is Live:** the count sits over 3,511 from Phase 1 until Phase 5, by up to 4, and has a margin of about one from there, which that Phase 3 line decides. The log's constraint reads at the end, so that's allowed, and the ledger should run at every phase rather than be reconciled in Phase 11. No comment may grow to carry what another held, and a shortened line counts the same as a long one, so the count alone can't hold that half.

##### Line Counts

| Tree | Net | Added | Removed | Files |
|---|---|---|---|---|
| *Scan Per Scope* | -87 | 502 | 589 | 43 |
| *Scan Stack* | -24 | 618 | 642 | 44 |
| *Engine Stack* | -106 | 760 | 866 | 46 |
| Phase 2's step | +63 | 165 | 102 | 10 |
| Phases 3 and 4's step | -82 | | | 12 |
| Grammar on the stack | -32 | 41 | 73 | 6 |
| Word rule on the stack | -50 | 16 | 66 | 3 |

**What's Measured Against What:** The log's *The Number* measures from `b7f2f17a5` across the whole work. **Built,** the sum of Phases 1 to 5 and 8 reads **-188**. The grammar and the word rule were each built alone on the stack, and they touch different lines of `cellStatic.tsx`, so their sum holds. **Estimated,** Phases 6, 7, 9, and 10 net about -3, with Phase 9's +12 the least certain.

**Not Re-Run:** the fuzz, the timing tables, and the live probes stand as their reports recorded them. Scout 5's readings came from the running app, and its scripts sit in the session scratchpad's `press-probe/`.

---

#### What Waits on a Live Run

- **Whether `::highlight()` paints `--text-selection` in a resting cell (E-3).** Phase 9 drives it and takes the fallback if it refuses.
- **Whether a press left of a glyph reaches a bullet's line start (E-7).** The rewritten drive presses there, and `intents.ts:625`'s arm widens only if it does.

**One Notice for the Morning Report:** E-6's accepted departure is wider than the log wrote (#51). The run proceeds on the tightened rule, and a person's word is needed only to prefer the atoms, which would cost 50 lines.

---

#### Report Map

| Topic | Where the Detail Lives |
|---|---|
| The full inventory of readers and writers | *Reconciled/1*, *1-T1* |
| Every doc line and test pin, classed | *Reconciled/2* |
| The drive rewrite's matrix | *Reconciled/2*, *§The Drive Rewrite* |
| The right-click's map | *Reconciled/3* |
| Live event order and seating | *Reconciled/5* |
| The pane's keys, and G-13's code | *Reconciled/6*, *6-T24*, *6-T35*, *6-T36* |
| `surfaceScope` and masking | *Reconciled/7* |
| Code-block behavior case by case | *Reconciled/8* |
| The walks, numbering, and paste | *Reconciled/9* |
| How the stack was merged | *Engine Reconciliation*, *§The Trial* |
| The removal list's verdicts | *Gestures Reconciliation*, *§Verified Removal List* |
