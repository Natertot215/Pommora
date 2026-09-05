#### A10: MarkdownPM Dead, Stale, and Obsolete Audit

Scope: `Pommora/src/renderer/MarkdownPM/` (141 files). Method: every export was mechanically cross-referenced against non-test importers across `src/`; every non-test source file in the folder was read in full; the shared grammars it depends on (`shared/links.ts`, `shared/connections.ts`, `shared/markdownCode.ts`, `shared/webpageEmbed.ts`, `main/Connections/scan.ts`) and every external consumer were read where relevant. Paths below are relative to `Pommora/src/`. Line counts exclude comments and tests. Git ages could not separate predecessor from successor (every `-S` probe bottoms out at the 08-28/08-29 restructure commits), so verdicts rest on structure and callers alone.

The headline: the "single cached document model" (`DocScan` via `docCache.docScan`/`scanOf`) is real and almost everything reads it. What remains is a thin sediment of retained reference implementations kept alive only by tests, one cache bypass, one outline path that never adopted the cache, and roughly a dozen grammar fragments (heading, quote-prefix, embed, inline-code, link-destination, list-marker) that exist twice where `Detect/` or `shared/` already owns the one definition.

---

#### Lens 1: Zero-Importer Exports

**H1. `Decorations/intent.ts:488-512` `decorationsFor`.** The pure whole-document decoration derivation; the live build path (`Editor/decorations.ts:396-571`) uses `docLineIntentsOf` + `assembleLineIntents` instead. Zero non-test importers; `intent.test.ts` uses it as the byte-equivalence oracle (line 37) and as the API under test in ~12 further cases. It is a retained predecessor living in production. Removable: 25 lines. Confidence: high that it is off the live path. What breaks: `intent.test.ts` in full; the equivalence pin needs `lineIntentsInto`/`railIntents` (currently module-private, lines 185 and 366) exported for a test-side rebuild, or the tests rewritten against `docLineIntents` + `assembleLineIntents`.

**H2. `Tables/codec.ts:66-89` `docLines` + `parseTable`.** A second table parser (micromark parse + row split) whose only callers are `regions.test.ts:26-34` (the "modelFromRegion equals parseTable" pin), `sync.test.ts`, and `codec.test.ts`. The live model is `Tables/regions.ts:76-82 modelFromRegion`, whose own comment names `parseTable` as the thing it replaced. Removable: 24 lines. Confidence: high. What breaks: three test files; `parseTable` moves into a test helper.

**H3. `Editor/calloutGuard.ts:79-83` `stripsCalloutPrefix`** and the optional-scan fallback in `calloutDeleteVerdict` (`:24` parameter, `:27-32` re-split + `calloutLines(ls)`). The one production caller (`:142-145 calloutGuard`) always passes the cached scan; the fallback is reached only through `stripsCalloutPrefix`, whose only caller is `calloutGuard.test.ts`. Once it goes, `Detect/index.ts:429`'s `calloutLines(lines, fences = scanFencedCode(...))` default has no caller either. Removable: ~11 lines. Confidence: high. What breaks: `calloutGuard.test.ts` (9 assertions rewrite to `calloutDeleteVerdict(...).kind !== 'ok'`).

**H4. `Editor/codeHighlight.ts:77` `CODE_LOADER_NAMES`.** Exported solely so `Detect/codeLangs.test.ts:3,9` can assert the three language tables agree. See M11 for the structural fix that makes the test unnecessary. Removable: 1 line (+57-line test). Confidence: high.

**H5 → see Lens 3 (re-exports).**

**H13. Exported-for-tests (zero non-test importers, used only in their own file).** Not dead code, but each is public surface with no consumer: `Editor/embedWidget.tsx:62 setEmbedEditing`, `Editor/embedRanges.ts:31 constructExclusions`, `Editor/gripMenu.ts:26 GRIP_MENU_LINES`, `:45 embedPickTree`, `:58 blockDeleteSpan`, `Editor/citationPointer.ts:21 CITE_ROW_GLYPH`, `:26 loneTarget`, `Input/format.ts:121 listMarkerText`, `Tables/model.ts:14 DEFAULT_DASHES`, `Tables/codec.ts:17-18 escapeCell/unescapeCell`, `Tables/widget.tsx:380 buildWidgetDecorations`, `:429 refreshTableEffect`, `Tables/guard.ts:13 fusedTableCount`, `Tables/cellStatic.tsx:23 renderCellContent`, `:314 cellLinkTarget`, `Editor/decorations.ts:324 sliceStartLine`, `Editor/folding.ts:132 regionsOf`, `:366 foldedRegions`, `Editor/headingScan.ts:23 headingSrc`, `Editor/pendingTitle.ts:25 pendingTitles`, `Editor/embedInsert.ts:11 embedInsertAfter`, `Editor/listDragModel.ts:216 applyChanges`, `Editor/calloutGuard.ts:20 calloutDeleteVerdict`, `Editor/citationGuard.ts:25 citationTailVerdict`, `Editor/editorGesture.ts:19 beginEditorGesture`, `autocomplete.ts:161 connectionInsert`, `Detect/index.ts:477 indentLevel`, `zoom.ts:2,4,5,7,11 EDITOR_BASE_PT/ZOOM_MIN/ZOOM_MAX/clampZoom/zoomMultiplier`, plus type-only exports `CachedLineIntents`, `TileRange`, `EmbedHost`, `BlockKind`, `BlockStart`, `BlockRange`, `HeadingSrc`, `FoldKind`, `FoldRegion`, `RowGeom`, `RowSplit`, `CellNavTarget`, `LinkActionText`, `CommitEdit`, `AcCtl`, `AcState`, `ConnectionAutocomplete`, `HeaderPage`, `ConnResolution`, `CodeLang`, `CodeTag`, `CitationHost`, `PendingTitle`, `RelocateDragSpec`. Removable: 0 lines (the keyword). Confidence: medium (some may be intended future API). What breaks: the tests that import them.

**H14. `Editor/input.ts:121-131` `refusedInAlias`.** Exported "because every surface that authors an alias owes the same refusal: the page editor and a markdown table cell". The cell editor does not import it: `Tables/CellEditor.tsx:202-205`'s `inputHandler` runs only `autoPair`. Either the export is stale (make it module-private: 0 lines) or the cell is missing a guard the body has (a `]` typed inside a cell alias truncates the link). Confidence: high on the fact; the direction is a product call.

CodeMirror extensions exported but never added to an array: none found. Every `Extension`-valued export (`calloutAtomic`, `calloutGuard`, `citationGuard`, `citationOrder`, `listRenumberOnDelete`, `blockDragExtension`, `calloutDragExtension`, `blockquoteDragExtension`, `gripMenu`, `customCaret`, `customSelection`, `pasteLink`, `pendingTitle`, `linkRest`, `linkTyping`, `blockHandles`, `formatKeymap`, `markdownInput`, `codeHighlight`, `editorGestureCleanup`, `shadeField`) is mounted in `index.tsx:234-377`, `Tables/CellEditor.tsx:121-216`, or a gesture factory. Commands never bound: none; every `(view) => boolean` is in a keymap or a menu switch. StateFields never read: none.

---

#### Lens 2: Retired-Feature Remnants and Parallel Derivations

**H10. `Editor/listDragModel.ts:44` calls the uncached `scanDoc(doc)`** (imported from `Decorations/intent` at `:5`) on every list-glyph press (`Editor/listDrag.ts:143 subBlockAt`). `docCache.ts:42 scanOf` is the text-keyed cache that would hit the editor's own slot; `docScan(view.state.doc)` is the version-keyed one. The only other direct `scanDoc` caller, `Editor/citationEdits.ts:180`, scans a hypothetical post-edit document and is legitimate. Removable: 0 lines (one identifier). Confidence: high. What breaks: nothing.

**M1. `Editor/headingScan.ts:23-31` `headingSrc` and `:82-90` `headingOutline(doc: string)`.** The outline re-splits the text, re-pairs every fence, and re-parses every heading line instead of reading `scanOf(text)`, which is keyed on the same string and satisfies `HeadingSrc` structurally (the interface comment at `:11-12` says so). Consumers: `Toolbar/OutlineMenu.tsx:50` (per body change while the menu is open) and `Interface/pageEditor.ts:42`. Contrast `Interface/Subfield/subfieldStats.ts:100`, which correctly reads `scanOf(body)` "THE editor's own scan of this very text". Removable: 9 lines (`headingSrc` goes; `headingOutline` reads `scanOf`). Confidence: medium. What breaks: `headingScan`'s tests that build `headingSrc` directly.

**M9. `Editor/blockModel.ts:46-151` `blockContext`** is an O(n) re-derivation (per-line `parseListMarkerPrefixed`, list-membership walk, five range-membership closures) rebuilt from scratch on every `blockAt`/`blockStarts` call: `Editor/blockHandles.ts:38` on every doc change, `:101` on hover (mitigated by a line cache), `Editor/blockDrag.ts:36,126` per drag, `Editor/gripMenu.ts:169,180` per menu, `Editor/embedInsert.ts:51` per insert. It reads `DocScan` but is not part of it and not `perDoc`-cached, so it is the one derivation that sits beside the single model rather than inside it. Removable: 0 lines; a `perDoc` wrap or a `DocScan` field. Confidence: medium. What breaks: nothing.

**M13. `Editor/docCache.ts:68` `docBidirMarks`** + `Editor/decorations.ts:567-569` + `Styles.css:400-405`: a separate whole-document `matchAll(/↔/g)` per version whose sole purpose is `transform: scaleX(1.5)` on the arrow glyph. A second regex scan of the document outside the token layer, for one character. Removable: ~10 lines if it becomes a token kind or a font feature. Confidence: medium-low (it works; it is just the wrong layer).

**M14. `Decorations/intent.ts:535,539,651` `pushConstruct`** re-runs `isThematicBreakLine(inner)` and `isHeadingLine(inner)` (regex prefilter + micromark parse) per line during decoration, although `scanDoc` already answered both for every line (`:88-90 headings/quotes/breaks`); the cached arrays are read only by `blockModel.ts:108-110` and `intent.ts:208`. For unprefixed lines (`base === 0`, the common case) the answer is already in hand. Removable: 0 lines, three lookups. Confidence: medium-low.

**M15. `Input/format.ts:46,70,94`** `tokenize(doc)` over the whole document per ⌘B / menu format action, where the caret's line suffices (`Editor/formatState.ts:19-22` already does the line-local form). Confidence: medium-low.

**Verdicts on the named suspects.** `Detect/` vs `Parser/`: not two ways to find constructs. `Parser/index.ts:6-8` is a 3-line seam over `mdast-util-from-markdown`; `Detect/` owns the line grammar and calls it for three block confirmations (`:591-623`) and `Tokens/` for emphasis (`:105-112`). Old table implementations: none in production; `parseTable` (H2) is the retained predecessor. "legacy"/"v1" naming: `Editor/blockModel.ts:66` "(V1)" in a comment only; `codeHighlight.ts` "legacy stream mode" refers to CodeMirror's `@codemirror/legacy-modes` package. Swift-parity leftovers: none found; `Swift` appears only as a code-fence language. iOS soft-keyboard `contentAttributes` at `index.tsx:265-270` (`autocapitalize`, `autocorrect`, `enterkeyhint`) are no-ops on desktop Chromium; only `spellcheck` is live (M18, 3 lines).

---

#### Lens 3: One-Reader Indirection and Re-Exports

**H5. `Editor/folding.ts:17-23`** re-exports `headingOutline`, `headingSections`, `sectionEnd`, `HeadingSection`, `OutlineHeading` from `./headingScan`. Every external consumer (`Interface/pageEditor.ts:2`, `Toolbar/OutlineMenu.tsx:15`, `Toolbar/OutlineDnd.tsx:10`, `Toolbar/outlineTree.ts`) imports the heading scan through the fold state machine. Removable: 7 lines + 4 import paths. Confidence: high.

**H6. `Detect/index.ts:13,15,38-39`.** `export { markdownLinkRegex } from '@shared/links'` (one consumer, `Tokens/index.ts:8`, which could import from `@shared/links`); `export type { ListKind }` (zero importers via Detect); `quoteDepth = quoteDepthOf` and `lineOffsets = lineOffsetsOf` aliases over `@shared/markdownCode` (consumers: `listDragModel.ts:4` and Detect itself). Removable: 4 lines + 3 import edits. Confidence: high.

**M10. The connections getter is carried seven ways.** Two Facets (`Editor/embedWidget.tsx:57-59 embedHost.getConn`, `Tables/widget.tsx:48-50 tableConnections`) and five closure parameters (`markdownDecorations(getConn)` `decorations.ts:573`, `connectionClicks` `connections.ts:70`, `markdownLinkClicks` `links.ts:91`, `citationPointer` `citationPointer.ts:90`, `aliasOnLeave` `linkEdit.ts:148`), each threaded from `index.tsx:271-325` and again from `Tables/CellEditor.tsx:122-143`. One `connectionsFacet` read via `state.facet(...)` replaces all seven carriers and both wiring lists. Removable: ~20 lines net. Confidence: medium. What breaks: tests that construct these extensions with explicit getters.

**Kept.** `citationHost` Facet (`citationActions.ts:39`): one provider, three readers, and the CM-correct way to inject per-editor state; keep. `Tables/index.ts` 3-line barrel with one consumer: harmless. `Editor/lineDom.ts` (11 lines, 4 consumers), `Editor/caretSeat.ts`, `Editor/listRenumber.ts`, `Editor/formatKeymap.ts`: small but each is a genuine leaf.

---

#### Lens 4: Duplicate Definitions

**H7. `Detect/index.ts:17` `embedRegex` ≡ `shared/connections.ts:18` `pageEmbedPattern`.** Byte-identical source (`/!\[\[([^\]\r\n]*)\]\]/`), differing only in the `d` flag. `Tokens/index.ts:187` reads the Detect copy; `main/Connections/scan.ts:25` reads the shared one. Removable: 1 line. Confidence: high. What breaks: nothing (add `d` to the shared one; `regexTokens` at `Tokens/index.ts:129` already falls back when indices are absent).

**H8. `Input/format.ts:117` `HEADING_PREFIX = /^(\s{0,3})#{1,6}[ \t]+/`** vs `Detect/index.ts:601` `headingPartsRe = /^([ ]{0,3})(#{1,6})([ \t]+)(.*)$/`, whose comment calls itself "The one heading-shape regex". They disagree: `\s{0,3}` admits a tab indent that Detect deliberately refuses (`:608-610`). Used at `format.ts:353,361`. Removable: 1 line + 2 call sites onto `headingParts`. Confidence: high.

**H9. `Input/index.ts:29` `lineMarkerRe = /^(\s*)(?:\d+\.|[-+→]|>|#{1,6})(?:[ \t]*\[[ xX]?\])?[ \t]+/`.** A combined list/quote/heading marker grammar used by `smartBackspace`'s top-level path (`:233-237`), beside `Detect/index.ts:503-504 LIST_MARKER_RE/ARROW_MARKER_RE`, `:27 blockquotePrefixRe`, and `headingParts`, under a Detect comment that reads "Every layer reads markers through this — never its own regex" (`:484-485`). Removable: 1 line + a 5-line rewrite. Confidence: high.

**M3. Two "caret inside `[[`" predicates.** `Parser/index.ts:11-27 isInsideWikilink` (depth counter, tolerates an unclosed opener; only caller `Input/index.ts:460,477 dashArrow`) vs `shared/connections.ts:77-90 linkAt/aliasSpanAt` (grammar-based, closed links only; used by `autocomplete.ts:71`, `Input/index.ts:324`, `linkEdit.ts`, `linkGestures.ts`). `autocomplete.ts:103-117`'s embed branch hand-rolls a third unclosed-`![[` scan. The unclosed case is real for `dashArrow` (`[[foo--`), so the fix is one shared "open `[[` before caret on this line" helper beside `linkAt`, not a straight swap. `isInsideWikilink` also has no business in `Parser/`. Removable: ~10 lines net. Confidence: medium.

**M4. Three "caret inside a markdown link's `( )`" predicates.** `shared/webpageEmbed.ts:64-73 linkDestinationAt` (grammar half + `lastIndexOf('](')` half), `Input/index.ts:430-434 inLinkTarget` (byte-identical to the second half), and `autocomplete.ts:45-57 markdownTargetAt` (a hand scan over `](`, `)`, `[` that ignores escapes and picks the wrong bracket for `[a [b](c)`, unlike the grammar). Removable: 5 lines (`inLinkTarget`) + `markdownTargetAt` rebuilt on `emptyTolerantLinkRegex` indices. Confidence: medium.

**M5. Two inline-code definitions.** `Detect/index.ts:18 inlineCodeRegex = /`([^`\n]+)`/dg` (single backtick only; `Tokens/index.ts:184`) vs `shared/markdownCode.ts:120-154 inlineSpans` (run-length matched, the mask the write side reads). A ``` ``code`` ``` span is masked as code (links inside are dropped) but never styled `md-code`. The Editor-Internals rule that fence pairing is one shared pass has no inline counterpart here. Removable: 1 line, after `inlineSpans` is exported. Confidence: medium-high.

**M6. Two display-math models.** `Detect/index.ts:24 blockLatexRegex` (lazy span, `Tokens/index.ts:213-218` `blockLatex` token, styling only) vs `Detect/index.ts:124-141 blockMathRanges` (line-anchored pairs, feeds `scan.maths`, block model, drag, decoration gates). The doc admits they differ on purpose ("Relocating bytes needs line-anchored pairing; coloring a span doesn't"), but the token can flip on a stray `$$` and tokenizes over viewport slices that may cut a block. Deriving the token's spans from `scan.maths` removes the regex. Removable: ~6 lines. Confidence: medium-low.

**M7. Three quote-prefix regexes.** `Detect/index.ts:27 blockquotePrefixRe = /^[ \t]*(?:>[ \t]?)+/`, `shared/markdownCode.ts:8 QUOTE_PREFIX_RE = /^[ \t]*(?:>[ \t]?)*/` (`+` vs `*` only), `Editor/listDragModel.ts:78 LEAD_RE = /^[ \t]*(?:>[ \t]?)*[ \t]*/`. Detect already re-exports `quoteDepthOf` from shared; the regex should follow. Removable: 2 lines. Confidence: medium.

**M8. Three "this line is literal code" predicates.** `Decorations/intent.ts:204-207 literalQuoteAt` and `Editor/blockModel.ts:102-105 literalCode` are the identical lambda (`closed && depth === 0`); `Detect/index.ts:431-434 calloutLines.codeAt` is `closed && role === 'content'` at any depth, so a callout head inside a quoted fence is refused by Detect but treated as chrome-bearing by the other two. A `literal: boolean[]` on `DocScan` collapses the first two and exposes the third. Removable: 6 lines. Confidence: medium.

**M11. Three language registries keyed by name.** `Detect/codeLangs.ts:13-52 CODE_LANGS`, `Editor/codeHighlight.ts:23-68 LOADERS`, `Editor/codeGlyphs.ts:19-83 CODE_TAGS`, with parity between the first two guarded by a test (H4). A `load` thunk is plain data and pulls no CodeMirror import at module load, so one roster in `codeLangs.ts` with `{ name, alias, load, tag? }` makes the parity a type fact. Removable: ~10 lines + the 57-line test. Confidence: medium.

**M12. `zoom.ts` (17 lines).** Five of seven exports are internal (H13). The exponent encoding `2^(z-1)` exists only to be undone: both callers (`Tiles/Surfaces/PageTile.tsx:151`, `Windows/PageHistoryWindow.tsx:235`) pass `embedZoom(scale) = 1 + log2(scale)` (`shared/types.ts:265`), so `zoomFontSize(embedZoom(s)) = 15·s`, and `clampZoom`'s `[0, 2]` never bites against `SCALE_STEPS ∈ [0.5, 1.5]`. Collapse to `fontSize = EDITOR_BASE_PT * scale`. Not a duplicate of `Tiles/tileZoom.ts`: that is the per-tile `--tile-zoom` CSS factor from `SCALE_STEPS`, a different axis. Removable: ~12 lines + `zoom.test.ts` (22). Confidence: medium.

**M16. Code-mask callers that bypass the cached scan.** `Editor/pasteLink.ts:58-62 insideCodeAtCaret` calls `isInsideCode(pos, s)` twice per paste (re-splits and re-pairs the whole document; `inCodeAt(docScan(view.state.doc), pos)` exists at `intent.ts:439`). `autocomplete.ts:70 codeMask(line)(rel)` masks one line and is therefore fence-blind: a `[[` typed on a line inside a fenced block arms the picker. Removable: 5 lines. Confidence: medium-high.

**M2. `Interface/pageEditor.ts:37-53 moveHeadingSection`** (external consumer) re-derives a heading block's extent (outline lookup + `sectionEnd` + `trimEnd`) that `Editor/blockModel.ts:195-206 blockAt(...).kind === 'heading'` already computes with the same trim rule, and reads `view.state.doc.toString()` past the `docString` cache. Removable: ~8 lines. Confidence: medium.

**M19. Duplicated autocomplete wiring.** The arrows/Enter/Escape `whenAcOpen` keymap (`index.tsx:247-253`, `Tables/CellEditor.tsx:168-170`) and the blur handler (`index.tsx:330-335`, `CellEditor.tsx:206-211`) are written twice. Removable: ~8 lines. Confidence: medium-low.

**L7. Two React-in-widget mounts.** `Editor/embedWidget.tsx:118-136 mountTile` + `:142-149 unmountIfDetached` (root parked on the DOM node, microtask connectivity check) and `Tables/widget.tsx:298-303,353-362` (root parked on the node and the instance, `destroyed` flag, deferred unmount). Same pattern, two lifecycles. A shared `widgetRoot(dom)` helper removes ~15 lines. Confidence: medium-low.

**Not duplicates (checked).** `shared/links.ts`, `shared/connections.ts`, `main/Connections/scan.ts`: one grammar each; scan.ts consumes both without restating (only H7 duplicates). Two autocomplete panes: no; one `AutocompletePane` component and one `useConnectionAutocomplete` hook mounted twice. `Tokens/` vs `DesignSystem/Tokens`: unrelated (markdown tokens vs design tokens); only the folder name collides. Two table parsers: only in tests (H2). `shared/markdownCode.ts` vs `Detect/`: `Detect` consumes `fenceSpans`; the only inline overlap is M5.

---

#### Lens 5: Defensive Code for Unreachable States

**H11. `Editor/folding.ts` optional fold clone.** `FoldEntry.clone?` (`:150`), `foldEffect.clone?` (`:159`), `RevealWidget`'s `if (this.clone)` (`:230`) with its "collapsed before it was ever rendered" comment, and `foldedRegions`'s `hasBody: e.clone !== undefined` (`:368,376`). The only producer, `collapseEffect` (`:195-210`), always calls `cloneBody` (`:165-180`), which always returns a `div` (possibly empty), so `clone` is never absent and `hasBody` is a constant `true` with zero non-test readers. Removable: ~6 lines. Confidence: high. What breaks: `foldState.test.tsx:79` (`expect(after?.hasBody).toBe(true)`).

**H12. `Editor/pasteLink.ts:27,100,137`** `selection.ranges.length !== 1` guards. `EditorState.allowMultipleSelections` is never enabled anywhere in `renderer/`, so `ranges.length` is always 1. Removable: 3 lines. Confidence: high. What breaks: nothing.

**M17. Test-only fallbacks in production.** `Tables/widget.tsx:383` `state.field(headingColField, false) ?? new Set()` ("in unit tests building a bare state"); `Decorations/intent.ts:442,448` `pos < 0` guards in `inCodeAt`/`inCalloutAt` (every production caller, `Input/index.ts:114,156,206,304,345,375,448`, passes a real caret; the comment names `NO_CARET` as the producer but `caretLine` at `:454` filters it first); `Editor/decorations.ts:420,422` `field(linkRest, false)`/`field(linkTyping, false)` (both editors mount both fields). Removable: ~5 lines. Confidence: medium-low (tests are the only producers, and they are real producers).

**Reachable, keep.** `embedWidget.tsx:727-741 boundaryRepair`: a caret at a document-edge tile boundary is a real seat (`Editor/caret.ts:12-27 tileEdgeMarker` draws for exactly it). `citationGuard.ts:36-39` head clamp: atomic skipping leaves a citation line's first offset reachable, as documented. `calloutGuard.ts:51` `cancel`: the prefix is atomic to CM motion but not to programmatic dispatches (Input transforms, drag), which is the stated producer. `index.tsx:245` read-only `changeFilter`: `formatKeymap` and the menu dispatch past `EditorState.readOnly`. `embedTileRanges`'s `field(embedField, false)` (`embedWidget.tsx:874`): the cell editor mounts `customCaret` without `embedTiles`, so the fallback is live there. `linkEdit.ts:43`, `linkFormat.ts:72`, `CellEditor.tsx:227-231`: a native menu held open across a document change is a real producer.

---

#### Lens 6: Obscure or Unnecessary

**`warmSeam.ts` (6 lines).** Verdict: earns its existence. A leaf `interface` with six importers (`index.tsx`, `Interface/Glance/GlancePane.tsx`, `Tiles/Surfaces/PageTile.tsx`, `Tiles/tileCache.ts`, `Windows/useWindowWarm.ts`); the alternative home (`index.tsx`) would drag the component module into type-only importers. Leave it.

**`Parser/index.ts`.** `parse` (3 lines) is the dependency seam and is fine. `isInsideWikilink` (M3) does not belong in a module named Parser.

**`Detect/index.ts:591-623` per-line micromark confirmations.** `isHeadingLine`, `isBlockquoteLine`, `isThematicBreakLine` each run a regex prefilter then `parse(line)`. In practice the prefilter decides: a heading must also pass `headingParts` wherever it matters (`headingScan.ts:61-63`), so the parse adds nothing there; the blockquote parse's only contribution is refusing a 4-space-indented `>` (indented code); the thematic-break parse confirms exact grammar the prefilter already spells. Three micromark parses per line per version for two edge cases. Verdict: marginal; low confidence it can go without a regression, so listed, not counted.

**`Editor/codeHighlight.ts:66-68` `Properties` loader, `codeGlyphs.ts` `label: null`.** Fine.

**`index.tsx:265-270` iOS keyboard attributes (M18).** Three attributes for a platform this renderer does not run on; the planned mobile companion is a separate app. Removable: 3 lines. Confidence: low (harmless).

---

#### Totals

**High confidence (13 findings):** H1, H2, H3, H4, H5, H6, H7, H8, H9, H10, H11, H12, H14 (H13 is the grouped export-keyword list, 0 lines). Removable ≈ 88 lines of production code, plus ~35 superfluous `export` keywords and four test files that would need to absorb their oracles (`intent.test.ts`, `regions.test.ts`/`sync.test.ts`/`codec.test.ts` for `parseTable`, `calloutGuard.test.ts`, `codeLangs.test.ts`).

**Medium confidence (19 findings):** M1 through M19, plus L7. Removable ≈ 135 lines net, most of it in M10 (connections Facet, ~20), M12 (`zoom.ts`, ~12), M11 (language roster, ~10), M13 (`↔` scan, ~10), M3/M4 (link-position predicates, ~18), and L7 (widget root helper, ~15). The three non-removal items (M9 `blockContext` caching, M10 Facet, M14 lookups) are structure, not deletion.

**Not found:** exported-but-unmounted CodeMirror extensions, unbound commands, unread StateFields, a second table implementation in production, Swift-parity leftovers, orphaned CSS classes (the nine unmatched selectors are template-generated `md-h${n}`, `mdpm-tbl-align-${align}`, `md-conn-glyph-${status}`), or dead `MarkdownEditor`/`ConnectionsApi`/`ConnMenuTarget` members (every optional prop and field has a live producer).
