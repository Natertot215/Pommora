## Embedded Pages — Implementation Plan

**Status:** review-certified — in execution (simplification round + two attack rounds + fold verification; all findings folded)
**Spec:** [[Embedded Pages — Decision Log]] — settled, zero open decisions. Decision IDs (A-1…F-7) cited per task.
**Base:** all `file:line` citations verified against the working tree at plan time; re-derive any that a prior task's edit may have moved.

### Goal

Render a real Page as a live, editable tile inside MarkdownPM, authored as Obsidian's `![[Title]]` on a lone line — riding the shared Embed Framework (`PageEmbed`), the SurfacePM tile chassis (hoisted, handle-less), and the existing menu/cache/cascade machinery rather than parallel inventions. The approach was ratified against alternatives in the decision log: a real-`.cm-line` inline replace over a table-style block widget (B-4, so the gutter-grip and line conventions apply), resolution as the only target discriminator (A-4), and consolidation-over-invention at every seam Nathan confirmed (chassis B-3, cache B-10, crumbs C-2, tree projection D-1/D-2, autocomplete panel B-14). This deliberately isn't solving: live per-keystroke refresh of embeds (prospect), per-embed zoom (prospect), interactive nesting (B-6 renders non-interactive), prefix-hosted embeds (F-3), or any record-backed deleted-page display (prospect).

**End-to-end acceptance criterion:** in the running app, typing `![[` on an empty line offers the autocomplete; committing a resolving page title renders a live tile wearing the shared chassis (accent border on hover/edit at `--duration-base`, banner-or-breadcrumb header, `EMBED_SCALE` sizing); the raw syntax never shows at any caret position; ArrowUp/Down hop the tile; the tile's gutter grip drags the block and right-clicks a native menu whose Page Source ▸ re-aims it and whose Delete removes it; boundary backspace/delete are refused while a spanning selection deletes it; renaming the target page keeps the tile resolved; deleting the target degrades it to the inert dim token without waiting for a caret move; scrolling far away and back rehydrates the tile without an IPC refetch; and switching the host tab away unmounts everything.

### Grounding

Five scout reports (this session) verified every seam firsthand; the attack review of the spec executed the mechanism against real CM6. Load-bearing facts the plan builds on:

- Skip-over geometry: atomic ranges must absorb both boundary newlines — `[prevLine.to, nextLine.from]` — to remove the invisible caret seats; doc-edge clamps re-admit a seat (the spike's target). Custom `Prec.high` keymap handlers run before CM defaults; only the defaults respect atomic ranges.
- The inline replace keeps the `.cm-line` element, so line decorations (rail grip `md-block-handle`) still land; a ViewPlugin-sourced decoration never reaches CM's height map, so the tile lives in its own StateField (B-7); `WidgetType.estimatedHeight` covers the loading frame (`editor/folding.ts:181` declares the getter but returns the don't-estimate sentinel — it's a declaration precedent only; the embed widget returns a real estimate).
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

- Every phase gates on: `npm run typecheck` (0 errors) · `npx vitest run` with `set -o pipefail` (exit code read directly) · `npx biome lint src` (read the summary line) · `npm run build`. A phase touching `design-system/` adds `npm run build:showcase` (Build-Gotchas: vanilla-extract serialization errors pass every other gate). UI-facing phases additionally verify in the running app (CDP screenshot or Nathan live).
- One tree-touching writer at a time; sub-agents forbidden in every dispatch brief.
- Biome owns formatting; `KNOB` and `(Nathan's call)` markers survive every edit — grep-verify after agent passes.
- Docs/comments never reference this plan or session; corrections are rewritten as always-true (fix or remove, never amend).
- **Review mandate (Nathan's directive):** every phase-gate and closeout reviewer is instructed to also flag any documentation or code comment the phase's changes have made false — fix-or-remove framing, and silence is not conflict: only claims that now contradict shipped behavior count.
- New source files are PascalCase; UI action labels Title-Case ("Embed Page", "Page Source").

---

### Phase 0 — The Skip-Over Spike (verify-first)

**Why:** B-9's absorb is the one mechanism piece not executed by the attack review at its edge cases. A doc-edge failure invalidates a **named, narrow set**: Task 2.3's absorb geometry and the acceptance criterion's ArrowUp/Down line — nothing else. **Task 2.2 proceeds in full** (atomicity is wholly 2.3's), as do Phase 1, 2.1, 3, 4a, 4b, 5, and 6 — zero dependency on the geometry anywhere else. On failure: present the evidence with the two candidate resolutions (explicit ArrowUp/Down routing over the tile, or a mandatory edge padding line) for Nathan's ruling, continue the unblocked phases meanwhile, and do not build either workaround unratified.

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
- **Files:** `MarkdownPM/detect/index.ts` (a `blockEmbedLines(text, excluded)` sibling to `blockMathRanges`, reusing the embed regex's shape with a whole-trimmed-line anchor); `MarkdownPM/editor/embedRanges.ts` (new, mirroring `mathRanges.ts`: imports ONLY `../detect` + `../Tables/regions` — never `docCache`/`intent`, the cycle rule the scout verified); the rename's test-file occurrences (`detect/detect.test.ts`, `tokens/tokens.test.ts` — typecheck reddens on a miss, but they ride this commit).
- **Interfaces:** `docEmbedLines(doc: string): { from: number; to: number; title: string }[]` — raw candidates, order-preserved, exclusions applied. Resolution and dedup happen at the consumer (the StateField), because the pure layer has no title map. `DocScan` gains an `embeds` field computed in `scanDoc` (`decorations/intent.ts`), cached via docCache like `maths`.
- **Must agree:** the detection, the blockModel kind (1.2), and the intent gate's *construct* half (1.3) all read this one derivation — one test crosses all three on the same document. The resolution-gated halves (the tile, the token suppression) deliberately diverge on unresolved lines; 1.3 states the split.
- **Failure half:** empty title `![[]]`, whitespace-padded lines (trim per A-2), `![[x]]` inside a fence/table (excluded), two candidates same title (both emitted here; dedup downstream).
- **Tests:** pure-model tier beside `detect.test.ts`.

**Task 1.2 — `embed` BlockKind.**
- **Why:** B-8 — without it a glued embed absorbs into the paragraph and has no grip; verified by the attack review's executed repro.
- **Files:** `MarkdownPM/editor/blockModel.ts` — union member; `BlockContext` gains `embeds` (from `docEmbedLines`); `claimed(i)` gains `inEmbed(i)`; `kindAt` slots after math; `blockAt` returns the hr-shaped single-line block; `blockStarts` uses the default first (single-line). No listMember absorb (lone-line + fenced never continues a run — scout-verified). `MarkdownPM/editor/blockHandles.ts` — `embed` joins `GRIP_KINDS`.
- **Tests:** mirror the math pins in `blockModel.test.ts` — glued-under-prose gets its own block; the grip line class lands; drag boundaries are the single line.

**Task 1.3 — The intent gate.**
- **Why:** an inline replace keeps the line, so without a gate the line still emits token intents and a paragraph line class under the widget (scout-verified; the math gate at `decorations/intent.ts:226–229` is the template).
- **Claim-aware, deliberately:** the widget is claimed-only (resolved AND first-per-normalized-title), so **token suppression must key on the same claim** — a resolution-only predicate strips the dim token from a hand-typed *duplicate* (resolved but unclaimed: no tile, no token, raw syntax — round-3 finding), and a blanket predicate strips it from an *unresolved* line (round-2 finding). One shared pure helper, `claimedEmbeds(embeds, conn)` (resolve + first-per-normalized-title, ~5 lines beside the derivation), is consumed by BOTH the suppression in `editor/decorations.ts`'s `build` (which already holds `conn`) and 2.2's widget — one ownership predicate, two consumers, impossible to disagree. Unclaimed lone-lines (unresolved, ambiguous, or duplicate) keep the dim token. The pure derivation stays claim-free: block kind + grip are resolution-free (any lone-line keeps its grip, so Page Source ▸ can aim or re-aim it).
- **Files:** `decorations/intent.ts` (the `inEmbedLine` construct gate); `editor/decorations.ts` (the claim-gated token suppression); the `claimedEmbeds` helper beside `embedRanges.ts`.
- **Negative controls:** a non-lone `![[x]]` keeps today's inert inline treatment under the renamed class; an **unresolved lone-line** and a **duplicate lone-line** both keep the dim-token treatment (the deleted-target render and B-11's hand-typed duplicate — pin both); the pins go red with the gate mis-applied.
- **Gate (phase):** typecheck · vitest · lint · build. Simplification + review dispatch on the phase range.

---

### Phase 2 — The Tile (chassis, widget, guards)

**Why:** the user-visible core. Everything here composes Phase 1's derivation with the chassis and the caret protections.

**Task 2.1 — Hoist the shared tile chassis.**
- **Why:** B-3 — one chrome definition; SurfacePM folds onto it rather than the embed copying it. The shared artifact ships as a **stylesheet + class contract**, not a component: `TileShell` is inseparable from SurfacePM's rect/phase/handle machinery and would never mount a shared component, so a `TileChassis.tsx` would be single-consumer fragmentation — the embed's chassis markup is a ~10-line div pair inlined in the widget, both consumers keyed to the one stylesheet. (B-3's word was "component"; the class contract is the component — disclosed for Nathan's sign-off at plan approval.)
- **Files:** new `design-system/tile-chassis.css` (kebab-case per its plain-CSS neighbors — `edge-fade.css`; the PascalCase rule governs source files, and existing design-system kebab files are never mass-renamed); `SurfacePM/surfacepm.css` + `SurfaceView.tsx` (TileShell composes the shared classes); `Blocks/blocks.css` + `Embeds/embeds.css` (the `.spm-tile`-keyed rest-scroll and edit-trap rules re-key to the shared class).
- **What moves — declarations, never a shared shorthand:** the border/radius declarations (`surfacepm.css:13–15`), the body clip (`85–90`), and the accent **binding** as a modifier class (`border-color: var(--accent-stroke)`). **The `transition` shorthand at `surfacepm.css:16–22` does not move and does not split** — it is one declaration listing six properties, and two `transition` declarations on one element replace each other wholesale (executed proof in review round 2: the split leaves either `border-color`-only or motion-only, killing tile move/resize/zoom or the accent reveal depending on load order). Each consumer declares its own transition: SurfacePM keeps its six-property shorthand untouched; the embed chassis declares its own `border-color`-only transition.
- **Accent gating stays host-owned, via custom-property indirection** (round-3 named the mechanism — a class modifier has no CSS composition when the triggers are pure `:hover`/state selectors): the shared chassis rule reads `border-color: var(--tile-border-color, var(--separator-border))`, and **each host's own trigger selector sets `--tile-border-color: var(--accent-stroke)`** — SurfacePM inside its full gated selector including `.blk-surface:not(.is-host-locked)` (the host lock suppresses the accent on locked surfaces — round-2-verified that a bare re-scope loses it), the embed under hover/editing per C-3/C-4. One border-color declaration, per-host reachability.
- **Refactor shape — baseline invariant:** SurfacePM tiles render and move identically after the fold — rest border/radius, hover/edit accent reveal, accent-suppressed-when-host-locked, body clip, **and the tile move/resize/zoom transitions** — verified in the running app with CDP screenshots and one drag/resize gesture each.
- **Survivors:** the KNOB-framed tuning comments travel with the moved rules but are **rewritten for the shared home** — the location-rationale sentence ("the handle's menu carries the exact location") and "blocks sit transparent on the surface" are SurfacePM-specific claims that go false for a handle-less consumer (catalog item 24); `--tile-border` stays the single source.

**Task 2.2 — The embed StateField widget.**
- **Why:** B-4/B-7 — the tile, height-map-visible, incremental.
- **Files:** new `MarkdownPM/editor/embedWidget.tsx` (StateField + WidgetType + React root, the `Tables/widget.tsx` recipe minus `block: true` and minus the self-edit path); `MarkdownPM/index.tsx` (extension registration + facet supply).
- **Interfaces:** a facet carrying `{ getConn, ancestors: readonly string[], onEditingChange }` (the `tableConnections` pattern); the widget emits tiles for exactly the lines `claimedEmbeds` (1.3's shared helper) claims — resolved AND first-per-normalized-title; phantom/ambiguous/duplicate emit nothing (A-5/B-11, one predicate shared with the suppression). `estimatedHeight` set for the loading frame. Update paths: map-forward vs rebuild on an `editAffectsEmbeds`-style ±1-line predicate. `ignoreEvent(): true`; `destroy` unmounts via `queueMicrotask`; root parked on the DOM node.
- **The widget renders:** the chassis div pair (handle-less, on the shared classes) → `PageEmbed` with `path`, `editing`, `onBeginEdit`, `connections`, `ancestors ∪ {hostPath}`, non-interactive when nested or when a same-path tile already edits (B-6/B-11). A failed `page:open` on a resolved page renders its degrade **inside the tile** — the page's title as dim inert text on the chassis, no editor — because the widget has already replaced the source line and cannot un-replace itself from within (round-2 finding; the in-tile render needs no field feedback loop). The seam lives in `Embeds/PageEmbed.tsx` (add to Files): today failure and a legitimately-empty page collapse to the same `''` body, and the fallback would be a blank *editable* tile that overwrites the real file on the first keystroke — split them (a failed state distinct from empty), which also closes the same latent hazard for SurfacePM's page tiles. *Judgment call made in Nathan's absence, flagged for the final report.*
- **Editing state:** host-owned `editingId` equivalent (per-view state fed through the facet), stamping the editing class on the chassis; capture-phase document `pointerdown` + window-level gated Escape, the `BlockSurface.tsx:145–164` pair replicated at the extension level (C-4: signals and click-out match SurfacePM exactly).
- **Drag seams (scout-verified):** host drags are structurally embed-proof — drop candidates are pure host-doc geometry (no DOM hit-testing), so a one-line widget yields exactly above/below boundaries and interior drops are unrepresentable; `ignoreEvent(): true` is **load-bearing** in the reverse direction too, stopping an inner pointerdown from also satisfying the host's drag gates. Two follow-ons: (a) `lineElementAt`'s upward walk from a widget-interior position must stop at the host line — empirical check in this phase's app pass; (b) **the inner-drag autoscroll guard** — `startAutoScroll` never validates its explicit scroller, so a drag inside a non-overflowing or pinned tile scrolls nothing and can't reach off-screen candidates; the drag modules' scroller resolution gains the axis-scrollable check with the `findScroller` climb to the page scroller (`editor/blockDrag.ts` + `editor/listDrag.ts` join this phase's files).

**Task 2.3 — Atomic absorb + guards + fencing.**
- **Why:** B-9/B-13/D-3 — the caret protections the spike proved.
- **Files:** `embedWidget.tsx` (or a sibling `embedAtomic.ts`): atomic facet reading the field's ranges widened to `[prevLine.to, nextLine.from]` (the spike's geometry, including its doc-edge resolution); `editor/input.ts`: mirrored boundary guards beside `onForwardDelete` (backspace at next-line start, forward-delete at prev-line end, both refusing per D-3); a `transactionFilter` merge-guard on the result-doc predicate (an embed line acquiring a non-blank neighbor via deletion = refused), the `tableMergeGuard` shape — plus its **insertion-repair arm**: the spike proved document-edge embeds retain one visible boundary seat each (position 0 on a first-line embed, line end on a last-line embed; mid-document has none), so an insertion made from a boundary seat is repaired onto a fresh adjacent line rather than joining the embed line, keeping B-9's "no keystroke can break lone-ness" true at the edges; the fenced insert helper (used by menus in Phase 4) shaped like `setBlock`'s table case.
- **Negative controls:** each guard's test dispatches the real gesture and must go red with the guard deleted — for these guards one assertion carries both halves, since without the guard the atomic default deletes the whole block (a different doc), never a silent no-op. Spanning-selection delete stays allowed and removes the tile cleanly (D-5 — pin the attack review's verified behavior).
- **Failure half:** delete-at-EOF (the `from -= 1` branch), an embed whose fencing blank is the doc's last line, undo of a refused-then-allowed sequence.
- **Gate (phase):** all commands (incl. `build:showcase` — this phase touches `design-system/`) + the running-app pass: type `![[Title]]` lone-line (manually — menus don't exist yet), see the tile, drive every caret gesture from the acceptance criterion, **plus the three round-2 unknowns**: a drag-selection released *inside* the tile then Delete (partial selections may bypass atomic adjustment); a click on the tile's top/bottom boundary sliver (can a mouse seat a caret where commands can't); and — once 4b ships — the grip-menu Delete against the merge-guard (the guard must not refuse the menu's own transaction). These three also seed the pre-ship interaction walkthrough. Simplification + review on the range; reviewers carry the doc-flagging mandate.

---

### Phase 3 — Chrome (header, breadcrumb, signals)

**Task 3.1 — Display-only banner header.**
- **Why:** C-1 — banner + static title when the page has a cover; change-banner kept, add-banner and rename excluded.
- **Files:** `MarkdownPM/PageHeader.tsx` (extract the cover-band branch into a display variant, static span instead of `DetailTitleHeader`, keep the `bannerMenu` context handler — change/remove ride free; scout-verified the menu IS the control); `Embeds/PageEmbed.tsx` (stop discarding `frontmatter`/`title` — the same fetch already carries them; render the banner variant as a static flow block above the editor, NOT the scroll-parking mount — both parking bites are scout-documented); `Embeds/embeds.css`.
- **Failure half:** cover key present but asset missing (render coverless → breadcrumb); cover removed via the embed's own menu (header collapses to breadcrumb on the reload).

**Task 3.2 — The hover breadcrumb.**
- **Why:** C-2 — coverless pages show where they live.
- **Files:** what hoists into a named section of the existing `Tabs/tabStrip.css` is precisely the **two-tone treatment** (`previewTabStrip.css:73–91` — trail dim, last crumb bright, the fade knobs) plus the centered-title geometry the embed actually wants; the rest of `.pgpreview-title` (`:6–34`) — the morph slide, `@starting-style`, `.is-collapsing`, `pointer-events: none`, the 55% max-width KNOB — is preview-specific and **stays put** (round-2 caught the cited range swallowing them). PagePreview re-keys its tone rules onto the shared section. The embed's hover reveal (opacity on tile hover at `--duration-base`, matching the accent-border timing) lives with the embed chrome, pointer-interactive per its own needs. `NavCrumbs` stays in Navigation/ (it's already multi-consumer); crumb data via `resolveIndexOf` + `resolveWith` exactly as `PreviewWindow.tsx:120–126`.
- **Baseline invariant:** the preview window's title renders identically after the re-key (screenshot before/after); the embed's breadcrumb gets its own screenshot check (hover-revealed, centered, interactive — nothing inherited from the preview's inert treatment).
- **Gate (phase):** four commands + running-app screenshots of banner-tile and breadcrumb-tile states (design-verification rule: show Nathan or CDP-capture).

---

### Phase 4 — Menus

#### Phase 4a — The Tree-Projection Mini-Phase (explore-first, Nathan's directive)

**Task 4a.1 — Dispatch the consolidation scout.** Scope narrowed by Nathan's ruling: **SurfacePM's Source pane (the React drill, `pagePickerItems`) stays as-is — native menus are a MarkdownPM-only requirement.** The scout (read-only, no sub-agents) weighs only the two native walks: cardMenu's `MoveTarget` walk (`CardsView.tsx:597–601`) and the embed menus' need (Collections → Sets → Pages with the B-11 filter), both icon-less native trees. Question: one shared walk, or two siblings. Its report ratifies before anything builds.

**Task 4a.2 — Implement per the scout's verdict.** Two legitimate outcomes: (a) one shared native-tree walk both menus consume, with a baseline invariant that Move To behaves identically; or (b) **no fold** — the embed menus get their own ~15-line MoveTarget-shaped walk with page leaves in `shared/embedMenu.ts`, beside cardMenu's. The scout's evidence decides; a fold ships only on a demonstrated net win.

#### Phase 4b — Grip Menus

**Task 4b.1 — Widen the suppression flag.**
- **Why:** D-6 — one flag, any hot grip; two menus never pop together.
- **Files:** `MarkdownPM/index.tsx:170–172` (predicate: any grip-bearing line — note the scout's caveat that hover reports the hovered line, so the predicate keys on the grip's own line classes: `md-block-handle`, `md-callout-first`, `md-bq-grip` host); rename cascade across `main/editorMenu.ts:23–26,189`, `bridge.ts:297`, `preload/index.ts:197–198`, `main/index.ts:140,1605`, **and the live clear at `calloutGripMenu.ts:29`** + the comment sweep the docs catalog items 14–18 name (catalog: [[Embedded Pages — Docs Catalog]]).
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
- **Files:** `MarkdownPM/autocomplete.ts` — the embed branch is a **new local match**: today `autocompleteQuery` returns `null` inside `![[…]]` (its pattern's lookbehind excludes it — round-2-executed; exactly what B-12 records). The branch matches the embed form locally, spans include the `!`, and the connections pattern itself is never touched (A-3's four-consumer rule). **`AutocompleteQuery` gains `form: 'link' | 'embed'`, and `MarkdownPM/useConnectionAutocomplete.ts` (add to Files — it's the shared hook both the page editor AND table cells mount) takes an allowed-forms flag so `CellEditor` stays link-only, and passes `form` through to `connectionInsert(title, from, form)` so an embed commit writes `![[Title]]`, never converting the embed to a plain connection** (round-3: without the flag the cells leak; without the form the commit rewrites `![[Foo` to `[[Title]]`). `MarkdownPM/index.tsx:107–116` (the page editor's `candidatesFor` adds the B-11 filter in embed mode); the cell regression pin asserts no `![[` completion in cells — it passes today and guards against 5.1 leaking, not against 5.1 being skipped. Panel re-home: `AutocompletePanel.tsx` onto PickerMenu's beak-less surface (B-14) — the panel inherits the shared chrome/motion; keyboard driving (up/down/enter/escape) pinned before and after.
- **Negative control:** the embed filter test proves a candidate WAS offered before embedding and omitted after.

**Task 5.2 — The warm slot + write-through.**
- **Why:** B-10 — rehydration without refetch or stale-read.
- **Files:** `Tabs/warmCache.ts` (path-keyed `Map<path, PageDetail>` slot, LRU-capped, covered by `dropWarmDetail` + `clearWarm`; header comment rewritten per docs item 19); `Detail/pageFlush.ts` (`schedulePageSave` writes the body through to the slot — schedule-time, the scout-ratified choice; one header line per docs item 20); `Embeds/PageEmbed.tsx` (initializer reads the slot before fetching; fetch effect skips on hit); `store.ts` (delete + rename of a page drop its slot entry — the two events the tab-keyed cache survives by fencing but a path-keyed slot must handle; rename also covers the cascade's body rewrites).
- **Failure half:** slot hit whose frontmatter predates a banner change (the existing `dropWarmDetail` triggers cover it — pin one); failed save during the debounce (cache holds intended body; requeue converges — assert no refetch race).

**Task 5.3 — The parallel embed pattern + cascade sweep.**
- **Why:** A-3/F-6.
- **Files:** `shared/connections.ts` (the embed pattern beside `pageLinkPattern`, comments rewritten per docs item 10 — `pageLinkPattern` itself untouched); `main/connections/scan.ts` + `rewrite.ts` (embed-aware prefilter + rewrite in the same sweep, comments per items 11–12); `main/crud/cascade.ts` (runs both).
- **Negative control:** a rename test proving `![[Old]]` → `![[New]]` AND `[[Old]]`-in-a-fence stays untouched AND `{{Old}}` stays untouched; red with the embed pattern removed.
- **Must agree:** the embed pattern, the renderer's embed regex (renamed in 1.1), and the autocomplete's embed branch accept the same title grammar — one test feeds all three the same corpus.

**Task 5.4 — The restyle nudge.**
- **Why:** C-5's honest mechanics — tiles and connection colors react to tree changes without waiting for an interaction.
- **Files:** `MarkdownPM/index.tsx` — an effect keyed on the page-index identity dispatching an annotation-tagged empty transaction; the embed StateField and the decoration plugin both treat it as a rebuild trigger. Scope note: this changes connection restyle latency app-wide (strictly fresher); it is deliberate and disclosed.
- **Failure half:** the nudge firing during an in-flight edit (annotation must not disturb selection/history).
- **Gate (phase):** four commands + running-app: rename/delete/restore round-trip against a visible tile. Review with doc mandate.

---

### Phase 6 — Make It True (docs + comments) & Closeout

**Task 6.1 — The falsified-claims sweep.** The derivation is the persisted catalog — **[[Embedded Pages — Docs Catalog]]**, beside this plan (round 2 caught the catalog living only in conversation history while five tasks cite it by number; it now survives compaction and session turnover). Its control: every item was quote-verified at plan time; re-verify quotes before editing — earlier phases' comment rewrites will have consumed items 10–24 piecemeal; this task sweeps the remainder and the Features docs. **Fix direction: when an enumeration went incomplete, remove the enumeration rather than widen it** — "every grip doubles as a drag handle and carries its own menu" outlives any per-kind list, which just drifts again at the next kind (ruled on item 2; apply across the catalog). Fix-or-remove per item: MarkdownPM.md (items 1–3 + the grip-menu convention), SurfacePM.md (4–5 — the Embed Framework ships both consumers; the banner Pending entry dies, replaced by the shipped rule), ConnectionsPM.md (6–8), ViewsPM.md (9), plus any comment items earlier phases left. (The `imageEmbed` rename shipped whole in Task 1.1 — item 13 needs no sweep here.)

**Task 6.2 — Feature doc.** MarkdownPM.md gains the embed construct section (or a new `EmbedsPM.md` if the section outgrows it — judge at write time); Context.md's AutocompletePanel lesson line is deleted (resolved by 5.1); the decision log's role ends — the plan and Features docs carry everything forward.

**Task 6.3 — Closeout.** Two dispatches, never one: (1) a neutral verifier adjudicating the acceptance criterion against the running app, phase by phase; (2) the attack reviewer against the full diff, carrying the doc-flagging mandate. Every concern fixed or Nathan-ruled. Then simplification + comment-killer passes over the full range, `Handoff.md` via `/handoff`.

---

### Blast Radius

Code: `MarkdownPM/` (detect, tokens, decorations/intent, editor/{blockModel, blockHandles, input, docCache-adjacent, new embedRanges/embedWidget/embedGripMenu}, autocomplete, index.tsx, Styles.css) · `Embeds/` (PageEmbed, embeds.css, embedScale untouched) · `SurfacePM/` (chassis fold) · `Blocks/` (blocks.css re-key) · `design-system/` (tile-chassis.css) · `Tabs/` (warmCache, the crumb section in tabStrip.css) · `PagePreview/` (crumb re-key) · `Detail/` (pageFlush) · `Navigation/` (NavCrumbs comment) · `shared/` (connections, embedMenu, bridge) · `main/` (embedMenu, editorMenu, connections/{scan,rewrite}, cascade, index).
Docs made false and repaired: the 25-item catalog (MarkdownPM.md, SurfacePM.md, ConnectionsPM.md, ViewsPM.md + comments).
Behavior deliberately changed beyond the feature: connection restyle latency (5.4, fresher), autocomplete panel chrome (B-14), grip-flag naming (4b.1).

### Sequenced After (not this plan)

Live per-page refresh bus · per-embed zoom (`local_state` scope) · record-backed deleted-page tile · prefix-hosted embeds · `#heading`/`^block`/`|alias` forms · backlinks counting embeds (decided at the scanner when backlinks arrive).

### Log

- Phase 0 base: `90b97ff8` · shipped `59374823` — verdict: geometry HOLDS. Mid-doc + fence-adjacent: zero seats (vertical included, real layout). Doc edges: one visible boundary seat each, resolved by the guard's insertion-repair arm (folded into 2.3). Escape hatch not fired.
- Phase 1 base: `59374823` · shipped `03d73226` (feature) + `d165dd34` (simplification) + `a7adaa4a` (gate fold). Gate: 2118/2118 · typecheck 0 · lint 0 · build green. Attack round: 1 High + 1 Medium + 1 Low + 1 Latent, all folded.
- Phase 2 base: `a7adaa4a` · shipped `7d8b1847` (chassis) + `bbadc1bd` (widget/guards) + `2521cae2` (live-found fence hole) + `d92e68ce` (simplification) + `aa84d15a` (attack folds). Gate: 2135/2135 · typecheck 0 · lint 0 · build + showcase green · live pass (tile render, borders, caret hop, refusals, edit round-trip to disk, Esc, grip arm, sliver clicks, partial selections).
- Phase 3 base: `aa84d15a` · shipped `21b52079` (chrome) + `0f723a1a` (simplification: useBannerMenu hook, deterministic title var, crumb tones re-homed to navList.css beside their base classes) + `5c7e5944` (attack folds). Gate: 2135/2135 · all commands green · live pass (hover crumb reveal 0→1 centered two-tone; the full construct gallery inside a tile incl. nested inert tile, cycle token, table widget; the banner tile verified live with a real cover — band absolute at the tile-proportional KNOB, body reserved below).
- Phase 3 deviations & rulings:
  - **The embed banner holds the page's own layout contract** — out of flow with its height reserved as editor padding, at a tile-proportional KNOB height. The first cut mounted it in-flow and reused the page's 230px: measured at two-thirds of the tile with the editor's remaining viewport clipped unreachable. Reusing classes imports a look; the layout contract has to travel too.
  - **A banner change merges the cover, never nulls the load** — nulling unmounted the live editor mid-edit and raced the debounced write; the refetch now patches `cover` alone.
  - **Crumb tones live in `navList.css`**, not Tabs/ — the base `.nav-path-*` classes they vary are defined there, and both consumers already load it ("relevant file location" beat the Tabs/ guess).
  - On record: warm × `chrome='page'` is latent (no consumer passes both; a warm entry carries no id/cover). Walkthrough seeds += banner change/remove from inside an editing tile (the 400ms-window stale-seed unknown) · banner img drag into the host contenteditable · double context menu on a tile inside a SurfacePM markdown block.
- Phase 4 shipped: `fbaf26e4` (menus) + `e97ec99a` (simplification + the four-way titleFromPath consolidation) + `ae0f97df` (attack folds). Gate: 2150/2150 · all green · jsdom flow suite drives real right-clicks through the real handler (create/re-aim/delete/dismiss + the three fold pins). Attack: 1 High + 2 Medium + 4 Low, all folded — the re-aim now acts on the block span so stale/duplicate/unresolved tokens (the exact re-aim audience) work; the predicate stopped promising a blockquote menu that doesn't exist; bracket titles are never offered (the syntax can't express them — the source-side `invalidName` question is flagged for Nathan); the hot-flag clears only where the grip vanishes; read-only editors pop nothing; the whole ancestor chain is excluded. Walkthrough seeds += the two unknowns (what gripHot actually suppresses — right-click a resolved connection; grip-glyph hit-testing at zoom steps) + the pre-existing callout read-only twin.
- Phase 5 base: `ae0f97df`
- Phase 4a verdict: **no fold** — the walks share only a 5-line recursion; shapes are structurally disjoint (every Move To node pickable vs page-only leaves), both main mappers unshareable, and sharing would cost the three parameters that are the boolean-flag smell. The embed menus get their own walk beside cardMenu's, per the shared/ per-domain grain; a shared walk waits for a third native-tree consumer with a matching shape.
- Rulings: —
- Deviations:
  - **Lone-ness is trailing-tolerant only** — the gate proved (executed, five list shapes) that trim-both-sides made an indented `![[…]]` under a bullet an embed block mid-item: its grip and drop slot tore the list on one ordinary drag, because the same leading whitespace that made the line "lone" is what glues a continuation to its marker. A leading indent now reads as hosted context (inert token, rides its bullet), the same rule quotes and callouts already follow. Fixed at the derivation so every layer agrees at once.
  - **Display math joined the embed exclusion set** — an `![[…]]` inside `$$…$$` could claim first-in-document and demote the real embed to a duplicate; one line in `docEmbedLines`.
  - **Task 1.3's construct gate was removed as dead** — no line construct can match a lone `![[…]]` line, so the gate was a no-op no test could redden; a pin now documents the fact instead of a guard pretending to enforce it.
  - **Interim render accepted on record:** between this phase and 2.2's widget, a *claimed* lone-line embed renders as raw syntax (its token stands down for a tile that doesn't exist yet). Scratch-nexus content contains zero `![[` lines; the window closes when Phase 2 lands.
- Phase 2 deviations & rulings:
  - **The rebuild gate reads the cached scan** — the ±1-line `![[` string heuristic desynchronized the field from the scanner when a fence opened above a tile (attack-verified both directions, with a second-order un-editable line); the gate now compares the per-version cached scan's embed set, a net deletion.
  - **The fence counts per tile** — a summed glue count let one tile's removal legalize gluing another; per-survivor comparison now.
  - **The chassis re-anchors its border color** — custom properties inherit where border-color wouldn't, so a nested tile wore its host's border state (borderless host erased it, measured in real stylesheets); every `.tile-chassis` now declares its own.
  - **The boundary repair carries `userEvent`** (the callout guard's own discipline; a filtered transaction rebuilds from startState and drops annotations).
  - **The 2.2 autoscroll clause shipped late, in the gate fold** — the attack round caught it missing; the drag modules now validate their explicit scroller and climb axis-aware when it can't scroll.
  - **Attack F5 rejected with evidence:** "ancestors only wired from PageView" — `PageEmbed` self-appends its own path unconditionally, so every PageEmbed host gets cycle protection and chain growth; `MarkdownBlock` has no page identity to thread and no cycle path through it. The breaker's repro exercised only the block host, whose behavior is the intended one.
  - **Live-found:** the fence guard's original hole (backspace ate the lone fencing blank) — found driving the real app, fixed as `gluedOf`, pinned.
  - Walkthrough seeds carried forward: SurfacePM visual baseline after the chassis fold · host block-drag over a tile · scroll-past `page:open` refetch (pairs with 5.2) · mid-doc boundary-seat mouse test · nested-tile border states (F3's fix, visually).
- Rulings: —
