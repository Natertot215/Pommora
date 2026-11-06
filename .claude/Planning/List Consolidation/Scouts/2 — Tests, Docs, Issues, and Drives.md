### Scout 2 — Tests, Docs, Issues, and Drives

**DATE:** 11-05-2026
**BASE:** `b7f2f17a5`
**SCOPE:** Read-only inventory of what describes, pins, or drives the editor's list handling. All 16 core list test files run green (674 tests). Nothing was mutation-tested, so "pinned" below means a test asserts the behavior as read, not that a revert was seen going red.

**Pin Classes:** **Behavior** is a document before and after a gesture, a menu's rows, or a drawn glyph. **Mechanism** is a function's return shape, a flag, a user event, or a class string. **Intent** marks a `DecoIntent` assertion: it stands for a drawn glyph but reads the internal stream, so it's Mechanism-coupled.

---

#### 1. Tests

##### Inventory by File

| File | List Cases | Class | Reaches | What the Cases Pin |
|---|---|---|---|---|
| `Core/MarkdownPM/Engine/listModel.test.ts` | 28 of 43, plus 15 `moveRange` | Behavior through a pure seam; 3 Mechanism | `subBlockAt`, `dropChanges`, `renumberRuns`, `checkboxToggleChange`, `moveRange` | What a drag carries (math, wraps, quote boxes, loose items), drop results, renumber after a move, re-nesting via `slot.indent`, checkbox toggle text, block moves |
| `Core/MarkdownPM/Input/listRenumber.test.ts` | 31 of 31 | Behavior through `landEdit`; 4 Mechanism | `listRenumber`, `landEdit`, `editEvent`, `continueListOnEnter`, `indentListOnTab`, `outdentListOnShiftTab`, `smartBackspace`, `setList` | Line deletion closes gaps, level change recounts both runs, Enter recount, Lists ▸ joining a run, fence and math isolation |
| `Core/MarkdownPM/Input/edits.test.ts` | ~33 of 156: list Enter 10, Shift+Tab 1, Backspace 6, checkbox 3, Tab 4, callout lists ~6, `-> ` arrow-list 1, fence edges 2 | Behavior through `apply`; `.selection` and `toBeNull` Mechanism-leaning | `continueListOnEnter`, `indentListOnTab`, `outdentListOnShiftTab`, `smartBackspace`, `canonicalizeCheckbox` | Per-key results at page scope, including inside callouts |
| `Core/MarkdownPM/Input/format.test.ts` | 23 of 75: `setList` 10, pick reach 2, `listKindOf` 3, whole block 7, `setHeading` over a marker 1 | Behavior; 2 Mechanism | `setList`, `listKindOf`, private `listReach` | Which lines a pick reaches, the Preserve setting, the check |
| `Core/MarkdownPM/Input/formatState.test.ts` | 1 | Behavior | `readFormatState` → `listKindOf` | Kind under the caret, `text` scope null |
| `Core/MarkdownPM/Engine/detect.test.ts` | 15 of 65: `parseListMarker` 10 (9 `toEqual` on span shape), prefixed 4, thematic 1 | Mechanism (span record), Behavior by consequence | `parseListMarker`, `parseListMarkerPrefixed`, `indentLevel` | The grammar: `-` and `+`, `*` as prose, `[]` as bullet, `→`, cap |
| `Core/MarkdownPM/Engine/intents.test.ts` | ~22 of 94: reveal 1, bullet to task ~11, callout 2, rails 8 | Intent | `decorationsFor` (harness), `assembleLineIntents`, `docLineIntents` | Glyph kind, reveal, hidden gap, level, rails |
| `Core/MarkdownPM/Engine/intents.test.ts` `cached assembly ≡ pure derivation` | 20 parameterized | Invariant | `assembleLineIntents` | Cached equals whole-document at every caret, corpus includes lists |
| `Core/MarkdownPM/Engine/listMarkerSeats.test.tsx` | 9 of 14 | Behavior (real `moveByChar`) | atomic ranges, `seatPastMarker` | Caret seats around a marker, focused and not |
| `Core/MarkdownPM/Engine/blockModel.test.ts` | 8 | Behavior of the block shape | `blockAt`, `blockStarts` | List as a block, wraps, riders, blank-split blocks ("V1 decision, pinned") |
| `Core/MarkdownPM/Engine/docScan.test.ts` | 1 describe | Mechanism | `scanDoc` | Fence pairing under a quoted item |
| `Core/MarkdownPM/Engine/subfieldStats.test.ts` | 5 | Behavior of the footer | `computeStats` | Marker counts nothing |
| `Core/MarkdownPM/regressionPins.test.ts` | 7 | 5 Mechanism, 2 Behavior | `continueListOnEnter`, `outdentListOnShiftTab`, `setList`, `renumberRuns` | See 2-T5 |
| `Core/MarkdownPM/Tables/cellLists.test.tsx` | 23 of 26 (the highlight, link-span, and table-paste cases aren't list cases) | Behavior (DOM + keys) | `CellEditor`, `cellStatic`, `decorationsFor` | Glyphs at rest, every key in a cell, resting toggle, grip |
| `Core/MarkdownPM/Tables/cellRestingMenu.test.tsx` | 5 | Behavior, seam-coupled | `cellStatic` → `editFor`, `landEdit` | Lists rows and the glyph menu at rest, cut across a run |
| `Core/MarkdownPM/Tables/cellOffsets.test.tsx` | 2 | Behavior | `cellStatic` offset maps | Drawn point to source on a list line |
| `Core/MarkdownPM/Menus/gripMenuFlow.test.tsx` | 4 + 1 right-press | Behavior; rows self-referential (2-T7) | `gripMenu`, `editFor` | Type ▸ reach, setting, check |
| `Core/MarkdownPM/Menus/editorMenu.test.tsx` | 2 | Behavior | `editorMenu`, `editFor` | Glyph with a selection, moved document; paste on a list line |
| `Core/MarkdownPM/Menus/blockMenuFlow.test.tsx` | 1 | Behavior | block menu → `setList` | `/numbered` continues, one undo |
| `Core/Actions/gripMenu.test.ts` | 1 | Behavior (rows) | `gripMenuItems` | Type and glyph rows |
| `Core/Actions/editorMenu.test.ts` | 3 | Behavior (rows) | `editorContextItems` | Lists submenu order, check, cell trim |
| `Core/Actions/blockMenu.test.ts` | 2 | Behavior (rows) | block menu model | Slash rows and narrowing |
| `Core/MarkdownPM/Gestures/listDragTap.test.tsx` | 3 | Behavior; 1 reads `[data-grabbing]` | `listDragExtension` | Tap versus drag, Ctrl-click, sibling teardown |
| `Core/MarkdownPM/textScope.test.tsx` | 3 | Behavior (negative) | `decorationsFor`, `smartBackspace`, `canonicalizeCheckbox`, the surface | Text scope reads no list |
| `Core/MarkdownPM/prefixSeat.test.tsx` | 2 | 1 Behavior, 1 Mechanism (`userEvent` list) | `smartDelete` | Home on a quoted bullet; marker Backspace "lands as a delete" |
| `Core/MarkdownPM/Guards/tableGuard.test.ts`, `citationGuard.test.ts` | 2, 2 | Behavior | the guards | Table paste refused on a list line; a marker in the citations run |

**False Positives From the Seed Grep:** `Core/Files/atomicWrite.test.ts`, `Core/Matrix/Engine/engine.test.ts`, `Core/Nexus/owed.test.ts`, `Core/Nexus/treeDelta.test.ts`, and `aliasPicker.test.tsx` hit on `list:` or a word and test no Markdown list. `edits.test.ts`'s `bullet` cases are the ` ^ ` → `•` transform, which is typography rather than lists.

**2-T1 — Exports Held Only for Tests:** three exports have no importer outside their own file besides tests: `setList` and `setBlock` (`format.ts`, production reaches both through `editFor` at lines 185 and 187) and `indentLevel` (`detect.ts`, called only by `parseListMarker`). All three have an in-file caller. `Slot` (`listModel.ts:144`) is exported with no importer at all; its other hits are unrelated types of the same name.

**2-T2 — A Production Function Doubles as the Test Seam:** `landEdit` (`listRenumber.ts:80`) has one production caller, `cellStatic.tsx:474`, and is the base of `apply`, `at`, `listed`, and `land` across four test files. Removing it from production means rehoming it in `Core/Testing/`, or the tests' main route vanishes.

**2-T3 — Behaviors Pinned More Than Once:**

| Behavior | Pins |
|---|---|
| Enter recounts the run below | `edits.test` 57, 63; `listRenumber.test` 109-127; `regressionPins.test` 126; `cellLists.test` 205; `edits.test` 971 (callout) |
| A broken run repairs | `listModel.test` `fixes a broken run`; `format.test` 335; `listRenumber.test` 123 |
| Recount past a sublist | `regressionPins.test` 126, 182; `listRenumber.test` 25 (second expect), 136; `listModel.test` 126-130 |
| A rider stays with its item | `listModel.test` 10-36; `blockModel.test` 276-292; `format.test` 304; `regressionPins.test` 187; `listRenumber.test` 119 |
| Moved item with a child renumbers | `listModel.test`, five near-identical cases in one describe |
| Checkbox toggle | `listModel.test` (pure, 3); `listDragTap.test` 32; `cellLists.test` 306, 318; editor-parity |
| Tab, Shift-Tab, cap | `edits.test` 102, 849-862; `regressionPins.test` 151; `cellLists.test` 110-132; `detect.test` 120 |
| Whole-marker Backspace | `edits.test` 115-150, 983; `listRenumber.test` 83; `cellLists.test` 145; `textScope.test` 81 (negative); `prefixSeat.test` 150 |
| `-[]` canonicalizes | `edits.test` 162; `cellLists.test` 219; `textScope.test` 81 |
| Preserve setting's reach | `format.test` 256-262; `gripMenuFlow.test` 94; drive g1, g4, g5 |
| Type rows | `Core/Actions/gripMenu.test` 51; `gripMenuFlow.test` 86, 109, 117; `cellRestingMenu.test` 311; drive g1, g2, g3 |
| Bullet draws as `•`, caret reveals | `intents.test` 198, 228, 234; `listMarkerSeats.test` 59-67; `cellLists.test` 86 |

**2-T4 — Helpers:**

- **Shared:** `Core/Testing/editorHarness.ts` (`mountEditor`, `cleanupEditor`, `stubEditorBridge`, `seedHost`, `editorContainer`), `Core/Testing/markdownEngine.ts`'s `decorationsFor`, and `@pommora/uix/Utilities/pointerHarness`.
- **`decorationsFor` Isn't Thin:** it's a parallel whole-document derivation, the reference the cached assembly answers to, and every Intent pin runs through it.
- **Same Body, Several Files:** `apply` in `edits.test:34` and `format.test:16` (both wrap `landEdit`); `listed` in `format.test:20` and `listRenumber.test:129` (both `setList` → `landEdit`, differing in defaults); `land`/`at` in `listRenumber.test:63-65`; `tableEl` and `enterCell` in `cellLists.test` and `cellHeadings.test`.
- **Same Name, Different Bodies:** `liveCell` in four files and `rightClick` in four (`editorMenu`, `cellRestingMenu`, `linkEdit`, `externalLink`) answer differently per surface; `del` in `gripMenu.test` isn't `listRenumber.test`'s.

**2-T5 — Pins That Are Plainly Mechanism:**

| Site | Pin | Goes Red When |
|---|---|---|
| `regressionPins.test.ts:134`, `:152-158` | `toEqual({… relist: true})` | The `relist` flag or `Edit` shape changes |
| `regressionPins.test.ts:177`, `:185`, `:189`, `:191` | Exact `TextEdit` arrays with offsets | Edit minimality or the `renumberRuns` signature changes |
| `listModel.test.ts:187` | `renumberRuns` returns `[]` | Same |
| `format.test.ts:232`, `:332` | `.selection` undefined; `.changes` `[]` | A pick's no-op moves elsewhere |
| `listRenumber.test.ts:42` | `input` isn't judged | Recount stops gating on user events |
| `listRenumber.test.ts:162-173` | A forged edit with `editEvent({ relist: true })` | The flag goes; no gesture produces that edit |
| `listRenumber.test.ts` `del`, `:14` | Raw `listRenumber` filter + `delete` event | The filter stops being a transaction filter |
| `prefixSeat.test.tsx:150` | `userEvent` equals `['delete']` | A Backspace's event changes |
| `detect.test.ts:44-110` | `ListMarker` span records | The marker record's fields change |
| `intents.test.ts:241-290`, `:695-790` | Verbatim classes, `[level, head, first, end]` tuples | Class names or `RailIntent` change |
| `cellRestingMenu.test.tsx:311` | `grip` called with `{ kind: 'glyph', current }` | The host menu seam changes |
| `listModel.test.ts` `drop`, `:39` | `{ at, line }` slot, `dropChanges` signature | The drop API changes, though the asserted text is Behavior |

**2-T6 — Selector Coupling:** `.md-list-glyph`, `.md-list-item`, `.md-list-text`, `.md-list-checkbox-seat`, `.md-list-bullet`, `.md-list-item > [data-src]`, and `[data-grabbing]` are read by `cellLists`, `listDragTap`, `editorMenu`, the drive, and editor-parity. A rename turns those red with nothing a user sees changed.

**2-T7 — Self-Referential Row Pins:** `gripMenuFlow.test.tsx:90`, `:113`, `:119`, `:122` compare against `gripMenuItems(…)` itself, so they prove which context was passed, while the row text lives only in `Core/Actions/gripMenu.test.ts`.

**2-T8 — What No Test Reaches:**

- **Drop Geometry:** `collectBoundaries` and `lineRightEdge` in `listDrag.ts`. `listDragTap.test.tsx`'s header says geometry "stays with the model suite," but the model suite starts from a hand-made slot, so a real drag's slot is pinned nowhere; a drag is live-driven only by editor-parity's one flat case.
- **The Rail Draw:** `Outliner Lines` on or off, the resting cell's rails (`cellStatic` calls `railIntents`), and the DOM a rail makes. Rails are pinned as intents only.
- **A List Row's Delete:** `MarkdownPM.md:138` and `:105` promise it; `gripMenu.test:51` reads `items[0]` alone and the flow tests are self-referential.
- **A Glyph Drag in a Cell:** `MarkdownPM.md:105` claims items "reorder by their glyph"; only `cellLists.test` 295's grip presence is pinned.

---

#### 2. Documents

`Features/InteractionPM.md` states nothing about Markdown lists; its "list" hits are row lists and menus. `Guidelines/Development-Environment.md` has only drive-adjacent lines (15, 19, 20).

##### `Features/MarkdownPM.md`

| Line | Quote | Class |
|---|---|---|
| 10 | "A page reads every block, a table cell lists and inline marks, and a value's pane or field inline marks alone, none applying inside a fence pair." | Behavior |
| 19 | "A construct's markers — … the dashes of a list — appear as literal, editable text while the caret is inside it, and are hidden or replaced by styling the moment it leaves." | Behavior |
| 19 | "The chrome the editor draws — … list glyphs — exists only on screen, while reveal is line-scoped for inline marks, headings, and the thematic break, and marker-local for list glyphs…" | Behavior |
| 19 | "A container's hidden line prefix — … a nested code block's or list item's indent … — is a span the caret never rests in…" | Behavior |
| 24 | "Bullets (`-`, drawn as `•`), `+`, arrows (typed `->`, drawn `→`), numbered lists, alphabetical lists (`A.` through `Z.`, restarting at `A`), and GFM checklists all share one indent zone and one set of behaviors." | Behavior |
| 24 | "Every edit that reshapes a numbered or lettered run recounts it in the same stroke: Enter continues the run and counts on below, deleting an item closes the gap, Tab or Shift+Tab recounts both runs an item moves between, and a line the **Lists ▸** menu turns into an item takes its place in the run it joins." | Behavior |
| 24 | "A nested run counts from 1 or A, a top-level run keeps the number it began at, and items a blank line apart count as one loose list." | Behavior |
| 24 | "Dragging an item by its glyph moves it together with its nested block and renumbers as it lands." | Behavior |
| 24 | "Right-clicking a glyph offers the five types for its item's group — with **Preserve List-Level Formatting** on, the siblings sharing its type; off, the siblings and everything nested under them — as **Lists ▸** does from an item's text and the grip menu's **Type ▸** from its block's first item, while a selection changes exactly the lines it reaches and a triple-clicked line only its own, and a pick leaves an item already of the type alone and recounts the numbered or lettered items it reaches from 1 or A." | Behavior |
| 25 | "An optional hairline guide down each nested list run, one per ancestor level, turned on with **Outliner Lines**. It covers dash bullets, checklists, and alphabetical lists." | Behavior |
| 27 | "Headings, lists, quotes, footnote markers, and embeds inside a block render either way, and a table cell holds no block." | Behavior |
| 86 | "…each is prefix-aware, so a list inside a blockquote behaves exactly like one at the top level." | Behavior; "implemented in `Input/` as a high-precedence keymap and an input handler" is Mechanism |
| 88 | "Enter continues a list, Tab indents (to a cap), Shift+Tab outdents, and `-[]` canonicalizes to `- [ ]`." | Behavior |
| 92 | "…Shift+Enter closes an open construct first, then breaks the line, keeping a code block's quote or list indent." | Behavior |
| 93 | "An arrow list's `->` converts whether or not inline arrows do." | Behavior |
| 96 | "On a marker line, Backspace removes the whole marker at once, callouts included." | Behavior |
| 105 | "A cell reads the list vocabulary alongside its inline one, so items nest, reorder by their glyph, carry checkboxes, and continue on Enter, drawn the same whether the cell is resting or live." | Behavior |
| 105 | "Tab and Shift+Tab nest and outdent while an item holds the caret, and Shift+Enter leaves the final item for the cell below." | Behavior |
| 105 | "The list carries its own grip in that inset, which moves the block and opens the native menu on right-click, offering the list's type and Delete." | Behavior |
| 105 | "A cell is trimmed on both edges by GFM, so an item indented on a cell's first line settles back to the outermost level, and other Markdown tools read the whole cell as text." | Behavior |
| 111 | "…which pastes as a fresh table in prose but refuses a table cell, a list line, and the citations section…" | Behavior |
| 130 | "…every block has a handle beside it — in the gutter on a page, and in a list's own inset inside a table cell, where there is no gutter (`Core/MarkdownPM/Menus/blockHandles.ts`)…" | Behavior with a Mechanism citation |
| 138 | "List \| Type ▸ (Bulleted, Numbered, Alphabetical, Checklist, Arrowed) · Delete" | Behavior |
| 142 | "…listing the blocks the editor can make — Headings, Lists, Link, Insert, and Embed…"; "won't activate inside code, math, footnotes, behind quote or list markers…" | Behavior |
| 146 | "…where a surface answers the press itself — a block grip, a heading gutter, a list glyph, … — the renderer calls `preventDefault` on the `contextmenu` event, and that withholds the host's editor menu." | Mixed |
| 146 | "On either surface, a right-click outside the selection or at the caret acts on the word under the pointer, or at the point where it sits on no word, while the list rows act on the item it points at…" | Behavior |
| 153 | "**Lists ▸** — Bullet List, Numbered List, Alphabetical List, Task List, Arrowed List." | Behavior |
| 187-200 | "List geometry scopes to `.cm-line.md-list-item`; the outliner rail aliases the shared `--list-outline-*` width, gap and radius, reads the color directly, and adds its caps and x-position." plus the token table | Mechanism; these rows sit under the token ledger `check-atlas.mjs` verifies if tagged |
| 257 | "**Outliner rails on numbered, arrow, and `+` lists** — the guide is bullets, checklists, and alphabetical lists only." | Behavior (Prospect) |
| 258 | "**Language ▸ on the code block grip** — retyping a block's language from its grip, following the list's Type ▸." | Behavior (Prospect) |

##### `Features/ConfigurationPM.md`

| Line | Quote | Class |
|---|---|---|
| 151 | "Outliner Lines \| `outlinerLines` \| Draws indent rails on nested lists in the editor. \| On · **Off**" | Behavior |
| 152 | "Preserve List-Level Formatting \| `preserveListLevels` \| Leave indented lists and other types unchanged when adjusting a list's format. \| **On** · Off" | Behavior |
| 155 | "…an arrow list's marker converts either way." | Behavior |
| 170 | "Checkbox Color … The color checkboxes and switches fill with…" | Behavior (adjacent) |

Line 161, the Bullets transform, is the `•` typography and only adjacent.

##### `Guidelines/Editor-Internals.md`

| Line | Quote | Class |
|---|---|---|
| 12 | "…anything whose meaning depends on the lines above — fence parity, list indentation, … — comes out wrong unless each chunk opens where the parser holds no state. A chunk opens only at a `cutAt` line: a quiet line … that is flush left and non-blank and, below a list item, interrupts the item's paragraph." | Mechanism |
| 18 | "…the effects reach as far as a refused marker collapse and a list that draws without its grip. The list model's walk in `Engine/listModel.ts` reads every item through `itemAt`, which takes the scope. The scope belongs to the reader — `smartBackspace` and the intent builders take it — and any new cell-side transform that consults the scan or that grammar needs the same." | Mechanism |
| 23 | "A list line wraps only inside its content span — the line is `white-space: pre` and the item's content wears the one wrapping region; the marker zone is saturated with soft-wrap opportunities that would drop a long word below its glyph." | Mechanism for a Behavior |
| 24 | "One derivation (the shared document scan) feeds the block resolver, the list gesture, and the decoration pass; indented math rides its list item whole." | Mechanism; the last clause Behavior |
| 26 | "A grip's right-press is defaulted away … and the grip menu, the block drag gesture, the gutter's hover reveal, and a table's sweep all read that one `GRIP_LINE` mark rather than a class list." | Mechanism |
| 35 | "`atomicRanges` is the exception and must stay whole-document… a motion resolved against a slot the viewport hasn't reached seats the caret inside a marker nothing on screen stands for." | Mechanism |
| 37 | "Rails are emitted after every line intent, never interleaved with them. They anchor at the same offset as their line's own classes, and emission order is what stacks those classes…" | Mechanism |
| 40 | "List numbering has one writer. An edit that writes list markers — Enter continuing a list, Tab and Shift+Tab, and every list-type pick — says so with the `input.list` user event and writes each marker without counting; `listRenumber` recounts every run it touched in the same transaction, as it does for a deletion that removes a line." | Mechanism |
| 40 | "A line whose marker the edit wrote never sets a top-level run's start, which is what lets a run that began at 5 keep its base, but a numbered or lettered marker the edit wrote over whole is a re-pick, and its run restarts from 1 or A, while a re-pick that leaves the text as it was lands nothing; Tab and Shift+Tab move only the indent before a marker, so a moved item keeps its run's base." | Mechanism stating Behavior |
| 40 | "Siblings are the items drawn at one quote depth and level under one parent, whatever whitespace indents them, and numbering, the drag, and the list-type switch all read that one walk, as the outliner rails read its line rule (`continuesList`) at each line's quote depth: a wrapped line, a quote, a code block, display math, or a loose item's blank-separated paragraph indented under an item rides that item." | Mechanism; "rides that item" Behavior |
| 40 | "A code block is read only from inside it (`readsFrom`), so a list written there switches and counts on its own while the list around it steps past the block." | Mechanism stating Behavior |
| 40 | "A blank line carries a run, since items apart by one are a single loose list." | Behavior |
| 40 | "Drag renumbers inside its own model through the same run function." | Mechanism |
| 40 | "A new list-writing edit takes the flag rather than an ordinal." | Mechanism |
| 44 | "…a resync rule widens only with the property run against it: letting arrow items resync broke table headers, because CommonMark reads `→ a \| b` above a delimiter row as one." | Mechanism |

**2-T9 — Doc Statements Checked Against the Tree:** line 40's walk, `continuesList`, the drag's use of `renumberRuns`, and line 18's `itemAt` claim all hold at the head. "List numbering has one writer" reads true of `renumberRuns` and overstated of the pattern, since the drag recounts outside `listRenumber`, which the same paragraph then admits.

**2-T10 — Doc Friction:**

- **`+`:** `MarkdownPM.md:24` lists it with no drawn form, while `intents.ts` says "a `+` item is Arrowed", and `detect.ts`'s comment plus `detect.test.ts:92`'s title call it a bullet. Parser kind `bullet`, drawn kind `arrow`, menu check Arrowed.
- **"One Indent Zone":** line 24 versus three gutters at line 195 (`--bullet-zone`, `--number-zone`, `--task-zone`).
- **Two Label Sets:** line 153's "Bullet List … Task List" and line 138's "Bulleted … Checklist" are `LIST_KINDS`' `label` and `short` (`Core/Actions/gripMenu.ts:37-52`); the same five types carry two names by menu.
- **Doc in the Code:** the comment above `listRenumber` (`listRenumber.ts:12`) restates `Editor-Internals.md:40` near sentence for sentence, so the mechanism is described twice.

---

#### 3. Issues

Reported as context. Each closes only where the design solves it naturally.

**2-T11 — I-036 (Moderate, Medium, +37 to +75, Deferred):** Scope is a three-member string read by 22 compares and 15 `'page'` defaults, so a fourth scope inherits behavior inconsistently, and `listLineAt` ignores a fence pair in a cell. It proposes `Engine/surfaces.ts` with capability predicates, dropping the defaults, and waits for a fourth scope. List sites: `listModel.ts` `readsFrom`, `itemAt`, `checkboxToggleChange`; `format.ts` `listReach`; `edits.ts` defaults and `listLineAt`; `detect.ts` `readsLists`.

**2-T12 — I-068 (Low, Small, TBD):** `tableRegions` reads a table at column 0 with no container or fence mask, so a table under `- item` takes an unindented lazy line as a row where the parser ends it. It proposes that `endsBody` read against the header's indent and treat an unpaired fence as a row. The delta is TBD; sites are `Engine/Tables/regions.ts` and `parser.ts`, not list code, though the trigger is a list item.

**2-T13 — I-071 (Minimal, Medium, TBD):** Editor coverage is split over five drives, five launches, about ten minutes per change, and Editor Parity keeps its own launcher and CDP client. It proposes one MarkdownPM drive on `drive-harness.mjs` with Parity as a mode. Sites are `List Types Drive`, Text Property group 4, Path Links group 9, Alias group 3, `editor-parity/`.

**2-T14 — I-072 (Low, Medium, TBD):** A word split by inline marks reads only its unmarked part, and Bold writes a second pair. It proposes a mark-stepping word reader and a merging Bold. It cites `wordAt`, `toggleInline`, `underSelection`; no list code, though the List Types Drive's C-6 items exercise this neighbor.

**2-T15 — I-073 (Low, Small, TBD):** Recounting runs two patterns: the drag builds, renumbers, and diffs its own document, while a pick writes markers and `listRenumber` infers a re-pick from the edit's shape and cancels a no-op with `{}`. It proposes that the pick build and recount with `repicked` as the drag does, removing the inference and leaving the filter Enter, Tab, and deletion, landing as a sequential second change set rather than one diff. Sites: `dropChanges`, `renumberRuns`, `setList`, `listRenumber`; the footnote's line numbers for the first two have drifted (`~306`, `~248` against 293 and 235).

**2-T16 — Neighbors:**

- **I-016 (Low, Medium, +21, Deferred):** the footer's `proseStart` is a second reader of list chrome and disagrees on `- [] hello`; it proposes reading cached line intents. Site: `subfieldStats.ts`.
- **I-039 (Low, Small, +13, Deferred):** a new block kind falls through silently; `contextFor`, `GRIP_KINDS`, and the action chain, which holds `list:` actions.
- **I-038 (Minimal, Small, about −4, Deferred):** one host menu member per construct, including `grip`, which carries the glyph menu.
- **I-018 (Deferred):** carried intents are re-allocated per keystroke; `seatPastMarker` and `prefixEndAt` are named.
- **I-037, I-024:** surface switches and HTML-block scans; they touch MarkdownPM's drives or scope only indirectly and cite no list code.

---

#### 4. Drives

##### What the List Types Drive Covers

| Group | Sites | Covers |
|---|---|---|
| 1, Glyph Menu on a Page | 16 | Rows and check, both Preserve reaches, undo, re-pick per kind, right-press caret, revealed marker, `- []`, quoted list, glyph in, out, and below a selection, tile at rest and editing |
| 2, Focused Cell | 5 | First glyph versus grip inset, pick, undo after Escape and inside the cell |
| 3, Resting Cell | 7 | Picks per kind with ⌘Z, `> a`, then Format ▸ Bold, word reading, blank space (C-6, not lists) |
| 4, Lists ▸ and the Grip | 13 | Item text, plain line, re-pick, check follows reach, triple-click and drag-selection edges, Bold and word cases, grip Type ▸ both settings, `/` menu and undo |
| 5, The Setting | 2 | Row placement and live effect |

**2-T17 — Scope:** the drive covers the type switch and nothing else. Enter, Tab, Backspace, drag, rails, and renumber-on-delete have no drive here. `editor-parity/run.mjs` holds the only other live list cases: checkboxes toggling with their DOM kept and one flat glyph drag, both record-and-compare against a twin build. Text Property groups 1 and 4 prove the negative (`- milk` reads as prose). Path Links and Alias hold no list cases.

**2-T18 — What It Shares:** `launch`, `restore`, `popNative`, `pickNative`, `boxOf`, `mouseAt`, `clicks`, `sweep`, `hover`, `pressKey`, `typeText`, `writeBody`, `createPage`, `openPage`, `openCollection`, `openSettings`, `closeSettings`, `press`, `shot`, `tally`, `until`, `sleep`, `ask`, `must`, `row`, `SWITCH`, `PAGE_VIEW`, `META`, and `phasedItem`. Local to it are `setBody`, `body`, `select`, `caretAt`, `textAt`, `pop`, `glyphPick`, `wordPick`, `gripPick`.

**2-T19 — A Default Run Can't Fail Most Items:** `phasedItem` counts an item as held when its phase exceeds `POMMORA_LGM_LANDED`, whose default is 0. Of 43 item sites, 38 are phase 2 or 3, so a plain run exits 0 with those printing `AWAIT`; only `POMMORA_LGM_LANDED=3` makes them real. The phases and the decision ids (`A-1`, `B-7`…) point at a plan deleted at the head, so the column names a document that exists only in history.

**2-T20 — What Survives a Reshape:** every item asserts document text or DOM and calls no internal function, so all 43 still prove something if internals change while behavior holds, conditional on the selectors in 2-T6, `personalization:set`, and `.cmTile.root.view`. Item-by-item, none is mechanism-bound. Group 3's and 4's C-6 items prove nothing about lists under any reshape.

---

#### 5. The Last Feature's Record

**2-T21 — Count:** the matrix holds 107 rows, not about 130 (A 22, B 36, C 21, D 8, E 4, Fold Cases 16), read at `e989eb865`. A row counts as **Test** when a test asserts that behavior with the same or an equivalent input, `(p)` meaning only part of the row. Exact input strings rarely match, so this mapping is by reading, and `(p)` rows still hold unpinned facets.

| Bucket | Rows | Share |
|---|---|---|
| Test | 67, of which 12 partial | 63% |
| Drive Only | 18 | 17% |
| Neither | 22 | 21% |

##### Pinned by a Test

| Section | Rows → Pin |
|---|---|
| A | Page Glyph's Menu → `gripMenu.test` 51 (model); Pick From Each Kind (p) → `format.test` 288; Ctrl-Click → `listDragTap` 32; Escape and ⌘Z (p) → `tableExit` 60; Every Resting Glyph (p) → `cellRestingMenu` 311; Resting Read-Only (p) → `cellRestingMenu` 221, text only; Read-Only Reader (p) → `gripMenuFlow` 215, `editorMenu` 136; Document Changed → `editorMenu` 116, `gripMenuFlow` 128 |
| B | On From B, Off From E → `format` 256, 259; Quote Under an Item (p) → `format` 304; Flat → `cellRestingMenu` 288; Mixed Types (p) → `gripMenuFlow` 117; Loose List, Loose Paragraph → `format` 304; Wrapped → `format` 301, 275; Gapped (p) → `listRenumber` 143, `format` 335; Continuing a Count → `listRenumber` 140; The Run an Item Leaves → `listRenumber` 83; Mixed Indentation → `listModel` 77, `format` 295; Quote, Code, Math Under an Item → `format` 304; Glyph Inside a Selection, Drag-Selection's First Line, Below a Triple-Click → `editorMenu` 116, `cellRestingMenu` 311; Click Outside (p) → `editorMenu` 75; Lists ▸ Inside a Triple-Click, Drag-Selection Ending → `format` 214; Top Line a Continuation → `format` 316; Across a Fence's Edge → `listRenumber` 174; Right-Click After a Triple-Click → `editorMenu` 75; Check Over Items and a Plain Line → `format` 275 |
| C | Item's Text → `cellRestingMenu` 288; Plain Line → `format` 200; Re-Pick → `format` 206, 214, 227; Check Follows → `gripMenuFlow` 117; Other Rows → `editorMenu` 64; Unselected Word → `cellRestingMenu` 265; Right-Click at the Caret → `editorMenu` 75; Apostrophe, Word Deletion → `textScope` 150-184; Speech and Share → `Desktop/Actions/editorMenu.test` 218; Inline Code → `format` ~151; Redraw → `editorMenu` 235; Code Block's Own List, Nothing Outside Reaches In (p) → `listRenumber` 174; `*` Lines (p) → `detect` 92; `/` Menu, its ⌘Z → `blockMenuFlow` 138; Blank Inside a Loose Item → `format` 239 |
| D | Grip Follows the Setting → `gripMenuFlow` 94; Indented Paragraph Head → `gripMenuFlow` 109; One Undo Step (p) → `blockMenuFlow` 138 |
| Fold | Nested and Quoted Backspace → `listRenumber` 83, `edits` 132; Backspace, Enter, Tab in Math and Enter in Code → `edits` 82; Whole-Line Deletion → `listRenumber` 25, 54; Tab Out, Shift-Tab In → `listRenumber` 69, 75; Tight and Loose Drag → `listModel` 83-140; Heading, Quote, Code, Lists Picked Twice → `format` 179, 374, 410, 219 |

##### Drive Only

Each is real only at `POMMORA_LGM_LANDED` ≥ its phase (2-T19).

A: Every Glyph Kind on a Page (quoted and callout by neither), Each Glyph Re-Picked (bullet in `format` 206), Right-Press Seats No Caret (`listDrag.ts` `mousedown`, the grip's and the resting cell's are tested), Revealed Marker, Item Drawing No Glyph, Live Cell's Glyphs, Live Cell Pick Then ⌘Z, Resting Pick Then ⌘Z, Tile at Rest, Tile While Editing, Quotes and Callouts, ⌘Z After a Page Pick. B: The Top Level, `+` Items, Checked Boxes. C: A Cell's `>`. E: The Row, Off Without a Reload.

##### Neither

| Row | Input or Claim |
|---|---|
| A: Resting Re-Pick | `- [x] a\n- [ ] b` → Checklist commits nothing |
| A: No Glyph Inside a Code Block | a fenced list draws no glyph (math is tested at `intents` 189) |
| B: Leaf Group | from C, only C and D |
| B: Same Depth Under Another Parent | `- A\n\t- B\n- F\n\t- G` from B leaves G |
| B: Past a Differently Typed Sibling | `- a\n1. b\n- c`, on and off |
| B: Re-Pick Across a Bullet | `1. a\n- b\n2. c` → `1. a\n- b\n1. c` |
| B: Bullet List a Blank Above a Numbered One | `- a\n- b\n\n1. c\n2. d` → one run |
| B: `- []` Items | an undrawn item splits a run |
| B: Deeper Than Level 3 | a level-4 item numbers with level 3 (`indentLevel`'s cap alone is tested) |
| B: Code Block Between Items | a top-level block ends the group |
| B: Selected Word | a word in b reaches only b |
| B: ⌘A | every item and plain line, with code, math, tables, callout heads excluded |
| C: A Cell's Fence Text | Numbered over a cell's ` ``` ` lines numbers all three |
| C: Diff Block From Inside | `- old` and `+ ` lines inside ` ```diff ` |
| D: Loose List From the Grip | group reach from the grip |
| D: Never Into Code | the grip leaves a nested block's `- x` |
| D: Gapped Numbers | `3. a\n5. b\n\t7. c` from the grip, off |
| D: Quoted and Callout Lists | those blocks' grips hold no Type ▸ |
| D: One Switch | a read of five call sites reaching `setList` through `editFor`; structural, and nothing automated holds it |
| E: The Key | a read of `preserveListLevels`' declaration |
| E: The Setting in a Resting Cell | on and off at rest |
| Fold: Backspace on a Marker, Tight and Loose | top-level `1. a\nb\n3. c`, c keeping its start |

---

#### Approaches and Insights

No current behavior is a contract here. A test that contradicts the chosen outcome leaves rather than bends, and a behavior pin below is named so the planner sees what a behavior change turns red, with no protection implied.

##### What Each Cluster Locks In

| Cluster | Behavior Locked | A Change Turns Red |
|---|---|---|
| `listRenumber.test` 25-60 | A deleted item closes the gap; a run's base survives; the first item's deletion renumbers from the smallest survivor | Top-level runs snapping to 1 |
| `listRenumber.test` 68-107 | Tab starts a nested run, Shift-Tab continues the parent, a switched item splits its run, and a Backspaced nested item becomes a continuation that recounts | Any other level or split semantics |
| `listRenumber.test` 128-160, 174 | A plain line joins a run across a blank; a blank between quotes ends one; a pick over a numbered item restarts from 1; a code block reads only from inside | Restart or join rules, the code-block isolation |
| `format.test` 199-262, `gripMenuFlow` 85-124 | Caret picks reach a group and follow Preserve; ranges reach touched lines; the grip acts as its first item; a re-pick is inert | Reach, the setting's meaning, the grip's anchor |
| `format.test` 264-285 | The check is null on disagreement or a plain line | How the check reads a mixed reach |
| `edits.test` 36-177, 848-862, 963-1010 | Enter never exits an empty item, a fresh box is unchecked, Z wraps to A, the cap is 3, whole-marker Backspace, callout prefixes held | Exit-on-empty, cap, Backspace policy |
| `listModel.test` 9-180 | A drag carries wraps and riders, adopts the target's depth, restores nothing on own-edge drops, and renumbers | Drop semantics, re-nesting |
| `detect.test` 43-125 | `-` and `+` only, `[]` is a bullet, `→` is a marker, cap and 2-space levels | Any grammar widening, `*` included |
| `intents.test` 198-318, 695-790 | Marker-local reveal, number kept as text, rails on bullets, checks, letters only | Reveal policy, rail scope, rail shapes |
| `cellLists.test` | A cell's Enter, Tab, and Shift-Enter leave-or-continue rules, resting toggle without promotion | Cell key routing |
| `blockModel.test` 173 | Blank-separated items are separate blocks, while `siblingsAt` calls them one group | Any unification of a list block with a list group; it's the sharpest behavior conflict to decide (grip reach versus block) |

##### Pins the Rulings Turn False

**2-T22 — Parity Inside Markdown Code Blocks Only:** a ` ```md ` or ` ```markdown ` block gets full interactive parity from inside; a bare or other-language block treats a list as text for keys and takes no menu pick either. No test uses a Markdown-language fence today, so every pin below is a bare fence.

| Site | Says | Status |
|---|---|---|
| `listRenumber.test.ts:174` | "a pick wholly inside a code block switches its own list" (bare fence) | Conflicts; its last two expects (pick from the fence line, pick reaching out past the block) need reading against the ruling rather than leaving with it |
| `listRenumber.test.ts:168` | a list-writing edit in a bare block counts within it | Conflicts; the case is forged and no gesture would produce it |
| `Editor-Internals.md:40` | "A code block is read only from inside it (`readsFrom`), so a list written there switches and counts on its own…" | Conflicts for bare and other-language blocks, understates for Markdown ones |
| `listRenumber.ts:12` comment | "a code block's own list counts only for a marker-writing edit inside it" | Conflicts |
| `readsFrom` docblock (`listModel.ts:~40`) | "a list written there switches and counts on its own" | Conflicts |
| Matrix: A Code Block's Own List | ` ``` ` `- a\n- b` → Numbered, the check reads Bulleted | Conflicts |
| Matrix: A Diff Block From Inside | a pick rewrites `- ` and `+ ` lines | Conflicts |
| Matrix: A Range Across a Fence's Edge | numbers only the outside line | Holds; a range starting inside a block now reaches nothing inside it |
| `MarkdownPM.md:10` | "none applying inside a fence pair" | Conflicts only in its Markdown-block form |

Still true for bare and other-language blocks: `edits.test.ts:82-99` (Enter, Tab, Backspace are null, its `- name: a` YAML line included), `edits.test.ts:172`, `listRenumber.test.ts:46`, and the matrix's Enter Inside a Code Block. Each conflicts only as a ` ```md ` form, which doesn't exist yet and is a new pin rather than a rewrite. `listRenumber.test.ts:119` (outside never counts in) and `edits.test.ts:943`, `:153` hold either way. Open for the planner:

- **Does Parity Draw?** "Interactive" may stop at keys and picks, or include glyphs, the drag, and checkbox clicks. Nothing draws a list in any fence today, and `MarkdownPM.md:142` keeps the `/` menu out of code.
- **What Counts as Markdown:** which info words qualify, since `MarkdownPM.md:38` resolves a language by name, alias, or a file path's extension, so `notes.md` may read as Markdown too.
- **The Outside Run:** `listRenumber.test.ts:119`'s rule of stepping past a block should be stated for a Markdown block, which reads as its own list inside and as code from outside.

**2-T23 — `+` Becomes a Plain Bullet:**

| Site | Says | Status |
|---|---|---|
| `intents.test.ts:266` | `['plus', '+ ', 1]` with the ordered and arrow empty-item shape | Conflicts (a bullet takes the widget slot) |
| `intents.test.ts:275` | `+ step` keeps literal source with class `md-list-arrow …` | Conflicts |
| `intents.test.ts:737` | no rail for a `+` ancestor | Conflicts: a `+` is a bullet, which keeps its rail; lines 735-736 stand |
| `intents.ts:~129` comment, `listGlyphOf`, `drawnKind` | "a `+` item is Arrowed" | Conflicts |
| Drive: g1 `['+ p', 'p', 'Arrowed']`; g3 `['+ a<br>+ b', 'Arrowed', …]` | checks Arrowed | Conflicts |
| Matrix: `+` Items; Every Glyph Kind | `+` checks Arrowed | Conflicts |
| `MarkdownPM.md:24`, `:25`, `:257` | `+` listed beside bullets, "dash bullets" for rails, `+` among the rail-less | Rewrite those words |

`detect.test.ts:92-94` and `detect.ts`'s comment already call it a bullet and become right. `intents.test.ts:25`, `:216`, `docScan.test.ts:25`, `:225`, and `regions.test.ts:69` survive. Left open: whether a `+` re-picked as Bulleted stays `+` or is written `-`.

**2-T24 — `- [] x` Becomes a Bullet Whose Text Is `[] x`:**

| Site | Says | Status |
|---|---|---|
| `cellLists.test.tsx:287-293` | "calls a bullet carrying an empty box prose" | Conflicts |
| `cellLists.test.tsx:349-354` | "treats a marker nothing draws as prose", Enter leaves the cell | Conflicts |
| `detect.test.ts:88-89` | `-[] a` is a bullet "box present, not a checkbox" | Conflicts in part; `-[] a` has no space after the dash, so the ruling's reading of it needs stating (the regex's `[ \t]*` admits it) |
| `intents.ts:131-138` comments, `listGlyphOf`, `drawnKind`'s null | "a bullet holding an empty box is prose" | Conflicts; `box?` on the bullet record and the null path may leave, with `lm && drawnKind(lm)` in `listKindOf` |
| Drive: g1 `- [] bare` | Task List gives `- [ ] bare`, "an item drawing no glyph" | Conflicts: it would write `- [ ] [] bare` unless picks say otherwise |
| Matrix: Item Drawing No Glyph; `- []` Items | the check, and "splits the run" | Conflicts |
| `IssuesPM.md:420` (I-016) | `- [] hello` "which the editor draws as plain text" | Its example changes; `proseStart` is a second reader to reconcile |
| README's List Types Drive paragraph | "an item drawing no glyph" | Rewrite |

The typed shorthand survives as a separate thing: `-[]` + space canonicalizing (`edits.test.ts:162`, `:1014`, `cellLists.test.tsx:219`, `textScope.test.tsx:81`, `MarkdownPM.md:88`). After the ruling no drawn marker is left that "nothing draws", so `listGlyphOf`'s null reads as unreachable pending that check.

**2-T25 — Every List Type Gets Full Parity:** rails stay under bullets, checklists, and lettered lists, so that exclusion stands and isn't a conflict: `intents.test.ts:734-736` for ordered and arrow, `MarkdownPM.md:25`, `:257`, and `railTypeClass` all hold, apart from `+`'s move in 2-T23. Beyond rails, these describe a type differently:

| Site | Says | Status |
|---|---|---|
| `intents.test.ts:241-262`, `:274-292` | numbers and arrows keep literal source with no widget | Differs by type rather than excludes; `listMarkerSeats.test.tsx:41`, `:48` say the number is real text, so a caret can seat in it |
| `MarkdownPM.md:19` | "marker-local for list glyphs" | Holds, with the same number and arrow difference |
| `detect.test.ts:90` | `1. [ ] a` stays ordered, so no numbered checkbox | Reads as a grammar limit, not a type exclusion; the planner's call |

I found no other exclusion in tests or the five documents: Enter, Tab, Backspace, the drag, and the five-way menu treat every type alike. Only checkboxes answer a click, by nature of the type.

##### The Drive Rewrite

No hand checks are planned, so the drive is the only live proof, and these are what it needs to hold.

- **Mechanics:** drop `phasedItem`'s default-passing for this drive so any failure fails the run (2-T19), and cite the new log's decisions rather than the deleted plan's ids. Keep asserting document text and DOM (2-T20), with the selectors in 2-T6 read from one place at its head.
- **The Matrix:** every list type (`-`, `+` as bullet, `→`, numbers, letters, checkboxes) × page, callout, quote, focused cell, resting cell, editing tile, inside a Markdown code block × the gestures below, pruned only where a reason is written beside it, as the Metadata and Archive drives' `MATRIX.md` do.
- **Keys:** Enter (end, mid-item, start of text, empty item), Tab and Shift-Tab with the cap, Backspace at and inside a marker, Delete, whole-line deletion, Shift-Enter including a cell's leave, `-[]` + space. None of these are driven today.
- **Inside a Markdown Code Block:** all of the above and the picks, plus undo and the outside list stepping past it. Inside bare, other-language, and diff blocks the same gestures assert the opposite: keys act as text and a pick changes nothing.
- **Drag:** a real pointer drag by glyph, using `drag` or `sweep`, through `collectBoundaries`: flat, nested with children, re-nesting across levels, loose, quoted, in a callout, in a live cell, numbered before and after, own-edge cancel, and a checkbox tap versus a carried press. This is the only proof of drop geometry (2-T8).
- **Rails:** `Outliner Lines` on and off, under bullets (`+` included), checklists, and letters, and absent under numbers and arrows, read as DOM and measured with `boxOf`, on a page and in a resting cell, blank-line crossing, wraps, the cap, elbow and join ends. No test reaches the draw.
- **Drawing and Caret:** each glyph as drawn, reveal on the marker and not on the text, unfocused, arrow-key seats, plus what only a browser measures: a long unbroken word at narrow width staying beside its glyph (`Editor-Internals.md:23`) and text alignment per marker zone. With no hand checks, a screenshot alone doesn't count, so these need measured positions.
- **Renumbering Live:** each recount in the same stroke, with one ⌘Z taking it back, covering Enter, deletion, Tab, Shift-Tab, a pick, a drag, and a cut at rest.
- **Menus:** what today's groups 1 to 5 hold, updated by 2-T23 and 2-T24, plus the grip's Delete row (2-T8), the `/` menu for all five types, and a read-only reader.
- **`- [] x` and `+`:** direct items for each surface: drawn as a bullet with `[] x` as text, Enter continuing it, a run it does or doesn't split; `+` drawing `•`, checking Bulleted, carrying a rail.
- **The Unpinned Rows:** the 18 Drive Only and 22 Neither rows of *§The Last Feature's Record*, each kept, changed, or dropped against the rulings. Some, like Selected Word or Gapped Numbers, belong in pure tests instead; the plan should say which.
- **Negatives:** a Text value reads none of it (Text Property group 4 holds this today), and display math stays closed if the ruling leaves it so.
- **What Can Leave the Drive:** the C-6 word and Bold items prove nothing about lists and could move with I-072's area or stay as neighbors, as could any item a pure test states better.

##### Where Fewer Tests Could Prove the Same

- **Per-Key Pure and Cell Pairs:** `edits.test` and `cellLists.test` state the same key results; one table-driven gesture suite over `['page', 'cell']` could hold both, leaving the cell file its routing cases.
- **Recount:** the 2-T3 rows name about twelve redundant recount pins; `listRenumber.test` already states each through the real filter. `regressionPins`' list describes and `listModel.test`'s `renumberRuns` describe add nothing beyond shape.
- **Moved Children:** five `listModel.test` cases differ only in the child line.
- **Rows:** `Core/Actions/gripMenu.test` owns row text; `gripMenuFlow`'s `toEqual(gripMenuItems(…))` can read just the `current` passed.
- **`moveRange`:** its 15 cases are block moves filed in the list suite, and they'd move with the function.

##### Pins of Mechanism

The 2-T5 table is the list that goes false while behavior holds, and 2-T6 the selector version. If recounting changes hands, the first to fall are the `relist` shapes, the forged `editEvent({ relist: true })` cases, and `.changes` `[]`. `cached assembly ≡ pure derivation` and the seeded `docScan` properties pin invariants rather than either class; they outlive any list reshape that keeps a cached path, and catch list-rendering regressions across the corpus. Tests calling `subBlockAt`, `dropChanges`, `setList`, and `continueListOnEnter` directly assert Behavior through a Mechanism door: a rename or signature change is a mechanical rewrite of their helpers, not of their cases, as long as `drop`, `listed`, `apply`, and `at` stay the one adapter.

##### Documentation a Consolidation Rewrites

- **`Editor-Internals.md:40`:** whole, and it's the paragraph most tied to the current shape; line 18's `itemAt` sentence, and any move of `continuesList` or `readsFrom`.
- **`Editor-Internals.md:24`, `:37`:** if the list gesture or rail emission moves.
- **The Comment at `listRenumber.ts:12`:** a second copy of line 40; it counts against the comment ceiling and can leave.
- **`MarkdownPM.md`:** lines 24, 88, 96, and 105 only if behavior changes; line 130's citations if files move; lines 24, 138, 153 if the two label sets or `+`'s reading resolve.
- **`.claude/scripts/README.md`:** the List Types Drive paragraph, if phases go.
- **`IssuesPM.md` Citations:** the I-036 and I-073 footnotes name list sites by line.

##### Outside the Mandate

- **`listLineAt` Twice:** `edits.ts:60` and `CellEditor.tsx:60`, same name, different signature, one question, and I-036 records that they disagree inside a fence pair.
- **`moveRange` Misfiled:** it lives in `listModel.ts` while its callers are `blockDrag.ts` and `Core/Pages/pageEditor.ts`.
- **`checkboxToggleChange`:** takes `doc` where siblings take `scan`, bypasses `itemAt`, and reads the quote-prefixed grammar in a cell.
- **`readsFrom`:** answers `true` for every non-page scope, so cell and text collapse.
- **The Drive's Residue:** a run should pass `POMMORA_LGM_LANDED=3` to mean anything until `phasedItem` and the deleted plan's ids are settled for this drive; the Path Links Drive shares `phasedItem`, so the helper stays for it.
- **Live Coverage Gap:** a list consolidation's most exposed paths (Enter, Tab, Backspace, drag, renumber) have no list drive, only pure tests and one parity drag; *§The Drive Rewrite* covers what closes it.
- **The 22 Neither Rows:** the plan can treat them as a ready list of unprotected cases, and each should be decided as wanted or not before code moves, since nothing would report a change to them.
