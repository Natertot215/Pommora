### Scout 6 — Text Pane (Reconciled)

**DATE:** 11-06-2026
**HEAD:** `b7f2f17a5` on `active`
**EVIDENCE:** **[Observed]** is read from the tree at that head, or run in a throwaway worktree (`vitest` under jsdom, `tsc`). **[Inferred]** is reasoning no run confirmed. The app wasn't launched and jsdom has no layout, so every claim about pixels, clipping, and drawn ellipses is Inferred unless it rests on a rule that decides the outcome alone.
**PATCH:** `Scouts/Planning/Text Pane Prototype.patch`, against `b7f2f17a5`, which predates G-10 and G-13. *§Keys* and *§A YAML List Under a Text Key* state what it needs on top.

#### Answer in Brief

"A table cell's mode" is two things in this tree. The `'cell'` **scope** says what MarkdownPM reads and which extensions mount. **`CellEditor`** is the table's component: grid navigation, `<br>` serialization, forwarding to the page's history, and the single live cell. The pane takes the first and none of the second, under a name that says "lists", with the list keys merged so the pane adds no third answer (G-6, G-9).

The prototype delivers G-1 to G-3 and G-7's mark at **+6 net (+156 / -150)**, CSS included **[Observed]**, and `CellEditor.tsx` drops from 302 lines to 217. G-10 and G-13 take it to about **+13** **[Observed, on a trial]**.

---

#### 1 — What Keeps Lists Out

**6-T1 · One Literal Selects Everything [Observed]:** `ValueEditor.tsx:93` passes `scope: 'text'` and `:61` hands the same literal to the autocomplete, for the pane and the field alike. `oneLine` is the only thing telling them apart (`:96`, `:127-128`, `:197`).

**6-T2 · The Compiler's Census [Observed]:** five production sites name `'text'` as a scope: `docCache.ts:84`, `detect.ts:516`, `surface.ts:42`, `ValueEditor.tsx:61`, and `:93`. Three more sit outside the compiler's reach: the zod enum at `Core/Actions/editorMenu.ts:26`, that file's arm at `:168`, and the type at `Menus/blockHandles.ts:13`. The enum is a second declaration of the scope. No bridge channel changes.

**6-T3 · The Mechanisms [Observed]:**

| # | Mechanism | Site | What It Stops |
| --- | --- | --- | --- |
| 1 | `readsLists` answers false | `detect.ts:511-519` | Read at `intents.ts:663`, `listModel.ts:59`, and `edits.ts:268` |
| 2 | `blockGestures` returns nothing | `surface.ts:42-43` | Glyph drag, renumbering, grip, grip reveal, block drag, grip menu |
| 3 | The menu's third arm | `Core/Actions/editorMenu.ts:168-169` | Lists ▸ |
| 4 | No list keys on the surface | `editorBase` holds none (`surface.ts:95-101`); they live in `markdownInput.ts:283-287`, page only, and `CellEditor.tsx:186-231`, cell only | Enter, Tab, and Shift-Tab |
| 5 | The pane's own keymap | `ValueEditor.tsx:124-139` | Enter closes, Tab and Shift-Tab are swallowed |
| 6 | The grip's geometry names the table | `markdown-tables.css:193-196`, loaded only by a dynamic import | A pane's grip would take the page's gutter offset |
| 7 | The resting value reads no marker | `TextCell.tsx:76-81` calls `renderCellContent` alone | G-3 |
| 8 | Pins | `textScope.test.tsx`, `Cell.test.tsx:269`, and the Text Property Drive (6-T37) | Nothing at runtime |

**6-T4 · What Leaves Outright [Observed, from the prototype]:** mechanisms 1 to 3 stay, because the field still needs them, and from then on they describe the field alone. These leave:

- `oneLine` through `editorBase` and `inlineSurface` (`surface.ts:50`, `:83`, `:90`, `:94`), since `scope === 'text'` then holds exactly when `oneLine` does.
- `CellEditor`'s `listEdit`, `continueList`, `nestList`, and `unnestList`, and the bodies of its Tab, Shift-Tab, and Enter bindings. Its `joinEmptyHead`, `seatPastMarkerNow`, Backspace, and Delete move to the shared keys.
- `TextCell`'s per-line loop and `lineOffsetsOf`, and the `.cell-text-line + .cell-text-line` rule (`table.css:251`).

**6-T6 · This Was Designed Once Before [Observed]:** the Text plan's first version (`b80a7b12a`) mounted the pane in `'cell'` with a shared `cellKeys(ac, exit?)`. Its *§Context* still says so, against its own *§Deviations*. Nothing records a technical failure; the 10-08-2026 ruling that G-1 reverses is what dropped it.

---

#### 2 — Pane, Cell, and Page

**6-T7 · The Pane Inherits a Wrapped List That Exists [Observed]:** a live cell mounts `EditorView.lineWrapping`, its content is `pre-wrap` (`markdown-tables.css:171`), and list items take the same hanging indent as a page (`markdown-pm.css:371-377`, `:470-474`).

**6-T9 · Every `'cell'` Read Holds for the Pane [Observed]:**

| Site | What It Decides | True of the Pane? |
| --- | --- | --- |
| `blockHandles.ts:44` | Only a list takes a grip | Yes |
| `blockHandles.ts:174` | No code-tag reveal | Yes |
| `blockHandles.ts:189` | Hovering a list reveals its grip, since no gutter exists | Yes |
| `intents.ts:625` | A press on a replaced marker lands past it | Yes |
| `autocomplete.ts:105` | No embed spelling | Yes, and see 6-T10 |

**6-T10 · A Drift This Removes [Observed]:** `autocomplete.ts:105` tests `scope !== 'cell'`, so the `text` scope takes a page's embed reading. The rule means `scope === 'page'`, and the prototype says so.

**6-T11 · The Differences, as They Stand Today [Observed]:**

| | Page | Live Table Cell | Text Pane Today |
| --- | --- | --- | --- |
| Wrapping | Yes | Yes | Yes |
| Gutter | `--rail-inset` left of the text | None; the grip sits in the list's own 20px inset | None; 14px content padding |
| Enter | Closers, then continue, then quote | Continue on an item; off one, leave down | Save and close |
| Shift-Enter | A break, with its closers | A break; on the list's last item, leave down | A break |
| Tab | Nest; otherwise held | Nest; otherwise next cell | Held |
| Shift-Tab | Outdent; otherwise held | Outdent; otherwise previous cell | Held, stopped short of the focus trap |
| Escape | Collapses a selection | Collapses a selection | Collapses a selection first, then saves and closes (6-T24) |
| Closing | Never; saves as it changes | Blur or navigation; commits every change | Enter, Escape, ×, outside press; saves once |
| Undo | Its own | Forwarded to the page | Its own |

**6-T12 · Which Gaps Bite:**

- **The Grip Rule [Observed]:** mechanism 6. Widening the selector isn't enough, because `markdown-tables.css` may not have loaded when a pane opens, so the rule moves to `markdown-pm.css`.
- **Shift-Tab's Trap [Observed]:** a list's Shift-Tab must not reach `useFocusScope`. CodeMirror merges bindings of one key and ORs `stopPropagation` across them, so the pane's existing flag covers a list binding above it, and the prototype's probe holds focus through it.
- **A Value's Model Is Page-Shaped [Observed]:** `docScan` takes no scope, so a value holding a ` ``` ` line reads as code to `blockStarts` and `inCodeAt`. B-11's facet closes this for the pane as it does for a cell, since a surface's scan then holds what it reads.
- **An Empty Last Item [Observed]:** Enter on an empty item continues rather than ends the list (`edits.ts:85`), on the pane as on a page, so `- a\n- ` takes Enter to `- a\n- \n- `. The ways out are Backspace on the marker and Shift-Enter. Escape on an empty last item saves it, which is harmless at rest.

**6-T13 · Gaps Checked and Clear:**

- **Drop Line [Observed]:** `--z-drag-slot` is 1110 and `--z-floating` 1000, so it draws above the pane.
- **Autoscroll [Inferred]:** `resolveScroller` climbs past `.cm-scroller` to `.text-pane-body`.
- **A Drag Released Outside [Observed]:** dismissal runs on `pointerdown` alone.
- **Rails [Observed]:** `withRails` derives from `listLevels` in any scope, and `outline-lines` sits on the root, which a portal still sits under.
- **Width [Inferred]:** the deepest level's text starts about 110px into a 480px pane.

---

#### 3 — The Way to Deliver It

**6-T14 · One List Rung [Observed, from the prototype]:** the pane reads the same vocabulary a table cell reads, through the same code, and `CellEditor` stays the table's. G-9 settles this.

- **Adds:** `listKeys(scope)`, `onItem`, `onItemEnter`, `seated`, `renderRestingLine`, `restingItem`, and one `::after` rule.
- **Removes:** everything in 6-T4, and 6-T10's drift.
- **`MarkdownScope`:** three values, renamed `'page' | 'lists' | 'inline'`. A trial rename compiled clean, net 0 in production, across 6 more files than the prototype touches, plus 42 test lines. `ValueEditor` then reads `oneLine ? 'inline' : 'lists'`. The prototype keeps today's names so its diff stays legible. Nothing in it conflicts with B-11, where a list reader asks the scan: `listKeys`' `scope` then shrinks to the page-or-not branch.

**6-T16 · Why Not `CellEditor` [Observed]:** it needs stubs for `onNavigate`, `onFill`, `onUndo`, `onRedo`, and `ordinalOf`, plus `cellToSource`'s mirror, and it commits every keystroke where the pane saves once. G-6 rules this out.

**6-T19 · The Keys Merge [Observed]:** both key sets already call the same transforms and differ only in what claims a key, so `listKeys(scope)` joins `editorBase` beside `smartDelete`. Each surface then states only what's left when no list claims the key: a cell its navigation, the pane its break, a page its longer chain. `listKeys` mounts on the one-line field too, uniformly rather than gated: its Enter and Backspace can't claim a key there, since `onItem` is false and `joinEmptyHead` needs two lines. The merge also settles the keys' disagreement over a marker nothing draws, which B-1 removes anyway.

**6-T20 · Sequencing [Inferred]:** the key merge belongs early, with the list work, since C-1 opens Markdown code blocks to these same keys. Only the pane's flip needs G-1's near-the-end landing.

---

#### 4 — Keys

**6-T21 · The Prototype's Run [Observed]:** typecheck is clean, and with the prototype applied the full Core suite fails only the three pins in 6-T22. Probe tests in the patch drive a real `TextPane`: a list draws and takes a grip, Enter continues, Tab and Shift-Tab nest and hold focus, Shift-Enter breaks, a recount runs, and `#`, `>`, and fences stay literal.

**6-T22 · Pins the Prototype Overturns [Observed]:** each is A-4's case.

- `cellLists.test.tsx:349` pins `- [] x` as prose, which B-1 overturns.
- `Cell.test.tsx:269` and `:288` pin the hidden lines and a link on a later line, both of which 6-T30 removes.

**6-T23 · The Ledger [Observed]:** the prototype reads +156 / -150 across 10 production files, CSS included. Comment lines read +9 / -8, one over, which the reworded `detect.ts:508` can take back. G-10 adds about +3 and G-13 +4. Once B-1 lands, `restingItem`'s glyph test and `CellEditor`'s `listGlyphOf` checks go too.

**6-T24 · The Pane's Keys, Under G-10 [Observed on a trial in the worktree]:**

| Key | On an Item | Off a List | Against the Cell | Against the Page |
| --- | --- | --- | --- | --- |
| Enter | Continues, on an empty item too | Breaks the line | **Differs off a list:** a cell leaves down | Same on an item; a page's closers don't apply |
| Enter over a selection, or before the marker | A break | A break | **Differs off a list** | Same |
| Enter with the `[[` pane open | Picks its row, and the pane stays | Same | Same | Same |
| Enter in an alias | Rests past the link | Same; a second Enter breaks the line | Same on the first | Same on the first |
| Shift-Enter | A break, the next line plain | A break | **Differs:** a cell exits from the list's last item | Same |
| Tab | Nests, holding at level 3 | Held | Same on an item | Same |
| Shift-Tab | Outdents, holding at level 0 | Held | Same on an item | Same |
| Backspace on a marker | Takes it | As typed | Same | Same |
| Escape | Saves and closes, over a selection too | Saves and closes, over a selection too | A cell only collapses a selection | A page only collapses a selection |
| × | Saves and closes | Saves and closes | No × | No × |

Nothing but Escape, the ×, and an outside press closes the pane. Shift-Enter stays a plain break everywhere, since a pane has its own way out and the cell's exit exists only because a cell has no other.

**6-T36 · What Changes in `ValueEditor.tsx`:**

- `:126`, `{ key: 'Enter', run: leave }`, becomes the field's alone, and the pane's Enter is `insertNewline`, the same break its Shift-Enter already runs. `insertNewline` rather than the default `insertNewlineAndIndent`, so a plain line under an indented one starts flush **[Observed]**.
- The pane's arm at `:133-137` gains `{ key: 'Escape', run: leave }`. Without it Escape falls to CodeMirror's `simplifySelection`, which collapses a selection and claims the key, so Escape over a selection needs two presses **[Observed]**. With it, the first press saves and closes **[Observed]**, and an open `[[` pane still takes Escape first, since `paneKeys` sits above (`caretPane.tsx:109`).
- `leave` therefore stays on both surfaces, `onClose={close}` stays at `TextPane.tsx:47`, and `cancel` stays the field's.
- Nothing else moves. Tab and Shift-Tab stay as the fallback under `listKeys`, and the `oneLine` branch at `:96-123` is untouched.

**6-T37 · The Pins G-10 Overturns [Observed]:** in `Core/Properties/Pickers/TextPane.test.tsx`, three of 14 fail, each A-4's case:

| Pin | What Falls | What Survives |
| --- | --- | --- |
| `:117` "Enter saves and closes; Shift-Enter writes a line break; Tab stays…" | `:130-134`, the close | Shift-Enter's break and Tab's hold |
| `:137` "Enter in an alias rests past the link, and a second Enter closes the pane" | `:144-146`, the second Enter's close | The rest past the link |
| `:150` "an alias typed into a link and closed by Return…" | The closing `press('Enter')` at `:163` and `:174`, which now split the link; both become `press('Escape')`, and its alias assertions hold | The alias memory |

`:179` (Escape), `:193` (the ×), and `:236` (Enter with the `[[` pane open) hold. So does every other `Properties` test. The prototype's own `a list in the pane` pin closes with Enter off a list, and it takes the same change. In the Text Property Drive, G-10 overturns `:596-597` ("Enter saves and closes"); section G as a whole overturns `:151`, `:532-533`, `:542`, `:578`, `:634`, and `:649`.

**6-T25 · Full Regard [Observed, by reading, unless marked]:** all of this arrives through `blockGestures` and the menu arm with no pane code, apart from the grip's CSS.

| Piece | In the Pane? | Note |
| --- | --- | --- |
| Lists ▸ | Yes | The second arm's rows, beside Format ▸ |
| Glyph menu | Yes | `menu.ts:85-86` |
| Glyph drag | Yes | A live drive must prove it **[Inferred]** |
| Grip and its menu, with Delete | Yes | The grip rule moves |
| Rails | Yes | Derived in every list-reading scope |
| Preserve List-Level Formatting | Yes | `listReach` reads `host.settings()`, the same host |
| Renumbering | Yes | Run in the probe |
| Checkbox toggle | Yes, live | `listDrag.ts:65-70` |
| The `/` menu | No | G-10; it mounts in `MarkdownEditor` alone |

---

#### 5 — A Value at Rest

**6-T26 · Surfaces [Observed]:** `TextCell` serves the Views table (`TableView.tsx:452`, through `Cell`), the Standard and Compact cards (`CardsView.tsx:613`), the Properties panel (`PropertyPanel.tsx:254`), and `LinkCell`'s connection path (`LinkCell.tsx:50`). One change there reaches all of them. A link's text opens with `[`, so its path can't parse as a marker **[Inferred]**.

**6-T27 · Today's Ellipsis Means Clipped, and Nothing Else [Observed]:** it's `text-overflow: ellipsis` from `overScrollEllipsis` on `.cell-text`. Later lines are `display: none`, so `milk\neggs` shows `milk` with no sign of `eggs`. It clears on hover, where the tail becomes reachable.

**6-T29 · What G-7's Mark Takes [Observed in the probe; its drawing Inferred]:** one class and one rule. `TextCell` reads `continues = text.slice(first.length).trim() !== ''` and sets `is-continued` on the line, and `.cell-text-line.is-continued::after { content: "…" }` draws `• text text…`. Being `::after`, it stays out of `textContent` and the selection. On a clipped line the kit's `…` shows at the edge and the mark waits at the true end, reached by the hover scroll, so two never show. Trailing blank lines earn no mark.

**6-T30 · Only the First Line Renders [Observed]:** the hidden lines exist for a wrapping container G-7 doesn't serve, and they tokenize text nobody sees. `TextCell` renders one line.

**6-T31 · Why Not Export `renderCellBody` Whole [Inferred]:** it draws a block `div` per line, and `text-overflow` acts on a block's own line boxes, so a block child would lose both the ellipsis and the mark. `renderRestingLine` shares the line instead.

**6-T32 · What the Glyph Needs Off an Editor [Observed]:**

- `--list-gap`, `--number-zone`, `--task-zone`, and `--bullet-size` sit under `.mdpm-editor`, so the prototype lifts those four to `:root`.
- `.md-list-glyph:not(.mdpm-tbl-cell-static *)` would give a resting glyph a grab cursor, so it excludes `.cell-text`.
- The checkbox's `vertical-align` sits under `.mdpm-editor`, and widens to `.cell-text`.

The prototype draws a checked first item with unmuted text. **Mute Checked** needs `listLineClass` on the line and `.cell-text` added to the selector at `markdown-pm.css:544`, which G-3 should take, since a resting table cell mutes.

**6-T33 · G-8 Comes Free [Observed]:** `TextCell` holds no `claimCheckbox`, so a press on a box falls through to the value's own click. No guard is needed.

**6-T34 · A Nested First Line [Observed]:** `  - a` at rest draws one glyph with no indent, which suits G-7. Editing it in the field writes `- a`, because `editorText` trims (`parseEditorValue.ts:14`). Only a real edit reaches that.

---

#### 6 — A YAML List Under a Text Key

**6-T35 · G-13 [Observed on a trial]:** `asText` (`propertyValue.ts:40`) has two readers, and both follow one change.

- **`decodeValue`'s text arm** (`:181`) reads `[milk, eggs]` as `- milk\n- eggs`, and everything past it, the cell, the card, the pane, sort, and filter, reads that string.
- **`writtenSpelling`** (`Nexus/governedRoot.ts:73`) keeps `raw` wherever `asText(raw) === next`. That one compare is what holds the shape on disk: an adjacent write, an untouched pane, and retyping the same first line all keep `[milk, eggs]`, and the first real edit lands a string, as a foreign `42` does today. No new code is needed for that half.

```ts
const inlineText = (raw: unknown): string => linkEntry(raw, 2) ?? yamlInline(raw)

export const asText = (raw: unknown): string =>
  Array.isArray(raw) && linkEntry(raw, 2) === null
    ? raw.map((item) => `- ${inlineText(item)}`).join('\n')
    : inlineText(raw)
```

- **A Member Reads as Today's Whole Value Reads:** a string as itself, `[[Page]]` as its link, a nested list or map as flow yaml, so `[a, [b, c]]` reads `- a\n- [b, c]`, one line per item.
- **`linkEntry` Goes First:** an unquoted `[[Page]]` is a list to yaml, and it stays a link rather than becoming `- Page`. A one-item `[milk]` reads `- milk`.
- **A Member Holding a Break:** `['a\nb', 'c']` reads `- a\nb\n- c`, an item, a plain line, and an item. It round-trips by the compare above, so it needs no guard.

**What Else Reads `yamlInline`:** `quotesUnasked` (`Files/pageFile.ts:144`), which asks whether yaml quotes a scalar. It doesn't see this change. `yamlInline` itself is untouched, along with its doc and its double-quoting branch, which `{x: "a\nb"}` and `quotesUnasked` still reach.

**Pins:**

- `propertyValue.test.ts:62` and `:66-69` (`["a\nb", "c"]` and `[milk, eggs, bread]`) and the test's title at `:55`.
- `governedRoot.test.ts:278` (`[milk, eggs]`), whose `next` becomes the new reading. Its title still reads true.
- `asText`'s doc at `propertyValue.ts:39`.
- **The Text Property Drive:** `:145-146` flips, `Drive List` reading `•milk` with the rest behind G-7's mark. Its helpers `inline` and `shown` (`:37`, `:40`) feed the sort and filter expectations at `:213` and `:217`, and they have to read a list as its lines too. `:157-160`, the adjacent write keeping the flow list byte for byte, stands and is the pin for "keeping its shape". `Drive List` wants one new check: the first edit lands a string.

---

#### Where the Tree Still Needs Words

- **`Text Properties — Implementation Plan.md` *§Context*:** still says the pane mounts `'cell'` (6-T6).
- **`PropertiesPM.md:60`, `MarkdownPM.md:105`:** need the pane's lists, and the first describes the resting value that gains the mark.
- **`table.css:246`, `TextCell.tsx`, `ValueEditor.tsx:134`:** comments the prototype and G-10 overtake.

**Settled:** every question this report once held for Nathan is answered in *Gestures Reconciliation*, *§What's Settled*.
