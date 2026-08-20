## Footnotes — Decision Log

### Frame
- **Purpose:** Bring GFM reference footnotes to MarkdownPM — `[^1]` markers in the body, `[^1]: text` definitions gathered in a hidden-by-default section at the document's end — canonical GFM on disk, everything drawn being presentation.
- **Core Value:** A page can carry footnotes that read as clean numbered markers in the body, stay portable GFM outside Pommora, and never corrupt the document through any gesture.
- **Success Criteria:** Creating, reading, clicking, editing, and deleting footnotes all work through the paths this log settles; an unmatched marker or a mid-doc definition degrades to literal text exactly as specified; the disk stays plain GFM throughout.

### Sources
- [[MarkdownPM]] — the editor's architecture: behavior layer over CM6, disk == doc string, display-only UI state in `nexus.db`, dynamic-syntax reveal rules, typing transforms, the native context menu with Insert/Paste As.
- [[Editor-Internals]] — hard invariants: per-doc-version derivations, fragment parses, atomic-transaction transforms, widget height answering, one-owner claim sets.
- [[ConnectionsPM]] — the inline-link precedent: click routing, right-click menus per construct, autocomplete; footnote markers borrow interaction shapes from here.
- [[ConfigurationPM]] — `.nexus/settings.json` personalization, the Pages & Editor toggle table the stats toggle joins, per-machine state in `nexus.db`.
- [[SubfieldPM]] — the bottom bar hosting the Show Footnotes reveal: per-view item registry (Pages show the stats item), the hover-revealed collapse chevron riding above the bar (the placement model), scoped mounts (the Page Preview reuses it, so the control follows there).
- `Pommora/src/renderer/src/design-system/tokens/theme-vars.css.ts` — `--border-heading` (the shared heading seam, a full border shorthand); `--tint-primary` (an opacity step, `60%` — consumed only inside `color-mix`, e.g. `--accent-stroke-hot`); `--label-secondary`; `--disclosure` (180ms) + `--ease-standard`.
- `Pommora/src/renderer/src/MarkdownPM/Styles.css` — `.mdpm-divider` is the heading seam worn as an inset rounded rule (the treatment a footnotes divider copies); `.mdpm-fold-reveal` is the editor's hand-rolled twin of the sidebar `Reveal` motion; the fold chevron mask.
- `Pommora/src/renderer/src/design-system/components/Reveal.tsx` — the body open/close primitive (`grid-template-rows 0fr ↔ 1fr` on `--disclosure`); a section disclosure is a `Reveal`-style unfold, not a Bloom.
- `Pommora/src/renderer/src/design-system/edge-fade.css` — the house mask-fade; note InteractionPM's Bloom is explicitly "no blur," so the divider blur-fade (C-3b) is a new motion, not a reuse.
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
- **A-1b:** [confirmed] Vocabulary: `label` is the text between `[^` and `]` — the footnote's on-disk identity key. Gestures mint numeric labels and keep them canonical; hand-typed or outside-authored labels are read as-is **when GFM parses them as labels** — a bracketed run with a space (`[^my note]`) is a CommonMark link definition, not a footnote, and never enters this feature (verified against the installed parser). Inside Pommora the label is invisible plumbing: never displayed (display is always positional), never editable in-page, meaningful only as the case-folded key pairing marker ↔ definition.
- **A-2:** [confirmed] The footnotes section is the **last contiguous run of definition lines** in the document. Definition syntax anywhere else is literally plain text — not parsed. Accepted divergence from GitHub, which honors mid-doc definitions (→ A-6).
- **A-3:** [confirmed] A marker renders as a footnote iff its definition exists in the section; an unmatched `[^1]` stays literal text (GitHub-identical).
- **A-4:** [confirmed] Duplicate labels legally share one definition and one number.
- **A-5:** [confirmed] Run boundary: the section is the trailing run of definition-start lines, their indented GFM continuation lines, and blank lines between definitions; trailing blanks after the last definition don't break it.
- **A-6:** [confirmed] Mid-doc definition syntax stays live prose — no repair mechanism exists or is planned; the "Resolve repairs" phrasing from the original spec is retired.
- **A-7:** [confirmed] **Label-binding.** A marker resolves iff a definition carries its case-folded label — GFM/GitHub/Obsidian-identical, verified against the installed parser. Labels are invisible plumbing: display is always positional, gestures keep labels canonical and the section sorted, and Pommora offers no in-page label editing, so nothing drifts inside Pommora. An outside edit that mismatches a label orphans that one footnote (marker goes literal), never the rest. Settled by the shared-definition round; order-binding rejected for its silent global misbinding under outside edits.

#### B — Markers
- **B-1:** [confirmed] A marker renders as its **positional number** (first-use order, GitHub/Google Docs style), accent at tint-primary, permanently opaque — no live-syntax reveal at any caret position; atomic and caret-proof, backspace removes it whole.
- **B-2:** [confirmed] Click jumps to the definition — except the click-through case, defined once in B-6.
- **B-3:** [confirmed] Marker right-click: **Edit** (jump caret into the definition), **Copy**, and **Delete**. Deleting a marker (backspace or menu) also deletes its definition when it was the last reference — one transaction, one undo.
- **B-4:** [confirmed] Selection sweeps/cuts remove only the swept range, so a cut-paste move reconnects to the surviving definition.
- **B-5:** [confirmed] Markers render and work inside table cells; *creating* one from inside a cell is a Prospect.
- **B-6:** [confirmed] **Click-through, defined once:** a marker click navigates instead of jumping only when the definition's entire content is exactly one markdown link or one `[[Connection]]` — trailing text or punctuation means it isn't, and the click jumps to the definition in the section like any other.
- **B-7:** [confirmed] A `[^1]` inside a definition stays literal — markers render in the body and table cells only, never within the section.
- **B-8:** [confirmed] **Sharing a definition is copy-paste.** Copying a marker yields its raw `[^label]`; pasting it in-page is the second reference (label-binding resolves it). The Copy menu rows on both the marker and the definition are the discoverable door; no merge gesture exists.
- **B-9:** [confirmed] Both Copy rows put the raw `[^label]` reference on the clipboard — the shareable thing — rather than the definition's text.

#### C — The Section
- **C-1:** [confirmed] Hidden by default (Default Visibility's factory default — F-4); the body shows numbered markers only. Open, the section wears the shared heading seam as its divider, and the divider itself is clickable to fold — no chevron on it.
- **C-2:** [confirmed] **Show and Hide both live on the Subfield** as one toggle control, placed like the bar's hover-revealed collapse chevron — hover-revealed the same way, and always shown when the page is scrolled fully to the bottom. (Supersedes the earlier in-flow-at-doc-end placement.)
- **C-3:** [confirmed] **Visibility is a default plus an override:** the nexus-wide default comes from the **Default Visibility** setting (Pages & Editor ▸ Footnotes); the per-page per-machine override is an explicit true/false in `nexus.db`, written when the user toggles a page, absent meaning follow-the-default. (Supersedes plain per-page memory.)
- **C-3b:** [confirmed] The section's fold/unfold uses the same animation as the heading disclosure (the editor's fold-reveal motion); the divider blur-fades in/out — the one new motion this feature introduces.
- **C-4:** [confirmed] Definition text renders at label-secondary, 0.75em (the editor is em-scaled — the type ramp is not consumed). Connections and markdown links render normally inside definitions.
- **C-5:** [confirmed] Multi-line definitions per GFM; Enter does not auto-continue one.
- **C-6:** [confirmed] When no footnotes exist, no control appears anywhere — nothing at the doc end, nothing on the Subfield.
- **C-7:** [confirmed] **Definition lines render as listed items:** the `[^n]:` prefix draws as a number glyph in the list-marker manner — caret-proof, so the resolved order can't be hand-disrupted inside Pommora. Select→delete of a definition deletes the definition **and every** body marker sharing its label — the inverse of the body-side cascade, one transaction, one undo.
- **C-8:** [confirmed] Gesture renumbering also reorders the section's definition lines to match positional order.
- **C-9:** [confirmed] Backspace at a definition's content start removes the whole footnote — definition and body marker(s) — content or not; one transaction, one undo.
- **C-10:** [confirmed] Definition right-click: **Copy** and **Delete**.

#### D — Creating
- **D-1:** [confirmed] Every creation path writes the complete marker + definition pair in one undoable transaction; whether it also auto-discloses the section and seats the caret in the definition follows the Jump To Definition On Creation toggle (F-2).
- **D-2:** [confirmed] **Insert ▸ Footnote** (context-menu Insert submenu) — the pair written at the caret's footnote position; caret seating per F-2.
- **D-3:** [confirmed] **Paste As ▸ Footnote** — pasted content becomes the definition; internal targets offer Footnote · Connection · Markdown Link.
- **D-4:** [confirmed] Typing `[^1]` by hand auto-seeds its empty definition (a typing transform) **and runs the same normalization as any creation gesture** (→ E-3); typing a label that matches an existing definition adopts it instead. The seed fires only on a shape GFM parses as a label, respects the `\[^1]` escape (verified — the escape suppresses the reference at the parser too), and the whole creation reverts on one ⌘Z. Empty definitions are valid.

#### E — Numbering
- **E-1:** [confirmed] Display is always positional (first-use order).
- **E-2:** [confirmed] Footnote **gestures** renumber the numeric disk labels and reorder the section to match position — inserts and deletes "re-run and normalize the order"; inserts mint the next `[^n]` by auto-ordering. **Hand edits never trigger rewrites.** Pommora offers no in-page way to edit a marker's label — markers are created through gestures and stay atomic.
- **E-2b:** [confirmed] **Numeric labels are gesture-owned; word labels are user-owned; both hold a position.** A word label like `[^note]` is never rewritten but counts in the position arithmetic — body `[^1] [^note] [^3]` is canonical, the insert after `[^note]` minting `[^3]` because the word occupies slot 2. The section sorts and displays purely positionally (its glyphs read 1, 2, 3 over whatever labels sit beneath), so a numeric disk label always equals its display number — except where an orphan squats on a number, which minting skips (→ G-1), and between a hand-typed numeric label and the next gesture that normalizes it (disk `1,2,5` displaying `1,2,3` until then).
- **E-3:** [confirmed] The renumbering gesture set: Insert ▸ Footnote, Paste As ▸ Footnote, **the typed auto-seed** (typing a fresh label is a creation gesture and normalizes like any other), marker-menu Delete, atomic marker backspace, and section-side definition deletion. Typing a label that matches an existing definition is adoption/sharing (→ G-1) and rewrites nothing. Non-creating hand edits — prose, selection sweeps, definition text — never rewrite.

#### F — Stats & Settings
- **F-1:** [confirmed] One Pages & Editor toggle: **Include Footnotes In Page Statistics**, default Off — **resolved markers and the section's lines** excluded from lines/words/chars; literal footnote syntax (unmatched markers, mid-doc definitions) is prose and always counts. No metadata toggle; frontmatter is already excluded.
- **F-2:** [confirmed] A second Pages & Editor toggle, **Jump To Definition On Creation**, default On: creation auto-discloses the section and seats/scrolls the caret into the new definition; Off writes the pair silently and leaves the caret at the marker. It stands beside the stats toggle.
- **F-3:** [confirmed] The Page Preview's scoped Subfield carries the Show/Hide Footnotes toggle along.
- **F-4:** [confirmed] **Default Visibility** lives under Pages & Editor ▸ **Footnotes** — the nexus-wide default the per-page override falls back to; its factory default is Hidden.
- **F-5:** [confirmed] All three footnote settings (Default Visibility, Jump To Definition On Creation, Include Footnotes In Page Statistics) group under that Footnotes heading in the Pages & Editor leaf.

#### G — Edge Behavior (from the don't-forget sweep)
- **G-1:** [confirmed] **Orphaned definitions render dimmed** — a definition no body marker references keeps its listed seat, numberless and dimmed, editable and deletable, never auto-removed. It un-dims and takes its positional number live the moment a marker with its label exists (a pasted reference, or a hand-typed one — the auto-seed adopts an existing definition rather than seeding a duplicate), the same live re-resolution phantom connections get. Gestures never resolve or remove orphans; renumbering routes around their labels.
- **G-2:** [confirmed] With the Subfield app-collapsed, the footnotes toggle is reachable only through the bar's own hover reveal — acceptable; no second affordance.
- **G-3:** [assumed] Marker/definition menu actions re-verify their target against the current doc at commit (the connections-menu pattern), so an outside edit landing mid-menu can't misfire.
- **G-4:** [assumed] Selection paint may notch around the atomic marker widget, same class as the existing connection-glyph Known Issue — accepted cosmetic risk, not designed around.
- **G-6:** [confirmed] **Duplicate definitions: first wins** (the parser's and GitHub's behavior — every marker binds to the first line carrying the label); a later same-label definition line renders dimmed and numberless like an orphan, never auto-removed. Distinct from A-4's duplicate markers, which are the sharing feature.

### Core (must-have)
- The section model: last-contiguous-run parse, label-binding with case-folding, unmatched markers literal (GitHub-identical), mid-doc definition syntax staying live prose.
- Atomic, never-revealing positional markers: click-jump (link/connection click-through), the Edit · Copy · Delete menu, whole-marker backspace with last-reference cascade, rendering in table cells.
- The section: listed-glyph definitions (caret-proof prefixes), Copy · Delete menu, sweep/backspace deletion cascading to all referencing markers, heading-fold disclosure animation, the clickable seam divider, label-secondary 0.75em text with live connections/links.
- Visibility: the Subfield Show/Hide toggle (hover-revealed, persistent at full scroll, carried into Page Preview), Default Visibility setting + per-page `nexus.db` override.
- Creation: Insert ▸ Footnote, Paste As ▸ Footnote, hand-typed auto-seed — complete pairs, one undo; gesture renumbering + section reordering; copy-paste sharing.
- Settings: the Pages & Editor ▸ Footnotes trio; stats exclusion honoring both counting pipelines.
- Adopted source actions: the disclosure-override scope joins `COPY_SCOPES`; feature tokens/classes avoid the bare `footnote` name the type scale owns; the stale `.nexus/` persistence comment in `Tables/widget.tsx` is corrected in passing.

#### Prospects (allowed later, not now)
- Hover preview of a definition on its marker — spec-deferred.
- Drag-to-reposition markers — spec-deferred.
- Footnote creation from inside table cells — spec-deferred; markers still render and work in cells now.

#### Out of Scope (won't do)
- Inline `^[text]` footnote syntax — the pair syntax is the model.
- Honoring mid-doc definitions — accepted divergence from GitHub.

#### Considered & Rejected
- **Order-binding** (body's Nth distinct marker ↔ section's Nth definition, label text ignored) — one outside insertion or reorder in the section silently shifts every downstream binding; label-binding degrades per-footnote instead of globally.
- **Merge-drag of definitions** (drag definition A onto B to consolidate) — heaviest option for the rarest need, destructive of A's text, and has no inverse; no editor in this space built one either.
- **Gesture-minted stable non-numeric labels** (never rewrite disk) — the raw file reads worse, cutting against Reasonable Legibility; gesture renumbering keeps canonical `1..N` labels instead.
- **The in-flow "Show Footnotes" control at the doc's end** — superseded by the Subfield toggle placement.
- **A chevron on the section divider** — the divider itself is the fold click-target; the Subfield toggle is the other half.

#### Lessons
- (pending)
