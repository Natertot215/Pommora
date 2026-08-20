## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** c565e80c-b4a9-42c9-8ffb-cf38a4cb80bb
**Dates:** 08-19-2026 → 08-20
**Model:** Opus 5

**Two coordinated lines, and this document is the shared record for both.** Line one is the Cohesion arc's MarkdownPM leg — **finished this session**, and its easy wins with it. Line two is Footnotes, whose decision log the prior session completed and which was waiting on that leg. Nathan's order held: the MarkdownPM cohesion work finishes first with nothing left behind, and the removal of its ContextPM bullet is the Footnotes greenlight. **That bullet is gone.**

**All eight phases landed**, commits `9fd6da98` … `a8988710`, gates green at each: typecheck clean, Biome zero across 854 files, 3,006 Vitest tests. KNOB went 115 → 117 (two added, none stripped); the nine decision markers survive. Six live defects closed, four of them as symptoms of the duplication they sat inside rather than as separate fixes. Every phase also carried its own doc corrections — a statement the code caught up to was left alone, a statement that stayed false was rewritten as the truth rather than as a revision of one.

**What the leg actually delivered to Footnotes.** The decision log's Sources section named its prerequisites by file; each is now in place. `folding.ts` takes a **kind** — a fold is a region, and a second kind of foldable region is a registration rather than a fork, with a `collapsedByDefault` path for a section hidden on first open (C-3, C-11). `scanDoc` is **one** whole-document derivation the footnote-section scan joins, so it cannot disagree with fences and tables about the exclusion base; `blockModel`'s `blockContext` reads it, so a footnote-section `BlockKind` is one registration (C-12). The click skeleton markers inherit is now **one factory** with a `follow`/`dwell`/`menu` surface — a marker is a third spec, not a third copy — and its two editor-free target readers are what let `cellStatic.tsx` follow and preview a link at rest, which is where the marker's own resting branch will hang (B-5). `COPY_SCOPES` gained `headingIcon`, so the footnote-visibility scope no longer inherits that hole. `Tables/widget.tsx`'s stale `main/io/tableHeadingColumns` pointer is corrected.

**The arc came in at +62 code lines against an estimate of −400**, and that gap is the honest finding. The estimate counted the bodies a consolidation removes and not the signatures it threads; it assumed four box constructs could share their paint, which they cannot because a quote nested in a callout already spends that line's second pseudo-element; and it treated a shared factory as free when it is 135 new lines two files stop spelling twice. Where the reduction is real it is in what stops being *derived* twice rather than what stops being *written* twice — seven document splits became one, a whole second block-context disappeared, five `clamp`s became one, and the table-region memo and the standalone math accessor both closed as second doors onto one derivation.

**One visible change shipped, disclosed rather than smuggled.** A code block nested in a callout or a quote regained the 6px of head and foot padding it always specified — its zero gap was written without a unit, which voided the `calc()` that added them, so it sat flush against its own fill. If that reads wrong, `--box-pad: 0px` on the nested rule restores it. Everything else in phases 2 and 6 is byte-identical, proved by rendering every box and inline specimen before and after.

**Two plan items were not done, and saying so is the point.** The block drag's outer bottom and the list drag's inner right edge read different edges under different conditions — not one function. And the autocomplete row would have to take the menu primitive's metrics to adopt it, which changes how the panel looks rather than what it says; that needs Nathan, not a refactor.

**The cohesion arc's easy wins closed after it**, commits `1b3fa132` · `640ac1af` · `498d6a2a`, gates green at each and at the end: typecheck clean, Biome zero across 862 files, 3,010 Vitest tests, KNOB 117 and the nine markers intact. Three ContextPM bullets and one Known Issue left the document rather than being marked done: the helper deduplication, the main-side menus' label logic, and the `.MD`-extensioned page whose sidebar kept its extension — that last one was a symptom of the duplication, since the sidebar's own `base()` was a case-sensitive re-spelling of the shared `titleFromPath`. Five new modules hold what was spelled many times: the nexus-relative on-disk names, the two-state label wordings, a parent path's lift-and-place sibling `moveItem`, `pad`, and the view-order cache both renderers kept their own copy of. **+72 code lines**, and the same honesty the arc's own number needed: naming a fact costs an import line at every site that stops spelling it, so a deduplication whose duplicates were one-liners reads as growth. What it buys is that the fact now has one place to change.

**Two of the three items were smaller than the backlog said, and one was larger.** `.trash` and `.nexus/` are 9 and roughly 30 code sites, not 71 and 94 — the difference is doc comments naming the folder. No shared tested function computes a Pin/Unpin label, so the menus entry's named example did not hold; what it should have named is Open / Open New Tab, spelled in the tested model and re-spelled inline in two Electron menus. And the toggle-label class runs past `src/main` entirely — the lock and the footer are spelled in the renderer, four times each. All three are recorded in [[Cohesion-Rulings]].

**The scroll timer stays, by Nathan's call**, and the code around it was simplified rather than replaced. The obvious failure it was hiding: the glide asks for its destination every frame, and the seat it asked for walked the DOM and resolved a computed style each time to re-read a header height a scroll cannot change. Read once now. The debt entry is unchanged and still true.

#### Completion Criteria

- [x] **The MarkdownPM cohesion leg is finished with nothing left behind** — all eight phases landed, phase 7's fold widening included, gates green, docs reconciled.
- [x] **The MarkdownPM cleanup arc closes** — the four deferred items settled: one list vocabulary, `embedWidget.tsx` cleaned rather than split (Nathan's call), three of four import cycles broken, `PageHeader` on one `page` object.
- [x] **The MarkdownPM cleanup bullet is eliminated from ContextPM** — the Footnotes greenlight.
- [x] **The design-splits are parked, not built** — recorded in full under ContextPM §The Remaining Cohesion Efforts, nothing half-started.
- [x] **The cohesion arc's transient records are drained and retired** — rulings to [[Cohesion-Rulings]], open decisions to ContextPM §Open Calls, live defects to §Known Issues, arcs to §Pending Focuses. `.claude/Planning` holds only the Footnotes contract and the webpage log.
- [ ] **Footnotes' last `[assumed]` entry carries Nathan's word** — C-3's clear-on-default, blessed or amended before the plan is written.
- [ ] **Footnotes is planned, ratified, built, and closed out** — the decision log handed to the planning skill, the plan approved before any code, the build through `/closeout` clean.
- [x] **The cohesion arc's easy wins fold** — the helper deduplication and the main-side menus' label logic, both gone from ContextPM.
- [ ] **The remaining Cohesion efforts complete** — Table hoisting, the `main/index.ts` split, the view host, virtualization, the parked design-splits.

#### Next Session

**Footnotes is the work.** Nothing blocks it. Get C-3's clear-on-default `[assumed]` blessed, hand [[Footnotes — Decision Log]] to the planning skill, and check the reviewer's two live-layout unknowns during planning: whether the Subfield's hover rail admits a second control beside the collapse chevron, and whether disclosing the section flickers the toggle's at-bottom visibility condition.

Read these five seams before planning the marker or the section — each was built for this and each is one registration rather than a fork:

- `editor/folding.ts` — `FoldKind` / `FoldRegion` / `KINDS`. A fold is a region of some kind, with a `collapsedByDefault` path for a section hidden on first open (C-3, C-11).
- `decorations/intent.ts` `scanDoc`, cached in `editor/docCache.ts` — the one whole-document derivation the footnote-section scan joins, so it cannot disagree with fences and tables about the exclusion base. `editor/blockModel.ts` reads it, so a footnote-section `BlockKind` is one registration (C-12).
- `editor/pointerPath.ts` — the click skeleton, taking `follow` / `dwell` / `menu`. The claim on a press is derived from `follow`, so a construct that leads nowhere seats a caret like any other text.
- `Tables/cellStatic.tsx` `cellLinkTarget` + `editor/links.ts` `followTarget` / `dwellTarget` — how a resting cell reads the same answers the body does, which is where a marker's rest branch hangs (B-5).
- `main/remint.ts` `COPY_SCOPES` — a page-keyed scope joins the list directly; one keyed by anything else travels through the re-mint map, as `viewOrder` does.

**In parallel, whenever it suits** — none of it touches MarkdownPM: Table hoisting first, since its first step (moving `pickView` and `resolveContainerSchema` out of `TableView` into `Views/pipeline/`) is zero behavior change and unblocks the rest, then the `main/index.ts` split. ContextPM §The Remaining Cohesion Efforts carries all of them, and §Open Calls carries the ten decisions that need Nathan rather than an implementer. `TableView.tsx` and `CardsView.tsx` were opened for the easy wins and are clean for it: both now read one `useViewOrders`, which is the third partial extraction of the view host the same section asks for.

**Standing rules for any of it:** `npm run typecheck`, `npm run lint` at zero diagnostics, and `npm run test` green before anything is called done, with `set -o pipefail` on anything piped. Stage explicit paths. Never strip a `KNOB` or a `(Nathan's call)` / `(spec)` marker — counts are 117 and 9. Report code-only deltas. Disclose any look-or-behavior decision as you make it. If an item turns out to be smaller, larger, or not a duplication at all, say so rather than forcing it.

**Leftover from the retired web-layer session:** Nathan's own pass over its five changes (settings placement, typed zoom, hover scroll, a live tab flip, inline Edit Link) — unverified unless he's since done it.

#### Feedback

- "Finish the MarkdownPM part of the Cohesion pass, leave nothing behind -> then fold the easy-win definition duplications -> park the design-splits across the Tables, Cards Ect... as pending focus in the cohesion pass. Eliminate the first bullet of the cohesion pass alongside the remaining easy wins. Then build Footnotes. Then complete the rest."
- "were doing all phases. No open stuff. All phases must be done, with a verification pass between."
- "reduction of code is the priority" — and where it did not deliver, the number gets reported as it is rather than framed.
- "the 'Not in this Plan' become the drafted handoff prompt to complete the MarkdownPM cleanup arc."
- "review solidifies the mandate rather than the method" — reviews against a decision log attack cohesion and coverage, and leave implementation discovery to planning.
- "Definitions across docs and codebase need to be called Citations to make room for a future Definitions feature that may exist independently from Footnotes."
- "don't amend fixtures — add them to the per-session changelog and remove rather than tagging as fixed from context" — a resolved backlog item leaves ContextPM outright; what it was and what closed it belongs here.

#### Session Pointers

- `.claude/Planning/Footnotes — Decision Log.md` — the planner's contract, and the only live plan left. Frame (with the Citations vocabulary rule), Sources, every decision tagged, Core vs Prospects split. One `[assumed]`: C-3's clear-on-default.
- `.claude/ContextPM.md` — the durable backlog. §Immediate Work, §The Remaining Cohesion Efforts (what the sweep found and did not spend), §Open Calls (the ten needing Nathan), §Known Issues, §Debt & Ride-Alongs.
- `.claude/Guidelines/Cohesion-Rulings.md` — what a sweep re-derives wrongly, and what it should stop re-proposing. Read before opening any cohesion finding.
- `.claude/Guidelines/Editor-Internals.md` — the editor's hard invariants, including the box line's spent pseudo-elements and the `:is()` weight rule.
- `.claude/HistoryPM.md` PM-110 — what the whole cohesion arc shipped, commits included.
- **Retired this session:** `Cohesion-Audit.md`, `Cohesion-Changelog.md`, `MarkdownPM-Plan.md`, `MarkdownPM-Scoping.md`. Everything durable in them moved to the homes above; the rest was per-phase narration git already holds. They are in the history if a number is ever wanted.

#### Working Notes

- **Every seam Footnotes named is in place.** The fold registry (`editor/folding.ts`'s `FoldKind` / `FoldRegion` / `KINDS`), the one document scan (`decorations/intent.ts`'s `scanDoc`, cached in `editor/docCache.ts`), the pointer-path factory (`editor/pointerPath.ts`), the resting-cell target readers (`Tables/cellStatic.tsx`'s `cellLinkTarget` + `editor/links.ts`'s `followTarget` / `dwellTarget`), and `COPY_SCOPES`. Read those five before planning the marker or the section.
- **A fold is identified by where it sits.** Recorded, not endorsed, and pinned in `editor/foldState.test.tsx`: a deletion that lands another region of the same kind on a folded one's offset hands the fold over. A stabler identity than an offset is its own decision, and Footnotes' section may be the thing that earns it.
- **`:is()` takes its most specific argument's weight.** A two-class argument in a shared selector lifts the whole rule over the first/last rules meant to refine it — the one real trap in the box base, and the reason every argument there is a single class.
- **Footnotes' parse is already free** — the installed `micromark-extension-gfm` emits `footnoteReference`/`footnoteDefinition` today; the extensions are transitive, not direct deps. GFM's lazy continuation (an unindented next line joins the citation above) is the trap the whole boundary design answers — re-verify it before trusting any scan.
- **The footnote marker will be the editor's first mid-line atomic range** — every existing `atomicRanges` provider is line-prefix or block-scope; the callout guard's transaction-repair pattern is the delete-protection model, and the grip menu now follows the same re-read-and-match discipline for anything spent after an async menu.
- **A new `local_state` scope must join `COPY_SCOPES` in `main/remint.ts`** or a copied page silently loses the flag. `headingIcon` is no longer the example of that hole — it is the example of the fix, and `viewOrder` shows the other half: a row keyed by something other than the container's id has to travel through the re-mint map itself.
- **`footnote` and `definition` are both banned identifier names for the feature** — the first collides with the typography scale step, the second is reserved by the vocabulary rule.
- **CSS proof is a render, not a suite.** Phases 2 and 6 were verified by rendering hand-written `.cm-line` specimens against the built stylesheet in headless Chrome and diffing the PNGs. A green Vitest run proves nothing about a 1px shift, and computed-style comparison is what localized the one real difference to a single declaration.

#### Changes

**FILES ADDED**

- `Pommora/src/renderer/src/MarkdownPM/editor/pointerPath.ts` — the shared link-gesture factory and its primitives.
- `Pommora/src/renderer/src/design-system/clamp.ts` — one definition, seven readers.
- `Pommora/src/renderer/src/MarkdownPM/editor/menuSubject.test.ts` · `editor/foldState.test.tsx` — pins for the two subsystems that had none.
- `Pommora/src/shared/nexusPaths.ts` — the nexus-relative on-disk names, read by both processes; `main/paths.ts` keeps every absolute-path builder.
- `Pommora/src/shared/toggleLabels.ts` — the wording a two-state control wears, one per control.
- `Pommora/src/renderer/src/design-system/moveItem.ts` — lift an item, set it down; five callers own only their lookup.
- `Pommora/src/renderer/src/design-system/pad.ts` — zero-pad to a width, three readers.
- `Pommora/src/renderer/src/Detail/Views/useViewOrders.ts` — the per-view manual order cache both renderers held their own copy of.

**FILES REMOVED**

- `Pommora/src/renderer/src/MarkdownPM/editor/mathRanges.ts` — a second door onto the shared scan.

**FILES MODIFIED**

- The editor: `decorations/intent.ts`, `detect/index.ts`, `editor/docCache.ts`, `blockModel.ts`, `blockDrag.ts`, `blockHandles.ts`, `listDrag.ts`, `listDragModel.ts`, `dragChrome.ts`, `EditorGesture.ts`, `gripMenu.ts`, `embedRanges.ts`, `embedInsert.ts`, `input.ts`, `folding.ts`, `connections.ts`, `links.ts`, `menu.ts`, `index.tsx`, `Styles.css`.
- Tables: `regions.ts`, `sync.ts`, `guard.ts`, `codec.ts`, `widget.tsx`, `cellStatic.tsx`, `CellEditor.tsx`, `TableView.tsx`, `operations.ts`.
- Main + design system: `main/remint.ts`, `design-system/tokens/typography.css.ts`, `theme-vars.css.ts`, `resize-strip.css`, `interactions/FloatingWindow.tsx`, `components/SidePane/SidePane.tsx`, `Components/PhotoCropModal.tsx`, `SurfacePM/core/ops.ts`.
- The easy wins, main: `paths.ts`, `readNexus.ts`, `record.ts`, `provenance.ts`, `mutate.ts`, `mutatePatch.ts`, `watcher.ts`, `watchPatch.ts`, `session.ts`, `indexSeed.ts`, `index.ts`, `io/walk.ts`, `io/atomicWrite.ts`, `io/thumbnails.ts`, `io/navigationFile.ts`, `crud/contextWrite.ts`, `crud/trashRows.ts`, `crud/optionOps.ts`, `crud/registryProperty.ts`, `properties/schema.ts`, `navRowMenu.ts`, `tabMenu.ts`, `contextMenu.ts`.
- The easy wins, shared + renderer: `shared/properties.ts`, `pageMenu.ts`, `viewMenus.ts`, `tileMenu.ts`; `store.ts`, `pageMenuActions.ts`, `destinationTree.ts`, `Detail/pageEditor.ts`, `Detail/DetailPane.tsx`, `Views/Table/TableView.tsx`, `Views/Cards/CardsView.tsx`, `Views/Cards/cardsOrder.ts`, `Views/useViewCreation.ts`, `Views/pipeline/group.ts`, `Views/PropertyEditing/formatValue.ts`, `Sidebar/Sidebar.tsx`, `sidebarDnd.tsx`, `sidebarDndModel.ts`, `Tabs/tabsModel.ts`, `Navigation/navRecents.ts`, `NavList.tsx`, `Blocks/BlockHandleMenu.tsx`, `Components/Detail/PropertiesPane.tsx`, `SettingsPane.tsx`, `SettingsScaffold.tsx`, `Detail/Settings/SpaceSettings.tsx`, `design-system/interactions/drag.tsx`, `engine.tsx`, `components/CalendarPicker/CalendarPicker.tsx`, `components/PreviewPane/PreviewPane.tsx`.
- Docs: this document, `ContextPM.md`, `HistoryPM.md` (PM-110 extended, not reopened), `Guidelines/Editor-Internals.md`, `Features/MarkdownPM.md`, `Features/WebviewPM.md`, `Features/DesignSystemPM.md`, `Features/InteractionPM.md`, `Planning/Footnotes — Decision Log.md`.
- Added: `Guidelines/Cohesion-Rulings.md`. Retired: the audit, the changelog, and the two MarkdownPM planning documents.

**COMMITS**

`9fd6da98` · `ab6ac262` · `9c1ecf3d` · `6d047973` · `aea208e7` · `22c912e0` · `f796fc65` · `6af1ab4d` · `a8988710`
· `69356153` · `9cb1f23b` · `3e2e2e67` · `a9d412e6` · `ac385b34` · `d1d0a4d5` — the cleanup arc and its closer pass.
· `1b3fa132` · `640ac1af` · `498d6a2a` — the easy wins.

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
