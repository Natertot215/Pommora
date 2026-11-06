### 7 — Scans and Structure

**DATE:** 11-06-2026
**COMMIT:** `b7f2f17a5`
**RECONCILED FROM:** `Scouts/7 — Scans and Structure.md`
**RUN:** Every prototype compiled and ran through vitest in a throwaway worktree. Nothing ran against the app. Cites are to `b7f2f17a5`, under `Core/MarkdownPM/` unless stated. The line counts below were reproduced during reconciliation by rebuilding each tree from its patch, and the stack was then carried through numbering and paste (*Engine Reconciliation*). The timing tables are the source's, one run each, and weren't re-run.

#### The Verdicts

| Idea | Production Delta | Reds | Cost at 20,000 Lines | Verdict |
| --- | --- | --- | --- | --- |
| **One Scan Per Scope** | **-87** (+502 / -589) on its own | 0 behavior | None | **Take**, first |
| **Markers Masked in the Scan** | **+9** on the stack | 0 beyond Scout 8's five | None | **Take**, with Scout 8's parity |
| **A List Tree** | **+22** on top of the blank-line walks | 0 new; parity holds | +2.0 ms on every list edit | **Declined** in *§Rejections* |

#### The Stack

Each row is measured on the row above, and each cumulative patch applies to `b7f2f17a5`.

| Step | Step Delta | Cumulative | Reds | Patch |
| --- | --- | --- | --- | --- |
| One scan per scope | -87 (+502 / -589) | -87 | 0 of 1,996 in `Core/MarkdownPM` | *Scan Per Scope* |
| Scout 8's parity | +54 | -33 | Scout 8's five | not saved apart |
| Finish the masking | +9 | **-24 (+618 / -642)** | The same five | *Scan Stack* |

*Blank-Line Walks* took the stack to -48 as a B-5 trial, and *Numbering and Edges* replaces that step whole, so the stack continues in *Engine Reconciliation* at **-106 (+760 / -866)**.

**The Alternative Without the Scan Change:** Scout 8 alone is +56, and masking on top of it is +12, for +68 cumulative. That's *Masked Markers*, which *Scan Stack* supersedes.

**The Count:** `git diff -U0 -- . ':!*.test.*'`, lines beginning `+` or `-` that aren't blank and don't open with `//`, `/*`, or `*`. The gross figures run high because a factory that becomes a constant reindents its body; `git diff -w` gives +360 / -447 for the scan change, the same net of -87.

**Comments:** The scan change is +1 and *Scan Stack* +4, of which Scout 8 brings +5. The log's command reads 3,515 on the finished stack, 4 over its cap.

---

#### 1 — One Scan Per Scope

**7-T1 — Observed, The Mechanism:** A facet beats a parameter, and the count settles it. `docScan` reads as a parameter at about 45 of its 100 production sites that run on a cell or Text surface, and many hold no scope to pass (`caret.ts:60`, `Links/pasteLink.ts:112`, `Citations/citationPointer.ts:55`, `Gestures/blockDrag.ts:31`). The other 55 sit in page-only modules and would take a literal or a default, which is the I-036 problem restated. A facet, `surfaceScope`, stated once in `inlineSurface` (`surface.ts:48`), changes each site by deleting `.doc`: `docScan(view.state.doc)` becomes `docScan(view.state)`. `perScopedDoc` (`docCache.ts:75`) keeps its shape and reads the facet, so `docScan`, `docLineIntentsOf`, and `docAtomics` are three instances of one thing. Five sites keyed on a `Text` take `docScan.of(doc, 'page')`, each a page-only derivation (`docCache.ts:95`, `folding.ts:52`, `:67`, `Tables/widget.tsx:489`, and `docLineIntentsOf`'s own derive). Two `tr.newDoc` sites become `docScan.after(tr)`.

**7-T2 — Observed, What Leaves:** `scope` goes from every list, key, intent, and format function, and from most extension factories.

| Measure | `b7f2f17a5` | Scan Change | Stack |
| --- | --- | --- | --- |
| `scope` occurrences, production `Core/MarkdownPM` | 230 | 80 | 78 |
| `scope: MarkdownScope` declarations, production `Core` | 73 | 20 | 20 |
| Bare scope compares | 22 | 16 | 15 |
| `= 'page'` defaults on a scope | 15 | 6 | 6 |
| `Reader`, `'outside'`, `itemAt`, `readsFrom` | live | live | gone |

- **Functions Gone:** `blockPrefix`. `itemAt` shrinks to one line here and leaves with the masking.
- **Gates Gone:** the `page` tests in `caretSeat` (`decorations.ts:701` and its five readers), since `signSeatAt` answers null on a scan with no fences; `lineIntentsInto`'s (`intents.ts:372`), since `pageChrome` answers 0 on such a scan; `stepLineIntents`'s (`intents.ts:535`); `smartBackspace`'s (`Input/edits.ts:230`); and `listRenumber`'s reader juggling.
- **Factories Now Constants:** `listRenumber`, `listDragExtension`, `gripMenu`, `typedInput`, `smartDelete`, `commitAliasOnEnter`, `stepDocs`. `useConnectionAutocomplete` loses its scope argument at all three callers.
- **Second Parses Gone:** `Tables/CellEditor.tsx:61`, `:95`, and `Tables/cellStatic.tsx:287` read `scan.markers`.
- **Docs:** *Editor-Internals*, "A cell's document model is page-shaped" (line 18), describes a constraint that no longer exists and leaves whole.

**7-T3 — Observed, What Arrives:** `surfaceScope` (3 lines), `inlineLines` in `Engine/docScan.ts` (26 lines, the scan of a surface reading only inline marks and lists), a `scope` field on `DocScan`, an `.of` on `PerScopedDoc`, a `scope` argument on `tokenize` and `tokenizeChunk`, and a `view` argument to `drawnLast`'s derive, so a chunk tokenizes for its surface. `scan.scope` is what lets `dropChanges` rescan its moved text for the right surface (`Engine/listModel.ts:315`).

**7-T4 — Observed, What Turned Red:** Nothing in behavior. Before the test migration, 39 tests in 13 files failed on signatures, 2 of them the code-block pins that are behavior. After it, the scan change alone reads 1,996 of 1,996. The migration touches 17 test files, +122 / -126, nearly all of it dropping a trailing `'page'`, moving `'cell'` into `scanDoc`, or adding `surfaceScope.of(scope)` to a state built by hand.

**7-T5 — Observed, What Each Cell-Side Consumer Wants:** Every one wants the narrower scan, or doesn't care.

| Consumer | Today | With a Cell Scan | Reading |
| --- | --- | --- | --- |
| `autoPair` (`Input/edits.ts:425`) | Refuses `(` on a line inside a literal ` ``` `: null | Pairs: `()` | The cell draws no code there, so today's refusal is a defect |
| Every `inCodeAt` and `inFenceAt` reader in a cell (`autocomplete.ts:58`, `pasteLink.ts:46`, `format.ts:114`, `isLiteralAt`) | Stands down in a literal fence | Works as on any cell line | Same defect, one cause. Closes *8-T25* |
| `blockStarts` (`Engine/blockModel.ts:167`) | ` ```\n- a\n``` ` reads `code` and `$$\n- a\n$$` reads `math`, so a drawn list has no grip | `paragraph`, `list`, `paragraph` | The fix *1-T6.4* predicted |
| `cellCitations` (`Tables/cellCitations.ts`) | Reads drawn tokens and the page's ordinals | Unchanged | It never read the cell's own citations |
| The cell's own `citations` | `[^1] x\n[^1]: note` binds 1 entry | 0 entries, the marker unbound | A cell has no tail section, so this is right |
| Tokens (`Engine/tokens.ts:262`, `Tables/cellStatic.tsx:65`) | `*a*` inside a literal fence paints nothing; `$$\nx\n$$` paints `md-latex` in a live cell, and a resting cell has no such case | `*a*` reads italic; the math reads as text | Live and resting now agree. Takes `tokenize(text, scope)` |
| The seeded properties | `rescan` page only; `stepLineIntents` cell over a page scan | `rescan` equals `scanDoc` for a cell, 1,500 seeds × 30 steps; intents and atomics green | The axis cost 4 test lines |
| `chunksOver` | Page only | 12,000 cell seeds, 0 differences, given *7-T6* | |
| The resting cell | `parseListMarker` per line, `scanDoc(text)` for menus | `scanDoc(text, 'cell')` throughout; 0.001 ms at 4 lines | Its `items` projection stays, since it also holds the glyph |
| `landEdit` (`Input/listRenumber.ts:80`) | `listRenumber(scope)` | `surfaceScope.of(scope)` beside the filter | The one prod site that builds a state for a scope it was handed |

**7-T6 — Observed, The Log's Description Runs Two Fields Short:** A cell's scan can't hold nothing. `html` has to stay, because the parser is still page-shaped about HTML: with `html: []`, a chunk cut inside an HTML block and 3 of 3,000 seeds differed from the whole-text tokens, and with it kept, 0 of 12,000. `fenceLines` stays filled too, and that one does work: with `fences` empty, `parse` (`Engine/parser.ts:22`) reads every fence line as a lone one and masks its marker, so micromark reads the lines as prose, which is what a cell draws. So `inlineLines` empties fences, callouts, headings, quotes, breaks, tables, math, embeds, webpages, and citations, and keeps `refs`, `html`, and `fenceLines`.

**7-T7 — Observed, Nothing Pinned These Changes:** All of *7-T5*'s behavior moved with no test red. The cell's literal-construct behavior has no pins at all, so the plan adds them.

**7-T8 — Observed, The Hot Path:** Medians in ms at 20,000 lines, one run each. Differences under 0.1 are noise.

| Path | `b7f2f17a5` | Stack |
| --- | --- | --- |
| `scanDoc` whole, mixed page | 11.82 | 12.30 |
| `rescan`, one character, mixed page | 0.64 | 0.65 |
| `stepLineIntents`, mixed page | 1.97 | 1.99 |
| A character deleted through `listRenumber`, mixed page | 1.70 | 1.70 |
| `rescan`, one 20,000-line list | 0.30 | 0.30 |
| `stepLineIntents`, one 20,000-line list | 1.97 | 2.01 |
| `rescan`, a 20,000-line cell | 0.29 | 0.38 |
| `stepLineIntents`, a 20,000-line cell | 1.48 | 1.64 |
| `scanDoc`, a 20,000-line cell | 8.34 | 5.59 |

The three cell rows ran on the scan change with an earlier masking, and the page rows on the final stack. No per-keystroke whole-document work arrives. A cell's scan steps through the same `rescan`, so the hard rule and "Every stepped derivation answers to its full derivation" hold with no second path. A facet read is constant. The cell's `rescan` rises by 0.09 ms because lone `fenceLines` can widen its window, which a cell of realistic size never sees.

**7-T9 — Inferred, What Stays and Why:** 15 compares remain, and most are a surface choosing behavior rather than a reader guessing what it reads: `blockHandles` ×4, `editorMenu`'s `page`, `typedInput` and `smartDelete`'s page-only writers, `drawsRawHtml`, and `subfieldStats`. `autocomplete.ts:105`'s `!== 'cell'` is *6-T10*'s drift, which reads as a fix of its own. That's I-036 at its natural floor for this work: closed for readers, open for surfaces, and a capability predicate buys little over 15 sites. `scanDoc`'s `'page'` default stays, since about 500 test sites and every non-editor caller mean a page. `EditorState.create({ doc: text })` at `Tables/cellStatic.tsx:571` holds no facet and reads as a page, which is harmless because `wordAt` reads no scan, and E-6 replaces that path regardless.

**7-T10 — Inferred, Where It Meets Other Scouts:** Scout 6's *"A Value's Model Is Page-Shaped"* and Scout 8's *8-T25* are this same gap, and both close here. Scout 6's list rung (*6-T14*) reduces to which scope `ValueEditor` passes, and with `readsLists` read only in `inlineLines`, `canonicalizeCheckbox`, and `pushConstruct`, the rename to `'page' | 'lists' | 'inline'` touches less than its trial did. Scout 8's patch merged onto the scan change in 16 mechanical conflict hunks across 9 files, and *Numbering and Edges* in 21 hunks across 8 (*Engine Reconciliation*). That's the cost of landing this first, and the reason to land it first: the churn is 43 production files.

**Verdict — Take:** It's the largest removal in sight, every cell-side reader wants the narrower scan or doesn't care, and it asks nothing of the hot path. B-11 ratifies it.

---

#### 2 — Markers Masked in the Scan

**7-T11 — Observed, Half of This Is Already Scout 8's:** `lineMarker` in *Code-Block Parity Prototype* feeds `scan.markers`, null on plain code and parsed from the fence body on a Markdown block, and it's what *1-T6.3* proposed for fences. What's left is math and tables, and taking `readsFrom`, `Reader`, and `'outside'` down. Both forms exist: *Masked Markers* on Scout 8 alone, and *Scan Stack* on the scan change, which is the one that lands.

**7-T12 — Observed, Does `rescan` Still Equal `scanDoc`:** Yes. The window scans its own fences, tables, and math before its markers, and `splice` carries them per line (`Engine/docScan.ts:206`), so nothing new crosses the window's edge. Green at 6,000 seeds on the stack, four times the property's standing count, with Scout 8's Markdown fence lines in the alphabet, plus `docCache.test.ts`'s stepped atomics. `spanAt` per line adds under 0.5 ms to a whole-document scan and nothing measurable to a step.

**7-T13 — Observed, What the Fence Body Offset Does:** `parseListMarker(line.slice(body), body)` keeps every span line-relative and makes `level` block-relative. On `- p\n\t```md\n\t\t- a\n\t```\n` the item reads level 1, marker at 2, content at 4.

| Consumer | Reads | Effect |
| --- | --- | --- |
| `renumberRun` (`Engine/listModel.ts:280`) | `ls + markerStart`, `head.level` | Correct: a run flush in an indented block counts as top-level and keeps its base |
| `setList` (`Input/format.ts:385`) | `ls + markerStart`, `ls + contentStart` | Correct |
| `takeMarker` (`Input/edits.ts:189`) | `ls + markerStart`, `pfx` | Correct once `pfx` is `leadOf` |
| `continueListOnEnter`, Tab, Shift-Tab | `pfx`, `line.slice(pfx.length, markerStart)` | Correct: observed in an indented and a quoted fence, and Shift-Tab can't eat a fence's indent |
| `rolesAgainst` (`Engine/listModel.ts:66`) | `continuesList` on the raw line | Needed the body, which Scout 8 added |
| `collectBoundaries` (`Gestures/listDrag.ts:49`) | `line.from + markerStart` | Unreached: no glyph draws in a fence, so no drag starts there |
| `checkboxToggleChange` (`Engine/listModel.ts:31`) | A raw `parseListMarkerPrefixed` | Unreached for the same reason, and the one list read left off the scan |
| `pushConstruct` (`Engine/intents.ts:663`) | Its own `parseListMarker(inner)` | Unreached on a fence line. It can read the scan now it holds it, which is *1-T6.6*'s route to F-1's dead callout glyph. Not built |

**7-T14 — Observed, What Leaves:** `Reader`, `'outside'`, `readsFrom`, and `itemAt` all leave, down to 0 references, and `scan.markers[k]` is the answer. The reader becomes `region: number | undefined`, one compare, at 7 sites. `inSealedLine` leaves the list model and stays in the pick: `null` now means two things, not an item but writable, and sealed, and `listReach` has to tell them apart, because a range over math writes no markers there, while under C-5 a plain-code line takes one. So `outOfReach` keeps `(region === undefined && inSealedLine(scan, k))` for a pick from outside.

**7-T15 — Observed, What It Fixes:** F-1's list block swallowing a table's header row closes at its cause, with `isMarker` (`Engine/blockModel.ts:45`) reading null there: `  text\n→ a | b\n--|--\n` goes from a `list` block `{0, 14}` to a `paragraph` `{0, 6}`, and `- x\n→ a | b\n--|--\n` from `{0, 11}` to `{0, 3}`. `Guards/tableGuard.ts:39` becomes correct. `firstItemOf` leaves with D-2, and on the stack a list block always opens on a depth-0 item outside any fence: 60,000 fuzzed documents read none opening elsewhere, and `  ```md\n  x\n  ```\n- a` reads a `code` block and a `list` block.

**Verdict — Take:** It's +9 in lines, and it earns its place on the other columns. Today's raw `markers` and `itemAt` are two ways to read one fact, `blockContext` and `tableGuard` took the wrong one, and that's how F-1's table defect got in. After this a reader can't pick wrongly. Alone it needs a `regionOf` carrying a scope, a gated `leadOf`, and `itemAt` kept for the cell's parse, which is why it follows the scan change.

---

#### 3 — A List Tree

**7-T17 to 7-T20 — Observed, Declined:** One `perScan` pass restated what `rolesAgainst` states, at +22 lines and +2.0 ms on every Enter, Tab, and marker Backspace at 20,000 lines, while the walks shrink on their own once a blank line ends a list. Parity held: 60,000 seeded documents read 0 differences in `siblingsAt` or `subBlockAt`. *§Rejections* records the ruling, and `rolesAgainst` keeps its place as the one statement of how a line reads to an item.

---

#### The Order

**7-T21 — Inferred, Which Combination, and When:**

1. **One Scan Per Scope**, before any other list work. Nothing else depends on behavior it changes, and it lands first because every later step then writes its signatures once.
2. **Scout 8's Parity and the Masking**, as one step, since *Scan Stack* holds them together.
3. **Numbering and Edges** on that shape, in place of *Blank-Line Walks*.
4. **Paste Recount** on the numbering step's filter.

**7-T22 — For the Planner:**

- **`leadOf` Twice:** `Input/edits.ts` holds the fence-aware one, and `Engine/blockMove.ts` holds a private one meaning something else, so the private one takes another name.
- **`scan.fences[k]?.from`:** It's a field read at 7 sites, so it stays inline rather than behind a one-line `regionOf`.
- **F-1's `-[x]` in Plain Code:** Closed by the parity step (**Observed on the Stack:** null).
- **Statements That Stop Holding:** *Editor-Internals* line 18, line 40's "A code block is read only from inside it (`readsFrom`)", `detect.ts:508`'s "Every reader that walks a line takes the scope it is walking for", and `Input/edits.ts:229`'s "the scan, which is always page-shaped".

---

#### Dropped Findings

| Finding | Why |
|---|---|
| The source's plan, *Full Suite on the Stack*, and the stack's B-5 and tree rows | *Engine Reconciliation* carries the stack past them |
| 7-T16 | *Numbering and Edges* replaces *Blank-Line Walks*, and `Drop` keeps `line` for the landing run's start (*9-T5*); its 12 reds sit inside *Scouts/9*'s 17 |
| The Scratchpad note | About the run rather than the code |
