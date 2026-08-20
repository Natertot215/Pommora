## Footnotes — Implementation Plan

> **Status:** written, pending review · Spec: [[Footnotes — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

MarkdownPM gains GFM reference footnotes. A page carries `[^1]` markers in its body and a trailing run of `[^1]: text` citations at the document's end; the markers draw as clean positional numbers, the citations gather into a hidden-by-default section, and the file on disk stays plain GFM that GitHub and Obsidian read identically.

The shape is set by one principle: **the section's boundary is derived once and every consumer reads that derivation.** Six layers need to know where the citations section starts — the decoration pass, the block resolver, the heading-fold scan, the transaction guard, the Subfield counter, and the fold region — and a boundary each of them re-derives is a boundary they will eventually disagree about. So the scan is a shared pure module both processes' readers import, and it is built and proven by a unit-testable consumer before a single pixel is drawn.

Where the log named a fixture to reuse, the fixture was verified rather than assumed, and two of them moved: a citation's number glyph borrows the **codeblock line-count chrome** (a computed ordinal drawn over hidden source) rather than the ordered-list marker (which is its own literal source text and cannot show a number its line does not hold), while sharing that marker's CSS so the two read identically; and the section's fold state is seeded from its own row rather than persisted through the fold system, whose one shared per-page row would otherwise make it the second writer the spec forbids.

Deliberately not solved here: mid-document citations (they stay live prose), inline `^[text]` syntax, hover previews of a citation, drag-to-reposition markers, and creating a footnote from inside a table cell. The three existing Subfield counting inaccuracies — tables, indented code, math — are out of scope and stay exactly as inaccurate as they are today.

**Requirements**

1. **The model.** Pair syntax only. The section is the trailing run of parser-defined citation spans reaching the document's end, continuations and interleaved blanks included. Markers bind by case-folded label; an unmatched marker is literal text; citation syntax anywhere but the trailing run is live prose. (A-1 … A-7)
2. **Markers draw.** A resolved marker renders as its positional number, accent at tint-primary, permanently opaque, never revealing its syntax, atomic to the caret. Markers render in the body and in table cells; a `[^1]` inside a citation stays literal. (B-1, B-5, B-7)
3. **Markers act.** Click jumps to the citation, or navigates when the citation's whole content is exactly one link or one Connection. Right-click gives Edit · Copy · Delete. Cascades are range-keyed. Copy yields the raw reference; cross-page pastes bind doc-scoped. (B-2, B-3, B-4, B-6, B-8 … B-11)
4. **The section draws.** Citations render as numbered rows with computed positional glyphs on the shared numeric-glyph styling, caret-proof prefixes, label-secondary 0.75em text with live links and Connections, and a hanging indent across continuation lines. Orphans and duplicate-losers render dimmed with a visible seat. Heading folds end at the section's start. The section is inert to grip-drag both ways. (C-4, C-7, C-11, C-12, G-1, G-1b, G-5)
5. **The section hides and shows.** Hidden by default. The divider is the shared heading seam and is itself the fold click-target. Show/Hide is one Subfield text control reading **Show Footnotes** / **Hide Footnotes**; the divider and that control write one per-page per-machine override, which falls back to a nexus-wide Default Visibility and clears when it lands on the default. The control appears only when at least one citation line exists, and rides into the Page Preview. Disclosure uses the editor's fold-reveal motion; the divider blur-fades. (C-1, C-2, C-3, C-3b, C-3c, C-6, F-3, F-4, G-2)
6. **Creation.** Insert ▸ Footnote, Paste As ▸ Footnote with normalization, and a hand-typed auto-seed each write a complete pair in one undoable transaction, honoring Jump To Citation On Creation. (D-1 … D-4, F-2)
7. **Numbering.** Display is positional. Creation and deletion gestures renumber numeric labels and reorder the section; word labels hold their position without being rewritten; non-creating hand edits never rewrite anything. (C-8, E-1, E-2, E-2b, E-3)
8. **Statistics.** The citations section never contributes to lines, words, or characters. A marker contributes its own source characters and zero words — `[^1]` is four and `[^10]` is five; the rule is the syntax's length, not a constant. No setting governs this. No non-footnote count moves. (F-1, F-1b)
9. **Guards and edges.** No in-app change may strand non-citation content at or after the section. Backspace at a citation's content start removes the whole footnote. Menu actions re-verify their target at commit. (A-5b, C-5, C-9, G-3, G-4)
10. **Settings.** Default Visibility and Jump To Citation On Creation group under a Footnotes heading in the Pages & Editor leaf. (F-4, F-5)
11. **Documentation.** Every document this makes false is rewritten in the commit that falsifies it.

**Acceptance — the whole thing working**

On a page authored outside Pommora holding body markers, a trailing citations run, one orphaned citation and one duplicate-labelled citation: the markers draw as 1, 2, 3 in first-use order regardless of their disk labels; the section is hidden on open with a Show Footnotes control on the Subfield; showing it reveals the divider and the numbered rows with the orphan and the duplicate-loser dimmed and numberless; the Subfield's three counts exclude every section line and score each marker its own characters and no word; clicking a marker jumps to its row and clicking the divider hides the section again; Insert ▸ Footnote writes a pair that renumbers the rest and reverts whole on one ⌘Z; and the file on disk, opened in another editor, is unchanged plain GFM apart from that one added pair.

**Forced By**

- `computeStats` returns `lines: lines.length` from a raw, mask-free split ([subfieldStats.ts:82](../../Pommora/src/renderer/src/Detail/Subfield/subfieldStats.ts#L82)) → the line count becomes mask-dependent for the first time; one mask array must feed both it and the prose pass, or the three counts stop describing the same document.
- `GONE = '\n'` is a word separator, chosen so a masked fence cannot glue its neighbors ([subfieldStats.ts:32](../../Pommora/src/renderer/src/Detail/Subfield/subfieldStats.ts#L32)) → a marker must be removed with `''` instead, or `sentence[^1].` counts as two words.
- The ordered-list marker is a `Decoration.mark` over its own literal source, with an in-source comment naming the no-widget choice deliberate ([intent.ts:523](../../Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts#L523)) → a positional glyph cannot come from that branch; it comes from the `lineWidget` + computed-ordinal shape the codeblock line count already uses ([intent.ts:261](../../Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts#L261)).
- `.md-ol-marker, .md-cb-ln` is already one shared rule ([Styles.css:583](../../Pommora/src/renderer/src/MarkdownPM/Styles.css#L583)) → identical styling is a selector-list addition, not new CSS.
- Ordered markers emit no `atomic` intent, and a test pins that a caret seats after the number → the one-keystroke prefix delete comes from `lineMarkerRe` ([input/index.ts:26](../../Pommora/src/renderer/src/MarkdownPM/input/index.ts#L26)), not from list atomicity.
- The fold persist listener writes every kind's key into one shared per-page row ([folding.ts:366](../../Pommora/src/renderer/src/MarkdownPM/editor/folding.ts#L366)) → the section's fold must not persist there, or C-3's single-writer rule breaks.
- `collapsedByDefault` is gated on `!wanted.size`, the page's whole saved fold set ([folding.ts:340](../../Pommora/src/renderer/src/MarkdownPM/editor/folding.ts#L340)) → one collapsed heading anywhere would open the section visible; the flag is retired rather than repaired.
- Fold entries match on `anchor` alone; only the prune filter compares `kind` → two kinds sharing an anchor offset collide, so the section's anchor must be a line no heading can occupy.
- `chevronDeco` stamps `md-foldable` on every region's anchor, and that class is simultaneously the heading-drag gate and gripMenu's heading hit-test ([gripMenu.ts:27](../../Pommora/src/renderer/src/MarkdownPM/editor/gripMenu.ts#L27)) → a non-heading fold anchor wearing it gets a dead right-click; the chevron class and the heading-gesture class must separate.
- `kindAt` returns `BlockKind | null` and `claimed` already reports blank lines as claimed → grip-drag inertness is the existing unowned-line answer, not a new `BlockKind` whose registration spans five sites the compiler does not all check.
- All three `atomicRanges` providers are line-leading or block-scope, and `Built.atomic` is built from viewport-scoped tokens → an inline atomic marker needs a whole-document range derivation, not a token-derived one, or it blinks in and out on scroll.
- `atomicRanges` do not block a programmatic dispatch ([calloutAtomic.ts](../../Pommora/src/renderer/src/MarkdownPM/editor/calloutAtomic.ts)) → atomicity alone cannot satisfy R9; a `transactionFilter` is mandatory alongside it.
- The typed editor-menu vocabulary was deliberately deleted in `8bd021c3` → menu actions cross the bridge as bare strings; the surviving idiom is `PASTE_AS_PREFIX` + `PasteAsForm`.
- `parse()` already runs `gfm()`, which bundles the footnote extension → `footnoteReference` / `footnoteDefinition` nodes are free at the inline layer; no dependency is added.
- `WidgetType.ignoreEvent` defaults to `true` ([Editor-Internals](../Guidelines/Editor-Internals.md)) → every interactive glyph this plan adds sets it false explicitly.

**Inherited Reasoning**

- **Order-binding** (body's Nth marker ↔ section's Nth citation) was rejected: one outside insertion silently shifts every downstream binding, where label-binding degrades one footnote at a time.
- **Merge-drag of citations** was rejected: heaviest option for the rarest need, destructive, no inverse. Sharing is copy-paste of the raw reference.
- **Gesture-minted stable non-numeric labels** were rejected: the raw file reads worse, against Reasonable Legibility.
- **Clipboard provenance barring cross-page marker pastes** was weighed and reversed: doc-scoped binding is what the bytes mean in that document, and matches GitHub and Obsidian exactly.
- **A chevron on the divider** and **an in-flow control at the document's end** were both superseded by the Subfield text control.
- **Splitting `embedWidget.tsx`** is a standing ruling against ([Cohesion-Rulings](../Guidelines/Cohesion-Rulings.md)): the section is a fold region, not a block widget. Do not re-propose either.
- **`assertNever`** is ruled out project-wide; the house idiom is an inline `const _exhaustive: never = x` in a braced `default:`.
- **A `persist()` helper** for fire-and-forget writes is blocked on an open decision. The override write is the seventeenth copy of that pattern and stays a copy.
- **A typed editor-menu action union** was built, landed, reviewed and removed. Do not rebuild it.

**Grounding** *(re-open these; don't cite them)*

- `.claude/Planning/Footnotes — Decision Log.md` — the settled contract, all entries confirmed, no open assumptions.
- `Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts` — `DocScan`, `scanDoc`, `lineIntentsInto`, `pushConstruct`, the intent union, the fence branch that models a self-handling line construct.
- `Pommora/src/renderer/src/MarkdownPM/editor/docCache.ts` — the per-doc-version derivation cache every hot path reads.
- `Pommora/src/renderer/src/MarkdownPM/editor/decorations.ts` — the intent→decoration dispatch, `hideMarker`, `atomicSpan`, the viewport-scoped token pass.
- `Pommora/src/renderer/src/MarkdownPM/editor/folding.ts` + `headingScan.ts` — the fold registry, `applySavedFolds`, `expandFoldsAt`, `chevronDeco`, `headingSections`.
- `Pommora/src/renderer/src/MarkdownPM/editor/blockModel.ts` — `blockContext`, `kindAt`, `claimed`, `blockStarts`.
- `Pommora/src/renderer/src/MarkdownPM/editor/pointerPath.ts` + `links.ts` — the gesture factory and its two existing specs.
- `Pommora/src/renderer/src/MarkdownPM/editor/calloutGuard.ts` — the transaction-filter repair pattern.
- `Pommora/src/renderer/src/MarkdownPM/input/index.ts` + `editor/input.ts` — the transform chain and `lineMarkerRe`.
- `Pommora/src/renderer/src/Detail/Subfield/subfieldStats.ts` + `subfieldItems.tsx` + their tests — the counter and the item registry.
- `Pommora/src/main/db/localState.ts` + `main/ipc.ts` + `main/remint.ts` + `src/shared/bridge.ts` — the per-machine scope mechanism and the `headingIcon` template.
- `.claude/Guidelines/Editor-Internals.md` and `.claude/Guidelines/Cohesion-Rulings.md` — read before touching the layer each names.

**Environment**

- **Plan directory:** `.claude/Planning/`
- **Spec input:** `.claude/Planning/Footnotes — Decision Log.md`
- **Explorer agent:** `Explore`
- **Code reviewer:** `feature-dev:code-reviewer`
- **Attack reviewer:** `build-breaking-agent`
- **Neutral verifier:** `general-purpose`, handed the claim, the spec, and the range only
- **Simplification pass:** `code-simplifier`, then `comment-killer-agent`
- **Rules directory:** `.claude/Guidelines/`
- **Research agent:** not needed — the parser questions were settled against the installed build during the brainstorm.

**Shapes:** additive · user-visible · fix (the `collapsedByDefault` retirement and the `md-foldable` split are repairs to live behavior, and each carries a sibling sweep)

**Global Constraints (every task inherits these)**

- Gates, run from `Pommora/`, exit codes read directly and never through a pipe: `npm run typecheck` · `npm run test` · `npm run lint`. All three green before any commit.
- **Identifier bans.** `footnote` as a bare identifier collides with the typography and icon scale step (`text.footnote.*`, `size="footnote"`, `--text-footnote-size`, `--icon-footnote`). `definition` is reserved for a future independent feature. Feature identifiers use `citation` / `citations`; user-facing labels say "Footnote" freely. GFM's `footnoteDefinition` node name appears only when citing the parser.
- **One derivation.** No layer re-derives the section boundary. Everything reads the shared module, through `docScan` inside the editor.
- **No expensive work on a high-frequency trigger.** No whole-document read per caret move, no allocation in a pointermove handler, no layout read before a cheap class gate.
- Main owns the filesystem; the renderer never touches Node. IPC returns the `Result` envelope and every channel is declared once in `src/shared/bridge.ts`.
- Comments explain only a *why* the code cannot show. Never restate a value a declaration already holds; never claim a feature's current state.
- `KNOB` markers and `(Nathan's call)` markers are functional — never strip them.
- Stage explicit paths, never a directory. Bundle each task's documentation edits into that task's commit.
- Out of scope everywhere: the Subfield's table, indented-code and math counting inaccuracies; the decoration pass's whole-document emission; the fold system's timer-based scroll wait; any keyboard shortcut (none may be baked in without separate per-shortcut sign-off).

**Cohesion Criteria**

*Run once against this document before approval, against each phase's diff at its gate, and against the whole range at closeout. Each is answered with the evidence that produced the answer — a search and its hits, a named alternative, a measured number. "Checked" is not an answer, and neither is "no" without the thing that was considered.*

- **C1 — One definition per thing.** For every symbol this introduces, the tree was searched for a second construct answering the same question. A near-twin is a finding, not a coincidence. Two writers for one piece of state, two derivations of one boundary, two spellings of one predicate: each is a defect regardless of how little code it costs.
- **C2 — Reuse was proven before invention.** Every new file, function, and CSS rule names the existing mechanism it was checked against and why that one could not carry it. "Nothing existed" is a claim that requires the search that produced it.
- **C3 — No token, motion, or palette hand-rolled.** `git diff <base>..HEAD -- '*.css' '*.css.ts' | rg '^\+' | rg '#[0-9a-fA-F]{3,8}|[0-9]+ms|cubic-bezier|rgba?\('` → every hit is a token read or a finding. The token modules themselves are the only exception.
- **C4 — Nothing added that nothing calls.** Every new export has a call site: for each, `rg -F "<name>" Pommora/src` returns at least two hits. Pre-scaffolding is admitted only with an explicit keep-ruling recorded in the Log.
- **C5 — No residue.** Nothing survives from an approach that was tried and replaced — no superseded branch, no parallel path kept "just in case", no commented-out attempt. The correct method having been verified, the wrong one is gone rather than demoted.
- **C6 — Every comment earns its line.** A comment states a *why* the code cannot show. One naming a value its own declaration holds, restating what the next line does, or claiming a feature's current state is a finding. Test: change that value tomorrow — is the comment now wrong?
- **C7 — Nothing expensive on a frequent trigger.** Any work this adds to a pointermove, scroll, keystroke, per-caret, or per-render path is named and justified, or it is not there. No full-document read where a cached or incremental one works.
- **C8 — The smallest change that satisfies the requirement.** For each task, the smaller version that was considered and rejected is named. Robustness that buys nothing the requirement asked for is bloat wearing a safety costume.
- **C9 — Nothing guarded that cannot happen.** Every guard names the sequence that reaches the state it guards. Absent that sequence the guard comes out — unless it sits on a trust boundary (disk, IPC, user input), where validation needs no mechanism.
- **C10 — Naming and labels conform.** New source files are PascalCase. UI action labels are Title Case; prose and hints are sentence case. The `footnote` and `definition` identifier bans hold — `rg -w "footnote|definition" Pommora/src` returns only the typography and icon scale steps that predate this work.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `ContextPM.md:11` | "one `[assumed]` entry (C-3's clear-on-default) pending Nathan's word" | Confirmed — clear the row. | 1 |
| `Features/SubfieldPM.md:17` | "a fenced block, a lone embed tile, a list marker, a quote prefix and a heading's hashes all contribute nothing" | The citations section contributes nothing either, and a marker contributes characters but no word. | 3 |
| `subfieldStats.ts:18-21` | "One construct is still counted as its source: a Markdown table" | Still true of tables; the sentence must stop implying it is the only handled-or-not case. | 3 |
| `Features/MarkdownPM.md` | The feature list and Pending section, which describe an editor with no footnote handling | Footnotes exist. | 22 |
| `Features/ConfigurationPM.md:103-108` | The Pages & Editor toggle table | Two rows and a Footnotes section join it. | 10 |
| `Features/SubfieldPM.md` §Pending | The item registry's described membership | A citations item joins it, and is deliberately gated to pages that have footnotes. | 13 |
| `ContextPM.md` §Immediate Work, §Next-Feature Candidates | Footnotes as pending next work | It shipped. | 22 |
| `Features/PagePreviewPM.md` | The scoped Subfield's described contents | It carries the citations control. | 13 |

**Dead Vocabulary** *(what the closing sweep searches for)*

- `rg -F "collapsedByDefault" Pommora/src` → expect 0. Legitimate hits: none; the flag is retired in Task 11.
- `rg -F "footnoteDefinition" Pommora/src` → expect 0. Legitimate hits: none — the parser's node name never enters our code.
- Control: `rg -F "docScan" Pommora/src` → 43. Zero here means the sweep never ran.

**Hazard Window:** Task 11 retires `collapsedByDefault` and Task 12 separates `md-foldable` into a chevron class and a heading-gesture class. Between them the fold system is mid-repair: **no task may add a fold kind, a fold-adjacent gesture, or a `md-foldable` consumer while the window is open**, and Phase 3's interaction pass waits for Task 12 rather than running mid-repair. Task 12 closes it.

---

### Phase 1 — One boundary, and the counter that proves it

Nothing draws in this phase. The boundary derivation lands first and is exercised by the one consumer that can be proven with pure unit tests, so the derivation is known-correct before six layers depend on it.

#### Task 1: The shared citation scan

**Requirement:** 1

**Why:** Six layers need to know where the citations section begins, and a boundary each of them derives is a boundary they will disagree about — the failure the fence pass exists to prevent and that Editor-Internals names first among its rules. Putting it in `src/shared` rather than inside the editor is what lets the Subfield counter read the same answer without importing the renderer's decoration layer, The counter still *runs* the scan itself — sharing a module is not sharing a derivation — one more pass on a path that already pays one, and the accepted cost the Sequenced After item retires. It takes the fence mask as a required parameter, following `blockMathRanges` and `blockEmbedLines`, so no caller can forget to state its exclusion contract.

**Files:**
- Create: `Pommora/src/shared/citations.ts` — the scan, the marker pattern, the types.
- Create: `Pommora/src/shared/citations.test.ts`

**Interfaces**
- Produces:
  - `interface CitationEntry { line: number; lastLine: number; label: string; contentStart: number }` — `line` is the `[^label]:` line's index, `lastLine` its final continuation line, `contentStart` the line-relative offset where the citation's text begins.
  - `interface MarkerRef { line: number; from: number; to: number; label: string; ordinal: number | null }` — one body marker, `ordinal` null when nothing binds it.
  - `interface CitationScan { entries: CitationEntry[]; markers: MarkerRef[]; mask: Uint8Array; firstLine: number }` — `mask[i] === 1` for every line belonging to the section, blanks between citations included; `firstLine` is the section's first line index, or `lines.length` when there is no section. **The body sweep runs here and only here:** first-use order is what numbers both a marker and its citation row, so deriving it twice is two things that can disagree about one answer. `entries[].ordinal` and `markers[].ordinal` come out of the same walk.
  - `citationScan(lines: string[], fenced: Uint8Array): CitationScan`
  - `firstLine` is the first **citation** line. `anchorLine = firstLine - 1`, or `-1` when the section starts at line 0 — the fold model needs a line it can leave visible, and it cannot be a citation (→ Task 11). A citation binds with or without a blank line above it (verified against the installed parser), so the anchor is whatever line precedes the run, blank or prose.
  - **Trailing blank lines after the last citation are in `mask`** and inside the section: they belong to no other block, and leaving them out would put the fold's end and the counter's exclusion on different lines.
  - `firstLine` on a document with no section is `lines.length`. `scanDoc` splits an empty document to `['']`, so an empty document answers `1`, not `0`.
  - `markerRegex(): RegExp` — a factory returning a fresh `/(?<!\\)\[\^([^\]\s]+)\]/g` per call, matching the `inlineCodeRegex()` idiom so no `lastIndex` leaks between callers. The lookbehind honors the `\[^1]` escape, which suppresses the reference at the parser too (verified) — one pattern, so the counter and the decoration pass cannot disagree about an escape.
  - `foldLabel(label: string): string` — the case-fold used for every binding comparison. **It is deliberately not the shared title normalization**, which already has two byte-identical copies for page titles and context values: GFM defines its own case-folding for footnote labels, and coupling the two would mean a future change to title matching silently moved footnote binding. C1 gets that answer rather than a third copy appearing unexplained.
- Assumed by: Tasks 2, 3, 5, 6, 7, 8, 11, 13, 14, 15, 16, 18, 19.

**Must agree:** the boundary this returns and the parser's own `footnoteDefinition` spans must name the same lines **for unindented, top-level citations** — the shape this feature admits. One test parses a corpus with `parse()` from `MarkdownPM/parser`, collects every top-level `footnoteDefinition` node's line range, and asserts the scan's `mask` covers exactly those lines for the trailing run. The corpus deliberately excludes the three shapes R1 does not admit, which the Failure half names.

**Failure half:** empty document → `firstLine === 1` (the split yields one empty line), no entries, empty mask. A citation head indented 1–3 spaces → still a citation, per CommonMark; indented 4 → indented code and not a citation, which `fenced` does not cover, so the scan tests the indent itself. A citation inside a blockquote or a list item → **parses as a real `footnoteDefinition` at the parser** (verified) but is not admitted here: it stays live prose like any mid-document citation, the same accepted divergence A-2 already takes, and the cross-check corpus excludes it. A document that is nothing but citations → the whole document is the section. A citation line inside a fence → not a citation, `fenced` wins. A `[^my note]:` line (a space in the label) → a CommonMark link definition, not a citation, and it ends the run. A trailing run followed by a blank line and one prose word → no section at all. Trailing blank lines after the last citation → still the section. A citation whose text is empty → a valid entry.

**Steps:**
- [ ] Write the failing tests first, covering: the plain trailing run; indented continuation; **lazy continuation** (an unindented next line joining the citation above); interleaved blank lines; a run broken by trailing prose; a fenced pseudo-citation; a spaced label; duplicate labels; case-folded labels; the empty document; the citations-only document.
- [ ] Run — expect every case to fail, module not found.
- [ ] Implement `citationScan`: walk backwards from the last line over trailing blanks, then accumulate citation spans and their continuations until a line breaks the run, then invert to a forward-ordered `entries` array.
- [ ] Add the cross-check test against `parse()`.
- [ ] Run the full gate — expect green.
- [ ] Commit: `feat(shared): one derivation for the citations section boundary`

#### Task 2: The scan joins the editor's document derivation

**Requirement:** 1

**Why:** Inside the editor every hot path reads one cached scan per document version; a second whole-document read on a per-keystroke path is the specific cost `docCache` exists to prevent, and Editor-Internals forbids it outright. Adding the field here means the decoration pass, the block resolver, the guard and the fold region all read the boundary for free, and none of them can disagree with the fence and table passes about the base it was computed from.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts` — `DocScan` interface, `scanDoc` return literal.
- Test: `Pommora/src/renderer/src/MarkdownPM/decorations/intent.test.ts` — extend the existing cached-vs-pure equivalence corpus.

**Interfaces**
- Produces: `DocScan.citations: CitationScan`, computed as `citationScan(lines, fencedLineMask(lines))` — reusing the `fences` pass already computed two lines above rather than running a second one.
- Assumed by: Tasks 5, 6, 7, 8, 11, 14, 15, 16, 18, 19.

**Steps:**
- [ ] Add the `citations` field to `DocScan` and one line to `scanDoc`'s return, deriving its fence mask from the existing `fences` result.
- [ ] Add one document carrying a citations section to the existing cached-versus-pure corpus. That suite already loops every caret offset and compares the two derivations byte for byte, so this is a string in an array rather than a new test.
- [ ] Run the gate — expect green, no behavior change anywhere.
- [ ] Commit: `feat(editor): the citations boundary joins the one document scan`

#### Task 3: Statistics stop counting the section

**Requirement:** 8

**Why:** R8 is the requirement most exposed to silent regression, because `lines` has never once depended on a mask — it is the raw split, and every other count is derived from a separately masked string. Routing the exclusion through one array read by both is the only structure in which the three numbers cannot drift apart. The marker's characters-but-no-word split is the single point where the two prose pipelines legitimately diverge, and it is expressed as one extra removal on the word path rather than as a second stripped string, so the character count needs no new code at all.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Subfield/subfieldStats.ts` — `computeStats`, its link pass's label class, and the module doc comment.
- Modify: `Pommora/src/renderer/src/Detail/Subfield/subfieldStats.test.ts` — new cases only; all 22 existing assertions stay byte-identical.
- Modify: `.claude/Features/SubfieldPM.md` — the counter's description.

**Derivation**
- `rg -F "computeStats" Pommora/src` → **34 lines across 3 files** — one definition, one import and one call in `subfieldItems.tsx`, the rest test lines. Legitimate hits: all of them; no consumer hides in the count.
- Control: `rg -F "subfieldStats" Pommora/src` → 3. Zero here means the search never ran.

**Failure half:** a page with no footnotes → all three counts identical to today, which the 22 unchanged tests prove. An escaped `\[^1]` → not a marker; it counts as the prose the parser reads it as, and the shared pattern's lookbehind is what makes both layers agree. `[^1](url)` → four characters for the marker and five for `(url)`, since the parser reads the marker as a reference and the parenthetical as prose, not as a link. A page that is nothing but a citations section → `lines: 0, words: 0, characters: 0`. A marker inside a fence → already blanked by the fence mask, unchanged. A marker inside inline code → already blanked, unchanged. A marker adjacent to punctuation → one word, not two.

**Must agree:** `lines.length` after exclusion and the number of `GONE`-blanked lines in the prose pass must describe the same set. One test asserts that for a document mixing a fence, a table, prose and a citations section, `lines` equals the raw line count minus exactly the section's line count.

**Steps:**
- [ ] Write the failing tests: section excluded from all three counts; `sentence[^1].` is one word and thirteen characters; `word [^1] word` is two words with the marker's four characters counted; `a[^10] b` is two words and eight characters, pinning that the count is the syntax's length rather than a constant; a fenced pseudo-citation still counts as the fence it is; a marker inside inline code stays blanked; the citations-only document.
- [ ] Run — expect the new cases red and all 22 existing cases green.
- [ ] Compute the scan once, after `fencedLineMask` and from it. Feed `mask[i]` into the existing per-line map beside the `fenced[i]` test, and subtract its population count from `lines.length`.
- [ ] **Fix the link pass, not the ordering.** `stripInline` produces the one string *both* counts read, so a marker removal placed anywhere inside it strips the marker from the character count too — which contradicts F-1 and this task's own `word [^1] word` case. And neither ordering reaches the right answer, because the real cause is that the counter's link pattern admits a `^`-leading label and swallows `[^1](url)` whole: today `see[^1](url) here` counts 10 characters where the file holds 17. Refuse a `^`-leading label in the counter's link pass — one character class — and the marker survives into `characters` untouched.
- [ ] **Then** remove markers with `''` on the **word path only**, after `stripInline` has produced the shared string, using `markerRegex()` — a callback over one scanning pattern, so nothing is ever built from a user-supplied label. This is the one place the two pipelines diverge, and it is the only line the character count never sees.
- [ ] Rewrite the module doc comment to state what is excluded and why the two pipelines diverge on a marker.
- [ ] Update the Subfield feature document's counter paragraph.
- [ ] Run the gate — expect green, all 22 originals untouched.
- [ ] Commit: `feat(subfield): footnotes leave the page statistics`

#### Gate 1 — one boundary, three counts, nothing drawn
- [ ] Gate commands green, exit codes read directly.
- [ ] Derivations re-run against their controls; counts matched, or the divergence rewrote the plan.
- [ ] All 22 pre-existing stats assertions are byte-identical to their pre-plan text — verified by `git diff` on the test file showing additions only.
- [ ] The scan's boundary and the parser's own spans agree on the cross-check corpus.
- [ ] **Simplification runs alone, and runs first** — `code-simplifier` dispatched against `<base>..HEAD` with no reviewer beside it and no reviewer's findings in its brief, then `comment-killer-agent` over what it returns. A build reviewed for correctness before it has settled its own relationships gets defended rather than reduced, which is why the order is fixed.
- [ ] Its reductions applied, or refused in the Log with a reason. The phase re-gates after they land.
- [ ] Only then, correctness review dispatched against the same range; the reports cite files inside it.
- [ ] **Cohesion Criteria C1–C10 answered against this phase's diff**, each carrying its evidence rather than its assertion.
- [ ] Net line delta reported — code only, comments and blanks and tests excluded.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Nothing draws this phase, so no interaction pass is owed — the counters are the only visible change and their tests are the proof.

---

### Phase 2 — The section and its markers draw

#### Task 4: The citation row's styling joins the shared numeric-glyph rule

**Requirement:** 4

**Why:** The look is specified as identical to a numbered list row, and the codebase already has one rule serving both the ordered marker and the codeblock line number. Joining that selector list is what makes "identical" a fact rather than a resemblance that drifts the next time either is tuned. Doing the CSS before the emission means the next task can be judged on whether it draws in the right place, not on whether it looks right.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/Styles.css` — the `.md-ol-marker, .md-cb-ln` rule and a new citation block near it.

**Steps:**
- [ ] Add `.md-cite-num` to the existing shared numeric-glyph selector list.
- [ ] Add the citation line rule: the hanging indent pair (`padding-left` plus negative `text-indent`) over its own numeric zone, `white-space: pre` on the line. **The wrap restore joins the list content span's existing selector rather than being copied** — the indent pair already has three copies in this file, and a fourth wrap rule would be the one C2 has to answer for.
- [ ] Add the continuation-line rule reusing that same indent pair without a glyph zone.
- [ ] Add the text treatment — label-secondary, 0.75em — and the dimmed variant as `opacity: var(--state-inactive)` on the row. **The token exists and is exactly this case**: the States table's inactive step is the one still-here-but-not-active dim, worn as opacity over an element's standard chrome, and the editor already dims a whole line that way for a block in flight. Nothing is minted. (The design system's Pending entry names a different thing — an empty-state text *tone* between secondary and tertiary — which an orphaned citation does not need, because it dims as a whole row rather than recoloring its text.) The token carries a `KNOB` marker; leave it.
- [ ] Run the gate — expect green; no selector matches anything yet.
- [ ] Commit: `style(editor): citation rows join the shared numeric-glyph rule`

#### Task 5: Citation lines emit as numbered rows

**Requirement:** 4

**Why:** The glyph must show a positional number that may differ from the label beneath it, which the ordered-list branch structurally cannot do — it draws its own source bytes. The codeblock line count is the existing shape for exactly this: an ordinal computed in the scan, drawn as a side widget over source the line hides. Emitting from `lineIntentsInto` rather than `pushConstruct` follows the fence branch, which is the precedent for a line construct that handles itself and returns without entering the list-marker vocabulary — the thing that keeps citations from inheriting list indentation, list continuation and the grip menu's type conversion.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts` — a citation branch in `lineIntentsInto`, before the `pushConstruct` call; the positional ordinal computed in `scanDoc`'s citation pass.
- Modify: `Pommora/src/shared/citations.ts` — nothing structural; the ordinals already come off Task 1's single walk. Touch this file only if that walk proves wrong.
- Test: `Pommora/src/renderer/src/MarkdownPM/decorations/intent.test.ts`

**Interfaces**
- Consumes: `DocScan.citations`.
- Produces: per citation line — a `line` intent carrying the row class, a `lineWidget` carrying the ordinal's text, a `hide` over the `[^label]:` prefix through to the content start, an `atomic` over that same span, and a `class` over the content. Per continuation line — a `line` intent carrying the continuation class.
- Assumed by: Tasks 7, 12, 16.

**Must agree:** the ordinal a citation row draws and the number its body markers draw must be the same integer. One test asserts, for a document whose disk labels are `1, 7, 3` in body order `7, 1, 3`, that both the marker decorations and the row widgets read `1, 2, 3` against the same first-use ordering.

**Failure half:** a citation with empty text → still draws a visible glyph and an empty content span. Home, or Left from the content start → lands at the content start or the line above, never inside the hidden prefix. An orphaned citation → draws its seat with the dim class and no number. A duplicate-labelled citation → the first binds and numbers, the later one dims and goes numberless. A citation whose content is a single long unbroken word at narrow width → wraps under the content span, never under the glyph.

**Steps:**
- [ ] Add the citation branch to `lineIntentsInto`, positioned before `pushConstruct` and returning `null` so the list and rail machinery never sees the line.
- [ ] Emit the intents above with the **`atomic` ungated**, and the `hide` with it. The checkbox and bullet slots wrap their `hide`, widget and `atomic` in one caret-off-marker gate, so revealing the source and admitting the caret happen as one act. A citation prefix can never reveal — C-7 and E-2b make the label invisible plumbing, and showing `[^7]:` beneath a glyph reading `3` is the contradiction they forbid. Since the characters never appear, the caret must never reach them: an ungated atomic is the only pairing that holds, and gating the atomic alone would seat a caret in five hidden characters whose next keystroke breaks the label and literalizes every marker bound to it.
- [ ] Reuse the existing line-widget intent and its renderer — the same path the codeblock line count rides — rather than a new widget class. It marks itself `aria-hidden`, which is right here: C-1 makes the divider the fold target and the *marker* is what Task 16 makes clickable, so the row's number is decorative and takes no interactivity. A glyph that needs no handler needs no `ignoreEvent` override either.
- [ ] Add tests: ordinal correctness under out-of-order labels; the dim predicate for orphans and duplicate-losers; the empty-text seat; the narrow-width single-word wrap.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(editor): citation lines draw as numbered rows`

#### Task 6: The marker draws atomic and positional

**Requirement:** 2

**Why:** This is the editor's first mid-line atomic range, and it needs a whole-document range set — the line-intent path is line-leading by construction, and the token path is viewport-scoped, so a marker derived from it would exist only while on screen and delete differently above the fold than below it. **The shape already exists:** the callout prefix's atomic provider is a standalone `atomicRanges` extension walking every line of the cached scan into a range builder, whole-document and outside `Built.atomic` entirely. The marker's provider is its sibling, which leaves the decoration pass's atomic assembly untouched. The marker also opts out of the caret-reveal mechanism rather than suppressing it per-position, because a range the caret cannot enter can never satisfy a caret-inside predicate anyway.

**Files:**
- Create: `Pommora/src/renderer/src/MarkdownPM/editor/markerAtomic.ts` — the atomic provider, a sibling of the callout prefix's. `Built.atomic` and its assembly are not touched.
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/decorations.ts` — the marker's widget half only.
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/docCache.ts` — one `perDoc` line mapping the scan's markers to absolute offsets, structurally identical to the existing bidirectional-mark cache.
- Modify: `Pommora/src/renderer/src/MarkdownPM/Styles.css` — the marker's own treatment.
- Test: `Pommora/src/renderer/src/MarkdownPM/editor/markerSeats.test.tsx`

**Interfaces**
- Produces: `docMarkers(doc)` → the absolute-offset ranges of `docScan.citations.markers`, cached per document version. **It performs no sweep of its own** — the walk lives in Task 1, and a second one here is the C1 violation this task exists to avoid. Its only work is mapping line-relative offsets to document offsets.
- Assumed by: Tasks 8, 12, 16, 17, 19.

**Must agree:** every marker the decoration pass draws is one the counter scores as zero words — containment, not equality, because the counter also zero-words an unmatched marker that draws nothing (the 08-20 ruling). One test runs both over a document holding a bound marker, an unbound one and an escaped one, and asserts the drawn set is a strict subset of the zero-worded set, with the escaped marker in neither.

**Negative control:** the atomic behavior gets both halves — a test proving arrow-left across a marker lands on its far side in one step *and* a test proving that with the atomic range removed the caret seats inside it. A test that passes either way proves nothing.

**Failure half:** an unmatched marker → no decoration, plain prose, caret enters freely. A marker inside a fence or inline code → untouched. A marker inside a citation row → literal, per R2. Two markers adjacent with no space → both draw, each atomic, neither swallowing the other's boundary.

**Steps:**
- [ ] Write the failing tests: the atomic pair above; a resolved marker draws its ordinal; an unmatched marker draws nothing; markers in fences, inline code and citation rows stay literal; backspace at a marker's right edge removes it whole.
- [ ] Run — expect red.
- [ ] Add the cached offset mapping over `docScan.citations.markers` — one `perDoc` line, no re-scan.
- [ ] Emit the replace-with-widget decoration, and register the atomic provider as its own extension beside the callout prefix's.
- [ ] Style the marker: accent at tint-primary through a `color-mix`, permanently opaque, `user-select` inherited so a sweep still selects it.
- [ ] Set `ignoreEvent` false on the marker widget.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(editor): footnote markers draw as atomic positional glyphs`

#### Task 7: Markers render in resting table cells

**Requirement:** 2

**Why:** A resting cell has no `EditorView` at all — it is plain spans over a hand-written renderer — so anything the body draws must be given to it separately or the marker draws raw at rest and morphs on entry, which is the one visible inconsistency R2 forbids. The focused cell editor already reuses the decoration pass and needs nothing.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/Tables/cellStatic.tsx` — a marker branch in the span renderer.
- Test: `Pommora/src/renderer/src/MarkdownPM/Tables/cellStatic.test.tsx`

**Survivors:** the cell codec means a citation can never live in a cell; only markers render there. Creating a footnote from inside a cell stays a Prospect and is not built.

**Failure half:** a cell containing an unmatched marker → literal text. A cell in a table that sits inside the citations section → cannot occur, since the section admits only citation lines and their continuations; assert it rather than guard it.

**Steps:**
- [ ] Add the marker branch, reusing the existing `[`-prefilter which already admits `[^1]`.
- [ ] Resolve the ordinal from the cached scan, which the widget builder already reads in the same loop that constructs each table — no plumbing into the extension. Pass it as a prop and **add it to both gates**: `StaticCell`'s memo comparator, which today compares the cell's text alone, *and* the table widget's own equality, which compares text, index and heading-column only. The outer gate runs first, so fixing the comparator alone never fires. A positional ordinal is a whole-document fact: a numeric label renumbers on disk so its text changes and the memo busts, but a word label never does, so `[^note]` drawing `1` would keep drawing `1` after an insert above the table moved it to 2. The comparator exists to stop a scrolling table building R×C editors in one frame; one extra scalar compare does not threaten that.
- [ ] Handle the marker-only cell: the renderer returns raw text when `tokenize()` yields nothing, and the tokenizer emits nothing for `[^…]`, so a cell whose only markdown is a marker returns before any branch can draw it.
- [ ] Test: a resting cell draws the ordinal; entering the cell keeps the same glyph; an unmatched marker stays literal in both states.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(editor): markers render in resting table cells`

#### Task 8: The section is inert to the block layer

**Requirement:** 4

**Why:** Without this a citation reads as a loose paragraph, so it grows a drag grip and becomes a drop target — the two things C-12 forbids. The block layer already has the answer in its existing vocabulary: an unowned line, which is what a blank line returns. Taking that answer costs two lines in one function, where a new `BlockKind` would span five sites of which the compiler checks one, and two of the misses are silent.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/blockModel.ts` — `kindAt` and `claimed` inside `blockContext`.
- Test: `Pommora/src/renderer/src/MarkdownPM/editor/blockModel.test.ts`

**Negative control:** a test proving a paragraph immediately above the section still resolves as its own draggable block *and* a test proving that with the `claimed` addition removed, that paragraph swallows the section's first row.

**Failure half:** a document that is entirely a citations section → no block anywhere in it, no grip, no drop target. A paragraph directly above the section with no blank line between → the paragraph ends at the section's start.

**Steps:**
- [ ] Write the failing tests: no grip on a citation row; the section is not a drop target; the paragraph above is unaffected; the negative control's second half.
- [ ] Return `null` from `kindAt` for any line the citation mask covers, and report those lines as `claimed`.
- [ ] Run the gate — expect green.
- [ ] Commit: `fix(editor): the citations section owns no draggable block`

#### Gate 2 — it draws, and it draws in the right place
- [ ] Gate commands green, exit codes read directly.
- [ ] Every negative control's disabled half was observed red before the guard went in.
- [ ] The ordinal agreement test and the marker/counter agreement test both pass.
- [ ] **Simplification runs alone, and runs first** — `code-simplifier` dispatched against `<base>..HEAD` with no reviewer beside it and no reviewer's findings in its brief, then `comment-killer-agent` over what it returns. A build reviewed for correctness before it has settled its own relationships gets defended rather than reduced, which is why the order is fixed.
- [ ] Its reductions applied, or refused in the Log with a reason. The phase re-gates after they land.
- [ ] Only then, correctness review dispatched against the same range; the reports cite files inside it.
- [ ] **Cohesion Criteria C1–C10 answered against this phase's diff**, each carrying its evidence rather than its assertion.
- [ ] Net line delta reported — code only, comments and blanks and tests excluded.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] **Interaction pass handed to Nathan.** Set up one page whose disk labels are out of first-use order, holding an orphaned citation and a duplicate-labelled one, plus a table cell containing a marker. Then:
  1. The body's markers read 1, 2, 3 in the order they appear, whatever the labels say.
  2. The section's rows read 1, 2, 3 top to bottom and match the markers.
  3. The orphan and the duplicate-loser are dimmed and carry no number, and both still have something to click.
  4. A citation long enough to wrap continues under its own text, never under its number.
  5. Narrow the window until a citation holding one unbroken long word has to wrap — it stays inside its text column.
  6. The marker in the table cell reads the same number at rest and after clicking into the cell.
  7. No citation row shows a drag grip, and dragging a body block over the section offers no drop.
- [ ] Progress hashes filled in.

---

### Phase 3 — Hiding and showing

Tasks 11 and 12 open and close the fold hazard window. Nothing in this phase may add a second fold kind or a `md-foldable` consumer between them.

#### Task 9: The visibility override's storage

**Requirement:** 5

**Why:** The per-page per-machine override is device chrome, not content — it must not touch the user's file, which is what puts it in `nexus.db` alongside heading folds and heading columns rather than in frontmatter. It is written before anything reads it so the fold seeding in the next task has a real source. Clearing on default is the no-empties discipline the store already keeps: a row deleted rather than written to a matching value is what lets a later change to the nexus-wide default reach pages someone once toggled.

**Files:**
- Modify: `Pommora/src/main/db/localState.ts` — one `Scope` union member, `'citations'`.
- Modify: `Pommora/src/main/index.ts` — the `citations:get` / `citations:set` handler pair on `scopeGet` / `scopeSet`.
- Modify: `Pommora/src/shared/bridge.ts` — the two channel declarations.
- Modify: `Pommora/src/preload/index.ts` — the passthrough.
- Modify: `Pommora/src/main/remint.ts` — `'citations'` joins `COPY_SCOPES`.

**Interfaces**
- Produces: `window.nexus.citations.get(): Record<string, boolean>` and `.set(pageId, shown | null)`.
- **The `headingIcon` template cannot express the clear.** `scopeSet` runs its validator *before* its emptiness rule, and `isEmptyValue` treats neither `null` nor `false` as empty — so a `typeof v === 'boolean'` validator rejects the `null` that C-3's clear-on-default depends on, with a structured error. This scope's validator admits `boolean | null` and the handler maps `null` straight to `writeKey(scope, key, null)`, which already deletes the row. Two lines, and without them the confirmed clearing rule silently cannot work.
- Assumed by: Tasks 11, 13.

**Failure half:** a page with no row → absent, meaning follow the default. A non-boolean value arriving over IPC → refused by the validator with a structured error, never written. A copied page → its row travels, which is what `COPY_SCOPES` is for and what is silently lost if forgotten.

**Steps:**
- [ ] Add the scope member, the handler pair, the bridge declarations and the preload line, following the `headingIcon` pair exactly.
- [ ] Add `'citations'` to `COPY_SCOPES`.
- [ ] Widen this scope's validator to `boolean | null` and route `null` to the row deletion `writeKey` already performs — the store's half of the clear costs nothing, but the boundary's validator ladder refuses `null` before reaching it.
- [ ] Test both directions at the boundary: a `true`/`false` write stores a row, a `null` write deletes it, and a non-boolean is still refused.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(main): a per-page store for the citations section's visibility`

#### Task 10: The two settings

**Requirement:** 10

**Why:** Default Visibility is what the per-page override falls back to, so it must exist before the override's fallback is meaningful. A personalization boolean is complete only when the reader parses it as well as the writer persists it — a key absent from the sanitizer is silently dropped on reload, which reads as a toggle that works and reverts, and the round-trip test exists to make that impossible to forget.

**Files:**
- Modify: `Pommora/src/shared/types.ts` — two `Personalization` fields.
- Modify: `Pommora/src/main/readNexus.ts` — two sanitizer rows.
- Modify: `Pommora/src/main/readNexus.test.ts` — both keys join the round-trip list.
- Modify: `Pommora/src/renderer/src/Settings/NexusSettings.tsx` — a titled Footnotes section in the Pages & Editor leaf.
- Modify: `.claude/Features/ConfigurationPM.md` — the toggle table.

**Interfaces**
- Produces: `Personalization.citationsShown` (factory default hidden) and `Personalization.jumpToCitation` (factory default on).
- Assumed by: Tasks 13, 20, 21.

**Failure half:** a key absent from the settings file → the built-in default, never `undefined` leaking to a consumer. A non-boolean in the file → dropped by the sanitizer, the default stands.

**Steps:**
- [ ] Add both fields, both sanitizer rows, and both entries in the round-trip test's key list.
- [ ] Add the titled Footnotes section with both toggle rows to the Pages & Editor leaf, using the existing `Section { title, rows }` shape.
- [ ] Read the values from the store slice at their consumers, never from the tree's copy.
- [ ] Update the Configuration feature document's table.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(settings): Default Visibility and Jump To Citation On Creation`

#### Task 11: The section is a fold region, seeded rather than persisted — **opens the hazard window**

**Requirement:** 5

**Why:** The section's disclosure is the editor's fold motion, and the fold registry was built for a second kind. But the fold system persists every kind's regions into one shared per-page row, so a section that persisted there would be written twice — once by the fold listener and once by its own override — which is precisely the two writers the spec forbids. Seeding the fold from the override and excluding it from persistence gives one writer and the motion both. That also retires `collapsedByDefault` rather than repairing it: the flag only ever applied to a page holding no saved fold of any kind, so a single collapsed heading anywhere would have opened the section visible, and no kind has ever used it.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/folding.ts` — `FoldKind`, the `KINDS` registry, the persist listener's filter, `applySavedFolds`, and the removal of `collapsedByDefault` from `FoldRegion`.
- Modify: `Pommora/src/renderer/src/MarkdownPM/index.tsx` and `Pommora/src/renderer/src/Detail/PageView.tsx` — the seam that hands the resolved visibility in. The fold module is deliberately Electron-free and never learns where persisted state lives; it takes it as a prop, exactly as its fold-persistence seam already does.
- **The other two editor mount sites** — the page embed (which backs the hover card, the floating preview and embedded tiles) and the board block — pass nothing today. They take the nexus-wide default, so an embed of a footnoted page agrees with a freshly-opened one; per-page overrides are the main pane's.
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/headingScan.ts` — `headingSections` clamps its last section at the citations boundary.
- Test: `Pommora/src/renderer/src/MarkdownPM/editor/foldState.test.tsx`

**Derivation**
- `rg -F "collapsedByDefault" Pommora/src` → 2 (the field's declaration and its one read). Legitimate hits: none survive.
- Control: `rg -F "FoldRegion" Pommora/src` → 4. Zero here means the search never ran.

**Interfaces**
- Produces: `FoldKind` gains `'citations'`; `FoldRegion` gains `persists: boolean`, false for the new kind.
- Assumed by: Tasks 12, 13, 14, 16.

**Survivors:** heading folds keep persisting exactly as they do. `expandFoldsAt` and `FoldsApi` are unchanged.

**Must agree:** the fold region's body start and the citation scan's `firstLine` must be the same line, and the heading scan's clamped end must be the line before it. One test asserts all three against one document.

**Must agree — the anchor never collides with a heading's.** Fold entries are identified by `anchor` alone; only the prune filter compares `kind`. Moving the anchor above the run retires the plan's original argument for why a collision is impossible (a citation line is never a heading line), so the new argument has to be stated and pinned: when a citation run starts immediately after a heading, that heading's clamped span becomes its own line, and `headingSections` emits a region only when the body is strictly more than one line past the heading — so the heading has no region to collide with. **The invariant rests on two facts at once** (C-11's clamp, and the one-line-body drop), and loosening either reintroduces the collision silently. One test asserts a document shaped `## Refs` immediately followed by a citation run yields exactly one fold region, and that its anchor is the heading's line.

**Negative control:** a test proving a collapsed heading above the section no longer swallows it *and* a test proving that with the heading clamp removed, it does — both on a **nested** document (`# Title` over `## Sources` over the run). A single-heading document has exactly one section reaching the end, so it greenlights the bug the clamp is for.

**Failure half:** a page holding a saved heading fold → seeds without touching the saved key set, verified by asserting no `folds:set` fires during mount. A document with no citations → no region, and the heading scan's last section runs to the document's end as it does today. A document that is entirely a citations section → `anchorLine` is `-1`, no region, the section stays visible and the control reports it shown. A section of exactly one citation → folds, because its anchor is above it. A heading whose text would collide with the section's fold key → impossible, since the section's key is a sentinel no heading scan produces; assert it.

**Steps:**
- [ ] Write the failing tests: the section folds and unfolds; its state does not appear in the persisted key set; **a mount with saved heading folds writes nothing**; Enter and Backspace on the rendered anchor line leave the fold intact; a collapsed heading stops at its start; the three-way boundary agreement; **the anchor-collision invariant above**; a section of exactly one citation folds; a document beginning with a citation has no region; the negative control's disabled half.
- [ ] Add the `'citations'` kind to `KINDS` with `persists: false`, **separating the region's identity from the line it renders against**. A fold entry is identified by `anchor` alone and is pruned when no live region shares that offset, so putting identity on `anchorLine` — a line the user owns and edits — means one Enter or Backspace there moves the live anchor, orphans the entry, and pops a hidden section open with the override still reading hidden and nothing to resync it. Identity stays on the section's first citation offset, which the original anchoring already proved stable; `anchorLine` becomes the *rendered* anchor, a second field rather than the key. A fold hides `anchor.lineEnd + 1 .. to` and never its anchor line, so anchoring on the first citation would leave that row on screen — and on a one-citation section `bodyStart > to`, which makes both `toggleFold` and `applySavedFolds` bail and the section unhideable. Anchoring above fixes both. When `anchorLine` is `-1` the section starts at line 0, no region exists, and the section cannot hide — the right answer, since hiding it would render a blank page.
- [ ] **Seed the fold from the override, carrying `initialFoldAnnotation`.** A state field reads the resolved visibility on mount and dispatches the fold effect, then follows later changes to that value. The annotation is not optional: the persist listener fires on any un-annotated fold effect and writes the whole surviving key set straight to disk with no debounce, and `applySavedFolds` sits two IPC round-trips deep behind `Promise.allSettled`, so an un-annotated seed lands *first* — with the citations entry present, the heading entries not yet restored, and the persisting-kinds filter reducing that to an empty array. The page's saved heading folds would be erased on every open of a footnoted page, invisibly until the next one. This is the only reader of the stored boolean and the only direction that turns it into visible behavior; writing it here rather than improvising it at Task 14 is what keeps a second writer from appearing at exactly the seam C-3 protects.
- [ ] Filter the persist listener to regions that persist, and skip non-persisting kinds in `applySavedFolds`.
- [ ] Delete `collapsedByDefault` and its read.
- [ ] Clamp **every** heading section whose end reaches the citations boundary, not the array's last element. `endLine` runs to the document's last line for every heading with no equal-or-higher successor, so a page shaped `# Title` … `## Sources` … the run has *two* sections reaching the end; clamping one leaves `# Title` spanning the section, and collapsing it swallows the footnotes whole.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(editor): the citations section folds without joining the fold store`

#### Task 12: The chevron class and the heading-gesture class separate — **closes the hazard window**

**Requirement:** 5

**Why:** `md-foldable` currently does three jobs at once — it draws the chevron, it gates the heading drag gesture, and it is gripMenu's heading hit-test. A non-heading fold anchor wearing it inherits all three, and the third one fails silently: the right-press is defaulted away and the hover flag tells main to stand its own menu down, then the heading menu bails because the line has no heading parts, leaving a press that opens nothing at all. Splitting the classes is the fix, and it is a repair to live behavior rather than new construction, so it carries a sibling sweep.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/folding.ts` — `chevronDeco` stamps the heading-gesture class on heading anchors only, and the chevron class **per kind**: headings take it, `'citations'` does not, because C-1 puts no chevron on the divider. **The open/closed classes go with it.** They ride the same string literal, and the closed one carries a color rule that does not require the chevron class — so leaving them on would tint the citations anchor, which is ordinary user prose, to the folded-heading control color on every footnoted page by default.
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/gripMenu.ts` — `HEADING_LINE` reads the heading-gesture class.
- Modify: `Pommora/src/renderer/src/MarkdownPM/Styles.css` — the chevron rules follow the chevron class.
- Modify: `Pommora/src/renderer/src/Embeds/ConnectionHoverCard.tsx` — its `closest('.cm-line.md-foldable')` fold click follows the **heading-gesture** class, or a hover card's whole-line click starts folding the citations divider directly, which is the second writer C-3 forbids.
- Modify: `Pommora/src/renderer/src/Embeds/embeds.css` — its chevron suppression and pointer cursor follow whichever class the chevron kept, or every heading in every connection hover card grows a chevron.

**Derivation**
- `rg -F "md-foldable" Pommora/src` → **8 lines across 5 files** — `folding.ts`, `gripMenu.ts`, `Styles.css`, `Embeds/ConnectionHoverCard.tsx`, `Embeds/embeds.css`. The class serves four jobs, not three; the hover card's fold click is the one the first count missed. Legitimate hits: those that genuinely mean "draws a chevron" survive under the chevron class; the drag gate, the grip-menu hit-test and the hover-card click move to the heading class.
- Control: `rg -F "chevronDeco" Pommora/src` → 2. Zero here means the search never ran.

**Negative control:** a test proving a right-press on the section's divider reaches the ordinary editor menu *and* a test proving that with the class split reverted, it reaches neither menu.

**Failure half:** a heading anchor → keeps all four behaviors unchanged, inside a hover card as well as in the main editor. The section's anchor → **no chevron**, no drag gate, no heading hit-test, no hover-card fold click.

**Steps:**
- [ ] Write the failing tests: the divider's right-press opens the ordinary editor menu; a heading's right-press still opens the heading menu; a heading is still drag-relocatable; the divider draws no chevron; a hover card's heading still draws none; the negative control's reverted half.
- [ ] Split the class in `chevronDeco`, point `HEADING_LINE` at the heading-gesture class, and follow the CSS.
- [ ] Re-run the derivation and confirm every surviving hit is deliberate.
- [ ] Run the gate — expect green.
- [ ] Commit: `fix(editor): a fold chevron and a heading gesture stop sharing one class`

#### Task 13: The Subfield's Show / Hide control

**Requirement:** 5

**Why:** Placing it in the item registry rather than beside the pane's collapse chevron is what carries it into the Page Preview for free — the preview mounts the Subfield component but has none of the pane's chevron chrome or its proximity tracking. It also removes the need for any scroll-position condition: that clause existed to guarantee the control was always reachable, and an item in an open bar already is. The label states what the click will do and reflects the current state at once.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Subfield/subfieldItems.tsx` — the item id union, the id array, the per-kind defaults, the component, the switch case.
- Modify: `Pommora/src/renderer/src/Detail/Subfield/subfield.css` — the text control's treatment.
- Modify: `.claude/Features/SubfieldPM.md` and `.claude/Features/PagePreviewPM.md`.

**Interfaces**
- Consumes: the citation scan run over the store's live body — the cached document scan is keyed to the editor's document object and the Subfield holds only a string, so this is a second pass on that path beside the counter's, the same conceded cost the Sequenced After item retires. The override from Task 9, the default from Task 10, the fold state for the label.
- Produces: nothing downstream.

**Failure half:** a page with no citation lines → the item renders nothing at all, per R5. A page with only orphaned citations → the item renders, because a citation line exists and the section must stay reachable. A non-page selection → the item is not in that kind's defaults and never mounts. The preview's scope → reads its own body, never the shared live-body slot, which has a single owner.

**Steps:**
- [ ] Add the item to the union, the id array, and the `page` default order.
- [ ] Add the label to the shared two-state label module as one line beside the footer's — the module's whole point is that a control's wording is stated once. Note the List / Gallery item inlines its own ternary and is the counter-example, not the pattern.
- [ ] Build the control as a text button and add its class to the List / Gallery item's existing CSS selector list — that rule is already the Subfield's text-control treatment, down to the hover state and the drag-region opt-out. No new block.
- [ ] Take Enter and Space from the design system's activation primitive rather than a hand-rolled key handler.
- [ ] Return null when the scan reports no citation lines.
- [ ] Resolve the shown state as override, then default; write through the override, clearing the row when the value matches the default. **Write the store slice optimistically and let the IPC be fire-and-forget** — the sixteen-times-copied persistence pattern — so the section moves within the frame instead of behind a round-trip.
- [ ] Read the label's state from the **fold**, not the override, so a section opened by a marker jump or an outline reveal reports itself open.
- [ ] Update both feature documents.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(subfield): a Show / Hide Footnotes control`

#### Task 14: The divider draws and folds

**Requirement:** 5

**Why:** The divider is the section's visible boundary and its fold control at once — there is no chevron in this design. It wears the shared heading seam so the two reads as one treatment, and it blur-fades rather than cutting, which is the one new motion this feature introduces and the reason it is stated here rather than inherited.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/decorations/intent.ts` — the divider's line intent on the section's first line.
- Modify: `Pommora/src/renderer/src/MarkdownPM/Styles.css` — the divider treatment and its blur-fade.
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/folding.ts` — the divider's click joins the existing fold click path rather than the pointer-gesture factory. That factory's contract is an inline token hit-test returning a range within a line; a divider is the line, so it fits the fold chevron's click path and not that one.

**Failure half:** a document with no citations → no divider. A non-blank anchor line — a table's last row, a fence's close, a heading, a paragraph — → the fallback edge, never a rule drawn onto the user's content. The divider clicked while the section is already hidden → cannot occur, since a hidden section draws no divider; the Subfield control is the only way back.

**Steps:**
- [ ] Emit the divider as a line intent on the **rendered anchor line**, reusing the heading seam's border treatment as its bottom edge, drawn only while the section is open. **Only when that line is blank** — the ordinary shape, and the one the feature can safely decorate. A table's last row is replaced by a block widget so a line decoration there never renders at all; a fence's closing line would draw the rule inside the code block; a paragraph would read as if it headed the footnotes. When the anchor is not blank the divider falls back to the section's own top edge, and the Subfield control remains the way to hide it either way.
- [ ] Add the blur-fade on the disclosure duration and the standard easing, both read from the motion tokens.
- [ ] Wire the click to the same write the Subfield control uses — the override, never the fold directly, so there is one state and one writer.
- [ ] Use the keyboard activation primitive so Enter and Space reach it, and take no interactive role it cannot honor.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(editor): the citations divider draws and folds the section`

#### Gate 3 — one state, two controls, one writer
- [ ] Gate commands green, exit codes read directly.
- [ ] Both derivations re-run against their controls.
- [ ] The hazard window is closed — Task 12 landed.
- [ ] A single write path proven: toggling from the divider and from the Subfield produce the same row, and toggling to the default value deletes it.
- [ ] **Simplification runs alone, and runs first** — `code-simplifier` dispatched against `<base>..HEAD` with no reviewer beside it and no reviewer's findings in its brief, then `comment-killer-agent` over what it returns. A build reviewed for correctness before it has settled its own relationships gets defended rather than reduced, which is why the order is fixed.
- [ ] Its reductions applied, or refused in the Log with a reason. The phase re-gates after they land.
- [ ] Only then, correctness review dispatched against the same range; the reports cite files inside it.
- [ ] **Cohesion Criteria C1–C10 answered against this phase's diff**, each carrying its evidence rather than its assertion.
- [ ] Net line delta reported — code only, comments and blanks and tests excluded.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] **Interaction pass handed to Nathan.** On a page with footnotes and at least one heading above them:
  1. Open it — the section is hidden and the body shows only numbered markers.
  2. The Subfield reads **Show Footnotes**. Click it — the section opens and the label becomes **Hide Footnotes**.
  3. Click the divider — the section hides and the label flips back.
  4. Collapse a heading above the section, then reload the page — **the heading is still collapsed.** This is the regression the seeding annotation prevents; if that fold is gone, stop here.
  5. Collapse the outermost heading on a page with nested headings — the footnotes section does not disappear with it.
  6. Open the same page in a floating Page Preview — the control is there and works.
  7. Change Default Visibility in Settings — a page never toggled follows it; a page you have toggled keeps its own answer until you toggle it back to the default.
  8. With the section hidden, keep typing at the end of the body — Enter and Backspace on the last line do not pop it open.

---

### Phase 4 — Guards and gestures

#### Task 15: The tail guard

**Requirement:** 9

**Why:** Atomicity stops CM's own cursor motion and deletion; it does not stop a programmatic dispatch, which the callout work proved the hard way — an atomic-only fix there produced a clean de-callout, which was still a break, and only a transaction filter closed it. The same holds here: the never-corrupt rule in the spec's own frame is a transaction-layer promise. Typing needs nothing special, because text typed inside the section lazily continues its citation exactly as the parser reads it; the guard exists for the changes that would still break the run.

**Files:**
- Create: `Pommora/src/renderer/src/MarkdownPM/editor/citationGuard.ts`
- Modify: `Pommora/src/renderer/src/MarkdownPM/index.tsx` — register it.
- Test: `Pommora/src/renderer/src/MarkdownPM/editor/citationGuard.test.ts`

**Interfaces**
- Produces: `citationTailVerdict(doc, fromA, toA, inserted, scan)` → the callout guard's verdict shape **plus a fifth arm carrying replacement text**. The existing four only move range endpoints — the callout guard pushes its `inserted` through verbatim on every branch — and A-5b requires the inserted text be *rewritten* into continuation form, which no endpoint move can express. `inserted` joins the signature for the same reason. Exported pure for tests.

**Negative control:** a test proving a paste below the section is shaped into continuation form *and* a test proving that with the guard unregistered it strands prose after the section and literalizes the whole thing.

**Must agree:** the guard's notion of the section and the decoration pass's must be the same. One test drives a document through both and asserts they agree on the boundary after each of a sequence of edits.

**Failure half:** **an insertion at a citation line's start** → clamped to its content start. CM's atomic skipping relocates only strictly-interior positions, so the range's first offset stays reachable: one Left from a citation's content start lands there, drawing at the same screen position because the prefix is zero-width, and the next keystroke writes ahead of `[^1]:` — which stops that line being a citation, ends the trailing run and literalizes every citation below it. List markers and callout prefixes leave the same edge open and the house accepts it, because there the damage is one line; here it is the whole section, and the guard is already iterating every change against the scan. A click below the section → the caret seats at the body's end. A plain paste below a trailing blank → shaped into continuation. **A block dragged to the document's end** → lands after the section, which is the same strand a paste makes and takes the same reshape; the block move's own seam guard fences the case above the section, so this is the only drag the tail guard owes. An edit that touches both body and section in one change → only the swept text goes, no cascade, per the range-keyed rule. A change the guard re-issues → carries its user event forward, or history grouping splits.

**Steps:**
- [ ] Write the failing tests, including the negative control's unregistered half and the boundary agreement.
- [ ] Implement the verdict function and the filter, reading the start state's cached scan and never re-splitting.
- [ ] Re-carry the user event on re-issue **and every annotation the guard does not own** — a re-issued spec is rebuilt from the start state, and a dropped self-edit annotation makes a downstream filter treat a construct's own write as a user edit. Skip transactions carrying a self-edit annotation of this guard's own.
- [ ] Register it alongside the existing guards.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(editor): the citations section's tail is guarded at the transaction layer`

#### Task 16: Marker click — jump, or follow

**Requirement:** 3

**Why:** The gesture factory already owns the hover intent, the press latch, the right-button claim and the caret-seat clamp; a marker is a third spec rather than a third copy of any of it. Click-through is defined once — the citation's whole content being exactly one link or one Connection — so no other entry needs to restate the condition, and a trailing character means it is not that and the click jumps like any other.

**Files:**
- Create: `Pommora/src/renderer/src/MarkdownPM/editor/citationPointer.ts`
- Modify: `Pommora/src/renderer/src/MarkdownPM/index.tsx` — register the spec.
- Test: `Pommora/src/renderer/src/MarkdownPM/editor/citationPointer.test.ts`

**Failure half:** a click on a marker whose citation is hidden → the section opens first, since a folded region has no height to scroll to, then the caret lands. A citation holding a link plus a trailing period → jumps, does not navigate. An unmatched marker → not a target at all; the click seats a caret like ordinary text.

**Steps:**
- [ ] Write the failing tests: jump to the row; jump opening a hidden section; navigate on a lone link; navigate on a lone Connection; jump on a link with trailing text.
- [ ] Implement the spec's `hitAt`, `follow`, `dwell` (null — hover preview is a Prospect) and `menu`.
- [ ] Reuse the editor's existing reveal-and-scroll seam rather than writing one: it already opens every collapsed region hiding an offset, waits out the disclosure, and seats the target — including the settle constant. Called directly with the view, so a marker clicked inside a hover card or a preview reveals in *that* editor rather than the module-held main one.
- [ ] **Write the override when the revealed region is the citations section.** That seam dispatches the expand effect directly, so on its own it would leave the section visibly open while the stored override still reads hidden — a second writer against C-3, and the Subfield would then read "Show Footnotes" over an open section and take two presses to hide it.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(editor): a marker click jumps to its citation, or follows it`

#### Task 17: The two construct menus

**Requirement:** 3

**Why:** A native menu stays open as long as the user likes, and an undo or an outside write can move the document under it — so both menus re-find their target and match it against what the menu was built from before committing, which is the discipline the connection and heading menus already keep. Copy puts the raw reference on the clipboard rather than the citation's text, because the reference is the shareable thing: pasting it elsewhere in the page is the second reference, and that is the whole sharing mechanism.

**Files:**
- Modify: `Pommora/src/main/connMenu.ts` and `Pommora/src/shared/bridge.ts` — two context variants and their actions.
- Modify: `Pommora/src/renderer/src/Embeds/connectionMenu.ts` and the marker/citation specs — the renderer-side execution.
- Test: menu action round-trip tests beside the existing ones.

**Failure half:** the document changes while the menu is open → the action is refused, not misapplied. Delete on a marker that is not the last reference → the marker goes, the citation stays. Delete on a marker that is the last → both go in one transaction and revert on one undo.

**Steps:**
- [ ] Add the two context variants and their action unions to the bridge and the main-side menu.
- [ ] Implement the marker menu — Edit, Copy, Delete — and the citation menu — Copy, Delete.
- [ ] Re-verify each target against the live document at commit.
- [ ] Perform every write in the renderer, following the existing pattern.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(editor): right-click menus for markers and citations`

#### Task 18: Range-keyed cascades

**Requirement:** 3, 9

**Why:** A cascade keyed to a gesture fires when the gesture happens; a cascade keyed to a range fires only when the deleted range is exactly the construct. That distinction is what stops a wide selection sweep from silently deleting citations the user never saw, and it is why backspace at a citation's content start and a menu Delete produce the same result while a mixed body-and-section sweep produces neither.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/input/index.ts` — the citation-start backspace only. **`lineMarkerRe` is deliberately left alone:** its one consumer fires at content start and deletes the prefix, the same caret and the same key C-9 gives to the whole-footnote delete. Two transforms claiming one keystroke means one silently wins, and if the shared regex won it would strip `[^1]: ` and leave bare prose inside the section — ending the trailing run and literalizing everything below it.
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/input.ts` — the chain link.
- Test: `Pommora/src/renderer/src/MarkdownPM/input/citationCascade.test.ts`

**Negative control:** a test proving a selection spanning a marker plus surrounding prose deletes only the swept text *and* a test proving that with the range check relaxed to a gesture check, it also removes the citation.

**Failure half:** backspace at a citation's content start with empty content → the whole footnote goes. A sweep covering two citations exactly → both cascade. A sweep covering one citation and one prose line → neither cascades.

**Steps:**
- [ ] Write the failing tests including both halves of the negative control.
- [ ] Implement the citation-start transform and the marker cascade, each as one pure function returning one edit, dispatched once.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(editor): footnote deletions cascade by range, not by gesture`

#### Gate 4 — nothing corrupts, everything reaches
- [ ] Gate commands green, exit codes read directly.
- [ ] Every negative control's disabled half was observed red.
- [ ] The guard and the decoration pass agree on the boundary across an edit sequence.
- [ ] **Simplification runs alone, and runs first** — `code-simplifier` dispatched against `<base>..HEAD` with no reviewer beside it and no reviewer's findings in its brief, then `comment-killer-agent` over what it returns. A build reviewed for correctness before it has settled its own relationships gets defended rather than reduced, which is why the order is fixed.
- [ ] Its reductions applied, or refused in the Log with a reason. The phase re-gates after they land.
- [ ] Only then, correctness review dispatched against the same range; the reports cite files inside it.
- [ ] **Cohesion Criteria C1–C10 answered against this phase's diff**, each carrying its evidence rather than its assertion.
- [ ] Net line delta reported — code only, comments and blanks and tests excluded.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] **Interaction pass handed to Nathan.**
  1. Click a marker with the section open — the caret lands in its citation.
  2. Click a marker with the section hidden — it opens, the caret lands, and the Subfield label agrees it is open.
  3. Click a marker whose citation is exactly one link, or exactly one Connection — it navigates instead of jumping.
  4. Add a trailing period to that citation and click again — it jumps now rather than navigating.
  5. Right-click a marker — Edit, Copy, Delete. Right-click a citation — Copy, Delete.
  6. Copy a marker, paste it elsewhere on the page — it binds to the same citation and both markers share one number.
  7. Select across body text *and* part of the section, then delete — only what you swept goes; no citation disappears on its own.
  8. Put the caret at a citation's text start, press Left once, and type — the citation must not break. Then Backspace at that spot — the whole footnote goes, marker included.
  9. Drag a body block to the very bottom of the page — nothing ends up stranded below the section.

---

### Phase 5 — Creation and numbering

#### Task 19: The renumbering engine

**Requirement:** 7

**Why:** Every creation and deletion gesture needs the same answer — the canonical label set and the section's order after this change — and three gestures each computing it is three ways to get it wrong. Numeric labels are gesture-owned and word labels are user-owned, but both hold a position, which is what makes the section's displayed order and the disk's numeric labels agree without ever rewriting something the user chose.

**Files:**
- Modify: `Pommora/src/shared/citations.ts` — the normalization.
- Test: `Pommora/src/shared/citations.test.ts`

**Interfaces**
- Produces: `normalize(doc, scan)` → the edits that renumber numeric labels to first-use order and reorder the section's rows to match, with orphans collected below the resolved rows.
- Assumed by: Tasks 20, 21.

**Must agree:** after `normalize` runs, every numeric disk label equals the ordinal Task 1's walk assigns it. One test applies the edits, re-scans, and asserts the two agree for every entry — the two named exceptions aside (an orphan holding a number, and a word label holding a position).

**Failure half:** a document with only word labels → no label rewrites, rows still sorted positionally. An orphan squatting on a number → minting routes around it. A hand-typed numeric label out of sequence → left alone until the next gesture normalizes it.

**Steps:**
- [ ] Write the failing tests: mixed numeric and word labels; the orphan skip; the reorder; the no-op case producing no edits at all.
- [ ] Implement `normalize` as a pure function over the scan, returning edits that **begin strictly after the section's first character and end strictly before its last**. "Per-line" is not enough on its own: the fold entry maps its start forward and its end backward, so an edit that opens exactly at the section's first offset lands past it and leaves the fold spanning a range that no longer lines up. A whole-section replace is the worst case — it collapses both ends onto the insertion point and drops the fold entirely — but a reorder that rewrites the first row's start has the same shape.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(shared): one normalization for footnote order`

#### Task 20: Insert ▸ Footnote and Paste As ▸ Footnote

**Requirement:** 6

**Why:** Insert follows the two existing escape hatches rather than the block-format union, because it inserts a pair at the caret rather than transforming a block — the union's exhaustive switch would be the wrong home and would force a meaningless format case. Paste As normalizes because a raw multi-paragraph paste would otherwise split the section into two, which is the one way a creation gesture could corrupt the document it is writing into.

**Files:**
- Modify: `Pommora/src/main/editorMenu.ts` — the Insert submenu row, and the Paste As submenu builder, which composes only from the target-gated rows and so cannot surface the Footnote row on its own.
- Modify: `Pommora/src/shared/PasteAsMenu.ts` — the new form and its row, offered on a **separate predicate** (a non-empty clipboard) rather than through `pasteAsTarget`. That function refuses any clipboard holding a newline because every existing form writes one line, so routing Footnote through it would make the multi-paragraph normalization D-3 exists for unreachable. Leaving it untouched keeps the three existing forms and their tests exactly as they are.
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/menu.ts` — both action branches.
- Test: `Pommora/src/shared/PasteAsMenu.test.ts` — the Footnote row appears for a multi-paragraph clipboard, and the three existing forms still do not.

**Failure half:** Insert with the caret inside a citation → refused; markers live in the body and cells only. Paste As with a multi-paragraph clipboard → blank lines collapsed, following lines shaped into continuations. Paste As with an empty clipboard → the row is not offered.

**Steps:**
- [ ] Add the Insert row as one data entry, and its branch beside the two existing escape hatches that already sit ahead of the format-union dispatch.
- [ ] Add the paste form, its row, and the normalization.
- [ ] Run each through `normalize`, and honor the Jump To Citation setting for disclosure and caret seating.
- [ ] Write each as one transaction so one undo reverts the whole creation.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(editor): Insert and Paste As write a footnote pair`

#### Task 21: The typed auto-seed

**Requirement:** 6

**Why:** Typing a fresh label is a creation gesture like any other, so it seeds the citation and normalizes the order — the same result the menu paths give, reached by typing. Typing a label that already has a citation is adoption instead, and rewrites nothing, which is what makes hand-typed sharing work. The transform joins the existing chain and bails inside code, wikilinks and link targets exactly as its two siblings do.

**Files:**
- Modify: `Pommora/src/renderer/src/MarkdownPM/input/index.ts` — the transform.
- Modify: `Pommora/src/renderer/src/MarkdownPM/editor/input.ts` — the chain link.
- Test: `Pommora/src/renderer/src/MarkdownPM/input/citationSeed.test.ts`

**Failure half:** an escaped `\[^1]` → no seed, because the escape suppresses the reference at the parser too. A shape GFM does not parse as a label, such as one containing a space → no seed. A label matching an existing citation → adopted, nothing seeded, nothing renumbered. Inside a table cell → the cell editor omits the input extension, so no seed fires, consistent with cell creation being a Prospect.

**Steps:**
- [ ] Write the failing tests including every failure-half case.
- [ ] Implement the transform, firing on the closing bracket, bailing on the three existing gates.
- [ ] Route a fresh label through `normalize`; adopt an existing one without edits.
- [ ] Dispatch once so the whole creation reverts on one undo.
- [ ] Run the gate — expect green.
- [ ] Commit: `feat(editor): typing a footnote label seeds its citation`

#### Gate 5 — creation is complete and reversible
- [ ] Gate commands green, exit codes read directly.
- [ ] Every creation path reverts whole on one undo — observed, not assumed.
- [ ] **Simplification runs alone, and runs first** — `code-simplifier` dispatched against `<base>..HEAD` with no reviewer beside it and no reviewer's findings in its brief, then `comment-killer-agent` over what it returns. A build reviewed for correctness before it has settled its own relationships gets defended rather than reduced, which is why the order is fixed.
- [ ] Its reductions applied, or refused in the Log with a reason. The phase re-gates after they land.
- [ ] Only then, correctness review dispatched against the same range; the reports cite files inside it.
- [ ] **Cohesion Criteria C1–C10 answered against this phase's diff**, each carrying its evidence rather than its assertion.
- [ ] Net line delta reported — code only, comments and blanks and tests excluded.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] **Interaction pass handed to Nathan.**
  1. Insert ▸ Footnote with Jump To Citation on — the section opens and the caret lands in the new citation.
  2. Turn the setting off and insert again — the pair is written silently and the caret stays put.
  3. ⌘Z after each — the whole pair reverts in one step, never half of it.
  4. Copy two paragraphs, right-click, Paste As ▸ Footnote — the row is offered, and one citation lands rather than a split section.
  5. Type `[^1]` by hand in the body — its citation seeds itself and the numbering re-sorts.
  6. Type a label that already has a citation — it adopts that one; no duplicate appears.
  7. Type an escaped `\[^1]` — nothing seeds; it stays as written.
  8. Insert a footnote *above* existing ones — every number after it re-sorts, body and section together.

---

### Phase 6 — The record

#### Task 22: Documentation and closeout

**Requirement:** 11

**Why:** A document still false at closeout is a defect in the commit that should have carried it. The per-task edits landed with their tasks; this task writes the feature's own documentation, which has no earlier commit to ride, and closes the project-level record.

**Files:**
- Create: `.claude/Features/FootnotesPM.md`
- Modify: `.claude/Features/MarkdownPM.md`, `.claude/ContextPM.md`, `.claude/HistoryPM.md`, `.claude/CLAUDE.md` codebase map.

**Steps:**
- [ ] Write the feature document as an encyclopedic guide to what footnotes do and what exists — never implementation notes, never a reference to planning documents.
- [ ] Update the editor's feature document, the codebase map, and the context document's focus and candidates.
- [ ] Add the History entry as one milestone arc.
- [ ] Run the closing sweep over Dead Vocabulary against its control.
- [ ] Route lessons to `.claude/Guidelines/`.
- [ ] Run the gate — expect green.
- [ ] Commit: `docs(footnotes): the feature's record`

#### Gate 6 — closeout
- [ ] **A final simplification pass over the whole range**, dispatched alone before anything else in this gate — the per-phase passes each saw one slice, and a duplication that formed across two phases is invisible to both.
- [ ] **Cohesion Criteria C1–C10 answered against the full range**, not against the phase diffs that already passed. C1 and C5 are the ones a per-phase pass structurally cannot answer.
- [ ] Total net line delta reported — code only, comments and blanks and tests excluded — beside what the feature bought for it.
- [ ] The Delivery Claim written.
- [ ] Neutral verifier dispatched against the claim, the decision log, and the full range — answered yes.
- [ ] Attack pass dispatched only after that yes.
- [ ] **Final interaction pass handed to Nathan** — the acceptance criterion end to end on a page authored outside Pommora, every earlier gate's pass re-run once against the finished build, and the file opened in another editor afterwards to confirm it is unchanged plain GFM apart from what was added.
- [ ] Dead Vocabulary sweep returns zero against a non-zero control.
- [ ] Lessons routed; Log's Closeout written.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — One boundary, and the counter that proves it · base `<commit>`
  - [ ] Task 1 — The shared citation scan · `<commit>`
  - [ ] Task 2 — The scan joins the editor's document derivation · `<commit>`
  - [ ] Task 3 — Statistics stop counting the section · `<commit>`
- [ ] **Phase 2** — The section and its markers draw
  - [ ] Task 4 — The citation row's styling · `<commit>`
  - [ ] Task 5 — Citation lines emit as numbered rows · `<commit>`
  - [ ] Task 6 — The marker draws atomic and positional · `<commit>`
  - [ ] Task 7 — Markers render in resting table cells · `<commit>`
  - [ ] Task 8 — The section is inert to the block layer · `<commit>`
- [ ] **Phase 3** — Hiding and showing
  - [ ] Task 9 — The visibility override's storage · `<commit>`
  - [ ] Task 10 — The two settings · `<commit>`
  - [ ] Task 11 — The section is a fold region, seeded rather than persisted · `<commit>`
  - [ ] Task 12 — The chevron class and the heading-gesture class separate · `<commit>`
  - [ ] Task 13 — The Subfield's Show / Hide control · `<commit>`
  - [ ] Task 14 — The divider draws and folds · `<commit>`
- [ ] **Phase 4** — Guards and gestures
  - [ ] Task 15 — The tail guard · `<commit>`
  - [ ] Task 16 — Marker click — jump, or follow · `<commit>`
  - [ ] Task 17 — The two construct menus · `<commit>`
  - [ ] Task 18 — Range-keyed cascades · `<commit>`
- [ ] **Phase 5** — Creation and numbering
  - [ ] Task 19 — The renumbering engine · `<commit>`
  - [ ] Task 20 — Insert ▸ Footnote and Paste As ▸ Footnote · `<commit>`
  - [ ] Task 21 — The typed auto-seed · `<commit>`
- [ ] **Phase 6** — The record
  - [ ] Task 22 — Documentation and closeout · `<commit>`

### Rulings

- **08-20-2026, Nathan:** No statistics toggle. The citations section never counts; a marker counts its own source characters and zero words (`[^1]` four, `[^10]` five). Supersedes the decision log's earlier three-setting group.
- **08-20-2026, Nathan:** The citation row's glyph comes from the codeblock line-count chrome, sharing the ordered marker's CSS. The ordered branch draws its own source and cannot show a positional number.
- **08-20-2026, Nathan:** There is no chevron. The Subfield control is literal text — Show Footnotes / Hide Footnotes — and the divider is the other half.
- **08-20-2026, Nathan:** C-3's clear-on-default confirmed — a toggle landing on the current default deletes the row.
- **08-20-2026, Claude (disclosed, unvetoed):** the characters-but-no-word rule applies to every marker-shaped run, bound or not, so the counter needs no resolution data. An unmatched marker therefore scores zero words where A-3 calls it prose. An **escaped** `\[^1]` is not marker-shaped and counts as ordinary prose, matching the parser.

### Open Against Later Tasks

- **Closed at planning:** the divider click's latency. The override is written through the store slice optimistically with the IPC fire-and-forget — the same shape as every other persisted preference here — so the section moves within the frame rather than behind a round-trip. Stated in Task 13's steps.

*Both unknowns the attack round raised were closed against the code rather than carried. They are recorded here as resolved, so a later session does not re-open them.*

- **Filter composition — closed, not an issue.** The table guard cancels only when `fusedTableCount` actually rises between the start and new documents; it does not refuse multi-line inserts generally. The citations guard reshapes text at the document's tail inside a section that cannot contain a table and that sits after every table, so no reshape it performs can fuse two. The scenario needs one edit that both touches the citations tail and merges two tables, and no such edit exists. **One real property survives and is folded into Task 15:** a re-issued transaction currently carries `userEvent` and drops every other annotation, so a reshape could strip a downstream guard's self-edit annotation and cost it a document scan it would otherwise skip. Task 15 re-carries the annotations it does not own.
- **A drop above the section — closed, not an issue.** `blockMoveChanges` already fences both seams: it emits a blank after every inserted block and heals the hole the cut leaves, with its own comment naming this exact hazard — a glue-adjacent block would otherwise lazily continue a list or merge two paragraphs. A paragraph dropped above the section always lands with a blank after it, so the first citation cannot become its continuation. **The adjacent case the round did not raise is real and already covered:** a block dropped at the document's end lands *after* the section, which is the strand A-5b forbids, and Task 15's rule is "at or after". Task 15 names it as a test case rather than leaving it implied.

### Deviations

### Lessons

### Sequenced After

- Hover preview of a citation on its marker.
- Drag-to-reposition markers.
- Footnote creation from inside a table cell.
- The Subfield reading the editor's cached document scan, which closes the standing table-miscount Known Issue and would let the counter drop its own boundary read.

### Closeout
