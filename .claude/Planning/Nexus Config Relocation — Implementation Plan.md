## Nexus Config Relocation — Implementation Plan

### Context

Three app-owned config files sit flat at the root of `.nexus/`: `crops.json`, `contexts.json`, and `homepage.json`. Each has a natural home in a folder that already exists beside it — `assets/` (crops are per-image framing), `contexts/` (the registry that owns the Context folders there), and `homepage/` (the tile host that already holds `_tiles.json`). This plan moves each file into its domain folder, keeping plain, underscore-free names to match the other flat `.nexus/` config files (`settings.json`, `state.json`, `navigation.json`, `properties.json`, `nexus.json`), which stay where they are.

The change touches the Paths constants that spell these locations, the on-open sequence that seeds a nexus, the file watcher and asset subsystem (which both make assumptions the new crops and homepage locations violate), a migration for existing nexuses, and the tests and Features docs that assert the old layout. It deliberately leaves the seven other `.nexus/` files, the `.nexus/` subfolder structure itself, and the underscore-prefixed sidecar convention (`_tiles.json`, `_space.json`, `_pagecollection.json`) untouched.

### Summary

Three configuration files that Pommora keeps for its own use are being moved from the top of the hidden `.nexus` folder into subfolders that already relate to them, so the folder reads cleanly and each file sits with what it describes. Existing nexuses get a one-time move when they next open, so nothing is lost, and a brand-new nexus creates the folders it needs up front. The move is invisible to the user beyond a tidier file tree: banners, image framing, and Context organization all keep working exactly as before.

The only real risk is that the crops file lands inside the folder the app treats as "user images," and the homepage file lands inside a folder the watcher normally ignores. Both are handled by teaching those systems the one exception, the same way image thumbnails are already excepted today.

#### Constraints

- Gates, from the repo root, each must exit 0: `npm run typecheck` (the only type gate; covers every tsconfig) · `npm run test` (Vitest; output ends in a pass/fail count) · `npm run lint` (`biome check`; runs clean, warnings included). Use `set -o pipefail` if piping — `vitest | tail` masks a red suite.
- Biome's PostToolUse hook formats every TS/JSON write (single quotes, no semicolons). Never hand-align; an Edit failing on whitespace means re-read and retry.
- Plain, underscore-free filenames for all three moved files. No `.collection/`-style per-entity folders — settled out of scope.
- The seven other `.nexus/` config files and the `.nexus/` subfolder layout do not move.
- `NEXUS_CONFIG_FILES` keys keep their names (`crops`, `homepage`); only their string values change. `updateNexusConfig` and `nexusConfig` are the single read/write funnel and are not restructured.
- Single-source path segments in Paths: reuse `CONTEXTS_DIRNAME`, `HOMEPAGE_HOST_DIRNAME`, and a new `ASSETS_DIRNAME` (`NEXUS_CONFIG_FILES` values are nexus-relative, so they take the bare segment, not `ASSETS_DIR_REL`, which already carries the `.nexus/` prefix and would double it). No new hardcoded copies of `'contexts'`, `'homepage'`, or `'assets'` outside Paths.
- Migration shape: the move is in-place on real data (NexusOS is a live nexus). The transform runs on every open and must be safe to run twice — guarded on existence, both-present resolving to the new file, no double-apply.
- Comment discipline: `//` line comments only, minimal, reserved for what the code can't state itself. No block comments (fails lint).
- Report `+/- line-count` excluding comments and tests after the runtime phase.

#### Baseline

Recorded at ratification, after the tree is swept clean and before Task 1.1:

- Gates: `git rev-parse --short HEAD` → `235dbe781`; `npm run typecheck && npm run test && npm run lint` → green.
- `npm run test 2>&1 | tail -1` → `4401 passed (362 files)` — after Phase 1, equals this plus the added regression cases.
- `grep -rn "crops.json" Core --include='*.ts' | grep -v node_modules | wc -l` → `15` — flat-path occurrences retired (store-label string excepted).
- `grep -rn "homepage.json" Core --include='*.ts' | wc -l` → `18` — flat-path occurrences retired (store-label string excepted).
- `grep -rn "contexts.json" Core --include='*.ts' | wc -l` → `15` — flat-path occurrences retired.

Every grep above quotes its `--include` glob; an unquoted `*.ts` errors under zsh and pipes empty into `wc -l`, reading a red state as `0`.

**START:** `2026-09-11T00:59:28Z`
**END:** `2026-09-11T01:52:00Z`

#### Implementation Process

- [ ] **Phase 1** — Relocate, migrate, and reconcile the runtime
  - [x] Task 1.1 — Move the path constants
  - [x] Task 1.2 — Teach the watcher and asset subsystem the two exceptions
  - [x] Task 1.3 — On-open dir seeding and one-time migration
  - [x] Task 1.4 — Reconcile and extend the tests
  - [x] Review Checkpoint — gates green; smoke launch skipped by ruling (see Deviations)
- [x] **Phase 2** — Reconcile the documentation
  - [x] Task 2.1 — Rewrite every old-location claim in the docs

---

### Phase 1 — Relocate, migrate, and reconcile the runtime

**GOAL:** Move all three files to their new locations, make the watcher and asset subsystem tolerate the two files that now sit in folders those systems make assumptions about, seed the folders on open, migrate existing nexuses once, and bring every test onto the new contract so the gates go green. This is one phase because the constant change turns the whole subsystem red at once — nothing here is independently shippable.

#### Task 1.1

**TASK:** Change the three path constants to their new subpaths, single-sourcing the folder segments already defined in Paths. This is the change that turns the dependent tests red; the rest of Phase 1 turns them green.

**FILES:** `Core/Paths/paths.ts`, `Core/Paths/nexusPaths.ts`

**NOW**

```ts
// nexusPaths.ts
export const CONTEXTS_REGISTRY_REL = `${NEXUS_DIR}/contexts.json`
export const CONTEXTS_DIRNAME = 'contexts'
export const CONTEXTS_DIR_REL = `${NEXUS_DIR}/${CONTEXTS_DIRNAME}`
export const ASSETS_DIR_REL = `${NEXUS_DIR}/assets`
// ... (thumbsRel / thumbRel below)

// paths.ts
export const HOMEPAGE_HOST_DIRNAME = 'homepage'
// ...
export const NEXUS_CONFIG_FILES = {
  identity: 'nexus.json',
  settings: 'settings.json',
  state: 'state.json',
  homepage: 'homepage.json',
  navigation: 'navigation.json',
  properties: 'properties.json',
  crops: 'crops.json',
} as const
```

**CHANGE**

- [ ] In `nexusPaths.ts`, reorder so `CONTEXTS_DIRNAME` is declared before `CONTEXTS_REGISTRY_REL`, then derive the registry from it: `CONTEXTS_REGISTRY_REL = \`${NEXUS_DIR}/${CONTEXTS_DIRNAME}/contexts.json\``.
- [ ] In `nexusPaths.ts`, add `ASSETS_DIRNAME = 'assets'` and rederive `ASSETS_DIR_REL = \`${NEXUS_DIR}/${ASSETS_DIRNAME}\`` so the bare segment has one spelling.
- [ ] In `nexusPaths.ts`, next to `thumbsRel`/`thumbRel` (Pommora's other derived files pinned to `ASSETS_DIR_REL`), add `export const CROPS_REL = \`${ASSETS_DIR_REL}/crops.json\``. This is the fixed rel path the watcher and asset map compare against; it stays under `.nexus/assets` regardless of a custom `asset_directory`, exactly like thumbnails, and is a module constant so `indexable`'s per-file loop doesn't rebuild the string.
- [ ] In `paths.ts`, import `ASSETS_DIRNAME` from `./nexusPaths` and set `NEXUS_CONFIG_FILES.homepage` to `\`${HOMEPAGE_HOST_DIRNAME}/homepage.json\`` and `crops` to `\`${ASSETS_DIRNAME}/crops.json\``. The bare `'homepage.json'` filename appears once, here. Leave the other five values unchanged.

**AFTER**

```ts
// nexusPaths.ts
export const CONTEXTS_DIRNAME = 'contexts'
export const CONTEXTS_REGISTRY_REL = `${NEXUS_DIR}/${CONTEXTS_DIRNAME}/contexts.json`
export const CONTEXTS_DIR_REL = `${NEXUS_DIR}/${CONTEXTS_DIRNAME}`
export const ASSETS_DIRNAME = 'assets'
export const ASSETS_DIR_REL = `${NEXUS_DIR}/${ASSETS_DIRNAME}`
// ...
export const CROPS_REL = `${ASSETS_DIR_REL}/crops.json`

// paths.ts
export const HOMEPAGE_HOST_DIRNAME = 'homepage'
// ...
export const NEXUS_CONFIG_FILES = {
  identity: 'nexus.json',
  settings: 'settings.json',
  state: 'state.json',
  homepage: `${HOMEPAGE_HOST_DIRNAME}/homepage.json`,
  navigation: 'navigation.json',
  properties: 'properties.json',
  crops: `${ASSETS_DIRNAME}/crops.json`,
} as const
```

**VERIFY**

- [ ] `npm run typecheck` passes (values stay string literals; `NEXUS_CONFIG_FILES` and `CONTEXTS_REGISTRY_REL` consumers compile unchanged).
- [ ] A unit assertion (add if none exists) confirms `nexusConfig(root, NEXUS_CONFIG_FILES.crops)` ends in `/.nexus/assets/crops.json` (single `.nexus`, not doubled) and `.homepage` in `/.nexus/homepage/homepage.json`, and `CONTEXTS_REGISTRY_REL === '.nexus/contexts/contexts.json'`.
- [ ] `grep -rn "'assets'\|'homepage'\|'contexts'" Core/Paths --include='*.ts'` shows each bare segment defined once, no new copy.

#### Task 1.2

**TASK:** Make the watcher stop ignoring `homepage.json` in its new folder, classify a crops write before the asset arm claims it, stop the asset map and the legacy-root sweep from treating `crops.json` as a user image, and reserve the `crops.json` name at the assets root so an import can never shadow the config. Each of the first three mirrors the thumbnails exception already in place.

**FILES:** `Core/Nexus/watchSettle.ts`, `Core/Nexus/watchPatch.ts`, `Core/Assets/assetMap.ts`, `Core/Assets/assetMigrate.ts`, `Core/Assets/assetWrite.ts`

**DEPENDENCIES:** Task 1.1 (uses `CROPS_REL` and the new `NEXUS_CONFIG_FILES.homepage`). Shares Phase 1's green gate with 1.4.

**NOW**

```ts
// watchSettle.ts ignoredUnder — the branch that swallows non-_tiles files under .nexus/homepage/
(segs[0] === NEXUS_DIR &&
  segs[1] === HOMEPAGE_HOST_DIRNAME &&
  segs.length >= 3 &&
  segs[2] !== TILE_DOC_FILENAME) ||

// watchPatch.ts classifyEvent — asset arm is FIRST (line ~108); crops-leaf compare is at line ~128
if (assetMatcher(scope.assetDir)(segs)) return { kind: 'asset', rel, event: ev.event }
// ...
if (rel === `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.crops}`) return { kind: 'crops-leaf' }

// assetMap.ts indexable
return !(rel.startsWith(`${ASSETS_DIR_REL}/`) && below.includes(THUMBNAILS_SEGMENT))

// assetMigrate.ts sweepLegacyRoot
const files = (await listFilesRecursive(dir)).filter(
  (abs) => !abs.split('/').includes(THUMBNAILS_SEGMENT),
)
```

**CHANGE**

1. [ ] `watchSettle.ts`: `ignoredUnder` already imports `NEXUS_CONFIG_FILES` and computes `rel`; except the homepage doc by its full rel, the same string the classifier uses: change the branch tail to `segs[2] !== TILE_DOC_FILENAME && rel !== \`${NEXUS_DIR}/${NEXUS_CONFIG_FILES.homepage}\``. No new constant.
2. [ ] `watchPatch.ts`: import `CROPS_REL` from `../Paths/nexusPaths`. At the top of `classifyEvent`, immediately after `name` is computed and **before** the asset arm, add `if (rel === CROPS_REL) return { kind: 'crops-leaf' }`. Remove the now-unreachable lower crops compare, leaving the homepage compare in place.
3. [ ] `assetMap.ts`: import `CROPS_REL`, and extend `indexable` so the crops file is never indexed as an asset: `return !(rel.startsWith(\`${ASSETS_DIR_REL}/\`) && (below.includes(THUMBNAILS_SEGMENT) || rel === CROPS_REL))`.
4. [ ] `assetMigrate.ts`: replace `sweepLegacyRoot`'s hand-rolled thumbnails split with the `indexable` predicate, which now excludes both thumbnails and crops: `.filter((abs) => indexable(relPosix(root, abs), ASSETS_DIR_REL))`. Add `indexable` to the `../Assets/assetMap` import and drop the now-unused `THUMBNAILS_SEGMENT` import (this is its only use here).
5. [ ] `assetWrite.ts`: import `CROPS_REL` from `../Paths/nexusPaths`. In `writeAssetFile`, after `const dir = assetsDir(root, assetDir)` and before `mkdir`, reject a write that would land on the reserved crops path: `if (relPosix(root, join(dir, base)) === CROPS_REL) return fail('reserved', \`${base} is a reserved name at the assets root.\`)`. This is the single choke point for every in-app asset write (`adoptFile` and the asset-dir migration both route through it), so the app can never create a file that shadows `.nexus/assets/crops.json`. A same-named file in a subfolder is untouched — only the root path is reserved.

**AFTER**

```ts
// watchSettle.ts
  segs[2] !== TILE_DOC_FILENAME && rel !== `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.homepage}`) ||

// watchPatch.ts classifyEvent (top, before the asset arm)
if (rel === CROPS_REL) return { kind: 'crops-leaf' }
if (assetMatcher(scope.assetDir)(segs)) return { kind: 'asset', rel, event: ev.event }
// ... (the later crops compare removed; homepage compare unchanged)

// assetMap.ts
return !(rel.startsWith(`${ASSETS_DIR_REL}/`) && (below.includes(THUMBNAILS_SEGMENT) || rel === CROPS_REL))

// assetMigrate.ts
const files = (await listFilesRecursive(dir)).filter((abs) =>
  indexable(relPosix(root, abs), ASSETS_DIR_REL),
)

// assetWrite.ts writeAssetFile (top)
const dir = assetsDir(root, assetDir)
if (relPosix(root, join(dir, base)) === CROPS_REL)
  return fail('reserved', `${base} is a reserved name at the assets root.`)
await machine().mkdir(dir)
```

**VERIFY**

- [ ] `npm run typecheck` and `npm run lint` pass (the dropped `THUMBNAILS_SEGMENT` import leaves no unused-import diagnostic).
- [ ] `grep -n "crops-leaf" Core/Nexus/watchPatch.ts` → one classify site (above the asset arm) plus the `applyOne` case; the lower duplicate is gone.
- [ ] No new hardcoded `'crops.json'`/`'homepage.json'` literals; the five edits reference constants only.
- [ ] A regression test: `writeAssetFile` rejects `crops.json` at the assets root (`fail('reserved')`) and still writes `crops.json` in a subfolder — goes red without edit #5.
- [ ] `assetRoots.ts` was intentionally left alone: `assetFileToDelete` is called only with banner/profile values, and edit #3 keeps crops out of the asset map, so it can never resolve the crops path — no guard needed there.

#### Task 1.3

**TASK:** Add one on-open step that creates the three domain folders and moves any file still at its old flat location into its new one, then wire it into the open sequence ahead of the registry seed. This both fixes the fresh-nexus case (the folders must exist before the first write) and migrates existing nexuses once.

**FILES:** `Core/Nexus/migrateConfig.ts` (new), `Core/Nexus/handlers.ts`, `Core/Nexus/migrateConfig.test.ts` (new)

**DEPENDENCIES:** Task 1.1 (reads the new-path constants). `handlers.ts` `prepareOpenedNexus` runs on every open before `ensureContextsRegistry`, so the seed step lands after the folders exist.

**NOW**

```ts
// handlers.ts prepareOpenedNexus
async function prepareOpenedNexus(path: string): Promise<void> {
  try {
    await ensureIdentity(path)
    await ensureContextsRegistry(path)
  } catch (e) {
    console.error('ensure config-on-open failed:', e)
  }
  // ...
}
```

`write-file-atomic` (behind `machine().writeText`) does not create parent directories, and no writer of the three files ensures its parent. On a fresh nexus only `.nexus` itself is created (by `ensureIdentity`); `.nexus/contexts`, `.nexus/homepage`, and `.nexus/assets` do not yet exist, so the registry seed and the first banner/crop write would throw.

**CHANGE**

1. [ ] Create `Core/Nexus/migrateConfig.ts` exporting `ensureConfigLayout(root: string): Promise<void>`. It:
   - `mkdir` (recursive/idempotent, via `machine().mkdir`) `join(root, ASSETS_DIR_REL)`, `join(root, CONTEXTS_DIR_REL)`, and `tileHostDir(root)`.
   - For each of the three moves — old `join(root, NEXUS_DIR, 'crops.json')` → `nexusConfig(root, NEXUS_CONFIG_FILES.crops)`; old `join(root, NEXUS_DIR, 'homepage.json')` → `nexusConfig(root, NEXUS_CONFIG_FILES.homepage)`; old `join(root, NEXUS_DIR, 'contexts.json')` → `contextsRegistryFile(root)` — apply this rule: if the old file does not exist, do nothing; if the old exists and the new does not, `recordWrite` both paths then `machine().rename(old, new)`; if both exist, `recordWrite(old)` then `machine().remove(old)` — the new file is the canonical migrated copy and most recent wins. The edit #5 import guard means the app can never place a non-config file at the new crops path, so the both-present case is always a prior migration or a cross-branch flat rewrite, never a collision. The three old-location literals live only in this file, existing solely to be retired.
2. [ ] In `handlers.ts` `prepareOpenedNexus`, call `await ensureConfigLayout(path)` inside the same `try`, before `ensureContextsRegistry(path)`. Import from `./migrateConfig`.
3. [ ] Write `migrateConfig.test.ts` (red first): a nexus with old-location files gets them moved and readable at the new paths after `ensureConfigLayout`; running it a second time is a no-op; a nexus with a file at both old and new keeps the new content and drops the old; a fresh nexus with no files ends with the three folders present.

**AFTER**

```ts
// handlers.ts prepareOpenedNexus
async function prepareOpenedNexus(path: string): Promise<void> {
  try {
    await ensureIdentity(path)
    await ensureConfigLayout(path)
    await ensureContextsRegistry(path)
  } catch (e) {
    console.error('ensure config-on-open failed:', e)
  }
  // ...
}
```

**VERIFY**

- [ ] `npm run test -- migrateConfig` passes; reverting the `ensureConfigLayout` body turns the new tests red.
- [ ] Idempotency: the second-open case asserts no throw and unchanged new-path content.
- [ ] `recordWrite` is called on every path handed to `rename`/`remove`, so the watcher drops the echo (confirm against `writeEcho` usage elsewhere).
- [ ] Review the file for a hand-rolled `mkdir`/exists helper where `machine()` + `pathExists` already exist.

#### Task 1.4

**TASK:** Bring every test that seeds or asserts an old file location onto the new paths, and add regression coverage for the two collision fixes. After this task the full suite is green on the new contract.

**FILES:** `Core/Contexts/contextsRegistry.test.ts`, `Core/Nexus/readNexus.test.ts`, `Core/Nexus/watchPatch.test.ts`, `Core/Nexus/remintLedger.test.ts`, `Core/Nexus/treeShape.test.ts`, `Core/Nexus/mutatePatch.test.ts`, `Core/Nexus/remint.test.ts`, `Core/Nexus/mutate.test.ts`, `Core/Index/indexMaintenance.test.ts`, `Core/Tiles/tilesFile.test.ts`, `Core/Assets/assetMigrate.test.ts`

**DEPENDENCIES:** Tasks 1.1–1.3.

**NOW**

Tests seed and assert the three files at their flat locations, e.g.:

```ts
// contextsRegistry.test.ts
expect(contextsRegistryFile(root)).toBe(join(root, '.nexus', 'contexts.json'))
// readNexus.test.ts
w(join(r, '.nexus', 'contexts.json'), '{corrupt'); expect(t.unreadable?.map(u => u.path)).toEqual(['.nexus/contexts.json'])
// watchPatch.test.ts
expect(kind(ev('change', '.nexus', 'crops.json'))).toBe('crops-leaf')
expect(kind(ev('change', '.nexus', 'homepage.json'))).toBe('homepage-leaf')
expect(kind(ev('change', '.nexus', 'contexts.json'))).toBe('full-refresh')
// assetMigrate.test.ts
writeFile(join(root, '.nexus', 'crops.json'), ...); read('.nexus/crops.json')
writeFile(join(root, '.nexus', 'homepage.json'), ...); read('.nexus/homepage.json')
// mutate.test.ts (also test titles naming the old path)
```

**CHANGE**

- [ ] Update every seed/read/assert to the new paths: `contexts.json` → `contexts/contexts.json`, `crops.json` → `assets/crops.json`, `homepage.json` → `homepage/homepage.json`. This includes the `unreadable` assertion in `readNexus.test.ts` (`['.nexus/contexts/contexts.json']`) and the `remintLedger.test.ts` baseline literal.
- [ ] Create the new parent dir in every fixture that writes a moved file with raw `node:fs` (which does not mkdir, unlike the runtime's `ensureConfigLayout`): add `mkdir('.nexus/assets')` / `mkdir('.nexus/homepage')` / `mkdir('.nexus/contexts')` to the `beforeEach` (or the local setup) wherever it does not already exist. Confirmed-affected: `watchPatch.test.ts` (`beforeEach` mkdirs only `.nexus/contexts/...`, `Notes`, `Loose` — needs `.nexus/assets` and `.nexus/homepage`), `mutate.test.ts` (`beforeEach` mkdirs only `.nexus`, `Notes/Daily` — needs both), `assetMigrate.test.ts` (needs `.nexus/homepage` for its homepage writes). Audit each of the eleven files: a raw `writeFile` to a moved path whose parent isn't already mkdir'd throws ENOENT, which reads as a suite error, not an assertion failure.
- [ ] In `watchPatch.test.ts`, the event paths become the new subpaths; `crops` → `crops-leaf`, `homepage` → `homepage-leaf`, `contexts` → `full-refresh` still hold.
- [ ] Update test titles that name the old path (`mutate.test.ts` "sets a homepage banner in .nexus/homepage.json", "…never homepage.json", "a corrupt crops.json…") to the new location.
- [ ] Leave the `store: 'homepage.json'` label assertion in `assetMigrate.test.ts` as-is; that string is a skip-report store identifier, not a filesystem path (see Open Items).
- [ ] Fix the directory-contents assertions the preserved crops file now falsifies — these carry no old-path literal, so the grep VERIFY cannot catch them. Confirmed: `assetMigrate.test.ts:125` asserts `readdir('.nexus/assets')` → `[]` ("empties `.nexus/assets` outright"), but `sweepLegacyRoot` now keeps `crops.json` and `migrateAssets` writes `crops.json` there via `updateCrops` after the sweep (its mutation is never null, so the write always lands). Update the expectation to `['crops.json']` and reword the test title, or filter `crops.json` out of the assertion. Sweep for siblings: `grep -rn "readdir(" Core --include='*.test.ts'` and audit every assertion on the contents of `.nexus/assets`, `.nexus/homepage`, or `.nexus/contexts` (candidates: `mutate.test.ts` `readdir(assets)` at 706/733).
- [ ] Add regression tests: in `watchPatch.test.ts`, a change event at `.nexus/assets/crops.json` classifies `crops-leaf` (not `asset`), and a change at `.nexus/homepage/homepage.json` is not swallowed by `ignoredUnder` and classifies `homepage-leaf`. In `assetMap.test.ts` (or the nearest asset-map suite), a `crops.json` under the assets dir is excluded by `indexable`.

**AFTER**

Every path literal and title reflects the new layout; the two collision fixes carry a test that goes red without Task 1.2.

**VERIFY**

- [ ] `set -o pipefail; npm run test 2>&1 | tail -5` — full suite green, count equals Baseline plus the added regression cases.
- [ ] Reverting Task 1.2's `watchPatch.ts` crops-before-asset reorder turns the new crops-classify regression test red.
- [ ] `grep -rn "'\.nexus', 'crops.json'\|'\.nexus', 'homepage.json'\|'\.nexus', 'contexts.json'\|\.nexus/crops.json\|\.nexus/homepage.json\|\.nexus/contexts.json" Core --include='*.test.ts'` → no hits (store-label strings excepted). Glob quoted so zsh doesn't fail-open.
- [ ] Check the added tests actually exercise the new path, not a stale copy of the old.

#### Review Checkpoint

- [ ] All gates green from clean on the phase commit range.
- [ ] A unit-level assertion confirms that after `ensureConfigLayout` on a nexus the three folders exist and the three files resolve at their new paths.
- [ ] `grep -rn "\.nexus/crops.json\|\.nexus/homepage.json\|\.nexus/contexts.json" Core --include='*.ts' | grep -v test` → only the migration file's retirement literals.
- [ ] Baseline test count moved only by the added regression cases.
- [ ] One smoke launch on real data (per the project's smoke-launch convention, `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`): open a nexus that predates the move, confirm over CDP that the three files now resolve at their new paths on disk, the old flat paths are gone, and the homepage banner, an image crop, and the Context sidebar all render from the relocated files. This is the autonomous stand-in for a manual verification gate; no human check is required.

---

### Phase 2 — Reconcile the documentation

**GOAL:** Rewrite every doc that states an old file location as current fact, so the Features docs, PRD, and the Sync plan read true. Separate phase because it touches no code and no gate. `HistoryPM.md` is deliberately excluded: History is an append-only ledger and its past entries stay as written.

#### Task 2.1

**TASK:** Correct every old-location claim across the binding docs and the reference docs — one grep-and-replace operation over the three paths.

**FILES:** `.claude/Features/CorePM.md`, `.claude/Features/ContextsPM.md`, `.claude/Features/ConfigurationPM.md`, `.claude/Features/SurfacePM.md`, `.claude/PommoraPRD.md`, `.claude/Planning/Mobile Companion & Pommora Sync — Implementation Plan.md`

**CHANGE**

- [ ] `CorePM.md` `.nexus/` tree (the three lines at the `.nexus/` root): move `contexts.json` under the `contexts/` entry, `crops.json` under `assets/`, `homepage.json` under `homepage/`, matching the sibling dirs already shown. Keep the one-line descriptions.
- [ ] `ContextsPM.md`: "Context identity lives in one file, `.nexus/contexts.json`" → `.nexus/contexts/contexts.json`.
- [ ] `ConfigurationPM.md`: the crop reference "`.nexus/crops.json`" → `.nexus/assets/crops.json`.
- [ ] `SurfacePM.md`: the homepage host-sidecar reference, where it names the file location, → `.nexus/homepage/homepage.json` (the host dir itself is unchanged).
- [ ] `PommoraPRD.md`: both `.nexus/contexts.json` references (registry ownership) → `.nexus/contexts/contexts.json`; leave the unchanged `.nexus/contexts/<Context>/<Space>/` Space-folder path as is.
- [ ] Mobile/Sync plan: the fixture layout listing `.nexus/{…,contexts.json,…}` and the "`.nexus/contexts.json` landing triggers one walk" line → the new subpath, so a future executor seeds the right place.
- [ ] Leave `TilesV2-Spec.md` untouched: its `homepage.json` mention is an incidental schema note about whole-file rewrites, not a location claim.

**VERIFY**

- [ ] `grep -rn "\.nexus/contexts.json\|\.nexus/crops.json\|\.nexus/homepage.json" .claude` → hits remain only in this plan, `TilesV2-Spec.md`, and `HistoryPM.md` (both deliberately untouched).
- [ ] Each edited sentence still reads as neutral encyclopedic description, surgically changed, no amendment framing.

---

### Completion Criteria

**Conformance**

- [ ] No hand-rolled parallel to `machine().mkdir`/`pathExists`/`recordWrite` in the migration; the two exceptions mirror the existing thumbnails carve-out rather than inventing a new mechanism.
- [ ] `git diff --name-only <baseline>..HEAD` matches the files this plan names; nothing else changed.
- [ ] No new hardcoded `'contexts'`/`'homepage'`/`'assets'`/`'crops.json'`/`'homepage.json'` outside `Paths/` and the migration file's retirement literals.

**Correctness**

- [ ] An existing nexus opened once has all three files at their new paths, old paths gone, and banners/crops/Contexts intact.
- [ ] A fresh nexus opens with the three folders created and the registry seeded into `.nexus/contexts/contexts.json`.
- [ ] A crops write under `.nexus/assets/` reaches `patchCropsFromDisk`, not the asset map; a homepage write under `.nexus/homepage/` reaches `patchHomepageFromDisk`, not the ignore.
- [ ] `crops.json` is never resolvable as a connection asset and is never trashed by an asset-directory migration.

**Completeness**

- [ ] Every task ticked; every named file touched; no scaffolding, debug output, or unauthorized TODO in `<baseline>..HEAD`.

**Confirmation**

- [ ] `migrateConfig.test.ts` and the collision regression tests go red with their change reverted.
- [ ] The smoke launch on a pre-move nexus confirmed the files relocated and banners/crops/Contexts render — run and read by the executor, no human gate.

**Continuity**

- [ ] Reconciliation walked; Features, PRD, and the Mobile/Sync plan read true; Deviations each fixed or ruled on.

**Confidence**

- [ ] Gates green from clean on `<baseline>..HEAD`; Baseline grep counts for the old literals are zero in runtime code.
- [ ] Diff size as implied: a small net addition (the migration file and regression tests), no unexplained growth.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct — the files moved, the systems that assumed the old layout taught the one exception each, existing data migrated without loss, and every doc and test reading true. Nothing carried as a concern, nothing deferred where the fix is known, nothing declared that wasn't watched happen. Ambiguity met during execution takes the simplest reading and is recorded here, not raised mid-run. Adjacent edits found in the touched docs that no task made belong to the user — folded into the commit at hand, not reverted.

- [x] Phase review dispatched: Phase 1 (two Opus agents) · Phase 2 (folded into neutral verification, docs-only)
- [x] All findings fixed or ruled on
- [x] Neutral verification passed on `51c2a67aa..HEAD`
- [x] Final pass: gates · baseline · diff · deviations · criteria
- [x] Reconciliation walked; living documents read
- [x] Report delivered

#### Reconciliation

- `Core/Nexus/mutatePatch.ts` — comment "a crops.json write the watcher never sees" still names the leaf correctly (location-agnostic); confirm it reads true, no edit expected — Task 1.2
- `Core/Assets/assetMigrate.ts` — comment "a corrupt crops.json must not block the change" stays true — Task 1.2
- `.claude/Features/CorePM.md` — `.nexus/` layout tree names the three files at the root — Task 2.1
- `.claude/Features/ContextsPM.md` — "`.nexus/contexts.json`" — Task 2.1
- `.claude/Features/ConfigurationPM.md` — crop location "`.nexus/crops.json`" — Task 2.1
- `.claude/Features/SurfacePM.md` — homepage sidecar location — Task 2.1
- `.claude/PommoraPRD.md` — registry at "`.nexus/contexts.json`" (two sites) — Task 2.1
- `.claude/Planning/Mobile Companion & Pommora Sync — Implementation Plan.md` — fixture layout + walk-trigger reference — Task 2.1

#### Report & Closure

Written when the chain is confirmed, in the skill's report shape.

### Open Items

- The `store: 'homepage.json'` label in `Core/Assets/assetMigrate.ts` (asserted in `assetMigrate.test.ts`) is a skip-report identifier, not a path. Ruled to stay `'homepage.json'` for symmetry with the `'navigation.json'` and `'settings.json'` sibling labels, whose files did not move.
- `crops.json` is a reserved name at the assets root. The in-app defense is the edit #5 import guard (Task 1.2), which Nathan chose over soft migration handling. It cannot cover a file placed at `.nexus/assets/crops.json` directly on disk outside the app; under most-recent-wins that on-disk file would shadow the config. This is an accepted local-first edge, not a code path the app can produce.

### Deviations

- **Post-review hardening — two new-collision edges the relocation introduced, both fixed.** The Phase 1 correctness review found two LOW edges that only exist because the files moved. (a) The `writeAssetFile` reserved-name guard compared the path case-sensitively, but Pommora's filesystems are case-insensitive, so `Crops.json` slipped past it — now folded through `caseFold.foldKey`. (b) A Context group titled exactly `contexts.json` would collide with the relocated registry that now shares `.nexus/contexts/`: the failed `mkdir` leaves a phantom registry entry, and deleting that phantom trashes the registry file (Context-identity loss). `invalidContextTitle` now rejects that name, single-sourced as `CONTEXTS_REGISTRY_FILENAME` in `nexusPaths.ts`. Both changes touch `Core/Nexus/util.ts` and `Core/Paths/nexusPaths.ts` (util.ts is outside the plan's named FILES). The plan-mandated `writeAssetFile` reserved-name test, which had been omitted, was added as `Core/Assets/assetWrite.test.ts` alongside a `contexts.json`-title case in `contextWrite.test.ts`; both go red with their fix reverted.
- **Task 1.2 — `sweepLegacyRoot` now also spares `neverWatched` files.** Reusing the `indexable` predicate (the DRY fix the plan prescribes) means the legacy-root sweep now leaves dotfiles/`node_modules`/store files in place, where the old hand-rolled split trashed everything but thumbnails. This is a widening the plan did not state; kept deliberately, since aligning the sweep with the real "is this an indexable asset" predicate is the coherent behavior and trashing a stray `.DS_Store` was the prior wart.
- **Task 1.4 — two `mutate.test.ts` titles left as bare leaf names.** "…never homepage.json" (611) and "a corrupt crops.json…" (974) name the config by its unchanged leaf, not a path, so they read true without an edit; changing them to subpaths would misframe a store name as a location.
- **Baseline grep counts rise, not fall.** The raw `grep "crops.json" Core --include='*.ts'` count goes 15→ higher because the new subpaths (`assets/crops.json`, etc.) still contain the substring. The retirement check is the flat-literal grep (`.nexus/<file>.json` and `'.nexus', '<file>.json'`), which is zero in runtime code outside `migrateConfig.ts`'s retirement literals — not the substring count.
- **Task 2.1 — SurfacePM.md left unchanged.** The plan listed it for the homepage host-sidecar location. Its only reference (`SurfacePM.md:18`) already names the host folder as `.nexus/homepage/` and calls the config file by its bare leaf `homepage.json`, parallel to `_space.json` in the same parenthetical — no `.nexus/homepage.json` root claim exists there, and the leaf name is unchanged by the move. Editing it would break the leaf-name parallel without correcting anything, so it was left as written; it already passes the Phase 2 VERIFY grep.
- **Review Checkpoint — smoke launch skipped by ruling.** The migration runs in place on the live NexusOS registry on open. With Nathan present, he ruled to skip the on-real-data smoke launch and rely on the unit coverage (idempotency, both-present-wins, fresh-nexus seeding, the two collision regressions), verifying himself when he next opens the app. The plan's autonomous stand-in was therefore not run; every other checkpoint item holds.
- **Task 1.4 — ten fixtures beyond the named eleven needed the contexts parent.** The plan's test audit was grep-driven on flat-path string literals, which cannot see a fixture that seeds the registry through `contextsRegistryFile(root)` — a helper, not a literal. Ten such files (`contextWrite`, `contextCascade`, `admission`, `governedWorldWrite`, `repairSweep`, and the five `Trash/*` suites) wrote the registry at its new `.nexus/contexts/contexts.json` path with a raw `writeFile` whose parent did not yet exist, throwing ENOENT (175 failures). Each got a `mkdir(contextsDir(root))` before its registry seed — the same parent-dir fix the plan prescribes for the literal fixtures. No path or assertion logic changed; only the missing directory.
- **Task 1.2, edit #5 — `'reserved'` error code.** The plan's `fail('reserved', …)` requires a code the closed `ErrorCode` union in `Core/Contract/result.ts` did not carry. Added `'reserved'` to that union (one line), the single place codes are declared — `result.ts` is outside the task's named FILES but is the correct home for a new code, and it fits the existing specific-code family (`'invalid-name'`, `'invalid-path'`). No call site branches on the value; the human-readable message carries the meaning.

