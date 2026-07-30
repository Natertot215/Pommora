## Navigation Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All durable navigation intent lives in one `.nexus/navigation.json` — three ID-only ordered arrays plus the NavView banner pointer — with every stored reference structurally incapable of going stale, and every trace of the previous design erased.

**Architecture:** One shared `NavigationFile` contract, one main-process IO module (one validated read, one serialized whole-file write, one quit gate), two IPC channels replacing seven, and a renderer store that owns three plain arrays where position is the order. Persisted tabs/previews go ID-only with a single restore-time hydrator that prunes dead refs, mints paths, and recomputes the history pointer. The decisions, sign-offs, and locked-decision reconciliations live in [[Navigation Consolidation — Decision Log]]; the Swift Parity Removal plan runs first.

**Tech Stack:** Electron main + React renderer, TypeScript, zod-free hand validation for this file (matching the nav layer's idiom), Zustand store, Vitest. Repo root for all commands: `Pommora/`.

#### Global Constraints

- Gates after every task, exit codes read directly (never piped): `npm run typecheck` · `npx biome lint src` · `npx vitest run`. All must be 0.
- IPC never throws across the boundary — envelopes only. Main owns the filesystem; the renderer sends whole values.
- The no-empties rule: an emptied array deletes its key from `navigation.json`; a fileless nexus reads as the empty state.
- Whole-file writes are most-recent-wins; both writers of `navigation.json` (the nav IPC write and main's banner mutation) MUST route through the one serialized writer.
- A PostToolUse hook runs Biome on every write; stage explicit paths; commit style: lowercase `type(scope): descriptive sentence`, ending `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Hand-edits to `~/NexusOS` and `~/test` are one-off commands inside their task — no migration code ships, no fallback read of any old location.
- **Do not touch:** live `SelectionState` (keeps `path`); live-selection reconciliation in `selection.ts` and `applyTree`; the `adopted-` machinery; `nav:evictThumbs` (thumbnail eviction — shares the prefix, not the fate).

---

### Task 1: The Contract and the IO Module

**Files:**
- Modify: `src/shared/types.ts` (add `NavRef`, `NavigationFile`, `NavigationResult` beside the nav types; the old family dies in Tasks 2–4 as its consumers migrate)
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

/** `.nexus/navigation.json` — array position IS the order; an absent key is an empty list. */
export interface NavigationFile {
  pinned?: NavRef[]
  favorites?: NavRef[]
  recents?: NavRef[]
  /** The NavView's banner — a nexus-relative asset path. */
  banner?: string
}

export type NavigationResult = { ok: true; file: NavigationFile } | { ok: false; error: string }
```

- Produces (IO): `readNavigationFile(root: string): Promise<NavigationFile>` (absent file → `{}`; junk elements dropped, never crash — the file is hand-editable), `writeNavigationFile(root: string, file: NavigationFile): Promise<void>` (strips empty arrays per no-empties, serialized per-file, tracked for the quit gate), `hasPendingNavigation(): boolean`, `flushNavigation(): Promise<void>` (never rejects). Note: the ref validator's kind set is the full `NavRef` union — including `space`, which the old validator omitted, so Space entries now survive validation like every other kind.

- [ ] **Step 1: Write the failing tests** in `navigationFile.test.ts` (mirror `navState.test.ts`'s tmp-dir setup):

```ts
it('reads the empty state from a fileless nexus', async () => {
  expect(await readNavigationFile(root)).toEqual({})
})

it('round-trips refs and drops junk elements on read', async () => {
  await writeNavigationFile(root, { pinned: [{ kind: 'page', id: 'p1' }], banner: 'assets/b.jpg' })
  await writeFile(navPath(root), JSON.stringify({
    pinned: [{ kind: 'page', id: 'p1' }, { kind: 'nope' }, 42],
    favorites: [{ kind: 'homepage' }],
    banner: 'assets/b.jpg',
  }))
  expect(await readNavigationFile(root)).toEqual({
    pinned: [{ kind: 'page', id: 'p1' }],
    favorites: [{ kind: 'homepage' }],
    banner: 'assets/b.jpg',
  })
})

it('an emptied array deletes its key', async () => {
  await writeNavigationFile(root, { pinned: [{ kind: 'page', id: 'p1' }] })
  await writeNavigationFile(root, { pinned: [] })
  const raw = JSON.parse(await readFile(navPath(root), 'utf8'))
  expect('pinned' in raw).toBe(false)
})

it('a space ref survives validation', async () => {
  await writeNavigationFile(root, { recents: [{ kind: 'space', id: 's1' }] })
  expect((await readNavigationFile(root)).recents).toEqual([{ kind: 'space', id: 's1' }])
})
```

- [ ] **Step 2: Run `npx vitest run src/main/io/navigationFile.test.ts` — expect FAIL** (module not found).
- [ ] **Step 3: Implement** `navigationFile.ts`:

```ts
import { mkdir } from 'node:fs/promises'
import { isPlainObject } from '@shared/propertyValue'
import type { NavigationFile, NavRef } from '@shared/types'
import { NEXUS_CONFIG_FILES, nexusConfig, nexusDir } from '../paths'
import { readJsonObject, writeJson } from './atomicWrite'
import { serializeOnFile } from './fileLock'

const NAV_KINDS = new Set(['homepage', 'context', 'space', 'collection', 'set', 'page', 'task', 'event'])

const navigationPath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.navigation)

function isNavRef(v: unknown): v is NavRef {
  if (!isPlainObject(v) || typeof v.kind !== 'string' || !NAV_KINDS.has(v.kind)) return false
  return v.kind === 'homepage' || typeof v.id === 'string'
}

const refList = (v: unknown): NavRef[] | undefined => {
  if (!Array.isArray(v)) return undefined
  const refs = v.filter(isNavRef)
  return refs.length ? refs : undefined
}

/** The whole navigation surface, element-filtered — hand-edited junk drops, never crashes. */
export async function readNavigationFile(root: string): Promise<NavigationFile> {
  const obj = (await readJsonObject(navigationPath(root))) ?? {}
  const file: NavigationFile = {}
  const pinned = refList(obj.pinned)
  const favorites = refList(obj.favorites)
  const recents = refList(obj.recents)
  if (pinned) file.pinned = pinned
  if (favorites) file.favorites = favorites
  if (recents) file.recents = recents
  if (typeof obj.banner === 'string') file.banner = obj.banner
  return file
}

let inFlight: Promise<unknown> | null = null

/** ONE serialized whole-file writer — every mutation of navigation.json routes through here,
 *  so two writers can never interleave. An emptied array deletes its key. */
export async function writeNavigationFile(root: string, file: NavigationFile): Promise<void> {
  const path = navigationPath(root)
  const out: Record<string, unknown> = {}
  for (const key of ['pinned', 'favorites', 'recents'] as const) {
    const refs = file[key]
    if (refs?.length) out[key] = refs
  }
  if (file.banner) out.banner = file.banner
  const write = serializeOnFile(path, async () => {
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
- Modify: `src/preload/index.ts` (the `nav` bridge at 290–301 becomes `read` + `write`; `onNavChanged` (438–443) retypes to `NavigationFile`; header comments restated)
- Delete: `src/main/io/pinsState.ts`, `src/main/io/pinsState.test.ts`, `src/main/io/navState.ts`, `src/main/io/navState.test.ts`
- Modify: `src/main/db/localState.ts` (the `'recents'` scope arm and its mention in the singleton doc), `src/main/db/localState.test.ts` (the recents case), `src/main/watcher.ts` (see Task 6 — only the imports break here; point them at `readNavigationFile` now so the build stays green)
- Modify: `src/shared/types.ts` (delete `NavState`, `NavStateResult`, `NavFavorite`, `PinEntry`, `PinsResult`, `NavChanged`; `RecentEntry` dies with its last consumer in Task 3 — leave it this task if the renderer still compiles against it)

**Interfaces:**
- Produces (handlers, exactly):

```ts
handleEnvelope('nav:read', async (): Promise<NavigationResult> => {
  const root = sessionRoot()
  if (!root) return { ok: false, error: 'No nexus is open.' }
  return { ok: true, file: await readNavigationFile(root) }
})

handleEnvelope('nav:write', async (file: unknown): Promise<Ack> => {
  const root = sessionRoot()
  if (!root) return { ok: false, error: 'No nexus is open.' }
  await writeNavigationFile(root, file as NavigationFile)
  return { ok: true }
})
```

- Produces (bridge): `nav.read(): Promise<NavigationResult>`, `nav.write(file: NavigationFile): Promise<Ack>`, `onNavChanged(cb: (file: NavigationFile) => void)`.

- [ ] **Step 1: Make the cuts and additions above.** The renderer store still calls the old bridge — expect typecheck to name every call site; that list is Task 3's worklist, so this task ends mid-red ONLY if Task 3 is executed in the same working session. If tasks are dispatched separately, Tasks 2 and 3 are one commit boundary — do both before the gates.
- [ ] **Step 2: (with Task 3 done) Full gates — all 0.**

---

### Task 3: The Renderer Owns Three Arrays

**Files:**
- Modify: `src/renderer/src/store.ts` (the nav slice: state becomes `pinned: NavRef[]`, `favorites: NavRef[]`, `recents: NavRef[]`, `navBanner: string | undefined`; every action below; `load()`'s nav fetch becomes one `nav.read()`; delete the dead `reorderFavorites` (221, 1050–1057) — zero call sites, verified)
- Modify: `src/renderer/src/Navigation/navRecents.ts` (entries retype `RecentEntry` → `NavRef`; `navKey` unchanged — it is the one identity rule; `RECENTS_CAP = 100` stays exactly where it is, the cap's only home; header restated)
- Delete: `src/renderer/src/Navigation/navPins.ts` + test, `src/renderer/src/Navigation/order.ts` + test (`keyBetween` verified pins-only)
- Modify: `src/renderer/src/Navigation/navResolve.ts` (`cleanTarget` and the `pinned` pass-through die; `resolveWith` takes `NavRef`; `resolvePins` keeps setting `pinned: true` itself), `useNavData.ts` (slice reads; `go()` below), `NavList.tsx`, `NavGallery.tsx`, `NavWindow.tsx`, `TabBar.tsx`, `NavView.tsx` (call-site retypes; NavView's banner reads `navBanner`), `App.tsx` (`applyNavChanged` wiring)
- Modify: `src/shared/types.ts` (delete `RecentEntry` — last consumers gone)
- Test: `src/renderer/src/Navigation/navRecents.test.ts`, `navResolve.test.ts`, `store.test.tsx` (fixtures lose `path`/`pinned`; recents-reorder suite retargets; the `nav.saveRecents` mock becomes `nav.write`)

**Interfaces:**
- Consumes: `nav.read()` / `nav.write(file)` from Task 2; `buildReconcileIndex` from `selection.ts` (already exported).
- Produces (store actions — every mutation is a splice + one persist):

```ts
persistNav: () => {
  const { pinned, favorites, recents, navBanner } = get()
  void window.nexus.nav.write({ pinned, favorites, recents, banner: navBanner })
},
togglePin: (target: NavRef) => {
  const key = navKey(target)
  const pinned = get().pinned.some((p) => navKey(p) === key)
    ? get().pinned.filter((p) => navKey(p) !== key)
    : [...get().pinned, target]
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
  with `toggleFavorite`/`removeRecent` following `togglePin`'s shape and the recents recorder unchanged in spirit: `recordRecent(recents, target)` (dedupe-to-front, cap 100) then persist.
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

### Task 4: The Banner Rides the Navigation File

**Files:**
- Modify: `src/main/mutate.ts` (the `req.kind === 'navview'` arms at 357–361 and 398–400 split from homepage: the navview banner value writes through `writeNavigationFile(root, { ...await readNavigationFile(root), banner: value })` — read-modify-write INSIDE the one serialized writer path; the asset copy for this owner lands in `.nexus/assets/` with no per-owner folder; comments restated)
- Modify: `src/main/readNexus.ts` (the `navviewConfig` fetch (438, 444) and `navView` tree field (548) delete), `src/shared/types.ts` (`NexusTree.navView` deletes; `BannerOwnerKind` keeps its `'navview'` arm — it names the surface), `src/main/paths.ts` (`navview` + `navFavorites` registry entries delete)
- Modify: `src/renderer/src/Tabs/NavView.tsx:30` (banner reads the store's `navBanner` — wired in Task 3), fixtures at `Navigation/testTree.ts:10`, `selection.test.ts:10`, `store.test.tsx:298`, `treeMove.test.ts:45` (the `navView` field leaves the tree shape)
- Test: `src/main/mutate.test.ts:435–448` (the navview setBanner case asserts the `banner` key in `navigation.json` and the asset path `.nexus/assets/banner-*.png`)

**Interfaces:**
- Consumes: `readNavigationFile`/`writeNavigationFile` — main-side banner writes and renderer-driven nav writes serialize on the same file lock, so neither can lose the other; last write wins on the whole file by design.

- [ ] **Step 1: True `mutate.test.ts`'s navview case** to the new storage. Run it — expect FAIL.
- [ ] **Step 2: Implement the retarget and deletions.** Re-run — PASS. Full gates — all 0.
- [ ] **Step 3: Commit** `refactor(nav): the navview banner joins its surface's file`.

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
- Modify: `src/main/watcher.ts` (`isNavPath` (27–31) matches only `NEXUS_CONFIG_FILES.navigation`; `pushNav` (138–146) reads `readNavigationFile` and pushes it whole; comments restated)
- Test: `src/main/watcher.test.ts` (the navFavorites/pins cases become one navigation.json case)

- [ ] **Step 1: Verify the echo suppression** before wiring: confirm `writeJson` registers its path with `io/writeEcho.ts` so the app's own navigation writes (every recents click) do NOT round-trip through the watcher as external edits. Run: `grep -n "writeEcho\|registerEcho" src/main/io/atomicWrite.ts src/main/io/writeEcho.ts` and read the mechanism. Expected: self-writes are suppressed; if they are NOT, the task adds the registration to `writeNavigationFile` and a test proving a self-write fires no `nav:changed`.
- [ ] **Step 2: True the watcher test, run — FAIL; implement; PASS. Full gates — all 0.**
- [ ] **Step 3: Commit** `refactor(watch): outside edits to one navigation file`.

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
    if pins: out['pinned'] = pins
    if favs: out['favorites'] = favs
    bf = nx / 'navview.json'
    if bf.exists():
        b = json.load(open(bf)).get('banner')
        if b: out['banner'] = b
    json.dump(out, open(nx / 'navigation.json', 'w'), indent=2)
    print(root, '->', out)
EOF
```

- [ ] **Step 2: Move each banner image out of its per-owner folder** (`mv ~/NexusOS/.nexus/assets/navview/banner-*.* ~/NexusOS/.nexus/assets/` — then update the `banner` value in that nexus's `navigation.json` to the new relative path; same for `~/test` if present; delete the emptied `assets/navview/` folders).
- [ ] **Step 3: Delete the old world from both disks:** `rm -r .nexus/pins .nexus/navFavorites.json .nexus/navview.json` (whichever exist), `sqlite3 .nexus/nexus.db "DELETE FROM local_state WHERE scope = 'recents';"`, and hand-clean `state.json` down to its live keys:

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

**Files (docs):** `Features/Navigation.md` (restated first — the file, the arrays, the live resolution), `Features/Architecture.md` (the storage tree gains `navigation.json`, loses three lines; the db contract loses recents), `Features/PagePreview.md:21` (mint-or-drop), `Context.md` (109, 119), `Handoff.md` (22, 76), `History.md` (the two locked entries resolve per the Decision Log's sign-offs; the multi-tab entry's tabs-sync claim trues to device-local; merged in place per History's own convention).

**Files (comments):** the ~40 sites in the blast-radius report's C1 table — every comment asserting per-pin files, tombstones, fractional orders, the favorites-only quit gate, recents-in-db, `navRecents.json` (`types.ts:406` is the sole survivor naming it), or stored-path repair, restated or deleted with the code that made them true.

- [ ] **Step 1: Sweep the comments and docs above.**
- [ ] **Step 2: The grep gate — every command prints 0:**

```bash
grep -rn "navFavorites\|navRecents\|navview\.json\|loadOrMigratePins\|pinsState\|keyBetween\|PinEntry\|PinsResult\|NavChanged\|NavStateResult\|RecentEntry\|hasPendingFavorites\|flushFavorites\|targetKey" src ../.claude | wc -l
grep -rn "'recents'" src/main/db | wc -l
grep -rn "\.nexus/pins\|tombstone" src | wc -l
grep -rn "nav:saveRecents\|nav:saveFavorites\|nav:loadPins\|nav:addPin\|nav:reorderPin\|nav:removePin\|nav:load\b" src | wc -l
```

- [ ] **Step 3: Full gates + `env -u ELECTRON_RUN_AS_NODE npm run build` — all 0.**
- [ ] **Step 4: Commit** `refactor(nav): the old design leaves no shadow` (docs bundled).

---

### Task 9: Closeout

- [ ] **Step 1: Adversarial review of the full diff** (build-breaking agent), findings verified personally before folding; fixes land as their own commits.
- [ ] **Step 2: Live UIX pass** on the dev app: pin/unpin/reorder · favorite toggle · recents stream and its Remove action · tab restore across relaunch · rename-then-relaunch (the abolished stale-path class) · NavView banner set and clear · an outside edit to `navigation.json` refreshing the open app.
- [ ] **Step 3: Update `Handoff.md`** to the post-refactor state and commit.

---

#### Self-Review Record

Spec coverage: every Decision Log ruling maps to a task — the file and its contract (1), the channel collapse and quit gate (2), arrays-as-order and the cap's home (3), the banner's two-writers answer (4), hydration as the lockstep owner (5), watcher echo (6), no-migration hand-authoring (7), total erasure (8). Type consistency: `NavRef`/`NavigationFile`/`StoredTab` are defined once in Task 1/5 and consumed by name everywhere after. Known open verification: Task 6 Step 1 is a real check with both outcomes specified, not a placeholder.
