## Navigation Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliberate navigation intent — pinned, favorites, the NavView banner — lives in one `.nexus/navigation.json`; the recents trail stays its one db row; every stored reference everywhere is a bare `{kind, id}` structurally incapable of going stale; and every trace of the previous design is erased.

**Architecture:** One shared `NavigationState` contract over one read and one write channel, with **one validation boundary** — the IO module routes `recents` to the db row and the other keys to the file internally, and every ref entering or leaving either store passes the same validator/cleaner. The file write is a serialized patch (each writer owns its keys); the recents row stays a synchronous upsert needing no debounce, no flush, no ordering rules. The renderer store owns three plain arrays where position is the order. Persisted tabs/previews go ID-only with a single restore-time hydrator that prunes dead refs, mints paths, and recomputes the history pointer. The decisions and locked-decision reconciliations live in [[Navigation Consolidation — Decision Log]]; the Swift Parity Removal plan runs first.

**Tech Stack:** Electron main + React renderer, TypeScript, zod-free hand validation for this file (matching the nav layer's idiom), Zustand store, Vitest. Repo root for all commands: `Pommora/`.

#### Global Constraints

- Gates after every task, exit codes read directly (never piped): `npm run typecheck` · `npx biome lint src` · `npx vitest run`. All must be 0.
- IPC never throws across the boundary — envelopes only. Main owns the filesystem; the renderer sends whole values.
- The no-empties rule: an emptied array deletes its key from `navigation.json`, and an emptied recents list deletes its row; a nexus with neither reads as the empty state.
- The file write is a **serialized patch** — each writer sends only the keys it owns (the renderer: `pinned`/`favorites`; main's banner mutation: `banner`), applied read-modify-write inside the one per-file lock, so neither writer can drop the other's key. The recents key routes to the db row — a synchronous single-statement upsert, exactly as fast and rule-free as today.
- **The renderer leads the arrays in-session.** Disk leads exactly twice: the first load, and an external-edit push (which adopts the file's keys — `pinned`, `favorites`, `banner`; recents aren't in the file, so no exception exists). A mutation-driven `load()` never re-reads navigation.
- A PostToolUse hook runs Biome on every write; stage explicit paths; commit style: lowercase `type(scope): descriptive sentence`, ending `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Hand-edits to `~/NexusOS` and `~/test` are one-off commands inside their task — no migration code ships, no fallback read of any old location.
- **Do not touch:** live `SelectionState` (keeps `path`); live-selection reconciliation in `selection.ts` and `applyTree`; the `adopted-` machinery; `nav:evictThumbs` (thumbnail eviction — shares the prefix, not the fate).

---

### Task 1: The Contract and the IO Module

**Files:**
- Modify: `src/shared/types.ts` (add `NavRef`, `NavigationState`, `NavigationResult` beside the nav types; the old family dies in Tasks 2–4 as its consumers migrate)
- Modify: `src/main/paths.ts` (`NEXUS_CONFIG_FILES` gains `navigation: 'navigation.json'`)
- Create: `src/main/io/navigationFile.ts`
- Test: `src/main/io/navigationFile.test.ts`

**Interfaces:**
- Produces (types):

```ts
/** A durable navigation reference — identity only; titles, icons, and paths resolve live. */
export type NavRef =
  | { kind: 'homepage' }
  | { kind: 'context' | 'space' | 'collection' | 'set' | 'page' | 'task' | 'event'; id: string }

/** The one navigation contract both processes speak — where each key persists is the IO
 *  module's business: pinned/favorites/banner in `.nexus/navigation.json`, recents in the
 *  device-local db row. Array position IS the order; an absent key is an empty list. */
export interface NavigationState {
  pinned?: NavRef[]
  favorites?: NavRef[]
  recents?: NavRef[]
  /** The NavView's banner — a nexus-relative asset path. */
  banner?: string
}

export type NavigationResult = { ok: true; nav: NavigationState } | { ok: false; error: string }
```

- Produces (IO): `readNavigationState(root: string): Promise<NavigationState>` (the file's keys merged with the recents row; absent sources → absent keys; junk elements dropped, never crash — the file is hand-editable) and `writeNavigationState(root: string, patch: Partial<NavigationState>): Promise<void>` — **the router**: a `recents` key upserts the db row synchronously; file keys apply as a **serialized read-modify-write** on `navigation.json`, so the renderer (arrays) and main's banner mutation (banner) can never drop each other's keys; an empty array deletes its key/row per no-empties. Plus `hasPendingNavigation(): boolean` and `flushNavigation(): Promise<void>` (never rejects) for the quit gate — file writes only; the row needs no gate. **One validation boundary:** both stores, both directions, every element through the same `isNavRef` + `cleanRef` pair — nothing else in the app validates or shapes navigation refs. Note: the validator's kind set is the full `NavRef` union — including `space`, which the old validator omitted, so Space entries now survive validation like every other kind.

- [ ] **Step 1: Write the failing tests** in `navigationFile.test.ts` (mirror `navState.test.ts`'s tmp-dir setup):

```ts
it('reads the empty state from a fileless nexus', async () => {
  expect(await readNavigationState(root)).toEqual({})
})

it('round-trips refs and drops junk elements on read', async () => {
  await writeFile(navPath(root), JSON.stringify({
    pinned: [{ kind: 'page', id: 'p1' }, { kind: 'nope' }, 42],
    favorites: [{ kind: 'homepage' }, { kind: 'space', id: 's1' }],
    banner: 'assets/b.jpg',
  }))
  expect(await readNavigationFile(root)).toEqual({
    pinned: [{ kind: 'page', id: 'p1' }],
    favorites: [{ kind: 'homepage' }, { kind: 'space', id: 's1' }],
    banner: 'assets/b.jpg',
  })
})

it('an emptied array deletes its key', async () => {
  await writeNavigationState(root, { pinned: [{ kind: 'page', id: 'p1' }] })
  await writeNavigationState(root, { pinned: [] })
  const raw = JSON.parse(await readFile(navPath(root), 'utf8'))
  expect('pinned' in raw).toBe(false)
})

it('a patch touches only its own keys — the banner survives an arrays write and vice versa', async () => {
  await writeNavigationState(root, { banner: 'assets/b.jpg' })
  await writeNavigationState(root, { pinned: [{ kind: 'page', id: 'p1' }], favorites: [] })
  expect(await readNavigationFile(root)).toEqual({
    pinned: [{ kind: 'page', id: 'p1' }],
    banner: 'assets/b.jpg',
  })
})

it('recents route to the row, never the file', async () => {
  await writeNavigationState(root, { recents: [{ kind: 'space', id: 's1' }], pinned: [{ kind: 'homepage' }] })
  expect((await readNavigationState(root)).recents).toEqual([{ kind: 'space', id: 's1' }])
  const raw = JSON.parse(await readFile(navPath(root), 'utf8'))
  expect('recents' in raw).toBe(false)
})

it('a live target stores as a bare ref — no path, no display fields', async () => {
  await writeNavigationState(root, {
    pinned: [{ kind: 'page', id: 'p1', path: 'A/b.md', title: 'B' } as unknown as NavRef],
  })
  const raw = JSON.parse(await readFile(navPath(root), 'utf8'))
  expect(raw.pinned).toEqual([{ kind: 'page', id: 'p1' }])
})
```

(The recents-routing case needs an open test db — mirror `navState.test.ts`'s existing session-db setup.)

- [ ] **Step 2: Run `npx vitest run src/main/io/navigationFile.test.ts` — expect FAIL** (module not found).
- [ ] **Step 3: Implement** `navigationFile.ts`:

```ts
import { mkdir } from 'node:fs/promises'
import { isPlainObject } from '@shared/propertyValue'
import type { NavigationState, NavRef } from '@shared/types'
import { NEXUS_CONFIG_FILES, nexusConfig, nexusDir } from '../paths'
import { readValue, writeValue } from '../db/localState'
import { readJsonObject, writeJson } from './atomicWrite'
import { serializeOnFile } from './fileLock'

const NAV_KINDS = new Set(['homepage', 'context', 'space', 'collection', 'set', 'page', 'task', 'event'])

const navigationPath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.navigation)

function isNavRef(v: unknown): v is NavRef {
  if (!isPlainObject(v) || typeof v.kind !== 'string' || !NAV_KINDS.has(v.kind)) return false
  return v.kind === 'homepage' || typeof v.id === 'string'
}

/** Identity only — a ref arriving with extra fields (a live target's `path`, a hand-edited
 *  stray) stores as bare `{kind, id}`; the file can never re-grow display or path fields. */
const cleanRef = (r: NavRef): NavRef => ('id' in r ? { kind: r.kind, id: r.id } : { kind: r.kind })

const refList = (v: unknown): NavRef[] | undefined => {
  if (!Array.isArray(v)) return undefined
  const refs = v.filter(isNavRef).map(cleanRef)
  return refs.length ? refs : undefined
}

const FILE_KEYS = ['pinned', 'favorites'] as const

/** The file's keys, element-filtered — hand-edited junk drops, never crashes. */
export async function readNavigationFile(root: string): Promise<Omit<NavigationState, 'recents'>> {
  const obj = (await readJsonObject(navigationPath(root))) ?? {}
  const file: Omit<NavigationState, 'recents'> = {}
  for (const key of FILE_KEYS) {
    const refs = refList(obj[key])
    if (refs) file[key] = refs
  }
  if (typeof obj.banner === 'string') file.banner = obj.banner
  return file
}

/** The one contract: the file's deliberate intent merged with the device-local recents row. */
export function readNavigationState(root: string): Promise<NavigationState> {
  return readNavigationFile(root).then((file) => {
    const recents = refList(readValue<unknown[]>('recents'))
    return recents ? { ...file, recents } : file
  })
}

let inFlight: Promise<unknown> | null = null

/** THE writer — routes each key to its store. Recents upsert the db row synchronously; file
 *  keys apply as a serialized read-modify-write, so the arrays writer and the banner writer can
 *  never drop each other's key. Empties delete; every ref passes the one cleaner both stores share. */
export async function writeNavigationState(root: string, patch: Partial<NavigationState>): Promise<void> {
  if ('recents' in patch) writeValue('recents', (patch.recents ?? []).map(cleanRef))
  const fileKeys = FILE_KEYS.filter((k) => k in patch)
  if (!fileKeys.length && !('banner' in patch)) return
  const path = navigationPath(root)
  const write = serializeOnFile(path, async () => {
    const current = await readNavigationFile(root)
    const out: Record<string, unknown> = {}
    for (const key of FILE_KEYS) {
      const refs = key in patch ? patch[key] : current[key]
      if (refs?.length) out[key] = refs.map(cleanRef)
    }
    const banner = 'banner' in patch ? patch.banner : current.banner
    if (banner) out.banner = banner
    await mkdir(nexusDir(root), { recursive: true })
    await writeJson(path, out)
  })
  inFlight = write
  try {
    await write
  } finally {
    if (inFlight === write) inFlight = null
  }
}

/** A navigation write still settling — the quit gate checks this before letting the app exit. */
export const hasPendingNavigation = (): boolean => inFlight !== null

/** Settle any owed write; never rejects (a failed write must not block the quit). */
export const flushNavigation = (): Promise<void> =>
  inFlight ? inFlight.then(noop, noop) : Promise.resolve()

const noop = (): void => {}
```

- [ ] **Step 4: Run the new tests — expect PASS.** Full gates — all 0 (nothing consumes the module yet).
- [ ] **Step 5: Commit** `feat(nav): one file knows the whole navigation surface`.

---

### Task 2: The IPC Collapse and the Quit Gate

**Files:**
- Modify: `src/main/index.ts` (delete the seven handlers at 330–387 — `nav:load`, `nav:saveRecents`, `nav:saveFavorites`, `nav:loadPins`, `nav:addPin`, `nav:reorderPin`, `nav:removePin` — and `savePin`; add the two below; retarget the quit gate at 1644–1661 from `hasPendingFavorites`/`flushFavorites` to `hasPendingNavigation`/`flushNavigation`; prune the dead imports)
- Modify: `src/preload/index.ts` (the `nav` bridge at 290–301 becomes `read` + `write`; `onNavChanged` (438–443) retypes to the file's keys of `NavigationState`; header comments restated)
- Delete: `src/main/io/pinsState.ts`, `src/main/io/pinsState.test.ts`, `src/main/io/navState.ts`, `src/main/io/navState.test.ts`
- Modify: `src/main/io/atomicWrite.ts` (delete `readJsonArray` (104–115) — its sole consumer repo-wide is the dying `navState.ts:48`)
- Modify: `src/main/watcher.ts` (see Task 6 — only the imports break here; point them at `readNavigationFile` now so the build stays green). The `'recents'` scope in `localState.ts` STAYS — the row remains recents' home.
- Modify: `src/shared/types.ts` (delete `NavState`, `NavStateResult`, `NavFavorite`, `PinEntry`, `PinsResult`, `NavChanged`; `RecentEntry` dies with its last consumer in Task 3 — leave it this task if the renderer still compiles against it)

**Interfaces:**
- Produces (handlers, exactly):

```ts
handleEnvelope('nav:read', async (): Promise<NavigationResult> => {
  const root = sessionRoot()
  if (!root) return { ok: false, error: 'No nexus is open.' }
  return { ok: true, nav: await readNavigationState(root) }
})

handleEnvelope('nav:write', async (patch: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (!root) return { ok: false, error: 'No nexus is open.' }
  await writeNavigationState(root, patch as Partial<NavigationState>)
  return { ok: true }
})
```

- Produces (bridge): `nav.read(): Promise<NavigationResult>`, `nav.write(patch: Partial<NavigationState>): Promise<Ack>`, `onNavChanged(cb: (file: Omit<NavigationState, 'recents'>) => void)`. The handler forwards the patch as-is — the IO module's single validation boundary is what shapes it, and its router decides where each key lands; no second validator appears anywhere.

- [ ] **Step 1: Make the cuts and additions above.** The renderer store still calls the old bridge — expect typecheck to name every call site; that list is Task 3's worklist, so this task ends mid-red ONLY if Task 3 is executed in the same working session. If tasks are dispatched separately, Tasks 2 and 3 are one commit boundary — do both before the gates.
- [ ] **Step 2: (with Task 3 done) Full gates — all 0.**

---

### Task 3: The Renderer Owns Three Arrays

**Files:**
- Modify: `src/renderer/src/store.ts` (the nav slice: state becomes `pinned: NavRef[]`, `favorites: NavRef[]`, `recents: NavRef[]`, `navBanner: string | undefined`; every action below; `load()`'s nav fetch becomes one `nav.read()`; delete the dead `reorderFavorites` (221, 1050–1057) — zero call sites, verified)
- Modify: `src/renderer/src/Navigation/navRecents.ts` (entries retype `RecentEntry` → `NavRef`; `navKey` retypes to `NavRef | SelectTarget` — same body, the one identity rule; gains `toNavRef` below; `RECENTS_CAP = 100` stays exactly where it is, the cap's only home; header restated)
- Modify: `src/renderer/src/Navigation/navSearch.ts` (search hits retype to `NavRef` — a hit needs identity only, since `go()` mints the path at click; the shared `NavTarget` union then has no consumer and deletes from `types.ts`)
- Modify: `src/renderer/src/MarkdownPM/Tables/navigate.ts` (its local, unrelated `NavTarget` — table-cell coordinates — renames to `CellNavTarget`, so the erasure grep reads zero)
- Delete: `src/renderer/src/Navigation/navPins.ts` + test, `src/renderer/src/Navigation/order.ts` + test (`keyBetween` verified pins-only)
- Modify: `src/renderer/src/Navigation/navResolve.ts` (`cleanTarget` and the `pinned` pass-through die; `resolveWith` takes `NavRef`; `resolvePins` keeps setting `pinned: true` itself), `useNavData.ts` (slice reads; `go()` below; the dead-entry fallback drops), `NavList.tsx` (call-site retypes; the preview action mints its path — rule 4 below), `NavGallery.tsx`, `NavWindow.tsx`, `TabBar.tsx`, `App.tsx` (`applyNavChanged` wiring). NavView's banner stays on the tree field this task — it moves in Task 4, atomically.
- Modify: `src/shared/types.ts` (delete `RecentEntry` — last consumers gone)
- Test: `src/renderer/src/Navigation/navRecents.test.ts`, `navResolve.test.ts`, `store.test.tsx` (fixtures lose `path`/`pinned`; recents-reorder suite retargets; the `nav.saveRecents` mock becomes `nav.write`)

**Interfaces:**
- Consumes: `nav.read()` / `nav.write(file)` from Task 2; `buildReconcileIndex` from `selection.ts` (already exported).
- Produces (store actions — every mutation is a splice + one persist):

```ts
/** In-memory arrays hold BARE refs — toNavRef strips at the action boundary, so store state,
 *  the persist payload, and the file are one shape. (navRecents.ts exports it beside navKey.) */
export const toNavRef = (t: NavRef | SelectTarget): NavRef =>
  'id' in t ? { kind: t.kind, id: t.id } : { kind: t.kind }

persistNav: () => {
  const { pinned, favorites } = get()
  void window.nexus.nav.write({ pinned, favorites }) // the banner is main's key
},
togglePin: (target: NavRef | SelectTarget) => {
  const ref = toNavRef(target)
  const key = navKey(ref)
  const pinned = get().pinned.some((p) => navKey(p) === key)
    ? get().pinned.filter((p) => navKey(p) !== key)
    : [...get().pinned, ref]
  set({ pinned }); get().persistNav()
},
reorderPin: (activeKey: string, overKey: string) => {
  const pinned = [...get().pinned]
  const from = pinned.findIndex((p) => navKey(p) === activeKey)
  const to = pinned.findIndex((p) => navKey(p) === overKey)
  if (from === -1 || to === -1 || from === to) return
  pinned.splice(to, 0, pinned.splice(from, 1)[0])
  set({ pinned }); get().persistNav()
},
```
  with `toggleFavorite`/`removeRecent` following `togglePin`'s shape. The recents recorder keeps `recordRecent(recents, toNavRef(target))` (dedupe-to-front, cap 100 — the cap's only home) and persists with `void window.nexus.nav.write({ recents })` — the router lands it in the db row as one synchronous statement, so a click needs no debounce, no flush, and no quit ceremony, exactly as today.
- Produces (the four sequencing rules, stated once):
  1. `load()` reads navigation **only inside the first-load gate** (the same `activeTabId === ''` rule the tabs already document) — a mutation-driven `load()` never re-reads, so the renderer's just-made change can never roll back.
  2. `applyNavChanged` (the external-edit push) adopts the file's keys — `pinned`, `favorites`, `banner`. Recents aren't in the file; no exception exists.
  3. `useNavData.go`'s dead-entry fallback becomes a drop — with ID-only entries there is nothing to fall back to; a ref that fails to resolve does not navigate.
  4. `NavList`'s "Open in Preview" row action mints its path through the same reconcile index as `go()` before handing a ref to the preview — no consumer anywhere reads a stored path.
- Produces (`go()` mints the path at click time — the display index stays display-only):

```ts
const go = (ref: NavRef): void => {
  if (ref.kind === 'task' || ref.kind === 'event') return // find-only in v1
  const index = buildReconcileIndex(tree)
  const target = reconcileWith(index, ref.kind === 'set' || ref.kind === 'page'
    ? { ...ref, path: '' }
    : ref)
  if (target.kind !== 'none') select(target)
}
```
  (`reconcileWith` already resolves a set/page id to its live path and returns `none` for a dead id — the empty-string placeholder never survives it.)

- [ ] **Step 1: True the tests first** — fixtures drop `path`/`pinned` from stored entries, the pins suites move from fractional orders to array positions, `store.test.tsx`'s persistence mocks point at `nav.write` and assert the whole-file shape.
- [ ] **Step 2: Run the four test files — expect FAIL.** Implement everything above. Re-run — PASS.
- [ ] **Step 3: Full gates — all 0.** Commit Tasks 2+3 together: `refactor(nav): three arrays, two channels, one writer`.

---

### Task 4: The Banner Rides the Navigation File — Atomically

The whole banner move lands in ONE commit: retarget, tree-field deletion, NavView rewire, and the hand-move of both nexuses' banner values. No interim commit exists where the NavView banner has no producer.

**Files:**
- Modify: `src/main/mutate.ts` (the `req.kind === 'navview'` arms at 357–361 and 398–400 split from homepage: the navview banner value writes `writeNavigationState(root, { banner: value })` — a patch; the serialized read-modify-write inside the writer is what preserves the arrays; the asset copy for this owner lands in `.nexus/assets/` with no per-owner folder; comments restated)
- Modify: `src/main/readNexus.ts` (the `navviewConfig` fetch (438, 444) and `navView` tree field (548) delete), `src/shared/types.ts` (`NexusTree.navView` deletes; `BannerOwnerKind` keeps its `'navview'` arm — it names the surface), `src/main/paths.ts` (`navview` + `navFavorites` registry entries delete)
- Modify: `src/renderer/src/Tabs/NavView.tsx:30` (banner reads the store's `navBanner`, populated by `nav.read` at load and by the push), fixtures at `Navigation/testTree.ts:10`, `selection.test.ts:10`, `store.test.tsx:298`, `treeMove.test.ts:45` (the `navView` field leaves the tree shape)
- Test: `src/main/mutate.test.ts:435–448` (the navview setBanner case asserts the `banner` key in `navigation.json` and the asset path `.nexus/assets/banner-*.png`)

**Interfaces:**
- Consumes: `writeNavigationState(root, patch)` — the banner writer sends only its key; the one serialized patch-writer is why neither it nor the arrays writer can lose the other.

- [ ] **Step 1: True `mutate.test.ts`'s navview case** to the new storage. Run it — expect FAIL.
- [ ] **Step 2: Implement the retarget, deletions, and NavView rewire.** Re-run — PASS.
- [ ] **Step 3: Hand-move the disks in the same sitting** (dev app closed): for each nexus with a `navview.json`, copy its `banner` value into `navigation.json`'s `banner` key; move the image out of `assets/navview/` into `.nexus/assets/` and update the stored path; delete `navview.json` and the emptied folder.
- [ ] **Step 4: Full gates — all 0.** Commit `refactor(nav): the navview banner joins its surface's file`.

---

### Task 5: ID-Only Tabs and Previews, One Hydrator

**Files:**
- Modify: `src/shared/types.ts` (stored shapes: `Tab.target`/`navStack` and `PreviewSetRecord.tabs[].target` become `NavRef`-based stored siblings — define `StoredTab { id: string; target: NavRef | { kind: 'newtab' }; navStack: NavRef[]; navIndex: number }` and retype `TabSet`/`PreviewsFile` over stored refs; the LIVE `Tab` used by the store keeps `SelectTarget`)
- Modify: `src/main/io/tabsState.ts` (validators drop the path requirement; `readTab`'s lockstep repair and `targetKey` delete — hydration owns lockstep now; header restated), `src/main/io/previewState.ts` (doc restated)
- Modify: `src/renderer/src/Tabs/tabsModel.ts` (`reconcileTabs` becomes the hydrator below; `derivePinnedTabs` reads the pinned array), `src/renderer/src/store.ts` (restore path calls the hydrator; `toPreviewRecord` strips paths on write; the repath sweeps at 711–731 and the path-mining at 736–742 delete; `reconcileRecord`'s path-patch line deletes)
- Test: `src/main/io/tabsState.test.ts`, `previewState.test.ts`, `src/renderer/src/Tabs/tabsModel.test.ts` (fixtures go ID-only; the repair suites become hydration suites)

**Interfaces:**
- Produces (the one hydrator — prune, mint, recompute; the lockstep guard's only home):

```ts
/** Stored refs → live tabs against the current tree: a ref that no longer resolves drops,
 *  a resolving one gets its path minted, and the history pointer is recomputed as the stack
 *  prunes — restored lockstep is established here or nowhere. */
export function hydrateTabs(stored: StoredTab[], activeTabId: string, tree: NexusTree): TabSet {
  const index = buildReconcileIndex(tree)
  const live = (ref: NavRef): SelectTarget | null => {
    if (ref.kind === 'task' || ref.kind === 'event') return null
    const r = reconcileWith(index, ref.kind === 'set' || ref.kind === 'page' ? { ...ref, path: '' } : ref)
    return r.kind === 'none' ? null : r
  }
  const tabs: Tab[] = []
  for (const t of stored) {
    if (t.target.kind === 'newtab') { tabs.push({ id: t.id, target: t.target, navStack: [], navIndex: -1 }); continue }
    const target = live(t.target)
    if (!target) continue
    const navStack = t.navStack.map(live).filter((s): s is SelectTarget => s !== null)
    const at = navStack.findIndex((s) => navKey(s) === navKey(target))
    tabs.push(at === -1
      ? { id: t.id, target, navStack: [target], navIndex: 0 }
      : { id: t.id, target, navStack, navIndex: at })
  }
  return { tabs, activeTabId: tabs.some((t) => t.id === activeTabId) ? activeTabId : (tabs[0]?.id ?? '') }
}
```

- [ ] **Step 1: True the three test files** — stored fixtures lose paths; add the two hydration cases the old repair suite protected: a desynced stored index re-points to the target's position, and a fully-dead stack degrades to a single-entry history.
- [ ] **Step 2: Run them — expect FAIL.** Implement. Re-run — PASS. Full gates — all 0.
- [ ] **Step 3: Commit** `refactor(tabs): stored identity, minted paths, one lockstep owner`.

---

### Task 6: The Watcher Watches One File

**Files:**
- Modify: `src/main/watcher.ts` (`isNavPath` (27–31) matches only `NEXUS_CONFIG_FILES.navigation`; **the nav branch moves ABOVE the `isRecentWrite` echo check** at 88 — the time-window suppression exists to spare wasted full tree walks, and a nav event never walks the tree, so navigation events skip suppression entirely; `pushNav` (138–146) reads `readNavigationFile` and pushes it whole; comments restated)
- Test: `src/main/watcher.test.ts` (the navFavorites/pins cases become one navigation.json case, plus one case proving a nav event inside the echo window still pushes)

The sequencing this buys, for free: an external hand-edit is never swallowed by the app's own write echo (the old window opened for two seconds after every recents write); a self-write's echo push is a debounced re-read of one small file whose content matches what the renderer already holds for the adopted keys — a harmless refresh, not a mechanism.

- [ ] **Step 1: True the watcher test, run — FAIL; implement; PASS. Full gates — all 0.**
- [ ] **Step 2: Commit** `refactor(watch): outside edits to one navigation file`.

---

### Task 7: The Disks Are Hand-Authored and the Old World Leaves Them

- [ ] **Step 1: Author `navigation.json` for both nexuses** from their live pin files (tombstones excluded, `(order, filename)` sorted — the same order `readPins` served), favorites from `navFavorites.json`, recents empty:

```bash
python3 - <<'EOF'
import json, pathlib
for root in ['/Users/nathantaichman/NexusOS', '/Users/nathantaichman/test']:
    nx = pathlib.Path(root) / '.nexus'
    pins = []
    pdir = nx / 'pins'
    if pdir.exists():
        entries = []
        for f in sorted(pdir.glob('*.json')):
            d = json.load(open(f))
            if d.get('deleted'): continue
            entries.append((d.get('order', 0), f.name, {k: v for k, v in d.items() if k in ('kind', 'id')}))
        pins = [e[2] for e in sorted(entries)]
    favs = []
    ff = nx / 'navFavorites.json'
    if ff.exists():
        favs = [{k: v for k, v in e.items() if k in ('kind', 'id')} for e in json.load(open(ff)) if isinstance(e, dict)]
    out = {}
    nav = nx / 'navigation.json'
    if nav.exists(): out = json.load(open(nav))   # Task 4 already parked the banner here
    if pins: out['pinned'] = pins
    if favs: out['favorites'] = favs
    json.dump(out, open(nav, 'w'), indent=2)
    print(root, '->', out)
EOF
```

- [ ] **Step 2: Delete the old world from both disks** (the banner value and image already moved in Task 4): `rm -r .nexus/pins .nexus/navFavorites.json` (whichever exist), `sqlite3 .nexus/nexus.db "DELETE FROM local_state WHERE scope = 'recents';"`, and hand-clean `state.json` down to its live keys:

```bash
python3 - <<'EOF'
import json
for p in ['/Users/nathantaichman/NexusOS/.nexus/state.json', '/Users/nathantaichman/test/.nexus/state.json']:
    d = json.load(open(p))
    kept = {k: d[k] for k in ('collection_order', 'space_orders') if k in d}
    json.dump(kept, open(p, 'w'), indent=2)
EOF
```

- [ ] **Step 4: Launch the dev app against `~/test`** (`env -u ELECTRON_RUN_AS_NODE npm run dev`) and verify the pin set, favorites, and NavView banner render from the new file.

---

### Task 8: The Erasure Pass

**Files (docs):** `Features/Navigation.md` (restated first — the file, the arrays, the live resolution), `Features/Architecture.md` (the storage tree gains `navigation.json`, loses three lines; the db contract loses recents), `Features/PagePreview.md:21` (mint-or-drop), `Features/Configuration.md` + `Features/SurfacePM.md` + `Mobile/MobileDecisionLog.md` + `Mobile/FormFactor.md` (each swept for the old vocabulary — note `Configuration.md`'s `recents` is the app-level recently-opened-nexus list in `pommora.json`, a different thing that stays), `Context.md` (109, 119), `Handoff.md` (22, 76), `History.md` (the two locked entries resolve per the Decision Log's sign-offs; the multi-tab entry's tabs-sync claim trues to device-local; merged in place per History's own convention).

**Files (comments):** the ~40 sites in the blast-radius report's C1 table — every comment asserting per-pin files, tombstones, fractional orders, the favorites-only quit gate, recents-in-db, `navRecents.json` (`types.ts:406` is the sole survivor naming it), or stored-path repair, restated or deleted with the code that made them true.

- [ ] **Step 1: Sweep the comments and docs above.**
- [ ] **Step 2: The grep gate — every command prints 0:**

```bash
grep -rn "navFavorites\|navRecents\|navview\.json\|loadOrMigratePins\|pinsState\|keyBetween\|PinEntry\|PinsResult\|NavChanged\b\|NavStateResult\|RecentEntry\|NavTarget\|hasPendingFavorites\|flushFavorites\|targetKey\|readNavState\|writeRecents\|writeFavorites\|readPins\b\|writePin\b\|removePin\b\|pinFileName\|cleanPinTarget\|pinFor\b\|readJsonArray" src ../.claude | wc -l
grep -rn "\.nexus/pins\|tombstone" src | wc -l
grep -rn "nav:saveRecents\|nav:saveFavorites\|nav:loadPins\|nav:addPin\|nav:reorderPin\|nav:removePin\|nav:load\b" src | wc -l
```

(`NavTarget` reads zero because Task 3 renamed the unrelated table-cell type; the app-level `recents` list in `appConfig.ts`/`pommora.json` is out of scope by the `src/main/db` scoping; `reorderTo`/`byOrder` are excluded — both survive as unrelated symbols, the DnD prop name and `treeMove`'s private string-order helper.)

- [ ] **Step 3: Full gates + `env -u ELECTRON_RUN_AS_NODE npm run build` — all 0.**
- [ ] **Step 4: Commit** `refactor(nav): the old design leaves no shadow` (docs bundled).

---

### Task 9: Closeout

- [ ] **Step 1: Adversarial review of the full diff** (build-breaking agent), findings verified personally before folding; fixes land as their own commits.
- [ ] **Step 2: Live UIX pass** on the dev app: pin/unpin/reorder · favorite toggle · recents stream and its Remove action · tab restore across relaunch · rename-then-relaunch (the abolished stale-path class) · NavView banner set and clear · an outside edit to `navigation.json` refreshing the open app.
- [ ] **Step 3: Update `Handoff.md`** to the post-refactor state and commit.

---

#### Self-Review Record

Spec coverage: every Decision Log ruling maps to a task — the file, its contract, and the one validation boundary (1), the channel collapse and quit gate (2), arrays-as-order, the cap's home, and the four sequencing rules (3), the atomic banner move through the patch-writer (4), hydration as the lockstep owner (5), the watcher's echo-free nav branch (6), no-migration hand-authoring (7), total erasure with a scoped, achievable-zero gate (8). Type consistency: `NavRef`/`NavigationState`/`StoredTab`/`toNavRef` are defined once and consumed by name everywhere after. The adversarial review's nine findings are folded: the load-gate rule (F1), the patch-writer (F2), the atomic Task 4 (F3), the per-key push-adoption rule (F4), the echo-exempt nav branch (F5), the three stored-path consumers (F6), hand-clean ordering (F7, both plans), recents kept on the synchronous row so no write policy is needed (F8), and the gate/doc scoping (F9).
