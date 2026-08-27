## The Store Re-Key and Split — Implementation Plan

> **Status:** written, pending review · Spec: [[Codebase-Cleanup-Checklist]] §Bundle 5, the 08-21 Architecture Audit §The Store · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. The Renderer Refactor moves folders under this plan's feet (`Detail/` → `Interface/`, `Tabs/` → `Navigation/`, root modules → `Core/`), so a path here is where the symbol lived when the plan was written.

**Goal**

The renderer's store holds a slot for every page that is open in any tab, not only the shown one, and lives as domain slice files composing one `useSession`. At the end: `pages: Record<pageId, PageSlot>` replaces the four singleton fields (`pageStatus`, `pageDetail`, `pageError`, `liveBody`); `pageFrozen` is derived; a `PageView` reads its own slot whether shown or parked, so the `detail` prop and the warm-cache read in `ContentView` go; the Subfield is driven by whichever host mounts it; and the 1,906-line file is seven files whose names answer "what state is this."

Why this shape. The singleton's workarounds have leaked into six files as a prop detour (`PageView.detail`), a bypass parameter (`Subfield.scope`), target-guessing (`ContentView.useHosts`), and a capture-before-mutate ordering rule (`captureOutgoingDetail`) that five callers must honor. A slot per open page deletes each of those rather than accommodating them. Slots key by **page id**, not tab id: a page is one document with one live body however many tabs point at it (the host already enforces one surface per page), a page id survives rename and pin/unpin where a tab id does not (a pinned tab's id is `pin:<key>`, an unpinned one's a UUID), and split view — two panes on one page — wants exactly one slot. `selection` stays a field: it is not a copy of the active tab's target but *what the pane is showing*, and during a cold page open it lags the tab by design — that lag is how pause-on-change works (`store.test.tsx` "a cold switch pauses on the outgoing view"). Deriving it would delete a shipped behavior; naming it correctly costs nothing. The re-key leads and the file split follows because the re-key draws the slice boundary. Alternatives weighed: splitting first (freezes the singleton into its own file); a second store for pages (the two-copies bug class the single store killed); keying by tab id (the pin/unpin id churn above, and two tabs on one page would be two live bodies for one file).

Bounds. One `useSession`, field-by-field subscription, main owns the data — unchanged. Zustand stays bare. The warm cache (`Tabs/warmCache.ts`) stays as the per-tab *history* store (Back/Forward warmth, embed rehydration); a slot is an open page's *current* state. Simplicity is the bound every task is judged by: a field that can be derived cheaply is derived; a helper two slices call is one named action, never a copy; nothing is added to handle a state the code cannot reach. This plan does not virtualize, does not touch `main/index.ts`, and does not add split view — it builds the state split view lands on.

**Requirements**

1. Page state is `pages: Record<string, PageSlot>` keyed by page id; a slot exists for every page some live tab (pinned or not) points at and has shown; the singleton fields `pageStatus`, `pageDetail`, `pageError`, `liveBody` are gone.
2. `selection` stays, typed and commented as the shown selection; `pageFrozen` is derived as "the active tab's target is not the shown selection" through one selector.
3. `PageView({ tabId, pageId, parked })` reads `pages[pageId]`; the `detail` prop is gone; `ContentView.useHosts` builds hosts from `pages`, never from the warm cache.
4. The Subfield and CitationsToggle take `page: SubfieldPage | null` from every host; the `scope` parameter and the store-reading mode are gone.
5. `captureOutgoingDetail` is gone; a tab's outgoing page is captured to warm inside `select`, the one place a tab's target moves.
6. `pinnedTabs` has one writer; `previewTarget` is a selector that returns a stored reference.
7. The store is slice files under `src/renderer/src/Store/`, each a `StateCreator` over the full state, composed in `store.ts`; every existing `useSession` importer compiles unchanged.
8. Behavior holds: every existing store test passes, rewritten only where it seeded the retired fields; the seven running-app checks in Acceptance are seen.

**Acceptance — the whole thing working:** with two page tabs open, type in tab A, switch to tab B, type there, switch back to A — A shows the typed text, `openPage` was not called, and its scroll holds; cold-open a third page from A on a nexus where the fetch outlasts a frame — A holds frozen and the slide plays once, on the new page; pin A's tab and unpin it — A never blanks; rename a page linked from B while B is parked, return to B — B shows the healed link; open a page preview over B — the preview's Subfield count tracks the preview's body while the main pane's tracks B's; ⌘R — both tabs restore. And `rg -F pageDetail Pommora/src/renderer/src --glob '!*.test.*'` returns hits only at the allowlist in Dead Vocabulary.

**Forced By**

- `select` writes tabs, recents, breadcrumb depth, the slide stamp, the shown selection, and the page slot in one act → tabs, pages, selection, and history are one slice; and pins ↔ tabs are bidirectional (`graduatePinCovered`, `ensureLiveActive`, `load`'s pin seeding) → the nav layer joins that slice rather than calling across a boundary.
- Zustand 5's `useStore` is `useSyncExternalStore` with no selector memo (`node_modules/zustand/react.js`) → a selector that builds an object re-renders forever; every exported selector returns a stored reference, a primitive, or a module constant.
- `pinnedTabs` is stored because deriving it walks the tree (`reconcileIndexOf`) and its readers are hot → it stays stored with one writer. The Checklist's "derive from `derivePinnedTabs`" is corrected in Task 3.
- The pause-on-change is `selection` lagging the tab until the fetch lands or `COLD_SWAP_DEADLINE` (`select`'s page case; the test at "a cold switch pauses") → `selection` stays a field; `pageFrozen` is exactly the lag and is derived.
- Only the active tab ever fetches (every fetch runs through `select`) → one in-flight fence (`pageFetchSeq`) is correct, not a singleton smell; it and `coldStampSeq` stay.
- A rename's link cascade rewrites bodies nexus-wide, and today's `clearWarm()` is what tears parked editors down so they remount on the healed body (`mutate`'s `rename` arm comment) → with slots making parked surfaces resident, the rename arm deletes every non-shown slot (they refetch cold on return) and reloads the shown one.
- `PageEmbed` (preview window, tiles) loads through the path-keyed detail cache, not the store → the preview's page is not a slot; the preview keeps its local body and passes it as `page`. The Checklist's "deletes PreviewWindow's parallel body buffer" is not delivered here.
- 113 files import from `../store` → `store.ts` stays the composition root and the import path.
- The Renderer Refactor's `Core/` row is pending → `Store/` moves with `store.ts` when it lands.
- The working tree carries the refactor uncommitted (`git status` at planning) → execution starts only on a committed tree; every commit stages explicit paths.

**Inherited Reasoning**

- `8c7df3bc` put alias memory in its own slice inside the file — a domain owns its initial state and writers; this plan makes that the file boundary.
- `d0e1313e` reduced the page-state reset sites to two constants and ruled one blanket constant "would erase the reason." The reason was the singleton; a slot is deleted whole.
- The Audit ruled the singleton blocks within-window ambition (`WARM_TABS`, split view), not the locked multi-window seam. Nothing here is multi-window work.
- Cohesion-Rulings: "`PageHeader` stays driven rather than store-reading" — the Subfield joins it.
- First review round (this plan's own): deriving `selection` and keying by tab id were both attacked and both fell — the findings are folded above, not re-litigated.

**Grounding**

- `Pommora/src/renderer/src/store.ts` — whole; `select`, `syncActiveDetail`, `captureOutgoingDetail`, `applyTree`, `resetNexusSession`, `mutate` are the joint transactions.
- `Pommora/src/renderer/src/store.test.tsx` — the cold-swap and warm-tab tests are the behavior contract.
- `Pommora/src/renderer/src/Tabs/warmCache.ts` — two caches; the slot replaces neither.
- `Pommora/src/renderer/src/Detail/ContentView.tsx` — `useHosts`, `WARM_TABS`, `is-frozen`, the slide effect.
- `Pommora/src/renderer/src/Detail/PageView.tsx` — the `detail` prop, the three conditional selectors, `registerPageEditor`, `pushLiveBody`.
- `Pommora/src/renderer/src/Detail/Subfield/{Subfield,subfieldItems,CitationsToggle}.tsx` — `SubfieldScope`.
- `Pommora/src/renderer/src/Windows/PageWindow.tsx` — `previewBody`, the `scope` memo.
- `Pommora/src/renderer/src/Tabs/tabsModel.ts` (`pinTabId`, `openTab`, `derivePinnedTabs`), `Windows/windowTabs.ts` (`deriveTarget`), `selection.ts` (`reconcileWith`).
- The active-page readers: `Navigation/useNavThumbnails.ts`, `Toolbar/OutlineMenu.tsx`, `Frames/PageMenu.tsx`, `Properties/PageProperties.tsx`, `Embeds/connectionMenu.ts`.
- `.claude/Planning/Codebase-Cleanup-Checklist.md` §Bundle 5; `Architecture Audit — Full-Codebase Report.md` §The Store; `RendererRefactor.md` the `Core/` row; `.claude/Guidelines/Cohesion-Rulings.md`; `.claude/Features/ArchitecturePM.md` §The Store, §Tabs, Warmth, and Navigation.

**Environment**

- Plan directory `.claude/Planning/`. Spec: the Checklist's Bundle 5 and the Audit's ruling, read whole.
- Explorer `Explore` · code reviewer `feature-dev:code-reviewer` · attack reviewer `build-breaking-agent` · neutral verifier `general-purpose` handed the claim and the spec · simplification `code-simplifier` then `comment-killer-agent`.
- Gates from `Pommora/`: `npm run typecheck` · `npm run test` · `npm run lint`, exit codes read directly. Baseline: all green; 294 test files, 3,653 tests; `store.ts` 1,620 code lines (blank and comment lines excluded).
- Rules: `.claude/Guidelines/` (Cohesion-Rulings, Build-Gotchas, Lint-And-Accessibility read).

**Shapes:** refactor (baseline 3,653 tests green; the seven running-app checks) · removal (inventory in Dead Vocabulary; deletion order is task order) · user-visible (tab flip, cold swap, pin/unpin, preview Subfield, restore).

**Global Constraints (every task inherits these)**

- `npm run typecheck && npm run test && npm run lint` from `Pommora/`, exit codes read directly.
- No implementation edit before ratification. No task starts on a tree with uncommitted changes under `Pommora/src`.
- Stage explicit paths; never `git add -A` or a directory. Pre-staged doc edits ride along untouched.
- Files are PascalCase (`Store/NavigationSlice.ts`). Biome formats on write.
- Comments: at most one load-bearing *why* per file; none restating a value or narrating the old shape. `KNOB` markers survive.
- Never two writers for one fact. A slot is written only by the navigation slice.
- Selectors return stored references, primitives, or module constants — never a constructed object.
- Nothing O(tabs × N) on a store change: a selector may `find` over tabs; it may not walk the tree.
- Out of scope everywhere: `main/`, `preload/`, `shared/`, the warm cache's shape, `PageEmbed`, `MarkdownPM`, keybindings, any visual change.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `Features/ArchitecturePM.md` §The Store | "the tree, the selection, tabs and their histories, the open page … live together" | every open page has a slot; the slice files by name | 6 |
| `Features/ArchitecturePM.md` §Tabs, Warmth, and Navigation | a parked tab's page is read from warmth | a parked tab's page is its slot; warmth is history | 6 |
| `Features/NavigationPM.md`, `InterfacePM.md` | any sentence naming `pageDetail`, `liveBody`, the `detail` prop, or `scope` — enumerated by Task 6's Derivation | retired names | 6 |
| `CLAUDE.md` codemap | "`store.ts` · The Zustand store holding renderer state" | a `Store/` folder holds the slices | 6 |
| `Planning/Codebase-Cleanup-Checklist.md` §Bundle 5 | "`pages: Record<tabId, …>`"; "`selection` derives from `(tabs, activeTabId)`"; "`pinnedTabs` … derive from `derivePinnedTabs`"; "deletes PreviewWindow's parallel body buffer"; "the store has none today" | keyed by page id; `selection` is the shown selection by design; one writer; the buffer stays; `store.test.tsx` exists | 3 |
| `Planning/Architecture Audit` §The Store | "`selection` is a hand-synchronized copy of the active tab's target" | it is the shown selection, and its lag is the pause | 3 |
| `ContextPM.md` §Three | "Per-tab page state is modelled as global singletons"; "The store split" | both delivered | 6 |
| `Detail/ContentView.tsx` comment | "The page this surface will settle on is its TAB's, not the selection's …" | hosts are built from named facts | 1 |

**Dead Vocabulary**

- `pageStatus` · `pageError` · `pageFrozen` (as a field) · `liveBody` · `setLiveBody` · `captureOutgoingDetail` · `PAGE_CLEARED` · `PAGE_CLEARED_UNFROZEN` · `SubfieldScope` · `openPageBody` → expect 0 in `src/renderer/src` outside tests.
- `pageDetail` → legitimate hits: `warmCache.ts` (the `WarmEntry.pageDetail` field) and its readers/writers (`select`'s capture, `PageView`'s `warm.restore`); as a local name for a slot's detail. Everything else converts.
- Control: `useSession` → 113 files at planning. Zero means the sweep never ran.

**Hazard Window:** none. Every task leaves the app runnable.

---

### Phase 1 — A slot per open page

#### Task 1: The slot, the hosts, and the one capture

**Requirement:** 1, 2, 3, 5

**Why:** This is the re-key, and it is one commit because the singleton's writers (`select`, `syncActiveDetail`, `applyTree`, `resetNexusSession`, `reloadPage`, `mutate`) must move together — a store carrying both `pages` and `pageDetail` is two writers for one fact. The slot holds a page's status, detail, and live body; `selection` keeps the pause; the fetch fence stays one module counter because only the shown tab fetches. `PageView` reads its slot; `ContentView` builds hosts from two named facts (the shown selection, the tab targets) instead of one guess.

**Files:**
- Modify: `Pommora/src/renderer/src/store.ts` — `SessionState` (the four fields, `setLiveBody`, `select`, `reloadPage`), `PAGE_CLEARED`/`PAGE_CLEARED_UNFROZEN`, `resetNexusSession`, `syncActiveDetail`, `captureOutgoingDetail` and its five callers (`activateTab`, `openNewTab`, `jumpActiveHistory`, `select`, and the `closeTab`/`applyTabResult` path), `applyTree` (the selection reconcile and the dropped-tab loop), `select`, `reloadPage`, `mutate` (`rename`, `delete`, `setIcon` arms), `openPageBody`.
- Modify: `Pommora/src/renderer/src/Detail/PageView.tsx` — props `{ tabId, pageId, parked }`; read `s.pages[pageId]`; `pushLiveBody` → `setPageBody(path, body)`.
- Modify: `Pommora/src/renderer/src/Detail/ContentView.tsx` — `useHosts`; `frozen` reads `frozenOf`.
- Modify: the active-page readers — `Toolbar/OutlineMenu.tsx`, `Frames/PageMenu.tsx`, `Properties/PageProperties.tsx`, `Embeds/connectionMenu.ts`, `Navigation/useNavThumbnails.ts`, `Detail/Subfield/subfieldItems.tsx`, `Detail/Subfield/CitationsToggle.tsx` — each reads `shownPage(s)`; the Subfield's `scope` mode is untouched here (Task 2).
- Test: `Pommora/src/renderer/src/store.test.tsx` — `seed` takes `pages`; expectations on `pageStatus`/`pageDetail` read the slot.

**Derivation**
- `rg -F 'pageDetail' Pommora/src/renderer/src --glob '!*.test.*' --glob '!store.ts'` → 57 hits in 10 files at planning; re-run at execution; every hit outside the allowlist converts.
- `rg -F 'liveBody' Pommora/src/renderer/src --glob '!*.test.*'` → 7 files at planning (two are comments in `PageEmbed.tsx` and `PageWindow.tsx`); all convert or are rewritten.
- `rg -F 'pageFrozen' Pommora/src/renderer/src --glob '!*.test.*'` → `store.ts`, `ContentView.tsx` at planning → 0 after (the selector is `frozenOf`).
- Control: `rg -F 'useSession' Pommora/src/renderer/src -l` → 113.

**Interfaces**
- Produces, in `store.ts` (moved to `Store/NavigationSlice.ts` by Task 4):

  ```ts
  export type PageTarget = { kind: 'page'; id: string; path: string }
  export type PageSlot =
    | { status: 'loading'; target: PageTarget }
    | { status: 'ready'; target: PageTarget; detail: PageDetail; body: string }
    | { status: 'error'; target: PageTarget; error: PommoraError }
  pages: Record<string, PageSlot>                    // keyed by page id
  setPageBody: (path: string, body: string) => void  // the live buffer; no-op unless a ready slot has that path
  reloadPage: () => Promise<void>                    // the shown page's slot
  export const NONE: SelectionState = { kind: 'none' }
  export const shownPage = (s: SessionState): PageSlot | undefined
      // s.selection.kind === 'page' ? s.pages[s.selection.id] : undefined
  export const shownDetail = (s: SessionState): PageDetail | null
  export const pageBody = (slot: PageSlot | undefined): string   // ready → body, else ''
  export const frozenOf = (s: SessionState): boolean
      // the active tab's target (pinned or not) is not the shown selection; newtab counts as none
  ```
  `select(target, opts)` keeps its signature. Its page case, in order: **(a)** the tab moved from page A to a different target → `captureWarm(tabId, navKey(A), { pageDetail: {...slotA.detail, body: slotA.body} })` from A's slot, *if* no other live tab points at A delete `pages[A]`; **(b)** `pages[B]` is ready with `detail.path === target.path` → `set({ selection })`, done — this is the tab-switch-back and the same-tab re-select, and it fetches nothing; **(c)** warm has a same-path detail for `(tabId, navKey(B))` → write a ready slot from it and the selection, done; **(d)** cold: `seq = ++pageFetchSeq`, `coldStampSeq` as today, arm the deadline that writes `pages[B] = loading` and `selection = B` if `seq` still holds, fetch, land `ready`/`error` and `selection = B` if `seq` still holds. A non-page target runs (a) and sets the selection. Nothing else in the store writes a slot except `reloadPage`, `setPageBody`, `mutate`'s three arms, and the two deleters below.
- Slot deletion: `applyTree`'s reconcile — for every slot, `reconcileWith(index, slot.target)`: gone → delete; path changed → delete (the shown one is re-selected by the existing selection reconcile and refetches; a parked one refetches cold on return); `closeTab`/`applyTree`'s dropped-tab loop/`graduatePinCovered`/`unpinTab` → nothing, because a page id is not a tab id — a slot outlives its tabs only until (a) or the reconcile prunes it, and `pruneSlots()` after those four is one `for` over `pages` keeping keys some live tab (pinned or not) points at. `resetNexusSession` → `pages: {}`.
- Assumed by: Task 2 (`shownPage`, `pageBody`), Task 4 (the slice boundary), Task 5 (tests).

**Failure half:** a fetch landing after the tab moved on → `seq` differs, dropped (today's fence). `activeTabId === ''` → `frozenOf` false, `shownPage` undefined. `setPageBody` for a path with no ready slot → no-op. A tab moving A → B → Back to A inside one round trip → (d) supersedes (d); the warm capture at (a) ran before the first fetch. A rename mutation → the shown slot reloads; every other slot is deleted and warm clears, as today. A `setIcon` on a page → its slot's `detail.frontmatter` patched if ready, warm detail dropped, as today. A `delete` → its slot and its path-keyed detail dropped.

**Survivors:** `warmCache.ts` untouched. `navSlide`, `crumbDepth`, `sameShownTarget`, `pageFetchSeq`, `coldStampSeq`, `COLD_SWAP_DEADLINE` stay — they fence the one fetch in flight and the one slide, and the pause is unchanged. `ContentView`'s slide effect keys on `selection` as today. `registerPageEditor` keys on `parked` as today; the shown host is the active tab when the selection is a page.

**Steps:**
- [ ] Rewrite `store.test.tsx`'s `seed` and the warm-tab/cold-swap expectations against `pages` and `shownPage`; run `npm run test -- store.test` — expect type errors (the fields don't exist yet).
- [ ] In `store.ts`: `PageSlot`, `pages`, `setPageBody`, `shownPage`, `shownDetail`, `pageBody`, `frozenOf`; `select`'s page case as (a)–(d) and its non-page cases as (a) plus the selection (the `ensureContainerView` calls stay); delete `captureOutgoingDetail` and every call; delete `PAGE_CLEARED`, `PAGE_CLEARED_UNFROZEN`, `pageFrozen`, `liveBody`, `setLiveBody`, `openPageBody`; `syncActiveDetail` keeps only the crumb reset and the `select`; `applyTree`'s reconcile prunes slots as above; `pruneSlots()` after the four tab-set shrinkers; `mutate`'s three arms.
- [ ] `npm run typecheck` — expect the consumer list above as the complete error set; convert each. `useHosts`: the shown host `{ tabId: activeTabId, pageId: selection.id }` when the selection is a page; parked hosts from `tabMru` where the tab's target is a page with a ready slot, one per page id, `WARM_TABS` deep; sorted by tab id as today.
- [ ] Gates green. `store.ts` code lines reported against 1,620.
- [ ] Launch (`env -u ELECTRON_RUN_AS_NODE npm run dev`): the first four Acceptance checks.
- [ ] Commit: `refactor(store): every open page has a slot` — staging `store.ts`, `store.test.tsx`, and the converted files by name.

#### Task 2: The Subfield is driven

**Requirement:** 4

**Why:** With the body in the slot, the main pane hands the Subfield `{ target, body }` exactly as the preview window does — one mode, no `scope`, no store-reading branch. The `PageHeader` ruling applied to the footer.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Subfield/subfieldItems.tsx` — `SubfieldScope` becomes `SubfieldPage = { target: PageTarget; body: string }`; `PageStatsItem` reads its prop.
- Modify: `Subfield.tsx`, `CitationsToggle.tsx` — prop `page: SubfieldPage | null`; the crumb selection is `page?.target ?? selection`.
- Modify: `Pommora/src/renderer/src/Detail/ContentView.tsx` — passes `page` from `shownPage(s)`, memoized on the slot reference.
- Modify: `Pommora/src/renderer/src/Windows/PageWindow.tsx` — the `scope` memo renames to `page`; `previewBody` stays.

**Derivation**
- `rg -F 'scope' Pommora/src/renderer/src/Detail/Subfield Pommora/src/renderer/src/Windows/PageWindow.tsx` → count at execution; each hit converts or is an unrelated word.
- Control: `rg -F 'Subfield' Pommora/src/renderer/src -l` → ≥ 6.

**Interfaces**
- Produces: `SubfieldPage`; `Subfield({ page })`, `CitationsToggle({ page })`.

**Failure half:** `page` null while the shown page is loading → the stats item renders its empty state; during a cold pause the shown slot is still the outgoing page's, so the footer keeps describing what is on screen, as today.

**Steps:**
- [ ] Convert the four files; `npm run typecheck` lists every other `scope` consumer — expect none.
- [ ] Gates green; app: the main pane's count follows typing; the preview's follows its own body; crumbs under a preview stay inert.
- [ ] Commit: `refactor(subfield): one driven footer`.

#### Task 3: One writer for the pinned tabs; the preview target is read, not stored

**Requirement:** 6

**Why:** `pinnedTabs` has four writers each inlining `derivePinnedTabs(pinned, index)`; one `setPinned(pinned, index)` makes the invariant a fact of the helper. `previewTarget` is stored and written at seven sites (`commitPreview`, `openPreview`, `openNavPreview`, `closeNav`, `closePreview`, `openVia`, `resetNexusSession`); a selector returning the active preview tab's stored `target` (a `SelectTarget` — `{ id, path }` reads off it) deletes all seven. It must return the reference, not `deriveTarget`'s fresh object.

**Files:**
- Modify: `Pommora/src/renderer/src/store.ts` — `setPinned`; the four writers; `previewTarget` field removed; `previewTargetOf` exported; `deriveTarget` import dropped if unused.
- Modify: every `previewTarget` reader (Derivation).
- Modify: `.claude/Planning/Codebase-Cleanup-Checklist.md` §Bundle 5 and the Audit §The Store — the claims in Made False rewritten.

**Derivation**
- `rg -F 'previewTarget' Pommora/src/renderer/src --glob '!*.test.*'` → count at execution; all convert. Legitimate hits after: the selector's definition; `PreviewTarget` the type.
- `rg -F 'derivePinnedTabs' Pommora/src/renderer/src/store.ts` → 4 at planning → 1 after.
- Control: `rg -F 'pinnedTabs' Pommora/src/renderer/src -l` → ≥ 3.

**Steps:**
- [ ] `setPinned`; convert the four; `previewTargetOf`; convert readers; gates green.
- [ ] App: pin, unpin, reorder a pin; a renamed pinned page re-titles; a preview's tab strip matches its target.
- [ ] Commit: `refactor(store): pinned tabs have one writer; the preview target is read off its tab`.

#### Gate 1 — the singleton is gone
- [ ] Gate commands green, exit codes read directly.
- [ ] Dead Vocabulary sweep for the Phase 1 tokens → 0 against the control; `pageDetail` hits all on the allowlist.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] `code-simplifier` then `comment-killer-agent` against `<base>..HEAD` scoped to the phase's paths; `KNOB` grep-verified after.
- [ ] `feature-dev:code-reviewer` against the same range; every concern fixed or ruled.
- [ ] The Acceptance sequence seen running.
- [ ] `store.ts` code-line delta recorded in Progress.

---

### Phase 2 — The file becomes slices

#### Task 4: The slice files and the composition root

**Requirement:** 7

**Why:** Nine domains sit in one file in three disjoint regions each. A slice file holds its state type, its initial state, its helpers, and its actions in one place, and its name is the answer. Boundaries follow the transactions, not the field names: tabs, pages, selection, history, pins, recents, and favorites are one slice because `select`, `graduatePinCovered`, `ensureLiveActive`, and `load`'s restore all write across them; the preview and browser are one because `openNavPreview` morphs one into the other; the nexus lifecycle owns `applyTree` and `mutate` because both are tree writers. Seven files, not nine, because a boundary that forces a helper into the public state to cross it is the wrong boundary. The few genuine cross-slice acts are named actions.

**Files:**
- Create, under `Pommora/src/renderer/src/Store/`:
  - `SessionState.ts` — `export type SessionState = NexusSlice & NavigationSlice & PreviewSlice & ChromeSlice & ConfigSlice & RenameSlice & CacheSlice`; `export type Slice<T> = StateCreator<SessionState, [], [], T>`.
  - `NexusSlice.ts` — `status`, `tree`, `error`, `load`, `applyTree`, `choose`, `openDropped`, `mutate`, `resetNexusSession` (spreads every slice's exported `perNexusInitial`), `openVia`; the system-accent and device-prefs module state.
  - `NavigationSlice.ts` — `tabs`, `activeTabId`, `tabMru`, `pages`, `selection`, `crumbDepth`, `navSlide`, `recents`, `favorites`, `pinned`, `pinnedTabs`, `navBanner`, `thumbVersions`, `navOpen`; every tab, page, history, pin, favorite, recent, and thumbnail action; `select`, `setPageBody`, `reloadPage`, `newPage`, `createFromMenu`, `newPageAdjacent`; the selectors `shownPage`, `shownDetail`, `pageBody`, `frozenOf`, `NONE`; `PageSlot`, `PageTarget`. Two actions exist so the nexus slice can call them by name: `reconcileNavigation(index)` (today's tab, pin, selection, and slot reconcile inside `applyTree`) and `restoreNavigation(nav, tabs, previews)` (today's first-load restore block).
  - `PreviewSlice.ts` — `preview`, `previewsFile`, `previewSlide`, `previewExit`, `browserSummon`, `browserSeq`; every preview and browser action; `previewTargetOf`; `reconcilePreview(index)` (today's preview reconcile inside `applyTree`).
  - `ChromeSlice.ts` — `sidebarVisible`, `ribbonVisible`, `sidebarWidth`, `inspectorWidth`, `persistPaneWidths`, `subfieldExpanded`, `subfieldOrder`, `navWindowMode`, `navViewMode`, `settingsOpen`, `commands`; the width constants and `localStorage` readers.
  - `ConfigSlice.ts` — `personalization`, `devicePrefs`, `citationsShown` and its three writers; `citationsVisible`, `useEmbedScale`.
  - `RenameSlice.ts` — the rename fence, `iconPath`, `renamingProperty`, `valuesEpoch`, `submitPropertyRename`; `RenameClaim`, `resolveRenameWinner`, the token and orphan timer.
  - `CacheSlice.ts` — `linkTitles`, `activeViews`, `pageAliases`, `hostLocks`, `assetMap` and their writers; `useAssetUrl`, `useAssetResolver`; the `wireViewAdopted` wiring.
- Modify: `Pommora/src/renderer/src/store.ts` — the composition root: `create<SessionState>()((...a) => ({ ...createNexusSlice(...a), … }))` plus re-exports of every externally imported name (`useSession`, `SelectTarget`, `PreviewTarget`, `shownPage`, `shownDetail`, `pageBody`, `frozenOf`, `previewTargetOf`, `citationsVisible`, `useEmbedScale`, `useAssetUrl`, `PageSlot`, `SubfieldPage`).
- Test: `store.test.tsx` — unchanged; it imports from `./store`.

**Derivation**
- Importers: `rg -l -F "store'" Pommora/src/renderer/src --glob '*.ts' --glob '*.tsx'` → 113 at planning; 113 after with zero edits in those files.
- Cross-slice census, run before the first file is created: for each closure helper in `store.ts`, list the returned actions that call it; a helper called only from one slice's actions moves with that slice; a helper called from two slices' actions is one of the three named actions above (`reconcileNavigation`, `reconcilePreview`, `restoreNavigation`) or a pure function moved to a module (`makeTabId`, `toPreviewRecord`, `stampByOrder`, `findContainer`, `parentPathOf`). If the census finds a fourth cross-slice helper, it becomes a named action and is recorded in Deviations — the boundary is not redrawn.
- Control: `rg -F 'create<SessionState>' Pommora/src/renderer/src` → 1.

**Interfaces**
- Produces: `Slice<T>`; one `createXSlice: Slice<XSlice>` per file; `perNexusInitial` from each slice holding per-nexus state (navigation, preview, cache, chrome's subfield and modes).

**Failure half:** none — a move. The negative control is the typecheck and the suite: a helper in the wrong file is a missing import; a field left out of a slice is a missing property on `SessionState`.

**Steps:**
- [ ] Run the census; record its table in the Log.
- [ ] Create `SessionState.ts` and the seven slice files by moving code; module state moves with its slice.
- [ ] `store.ts` composes and re-exports; `npm run typecheck` — green with zero consumer edits, or the re-export list is incomplete.
- [ ] Gates green; `store.test.tsx` passes unedited.
- [ ] App: the Acceptance sequence.
- [ ] Commit: `refactor(store): the session is seven slices in Store/`.

#### Task 5: Tests for what the re-key created

**Requirement:** 8

**Why:** The store has a 530-line integration test; a test that re-proves a move is ceremony. What earns a test is behavior the re-key created: a slot surviving a tab switch without a fetch; a slot outliving one tab while another points at it; a rename deleting the parked slots and reloading the shown one; `frozenOf` across the pause.

**Files:**
- Test: `store.test.tsx` — a `describe('store — page slots')` block with those four.

**Steps:**
- [ ] Write the four; run — green on the first run, or Task 1 has a defect: fix Task 1, record in Deviations.
- [ ] Commit: `test(store): the slots`.

#### Task 6: The documents

**Requirement:** 7, 8

**Why:** Every doc in Made False went false at Task 1 or 4; they are rewritten here in one commit because they describe the finished shape.

**Files:**
- Modify: `.claude/Features/ArchitecturePM.md` §The Store, §Tabs, Warmth, and Navigation; `NavigationPM.md`, `InterfacePM.md` per the Derivation; `.claude/CLAUDE.md` codemap (a `// Store` line); `ContextPM.md` (the two §Three items retire; the counts); `Codebase-Cleanup-Checklist.md` §Bundle 5 ticked with its deviations named; `HistoryPM.md` one entry per phase per `History-Format.md`.

**Derivation**
- `rg -F 'pageDetail' .claude/Features .claude/Guidelines` · `rg -F 'liveBody' …` · `rg -F 'detail prop' …` · `rg -F 'scope' …` (one token per command) → counts at execution; each hit rewritten or confirmed unrelated.
- Control: `rg -F 'useSession' .claude/Features` → ≥ 1.

**Steps:**
- [ ] Rewrite each; re-read ArchitecturePM §The Store whole.
- [ ] Commit: `docs: every open page has a slot; the store is seven slices`.

#### Gate 2 — one store, seven files, nothing moved
- [ ] Gate commands green, exit codes read directly.
- [ ] Derivations re-run: 113 importers unchanged; Dead Vocabulary → 0 against the control.
- [ ] `code-simplifier` then `comment-killer-agent` against `<base>..HEAD` scoped to `Store/`, `store.ts`; `KNOB` verified.
- [ ] `feature-dev:code-reviewer` against the same range; every concern fixed or ruled.
- [ ] The Acceptance sequence seen running on the split store.
- [ ] Progress hashes filled in; the plan's code-line delta recorded against 1,620.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — A slot per open page · base `<commit>`
  - [ ] Task 1 — The slot, the hosts, and the one capture · `<commit>`
  - [ ] Task 2 — The Subfield is driven · `<commit>`
  - [ ] Task 3 — One writer for the pinned tabs; the preview target is read · `<commit>`
- [ ] **Phase 2** — The file becomes slices · base `<commit>`
  - [ ] Task 4 — The slice files and the composition root · `<commit>`
  - [ ] Task 5 — Tests for what the re-key created · `<commit>`
  - [ ] Task 6 — The documents · `<commit>`

### Rulings
### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- The `Core/` filing row moves `store.ts` and `Store/` together (RendererRefactor).
- Split view and a raised `WARM_TABS` land on `pages`; `registerPageEditor` (one published editor) and `ContentView`'s module-held `paneEl` are the two single-pane assumptions split view meets next.
- The preview window's page as a slot, if `PageEmbed` ever loads through the store — today it owns its fetch, so the preview keeps a local body.
### Closeout
