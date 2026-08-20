## MarkdownPM — The Reduction Plan

The work scoped in [[MarkdownPM-Scoping]], ordered so that consolidation carries the repairs rather
than following them. Four of the six live defects are symptoms of the duplication they sit in; each
one disappears when its duplication is collapsed, so it is never fixed twice or fixed in one copy and
not the other.

The deliverable is not a set of changes plus a record of them. It is an editor where nothing —
code, comment, or document — says something untrue about how it works. Every phase therefore closes
on two fronts: the duplication it collapses, and the statements that duplication had made false. A
statement the code catches up to needs no edit; a statement that stays false is corrected in place,
written as the truth rather than as a revision of one. Nothing is added.

Line estimates are estimates. Actuals get reported per phase, code-only, comments and tests excluded.

### The Shape

| Phase | What merges | Repairs carried | Est. |
| ----- | ----------- | --------------- | ---- |
| 0 · The two loners | — | Menu broadcast, `COPY_SCOPES` | ~0 |
| 1 · One document scan | `scanDoc`'s seven splits, three line predicates | Unclosed-fence slice | −40 |
| 2 · One box | Four stylesheet box recipes | Nested code block under Show Line Count | −140 |
| 3 · One pointer path | `connections.ts` + `links.ts` | Invalid link, cell wikilink | −90 |
| 4 · One drag | `blockDrag` + `listDrag` + `listDragModel` | Grip menu's stale span | −100 |
| 5 · Tables | Dead codec, twin geometry, misplaced generics | Ragged-row commit, escape round-trip, table scan per keystroke | −70 |
| 6 · Stylesheet remainder | Nine smaller duplications | — | −60 |
| 7 · Fold keys | — | Three fold-state defects | +40 |

Roughly **−400** across phases 0–6, with phase 7 spending some of it back on the one thing that
genuinely needs new code.

Viewport-scoping the decoration build is not here. It adds code, serves speed rather than size, and
carries the only rendering-correctness risk in the set; phase 1 takes the larger share of the same
win at no risk. It rides the debt log in [[ContextPM]] until a measurement earns it.

### Phase 0 — The Two Loners

Neither reduces anything and neither belongs to a consolidation. Both are live data defects, both are
small, and both are independent of every other phase.

**The menu broadcast.** Gate `applyEditorAction` (`editor/menu.ts:67`) on `view.hasFocus`. One
condition closes the cross-document write, the focus theft from the trailing `view.focus()`, and the
clobbered `lastState` that empties the next menu. A test that mounts two editors and asserts only the
focused one moves is the pin.

**`COPY_SCOPES`.** `main/remint.ts:139` gains `headingIcon`, and `viewOrder` gets carried through the
old-to-new view map that `activeView` already uses — adding the string alone does nothing, because
those rows are keyed by view id and the loop reads the container id.

### Phase 1 — One Document Scan

`DocScan` becomes the single derivation everything reads, which is what the header comment at
`editor/docCache.ts:1` already claims.

**Thread one split.** `splitWithOffsets` runs once; `fencedCodeRanges`, `tableRegions`, `codeMask`,
`blockMathRanges`, `blockEmbedLines`, and `blockWebpageLines` take `{ lines, lineStarts }` instead of
`text` and stop re-splitting. Seven splits and three fence passes become one and one.

**Fold the three line predicates in.** `isThematicBreakLine`, `isHeadingLine`, and `isBlockquoteLine`
are answered once per line per version inside the scan rather than parsed on demand, which is what
removes roughly four micromark parses per blockquote line per keystroke.

**Retire the accessor.** `editor/mathRanges.ts` becomes `docScan(doc).maths` at its two call sites and
the module goes.

**Retire the second cache.** `Tables/regions.ts`'s module-global single-entry string-keyed memo is
deleted; `tableRegions` reads the same per-`Text` WeakMap as everything else.

**The repair.** `lineStarts` gains an end sentinel, which makes `sliceStartLine` return an index that
exists and ends the whole-document parse and the `NaN` ranges on every unclosed fence. A pin with an
unclosed fence joins `regression-pins.test.ts`, which today only exercises closed ones.

Two smaller items ride along: `isHeadingLine` and `headingParts` are made to agree on a bare `###`
and on a tab indent, and `docSpanTokens` gets a second slot so scrolling up stops re-running the
dominant cost of a build.

### Phase 2 — One Box

`Styles.css` gains `.md-box` / `.md-box-first` / `.md-box-last`, parameterized on `--box-fill`,
`--box-radius`, and `--box-gap`. Blockquote, callout, code block, and nested quote each keep only
their knobs and whatever is genuinely their own.

**The repair.** The hardcoded `12px` at `Styles.css:1020` becomes `var(--cb-pad)` and the line-count
rule stops out-weighing the nested-box rule, which is what breaks a code block inside a callout when
Show Line Count is on.

**The base carries three constructs' worth of pseudo-element budget, and no more.** Every box line
spends both — `::before` on the border, `::after` on fill, drag grip, and nested clamp. The footnotes
section sits at the document's end and never nests inside another box, so it draws its own divider
and needs no layer from the shared base; the budget stays as it is.

Visual output is unchanged. This is the phase to screenshot before and after: blockquote, callout,
code block, a quote nested in a callout, and a code block nested in each.

### Phase 3 — One Pointer Path

`connections.ts` and `links.ts` collapse onto one factory. The parameter surface is seven members —
`hoverGate`, `hitAt`, `range`, `landing`, `follow`, `dwell`, `menu` — and the factory body owns
everything else: the `editingOnPress` record, the `actedOnLink` flag and its reset, the
`intent.cancel()` and `closeActiveHoverCard()` pairing, the button and detail bails, the
`seatAtNearerEdge` clamp, and the claim protocol.

**The claim becomes derived, not restated.** A press is claimed when `follow(hit)` returns a thunk.
That is the whole of the invalid-link repair: a broken link has nothing to follow, so the press is
not claimed, a caret seats in the label that needs repairing, and the click cannot reach
`openWebLink` with a malformed address. The bug was the two files spelling one predicate differently;
deriving it makes the spelling singular.

**Two free functions come out below the factory.** `followTarget(hit)` and `dwellTarget(hit)` are
pure and `EditorView`-free, so the resting table cell calls them without ever seeing an editor. That
closes the cell's three drifts — no hover card on an external link, no follow on an external link,
no post-menu suppression — without forcing a third implementation into a shape it cannot take.

**The repair in the cell editor.** `Tables/CellEditor.tsx:112` gains `connectionClicks`, so a
wikilink in an entered cell behaves the way the comment above the list already says it does.

What stays bespoke: the two menu appliers, which mean different things, and all the authoring state
in `linkGestures`, `PendingTitle`, and `PasteLink`, none of which has a pointer handler.

### Phase 4 — One Drag

The two relocate drags share a skeleton and duplicate everything above it.

- One candidate collector and one picker. `blockDrag`'s `nearest` is `listDrag`'s `slotFrom` with the
  membership guard hoisted out; both emit two boundaries per candidate and snap to the nearest.
- One outer-edge reader, replacing `bottomAbove` and `lineRightEdge`.
- One cut-insert-diff scaffold under the two move models. The blank-line policies genuinely differ
  and stay separate; the scaffold around them does not.
- One release-in-place representation, replacing `Cand.noop` and the `slotFrom` null.

Two costs go with it: `blockDrag`'s candidate loop scopes to `visibleRanges` the way `listDrag`
already does, and the doc-string cache is used at the three sites that bypass it. `EditorGesture`'s
`live` is nulled in `teardown` so a destroyed view stops being retained.

**The repair.** `gripMenu.ts:148` captures the document and the block before an async native menu and
spends them after it, where `focusRange` does not clamp and `doc.lineAt` throws past the end — inside
a promise, unhandled. The block is re-resolved from the live document in the `.then`, which is what
`linkEdit.ts:43` and `linkFormat.ts:75` already do for the same hazard.

### Phase 5 — Tables

**Delete.** `codec.ts:76` `parseTable` is production-dead beside the live `modelFromRegion`.
`regions.ts`'s `RowGeom` and `rowGeom` are a structural twin and a one-line wrapper for `codec.ts`'s
`RowSplit` and `splitRow`. `codec.ts:66` `docLines` duplicates `splitWithOffsets`. The second
newline-to-`<br>` encode at `codec.ts:102` is a second writer of a rule `cellToSource` already owns.

**Move.** `renderCellContent` has nothing table-specific in it and is already imported from outside
`Tables/`; it becomes the general static inline renderer it is. `operations.ts:6` `clamp` joins the
design system's.

**Repair.** A cell commit in a ragged row currently returns `null` and the typing vanishes on demote
(`sync.ts:18` indexes a padded model against unpadded source). `escapeCell` doubles every backslash,
so `a \* b` becomes `a \\* b` on disk for every other GFM reader — the round-trip pinned at
`codec.test.ts:49` is display-to-source-to-display, and the missing direction is the broken one.
`guard.ts:25` gets the self-edit exemption its comment already assumes, ending a whole-document table
scan on every keystroke.

### Phase 6 — Stylesheet Remainder

Nine consolidations, each small, none behavioral: three identical list-padding triples to one; six
heading rules restating one font-weight to one `:is()`; the hanging numeric zone shared by
`.md-ol-marker` and `.md-cb-ln`; the two block-handle anchors; the four masked-glyph applications to
a design-system utility; `.mdpm-embed-resize` to `design-system/resize-strip.css` beside its
col-resize sibling; `.mdpm-ac-row` onto the menu row primitive it already sits inside; the two
`.md-cb` blocks declared 48 lines apart merged; `.md-bracket` and its identical neighbour merged.

`--font-mono` is added to `theme-vars.css.ts` and the stack stops being written out three times. The
`--code-bracket-y` indirection is either marked `KNOB` or deleted. `zoom.ts`'s unreachable half goes
with the `zoom` prop no call site passes.

### Phase 7 — Fold Keys

The one phase that adds code, and the prerequisite footnotes actually blocks on.

`FoldEntry.headingFrom` widens to a `{ kind, key }` discriminant. The prune at
`editor/folding.ts:242` becomes kind-aware instead of deleting anything absent from
`headingSections()`. The persist listener gets a key source that is not a `HeadingSection`. A
create-time default-collapsed path joins `applySavedFolds`. `RevealWidget` gets a clone-free render
path for a region that has never been on screen.

Three defects in the same file are repaired while it is open: `cloneMap` keys are mapped when
`foldField` maps `headingFrom`, so an edit above a collapsed section stops rendering an empty reveal
and leaking the orphan; `cloneMap` moves inside the extension closure so nested editors and the hover
card stop sharing one offset-keyed map; and the `transitionend` listener drops `once` in favour of a
`propertyName` guard, so a bubbled transition from a cloned descendant stops leaving the entry
animating and calling `requestMeasure` every frame forever.

The fold state machine has no test today — `folding.test.ts` covers only the outline helpers. Pins
come before the widening.

### What Must Stop Being False

Each entry closes with its phase. Nothing here is new prose; it is either a statement the code is
brought up to, or a statement corrected to what is true.

**The code catches up — no edit.** These read as false today and read as true once their phase lands.

- `MarkdownPM.md`'s Tables section: "a link reads and acts the same in a cell as in a body." → 3
- `Tables/CellEditor.tsx:110`: "A link in a cell is a link: it follows, previews, and carries its own
  menu, the same as one in the body." → 3
- `Tables/TableView.tsx:146`: "A resting cell's connection navigates, as it does in the body." → 3
- `input/index.ts:292`: "Every ordinary letter typed in prose leaves through a guard above and never
  pays for it." → 1
- `Tables/guard.ts:22`: "Single-char typing passes through untouched." → 5
- `editor/gripMenu.ts:153`: "The menu is modal, so the document under it is the one the span was
  resolved against." → 4

**The statement is corrected.** These stay false otherwise.

- `editor/docCache.ts:37` names a caret dependency the assembly does not have — the parenthetical
  "the caret's line + its fence's edge lines" licenses a cross-line derivation
  `assembleLineIntents` would silently drop. The comment states the line-local rule it actually
  keeps. → 1
- `editor/docCache.ts:51`: the one-slot rationale rests on a scroll never returning to the span set
  it left. It does, and folding moves the set within one version. Rewritten alongside the second
  slot. → 1
- `editor/mathRanges.ts`'s header describes an accessor over the shared scan; the module is gone. → 1
- `Styles.css:800` documents a specificity standoff between the box's gutter rule and the block's own
  padding. The shared base resolves it, so the paragraph names the base rather than the standoff. → 2
- `Tables/widget.tsx:44` says heading columns persist to `.nexus/` "see … main/io/tableHeadingColumns."
  They are `local_state` rows under the `headingCols` scope, and no such module exists. → 5
- `MarkdownPM.md:112`: "every value resolving from the design-system tokens via the `--var` bridge."
  The tuning knobs are literals by design and the radii have no ladder to point at. The sentence
  states what the bridge does carry. → 6
- `index.tsx:119` `readOnlyAtMount` is reassigned on every `readOnly` change; it is a last-applied
  mirror and takes a name that says so. → 6

**Checked and left alone.** `Editor-Internals.md`'s hot-path rule and its viewport clause both stay
true. `editor/menu.ts:26`'s note on the push direction is unaffected by the focus gate.
`decorations.ts:421`'s division between viewport-scoped tokens and whole-document chrome stays
accurate while viewport scoping sits in the debt log. `ArchitecturePM.md` was reconciled with the
main-process pass and says nothing about the editor's internals.

### Gates

Every phase ends green on `npm run typecheck`, `npm run lint` at zero diagnostics, and
`npm run test`, with `set -o pipefail` on anything piped. Phases 2 and 6 are visual and end with
screenshots rather than assertions. Phases 3 and 7 both touch behavior with no existing coverage, so
their pins are written first.

One commit per phase, or per coherent group inside a phase. Each commit carries its phase's
corrections. Actual code-only deltas reported per phase.

### Not In This Plan

The `setList` / `setListKind` duplication is real and touches nothing footnotes need.
`embedWidget.tsx`'s four responsibilities want splitting, but the split is a move rather than a
reduction and its value is realized only when a second construct reuses the generic half — which is
the footnote work, not this. The three `Embeds/` import cycles are latent and want their own pass.
`PageHeader`'s seven threaded props are a restructure with a design question inside it.
