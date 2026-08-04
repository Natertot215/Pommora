## Embedded Pages — Implementation Plan

**Status:** written, pending review
**Spec:** [[Embedded Pages — Decision Log]] — settled, zero open decisions. Decision IDs (A-1…F-7) cited per task.
**Base:** all `file:line` citations verified against the working tree at plan time; re-derive any that a prior task's edit may have moved.

### Goal

Render a real Page as a live, editable tile inside MarkdownPM, authored as Obsidian's `![[Title]]` on a lone line — riding the shared Embed Framework (`PageEmbed`), the SurfacePM tile chassis (hoisted, handle-less), and the existing menu/cache/cascade machinery rather than parallel inventions. The approach was ratified against alternatives in the decision log: a real-`.cm-line` inline replace over a table-style block widget (B-4, so the gutter-grip and line conventions apply), resolution as the only target discriminator (A-4), and consolidation-over-invention at every seam Nathan confirmed (chassis B-3, cache B-10, crumbs C-2, tree projection D-1/D-2, autocomplete panel B-14). This deliberately isn't solving: live per-keystroke refresh of embeds (prospect), per-embed zoom (prospect), interactive nesting (B-6 renders non-interactive), prefix-hosted embeds (F-3), or any record-backed deleted-page display (prospect).

**End-to-end acceptance criterion:** in the running app, typing `![[` on an empty line offers the autocomplete; committing a resolving page title renders a live tile wearing the shared chassis (accent border on hover/edit at `--duration-base`, banner-or-breadcrumb header, `EMBED_SCALE` sizing); the raw syntax never shows at any caret position; ArrowUp/Down hop the tile; the tile's gutter grip drags the block and right-clicks a native menu whose Page Source ▸ re-aims it and whose Delete removes it; boundary backspace/delete are refused while a spanning selection deletes it; renaming the target page keeps the tile resolved; deleting the target degrades it to the inert dim token without waiting for a caret move; scrolling far away and back rehydrates the tile without an IPC refetch; and switching the host tab away unmounts everything.

### Grounding

Five scout reports (this session) verified every seam firsthand; the attack review of the spec executed the mechanism against real CM6. Load-bearing facts the plan builds on:

- Skip-over geometry: atomic ranges must absorb both boundary newlines — `[prevLine.to, nextLine.from]` — to remove the invisible caret seats; doc-edge clamps re-admit a seat (the spike's target). Custom `Prec.high` keymap handlers run before CM defaults; only the defaults respect atomic ranges.
- The inline replace keeps the `.cm-line` element, so line decorations (rail grip `md-block-handle`) still land; a ViewPlugin-sourced decoration never reaches CM's height map, so the tile lives in its own StateField (B-7); `WidgetType.estimatedHeight` covers the loading frame (`editor/folding.ts:181` is the one precedent).
- Widget React roots are separate roots: no context crosses in; values thread via CM Facet (`Tables/widget.tsx:39` `tableConnections`) or props.
- Grip menus are ask-channel promises resolved renderer-side (callout: `editor/calloutGripMenu.ts` → `main/calloutMenu.ts`); the suppression flag is `calloutGripHot` (`main/editorMenu.ts:23`, set from `MarkdownPM/index.tsx:170–172`, cleared post-menu at `calloutGripMenu.ts:29`). Native menus carry no icons anywhere.
- The fenced insert shape is `setBlock`'s table case (`input/format.ts:205–218`); the fence guard shape is `tableMergeGuard`'s result-doc predicate (`Tables/guard.ts:25`); the mirrored forward-delete is `editor/input.ts:58–67`; the callout delete's newline handling is `calloutGripMenu.ts:20–26`.
- `PageDetail` already carries `frontmatter` + `title` in the embed's existing fetch (`page:open`); PageEmbed discards them today. Change-banner lives in the banner band's context menu (`PageHeader.tsx:36–40`), not a button.
- The warm cache is (tabId, navKey)-keyed with a path fence at read sites; `dropWarmDetail` fires on exactly two mutations (setIcon/setBanner, `store.ts:1455/1468`); rename/delete rely on fences/tab-death today. `pageFlush` is the single per-path writer; failed saves self-requeue (`pageFlush.ts:31`).
- Connection restyle is lazy — the decoration ViewPlugin rebuilds only on doc/selection/focus/viewport changes; no push exists when the tree changes (C-5's named nudge is new, small, and benefits connections too).
- The connections pattern (`shared/connections.ts:35`) has four consumers; the cascade takes a parallel embed pattern (A-3), and `scanConnections`/`rewriteConnections` (`main/connections/scan.ts`, `rewrite.ts`) gain the embed-aware sweep beside it.
- The jsdom EditorView harness exists: `MarkdownPM/readOnlySelection.test.tsx` (`@vitest-environment jsdom`, `EditorView.findFromDOM`, real extensions). No atomic-motion test exists anywhere yet.

### Inherited Reasoning (tried/rejected — do not retry)

- Table-style `block: true` replace — rejected (B-4): loses the `.cm-line`, the rail grip, and the line-width conventions.
- Extension-based image/page discrimination — rejected (A-4): bans dotted titles forever; resolution alone discriminates.
- Widening `pageLinkPattern` for the cascade — rejected (A-3): four consumers; token layer and autocomplete must not shift.
- A bare "Embed Page" item inserting `![[]]` — rejected (D-1): creates an unresolved token its own repair menu can't reach.
- Per-embed banner toggle on stored entry keys — rejected (C-1): the page's own cover decides; the markdown line stays the only persistence.
- Visually consuming the fencing blanks into the tile — rejected (B-13): a hidden blank hosting a caret recreates the invisible-seat bug.
- React Context for the ancestor guard — rejected (scout-verified): widget roots are separate React roots; context never arrives.

### Global Constraints

- Every phase gates on: `npm run typecheck` (0 errors) · `npx vitest run` with `set -o pipefail` (exit code read directly) · `npx biome lint src` (read the summary line) · `npm run build`. UI-facing phases additionally verify in the running app (CDP screenshot or Nathan live).
- One tree-touching writer at a time; sub-agents forbidden in every dispatch brief.
- Biome owns formatting; `KNOB` and `(Nathan's call)` markers survive every edit — grep-verify after agent passes.
- Docs/comments never reference this plan or session; corrections are rewritten as always-true (fix or remove, never amend).
- **Review mandate (Nathan's directive):** every phase-gate and closeout reviewer is instructed to also flag any documentation or code comment the phase's changes have made false — fix-or-remove framing, and silence is not conflict: only claims that now contradict shipped behavior count.
- New source files are PascalCase; UI action labels Title-Case ("Embed Page", "Page Source").

---

### Phase 0 — The Skip-Over Spike (verify-first)

**Why:** B-9's absorb is the one mechanism piece not executed by the attack review at its edge cases. The plan builds three phases on it; a doc-edge failure discovered in Phase 2 would invalidate the widget's atomic design. The escape hatch is explicit: if the absorb cannot produce a clean skip-over at document edges, STOP and present the evidence — do not build routing workarounds unratified.

**Task 0.1 — Prove the absorb geometry in the jsdom harness.**
- **Files:** new `MarkdownPM/embedAtomic.spike.test.tsx` (temporary name; graduates into the real extension's test file in Phase 2), modeled on `readOnlySelection.test.tsx` (mount pattern, `EditorView.findFromDOM`).
- **Steps:** build a minimal extension supplying `EditorView.atomicRanges` over `[prevLine.to, nextLine.from]` for a hard-coded "embed line". Drive `cursorLineDown`/`cursorLineUp`/`cursorCharLeft`/`cursorCharRight` (from `@codemirror/commands`) and assert the selection never rests inside the absorbed range for: (a) embed mid-document; (b) embed on line 1; (c) embed on the last line; (d) a document that is only `![[X]]`; (e) embed directly below a fence. jsdom has no layout — drive command functions, never synthesized keydown geometry.
- **Expected:** (a) passes from the attack review's evidence; (b)–(d) are the unknowns. Record the verdict per case in the Log. A failing edge case does not fail the phase — it triggers the escape hatch with the failing test as evidence.
- **Gate:** the spike suite green (or the STOP report), typecheck clean.

---

### Phase 1 — Detection, Block Model, Intent Gate (pure layers)

**Why:** every later layer (widget, grips, guards, menus) reads one derivation (A-2). Building the pure layers first keeps them unit-tested at the model tier before any DOM exists.

**Task 1.1 — `embedRanges` detection derivation + the token rename.**
- **Why:** A-2/A-4/B-11 — lone-line, trimmed, fence/table-excluded, resolved-only, first-per-title. The `imageEmbed` naming dies here too: the token is the embed syntax's inert styling, and every rename site lives in this task's files — regex (`detect/index.ts:4`), token kind (`tokens/index.ts`), intent class (`decorations/intent.ts:106`), CSS class (`Styles.css:331`) — so the rename ships in this one commit and no later phase carries stale vocabulary.
- **Files:** `MarkdownPM/detect/index.ts` (a `blockEmbedLines(text, excluded)` sibling to `blockMathRanges`, reusing the embed regex's shape with a whole-trimmed-line anchor); `MarkdownPM/editor/embedRanges.ts` (new, mirroring `mathRanges.ts`: imports ONLY `../detect` + `../Tables/regions` — never `docCache`/`intent`, the cycle rule the scout verified).
- **Interfaces:** `docEmbedLines(doc: string): { from: number; to: number; title: string }[]` — raw candidates, order-preserved, exclusions applied. Resolution and dedup happen at the consumer (the StateField), because the pure layer has no title map. `DocScan` gains an `embeds` field computed in `scanDoc` (`decorations/intent.ts`), cached via docCache like `maths`.
- **Must agree:** the detection, the blockModel kind (1.2), and the intent gate (1.3) all read this one derivation — one test crosses all three on the same document.
- **Failure half:** empty title `![[]]`, whitespace-padded lines (trim per A-2), `![[x]]` inside a fence/table (excluded), two candidates same title (both emitted here; dedup downstream).
- **Tests:** pure-model tier beside `detect.test.ts`.

**Task 1.2 — `embed` BlockKind.**
- **Why:** B-8 — without it a glued embed absorbs into the paragraph and has no grip; verified by the attack review's executed repro.
- **Files:** `MarkdownPM/editor/blockModel.ts` — union member; `BlockContext` gains `embeds` (from `docEmbedLines`); `claimed(i)` gains `inEmbed(i)`; `kindAt` slots after math; `blockAt` returns the hr-shaped single-line block; `blockStarts` uses the default first (single-line). No listMember absorb (lone-line + fenced never continues a run — scout-verified). `MarkdownPM/editor/blockHandles.ts` — `embed` joins `GRIP_KINDS`.
- **Tests:** mirror the math pins in `blockModel.test.ts` — glued-under-prose gets its own block; the grip line class lands; drag boundaries are the single line.

**Task 1.3 — The intent gate.**
- **Why:** an inline replace keeps the line, so without a gate the line still emits `md-image` token intents and a paragraph line class under the widget (scout-verified; the math gate at `decorations/intent.ts:226–229` is the template).
- **Files:** `decorations/intent.ts` — `inEmbedLine` branch in `lineIntentsInto` (no constructs, no rail membership); token suppression for lone-line occurrences (the `insideFence` pattern at `editor/decorations.ts:156` extended, or an intent-level filter — pick whichever keeps non-lone `![[x]]` styling byte-identical).
- **Negative control:** a non-lone `![[x]]` keeps today's inert inline treatment under the renamed class (pin it); the pin must go red with the gate disabled.
- **Gate (phase):** typecheck · vitest · lint · build. Simplification + review dispatch on the phase range.

---

### Phase 2 — The Tile (chassis, widget, guards)

**Why:** the user-visible core. Everything here composes Phase 1's derivation with the chassis and the caret protections.

**Task 2.1 — Hoist the shared tile chassis.**
- **Why:** B-3 — one chrome definition; SurfacePM folds onto it rather than the embed copying it. The shared artifact ships as a **stylesheet + class contract**, not a component: `TileShell` is inseparable from SurfacePM's rect/phase/handle machinery and would never mount a shared component, so a `TileChassis.tsx` would be single-consumer fragmentation — the embed's chassis markup is a ~10-line div pair inlined in the widget, both consumers keyed to the one stylesheet. (B-3's word was "component"; the class contract is the component — disclosed for Nathan's sign-off at plan approval.)
- **Files:** new `design-system/tileChassis.css` (location per the design-system stylesheet convention — verify neighbors before creating); `SurfacePM/surfacepm.css` + `SurfaceView.tsx` (TileShell composes the shared classes); `Blocks/blocks.css` + `Embeds/embeds.css` (the `.spm-tile`-keyed rest-scroll and edit-trap rules re-key to the shared class).
- **What moves:** the border/radius/border-color-transition block (`surfacepm.css:9–25` minus transform/zoom lines), the body clip (`85–90`), the page-embed accent rules (`191–206`, re-scoped off the `.blk-surface` gate). What stays: positioning, phases/Feel, lift, resize, handle, edges, zoom steps, borderless, placement.
- **Refactor shape — baseline invariant:** the moved rules render identically on SurfacePM tiles after the fold — rest border/radius, hover/edit accent reveal, body clip — verified in the running app with CDP screenshots. The untouched rules (drag, resize, borderless) need no per-gesture re-verification; the phase's normal app pass covers them incidentally.
- **Survivors:** the "Nathan tunes these live" comment travels with the moved rules; `--tile-border` stays the single source.

**Task 2.2 — The embed StateField widget.**
- **Why:** B-4/B-7 — the tile, height-map-visible, incremental.
- **Files:** new `MarkdownPM/editor/embedWidget.tsx` (StateField + WidgetType + React root, the `Tables/widget.tsx` recipe minus `block: true` and minus the self-edit path); `MarkdownPM/index.tsx` (extension registration + facet supply).
- **Interfaces:** a facet carrying `{ getConn, ancestors: readonly string[], onEditingChange }` (the `tableConnections` pattern); the widget resolves title → page via the facet's connections at build time; resolved-only — phantom/ambiguous emit nothing (A-5, scout-confirmed consistency). First-per-normalized-title dedup here (B-11), using `normalizeTitle` so dedup and resolution agree. `estimatedHeight` set for the loading frame. Update paths: map-forward vs rebuild on an `editAffectsEmbeds`-style ±1-line predicate. `ignoreEvent(): true`; `destroy` unmounts via `queueMicrotask`; root parked on the DOM node.
- **The widget renders:** the chassis div pair (handle-less, on the shared classes) → `PageEmbed` with `path`, `editing`, `onBeginEdit`, `connections`, `ancestors ∪ {hostPath}`, non-interactive when nested or when a same-path tile already edits (B-6/B-11). A failed `page:open` on a resolved page renders the inert-degrade, not an empty editor (scout-flagged gap).
- **Editing state:** host-owned `editingId` equivalent (per-view state fed through the facet), stamping the editing class on the chassis; capture-phase document `pointerdown` + window-level gated Escape, the `BlockSurface.tsx:145–164` pair replicated at the extension level (C-4: signals and click-out match SurfacePM exactly).

**Task 2.3 — Atomic absorb + guards + fencing.**
- **Why:** B-9/B-13/D-3 — the caret protections the spike proved.
- **Files:** `embedWidget.tsx` (or a sibling `embedAtomic.ts`): atomic facet reading the field's ranges widened to `[prevLine.to, nextLine.from]` (the spike's geometry, including its doc-edge resolution); `editor/input.ts`: mirrored boundary guards beside `onForwardDelete` (backspace at next-line start, forward-delete at prev-line end, both refusing per D-3); a `transactionFilter` merge-guard on the result-doc predicate (an embed line acquiring a non-blank neighbor via deletion = refused), the `tableMergeGuard` shape; the fenced insert helper (used by menus in Phase 4) shaped like `setBlock`'s table case.
- **Negative controls:** each guard's test dispatches the real gesture and must go red with the guard deleted — for these guards one assertion carries both halves, since without the guard the atomic default deletes the whole block (a different doc), never a silent no-op. Spanning-selection delete stays allowed and removes the tile cleanly (D-5 — pin the attack review's verified behavior).
- **Failure half:** delete-at-EOF (the `from -= 1` branch), an embed whose fencing blank is the doc's last line, undo of a refused-then-allowed sequence.
- **Gate (phase):** all four commands + the running-app pass: type `![[Title]]` lone-line (manually — menus don't exist yet), see the tile, drive every caret gesture from the acceptance criterion. Simplification + review on the range; reviewers carry the doc-flagging mandate.

---

### Phase 3 — Chrome (header, breadcrumb, signals)

**Task 3.1 — Display-only banner header.**
- **Why:** C-1 — banner + static title when the page has a cover; change-banner kept, add-banner and rename excluded.
- **Files:** `MarkdownPM/PageHeader.tsx` (extract the cover-band branch into a display variant, static span instead of `DetailTitleHeader`, keep the `bannerMenu` context handler — change/remove ride free; scout-verified the menu IS the control); `Embeds/PageEmbed.tsx` (stop discarding `frontmatter`/`title` — the same fetch already carries them; render the banner variant as a static flow block above the editor, NOT the scroll-parking mount — both parking bites are scout-documented); `Embeds/embeds.css`.
- **Failure half:** cover key present but asset missing (render coverless → breadcrumb); cover removed via the embed's own menu (header collapses to breadcrumb on the reload).

**Task 3.2 — The hover breadcrumb.**
- **Why:** C-2 — coverless pages show where they live.
- **Files:** the centered + two-tone classes hoist from `previewTabStrip.css:6–34, 73–91` into a named section of the existing `Tabs/tabStrip.css` (the file previewTabStrip already borrows motion classes from — ~3 rules, no new stylesheet); PagePreview re-keys onto it, its `pgpreview-`-specific morph/collapse rules staying put. The embed's hover reveal (opacity on tile hover at `--duration-base`, matching the accent-border timing) lives with the embed chrome. `NavCrumbs` stays in Navigation/ (it's already multi-consumer); crumb data via `resolveIndexOf` + `resolveWith` exactly as `PreviewWindow.tsx:120–126`.
- **Baseline invariant:** the preview window's title renders identically after the re-key (screenshot before/after).
- **Gate (phase):** four commands + running-app screenshots of banner-tile and breadcrumb-tile states (design-verification rule: show Nathan or CDP-capture).

---

### Phase 4 — Menus

#### Phase 4a — The Tree-Projection Mini-Phase (explore-first, Nathan's directive)

**Task 4a.1 — Dispatch the consolidation scout.** An explore-and-advise agent (read-only, no sub-agents) briefed with: the three consumers (cardMenu's `MoveTarget` walk at `CardsView.tsx:597–601`, `pagePickerItems` at `BlockSurface.tsx:40–60`, and the embed menus' need — Collections → Sets → Pages with per-consumer filtering); the constraint that native menus are icon-less while the React drill renders icons and the shapes are today disjoint by design (path-keyed containers-only vs id-keyed icon-carrying page-leafed); and the question: the simplest shape — a shared projection, or none. Its report ratifies before anything builds.

**Task 4a.2 — Implement per the scout's verdict.** Two legitimate outcomes: (a) a shared projection both menu systems consume, cardMenu's walk and `pagePickerItems` folded on, with a baseline invariant that Move To and the SurfacePM Source drill behave identically; or (b) **no fold** — the embed menus get their own ~15-line MoveTarget-shaped walk with page leaves in `shared/embedMenu.ts`, beside cardMenu's, because a projection generic enough for three disjoint shapes costs more than the ~26 lines it deletes. The scout's evidence decides; a fold ships only on a demonstrated net win.

#### Phase 4b — Grip Menus

**Task 4b.1 — Widen the suppression flag.**
- **Why:** D-6 — one flag, any hot grip; two menus never pop together.
- **Files:** `MarkdownPM/index.tsx:170–172` (predicate: any grip-bearing line — note the scout's caveat that hover reports the hovered line, so the predicate keys on the grip's own line classes: `md-block-handle`, `md-callout-first`, `md-bq-grip` host); rename cascade across `main/editorMenu.ts:23–26,189`, `bridge.ts:297`, `preload/index.ts:197–198`, `main/index.ts:1605` + the comment sweep the docs catalog items 14–18 name.
- **Negative control:** right-click a paragraph grip → exactly one menu; right-click line 2 of a multi-line block's gutter → the generic menu (the grip line is line 1 only).

**Task 4b.2 — The grip menu (creation + tile, one unit).**
- **Why:** D-1/D-2/D-3 — one handler, one menu module, one bridge entry, branching per grip kind; splitting would author the shared ctx/action union for half its variants and re-open all three files mid-phase.
- **Files:** new `MarkdownPM/editor/embedGripMenu.ts` (the `calloutGripMenu.ts` shape: contextmenu handler, gutter hit-test, `blockAt` span in closure, ask-channel promise, post-menu flag clear + focus); new `main/embedMenu.ts` (the `popCardMenu` recursive-tree pattern; parent-repeats-itself idiom); `shared/embedMenu.ts` (ctx/action types + the tree walk per 4a's verdict); one `Asks` entry in `bridge.ts` + preload dialer + `main/index.ts` registration.
- **Branches:** a non-embed grip offers "Embed Page ▸" (the filtered tree; pick → the fenced-insert helper from 2.3 below the grip's block); an embed grip (`blockAt(...).kind === 'embed'`) offers "Page Source ▸" (same tree; pick → same-line title rewrite) + "Delete" (the callout-delete shape: line + one adjacent newline + its orphaned fencing blank, `userEvent: 'delete'`, one dispatch/undo unit).
- **Failure half:** re-aim to a title that duplicates an existing embed (refused by the B-11 filter — the tree omits it); delete of a doc-edge embed (EOF newline branch).
- **Gate (phase):** four commands + running-app: create → re-aim → delete round-trip from the grips. Review with doc mandate.

---

### Phase 5 — Autocomplete, Cache, Cascade, Nudge

**Task 5.1 — `![[` autocomplete + panel re-home.**
- **Why:** B-12/B-11/B-14.
- **Files:** `MarkdownPM/autocomplete.ts` (a second, local embed-aware branch in `autocompleteQuery` — note it currently DOES fire inside `![[…]]` since it never checks the `!`; the branch makes the mode explicit and shifts `from`/insert to carry the `!`); `connectionInsert` gains the embed form; `MarkdownPM/index.tsx:107–116` (the page editor's `candidatesFor` adds the B-11 filter in embed mode); table cells' call site stays `[[`-only (leak guard: a cell test pinning no `![[` completion). Panel re-home: `AutocompletePanel.tsx` onto PickerMenu's beak-less surface (B-14) — the panel inherits the shared chrome/motion; keyboard driving (up/down/enter/escape) pinned before and after.
- **Negative control:** the embed filter test proves a candidate WAS offered before embedding and omitted after.

**Task 5.2 — The warm slot + write-through.**
- **Why:** B-10 — rehydration without refetch or stale-read.
- **Files:** `Tabs/warmCache.ts` (path-keyed `Map<path, PageDetail>` slot, LRU-capped, covered by `dropWarmDetail` + `clearWarm`; header comment rewritten per docs item 19); `Detail/pageFlush.ts` (`schedulePageSave` writes the body through to the slot — schedule-time, the scout-ratified choice; one header line per docs item 20); `Embeds/PageEmbed.tsx` (initializer reads the slot before fetching; fetch effect skips on hit); `store.ts` (delete + rename of a page drop its slot entry — the two events the tab-keyed cache survives by fencing but a path-keyed slot must handle; rename also covers the cascade's body rewrites).
- **Failure half:** slot hit whose frontmatter predates a banner change (the existing `dropWarmDetail` triggers cover it — pin one); failed save during the debounce (cache holds intended body; requeue converges — assert no refetch race).

**Task 5.3 — The parallel embed pattern + cascade sweep.**
- **Why:** A-3/F-6.
- **Files:** `shared/connections.ts` (the embed pattern beside `pageLinkPattern`, comments rewritten per docs item 10 — `pageLinkPattern` itself untouched); `main/connections/scan.ts` + `rewrite.ts` (embed-aware prefilter + rewrite in the same sweep, comments per items 11–12); `main/crud/cascade.ts` (runs both).
- **Negative control:** a rename test proving `![[Old]]` → `![[New]]` AND `[[Old]]`-in-a-fence stays untouched AND `{{Old}}` stays untouched; red with the embed pattern removed.
- **Must agree:** the embed pattern, `imageEmbedRegex`, and the autocomplete's embed branch accept the same title grammar — one test feeds all three the same corpus.

**Task 5.4 — The restyle nudge.**
- **Why:** C-5's honest mechanics — tiles and connection colors react to tree changes without waiting for an interaction.
- **Files:** `MarkdownPM/index.tsx` — an effect keyed on the page-index identity dispatching an annotation-tagged empty transaction; the embed StateField and the decoration plugin both treat it as a rebuild trigger. Scope note: this changes connection restyle latency app-wide (strictly fresher); it is deliberate and disclosed.
- **Failure half:** the nudge firing during an in-flight edit (annotation must not disturb selection/history).
- **Gate (phase):** four commands + running-app: rename/delete/restore round-trip against a visible tile. Review with doc mandate.

---

### Phase 6 — Make It True (docs + comments) & Closeout

**Task 6.1 — The falsified-claims sweep.** The docs scout's 25-item catalog is the derivation (its control: every item was quote-verified at plan time; re-verify quotes before editing — earlier phases' comment rewrites will have consumed items 10–22 piecemeal; this task sweeps the remainder and the Features docs). **Fix direction: when an enumeration went incomplete, remove the enumeration rather than widen it** — "every grip doubles as a drag handle and carries its own menu" outlives any per-kind list, which just drifts again at the next kind (ruled on item 2; apply across the catalog). Fix-or-remove per item: MarkdownPM.md (items 1–3 + the grip-menu convention), SurfacePM.md (4–5 — the Embed Framework ships both consumers; the banner Pending entry dies, replaced by the shipped rule), ConnectionsPM.md (6–8), ViewsPM.md (9), plus any comment items earlier phases left. (The `imageEmbed` rename shipped whole in Task 1.1 — item 13 needs no sweep here.)

**Task 6.2 — Feature doc.** MarkdownPM.md gains the embed construct section (or a new `EmbedsPM.md` if the section outgrows it — judge at write time); Context.md's AutocompletePanel lesson line is deleted (resolved by 5.1); the decision log's role ends — the plan and Features docs carry everything forward.

**Task 6.3 — Closeout.** Two dispatches, never one: (1) a neutral verifier adjudicating the acceptance criterion against the running app, phase by phase; (2) the attack reviewer against the full diff, carrying the doc-flagging mandate. Every concern fixed or Nathan-ruled. Then simplification + comment-killer passes over the full range, `Handoff.md` via `/handoff`.

---

### Blast Radius

Code: `MarkdownPM/` (detect, tokens, decorations/intent, editor/{blockModel, blockHandles, input, docCache-adjacent, new embedRanges/embedWidget/embedGripMenu}, autocomplete, index.tsx, Styles.css) · `Embeds/` (PageEmbed, embeds.css, embedScale untouched) · `SurfacePM/` (chassis fold) · `Blocks/` (blocks.css re-key; pagePickerItems only if 4a folds) · `design-system/` (tileChassis.css) · `Tabs/` (warmCache, the crumb section in tabStrip.css) · `PagePreview/` (crumb re-key) · `Detail/` (pageFlush) · `Navigation/` (NavCrumbs comment) · `shared/` (connections, embedMenu, bridge) · `main/` (embedMenu, editorMenu, connections/{scan,rewrite}, cascade, index).
Docs made false and repaired: the 25-item catalog (MarkdownPM.md, SurfacePM.md, ConnectionsPM.md, ViewsPM.md + comments).
Behavior deliberately changed beyond the feature: connection restyle latency (5.4, fresher), autocomplete panel chrome (B-14), grip-flag naming (4b.1).

### Sequenced After (not this plan)

Live per-page refresh bus · per-embed zoom (`local_state` scope) · record-backed deleted-page tile · prefix-hosted embeds · `#heading`/`^block`/`|alias` forms · backlinks counting embeds (decided at the scanner when backlinks arrive).

### Log

- Phase 0 base: —
- Deviations: —
- Rulings: —
