## Footnotes — Decision Log

### Frame
- **Purpose:** Bring GFM reference footnotes to MarkdownPM — `[^1]` markers in the body, `[^1]: text` definitions gathered in a hidden-by-default section at the document's end — canonical GFM on disk, everything drawn being presentation.
- **Core Value:** A page can carry footnotes that read as clean numbered markers in the body, stay portable GFM outside Pommora, and never corrupt the document through any gesture.
- **Success Criteria:** Creating, reading, clicking, editing, and deleting footnotes all work through the paths the spec names; an unmatched marker or a mid-doc definition degrades to literal text exactly as specified; the disk stays plain GFM throughout.

### Sources
- [[MarkdownPM]] — the editor's architecture: behavior layer over CM6, disk == doc string, display-only UI state in `nexus.db`, dynamic-syntax reveal rules, typing transforms, the native context menu with Insert/Paste As.
- [[Editor-Internals]] — hard invariants: per-doc-version derivations, fragment parses, atomic-transaction transforms, widget height answering, one-owner claim sets.
- [[ConnectionsPM]] — the inline-link precedent: click routing, right-click menus per construct, autocomplete; footnote markers borrow interaction shapes from here.
- [[ConfigurationPM]] — `.nexus/settings.json` personalization, the Pages & Editor toggle table the stats toggle joins, per-machine state in `nexus.db`.
- `Pommora/src/renderer/src/design-system/tokens/theme-vars.css.ts` — `--border-heading` (the shared heading seam, a full border shorthand); `--tint-primary` (an opacity step, `60%` — consumed only inside `color-mix`, e.g. `--accent-stroke-hot`); `--label-secondary`; `--disclosure` (180ms) + `--ease-standard`.
- `Pommora/src/renderer/src/MarkdownPM/Styles.css` — `.mdpm-divider` is the heading seam worn as an inset rounded rule (the treatment a footnotes divider copies); `.mdpm-fold-reveal` is the editor's hand-rolled twin of the sidebar `Reveal` motion; the fold chevron mask.
- `Pommora/src/renderer/src/design-system/components/Reveal.tsx` — the body open/close primitive (`grid-template-rows 0fr ↔ 1fr` on `--disclosure`); a section disclosure is a `Reveal`-style unfold, not a Bloom.
- `Pommora/src/renderer/src/Components/Detail/pageProperties.css.ts` (`add`, consumed by `PagePropertiesPane.tsx` "Add Property") — the left-aligned quiet end-of-list text control precedent for Show Footnotes: `text.footnote.standard`, `alignSelf: flex-start`, label-secondary, hover fill.
- `Pommora/src/renderer/src/design-system/edge-fade.css` — the house mask-fade; note InteractionPM's Bloom is explicitly "no blur," so a divider blur-fade is a new motion, not a reuse.
- **Naming collision:** `footnote` already names a typography scale step (`--text-footnote-size`, `text.footnote.*`) — new footnote-feature tokens/classes must not reuse that bare name.
- `Pommora/src/main/db/localState.ts` + `src/main/index.ts` + `src/shared/bridge.ts` — the per-machine `local_state (scope, key, value)` mechanism in `nexus.db`; heading folds (`'folds'` scope, page id → key array) and the per-page boolean template `'headingIcon'` (scopeGet/scopeSet with a `typeof boolean` guard, plain React state in `PageView.tsx`). The footnote-section disclosure flag is a new scope on this exact template.
- `Pommora/src/main/remint.ts` (`COPY_SCOPES`) — device rows carried to a re-minted id on file copy: `['folds','headingCols','embedHeights','aliases']`. `headingIcon` is missing (existing hole — a copied page loses the flag); a footnote disclosure scope must join this list or inherit the same hole.
- `Pommora/src/renderer/src/MarkdownPM/editor/folding.ts` — `FoldsApi` (Electron-free load/save seam), `applySavedFolds` with the `initialFoldAnnotation` mount guard, `markdownFolding`'s updateListener persist; the pattern a folded footnote section follows.
- `Pommora/src/renderer/src/Detail/Subfield/subfieldStats.ts` — `computeStats(body)`: `lines` from the raw body, `words`/`characters` from `stripMarkdown(body)` — **two pipelines**, so footnote exclusion needs both a line mask (mirroring `stripFences`) and a strip step, or the three numbers disagree. Footnote syntax is currently unhandled: definition lines count as lines, `[^1]` counts as a word.
- `Pommora/src/renderer/src/Detail/Subfield/subfieldItems.tsx` (`PageStatsItem`) — the counter reads `pageDetail` + `liveBody` from the store, no settings today; the toggle is a third `useSession` selector + a flag on `computeStats`. The floating preview reuses the same component, so it follows for free. Frontmatter never reaches the renderer (`splitEnvelope` in main), so no frontmatter logic is needed.
- `Pommora/src/renderer/src/Settings/NexusSettings.tsx` (`LEAVES`, the `pages` leaf) + `src/shared/types.ts` (`Personalization`) + `src/main/readNexus.ts` (per-key sanitizer) — a new boolean toggle is exactly three touches: the `Personalization` field, the `bool()` sanitizer row (a key absent there is silently dropped on reload), and the row object in the leaf. No apply-map row — this toggle is store-read chrome, never a root class.
- **Stale comment found:** `MarkdownPM/Tables/widget.tsx:45` claims heading columns persist to `.nexus/` via a nonexistent `main/io/tableHeadingColumns` — they're `local_state` rows. Fix in passing.
- `Pommora/src/renderer/src/MarkdownPM/parser/index.ts` — `fromMarkdown` with `gfm()` already parses footnotes transitively (`footnoteReference` / `footnoteDefinition` nodes verified against the live install); the extensions are not direct `package.json` deps. The tokenizer (`tokens/index.ts`) emits nothing for `[^…]` — it renders as plain prose today, and zero footnote code exists in `src/`.
- `Pommora/src/renderer/src/MarkdownPM/editor/decorations.ts` + `decorations/intent.ts` — the decoration pass: `hideMarker` replaces are zero-width and non-atomic; all three `atomicRanges` providers (callout prefix, list-marker slots, table block) are line-leading or block-scope — **no inline atomic precedent exists; the footnote marker establishes it**. Reveal rides `activeTokenIndices` (caret-inside ⇒ show syntax); a never-revealing marker opts out of that mechanism entirely.
- `Pommora/src/renderer/src/MarkdownPM/editor/calloutGuard.ts` — the `transactionFilter` repair pattern (clamp/extend/cancel any eroding change, `userEvent` carried forward for history grouping); the strongest model for a marker no delete gesture can half-remove.
- `Pommora/src/renderer/src/MarkdownPM/editor/embedRanges.ts` (`docLineScan`) + `decorations/intent.ts` (`scanDoc`) + `editor/docCache.ts` — the per-doc-version derivation the footnote-section scan joins (so it agrees with fences/tables about the exclusion base); `editor/blockModel.ts` (`blockAt`/`blockContext`) needs a footnote-section `BlockKind` or grip-drag treats definitions as loose paragraphs.
- `Pommora/src/renderer/src/MarkdownPM/input/index.ts` + `editor/input.ts` — transforms are a flat `??` chain of pure `(doc, sel, inserted) → Edit | null` functions, one dispatch with `userEvent: 'input'`; no registry, no named categories (the spec's "typing-transform category" means joining this chain). `dashArrow`/`canonicalizeCheckbox` are the seed-transform models: fire on the completing char, bail inside code/wikilink/link-target.
- `Pommora/src/main/editorMenu.ts` + `src/shared/PasteAsMenu.ts` + `src/main/returningMenu.ts` — Insert ▸ is a hardcoded array + one `BlockFormat` case; Paste As shape detection is `pasteAsTarget(clipboard)` in shared (main reads the clipboard itself for timing); the construct-specific menu pattern is `markdownLinkClicks` → `api.menu` → `popConnMenu` on `popReturningMenu`, with the load-bearing right-button `mousedown` suppression before CM seats the caret.
- `Pommora/src/renderer/src/MarkdownPM/Tables/cellStatic.tsx` — resting cells are a hand-written span renderer over `tokenize()`, not the CM decoration pass: a footnote marker needs its own branch there (its `[`-prefilter already passes `[^1]`), or markers draw raw at rest and morph on cell entry. The focused `CellEditor` reuses `markdownDecorations`, so it renders markers for free; it omits `markdownInput`, so the auto-seed transform won't fire in cells (consistent with cell-creation being a Prospect). The cell codec means a definition can never live in a cell — only markers.
- `Pommora/src/renderer/src/MarkdownPM/editor/connections.ts` + `editor/links.ts` — the click skeleton markers inherit: mousedown claims the press and records `caretInside` before CM seats the caret, click (button 0, single, empty selection) navigates, hit test is offsets ∩ drawn DOM, hover uses the cheap-class-gate-first `hoverIntent`. `expandFoldsAt` (`editor/folding.ts`) is load-bearing for jumping into a hidden section — a folded region has no height to scroll to.
- Undo grouping is default `history()` + strict one-dispatch discipline (`diffAsSingleReplace` flattens multi-part work); no `isolateHistory`/`addToHistory` anywhere. "One transaction, one undo" for pair-writes and pair-deletes follows the list-drag model.

### Decisions

#### A — The Model
- **A-1:** [confirmed] GFM reference footnotes only: `[^label]` markers in the body, `[^label]: text` definitions. No inline `^[text]` syntax anywhere. Disk is plain GFM.
- **A-2:** [confirmed] The footnotes section is the **last contiguous run of definition lines** in the document. Definition syntax anywhere else is literally plain text — not parsed. Accepted divergence from GitHub, which honors mid-doc definitions; Resolve repairs (see A-6 open).
- **A-3:** [confirmed] A marker renders as a footnote iff its definition exists in the section; an unmatched `[^1]` stays literal text (GitHub-identical).
- **A-4:** [confirmed] Duplicate labels legally share one definition and one number.
- **A-5:** [open] Exact boundary grammar of "last contiguous run": do blank lines between definitions and GFM multi-line continuation lines (indented) count as part of the run? Trailing blank lines after the last definition?
- **A-6:** [open] "Resolve repairs" — what gesture is "Resolve," and what does the repair do (move mid-doc definitions into the section)?

#### B — Markers
- **B-1:** [confirmed] A marker renders as its **positional number** (first-use order, GitHub/Google Docs style), accent at tint-primary, permanently opaque — no live-syntax reveal at any caret position; atomic and caret-proof, backspace removes it whole.
- **B-2:** [confirmed] Click jumps to the definition; if the definition is a markdown link, click navigates to the link instead.
- **B-3:** [confirmed] Right-click: **Edit** (jump caret into the definition) and **Delete**. Deleting a marker (backspace or menu) also deletes its definition when it was the last reference — one transaction, one undo.
- **B-4:** [confirmed] Selection sweeps/cuts remove only the swept range, so a cut-paste move reconnects to the surviving definition.
- **B-5:** [confirmed] Markers render and work inside table cells; *creating* one from inside a cell is a Prospect.
- **B-6:** [open] "The definition is a markdown link" — does that mean the definition's entire content is a single link? Does a `[[Connection]]` definition get the same click-through treatment?
- **B-7:** [open] Does a `[^1]` occurring *inside* a definition line render as a marker there too, or stay literal within the section?

#### C — The Section
- **C-1:** [confirmed] Hidden by default; the body shows numbered markers only. Divider is the shared heading seam token; clicking the divider folds the section.
- **C-2:** [confirmed] A left-aligned **Show Footnotes** control sits at the document's end in flow, never higher than the pane bottom. Discloses with the disclosure animation — bar on ease-standard, divider blur-fading in/out.
- **C-3:** [confirmed] Disclosure state is remembered per page per machine, like heading folds.
- **C-4:** [confirmed] Definition text renders at label-secondary, 0.75em (the editor is em-scaled — the type ramp is not consumed). Connections and markdown links render normally inside definitions.
- **C-5:** [confirmed] Multi-line definitions per GFM; Enter does not auto-continue one.
- **C-6:** [open] When no footnotes exist, is the Show Footnotes control absent entirely?

#### D — Creating
- **D-1:** [confirmed] Every creation path writes the complete marker + definition pair in one undoable transaction and auto-discloses the section.
- **D-2:** [confirmed] **Insert ▸ Footnote** (context-menu Insert submenu) — caret seated in the new empty definition.
- **D-3:** [confirmed] **Paste As ▸ Footnote** — pasted content becomes the definition; internal targets offer Footnote · Connection · Markdown Link.
- **D-4:** [confirmed] Typing `[^1]` by hand auto-seeds its empty definition (typing-transform category). Empty definitions are valid.

#### E — Numbering
- **E-1:** [confirmed] Display is always positional (first-use order).
- **E-2:** [confirmed] Footnote **gestures** also renumber the numeric disk labels to match position; **hand edits never trigger rewrites**. Non-numeric labels like `[^note]` keep their names on disk (display still positional).
- **E-3:** [open] The exact gesture set that renumbers: Insert ▸ Footnote, Paste As ▸ Footnote, menu Delete — does atomic marker backspace count as a gesture too?

#### F — Stats & Settings
- **F-1:** [confirmed] One new Pages & Editor toggle: **Include Footnotes In Page Statistics**, default Off — definitions and markers excluded from lines/words/chars. No metadata toggle; frontmatter is already excluded.

### Core (must-have)
- The section model (last-contiguous-run parse, GitHub-identical unmatched-marker fallback), atomic positional markers with click/right-click behavior, the hidden-by-default section with per-page-per-machine disclosure, all three creation doors, gesture-scoped renumbering, and the stats toggle.

#### Prospects (allowed later, not now)
- Hover preview of a definition on its marker — spec-deferred.
- Drag-to-reposition markers — spec-deferred.
- Footnote creation from inside table cells — spec-deferred; markers still render and work in cells now.

#### Out of Scope (won't do)
- Inline `^[text]` footnote syntax — the pair syntax is the model.
- Honoring mid-doc definitions — accepted divergence from GitHub.

#### Considered & Rejected
- (pending — approach round not yet run)

#### Lessons
- (pending)
