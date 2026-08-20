## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** c565e80c-b4a9-42c9-8ffb-cf38a4cb80bb
**Dates:** 08-19-2026 → 08-20-2026
**Model:** Opus 5

**The focus was the Cohesion arc — MarkdownPM's leg and the easy wins behind it — and it is finished.** Every criterion below is met, the whole range went through `/closeout` clean, and everything raised along the way is routed. The next session opens on Footnotes, which this work existed to unblock.

**The editor's leg.** MarkdownPM derived the same document seven separate times, both link syntaxes spelled one gesture grammar twice, four box constructs stated one geometry four times, a list marker carried two vocabularies, and a fold was a heading offset rather than a region. Each collapsed. Twelve live defects closed with them, most as symptoms of the duplication they sat inside rather than as separate fixes — including a bare `#` that my own phase-1 widening had turned into an invisible heading with a chevron and an unnamed outline row, caught by executing the case rather than reading it. Every seam [[Footnotes — Decision Log]] named as a prerequisite is in place: `folding.ts` takes a kind with a `collapsedByDefault` path (C-3, C-11); `scanDoc` is one derivation a footnotes scan joins and `blockModel` reads, so a footnote-section `BlockKind` is one registration (C-12); `pointerPath.ts` is a factory a marker registers with rather than a third copy; `cellStatic.tsx` has the resting-cell target readers a marker's rest branch hangs off (B-5); and `COPY_SCOPES` gained `headingIcon`, closing a hole footnotes would have inherited.

**The easy wins behind it.** Three ContextPM bullets and one Known Issue left the document rather than being marked done — the helper deduplication, the main-side menus' label logic, and the `.MD`-extensioned page whose sidebar kept its extension, that last one a symptom of the duplication since `sidebarDnd`'s private `base()` was a case-sensitive re-spelling of `titleFromPath`. Five new modules hold what was spelled many times over: the nexus-relative on-disk names, the wording of every two-state control, `moveItem`, `pad`, and the view-order cache both renderers kept a copy of. Two of the three items were smaller than the backlog claimed and one was larger, all recorded in [[Cohesion-Rulings]]: `.trash` and `.nexus/` are 9 and roughly 30 code sites rather than 71 and 94, the difference being doc comments; no shared tested function computes a Pin/Unpin label, so the menus entry's named example did not hold, and what it should have named is Open / Open New Tab; and the toggle-label class runs well past `src/main`, since the lock and the footer are spelled in the renderer four times each. The scroll timer stays by explicit ruling — what it was hiding, and what got fixed, is that the glide asks for its destination every frame and the seat it asked for walked the DOM and resolved a computed style each time to re-read a header height a scroll cannot change.

**The numbers, as they are.** The editor's leg came in at **+62 code lines against an estimate of −400**, and the easy wins at **+96 across the whole range**. The estimate counted the bodies a consolidation removes and not the signatures it threads; it assumed four box constructs could share their paint, which they cannot, because a quote nested in a callout already spends that line's second pseudo-element; and it treated a shared factory as free when it is 135 new lines two files stop spelling twice. Naming a fact costs an import at every site that stops spelling it, so deduplicating one-liners reads as growth. Where the reduction is real it is in what stops being *derived* twice rather than what stops being *written* twice — seven document splits became one, a whole second block context disappeared, and both the table-region memo and the standalone math accessor closed as second doors onto one derivation.

**What is verified, and what is not.** Verified: typecheck clean, Biome zero across 862 files, 3,010 Vitest tests, KNOB 117 and the nine decision markers intact at every step; both CSS specimen sets byte-identical to their phase baselines; and no user-visible wording changed, proven by extracting every capitalized literal the label commit removed and confirming each reappears. Not verified by me, and wanting your eyes in the running app: an outline jump into a folded section, since the seat computation's inputs changed. One visible change shipped deliberately — a code block nested in a callout or quote regained the 6px of head and foot padding it always specified, its zero gap having been written without a unit, which voided the `calc()`; `--box-pad: 0px` on the nested rule restores the old look if it reads wrong.

#### Completion Criteria

- [x] **The MarkdownPM cohesion leg is finished with nothing left behind** — all eight phases landed, phase 7's fold widening included, gates green, docs reconciled.
- [x] **The MarkdownPM cleanup arc closes** — the four deferred items settled: one list vocabulary, `embedWidget.tsx` cleaned rather than split, three of four import cycles broken, `PageHeader` on one `page` object.
- [x] **The MarkdownPM cleanup bullet is eliminated from ContextPM** — the Footnotes greenlight.
- [x] **The design-splits are parked, not built** — recorded in full under ContextPM §The Remaining Cohesion Efforts, nothing half-started.
- [x] **The cohesion arc's transient records are drained and retired** — rulings to [[Cohesion-Rulings]], open decisions to ContextPM §Open Calls, live defects to §Known Issues, arcs to §Pending Focuses.
- [x] **The cohesion arc's easy wins fold** — the helper deduplication and the main-side menus' label logic, both gone from ContextPM, with the `.MD` sidebar defect closed as part of it.
- [x] **The whole range passes `/closeout` clean** — simplified, gates green, purged of the four things that outlived their use, and the two sites the sweep missed folded rather than left standing.

#### Next Session

**Footnotes is the work, and it opens a new focus.** Nothing blocks it. Get C-3's clear-on-default `[assumed]` blessed, hand [[Footnotes — Decision Log]] to the planning skill, and check the reviewer's two live-layout unknowns during planning: whether the Subfield's hover rail admits a second control beside the collapse chevron, and whether disclosing the section flickers the toggle's at-bottom visibility condition.

Read these five seams before planning the marker or the section — each was built for this, and each is one registration rather than a fork:

- `editor/folding.ts` — `FoldKind` / `FoldRegion` / `KINDS`. A fold is a region of some kind, with a `collapsedByDefault` path for a section hidden on first open (C-3, C-11).
- `decorations/intent.ts` `scanDoc`, cached in `editor/docCache.ts` — the one whole-document derivation the footnote-section scan joins, so it cannot disagree with fences and tables about the exclusion base. `editor/blockModel.ts` reads it (C-12).
- `editor/pointerPath.ts` — the click skeleton, taking `follow` / `dwell` / `menu`. The claim on a press is derived from `follow`, so a construct that leads nowhere seats a caret like any other text.
- `Tables/cellStatic.tsx` `cellLinkTarget` + `editor/links.ts` `followTarget` / `dwellTarget` — how a resting cell reads the same answers the body does, which is where a marker's rest branch hangs (B-5).
- `main/remint.ts` `COPY_SCOPES` — a page-keyed scope joins the list directly; one keyed by anything else travels through the re-mint map, as `viewOrder` does.

**In parallel, whenever it suits** — none of it touches MarkdownPM. Table hoisting first, since its opening step (moving `pickView` and `resolveContainerSchema` out of `TableView` into `Views/pipeline/`) is zero behavior change and unblocks the rest; then the `main/index.ts` split. Both `TableView.tsx` and `CardsView.tsx` came out of the easy wins cleaner than they went in.

**One thing to look at in the running app:** an outline jump into a folded section, per §Current Focus. And still outstanding from the retired web-layer session: your own pass over its five changes — settings placement, typed zoom, hover scroll, a live tab flip, inline Edit Link.

#### Feedback

- "Finish the MarkdownPM part of the Cohesion pass, leave nothing behind -> then fold the easy-win definition duplications -> park the design-splits across the Tables, Cards Ect... as pending focus in the cohesion pass. Eliminate the first bullet of the cohesion pass alongside the remaining easy wins. Then build Footnotes. Then complete the rest."
- "were doing all phases. No open stuff. All phases must be done, with a verification pass between."
- "reduction of code is the priority" — and where it did not deliver, the number gets reported as it is rather than framed.
- "don't amend fixtures — add them to the per-session changelog and remove rather than tagging as fixed from context" — a resolved backlog item leaves ContextPM outright; what it was and what closed it belongs here.
- "review solidifies the mandate rather than the method" — reviews against a decision log attack cohesion and coverage, and leave implementation discovery to planning.
- "Definitions across docs and codebase need to be called Citations to make room for a future Definitions feature that may exist independently from Footnotes."

#### Session Pointers

- `.claude/Planning/Footnotes — Decision Log.md` — the planner's contract, and the only live plan left. One `[assumed]`: C-3's clear-on-default.
- `.claude/ContextPM.md` — the durable backlog. §Immediate Work, §The Remaining Cohesion Efforts, §Open Calls (ten needing you), §Known Issues, §Debt & Ride-Alongs.
- `.claude/Guidelines/Cohesion-Rulings.md` — what a sweep re-derives wrongly and must stop re-proposing. Read before opening any cohesion finding.
- `.claude/Guidelines/Editor-Internals.md` — the editor's hard invariants, including the box line's spent pseudo-elements and the `:is()` weight rule.
- `.claude/HistoryPM.md` PM-110 — what the whole cohesion arc shipped, commits included. It covers the easy wins too and wants no second entry.
- `src/shared/nexusPaths.ts` — every on-disk name both processes speak. `main/paths.ts` holds the absolute-path builders and the names only main reads.
- `src/shared/toggleLabels.ts` — the wording of a two-state control. A new toggle's label belongs here, not at its call site.

#### Working Notes

- **A fold is identified by where it sits.** Recorded, not endorsed, and pinned in `editor/foldState.test.tsx`: a deletion landing another region of the same kind on a folded one's offset hands the fold over. A stabler identity is its own decision, and Footnotes' section may be what earns it.
- **`:is()` takes its most specific argument's weight.** A two-class argument in a shared selector lifts the whole rule over the first/last rules meant to refine it — the one real trap in the box base, and why every argument there is a single class.
- **Footnotes' parse is already free** — the installed `micromark-extension-gfm` emits `footnoteReference`/`footnoteDefinition` today. GFM's lazy continuation (an unindented next line joins the citation above) is the trap the whole boundary design answers; re-verify it before trusting any scan.
- **The footnote marker will be the editor's first mid-line atomic range** — every existing provider is line-prefix or block-scope. The callout guard's transaction-repair pattern is the delete-protection model.
- **`footnote` and `definition` are both banned identifier names for the feature** — the first collides with the typography scale step, the second is reserved by the vocabulary rule.
- **CSS proof is a render, not a suite.** Phases 2 and 6 were verified by rendering hand-written `.cm-line` specimens against the built stylesheet in headless Chrome and diffing PNGs. A green Vitest run proves nothing about a 1px shift.
- **A dedup sweep's grep has to be proven exhaustive, not merely run.** Two sites escaped this one and both failures looked clean: a pattern anchored on the quote before `.nexus` missed a longer `nexus-asset://nexus/.nexus/…` template, and a `head -40` silently truncated the `splice(` results. Count hits before and after.

#### Changes

**FILES ADDED**

- `Pommora/src/shared/nexusPaths.ts` — the nexus-relative on-disk names, read by both processes.
- `Pommora/src/shared/toggleLabels.ts` — the wording a two-state control wears, one per control.
- `Pommora/src/renderer/src/MarkdownPM/editor/pointerPath.ts` — the shared link-gesture factory and its primitives.
- `Pommora/src/renderer/src/MarkdownPM/editor/caretSeat.ts` · `editor/headingScan.ts` · `MarkdownPM/warmSeam.ts` — lifted out to break three import cycles.
- `Pommora/src/renderer/src/design-system/clamp.ts` · `moveItem.ts` · `pad.ts` — one definition each; seven, six and three readers.
- `Pommora/src/renderer/src/Detail/Views/useViewOrders.ts` — the per-view manual order cache both renderers held a copy of.
- `Pommora/src/renderer/src/MarkdownPM/editor/menuSubject.test.ts` · `editor/foldState.test.tsx` — pins for the two subsystems that had none.
- `.claude/Guidelines/Cohesion-Rulings.md` — what a cohesion sweep re-derives wrongly.

**FILES MODIFIED**

- The editor: `decorations/intent.ts`, `detect/index.ts`, `editor/docCache.ts`, `blockModel.ts`, `blockDrag.ts`, `blockHandles.ts`, `listDrag.ts`, `listDragModel.ts`, `dragChrome.ts`, `EditorGesture.ts`, `gripMenu.ts`, `embedRanges.ts`, `embedInsert.ts`, `embedWidget.tsx`, `input.ts`, `linkEdit.ts`, `linkFormat.ts`, `folding.ts`, `connections.ts`, `links.ts`, `menu.ts`, `formatState.ts`, `input/format.ts`, `index.tsx`, `PageHeader.tsx`, `Styles.css`.
- Tables: `regions.ts`, `sync.ts`, `guard.ts`, `codec.ts`, `widget.tsx`, `cellStatic.tsx`, `CellEditor.tsx`, `TableView.tsx`, `operations.ts`.
- Main: `paths.ts`, `readNexus.ts`, `record.ts`, `provenance.ts`, `mutate.ts`, `mutatePatch.ts`, `watcher.ts`, `watchPatch.ts`, `session.ts`, `indexSeed.ts`, `index.ts`, `remint.ts`, `io/walk.ts`, `io/atomicWrite.ts`, `io/thumbnails.ts`, `io/navigationFile.ts`, `crud/contextWrite.ts`, `crud/trashRows.ts`, `crud/optionOps.ts`, `crud/registryProperty.ts`, `properties/schema.ts`, `navRowMenu.ts`, `tabMenu.ts`, `contextMenu.ts`, `editorMenu.ts`.
- Shared: `properties.ts`, `pageMenu.ts`, `viewMenus.ts`, `tileMenu.ts`, `editorMenu.ts`.
- Renderer: `store.ts`, `pageMenuActions.ts`, `destinationTree.ts`, `Detail/pageEditor.ts`, `Detail/DetailPane.tsx`, `Views/Table/TableView.tsx`, `Views/Cards/CardsView.tsx`, `Views/Cards/cardsOrder.ts`, `Views/useViewCreation.ts`, `Views/pipeline/group.ts`, `Views/PropertyEditing/formatValue.ts`, `Sidebar/Sidebar.tsx`, `sidebarDnd.tsx`, `sidebarDndModel.ts`, `Tabs/tabsModel.ts`, `Navigation/navRecents.ts`, `NavList.tsx`, `NavWindow/NavGallery.tsx`, `PagePreview/previewTabs.ts`, `usePreviewWarm.ts`, `Blocks/BlockHandleMenu.tsx`, `Embeds/*`, `Components/Detail/PropertiesPane.tsx`, `SettingsPane.tsx`, `SettingsScaffold.tsx`, `Detail/Settings/SpaceSettings.tsx`, `SurfacePM/core/ops.ts`, `design-system/interactions/drag.tsx`, `engine.tsx`, `FloatingWindow.tsx`, `components/CalendarPicker/CalendarPicker.tsx`, `PreviewPane/*`, `SidePane/SidePane.tsx`, `tokens/*`, `resize-strip.css`.
- Docs: this document, `ContextPM.md`, `HistoryPM.md` (PM-110 extended, not reopened), `CLAUDE.md`, `Guidelines/Editor-Internals.md`, `Features/MarkdownPM.md`, `WebviewPM.md`, `DesignSystemPM.md`, `InteractionPM.md`, `PagesPM.md`, `SymbolsPM.md`, `Planning/Footnotes — Decision Log.md`.

**FILES REMOVED**

- `Pommora/src/renderer/src/MarkdownPM/editor/mathRanges.ts` — a second door onto the shared scan.
- `.claude/Planning/Cohesion-Audit.md` · `Cohesion-Changelog.md` · `Cohesion-Tasks.md` — drained to their durable homes; the rest was per-phase narration git already holds.
- `.claude/Planning/Color-Ramp-Picker — Implementation Plan.md` — the ramp shipped as PM-109.

**COMMITS**

- `9fd6da98` — fix(editor): the menu answers to one editor, and a copy keeps the chrome it was made from
- `ab6ac262` — perf(editor): the document is scanned once, and every layer reads that one scan
- `9c1ecf3d` — refactor(editor): one box shape under the quote, the callout, the code block, and the nested quote
- `6d047973` — refactor(editor): one pointer path under both link syntaxes, and a cell gets all of it
- `aea208e7` — refactor(editor): one boundary picker under both relocate drags, and a grip menu that re-reads
- `22c912e0` — fix(editor): a table cell writes what GFM reads, and keeps what a ragged row is typed
- `f796fc65` — refactor(editor): the stylesheet says each thing once
- `6af1ab4d` — feat(editor): a fold names the region it is about, whatever kind of region that is
- `a8988710` — refactor(editor): the pointer path's shared primitives live in the pointer path
- `69356153` — docs: the editor's cleanup, recorded and reconciled
- `9cb1f23b` — refactor(editor): a list marker has one vocabulary
- `3e2e2e67` — refactor(editor): three cycles broken, and a tile's height has one writer
- `a9d412e6` — refactor(editor): the closer pass — what the reduction missed, and what the records held
- `ac385b34` — fix(editor): six the adversarial pass found, three of them this arc's own
- `d1d0a4d5` — fix(editor): the block drag reads the viewport, not the visible ranges
- `1b3fa132` — refactor(cohesion): one spelling for a parent path, a reorder, and every on-disk name
- `640ac1af` — refactor(menus): a two-state control's wording is stated once
- `498d6a2a` — perf(outline): the header band is read once per travel, not once per frame
- `5ca9b133` — docs(cohesion): the closed items leave the backlog, and the record stays with the session
- `b22349eb` — refactor(cohesion): a thumbnail's path and filename rule are one fact

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
