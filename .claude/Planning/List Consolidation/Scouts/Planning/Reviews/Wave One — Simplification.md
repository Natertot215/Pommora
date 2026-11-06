### Wave One — Simplification

**DATE:** 11-06-2026
**RANGE:** `b7f2f17a5..lc-final` at `3469266d1`, read outward across Core, Desktop, and UIX. Paths are relative to the repo root, and Engine paths sit under `Core/MarkdownPM/`.
**VERDICT:** The result is well below the before and its big moves hold, and about 50 further production lines can leave. 2 High, 6 Medium, 13 Low, with two of the Mediums noted disagreements rather than plain findings.

**How to Read This:** High means the plan's own stated claim is false in the tree, or a task can't be executed as written. Medium means a rule is stated twice, or a name or comment now says something false. Low means residue or a clarity win. *Lands In* names the task whose patch the fold belongs to. Estimates are production lines, and they assume the findings are taken together. No code was changed. The two measurements below ran from a throwaway bundle in the scratchpad, which is gone.

#### High

##### 1. Surfaces Still Pass a Scope the Scan Holds

- **Cite:** `Core/MarkdownPM/surface.ts:32-47`, `:39-40`; `Core/MarkdownPM/Menus/blockHandles.ts:13`, `:43-54`, `:148`, `:174-191`.
- **Mechanism:** Phase 1 left `blockHandles(scope)`, `pointerReveal(scope)`, `blockGestures(scope)`, and `BlockScope` standing, and its *Notes* hand them to this review. The Phase 1 checkpoint says "every reader that can ask the scan does", and *§Adherence* says "what does this surface read" has one answer. `blockGestures`' switch restates `readsLists`' arms exactly. `scope === 'page' && b.kind === 'blockquote'` holds a term that can't be false: a non-page scan's `callouts`, `quotes`, `headings`, `breaks`, and spans are empty, so `blockStarts` yields only `list` and `paragraph` there.
- **Change:**
  - `blockHandles` becomes a constant reading `docScan(state).scope`, and the blockquote branch drops its scope term.
  - `TagReveal` leaves `pointerReveal` as `export const tagReveal` and mounts in `MarkdownEditor.tsx:151-152` beside `codeHighlight` and `codeScroll`, the page's own list, since `.codeblock-language` exists nowhere else. That removes the mount-time branch rather than leaving a plugin that idles in a cell.
  - `pointerReveal()` takes no argument and stays a function, since `hotLine`, `cachedFrom`, and `textLeft` belong to one view. `cheapMiss` reads `view.state.facet(surfaceScope)`, as `decorations.ts:365` does, an O(1) read.
  - `blockGestures` and `BlockScope` leave, and the surface writes `readsLists(scope) ? [...] : []`. Phase 10's call holds: a field still mounts nothing.
- **Estimate:** -13 (`surface.ts` -9, `blockHandles.ts` -6, `MarkdownEditor.tsx` +2). Comments ±0, with `:147` split between the two.
- **Lands In:** Task 1-1, with Tasks 6-1 and 10-1 following. `blockHandles.test.ts:41` mounts the three.

##### 2. Twelve Named Patches Don't Exist, and the Checkpoints Point at a Placeholder

- **Cite:** Plan lines 184, 188, 973, 1039, 1043, 1060, and the AFTER of Tasks 0-1, 1-2, 2-3, 3-4, 4-2, 5-2, 6-3, 7-5, 8-2, 9-6, 10-4, and 11-1.
- **Mechanism:** *§Plan Rules* says a task's AFTER is its patch, as if inlined. Twelve of the 35 patches the plan names aren't in `Scouts/Planning/Phases/`: *Phase 0 — Drive Frame*, *Drive Groups 1* to *10*, and *Phase 11 — Docs and Issues*. `{DRIVE-TABLE}`, `{WHEN-TABLE}`, `{GROUP-9}`, `{GROUP-10}`, `{GROUP-10-VERIFY}`, and `{DOCS}` are unfilled, and every checkpoint gates on *§When Drives Run*, which is `{WHEN-TABLE}`. An executor can't tell what those checkpoints require.
- **Change:** Save the patches from `lc-drive` and fill the placeholders before ratification. The *Build Log* reads this work as in flight, so this may close on its own; it's recorded so ratification can't pass over it.
- **Estimate:** 0 production lines.
- **Lands In:** The plan.

#### Medium

##### 3. C-2's Mask Is Written Six Times (Noted Disagreement)

- **Cite:** `Engine/listModel.ts:104`, `:127`; `Gestures/listDrag.ts:41`; `Input/format.ts:322-323`; `Engine/intents.ts:357`; `Engine/blockModel.ts:46`.
- **Mechanism:** *Calls Taken* keeps `regionOf` inline as "a field read at 7 sites", and that stands. What repeats here is a different thing the decline didn't price: the compound rule, `scan.fences[k]?.from === region ? scan.markers[k] : null`, which is the whole of C-2. It's spelled that way at four sites, and at two more as `region === undefined` in different syntax (`scan.fences[i] ? -1 : …`, `scan.fences[i] === undefined && …`), built by Phases 2, 3, and 7 separately. The plan says "one field compare carries C-2".
- **Change:** One `markerIn(scan, k, region)` beside `fenceDelimiter` in `Engine/docScan.ts`, with no doc line. All six read it, `listReach`'s `markerAt` closure leaves, and `levelAt` keeps its one line. If this reads as reopening the call, leave it and record it as Not Taken.
- **Estimate:** ±0 lines, six statements to one.
- **Lands In:** Task 2-1, with Tasks 3-3 and 7-4 following.

##### 4. `LIST_KINDS` Names Two Unrelated Things

- **Cite:** `Core/MarkdownPM/Menus/blockHandles.ts:26`; `Core/Actions/gripMenu.ts:35`; Task 6-1.
- **Mechanism:** Task 6-1 renamed the private `CELL_KINDS` to `LIST_KINDS`, a one-member `Set` of block kinds, while *§Adherence* and Task 7-1 use `LIST_KINDS` for the wording table in Actions. A search for the name finds both.
- **Change:** The set leaves with finding 1, for `b.kind === 'list' || (page && GRIP_KINDS.has(b.kind))`. Its comment stays on that line. Task 6-1's sentence on `CELL_KINDS` changes to match.
- **Estimate:** -2.
- **Lands In:** Tasks 1-1 and 6-1.

##### 5. `pageChrome`'s Name and Comment Describe a Gate Phase 1 Removed

- **Cite:** `Engine/intents.ts:165-167`, `:346`.
- **Mechanism:** Line 166 reads "A cell holds no box, no fence, no math and no citation row… so none of this is walked there." Phase 1 removed the `scope === 'page'` gate, so `lineIntentsInto` now walks it on every surface, and empty arrays make it answer 0. The comment is false and neither the plan's *§Reconciliation* nor the *Comment Ledger* lists it.
- **Change:** Line 166 leaves, and `pageChrome` takes a name that fits every surface, such as `lineChrome`.
- **Estimate:** 0 lines, comments -1.
- **Lands In:** Task 1-1.

##### 6. `checkboxToggleChange` Parses a Line the Scan Already Read

- **Cite:** `Engine/listModel.ts:25-30`; `Gestures/listDrag.ts:62`; `Tables/cellStatic.tsx:518`; `Engine/detect.ts:615-618`.
- **Mechanism:** Phase 5's *Notes* excuse it as reading a string rather than a scan line, but that's only its signature. `listDrag` already reads `docScan` beside it, and a resting cell can read one. It's the last caller of `parseListMarkerPrefixed` outside `lineMarker`, and in a cell it reads a quote prefix the cell's scan doesn't. No glyph draws on such a line, so nothing changes for a user.
- **Change:** `checkboxToggleChange(scan, pos)` reads `scan.markers`. `parseListMarkerPrefixed` folds into `lineMarker`, and `listModel.ts`' `lineStartAt`, `lineEndAt`, and parser imports leave, as does `listDrag.ts`' `docString`.
- **Estimate:** -6. `listModel.test.ts:212-221` take a scan, and `detect.test.ts:221-240` read `lineMarker`.
- **Lands In:** Task 1-1 or 5-1.

##### 7. Zero-Argument Factories With Nothing to Close Over (Noted Disagreement)

- **Cite:** `Core/MarkdownPM/decorations.ts:680`, `:806`, `:810`; `Autocomplete/acQuery.ts:46`; `Autocomplete/useConnectionAutocomplete.ts:48`.
- **Mechanism:** Phase 1's *Calls Taken* kept `markdownDecorations()`, `decorationPlugin()`, and `caretSeat()` as functions for two reasons. One was the idiom of `citationPointer()` beside them, but that idiom carries real state: `pointerHandlers` holds `editingOnPress` and `actedOnLink` per mount (`Gestures/pointerPath.ts:33-36`). The other, parallel builds beside the file, has expired. None of these three holds any, and neither does `acQuery`, whose only argument was `scope`, since a `StateField`'s value is already per state.
- **Change:** The rule becomes that a factory stays only where a mount needs its own closure state, which keeps `linkPointer()`, `citationPointer()`, and `pointerReveal()`. The four above become constants, `decorationPlugin` moving above `markdownDecorations`. `useState(acQuery)` leaves and `field` reads `acQuery`.
- **Estimate:** -9, with about 120 lines of `caretSeat` reindented. Five test lines change.
- **Lands In:** Task 1-1.

##### 8. Names the Rename Made False

- **Cite:** `Core/MarkdownPM/surface.ts:50`; `Engine/docScan.ts:72`; `Tables/cellStatic.tsx:436`; `Core/MarkdownPM/textScope.test.tsx`.
- **Mechanism:** Task 6-1 gave `inline` a meaning, so `inlineSurface('page')` now contradicts itself, and `inlineLines` also serves `'lists'`, which reads lists. `showSource` paints a highlight since Task 9-4. `textScope.test.tsx` holds no `text` scope, and its `describe('a word')` block isn't about a scope at all. Phase 6's *Calls* deferred that rename to "Phase 11 could take it", and Task 11-1 doesn't.
- **Change:** `inlineSurface` becomes `sharedSurface`, `inlineLines` becomes `literalLines` (its doc already says "literal"), and `showSource` becomes `paintSeat`. The test file becomes `inlineScope.test.tsx`, which *§Placements* has to name, since it forbids every other move.
- **Estimate:** 0 lines.
- **Lands In:** Tasks 6-1 and 9-4, and *§Placements*.

#### Low

##### 9. `seatPastMarker`'s Walk Twins `prefixEndAt`

- **Cite:** `Engine/intents.ts:545-557`, `:568-576`.
- **Mechanism:** Task 9-5 moved `seatPastMarker`'s start to the line's start, which left two fixed-point loops over one line's intents that differ only in the test.
- **Change:** One private walk taking the test.
- **Estimate:** -4.
- **Lands In:** Task 9-5.

##### 10. `pushConstruct` Takes What `scan` Already Holds

- **Cite:** `Engine/intents.ts:343-352`, `:591-600`.
- **Mechanism:** Task 7-3 added `scan` and kept `lm`, `line`, and `ls`, so eight parameters carry three derivable ones.
- **Change:** `pushConstruct(intents, scan, i, base, selStart, ranged)`, with `md-list-text`'s push moving into it, which lets `lineIntentsInto` drop its own reads.
- **Estimate:** -5.
- **Lands In:** Task 7-3.

##### 11. "Which Block Seals This Line" Is Asked Twice

- **Cite:** `Engine/listModel.ts:32-36`; `Engine/docScan.ts:419-426`.
- **Mechanism:** `openerOf` and `inSealedLine` run the same three-way lookup, one returning the block and one a boolean.
- **Change:** One `sealedBlock(scan, k)`, with `inSealedLine` reading it and `openerOf` taking its `from`. `scanLines`' `:116-120` can't join, since no scan exists there yet.
- **Estimate:** -3.
- **Lands In:** Task 3-3.

##### 12. `outOfReach`'s Terms Overlap

- **Cite:** `Input/format.ts:353-357`.
- **Mechanism:** With `region === undefined`, `!inRegion(k)` and `fenceDelimiter` are both inside `inSealedLine`, so a plain block's lines are tested up to three times. With a region set, `inSealedLine` is skipped.
- **Change:** `scan.callouts[k]?.first || (region === undefined ? inSealedLine(scan, k) : !inRegion(k) || fenceDelimiter(scan, k))`, one reading per branch. The reach is unchanged by the subset argument, and `format.test.ts`' prose-through-the-block case and `listRenumber.test.ts`' wholly-inside case are its pins.
- **Estimate:** ±0, clarity only.
- **Lands In:** Task 2-1.

##### 13. `surfaceEditItems`' Switch Only Ever Sees Literals

- **Cite:** `Core/Actions/editorMenu.ts:58-74`; `Desktop/Actions/editorMenu.ts:62`, `:122`.
- **Mechanism:** Both callers pass a literal, since Desktop has already branched on `===`. The switch selects nothing, and `canPaste = false` exists for one arm. A single `switch (editor?.req.menu)` in Desktop reads worse, since the live and resting arms interleave.
- **Change:** Two row lists sharing `copy`, such as `restingRows` and `shortRows`, which drops the parameter, the `Exclude`, and the default without bringing back the name *§Concepts* removes.
- **Estimate:** -3.
- **Lands In:** Task 9-3, with *§Concepts*' `surfaceEditItems` mention following.

##### 14. `Extent` Restates `BlockSpan`

- **Cite:** `Core/MarkdownPM/Menus/menu.ts:19`; `Engine/detect.ts:70`; `Links/pasteLink.ts:39`, `:134`.
- **Mechanism:** Phase 9's *Notes* checked the name against `Span`, the tuple, and never against `BlockSpan`, which is the same shape.
- **Change:** `Extent` leaves for `BlockSpan`, and `pasteLink.ts`' two inline spellings take it too. `BlockSpan` reads a little oddly on a selection, so this one is the fold's judgment.
- **Estimate:** -1.
- **Lands In:** Task 9-2.

##### 15. `subBlockAt`'s Null Guards a State Nothing Produces After Task 7-3

- **Cite:** `Engine/listModel.ts:88-90`, `:106`; `Input/format.ts:324`; `Gestures/listDrag.ts:75`, `:87-88`.
- **Mechanism:** Its one producer was a callout head's glyph with no marker, which Task 7-3 removes. Traced: every remaining glyph comes from a `pushConstruct` branch holding `lm`, and `ReactWidget` keeps `ignoreEvent`'s default, so an outer view never sees a table's or tile's glyph. `ownersOf` and `listReach` already assert it with `!`.
- **Change:** `subBlockAt` returns `BlockSpan`. The check, `listDrag`'s `if (!block)`, both `!`s, and `listModel.test.ts:67` leave, and `:75` loses its last clause.
- **Estimate:** -3.
- **Lands In:** Task 7-3.

##### 16. `tokenHidden` Tokenizes as a Page and Hides as a Cell

- **Cite:** `Engine/subfieldStats.ts:57-66`.
- **Mechanism:** `tokenize(text)` sits at the page default while `hiddenOf` reads `scope`. It's the twin Phase 1 fixed in `cellTokens` and `pastedCellText`. It isn't a defect: eight single-line shapes tokenized the same under both scopes, and a cell's text is one line here.
- **Change:** `tokenize(text, scope)`.
- **Estimate:** ±0.
- **Lands In:** Task 1-1.

##### 17. `asText` Reads `linkEntry` Twice

- **Cite:** `Core/Properties/propertyValue.ts:39-45`.
- **Change:** `linkEntry(raw, 2) ?? (Array.isArray(raw) ? … : yamlInline(raw))`, with `inlineText` kept for a member.
- **Estimate:** -1.
- **Lands In:** Task 10-3.

##### 18. The List Knobs Sit in Two Homes

- **Cite:** `Core/MarkdownPM/markdown-pm.css:13-16`, `:60-61`, `:376`.
- **Mechanism:** Phase 10 moved four knobs to `:root` for a resting value and left `--list-indent` and `--bullet-zone` on `.cm-content`, and the comment at `:376` now explains the split. Neither is overridden anywhere.
- **Change:** Both join `:root`, and the comment loses its clause.
- **Estimate:** ±0.
- **Lands In:** Task 10-2.

##### 19. Small Residue

- **Cite and Change:** `Gestures/listDrag.ts:51`'s `line.number - 1` restates `k` from `:40`. `takeMarker` re-derives `k` that its one caller holds (`Input/edits.ts:182-192`, `:224`). `Input/markdownInput.ts:283` says "both surfaces" of three.
- **Estimate:** -1.
- **Lands In:** Tasks 3-3 and 6-2.

##### 20. Tests

- **`decorationsFor`:** `Core/Testing/markdownEngine.ts:54-55` takes `scan` and `scope`, though a scan now carries its scope, and six callers pass `undefined` to reach the second (`cellLists.test.tsx:78`, `:86`, `:308`, `textScope.test.tsx:60`, `:73`, `:78`). `scope` leaves and they pass `scanDoc(text, 'lists')`, -2.
- **Redundant:** `edits.test.ts`' "gives its marker up on backspace" sits inside "takes every list key". `format.test.ts`' "a list pick reaches no line past the ones it touches" subsumes "writes its marker before what the line holds". Each pair can be one.
- **Process Residue:** `blockMove.test.ts`' "(the reviewer-flagged case)" and "(blockAt feeds the range)" name history rather than behavior.
- **Mechanism Pins:** None found that a behavior pin could replace. *answers ahead of a fence's language* looks like a `Prec` pin and is really a user-visible rule.

##### 21. Plan Weight

- **`§Adherence`:** Seven bullets of self-assessment that no one acts on, and findings 1 and 3 make two of them false. Correct those two, or remove the section if the plan's shape allows it, since the checkpoints and *§Completion Criteria* already hold what's testable.
- **Stated Twice or More:** the cold machine (*§Constraints*, *§Completion Criteria*, *§Final Verification*) and the review waves (*§Constraints · Reviews*, *§Final Verification*). Each can keep one home and a citation.

#### Ledger Effects

Taken together these move Actionable from -252 to about -300 and comments from 3,506 to 3,505, against the cap of 3,511, with finding 5 the only comment that moves. Phase 1's rows move most, so every later *Net Ledger* and *Comment Ledger* row shifts, and *§Concepts*' rows for `Extent`, `surfaceEditItems`, and `levelAt` need a look.

#### What I'd Keep Exactly

- **The Engine's Spine:** `surfaceScope` with `DocScan.scope`, `lineMarker`, `continuesList` and `ridesList`, and `openerOf` private. `listModel.ts` at 185 lines and `listRenumber.ts` at 48 read as designed.
- **`renumberRuns` With `held`, `runsAround` With `seen`, `fenced` and `heals`:** each earns its place, and `seen` has no simpler form that avoids two recounts of one list.
- **`LIST_TYPES` and `LIST_KINDS` Apart:** no new reason appeared.
- **`contractions`:** one regex, one answer, and the cleanest removal in the range.
- **`listKeys(scope)`'s One Branch:** Phase 6's mutation shows it's load-bearing, and it reads at mount, where three run-time checks would read worse.
- **`inlineSurface` Apart From `editorBase`:** the two docs carry a real split, so it takes a name rather than a merge.
- **The Resting Cell's Uncached `scanDoc(text, 'lists')`:** measured at 0.48 µs per cell against 0.16 for the parse it replaced, so a cache buys nothing and the plain literal reads fine.
- **The Delimiter Refusals at Their Writers:** one guard at `editFor` would need a row list, since `block:code`, `block:hr`, and `block:table` pass, and `toggleInline` reads a trimmed `from`. It costs what it saves.
- **`MarkdownEditor`'s Shell Stop:** moving it into `editorMenu` looks cleaner but misses a resting cell's ask, which bubbles through React.
- **The Remaining Page Compares:** `smartDelete`'s is load-bearing, since a cell's scan keeps its markers and Backspace would start taking `[^1]` whole; `menu.ts:97`'s, since both seats answer true on an empty scan; `pushConstruct`'s, since `scan.headings` reads the raw line and `inner` sits past a quote; `edits.ts:227`'s, since reading `scan.headings[k]` only trades it for a longer test.
- **Line-Level `tokenize` on the Page Default:** `format.ts:92`, `:144` and `edits.ts:571` read one line, where the scopes agree.

#### Not Re-Raised

The one-table type definition, `regionOf` as a field read, `readsLists` as a switch, a field mounting no block gestures, `quoteDepths`, `rolesAgainst`'s body read, `seated` and `onItemEnter`, and a capability predicate for I-036.
