### Scout 6 — Text Pane

**DATE:** 11-05-2026
**HEAD:** `b7f2f17a5` on `active`
**EVIDENCE:** **[Observed]** is read from the tree at that head, or run in a throwaway worktree (`tsc`, `vitest` under jsdom). **[Inferred]** is reasoning no run confirmed. The app wasn't launched and jsdom has no layout, so every claim about pixels, clipping, and drawn ellipses is Inferred unless it rests on a rule that decides the outcome alone.
**PATCH:** `Scouts/Planning/Text Pane Prototype.patch`, against `b7f2f17a5`. The worktree is gone.

#### Answer in Brief

"A table cell's mode" is two things in this tree. The `'cell'` **scope** says what MarkdownPM reads and which extensions mount. **`CellEditor`** is the table's component: grid navigation, `<br>` serialization, forwarding to the page's history, and the single live cell. The pane needs the first and none of the second, and the declined route is the second. The recommendation gives the scope its own name, so nothing about the pane is a table cell, and merges the list keys so the pane adds no third answer.

The prototype delivers G-1 to G-3 and G-7's mark at **+6 net (+156 / -150)**, CSS included, with `ValueEditor`'s keymap untouched. `CellEditor.tsx` drops from 302 lines to 217.

---

#### 1 — What Keeps Lists Out

**6-T1 · One Literal Selects Everything [Observed]:** `ValueEditor.tsx:93` passes `scope: 'text'` and `:61` hands the same literal to the autocomplete, for the pane and the field alike. `oneLine` is the only thing telling them apart (`:96`, `:127-128`, `:197`).

**6-T2 · The Compiler's Census [Observed]:** deleting `'text'` from `MarkdownScope` and running `tsc` names five production sites: `docCache.ts:84`, `detect.ts:516`, `surface.ts:42`, `ValueEditor.tsx:61`, and `:93`. Three more sit outside its reach: the zod enum at `Core/Actions/editorMenu.ts:26`, that file's arm at `:168`, and the type at `Menus/blockHandles.ts:13`. Nothing else names `'text'` as a scope. The enum is a second declaration of the scope rather than a derivation of it. No bridge channel changes, since `Desktop/Actions/editorMenu.ts` reads the scope nowhere and takes the type from this one file.

**6-T3 · The Mechanisms [Observed]:**

| # | Mechanism | Site | What It Stops |
| --- | --- | --- | --- |
| 1 | `readsLists` answers false | `detect.ts:511-519` | Read at `intents.ts:663` (the drawing), `listModel.ts:59` (`itemAt`, hence every walk, key, pick, drag, and recount), and `edits.ts:268` (the `-[]` shorthand) |
| 2 | `blockGestures` returns nothing | `surface.ts:42-43` | Glyph drag, renumbering, grip, grip reveal, block drag, grip menu |
| 3 | The menu's third arm | `Core/Actions/editorMenu.ts:168-169` | Lists ▸ |
| 4 | No list keys on the surface | `editorBase` holds none (`surface.ts:95-101`); they live in `markdownInput.ts:283-287`, page only, and `CellEditor.tsx:186-215`, cell only | Enter, Tab, and Shift-Tab, whatever the scope reads |
| 5 | The pane's own keymap | `ValueEditor.tsx:124-139` | Enter closes, Tab and Shift-Tab are swallowed |
| 6 | The grip's geometry names the table | `markdown-tables.css:193-196`, loaded only by a dynamic import (`widget.tsx:122`, `MarkdownTable.tsx:2`) | Left alone, a pane's grip takes the page's gutter offset (`markdown-pm.css:168-171`) and sits off the line |
| 7 | The resting value reads no marker | `TextCell.tsx:76-81` calls `renderCellContent` alone | G-3 |
| 8 | A ruling | *Text Properties §Deviations*, "Lists (Nathan, 10-08-2026)" | The reason mechanisms 1 and 2 reach the pane |
| 9 | Pins | `textScope.test.tsx`, `Cell.test.tsx:269`, drive lines 151, 532, 542, 578, 634, 649 | Nothing at runtime |

**6-T4 · What Leaves Outright [Observed, from the prototype]:** mechanisms 1 to 3 stay, because the field still needs them, and from then on they describe the field alone. These leave:

- `oneLine` through `editorBase` and `inlineSurface` (`surface.ts:50`, `:83`, `:90`, `:94`), since after the move `scope === 'text'` holds exactly when `oneLine` does.
- `CellEditor`'s `listEdit`, `continueList`, `nestList`, and `unnestList`, and the bodies of its Tab, Shift-Tab, and Enter bindings. Its `joinEmptyHead`, `seatPastMarkerNow`, Backspace, and Delete move to the shared keys, since nothing sits above a pane's first line either.
- `TextCell`'s per-line loop and `lineOffsetsOf`, and the `.cell-text-line + .cell-text-line` rule (`table.css:251`).

**6-T5 · The Ruling Being Reversed [Observed]:** `.claude/Planning/Text Properties — Implementation Plan.md`, *§Deviations*: "Text holds no lists... because a YAML list under a key is a list to every other reader, and a Text string drawn as a list would be a list in Pommora alone." G-1 reverses it, and the log's *§Sources* doesn't cite it. G-4 keeps the second half true: on disk a value stays a string, so a list here is a list in Pommora alone. See *§Questions for Nathan*.

**6-T6 · This Was Designed Once Before [Observed]:** the plan's first version (`b80a7b12a`) mounted the pane in `'cell'` with a shared `cellKeys(ac, exit?)` lifted out of `CellEditor`, and made `.cell-text` a third host of the list geometry. The line "a dropdown pane that mounts MarkdownPM's `'cell'` scope" still stands in the plan's *§Context*, contradicting its own *§Deviations*. Nothing in the plan records a technical failure; the ruling in 6-T5 is what dropped the design.

---

#### 2 — Pane, Cell, and Page

**6-T7 · The Cell in G-6 Wraps [Observed]:** G-6 reads "a cell holds no wrapped text", and for MarkdownPM's table cell the tree says otherwise. The live cell mounts `EditorView.lineWrapping` (`surface.ts:63`, since `oneLine` is unset), its content is `pre-wrap` (`markdown-tables.css:171`), a resting cell is `pre-wrap` with `overflow-wrap: anywhere` (`:188-189`), and list items take the same hanging indent and `break-spaces` text as a page (`markdown-pm.css:371-377`, `:470-474`). One rule draws all of them, so the pane inherits a wrapped list that already exists.

**6-T8 · The Cell That Doesn't Wrap Is a Different Cell [Observed]:** `.data-cell` (`UIX/Table/table.css:76-83`) is a Views table's cell. *Wrapped Table Cells — Brainstorm Brief* is about that one: `nowrap`, `OverScroll` caps, chip runs, row heights. It holds no editor and shares nothing with the `'cell'` scope but the word. That's likely the source of the caution, though this report can't settle which he meant.

**6-T9 · Every `'cell'` Read Holds for the Pane [Observed]:** the five comparisons, none a fact about tables:

| Site | What It Decides | True of the Pane? |
| --- | --- | --- |
| `blockHandles.ts:44` | Only a list takes a grip | Yes |
| `blockHandles.ts:174` | No code-tag reveal | Yes |
| `blockHandles.ts:189` | Hovering a list reveals its grip, since no gutter exists | Yes; `text-pane.css` says the pane has no rail |
| `intents.ts:625` | A press on a replaced marker lands past it | Yes |
| `autocomplete.ts:105` | No embed spelling | Yes, and see 6-T10 |

The table's own facts all live in `CellEditor.tsx` and `MarkdownTable.tsx`.

**6-T10 · A Drift This Removes [Observed]:** `autocomplete.ts:105` tests `scope !== 'cell'`, so the `text` scope takes a page's embed reading, where Task 4.1 of the Text plan wrote "`![[` stays silent as in a cell". The rule means `scope === 'page'`, and the prototype says so.

**6-T11 · The Differences [Observed]:**

| | Page | Live Table Cell | Text Pane Today |
| --- | --- | --- | --- |
| Wrapping | Yes | Yes | Yes |
| Gutter | `--rail-inset` left of the text | None; the grip sits in the list's own 20px inset | None; 14px content padding (`text-pane.css`) |
| Enter | Closers, then continue, then quote | Continue on an item; off one, leave down | Save and close |
| Shift-Enter | A break, with its closers | A break; on the list's last item, leave down | A break |
| Tab | Nest; otherwise held | Nest; otherwise next cell | Held |
| Shift-Tab | Outdent; otherwise held | Outdent; otherwise previous cell | Held, stopped short of the focus trap |
| Escape | Collapses a selection | Collapses a selection, and leaves nothing, since `Tables/` binds none of its own | Saves and closes, through the dismissal stack (`dismissalStack.ts:85-94`) |
| Closing | Never; saves as it changes | Blur or navigation; commits every change | Enter, Escape, ×, outside press; saves once |
| Undo | Its own | Forwarded to the page (`CellEditor.tsx:233-236`) | Its own (`ValueEditor.tsx:95`) |

A cell needs Shift-Enter as an exit because nothing else leaves it from a list. The pane has Escape and the ×, so it doesn't.

**6-T12 · Which Gaps Bite:**

- **The Grip Rule [Observed]:** mechanism 6. Widening the selector isn't enough, because `markdown-tables.css` may not have loaded when a pane opens. The rule moves to `markdown-pm.css`.
- **Shift-Tab's Trap [Observed]:** a list's Shift-Tab must not reach `useFocusScope`, which would carry focus to the × (`focusScope.ts`). CodeMirror merges bindings of one key and ORs `stopPropagation` across them (`@codemirror/view`, `dist/index.js:9090`), so the pane's existing flag covers a list binding above it. The prototype's probe holds focus through it.
- **A Value's Model Is Page-Shaped [Observed]:** `docScan` takes no scope (*Editor-Internals*, "A cell's document model is page-shaped"). A value holding a ` ``` ` line reads as code to `blockStarts` and `inCodeAt`, so a list below it would draw and key but take no grip and no autocomplete. A pane holds many lines where a cell rarely does, so this is likelier here. It already applies to a cell, and it's the strongest case for the *One Scan Per Scope* prospect.
- **An Empty Last Item [Inferred]:** Enter then Escape saves `- milk\n- `, a trailing empty item, as a page keeps one. Harmless at rest, and G-4 is untouched.

**6-T13 · Gaps Checked and Clear:**

- **Drop Line [Observed]:** `--z-drag-slot` is 1110 and `--z-floating` 1000 (`stack.ts:23-25`), so it draws above the pane.
- **Autoscroll [Inferred]:** `resolveScroller` climbs past `.cm-scroller`, which doesn't overflow, to `.text-pane-body` (`autoscroll.ts:66-81`).
- **A Drag Released Outside [Observed]:** dismissal runs on `pointerdown` alone (`dismissalStack.ts`, `onPointerDown`), so a release beyond the pane closes nothing.
- **Rails [Observed]:** `withRails` derives from `listLevels` in any scope (`intents.ts:492-503`), `decorations.ts:526` draws them, and `outline-lines` sits on the root (`applyPersonalization.ts:56`, `:82`), which a portal still sits under.
- **Width [Inferred]:** the deepest level's text starts about 110px into a 480px pane.

---

#### 3 — The Ways to Deliver It

**6-T14 · A — One List Rung (Recommended) [Observed, from the prototype]:** the pane reads the same vocabulary a table cell reads, through the same code, and `CellEditor` stays the table's. Scope is a ladder, inline, then lists, then everything, and `'cell'` is a rung named after its first tenant.

- **Adds:** `listKeys(scope)`, `onItem`, `onItemEnter`, `seated`, `renderRestingLine`, `restingItem`, one `::after` rule.
- **Removes:** everything in 6-T4, and 6-T10's drift.
- **`MarkdownScope`:** three values, renamed `'page' | 'lists' | 'inline'`. A trial rename compiled clean under `Core/tsconfig.src.json`, which holds the zod enum, net 0 in production, across 6 more files than the prototype touches, plus the 42 test lines that name `'cell'`. It lets `ValueEditor` read `oneLine ? 'inline' : 'lists'` instead of a pane calling itself a cell. The prototype patch keeps today's names so its diff stays legible, and the rename is a separate mechanical step.

**6-T15 · B — A Fourth Scope [Inferred]:** `'pane'`, or `'text'` opened with the field moved to a new value.

- **Adds:** a value, a fourth cache in `docCache.ts:84`, a zod member, a `blockGestures` arm, and a case at all five sites in 6-T9.
- **Removes:** nothing beyond what A removes.
- **`MarkdownScope`:** four values, two of them identical at every read. This is the case for why a cell's *reader* is the only sound one. By 6-T9 a separate value holds no difference to carry, and the compiler can't help: a missed `=== 'cell'` compiles and quietly hides the pane's grip.

**6-T16 · C — `CellEditor` in the Pane (Declined) [Observed]:** it needs stubs for `onNavigate`, `onFill`, `onUndo`, `onRedo`, and `ordinalOf`, plus `cellToSource`'s mirror (`CellEditor.tsx:292`), where the value is `\n` text rather than `<br>`, and it commits every keystroke where the pane saves once. Nathan's no is correct for this one.

**6-T17 · D — Two Rungs [Inferred]:** `'text'` leaves and the field reads lists too. It deletes `readsLists` and every `'text'` arm, and it overturns G-5. The field would need `oneLine` to refuse the grip, the drag, and Lists ▸, and it would hide a Link value's leading `- `. It does buy one thing: clicking a resting `• milk` would no longer show `- milk`. Not worth G-5, but it's the only reason G-5 earns a second look.

**6-T18 · E — A Page With Blocks Switched Off [Inferred]:** `'page'` reads headings, quotes, fences, tables, embeds, and citations, so a value's `# x` would draw. It takes a second filter to undo what it brought. Rejected.

**6-T19 · The Keys Merge [Observed]:** two answers become one, and the pane adds none. Both key sets already call the same transforms and differ only in what claims a key, so `listKeys(scope)` joins `editorBase` beside `smartDelete`, the shape `typedInput` already sets. Each surface then states only its exit. The pane needed **no change to its keymap**, because its Enter, Tab, and Shift-Tab bindings simply became what's left when no list claims the key. A page's Enter keeps its longer chain. `listKeys` mounts on the one-line field too, uniformly rather than gated: its Enter and Backspace can't claim a key there, since `onItem` is false and `joinEmptyHead` needs two lines, and its Delete acts as the default does.

**6-T20 · A Sequencing Point [Inferred]:** the key merge belongs early, with the list work, since C-1 opens Markdown code blocks to these same keys and shouldn't do that twice. Only the pane's flip, three lines in `ValueEditor`, needs G-1's near-the-end landing.

---

#### 4 — Recommendation

**6-T21 · Option A, as Prototyped [Observed]:** typecheck is clean across `UIX`, `Core`, and both `Desktop` configs, and Biome is clean on the touched files. 9,123 tests pass. Probe tests in the patch drive a real `TextPane`: a list draws and takes a grip; Enter continues; Tab and Shift-Tab nest and hold focus; Shift-Enter breaks; Enter off a list saves and closes; a recount runs; `#`, `>`, and fences stay literal.

**6-T22 · Three Pins Fall [Observed]:** each is A-4's case rather than a defect.

- `cellLists.test.tsx:349` pins `- [] x` as prose, which B-1 overturns.
- `Cell.test.tsx:269` and `:288` pin the hidden lines and a link on a later line, both of which 6-T30 removes.

A fourth, `Sync/handlers.test.ts`, failed in full runs and passes alone with the patch and without it. `citationBreakage` and `embedAbsorb` failed once in a full run, and both pass alone with the patch. None of the three touch this work.

**6-T23 · The Ledger [Observed]:** +156 / -150 across 10 files, CSS included, net +6, for behavior section G requires. Comment lines read +9 / -8, one over, which the reworded `detect.ts:508` can take back. Once B-1 lands, `restingItem`'s glyph test and `CellEditor`'s `listGlyphOf` checks go too.

**6-T24 · Keys [Observed for the prototype; each row is a recommendation]:**

| Key | On an Item | Off a List | Against the Cell | Against the Page |
| --- | --- | --- | --- | --- |
| Enter | Continues, on an empty item too | Saves and closes | Same, with "leave" as close | Same on an item |
| Enter over a selection, or before the marker | A break | Saves and closes | Same | Differs only in falling to the default |
| Shift-Enter | A break, the list ending there | A break | **Differs:** no exit on the last item | Same |
| Tab | Nests, holding at level 3 | Held | Same on an item | Same |
| Shift-Tab | Outdents, holding at level 0 | Held | Same on an item | Same |
| Backspace on a marker | Takes it | As typed | Same | Same |
| Escape | Saves and closes | Saves and closes | A cell only collapses a selection | A page only collapses a selection |

Shift-Enter departs from the Fresh-Eyes reading of Question 32. A cell's exit exists because a cell has no other; in the pane it would close the editor on someone typing a closing line under a list, with Shift-Enter meaning "a line" everywhere else there.

**6-T25 · Full Regard [Observed, by reading, unless marked]:** all of this arrives through `blockGestures` and the menu arm with no pane code, apart from the grip's CSS.

| Piece | In the Pane? | Note |
| --- | --- | --- |
| Lists ▸ | Yes | The second arm's rows, beside Format ▸ |
| Glyph menu | Yes | `menu.ts:85-86` |
| Glyph drag | Yes | Checked against 6-T13; a live drive must prove it **[Inferred]** |
| Grip and its menu, with Delete | Yes | The grip rule moves |
| Rails | Yes | Derived in every list-reading scope |
| Preserve List-Level Formatting | Yes | `listReach` reads `host.settings()`, the same host |
| Renumbering | Yes | Run in the probe |
| Checkbox toggle | Yes, live | `listDrag.ts:65-70` |
| The `/` menu | No | A cell holds none, it mounts in `MarkdownEditor` alone, and nearly all its rows are page blocks |

---

#### 5 — A Value at Rest

**6-T26 · Surfaces [Observed]:** `TextCell` serves the Views table (`TableView.tsx:452`), the Standard and Compact cards (`CardsView.tsx:613`), the Properties panel (`PropertyPanel.tsx:254`), and `LinkCell`'s connection path (`LinkCell.tsx:50`). One change there reaches all of them. The Properties ▸ menu seats a picker and no `TextCell`. A link's text opens with `[`, so its path can't parse as a marker **[Inferred]**.

**6-T27 · Today's Ellipsis Means Clipped, and Nothing Else [Observed]:** it's `text-overflow: ellipsis` from `overScrollEllipsis` on `.cell-text` (`TextCell.tsx:75`, `OverScroll.tsx:12`, `over-scroll.css`). The kit's own comment reads "An ellipsis marks a tail you can't reach", and *§Deviations* D-3 ruled it as such. Later lines are `display: none` and "add no width" (`table.css:246`, `:251`), so `milk\neggs` shows `milk` with no sign of `eggs`. It clears on hover, where the tail becomes reachable.

**6-T28 · Whether It Exists Everywhere [Inferred, one shared rule]:** as a clip, yes: every surface renders the same element with the same classes, and each bounds its width. `.data-cell` does by column, `.card-value` by `--row-value-reach` or its flow span's full basis (`cards-view.css`), and the panel's value through `flex: 1000 1 0` (`property-panel.css.ts:46-59`). `.over-scroll-ellipsis` keeps it from fading (`scroll-fade.css`). As a continuation mark, it exists nowhere. So G-7's "as it does today" no longer fits the shape ruled.

**6-T29 · What G-7's Mark Takes [Observed in the probe; its drawing Inferred]:** one class and one rule.

- `TextCell` reads `continues = text.slice(first.length).trim() !== ''` and sets `is-continued` on the line.
- `.cell-text-line.is-continued::after { content: "…" }` draws `• text text…`.

Being `::after`, it stays out of `textContent` and out of the selection. On a fitting line it sits right after the text. On a clipped line the kit's `…` shows at the edge and the mark waits at the true end, reached by the hover scroll, so one glyph answers both and two never show. Trailing blank lines earn no mark, which the probe pins, and a value with an empty first line shows `…` alone. The two meanings read alike: a clipped single line and a clipped first line look the same until hovered.

**6-T30 · Only the First Line Renders [Observed]:** the hidden lines exist so "a wrapping container later shows them all" (`table.css:246`), a prospect G-7 doesn't serve, and they tokenize text nobody sees. A wrapped view would call `renderCellBody`, which already draws many lines. So `TextCell` renders one line, and D-3's width concern holds by construction.

**6-T31 · Why Not Export `renderCellBody` Whole [Inferred]:** it draws a block `div` per line, and `text-overflow` acts on a block's own line boxes, so a block child would lose both the ellipsis and the mark. The prototype shares the line instead: `renderRestingLine` is the glyph-and-content both call, each inside its own box.

**6-T32 · What the Glyph Needs Off an Editor [Observed]:** the Text plan's first version records `•milk` with the glyph against the text from its own drive, for this cause (`b80a7b12a`, line 984).

- `--list-gap`, `--number-zone`, `--task-zone`, and `--bullet-size` sit under `.mdpm-editor`, so the prototype lifts those four to `:root`. One line needs no hanging indent.
- `.md-list-glyph:not(.mdpm-tbl-cell-static *)` would give a resting glyph a grab cursor (`markdown-pm.css:487`), so it excludes `.cell-text`.
- The checkbox's `vertical-align` sits under `.mdpm-editor`, and widens to `.cell-text`.

A checked first item draws its filled box with unmuted text in the prototype. **Mute Checked** needs `listLineClass` on the line and `.cell-text` added to one selector, which G-3 should take, since a resting table cell mutes.

**6-T33 · G-8 Comes Free [Observed]:** `TextCell` holds no `claimCheckbox`, so a press on a box falls through to the value's own click. No guard is needed.

**6-T34 · A Nested First Line [Observed]:** `  - a` at rest draws one glyph with no indent, since the content slices from `contentStart`, which suits G-7. Editing it in the field writes `- a`, because `editorText` trims (`parseEditorValue.ts:14`). That's existing behavior, and only a real edit reaches it.

---

#### Where the Tree Contradicts the Log

- **G-6:** "a cell holds no wrapped text" (6-T7).
- **G-7:** "as it does today" (6-T28); it needs rewording to the ruled shape.
- **§Concepts, Scope:** needs rewording once the pane moves.
- **§Sources:** omits the 10-08-2026 ruling G-1 reverses (6-T5).
- **`Text Properties — Implementation Plan.md` *§Context*:** still says the pane mounts `'cell'` (6-T6).
- **`PropertiesPM.md:60`, `MarkdownPM.md:105`:** need the pane's lists, and the first describes the resting value that gains the mark.

---

#### Questions for Nathan

**1. Which cell did you mean?** "Cell" means two things here. A table you write inside a page already wraps its text and its lists. A row in a database table view doesn't, and that's what *Wrapped Table Cells* is about. Your caution reads like the second, and the pane has nothing to do with that one. **My call:** the worry doesn't apply to the pane, and G-6's sentence should go.

**2. Is sharing a table cell's reading rules acceptable, given your no?** You declined making the pane a table cell, and I'm not proposing that: no table code goes near it. The pane and a page's table would share one set of rules for what counts as a list, because a second copy would match it line for line, and that's the kind of duplicate this work exists to remove. **My call:** yes, and rename the rules so they say "lists" and not "cell", so nothing reads as a table.

**3. Should Enter off a list still close the pane?** Today Enter saves and closes, and Shift-Enter makes a new line. With lists, Enter makes a new item on a list line and closes on any other line, so one key does two things depending on where you are. The alternative is Enter always making a line, with Escape or the × to close, as a page behaves. **My call:** keep closing. It matches what a table does, and it's what you already know. The second is reasonable if the pane should feel like writing.

**4. Should Shift-Enter on the last item make a plain line or close the pane?** In a table it leaves the cell, because nothing else can. **My call:** a plain line, as on a page, since the pane has Escape and the ×.

**5. Are you still fine with a Text list being a list only in Pommora?** You ruled against lists in Text on 10-08-2026 for this reason: on disk it stays a string, so other apps show it as text rather than a list. G-1 and G-4 together accept that, and I want it accepted knowingly. **My call:** accept it. A real YAML list was already rejected for fair reasons.

**6. Clicking a resting list shows `- milk` in the field. Is that okay?** At rest you see `• milk…`; one click opens the plain field with the dash. Making the field draw the glyph would mean undoing G-5, and it would hide a leading `- ` in Link values. **My call:** leave it.

**7. Should the `/` menu open in the pane?** It doesn't in a table, and nearly everything in it is a page block. **My call:** no. Typing `- ` and Lists ▸ cover it.

**8. A clipped line looks the same with or without more lines under it. Fine?** Both end in `…`. Hovering scrolls to the true end, which shows a `…` only when more lines follow. **My call:** fine, since a distinct mark would add something to learn for little gain.
