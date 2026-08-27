## The Store Re-Key and Split — Implementation Plan

> **Status:** ratified — in execution (08-27, base `63a473fe`) · Spec: [[Codebase-Cleanup-Checklist]] §Bundle 5, the 08-21 Architecture Audit §The Store · Execute tasks in order.
> Citations name files and symbols; re-derive before editing. The Renderer Refactor moves folders under this plan's feet (`Detail/` → `Interface/`, `Tabs/` → `Navigation/`, root modules → `Core/`), so a path here is where the symbol lived when the plan was written.

**Goal**

The renderer's store holds a slot for every page that is open in any tab, not only the shown one, and lives as domain slice files composing one `useSession`. At the end: `pages: Record<pageId, PageSlot>` replaces the four singleton fields (`pageStatus`, `pageDetail`, `pageError`, `liveBody`); `pageFrozen` is derived; a `PageView` reads its own slot whether shown or parked, so the `detail` prop, the warm-cache read in `ContentView`, and the store's outgoing-page capture all go; the Subfield is driven by whichever host mounts it; and the 1,906-line file is seven files whose names answer "what state is this."

Why this shape. The singleton's workarounds have leaked into six files as a prop detour (`PageView.detail`), a bypass parameter (`Subfield.scope`), target-guessing (`ContentView.useHosts`), and a capture-before-mutate ordering rule (`captureOutgoingDetail`) that four callers must honor. A slot per open page deletes each of those rather than accommodating them. Slots key by **page id**, not tab id: a page is one document with one live body however many tabs point at it, a page id survives rename and pin/unpin where a tab id does not (a pinned tab's id is `pin:<key>`, an unpinned one's a UUID), and split view — two panes on one page — wants exactly one slot. `selection` stays a field: it is not a copy of the active tab's target but *what the pane is showing*, and during a cold page open it lags the tab by design — that lag is how pause-on-change works (`store.test.tsx` "a cold switch pauses on the outgoing view"). The invariant that makes the lag mean something: **the shown page's slot lives until the next selection lands**, so the one slot-pruner keeps the shown page beside the tabs' pages. The outgoing-page capture moves to where the page actually leaves the screen — `PageView`'s existing unmount `capture` seam, which already writes editor state under the tab that mounted it — so the store has no capture and no ordering rule. The re-key leads and the file split follows because the re-key draws the slice boundary. Alternatives weighed: splitting first (freezes the singleton into its own file); a second store for pages (the two-copies bug class the single store killed); keying by tab id (the pin/unpin id churn above, two live bodies for one file); deriving `selection` (deletes the pause); keeping `captureOutgoingDetail` with a smaller body (keeps the ordering rule and misses `openNewTab`, which never reaches `select`).

Bounds. One `useSession`, field-by-field subscription, main owns the data — unchanged. Zustand stays bare. The warm cache (`Tabs/warmCache.ts`) stays as the per-tab *history* store (Back/Forward warmth, embed rehydration), gaining only a clear generation; a slot is an open page's *current* state. Simplicity is the bound every task is judged by: a field that can be derived cheaply is derived; a fact has one writer and one deleter; nothing is added to handle a state the code cannot reach. This plan does not virtualize, does not touch `main/index.ts`, and does not add split view — it builds the state split view lands on.

**Requirements**

1. Page state is `pages: Record<string, PageSlot>` keyed by page id; a slot exists for the shown page and for every page some live tab (pinned or not) points at and has shown; `pageStatus`, `pageDetail`, `pageError`, `liveBody` are gone.
2. `selection` stays, typed and commented as the shown selection; the shown page's slot survives until the next selection lands; `pageFrozen` is derived by one selector using `sameShownTarget`.
3. `PageView({ tabId, pageId, parked })` reads `pages[pageId]`; hosts are keyed by page id; the `detail` prop is gone; `ContentView.useHosts` builds hosts from `pages`, never from the warm cache.
4. The Subfield and CitationsToggle take `page: SubfieldPage | null` from every host; the `scope` parameter and the store-reading mode are gone; only the two stats leaves subscribe to the live body.
5. `captureOutgoingDetail` is gone with its four callers; a page's detail and live body reach the warm cache through `PageView`'s unmount capture, beside the editor state, under the tab id current at capture time, and only while the warm generation it mounted under holds.
6. `pinnedTabs` has one writer; `previewTarget` is a selector; `deriveTarget` returns the stored target and stays the one definition.
7. The store is slice files under `src/renderer/src/Store/`, each a `StateCreator` over the full state, composed in `store.ts`; every existing `useSession` importer compiles unchanged.
8. Behavior holds: every existing store test passes, rewritten only where it seeded the retired fields; the eight running-app checks in Acceptance are seen; typing does not re-render the content pane.

**Acceptance — the whole thing working:** with four page tabs open (`WARM_TABS` is 2), type in tab A, visit B, C, D, return to A — A shows the typed text, `openPage` was not called, its scroll and undo history hold; cold-open a fifth page from A on a nexus where the fetch outlasts a frame — A holds frozen with no placeholder flash, and the slide plays once, on the new page; pin A's tab and unpin it — A's surface never remounts (an embedded webview keeps playing); rename a page linked from B while B is parked, return to B — B shows the healed link; open a page preview over B — the preview's Subfield count tracks the preview's body while the main pane's tracks B's; type a sentence with React DevTools profiling — `ContentView` does not commit; ⌘R — all tabs restore. And `rg -F pageDetail Pommora/src/renderer/src --glob '!*.test.*'` returns hits only at the allowlist in Dead Vocabulary.

**Forced By**

- `select` writes tabs, recents, breadcrumb depth, the slide stamp, the shown selection, and the page slot in one act → tabs, pages, selection, and history are one slice; pins ↔ tabs are bidirectional (`graduatePinCovered`, `ensureLiveActive`, `load`'s pin seeding) → the nav layer joins that slice.
- `select`'s record block moves the tab's target *before* the page case runs (`openTabModel` then the `switch`), and `jumpActiveHistory` moves it before calling `select` at all → no live tab points at the outgoing page during the pause; a pruner that keys on tabs alone deletes the frozen page. The pruner keeps `selection.id`.
- Zustand 5's `useStore` is `useSyncExternalStore` with no selector memo (`node_modules/zustand/react.js`) → every exported selector returns a stored reference, a primitive, or a module constant.
- `setPageBody` runs at `STATS_DEBOUNCE_MS` (120 ms) while typing → the slot reference churns at ~8 Hz; detail readers subscribe to `shownDetail` (identity-stable because `setPageBody` spreads the slot), readiness gates to `status`, and only the stats leaves to the body.
- `MarkdownEditor`'s `warm` prop is read at mount (`deps []`) and its unmount cleanup calls `warm.capture` → `PageView`'s capture closure is mount-frozen and reads the live slot and the current tab id through refs (hosts keyed by page id no longer remount when `activeTabId` changes under them — pin/unpin — so the tab id the seam captures under must be read at capture time).
- React commits after the store action that caused it → a capture at unmount always lands *after* `mutate`'s rename arm has run `clearWarm()`, and would refill the cache with the pre-cascade body. `warmCache` carries a generation that `clearWarm` bumps; a surface captures only if the generation it mounted under still holds. This also closes the latent case where a captured `editorState` survived a clear (masked today only because the store's capture, not the editor's, carried the detail the restore gate checks).
- `pinnedTabs` is stored because deriving it walks the tree and its readers are hot → it stays stored with one writer. The Checklist's "derive from `derivePinnedTabs`" is corrected in Task 3.
- Only the active tab ever fetches (every fetch runs through `select`) → one in-flight fence (`pageFetchSeq`) and one abandoned-slide fence (`coldStampSeq`) are correct and stay.
- `graduatePinCovered` and `unpinTab` never shrink the set of pointed-at page ids (a pinned target is covered by `pinnedTabs`; an unpin replaces the pin with a tab on the same target) → the pruner runs in two places: the end of `select` and `applyTabResult`, which `closeTab` and `applyTree`'s dropped-tab loop both route through.
- A rename's link cascade rewrites bodies nexus-wide, and today's `clearWarm()` is what tears parked editors down → the rename arm deletes every non-shown slot and reloads the shown one.
- `Embeds/connectionMenu.ts` calls `deriveTarget(preview)?.id` → `deriveTarget` stays; it returns the active page tab's stored `target` (a `PageTarget` is a `PreviewTarget`), and the sentinel tab yields null so the NavWindow's map tab never reads as a page.
- `PageEmbed` loads through the path-keyed detail cache, not the store → the preview's page is not a slot; the preview keeps its local body.
- 113 files import from `../store` → `store.ts` stays the composition root and the import path.
- The Renderer Refactor's `Core/` row is pending → `Store/` moves with `store.ts` when it lands.
- The working tree carries the refactor uncommitted → execution starts only on a committed tree; every commit stages explicit paths.

**Inherited Reasoning**

- `8c7df3bc` put alias memory in its own slice inside the file; this plan makes that the file boundary.
- `d0e1313e` reduced the page-state reset sites to two constants and ruled one blanket constant "would erase the reason." The reason was the singleton; a slot is deleted whole.
- The Audit ruled the singleton blocks within-window ambition (`WARM_TABS`, split view), not the locked multi-window seam.
- Cohesion-Rulings: "`PageHeader` stays driven rather than store-reading" — the Subfield joins it.
- Review round one: deriving `selection` and keying by tab id were attacked and fell. Round two: deleting the outgoing slot on "no tab points at it" kills the pause; capture inside `select` misses `activateTab` (which moves `activeTabId` first) and `openNewTab` (which never reaches `select`); a `loading` slot variant, a `NONE` constant, and a `frozenOf` read inside `select` were all found unnecessary. Round three: an unfenced unmount capture refills warm after a rename's `clearWarm()`; `applyTree`'s slot reconcile must spare the shown slot (Requirement 2); the seam's tab id goes stale without a remount. All folded; none re-litigated.

**Grounding**

- `Pommora/src/renderer/src/store.ts` — whole; `select`, `syncActiveDetail`, `captureOutgoingDetail`, `applyTabResult`, `applyTree`, `resetNexusSession`, `mutate`.
- `Pommora/src/renderer/src/store.test.tsx` — the cold-swap and warm-tab tests are the behavior contract.
- `Pommora/src/renderer/src/Tabs/warmCache.ts`; `MarkdownPM/index.tsx` (the mount effect's cleanup and `warm.capture`).
- `Pommora/src/renderer/src/Detail/ContentView.tsx` — `useHosts`, `WARM_TABS`, `is-frozen`, the slide effect, the footer fragment.
- `Pommora/src/renderer/src/Detail/PageView.tsx` — the `detail` prop, the three conditional selectors, `registerPageEditor`, `pushLiveBody`, the `warm` seam.
- `Pommora/src/renderer/src/Detail/Subfield/{Subfield,subfieldItems,CitationsToggle}.tsx` — `SubfieldScope`.
- `Pommora/src/renderer/src/Windows/PageWindow.tsx` — `previewBody`, the `scope` memo.
- `Pommora/src/renderer/src/Tabs/tabsModel.ts` (`pinTabId`, `openTab`, `derivePinnedTabs`), `Windows/windowTabs.ts` (`deriveTarget`), `selection.ts` (`reconcileWith`), `Embeds/connectionMenu.ts`.
- The active-page readers: `Navigation/useNavThumbnails.ts`, `Toolbar/OutlineMenu.tsx`, `Frames/PageMenu.tsx`, `Properties/PageProperties.tsx`, `Embeds/connectionMenu.ts`.
- `.claude/Planning/Codebase-Cleanup-Checklist.md` §Bundle 5; `Architecture Audit — Full-Codebase Report.md` §The Store; `RendererRefactor.md` the `Core/` row; `.claude/Guidelines/Cohesion-Rulings.md`; `.claude/Features/ArchitecturePM.md` §The Store, §Tabs, Warmth, and Navigation.

**Environment**

- Plan directory `.claude/Planning/`. Spec: the Checklist's Bundle 5 and the Audit's ruling, read whole.
- Explorer `Explore` · code reviewer `feature-dev:code-reviewer` · attack reviewer `build-breaking-agent` · neutral verifier `general-purpose` handed the claim and the spec · simplification `code-simplifier` then `comment-killer-agent`.
- Gates from `Pommora/`: `npm run typecheck` · `npm run test` · `npm run lint`, exit codes read directly. Baseline: all green; 294 test files, 3,653 tests; `store.ts` 1,620 code lines; the whole-diff code-line delta is the reported metric, with `store.ts`'s figure beside it.
- Rules: `.claude/Guidelines/` (Cohesion-Rulings, Build-Gotchas, Lint-And-Accessibility read).

**Shapes:** refactor (baseline 3,653 tests green; the eight running-app checks) · removal (inventory in Dead Vocabulary; deletion order is task order) · user-visible (tab flip, cold swap, pin/unpin, preview Subfield, restore, typing).

**Global Constraints (every task inherits these)**

- `npm run typecheck && npm run test && npm run lint` from `Pommora/`, exit codes read directly.
- No implementation edit before ratification. No task starts on a tree with uncommitted changes under `Pommora/src`.
- Stage explicit paths; never `git add -A` or a directory. Pre-staged doc edits ride along untouched.
- Files are PascalCase (`Store/NavigationSlice.ts`). Biome formats on write.
- Comments: at most one load-bearing *why* per file; none restating a value or narrating the old shape. `KNOB` markers survive.
- Never two writers for one fact. A slot is written only by the four named slot writers (`select`, `setPageBody`, `reloadPage`, `mutate`'s arms) and deleted only by `pruneSlots`, `applyTree`'s reconcile, and `resetNexusSession`.
- Selectors return stored references, primitives, or module constants — never a constructed object.
- Nothing O(tabs × N) on a store change: a selector may `find` over tabs; it may not walk the tree. Nothing subscribes to the live body except the two stats leaves.
- `PageTarget` is `Extract<SelectTarget, { kind: 'page' }>`, never a second declaration of that shape.
- Out of scope everywhere: `main/`, `preload/`, `shared/`, the warm cache's entry shape, `PageEmbed`, `MarkdownPM`, keybindings, any visual change.

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
| `MarkdownPM/index.tsx` cleanup comment | "this capture lands under the identity this editor mounted with — never the next tab's, even though the switch already updated the store" | the seam now resolves the tab id at capture time; the comment moves to `PageView`'s seam and says so | 1 |

**Dead Vocabulary**

- `pageStatus` · `pageError` · `pageFrozen` (as a field) · `liveBody` · `setLiveBody` · `captureOutgoingDetail` · `PAGE_CLEARED` · `PAGE_CLEARED_UNFROZEN` · `SubfieldScope` · `openPageBody` → expect 0 in `src/renderer/src` outside tests.
- `pageDetail` → legitimate hits: `warmCache.ts` (the `WarmEntry.pageDetail` field) and its readers/writers (`select`'s (c), `PageView`'s `warm.restore`/`capture`, `PageEmbed`'s rehydration); as a local name for a slot's detail. Everything else converts.
- Control: `useSession` → 113 files at planning. Zero means the sweep never ran.

**Hazard Window:** none. Every task leaves the app runnable.

---

### Phase 1 — A slot per open page

#### Task 1: The slot, the hosts, and the capture at unmount

**Requirement:** 1, 2, 3, 5

**Why:** This is the re-key, and it is one commit because the singleton's writers (`select`, `syncActiveDetail`, `applyTree`, `resetNexusSession`, `reloadPage`, `mutate`) must move together — a store carrying both `pages` and `pageDetail` is two writers for one fact. The slot holds a page's detail and live body; `selection` keeps the pause; the fetch fence stays one module counter because only the shown tab fetches; the outgoing capture moves to the surface's unmount, where the editor already captures its state under the tab that mounted it. `PageView` reads its slot; `ContentView` builds hosts from two named facts (the shown selection, the tab targets) and keys them by page id, so becoming shown, being parked, and being pinned are class changes, never remounts.

**Files:**
- Modify: `Pommora/src/renderer/src/store.ts` — `SessionState` (the four fields, `setLiveBody`, `select`, `reloadPage`), `PAGE_CLEARED`/`PAGE_CLEARED_UNFROZEN`, `resetNexusSession`, `syncActiveDetail`, `captureOutgoingDetail` and its four callers (`activateTab`, `openNewTab`, `jumpActiveHistory`, `select`), `applyTabResult`, `applyTree` (the selection reconcile and the dropped-tab loop), `select`, `reloadPage`, `mutate` (`rename`, `delete`, `setIcon` arms), `openPageBody`.
- Modify: `Pommora/src/renderer/src/Tabs/warmCache.ts` — `clearWarm` bumps a module generation; `warmGeneration()` exported.
- Modify: `Pommora/src/renderer/src/Detail/PageView.tsx` — props `{ tabId, pageId, parked }`; read `s.pages[pageId]`; `pushLiveBody` → `setPageBody(path, body)`; `warm.capture` reads the slot and tab id through refs and is gated on the mount-time generation.
- Modify: `Pommora/src/renderer/src/MarkdownPM/index.tsx` — the cleanup comment about the capture identity moves out (the seam owns that fact now); no code change.
- Modify: `Pommora/src/renderer/src/Detail/ContentView.tsx` — `useHosts`; `key={h.pageId}`; `frozen` reads `frozenOf`.
- Modify: the active-page readers — `Toolbar/OutlineMenu.tsx`, `Frames/PageMenu.tsx`, `Properties/PageProperties.tsx`, `Embeds/connectionMenu.ts` read `shownDetail`; `Navigation/useNavThumbnails.ts` subscribes to `shownPage(s)?.status` and reads the body through `getState()` at capture time as today; `Detail/Subfield/subfieldItems.tsx`, `CitationsToggle.tsx` read `shownDetail` and `pageBody(shownPage(s))` — the `scope` mode is untouched here (Task 2).
- Test: `Pommora/src/renderer/src/store.test.tsx` — `seed` takes `pages`; expectations on `pageStatus`/`pageDetail` read the slot; the capture test seeds warm directly (the capture is now the surface's).

**Derivation**
- `rg -F 'pageDetail' Pommora/src/renderer/src --glob '!*.test.*' --glob '!store.ts'` → 57 hits in 10 files at planning; re-run at execution; every hit outside the allowlist converts.
- `rg -F 'liveBody' Pommora/src/renderer/src --glob '!*.test.*'` → 7 files at planning (two are comments in `PageEmbed.tsx` and `PageWindow.tsx`); all convert or are rewritten.
- `rg -F 'pageFrozen' Pommora/src/renderer/src --glob '!*.test.*'` → `store.ts`, `ContentView.tsx` → 0 after.
- `rg -F 'captureOutgoingDetail' Pommora/src/renderer/src/store.ts` → 5 (definition + four callers) → 0.
- Control: `rg -F 'useSession' Pommora/src/renderer/src -l` → 113.

**Interfaces**
- Produces, in `store.ts` (moved to `Store/NavigationSlice.ts` by Task 4):

  ```ts
  export type PageTarget = { kind: 'page'; id: string; path: string }
  export type PageSlot =
    | { status: 'ready'; target: PageTarget; detail: PageDetail; body: string }
    | { status: 'error'; target: PageTarget; error: PommoraError }
  pages: Record<string, PageSlot>                    // keyed by page id; absent = not loaded
  setPageBody: (path: string, body: string) => void  // { ...slot, body } on the ready slot at that path; no-op otherwise
  reloadPage: () => Promise<void>                    // the shown page's slot
  export const shownPage = (s: SessionState): PageSlot | undefined
      // s.selection.kind === 'page' ? s.pages[s.selection.id] : undefined
  export const shownDetail = (s: SessionState): PageDetail | null   // ready → detail; identity-stable while typing
  export const pageBody = (slot: PageSlot | undefined): string       // ready → body, else ''
  export const frozenOf = (s: SessionState): boolean
      // the active tab (pinned or not) has a target that is not newtab and !sameShownTarget(s.selection, target)
  ```
  `select(target, opts)` keeps its signature. The frozen-clear branch at its top becomes `if (get().navSlide?.seq === coldStampSeq) set({ navSlide: null })`. Its page case, in order: **(b)** `pages[B]` is ready with `detail.path === target.path` → `set({ selection })`, done — the tab-switch-back and the same-tab re-select, no fetch; **(c)** warm has a same-path detail at `(tabId, navKey(B))` → write a ready slot from it (`body: cached.body`) and the selection, done; **(d)** cold: `seq = ++pageFetchSeq`, `coldStampSeq` as today, arm the deadline that writes `selection = B` alone if `seq` still holds (a missing slot is the placeholder), fetch, land `ready`/`error` plus `selection = B` if `seq` still holds. A non-page target sets the selection (the `ensureContainerView` calls stay). `pruneSlots()` runs at the end of every completed `select` and inside `applyTabResult`: keep a key if it is `selection.id` or some live tab's page target id.
- `warmCache.ts`: `let generation = 0`; `clearWarm` does `generation++`; `export const warmGeneration = (): number => generation`.
- `PageView`: `const live = useRef({ slot, tabId }); live.current = { slot, tabId }`; `const mountedGen = useRef(warmGeneration())`; `warm.capture: (state) => { if (warmGeneration() !== mountedGen.current) return; const { slot, tabId } = live.current; captureWarm(tabId, warmKey, slot?.status === 'ready' ? { ...state, pageDetail: { ...slot.detail, body: slot.body } } : state) }`. A host that never became ready captures editor state without a detail, and `restore`'s path gate then mounts cold, as today; a host unmounting after a clear captures nothing. `restore` reads `readWarm(live.current.tabId, warmKey)` at mount, which is the mount-time tab id — the same thing.
- `applyTree`'s reconcile: for every slot except `selection.id`, `reconcileWith(index, slot.target)`: gone → delete; path changed → delete (a parked one refetches on return). The shown slot is left for the existing selection reconcile, whose `select(next, { record: false })` lands a fresh slot over it at (d) — the pause holds meanwhile, and the editor never unmounts until the swap. `resetNexusSession` → `pages: {}`.
- Assumed by: Task 2 (`shownDetail`, `pageBody`), Task 4 (the slice boundary), Task 5 (tests).

**Failure half:** a fetch landing after the tab moved on → `seq` differs, dropped (today's fence). `activeTabId === ''` → `frozenOf` false, `shownPage` undefined. `setPageBody` for a path with no ready slot → no-op. A tab moving A → B → Back to A inside one round trip → (d) supersedes (d); A's slot is still present (the pruner has not run — `select` did not complete), so Back hits (b). A page whose surface is evicted past `WARM_TABS` → unmount capture writes its detail and body; return → (b) if some tab still points at it, else (c). A rename mutation → `clearWarm()` bumps the generation, the shown slot reloads, every other slot is deleted; the parked surfaces that unmount as a result capture nothing, and their pages return through (d) on the healed body. Pin or unpin the shown tab → the host's key (page id) holds, no remount, and a later capture lands under the pin id the seam reads at that moment. The shown page renamed or moved in-app or on disk → its slot is spared by the reconcile, the selection reconcile re-selects it, the pause holds, one swap at landing. `setIcon` on a page → its ready slot's `detail.frontmatter` patched, warm detail dropped. `delete` → its slot and its path-keyed detail dropped. Two tabs on one page (a ⌘-click plus Back can produce it) → one slot, one body, one surface — the intended semantics.

**Survivors:** `warmCache.ts` untouched. `navSlide`, `crumbDepth`, `sameShownTarget`, `pageFetchSeq`, `coldStampSeq`, `COLD_SWAP_DEADLINE` stay. `ContentView`'s slide effect keys on `selection` as today. `registerPageEditor` keys on `parked` as today. The host sort stays, by page id.

**Steps:**
- [x] Rewrite `store.test.tsx`'s `seed` and the warm-tab/cold-swap expectations against `pages` and `shownPage`; run `npm run test -- store.test` — expect type errors.
- [x] In `store.ts`: `PageSlot`, `pages`, `setPageBody`, `shownPage`, `shownDetail`, `pageBody`, `frozenOf`, `pruneSlots`; `select` as above; delete `captureOutgoingDetail` and its four calls, `PAGE_CLEARED`, `PAGE_CLEARED_UNFROZEN`, `pageFrozen`, `liveBody`, `setLiveBody`, `openPageBody`; `syncActiveDetail` keeps only the crumb reset and the `select`; `applyTree`'s reconcile; `mutate`'s three arms.
- [x] `npm run typecheck` — expect the consumer list above as the complete error set; convert each. `useHosts`: the shown host `{ tabId: activeTabId, pageId: selection.id }` when the selection is a page; parked hosts from `tabMru` where the tab's target is a page with a ready slot, one per page id, `WARM_TABS` deep; keyed and sorted by page id.
- [x] Gates green. Whole-diff code-line delta and `store.ts`'s figure reported against 1,620.
- [x] Launch: deferred to Nathan's live dev instance (HMR carries the change; the guideline forbids an agent-driven launch) — the first four Acceptance checks and the profiler check are Gate 1's running-thing pass.
- [x] Commit: `refactor(store): every open page has a slot` — staging by name.

#### Task 2: The Subfield is driven

**Requirement:** 4

**Why:** With the body in the slot, the main pane hands the Subfield `{ target, body }` exactly as the preview window does — one mode, no `scope`, no store-reading branch. The subscription to the body sits in the footer, not the pane: `ContentView`'s footer fragment becomes `ContentFooter`, the one component in the pane that reads `shownPage`, so typing re-renders the footer and nothing above it.

**Files:**
- Modify: `Pommora/src/renderer/src/Detail/Subfield/subfieldItems.tsx` — `SubfieldScope` becomes `SubfieldPage = { target: PageTarget; body: string }`; `PageStatsItem` reads its prop.
- Modify: `Subfield.tsx`, `CitationsToggle.tsx` — prop `page: SubfieldPage | null`; the crumb selection is `page?.target ?? selection`.
- Modify: `Pommora/src/renderer/src/Detail/ContentView.tsx` — the `showSubfield && (…)` fragment moves into `ContentFooter`, which subscribes to `shownPage` and builds `page` memoized on the slot.
- Modify: `Pommora/src/renderer/src/Windows/PageWindow.tsx` — the `scope` memo renames to `page`; `previewBody` stays.

**Derivation**
- `rg -F 'scope' Pommora/src/renderer/src/Detail/Subfield Pommora/src/renderer/src/Windows/PageWindow.tsx` → count at execution; each hit converts or is an unrelated word.
- Control: `rg -F 'Subfield' Pommora/src/renderer/src -l` → ≥ 6.

**Interfaces**
- Produces: `SubfieldPage`; `Subfield({ page })`, `CitationsToggle({ page })`; `ContentFooter` (module-private to `ContentView.tsx`).

**Failure half:** `page` null while the shown page is loading → the stats item renders its empty state; during a cold pause the shown slot is still the outgoing page's, so the footer keeps describing what is on screen, as today.

**Steps:**
- [x] Convert the four files; `npm run typecheck` lists every other `scope` consumer — expect none.
- [x] Gates green; app (Gate 1 pass): the main pane's count follows typing; the preview's follows its own body; crumbs under a preview stay inert; the profiler check holds.
- [x] Commit: `refactor(subfield): one driven footer`.

#### Task 3: One writer for the pinned tabs; the preview target is read, not stored

**Requirement:** 6

**Why:** `pinnedTabs` has four writers each inlining `derivePinnedTabs(pinned, index)`; one `setPinned(pinned, index)` makes the invariant a fact of the helper. `previewTarget` is stored and written at seven sites; `deriveTarget` already answers the question and has a consumer outside the store (`connectionMenu`), so it becomes the one definition — returning the active page tab's stored `target` (never a fresh object), null for the sentinel — and `previewTargetOf(s) = deriveTarget(s.preview)` deletes the field and its seven writes.

**Files:**
- Modify: `Pommora/src/renderer/src/Windows/windowTabs.ts` — `deriveTarget` returns `active.target` when `kind === 'page'`, else null; its return type is `PageTarget | null`.
- Modify: `Pommora/src/renderer/src/store.ts` — `setPinned`; the four writers; `previewTarget` field removed; `previewTargetOf` exported.
- Modify: every `previewTarget` reader (Derivation).
- Modify: `.claude/Planning/Codebase-Cleanup-Checklist.md` §Bundle 5 and the Audit §The Store — the claims in Made False rewritten.

**Derivation**
- `rg -F 'previewTarget' Pommora/src/renderer/src --glob '!*.test.*'` → count at execution; all convert. Legitimate hits after: the selector; `PreviewTarget` the type.
- `rg -F 'deriveTarget' Pommora/src/renderer/src` → `windowTabs.ts`, `store.ts`, `connectionMenu.ts` at planning; unchanged set after. `windowTabs.test.ts` asserts on `previewTarget`'s shape and gains `kind: 'page'` in the same commit.
- `rg -F 'derivePinnedTabs' Pommora/src/renderer/src/store.ts` → 4 → 1.
- Control: `rg -F 'pinnedTabs' Pommora/src/renderer/src -l` → ≥ 3.

**Steps:**
- [x] `deriveTarget`'s return; `setPinned`; convert the four; `previewTargetOf`; convert readers; gates green (`windowTabs.test.ts` may assert on a fresh object — invert it in the same commit).
- [x] App (Gate 1 pass): pin, unpin, reorder a pin; a renamed pinned page re-titles; a preview's tab strip matches its target; the NavWindow's map tab focuses its search.
- [x] Commit: `refactor(store): pinned tabs have one writer; the preview target is read off its tab`.

#### Gate 1 — the singleton is gone
- [x] Gate commands green, exit codes read directly (typecheck 0 · 294/3,653 · lint 0).
- [x] Dead Vocabulary sweep for the Phase 1 tokens → 0 against the control; `pageDetail` hits all on the allowlist.
- [x] Every task that diverged had its dependents re-derived and rewritten.
- [x] `code-simplifier` then `comment-killer-agent` against `<base>..HEAD` scoped to the phase's paths; `KNOB` grep-verified after.
- [x] `feature-dev:code-reviewer` against the same range; one finding (the stale capture-identity comment in `MarkdownPM/index.tsx`), fixed.
- [ ] The Acceptance sequence seen running — Nathan's pass on the live dev instance (HMR carries every Phase 1 commit).
- [x] The code-line deltas recorded in Progress.

---

### Phase 2 — The file becomes slices

#### Task 4: The slice files and the composition root

**Requirement:** 7

**Why:** Nine domains sit in one file in three disjoint regions each. A slice file holds its state type, its initial state, its helpers, and its actions in one place, and its name is the answer. Boundaries follow the transactions, not the field names: tabs, pages, selection, history, pins, recents, and favorites are one slice because `select`, `graduatePinCovered`, `ensureLiveActive`, and `load`'s restore all write across them; the preview, browser, and nav window are one because `openNav` opens the nav preview and `closeNav` mirrors it; the nexus lifecycle owns `applyTree` and `mutate` because both are tree writers. Seven files, because a boundary that forces a helper into the public state to cross it is the wrong boundary. The three genuine cross-slice acts are named actions, and `applyTree` shrinks to stabilize-set-reconcile because each slice's reconcile moves home with its state.

**Files:**
- Create, under `Pommora/src/renderer/src/Store/`:
  - `SessionState.ts` — `export type SessionState = NexusSlice & NavigationSlice & PreviewSlice & ChromeSlice & ConfigSlice & RenameSlice & CacheSlice`; `export type Slice<T> = StateCreator<SessionState, [], [], T>`.
  - `NexusSlice.ts` — `status`, `tree`, `error`, `load`, `applyTree`, `choose`, `openDropped`, `mutate`, `resetNexusSession` (spreads every slice's exported `perNexusInitial`), `openVia`; the system-accent and device-prefs module state.
  - `NavigationSlice.ts` — `tabs`, `activeTabId`, `tabMru`, `pages`, `selection`, `crumbDepth`, `navSlide`, `recents`, `favorites`, `pinned`, `pinnedTabs`, `navBanner`, `thumbVersions`; every tab, page, history, pin, favorite, recent, and thumbnail action; `select`, `setPageBody`, `reloadPage`, `newPage`, `createFromMenu`, `newPageAdjacent`; `shownPage`, `shownDetail`, `pageBody`, `frozenOf`; `PageSlot`, `PageTarget`; `reconcileNavigation(index)` (today's pin, selection, tab, and slot reconcile inside `applyTree`) and `restoreNavigation(nav, tabs)` (today's first-load restore block).
  - `PreviewSlice.ts` — `preview`, `previewsFile`, `previewSlide`, `previewExit`, `browserSummon`, `browserSeq`, `navOpen`; every preview, browser, and nav-window action; `previewTargetOf`; `reconcilePreview(index)`.
  - `ChromeSlice.ts` — `sidebarVisible`, `ribbonVisible`, `sidebarWidth`, `inspectorWidth`, `persistPaneWidths`, `subfieldExpanded`, `subfieldOrder`, `navWindowMode`, `navViewMode`, `settingsOpen`, `commands`; the width constants and `localStorage` readers.
  - `ConfigSlice.ts` — `personalization`, `devicePrefs`, `citationsShown` and its three writers; `citationsVisible`, `useEmbedScale`.
  - `RenameSlice.ts` — the rename fence, `iconPath`, `renamingProperty`, `valuesEpoch`, `submitPropertyRename`; `RenameClaim`, `resolveRenameWinner`, the token and orphan timer.
  - `CacheSlice.ts` — `linkTitles`, `activeViews`, `pageAliases`, `hostLocks`, `assetMap` and their writers; `useAssetUrl`, `useAssetResolver`; the `wireViewAdopted` wiring.
- Modify: `Pommora/src/renderer/src/store.ts` — the composition root: `create<SessionState>()((...a) => ({ ...createNexusSlice(...a), … }))` plus re-exports of every externally imported name (`useSession`, `SelectTarget`, `PreviewTarget`, `shownPage`, `shownDetail`, `pageBody`, `frozenOf`, `previewTargetOf`, `citationsVisible`, `useEmbedScale`, `useAssetUrl`, `PageSlot`, `PageTarget`, `SubfieldPage`).
- Test: `store.test.tsx` — unchanged; it imports from `./store`.

**Derivation**
- Importers: `rg -l -F "store'" Pommora/src/renderer/src --glob '*.ts' --glob '*.tsx'` → 113 at planning; 113 after with zero edits in those files.
- Cross-slice census, run before the first file is created and recorded in the Log: for each of the closure helpers in `store.ts`, the returned actions that call it. A helper called only from one slice's actions moves with that slice; a pure function moves to a module (`makeTabId`, `toPreviewRecord`, `stampByOrder`, `findContainer`, `parentPathOf`); a helper called from two slices' actions is one of the three named actions. A fourth cross-slice helper is a plan defect: stop, record it in Deviations, and rule on it — the boundary is not redrawn mid-task.
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

**Why:** The store has a 530-line integration test; a test that re-proves a move is ceremony. What earns a test is behavior the re-key created: a slot surviving a tab switch without a fetch; the shown page's slot surviving the pause after its tab moved on; a slot outliving one tab while another points at it and dying with the last; a rename deleting the parked slots and reloading the shown one, **and a return to a parked page after a rename fetching cold** (a warm entry captured under a stale generation is refused — the test the rename fence exists for); the shown slot spared by `applyTree` when its path changes; `frozenOf` across the pause.

**Files:**
- Test: `store.test.tsx` — a `describe('store — page slots')` block with those six; the rename-return case seeds warm after a `clearWarm()` the way an unmount capture would and asserts `openPage` is called.

**Steps:**
- [ ] Write the six; run — green on the first run, or Task 1 has a defect: fix Task 1, record in Deviations.
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
- [ ] Progress hashes filled in; the whole-diff and `store.ts` code-line deltas recorded.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — A slot per open page · base `63a473fe` · commits `f72d34de` `0b7a81ce` `eb4e03f6` `33d5a2bb` `6fa0e03d` · `store.ts` 1,620 → 1,587 code lines · Gate 1 green but for the running-thing pass
  - [x] Task 1 — The slot, the hosts, and the capture at unmount · `<commit>` · `store.ts` 1,620 → 1,612 code lines; whole diff −29
  - [x] Task 2 — The Subfield is driven · `<commit>` · `inert` marks a floating window's crumbs (the tab-neutral, no-click behavior the `scope` mode carried needs its own signal once every host passes a page)
  - [x] Task 3 — One writer for the pinned tabs; the preview target is read · `<commit>` · `store.ts` 1,596 code lines
- [ ] **Phase 2** — The file becomes slices · base `<commit>`
  - [ ] Task 4 — The slice files and the composition root · `<commit>`
  - [ ] Task 5 — Tests for what the re-key created · `<commit>`
  - [ ] Task 6 — The documents · `<commit>`

### Rulings
- (Claude, planning) `ChromeSlice` and `ConfigSlice` stay two files: no transaction crosses them, and "window furniture" and "the user's settings" are different answers to "what state is this." Not to be re-litigated at Task 4.

### Open Against Later Tasks
### Deviations
- Task 1 (simplification pass): `useHosts` subscribed to `s.pages`, which re-identifies per keystroke — the pane committed at ~8 Hz against Requirement 8. Fixed by `readyPageIds`, a primitive selector of the loaded ids; the composition root's re-export list gains it in Task 4.
- Task 1: the `MarkdownPM/index.tsx` capture-identity comment the plan said to move was left in place; removed at Gate 1.
### Lessons
### Sequenced After
- The `Core/` filing row moves `store.ts` and `Store/` together (RendererRefactor).
- Split view and a raised `WARM_TABS` land on `pages`; `registerPageEditor` (one published editor) and `ContentView`'s module-held `paneEl` are the two single-pane assumptions split view meets next.
- The preview window's page as a slot, if `PageEmbed` ever loads through the store — today it owns its fetch, so the preview keeps a local body.
### Closeout
