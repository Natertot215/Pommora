## Asset Directory — Implementation Plan

> **Status:** written, pending review · Spec: [[Asset Directory — Decision Log]] · Execute tasks in order.
> Citations name files and symbols; re-derive before editing.

**Goal**

The nexus asset directory becomes user-configurable. A folder inside the nexus — default `.nexus/assets`, pointed in practice at the Obsidian attachments folder `file-assets/` — holds banners and the profile image as ordinary files under their own names, referenced from Pommora by the Obsidian wikilink `[[Banner.png]]`. Both applications read the same files under the same names, and neither owns them.

The shape is set by one measurement: **34 of the 46 page covers in the live nexus are already `[[Pasted image …]]` wikilinks, and another 10 are web URLs — all 44 render nothing today.** `assetUrl` branches on nothing, so a wikilink becomes a 404 and a web address becomes a 403 against the protocol's containment check. The dominant effect of this work is therefore repair, not migration; only 14 references actually move. That measurement also settles where resolution belongs. Resolving in main would make every banner a derived join with no reverse index behind it, so an image arriving in a synced folder could only be reflected by a full re-walk — the exact whole-nexus rebuild the house rule forbids. Resolving in the renderer against a pushed map makes a phantom that becomes real repaint itself. Ratified by Nathan after the alternative was put and rejected.

Nothing about an asset is persisted but its filename — no inode, no birth time, no size, no hash. That is what makes a sync eviction and re-download a non-event, and it is why an external rename phantoms the reference instead of being chased: the page cascade is app-initiated only, and assets inherit that rule unchanged rather than acquiring a detection mechanism of their own.

**Constraints.** No asset rename op ships — Pommora selects files, it does not rename them. No reverse index of which store references which file. No new dependency. Thumbnails stay pinned to `.nexus/assets` regardless of the setting. This does not solve the `file` property's `FileRef`, web-paste image landing, or an asset-management surface.

**Requirements**

1. `asset_directory` is a top-level key in `.nexus/settings.json`, readable as a tree leaf, writable from Settings › Files & Links › Default Asset Directory.
2. The chosen folder is validated, not restricted: any folder inside the nexus root, refused when it holds `.md` files or a sidecar.
3. The asset root is excluded from the content corpus and from the tree, and is watched regardless of `excluded_folders`.
4. No asset filesystem event causes a tree walk.
5. `[[Name.ext]]` resolves renderer-side by filename against a map main owns; a raw path and a web URL pass through untouched.
6. Duplicate filenames resolve to the first by sorted path for display, and refuse resolution where a delete depends on them.
7. No picker offers an asset whose filename is duplicated under the asset roots.
8. Picking a banner copies the file in under its own basename, or references it in place when it already sits under an asset root.
9. All six stores' `.nexus/assets` references migrate to wikilink form; byte-identical files collapse to one; `.nexus/assets` ends holding nothing.

**Acceptance — the whole thing working:** With `asset_directory` set to `file-assets`, the live nexus opens with all 46 page covers rendering (34 pre-existing wikilinks, 10 web URLs, 1 migrated, 1 other), all 10 container banners, the homepage banner, the NavView banner and the profile image rendering, `.nexus/assets` empty of everything but regenerated thumbnails, `file-assets/` holding 12 new files and no duplicates, and dropping 50 images into `file-assets/` from Obsidian producing no tree walk.

**Forced By** *(what each grounded fact makes mandatory or impossible)*

- `ignoredUnder` compiles chokidar's `ignored` from `excludedMatcher` ([watcher.ts:41](../../Pommora/src/main/watcher.ts#L41)), and `classifyEvent` returns `ignored` for the same match ([watchPatch.ts:115](../../Pommora/src/main/watchPatch.ts#L115)) → an asset root named in `excluded_folders` delivers zero events, so the asset test must run *first* in both, ahead of the exclusion match and ahead of `ignoredUnder`'s dot-prefix rule.
- `classifyEvent`'s terminal arm is `full-refresh` ([watchPatch.ts:162](../../Pommora/src/main/watchPatch.ts#L162)), and its `.nexus` branch refuses everything but settings/homepage/space-meta → every externally-written image forces a whole-nexus walk without a dedicated arm. `.nexus/assets` is dormant today only because `atomicWriteBinary` calls `recordWrite` and `isRecentWrite` eats the echo.
- IPC strips object identity ([treeStabilize.ts:1](../../Pommora/src/shared/treeStabilize.ts#L1)) → an unstabilized pushed map re-renders every banner consumer on every file a sync delivers.
- `readNexus.ts:203` states the decoder, the walk's tree literal and `watchPatch`'s `applySettingsLeaves` must never disagree → a new tree leaf is threaded through exactly three places, and a write calls `confirmSettingsWrite()`.
- `thumbsRel` derives from `ASSETS_DIR_REL` ([nexusPaths.ts:36](../../Pommora/src/shared/nexusPaths.ts#L36)) and the protocol containment check hard-codes the same constant ([index.ts:239](../../Pommora/src/main/index.ts#L239)) → the first stays pinned, the second must learn the configured root, or every migrated image 403s.
- `navigation.json` gates its banner with `isAssetPath` on **read** as well as write ([navigationFile.ts:71](../../Pommora/src/main/io/navigationFile.ts#L71), `:114`) → a wikilink that fails that gate makes the NavView banner vanish silently on the next read.
- Zero references to the assets folder exist in `src/main/crud`, `record.ts` or `remint.ts` (0 hits against a 243-hit control) → deleting an entity strands its `.nexus/assets/<id>/` folder, so the migration walks the **stores**, never the directory.
- `writeImageAsset` ([mutate.ts:105](../../Pommora/src/main/mutate.ts#L105)) is the sole minter, from four call sites → one writer to convert, not six.
- 21 non-thumbnail files hold ~12 unique images; `IMG_0073.jpeg` exists as 7 byte-identical copies → a flat destination makes collapse-by-hash the only migration that renames nothing.
- The page rename cascade is app-initiated only ([mutate.ts:275](../../Pommora/src/main/mutate.ts#L275)) → assets phantom on external rename, and no detection mechanism is built.

**Inherited Reasoning** *(ruled out; do not retry)*

- **Main-side resolution into the tree.** Makes the banner leaf a derived join; without a reverse index the only way to reflect an appearing asset is a full walk. Rejected — reintroduces the storm Requirement 4 exists to prevent.
- **A birth-time latch to detect external renames.** Reuses the re-mint pass's own trick, but it is the single component a sync eviction and re-download breaks. Dropped: persisting nothing but the filename removes the failure instead of handling it.
- **`excluded_folders` as the asset-exclusion mechanism.** It is four consumers of one predicate, two of which govern the watcher. Asset indexing outranks it rather than joining it.
- **A SQLite asset table on the `contentIndex` seam.** Nothing derived from an asset needs to survive a restart. The map is a directory listing; the stat gate, seed and prune are all moot.
- **An asset rename op to give the cascade a caller.** Rejected as a surface that has not been designed. Requirement set carries no cascade.
- **Extracting a field-with-trailing-affordance design-system component.** `--input-field` is already a token ([color.css.ts:85](../../Pommora/src/renderer/src/design-system/tokens/color.css.ts#L85)) and `field` an exported style; composing it is consumption, not duplication.
- **Naive 1-1 migration.** Physically impossible — seven files share the name `IMG_0073.jpeg` and the destination is flat.

**Grounding** *(re-open these; don't cite them)*

- `src/shared/nexusPaths.ts` — `ASSETS_DIR_REL`, `thumbsRel`, `NON_CORPUS_TOP`.
- `src/main/exclusion.ts` — `hiddenName`, `shouldSkipDir`, `excludedMatcher`, `sameExclusions`.
- `src/main/watcher.ts` / `src/main/watchPatch.ts` — `ignoredUnder`, `startWatcher`, `settle`, `classifyEvent`, `touchesCorpus`, `applySettingsLeaves`.
- `src/main/io/walk.ts` — `corpusFiles`, `corpusFilesUnder`, `listFilesRecursive`.
- `src/main/readNexus.ts` — `SettingsLeaves`, `readSettingsLeaves`, the tree literal, `readHomepageLeaves`.
- `src/main/settings.ts` — `updateSettings`, `writeSubfield`, `liveLeaves`.
- `src/main/mutate.ts` — `writeImageAsset`, `assetKeyOk`, `createDisambiguated`, `setBanner`, `setProfileImage`.
- `src/main/io/navigationFile.ts` — `isAssetPath` and its read/write gates.
- `src/main/index.ts` — the asset protocol handler, `pickImageDataUrl`, `nexus:choose`, `serveBridge`.
- `src/shared/bridge.ts` / `src/main/ipc.ts` / `src/preload/index.ts` — `Asks`, `Pushes`, `AskEntry`, the `ask`/`on` factories.
- `src/renderer/src/assetUrl.ts`, `src/renderer/src/store.ts`, `src/renderer/src/App.tsx`, `src/shared/treeStabilize.ts`.
- `src/renderer/src/Settings/NexusSettings.tsx`, `Settings/SettingsRow.tsx`, `Components/EditableInput.tsx`, `design-system/components/InteractionField.tsx` + `interactionField.css.ts`, `design-system/components/TextPicker/textPicker.css.ts`.
- `src/renderer/src/MarkdownPM/connections/index.ts` — `buildPageIndex`, the pattern the asset map mirrors.
- `.claude/Guidelines/Data-Layer.md`, `Build-Gotchas.md`, `Lint-And-Accessibility.md`, `Cohesion-Rulings.md`.

**Environment**

- Plan directory: `.claude/Planning/`. Spec: `.claude/Planning/Asset Directory — Decision Log.md`.
- Explorer: `Explore`. Attack reviewer: `build-breaking-agent`. Code reviewer: `code-simplifier` + `/code-review`. Simplification: `code-simplifier`, then `comment-killer-agent`.
- Neutral verifier: `general-purpose`, handed the Decision Log and the commit range only.
- Gate commands: `npm run typecheck` · `npm run test` · `npm run lint`, run from `Pommora/`, exit codes read directly.
- Rules directory: `.claude/Guidelines/`.

**Shapes:** additive · refactor · migration · user-visible · live-data *(the migration runs against Nathan's real nexus)*

**Global Constraints (every task inherits these):**

- Gates, from `Pommora/`: `npm run typecheck` (both tsconfig projects), `npm run test`, `npm run lint`. Never read an exit code through a pipe — `set -o pipefail` or read the summary line.
- Biome owns formatting (single-quote, no semicolons); a PostToolUse hook formats every TS/CSS/JSON write. Never hand-align. An Edit failing on whitespace means Biome reformatted — re-read and retry.
- Comments carry *why* only, never a value its own declaration holds, never a status claim. `KNOB` and `(Nathan's call)` markers are functional — never strip them.
- Tokens come from `design-system/tokens`; never hand-roll one.
- Main owns the filesystem; the renderer never touches Node. IPC never throws across the boundary — every data channel returns the `Result` envelope, every channel declared once in `src/shared/bridge.ts`.
- Stage explicit paths, never `git add -A` or a directory. Bundle related doc edits into the commit that makes them true.
- Report +/- line counts after each phase, excluding comments and tests.
- Out of scope everywhere: the `file` property's `FileRef`, web-paste image landing, any asset rename op, any change to `thumbsRel`'s pinning, `heading_icon_hidden` / `profile_icon` (symbol names, not paths).

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| `.claude/Features/CollectionsPM.md:54` | "Banner bytes live under `.nexus/assets/<id>/`, served over the read-only `nexus-asset://` scheme." | Banners live under the configured asset directory and are named by wikilink. | 14 |
| `.claude/Features/ContextsPM.md:16` | "Banner bytes live under `.nexus/assets/<id>/`, served over the read-only asset scheme." | Same. | 14 |
| `.claude/Features/ConfigurationPM.md` | The `settings.json` key inventory omits `asset_directory`; §Pending lists no asset directory. | The key ships with a Settings row. | 14 |
| `.claude/Features/PagesPM.md` | Any claim that `cover` holds a nexus-relative path. | `cover` holds a wikilink, a raw path, or a web URL. | 14 |
| `src/shared/nexusPaths.ts:28` doc comment | "Attachment storage, keyed per asset below it." | It is the thumbnail root and the default asset root; user assets are not keyed below it. | 1 |

**Dead Vocabulary** *(the closing sweep)*

- `rg -F "banner-" src` → expect 0. Legitimate hits: none — the invented-name minting retires with Task 11.
- `rg -F "profile-" src` → expect 0. Legitimate hits: none.
- `rg -F "sameExclusions" src` → expect 0. Legitimate hits: none — superseded by `sameScope` in Task 3.
- `rg -F "pickImageDataUrl" src` → expect 0. Legitimate hits: none — superseded by the path-returning picker in Task 10.
- Control: `rg -F "ASSETS_DIR_REL" src` → expect ≥ 4. Zero here means the sweep never ran.

**Hazard Window:** Task 12 empties `.nexus/assets`. It is opened by Task 12 and closed by Task 13's verification. While open, no gate may be declared green on the strength of a rendering banner alone — a stale browser cache can render an image whose file has moved. Task 13 verifies against a fresh renderer reload (⌘R) with the network panel confirming `nexus-asset://` hits resolving under the configured root.

---

### Phase 1 — The asset root becomes a fact the walk and the watcher share

#### Task 1: Name the two asset roots, and pin the thumbnail root to one of them

**Requirement:** 3

**Why:** `ASSETS_DIR_REL` is currently one constant serving two unrelated jobs — the thumbnail home and the banner home — and the plan splits them. Naming both here, before any consumer changes, is what lets every later task cite one spelling instead of re-deciding per call site; `nexusPaths.ts` exists precisely so a path a lock, a watcher rule and a menu row all speak stays one string.

**Files:**
- Modify: `src/shared/nexusPaths.ts` — `ASSETS_DIR_REL` doc comment; add `DEFAULT_ASSET_DIR_REL` and `THUMBNAILS_SEGMENT`.
- Modify: `src/shared/nexusPaths.ts` — `thumbsRel` keeps deriving from `ASSETS_DIR_REL` and gains a comment stating the pin is deliberate.

**Interfaces**
- Produces: `DEFAULT_ASSET_DIR_REL: string` (= `ASSETS_DIR_REL`) — what `asset_directory` means when absent.
- Produces: `THUMBNAILS_SEGMENT = 'thumbnails'` — the segment the asset map skips.
- Assumed by: Tasks 2, 4, 5, 6, 7.

**Steps:**
- [ ] Add both constants with why-comments; correct `ASSETS_DIR_REL`'s comment per Made False.
- [ ] `npm run typecheck` — expect green.
- [ ] Commit: `refactor(paths): name the default asset root and the thumbnail segment`

#### Task 2: Read `asset_directory` as a tree leaf

**Requirement:** 1

**Why:** `asset_directory` is `excluded_folders`' twin — top-level snake_case, walk-affecting, captured at watcher-arm time — so it reaches consumers the same way rather than through a bespoke reader. `readNexus.ts:203` states the decoder, the tree literal and the watcher patch must never disagree; threading all three in one task is what makes that provable rather than hoped for.

**Files:**
- Modify: `src/main/readNexus.ts` — `SettingsLeaves` interface; `readSettingsLeaves`; the tree literal's flat-leaf block.
- Modify: `src/main/watchPatch.ts` — `applySettingsLeaves`.
- Modify: `src/shared/types.ts` — `NexusTree`, beside `excluded`.
- Modify: `src/main/settings.ts` — `liveLeaves`' `Pick<>`; add `readAssetDirectory`.
- Test: `src/main/readNexus.test.ts`, `src/main/watchPatch.test.ts`.

**Interfaces**
- Produces: `SettingsLeaves.assetDirectory: string` — nexus-relative POSIX, `DEFAULT_ASSET_DIR_REL` when absent, malformed or not a string.
- Produces: `readAssetDirectory(root: string): Promise<string>`.
- Assumed by: Tasks 3, 5, 6, 9, 11, 12.

**Failure half:** absent key → the default. Non-string → the default. Empty string → the default (an emptied value is not a valid root). A leading `/` or a `..` segment → the default, since a leaf is not a validation boundary and must never hand a climbing path to a consumer. Trailing slash → normalized off.

**Must agree:** `readSettingsLeaves` and `applySettingsLeaves` must produce the same value for the same file. One test writes a `settings.json`, walks it, then drives the watcher's settings patch over the same bytes and asserts the two leaves are equal — the disagreement `readNexus.ts:203` warns about is invisible to per-function tests.

**Steps:**
- [ ] Write the failing tests: the five malformed inputs above, plus the walk-vs-patch agreement test.
- [ ] Run — expect failures.
- [ ] Thread the leaf through all three places plus `types.ts`; add `readAssetDirectory`.
- [ ] `npm run typecheck && npm run test` — expect green.
- [ ] Commit: `feat(settings): asset_directory reads as a tree leaf`

#### Task 3: One scope object replaces the threaded exclusion list

**Requirement:** 3

**Why:** `excluded: string[]` is arm-time captured state threaded through six functions, with `sameExclusions` as the re-arm check. The asset root is captured identically and for the same reason, so it widens that one parameter rather than travelling beside it — two values threaded in parallel with two comparisons to keep in agreement is exactly the drift the codebase's one-spelling rule exists to prevent. `assetMatcher` is `excludedMatcher`'s twin so the compile-once-per-list behavior is shared rather than re-derived.

**Files:**
- Modify: `src/main/exclusion.ts` — add `assetMatcher`; add `WatchScope` + `sameScope`; retire `sameExclusions`; widen `shouldSkipDir`.
- Modify: `src/main/watcher.ts` — `ignoredUnder`, `startWatcher`, `settle`.
- Modify: `src/main/watchPatch.ts` — `classifyEvent`, `touchesCorpus`, `applyWatchEvents`.
- Modify: `src/main/io/walk.ts` — `corpusFiles`, `corpusFilesUnder`.
- Modify: `src/main/readNexus.ts` (×3 sites), `src/main/adopt.ts` (×3 sites) — `shouldSkipDir` callers.
- Modify: `src/main/indexSeed.ts` — `nexusCorpus`, `folderCorpus`.
- Test: `src/main/exclusion.test.ts`.

**Derivation**
- `rg -F "shouldSkipDir(" src` → 6 non-definition, non-test at planning time. Legitimate hits: none — all six convert.
- `rg -F "excludedMatcher(" src` → 6 at planning time.
- `rg -F "sameExclusions" src` → expect 0 after; all convert to `sameScope`.
- Control: `rg -F "excluded" src` → 152. Zero here means the search never ran.

**Interfaces**
- Produces: `WatchScope = { excluded: string[]; assetDir: string }`.
- Produces: `assetMatcher(assetDir: string): (segs: string[]) => boolean` — WeakMap-compiled against the string it was built from, root-anchored whole-segment prefix match over `normalizeSeg`.
- Produces: `sameScope(a: WatchScope, b: WatchScope): boolean`.
- Produces: `shouldSkipDir(name: string, relPath: string, scope: WatchScope): boolean`.
- Assumed by: Tasks 4, 5.

**Failure half:** an empty `assetDir` matches nothing (never everything). An `assetDir` equal to the nexus root (`''` or `'.'`) matches nothing — a root-wide asset dir would hide the entire nexus, so the degenerate case refuses rather than obeys. A one-segment dir must not match a sibling whose name merely extends it (`file-assets` vs `file-assets-old`).

**Must agree:** `shouldSkipDir` and `corpusFilesUnder` are two independent skip tests over the same tree. One test walks a fixture holding an asset dir, an excluded dir and a hidden dir, and asserts the tree-visible set and the corpus set agree about all three.

**Negative control:** the asset dir is skipped by the walk — assert a `.md` placed inside it is absent from both the tree and the corpus, and assert that with `assetDir` set to a non-matching value the same file *is* present. A test that passes either way proves nothing.

**Steps:**
- [ ] Write the failing tests, including both halves of the negative control.
- [ ] Run — expect failures.
- [ ] Add `assetMatcher`, `WatchScope`, `sameScope`; widen `shouldSkipDir`; retire `sameExclusions`.
- [ ] Re-derive the three counts; convert every site. A diverged count rewrites this task.
- [ ] `npm run typecheck && npm run test && npm run lint` — expect green.
- [ ] Commit: `refactor(exclusion): one watch scope carries the asset root beside the exclusions`

#### Task 4: The asset root outranks every other skip in the watcher

**Requirement:** 3, 4

**Why:** With Nathan's assets folder already in `excluded_folders`, both the chokidar ignore and the classifier drop every asset event, so nothing downstream can ever see one. Ordering the asset test first — ahead of the exclusion match *and* ahead of `ignoredUnder`'s dot-prefix rule, which would otherwise blind a root named `.attachments` — is what makes `excluded_folders` mean "the content corpus" and nothing more. The dedicated classifier arm is what keeps Requirement 4: without it every externally-written image takes the terminal `full-refresh`.

**Files:**
- Modify: `src/main/watcher.ts` — `ignoredUnder`: asset test as the first statement of the returned predicate.
- Modify: `src/main/watchPatch.ts` — `classifyEvent`: an `asset` arm before the exclusion match and before the `NEXUS_DIR` branch; `touchesCorpus`: an asset path is not corpus movement.
- Modify: `src/main/watcher.ts` — `settle`: re-arm on `!sameScope(current, scope)`.
- Test: `src/main/watchPatch.test.ts`, `src/main/watcher` fixtures.

**Interfaces**
- Produces: `WatchClass` gains `{ kind: 'asset'; rel: string }`.
- Assumed by: Task 6 (which gives the arm its effect).

**Failure half:** an asset event arriving with no live tree → the arm still classifies (it does not depend on the tree). A directory event inside the asset root → classified `asset`, never `full-refresh`. An asset root that *is* `.nexus/assets` → still classified `asset`, not swallowed by the `NEXUS_DIR` branch. A thumbnail write → classified `asset` and ignored downstream, never a walk.

**Negative control:** with the asset dir set to `file-assets`, an event at `file-assets/x.png` classifies `asset` **and** an identical event classifies `full-refresh` when the asset dir is set elsewhere. Both halves, or the arm proves nothing.

**Must agree:** `ignoredUnder` and `classifyEvent` must agree about what an asset path is — a path the watcher delivers but the classifier calls excluded would be silently dropped. One test drives the same path through both.

**Steps:**
- [ ] Write the failing tests, both halves of the negative control, and the agreement test.
- [ ] Run — expect failures.
- [ ] Implement the ordering and the arm; make `touchesCorpus` exclude asset paths.
- [ ] Assert no arm returns `full-refresh` for any path under the asset root — parameterized over `.nexus/assets`, `file-assets`, and `.attachments`.
- [ ] `npm run typecheck && npm run test` — expect green.
- [ ] Commit: `fix(watcher): the asset root is watched ahead of every other skip`

#### Gate 1 — the asset root is a shared fact, and no asset event walks

- [ ] Gates green, exit codes read directly.
- [ ] Derivations re-run against their controls; counts matched, or the divergence rewrote the plan.
- [ ] Both halves of every negative control present and observed failing with the guard disabled.
- [ ] Simplification and review dispatched against `<base>..HEAD`; reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in.

---

### Phase 2 — Resolution

#### Task 5: The asset map, built in main

**Requirement:** 5, 6

**Why:** Resolution needs one filename→paths map, and `buildPageIndex` already models exactly this — a normalized-name map answering `resolved | phantom | ambiguous`. Mirroring it means the trichotomy Requirement 6 and 7 both assume has one meaning in the app. It lives in main because main owns the filesystem, and it is held in memory rather than in `nexus.db` because nothing derived from an asset needs to survive a restart — which is what removes the stat gate, the seed and the prune from this feature entirely.

**Files:**
- Create: `src/main/assetMap.ts`.
- Test: `src/main/assetMap.test.ts`.

**Interfaces**
- Produces: `type AssetMap = Record<string, string>` — normalized filename → nexus-relative POSIX path, the first by sorted path where several answer.
- Produces: `buildAssetMap(root: string, assetDir: string): Promise<AssetMap>`.
- Produces: `assetDuplicates(root, assetDir): Promise<Set<string>>` — normalized names two or more files answer to.
- Produces: `patchAssetMap(map, rel, event): AssetMap` — an add/unlink applied without a re-listing.
- Assumed by: Tasks 6, 7, 8, 9.

**Failure half:** a missing or unreadable asset directory → an empty map, never a throw (`listEntries` already swallows per-directory failures). Zero files → empty map. A file directly at the asset root and one nested → both indexed. A `thumbnails` segment at any depth → skipped. A name differing only by case or Unicode form → one entry, since resolution normalizes.

**Must agree:** the map's ambiguity set and the picker's refusal set (Task 8) must name the same files. One test asserts `assetDuplicates` and the picker's filter agree over a fixture holding a duplicate.

**Steps:**
- [ ] Write the failing tests, including the degenerate cases above.
- [ ] Run — expect failures.
- [ ] Implement over `listFilesRecursive`, normalizing with the same `normalizeSeg`/NFC discipline the connection index uses.
- [ ] `npm run typecheck && npm run test` — expect green.
- [ ] Commit: `feat(assets): the filename map main resolves against`

#### Task 6: Push the map, and keep it current without a walk

**Requirement:** 4, 5

**Why:** Task 4's `asset` arm classifies the event; this gives it its effect. The push is what makes a phantom that becomes real repaint itself — the property that ruled out main-side resolution. It runs through `stabilize` because IPC strips object identity, so an unstabilized push would re-render every banner on every file a sync delivers, which is the same lag the arm exists to prevent, moved one layer out.

**Files:**
- Modify: `src/shared/bridge.ts` — `Pushes` gains `'assets:changed': AssetMap`; `Asks` gains `'assets:map': { args: []; reply: AssetMap }`.
- Modify: `src/preload/index.ts` — `onAssetsChanged: on('assets:changed')`; `assetMap: ask('assets:map')`.
- Modify: `src/main/index.ts` — the `assets:map` handler; build the map at adopt/open.
- Modify: `src/main/watcher.ts` — `settle` applies the `asset` class to the map and pushes.
- Modify: `src/renderer/src/store.ts` — an `assetMap` slot, `applyAssetMap` running `stabilize`.
- Modify: `src/renderer/src/App.tsx` — the subscription effect, beside `onNavChanged`.
- Test: `src/main/watchPatch.test.ts`, store test.

**Interfaces**
- Produces: `useSession(s => s.assetMap)`.
- Assumed by: Task 7.

**Failure half:** no nexus open → an empty map, not an error. A push arriving during a nexus switch → guarded by `sessionRoot()` the way `settle` already guards its tree push. A batch of 50 adds → one push after the settle, never 50.

**Negative control:** dropping 50 files into the asset root produces **zero** `nexus:changed` pushes and exactly one `assets:changed`. Disable the arm and the same batch produces a walk — assert both.

**Steps:**
- [ ] Write the failing tests, including the 50-file negative control in both directions.
- [ ] Run — expect failures.
- [ ] Add the channels, the handler, the store slot, the subscription.
- [ ] Verify `stabilize` returns the previous object for an unchanged map (a zustand no-op).
- [ ] `npm run typecheck && npm run test && npm run lint` — expect green.
- [ ] Commit: `feat(assets): main pushes the asset map; no asset event walks the tree`

#### Task 7: `assetUrl` resolves the three spellings

**Requirement:** 5, 6

**Why:** One function already stands between every stored image value and its URL, and it branches on nothing — which is why 34 wikilink covers 404 and 10 web-URL covers 403 today. Teaching it the three spellings repairs all 44 in one edit and gives Part 2's `FileRef` chips the same resolver. The two thumbnail call sites bypass it because their paths are computed, not stored.

**Files:**
- Modify: `src/renderer/src/assetUrl.ts` — `assetUrl(value, map)`; add `resolveAssetValue`.
- Modify: the 11 non-thumbnail call sites in the Derivation — each selects `assetMap` from the store.
- Leave: `NavGallery.tsx:106` and `CardsView.tsx:103` — computed `thumbRel`, raw by construction.
- Test: `src/renderer/src/assetUrl.test.ts`.

**Derivation**
- `rg -F "assetUrl(" src/renderer` → 13 outside `assetUrl.ts` at planning time; 2 are thumbnail sites that stay raw, 11 convert.
- Control: `rg -F "nexus-asset" src` → ≥ 4. Zero means the search never ran.

**Interfaces**
- Produces: `resolveAssetValue(value: string, map: AssetMap): { kind: 'asset'; rel: string } | { kind: 'external'; url: string } | { kind: 'unresolved' }`.
- Produces: `assetUrl(value: string, map: AssetMap): string | null` — null where nothing renders.

**Failure half:** a web URL → passed through as its own address, never prefixed. A wikilink naming nothing → `unresolved`, and the consumer renders no image rather than a broken one. A raw `.nexus/assets/…` path → passed through as a path (the migration window). An empty string → `unresolved`. A wikilink with an alias (`[[A.png|x]]`) → resolves on the title half, per `titleOf`. A name that is ambiguous → resolves to the first by sorted path.

**Must agree:** `resolveAssetValue` and `parseConnectionText` must agree about what a whole-string wikilink is — an asset value and a Link property value are parsed by two mechanisms, and a spelling one accepts and the other rejects is a silent divergence. One test crosses both.

**Survivors:** the two thumbnail call sites keep passing raw paths and keep their `?v=` cache-busting; `thumbsRel` stays pinned to `ASSETS_DIR_REL`.

**Steps:**
- [ ] Write the failing tests for all six failure-half cases plus the cross-mechanism agreement.
- [ ] Run — expect failures.
- [ ] Implement; re-derive the count and convert the 11 sites.
- [ ] Assert the two thumbnail sites are unchanged (`git diff` names neither).
- [ ] `npm run typecheck && npm run test && npm run lint` — expect green.
- [ ] Commit: `feat(assets): assetUrl resolves wikilinks, paths and web addresses`

#### Task 8: Both security predicates learn the configured root

**Requirement:** 5, 6

**Why:** The protocol handler and the banner delete-guard hard-code `ASSETS_DIR_REL` for opposite reasons, and only one may keep doing so: without this, every migrated image 403s, and `navigation.json`'s read-side `isAssetPath` makes the NavView banner vanish on its next read. They resolve through one shared predicate because two containment tests that disagree is a security defect neither one's tests can see.

**Files:**
- Create: `src/main/assetRoots.ts` — `underAssetRoot(rel, assetDir): boolean`.
- Modify: `src/main/index.ts` — the protocol handler's prefix check.
- Modify: `src/main/io/navigationFile.ts` — `isAssetPath` accepts the wikilink spelling *and* both roots.
- Test: `src/main/assetRoots.test.ts`, `src/main/io/navigationFile.test.ts`.

**Derivation**
- `rg -F "isAssetPath" src` → 8 non-test at planning time.
- Control: `rg -F "ASSETS_DIR_REL" src` → ≥ 4.

**Failure half:** a `..` segment → refused at every root. A backslash → refused. An absolute path → refused. A path under a *sibling* of the asset root whose name extends it → refused. A wikilink → accepted by `isAssetPath` (it names no path to delete) but never handed to `rm` — see the negative control.

**Negative control:** the delete guard refuses an **ambiguous** name — assert `setBanner`'s replace leaves the old file on disk when two files answer to the name, and assert it *does* delete when exactly one does. Both halves.

**Must agree:** the protocol handler and `isAssetPath` must answer identically for the same string. One test crosses both over the same fixture set, including a path under the configured root, one under `.nexus/assets`, and one under neither.

**Steps:**
- [ ] Write the failing tests, both halves of the negative control, and the cross-predicate agreement.
- [ ] Run — expect failures.
- [ ] Implement `underAssetRoot`; route both consumers through it.
- [ ] Confirm `resolveUnderRoot` still runs after the prefix check — the containment realpath is not replaced by it.
- [ ] `npm run typecheck && npm run test && npm run lint` — expect green.
- [ ] Commit: `fix(assets): one containment predicate serves the protocol and the delete guard`

#### Gate 2 — every spelling resolves, nothing escapes the roots

- [ ] Gates green, exit codes read directly.
- [ ] Derivations re-run against controls; counts matched or the plan was rewritten.
- [ ] Both halves of every negative control observed.
- [ ] The 50-file no-walk control observed in both directions.
- [ ] Simplification and review dispatched against `<base>..HEAD`.
- [ ] The app seen running: a nexus with `asset_directory` unset still renders every existing banner (nothing regressed before the migration).
- [ ] Progress hashes filled in.

---

### Phase 3 — The setting's surface

#### Task 9: The folder chooser channel

**Requirement:** 2

**Why:** `nexus:choose` adopts a nexus on its result, so it is a pattern rather than a channel to reuse. Validation lives in main because main owns the filesystem and because a renderer-side check would be advisory — the refusal has to be the same one that would refuse a hand-edited `settings.json`.

**Files:**
- Modify: `src/shared/bridge.ts` — `'assets:chooseDir': { args: []; reply: Result<string | null> }`.
- Modify: `src/preload/index.ts` — the dialer.
- Modify: `src/main/index.ts` — a `kind: 'window'` handler in `serveBridge`.
- Create: `src/main/assetDirValidate.ts` — `validateAssetDir(root, abs): Promise<Result<string>>`.
- Test: `src/main/assetDirValidate.test.ts`.

**Interfaces**
- Produces: `validateAssetDir` — returns the nexus-relative POSIX path, or a typed refusal.
- Assumed by: Task 10.

**Failure half:** cancelled dialog → `ok(null)`, not an error. A folder outside the nexus → refused (`resolveUnderRoot`). A folder holding any `.md` → refused. A folder holding any `_*.json` sidecar → refused. The nexus root itself → refused. A folder that vanished between pick and validate → `not-found`. No nexus open → `NO_NEXUS`. A `kind: 'window'` handler has no envelope net — it must hand-catch, as `nexus:choose` does.

**Negative control:** the refusal fires — a folder seeded with one `.md` is refused, and the same folder with the `.md` removed is accepted. Both halves.

**Steps:**
- [ ] Write the failing tests for all seven failure-half cases and both halves of the control.
- [ ] Run — expect failures.
- [ ] Implement the validator and the handler; `properties: ['openDirectory', 'createDirectory']`, `defaultPath` the nexus root.
- [ ] `npm run typecheck && npm run test` — expect green.
- [ ] Commit: `feat(settings): a validated in-nexus folder chooser for the asset directory`

#### Task 10: The Settings row

**Requirement:** 1, 2

**Why:** Every existing row but `device` writes a `personalization` key, and `device` writes to `nexus.db` — neither is the shape for a top-level `settings.json` key, so the row kind is new and its writer follows `writeSubfield`. The field composes the exported `field` style rather than restating its chrome; `--input-field` is already a token, so this is consumption, not a second copy.

**Files:**
- Modify: `src/renderer/src/Settings/NexusSettings.tsx` — a `path` arm on `Row`; the `RowControl` case; `PathRow`; the row registered in the Files & Links leaf.
- Modify: `src/renderer/src/store.ts` — `setAssetDirectory`.
- Modify: `src/shared/bridge.ts` / `src/preload/index.ts` / `src/main/index.ts` — `'assets:setDir'`.
- Modify: `src/main/settings.ts` — `writeAssetDirectory`, mirroring `writeSubfield`.
- Create: `src/renderer/src/Settings/pathRow.css.ts`.

**Interfaces**
- Consumes: `useSession(s => s.tree?.assetDirectory)`, `window.nexus.assets.chooseDir`.

**Failure half:** typed text naming a folder that fails validation → refused, the field reverts to the stored value, no write. An emptied field → writes no key (the default), per the no-empties rule. A write while no nexus is open → `NO_NEXUS`.

**Must agree:** the typed path and the chosen path go through the *same* validator. One test asserts a string typed into the field is refused for the same reasons the dialog refuses it.

**Skills:** the row is user-visible — the interaction sweep applies. State z-order and the hover/focus reachability of the trailing glyph before implementing, and disclose the exact design to Nathan before writing it (house rule: ask before designing).

**Steps:**
- [ ] Disclose the row's exact appearance and behavior to Nathan; get the go.
- [ ] Add the `path` arm, the case, the component, the channel, the writer.
- [ ] The write calls `confirmSettingsWrite()` — the key is a tree leaf, unlike `subfield`.
- [ ] `npm run typecheck && npm run test && npm run lint` — expect green.
- [ ] Screenshot the row and show it.
- [ ] Commit: `feat(settings): Default Asset Directory`

#### Gate 3 — the setting is settable

- [ ] Gates green. Simplification and review against `<base>..HEAD`.
- [ ] The row seen running, screenshotted, and shown to Nathan.
- [ ] Changing the directory live re-arms the watcher (observe: an event in the new root classifies `asset`).
- [ ] Progress hashes filled in.

---

### Phase 4 — Writing assets under their own names

#### Task 11: The picker returns a path; the writer copies under the file's own name

**Requirement:** 8

**Why:** `pickImageDataUrl` reads the chosen file into a data URL and `writeImageAsset` invents `banner-<token>.png` from it — both halves contradict "an asset keeps whatever name it has on disk." The invented name existed to defeat browser caching; a file picked under its own name changes URL whenever a *different* file is picked, which is the only case that mattered. A file already sitting under an asset root is referenced in place, because copying it would create the duplicate name Requirement 7 refuses.

**Files:**
- Modify: `src/main/index.ts` — `pickImageDataUrl` → `pickImagePath`, returning an absolute path.
- Modify: `src/shared/bridge.ts`, `src/preload/index.ts` — `nexus:pickImage`'s reply type.
- Modify: `src/main/mutate.ts` — `writeImageAsset` → `adoptImageAsset`; export `createDisambiguated`.
- Modify: `src/main/mutate.ts` — `setBanner` (all four arms) and `setProfileImage` store `[[Name.ext]]`.
- Modify: `src/shared/mutate.ts` — the op comments and `dataUrl` field.
- Test: `src/main/mutate.test.ts`.

**Derivation**
- `rg -F "writeImageAsset" src` → 5 at planning time (1 definition, 4 call sites). All convert.
- `rg -F "dataUrl" src` → re-derive; every asset-write path converts to a path.

**Interfaces**
- Produces: `adoptImageAsset(root, assetDir, absSource): Promise<Result<string>>` — returns the wikilink text `[[Name.ext]]`.

**Failure half:** the source already under an asset root → referenced in place, not copied. A basename colliding with a *different* file → disambiguated via `createDisambiguated` (caller splits the extension: base `Sunset`, attempt writes `Sunset 2.png`). A basename colliding with a byte-identical file → referenced in place, no copy. An unreadable source → `Result` failure, and the store is left untouched. A source outside the nexus → copied in (that is the normal case). A name a wikilink cannot spell — one containing `]` — → refused, since `embeddableTitle` already states that constraint.

**Must agree:** `adoptImageAsset`'s output must be a string `resolveAssetValue` resolves. One test writes a banner, then resolves the stored value through the renderer-side resolver against a map built from the same directory, and asserts it reaches the file just written.

**Survivors:** the two thumbnail writers keep `atomicWriteBinary` into `.nexus/assets`; `captureThumbnail` and `evictThumbnails` are untouched.

**Steps:**
- [ ] Write the failing tests, including all six failure-half cases and the round-trip agreement.
- [ ] Run — expect failures.
- [ ] Convert the picker, the writer and the five store arms. Copy via `readFile` + `atomicWriteBinary` so `recordWrite` suppresses the echo — a copy that self-triggers would push a map patch for Pommora's own write.
- [ ] Re-derive both counts; a divergence rewrites this task.
- [ ] `npm run typecheck && npm run test && npm run lint` — expect green.
- [ ] Commit: `feat(assets): a picked image keeps its own name`

#### Gate 4 — new banners land as ordinary named files

- [ ] Gates green. Simplification and review against `<base>..HEAD`.
- [ ] Seen running: picking a banner from outside the nexus lands a file under its own name in the configured directory, the store holds `[[Name.ext]]`, and the banner renders.
- [ ] Seen running: picking a file already inside the asset directory copies nothing.
- [ ] Progress hashes filled in.

---

### Phase 5 — Migration

#### Task 12: Migrate the stores, collapse duplicates, empty `.nexus/assets`

**Requirement:** 9

**Why:** Six stores hold `.nexus/assets` paths minted by the retired writer, and 21 files hold only ~12 unique images. Walking the *stores* rather than the directory is forced: nothing cleans up `.nexus/assets/<id>/` on delete, so a directory walk would carry orphans from long-deleted entities into the user's Obsidian folder as garbage. Collapsing by content hash is what makes a flat destination possible at all — seven files named `IMG_0073.jpeg` cannot coexist. The transform is naturally idempotent: after one run no store holds a `.nexus/assets` path, so a second run finds nothing.

**Files:**
- Create: `src/main/assetMigrate.ts`.
- Modify: `src/main/index.ts` — run it at open, gated.
- Test: `src/main/assetMigrate.test.ts`.

**Derivation** *(predicted against `~/NexusOS`, 08-21-2026 — re-derive at execution)*
- `grep -rh '^cover:' --include='*.md' .` → 46 total: 34 wikilinks (untouched), 10 web URLs (untouched), **1** `.nexus/assets` path (migrates), 1 other.
- `grep -rh '"banner"' --include='_*.json' .` → **10**, all migrate.
- `.nexus/homepage.json` banner → 1. `.nexus/navigation.json` banner → 1. `settings.json` `profile_image` → 1.
- **14 references migrate.** `find .nexus/assets -type f -not -path '*thumbnails*'` → **21** files, **12** unique by md5. Thumbnails → **133**.
- Control: `find .nexus/assets -type f | wc -l` → 154. Zero means the census never ran.

**Naming rule** *(Nathan's call: collapse identical, naming delegated)*
- A file whose current name is real — `IMG_0073.jpeg`, `Untitled design.jpeg`, `Purplish Dark Sky.png` — keeps it. Renaming a file seven entities share after one of them would be wrong.
- A file wearing an invented `banner-<token>` / `profile-<token>` name is named for its owner: `Studio Banner.jpg`, `Knowledge Banner.jpg`.
- The two nexus-level singletons are `nexus-banner.jpg` (NavView) and `nexus-icon.png` (profile). Note the NavView banner is a `.jpg`.
- Byte-identical files collapse to one, which every referencing store then names.

**Failure half:** a reference to a file that no longer exists → the reference is cleared rather than rewritten to a phantom, and the clearance is reported. A store that fails to write → that reference is left byte-identical and named as skipped; the rest continue (one loop item throwing must not abort the pass). A destination name already taken by a *different* file → disambiguated. Zero references → a clean no-op. A second run → finds nothing and does nothing. `asset_directory` unset → the migration does not run at all, since source and destination would be the same folder.

**Migration obligations:**
- **Backup:** every original moves to `.trash` via `trashFileFlat`, so the whole pass is recoverable through the existing trash browser. Nothing is erased outright.
- **Census before write:** the counts above are asserted against the live nexus *before* the first write; a divergence aborts the pass and reports rather than proceeding.
- **Idempotent:** gated on `.nexus/assets` holding a non-thumbnail file — one cheap `readdir`, derived from reality rather than a flag.
- **Invariants after:** every one of the 14 references resolves through `resolveAssetValue` against a freshly built map; the count of files in the destination equals the unique-hash count; `.nexus/assets` holds no non-thumbnail file.

**Negative control:** the orphan exclusion fires — seed an orphaned `.nexus/assets/<dead-id>/x.png` that no store references, run the migration, and assert `x.png` does **not** appear in the destination and **does** appear in `.trash`. Then assert a *referenced* file with the same shape *does* migrate. Both halves.

**Must agree:** the migration's rewritten values and `resolveAssetValue` must agree — a value the migration writes that the resolver cannot read is a silent blanking of every banner at once. The invariant check above crosses both mechanisms and is the gate on the pass.

**Steps:**
- [ ] Write the failing tests over a fixture nexus reproducing the real shape: 7 identical files, an orphan, a web-URL cover, a pre-existing wikilink cover, and one `.nexus/assets` cover.
- [ ] Run — expect failures.
- [ ] Implement: census → assert → hash → collapse → copy → rewrite each store under its own existing lock → verify invariants → trash the originals.
- [ ] Each store is rewritten through its *existing* writer (`updateSettings`, `writeNavigationState`, `rmwJsonStrict`, `rewritePageSerialized`) — never a bespoke write, or the locks the codebase already holds are bypassed.
- [ ] `npm run typecheck && npm run test && npm run lint` — expect green.
- [ ] Commit: `feat(assets): migrate every stored image into the configured directory`

#### Task 13: Verify against the live nexus *(closes the hazard window)*

**Requirement:** 9

**Why:** Task 12 empties `.nexus/assets` in Nathan's real nexus. A rendering banner is not proof — a stale browser cache renders an image whose file has moved. The window opened by Task 12 closes only on a verification that cannot be satisfied by cache.

**Steps:**
- [ ] Back up `~/NexusOS/.nexus` and `~/NexusOS/file-assets` before the first run. Present the census counts to Nathan and get an explicit go — this is live data.
- [ ] Run the migration against the live nexus.
- [ ] Full renderer reload (⌘R), then confirm: all 46 covers render, all 10 container banners, homepage, NavView, profile.
- [ ] Confirm `.nexus/assets` holds no non-thumbnail file; confirm `file-assets/` gained 12 files and no `IMG_0073 2.jpeg`-style duplicates.
- [ ] Confirm the originals are recoverable from the trash browser.
- [ ] Record the observed counts in the Log against the predicted ones.

#### Task 14: Reconcile the documentation

**Requirement:** 1, 9

**Why:** Four documents assert banners live under `.nexus/assets/<id>/`, which this work makes false. The falsifying commit is the only moment anyone knows what went false.

**Files:** `.claude/Features/CollectionsPM.md`, `ContextsPM.md`, `ConfigurationPM.md`, `PagesPM.md`; `.claude/Guidelines/Data-Layer.md` (lessons).

**Steps:**
- [ ] Rewrite each claim in the Made False table. Restate, never amend — no "formerly", no supersede notes.
- [ ] Document `asset_directory` in ConfigurationPM's key inventory.
- [ ] Run the Dead Vocabulary sweep against its control.
- [ ] Commit: `docs(assets): the asset directory is configured, and assets are named by wikilink`

#### Gate 5 — the whole thing working

- [ ] Gates green. Simplification and review against `<base>..HEAD`.
- [ ] The acceptance criterion observed end to end, after a full reload.
- [ ] The hazard window closed by Task 13.
- [ ] Dead Vocabulary sweep returns zero against a non-zero control.
- [ ] Every document in Made False rewritten in the commit that falsified it.
- [ ] Progress hashes filled in; lessons written into `.claude/Guidelines/`.

---

## Implementation Log

### Progress
- [ ] **Phase 1** — The asset root becomes a shared fact · base `<commit>`
  - [ ] Task 1 — Name the two asset roots · `<commit>`
  - [ ] Task 2 — `asset_directory` as a tree leaf · `<commit>`
  - [ ] Task 3 — One scope object · `<commit>`
  - [ ] Task 4 — The asset root outranks every skip · `<commit>`
- [ ] **Phase 2** — Resolution
  - [ ] Task 5 — The asset map · `<commit>`
  - [ ] Task 6 — Push it, keep it current · `<commit>`
  - [ ] Task 7 — `assetUrl` resolves three spellings · `<commit>`
  - [ ] Task 8 — Both containment predicates · `<commit>`
- [ ] **Phase 3** — The setting's surface
  - [ ] Task 9 — The folder chooser channel · `<commit>`
  - [ ] Task 10 — The Settings row · `<commit>`
- [ ] **Phase 4** — Writing assets under their own names
  - [ ] Task 11 — Picker returns a path; writer keeps the name · `<commit>`
- [ ] **Phase 5** — Migration
  - [ ] Task 12 — Migrate, collapse, empty · `<commit>`
  - [ ] Task 13 — Verify against the live nexus · `<commit>`
  - [ ] Task 14 — Reconcile the documentation · `<commit>`

### Rulings
- **Migration naming** — Nathan: "collapse identical, rename to whatever you want." Real names kept, invented names owner-derived, the two singletons `nexus-banner` / `nexus-icon`.
- **`.nexus/assets` emptied outright**, thumbnails included — Nathan wants a clean confirmation that the migration landed. Thumbnails regenerate on use.
- **File-type property values are not migrated** — user-typed paths Pommora never minted; the type is Part 2's subject.
- **Resolution is renderer-side** — Nathan, after the main-side alternative was put and the full-walk consequence explained.

### Open Against Later Tasks
### Deviations
### Lessons
### Sequenced After
- **Part 2 — the `file` property's `FileRef`.** Consumes `resolveAssetValue` and the asset map unchanged.
- **Web-paste image landing** (timestamp/hash names). No clipboard-image handler exists in MarkdownPM today.
- **An asset-management surface**, which is what would give an asset rename cascade a caller.

### Closeout
