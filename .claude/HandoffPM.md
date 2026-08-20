## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** c565e80c-b4a9-42c9-8ffb-cf38a4cb80bb
**Dates:** 08-19-2026 → 08-20
**Model:** Opus 5

**Two coordinated lines, and this document is the shared record for both.** Line one is the Cohesion arc's MarkdownPM leg — **finished this session**. Line two is Footnotes, whose decision log the prior session completed and which was waiting on that leg. Nathan's order held: the MarkdownPM cohesion work finishes first with nothing left behind, and the removal of its ContextPM bullet is the Footnotes greenlight. **That bullet is gone.**

**All eight phases of [[MarkdownPM-Plan]] landed**, commits `9fd6da98` … `a8988710`, gates green at each: typecheck clean, Biome zero across 854 files, 3,006 Vitest tests. KNOB went 115 → 117 (two added, none stripped); the nine decision markers survive. Six live defects closed, four of them as symptoms of the duplication they sat inside rather than as separate fixes. Every phase also carried its own doc corrections — a statement the code caught up to was left alone, a statement that stayed false was rewritten as the truth rather than as a revision of one.

**What the leg actually delivered to Footnotes.** The decision log's Sources section named its prerequisites by file; each is now in place. `folding.ts` takes a **kind** — a fold is a region, and a second kind of foldable region is a registration rather than a fork, with a `collapsedByDefault` path for a section hidden on first open (C-3, C-11). `scanDoc` is **one** whole-document derivation the footnote-section scan joins, so it cannot disagree with fences and tables about the exclusion base; `blockModel`'s `blockContext` reads it, so a footnote-section `BlockKind` is one registration (C-12). The click skeleton markers inherit is now **one factory** with a `follow`/`dwell`/`menu` surface — a marker is a third spec, not a third copy — and its two editor-free target readers are what let `cellStatic.tsx` follow and preview a link at rest, which is where the marker's own resting branch will hang (B-5). `COPY_SCOPES` gained `headingIcon`, so the footnote-visibility scope no longer inherits that hole. `Tables/widget.tsx`'s stale `main/io/tableHeadingColumns` pointer is corrected.

**The arc came in at +62 code lines against an estimate of −400**, and that gap is the honest finding. The estimate counted the bodies a consolidation removes and not the signatures it threads; it assumed four box constructs could share their paint, which they cannot because a quote nested in a callout already spends that line's second pseudo-element; and it treated a shared factory as free when it is 135 new lines two files stop spelling twice. Where the reduction is real it is in what stops being *derived* twice rather than what stops being *written* twice — seven document splits became one, a whole second block-context disappeared, five `clamp`s became one, and the table-region memo and the standalone math accessor both closed as second doors onto one derivation.

**One visible change shipped, disclosed rather than smuggled.** A code block nested in a callout or a quote regained the 6px of head and foot padding it always specified — its zero gap was written without a unit, which voided the `calc()` that added them, so it sat flush against its own fill. If that reads wrong, `--box-pad: 0px` on the nested rule restores it. Everything else in phases 2 and 6 is byte-identical, proved by rendering every box and inline specimen before and after.

**Two plan items were not done, and saying so is the point.** The block drag's outer bottom and the list drag's inner right edge read different edges under different conditions — not one function. And the autocomplete row would have to take the menu primitive's metrics to adopt it, which changes how the panel looks rather than what it says; that needs Nathan, not a refactor.

#### Completion Criteria

- [x] **The MarkdownPM cohesion leg is finished with nothing left behind** — every phase of [[MarkdownPM-Plan]] landed, phase 7's fold widening included, gates green, docs reconciled.
- [x] **The MarkdownPM cleanup bullet is eliminated from ContextPM** — the Footnotes greenlight.
- [x] **The design-splits are parked, not built** — recorded under ContextPM §The Remaining Cohesion Efforts with nothing half-started.
- [ ] **The MarkdownPM cleanup arc closes** — the four items the plan deferred because Footnotes is what makes them worth doing. Drafted prompt below.
- [ ] **The easy-win definition duplications are folded** — Cohesion-Audit §One Definition Per Thing. `clamp` is already done.
- [ ] **Footnotes' last `[assumed]` entry carries Nathan's word** — C-3's clear-on-default, blessed or amended before the plan is written.
- [ ] **Footnotes is planned, ratified, built, and closed out** — the decision log handed to the planning skill, the plan approved before any code, the build through `/closeout` clean.
- [ ] **The remaining Cohesion efforts complete** — Table hoisting, the `main/index.ts` split, and the parked design-splits.

#### Next Session

**The drafted prompt — finish the MarkdownPM cleanup arc.**

> Close the four items [[MarkdownPM-Plan]] deferred under §What This Plan Deferred, And Why. They were held back because the footnotes work is what makes them worth doing, and that work is now unblocked — so these land first, in this order, each through implement → simplify → implement → full-diff closeout.
>
> 1. **`setList` / `setListKind`.** One rule for what a list marker becomes, written twice — `input/format.ts` and the grip menu's kind switch. Collapse to one, with the grip menu's whole-block sweep and the caret line's single-line case as parameters rather than as two implementations. Pinned by `gripMenuFlow.test.tsx`'s Type-switch suite and `input/format.test.ts`.
> 2. **`embedWidget.tsx`'s four responsibilities.** The tile chassis, the page fetch, the resize strip, and the claim wiring. Split so the generic half is reusable — the footnotes section is the second construct that will want it, so the seam is drawn against that need rather than for tidiness alone.
> 3. **The three `Embeds/` import cycles.** Latent today. The shape to follow is the one closed during the reduction pass: the shared primitives move to the seam that reads them, not beside one of its callers.
> 4. **`PageHeader`'s seven threaded props.** A restructure with a design question inside it — **ask Nathan before writing code here**, and skip it rather than guess.
>
> Standing rules for the arc: `npm run typecheck`, `npm run lint` at zero diagnostics, and `npm run test` green before any item is called done, with `set -o pipefail` on anything piped. Stage explicit paths, never directories. Never strip a `KNOB` comment or a `(Nathan's call)` / `(spec)` marker — grep-verify both counts survive (117 / 9). Report code-only deltas, comments and tests excluded. Disclose any look-or-behavior decision in the response as you make it. If an item turns out to be smaller, larger, or simply not a duplication, say so rather than forcing it — two plan items were refused on exactly that basis last session.

**Then, in either order — they don't cross over except where noted.**

- **Footnotes.** Get C-3's clear-on-default `[assumed]` blessed, hand the decision log to the planning skill, and check the reviewer's two live-layout unknowns during planning: whether the Subfield's hover rail admits a second control beside the collapse chevron, and whether disclosing the section flickers the toggle's at-bottom visibility condition. **It crosses the cleanup arc only at `embedWidget.tsx`** — item 2 above draws a seam Footnotes consumes, so run that item before Footnotes' build, or serialize the two.
- **The remaining Cohesion efforts** — §One Definition Per Thing's easy wins, then Table hoisting, then the `main/index.ts` split. None of these touch MarkdownPM, so they run in parallel with Footnotes freely.

**Leftover from the retired web-layer session:** Nathan's own pass over its five changes (settings placement, typed zoom, hover scroll, a live tab flip, inline Edit Link) — unverified unless he's since done it.

#### Feedback

- "Finish the MarkdownPM part of the Cohesion pass, leave nothing behind -> then fold the easy-win definition duplications -> park the design-splits across the Tables, Cards Ect... as pending focus in the cohesion pass. Eliminate the first bullet of the cohesion pass alongside the remaining easy wins. Then build Footnotes. Then complete the rest."
- "were doing all phases. No open stuff. All phases must be done, with a verification pass between."
- "reduction of code is the priority" — and where it did not deliver, the number gets reported as it is rather than framed.
- "the 'Not in this Plan' become the drafted handoff prompt to complete the MarkdownPM cleanup arc."
- "review solidifies the mandate rather than the method" — reviews against a decision log attack cohesion and coverage, and leave implementation discovery to planning.
- "Definitions across docs and codebase need to be called Citations to make room for a future Definitions feature that may exist independently from Footnotes."

#### Session Pointers

- [[MarkdownPM-Plan]] — every phase ticked, estimates against actuals, and §What This Plan Deferred, And Why: the four items the next session closes.
- [[MarkdownPM-Scoping]] — the evidence behind the plan. Its numbers have moved; open the cited line before acting on any of them.
- `.claude/Planning/Footnotes — Decision Log.md` — the planner's contract. Frame (with the Citations vocabulary rule), Sources, every decision tagged, Core vs Prospects split. One `[assumed]` left: C-3's clear-on-default.
- [[Cohesion-Audit]] — what is left of the catalog: §One Definition Per Thing is the easy-win list, §Beyond a Session is what parks, §Open Calls need Nathan. Its Standing Rulings and Corrections govern and should not be re-litigated.
- [[Cohesion-Changelog]] §Session Three — the per-phase record.
- `.claude/ContextPM.md` §Immediate Work — carries the same ordering this document details.

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
- `Pommora/src/renderer/src/design-system/clamp.ts` — one definition, five readers.
- `Pommora/src/renderer/src/MarkdownPM/editor/menuSubject.test.ts` · `editor/foldState.test.tsx` — pins for the two subsystems that had none.

**FILES REMOVED**

- `Pommora/src/renderer/src/MarkdownPM/editor/mathRanges.ts` — a second door onto the shared scan.

**FILES MODIFIED**

- The editor: `decorations/intent.ts`, `detect/index.ts`, `editor/docCache.ts`, `blockModel.ts`, `blockDrag.ts`, `blockHandles.ts`, `listDrag.ts`, `listDragModel.ts`, `dragChrome.ts`, `EditorGesture.ts`, `gripMenu.ts`, `embedRanges.ts`, `embedInsert.ts`, `input.ts`, `folding.ts`, `connections.ts`, `links.ts`, `menu.ts`, `index.tsx`, `Styles.css`.
- Tables: `regions.ts`, `sync.ts`, `guard.ts`, `codec.ts`, `widget.tsx`, `cellStatic.tsx`, `CellEditor.tsx`, `TableView.tsx`, `operations.ts`.
- Main + design system: `main/remint.ts`, `design-system/tokens/typography.css.ts`, `theme-vars.css.ts`, `resize-strip.css`, `interactions/FloatingWindow.tsx`, `components/SidePane/SidePane.tsx`, `Components/PhotoCropModal.tsx`, `SurfacePM/core/ops.ts`.
- Docs: this document, `ContextPM.md`, `HistoryPM.md` (PM-110 extended, not reopened), `Guidelines/Editor-Internals.md`, `Planning/MarkdownPM-Plan.md`, `Planning/Cohesion-Audit.md`, `Planning/Cohesion-Changelog.md`.

**COMMITS**

`9fd6da98` · `ab6ac262` · `9c1ecf3d` · `6d047973` · `aea208e7` · `22c912e0` · `f796fc65` · `6af1ab4d` · `a8988710`

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
