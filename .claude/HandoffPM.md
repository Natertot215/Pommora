## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** b5e53e93-10e5-490d-b0fe-be391a2d720a
**Dates:** 08-20-2026
**Model:** Opus 5

**The focus was the cohesion queue's session-sized half, and it is finished.** Ten planned tasks landed, a simplification pass and an adversarial pass ran over the range, and the two defects the attack found were fixed rather than deferred. Footnotes remains the next focus and nothing here touched its seams.

**What the audit found before any code.** Four backlog claims were fiction and left `ContextPM` outright — Cards' identity key and its two commit paths, `PageCard` (whose file no longer exists), and the accent IPC on every reconcile. `SavedView`'s "declared twice" entry was struck for a different reason: a probe showed the interface rejecting a stray key where `z.infer<typeof savedView>` accepts it, because a loose codec's inferred type carries an index signature, so the hand-written interface is deliberate and the ruling is in [[Cohesion-Rulings]]. Four read-only sweeps then corrected the plan itself before implementation — `pageMetaRouter.ts` would have been a second definition of a job `pageMenuActions.ts` already owns; `PropertyValueRow` would have shipped beside an existing `ValueRow`; the hook belonged in `PropertyEditing/`, whose own header already named the inspector row as a consumer; and the two properties panes differ in eight ways rather than the one I had asserted, two of those differences being live bugs.

**What landed.** Four constructs that existed twice became one apiece — the option-reorder hooks (102 of ~180 lines identical), the option row, the properties engine, and the two container resolvers that had been living inside `TableView.tsx` and were the renderer's last import cycle. Three action vocabularies now reach their dispatch, so a menu row nothing handles is a compile error. Seven defects closed: Clear and Remove were one act in the properties pane, assigning a Space closed the picker built to stay open for it, one dispatch persisted a `view_style` nobody chose, and the Subfield's counter miscounted five constructs while a stray backtick pair swallowed the lines between them.

**The numbers, as they are.** **Net −16 actionable lines** against a plan that estimated −480. About 520 lines of new shared homes replaced about 540 in duplicates. The estimate counted what a consolidation deletes and not the declarations it adds — the editor's menu vocabulary alone is 53 new lines that exist so main cannot name a row the editor has no branch for. Where the win is real it is that each fact has one place to be wrong, and in the perf finding below, which no line count shows.

**What the attack found, and what was done about it.** `isThematicBreakLine` prefiltered on the first character alone and ran a full micromark parse for every `- item`, which the Subfield rewrite put on a per-edit path: **30.9ms per typing pause on a 500-line bulleted page against 0.2ms for the same page of prose.** A prefilter matching three-or-more of one marker takes it to 0.95ms, and since the editor's own per-keystroke `scanDoc` calls the same function, that halves too. The counter was also computing its own line base where the renderer computes one, so a callout's `[!type]` tag counted as prose and `> ---` had stopped being a rule. Both fixed and pinned.

**What is verified, and what is not.** Verified: typecheck clean across both projects, Biome zero across 866 files, 3,032 Vitest tests with the pre-existing 3,010 unmoved, and negative controls demonstrated in both directions for all three new exhaustive dispatches. Not verified by me, and wanting your eyes in the running app: the Select and Status option editors after the reorder hook collapsed (drag to both ends, across groups, an Escape mid-drag), the two properties panes side by side against their eight differences, and Clear versus Remove on a property row.

#### Completion Criteria

- [x] **All ten planned tasks landed** — each with its own commit, its gates green, and its derivations re-run against their controls before editing.
- [x] **The plan's own errors were caught before implementation** — four sweeps corrected two house-rule violations and one wrong premise in the written plan.
- [x] **The simplification pass ran before the adversarial one**, per StudioMD, and its output was verified against the code rather than folded on the agent's word.
- [x] **Both adversarial findings were fixed, not deferred** — the parse on every bullet and the line base.
- [x] **The backlog holds no claim this work made false** — four fictions and two fixed Known Issues left `ContextPM`; the table gap replaced them.

#### Next Session

**Footnotes is the work, and it opens a new focus.** Nothing blocks it. Get C-3's clear-on-default `[assumed]` blessed, hand [[Footnotes — Decision Log]] to the planning skill, and check the reviewer's two live-layout unknowns during planning: whether the Subfield's hover rail admits a second control beside the collapse chevron, and whether disclosing the section flickers the toggle's at-bottom visibility condition.

Read these five seams before planning the marker or the section — each was built for this, and each is one registration rather than a fork:

- `editor/folding.ts` — `FoldKind` / `FoldRegion` / `KINDS`. A fold is a region of some kind, with a `collapsedByDefault` path for a section hidden on first open (C-3, C-11).
- `decorations/intent.ts` `scanDoc`, cached in `editor/docCache.ts` — the one whole-document derivation the footnote-section scan joins, so it cannot disagree with fences and tables about the exclusion base. `editor/blockModel.ts` reads it (C-12).
- `editor/pointerPath.ts` — the click skeleton, taking `follow` / `dwell` / `menu`. The claim on a press is derived from `follow`, so a construct that leads nowhere seats a caret like any other text.
- `Tables/cellStatic.tsx` `cellLinkTarget` + `editor/links.ts` `followTarget` / `dwellTarget` — how a resting cell reads the same answers the body does, which is where a marker's rest branch hangs (B-5).
- `main/remint.ts` `COPY_SCOPES` — a page-keyed scope joins the list directly; one keyed by anything else travels through the re-mint map, as `viewOrder` does.

**In parallel, whenever it suits** — none of it touches MarkdownPM. Table hoisting's opening step is done, so what remains there is splitting `Table.css` and finding the four homes for what leaks out; then the `main/index.ts` split. Four cohesion items are still open in [[Cohesive-Cleanup]], the largest being `useViewHost` under Table and Cards.

**Two things to look at in the running app:** the option editors and the properties panes, per §Current Focus. And still outstanding from the retired web-layer session: your own pass over its five changes — settings placement, typed zoom, hover scroll, a live tab flip, inline Edit Link.

#### Feedback

- "Finish the MarkdownPM part of the Cohesion pass, leave nothing behind -> then fold the easy-win definition duplications -> park the design-splits across the Tables, Cards Ect... as pending focus in the cohesion pass. Eliminate the first bullet of the cohesion pass alongside the remaining easy wins. Then build Footnotes. Then complete the rest."
- "were doing all phases. No open stuff. All phases must be done, with a verification pass between."
- "reduction of code is the priority" — and where it did not deliver, the number gets reported as it is rather than framed.
- "don't amend fixtures — add them to the per-session changelog and remove rather than tagging as fixed from context" — a resolved backlog item leaves ContextPM outright; what it was and what closed it belongs here.
- "review solidifies the mandate rather than the method" — reviews against a decision log attack cohesion and coverage, and leave implementation discovery to planning.
- "Definitions across docs and codebase need to be called Citations to make room for a future Definitions feature that may exist independently from Footnotes."

#### Session Pointers

- `.claude/Planning/Footnotes — Decision Log.md` — the planner's contract, and the only live plan left. One `[assumed]`: C-3's clear-on-default.
- `.claude/ContextPM.md` — the durable backlog. §Immediate Work, §Open Calls, §The Boring Work, §Known Issues, §Debt & Ride-Alongs. The session-sized cohesion queue is `.claude/Planning/Cohesive-Cleanup.md`.
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
