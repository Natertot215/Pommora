## MarkdownPM Footnotes — Decision Log

### Frame
- **Purpose:** Bring footnotes to MarkdownPM — inline references rendered as positional numbers, a definitions section at the bottom of the page, and the insertion, editing, and statistics plumbing around them — in portable Markdown that reads correctly in Obsidian.
- **Core Value:** Google-Docs-grade footnote ergonomics (insert anywhere, numbering resolves itself) without corrupting the doc's portability or paying re-scan costs on every keystroke.
- **Success Criteria:** Insert ▸ Footnote produces a correctly-numbered footnote; adding/removing one resolves the others' numbers; the bottom section renders below the heading-seam hairline, folds, and stays out of the page statistics by default; the file round-trips through Obsidian legibly.

### Sources
- [[MarkdownPM]] — architecture (micromark/mdast behind `parser/`, behavior layer pure logic), dynamic-syntax reveal model, context menu + Paste As, embed/tile precedents, editor design tokens (em-scaled off `--mdpm-scale`, no type-ramp consumption).
- [[Editor-Internals]] — hot-path rule: one per-doc-version derivation for whole-doc scans; widgets need explicit `ignoreEvent → false`; block widgets must report height; box constructs use outer gaps not margins.
- [[SubfieldPM]] — Pages stats are `lines · words · characters` off the live body (body-only, frontmatter stripped on load); app-level collapse chevron precedent; Subline/Emphasized type.
- [[ConfigurationPM]] — Pages & Editor settings table (`codeblockLineCount`, `outlinerLines` are the boolean-toggle precedents); personalization schema drops unknown keys to defaults.
- [[DesignSystemPM]] — `--border-heading` (`1.75px solid var(--separator-border)`) is "the 1.75 hairline"; tint ladder `--tint-primary` = 60%; accent derivations.
- [[InteractionPM]] — `Reveal` (grid-rows 0fr↔1fr on `disclosure`/`easing.standard`) is the canonical disclose; `--ease-standard`; editor fold chevron rides the disclosure beat.
- [[TypographyPM]] — Subline = 10px/12px vs Body 13px/16px; the editor scales in em off its zoom root, not the ramp.
- `Pommora/src/main/editorMenu.ts` — the OS-native editor context menu: Insert submenu rows dispatch `mdpm:block:*` action strings over `menu:action`; Paste As built from main's own clipboard read; live state via the pushed single-slot `FormatState` cache.
- `Pommora/src/shared/PasteAsMenu.ts` — clipboard classification (`url` / `page`) + the per-kind form-row lists (`PAGE_ROWS`: Connection · Markdown Link; `URL_ROWS`: three link forms + Plain Text) + `pasteAsWrite`.
- `Pommora/src/renderer/src/MarkdownPM/editor/menu.ts` — `applyEditorAction`: where an Insert ▸ Footnote action branches (the `block:page` / `link:insert` special-case pattern).
- `Pommora/src/main/connMenu.ts` + `returningMenu.ts` + `renderer/src/MarkdownPM/editor/linkEdit.ts` / `linkFormat.ts` — the token right-click menu template: pure span-resolver + applier split, stale-span guard, re-find token by span, seat via `focusRange`. The pattern a footnote's Edit/Delete follows.
- `Pommora/src/renderer/src/MarkdownPM/tokens/index.ts` — `TokenKind` union (no footnote member yet); `FormatState` gains booleans per the `link`/`connection` precedent.
- `Pommora/src/renderer/src/Detail/Subfield/subfieldStats.ts` — `computeStats(body)` + `stripMarkdown`; the single place statistics change, one caller (`subfieldItems.tsx`). Recompute is 120ms-debounced off the live body, never per-keystroke.
- `Pommora/src/renderer/src/design-system/reveal-bar.css` — the shared hover-revealed collapse-bar pattern (Subfield + preview footer); a "Show Footnotes" bar is a third consumer: host supplies height, click width, and the open/near classes.
- `Pommora/src/shared/types.ts` `Personalization` + `src/main/readNexus.ts` coercer + `Settings/NexusSettings.tsx` `pages` leaf rows — the exact 4-step recipe for a new boolean toggle (personalization is TS-interface + hand coercer, not zod). Editor toggles reach CM6 as a root CSS class + `requestMeasure()`, never a facet/compartment; a decoration-changing knob needs a Compartment or StateEffect nudge instead.
- `Pommora/src/main/io/pageFile.ts` `splitEnvelope` + `Detail/PageView.tsx` — frontmatter is stripped before the editor and before stats; counts are body-only today, so "Include metadata" is a new inclusion path, not an exclusion flip.
- `Pommora/src/renderer/src/MarkdownPM/parser/index.ts` — the parse seam already wires `micromark-extension-gfm` + `mdast-util-gfm`, which bundle the footnote extensions: `[^1]` / `[^1]: text` parse to `footnoteReference` / `footnoteDefinition` today with zero new dependencies.
- `Pommora/src/renderer/src/MarkdownPM/tokens/index.ts` + `detect/index.ts` + `decorations/intent.ts` — a footnote ref is a new `TokenKind` (regex house style, bracket-construct); a definition line is a `detect/` line scanner with the required `excluded` (fence/table/math) contract; the ref renders as the editor's FIRST inline replacing widget (whole `[^1]` span in ONE replace — abutting replaces get dropped by CM), atomic-ranged, no `activeTokenIndices` consultation, `ignoreEvent → false`.
- `Pommora/src/renderer/src/MarkdownPM/editor/docCache.ts` + `editor/embedRanges.ts` `docLineScan` — the one per-doc-version derivation the footnote order scan must ride (`refs`/`defs`/`numberOf` by first-reference position); inline tokens are viewport-scoped so numbering CANNOT derive from token order.
- `Pommora/src/renderer/src/MarkdownPM/editor/folding.ts` — the in-house fold machinery (StateField + RevealWidget animating grid-rows, chevron as a line-class `::before`, NOT a CM gutter); persisted per page-id via `FoldsApi` → `local_state` in nexus.db (a new scope = union string + channel pair + `remint.ts` `COPY_SCOPES`). A synthetic section key (e.g. `"\0footnotes"`) slots into the existing string-keyed fold set.
- `Pommora/src/renderer/src/MarkdownPM/Styles.css` — `.md-hr` (1.5px `--separator-border`) is the existing full-width rule; `.md-cb { --cb-size: 0.85em }` line-class is the small-text precedent a footnote section copies (`--fn-size` knob, inset `::after`, no line margins); inline-block glyphs must zero `text-indent` inside list lines.
- `Pommora/src/renderer/src/MarkdownPM/editor/embedInsert.ts` + `input/format.ts` — the two insertion patterns; Insert ▸ Footnote wants the view-aware one: one dispatch carrying both the `[^N]` at caret and the doc-end definition append, single undo step, caret seated in the definition.
- `Pommora/src/renderer/src/MarkdownPM/input/format.ts` `setListKind` — the renumber discipline: emit no edit where a marker already reads correctly, or every keystroke invalidates the doc caches.
- External (researched 08-19-2026): CommonMark 0.31.2 has no footnotes; GFM footnotes are cmark-gfm convention (never formally spec'd), positional render numbering confirmed by the micromark-extension-gfm-footnote readme + GitHub docs; Obsidian supports both syntaxes but live preview shows typed labels and skips inline notes entirely; deprecated `remark-footnotes@4` was the last inline-note support; Zettlr is the reference CM6 implementation (footnote InlineParser registered `before: 'Link'`, insert command renumbers subsequent numeric labels only); Google Docs numbering is read-only positional (`footnoteNumber` vs `footnoteId`).

### Decisions
#### A — Syntax & Numbering Model
- **A-1:** [confirmed] Reference style `[^N]` + `[^N]: text`, not inline `^[text]` — Nathan opened the door to the flip and ratified it through the decisions that followed. Grounds: inline notes are self-contained (no bottom section exists to render, fold, or exclude), their only micromark support is a deprecated package, and Obsidian's live preview doesn't render them at all; reference style parses today via the installed GFM extensions and is the GitHub/Obsidian-portable form.
- **A-2:** [confirmed] GFM renderers number reference footnotes positionally at render, ignoring label text (`[^a], [^5], [^b]` → 1, 2, 3 on GitHub; Obsidian reading view identical). Pommora's displayed number is therefore always positional — that's rendering the format truthfully, riding the per-doc-version scan.
- **A-3:** [assumed] Disk labels: gesture-scoped renumbering. Footnote gestures (Insert, Delete, future drag) rewrite labels to match position inside their own transaction — single undo step, no-op spans skipped (`setListKind` discipline). Hand-typed edits never trigger rewrites (the editor never auto-tidies). Strengthened by research: Obsidian's *live preview* shows the typed label, not the positional number, so cohesive disk labels are what keep a Nexus legible there.
- **A-4:** [confirmed] The "Automatically resolve footnote order" setting is dropped — positional display isn't optional and gesture renumbering has no sane OFF.
- **A-5:** [confirmed] Duplicate labels are a feature, not an error: multiple `[^1]` refs share one definition and one number (GFM semantics, numbering by first use).
- **A-6:** [confirmed] Mid-doc definitions never render (Nathan's call — "that's that"). A `[^N]:` line outside the trailing section (foreign/hand-authored files only) hides entirely, the way callout heads and folded bodies already render bytes as nothing — caret-proof and delete-guarded per those precedents — while still resolving its markers and participating in numbering. Display-relocation stays forbidden; hiding is not relocation. Right-click ▸ Edit on a marker whose definition sits mid-doc relocates that definition to the trailing section in the same gesture before seating the caret (consistent with "the Edit flow never shows a mid-doc location"); Resolve Footnote Order consolidates all strays.
- **A-8:** [confirmed] No "resolve on visibility toggle" setting — a view gesture must not mutate the document (every display action is write-free by design). Instead an explicit **Resolve Footnote Order** action on the footnote section's right-click renumbers mismatched labels. [assumed] It also consolidates stray mid-doc definitions to the bottom section (Tidy-Footnotes-style) — endorsed as part of the proposal, awaiting a direct yes.
- **A-9:** [confirmed] The editor understands a `[^N]:` line wherever it sits, but no Pommora gesture creates or places one outside the bottom section — Insert always appends there, and the Edit flow never offers or shows mid-doc placement.
- **A-7:** [confirmed] Parser trap: footnote refs must be claimed before/apart from the link grammar (Zettlr registers its footnote parser `before: 'Link'`). House regex for `[^1]` without a following `(` likely never matches `markdownLinkRegex`, but it gets pinned by test. cmark-gfm's seven documented label-matching bugs are catalogued in the micromark readme — read before writing the ref regex.

#### B — Editor Rendering
- **B-1:** [assumed] Reference marker renders as an accent-at-tint-primary number widget; no live-syntax reveal on caret entry — editing only via right-click ▸ Edit, which seats the caret in the revealed syntax (syntax keeps footnote sizing while revealed).
- **B-2:** [confirmed] Footnote text sizes at **0.75em** (Nathan's call) as a `--fn-size` knob following the code block's `--cb-size` line-class pattern, since the editor doesn't consume the type ramp. Worn by the definition-section lines and by revealed syntax while editing there.
- **B-6:** [confirmed] Color split: the *marker* wears accent at `--tint-primary`; *definition* text reads `--label-secondary` at the footnote size (Nathan, this round).
- **B-3:** [confirmed] The definitions-section divider is the shared heading seam (`--border-heading`) — the same token the Subfield's top divider consumes.
- **B-4:** [assumed] Divider click folds the section; hidden state shows a left-aligned "Show Footnotes" disclosure (Subfield-toggle-like); disclose on the disclosure/`Reveal` primitive, bar entering on `--ease-standard`, divider blur-fading in/out.
- **B-5:** [open] Where fold state persists — per-machine `nexus.db` like heading folds, presumably.

#### C — Insertion & Menus
- **C-1:** [confirmed] Insert ▸ Footnote joins the existing Insert submenu of the OS-native editor context menu.
- **C-2:** [confirmed] Right-click on a footnote marker: Edit / Delete. Edit jumps the caret into the definition's text at the bottom (scroll-glide travel); Delete removes the reference.
- **C-6:** [confirmed] Plain click on a marker jumps to its definition; a marker whose definition is a markdown link navigates to the link instead (C-5).
- **C-3:** [confirmed] Paste As ▸ gains Footnote: external addresses add it; internal targets offer Footnote · Connection · Markdown Link.
- **C-4:** [confirmed] Paste As ▸ Footnote creates a footnote whose definition body is the pasted content — a URL writes `[^N]: <link>`, an internal target `[^N]: [[Title]]` — with the numbered marker at the caret. The URL case makes the marker click-navigate per C-5.
- **C-5:** [confirmed] A footnote marker whose definition is a markdown link navigates on click.

#### D — Statistics & Settings
- **D-1:** [confirmed] Pages & Editor gains "Include footnotes in page statistics" — default OFF (footnotes excluded from lines/words/chars).
- **D-2:** [confirmed] "Include metadata in page statistics" is dropped — frontmatter is already excluded (stats compute off the body-only string), so OFF is current behavior and ON would build a new inclusion path nobody needs.
- **D-3:** [assumed] No footnote-order setting ships in Pages & Editor — display numbering is inherently positional (A-2), gestures renumber (A-3), and explicit repair is the Resolve Footnote Order action (A-8).

#### E — Performance
- **E-1:** [confirmed] Footnote scanning/numbering must ride the existing one-per-doc-version derivation — no per-keystroke whole-doc re-walk beyond what already runs.

#### F — Sweep Findings (deletion, orphans, edges)
- **F-1:** [confirmed] Deleting a marker deletes its definition with it (when it was the last reference; shared definitions survive) — Backspace/forward-delete on the atomic marker and right-click ▸ Delete both cascade, one transaction, one undo. The cascade is uniform regardless of how the definition was authored (gesture, hand-typed, foreign/mid-doc) — the delete resolves the definition by label at gesture time, wherever the line sits. [assumed] A *selection sweep or cut* containing a marker removes only the swept range — the definition survives in the section (an orphan until re-referenced), so a cut-paste *move* reconnects on paste; cascading there would destroy the definition, since the clipboard is plain text and can't carry it.
- **F-2:** [confirmed] A marker renders as a footnote whether or not a definition exists — the body never distinguishes the two (Nathan: "no way for MarkdownPM's body to tell"), and a definition-less marker still numbers positionally. This deviates from GFM's render-as-literal-text for unmatched refs, deliberately. A definition with no references still renders in the section when disclosed. [assumed] On a definition-less marker: plain click is inert beyond disclosure (a click must not mutate), right-click ▸ Edit *creates* the definition — appends `[^N]: ` to the section and seats the caret — and Delete removes just the marker.
- **F-3:** [confirmed] Non-numeric labels (`[^note]`, foreign files): renumbering (gestures and Resolve) touches numeric labels only — a named label is an authored choice and keeps its name while taking its positional display number (Zettlr's discipline).
- **F-4:** [assumed] Table cells split by tier: markers *render* in cells in core (number, click-jump, right-click — the walked links-in-resting-cells path; the whole-doc scan already sees table source), while *insertion from inside a cell* stays a Prospect (one gesture writing the cell diff plus a page-doc append is new two-writer coordination). Recommended twice, not yet ruled on by Nathan.
- **F-5:** [confirmed] A jump to a definition hidden by a fold (the section's own fold included) routes through the editor's existing reveal seam — scroll to an offset, opening every collapsed section hiding it.
- **F-6:** [confirmed] Connections and markdown links inside definition lines tokenize and render normally (definition lines are prose lines wearing a line class, not code) — required for C-4/C-5; the rename cascade sweeps them for free since definitions are body text.
- **F-7:** [confirmed] Stats exclusion semantics (default): definition lines drop from the `lines` count and their prose from words/characters; markers drop from words/characters. The Pages & Editor toggle ON counts both.
- **F-8:** [confirmed] "Show Footnotes" sits at the document's end in flow but never higher than the pane's bottom edge — a short doc shows it resting at the pane bottom, a long doc after the content.
- **F-9:** [confirmed] The footnotes section is hidden by default — the body carries markers only; "Show Footnotes" / the divider disclose it. Insert, Edit, and marker clicks auto-disclose via the reveal seam. [assumed] Disclosure state is remembered per page per machine like heading folds, defaulting to hidden on first open.

### Core (must-have)
- The `footnoteRef` token + `footnoteDefinition` line scan (regex house style; `excluded`-contract respected), numbered positionally off the per-doc-version scan.
- The marker: an inline replacing widget over the whole `[^N]` span — accent at `--tint-primary`, atomic, caret-proof, no reveal, `ignoreEvent → false`; click jumps to the definition (or navigates when the definition is a link).
- The definition section: hidden by default, line-class styling at `--fn-size: 0.75em` with `--label-secondary` text, the heading-seam divider above the trailing run, divider-click fold + the "Show Footnotes" bar (doc-end in flow, floored at the pane bottom) on the existing fold/Reveal machinery, state per-machine (new `local_state` scope + remint copy). Mid-doc definition lines never render — hidden with the callout-head/fold guards — while still resolving.
- Insert ▸ Footnote (view-aware insertion: marker at caret + definition appended, one transaction, caret seated in the definition) with gesture renumbering.
- Right-click on marker: Edit (jump to definition) / Delete (marker + last-ref definition).
- Resolve Footnote Order on the section's right-click: renumber numeric labels + consolidate stray definitions.
- Paste As ▸ Footnote (URL and internal-target forms).
- Pages & Editor: "Include footnotes in page statistics", default OFF; `subfieldStats` footnote stripping.

#### Prospects (allowed later, not now)
- **Hover preview of the definition on a marker** — Nathan-flagged prospect; don't-foreclose: the marker widget should be a component a hover card can attach to (connections' hover preview is the pattern).
- **Drag-to-reposition a footnote marker** — Nathan-flagged prospect; don't-foreclose: gesture renumbering already makes reposition-then-renumber a single-transaction shape.
- **Footnote refs rendering fully inside table cells** — needs the resting-cell renderer + a cell→page insertion route (F-4).

#### Out of Scope
- **"Include metadata in page statistics" toggle** — frontmatter never reaches the stats path today; counting it would be a new inclusion path with no user. Dropped by Nathan.
- **Inline `^[text]` authoring** — not this feature's job at any point; the reference form is the format.

#### Considered & Rejected
- **Inline `^[text]` syntax** — self-contained, so the bottom section/fold/stats design has nothing to act on; only deprecated micromark support; Obsidian live preview doesn't render it. (The original spec's rationale — "doesn't have to re-order real syntax" — is answered by positional display numbering instead.)
- **Full auto-renumber on every edit** — violates the editor's never-auto-tidies contract, fights the undo stack, churns the per-doc-version caches.
- **Never renumber (stable IDs, display-only)** — cheapest, but the raw file reads out of order, which Obsidian's live preview exposes verbatim; Nathan explicitly wants disk cohesion.
- **"Resolve order on visibility toggle" setting** — Nathan floated it; rejected because a fold/reveal gesture mutating the document crosses the write-free-display line every other view action holds (and dirties the file, undo stack, and watcher from a read gesture). The explicit Resolve Footnote Order action replaces it.
- **Display-relocating mid-doc definitions to the section** — rendering bytes somewhere other than where they sit is a reconstruction layer, the one thing the editor's architecture forbids. Hiding them in place (chosen, A-6) is a different move with existing precedent.
- **Rendering mid-doc definitions in place (styled or as raw prose)** — weighed as the visible-bytes option; Nathan ruled definitions belong to the section view alone, and the hiding precedents (callout head, folds) carry the caret/delete guards that make it safe.

#### Lessons
- (none logged yet)
