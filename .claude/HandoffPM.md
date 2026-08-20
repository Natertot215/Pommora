## Handoff — Pommora

> **User Prompt:** *"You do NOT guess — you LOOK, and you ASK. Open the file and read the code before you assert anything; ask me when you're unsure. A plan built on an unverified claim is a liability, not progress — treat every doc, every `file:line`, every 'it works like X' as a hypothesis until you've read the code that proves it. Honesty over confidence; confidence is earned through evidence."*

#### Current Focus

**Session ID:** 7a123066-35e8-46cf-acb9-4d607bae4fb6
**Dates:** 08-20-2026
**Model:** Opus 5 (1M context)

**The focus was the Link property reaching a page, and it is finished.** It opened as one narrow ask — a pasted internal link should resolve in frontmatter — and grew twice on Nathan's word: first into widening the rename cascade, then into consolidating the link right-click menu across every surface that pops one. All three landed, `/closeout` ran clean over the range, and the record is PM-110.

**The value seam came first.** `linkValue.ts` gained a `LinkTarget` union — `page` or `url` — behind one `readLink()`, and every surface branches on that rather than re-parsing the string. A pasted `[[Title]]` (Copy Link's own output) or a markdown link whose target names a page commits as the canonical `[[Title]]`, alias carried through; a title nothing answers to is refused exactly as a malformed address is, which was Nathan's explicit call over the alternative of storing phantoms. No schema change was needed — a url value is a bare string on disk, so `[[Title]]` stores as-is.

**Nathan flagged the cascade before I did.** He asked whether a renamed page would drag its frontmatter links along, and it would not: `cascade.ts` rewrote `splitEnvelope(content).body` only, and `indexSeed.ts` seeded `mentions` from the body only — so a page whose *sole* inbound reference was a property value never even entered the candidate set. Both widened, and that exact case is pinned in `cascade.test.ts`.

**The menu work was the largest share and the cleanest reuse.** `ActionItem.submenu` and `popModelMenu` already existed and `main/connMenu.ts` was hand-building Electron templates anyway; extracting `shared/connMenu.ts` deleted 60 lines from main and made four menu variants testable. `showConnectionMenu` turned out to already route Preview / New Tab / Copy Link / Copy Path against the store rather than the editor — only `apply` was editor-shaped, and it exists to be supplied by another surface — so cells, cards and both inspector panes became callers with no new plumbing. `cellMenuModel`'s link branch survives, narrowed to the empty and phantom cases that have no link to open.

**Two things went wrong and both are worth carrying.** A reported "no Clear on a link cell" was a false positive from Nathan's dev session running stale main — `src/main` doesn't HMR and isn't reached by ⌘R, and the old builder rendered against the new context. `Build-Gotchas` now names that signature. And I over-read "Clear-only for the link itself, Remove on the property" as *both* items on the link menu; corrected to a split — the value's menu clears, the property's menu removes.

**Verified:** typecheck clean across both projects, Biome zero over 853 files, 3,059 Vitest tests. The four menu variants and every open-item suppression are pinned in `connMenu.test.ts`; the cascade's frontmatter reach in `cascade.test.ts`. **Not verified, and wanting your eyes:** every menu in the running app. Native context menus aren't DOM, so CDP cannot render or click one — the models are pinned, the pixels are not. Restart the dev process rather than ⌘R.

#### Completion Criteria

- [x] **A pasted internal link commits and resolves** — `[[Title]]` and `[Alias](Title)` both, under the page's own capitalization, alias carried, unresolvable titles refused.
- [x] **The value reads and acts as a connection** — connection color, click opens the page, ⌘-click a new tab, the three link formats standing down.
- [x] **The rename cascade reaches frontmatter** — both the rewrite and the index that decides which files are opened, with the frontmatter-only case pinned.
- [x] **One menu model serves every surface** — editor, table cell, card value, both inspector panes, with the editor's own external menu gaining Open Preview · Open Browser.
- [x] **Remove sits on the property, not on the value it holds** — the inspector's value menu clears; the row's menu removes.
- [x] **`/closeout` ran clean over the range** — simplifier and comment pass both, gates green after each.
- [ ] **Nathan has driven the menus in the running app** — the one criterion the harness cannot supply.

#### Next Session

- **Footnotes remains the standing next focus** and this work touched none of its seams. `.claude/Planning/Footnotes — Decision Log.md` is the contract; its one `[assumed]` entry (C-3's clear-on-default) still wants your word.

#### Feedback

- "Your job is one task and one task only. don't over-do scope, reusie what already exists."
- "Before getting started, you must scope out how you'd do this as cleanly and cohesively as possible without introducing anything new, rather re-using what you can that's already provided, the only additions should be to the right-click actions to register the cells/cards as variations of the shared right-click actions."
- "Replace incorrect information — don't add amendments, supersedes, or additional notes to fix framing; either remove it entirely or correctly restate it if it genuinely remains relevant — specificity shouldn't come at the risk of future accuracy."
- "take away 'Remove' from the option part of a proprty field. So that you clear the value, but remove is on the actual property."
- "Rename cascade must also ensure frontmatter isnt barred. Please check."

#### Session Pointers

- `src/shared/linkValue.ts` — the one seam a Link value is read and written through. `readLink()` returns the `page`/`url` union everything else branches on.
- `src/shared/connMenu.ts` — the link menu as rows, four variants. `src/main/connMenu.ts` is one line over it; `connMenu.test.ts` pins every row and every suppression.
- `src/renderer/src/Embeds/connectionMenu.ts` — the router. It builds the context (including where the page is already showing) and holds `linkValueMenuTarget`, which is how a property surface becomes a caller.
- `src/renderer/src/linkResolve.ts` — the live resolver and the field validator bound to it. Reads the tree through the store rather than a memoized render context, deliberately.
- `src/main/crud/cascade.ts` + `connections/scan.ts` + `indexSeed.ts` — the three files a rename's reach is decided by. `frontmatterMentions` is what puts a property-only reference in the candidate set.
- `.claude/Guidelines/Build-Gotchas.md` — read line 10 before diagnosing anything that "did nothing."

#### Working Notes

- **A stale main process presents as a wrong feature, not an absent one.** Today it rendered the old menu builder against the new context and read as a fresh regression. Restart the dev process before trusting any main-side observation.
- **A Link value is a bare string on disk**, which is why a connection in a property needed no schema, decoder, or migration work at all.
- **`pageDetail.path` and the preview's active tab are independent reads**, which is what lets "both open items dropped when the page shows in both" be two flags rather than a three-state union.
- **Contravariance bites the `apply` seam.** Widening one shared callback's action union forces a guard into every existing handler; a sibling field (`onCell`) keeps four editor files at a zero-line diff. The simplifier caught this and it was the right call.
- **A validator and its commit path must share a resolver.** `isCommittableLink` was passed bare at four sites while the commit passed `resolveTitle`, so a valid connection ghosted as invalid and then committed fine. `validateLink` binds them.

#### Changes

**FILES ADDED**

- `Pommora/src/shared/connMenu.ts` — the link menu model, moved out of `connections.ts` and widened to four variants.
- `Pommora/src/shared/connMenu.test.ts` — every variant and every open-item suppression.
- `Pommora/src/renderer/src/linkResolve.ts` — the live title resolver and the field validator bound to it.

**FILES MODIFIED**

- Shared: `linkValue.ts`, `linkValue.test.ts`, `connections.ts`, `pageMenu.ts`, `bridge.ts`.
- Main: `crud/cascade.ts`, `crud/cascade.test.ts`, `connections/scan.ts`, `connections/rewrite.ts`, `indexSeed.ts`, `connMenu.ts`.
- Renderer: `Embeds/connectionMenu.ts`, `treeIndex.ts`, `Components/Detail/PagePropertiesPane.tsx`, `PagePreview/PreviewInspector.tsx`, `Detail/Views/Table/TableView.tsx`, `LinkCell.tsx`, `Table.css`, `cellGestures.test.tsx`, `Detail/Views/Cards/CardValue.tsx`, `CardPickerHost.tsx`, `cardValueInput.ts`, `Detail/Views/PropertyEditing/usePropertyRows.ts`, `MarkdownPM/connections/index.ts`, `MarkdownPM/editor/linkEdit.ts`, `linkFormat.ts`, and four editor menu tests.
- Docs: this document, `ContextPM.md`, `HistoryPM.md` (PM-110), `Guidelines/Build-Gotchas.md`, `Features/PropertiesPM.md`, `ConnectionsPM.md`, `MarkdownPM.md`, `TableViewPM.md`, `CardViewPM.md`, `PagePreviewPM.md`.

**FILES REMOVED**

- None.

**COMMITS**

- None of this session's own. The Feature-doc edits were swept into the parallel footnotes session's commits (`b84677ce`..`980884f1`); everything else is uncommitted in the working tree. **Stage explicit paths** — a directory-level `git add` will take that session's in-flight Planning documents with it.

#### Handoff Guidelines

- §Current Focus and §Next Session restate to current truth on every run; multi-compact sessions may advance ideas or reconcile information while preserving the document's cohesion.
- Resolve = delete + route — a handled item leaves the document for its real home (Context, History, Features) with no tombstone left behind.
- Standing content lives in ContextPM.md — the durable backlog, rules, and fix log; this document carries only the session.
- Handoff must not accumulate bloat: if something has been resolved, route it to Contexts' § Recent Work; if what you're writing doesn't need to be preserved, don't preserve it.
- Continuity: when you're given the /handoff, the document is yours, and it's your job to pass it along as standing context for future agents; preserve what the next session needs, remove what it doesn't.
