## MarkdownPM — Clean-Slate Scoping

What the editor needs before footnotes are built on top of it. Six read-only passes covered the
decoration hot path, the pointer layer, the stylesheet, the Tables sub-module, the input and block
model, and the module's own seams. Findings are marked **Verified** where the cited code was opened
and the reasoning re-derived by hand, and **Reported** where the pass's account is plausible and
internally consistent but was not independently re-checked.

Every finding names a file and a line. Line numbers move; re-open before acting.

### The Live Bugs

Five of these are reachable in ordinary use, and none of them are footnote work. They are listed
first because the feature inherits whatever state the editor is left in.

**A menu action writes into tabs that were never opened.** *(Verified.)* Choosing anything from the
editor's right-click menu applies to the focused editor and to every parked tab's editor, each of
which autosaves its own file. `on()` at `preload/index.ts:21` builds a fresh listener per call and
registers it with `ipcRenderer.on`, so the shared `nativeEditorMenu` seam at `editor/menu.ts:29`
accumulates one handler per mounted editor rather than replacing. `applyEditorAction`
(`editor/menu.ts:67`) carries no focus check and dispatches into whichever view it was closed over.
`DetailPane.tsx:202` keeps up to `WARM_TABS` parked `PageView`s mounted, and `PageView.tsx:126`
mounts each with `menu={nativeEditorMenu}` and no `readOnly`, its `onChange` calling
`schedulePageSave` against that tab's own path. The `changeFilter` at `index.tsx:190` that protects
resting embeds fires only on `tr.startState.readOnly`, which a parked page editor is not. The
trailing `view.focus()` means the last editor to receive the broadcast also takes focus, and the
shared `lastState` in `main/editorMenu.ts:24` is clobbered by parked editors pushing
`focused: false`, which can empty the next menu. The same call site already reads
`if (!parked) registerPageEditor(view)` four lines below the menu prop, so parked-ness was handled
here for the registry and not for the menu. Gating `applyEditorAction` on `view.hasFocus` closes
all three symptoms.

**An unclosed fence makes every build parse the whole document and emit corrupt ranges.**
*(Verified.)* `scanFencedCode` gives an unclosed block `contentEnd = close + 1`
(`detect/index.ts:91`), so every line below the opener is `role: 'content'` and none is
`role: 'open'`. `sliceStartLine` (`editor/decorations.ts:189`) advances while a line has a fence and
is not an opener, so it runs past the end and returns `lines.length`; `scan.lineStarts` has no such
index. The `undefined` that comes back defeats the `a >= b` skip at `editor/decorations.ts:207`
(the comparison is false rather than true), makes `text.slice(undefined, b)` slice from offset zero,
and gives `shiftToken` a `NaN` base. `editor/decorations.ts:299` does not drop the results, because
`NaN <= NaN` is also false. So the state that exists every time a fence is opened and not yet closed
costs a full-document parse per keystroke and puts `NaN`-ranged decorations into the set. The
regression pin at `regression-pins.test.ts:303` exercises closed fences only. The fix is a sentinel
at `lineStarts[n]`, or a clamp in `sliceStartLine`.

**A broken markdown link cannot be clicked into, and clicking it opens its own garbage.**
*(Verified.)* `editor/links.ts:119` guards `hit.target.kind !== 'invalid'` for the right press and
nothing guards the left one: the press reaches `event.preventDefault(); return true` at
`editor/links.ts:129`, which CM6 treats as "handled, stop", so no caret can be seated in the label
of a link that needs repairing. `click` at `editor/links.ts:139` tests only `hit?.onText`, so an
invalid target falls to the `else openWebLink(hit.url)` branch at `editor/links.ts:150`. Main
rejects a malformed address at `main/index.ts:1457`, but the in-app route does not validate. The two
neighbouring handlers in the same file, `mouseover` at `:89` and `contextmenu` at `:165`, both carry
the guard.

**A wikilink inside an entered table cell has no gestures at all.** *(Verified.)*
`Tables/CellEditor.tsx:112` installs `markdownLinkClicks` and not `connectionClicks`, so `[[Page]]`
in an open cell does not navigate, does not preview, and has no menu. The same cell at rest does all
three, through the `data-conn-title` stamp at `cellStatic.tsx:42` read by `TableView.tsx:128`. The
comment directly above the extension list states that a link in a cell behaves "the same as one in
the body," which holds for `[label](url)` only.

**Show Line Count breaks a code block nested in a callout or a blockquote.** *(Verified.)*
`Styles.css:1018` matches at specificity (0,5,0) against the nested-box rule at `Styles.css:797` at
(0,4,0), so with the setting on, a nested block loses `--cb-inset` and falls back to a hardcoded
`12px`, detaching its text from the gutter `Styles.css:799` establishes. At top level the numbers
coincide — `--cb-inset` is `0px` and `--cb-pad` is `12px` — which is why it reads as correct
everywhere else. Routing the literal through `var(--cb-pad)` and raising the nested rule's weight
fixes both halves.

**Adjacent, outside the editor:** `COPY_SCOPES` at `main/remint.ts:139` carries four of the seven
device-local scopes across a file copy. `headingIcon` is absent, and `viewOrder` is absent in a way
that adding the string would not fix — it is keyed by view id, not container id, so the loop reading
`readKey(scope, target.id)` cannot reach those rows. The comment at `main/remint.ts:124` states that
the copy's views are re-minted *because* they key `viewOrder` rows and that anything naming a view
must follow, and the old-to-new map built for that purpose is used only for `activeView`. A copied
Collection keeps its folds, heading columns, embed heights and aliases, and loses every view's manual
page ordering.

### What Footnotes Will Fight

These are not defects. They are the places where the feature meets machinery that was not built with
it in mind, and each one is cheaper to settle before the feature than during it.

**The fold model is keyed on heading identity at every layer.** *(Reported.)* `FoldEntry.headingFrom`
(`editor/folding.ts:138`) is the primary key for the effect payloads, the widget's `eq`, `cloneMap`,
`expandFoldsAt`, and the chevron class. The prune at `editor/folding.ts:242` deletes any entry whose
`headingFrom` is not a `headingSections()` start, so a non-heading region's entry is destroyed on the
first document change. Persistence round-trips through `HeadingSection.key`, which is heading text
plus ordinal. There is no default-collapsed concept: collapsed is either a user toggle or a persisted
key replayed at mount, and hidden-by-default is the inverse of what is stored. Expressing a
definitions section needs `FoldEntry` widened to a `{ kind, key }` discriminant, the prune made
kind-aware, a key source that is not a `HeadingSection`, a create-time default-collapsed path, and a
clone-free render path for a region that has never been on screen.

**No inline atomic range exists yet.** All three current `atomicRanges` providers — the callout
prefix, the list-marker slots, and the table block — are line-leading or block-scoped. An atomic,
caret-proof inline marker is a new shape for this editor, and `editor/calloutGuard.ts:81` is the
model to follow for a construct no delete gesture may half-remove.

**A marker cannot be located from the AST inside the viewport slice.** *(Reported, with a
demonstration.)* `gfm()` already bundles `gfmFootnote`, so `parse()` emits `footnoteReference` nodes
— but only when the matching definition is in the same string. Definitions live at the document end,
which a viewport slice will almost never contain, so `[^1]` parses as plain text in the slice that
draws it. The token pipeline already handles AST-hostile constructs by regex (`embed`, `wikiLink`),
and that is the route here.

**The block model has no place for a definition line.** *(Reported.)* `kindAt`
(`editor/blockModel.ts:148`) classifies `[^1]: text` as a paragraph, and consecutive definitions
merge into one block through the claim walk at `editor/blockModel.ts:231`, so a grip offers to drag
half the list. A definition run needs its own `BlockKind`.

**Resting table cells need a fourth edit.** *(Reported.)* If the marker is a class-only token it
appears in both surfaces for free, through `tokens/index.ts` and one `CONTENT_CLASS` entry. If it
carries a widget, a jump, or a hover card, it costs four separate edits, because the resting-cell
renderer, its link-span selector, the wrap-level delegation in `TableView.tsx:111`, and
`CellEditor.tsx`'s hand-rolled extension list are all independent of the body's path.

**The statistics pipeline is two pipelines.** *(Reported.)* `subfieldStats.ts:32` derives `lines`
from the raw body and `words`/`characters` from `stripMarkdown(body)`, so excluding definitions needs
both a line mask composing with `fencedLineMask` and a strip step, or the three numbers disagree.
Two existing defects sit on the same code: `subfieldStats.ts:16` replaces each masked line with a
space and `:40` counts those spaces, so a hundred-line fence adds a hundred characters; and
`subfieldStats.ts:23` matches markdown images only, leaving the `!` of an `![[Page]]` embed to count
as prose.

**The Insert vocabulary is restated across the process boundary.** *(Reported.)* `main/editorMenu.ts`
holds the rows as bare strings and `input/format.ts:32` restates them as a `BlockFormat` union;
`act()` takes `string`, so a row added in main type-checks and silently no-ops in the renderer, where
`setBlock`'s exhaustive switch returns `undefined` and `editor/menu.ts:82` swallows it. `FORMAT_ROWS`
is typed against the shared declaration; the block actions are not. The routing function this lands
in has no test.

### The Costs

Ordered by what they cost, not by where they live. The per-doc-version caches are real; what they
save is the derivation, not the emission.

**The decoration set is rebuilt whole on every input.** *(Reported, with measurements.)*
`assembleLineIntents` (`decorations/intent.ts:360`) walks every line in the document and flattens
into one array; `editor/decorations.ts:266` then allocates a `Decoration` per intent and
`Decoration.set` sorts the result. Measured against the real library at four ranges per line: 0.41 ms
at a thousand lines, 1.53 ms at five thousand, 6.87 ms at twenty thousand — paid on every keystroke,
every arrow key, every focus flip, and every viewport shift.

The pass established that viewport-scoping this is far cheaper than it looks. Fence and callout
first/last flags are already resolved document-wide inside the cached `DocScan`. Blockquote, nested
quote, and rail first/last need exactly one line either side, both available in cached arrays. The
only genuinely unbounded dependency is `railKind[]` at `decorations/intent.ts:287` — and the rails it
feeds are already computed whole-document, caret-free, once per version. They cannot be sliced only
because `CachedLineIntents.rails` is a flat array with no line index. Give it one, take
`view.viewport` rather than `visibleRanges`, extend by a line each side, and the carried state is
none. Keep the atomic ranges whole-document: they are a small fraction of the set, and CM6 makes no
explicit guarantee that the selection is inside `visibleRanges`.

**Three line predicates run a full micromark parse, uncached, per line per version.** *(Reported,
with measurements.)* `isThematicBreakLine`, `isHeadingLine`, and `isBlockquoteLine`
(`detect/index.ts:391`) cost 26–36 µs each. A blockquote line pays roughly four of them —
`decorations/intent.ts:205`, the two neighbours through `quoteChromeAt`, and `isCalloutHead`'s own
call — so a hundred-line quote block is about fourteen milliseconds per keystroke. Separately,
`isThematicBreakLine`'s prefilter admits any line opening with `-`, `*`, or `_`, so every paragraph
beginning with `**bold**` pays a parse. Folding the three answers into `DocScan` pays them once per
version alongside fences and callouts.

**`scanDoc` splits the document seven times and runs the fence pass three times.** *(Reported.)*
`splitWithOffsets`, then `docLineScan` re-splitting for `fencedCodeRanges`, `tableRegions`,
`docLines`, `codeMask`, `blockMathRanges`, `blockEmbedLines`, and `blockWebpageLines` — of which only
`tableRegions` memoizes. The header comment at `editor/docCache.ts:1` names re-splitting as the lag
source; this is the largest remaining instance, moved behind a WeakMap rather than removed. Threading
one `{ lines, lineStarts }` through the four callees closes it, and doing so before footnotes matters
because the definitions scan wants an eighth field on the same structure.

**`docMathRanges` runs the entire line scan to return one third of it.** *(Reported.)*
`editor/mathRanges.ts:5` is described as an accessor and implemented as a full re-derivation, string-
keyed and uncached, called from `listDrag.ts:61` — which is `spec.measure`, invoked from the
autoscroll loop's scroll event every frame. Routing it through `docScan` closes it; the `Text` is in
scope at both call sites.

**`calloutAtomic` walks the document and allocates a mark per line on every atomic-ranges query.**
*(Reported.)* CM6 invokes atomic-range providers rather than caching them — on every arrow key, every
mousedown, and every default insert. `editor/calloutAtomic.ts:11` loops all lines and builds a fresh
`Decoration.mark({})` per callout line, while `editor/decorations.ts:180` already holds a hoisted
constant for exactly that.

**`blockContext` is rebuilt on a mousemove path, and twice on one press.** *(Reported.)*
`editor/blockModel.ts:63` calls `fencedCodeRanges` and `tableRegions` directly and then calls
`docLineScan`, which recomputes both; `blockAt` adds a third pass through the uncached
`headingSections`. `blockHandles.ts:102` calls it whenever the hovered line changes in the gutter,
and `blockDrag.ts` builds the model twice for a single pointerdown.

**`blockDrag` measures every block start in the document per scroll frame.** *(Reported.)*
`blockDrag.ts:53` iterates all starts calling `coordsAtPos`, discarding off-screen ones only after
paying for them, plus a `getComputedStyle` per call. Its sibling `listDrag.ts:63` scopes to
`visibleRanges` correctly.

**A single character typed anywhere runs a whole-document table scan.** *(Reported.)*
`Tables/guard.ts:25` has no self-edit exemption, so a cell commit — a span replacement — takes the
guarded branch and runs `fusedTableCount` over the whole document, missing the single-entry memo. A
cell commit cannot fuse two tables, since the insert is escaped and `<br>`-encoded. The same applies
to any single-character deletion; the comment at `Tables/guard.ts:22` is true of insertion only.

**One micromark parse per resting table cell.** *(Reported.)* `cellStatic.tsx:22` tokenizes per cell,
so a twenty-by-five table of links is a hundred parses in the frame it scrolls into view, against the
body's one parse per visible span.

**`docSpanTokens` holds one slot and the comment claims it need not hold two.** *(Reported.)*
`editor/docCache.ts:49` states that a scroll moves the span set forward and never returns; scrolling
up returns, and folding changes `visibleRanges` within one version. Both thrash the slot and re-run
the dominant cost of a build.

### The Simplifications

**Unify the two pointer handlers.** `editor/connections.ts` and `editor/links.ts` are roughly eighty
percent identical — the `editingOnPress` record, the `actedOnLink` flag and its reset, the
`intent.cancel()` and `closeActiveHoverCard()` pairing, the button and detail bails, the
`seatAtNearerEdge` clamp, and the modifier branch are the same code twice. The pass enumerated the
remaining differences and found them to be either the hit-tester, resolver, and menu-builder triple —
which is the parameter surface — or one of five spellings of the same predicate, one of which is the
invalid-link bug above. A factory taking `hoverGate`, `hitAt`, `range`, `landing`, `follow`, `dwell`,
and `menu` covers both, with the claim protocol derived rather than restated: a press is claimed when
`follow` returns a thunk. Footnote markers then need no pointer code at all.

The three appliers stay bespoke — `applyLinkAction` and `applyUrlLinkAction` mean different things —
as does all the authoring state in `linkGestures`, `PendingTitle`, and `PasteLink`, which are
transaction concerns with no pointer handler.

**The resting cell is a third implementation and cannot join the factory**, because the factory is
`EditorView`-typed throughout and a resting cell has none. It has already drifted in the three ways a
third copy drifts: an external link at rest raises no hover card and cannot be followed, and the
post-menu suppression the earlier pass added to `links.ts` was never added here. What it should share
is one rung lower — a pure `followTarget(hit)` and `dwellTarget(hit)` that the factory itself
consumes.

**Four copies of one box recipe in the stylesheet.** Blockquote, callout, code block, and nested
quote each hand-roll `isolation: isolate`, an inset `::after` fill, and first/last radius clamps,
differing only in knob names and which pseudo carries the fill. A `.md-box` base parameterized on
fill, radius, and gap owns all four — and the footnotes section would otherwise be the fifth copy.
Note that every box line already spends both pseudo-elements, `::before` on the border and `::after`
on the fill, drag grip, and nested clamp; a definitions block inside a callout has nowhere to paint.

**The stylesheet carries no dead rules.** Every class in its 1,091 lines was grepped repo-wide and
has a live producer, several of them built dynamically as template strings. What is there is
duplication, not rot: three identical list-padding triples, six heading rules restating one
font-weight, four copies of the masked-glyph recipe, `.mdpm-embed-resize` byte-identical to
SurfacePM's south edge, and an autocomplete row hand-rolling the menu primitive it already sits
inside. `--font-mono` does not exist in the design system and the stack is written out three times.

**`embedWidget.tsx` holds four responsibilities in 880 lines** — the page tile, the webpage tile, the
tile state field, and generic block-widget machinery — with clean cuts at `:277`, `:443`, and `:651`.
The last of these is what a definitions section wants: the React-root-in-a-widget lifecycle, the
newline absorb, the blank-line fencing and boundary repair, and the nearer-edge click seating are all
free of embed knowledge and none of them are exported.

**Three import cycles cross the module boundary**, all through `Embeds/`, all carrying values rather
than types. They survive because every use sits inside a callback; a top-level use in any of the
three files becomes a temporal-dead-zone crash. *(Reported.)*

**Smaller items.** `editor/folding.ts:155` keys `cloneMap` by offset and never remaps those keys when
`foldField` maps `headingFrom`, so an edit above a collapsed section leaves the reveal rendering
empty and the orphan uncollected; the same map is module-global and shared across every `EditorView`,
including nested embed editors and the hover card. The `transitionend` listener at
`editor/folding.ts:212` is registered `once` without a `propertyName` guard, so any bubbled
transition from a cloned descendant eats it and leaves the entry animating forever, calling
`requestMeasure` every frame. `zoom.ts` is half dead — no call site passes the `zoom` prop, and the
effective font size is a constant. `Tables/codec.ts:76` `parseTable` is production-dead beside the
live `modelFromRegion`.

### Order

**Before anything else, independently:** the six live bugs. None of them touch footnote work, four are
one-line fixes, and two — the menu broadcast and the unclosed fence — are costing correctness today.

**Then, in this order, because each makes the next cheaper:**

1. `scanDoc`'s seven splits and the three uncached line predicates. Everything downstream reads
   `DocScan`, and the definitions scan will want a field on it.
2. Viewport-scoping the decoration emission. Needs the rails line-indexed; carries no state.
3. The pointer factory. Closes the invalid-link bug structurally, gives the resting cell its two
   shared decisions, and means footnote markers need no new pointer code.
4. The box recipe in the stylesheet, before a fifth copy is written.
5. The fold model's key widening, which is the largest single obstacle the feature meets.

**Deliberately not in scope here:** `Styles.css` needs no dead-rule pass, and the format-layer
duplication between `setList` and `setListKind` is real but touches nothing footnotes need.
