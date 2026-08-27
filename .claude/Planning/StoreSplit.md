## The Store Re-Key and Split — Implementation Plan

> **Status:** written, pending review · Spec: [[Codebase-Cleanup-Checklist]] §Bundle 5, the 08-21 Architecture Audit §The Store · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. The Renderer Refactor moves folders under this plan's feet (`Detail/` → `Interface/`, `Tabs/` → `Navigation/`, root modules → `Core/`), so a path here is where the symbol lived when the plan was written.

**Goal**

The renderer's store describes every open tab's page, not only the shown one, and lives as domain slice files composing one `useSession`. At the end: `pages: Record<tabId, PageSlot>` replaces the five singleton fields (`pageStatus`, `pageDetail`, `pageError`, `pageFrozen`, `liveBody`); `selection` is a selector over the active tab rather than a hand-synchronized copy; a `PageView` is `PageView({ tabId })` and reads its own slot whether shown or parked; the Subfield is driven by whichever host mounts it; and the 1,906-line file is nine files whose names answer "what state is this."

Why this shape. The singleton's workarounds have leaked into six files as prop detours (`PageView.detail`), bypass parameters (`Subfield.scope`), target-guessing (`ContentView.useHosts`), a capture-before-mutate ordering rule (`captureOutgoingDetail`), and two module fences (`pageFetchSeq`, `coldStampSeq`) that exist only because one slot serves N tabs. Keying by tab deletes each of those rather than accommodating them. The re-key leads and the file split follows because the re-key is what draws the slice boundary: `select` is tabs' and pages' joint transaction, so they are one slice, and a split done first would freeze the singleton into its own file and make the re-key a cross-file edit. The alternatives weighed: splitting first (rejected above); a second store for pages (rejected — the shared room is what lets tabs, pins, previews, and pages react to each other, and two stores is the two-copies bug class the single store killed); keying by path instead of tab (rejected — two tabs on one file is already prevented at the host, and a tab is what navigates, so a tab is what owns a page).

Bounds. The store's shape — one `useSession`, field-by-field subscription, main owns the data — stays. Zustand stays bare: no middleware, no persist. The warm cache (`Tabs/warmCache.ts`) stays as the per-tab *history* store (Back/Forward warmth, embed rehydration); the slot is a tab's *current* page. This plan does not virtualize, does not touch `main/index.ts`, and does not add split view — it builds the state split view lands on.

**Requirements**

1. Page state is keyed by tab: `pages: Record<string, PageSlot>`, one slot per tab currently showing a page; a tab on a non-page has no slot.
2. `selection` is derived from `(tabs, pinnedTabs, activeTabId)` through one selector; no store field named `selection` remains.
3. The cold-swap pause, the fetch fence, and the live body are per-slot facts; `pageFetchSeq`, `coldStampSeq`, `pageFrozen`, and `liveBody` are gone.
4. `PageView({ tabId, parked })` reads `pages[tabId]`; the `detail` prop is gone; `ContentView.useHosts` reads slots, never the warm cache.
5. The Subfield and CitationsToggle are driven by a `page: { target, body } | null` prop from every host; the `scope` parameter and the store-reading mode are gone.
6. `captureOutgoingDetail` is gone; a tab's outgoing page is captured to warm in the one place a slot is replaced.
7. `pinnedTabs` has one writer; `previewTarget` is a selector.
8. The store is slice files under `src/renderer/src/Store/`, each a `StateCreator` over the full state, composed in `store.ts`; every existing `useSession` importer compiles unchanged.
9. Behavior holds: every existing store test passes (rewritten only where it seeded the retired fields), and the running-app checks in Acceptance are seen.

**Acceptance — the whole thing working:** with two page tabs open, type in tab A, switch to tab B, type there, switch back to A — A shows the typed text with no fetch (the `openPage` mock or the network panel is silent) and its scroll holds; then open a page preview over B and confirm the preview's Subfield word count tracks the preview's body while the main pane's tracks B's; then ⌘R — both tabs restore. And `rg -F pageDetail src/renderer/src --glob '!*.test.*'` returns hits only inside `PageSlot` readers (the Derivation's allowlist).

**Forced By**

- `select` writes tabs, recents, breadcrumb depth, the slide stamp, and page state in one act (`store.ts` `select`) → tabs, pages, history, and the derived selection are one slice.
- `pinnedTabs` is stored because deriving it needs `reconcileIndexOf(tree)`, an O(N) walk, and its readers are hot (`store.ts` comment at the field) → it stays stored; the fix is one writer, not a selector. This deviates from the Checklist's "derive from `derivePinnedTabs`" line, and the Checklist is corrected in Task 3.
- `PageEmbed` inside the preview window and inside tiles loads through the path-keyed detail cache, not the store (`Embeds/PageEmbed.tsx` `fetchPageDetail`) → the preview's page is not a store slot; the preview keeps a local body and passes it as the Subfield's `page` prop. The Checklist's "deletes PreviewWindow's parallel body buffer" is not delivered by this plan; what is deleted is the Subfield's two modes.
- 113 files import `useSession` from `../store` (`rg -l "from '.*store'" src/renderer/src`) → `store.ts` stays the composition root and the import path; slices live beside it.
- The Renderer Refactor's `Core/` row (`RendererRefactor.md` "Core/ for the root modules — store …") is pending → `Store/` moves under `Core/` with `store.ts` when that row lands; this plan does not pre-empt it.
- The working tree carries the refactor uncommitted, including `Detail/PageView.tsx` and `Windows/PageWindow.tsx` (`git status` at planning time) → execution starts only on a committed tree; every commit stages explicit paths.
- Zustand 5 (`package.json`) → slices are `StateCreator<SessionState, [], [], Slice>`; no middleware tuple.
- The `PAGE_CLEARED` / `PAGE_CLEARED_UNFROZEN` split records that `select` clears `pageFrozen` itself (commit `d0e1313e`) → both constants retire with the fields; the reason retires with them.

**Inherited Reasoning**

- `8c7df3bc` put alias memory in its own slice *inside* the file — the precedent that a domain has its own initial state and writer; this plan makes that the file boundary.
- `d0e1313e` reduced nine page-state reset sites to two constants and ruled that one blanket constant "would erase the reason." The reason was the singleton; with slots there is nothing to reset partially.
- The Audit ruled the singleton "does not violate the locked multi-window decision (the store is per-renderer) — what it blocks is within-window ambition: `WARM_TABS`, split view." Nothing here is multi-window work.
- Cohesion-Rulings: "`PageHeader` stays driven rather than store-reading" — the Subfield joins it; this is the rule generalizing, not a new one.

**Grounding**

- `Pommora/src/renderer/src/store.ts` — the whole file; `select`, `syncActiveDetail`, `captureOutgoingDetail`, `applyTree`, `resetNexusSession`, `mutate` are the joint transactions.
- `Pommora/src/renderer/src/store.test.tsx` — 530 lines; the warm-tab and cold-swap tests seed `pageStatus`/`pageDetail`/`selection` and are the behavior contract this plan carries.
- `Pommora/src/renderer/src/Tabs/warmCache.ts` — two caches: per-tab `(tabId, navKey) → WarmEntry` and path-keyed `PageDetail`; the slot replaces neither.
- `Pommora/src/renderer/src/Detail/ContentView.tsx` — `useHosts`, `WARM_TABS`, the `is-frozen` class.
- `Pommora/src/renderer/src/Detail/PageView.tsx` — the `detail` prop and the three conditional selectors.
- `Pommora/src/renderer/src/Detail/Subfield/{Subfield,subfieldItems,CitationsToggle}.tsx` — `SubfieldScope` and its two modes.
- `Pommora/src/renderer/src/Windows/PageWindow.tsx` — the local `previewBody` and the `scope` memo.
- `Pommora/src/renderer/src/Navigation/useNavThumbnails.ts`, `Toolbar/OutlineMenu.tsx`, `Frames/PageMenu.tsx`, `Properties/PageProperties.tsx`, `Embeds/connectionMenu.ts` — the active-page readers.
- `Pommora/src/renderer/src/Tabs/tabsModel.ts`, `Windows/windowTabs.ts`, `selection.ts` — the pure models the slices call.
- `.claude/Planning/Codebase-Cleanup-Checklist.md` §Bundle 5; `.claude/Planning/Architecture Audit — Full-Codebase Report.md` §The Store; `.claude/Planning/RendererRefactor.md` the `Core/` row.
- `.claude/Guidelines/Cohesion-Rulings.md`; `.claude/Features/ArchitecturePM.md` §The Store, §Tabs, Warmth, and Navigation.

**Environment**

- Plan directory: `.claude/Planning/`. Spec input: the Checklist's Bundle 5 and the Audit's ruling (both read whole).
- Explorer: `Explore`. Code reviewer: `feature-dev:code-reviewer`. Attack reviewer: `build-breaking-agent`. Neutral verifier: `general-purpose` handed the claim and the spec. Simplification: `code-simplifier` then `comment-killer-agent`.
- Gates, run from `Pommora/`: `npm run typecheck` · `npm run test` · `npm run lint`. Exit codes read directly. Baseline at planning: all three green on the dirty tree; 294 test files, 3,653 tests; `store.ts` 1,620 code lines (blank and comment lines excluded).
- Rules directory: `.claude/Guidelines/` (read: Cohesion-Rulings, Build-Gotchas, Lint-And-Accessibility).

**Shapes:** refactor (baseline: 3,653 tests, every one still green; the seven running-app checks) · removal (the inventory in Dead Vocabulary; deletion order is task order) · user-visible (tab flip, cold swap, preview Subfield, ⌘R restore).

**Global Constraints (every task inherits these)**

- Gates: `npm run typecheck && npm run test && npm run lint` from `Pommora/`, exit codes read directly, never through a pipe.
- No implementation edit before the plan is ratified. No task starts on a tree with uncommitted changes under `Pommora/src` — the refactor session's work commits first.
- Stage explicit paths only; never `git add -A` or a directory. Nathan's pre-staged doc edits ride along untouched.
- Files are PascalCase (`Store/TabsSlice.ts`). Biome formats on write; an Edit failing on whitespace means re-read and retry.
- Comments: one load-bearing *why* per file at most; none that restate a value or narrate the old shape. `KNOB` markers survive.
- Never two writers for one fact. A slot is written only by the tabs slice.
- Nothing O(tabs × N) on a store change: a selector may `find` over tabs; it may not walk the tree.
- Out of scope everywhere: `main/`, `preload/`, `shared/`, the warm cache's shape, `PageEmbed`, `MarkdownPM`, any keybinding, any visual change.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `Features/ArchitecturePM.md` §The Store | "the tree, the selection, tabs and their histories, the open page … live together" | the open page is per tab; selection is derived | 6 |
| `Features/ArchitecturePM.md` §Tabs, Warmth, and Navigation | "Warmth lives outside React, as per-tab snapshots plus a path-keyed detail slot" — still true, but the *current* page of a parked tab is now store state, not a warm read | slots | 6 |
| `Features/NavigationPM.md` / `InterfacePM.md` | any sentence naming `pageDetail`, `liveBody`, the `detail` prop, or `scope` — enumerated by the Derivation in Task 6 | retired names | 6 |
| `CLAUDE.md` codemap | "`store.ts` · The Zustand store holding renderer state" | a `Store/` folder holds the slices | 6 |
| `Planning/Codebase-Cleanup-Checklist.md` §Bundle 5 | "`pinnedTabs` … derive from `derivePinnedTabs`"; "deletes PreviewWindow's parallel body buffer"; "the store has none today" | one writer, not a selector; the buffer stays; `store.test.tsx` exists | 3 |
| `ContextPM.md` §Three | "Per-tab page state is modelled as global singletons"; "The store split" | both delivered | 6 |
| `Detail/ContentView.tsx` comment | "The page this surface will settle on is its TAB's, not the selection's …" | the host reads its slot | 1 |

**Dead Vocabulary**

- `pageStatus` · `pageDetail` · `pageError` · `pageFrozen` · `liveBody` · `setLiveBody` · `captureOutgoingDetail` · `PAGE_CLEARED` · `coldStampSeq` · `pageFetchSeq` · `sameShownTarget` · `SubfieldScope` · `openPageBody` → expect 0 in `src/renderer/src` outside tests. Legitimate hits: `pageDetail` as the `WarmEntry.pageDetail` field in `warmCache.ts` and its readers; `pageDetail` as a local variable name is allowed only inside `PageView` and `PageProperties` where it names the slot's detail.
- `s.selection` → expect 0. Legitimate hits: none.
- Control: `useSession` → 113 files at planning. Zero here means the sweep never ran.

**Hazard Window:** none. Every task leaves the app runnable.

---

### Phase 1 — Page state keys by tab

#### Task 1: The slot, the derived selection, and the one page-opener

**Requirement:** 1, 2, 3, 4, 6

**Why:** This is the re-key itself, and it is one commit because the singleton has one writer set (`select`, `syncActiveDetail`, `applyTree`, `resetNexusSession`, `reloadPage`, `mutate`) that must move together — a store with both a `pages` map and a `pageDetail` field is two writers for one fact, which the hard rules forbid even for a commit. Everything later in the plan (driven Subfield, hosts reading slots, the slice boundary) is a consequence of this shape. The shape: a slot carries its own target, status, detail, live body, and error, so every fence that was module-level becomes a field of the thing it fences.

**Files:**
- Modify: `Pommora/src/renderer/src/store.ts` — `SessionState` (the five fields, `selection`, `setLiveBody`, `select`, `reloadPage`), `PAGE_CLEARED`/`PAGE_CLEARED_UNFROZEN`, `sameShownTarget`, `pageFetchSeq`, `coldStampSeq`, `resetNexusSession`, `syncActiveDetail`, `captureOutgoingDetail`, `jumpActiveHistory`, `activateTab`, `openNewTab`, `closeTab`, `graduatePinCovered`, `unpinTab`, `applyTree` (the selection reconcile and the dropped-tab loop), `select`, `reloadPage`, `newPage`, `mutate` (`rename`, `delete`, `setIcon` arms), `openPageBody`.
- Modify: `Pommora/src/renderer/src/Detail/PageView.tsx` — drop the `detail` prop; read `s.pages[tabId]`; `pushLiveBody` calls `setPageBody(tabId, body)`.
- Modify: `Pommora/src/renderer/src/Detail/ContentView.tsx` — `useHosts` reads `s.pages`; `frozen` reads the active slot's status; `DetailView` and the slide effect read `selectionOf`.
- Modify: the active-page readers — `Toolbar/OutlineMenu.tsx`, `Frames/PageMenu.tsx`, `Properties/PageProperties.tsx`, `Embeds/connectionMenu.ts`, `Navigation/useNavThumbnails.ts`, `Detail/Subfield/subfieldItems.tsx`, `Detail/Subfield/CitationsToggle.tsx` — each swaps its selector for `activePage(s)`; the Subfield's `scope` mode is untouched here (Task 2).
- Modify: the selection readers — `Sidebar/Sidebar.tsx`, `Navigation/NavGallery.tsx`, `Detail/DetailScaffold.tsx`, `Detail/Subfield/Subfield.tsx`, `Embeds/ConnectionPane.tsx`, `Views/TableView/TableView.tsx`, `Views/CardView/CardsView.tsx` — `useSession((s) => s.selection)` becomes `useSession(selectionOf)`.
- Test: `Pommora/src/renderer/src/store.test.tsx` — `seed` and every `pageStatus`/`pageDetail`/`selection` expectation rewritten against `pages` and `selectionOf`.

**Derivation**
- `rg -F 's.selection' Pommora/src/renderer/src --glob '!*.test.*'` → 13 hits in 10 files at planning; all convert. Legitimate hits after: 0.
- `rg -F 'pageDetail' Pommora/src/renderer/src --glob '!*.test.*' --glob '!store.ts'` → 27 hits in 12 files at planning. Legitimate hits after: `warmCache.ts` (the `WarmEntry` field and its readers), `ContentView.tsx`'s `readWarm(...)?.pageDetail` is gone (hosts read slots).
- `rg -F 'liveBody' Pommora/src/renderer/src --glob '!*.test.*'` → 4 files at planning (`store.ts`, `PageView.tsx`, `subfieldItems.tsx`, `CitationsToggle.tsx`, `OutlineMenu.tsx`, `useNavThumbnails.ts`); all convert. Legitimate hits after: 0.
- Control: `rg -F 'useSession' Pommora/src/renderer/src -l` → 113.

**Interfaces**
- Produces, in `store.ts` (moved to `Store/TabsSlice.ts` by Task 4):

  ```ts
  export type PageTarget = { kind: 'page'; id: string; path: string }
  export type PageSlot =
    | { status: 'cold'; target: PageTarget; seq: number }      // fetch in flight, outgoing surface holds
    | { status: 'loading'; target: PageTarget; seq: number }   // deadline passed, placeholder shows
    | { status: 'ready'; target: PageTarget; detail: PageDetail; body: string }
    | { status: 'error'; target: PageTarget; error: PommoraError }
  pages: Record<string, PageSlot>
  setPageBody: (tabId: string, body: string) => void
  reloadPage: () => Promise<void>            // the active slot
  export const NONE: SelectionState = { kind: 'none' }
  export const selectionOf = (s: SessionState): SelectionState  // active tab's target, or NONE for a newtab or no tab
  export const activePage = (s: SessionState): PageSlot | undefined   // s.pages[s.activeTabId]
  export const activeDetail = (s: SessionState): PageDetail | null    // ready slot's detail, else null
  export const pageBody = (slot: PageSlot | undefined): string        // ready slot's live body, else ''
  ```
  `select(target, opts)` keeps its signature. Internally the page case becomes `openPageIn(tabId, target)`: read the tab's current slot; if it is ready and its target differs, `captureWarm(tabId, navKey(old.target), { pageDetail: { ...old.detail, body: old.body } })`; if warm has a same-path detail for the new target, write a ready slot; else write `cold` with a fresh per-slot `seq`, arm the deadline that flips `cold → loading` when `pages[tabId].seq` still matches, fetch, and land `ready`/`error` when it still matches. A tab moving to a non-page deletes its slot after the same capture.
- Assumed by: Task 2 (`pageBody`, `activePage`), Task 4 (the slice boundary), Task 5 (tests).

**Failure half:** a fetch landing after its tab closed → `pages[tabId]` is gone, `seq` cannot match, nothing writes. A fetch landing after the tab navigated again → `seq` differs, dropped. `activeTabId === ''` (never seeded) → `selectionOf` is `NONE`, `activePage` undefined. `setPageBody` on a tab with no ready slot → no-op. `applyTree` dropping a tab → its slot deleted with its warm entries. `resetNexusSession` → `pages: {}`. A rename mutation → every ready slot refetches (the cascade rewrites bodies nexus-wide), and warm clears as today.

**Survivors:** `warmCache.ts` unchanged — history warmth and embed rehydration are not the slot's job. `navSlide` and `crumbDepth` stay as they are; the slide effect in `ContentView` keys on `selectionOf` instead of `s.selection`. `COLD_SWAP_DEADLINE` stays a module constant. The `is-frozen` class stays; it reads `activePage(s)?.status === 'cold'`. `ContentView` keeps the last shown host while the active slot is `cold` — a `useRef` of the last host whose slot was ready, which is UI state and belongs there.

**Steps:**
- [ ] Rewrite `store.test.tsx`'s `seed` to take `pages` and the tests under "warm tabs" to assert on `activePage` / `selectionOf`; run `npm run test -- store.test` — expect the file red on type errors (the fields don't exist yet).
- [ ] In `store.ts`: add `PageSlot`, `pages`, `setPageBody`, `selectionOf`, `activePage`, `activeDetail`, `pageBody`; write `openPageIn`; rewrite `select`'s page case to call it and its non-page cases to delete the tab's slot (the `ensureContainerView` calls stay); delete `captureOutgoingDetail` and every call; delete `PAGE_CLEARED`, `PAGE_CLEARED_UNFROZEN`, `sameShownTarget` (the slide-stamp guard compares `selectionOf(s)` before and after the tab move), `pageFetchSeq`, `coldStampSeq`, `pageFrozen`, `liveBody`, `setLiveBody`, `openPageBody`, and the `selection` field; `syncActiveDetail` no longer clears page state (a tab keeps its slot when it stops being active); `closeTab`, `graduatePinCovered`, `unpinTab`, and `applyTree`'s dropped-tab loop delete the slot beside `dropWarmTab`; `mutate`'s `rename` arm refetches every ready slot, `delete` deletes any slot at that path, `setIcon` patches every ready slot at that path.
- [ ] `npm run typecheck` — expect the consumer list above as the complete error set; convert each. `PageView` reads `useSession((s) => s.pages[tabId])`; `ContentView.useHosts` builds hosts from `tabMru` where `s.pages[id]?.status === 'ready'`, one per path, `WARM_TABS` parked; `useNavThumbnails` reads `activePage` and `selectionOf`.
- [ ] Gates green. Count: `store.ts` code lines reported against 1,620.
- [ ] Launch (`env -u ELECTRON_RUN_AS_NODE npm run dev`): two page tabs, type in each, flip — text holds, no fetch; cold-open a third page — the outgoing view holds until the swap; Back/Forward within a tab is warm; close a tab; ⌘R restores.
- [ ] Commit: `refactor(store): a page belongs to its tab` — staging `store.ts`, `store.test.tsx`, and the converted files by name.

#### Task 2: The Subfield is driven

**Requirement:** 5

**Why:** With the body in the slot, the main pane can hand the Subfield `{ target, body }` exactly as the preview window already does — one mode, no `scope` parameter, no store-reading branch. It is the `PageHeader` ruling applied to the footer.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Subfield/subfieldItems.tsx` — `SubfieldScope` becomes `SubfieldPage = { target: PageTarget; body: string }`; `PageStatsItem` reads its prop only.
- Modify: `Pommora/src/renderer/src/Detail/Subfield/Subfield.tsx`, `CitationsToggle.tsx` — prop `page: SubfieldPage | null`; the crumb selection derives from `page?.target` or `selectionOf`.
- Modify: `Pommora/src/renderer/src/Detail/ContentView.tsx` — passes `page` built from `activePage(s)` (memoized on the slot).
- Modify: `Pommora/src/renderer/src/Windows/PageWindow.tsx` — its `scope` memo renames to `page`; the local `previewBody` stays.

**Derivation**
- `rg -F 'scope' Pommora/src/renderer/src/Detail/Subfield Pommora/src/renderer/src/Windows/PageWindow.tsx` → count at execution; every hit is either converted or is an unrelated word (`ViewSettingsScope` is not in these paths).
- Control: `rg -F 'Subfield' Pommora/src/renderer/src -l` → ≥ 6.

**Interfaces**
- Produces: `export type SubfieldPage = { target: PageTarget; body: string }`; `Subfield({ page })`, `CitationsToggle({ page })`.
- Assumed by: nothing later.

**Failure half:** `page` null on a page kind (slot cold/loading) → the stats item renders its empty state, as the unscoped branch did for `pageDetail === null`.

**Steps:**
- [ ] Convert the four files; `npm run typecheck` lists every other `scope` consumer — expect none outside them.
- [ ] Gates green; app: the main pane's word count follows typing; the preview's follows its own body; the crumbs under a preview stay non-clickable.
- [ ] Commit: `refactor(subfield): one driven footer`.

#### Task 3: One writer for the pinned tabs, and the preview target as a selector

**Requirement:** 7

**Why:** `pinnedTabs` has four writers (`load`, `applyTree`, `applyNavChanged`, `commitPinned`) that each inline `derivePinnedTabs(pinned, index)`; one `setPinned(pinned, index)` makes the derivation one line and the invariant "pinnedTabs is always pinned hydrated against the current index" a fact of the helper. `previewTarget` is `deriveTarget(preview)` — O(preview tabs), so it is a selector. Both belong to the slices Task 4 draws, so they are settled first.

**Files:**
- Modify: `Pommora/src/renderer/src/store.ts` — `setPinned`; the four writers; `previewTarget` field removed; `previewTargetOf` selector exported.
- Modify: every `previewTarget` reader (Derivation).
- Modify: `.claude/Planning/Codebase-Cleanup-Checklist.md` §Bundle 5 — the three claims in Made False rewritten.

**Derivation**
- `rg -F 'previewTarget' Pommora/src/renderer/src --glob '!*.test.*'` → count at execution; all convert to `previewTargetOf`. Legitimate hits after: the selector's definition.
- `rg -F 'derivePinnedTabs' Pommora/src/renderer/src/store.ts` → 4 at planning → 1 after.
- Control: `rg -F 'pinnedTabs' Pommora/src/renderer/src -l` → ≥ 3.

**Steps:**
- [ ] `setPinned`; convert the four; `previewTargetOf`; convert readers; gates green.
- [ ] App: pin, unpin, reorder a pin; a tree push that renames a pinned page re-titles the pin; open a preview and its tab strip target matches.
- [ ] Commit: `refactor(store): pinned tabs have one writer; the preview target is derived`.

#### Gate 1 — the singleton is gone
- [ ] Gate commands green, exit codes read directly.
- [ ] Dead Vocabulary sweep for the Phase 1 tokens (`pageStatus` … `openPageBody`, `s.selection`, `SubfieldScope`) → 0 against the control.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] `code-simplifier` then `comment-killer-agent` against `<base>..HEAD` scoped to the phase's paths; the reports cite files inside it; `KNOB` markers grep-verified after.
- [ ] `feature-dev:code-reviewer` against the same range; every concern fixed or ruled.
- [ ] The Acceptance sequence seen running.
- [ ] `store.ts` code-line delta recorded in Progress.

---

### Phase 2 — The file becomes slices

#### Task 4: The slice files and the composition root

**Requirement:** 8

**Why:** Nine domains sit in one file in three disjoint regions each; a reader looking for "what does closing a tab do" reads the interface at one line, the helper at another, and the action at a third. A slice file holds its state type, its initial state, its helpers, and its actions in one place, and its name is the answer. The boundaries are the ones Phase 1 drew: tabs, pages, history, and selection are one slice because `select` is their transaction; the preview and browser are one because `openNavPreview` morphs one into the other; the nexus lifecycle owns `applyTree` and `mutate` because both are tree writers. No behavior moves.

**Files:**
- Create, under `Pommora/src/renderer/src/Store/`:
  - `NexusSlice.ts` — `status`, `tree`, `error`, `load`, `applyTree`, `choose`, `openDropped`, `resetNexusSession` (spreading each slice's exported `perNexusInitial`), `openVia`, `mutate`, the system-accent and device-prefs module state.
  - `ChromeSlice.ts` — sidebar/ribbon/inspector widths and visibility, `subfieldExpanded`/`subfieldOrder`, `navWindowMode`/`navViewMode`, `settingsOpen`, `commands`; the width constants and `localStorage` readers.
  - `ConfigSlice.ts` — `personalization`, `devicePrefs`, `citationsShown` and its three writers, `citationsVisible`, `useEmbedScale`.
  - `TabsSlice.ts` — `tabs`, `activeTabId`, `tabMru`, `pages`, `crumbDepth`, `navSlide`, every tab action, `select`, `openPageIn`, `setPageBody`, `reloadPage`, `newPage`, `createFromMenu`, `newPageAdjacent`, `selectionOf`, `activePage`, `activeDetail`, `pageBody`, `PageSlot`, `NONE`.
  - `NavSlice.ts` — `recents`, `favorites`, `pinned`, `pinnedTabs`, `navBanner`, `navOpen`, `thumbVersions`, `assetMap`, `setPinned`, `writeNav`, `commitRecents`, `graduatePinCovered`, `ensureLiveActive`, every pin/favorite/recent action, `useAssetUrl`, `useAssetResolver`.
  - `PreviewSlice.ts` — `preview`, `previewsFile`, `previewSlide`, `previewExit`, `browserSummon`, `browserSeq`, every preview and browser action, `previewTargetOf`, `mirrorPreviews`, `reconcileRecord`, `commitPreview`.
  - `RenameSlice.ts` — the rename fence (`renamingPath` … `submitRename`), `iconPath`, `renamingProperty`, `valuesEpoch`, `submitPropertyRename`; `RenameClaim`, `resolveRenameWinner`, the token and orphan timer.
  - `CacheSlice.ts` — `linkTitles`, `activeViews`, `pageAliases`, `hostLocks` and their writers; the `wireViewAdopted` wiring.
  - `SessionState.ts` — `export type SessionState = NexusSlice & ChromeSlice & … & CacheSlice`; `export type Slice<T> = StateCreator<SessionState, [], [], T>`.
- Modify: `Pommora/src/renderer/src/store.ts` — becomes the composition root: `create<SessionState>()((...a) => ({ ...createNexusSlice(...a), … }))` plus re-exports of every name the 113 importers use (`useSession`, `SelectTarget`, `PreviewTarget`, `selectionOf`, `activePage`, `activeDetail`, `pageBody`, `previewTargetOf`, `citationsVisible`, `useEmbedScale`, `useAssetUrl`, `useAssetResolver`, `PageSlot`, `SubfieldPage`).
- Test: `Pommora/src/renderer/src/store.test.tsx` — unchanged in content; it imports from `./store` and stays the integration contract.

**Derivation**
- `rg -F "from '../store'" Pommora/src/renderer/src -l` plus the `./store` and `@renderer/store` spellings → 113 at planning; must be 113 after with zero edits in those files.
- Cross-slice calls: at execution, list every helper a slice calls from another (`get().select`, `ensureLiveActive`, `syncActiveDetail`, `clearWarm`, `mirrorPreviews`) — a helper called across two slices is an action on `SessionState`, never a bare import between slice files. Expect: `syncActiveDetail` and `ensureLiveActive` both become tabs-slice actions since `NavSlice` and `NexusSlice` call them.
- Control: `rg -F 'create<SessionState>' Pommora/src/renderer/src` → 1.

**Interfaces**
- Produces: `Slice<T>`; one `createXSlice: Slice<XSlice>` per file; `perNexusInitial` per slice that has per-nexus state (tabs, nav, preview, cache, chrome's subfield and modes).
- Assumed by: Task 5 (tests import slices by name only if a slice has pure logic worth a unit test — none is expected; the integration test stands), Task 6 (docs).

**Failure half:** none — the shape is a move. The negative control is the test suite and the typecheck: a helper left in the wrong file is a missing import, a field left out of a slice is a missing property on `SessionState`.

**Steps:**
- [ ] Create `SessionState.ts` and the eight slice files by moving code, not rewriting it; module state (`nextRenameToken`, `systemAccentCache`, …) moves with its slice.
- [ ] `store.ts` composes and re-exports; `npm run typecheck` — expect green with zero consumer edits; if a consumer needs an edit, the re-export list is incomplete — fix the list, not the consumer.
- [ ] Gates green; `store.test.tsx` passes without edits.
- [ ] App: the Acceptance sequence.
- [ ] Commit: `refactor(store): the session is nine slices in Store/`.

#### Task 5: Slice tests where a slice has logic of its own

**Requirement:** 9

**Why:** The Checklist asks for "slice tests"; the store already has a 530-line integration test, and a test that re-proves a move is ceremony. What earns a test is logic the re-key created: `openPageIn`'s fence (a fetch landing after close, after re-navigation, after a warm return), `selectionOf` (newtab, pinned active, empty), and `setPinned`'s invariant. The existing cold-swap tests cover most of the first; this task adds only what they miss.

**Files:**
- Test: `Pommora/src/renderer/src/store.test.tsx` — a `describe('store — page slots')` block: a fetch landing after `closeTab` writes nothing; a tab's slot survives `activateTab` away and back with no fetch; a rename mutation refetches every ready slot; `selectionOf` on a pinned active tab returns the pin's target.

**Steps:**
- [ ] Write the four; run — expect all green on the first run (they describe Task 1's behavior); if one is red, Task 1 has a defect — fix Task 1, record it in Deviations.
- [ ] Commit: `test(store): the slot's fences`.

#### Task 6: The documents

**Requirement:** 8, 9

**Why:** Every doc in Made False goes false at Task 1 or Task 4; they are rewritten here in one commit because they describe the finished shape, and a doc rewritten mid-phase describes a shape that lasts one commit.

**Files:**
- Modify: `.claude/Features/ArchitecturePM.md` §The Store (the store is per-tab pages plus derived selection; the slice files by name), §Tabs, Warmth, and Navigation (a parked tab's page is its slot; warmth is history).
- Modify: `.claude/Features/NavigationPM.md`, `InterfacePM.md` — per the Derivation.
- Modify: `.claude/CLAUDE.md` codemap — a `// Store` line under `src/renderer/src`.
- Modify: `.claude/ContextPM.md` — the two §Three items retire; the line counts.
- Modify: `.claude/Planning/Codebase-Cleanup-Checklist.md` §Bundle 5 — ticked, with the two deviations named.
- Modify: `.claude/HistoryPM.md` — one entry per phase, per `History-Format.md`.

**Derivation**
- `rg -F -e 'pageDetail' -e 'liveBody' -e 'detail prop' -e 'scope' .claude/Features .claude/Guidelines` (one token per command) → counts at execution; each hit rewritten or confirmed unrelated.
- Control: `rg -F 'useSession' .claude/Features` → ≥ 1.

**Steps:**
- [ ] Rewrite each; re-read ArchitecturePM §The Store whole.
- [ ] Commit: `docs: the store is per-tab pages in nine slices`.

#### Gate 2 — one store, nine files, nothing moved
- [ ] Gate commands green, exit codes read directly.
- [ ] Derivations re-run: 113 importers unchanged; Dead Vocabulary sweep → 0 against the control.
- [ ] `code-simplifier` then `comment-killer-agent` against `<base>..HEAD` scoped to `Store/`, `store.ts`; `KNOB` markers verified.
- [ ] `feature-dev:code-reviewer` against the same range; every concern fixed or ruled.
- [ ] The Acceptance sequence seen running once more on the split store.
- [ ] Progress hashes filled in; the code-line delta for the whole plan recorded against 1,620.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — Page state keys by tab · base `<commit>`
  - [ ] Task 1 — The slot, the derived selection, and the one page-opener · `<commit>`
  - [ ] Task 2 — The Subfield is driven · `<commit>`
  - [ ] Task 3 — One writer for the pinned tabs; the preview target as a selector · `<commit>`
- [ ] **Phase 2** — The file becomes slices · base `<commit>`
  - [ ] Task 4 — The slice files and the composition root · `<commit>`
  - [ ] Task 5 — Slice tests where a slice has logic of its own · `<commit>`
  - [ ] Task 6 — The documents · `<commit>`

### Rulings
### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- The `Core/` filing row moves `store.ts` and `Store/` together (RendererRefactor).
- Split view and a raised `WARM_TABS` land on `pages` (Checklist closing paragraph).
- The preview window's page as a store slot, if the tile embed path ever routes through the store — today `PageEmbed` owns its fetch, so the preview keeps a local body.
### Closeout
