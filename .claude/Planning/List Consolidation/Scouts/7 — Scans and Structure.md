### 7 — Scans and Structure

**DATE:** 11-05-2026
**COMMIT:** `b7f2f17a5`
**SCOPE:** The log's two *§Prospects* and Scout 1's *1-T6.3*, built in a throwaway worktree and read against the log as ratified, including the rewritten C-3, C-5, and C-7.
**RUN:** Every prototype compiled under `tsc -p Core`, `Core/tsconfig.src.json`, and `Desktop/tsconfig.web.json`, passed Biome, and ran through vitest. Nothing ran against the app. Cites are to `b7f2f17a5`, under `Core/MarkdownPM/` unless stated.

#### The Verdicts

| Idea | Production Delta | Reds | Cost at 20,000 Lines | Verdict |
| --- | --- | --- | --- | --- |
| **One Scan Per Scope** | **-87** (+502 / -589) on its own | 0 behavior, 37 mechanism before the test migration | None | **Take**, first |
| **Markers Masked in the Scan** | **+9** (+48 / -39) on the stack, **+12** without the scan change | 0 beyond Scout 8's five | None | **Take**, finishing what Scout 8's patch starts |
| **A List Tree** | **+22** (+71 / -49) on top of the blank-line walks | 0 new; parity holds | +2.0 ms on every list edit | **Leave** |

**The Plan I'd Make:** one scan per scope, then Scout 8's parity, then the rest of the masking, then B-5 on the walks as they stand. That lands at **-48 (+632 / -680)** with every C ruling and B-5's walk changes delivered, against Scout 8's +56 on today's shape. The tree stays out.

#### The Stack

Each row is measured on the row above. The cumulative patch is `Scouts/Planning/<Patch>.patch`, which applies to `b7f2f17a5`.

| Step | Step Delta | Cumulative | Reds | Patch |
| --- | --- | --- | --- | --- |
| One scan per scope | -87 (+502 / -589) | -87 | 0 of 1,996 in `Core/MarkdownPM` | *Scan Per Scope* |
| Scout 8's parity | +54 | -33 (+601 / -634) | Scout 8's five, 2,256 passed, as it measured alone | not saved apart |
| Finish the masking | +9 (+48 / -39) | -24 (+618 / -642) | The same five, 2,256 passed | *Scan Stack* |
| B-5 on the walks | -24 (+19 / -43) | **-48 (+632 / -680)** | +12, all loose-list pins | *Blank-Line Walks* |
| The list tree | +22 (+71 / -49) | -26 (+680 / -706) | +0 | *List Tree* |

**The Alternative Without the Scan Change:** Scout 8 alone is +56 (+125 / -69), and masking on top of it is +12 (+59 / -47), for +68 cumulative. That's *Masked Markers*, with the same five reds.

**The Count:** `git diff -U0 -- . ':!*.test.*'`, lines beginning `+` or `-` that aren't blank and don't open with `//`, `/*`, or `*`. It reproduces Scout 8's +125 / -69 exactly. The gross figures run high because a factory that becomes a constant reindents its body; `git diff -w` gives +360 / -447 for the scan change, the same net of -87.

**Comments:** The scan change is +1 (+9 / -8). The stack is +4 (+14 / -10), of which Scout 8 brings +5. The tree adds +1.

**Full Suite on the Stack:** 9,116 passed, 2 skipped, and the 5 reds of *8-T31*. `citationBreakage` and `embedAbsorb` went red in some loaded runs and passed alone every time, which is Scout 8's load finding again.

---

#### 1 — One Scan Per Scope

**7-T1 — Observed, The Mechanism:** A facet beats a parameter, and the count settles it. `docScan` reads as a parameter at about 45 of its 100 production sites that run on a cell or Text surface, and many hold no scope to pass (`caret.ts:60`, `Links/pasteLink.ts:112`, `Citations/citationPointer.ts:55`, `Gestures/blockDrag.ts:31`). The other 55 sit in page-only modules and would take a literal or a default, which is the I-036 problem restated. A facet, `surfaceScope`, stated once in `inlineSurface` (`surface.ts:48`), changes each site by deleting `.doc`: `docScan(view.state.doc)` becomes `docScan(view.state)`. `perScopedDoc` (`docCache.ts:75`) keeps its shape and reads the facet, so `docScan`, `docLineIntentsOf`, and `docAtomics` are three instances of one thing. Five sites keyed on a `Text` take `docScan.of(doc, 'page')`, each a page-only derivation (`docCache.ts:95`, `folding.ts:52`, `:67`, `Tables/widget.tsx:489`, and `docLineIntentsOf`'s own derive). Two `tr.newDoc` sites become `docScan.after(tr)`.

**7-T2 — Observed, What Leaves:** `scope` goes from every list, key, intent, and format function, and from most extension factories.

| Measure | `b7f2f17a5` | Scan Change | Stack |
| --- | --- | --- | --- |
| `scope` mentions, production `Core/MarkdownPM` | 228 | 79 | 78 |
| `scope:` declarations, production `Core` | 75 | 22 | 22 |
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

**7-T7 — Observed, Nothing Pinned These Changes:** All of *7-T5*'s behavior moved with no test red. The cell's literal-construct behavior has no pins at all, so the plan should add them, since the drives are being rewritten anyway (A-6).

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

**7-T9 — Inferred, What Stays and Why:** 15 compares remain, and most are a surface choosing behavior rather than a reader guessing what it reads: `blockHandles` ×4, `editorMenu`'s `page`, `typedInput` and `smartDelete`'s page-only writers, `drawsRawHtml`, and `subfieldStats`. `autocomplete.ts:105`'s `!== 'cell'` is *6-T10*'s drift, which reads as a fix of its own. That's I-036 at its natural floor for this work: closed for readers, open for surfaces, and a capability predicate buys little over 15 sites. `scanDoc`'s `'page'` default is the one I'd keep, since about 500 test sites and every non-editor caller mean a page. `EditorState.create({ doc: text })` at `Tables/cellStatic.tsx:571` holds no facet and reads as a page, which is harmless because `wordAt` reads no scan, and E-6 replaces that path regardless.

**7-T10 — Inferred, Where It Meets Other Scouts:** Scout 6's *"A Value's Model Is Page-Shaped"* and Scout 8's *8-T25* are this same gap, and both close here. Scout 6's list rung (*6-T14*) reduces to which scope `ValueEditor` passes, and with `readsLists` read only in `inlineLines`, `canonicalizeCheckbox`, and `pushConstruct`, the rename to `'page' | 'lists' | 'inline'` touches less than its trial did. Scout 8's patch merged onto the scan change in 16 mechanical conflict hunks across 9 files, costing 2 lines less than it does alone, and every other prototype cut from `b7f2f17a5` will rebase the same way. That's the cost of landing this first, and the reason not to land it late: the churn is 43 production files.

**Verdict — Take:** It's the largest removal in sight, it was the least certain only because nobody had tried it, and the worry that some cell-side reader wants the page's answer didn't survive contact with one. It deletes a guideline's worth of trap, closes a class of defect at its cause, and asks nothing of the hot path.

---

#### 2 — Markers Masked in the Scan

**7-T11 — Observed, Half of This Is Already Scout 8's:** `lineMarker` in *Code-Block Parity Prototype* feeds `scan.markers`, null on plain code and parsed from the fence body on a Markdown block, and it's what *1-T6.3* proposed for fences. What's left is math and tables, and taking `readsFrom`, `Reader`, and `'outside'` down. I built both forms: *Masked Markers* on Scout 8 alone, and *Scan Stack* on the scan change. C-3, C-5, and C-7 were rewritten while I worked, so my first build, which refused a plain-code pick, was replaced by these.

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

**7-T14 — Observed, What Leaves, and Where *1-T6.3* Overcounted:** `Reader`, `'outside'`, `readsFrom`, and `itemAt` all leave, down to 0 references, and `scan.markers[k]` is the answer at 16 sites. The reader becomes `region: number | undefined`, one compare, at 7 sites. `inSealedLine` does **not** leave the pick. `null` now means two things, not an item but writable, and sealed, and `listReach` has to tell them apart, because a range over math must not write markers there, while under C-5 a plain-code line must take one. So `outOfReach` keeps `inSealedLine` for a pick from outside. The test *1-T6.3* wanted to add to `outOfReach` runs the other way under C-5.

**7-T15 — Observed, What It Fixes:** F-1's list block swallowing a table's header row closes at its cause, with `isMarker` (`Engine/blockModel.ts:45`) reading null there: `  text\n→ a | b\n--|--\n` goes from a `list` block `{0, 14}` to a `paragraph` `{0, 6}`, and `- x\n→ a | b\n--|--\n` from `{0, 11}` to `{0, 3}`. `Guards/tableGuard.ts:39` becomes correct. `firstItemOf`'s runaway loses its cause, since a list block now always holds an item outside any fence (Inferred). The fence test stays in `firstItemOf`, because a block can open on an indented Markdown fence.

**Verdict — Take:** It's +9 in lines, which is a wash, and it earns its place on the other columns. Today's raw `markers` and `itemAt` are two ways to read one fact, `blockContext` and `tableGuard` already took the wrong one, and that's how F-1's defect got in. After this a reader can't pick wrongly. It reads better after the scan change: alone it needs a `regionOf` carrying a scope, a gated `leadOf`, and `itemAt` kept for the cell's parse, at +12 and with the residue this work exists to remove.

---

#### 3 — A List Tree

**7-T16 — Observed, What B-5 Does to the Walks:** It helps the walks more than it helps a tree. `continuesList` loses `'blank'`, `ListRole` loses a member, `subBlockAt`'s loop becomes one line, and `renumberRuns`'s and the filter's blank-skips leave. `dropChanges` loses `gapBefore` and the seam reading whole, `MoveSeams` becomes one boolean, and `Drop` loses `line`. That's -24, and 12 reds, every one a blank-line pin, read for this: `intents.test.ts`' loose rail; `listModel.test.ts`' *moves a bullet item down past a sibling*, *renumbers source + destination runs*, *renumbers when moving the first item down*, and *includes deeper-indented descendants*; `format.test.ts`' *reads a code, math, or quote block and a loose paragraph*; and `listRenumber.test.ts`' *counts on through a loose list*, *a line a blank apart joins the run*, *a pick over a numbered item restarts*, *paragraphs apart by blank lines*, *switching a numbered item out of its run*, and *closes the gap across a loose list*. They leave or lose their loose half under A-4.

**7-T17 — Observed, The Prototype:** One `perScan` pass over the lines with two stacks, one for the page and one for the Markdown block it's inside, filling `parent`, `prev`, `next`, `end`, and `owner` per line. `siblingsAt`, `subBlockAt`, `ownersOf`, and the filter's walk become lookups, and `rolesAgainst` leaves. It's **+22**. The pass restates what `rolesAgainst` states, in a harder shape, and the consumers it simplifies were already small after B-5. `listModel.ts` goes from 271 lines to 296.

**7-T18 — Observed, Parity:** Against the B-5 walks, across 60,000 seeded documents and 569,260 lines on both scopes, with an alphabet of lists, quotes, fences, math, and tables: 0 differences in `siblingsAt` or `subBlockAt`. `ownersOf` differs on 62 lines, all where the tree finds an owner the walk misses, because the walk's early break on a level-0 item (`Engine/listModel.ts:139`) stops short inside an unclosed `$$` spanning a fence. The orphan asymmetry *1-T6.7* worried about turned out harmless, since `\t- a\n- b` reads as two roots either way.

**7-T19 — Observed, The Cost:** Medians in ms at 20,000 lines, each including one `rescan`, which is what makes a fresh scan object.

| Call | Mixed Page: Walk | Mixed Page: Tree | One 20,000-Line List: Walk | One List: Tree |
| --- | --- | --- | --- | --- |
| `rescan` alone | 0.70 | 0.70 | 0.32 | 0.32 |
| `subBlockAt` | 0.61 | 2.70 | 0.30 | 2.39 |
| `ownersOf` | 0.61 | 2.66 | 0.30 | 2.40 |
| `siblingsAt` | 0.62 | 2.72 | 1.11 | 3.49 |

A plain keystroke never reads the tree: `listRenumber` skips an edit that touches no whole sequenced marker, and typing reads no walk. So it doesn't break the hard rule on typing, and it does trade local walks for whole-document work on every Enter, Tab, and marker Backspace. `perScan` keys on the scan object, and `rescan` makes a new one per transaction, so nothing carries between versions.

**7-T20 — Inferred, Rails Can't Pay For It:** `withRails` already runs `railIntents` over the whole document on every step (`Engine/intents.ts:492`, 0.51 to 0.69 ms), which is the offset *1-T6.7* hoped for. Reading rails off the tree would turn the 2.0 ms pass into a per-keystroke cost to replace a 0.6 ms one, unless the tree stepped, and stepping it is a new step function and a new seeded property, against "don't derive a version from nothing." The rails' fix is *1-T6.6*, which needs none of this.

**Verdict — Leave:** B-5 made it clearly worse rather than better. The ruling takes the walks' worst branches for free, the tree still costs a second statement of the same rule, and it arrives with 22 more lines and 2 ms more per list edit. `rolesAgainst` keeps its place as the one statement of how a line reads to an item. *1-T6.9* was right to keep it.

---

#### The Order

**7-T21 — Inferred, Which Combination, and When:**

1. **One Scan Per Scope**, before any other list work. Nothing else depends on behavior it changes, and it's green alone. It lands first because every later phase then writes its signatures once, with no `scope` to carry, and masking and parity never write the gates they'd otherwise add (`regionOf`, `scope === 'page' ? scan.fences[k] : undefined`).
2. **Scout 8's Parity**, as planned.
3. **The Masking**, with it or straight after. It's small and it closes F-1's table defect.
4. **B-5 on the Walks**, then the numbering and rails work on that shape.

**7-T22 — Observed, For the Planner:**

- **`leadOf` Twice:** Scout 8 and I each named it in `Input/edits.ts`, and `Engine/listModel.ts:150` already holds a private `leadOf` meaning something else. The private one should take another name.
- **`scan.fences[k]?.from` at 7 Sites:** It's the one compare, and a small `regionOf` over it may read better. I left it inline to keep the count honest.
- **F-1's `-[x]` in Plain Code:** Scout 8's patch closes it. It takes one condition on the scan once `canonicalizeCheckbox` takes the scan, which both patches do.
- **Statements That Stop Holding:** *Editor-Internals* line 18, line 40's "A code block is read only from inside it (`readsFrom`)", `detect.ts:508`'s "Every reader that walks a line takes the scope it is walking for", and `Input/edits.ts:229`'s "the scan, which is always page-shaped".
- **Scratchpad:** Other scouts share the scratchpad, and one of my throwaway benches disappeared mid-run. The numbers above come from a recreated copy, run on both trees in one session.
