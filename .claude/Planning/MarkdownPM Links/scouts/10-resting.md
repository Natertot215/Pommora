## Scout 10: Authoring in a Resting Table Cell

HEAD `42a18f4a5`. Production line counts by `wc -l`. Tags: **V** = Verified (read), **VR** = Verified by running (vite-node script `probe10/p.ts`), **I** = Inferred. Target per Nathan's 1b ruling: "everything" (every construct in a resting cell gets its right-click menu; the right-click itself doesn't focus). Links-only is costed for comparison.

Files measured: `cellStatic.tsx` 486 · `MarkdownTable.tsx` 645 · `CellEditor.tsx` 291 · `widget.tsx` 578 · `sync.ts` 41 · `linkEdit.ts` 173 · `linkFormat.ts` 86 · `pendingTitle.ts` 74 · `connectionsApi.ts` 158 · `linkClicks.ts` 156 · `Menus/menu.ts` 108 · `Core/Actions/editorMenu.ts` 143 · `Desktop/Actions/editorMenu.ts` 138 · `Input/applyEdit.ts` 29 · `Session/cacheSlice.ts` 53.

---

### Right-Click Today (Resting vs Live, per Construct)

**R-01: There Are Two Menu Doors, and the Resting Cell Reaches Only One.** **V**
- *Door 1, the link menu:* `linkGestures.onContextMenu` → `api.menu(target)` (`cellStatic.tsx:417-427`) → `showConnectionMenu` → `popMenu` → the generic `menu` channel (`Core/Actions/handlers.ts:7-10`). It is independent of Chromium's `context-menu` params. The grip, table, and citation menus use the same door (`Core/Pages/editorHost.tsx:100-103`).
- *Door 2, the editor menu:* the CM extension `editorMenu(scope)` (`Menus/menu.ts:83-108`) asks `host.menus.format` → `editor:menu` (`editorHost.tsx:104-109`, `handlers.ts:11-14`) → `askEditorMenu` parks until Chromium's `context-menu` event (`Desktop/Actions/editorMenu.ts:26-31`). Main then returns `resolve(null)` when `!params.isEditable` (`:128`), which `Desktop/Actions/editorMenu.test.ts:113-119` pins.
- *Why a resting cell can't reach door 2:* CodeMirror sets `contentEditable = "false"` on every non-editable widget's DOM (`node_modules/@codemirror/view/dist/index.js:2146-2148`), and `TableWidget` never sets `editable`. The page view's own `editorMenu` never sees the event either: `eventBelongsToEditor` drops events inside a widget whose `ignoreEvent` answers true (`index.js:4833-4836`), the default is `true` (`:161`), and `TableWidget` doesn't override it (grep: 0 hits in `widget.tsx`). So the editor menu has no path at rest. **V** (CM source); that Chromium reports `isEditable: false` for the static cell is **I**.

**R-02: Today a Non-Link Right-Click at Rest Focuses the Cell and Shows No Pommora Menu.** `cellStatic.tsx:354-357`: if no link menu opened and the cell isn't read-only, it calls `onActivate({x, y})` → `setActive` (`MarkdownTable.tsx:456-462`) → a `CellEditor` mounts and focuses (`CellEditor.tsx:245`). That editor's `editorMenu` handler never received this event, so no request is parked and `takeEditorMenu` returns null (`Desktop/Actions/editorMenu.ts:43-46`). **V.** Whether Chromium's late hit test lands on the freshly mounted editor and pops the bare system rows (Undo · Cut · Copy · Paste) is timing-dependent and unprobed. **I.** Pinned as intended by `cellStatic.test.tsx:117-126` ("a right-click enters the cell too, so the menu has a target"). Nathan's ruling makes this the first behavior to go.

**R-03: The Construct-by-Construct Map.** **V** unless marked. Throughout, "focus" means R-02's path.

| Construct | Resting Cell Today | Live Cell / Body Today |
|---|---|---|
| Plain text, bold/italic/strike/code/highlight, inline math (`md-latex`), HTML tag | No `data-link-span` (`cellStatic.tsx:163-174`, `:143-151`) → focus, no menu | Editor menu (`menu.ts:86-105`), scope `cell` = Insert Link · Lists ▸ · Format ▸ (`Core/Actions/editorMenu.ts:138-139`), plus the system rows and Change Color over a highlight |
| A DOM selection over static text (reachable: `:366` skips activation when one exists) | Focus at the click point; the selection is lost (`CellEditor.tsx:247-262` seats `caretCoords`) | The editor menu over the selection; flags read at the selection (`menu.ts:90-93`) |
| Checkbox list item | Left-click toggles in place (`claimCheckbox`, `:326-338`); right-click → focus | Editor menu with Lists ▸ Task List checked; the cell's list grip has its own menu (`gripMenu.ts:115-130`) |
| Connection naming a page `[[P]]`, `[[P#H]]`, `[[P\|A]]` | Link menu with authoring (`menuTarget`, `:448-477`); the right-click doesn't focus; Add/Edit Title and Edit Link enter through `onSelect` | Link menu (`linkClicks.ts:139-154`); the editor menu if the caret is inside the syntax (`pointerPath.ts:89-90`) |
| Phantom/ambiguous connection, `[[#H]]` | `tokenTarget` → `invalid`/`self` → `linkMenuTarget` null (`connectionsApi.ts:89-92`) → focus, no menu | No link menu → editor menu |
| `[x](https://…)` weblink | Full url menu: Rename · Edit Link · Copy · Format ▸ · Remove Link · Delete (`connectionMenu.ts:91-109`; `surface` defaults to `'editor'`, `connectionMenuActions.ts:22`) | Same rows |
| `[x](Page)` | Read-only page menu (`tokenMenuTarget` authors only `wikiLink`, `connectionsApi.ts:102`) | Same (B-57; ruling 1b.1 ends it) |
| `[x](bad)`, `[x]()` | null → focus | Editor menu |
| `![[P]]`, `![](u)` | Tokenized `embed` (**VR**: `tokenize('x ![[Page]] y')` → `["embed"]`), drawn `md-embed` with no span → focus | Editor menu (`linkPointer` covers `link`/`wikiLink` only) |
| Footnote marker `[^1]` | `md-citation-reference` glyph; right-click → focus (left-click follows, `:340-347`) | Live cell: **no marker menu.** The cell's own scan binds nothing (**VR**: `scanDoc('see[^1]')` → marker `ordinal: null`), and `citationPointer`'s menu returns null for `ordinal === null` (`citationPointer.ts:63-65`) → editor menu. Body: Edit · Copy · Delete |
| Table grips (row, column, header) | Own menus, independent of focus (`MarkdownTable.tsx:577-601`) | Same |

**R-04: Read-Only at Rest Is Consulted Only After the Link Menu (B-56 Confirmed by Reading).** `menuAt` is handed to `linkGestures` unconditionally (`cellStatic.tsx:307-313`) and always builds the authoring target (`:288-306` → `:458-476`); `readOnly()` is read only on the fallback (`:355`), on a left-click (`:365`), and on the checkbox (`:327`). `onSelect` (`MarkdownTable.tsx:468-474`) mounts a `CellEditor` with no read-only check. A resting embedded page passes `readOnly={!editing}` (`PageTile.tsx:182`). **V.**

---

### What Each Action Needs

**R-05: Row-by-Row Requirements.** "Pure" means expressible as `(text, from, to) → edits` with no view. **V** against each implementation.

| Row | Needs | Pure Today? | At Rest |
|---|---|---|---|
| Open rows, Preview, Open In Browser, Copy Link/Path | Session and dialer only (`connectionMenuActions.ts:35-37`, `runPageAction`) | n/a | Works today |
| Rename (1b.1: edits or adds the shown text) | A caret or selection to type into | Half: `wikiAuthorTarget` (`linkEdit.ts:22-36`) is pure; the url half is inline (`linkFormat.ts:64-66`; again at `cellStatic.tsx:469-470`) | Commit any pipe, then enter with the selection |
| Edit Title (1b.1: edits the target) | Same | Same; wiki seats a caret at the title's end (`linkEdit.ts:27-29`) while url selects the address (`linkFormat.ts:65`) — the B-100 drift, which 1b.1's single rule settles | Enter with the selection |
| Format ▸ Full / Short / Page Title | The link span, the title cache, and a pending swap for an uncached title | Text: yes (`linkActionText` + `linkPaste`, `linkFormat.ts:19-52`, `linkValue.ts:137-143`). The swap is view-bound (`awaitTitle`, `pendingTitle.ts:16-41`) | Commit; the swap is F-043 (*§Titles at Rest*) |
| Remove Link, Delete | The span | Yes (`linkFormat.ts:31-34`) | Commit |
| Format ▸ marks, Highlight ▸, Change Color, Lists ▸ | A range; off-token at a point, a caret afterward | Yes: `editFor(action, doc, from, to) → FormatEdit` (`menu.ts:28-44`, module-private) over `toggleInline`/`setList`/… (`format.ts:65,224`). **VR:** a point inside `**bold**` unwraps with no selection; a point on plain text inserts `****` with `selection: 2`; a range wraps with `selection` set after the close | Commit; enter only where the result is an empty wrapper at a point |
| Format ▸ Connection / External Link | A range; a caret afterward | Yes (`toggleWrap`, `format.ts:112-140`, always sets `selection` when wrapping) | Commit, then enter |
| Insert Link | A selection that is an address | Nearly: `insertLinkOverSelection` (`menu.ts:47-60`) is `trimmedRange` + `serializeLink` + dispatch + focus | Commit |
| Request flags | Position or range | Yes: `readFormatState(doc, from, to)` (`formatState.ts:7-44`) | Needs a source offset under the pointer (R-11) |
| Undo / Redo | The page history | `onUndo`/`onRedo` already reach `MarkdownTable` (`:112-113`) but not `StaticCell` | Plumb, or omit at rest |
| Cut / Copy | A selection in source form | Chromium's roles act on the focused element and copy the drawn text | Copy of the drawn text works natively; source-form copy and Cut need R-11's mapper |
| Paste, Paste As, Paste Without Formatting | A seat, the clipboard, the paste decision, and the table-payload fill | View-bound (`pasteLink.ts:17-39,86-109`); `decidePaste`/`pasteAsWrite` are pure (`pasteAsMenu.ts:99-122`) | The click offset is the seat; reading a table-shaped clipboard must route to `onFill` as `CellEditor.tsx:154-163` does |
| Select All, spelling | A focused editable | n/a | Not offerable without focus (**I**: Chromium spellchecks editable content only) |

---

### The Pure-Edit Layer

**R-06: It Already Exists in Three Pieces and Lacks Only One Dispatcher.** **V**
- *The shape:* `FormatEdit { changes: TextEdit[]; selection?: number; relist? }` (`format.ts:28-32`) and `Edit extends TextEdit { selection; head?; relist? }` (`edits.ts:37-42`). `applyEdit(view, Edit | FormatEdit)` dispatches either (`applyEdit.ts:6-29`); `applyEdits(text, edits)` applies one to a string (`markdownCode.ts:16-31`). Selections are post-change coordinates in both, which is what a rest-side "enter with this selection" needs.
- *Pure producers:* `editFor` (`menu.ts:28-44`), `readFormatState`, `checkboxToggleChange` (used at rest: `cellStatic.tsx:333-337` is already the template — pure change → `applyEdits` → `onCommit`), `wikiAuthorTarget`, `linkActionText`.
- *Missing piece:* a link producer in the same shape, plus `FormatEdit` gaining `head?: number`, since Rename and Edit Title select a range (`Edit` already carries `head`; no third shape).

**R-07: The Shape to Adopt.**
- `linkEdit(text, tk, action, titles): (FormatEdit & { title?: PendingTitle }) | null` — one switch over 1b.1's action set: Rename (select the label, or insert `|` and seat after it, reusing an abandoned pipe as `linkEdit.ts:32-35` does), Edit Title (select `linkAddress(tk)` or `resolveRange ?? contentRange`), the three Format cases (kept spelled out per `linkFormat.ts:35`), Remove Link (`unescapeAlias(label)`), and Delete. It replaces `wikiAuthorTarget` + `linkActionText` + `formatted` + `LinkActionText`.
- *Live:* one `applyLinkAction(view, action, range)` = `drawnLinkAt(view, range[0])` (kind optional, `decorations.ts:370-374`) → `linkEdit` → `applyEdit(view, edit, { effects })` → `resolve` when a title is pending, then focus. This deletes `applyUrlLinkAction` and `linkFormat.ts` outright and makes `linkClicks.ts:148-151`'s `{ wiki, url }` one closure.
- *Editor menu:* export `editFor` as the pure dispatcher, with `insertLinkOverSelection` split into a pure `insertLinkEdit` the same switch returns. `applyEditorAction` (`menu.ts:63-80`) keeps its view-only arms (embeds, citation, paste).
- *Rest:* one `commitEdit(edit, enter)` in `StaticCellImpl`: stand down unless `live.current === text`, then `onCommit(applyEdits(text, edit.changes))`, then `onActivate({ kind: 'select', … })` when `enter` and a selection exists. Every rest action — link, format, checkbox — runs through it.

**R-08: `still()` Becomes a Whole-Text Guard.** `still()` (`cellStatic.tsx:293-298`) re-finds one token by offset and text. Format actions have no token to re-find, so the guard should compare the whole cell (`live.current === text`): stricter, and the rule the table menu already uses (`widget.tsx:290-296`, source equality before acting). **V** (sibling rule), **I** (adequacy: a cell edited while its menu stood open declines rather than retargets, as the table menu does). The `live` ref stays; `claimCheckbox` reads it too (`:332`).

**R-09: Entering the Cell Takes One Union, and `onSelect` Goes (Q3).** Today one decision — where the caret lands on entry — is held in three refs (`caretCoords`, `initialSelect`, `sweepFrom`, `MarkdownTable.tsx:152-154`), reset at three sites (`:419-421`, `:458-460`, `:470-472`), passed as three `CellEditor` props (`:434-436`; typed `CellEditor.tsx:121-123`), split across two `StaticCell` props (`onActivate` `:281`, `onSelect` `:283`), and consumed by one nested ternary (`CellEditor.tsx:247-262`). Under "finite states are unions + switch", it's `type Seat = { kind: 'point'; x; y; sweep? } | { kind: 'select'; range }` with one ref, one prop, and `onActivate(seat)`. `onSelect` is deleted rather than kept beside `onActivate`. **V** (sites); arithmetic in R-17.

---

### Titles at Rest

**R-10: F-043 and B-158 Are One Defect: The Pending Swap Lives in a View the Cell Surface Discards.** At rest there's no view: `menuTarget`'s url arm commits the short form and calls `resolve` with nothing tracking it (`cellStatic.tsx:471-474`). In a live cell, the entry lives in the cell's own view and dies with it (`sweepOnTitles.destroy`, `pendingTitle.ts:68-70`; the comment at `:43` states this). **V.** The one view that outlives both is the page editor, which mounts `pendingTitle` through `inlineSurface` (`surface.ts:54`) and owns every cell write (`widget.tsx:238-241`).

**R-11 (Trap, Confirmed): A Swap Landing Raw in a Row Splits It.** **VR:** `linkMarkdown('https://a.co', 'link-title', 'A | B')` → `[A | B](https://a.co)`. Raw in a row, `splitRow` reads the cells `["x","[A","B](https://a.co)"]`. Through `cellToSource` it becomes `[A \| B](https://a.co)`, reads back as one cell, and `cellToDisplay` round-trips exactly. `escapeAlias` escapes only `\` and `]` (`links.ts:19-21`). Any swap written into the page document at a cell's span must pass through `cellToSource`; a swap that goes through `onCommit` is escaped by `cellCommitChange` already (`sync.ts:21`).

**R-12: Two Candidate Mechanisms.**
- **T-A, Page-Owned Pending Titles (One Mechanism for Body, Live Cell, and Resting Cell; Fixes B-158 and F-043):** cell writes announce their pending title to the page editor.
  - `onCommit(text, title?)`; the widget maps cell to page coordinates as `seg[0] + 1 + cellToSource(display.slice(0, p)).length` (`sync.ts:22-23` writes `` ` ${source} ` ``).
  - The sweep escapes when the span sits in `docScan(doc).tables` (or `PendingTitle` carries `cell: true`).
  - `cellCommitChange` emits a prefix/suffix-trimmed change rather than replacing the whole segment, so typing elsewhere in the cell doesn't map the entry away (today's whole-segment replace maps both ends to the edges: `pendingTitle.ts:29-33` drops it).
  - The live `CellEditor` forwards `awaitTitle` effects from its transactions through `onCommit` (`CellEditor.tsx:236-239`) and stops mounting its own sweep (an `inlineSurface` scope switch), receiving the swap back through `mirrorBody` (`:279-283`).
  - **Cost ≈ +20 to +24.** **I** (estimate).
  - Text values keep the view-local mechanism; their editor mounts the same `pendingTitle` (`surface.ts:54`) with no page to forward to.
- **T-B, Promise Settle (Rest Only; Leaves B-158):** `resolve(url)` returns `Promise<string | null>` (`cacheSlice.ts:23-35`, +2; `api.ts:170`, ±0), and the rest path re-finds by whole text and commits the swap.
  - **Cost ≈ +6 to +8.** **I.**
  - It's a second copy of the swap rule beside `sweepOnTitles`, a Source Over Patch violation, and the swap through `onCommit` must stand down once the static cell has unmounted, or it would revert a live cell's typing via `mirrorBody`.
  - *A useful side effect:* a failed fetch could settle the body's stranded entries (A-61; `cacheSlice.ts:32` records the failure, and the sweep never hears of it).
  - T-A's "stop mounting the cell's own sweep" is a scope switch inside `inlineSurface`, today one array for every scope (`surface.ts:43-70`). That's an odd-one-out the plan must accept or avoid: the alternative is to keep the cell's sweep and forward only its unsettled entries when the editor is destroyed (`CellEditor.tsx:265-268`), at similar cost.
- **Recommendation:** T-A, if B-158 is in the plan; it's the only option that leaves one owner. A third option — at rest, Page Title enters the cell and runs live — enters on an action that needs no typing, and still loses the swap on exit.

---

### Read-Only

**R-13: One Consult at the Top of the Resting Right-Click.** Mirror the body's two consults: the link menu goes read-only when `view.state.readOnly` (`linkClicks.ts:146`), and the editor menu never asks (`menu.ts:88`). At rest, `readOnly()` chooses the edit closure or `undefined` when building the link target, and gates the editor-menu ask. Authoring is then unreachable at rest, so `onActivate({ kind: 'select' })` needs no guard of its own. This fixes B-56 at no line cost (the conditional replaces the unconditional `menuAt`). **V** (sites), **I** (no other authoring entry: checkbox `:327` and left-click `:365` already consult).

**R-14: `TextCell` Becomes the Odd-One-Out.** A resting Text value calls `linkGestures` without `menuAt` (`Properties/Cells/TextCell.tsx:28-33`), so its links offer the read-only menu at rest, and its other constructs nothing. After 1b.3 and 1b.5, a resting table cell authors while a resting Text value doesn't. This is for the properties lane to decide; it shares `linkGestures` and `renderCellContent` with this lane, so R-15's span attribute reaches it. **V.**

---

### Cost: Links Only vs Everything

**R-15: The Dominant New Code in "Everything" Is Pointer-to-Offset Mapping.** Only link spans carry offsets (`data-link-span`, `cellStatic.tsx:105,138`); other token spans (`:163-174`) and plain runs (`:75,177`, bare strings) carry none. The render hides syntax: `§` inserted (`:110-112`), an alias drawn over its title, ordinals over `[^n]` (`:158-160`), list glyphs, and `​` (`:249`), so DOM text length ≠ source length. Grep finds no `caretPositionFromPoint`/`caretRangeFromPoint` in Core or UIX. **V.**
- *(a) A point:* generalize `data-link-span` to a `data-span` on every token span (+3), and map a text node by walking previous siblings to the nearest span's end, or the line base (`data-cell-line`/`base`) (+10 to +14). Synthetic glyphs clamp to their token. A point inside a token is enough for the flags and for toggling a mark off (**VR**, R-05).
- *(b) A selection:* the same function applied to `anchorNode`/`focusNode`, clamped to this cell, since a DOM selection can cross cells (the sweep at `cellStatic.tsx:369-381` exists for that case) (+5 to +7).
- *(c) The right press:* claim every right press, not only one over a link (`:384-386`; ±0). Otherwise the browser seats the word under the pointer before the menu reads the selection (the body's comment at `menu.ts:89`).
- **Total ≈ +17 to +23.** **I.**

**R-16: Choosing the Door for the Editor Menu at Rest.**
- **E-Same Door (Recommended):** the resting cell asks `host.menus.format` as the live cell does, with a request flag `resting: z.boolean()` (`Core/Actions/editorMenu.ts:18-37`, +1; live sender `menu.ts:95-101`, +1).
  - Main lifts the `:128` gate for resting requests (±0 to +1) and drops the role rows (Undo, Redo, Cut, Paste, Paste As, Paste Without Formatting, Select All) for them (+4 to +6). These roles act on the focused element (`systemItems`, `Desktop/Actions/editorMenu.ts:73-87`), which at rest is the page body's caret, so a role Paste would land there. **I** (Electron role semantics).
  - Copy (drawn text), Speech, and Share remain native.
  - **Desktop ≈ +6 to +9.**
- **E-Popper:** the renderer pops `editorContextItems(req, host.settings().commands, selected)` plus `changeColorItems` through `popMenu`. `menu.ts`'s `rowTemplate` already renders `checked` and `chord` (`Desktop/Actions/menu.ts:31-33`). **Desktop ±0**, but the live and resting cell then open different doors with different system rows: an odd-one-out for the same cell.
- *A trap shared by both:* main feeds `params.selectionText` to Insert Link (`Desktop/Actions/editorMenu.ts:133`). At rest that's the drawn text, not the source; the request should carry the source selection, or the renderer should decide Insert Link.

**R-17: The Arithmetic.** Each line is labeled **V** (measured) or **I** (estimated).

*Shared by both readings:*

| Item | Removed | Added | Net |
|---|---|---|---|
| Pure `linkEdit` + one live applier; `linkFormat.ts` deleted | `linkFormat.ts` 86 (**V**) + `linkEdit.ts:21-48` 28 (**V**) = 114 | `linkEdit` ≈ 32-45 (Biome expands its seven object-literal returns), applier ≈ 12-14, moved imports ≈ 4-5 (**I**) ≈ 48-64 | **−50 to −66** |
| Rest link menu rewrite (`menuAt` + `commitEdit` + R-13 consult) | `menuAt` `:288-306` 19 + `menuTarget` `:448-477` 30 + imports `:33-34` 2 = 51 (**V**) | `menuAt` ≈ 9 + `commitEdit` ≈ 9 (**I**) | **−33** |
| Seat union (R-09) | `MarkdownTable` refs 3→1 (−2), resets (−2), props 3→1 (−2), `onActivate` 7→5 (−2), `onSelect` 7 (−7) = −15 (**V** sites); `CellEditor` props −4, selection block 16 → ≈ 12 (−4); `StaticCell` `onSelect` prop/type −2 | `Seat` type +4 | **−15 to −21** |
| `tokenMenuTarget`'s `{ wiki, url }` → one apply (rides 1b.1's single action type; overlaps S7-A) | | | **−2** |
| `FormatEdit.head` + `applyEdit` effects option | | +2 to +3 | **+2 to +3** |
| Titles: T-A / T-B | | | **+20 to +24 / +6 to +8** |
| **Shared Total** | | | **T-A ≈ −74 to −95 · T-B ≈ −88 to −111** |

*Reading (a), links only:* the shared total plus deleting the right-click focus fallback (`cellStatic.tsx:355-356`, −1). That leaves a non-link right-click at rest doing nothing at all; keeping the fallback breaks the ruling. Either way, (a) ships a dead or noncompliant right-click on everything that isn't a link.
- **Net ≈ −75 to −96 (T-A).**

*Reading (b), everything:* (a) plus:

| Item | Net |
|---|---|
| Offset mapper (R-15) | +17 to +23 |
| Resting ask and reply: build the request from `readFormatState`, ask, then `editFor`/`insertLinkEdit` → `commitEdit(edit, from === to)` | +12 to +16 |
| Export `editFor`; pure `insertLinkEdit` split | +2 to +4 |
| Desktop, same door (R-16) | +6 to +9 |
| **Core (b) Over (a)** | **+37 to +52** |
| Optional system-row parity at rest: Paste/Paste As/Paste Without Formatting at the click offset through the pure paste decision (assumes S3-2's pure pipeline) with the table-payload fill, Undo/Redo plumbing, and source-form Cut/Copy | +35 to +45 (renderer ≈ +25-30, Desktop ≈ +10-15) |

- **(b) Without System Rows: ≈ −23 to −58 (T-A).**
- **(b) With System Rows: ≈ +22 to −23 (T-A).**
- Footnote markers (R-03) add +8 to +12 if they get their marker menu in both cells via `pageEditorAt` (`api.ts:32`, the way `followCitation` reaches the page, `citationPointer.ts:35`). At parity with today's live cell, they add 0.

**Overlap Warning:** the first row overlaps the synthesis's S7-B (−10), Side 2's pure-function −16, and S3-2's `linkFormat.ts` −12/−23. The plan should take this lane's figure and zero the others, since all of them delete the same `linkFormat.ts` lines. **I** (count once).

**R-18: What Each Reading Pulls In.**
- **(a):** `cellStatic.tsx`, `MarkdownTable.tsx`, `CellEditor.tsx`, `linkEdit.ts`, `linkFormat.ts` (deleted), `linkClicks.ts`, `connectionsApi.ts`, `applyEdit.ts`, `format.ts` (the `head` field); for T-A also `widget.tsx`, `sync.ts`, `pendingTitle.ts`, `surface.ts`.
- **(b)** adds `Menus/menu.ts`, `Core/Actions/editorMenu.ts` (request schema), and `Desktop/Actions/editorMenu.ts`, plus `renderCellContent`, shared with `TextCell.tsx`.

---

### Traps

**R-19: Role Rows Act on the Focused Element.** At rest that's the page body or nothing, so `role: 'paste'` would write at the page caret. Resting requests must drop or replace them (`Desktop/Actions/editorMenu.ts:73-87`). **I** (Electron).

**R-20: The Two Doors Must Stay Exclusive.** The link door calls `preventDefault` (`cellStatic.tsx:423`), which withholds Chromium's `context-menu`. The resting editor ask must leave the event undefaulted, or main never pops (`MarkdownPM.md:97` describes this rule for the body). **V** (doc and code), **I** (Electron event semantics).

**R-21: When a Resting Edit Enters the Cell — Two Rules.**
- **Body-Parity Rule:** any edit that seats a selection enters the cell. The body focuses after every menu edit (`menu.ts:78`; `focusRange`, `caretPlacement.ts:10-15`), and `toggleInline` sets `selection` after every wrap, including over a range (**VR**: `selection: 8`). This needs no special case, at the cost of Bold over a selection entering the cell, as it does in the body.
- **Stricter Rule:** enter only for Rename/Edit Title or an empty wrapper at a point (`from === to`). This keeps a mark choice at rest, but strands Format ▸ External Link over a range: `[word]()` is written with the caret never seated inside the `()`, which is why `toggleWrap`'s `caret` functions exist (`format.ts:51-55`).
- **Recommendation:** body parity. **I** (rule), **VR** (outputs).

**R-22: The Seat Survives the Commit Only Approximately.** Today's Rename at rest commits and then enters in the same tick (`cellStatic.tsx:463-464`); `CellEditor` clamps the selection to the document end (`:258`), and `mirrorBody` syncs a late `initial` (`:279-283`). GFM trims cell edges on read (`codec.ts:52`), so a commit introducing leading whitespace would shift the seat. That's unreachable from these actions (none writes a leading space). **V** (sites), **I** (reachability).

**R-23: Pasting at Rest Must Honor the Table Payload.** A table-shaped clipboard fills cells (`CellEditor.tsx:154-163`; rectangle ⌘V, `MarkdownTable.tsx:243-252`). A resting Paste that commits text would land escaped in one cell. **V.**

**R-24: Pending-Title Exact-Text Matching Must Survive T-A.** The matching is at `pendingTitle.ts:33`. T-A's minimal-diff commit is what lets typing elsewhere in the cell keep the entry; without it, every live-cell keystroke drops it. **V** (mapping), **I** (consequence).

**R-32: A T-A Swap Inside a Table Takes the Rebuild Path.** The page sweep dispatches without `tableSelfEdit` (`pendingTitle.ts:64`), so a swap landing in a table region rebuilds the widget decorations rather than remapping them (`sync.ts:8-9`). `updateDOM` reuses the React root (`widget.tsx:406-410`), so a live `CellEditor` probably survives and receives the swap via `mirrorBody`. That is unverified: the sweep may need the annotation, or the rebuild path needs verifying with a live cell open. **V** (sites), **I** (survival).

**R-25: `TextCell` Shares `renderCellContent` and `linkGestures`.** It's measured as a scroll-in hot path (`cellStatic.tsx:64-67` skips the parse for token-less text). Span attributes must stay on the token path, with bare text unwrapped. **V.**

**R-26: Footnote Markers in Cells Have No Marker Menu Live Either.** "Everything at rest" for a marker is either parity with the editor menu or a fix on both surfaces. It can't be offered at rest alone without making the resting cell the odd-one-out. **VR** (ordinal null), **V** (`citationPointer.ts:63-65`).

**R-27: Embeds Change Under the Reader Lane.** Under 1b.4, a cell's `![[P]]` is `!` + connection, so it gets the link menu at rest only once the tokenizer stops emitting `embed` there (`tokens.ts:270-279`). This lane depends on that change and doesn't own it. **VR.**

**R-28: 1b.1's "Every Link" Meets `null` Targets.** Phantom, ambiguous, `[[#H]]`, and invalid-target links get no menu target (`connectionsApi.ts:89-92`). If 1b.1's two rows apply to every link, the menu target must exist for them too, in the body as much as at rest. Owned by the menu lane. **V.**

---

### Would Go False

**R-29: Tests.**
- `cellStatic.test.tsx:117-126` (right-click enters).
- `cellLinks.test.tsx:154-269` (the resting link menu: the `onSelect` path, `still` declining at `:207-239`, and the Rename/Edit Link labels at `:253-269`), `:303-320` (`:317-320` pins the `[x](Page)` read-only menu, which 1b.1 ends).
- `Desktop/Actions/editorMenu.test.ts:113-119` (stays true for non-resting requests; needs a resting case).
- `Core/MarkdownPM/Menus/editorMenu.test.tsx:59-152` (if `applyEditorAction` splits).
- `linkFormat.test.tsx` (the file goes) and `linkEdit.test.tsx:65,80,95,124` (applier calls).
- Under T-A, any test pinning a cell-local swap.

**R-30: Comments.**
- `cellStatic.tsx:285` (the `live` rationale, rewritten as the whole-text guard).
- `:383` (right press claimed only on a link).
- `:396` (`linkGestures` "read-only by default").
- `:448` (`still`).
- `linkEdit.ts:21` ("Pure of any editor, because a connection in a resting table cell has none").
- `linkFormat.ts:54`.
- `pendingTitle.ts:43` (under T-A).
- `Desktop/Actions/editorMenu.ts:128` ("the sidebar keeps its own menus").
- `menu.ts:82`.

**R-31: Docs.**
- `MarkdownPM.md:97` ("Right-clicking text in the editor… The right-clicked editor sends what sits under the click"): a resting cell, which isn't an editor, now sends it too.
- `MarkdownPM.md:56`: worth adding that a resting cell answers right-clicks without entering.
- `Editor-Internals.md:17` stays true ("anything … a menu does in the body has to be given to the resting cell separately"), and now names the mechanism: one pure edit, two appliers.
- `ConnectionsPM.md:44-49`: the authoring row labels per 1b.1; "Format (editor only)"; the read-only clause, already false at rest per B-56, becomes true.
