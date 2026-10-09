## MarkdownPM System Audit

**Pinned:** `2da4463c8` (10-08-2026) · **Findings:** 68

Twelve investigators read every production file in `Core/MarkdownPM/` and its host seam in `Core/Pages/editorHost.tsx`, four domains by three lenses: drift and residue, performance and correctness, and ownership and placement. Two reviewers who hadn't raised the candidates re-read every citation at the pin and reproduced every High in a mounted editor; a third audited the 92 test files. The investigators' candidates merged by root cause into the 68 findings below, with 29 and 42 reviewer entries behind them and one test-side consolidation. Two peer commits after the pin, `d0dd9e52d` and its closeout `70fc6063c`, closed two of the reviewers' items before this document was settled; they are listed under *§Killed* with that reason, and the findings that cite `Links/`, `Autocomplete/`, `Input/edits.ts`, `decorations.ts`, `Tables/cellStatic.tsx`, and `Core/Connections/links.ts` re-anchor their line numbers against `70fc6063c`. The owner's rulings are *§Decisions*.

The baseline at the pin, comments and tests excluded: 15,184 production lines across the Engine (3,155), Tables, Input, Guards, and Gestures (4,449), the constructs (3,335), and the root with its seam (4,245); 15,436 test lines in 92 files holding 1,696 tests. Typecheck, lint, and 7,458 tests pass.

### Verdict

#### Readiness

**Fix the two silent corruptions and the long-page freeze first, then fold the seams.** Two findings rewrite a person's text from an ordinary click or an automatic renumber, and both were reproduced: a resting table cell commits into a different table once a table is inserted above it (MD-001), and a footnote renumber binds an orphaned marker to another footnote's text (MD-009). A third freezes the editor for up to a second on every typing pause once a page passes about 8,000 lines (MD-027). The Engine beneath them is sound: it is pure, stepped, and pinned by property tests. What costs the most around it is a page editor assembled by hand beside the shared assembly cells and Text values use (MD-016), a page index handed down through 23 signatures beside the host facet that carries everything else (MD-048), and a surface kind asked for as a string in twenty places (MD-047); those are what a SidePane editor or a fourth scope would meet first.

**What holds, with evidence:**

- **The Engine is pure and stepped.** `Engine/` holds no React, store, DOM, or CodeMirror reference, and `engineGraph.test.ts`'s allowlist admits the host-run half (`detect`, `docScan`, `headingScan`, `markdownCode`, `parser`, `perText`, `codeLangs`, the table codec) without a `.tsx`. `rescan` carries each per-line array explicitly and its `LineScan` return type forces a new field through the carry; `rescan ≡ scanDoc`, `stepLineIntents ≡ docLineIntents`, and the stepped atomic set are each specified by a seeded property in `Engine/docScan.test.ts` and `docCache.test.ts`, and the test audit found both files sound in full.
- **Fence pairing has one pass.** `fenceSpans` is the one pairing; `scanFencedCode`, `codeMask`, the masked parse, and the input transforms read the shared grammar, and nothing outside the Engine pairs fences.
- **The finite states are unions.** `BlockKind`, `DecoIntent`, `WidgetSpec`, `FenceInfo.role`, `DiffLine`, `TablePayload`, and `Align` switch exhaustively; `transformFor` fails to compile on a new table action. The exceptions are the findings in MD-032 and MD-034.
- **The embed claim has one owner for the tile field.** `embedTileRanges` is the claim every guard, grip exclusion, and the autocomplete pool read; the decoration pass's second derivation is MD-056.
- **The guards hold the citations tail.** A repair that moves text carries both edits, a landing passes no guard, and the footnotes run was probed through the full page stack; what the guards drop is the caret (MD-054).
- **The gates are green at the pin.** Typecheck, lint, and 7,458 tests; 1,696 of them are the editor's. 86 of those pin nothing a sibling doesn't (5%), and the deletions are listed in MD-043.

**What's broken, and where:**

| Area | State | High | Medium |
| --- | --- | --- | --- |
| Tables And Cells | A checkbox or link action in a resting cell writes into another table after a table is inserted above it (MD-001). Typing in a cell re-parses the whole table per keystroke, now measured at 28 ms for 200 rows and 256 ms for 1,000 (MD-053). | 1 | 1 |
| Footnotes And Guards | A renumber hands an orphaned marker's number to a different footnote (MD-009), and the renumber runs before the guards repair the edit it reads (MD-010). A guard that repairs a keystroke leaves the caret behind, so text typed below the footnotes breaks into one-character lines (MD-054). | 1 | 2 |
| The Editor Assembly And Host Seam | The page builds by hand what `editorBase` assembles, and Tab already differs (MD-016). Scope is a string compared in 20 places with 13 defaults (MD-047). Connections travel through 23 signatures beside the host facet (MD-048). | 0 | 3 |
| Links And Paste | Link gestures inside code edit the code and write another page's frontmatter (MD-018). Three modules classify a copied link, and Paste As writes phantom connections (MD-057). | 0 | 2 |
| Subfield Figures | Past about 8,000 lines, the footer's figures re-tokenize the whole page on every typing pause, freezing the editor for 0.4 to 1.3 s (MD-027). | 1 | 0 |
| Engine And Decorations | Block handles re-read every line's list marker per keystroke (MD-030). A callout's last line carries a margin the internals guide rules out (MD-035). A lone embed in a cell or Text value draws raw (MD-056). | 0 | 3 |

**What extending costs today:**

| Addition | Sites Touched | Ways To Do A Step | Blocking Constraint |
| --- | --- | --- | --- |
| A SidePane editor (v0.8.0) | The host flags across five switches, two sentinel ancestor strings, and a CSS host list (MD-049); a connections getter built four ways (MD-048); one host menu member per construct in three places (MD-050) | 2 ways to assemble an editor (MD-016) | A new host picks among `readOnly`, `active`, `locked`, `inert`, `pageSurface`, `preview`, a connections mode, and fake ancestors, then adds itself to a stylesheet selector, and supplies connections twice. |
| The mobile companion (Capacitor WebView) | The same host seam (MD-048, MD-049, MD-050), plus four `pointerHandlers` instances with two parallel link handlers (MD-019) and clipboard pass-throughs beside the host's own clipboard (MD-004) | 2 link pointer paths | A touch host adapts the link press twice, and the host seam names each menu by construct. |
| The auto-linter (ContextPM's prospect) | A landing through `mirrorBody`, which two sites re-spell (MD-002, MD-015); heading names that keep closing hashes (MD-055); the page figures derived a second way from a string (MD-027); the heading scan run twice (MD-029) | 3 ways to land outside text | A linter's rewrite has one sanctioned landing and two copies of it, and the names and counts it would read exist twice. |
| A further Properties scope | 20 `scope === '…'` compares across 9 files and 13 `= 'page'` defaults (MD-047); the lone-embed suppression (MD-056); the resting Text value's own render options (MD-063); link presentation written twice (MD-022) | 1 capability switch (`readsLists`) beside 20 compares | A fourth scope lands as non-page at every `=== 'page'` site and as page at every `=== 'cell'` site, silently. |

#### Line Balance

Production lines are counted with comments and tests excluded, as the reviewers counted them; test lines are their own row, kept apart from the production figure.

| Part | Net |
| --- | --- |
| Better Done, production (MD-001 through MD-042) | ≈ −61 |
| Better Done with the Owner's Call entries the reviewers marked Fold (MD-055, MD-056) | ≈ −62 |
| Everything, each Owner's Call finding at its proposed form (MD-047 through MD-066) | ≈ −41, in a range of −50 to −30 |
| Tests (MD-043 through MD-046), in `Core/MarkdownPM/` | ≈ −650, ≈ −780 with the stub-setup extension |

- **Better Done alone:** ≈ −61. The reductions are the editor assembly (MD-016, −10), the citations-visibility channels (MD-011, −12), the two link handlers (MD-019, −10), the five small duplications (MD-039, −10), and the dead code (MD-017, MD-040, MD-041, −18); the defect and hot-path fixes add about +40 against them.
- **With the two Owner's Call folds:** ≈ −62. MD-055 (+2) and MD-056 (−3) are the Owner's Call entries whose fix the reviewers marked a fold; they sit there only because one changes a per-machine key and the other what a cell draws.
- **With everything:** ≈ −41. The seams reduce (MD-048 −10, MD-057 −8, MD-064 −8, MD-065 −5) and the HTML-block grammar (MD-051, MD-052, +21), the scope predicates (MD-047, +8 to +15), the table rework (MD-053, +6), and the intent carry (MD-066, +6) add back more; the document recommends deferring MD-049, MD-050, and MD-066, which moves the figure to about −44.
- **Against the ~500-line goal:** about a tenth of it. The reviewers halved most investigator estimates, the two Highs and most hot-path fixes add lines, and the subsystem's duplication is in seams of ten lines each rather than in parallel builds of a hundred. The two prior system audits landed near −100 against their goals; this one lands lower because the editor's largest parallel build (the page assembly) is one finding of −10. The line reduction this audit does deliver is in the test suite.

---

### Better Done

#### W1 · Tables And Cells

The table widget, its React grid, and the cell editor. MD-001 is a reproduced corruption and lands first; the rest remove residue of the first table design and bound the per-keystroke and per-pointer-move cost to the cell or column being edited.

##### MD-001 · A checkbox or link action in a table cell you haven't entered writes into a different table once a table is inserted above it or the tables are reordered.

> **Area:** Tables · **Lens:** Defect · **Weight:** High · **Size:** S · **Net:** +2 · **Origin:** Defect

**Finding**

Suppose a page has two tables and a new table is added above one of them, or the tables are dragged into a new order. Clicking a checkbox in a cell of the lower table, or choosing a link action from its menu, then rewrites a cell in the table above, and the table that was clicked stays unchanged. Nothing warns.

Each table's React component hands every resting cell a commit function, and that function captures the table's index in the document. `StaticCell`'s memo compares only the text, the link style, and the page key, so a cell whose text didn't change keeps the function from an earlier render. When the indices shift, CodeMirror reuses the widget's DOM and re-renders `MarkdownTable` with new callbacks; each unchanged `StaticCell` skips that render and keeps committing through the old index, and the paired `onSettled` refreshes the wrong table too. The reviewer reproduced it in a real editor: inserting a table above table B reused B's node, and clicking B's checkbox checked the new table's cell while B stayed unchanged. Deleting a table above recreates the DOM, so that direction isn't affected.[^1]

**Fix | Literal**

In `MarkdownTable.tsx`, `cell()`'s `StaticCell` branch reads `onCellCommit` and `onSettled` through `useLatest`, already imported and already used for `geomRef`; row and column are positional and stay captured. Add a regression test beside `Tables/cellStatic.test.tsx`: insert a table above, click the lower table's checkbox, and assert the upper table's cell text is unchanged (a `toContain('- [x] b')` assertion doesn't discriminate, because the corrupted document contains it too).

##### MD-002 · A table cell being edited replaces its whole text when new text arrives from elsewhere, throwing a mid-cell caret to the start.

> **Area:** Tables · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −3 · **Origin:** Parallel Build

**Finding**

When an entered cell receives text from outside (an undo forwarded to the page, a row reorder), it replaces its entire document instead of only what changed, so the caret jumps to the cell's start. The editor already has one way to land outside text that keeps the caret: `mirrorBody` dispatches a minimal diff under the `mirrored` annotation with `filter: false`, and TextPane uses it. `CellEditor` instead dispatches a whole-document replace under its own `silentEdit` annotation. The caret jump is rated Likely; the duplicate is confirmed.[^2]

**Fix | Literal**

Keep the `cellToSource` guard, call `mirrorBody(view, initial)`, skip `mirrored` transactions in the cell's listener, and delete `silentEdit`. MD-015 gives `mirrorBody` its echo flag first.

##### MD-003 · The table's page context travels as a `label=ordinal;…` string the component parses back, so a footnote label holding `=` or `;` shows `NaN` inside a table.

> **Area:** Tables · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** −5 · **Origin:** Defect

**Finding**

If a page cites `[^a]` and also `[^a=b]`, a table cell citing `[^a]` shows `NaN` instead of `1`, and `[^a=b]` draws unnumbered. `citeKey` encodes the footnote entries as `LABEL=n;…` for the widget's equality key, and `MarkdownTable` splits that same string on `;` and `=` to rebuild the ordinals. The label grammar admits both characters, so `A=B=2` decodes as label `A` with ordinal `Number('B')`.[^3]

**Fix | Proposed**

Keep `page` as the equality and memo key only. `widget.tsx` builds the `CellPage` from the scan's entries and `docHeadingKeys`, memoized per key so `ordinalOf` keeps its identity, and passes it as a prop; the decode in `MarkdownTable.tsx` is deleted.

##### MD-004 · The table components carry optional props, clipboard pass-throughs, and payload checks that only tests or nothing at all need.

> **Area:** Tables · **Lens:** Residue · **Weight:** Low · **Size:** S · **Net:** −7 · **Origin:** Residue

**Finding**

Ten `MarkdownTable` props are optional with `?.` calls throughout, though the one production render site passes all of them. `onCopyText` and `readClipboard` only wrap `host.clipboard`, which the component already receives. `payload.kind !== 'table'` is checked at two call sites, though `fill` already maps a table payload to an unchanged model and `structuralEditChange` skips no-op serializations. `CellEditor`'s props follow the same pattern, and `tableWidgetExtension(connections?)` keeps a `: []` branch and a `() => undefined` facet fallback that only `widget.test.ts` and `headingColRemap.test.ts` reach.[^4]

**Fix | Proposed**

Make the props and the extension's parameter required, have `MarkdownTable` call `host.clipboard.write` and `read` itself, and drop both payload checks. The tests that mount with partial props (`cellNavigation`, `dragOrigin`, `cellSweep`, `cellLinks`, `cellAlias`, `cellStatic`) pass stubs; the two widget tests pass `() => undefined`.

##### MD-005 · A table row's cells and the delimiter row are wrapped in one-field objects every reader unwraps immediately.

> **Area:** Engine, Tables · **Lens:** Residue · **Weight:** Low · **Size:** S · **Net:** −5 · **Origin:** Residue

**Finding**

The table code wraps each cell's text in a `{ text }` object and the delimiter's columns in `{ columns }`, both left from the first table design. Every reader (`regions.ts`, `widget.tsx`, `clipboard.ts`, `subfieldStats.ts`, `sync.ts`, the test builder) takes the field straight out.[^5]

**Fix | Literal**

`cells: string[]` and `columns: Column[]`.

##### MD-006 · An entered table cell parses its own text twice per keystroke.

> **Area:** Tables · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +1 · **Origin:** Performance

**Finding**

Every keystroke in a cell runs the full Markdown parse of that cell twice: once for drawing, and once more in `cellCitations`, which re-runs `tokenize` on the whole cell for every document change just to find footnote markers that usually aren't there.[^6]

**Fix | Literal**

Return `Decoration.none` when the text holds no `[^`.

##### MD-007 · On every page edit, the table widget field rebuilds its page-context keys even when the page has no tables.

> **Area:** Tables · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +1 · **Origin:** Performance

**Finding**

With no table on the page, every keystroke still joins the footnote and heading keys, only to iterate an empty decoration set. The outline itself is already derived every version by the decoration build through `docHeadingKeys`, so the widget adds two string joins per keystroke, not a heading walk.[^7]

**Fix | Literal**

`if (deco.size === 0) return next` before the compare.

##### MD-008 · Dragging a table row, column, or column edge redraws the whole grid on every mouse movement, and hovering redraws it on every cell crossing.

> **Area:** Tables · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +6 · **Origin:** Parallel Build

**Finding**

While a row or column is dragged, the whole table component redraws on every pointer move (every row, every cell's classes and position, every grip) because the pointer's exact offset is held in React state; the Codebase Audit records this as F-173, which this finding supersedes. Resizing a column does the same through `setResize` per move, and `trackHover` calls `setHover` on each cell crossing though it is read only for the grips' reveal. The collection table view solves the same problem by writing the offset to a CSS variable and setting state only when the drop slot changes.[^8]

**Fix | Literal**

Keep `delta` and the two resize widths out of React state: write them as CSS variables on the table wrap in `resolve` and `onDragMove`, read them in the dragged row's or column's transform, and call `setDrag` or `setResize` only when the slot or the activation changes.

#### W2 · Footnotes And Guards

The citations section is the document's tail, and every edit near it passes a guard and a renumber. MD-009 and MD-010 are reproduced defects of that pair and land together; the rest remove residue of a deleted guard, bound a per-keystroke string build, and fold the three channels through which the editor learns whether footnotes are shown.

##### MD-009 · A footnote renumber hands an orphaned marker's number to a different footnote, so that marker silently reads someone else's text.

> **Area:** Citations · **Lens:** Defect · **Weight:** High · **Size:** S · **Net:** +1 · **Origin:** Defect

**Finding**

If the body holds a footnote marker with no citation row (one whose row was deleted, or that arrived in a paste), the next renumber can give that marker's number to another footnote. The orphan then points at the wrong citation, and nothing on screen says so. One undo reverts it, but nothing flags it.

`normalizeCitations` builds its `held` set (the numbers it may not rename onto) from loose citation rows only. An orphaned marker has `ordinal: null` and never enters it, so a placed row whose first-use ordinal equals the orphan's label is renamed onto it, and every marker of that row follows. The reviewer reproduced it two ways in a mounted editor: Insert ▸ Footnote after `Body a[^1] b[^2] c` with only `[^2]: two` defined gave `a[^1] b[^1] c[^2]` with `[^1]: two`, so the orphan now reads "two"; Lists ▸ Bullet over a selection reaching into row 1 turned that row into prose, orphaned its marker, and renamed `[^2]` onto it.[^9]

**Fix | Literal**

After `held` is built in `normalizeCitations`, add the numeric labels of unbound markers: `for (const m of c.markers) if (m.ordinal === null && numericLabel(m.label)) held.add(m.label)`. This encodes the position the code already takes for word-labeled loose rows: an unbound marker keeps its number. Verified by the reviewer: both reproductions come out unmerged, an ordinary reorder still renumbers, and the MarkdownPM suite passes. Add the two reproductions to `citationEdits.test.ts`. Pages already merged by this stay as written.

##### MD-010 · The footnote renumber runs before the guards, so it renumbers the unrepaired edit and leaves footnotes merged or misnumbered after a guard moves text.

> **Area:** Citations, Guards · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** 0 · **Origin:** Defect

**Finding**

Renumbering describes the document the person ends up with, but at the pin it reads the edit before the guards repair it. A multi-paragraph paste into a footnote row is the trigger: the raw paste breaks the row, the renumber reacts to that, the guard then moves the pasted text into the body and restores the row, and the renumber's rewrite stays. CodeMirror runs transaction filters last-to-first, and `citationOrder` is listed after the guards in the page's extension list, so it runs first and its changes compose into what the guards then see. The reviewer reproduced it: pasting `"\nfoo\n\nbar"` at the end of `[^1]: one` gave `Body a[^1] b[^1]` with two `[^1]` rows; with MD-009 alone the merge is gone, and with a word-labeled first row MD-009 alone still misnumbers the second marker, so the two causes are independent.[^10]

**Fix | Literal**

Move `citationOrder` to the top of the page's extension list, first after `editorHost.of`, so it runs after every default-precedence filter, including `listRenumber` and the table guards. The reviewer tested both seats (above `embedGuard` and top-of-list); each gives correct results for all four reproductions with MD-009 and passes the full suite. Add the paste reproductions to `citationCreate.test.tsx` or `citationGuard.test.ts`. MD-016 rewrites the same list, so this lands inside it or before it.

##### MD-011 · The editor learns whether footnotes are shown three ways: the host, a second facet restating the host, and a callback into folding.

> **Area:** Citations, Root · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −12 · **Origin:** Duplication

**Finding**

Whether footnotes are visible comes from the host, then from a second channel built only to restate the host's answer, then from a third callback for the divider; any one can go stale against the others. `citationHost` is a facet filled from a render-time copy of `host.citations.shown()` plus a `reveal` that calls `host.citations.set(true)`, read in three places in `citationActions.ts`; `markdownFolding(onCitationsToggle)` takes a toggle callback over the same host member, though `folding.ts` already imports `editorHost`. The facet answers a render-time copy and the host the live store, which differ by one render beat, and `editAcrossCitations` wants the live one.[^11]

**Fix | Literal**

Delete the facet and the callback parameter; readers use `view.state.facet(editorHost).citations`.

##### MD-012 · The footnote marker menu's Edit puts the caret inside a hidden citations section without revealing it.

> **Area:** Citations · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** −2 · **Origin:** Defect

**Finding**

Right-clicking a footnote marker and choosing Edit while footnotes are hidden puts the caret into the hidden section without opening it, so typing goes into text that can't be seen. The other two ways of reaching a footnote reveal first: `cite:edit` calls `focusRange` alone, while `travelToCitation` and `writeCitation` run the reveal before the travel.[^12]

**Fix | Literal**

`cite:edit` runs `writeCitation`'s reveal, seat, and travel tail, shared.

##### MD-013 · The shared guard shell carries the table's self-edit annotation, but neither guard that uses it ever repairs a table edit.

> **Area:** Guards · **Lens:** Residue · **Weight:** Low · **Size:** S · **Net:** −3 · **Origin:** Residue

**Finding**

`verdictFilter` copies `tableSelfEdit` onto any transaction it repairs. Its only users are `calloutGuard` and `citationGuard`. A cell commit replaces text inside one non-blank table row; tables are refused under `>`, so a commit never touches a callout prefix, and a table row inside the footnotes run reads as a continuation, so it never leaves the run unreadable. Either way the verdict is `ok` and the carry never fires. It dates from `headingRenameGuard`, which `2dbb0ba2e` deleted.[^13]

**Fix | Literal**

Delete the two lines and the import.

##### MD-014 · The footnote guard builds the whole post-edit document string on every keystroke inside the footnotes section.

> **Area:** Guards · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +1 · **Origin:** Performance

**Finding**

Each keystroke in a footnote's text builds a copy of the entire document (`doc.slice(0, from) + inserted + doc.slice(to)`) to test whether the run below still holds, though `tailHolds` reads only the tail from the kept head down.[^14]

**Fix | Literal**

Build only the tail: `doc.slice(keptAt, from) + inserted + doc.slice(to)` when `keptAt < from`, otherwise `doc.slice(keptAt)`, and read the line-start check from the character before.

##### MD-015 · The heading-rename link rewrite re-spells `mirrorBody`'s dispatch.

> **Area:** Guards, Root · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −3 · **Origin:** Duplication

**Finding**

Two places hand-write the same "apply a whole new body as a minimal diff, outside undo, past the guards" dispatch: `mirrorBody` in `api.ts` and `headingRenameSettle`'s rewrite. The only difference is that the rename write must echo through `onChange`, so it omits `mirrored`. Editor-Internals reserves `mirrorBody` for landings, and a rename isn't one, so the shared helper takes an `echo` flag rather than the rename calling the landing seam unqualified.[^15]

**Fix | Literal**

`mirrorBody(view, body, echo = false)`, and the settle calls it with `echo` set. MD-002 then takes the same helper for the cell.

#### W3 · The Editor Assembly

`MarkdownEditor.tsx` wires the page's extensions by hand while cells and Text values compose `editorBase` from `surface.ts`. Landing this leaves one recipe for "an editor with the `[[` picker", one Backspace, and one nudge effect, and removes a prop nothing passes. MD-048 (the connections facet) builds on the assembly this creates.

##### MD-016 · The page editor rebuilds by hand what `editorBase` assembles for cells and Text values, and the two copies have drifted.

> **Area:** Root, Input · **Lens:** Duplication · **Weight:** Medium · **Size:** M · **Net:** −10 · **Origin:** Parallel Build

**Finding**

There are two recipes for an editor with the `[[` picker: the page's and everyone else's, and they already disagree. With the picker open, Tab picks the row in a table cell or Text value; on a page it indents the line or does nothing and never picks, because `markdownInput`'s `nest` claims Tab unconditionally. Any future cross-surface piece has to be added twice. `MarkdownEditor.tsx` re-spells `editorHost.of`, the pane keys and Enter pick, `formatExt`, `editorKeymap`, the blur close, and the `detectConnectionQuery` listener that `editorBase` packages; only `editorBase` binds Tab. Backspace's marker and pair handling is composed twice as well, and the page copy dispatches through `applyEdit` whose default user event is `'input'`, while `editorBase` passes `'delete'`: on a page, a Backspace that removes a list marker or an empty pair joins the surrounding typing in undo, where plain Backspace and the same key in a cell record a delete. The two `redrawNudge` effects at the top of `MarkdownEditor.tsx` do one job.[^16]

**Fix | Proposed**

`MarkdownEditor` composes `editorBase({ scope: 'page', paneCtls: [acCtl, block.ctl], allowEmbeds: true, armed, readOnlyGate })` and appends only page-only extensions. `editorBase` keeps one scope-taking `smartDelete` command whose page arm runs `markdownInput`'s tile and footnote prelude first; Enter moves into `paneKeys`, since all three surfaces bind the identical `whenPaneOpen(…pick)`; the two nudge effects become one. `TextPane.test.tsx:124` pins the base side; a page-side Tab test is added whichever way *§Decisions* 3 settles it. The one reader of `typedLine`, `closeBlockOnEnter`'s `typed` flag, already resets on plain Backspace, so the fold makes smart Backspace behave as plain Backspace does.

##### MD-017 · The page editor still accepts a "replace the text in place" input that nothing passes.

> **Area:** Root · **Lens:** Dead Code · **Weight:** Low · **Size:** S · **Net:** −6 · **Origin:** Dead Code

**Finding**

`MarkdownEditor`'s `body` prop and its `mirrorBody` effect have no caller: none of the four mounts (`PageView`, `PageTile`, `MarkdownTile`, `PageHistoryWindow`) or the harness sets it, and outside text now arrives through the body layer's `follow` → `mirrorBody`. The `MarkdownTile` test's mock still carries a `body?` field and a `p.body ?? own` for it.[^17]

**Fix | Literal**

Delete the prop, its destructure, the effect, and the mock field.

#### W4 · Links And The Picker

The link layer runs two parallel pointer handlers in the body where the resting cell runs one, reads the link grammar off bare line text in five gestures, and spells link syntax by hand in the picker. These land after the peer commits `d0dd9e52d` and `70fc6063c` are re-anchored, since every finding here cites `Links/` or `Autocomplete/`.

##### MD-018 · Link gestures ignore code, so pressing, Enter, typing `]`, or leaving an alias slot inside a code sample edits the code, and an alias typed there is written into another page's frontmatter.

> **Area:** Links · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** +5 · **Origin:** Defect

**Finding**

Link-shaped text inside a fenced code block behaves like a live link. Pressing inside `[[Alpha]]` in a fence jumps the caret to the link's edge; Enter inside a fenced `[[Alpha|al]]` moves the caret instead of breaking the line; typing `]` there is swallowed; leaving an empty `[[Page|]]` or `[[Page#]]` slot deletes the `|` or `#` from the code (inline code too); and typing an alias into a fenced `[[Alpha|]]` records it as one of Alpha's aliases, which production writes into Alpha.md through `wear` → `setPageMeta`. These paths read the link grammar off the bare line text: `linkTokenAt(line.text)` re-tokenizes the line alone and loses fence context, and the slot paths call `aliasSpanAt` and `linkAt` with no code check, while the rest of the editor asks `inCodeAt(scan, …)`. All five were reproduced.[^18]

**Fix | Proposed**

Refuse when `inCodeAt(docScan(state.doc), pos)` in `slotNear`, `commitAliasOnEnter`, and the link hit-test, and pass the scan `markdownInput` holds into `refusedInAlias` (which MD-039 moves to `inAliasAt` in Connections). Once MD-019 lands, its single hit-test takes the code answer once. Aliases already written stay.

##### MD-019 · The body runs two parallel link pointer handlers and two parallel action appliers where the resting cell does both in one, and every press parses the line four times uncached.

> **Area:** Links, Gestures · **Lens:** Duplication · **Weight:** Low · **Size:** M · **Net:** −10 · **Origin:** Parallel Build

**Finding**

Clicking, hovering, and right-clicking a link in the body go through two near-identical handlers, one for `[[…]]` and one for `[label](target)`, each doing its own coordinate lookup and line parse; a resting table cell already handles both kinds with one `menuTarget`. Every press anywhere in text pays both handlers on mousedown and again on click through `pointerPath`'s ungated `hitAt`, and `linkTokenAt` runs `scanDoc` plus a micromark parse of the line with no memo, where `cellStatic.tsx` reads a `perText(tokenize, 4096)`. The two appliers share a span prelude that `linkFormat.ts` itself calls "the parallel".[^19]

**Fix | Proposed**

One `linkPointer(getApi)` hit-testing with `linkTokenAt(text, rel)` and `tokenTarget`, which already dispatches on `tk.kind`, keeping the `§`-run DOM fallback and building its menu like `cellStatic.menuTarget`; one shared span prelude for both appliers; `linkTokenAt` reads a `perText(tokenize)`. This drops one of the four `pointerHandlers` instances. The `connectionClicks`, `mdLinkTarget`, and `externalLink` suites keep their assertions. MD-018's code check and MD-023's `heldTarget` land on this one hit-test.

##### MD-020 · The `[[` picker writes connection syntax by hand, so retargeting `[[Foo|Bar]]` to page Bar writes `[[Bar|Bar]]`.

> **Area:** Autocomplete · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −2 · **Origin:** Duplication

**Finding**

Choosing a different page in the picker for a link that already has a label can write a label equal to the page name, because `formSyntax` spells `[[value|alias]]` itself instead of calling `connectionText`, which drops an alias equal to the title; the hook also reads the worn alias through a raw `pageLinkPattern()` match. The reviewer's second half (the link-destination walk existing twice) was closed by `d0dd9e52d` and `70fc6063c`, after which `linkDestinationAt` is gone and its callers read `linkDestinationStart`; the two sites named here stand at `70fc6063c` (`formSyntax` in `autocomplete.ts`, the alias read in `useConnectionAutocomplete.ts`).[^20]

**Fix | Literal**

`formSyntax` uses `connectionText(value, alias)`, and the alias read goes through Connections' own reader.

##### MD-021 · A markdown link's destination span is computed in two places.

> **Area:** Engine, Links · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −2 · **Origin:** Duplication

**Finding**

Where a markdown link's address starts and ends is calculated twice with the same arithmetic: `linkTarget` in `Engine/tokens.ts` and `linkHalves().address` in `Links/linkFormat.ts` both compute `[close[0] + 2, close[1] - 1]`.[^21]

**Fix | Literal**

Move `linkHalves` into `tokens.ts`, since the Engine can't import `Links/`, and have `linkTarget` slice its `address`.

##### MD-022 · How a link looks is decided twice, once in the decoration pass and once in the resting cell.

> **Area:** Root, Tables · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −3 · **Origin:** Duplication

**Finding**

The mapping from a link's target (resolved page, website, broken) to its classes is written separately in `decorations.ts` and `cellStatic.tsx`, for markdown links and for wikilinks. The differences between the two renderers (`md-unresolved-fixed`, revealed syntax) are deliberate; the shared target-to-class mapping isn't one function.[^22]

**Fix | Literal**

One pure `linkLook(target)` both renderers read.

##### MD-023 · In a Text value's live pane, a bare `[[#Heading]]` opens its holding page on click but does nothing on hover or right-click, while the resting value does all three.

> **Area:** Links · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Defect

**Finding**

In a Text property's editing pane, a same-page heading link like `[[#Setup]]` opens the page when clicked but shows no preview on hover and no menu on right-click; the same value at rest does all three. Only the click path applies `heldTarget`; hover passes the raw `self` target, for which `dwellTarget` returns null, and the menu requires `page`. `markdownLinkClicks` has the same gap. The resting `TextCell` applies `heldTarget` for all three. `d0dd9e52d` left this untouched.[^23]

**Fix | Literal**

Apply `heldTarget(target, ownPage(view))` once where the hit's target is built, which after MD-019 is the single hit-test.

##### MD-024 · Paste As writes link syntax inside code, where a plain paste lands literal text.

> **Area:** Links · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +1 · **Origin:** Defect

**Finding**

Pasting a web address inside a code block leaves it as plain text, as MarkdownPM.md states; choosing Paste As does not, and writes link syntax into the code. `linkFor` refuses through `insideCodeAtCaret`; `pasteAs` checks only `destinationGuard`.[^24]

**Fix | Literal**

`pasteAs` treats `insideCodeAtCaret` like `destinationGuard`.

##### MD-025 · With the caret resting in a finished link, every arrow press forces a layout read and re-renders the editor, though the picker stays closed.

> **Area:** Autocomplete · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +3 · **Origin:** Performance

**Finding**

The `[[` picker re-measures the caret's screen position and re-renders the editor on every arrow press inside an existing link, then decides not to open. `detectConnectionQuery` calls `caretGeometry` (`coordsAtPos` plus `getBoundingClientRect`) and `setAc` with a fresh object whenever `autocompleteQuery` matches, which it does for any finished title, heading, or alias span, and an exact match then closes the pane. The block pane measures only when its field changes.[^25]

**Fix | Literal**

Skip `setAc` when `{ form, from, to, query }` is unchanged, and measure through `requestMeasure`.

##### MD-026 · The `[[Page#` heading list reads another page's body from the main pane's 120 ms-late copy, and on a miss its disk fetch overwrites the session's newer body.

> **Area:** Host Seam · **Lens:** Drift · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Drift

**Finding**

Typing `[[B#` lists B's headings from the copy of B the main tab keeps, which lags typing by 120 ms and doesn't exist for a page open only in a window, tile, or glance. In those cases the host re-reads B from disk, which misses typing still waiting to save, and the fetched detail then replaces the newer text the session holds for B through `cachePageDetail` → `seat`; `pageDetailCache.ts` states that the known body must never lag a pending write. The downstream effect on a remounting tile is rated Likely.[^26]

**Fix | Literal**

`warmBody: (page) => knownBody(page.path) ?? null`. A `bodyHead(...)?.text` prefix adds nothing, since `knownBody` is written through on the same save beat.

#### W5 · Subfield Figures

The footer's word and character counts are a second reading of what the editor draws, run from a string, with a cache that falls off a cliff past 8,000 lines. MD-027 is the High and carries the recount; MD-028 bounds the selection figures to the selection.

##### MD-027 · Past about 8,000 lines, the footer's word and character figures re-tokenize the whole page on every typing pause and every selection change, freezing the editor for 0.4 to 1.3 s, and the figures already disagree with what the editor draws.

> **Area:** Engine, Root · **Lens:** Hot Path · **Weight:** High · **Size:** M · **Net:** ≈ 0 (+5 cache, −5 recount) · **Origin:** Parallel Build

**Finding**

On a long page, each pause in typing and each change of selection freezes the editor. The stats cache remembers the last 8,192 chunks it tokenized and forgets the oldest first, without refreshing on a hit (`perText` returns a hit without touching order, and `capSet` evicts the oldest insert). A document walked top-to-bottom with more chunks than that misses every one, so a one-character edit re-tokenizes everything; `subfieldStats` keys per line once a run reaches `CHUNK_LINES = 40`, so the unit is lines. The reviewer's re-run measured `pageStats` after a one-character edit at 3.0 ms for 4,000 lines, 5.7 ms at 8,000, 376 to 404 ms at 10,000, and 755 to 807 ms at 20,000. The triggers are the page settle (`subfieldItems`, `CitationsToggle` → `pageStats(page.body)`) and the selection listener's synchronous `rangeStats`.

Beneath the cliff, the figures are a second reading of what the editor draws: `subfieldStats` keeps its own chrome reader (`proseStart`) and hidden-token table (`hiddenOf`), where the editor's hide set comes from the line intents and `tokenIntents`, and `pageStats` runs `scanDoc(body)` from scratch on every settled body string (the 120 ms debounce exists because of that) while the editor holds the stepped scan of the same text. The two readings already disagree: `- [] hello`, which the editor draws as plain text, counts 5 characters instead of 10, and in a paragraph of 40 or more lines a `*…*` spanning two lines has its markers counted as text.[^27]

**Fix | Proposed**

Two parts in one rework. The cache becomes a "keep exactly what the last pass read" map per stats caller (the `drawnLast` shape in `docCache.ts`), so memory tracks the document and an edit re-tokenizes only what changed; an LRU refresh alone doesn't fix it, since a sequential walk longer than the cap thrashes LRU the same way. The counts then come from the editor's own derivations (the hides, prefixes, and widgets in the line intents plus `tokenIntents` over the chunk tokens), which deletes `proseStart`, `hiddenOf`, and `CHUNK_LINES`; the page figures read the open editor's held `docScan` and `docLineIntentsOf`, as `rangeStats` already does in `MarkdownEditor.tsx`, with `scanDoc(body)` kept only for a page with no editor mounted. *§Decisions* 2 settles the ownership of the live page figures.

##### MD-028 · Selection figures re-walk every table in the document on each selection change, whatever the selection covers, and are recomputed synchronously per pointer move.

> **Area:** Engine, Root · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Performance

**Finding**

While a selection is dragged on a page with tables, every pointer step walks and renders every table row in the document: `rangeStats` calls `tableProse(scan)`, which loops over all of `scan.tables`, and the caller runs on every selection change that moves the range, then sets a fresh object through the chrome slice. The prose side, `proseRuns`, is already bounded to the range. Below MD-027's cliff this is sub-millisecond (0.35 ms with 50 tables).[^28]

**Fix | Literal**

Limit `tableProse` to tables meeting `[first, last]`, and coalesce `onSelection` to one per frame. If MD-027 rewrites the pass, this goes with it.

#### W6 · Engine Derivations

The Engine steps every derivation from the version before, and these findings are where it doesn't: a heading walk run twice, a list-marker walk run per keystroke, a rail state that is never reset, and two shapes that let a new field or kind fall through silently.

##### MD-029 · The one heading scan that Editor-Internals describes runs twice per document version.

> **Area:** Engine · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Drift

**Finding**

Every keystroke walks the document's headings twice: once for the folds (`headingSections`, cached per scan) and once for the outline (`headingOutlineOf`, cached per doc through `docOutline`). Both call `scanHeadings` from nothing, and both are read every version, by the fold regions and by the decoration build's `docHeadingKeys`. Editor-Internals says the fold and the outline "read one fence-aware heading scan" per version. The reviewer measured 0.085 ms per walk at 20,000 lines; the fold chevrons also rebuild a whole-document decoration set per keystroke, which is a separate call.[^29]

**Fix | Literal**

Memoize `scanHeadings` per `DocScan` with the existing `sectionCache` WeakMap pattern, and derive both from it.

##### MD-030 · The drag handles beside each block re-read every line's list marker on every keystroke.

> **Area:** Engine, Menus · **Lens:** Hot Path · **Weight:** Medium · **Size:** S · **Net:** +3 · **Origin:** Shortcut

**Finding**

The grab handles drawn beside each paragraph, list, and code block are recomputed on every keystroke, and each recompute parses every line of the page for a list marker, though the scan already re-reads only the lines around the edit. The Codebase Audit records this as F-339, which this finding supersedes; it is still true at the pin. `blockContext` runs `lines.map(parseListMarkerPrefixed)` memoized per `DocScan`, and every keystroke makes a new scan, so the cache never hits on the typing path; `blockHandles` reaches it through `EditorView.decorations.compute(['doc'], …)`. On a 14,500-line page it measured 2.68 ms per keystroke, more than `rescan` and `stepLineIntents` combined; on a 20,000-line mixed page, `blockStarts` on a fresh scan took 4.36 ms, of which the marker walk was 4.03 ms.[^30]

**Fix | Proposed**

Add `markers: (ListMarker | null)[]` to the line scan: `scanLines` computes it over its window, `splice` carries it with `perLine` since marker offsets are line-relative, and `blockContext` reads `scan.markers` in place of `markerOf`. The existing `rescan ≡ scanDoc` property covers the new field.

##### MD-031 · Outliner rails draw guide stubs for list ancestors that sit above an unrelated heading or paragraph.

> **Area:** Engine · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +3 · **Origin:** Defect

**Finding**

An indented item placed after a heading or paragraph draws hairline rails as though it were nested under a list that ended above. `railIntents` writes `railKind` only on list lines and never resets it on a non-list line, so the next indented item inherits the old ancestors' kinds, and the kind also sets the rail's position. Probed: `- a`, `\t- b`, a heading, then `\t\t- c` gives two bullet rails at levels 0 and 1 on the last line.[^31]

**Fix | Proposed**

Reset `railKind.length = 0` on a non-blank line that is neither a list item nor an indented continuation. Blank lines and continuations still carry it, which loose lists need; that takes one per-line flag beside `listLevels`, also read by `cellStatic.tsx`.

##### MD-032 · `ListMarker` is a kind tag plus a bag of optional fields, so readers re-guard combinations the parser never produces.

> **Area:** Engine · **Lens:** Growth Constraint · **Weight:** Low · **Size:** S · **Net:** +3 · **Origin:** Growth Constraint

**Finding**

Code that reads a list marker keeps checking for missing fields the parser always fills: `parseListMarker` always sets `box` and `checked` for `checkbox`, `ordinal` for the sequenced kinds, and `bullet` for `bullet` and `arrow`, and five readers guard anyway (`lm.ordinal ?? 'A'`, `bullet?.length ?? 1`, `lm.checked ?? false`, `marker.ordinal ?? ''`, `lm.bullet ?? '-'`), against the rule that finite states are unions.[^32]

**Fix | Proposed**

A discriminated union by kind, with `box?` kept on `bullet` and the sequenced kinds because `- []` and `1. [ ]` parse with a box; the guards drop.

##### MD-033 · `shiftToken` lists every optional `Token` field by hand, so a new field is dropped from every chunk token unless someone remembers to add it.

> **Area:** Engine · **Lens:** Growth Constraint · **Weight:** Low · **Size:** S · **Net:** −2 · **Origin:** Growth Constraint

**Finding**

Moving a token copies each of its fields by name, so a field added to tokens later goes missing from every token the editor draws; `color` and `inHtml` were each threaded through by hand.[^33]

**Fix | Literal**

`{ ...tk, range: move(tk.range), contentRange: move(tk.contentRange), markerRanges: tk.markerRanges.map(move), …the two optional ranges }`.

##### MD-034 · A new block or tile kind falls through to silent defaults in the grip menu and block starts.

> **Area:** Engine, Menus · **Lens:** Growth Constraint · **Weight:** Low · **Size:** S · **Net:** +3 · **Origin:** Growth Constraint

**Finding**

Adding a new kind of block (images are planned) would get the plain grip menu and default behavior in four places with nothing flagging the miss: `contextFor`'s `default`, the `GRIP_KINDS` plain `Set`, `blockStarts`' `default`, and a `startsWith` action chain in `gripMenu.ts` that drops an unhandled action.[^34]

**Fix | Proposed**

`contextFor` switches over every `BlockKind` with the plain kinds listed; `GRIP_KINDS` becomes a `Record<BlockKind, boolean>`; the grip action becomes a union switch.

#### W7 · Decorations, Embeds, And Folding

Per-caret-move and per-build costs in the draw path, and one CSS rule the internals guide forbids.

##### MD-035 · A callout's last line carries a CSS line margin, which Editor-Internals rules out for box constructs, and doubles the gap below the box.

> **Area:** Root · **Lens:** Residue · **Weight:** Medium · **Size:** S · **Net:** −3 · **Origin:** Residue

**Finding**

Callouts get extra space below them from a rule the internals guide forbids, because a CM6 line margin throws off where clicks and the caret land. `.cm-line.md-callout-last` carries `margin-bottom: var(--callout-gap)` beside the sanctioned `padding-bottom: calc(var(--callout-gap) + var(--callout-inner-pad))` and the `::before { bottom: var(--callout-gap) }` that already provide the gap, so the gap below a callout is double the gap above; quote and code carry no margin. The height-model effect and the visual change are rated Likely.[^35]

**Fix | Literal**

Delete the three-line rule and check the gap below a callout visually.

##### MD-036 · The embed atomic set is rebuilt from scratch on every cursor query.

> **Area:** Embeds · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Performance

**Finding**

The "skip over the embedded tile" ranges are rebuilt every time the caret moves instead of once per edit as the guide requires: `embedAtomic` allocates a fresh `RangeSet` and a fresh `Decoration.mark({})` per tile per call.[^36]

**Fix | Literal**

One module-level mark and a set memoized on the `ranges` array identity.

##### MD-037 · The code tag's copy reveal re-measures every visible code tag on each caret move while the pointer is over the editor.

> **Area:** Menus · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** −1 · **Origin:** Performance

**Finding**

While the pointer is over the editor, every caret move re-measures every visible code block's language tag through `getBoundingClientRect`, though moving the caret doesn't move them: `TagReveal` invalidates on `selectionSet` and `focusChanged` among its triggers. That selection never moves a tag without `geometryChanged` is rated Likely.[^37]

**Fix | Literal**

Drop `selectionSet` and `focusChanged` from the invalidation.

##### MD-038 · The `↔` pass searches to the end of the document on every decoration build.

> **Area:** Root · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +1 · **Origin:** Performance

**Finding**

Highlighting `↔` arrows searches from the visible area to the end of the document on every redraw: `text.indexOf('↔', from)` over the whole `scan.text`, stopping only at a hit at or past `to`, per visible range per caret move.[^38]

**Fix | Literal**

Search the visible slice and offset the hits.

#### W8 · Residue And Small Duplications

Each of these removes lines without changing what a person sees. They are independent of one another, and MD-039's alias fold is a prerequisite of MD-018.

##### MD-039 · Five small jobs are each spelled twice beside an existing helper.

> **Area:** Engine, Tables, Input, Guards · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −10 · **Origin:** Duplication

**Finding**

The pipe-row serializer in `Tables/sync.ts` repeats `pipeRow` in the codec. The callout head prefix in `detect.ts` re-runs `quotePrefix` and `calloutTagRe` for the head's `prefixEnd`, which `calloutHeadPrefixLen` returns. The "inside an alias" check is spelled in both `Guards/aliasGuard.ts` and `Input/edits.ts`, each slicing the line and calling `aliasSpanAt`. `cellStatic.tsx` hand-walks a line offset (`at += lines[k].length + 1`) where `lineOffsetsOf` is imported and used in the same file. `stripBlockMarkers` in `format.ts` repeats `stripInnerMarkers`, adding `stripQuotePrefix` when no list marker is present.[^39]

**Fix | Literal**

`sync.ts` calls `pipeRow` (±0); `detect.ts` reads `calloutHeadPrefixLen` (−2); one `inAliasAt(doc, at)` beside `aliasSpanAt` in `Connections/connections.ts`, which deletes `aliasGuard.ts` and its single caller's import (−4); `cellStatic.tsx` reads `lineOffsetsOf` (−2); `stripBlockMarkers` composes `stripInnerMarkers` (−2).

##### MD-040 · Small residue: an unused type, a test-only field, a harness-only optional, and one snippet copied in two components.

> **Area:** Autocomplete, Actions, Root, Pages · **Lens:** Dead Code · **Weight:** Low · **Size:** S · **Net:** −6 · **Origin:** Residue

**Finding**

`AcQuery` in `autocomplete.ts` is defined and read nowhere, repo-wide. `BlockMenuMatch.at` in `Core/Actions/blockMenu.ts` is read only by its tests (`BlockMenuPane` reads `row.at`). `EditorHost.paneGeometry?` is optional though the one production builder supplies it and only the harness omits it. `PageView.tsx` and `PageTile.tsx` both spell `mutate({ op: 'renameHeading', path, heading, to })`.[^40]

**Fix | Literal**

Delete `AcQuery` and the section `at` (its tests assert rows only); make `paneGeometry` required with a harness stub; hoist the rename glue to one helper.

##### MD-041 · Three pieces of production code exist only for tests to reach.

> **Area:** Engine, Connections, Root · **Lens:** Dead Code · **Weight:** Low · **Size:** S · **Net:** −6 · **Origin:** Dead Code

**Finding**

The test audit found three leftovers no other pass reached. `SubBlock.level` in `Engine/listDragModel.ts` is set by `subBlockAt` and read by one test (`regressionPins.test.ts:215`), while every production consumer (`Gestures/listDrag.ts`, `editorGesture.ts`) reads only `from` and `to`; the test is itself a re-pin that MD-043 deletes. `composeWebpageEmbedLine`'s `label` parameter in `Core/Connections/links.ts` is passed `''` by its one production caller (`pasteAsMenu.ts`) and exercised only by two `detect.test.ts` cases MD-043 deletes. `EditorView.editable.of(true)` in `MarkdownEditor.tsx` restates CodeMirror's default.[^41]

**Fix | Literal**

Drop the `SubBlock` interface and return `BlockRange`, re-pointing `listDrag.ts`; drop the `label` parameter and its `escapeAlias` call (`escapeAlias` keeps its other readers); delete the `editable` line.

#### W9 · Documentation

`MarkdownPM.md` states eight things the code doesn't do. These land last, after the code they describe has settled; the Editor-Internals addition for a fourth CommonMark divergence rides MD-052 if that lands.

##### MD-042 · `MarkdownPM.md` disagrees with the code in eight places.

> **Area:** Docs · **Lens:** Doc Drift · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Doc Drift

**Finding**

Line 24 says a nested run "counts from its first number or letter"; the code restarts every nested run at 1 or A, and `listRenumber.test.ts` pins that. Line 8 calls `Guards/` "the transaction filters", though `headingRenameSettle.ts` is a ViewPlugin that rewrites links (and `aliasGuard.ts`, a predicate, leaves with MD-039); the same line places "the editor's own menu models" in `Menus/` when the grip and block models live in `Core/Actions`, and says `MarkdownEditor.tsx` wires the editor when cells and Text values run `surface.ts`'s `editorBase`. Line 77 says a citation's number "leads back to its first marker"; with no marker it copies `[^label]`. Line 171 says "fifteen languages carry a mark"; `CODE_TAGS` holds eleven. Line 70 says there are "four ways to create" a page embed; the `/` menu's Embed ▸ Internal Page is a fifth. Line 87's Plain row lists "(paragraph, quote, callout, code)"; `hr` and `math` also get grips.[^42]

**Fix | Proposed**

Surgical edits to each sentence: a nested run counts from 1 or A; `Guards/` holds the guards and the rename settle; `Menus/` holds the pane controls, with the menu models in `Core/Actions`; the shared assembly is `editorBase`; eleven languages; five ways; the Plain row adds rules and math. The citation-number sentence either documents the copy or MD-012's neighbor makes the unbound number inert (−1); documenting it is the cosmetic answer and folds.

#### W10 · Tests

The 92 test files hold 1,696 tests on 15,436 lines. The test audit found about 140 that pin nothing a sibling doesn't, assert a vacuous shape, or exercise a state production never produces, plus 228 lines of setup a shared builder already installs. The four findings below group the dispositions; the exact `file:line → disposition` list is *§Appendix: Test Dispositions*, copied from the consolidated audit. The four findings' nets are gross figures that include about 61 lines outside `Core/MarkdownPM/` and the merged lines that return, so they sum higher than the Line Balance's in-folder net. Deleting `regressionPins.test.ts:212` and `detect.test.ts:420-431` is what lets MD-041's production lines go, so this workstream isn't last.

##### MD-043 · 86 tests re-pin a sibling or a library and 16 duplicate a sibling except for one assertion.

> **Area:** Tests · **Lens:** Duplication · **Weight:** Low · **Size:** M · **Net:** 0 production (≈ −590 test lines) · **Origin:** Duplication

**Finding**

86 tests are re-pins: the same input and assertion as a named sibling, a library behavior (`parser.test.ts` checking that `gfm()` parses), or a by-construction check (the five "…and without the guard…" cases in `citationGuard.test.ts` run with no guard mounted). The largest holders are `regressionPins.test.ts` (66 lines), `cellLinks.test.tsx`, `blockMenuFlow.test.tsx`, `connectionCommit.test.tsx`, `citationGuard.test.ts`, and `intents.test.ts`. 16 more duplicate a sibling except for one assertion, which moves into the sibling. Every cited survivor is kept by its owning shard, so no deletion strands a pin.[^43]

**Fix | Literal**

Delete the 86 (about 500 lines plus one assertion line in `indexSeed.test.ts`) and merge the 16 (about 90 lines, roughly 10 single-line expects returning), as the appendix lists them.

##### MD-044 · 33 tests pass for the wrong reason and 8 pin the right thing in the wrong file.

> **Area:** Tests · **Lens:** Defect · **Weight:** Low · **Size:** M · **Net:** 0 production (≈ −20 test lines) · **Origin:** Defect

**Finding**

33 tests are too loose to fail on the regression they name: `not.toBeNull` where an exact edit is the pin (`edits.test.ts`), `toContain` on a document that also contains the corrupted form, a `some(...)` that survives a first/last swap (`intents.test.ts`), a mount without `connections` so a menu is null for every link (`externalLink.test.tsx`, `linkEdges.test.tsx`), and a uniform table where `avg` can't be told from a constant (`operations.test.ts`). 8 sound tests pin a function their file doesn't own: `cellLists.test.tsx`'s "what a GFM cell can hold" pins `restoreTrailingItem` and moves to `codec.test.ts`; `embedInsert.test.ts`'s pair hands off to `autocompleteQuery`; `citationCreate.test.tsx:387` and `indexSeed.test.ts:324` pin scan ordering and move to `Engine/citations.test.ts`.[^44]

**Fix | Literal**

Tighten the 33 to the exact expectations the appendix gives (about 265 lines touched), and move the 8 (46 lines, plus 6 sound `linkAt` lines carried with `aliasPicker:233-238`).

##### MD-045 · 228 lines of per-file setup install what the shared setup already installs.

> **Area:** Tests · **Lens:** Dead Code · **Weight:** Low · **Size:** S · **Net:** 0 production (≈ −230 test lines) · **Origin:** Residue

**Finding**

`UIX/vitest.setup.ts` installs a no-op `ResizeObserver` for every Core suite through `Core/vitest.setup.ts`. Nine table tests carry a guarded seven-line stub of the same, nineteen more files carry an unconditional six-line `ResizeObserverStub` class, and two carry guarded blocks; none runs. Four files set `IS_REACT_ACT_ENVIRONMENT = true` after `stubEditorBridge()` already has. `readOnlySelection.test.tsx` hand-rolls the 32 lines `mountEditor`, `cleanupEditor`, and `stubEditorBridge` provide. The callback-capturing stubs in `dragOrigin`, `cellSweep`, and `embedResize` stay.[^45]

**Fix | Literal**

Delete the stubs and the four flags, and rewrite `readOnlySelection.test.tsx` on `mountEditor`.

##### MD-046 · The test builders derive footnotes a second way, re-implement alias memory without its guards, and never generate a `~`-signed diff line.

> **Area:** Testing · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** 0 production (≈ −8 test-builder lines) · **Origin:** Duplication

**Finding**

`citationScan(d, excluded)` in `Core/Testing/markdownEngine.ts` rebuilds footnotes through `codeMask` and a caller-supplied exclusion list; all 17 callers pass `[]`, while production seals fences, maths, and tables through `inSealedLine`, so those tests check a rule the app never runs. The harness's `aliases.remember` and `forget` re-implement production's alias memory without its trim, empty, and same-first guards, and bump a counter instead of firing `aliasWatchers`, which forces `connectionCommit.test.tsx` to fire watchers by hand. The scan's randomized property generator in `Engine/docScan.test.ts` has no `~`-signed line in `LINES` and no `~` in `CHARS`, though the scan learned `~` (`'mod'`), against the rule that a construct the scan learns joins the generator's alphabet in the same change; the risk is small since diff kinds derive per whole fence.[^46]

**Fix | Literal**

Callers use `scanDoc(text).citations`, or `scanDoc(text)` where a scan is faked, and the helper is deleted; the harness calls `rememberAlias(list, alias) ?? list` and `forgetAlias(...) ?? list` and fires `aliasWatchers`; `'~changed'` joins `LINES`.

---

### Owner's Call

Each finding here is real and its fix is known, and each changes behavior, a persisted shape, or a file outside the editor, or has two forms that differ materially. *§Decisions* settles each; a finding whose only question was "take it or not" carries its ruling there.

#### W11 · Scope And Host Seams

What a SidePane editor, the mobile companion, or a fourth Properties scope meets first: a surface kind asked for as a string, a page index handed down by hand, a host described by eight flags, and one host menu member per construct. MD-048 builds on MD-016's shared assembly.

##### MD-047 · Scope is a three-member string read by 20 bare comparisons and 13 `= 'page'` defaults, so a fourth scope silently inherits page behavior in some places and cell behavior in others.

> **Area:** Engine, Input, Menus, Root · **Lens:** Growth Constraint · **Weight:** Medium · **Size:** M · **Net:** +8 to +15 · **Origin:** Growth Constraint

**Finding**

A page, a table cell, and a Text value read different amounts of Markdown, and the code asks "is this the page?" or "is this the cell?" in twenty places across nine files (`intents.ts` five times, `edits.ts` four, `blockHandles.ts` four, `decorations.ts` twice, and one each in `subfieldStats.ts`, `listDrag.ts`, `listRenumber.ts`, `markdownInput.ts`, `menu.ts`) instead of asking one question about what the surface reads. Thirteen parameters default to `'page'` (six in `edits.ts`, three in `intents.ts`, two in `blockHandles.ts`, one each in `decorations.ts` and the test builder), so a reader that forgets to pass its scope answers from the page-shaped scan. The only capability switches are `readsLists` and `blockGestures`. A new surface would be classified one site at a time, non-page at every `=== 'page'` and page at every `=== 'cell'`, silently.

Inside a cell today, the readers that forgot diverge: `lineBodyBefore` and `opensLine` strip a `> ` prefix the cell draws as prose, `listDrag` and `listRenumber` read the quote-prefixed list grammar, and `blockDrag` takes block starts from the page's vocabulary (the drop-boundary effects of the last two are rated Likely). Inside a fenced pair in a cell, the transforms and the cell's own tokenizer agree (both treat the paired lines as code), which departs from MarkdownPM.md's "fences stay literal text" rather than from each other. The three spellings of the union (`detect.ts`, the `z.enum` in `editorMenu.ts`, `docCache.ts`) are tied at compile time and can't drift silently.[^47]

**Fix | Proposed**

Name each vocabulary question as a switch predicate beside `readsLists` (`readsBlocks`, `gripKinds`, and a named predicate for the two cell-only behaviors: no gutter, seat past the marker); have the capability sites read them; remove the `= 'page'` defaults so a forgotten scope is a compile error; thread the scope into `blockPrefix`'s two helpers, `listDrag` and `listRenumber` (the unprefixed grammar outside `page`), and `blockDragExtension`; mount the diff-margin pieces of `caretSeat` only for the page; derive the zod enum from one `MARKDOWN_SCOPES` tuple. Test call sites in `edits`, `listRenumber`, and `listDrag` that relied on the defaults name their scope. *§Decisions* 1 settles the form (`Engine/surfaces.ts`) and 7 settles whether a cell reads fences.

##### MD-048 · Connections reach the editor through a getter threaded through 23 signatures beside the host facet that carries everything else.

> **Area:** Root, Host Seam · **Lens:** Growth Constraint · **Weight:** Medium · **Size:** M · **Net:** −10 · **Origin:** Parallel Build

**Finding**

Every host capability reaches the editor's pieces through one shared facet, except the page index, which is handed down by hand through about a dozen editor functions and built four ways: `() => ConnectionsApi | undefined` appears in 23 production signatures; the getter is built in `MarkdownEditor.tsx`, in TextPane, in `CellEditor.tsx`, and re-wrapped as `embedHost.getConn`; `buildEditorHost` keeps its own `connRef`, a change still needs a manual nudge, and `useEditorHost`'s memo lists `connections` though the builder never reads it. A new host supplies connections twice. Moving the `ConnectionsApi` and `ConnMenuTarget` types out of `Links/` counts for nothing on its own.[^48]

**Fix | Proposed**

Connections become an `EditorHost` member, or a facet set once in MD-016's shared assembly and read through `view.state.facet(...)`; the parameter drops out of every intermediate, `embedHost.getConn` goes, and the facet reconfigure replaces the manual nudge. Taken with MD-016 (*§Decisions* 10).

##### MD-049 · What kind of surface an editor sits in is spread over five uncoordinated switches, two sentinel ancestor strings, and a CSS list of host classes.

> **Area:** Host Seam, Interface, Session · **Lens:** Growth Constraint · **Weight:** Low · **Size:** M · **Net:** 0 to −5 · **Origin:** Growth Constraint

**Finding**

To mount the editor somewhere new, a host picks among `readOnly`, `active`, `locked`, `inert`, `pageSurface`, `preview`, a connections mode (`preview | window | inert`; the history window sets both "inerts"), and fake ancestor strings (`HISTORY_ANCESTOR`, `GLANCE_ANCESTORS`) that switch off nested embeds through `host.ancestors.length <= 1`, then adds itself to the placeholder selector in `markdown-pm.css`.[^49]

**Fix | Proposed**

One `surface` union on `EditorHostOptions`, switched once to derive the flags, the connections mode, and embed interactivity; the placeholder becomes an editor option. Most of the change lands in `Interface/` windows, the glance, and `Session/`. Taken (*§Decisions* 10).

##### MD-050 · The host carries one typed menu member per construct, so a new construct menu needs a new host member in three places.

> **Area:** Host Seam · **Lens:** Growth Constraint · **Weight:** Low · **Size:** S · **Net:** −4 · **Origin:** Growth Constraint

**Finding**

Every kind of menu the editor shows (grip, table, footnote) has its own entry on `EditorHost.menus`, each of which the host only pops: `api.ts` imports the table and citation menu models to type them, `editorHost.tsx` builds each model only to `popMenu` it, and the harness mirrors them.[^50]

**Fix | Proposed**

One `menus.pop<A>(items)` beside `format`, the editor building its own rows from the pure models. Moving the model files alone counts for nothing. Waits for the SidePane (*§Decisions* 10).

#### W12 · HTML Blocks

The raw-HTML pass has neither CommonMark's start and end conditions nor a rule for an opener nothing closes, and the scan doesn't seal HTML the way it seals fences, maths, and tables. The two findings land together: tightening the sealing without the opener rule would let a half-typed `<!--` seal everything below it.

##### MD-051 · A `#` line or a footnote run inside an HTML block still counts as a heading or as the footnotes section.

> **Area:** Engine · **Lens:** Defect · **Weight:** Low · **Size:** M · **Net:** +16 · **Origin:** Drift

**Finding**

The heading scan skips a `#` line inside a fence or a `$$` block but not one inside an HTML block, so `<div>` / `# x` / `</div>` still lists `x` in the Outline, the heading picker, the fold chevrons, and the index; the Codebase Audit records this as F-573, which this finding supersedes, and it is still true at the pin. The same root leaves footnote definitions inside a `<!--` … `-->` block numbered and drawn as the footnotes section, where CommonMark readers treat them as a hidden comment: `assembleCitations` excludes lines through `inSealedLine`, which seals fences, maths, and tables but not `html`, and the `-->` line reads as a lazy continuation so the run still reaches the end of the document. The block-shaped comment is reachable from the editor: with HTML Shortcuts on, ⌘/ runs CodeMirror's `toggleComment`, which wraps a multi-line selection in one `<!-- … -->`. `htmlBlocks` matches `HTML_OPEN` without CommonMark's seven start and end conditions, so it can't decide this as written: a line led by an inline tag or a one-line comment would swallow every heading beneath it.

MarkdownPM.md:28 says "Headings, lists, quotes, footnote markers, and embeds inside a block render either way", which describes the drawn half; it doesn't say the outline lists them. Whether they list follows the HTML Formatting toggle (*§Decisions* 5).[^51]

**Fix | Proposed**

`htmlBlocks` takes CommonMark's start and end conditions; the heading scan, the block model's heading kind, and the line intents' heading branch skip HTML-block lines, with `quietAt` moving with them (F-573's fix, +15); then `spanAt(scan.html, at)` joins `inSealedLine`, which seals headings and footnotes together (+1). Lands with MD-052.

##### MD-052 · A raw-HTML opener with no closer makes every keystroke below it re-scan to the end of the document and re-tokenize everything from the opener down.

> **Area:** Engine · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** +5 · **Origin:** Performance

**Finding**

A page with a stray `<!--`, `<pre>`, `<script>`, or `<?` near the top lags heavily when typing far below it: the investigator measured `tokenizeChunk` at about 115 ms per keystroke on a 4,500-line page, against 0.74 ms without the opener. `htmlBlocks` extends a raw opener to the last line when no closer arrives, `quietAt` refuses every line inside an HTML span so `rescan` widens to the end, and `chunksOver` opens the viewport chunk at the opener. The fence grammar already refuses an opener nothing closes (a documented divergence from CommonMark); the raw-HTML pass has no such rule. `<div>`-style blocks end at a blank line and are unaffected.[^52]

**Fix | Proposed**

A raw opener whose closer never arrives ends at the next blank line, as type-6 and type-7 blocks already do; `parser.ts` masks that opener the way it masks lone fence markers; the divergence joins Editor-Internals' list, and an unclosed `<pre>` or `<?php` case joins `docScan.test.ts`'s property run. A fourth intentional CommonMark divergence, taken (*§Decisions* 5).

#### W13 · Table Typing Cost

##### MD-053 · Typing in a table cell re-reads the whole table as Markdown on every keystroke, and the cost is four to six times what the Codebase Audit records.

> **Area:** Engine, Tables · **Lens:** Hot Path · **Weight:** Medium · **Size:** M · **Net:** +6 · **Origin:** Residue

**Finding**

Every character typed into a table cell makes the editor re-check the entire table by running the full Markdown parser over it. The Codebase Audit records this as F-170 at 4 ms for 200 rows and 69 ms for 1,000; this finding supersedes it, and the investigator's re-measurement with unique text per keystroke gives `rescan` at 27.8 ms for 200 rows and 256 ms for 1,000, with micromark alone at 12.7 and 134 ms. The scan re-reads only the lines around an edit, but a table row never counts as a quiet line, so `rescan` widens to the whole table and `isTable` confirms it with one parse of all its text, remembered by text through `perText` (its own comment: "a table being typed in mints one per keystroke"); `CellEditor` commits every `docChanged` into the page.[^53]

**Fix | Proposed**

Keep the two-line parse that confirms header plus delimiter, already cached per text, then extend the body line by line from per-line facts the scan holds (a blank line or a line that opens another block ends it), and delete the whole-block confirm and shrink loop. Pin it with a seeded property test against the whole-table parse, the way `rescan` is pinned against `scanDoc`. Taken (*§Decisions* 11).

#### W14 · Behavior Calls

Real defects and drift whose fixes change what a person sees, touch a per-machine or indexed shape, or land outside the editor. Each carries its options.

##### MD-054 · When a guard repairs a keystroke the caret is left behind, so text typed below the footnotes section breaks into one-character lines, and typing over a callout line's start replaces each character with the next.

> **Area:** Guards · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** +5 · **Origin:** Defect

**Finding**

On a blank line below the footnotes section, typing `ab cd` lands in the body as four separate lines, `a`, `b`, `c`, `d`. If a selection on a callout body line starts at the line's beginning and is typed over, every key replaces the character before it, so `xyz` leaves only `z`. Both come from one cause: `verdictFilter` rebuilds a repaired transaction from its changes, effects, scroll flag, and annotations, but not its selection, so CodeMirror maps the old selection through the new changes. A relocated character lands in the body while the caret stays below the footnotes, so the next key is relocated again as its own line; a clamped replace keeps the old anchor at the line start, so the new selection covers the hidden `> ` and the typed character. The footnotes case was reproduced through the full page stack; whether a selection's anchor can be seated at a callout line's start by hand is rated Likely. The comment at `citationGuard.ts:14` saying the head seat "stays reachable" is stale: the caret-seat filter moves any cursor off it, so that branch is reached only by inserts not typed at the caret.[^54]

**Fix | Proposed**

The `rewrite` verdict gets an optional caret; `verdictFilter` passes `selection` whenever `tr.selection` was set (a cursor at the verdict's caret for a rewrite, at the repaired change's end for a clamp or extend); `citationTailVerdict` sets the caret after the relocated text so the following keys join that line; the premise in the `citationGuard.ts` comment is corrected. `citationGuard.test.ts` and the callout guard tests gain selection expectations. The caret follows the relocated text (*§Decisions* 6).

##### MD-055 · A heading written with closing hashes (`# foo #`) keeps them in its name, so the outline, fold keys, index, and `[[Page#Heading]]` links read `foo #` where CommonMark reads `foo`.

> **Area:** Engine, Guards, Menus · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Defect

**Finding**

A heading like `# foo #` lists as "foo #", and a link written `[[Page#foo]]`, as any CommonMark or Obsidian reader would name it, doesn't resolve. `headingParts` captures the rest of the line as `content`, and every heading-name reader (`scanHeadings`, `headingRenameSettle`, `gripMenu`'s linkable check and copy link) takes `content.trim()`, while the micromark parse that confirms the heading strips the closing sequence. Probed: `headingOutline('# foo #\n\n## bar ##')` returns `["foo #", "bar ##"]`.[^55]

**Fix | Proposed**

One heading-name reader: a `text` field on `headingParts` with the closing sequence stripped (a `#` run preceded by a space, or a line of only `#`s), read by `scanHeadings`, `headingRenameSettle` (both its old and new names, so its compare against `docHeadingKeys` stays consistent), and `gripMenu`; `content` and `contentStart` stay raw for the editing callers, so drawing and rewriting keep the hashes. **Persisted shape:** nothing on disk is rewritten; per-machine fold keys saved through `prefs.save('folds', …)` change once for such headings, so their remembered folds open once; `nexus.db` heading rows regenerate; a link already written as `[[Page#foo #]]` stops resolving. Taken (*§Decisions* 12).

##### MD-056 · In a table cell or a Text value, an embed alone on its line draws as raw `![[…]]`, because the decoration pass works out its own copy of which embeds a tile has claimed instead of asking the tile field.

> **Area:** Root, Embeds · **Lens:** Defect · **Weight:** Medium · **Size:** S · **Net:** −3 · **Origin:** Duplication

**Finding**

A Text value or a cell holding a line like `![[Alpha]]` shows the raw brackets, while the same embed mid-line draws styled; the resting cell draws it styled, so the cell changes appearance when clicked into. Whether `![[Page]]` becomes a tile is decided by the tile field, and `build` in `decorations.ts` decides it again on its own through `claimedEmbeds` on every build (every caret move), in every scope, because the scan is page-shaped and `conn` exists in all three. Only the page mounts the tile field, so in a cell or Text value the token is suppressed and no tile is drawn. `buildTiles` also resolves each claimed title twice. Editor-Internals says the claim has one owner. Probed in `cell` and `text`: the lone line renders as `"![[Alpha]]"` and the mid-line embed as `<span class="md-embed">Alpha</span>`.[^56]

**Fix | Literal**

`build` filters by `embedTileRanges(view.state)` (page kind) instead of re-claiming, and `buildTiles` keeps the resolved page from the claim pass; `claimedEmbeds` keeps its one caller in `embedWidget.tsx`. There is no import cycle. Outside a page the embed token draws as a connection through `readsTiles` (*§Decisions* 4).

##### MD-057 · Three modules decide independently whether a copied link names a page or a web address, and Paste As writes phantom connections and drops a copied link's alias and heading.

> **Area:** Links, Actions, Connections · **Lens:** Defect · **Weight:** Medium · **Size:** M · **Net:** −8 · **Origin:** Duplication

**Finding**

Copy `[x](example.com)` from the body, where it draws and clicks as a website, then Paste As ▸ Connection: it writes `[[example.com]]`, a link to a page that doesn't exist. Copy `[[Notes|Alias]]` and Paste As ▸ Connection writes `[[Notes]]`, losing the alias; copy `[[Notes#Setup]]` and Paste As offers nothing. The Link property, reading the same text, keeps all three parts. `resolveMdTarget` (editor), `parsePastedLink` (Link property), and `pasteAsTarget` (Paste As) each classify a target their own way (`wholeWikiLink` refuses any heading; a markdown link with a title-shaped target becomes `page` with no resolver), and `PasteAsTarget` carries only a title. MarkdownPM.md:107 promises Connection, Markdown Link, and Embedded Page for "a copied connection or markdown link".[^57]

**Fix | Proposed**

One classifier in `Core/Connections` shaped like `parsePastedLink` (raw text plus an optional resolver → `{ kind: 'page', title, heading?, alias? } | { kind: 'url', url, alias? } | null`); `resolveMdTarget`, `parsePastedLink`, and `pasteAsTarget` derive from it, and `pasteAsWrite` passes heading and alias through `connectionText`. `pasteAsMenu.test.ts` and `linkValue.test.ts` pin it. The three classifier readings are *§Decisions* 8.

##### MD-058 · Format ▸ Page Title on a link in a resting table cell writes the bare domain and never swaps the page title in.

> **Area:** Tables, Links · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +3 to +5 · **Origin:** Defect

**Finding**

In a table cell that isn't being edited, right-click an address, pick Format ▸ Page Title, and the link becomes its domain; when the title arrives, nothing rewrites the cell. In the body the same action swaps the title in: `linkFormat` dispatches with `awaitTitle` and `pendingTitle` swaps pending ranges, while the resting cell's `linkActionText` → `onCommit` → `host.linkTitles.resolve` carries no `awaitTitle`. The menu offers Format because `connectionMenuActions` defaults `surface` to `'editor'`. Confirmed by trace, not driven.[^58]

**Fix | TBD**

The cell's link edit commits as one page-view transaction carrying `awaitTitle` at the cell's absolute offset (*§Decisions* 9).

##### MD-059 · Text that arrives from another mount or from disk at the end of a folded section shows up below the fold.

> **Area:** Root · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +3 · **Origin:** Defect

**Finding**

If the same page is open twice (a tab and a window) with a section folded in one, text added at the end of that section from the other copy appears below the folded section instead of inside it. The fold field maps its end backward (`mapPos(e.to, -1)`), so an insertion at exactly `e.to` stays outside, and a mirrored landing skips the drop-and-retake Editor-Internals prescribes (`editAcrossCitations` does it; `mirrorBody` doesn't). Confirmed by reading, not driven.[^59]

**Fix | Proposed**

For `mirrored` transactions, `foldField` re-takes each surviving entry's `to` from the live region it already reads through `regionsOf`. Taken (*§Decisions* 12).

##### MD-060 · The first Hide or Show Footnotes press on a page opened after the Nexus loaded snaps instead of animating.

> **Area:** Root · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +1 · **Origin:** Defect

**Finding**

On any page opened after the Nexus finished loading, the first time footnotes are hidden or shown the change snaps. The effect marks the first visibility change it carries as the startup seed (`followed`), but on the first commit the view doesn't exist yet, and `citationsShown` seeds once per Nexus, so for later pages the first change is the person's and `applyCitationsVisibility(..., false)` snaps; `foldState.test.tsx` pins only the seed case. The visual result is rated Likely.[^60]

**Fix | Proposed**

Decide "seed" by whether the per-page override has loaded, not by first change. Taken (*§Decisions* 12).

##### MD-061 · In a free-text markdown tile, the footnotes divider and the footnote reveal do nothing.

> **Area:** Host Seam, Tiles · **Lens:** Defect · **Weight:** Low · **Size:** S · **Net:** +2 · **Origin:** Defect

**Finding**

In a markdown tile, clicking the footnotes divider or creating a footnote while they're hidden does nothing, because the tile's host has no `pageId` and `citations.set` is a no-op without one; the divider press and the reveal both call it.[^61]

**Fix | TBD**

Key visibility by the tile id, or draw no divider where the host can't toggle. Deferred until tiles decide whether they hold footnotes (*§Decisions* 12).

##### MD-062 · Every update of any editor holding a tile tells every warm editor in the app to check its scroll position.

> **Area:** Embeds, Root · **Lens:** Hot Path · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Patch-Over

**Finding**

The fix for a real browser quirk (a tile's inner scroll resets when CodeMirror briefly detaches it) fires on every caret move and keystroke in a page with a tile, through a module-global emitter, and reaches every open tab, window, glance, and tile editor, not just the ones inside that page. The cause it patches stands.[^62]

**Fix | Proposed**

Fire only on updates that can re-slot (`docChanged || viewportChanged`, or an `embedField` rebuild), and heal only editors inside the emitting view's DOM. Taken with a live check of the gate (*§Decisions* 12).

##### MD-063 · A resting Text value draws heading links without the holding page's headings or the Heading Link Style setting, unlike its live pane.

> **Area:** Properties · **Lens:** Drift · **Weight:** Low · **Size:** S · **Net:** +3 · **Origin:** Drift

**Finding**

A bare `[[#Gone]]` in a resting Text value is never marked missing, and `[[Page#Heading]]` there always shows the page part regardless of Heading Link Style; the live pane does both. `TextCell` calls `renderCellContent(line, connections, { base })` with no `around` or `headingLinkStyle`, where the live pane's decoration pass passes both. A bare fragment hides the page part either way.[^63]

**Fix | Proposed**

`TextCell` passes `headingLinkStyle` and `ownKeys` from `holder`, with `CellPage.ordinalOf` made optional. Lands in `Core/Properties`. Taken (*§Decisions* 12).

##### MD-064 · PageView builds its own warm seam beside `warmSeamOf`.

> **Area:** Pages, Session · **Lens:** Duplication · **Weight:** Low · **Size:** S · **Net:** −8 or 0 · **Origin:** Duplication

**Finding**

Pages restore their editor state through hand-written code (its own generation fence, path fence, and `pageDetail` attachment); tiles, windows, and the glance use `warmSeamOf`. The page's version exists because it also tucks a copy of the page's details into the warm entry and reads its owner tab id live, and `dropWarmDetail` keeps that second home consistent with `pageDetailCache`, which already holds the detail. Folding it into the helper with capture-patch options only relocates.[^64]

**Fix | TBD**

If warm entries drop `pageDetail`, PageView takes `warmSeamOf` with a path guard (about −8 including `dropWarmDetail`); if not, leave it. Deferred, a Session question (*§Decisions* 12).

##### MD-065 · A window's Page tab keeps its scroll twice, and the editor's own warm scroll records zero there.

> **Area:** Root, Interface · **Lens:** Drift · **Weight:** Low · **Size:** S · **Net:** −5 · **Origin:** Drift

**Finding**

In a window, a page's scroll position is saved by two mechanisms; the editor's own always records the top of the page there, and only the window's does anything. Under `.page-tile-grows` the editor's scroller doesn't scroll, so `MarkdownEditor`'s `scrollDOM.scrollTop` capture and restore are inert while `windowCache` keeps the real value; `travel.ts`'s `scrollerOf` already knows the real scroller.[^65]

**Fix | TBD**

One owner: the editor's warm scroll reads `scrollerOf(view)` and Page tabs leave `bodyScroll` (Space tabs keep it), or window pages skip the editor's capture. Taken, the editor's warm scroll reading `scrollerOf(view)` (*§Decisions* 12).

##### MD-066 · Each keystroke re-allocates every carried line intent, fence-line record, and table row below the edit just to shift their positions.

> **Area:** Engine · **Lens:** Hot Path · **Weight:** Low · **Size:** M · **Net:** +6 · **Origin:** Performance

**Finding**

On a very long page, typing near the top costs more than typing near the bottom, because every intent below is rebuilt with shifted positions: `stepLineIntents` carries lines below an edit by re-allocating each intent through `moveIntent`, `moveLine` runs per fenced line, `moveTable` per table, and `railIntents` re-derives whole-document rails per version though rails are read for the viewport. Measured at 1.81 ms against 0.25 ms at 14,500 lines, and 0.72 ms against 0.17 ms at 20,000. The carry stays O(N) whatever the fix, because every per-line array and `lineStarts` are copied and shifted per keystroke by design; what can go is the per-object allocation, a constant-factor cost.[^66]

**Fix | Proposed**

Hold cached line intents relative to their line start, re-based where they're read (`assembleLineIntents`, `prefixEndAt`, `seatPastMarker`, `decorations.ts`'s `atomicsOn`), so the carry copies references, and derive rails for the window. Editor-Internals' sentence that an intent carries document positions in `from` and `to` is rewritten, and `docCache.test.ts`'s `stepLineIntents ≡ docLineIntents` property stays the specification; the fence and table half is the investigator's open question about holding a block's range once in `fenceRangesOf` rather than on every line. Deferred until a long-page benchmark is part of the gates (*§Decisions* 12).

---

### Not Better

Real findings whose known fix doesn't earn its place. They are kept here so nobody re-raises them.

##### MD-067 · The scan's `Span` comes in two shapes, tuples for maths and HTML and objects for tables, embeds, and webpages, so it carries adapters for both.

> **Area:** Engine · **Lens:** Drift · **Weight:** Low · **Size:** M · **Net:** −2 · **Origin:** Drift

**Finding**

The scan stores start-and-end ranges two ways, and `fromOf`, `toOf`, and the tuple-versus-object splits exist only because of that. Normalizing `maths` and `html` to `{ from; to }` and deleting the tuple arm touches about twenty `[0]`/`[1]` readers, many in `decorations.ts` and `folding.ts`, for a reduction of about two lines.[^67]

**Fix | Proposed**

Normalize to objects if a change already rewrites those readers; on its own, the churn outweighs the two lines.

##### MD-068 · About thirty names are exported only for tests to import.

> **Area:** Engine, Tables, Links, Guards, Root · **Lens:** Dead Code · **Weight:** Low · **Size:** S · **Net:** 0 · **Origin:** Residue

**Finding**

The test audit lists about thirty `export` keywords whose only outside reader is a test (`indentLevel`, `computeStats`, `buildWidgetDecorations`, `refreshTableEffect`, `connectionInsert`, `pendingTitles`, `foldedRegions`, `regionsOf`, `EMPTY_PAGE_TEXT`, and the rest). Each function lives in its file and does real work; removing the keyword removes no line, and `lineIntentsInto` is the cached-assembly property's reference derivation. Several leave through MD-016, MD-039, and MD-043.[^68]

**Fix | Literal**

None on their own; a keyword goes when its file is next rewritten.

---

### Killed

Candidates the reviewers struck, with their one reason each.

- **D1-PC-2.9 / D1-OW-F5** (`ListKind` declared in `Actions/gripMenu.ts`): a type-only import with no runtime edge; the fix is a pure move.
- **D1-PC-2.10 / D1-OW-F11** (exports only tests import): each is one `export` keyword; see MD-068.
- **D1-OW-F6** (renaming `listDragModel` and `subfieldStats`): a rename removes nothing.
- **D2-DR-F4** (whole-marker Backspace leaves a numbering gap): the un-marked line breaks the run, and the run below is a separate top-level run that keeps its smallest ordinal, so the proposed renumber trigger changes nothing (probed on `1. a\nb\n3. c`).
- **D2-DR-F12** (drop-line markup against UIX `DropLine`): an imperative maker in UIX nets zero; a relocation.
- **D2-PC-F4** (`embedGuard` per-tile work per transaction): the cost scales with a page's tile count at constant work per tile, not with document size; the proposed skip window adds a correctness-sensitive condition for no measured gain.
- **D2-OW-F4** (exporting the annotation carry for `embedGuard`): a two-line relocation; its selection half is MD-054 and its annotation half MD-013.
- **D2-OW-F5** (deleting `citationGuard`'s head-offset clamp): removing it changes a behavior no probe showed defective; its stale comment is corrected under MD-054.
- **D2-OW-F6** (`TableMenuAction` dispatched at four sites): `transformFor` is already an exhaustive switch, so a new action fails to compile; the split is layout.
- **D2-OW-F7** (`TableMenuContext` optional bag; `Align` in two homes): the two align types sit on opposite sides of the Engine purity boundary, so unifying them needs a new shared home; the context union is a style preference with no wrong state reached.
- **D2-OW-F9** (`TextCell` re-spells the resting line loop): the two loops draw different DOM for different layouts, and the `text` scope reads no lists, so no behavior differs.
- **D2-OW-F10b** (`lm && listGlyphOf(lm)` at four sites): one expression, net zero.
- **D2-OW-F10d** (`nest` against `listEdit`): they behave differently; the page consumes the key, and the cell hands a null back to table navigation.
- **D2-OW-F12** (`fusedTableCount` re-splits table text): net zero, on deletions only, bounded to the tables in the edit's fresh window.
- **D2-OW-F13** (its `widget.tsx` "draws the table" half): `widget.tsx` is the table's CodeMirror widget, which renders `MarkdownTable`; loose, not wrong.
- **D2-DR-F3 / D2-OW-F2** (the "transforms read fences the cell draws as literal" framing): the cell's tokenizer reads the same fences, so the two layers agree; corrected inside MD-047.
- **D3-DR-8** (⌘⇧V "two-axis residue"): MarkdownPM.md says ⌘⇧V does the opposite of ⌘V, and `pasteDecision.ts` does exactly that; nothing is left from the removed toggle.
- **D3-PC-10** (citation section reassembled per version): a sparse walk inside the stepped rescan measured at 0.6 to 0.85 ms at 20,000 lines; carrying refs across versions adds more code than the walk costs.
- **D3-OW-16** (`CitationSubject` defined twice): two private types for two jobs; naming only.
- **D3-OW-16** (`EmbedTileWidget` booleans): no produced invalid combination was named.
- **D3-OW-16** (`MdTarget`'s `ambiguous?` flag): one reader, style.
- **D3-DR-15 / D3-OW-9** (`ConnectionsApi` and `ConnMenuTarget` living in `Links/`): relocation only; the threading cause is MD-048.
- **D3-DR-12 / D3-OW-11, reviewer entry B-28** (the `§` heading picker drawing a flat list with the alias glyph): closed by `d0dd9e52d`, which routes every heading-shaped form through `listsHeadings` in `autocomplete.ts`, pinned in `connectionCommit.test.tsx`.
- **D3-DR-10, second half** (the "caret in a link destination" walk existing twice): closed by `d0dd9e52d` and `70fc6063c`, after which one `linkDestinationStart` in `Core/Connections/links.ts` answers it; the first half is MD-020.
- **D4-DR-15** (two `registerPageEditor` writers in PageView): two distinct triggers, both needed.
- **D4-DR-15 / D4-OW-14** (`changesTo` imported from `Pages/merge3`, and the other back-edges): moving the function is relocation only.
- **D4-DR-15** (`heldPage` outside `EditorHost`): making it a host member moves the answer without removing a reader; the DOM walk stays for cells.
- **D4-DR-15** (`--editor-scale` and `--embed-scale` defaults in `markdown-pm.css`): the stylesheet's fallback for surfaces drawn before personalization applies; no wrong state named.
- **D4-PC-1's ⌘A freeze as a separate claim:** same function and cause as MD-027.

### Routed

- **F-337** (code-block coloring re-parses the whole fenced block per keystroke): still true at the pin (`codeHighlight.ts:186` keys `blockParser.parse` by the whole block's text with no fragments). Its fix is a parser-fragment design (`TreeFragment.applyChanges` in block-local coordinates, about +20, TBD) rather than the removal of drift, and it stays in the Codebase Audit's W28. F-170, F-173, F-339, and F-573 are absorbed by MD-053, MD-008, MD-030, and MD-051.

---

### Dependencies And Order

**Findings that edit the same lines:**

- `Tables/MarkdownTable.tsx` and `widget.tsx`: MD-001, MD-003, MD-004, and MD-008 land in one pass, with MD-004 (props required) first, then MD-003's `CellPage` prop, MD-001's `useLatest` read, and MD-008's CSS variables.
- `api.ts`'s `mirrorBody`: MD-015 adds the echo flag before MD-002 takes the helper for the cell.
- `MarkdownEditor.tsx`'s extension list: MD-010 moves `citationOrder` and MD-011 deletes `citationHost` in the list MD-016 rewrites; MD-017 deletes the `body` prop from the same component. Land MD-010 and MD-011 before or inside MD-016; MD-048's facet goes into the assembly MD-016 creates.
- The link hit-test: MD-019's single `linkPointer` is where MD-018's code check and MD-023's `heldTarget` land; MD-020 and MD-021 touch `Core/Connections/links.ts` and `tokens.ts` beside it.
- `Guards/aliasGuard.ts`: MD-039 deletes it in favor of `inAliasAt` in Connections, which is where MD-018's `refusedInAlias` gating then lands; MD-042's `Guards/` sentence follows.
- `Engine/headingScan.ts`: MD-029's memo and MD-055's `text` field; `headingRenameSettle.ts`: MD-015 and MD-055.
- `Engine/subfieldStats.ts`: MD-028's bound rides MD-027's rework if that lands.
- `Engine/detect.ts`: MD-032 (`ListMarker`), MD-039 (callout prefix), MD-051 and MD-052 (`htmlBlocks`), and MD-055 (`headingParts`) touch separate regions.
- `Engine/docScan.ts` and `blockModel.ts`: MD-030's `markers` field, then MD-047's scope threading and MD-051's `quietAt` change.
- `decorations.ts`'s `build`: MD-056 (the claim), MD-047 (scope compares), and MD-038 (the `↔` search) share the function.
- MD-009 and MD-010 land together, tested together. MD-051 and MD-052 land together.
- Tests: MD-043's deletions of `regressionPins.test.ts:212` and `detect.test.ts:420-431` precede MD-041; MD-004's required props and MD-046's `citationScan` removal touch tests MD-043 and MD-044 also edit, so each test file is opened once.

**Phase order, per *§Decisions* 13:**

1. **Corruptions:** MD-001, MD-009, MD-010, and MD-027's cache replacement, each with its regression test.
2. **The surface model, one slice:** the vocabulary (MD-047 in `Engine/surfaces.ts`, MD-056 with `readsTiles`, MD-051 and MD-052 with the readers taking the HTML Formatting flag), the assembly (MD-016, MD-017, MD-011; MD-010's filter seat lands inside the list MD-016 rewrites), and the host seam (MD-048, MD-049, MD-004). A scout proves this phase on a scratch copy before it is planned.
3. **Tables:** the rest of W1 (MD-002 after MD-015, MD-003, MD-005 through MD-008) and MD-053 in one pass over `Tables/` and `Engine/Tables/`.
4. **Footnotes and guards:** MD-012 through MD-015 and MD-054.
5. **Links and the picker:** W4 and MD-057, MD-058, after re-anchoring against `70fc6063c`.
6. **Engine and decorations:** W6, W7, MD-028 inside MD-027's recount, and MD-055.
7. **Behavior calls taken:** MD-059, MD-060, MD-063, MD-065, and MD-062 with its live check.
8. **Residue, tests, and documentation:** W8, then W10 folded per file, then MD-042.

---

### Decisions

Ruled by the owner on 10-08-2026 and narrowed the same day to the bugs, the reachable costs, and the reductions, after each finding was typed and measured on a scratch worktree; each names the findings it settles. What was deferred is recorded in the Codebase Audit at its measured cost.

1. **Scope stays a string** (MD-047, MD-034). The capability predicates and the exhaustive grip and block switches wait for the surface that needs them, recorded as F-645 and F-648; the `= 'page'` defaults stay.
2. **The stats cache is replaced; the figures stay a second reading** (MD-027). The eviction-order cache goes, so the freeze past 8,000 lines goes with it; the recount from the editor's own derivations and the footer seam wait, recorded as F-649.
3. **Tab picks the `[[` row on a page** (MD-016), as cells and Text values already do.
4. **Outside a page, `![[Page]]` draws as a connection** (MD-056). The tile field forms no tile in a cell or a Text value; the decoration pass reads the tile field's ranges instead of re-claiming, and where no tile can form the embed token takes the connection's look and gestures. A page is unchanged.
5. **An opener nothing closes ends at the next blank line** (MD-052), independent of any setting, and joins Editor-Internals' divergence list. Sealing HTML blocks by HTML Formatting and CommonMark's start and end conditions (MD-051) wait, recorded as F-573 at their measured cost.
6. **After a guard relocates typed text, the caret follows it** (MD-054), so the following keys join that line.
7. **A cell or Text value keeps reading fences as it does today** (MD-047); MarkdownPM.md:57's "fences stay literal text" is corrected to say the pair is read.
8. **One link classifier** (MD-057): an unresolved schemeless target reads as a web address, a conversion keeps the alias and heading, and a heading-qualified connection offers its rows.
9. **A resting cell's Page Title waits** (MD-058), recorded as F-650.
10. **The host seam waits** (MD-048, MD-049, MD-050): the connections member and the surface union are recorded as F-646 and F-647, and the menu seam waits for the SidePane.
11. **The table-region rework is taken** (MD-053), on the measurement.
12. **The behavior calls:** taken, MD-055, MD-059, MD-060, MD-063, MD-065; taken with a live check, MD-062; deferred, MD-061, MD-064, MD-066.
13. **The assembly lands as one phase after the corruptions** (MD-016, MD-017, MD-010, MD-011, MD-004, MD-056, MD-052), so `MarkdownEditor.tsx`'s extension list and `decorations.ts`'s build are rewritten once.

---

### Source Labels

| Finding | Source Labels |
| --- | --- |
| MD-001 | A-1 (D2-DR-F1, D2-PC-F1) |
| MD-002 | B-16 (D4-DR-4, D4-PC-5, D4-OW-5) |
| MD-003 | A-6 (D2-OW-F1) |
| MD-004 | A-19 (D2-DR-F13, D2-OW-F8); test audit §4 (`tableWidgetExtension`, S3) |
| MD-005 | A-20 (D1-DR-4) |
| MD-006 | A-14 (D2-PC-F6) |
| MD-007 | A-15 (D2-DR-F11, D2-PC-F5) |
| MD-008 | A-28 (D2-DR-F8, D2-PC's F-173 note); F-173 superseded |
| MD-009 | B-1 (D3-PC-1) |
| MD-010 | B-2 (D3-PC-2) |
| MD-011 | B-14 (D3-DR-9, D3-OW-10, D4-DR-8, D4-OW-9) |
| MD-012 | B-24 (D3-DR-6) |
| MD-013 | A-3 (D2-DR-F6, D2-OW-F4 annotation half) |
| MD-014 | A-16 (D2-PC-F3) |
| MD-015 | A-18 (D2-DR-F9) |
| MD-016 | B-5 (D3-OW-4, D4-DR-1, D4-PC-8, D4-OW-1), A-17 (D2-DR-F5, D2-PC-F7, D2-OW-F11) |
| MD-017 | B-15 (D4-DR-3, D4-PC-7, D4-OW-8); test audit §4 (`body` prop, S0) |
| MD-018 | B-4 (D3-PC-3) |
| MD-019 | B-6 (D3-DR-4, D3-PC-7, D3-OW-14) |
| MD-020 | B-26 first half (D3-DR-10) |
| MD-021 | B-27 (D3-DR-11, D3-OW-16 `linkTarget` item) |
| MD-022 | B-38 (D3-OW-15) |
| MD-023 | B-29 (D3-OW-3) |
| MD-024 | B-25 (D3-DR-7) |
| MD-025 | B-18 (D3-PC-5, D3-OW-5) |
| MD-026 | B-13 (D4-DR-6, D4-OW-6) |
| MD-027 | A-7 (D1-DR-1, D1-PC-2.4), B-3 (D4-PC-1 cache part), B-21 page-figures half (D4-DR-13, D4-OW-13) |
| MD-028 | A-8 (D1-DR-2, D1-PC-2.5, D1-OW-F9), B-21 table half (D4-DR-12, D4-PC-1 `tableProse` part) |
| MD-029 | A-10 (D1-PC-2.7), B-20 (D4-DR-14, D4-PC-6, D4-OW-12) |
| MD-030 | F-339 superseded (D1-DR, D1-PC, D1-OW, D3-DR, D3-PC, D3-OW, D4-PC F-ID notes) |
| MD-031 | A-13 (D1-PC-2.6) |
| MD-032 | A-22 (D1-OW-F3) |
| MD-033 | A-23 (D1-OW-F7) |
| MD-034 | B-37 (D3-OW-7) |
| MD-035 | B-19 (D4-DR-5) |
| MD-036 | B-39 (D3-PC-8) |
| MD-037 | B-40 (D3-OW-13) |
| MD-038 | B-41 (D4-PC-10) |
| MD-039 | A-21 (D1-DR-5, D1-PC-2.8, D1-OW-F4, D1-DR-6, D2-DR-F7, D2-OW-F10a/c, D2-DR-F12a/c) |
| MD-040 | B-42 (D3-DR-14 `AcQuery` and `BlockMenuMatch.at`, D4-OW-16, D4-DR-15 rename glue); test audit §4 (`AcQuery`, S0/S4) |
| MD-041 | Test audit §4 (`SubBlock.level` S2, `composeWebpageEmbedLine` label S1, `editable.of(true)` S7) |
| MD-042 | B-30 (D3-DR-16, D3-PC-9, D3-OW-17, D4-DR-15, D4-OW-15), A-27 (D1-OW-F8, D2-OW-F13 Guards half) |
| MD-043 | Test audit §2 deletes and merges (S0 through S7), §3 rulings 1 and 3 |
| MD-044 | Test audit §2 tightens and moves (S0 through S7) |
| MD-045 | Test audit §2 setup (S3), §3 ruling 2 |
| MD-046 | A-25 (D1-DR-7, D1-OW-F10), A-26 (D1-DR-8), test audit §4 harness gaps (S7) |
| MD-047 | A-5 (D1-OW-F2, D2-DR-F10, D2-OW-F3, D2-DR-F3, D2-OW-F2, D2-PC-F8), B-10 (D3-OW-6, D4-DR-2, D4-OW-4, D3-DR-14 `blockHandles` defaults), D1-OW design question 1 |
| MD-048 | B-11 (D3-OW-9, D4-OW-3, D3-DR-15) |
| MD-049 | B-12 (D4-OW-2) |
| MD-050 | B-36 (D3-OW-8) |
| MD-051 | A-12 (D1-PC-2.2); F-573 superseded |
| MD-052 | A-11 (D1-PC-2.1), D1-PC design question 1 |
| MD-053 | F-170 superseded (D1-PC re-measurement; D1-DR, D1-OW, D2-DR, D2-OW, D2-PC, D4-DR, D4-OW F-ID notes) |
| MD-054 | A-2 (D2-DR-F2, D2-PC-F2, D2-OW-F4 selection half) |
| MD-055 | A-9 (D1-DR-3) |
| MD-056 | A-4 (D1-OW-F1), B-7 (D3-DR-5, D3-PC-6, D3-OW-1, D4-PC-3, D3-DR-14 double resolve) |
| MD-057 | B-8 (D3-DR-1, D3-DR-2) |
| MD-058 | B-9 (D3-DR-3, D3-OW-2) |
| MD-059 | B-23 (D4-PC-4) |
| MD-060 | B-33 (D4-DR-9) |
| MD-061 | B-34 (D4-OW-10) |
| MD-062 | B-17 (D3-DR-13, D3-PC-4, D3-OW-12, D4-DR-11) |
| MD-063 | B-35 (D4-OW-11) |
| MD-064 | B-31 (D4-DR-7, D4-PC-9, D4-OW-7) |
| MD-065 | B-32 (D4-DR-10) |
| MD-066 | A-29 (D1-PC-2.3), B-22 (D4-PC-2), D1-PC design question 2 |
| MD-067 | A-24 (D1-DR-9) |
| MD-068 | Test audit §4 export-keyword list (S0 through S7) |
| Killed | The reviewers' Killed lists, D3-DR-12 / D3-OW-11 (B-28) and D3-DR-10's second half by `d0dd9e52d` and `70fc6063c` |
| Routed | F-337 |

---

### Appendix: Test Dispositions

Copied from the consolidated test audit at the pin. Paths are relative to `Core/MarkdownPM/` unless they start with `Core/`. Kinds: **BC** by construction · **TL** too loose · **UP** unproduced state · **RP** re-pin · **RT** retired.

| File | Lines | Kind | Disposition | Lines |
| --- | --- | --- | --- | --- |
| `regressionPins.test.ts` | :89 | RP | delete (`edits.test.ts:185`, `:360`, `:203`) | 14 |
| `regressionPins.test.ts` | :334 | RP | delete (`docScan.test.ts:265`); keep :325, :329 | 11 |
| `regressionPins.test.ts` | :66 | RP | delete (`edits.test.ts:222`) | 8 |
| `regressionPins.test.ts` | :249 | TL, RT | tighten to `toEqual([[0, 20]])`, rename after `fenceRangesOf` | 7 |
| `regressionPins.test.ts` | :256 | TL, RP | tighten to `toEqual([[0, 16]])`, drop :260 | 6 |
| `regressionPins.test.ts` | :212 | RP | delete (`listDragModel.test.ts:16`); frees `SubBlock.level` | 6 |
| `regressionPins.test.ts` | :143 | RP, TL | delete (`edits.test.ts:386`); keep :139 | 4 |
| `regressionPins.test.ts` | :155 | RP | merge into `edits.test.ts:70` as `expect(e.selection).toBe(5)` | 4 |
| `regressionPins.test.ts` | :133 | RP, TL | delete (`edits.test.ts:507`) | 3 |
| `regressionPins.test.ts` | :188 | RP | delete (`edits.test.ts:91`) | 3 |
| `Tables/cellLinks.test.tsx` | :223-255 | TL | tighten: `expect(target?.kind).toBe('url')` before the apply | 33 |
| `Tables/cellLinks.test.tsx` | :147-167 | RP | delete (`cellNavigation.test.tsx:131-139`) | 21 |
| `Tables/cellLinks.test.tsx` | :67-72 | RP | keep (§3 ruling over `aliasSites:89`) | 6 |
| `Menus/blockMenuFlow.test.tsx` | :85-92 | RP | delete (`Core/Actions/blockMenu.test.ts:54-61`) | 8 |
| `Menus/blockMenuFlow.test.tsx` | :94-101 | RP | delete (`blockMenu.test.ts:90-96`) | 8 |
| `Menus/blockMenuFlow.test.tsx` | :193-200 | RP | delete (:210-222, :135-148, :312-317) | 8 |
| `Menus/blockMenuFlow.test.tsx` | :103-108 | RP | delete (`blockMenu.test.ts:80-88`) | 6 |
| `Menus/blockMenuFlow.test.tsx` | :110-115 | RP | delete (`blockQuery.test.ts:23-25`) | 6 |
| `Menus/blockMenuFlow.test.tsx` | :127-131 | RP | delete (`blockQuery.test.ts:49-51`) | 5 |
| `Menus/blockMenuFlow.test.tsx` | :271-275 | RP | delete (`blockMenu.test.ts:58`) | 5 |
| `Autocomplete/connectionCommit.test.tsx` | :118-135 | BC | tighten: add `expect(view.state.selection.main.head).toBe(7)` | 18 |
| `Autocomplete/connectionCommit.test.tsx` | :287-297 | TL | tighten to `expect(document.querySelector('.mdpm-ac')).toBeNull()` | 11 |
| `Autocomplete/connectionCommit.test.tsx` | :137-145 | RP | delete (`pickFirst` at :40, :125) | 9 |
| `Autocomplete/connectionCommit.test.tsx` | :50-54 | RP | delete, or merge into :56 | 5 |
| `Guards/citationGuard.test.ts` | :35-38, :46-48, :88-90, :129-131, :266-268 | BC | merge each as a one-line precondition into :28, :40, :81, :121, :260 | 16 (~11 net) |
| `Guards/citationGuard.test.ts` | :100-114 | TL, RP | delete (:54-62) | 15 |
| `Guards/citationGuard.test.ts` | :203-208 | RP | merge `toContain('the citation')` into :28, delete | 6 |
| `Guards/citationGuard.test.ts` | :243-247 | TL | tighten to `toBe(\`${DOC}\n   \n  \`)` | 5 |
| `Engine/intents.test.ts` | :616-622 | UP | delete | 7 |
| `Engine/intents.test.ts` | :613 | RP | tighten: drop the line (`subfieldStats.test.ts:128-133`) | 1 |
| `Engine/intents.test.ts` | :752-756 | UP, RP | delete (:155-159) | 5 |
| `Engine/intents.test.ts` | :191-192 | RP | tighten: drop two lines (:195-206) | 2 |
| `Engine/intents.test.ts` | :632-635 | TL | tighten to exact `toEqual` on the four `lineClasses` | 4 |
| `Engine/intents.test.ts` | :636-638 | RP | merge into :632-635 | 3 |
| `Engine/intents.test.ts` | :445-447 | RP | merge into :459-470, or delete | 3 |
| `Engine/intents.test.ts` | :70-72 | RP | merge into :74-76 | 3 |
| `readOnlySelection.test.tsx` | :9-40 | setup | rewrite on `mountEditor` | 32 (~25 net) |
| `readOnlySelection.test.tsx` | :50 | TL | delete | 5 |
| `Menus/editorMenu.test.tsx` | :108-130 | TL | tighten: clipboard `'x'` on `- item` at 6 → `'- itemx'` for menu and chord | 23 |
| `Menus/editorMenu.test.tsx` | :165-176 | TL | tighten to `toBe(<full resulting table>)` | 12 |
| `Menus/gripMenuFlow.test.tsx` | :185-191 | RP | merge the callout `calls[0]` check into :177-183, drop the delete half | 7 |
| `Menus/gripMenuFlow.test.tsx` | :85-90 | RP | delete (`format.test.ts:191-193`, `blockModel.test.ts:61-66`) | 6 |
| `Menus/gripMenuFlow.test.tsx` | :102-107 | RP | delete (`format.test.ts:195-197`, `blockModel.test.ts:157-163`) | 6 |
| `Menus/gripMenuFlow.test.tsx` | :116-121 | RP | delete (:177-183, `gripMenu.test.ts:11-14`) | 6 |
| `Menus/gripMenuFlow.test.tsx` | :152-157 | RP | delete (:143-150, :177-183) | 6 |
| `Autocomplete/autocomplete.test.ts` | :238-244 | RP | delete (:48-55) | 7 |
| `Autocomplete/autocomplete.test.ts` | :74-80 | RP | delete (:123-125) | 5 |
| `Autocomplete/autocomplete.test.ts` | :164-168 | RP | delete (`Core/Connections/links.test.ts:77`) | 5 |
| `Autocomplete/autocomplete.test.ts` | :177-180 | RP | delete (:35-38) | 4 |
| `Autocomplete/autocomplete.test.ts` | :182-185 | RP | delete (:138-144) | 4 |
| `Autocomplete/autocomplete.test.ts` | :159-162 | TL | tighten to `toBeNull()` | 4 |
| `Links/externalLink.test.tsx` | :121-135 | RP | delete (`linkFormat.test.tsx:72-84`, `:100-103`) | 15 |
| `Links/externalLink.test.tsx` | :90-102 | TL | tighten: mount with the :106-110 `conn`, assert `connMenu` not called | 13 |
| `Core/Pages/editorHost.test.ts` | :183 | BC | tighten: drop :193-196, keep the `mutate` pin | 4 |
| `Core/Pages/editorHost.test.ts` | :50 | RP | delete (`pageDetailCache.test.ts:152`, `:168`) | 9 |
| `Autocomplete/aliasPicker.test.tsx` | :139-145 | RP | delete (:147-154) | 7 |
| `Autocomplete/aliasPicker.test.tsx` | :55-59 | TL, RP | delete | 5 |
| `Autocomplete/aliasPicker.test.tsx` | :125-129 | TL | tighten: leading side span holds `square-split-horizontal` | 5 |
| `Autocomplete/aliasPicker.test.tsx` | :245-249 | RP | move :247-248 into `connections.test.ts:68`, with :233-238 | 5 |
| `Autocomplete/aliasPicker.test.tsx` | :240-243 | RP | delete (`Core/Connections/connections.test.ts:10-25`) | 4 |
| `Tables/cellLists.test.tsx` | :360-377 | misplaced | move to `Engine/Tables/codec.test.ts` | 18 |
| `Tables/cellLists.test.tsx` | :96-100 | BC | delete (`intents.test.ts:80-85`) | 5 |
| `Tables/cellLists.test.tsx` | :379-381 | RP | delete (`codec.test.ts:65`) | 3 |
| `Input/edits.test.ts` | :285-289 | TL | tighten :286, :287 to exact edits, :288 to `toBeNull()` | 5 |
| `Input/edits.test.ts` | :212-216 | TL | tighten :214 `{insert:'__',selection:5}`, :215 `{insert:'``',selection:1}` | 5 |
| `Input/edits.test.ts` | :217-221 | TL | tighten :218 to `{from:2,to:2,insert:'**',selection:3}` | 5 |
| `Input/edits.test.ts` | :168-171 | TL | tighten :169 to `{from:0,to:0,insert:'[]',selection:1}` | 4 |
| `Input/edits.test.ts` | :195-198 | TL | tighten :196, :197 to exact edits | 4 |
| `Input/edits.test.ts` | :348, :369 | TL | tighten to exact edits | 2 |
| `Engine/detect.test.ts` | :420-431 | UP, RP | delete the describe; frees the `label` parameter | 12 |
| `Engine/detect.test.ts` | :144-148 | RP | delete (`links.test.ts:34-39`, `tokens.test.ts:69-73`) | 5 |
| `Engine/detect.test.ts` | :140-143 | RP | delete (`rewrite.test.ts:103-110`, `tokens.test.ts:58-62`) | 4 |
| `Engine/detect.test.ts` | :28-30 | RP | delete (:22) | 3 |
| `Core/Interface/Glance/GlancePane.test.tsx` | :737 | RP | delete (`pageDetailCache.test.ts:38`) | 9 |
| `Core/Interface/Glance/GlancePane.test.tsx` | :728 | RP | delete (`pageDetailCache.test.ts:152`) | 7 |
| `Core/Interface/Glance/GlancePane.test.tsx` | :746 | RP | delete (`pageDetailCache.test.ts:155`) | 5 |
| `Tables/dragOrigin.test.tsx` | :100-119 | RP | merge into :121-137 | 20 |
| `Engine/parser.test.ts` | :24-29 | RP | delete (`regressionPins.test.ts:28-32`, `:36`) | 6 |
| `Engine/parser.test.ts` | :6-10 | TL | delete | 5 |
| `Engine/parser.test.ts` | :12-15 | RP | delete (`regions.test.ts:11-17`) | 4 |
| `Engine/parser.test.ts` | :17-20 | RP | delete (`tokens.test.ts:15-20`) | 4 |
| `foldState.test.tsx` | :454 | RP | merge: `expect(kinds(view)).toEqual([])` after :483, delete | 11 |
| `foldState.test.tsx` | :401 | UP | delete | 8 |
| `Links/mdLinkTarget.test.tsx` | :311-319 | RP | delete (:116-124, :321-335) | 9 |
| `Links/mdLinkTarget.test.tsx` | :95-99 | RP | delete (:66-69) | 5 |
| `Links/mdLinkTarget.test.tsx` | :86-88 | TL, RP | delete (`links.test.ts:82-83`) | 3 |
| `Embeds/embedInsert.test.ts` | :65-73 | RP | move to `autocomplete.test.ts` as an `autocompleteQuery('![[]]', 3, true)` pin | 9 |
| `Embeds/embedInsert.test.ts` | :56-63 | BC, RP | delete | 8 |
| `Guards/calloutGuard.test.ts` | :12-14, :15-17, :18-20, :25-27, :28-30 | RP, TL | delete all five (:48-62) | 15 |
| `Links/pasteLink.test.tsx` | :81-85 | TL, BC | delete | 5 |
| `Links/pasteLink.test.tsx` | :87-91 | BC | delete; the `pasteLink.ts:19` guard stays | 5 |
| `Links/pasteLink.test.tsx` | :195-199 | BC | delete; the `pasteLink.ts:131` guard stays | 5 |
| `Engine/subfieldStats.test.ts` | :55-58 | TL | tighten to `characters === 4` and `=== 9` | 4 |
| `Engine/subfieldStats.test.ts` | :51-53 | TL | tighten to `toMatchObject({ words: 3, characters: 13 })` | 3 |
| `Engine/subfieldStats.test.ts` | :115-117 | TL | tighten to `characters === 9` | 3 |
| `Engine/subfieldStats.test.ts` | :269-271 | TL | tighten to `toMatchObject({ words: 4, characters: 19 })` | 3 |
| `Engine/listMarkerSeats.test.tsx` | :128 | BC | tighten: drop the line | 1 |
| `Engine/listMarkerSeats.test.tsx` | :91-95 | RP | delete (:31-34) | 5 |
| `Tables/sync.test.ts` | :35-39 | TL | merge into :23 as `toEqual({ from: 25, to: 28, insert: ' X ' })` | 5 |
| `Tables/sync.test.ts` | :70-73 | RP | delete (:64-68) | 4 |
| `Tables/sync.test.ts` | :31-33 | TL | delete (:46-50, :52-58, `codec.test.ts:53`) | 3 |
| `Engine/listDragModel.test.ts` | :129-135 | BC, RP | delete (:84-88) | 7 |
| `Engine/listDragModel.test.ts` | :177-181 | TL | tighten to `expect(renumberRuns(doc, [0])).toEqual([])` | 5 |
| `Engine/tokens.test.ts` | :51-56 | RP | delete (:121-127) | 6 |
| `Engine/tokens.test.ts` | :29-34 | TL | tighten :33 to `.toBe('**a**')` and italic markers `toEqual(['*','*'])` | 6 |
| `Engine/Tables/operations.test.ts` | :32-37 | TL | tighten: `base` dashes `[2, 4, 9]`, expect `5` | 6 |
| `Engine/Tables/operations.test.ts` | :58-62 | TL | tighten: add `expect(m.header).toEqual(['a', 'c'])` | 5 |
| `Engine/blockModel.test.ts` | :143-147 | RP | delete (:126-131) | 5 |
| `Engine/blockModel.test.ts` | :314-318 | RP | delete (:271-275); keep the :313 comment | 5 |
| `Engine/Tables/model.test.ts` | :5-14 | RP | delete (`format.test.ts:268-272`) | 10 |
| `Engine/Tables/codec.test.ts` | :72-76 | RP | delete (:14-17, :49-55) | 5 |
| `Engine/Tables/codec.test.ts` | :44-47 | UP | move the code-broken-pipe half to `regions.test.ts`, drop the non-table half | 4 |
| `Links/pasteDecision.test.ts` | :125-131 | BC | delete | 6 |
| `Links/pasteDecision.test.ts` | :91-93 | RP | delete (:58) | 3 |
| `Citations/citationMenu.test.ts` | :38-46 | RP | merge one line into :28 | 9 |
| `Links/pendingTitle.test.ts` | :64-68 | RP | delete (:45-50) | 5 |
| `Links/pendingTitle.test.ts` | :33-35 | RP | delete (:37-50) | 3 |
| `Links/linkEdges.test.tsx` | :393-400 | TL | tighten: mount with `{ ...conn, menu: vi.fn() }`, assert `menu` not called | 8 |
| `Tables/cellAlias.test.tsx` | :88-95 | RP | delete (`aliasGuard.test.ts:21`) | 8 |
| `Engine/embedClaims.test.ts` | :72-75 | RP | delete (:69) | 4 |
| `Engine/embedClaims.test.ts` | :77-79 | BC | delete | 3 |
| `Core/Pages/bodyMount.test.tsx` | :236 | TL | tighten: after `flush()`, assert `page:updateBody` not called | 7 |
| `prefixSeat.test.tsx` | :155 | TL | tighten to `toBe(<exact doc>)` | 6 |
| `Citations/citationCreate.test.tsx` | :387-392 | BC | move to `Engine/citations.test.ts` as a `scan(body).markers` ordinal test | 6 |
| `aliasSites.test.tsx` | :89 | RP | delete (`cellLinks.test.tsx:67`, §3 ruling) | 6 |
| `Core/Index/indexSeed.test.ts` | :318 | RP | delete the one line (`Engine/citations.test.ts:56`) | 1 |
| `Core/Index/indexSeed.test.ts` | :326-330 | misplaced | move to `Engine/citations.test.ts`, keep the row assertion | ~4 |
| `Gestures/listDragTap.test.tsx` | :51-55 | RP, TL | delete (:60-79) | 5 |
| `Links/linkFormat.test.tsx` | :130-133 | RP, BC | delete (:112-115) | 4 |
| `Engine/citations.test.ts` | :175-178 | RP | delete; keep :169-173 | 4 |
| `Engine/codeLangs.test.ts` | :14-17 | BC | delete | 4 |
| `Tables/widget.test.ts` | :58-60 | RP | merge into :71 with `expect(set.size).toBe(1)` | 3 |
| `Guards/aliasGuard.test.ts` | :30-32 | RP | delete (`regressionPins.test.ts:87`, `edits.test.ts:169`) | 3 |
| `Engine/outlineTree.test.ts` | :23-25 | BC | delete (`folding.test.ts:10`) | 3 |
| `Menus/blockQuery.test.ts` | :53-55 | RP | delete (:49-51) | 3 |
| `Core/Tiles/Surfaces/MarkdownTile.test.tsx` | :9-11 | RT | tighten: drop `body?` and the `??` | 2 |
| Guarded `ResizeObserver` stubs | `headingColRemap:14-20`, `cellHeadings:16-22`, `tableExit:13-19`, `cellNavigation:11-17` (+ :9), `tableGripMenu:17-23`, `cellStatic:17-23`, `cellLinks:15-21`, `cellLists:17-23`, `cellAlias:13-19` | setup | delete (`UIX/vitest.setup.ts:13-19` installs it) | 64 |
| `IS_REACT_ACT_ENVIRONMENT = true` | `cellHeadings:15`, `tableExit:12`, `tableGripMenu:16`, `cellLists:16` | setup | delete (`stubEditorBridge()` sets it) | 4 |
| Unconditional `ResizeObserverStub` | `emptyPage`, `docCache`, `travel`, `codeDiff`, `headingRename`, `aliasSites`, `foldState`, `connectionCommit`, `aliasPicker`, `linkEdges`, `aliasRender`, `mdLinkTarget`, `connectionHover`, `linkFormat`, `externalLink`, `linkEdit`, `listDragTap`, `citationBreakage`, `citationCreate`; guarded blocks at `textScope:17`, `editorMenu:19` | setup | delete; `dragOrigin`, `cellSweep`, `embedResize` stay | 128 |

Harness: `Core/Testing/editorHarness.ts:83-90` calls `rememberAlias(list, alias) ?? list` and `forgetAlias(...) ?? list` and fires `aliasWatchers` in place of `bump()` (net 0); the two routes to citations visibility (`citationsShown` prop and `host.citations.set`) are flagged only, since dropping the prop route touches `foldState`, `citationBreakage`, and `citationCreate`.

---

[^1]: **MD-001:** `Core/MarkdownPM/Tables/cellStatic.tsx:487-493` (the memo), `Core/MarkdownPM/Tables/MarkdownTable.tsx:24,483-487`, `Core/MarkdownPM/Tables/widget.tsx:239-241,336`; reviewer probe `rec/stale.test.tsx`.
[^2]: **MD-002:** `Core/MarkdownPM/Tables/CellEditor.tsx:40,240,282-291`, `Core/MarkdownPM/api.ts:62-71` (`mirrorBody`), `Core/Properties/Pickers/TextPane.tsx:169`.
[^3]: **MD-003:** `Core/MarkdownPM/Tables/widget.tsx:492-501` (`citeKey`), `Core/MarkdownPM/Tables/MarkdownTable.tsx:270-282`, `Core/MarkdownPM/Tables/cellStatic.tsx:148-155`, `Core/MarkdownPM/Engine/detect.ts:245` (the label grammar).
[^4]: **MD-004:** `Core/MarkdownPM/Tables/MarkdownTable.tsx:97-141,231,244,248-254,328,460,486`, `Core/MarkdownPM/Tables/widget.tsx:55,276-284,330-352,343-344,549,559`, `Core/MarkdownPM/Tables/sync.ts:41`, `Core/MarkdownPM/Tables/widget.test.ts:85-168`, `Core/MarkdownPM/Tables/headingColRemap.test.ts:53`.
[^5]: **MD-005:** `Core/MarkdownPM/Engine/Tables/codec.ts:5-7`, `Core/MarkdownPM/Engine/Tables/regions.ts:20,75-77`, `Core/MarkdownPM/Tables/widget.tsx:64`, `Core/MarkdownPM/Tables/clipboard.ts:27`, `Core/MarkdownPM/Engine/subfieldStats.ts:117`, `Core/MarkdownPM/Tables/sync.ts:25-27`, `Core/Testing/markdownEngine.ts:36,40`.
[^6]: **MD-006:** `Core/MarkdownPM/Tables/cellCitations.ts:17-19`.
[^7]: **MD-007:** `Core/MarkdownPM/Tables/widget.tsx:534-539`, `Core/MarkdownPM/decorations.ts:547`.
[^8]: **MD-008:** `Core/MarkdownPM/Tables/MarkdownTable.tsx:265-268,354-360,409-417,555,567,579`, `Core/Views/Table/useColumns.ts:366-373`; `.claude/Planning/Pommora Codebase Audit.md` F-173.
[^9]: **MD-009:** `Core/MarkdownPM/Citations/citationEdits.ts:96-101,109-110,128-132`, `Core/MarkdownPM/Engine/detect.ts:347-353`; reviewer probes `brec/cite.test.tsx` and `brec/fix/`.
[^10]: **MD-010:** `Core/MarkdownPM/MarkdownEditor.tsx:207-215`, `Core/MarkdownPM/Guards/tableGuard.ts:25`, `@codemirror/state/dist/index.js:2437-2438`; reviewer probes `brec/order*.test.tsx`.
[^11]: **MD-011:** `Core/MarkdownPM/Citations/citationActions.ts:26-33,38,55,75`, `Core/MarkdownPM/MarkdownEditor.tsx:211-214,224-227`, `Core/MarkdownPM/folding.ts:16,336-342,361,411`, `Core/MarkdownPM/api.ts` (`EditorHost.citations`).
[^12]: **MD-012:** `Core/MarkdownPM/Citations/citationActions.ts:38,75-77,144-146`.
[^13]: **MD-013:** `Core/MarkdownPM/Guards/verdictFilter.ts:2,19-20`, `Core/MarkdownPM/Guards/calloutGuard.ts:41`, `Core/MarkdownPM/Guards/citationGuard.ts:60`, `Core/MarkdownPM/Engine/Tables/regions.ts:48`; commit `2dbb0ba2e`.
[^14]: **MD-014:** `Core/MarkdownPM/Guards/citationGuard.ts:9-12,37`.
[^15]: **MD-015:** `Core/MarkdownPM/Guards/headingRenameSettle.ts:57-64`, `Core/MarkdownPM/api.ts:63-71`.
[^16]: **MD-016:** `Core/MarkdownPM/MarkdownEditor.tsx:107-109,116-118,171,179-184,187,189,217-223,249-251`, `Core/MarkdownPM/surface.ts:94-127`, `Core/MarkdownPM/Input/markdownInput.ts:59-65,93,187-197,267`, `Core/MarkdownPM/Input/applyEdit.ts:26`, `Core/MarkdownPM/Menus/caretPane.tsx:138`, `Core/Properties/Pickers/TextPane.test.tsx:124`.
[^17]: **MD-017:** `Core/MarkdownPM/MarkdownEditor.tsx:59-60,81,125-128`, `Core/Pages/PageView.tsx:81`, `Core/Tiles/Surfaces/PageTile.tsx:171`, `Core/Tiles/Surfaces/MarkdownTile.tsx:60`, `Core/Interface/Windows/PageHistoryWindow.tsx:245`, `Core/Testing/editorHarness.ts:182-187`, `Core/Pages/bodyMount.ts:44`, `Core/Tiles/Surfaces/MarkdownTile.test.tsx:9-11`.
[^18]: **MD-018:** `Core/MarkdownPM/Links/connectionClicks.ts:20-24`, `Core/MarkdownPM/Links/linkClicks.ts:26-32`, `Core/MarkdownPM/Links/linkEdit.ts:53-68,78-89,103-130`, `Core/MarkdownPM/Engine/tokens.ts:329-342`, `Core/MarkdownPM/Links/headingHash.ts:20`, `Core/MarkdownPM/Autocomplete/autocomplete.ts:56`, `Core/MarkdownPM/Links/pasteLink.ts:48-51`, `Core/Pages/editorHost.tsx:47-53`; reviewer probes `brec/alias.test.tsx`, `brec/codeclick.test.tsx`.
[^19]: **MD-019:** `Core/MarkdownPM/Links/connectionClicks.ts:56-103`, `Core/MarkdownPM/Links/linkClicks.ts:26-46,108-127`, `Core/MarkdownPM/Links/connectionsApi.ts:70-74`, `Core/MarkdownPM/Tables/cellStatic.tsx:40,449-484`, `Core/MarkdownPM/Links/linkEdit.ts:35-50`, `Core/MarkdownPM/Links/linkFormat.ts:57-68`, `Core/MarkdownPM/Gestures/pointerPath.ts:41-42,78`, `Core/MarkdownPM/Engine/tokens.ts:256-258`.
[^20]: **MD-020:** `Core/MarkdownPM/Autocomplete/autocomplete.ts:200-201`, `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:126-129`, `Core/Connections/connections.ts:89-96` (`connectionText`); at `d0dd9e52d`, `autocomplete.ts:210-211` and `useConnectionAutocomplete.ts:130`.
[^21]: **MD-021:** `Core/MarkdownPM/Engine/tokens.ts:47-50`, `Core/MarkdownPM/Links/linkFormat.ts:17-20`.
[^22]: **MD-022:** `Core/MarkdownPM/decorations.ts:508-524,552-620`, `Core/MarkdownPM/Tables/cellStatic.tsx:66-110,113-135`.
[^23]: **MD-023:** `Core/MarkdownPM/Links/connectionClicks.ts:66,87,90`, `Core/MarkdownPM/Links/linkClicks.ts:71-79,99-103,114-124`, `Core/Properties/Cells/TextCell.tsx:27-33`.
[^24]: **MD-024:** `Core/MarkdownPM/Links/pasteLink.ts:26,97`, `.claude/Features/MarkdownPM.md:33`.
[^25]: **MD-025:** `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:113-114,203-219`, `Core/MarkdownPM/Menus/caretPane.tsx:36-46`, `Core/MarkdownPM/Autocomplete/autocomplete.ts:78-98`, `Core/MarkdownPM/Menus/useBlockMenu.ts:24-29`.
[^26]: **MD-026:** `Core/Pages/editorHost.tsx:139-142`, `Core/Session/pageDetailCache.ts:41-42,102-116,121-126`, `Core/Session/saveScheduler.ts:140`, `Core/MarkdownPM/Autocomplete/headingTarget.ts:21-27`.
[^27]: **MD-027:** `Core/MarkdownPM/Engine/subfieldStats.ts:28-34,39-52,57-64,93,127-133,149-155`, `Core/MarkdownPM/Engine/perText.ts:7-11`, `UIX/Utilities/capMap.ts:9-12`, `Core/MarkdownPM/docCache.ts:40-52` (`drawnLast`), `Core/Interface/Subfield/subfieldPage.ts:6-7`, `Core/Pages/PageView.tsx:41`, `Core/Interface/Subfield/subfieldItems.tsx:27`, `Core/Interface/Subfield/CitationsToggle.tsx:10`, `Core/MarkdownPM/MarkdownEditor.tsx:235-244`; reviewer benchmark `brec/bench/bench3.ts` and probe `rec/engine.test.ts`.
[^28]: **MD-028:** `Core/MarkdownPM/Engine/subfieldStats.ts:111-124,142`, `Core/MarkdownPM/MarkdownEditor.tsx:235-244`, `Core/Interface/Subfield/publish.ts:18-21`, `Core/Session/chromeSlice.ts:83-88`.
[^29]: **MD-029:** `Core/MarkdownPM/Engine/headingScan.ts:20-34,44-51,61,64-83`, `Core/MarkdownPM/docCache.ts:95`, `Core/MarkdownPM/folding.ts:65-78,295`, `Core/MarkdownPM/decorations.ts:547`, `.claude/Guidelines/Editor-Internals.md:26`.
[^30]: **MD-030:** `Core/MarkdownPM/Engine/blockModel.ts:43,91-99`, `Core/MarkdownPM/Menus/blockHandles.ts:44-47`, `Core/MarkdownPM/Engine/docScan.ts:38-55` (no `markers` field); `.claude/Planning/Pommora Codebase Audit.md` F-339.
[^31]: **MD-031:** `Core/MarkdownPM/Engine/intents.ts:362-367`, `Core/MarkdownPM/Tables/cellStatic.tsx:214`.
[^32]: **MD-032:** `Core/MarkdownPM/Engine/detect.ts:515-525,538-539,548-606,602`, `Core/MarkdownPM/Engine/intents.ts:617`, `Core/MarkdownPM/Engine/listDragModel.ts:211`, `Core/MarkdownPM/Input/edits.ts:82-83`.
[^33]: **MD-033:** `Core/MarkdownPM/Engine/tokens.ts:59-71`, `Core/MarkdownPM/decorations.ts:339`.
[^34]: **MD-034:** `Core/MarkdownPM/Menus/gripMenu.ts:67,136-165`, `Core/MarkdownPM/Menus/blockHandles.ts:15-23`, `Core/MarkdownPM/Engine/blockModel.ts:209`.
[^35]: **MD-035:** `Core/MarkdownPM/markdown-pm.css:588-601,678-692`, `.claude/Guidelines/Editor-Internals.md` ("Box constructs float with an outer gap, never a line margin").
[^36]: **MD-036:** `Core/MarkdownPM/Embeds/embedWidget.tsx:565-573`.
[^37]: **MD-037:** `Core/MarkdownPM/Menus/blockHandles.ts:70-77,107-110`.
[^38]: **MD-038:** `Core/MarkdownPM/decorations.ts:632`.
[^39]: **MD-039:** `Core/MarkdownPM/Tables/sync.ts:29`, `Core/MarkdownPM/Engine/Tables/codec.ts:84`, `Core/MarkdownPM/Engine/detect.ts:471-478,486-490`, `Core/MarkdownPM/Guards/aliasGuard.ts:5-9`, `Core/MarkdownPM/Input/edits.ts:356-360`, `Core/MarkdownPM/Input/markdownInput.ts:240`, `Core/MarkdownPM/Tables/cellStatic.tsx:16,212,329-331`, `Core/MarkdownPM/Input/format.ts:340-352`.
[^40]: **MD-040:** `Core/MarkdownPM/Autocomplete/autocomplete.ts:28`, `Core/Actions/blockMenu.ts:25`, `Core/Actions/blockMenu.test.ts:57,83,92,102`, `Core/MarkdownPM/Menus/BlockMenuPane.tsx:46`, `Core/MarkdownPM/api.ts:202`, `Core/Pages/editorHost.tsx:93`, `Core/Pages/PageView.tsx:102-106`, `Core/Tiles/Surfaces/PageTile.tsx:190`.
[^41]: **MD-041:** `Core/MarkdownPM/Engine/listDragModel.ts:38-40,61`, `Core/MarkdownPM/Gestures/listDrag.ts:13,40,99-111`, `Core/MarkdownPM/Gestures/editorGesture.ts:47`, `Core/MarkdownPM/regressionPins.test.ts:212-217`, `Core/Connections/links.ts:27-30`, `Core/Actions/pasteAsMenu.ts:9,119`, `Core/MarkdownPM/Engine/detect.test.ts:2,420-431`, `Core/MarkdownPM/MarkdownEditor.tsx:173`.
[^42]: **MD-042:** `.claude/Features/MarkdownPM.md:8,24,70,77,87,171`, `Core/MarkdownPM/Engine/listDragModel.ts:205-208`, `Core/MarkdownPM/Input/listRenumber.test.ts:62`, `Core/MarkdownPM/Citations/citationPointer.ts:99-103`, `Core/MarkdownPM/codeGlyphs.ts:14-59`, `Core/Actions/blockMenu.ts:73-76`, `Core/MarkdownPM/Menus/blockHandles.ts:15-23`.
[^43]: **MD-043:** the consolidated test audit §2 and §3, rows marked delete and merge in *§Appendix: Test Dispositions*.
[^44]: **MD-044:** the consolidated test audit §2, rows marked tighten and move in *§Appendix: Test Dispositions*; `Core/MarkdownPM/Engine/Tables/codec.ts:20-29` (`restoreTrailingItem`).
[^45]: **MD-045:** `UIX/vitest.setup.ts:13-19`, `Core/vitest.setup.ts:1`, `Core/vitest.config.ts:8`, `Core/Testing/editorHarness.ts:158,190,230`, and the setup rows in *§Appendix: Test Dispositions*.
[^46]: **MD-046:** `Core/Testing/markdownEngine.ts:61-68`, `Core/MarkdownPM/Engine/citations.test.ts:6`, `Core/MarkdownPM/Citations/citationEdits.test.ts:18`, `Core/MarkdownPM/Guards/citationGuard.test.ts:14`, `Core/Testing/editorHarness.ts:83-90`, `Core/Pages/editorHost.tsx:62-67`, `Core/Connections/aliasMemory.ts:1-9`, `Core/MarkdownPM/Autocomplete/connectionCommit.test.tsx:85-87`, `Core/MarkdownPM/Engine/detect.ts:45-46`, `Core/MarkdownPM/Engine/docScan.test.ts:22-96`.
[^47]: **MD-047:** compares at `Core/MarkdownPM/Engine/intents.ts:341,446,536,588,664`, `Input/edits.ts:47,57,184,213`, `Menus/blockHandles.ts:44,49,174,189`, `decorations.ts:425,657`, `Engine/subfieldStats.ts:40`, `Gestures/listDrag.ts:52`, `Input/listRenumber.ts:39`, `Input/markdownInput.ts:228`, `Menus/menu.ts:94`; defaults at `Input/edits.ts:46,70,153,165,205,259`, `Engine/intents.ts:418,495,532`, `decorations.ts:776`, `Menus/blockHandles.ts:43,148`, `Core/Testing/markdownEngine.ts:51`; switches at `Engine/detect.ts:494-503`, `surface.ts:33-48`, `docCache.ts:84`; the enum at `Core/Actions/editorMenu.ts:19`; unscoped readers at `Input/edits.ts:637-645`, `Gestures/listDrag.ts:3`, `Input/listRenumber.ts:30`, `Gestures/blockDrag.ts:31`; `.claude/Features/MarkdownPM.md:57`; reviewer probe `rec/engine.test.ts`.
[^48]: **MD-048:** `Core/MarkdownPM/MarkdownEditor.tsx:107-109,198`, `Core/MarkdownPM/Tables/CellEditor.tsx:150`, `Core/MarkdownPM/Embeds/embedWidget.tsx:40-48`, `Core/Pages/editorHost.tsx:43,118,166`, `Core/MarkdownPM/surface.ts:51-61`, `Core/MarkdownPM/api.ts` (`EditorHost`).
[^49]: **MD-049:** `Core/Pages/editorHost.tsx:26-33`, `Core/Session/pageConnections.ts:9`, `Core/Interface/Windows/PageHistoryWindow.tsx:35,117-118,251`, `Core/Interface/Glance/GlancePane.tsx:43,292`, `Core/MarkdownPM/Embeds/embedWidget.tsx:400`, `Core/MarkdownPM/markdown-pm.css:67`.
[^50]: **MD-050:** `Core/MarkdownPM/api.ts` (`menus`), `Core/Pages/editorHost.tsx:100-103`, `Core/Testing/editorHarness.ts:112`.
[^51]: **MD-051:** `Core/MarkdownPM/Engine/headingScan.ts:25`, `Core/MarkdownPM/Engine/docScan.ts:94,365-372`, `Core/MarkdownPM/Engine/detect.ts:170-198`, `Core/MarkdownPM/Engine/blockModel.ts:69-72`, `Core/MarkdownPM/Engine/intents.ts:588`, `Core/MarkdownPM/Input/htmlShortcuts.ts:3,9`, `.claude/Features/MarkdownPM.md:28`; reviewer probe `rec/cite2.test.ts`; `.claude/Planning/Pommora Codebase Audit.md` F-573.
[^52]: **MD-052:** `Core/MarkdownPM/Engine/detect.ts:170-198`, `Core/MarkdownPM/Engine/docScan.ts:110,275-277`, `.claude/Guidelines/Editor-Internals.md` (the fence divergences).
[^53]: **MD-053:** `Core/MarkdownPM/Engine/Tables/regions.ts:23-27,58`, `Core/MarkdownPM/Engine/docScan.ts:105-113`, `Core/MarkdownPM/Tables/CellEditor.tsx:239-241`; `.claude/Planning/Pommora Codebase Audit.md` F-170; the D1 performance report's re-measurement.
[^54]: **MD-054:** `Core/MarkdownPM/Guards/verdictFilter.ts:53-60`, `Core/MarkdownPM/Guards/citationGuard.ts:14,51-57`, `Core/MarkdownPM/Guards/calloutGuard.ts:28`, `Core/MarkdownPM/decorations.ts:740-745`; reviewer probe `rec/citelive.test.tsx`.
[^55]: **MD-055:** `Core/MarkdownPM/Engine/detect.ts:642`, `Core/MarkdownPM/Engine/headingScan.ts:28`, `Core/MarkdownPM/Guards/headingRenameSettle.ts:27,44`, `Core/MarkdownPM/Menus/gripMenu.ts:78,92`, `Core/MarkdownPM/folding.ts:374`.
[^56]: **MD-056:** `Core/MarkdownPM/decorations.ts:428-437,791-798`, `Core/MarkdownPM/Embeds/embedWidget.tsx:405-406,646-648`, `Core/MarkdownPM/MarkdownEditor.tsx:202`, `Core/MarkdownPM/Tables/cellStatic.tsx:158-166`; reviewer probe `rec/claim.test.tsx`.
[^57]: **MD-057:** `Core/MarkdownPM/Links/connectionsApi.ts:64-68`, `Core/Connections/linkValue.ts:48-62`, `Core/Actions/pasteAsMenu.ts:30-47,107-115`, `.claude/Features/MarkdownPM.md:107`; reviewer probe `brec/paste.test.tsx`.
[^58]: **MD-058:** `Core/MarkdownPM/Tables/cellStatic.tsx:479-482`, `Core/MarkdownPM/Links/linkFormat.ts:82-92`, `Core/MarkdownPM/Links/pendingTitle.ts:50-65`, `Core/Interface/Menus/connectionMenuActions.ts:22`, `Core/Actions/connectionMenu.ts:87-99`.
[^59]: **MD-059:** `Core/MarkdownPM/folding.ts:200-208,336-342`, `Core/MarkdownPM/api.ts:62-71`, `Core/Session/saveScheduler.ts:142-143`, `Core/Pages/bodyMount.ts:44`.
[^60]: **MD-060:** `Core/MarkdownPM/MarkdownEditor.tsx:140-146`, `Core/Session/nexusSlice.ts:179`, `Core/MarkdownPM/foldState.test.tsx:470-487`.
[^61]: **MD-061:** `Core/Tiles/Surfaces/MarkdownTile.tsx:27`, `Core/Pages/editorHost.tsx:79-81`, `Core/MarkdownPM/folding.ts:406-411`, `Core/MarkdownPM/Citations/citationActions.ts:38,75`.
[^62]: **MD-062:** `Core/MarkdownPM/Embeds/scrollHeal.ts:3-4`, `Core/MarkdownPM/Embeds/embedWidget.tsx:689-696`, `Core/MarkdownPM/MarkdownEditor.tsx:278-284`.
[^63]: **MD-063:** `Core/Properties/Cells/TextCell.tsx:60`, `Core/MarkdownPM/Tables/cellStatic.tsx:68,84`, `Core/MarkdownPM/decorations.ts:544-547`.
[^64]: **MD-064:** `Core/Pages/PageView.tsx:31-36,113-131`, `Core/Session/warmCache.ts:36-40,52-71`, `Core/Session/navigationSlice.ts:322`.
[^65]: **MD-065:** `Core/Tiles/tile-base.css:89`, `Core/Interface/Windows/WindowTabBody.tsx:84`, `Core/MarkdownPM/MarkdownEditor.tsx:275-292,321`, `Core/Interface/Windows/windowCache.ts:6-13`, `Core/Interface/Windows/useWindowWarm.ts:40-56`, `Core/MarkdownPM/travel.ts:12-15`.
[^66]: **MD-066:** `Core/MarkdownPM/Engine/intents.ts:414-416,425-426,437-440,449,507-510`, `Core/MarkdownPM/Engine/docScan.ts:198,204,235-241`, `Core/MarkdownPM/docCache.ts:92`, `Core/MarkdownPM/Engine/detect.ts:92-103`; reviewer benchmark `brec/bench/`.
[^67]: **MD-067:** `Core/MarkdownPM/Engine/docScan.ts:46,49,59,227-229`, `Core/MarkdownPM/Engine/blockModel.ts:66`.
[^68]: **MD-068:** the consolidated test audit §4, "Export-Keyword-Only".
