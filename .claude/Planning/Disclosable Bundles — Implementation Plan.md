## Disclosable Bundles — Implementation Plan

**DATE:** 10-23-2026
**STATUS:** Ratified 10-23-2026
**SOURCE:** This session's conversation. Nathan's request: archived or trashed Sets and Collections disclose like any other disclosable table row, so a single page or Set can be recovered out of one. His rulings are listed under *§Constraints*.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `$BASE` | {count} | {MM-DD-YYYY hh:mm AM/PM} | {MM-DD-YYYY hh:mm AM/PM} |

### Context

The Trash and each Collection's Archive keep every departed item as a bundle: a stamped folder holding the item, called its artifact, beside a `_record.json`. A trashed Set or Collection, or an archived Set, therefore reads as one row, and nothing inside it can be reached until the whole thing returns.

The shared parts live in `Core/Bundles/`:
- `bundle.ts`, the bundle;
- `record.ts`, its record;
- `placement.ts`, where a restore lands;
- `rows.ts`, the rows the host builds;
- `browser.ts`, the renderer's browser.

Two skins draw those rows:
- **The Trash Frame** (`Core/Settings/TrashFrame.tsx`): MenuItem rows in the Settings window.
- **ArchiveView** (`Core/Archive/ArchiveView.tsx`): a virtualized table sheet.

The ops that spend a bundle are:
- **`restoreTrashed` and `emptyBundle`** (`Core/Trash/spend.ts`);
- **`restoreArchived`** (`Core/Archive/archive.ts`);
- **a delete out of the Archive** (`fromArchive`, `Core/Trash/delete.ts`).

The Archive's own plan settled two things this plan reverses at Nathan's request:
- **One Row per Set:** "an archived Set is one row," because "inline disclosure would split one bundle." (`.claude/Planning/Completed/Archive/Archive — Decisions & Intention.md`, G-2; Planning Findings, Q10)
- **Title Click Opens:** a page's title opened the reader on a single click. (Planning Findings, Q11)

The answer to the split concern is to give an item inside a bundle an address the existing ops can spend in place, with no split on disk.

### Overview

An item inside a Set's or Collection's bundle becomes addressable by its own path, such as `.trash/A/<stamp>__S.deleted/S/T/P.md`. This plan calls it an *inner item*.
- **Reading an Address:** `bundleAddressOf` is the one reader of a store path. It answers the bundle, its store, and the inner item when the path names one. It replaces `storeOf`.
- **Opening an Inner Item:** `openBundle` opens an inner item with a record derived from the bundle's own: its identity, the container ids above it, and the Link values the bundle keeps for its pages. The item itself serves as the artifact.
  - Every op already works on absolute artifact paths, so restore, empty, and Archive delete run unchanged on an inner item.
- **Spending:** the ops change in one place. `spendBundle` removes a whole bundle, or strips from an inner item's bundle only the Link values the item carried away.
- **Undo:** `fileInto` gains a re-nest. Given the address an item held, it files the item back into the folder it sat in while that folder stands, and otherwise re-mints its bundle as it does today.

The renderer keeps each open container's inner rows in one map:
- **Fetching:** it asks for those rows on opening, and once per refresh for every open address in one `bundles:children` call.
- **Drawing:** `treeRows` turns top rows and open inner rows into the one list both skins draw.
- **Batch Coverage:** `outermostOf` keeps a batch from acting on a row and its ancestor together.
- **Clicks:** `rowClick` is the one click intent.
  - A container discloses.
  - A page checks.
  - A double-click leaves a page checked, and ArchiveView opens it in the reader.
- **Batch Restore:** a batch Restore holding homeless rows (every inner item is one) asks once per kind of destination.

The chevron sits right of the label in both skins.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `bundleAddressOf` • Function | The one reader of a store path: its bundle, its store, and the inner item it names. | `Core/Bundles/bundle.ts` |
| `stampedSegment` • Function | The index of a path's stamped bundle segment, shared by `bundleAddressOf` and `originPathOf`. | `Core/Bundles/bundle.ts` |
| `readBundleAt` • Function | An address's bundle, record, artifact, and inner item, read once, for `openBundle` and `listInner`. | `Core/Bundles/bundle.ts` |
| `ContainerRecord` / `isContainerRecord` • Type, Function | A Set's or Collection's record, the kind that holds inner items. | `Core/Bundles/bundle.ts` |
| `trailWithin` • Function | The container ids above a folder inside a container's bundle, outermost first. | `Core/Bundles/bundle.ts` |
| `innerRecord` • Function | The record an inner item carries as its own. | `Core/Bundles/bundle.ts` |
| `keptLinksUnder` • Function | The bundle's kept Link values whose page lies at or under an inner item. | `Core/Bundles/bundle.ts` |
| `spendBundle` • Function | Spends what an op took: the whole bundle, or an inner item's carried Link values off its bundle's record. | `Core/Bundles/bundle.ts` |
| `listInner` • Function | One level of a container address's inner items, in the order the folder's sidecar keeps. | `Core/Bundles/bundle.ts` |
| `OpenBundle.inner` • Field | Marks an open of an inner item. | `Core/Bundles/bundle.ts` |
| `identityOf` • Function | A page's stamped id, or a container's sidecar id and icon. Shared by `gatherContentRecord` and `innerRecord`. | `Core/Bundles/record.ts` |
| `artifactRow` • Function | The one builder of an artifact's row, shared by bundle rows and inner rows. | `Core/Bundles/rows.ts` |
| `innerRows` • Function | The rows of a bundle's inner items. | `Core/Bundles/rows.ts` |
| `bundles:children` • Channel | Lists each given address's inner items as rows. | `Core/Contract/bridge.ts` |
| `TreeRow` • Type | A row as a browser shows it: its depth and whether it's open. | `Core/Bundles/browser.ts` |
| `treeRows` • Function | Top rows, with each open container's inner rows beneath them. | `Core/Bundles/browser.ts` |
| `outermostOf` • Function | Drops each row whose ancestor the same batch holds. | `Core/Bundles/browser.ts` |
| `rowClick` • Function | The browser's one click intent. | `Core/Bundles/browser.ts` |
| `destinationKind` / `destinationTargets` / `askDestination` • Functions | A row's kind of destination, that kind's targets, and the one destination ask that `restoreOne`, the batch, and the menu share. | `Core/Bundles/browser.ts` |
| `titleAccessory` • Prop | Content set inline right of a MenuItem's title text, outside its ellipsis. | `UIX/Menus/MenuRows.tsx` |
| `titleLine` • Style | The line that sets the title text and `titleAccessory` side by side. | `UIX/Menus/menu-row.css.ts` |

**REMOVED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `storeOf` • Function | Replaced by `bundleAddressOf`. | `Core/Bundles/bundle.ts` |
| `leaf` • Parameter | `fileInto` and the `archive` op take `at`, the address the item held. `moveIntoStore` always asks for its own bundle's name back. | `Core/Bundles/bundle.ts`, `Core/Nexus/mutateRequest.ts` |
| `placesFor` • Function | Split into `destinationKind`, `destinationTargets`, and `askDestination`. | `Core/Bundles/browser.ts` |
| Single title-click reader open | Replaced by a page row's double-click. | `Core/Archive/ArchiveView.tsx` |
| The batch's "had nowhere to go" refusal | Replaced by one destination ask per kind. | `Core/Bundles/browser.ts` |

#### Constraints

- **Rulings (settled, don't re-raise):**
  - **Chevron:** it sits right of the label in both skins.
  - **Clicks:**
    - A container row's click discloses it, and its checkbox checks it.
    - A page row's click checks it.
    - An Archive page's double-click opens the reader and leaves the row checked.
  - **Homeless Items:** an inner item whose folder is gone takes the existing homeless path (`homeResolves: false` → Restore ▸). There's no chain-up placement rule.
  - **Batch Restore:** a batch Restore holding homeless rows asks once per kind of destination. Whole homeless bundles follow the same rule.
  - **Nesting:** nested Sets disclose recursively. Inner items take Restore, Delete, check, and batch, and a checked ancestor covers its checked descendants.
  - **Single Rows:** Contexts, Spaces, and properties stay single rows.
  - **Search:** narrows top rows only.
  - **Undo:** re-nests an inner item through one shared primitive in `Core/Bundles/`.
  - **Names:** as written in *§Concepts*.
  - **Partial Mark:** an inner item of a partly recorded container is itself partly recorded. `innerRecord` carries the container's `partial`, so its row shows the Trash's partial mark, and the restore's `recordedPartly` warning names that item under its own landed title, never its container's (Task 1-2, folded into the Restructure's `recordedPartly` at re-grounding).
- **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root, clean at every Review Checkpoint.
- **One Derivation:** each of these has exactly one reader:
  - a store path: `bundleAddressOf`;
  - an address's bundle state: `readBundleAt`;
  - an inner item's record: `trailWithin` + `innerRecord`;
  - an entity's identity: `identityOf`;
  - an artifact's row: `artifactRow`;
  - a click's intent: `rowClick`.
- **No Physical Split:** an inner item is never moved into a bundle of its own before its op. A refused op leaves its bundle untouched.
- **Inner-Item Writes:** listing inner items only reads. Among the inner-item paths, only `spendBundle` and `fileInto` write bundle structure.
- **Never Every-X:** inner items list lazily, never inside `bundles:list`.
  - They're asked for on opening, and once per refresh for every open address in one call.
  - A closed row's whole subtree is forgotten.
- **Addresses Are Canonical:** a whole bundle's address is its folder, and an inner item's is its own path. `checked`, `spendUndo`'s arming, `outermostOf`, and the open map all key on the address.
- **Tests:** each new behavior gets a test that fails without its change, and a rewritten case counts as that test. Reuse `Core/Testing/fixtures.ts`, `testTree.ts`, `hostFs.ts`, and `settledMutate.ts`, along with each suite's local seeders.
- **Comments:** docstrings in the house register where a neighbor has one; no other comments.
- **Imports:** an import that loses its last use leaves in the same task.

#### Process Overview

- [ ] **Phase 1** — Addressing Inside a Bundle
  - [ ] Task 1-1
  - [ ] Task 1-2
  - [ ] Task 1-3
  - [ ] Review Checkpoint
- [ ] **Phase 2** — Filing Back
  - [ ] Task 2-1
  - [ ] Task 2-2
  - [ ] Review Checkpoint
- [ ] **Phase 3** — Listing Inner Items
  - [ ] Task 3-1
  - [ ] Task 3-2
  - [ ] Compaction Checkpoint
- [ ] **Phase 4** — The Browser's Tree
  - [ ] Task 4-1
  - [ ] Task 4-2
  - [ ] Review Checkpoint
- [ ] **Phase 5** — Both Skins
  - [ ] Task 5-1
  - [ ] Task 5-2
  - [ ] Task 5-3
  - [ ] Review Checkpoint
- [ ] **Phase 6** — Documents, Drive, and the Live Pass
  - [ ] Task 6-1
  - [ ] Task 6-2
  - [ ] Task 6-3

---

### Phase 1 — Addressing Inside a Bundle

**GOAL:** Restore, empty, and Archive delete take an inner item as readily as a whole bundle. One address reader and one inner record serve them, and each op spends only what it took. This is the host foundation the rest of the plan builds on.

#### Task 1-1

**TASK:** Add `bundleAddressOf` as the one reader of a store path, share its stamped-segment search with `originPathOf`, and remove `storeOf`.

**NOW:** Two functions find a bundle, each its own way:
- **`storeOf`** (`bundle.ts:42-48`) accepts only a bundle folder, matched by its suffix alone. Its callers are `moveIntoStore` (`:137`), `openBundle` (`:225`), `placement.ts:207`, `mutate.ts:168`, and `bundle.test.ts:28-41`.
- **`originPathOf`** (`:97-102`) finds the stamped segment with its own search.

**CHANGE**

- [ ] Rewrite `bundle.test.ts`'s `storeOf` cases as `bundleAddressOf` cases and add the new ones. Watch them fail.
  - **Answers a Bundle:** a bundle folder answers `{ bundle, store }`.
  - **Answers an Item:** a page or folder inside the artifact answers `item`.
  - **Answers Null:**
    - the artifact itself;
    - a hidden inner segment (`_raw`, `.x`);
    - a path outside both stores;
    - a suffixed folder without a stamp.
  - **Archive Paths:** an Archive path answers its Collection's store.
- [ ] Add `stampedSegment` and `bundleAddressOf`, point `originPathOf` at `stampedSegment`, and move every `storeOf` caller below to `bundleAddressOf`. `openBundle`'s becomes `bundleAddressOf(root, abs)?.store` here, and Task 1-2 rewrites the function.

**AFTER**

```Core/Bundles/bundle.ts diff
-export function storeOf(root: string, bundleAbs: string): BundleStore | null {
-  const rel = relative(root, bundleAbs)
-  const id = archivedCollectionIdOf(rel)
-  const store: BundleStore = id === null ? { kind: 'trash' } : { kind: 'archive', id }
-  const { dir, suffix } = layoutOf(store)
-  return rel.startsWith(`${dir}/`) && rel.endsWith(suffix) ? store : null
-}
+/** The bundle a store path lies in, and the inner item it names inside the bundle's artifact when it names one: the address a row restores, deletes, and files back by. Null for anything else, the artifact itself and a hidden segment included. */
+export function bundleAddressOf(
+  root: string,
+  abs: string,
+): { bundle: string; store: BundleStore; item?: string } | null {
+  const rel = relative(root, abs)
+  const id = archivedCollectionIdOf(rel)
+  const store: BundleStore = id === null ? { kind: 'trash' } : { kind: 'archive', id }
+  const { dir, suffix } = layoutOf(store)
+  if (!rel.startsWith(`${dir}/`)) return null
+  const segs = rel.split('/')
+  const at = stampedSegment(segs, suffix)
+  if (at === -1) return null
+  const bundle = join(root, ...segs.slice(0, at + 1))
+  if (segs.length === at + 1) return { bundle, store }
+  const inner = segs.slice(at + 2)
+  return inner.length && !inner.some(hiddenName) ? { bundle, store, item: abs } : null
+}
+
+/** The bundle is the folder wearing its mint's stamp, so a chain or artifact folder that only wears the suffix is never taken for it. */
+const stampedSegment = (segs: readonly string[], suffix: string): number =>
+  segs.findIndex((seg) => seg.endsWith(suffix) && storedAtOf(seg) !== null)
@@ originPathOf @@
-/** Where a stored file lived: its path under the store's root with the bundle's own folder taken out. The bundle is the folder wearing its mint's stamp, so a chain or artifact folder that only wears the suffix stays in the path. */
+/** Where a stored file lived: its path under the store's root with the bundle's own folder taken out. */
 export function originPathOf(root: string, store: BundleStore, file: string): string {
   const { dir, suffix } = layoutOf(store)
   const segs = relative(join(root, dir), file).split('/')
-  const bundle = segs.findIndex((seg) => seg.endsWith(suffix) && storedAtOf(seg) !== null)
+  const bundle = stampedSegment(segs, suffix)
   return segs.filter((_, i) => i !== bundle).join('/')
 }
@@ moveIntoStore @@
-  const from = storeOf(root, fromBundle)
+  const from = bundleAddressOf(root, fromBundle)?.store
```

```Core/Nexus/mutate.ts diff
@@ case 'restore' @@
-      return storeOf(root, resolved.value)?.kind === 'archive'
+      return bundleAddressOf(root, resolved.value)?.store.kind === 'archive'
```

```Core/Bundles/placement.ts diff
@@ placeRecord @@
-    // The bundle it names was removed, so no realpath answers for it; `join` collapses any `..` before the store's prefix test.
-    const into = storeOf(root, join(root, stored.archive))
+    // The address it names may be gone, so no realpath answers for it; `join` collapses any `..` before the store's prefix test.
+    const into = bundleAddressOf(root, join(root, stored.archive))?.store
```

**VERIFY**

- [ ] `npx vitest run Core/Bundles/bundle.test.ts` is green, with each new case red before its change.
- [ ] `rg "storeOf" Core` finds nothing, and `npm run typecheck` is clean.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-2

**TASK:** Open an inner item through one `readBundleAt` reader, read identity through one `identityOf`, and give the ops one way to spend what they took.

**NOW:**
- **`openBundle`** (`bundle.ts:224-230`) opens a bundle folder only.
- **Identity:** `gatherContentRecord` (`record.ts:158-161`) reads a page's or container's identity inline.
- **Spends:** these are bare `removeOwn` calls at `spend.ts:84`, `spend.ts:108`, `spend.ts:252`, `archive.ts:81`, and `delete.ts:149`.

**CHANGE**

- [ ] Write these `bundle.test.ts` cases over a seeded trashed Collection `A ⟩ S ⟩ T ⟩ P.md`, and watch them fail:
  - **Opening `S`:** its parent is `A.id`, and it has no trail.
  - **Opening `P.md`:**
    - its parent is `T.id` and its trail `[A.id, S.id]`;
    - it carries its stamped `id` and the bundle's `targets`;
    - it holds only the kept values whose title resolves to `P`.
  - **Missing Sidecar ID:** a folder without one leaves its inner item `unaddressable`.
  - **Page Bundle:** an address inside a page bundle opens as `not-found`.
  - **Partial Bundle:** an inner item of a bundle recorded `partial` opens `partial`, and one of a whole record opens without it.
  - **`spendBundle`:**
    - on an inner item, it strips exactly that item's carried values from the bundle's record, matched by `page`, `property`, and `value`;
    - on a whole bundle, it removes the bundle.
- [ ] Add `identityOf` to `record.ts` and route `gatherContentRecord` through it.
- [ ] Add `readBundleAt`, `ContainerRecord`, `isContainerRecord`, `trailWithin`, `innerRecord`, `keptLinksUnder`, `spendBundle`, and `OpenBundle.inner`, and rewrite `openBundle` over `readBundleAt`.
  - Only `openBundle`, `spendBundle`, and `listInner` (Task 3-1) are exported.
  - Every existing caller destructures `OpenBundle` unchanged.

**AFTER**

```Core/Bundles/record.ts diff
+/** A page's stamped id, or a container's sidecar id and icon. */
+export async function identityOf(
+  kind: 'page' | ContainerKind,
+  abs: string,
+): Promise<{ id?: string; icon?: string }> {
+  return kind === 'page' ? { id: await stampedIdOf(abs) } : sidecarIdentity(abs, kind)
+}
@@ gatherContentRecord @@
-  const { id, icon } =
-    kind === 'page'
-      ? { id: await stampedIdOf(abs), icon: undefined }
-      : await sidecarIdentity(abs, kind)
+  const { id, icon } = await identityOf(kind, abs)
```

```Core/Bundles/bundle.ts diff
@@ OpenBundle @@
-/** A bundle as one open reads it: its store, its record, and the one artifact it holds, which a property's record holds none of and a bundle cut short may not. */
+/** A bundle as one open reads it: its store, its record, and the one artifact it holds, which a property's record holds none of and a bundle cut short may not. An inner item opens as `inner`: the record the bundle's own derives for it, and the item as the artifact. */
 export interface OpenBundle {
   abs: string
   store: BundleStore
   record: RecordFile
   artifact: string | null
+  inner: boolean
 }

+type ContainerRecord = Extract<RecordFile, { entity: 'collection' | 'set' }>
+
+const isContainerRecord = (record: RecordFile): record is ContainerRecord =>
+  record.entity === 'collection' || record.entity === 'set'
+
+/** An address read once: its bundle, store, record, and artifact, and the inner item it names, refused when nothing holds that item any more. */
+async function readBundleAt(root: string, abs: string) {
+  const at = bundleAddressOf(root, abs)
+  if (!at) return fault('Only a trash or archive record can be spent.')
+  const record = await readRecord(at.bundle)
+  if (!record) return fault('That record is unreadable.')
+  const artifact = await bundleArtifact(at.bundle)
+  if (
+    at.item &&
+    (!isContainerRecord(record) || !artifact || !isAtOrUnder(at.item, artifact) || !(await pathExists(at.item)))
+  )
+    return fail('not-found', 'That item is no longer there.')
+  return ok({ ...at, record, artifact })
+}
+
+/** The container ids above `folder` inside a container's bundle, outermost first: the bundle's own trail and parent, the bundled container, and each folder down to `folder`; a folder without an id reads `undefined`. */
+async function trailWithin(
+  held: ContainerRecord,
+  artifact: string,
+  folder: string,
+): Promise<(string | undefined)[]> {
+  const steps = relative(artifact, folder).split('/').filter(Boolean)
+  const inner = await Promise.all(
+    steps.map((_, i) => sidecarId(join(artifact, ...steps.slice(0, i + 1)), 'set')),
+  )
+  return [
+    ...(held.trail ?? []),
+    ...(held.parent.kind === 'container' ? [held.parent.id] : []),
+    held.id,
+    ...inner,
+  ]
+}
+
+/** What an inner item carries as its own record: its identity, the trail above it as its parent and trail, unaddressable where an id is missing, the bundle's targets, and its partial mark, since what the bundle recorded partly it recorded partly for each item it holds; no place, since the siblings it left are gone with it. */
+async function innerRecord(
+  held: ContainerRecord,
+  trail: readonly (string | undefined)[],
+  item: string,
+): Promise<RecordFile> {
+  const entity = isMarkdownFile(item) ? 'page' : 'set'
+  const { id, icon } = await identityOf(entity, item)
+  const ids = trail as string[]
+  const addressed = !trail.includes(undefined)
+  return {
+    entity,
+    ...(id ? { id } : {}),
+    ...(icon ? { icon } : {}),
+    parent: addressed ? { kind: 'container', id: ids[ids.length - 1] } : { kind: 'unaddressable' },
+    ...(addressed && ids.length > 1 ? { trail: ids.slice(0, -1) } : {}),
+    ...(held.targets ? { targets: held.targets } : {}),
+    ...(held.partial ? { partial: true as const } : {}),
+  }
+}
+
+/** The Link values the bundle keeps whose page, resolved over the bundle's own pages where they lived, lies at or under `item`; a title two of its pages share stays with the bundle. */
+async function keptLinksUnder(
+  root: string,
+  store: BundleStore,
+  held: ContainerRecord,
+  artifact: string,
+  item: string,
+) {
+  if (!held.links?.length) return []
+  const files = await listMarkdownFiles(artifact)
+  const index = buildPageIndex(files.map((f) => connPage(f, originPathOf(root, store, f))))
+  return held.links.filter((link) => {
+    const target = readLinkText(link.value)
+    const page = target?.kind === 'page' ? index.resolve(target.title).page : undefined
+    return page !== undefined && isAtOrUnder(page.id, item)
+  })
+}

 export async function openBundle(root: string, abs: string): Promise<Result<OpenBundle>> {
-  const store = storeOf(root, abs)
-  if (!store) return fault('Only a trash or archive record can be spent.')
-  const record = await readRecord(abs)
-  if (!record) return fault('That record is unreadable.')
-  return ok({ abs, store, record, artifact: await bundleArtifact(abs) })
+  const read = await readBundleAt(root, abs)
+  if (!read.ok) return read
+  const { bundle, store, record, artifact, item } = read.value
+  if (!item || !artifact || !isContainerRecord(record))
+    return ok({ abs: bundle, store, record, artifact, inner: false })
+  const own = await innerRecord(record, await trailWithin(record, artifact, dirname(item)), item)
+  const links = await keptLinksUnder(root, store, record, artifact, item)
+  return ok({ abs: bundle, store, record: links.length ? { ...own, links } : own, artifact: item, inner: true })
 }
+
+/** Spends what a restore, an empty, or an Archive delete took: the whole bundle, or from an inner item's bundle only the Link values the item carried away, so the bundle's own restore never writes them twice or names them unrestored. */
+export async function spendBundle(opened: OpenBundle): Promise<void> {
+  if (!opened.inner) return void (await removeOwn(opened.abs))
+  const gone = 'links' in opened.record ? (opened.record.links ?? []) : []
+  if (!gone.length) return
+  const same = (l: unknown): boolean =>
+    isPlainObject(l) && gone.some((g) => g.page === l.page && g.property === l.property && g.value === l.value)
+  await patchRecord(opened.abs, (raw) => ({
+    links: (Array.isArray(raw.links) ? raw.links : []).filter((l) => !same(l)),
+  }))
+}
```

**VERIFY**

- [ ] `npx vitest run Core/Bundles` is green, with each new case red before its change.
- [ ] `npm run typecheck` is clean.
- [ ] Check for unnecessary code or mistakes.

#### Task 1-3

**TASK:** Route every spend through `spendBundle`, so an inner item restores, empties, and leaves the Archive through the ops as they stand.

**NOW:** Each op removes its bundle outright.

**CHANGE**

- [ ] Write these tests and watch them fail.
  - **`trashRecovery.test.ts`:**
    - A page pulled from a trashed Set restores to a given container, and the bundle still holds its sibling.
    - A kept Link value naming that page refills on its restore and leaves the bundle's record.
    - The Set's own later restore names nothing unrestored and writes nothing twice.
    - An inner item restored with no destination is refused as homeless (`parent-gone`), and its bundle is left byte-identical.
    - A nested Set pulled out lands with its pages, and `refileLanded` carries what was archived from within it into the landing Collection's Archive.
  - **`spend.test.ts`:** emptying an inner item disposes only that item, drops its pages' metadata, and takes its carried values off the bundle's record.
  - **`archive.test.ts`:**
    - A page pulled from an archived Set restores by a plain move to a given container.
    - An inner item's Archive delete moves it into the Trash, and its Trash record's `archive` names the item's address.
- [ ] Edit the spends and `fromArchive` as below. Remove `spend.ts`'s `removeOwn` import if it loses its last use.
- [ ] Update `spendUndo`'s doc (`confirmations.ts:47`) to read "A bundle, or an inner item of one, restored or deleted from anywhere spends…".

**AFTER**

```Core/Trash/spend.ts diff
@@ emptyBundle @@
-  await removeOwn(bundleAbs)
+  await spendBundle(opened.value)
   const recorded = 'links' in record ? (record.links ?? []) : []
@@ restoreTrashed (property branch) @@
-    await removeOwn(bundleAbs)
+    await spendBundle(bundle)
@@ restoreTrashed @@
-  if (!unspent.length) await removeOwn(bundleAbs)
+  if (!unspent.length) await spendBundle(bundle)
```

```Core/Archive/archive.ts diff
@@ restoreArchived @@
-  await removeOwn(bundle.abs)
+  await spendBundle(bundle)
```

```Core/Trash/delete.ts diff
@@ fromArchive @@
-/** A delete naming an Archive bundle takes the item inside it to the Trash under the chain it was archived from, so a Trash restore returns it there, and its record keeps the bundle it left for the Undo. Its pages' index rows sit at their Archive paths, while Link values name them where they lived. */
+/** A delete naming an Archive bundle, or an inner item of one, takes it to the Trash under the chain it was archived from, so a Trash restore returns it there, and its record keeps the address it left for the Undo. Its pages' index rows sit at their Archive paths, while Link values name them where they lived. */
 …
-  const { abs: bundle, store, record: held, artifact: abs } = opened.value
+  const { store, record: held, artifact: abs } = opened.value
 …
   return ok({
-    bundle,
+    opened: opened.value,
     abs,
 …
-    record: { ...held, archive: relative(root, bundle) },
+    record: { ...held, archive: relative(root, resolved.value) },
   })
@@ deleteOp @@
-    if (from) await removeOwn(from.bundle)
+    if (from) await spendBundle(from.opened)
```

**VERIFY**

- [ ] `npx vitest run Core/Trash Core/Archive Core/Bundles` is green, with each new case red before its change.
- [ ] Every existing whole-bundle case passes untouched.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Gates are clean.
- [ ] An inner item restored, emptied, or Archive-deleted leaves its bundle holding exactly its siblings, and the bundle record's `links` minus the item's.
- [ ] A refused inner-item op leaves its bundle byte-identical.

---

### Phase 2 — Filing Back

**GOAL:** Undo re-nests an inner item in the folder it sat in, through `fileInto`. That one function serves:
- the Archive restore's Undo, which is the `archive` op;
- the Archive delete's Undo, which is a Trash restore with destination `archive`;
- refile's moves.

A whole bundle still re-mints under its own name, as it does today.

#### Task 2-1

**TASK:** Replace `fileInto`'s `leaf` with `at`, the address the item held. `fileInto` re-nests an inner item's address into its standing folder and answers the address the item now holds and where it landed. The `archive` op takes `at`, and `moveIntoStore` always asks for its own bundle's name back.

**NOW:**
- **`fileInto`** (`bundle.ts:110-127`) mints a bundle, asking for `leaf` back.
- **Its callers:** `archive.ts:46`, `spend.ts:162`, and `moveIntoStore`.
- **`moveIntoStore`'s callers:** `refile.ts:38`, which passes `basename(bundle)`, and `refile.ts:131`, which passes nothing.
- **`rearchive`** (`browser.ts:72-81`) sends `leaf: basename(row.bundlePath)`.

**CHANGE**

- [ ] Write these tests and watch them fail.
  - **`bundle.test.ts`:** `fileInto` by address:
    - An inner item's address re-nests into its standing folder.
    - A taken name, a gone folder, or another store's address mints a fresh bundle.
    - A whole bundle's address re-mints under its leaf.
  - **`archive.test.ts`:** a page pulled from an archived Set and restored is put back by its Undo inside the Set's bundle, at its folder.
- [ ] Rewrite the existing tests that pass a `leaf`:
  - **`archive.test.ts:225-251`:** the `rearchive` helper passes the full bundle address, and the `../name` case stays.
  - **`ArchiveView.test.tsx:290,298`:** expect `at:` with the full bundle path.
  - **`mutateRequest.test.ts:19`:** use `at: 7`.
- [ ] Edit the code as below:
  - `archiveOp` answers `bundled: { bundlePath: filed.address }`.
  - `refile.ts:38` drops its last argument, and with it the `basename` import if that goes unused.
  - At `refile.ts:131`, the Archive-to-Trash move still mints a fresh stamp, because `mintBundle` refuses an `.archived` leaf for a `.deleted` base.

**AFTER**

```Core/Bundles/bundle.ts diff
@@ fileInto @@
-/** Files `artifact` into a bundle minted in `to` for `origin`, `leaf` asked back, its record written ahead; a failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. */
+/** Files `artifact` into `to` back at `at`, the address it held: into the folder it sat in while that folder still stands inside a bundle of `to` and holds nothing of its name, else into a bundle minted for `origin`, its record written ahead, asking back the bundle name `at` names when it names a whole bundle; a failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. Answers the address it now holds and where it landed. */
 export async function fileInto(
   root: string,
   to: BundleStore,
   origin: string,
   artifact: string,
   record: RecordFile | RawRecord,
-  leaf?: string,
-): Promise<string> {
-  const bundle = await mintBundle(root, to, origin, leaf)
+  at?: string,
+): Promise<{ address: string; landed: string }> {
+  const held = at === undefined ? null : bundleAddressOf(root, join(root, at))
+  if (held?.item && layoutOf(held.store).dir === layoutOf(to).dir) {
+    const landed = join(dirname(held.item), basename(artifact))
+    if ((await pathExists(dirname(held.item))) && !(await pathExists(landed))) {
+      await relocate(artifact, landed)
+      return { address: relative(root, landed), landed }
+    }
+  }
+  const bundle = await mintBundle(root, to, origin, held && !held.item ? basename(held.bundle) : undefined)
   try {
     await writeRecord(bundle, record)
     await relocate(artifact, join(bundle, basename(artifact)))
   } catch (e) {
     await removeOwn(bundle)
     throw e
   }
-  return bundle
+  return { address: relative(root, bundle), landed: join(bundle, basename(artifact)) }
 }
@@ moveIntoStore @@
-/** Moves a bundle's artifact into `to`, under the chain it left from, with its raw record spread with `extra`, and removes the emptied bundle; `leaf` asks for that bundle name back. */
+/** Moves a bundle's artifact into `to`, under the chain it left from, with its raw record spread with `extra`, and removes the emptied bundle, asking its name back where the store takes it. */
 export async function moveIntoStore(
   root: string,
   fromBundle: string,
   to: BundleStore,
   extra: RawRecord,
-  leaf?: string,
 ): Promise<void> {
 …
-  await fileInto(root, to, origin, artifact, { ...raw, ...extra }, leaf)
+  await fileInto(root, to, origin, artifact, { ...raw, ...extra }, relative(root, fromBundle))
```

```Core/Nexus/mutateRequest.ts diff
-  op('archive', { path: z.string(), kind: z.enum(['page', 'set']), leaf: z.string().optional() }),
+  op('archive', { path: z.string(), kind: z.enum(['page', 'set']), at: z.string().optional() }),
```

```Core/Archive/archive.ts diff
@@ archiveOp @@
-  const bundle = await fileInto(root, store, abs, abs, record, req.leaf).catch(async (e) => {
+  const filed = await fileInto(root, store, abs, abs, record, req.at).catch(async (e) => {
     await lifted?.value.undo()
     throw e
   })
   await dropDeparture(root, tree, req.kind, req.path)
-  return ok({ bundled: { bundlePath: relative(root, bundle) } })
+  return ok({ bundled: { bundlePath: filed.address } })
```

```Core/Bundles/browser.ts diff
@@ rearchive @@
-/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, under the bundle name it left, so it keeps its Archived date; one renamed or stepped aside since takes a fresh stamp, since that name no longer fits it. */
+/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, back at the address it left: inside the Set it was pulled from while that Set's bundle stands, else under the bundle name it left, so it keeps its Archived date; one renamed or stepped aside since takes a fresh stamp, since that name no longer fits it. */
 …
-      await mutate({ op: 'archive', path, kind: archivedKind(row), leaf: basename(row.bundlePath) })
+      await mutate({ op: 'archive', path, kind: archivedKind(row), at: row.bundlePath })
```

**VERIFY**

- [ ] `npx vitest run Core/Bundles Core/Archive Core/Nexus/mutateRequest.test.ts` is green.
- [ ] `rg -w "leaf" Core/Bundles Core/Archive Core/Nexus/mutateRequest.ts` finds only `mintBundle`'s own parameter.
- [ ] Check for unnecessary code or mistakes.

#### Task 2-2

**TASK:** Make the Archive delete's Undo, a Trash restore to `{ kind: 'archive' }`, file back through `fileInto` at the address the Trash record's `archive` now names.

**NOW:**
- **`placeRecord`** (`placement.ts:203-219`) reads `stored.archive` through `bundleAddressOf`, as of Task 1-1, which already admits an inner item's address.
- **`restoreTrashed`** (`spend.ts:157-164`) files with `basename(dir)`.

**CHANGE**

- [ ] Write these `archive.test.ts` cases and watch them fail:
  - An inner item Archive-deleted, then Undone, returns inside its Set's bundle, with its Link values refilled as in today's whole-bundle case at `:487`.
  - The same case with the Set restored in between returns as its own Archive row.
- [ ] Edit as below.
  - Remove `spend.ts`'s `basename` import if it loses its last use.
  - Update the `record.ts` `archive` doc and the `restoreDestination` doc at `mutateRequest.ts:49`.

**AFTER**

```Core/Trash/spend.ts diff
@@ restoreTrashed @@
-    // The Undo of a delete from the Archive lands in a bundle minted under the name its record keeps, reconciled as any Trash restore, and nothing lands in the tree.
+    // The Undo of a delete from the Archive files back at the address its record keeps, reconciled as any Trash restore, and nothing lands in the tree.
     if (into && (record.entity === 'page' || record.entity === 'set')) {
       const origin = join(root, originPathOf(root, store, artifactAbs))
       const { archive, links, targets, partial, ...filed } = record
-      targetAbs = join(
-        await fileInto(root, into, origin, artifactAbs, filed, basename(dir)),
-        finalName,
-      )
+      targetAbs = (await fileInto(root, into, origin, artifactAbs, filed, archive)).landed
```

```Core/Bundles/record.ts diff
-    /** A Trash record's only: the Archive bundle a delete took the item out of, where its Undo returns it. */
+    /** A Trash record's only: the Archive address a delete took the item from, a bundle or an inner item of one, where its Undo files it back. */
```

**VERIFY**

- [ ] `npx vitest run Core/Archive Core/Trash Core/Bundles Core/Interface/Confirm` is green, with each new case red before its change.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Gates are clean.
- [ ] Both Undo paths re-nest an inner item while its folder stands, and fall back to a bundle of its own otherwise.
- [ ] A whole bundle's Undo keeps its leaf (`archive.test.ts:225-251`, `:487-523`), and refile's moves keep their bundle names.

---

### Phase 3 — Listing Inner Items

**GOAL:** The host answers each asked address's inner items as `BundleRow`s, built by the one builder bundle rows use, over one channel asked lazily.

#### Task 3-1

**TASK:** Add `listInner`, which reads one level of a container address's inner items in the order the folder's sidecar keeps, and route bundle rows and inner rows through one `artifactRow`.

**NOW:** `bundleRowOf` (`rows.ts:83-126`) builds the artifact row inline.

**CHANGE**

- [ ] Write these tests and watch them fail.
  - **`bundle.test.ts`:** `listInner` lists one level of the folder:
    - Sets come first, then pages.
    - Each kind follows the folder sidecar's `set_order` and `page_order` through `resolveOrder` (`Core/Nexus/order.ts`).
    - Hidden entries are skipped.
  - **`rows.test.ts`:** an inner row's fields:
    - `bundlePath` is its address, and `stored` is `{ id, path: address }`.
    - Its icon is the page metadata's, or the Set sidecar's.
    - Its `crumbs` are empty.
    - `storedAt` is the bundle's stamp.
    - `homeResolves` is false.
- [ ] Add `listInner`, `artifactRow`, and `innerRows`.
  - `bundleRowOf`'s artifact branch becomes one `artifactRow` call, and the existing `rows.test.ts` cases pass unchanged.
  - Inside `artifactRow`, `name` is `basename(at.path)` and `restoring` is `at.bundlePath`. For an inner row, that is its own address, which answers `heldElsewhere` as the bundle would: `byId` holds no Set ids and no Trash pages.
- [ ] Update the `BundleRow` docs:
  - **`bundlePath`:** "Its address: a bundle's folder, or the inner item's own path."
  - **`stored`:** "…by its record's id and its path in its store…"

**AFTER**

```Core/Bundles/bundle.ts diff
+/** One level of a container address's inner items, its Sets and then its pages, each in the order the folder's sidecar keeps, with the record it carries; the trail above them is read once for the level. */
+export async function listInner(
+  root: string,
+  abs: string,
+): Promise<Result<{ bundle: string; items: { address: string; record: RecordFile }[] }>> {
+  const read = await readBundleAt(root, abs)
+  if (!read.ok) return read
+  const { bundle, record, artifact, item } = read.value
+  const listed = { bundle: relative(root, bundle), items: [] }
+  if (!artifact || !isContainerRecord(record)) return ok(listed)
+  const folder = item ?? artifact
+  const trail = await trailWithin(record, artifact, folder)
+  const entries = (await listEntries(folder)).filter(
+    ({ name, kind }) => !hiddenName(name) && (kind === 'dir' || isMarkdownFile(name)),
+  )
+  const items = await Promise.all(
+    entries.map(async ({ name }) => {
+      const at = join(folder, name)
+      const own = await innerRecord(record, trail, at)
+      return { address: relative(root, at), record: own, id: ('id' in own && own.id) || at, title: name }
+    }),
+  )
+  const meta = (await readJsonObject(sidecarPath(folder, folder === artifact ? record.entity : 'set'))) ?? {}
+  return ok({
+    ...listed,
+    items: [
+      ...resolveOrder(items.filter((i) => i.record.entity === 'set'), asStringArray(meta.set_order)),
+      ...resolveOrder(items.filter((i) => i.record.entity === 'page'), asStringArray(meta.page_order)),
+    ],
+  })
+}
```

```Core/Bundles/rows.ts diff
+/** The one row an artifact reads as, a bundle's own or an inner item's: the place it shows, the date it entered, and whether its home still answers. */
+function artifactRow(
+  record: ArtifactRecord,
+  at: { bundlePath: string; path: string; storedAt: number | null },
+  place: { crumbs: BundleCrumb[]; historical: boolean },
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+): BundleRow
 …
+/** A bundle's inner items as rows: each addressed by its own path, dated by its bundle's stamp, its place told by the row it discloses under. */
+export function innerRows(
+  listed: { bundle: string; items: { address: string; record: RecordFile }[] },
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+): BundleRow[]
```

`asStringArray` is the helper `containerFields.ts` already uses, and `sidecarPath` comes from `Core/Paths/paths`.

**VERIFY**

- [ ] `npx vitest run Core/Bundles` is green, with each new case red before its change.
- [ ] Check for unnecessary code or mistakes.

#### Task 3-2

**TASK:** Declare and serve `bundles:children`, which takes in one call every address a refresh holds open.

**NOW:** Only `bundles:list` exists (`bridge.ts:199`, `Bundles/handlers.ts`).

**CHANGE**

- [ ] Write these `handlers.test.ts` cases and watch them fail:
  - Each address's inner items answer in the addresses' order.
  - A gone address, or a path escaping the root, answers an empty list, so one refused address never blanks the other open rows.
  - A non-array or non-string argument faults.
- [ ] Add the channel and its handler.
  - The handler reads the tree and pages once per call.
  - Only a malformed argument faults; each address answers on its own.

**AFTER**

```Core/Contract/bridge.ts diff
   'bundles:list': { args: [store: BundleStore, within?: string]; reply: Result<BundleRow[]> }
+  // The inner items of each row a browser holds open, asked on opening and again with every open row on each refresh, so no listing walks a container's artifact.
+  'bundles:children': { args: [addresses: string[]]; reply: Result<BundleRow[][]> }
```

```Core/Bundles/handlers.ts diff
+  'bundles:children': withRoot(async (root, _ctx, raw: unknown) => {
+    if (!Array.isArray(raw) || !raw.every(isString)) return fault('Addresses are required.')
+    const tree = await liveTreeOf(root)
+    const { byId } = await nexusPages(root, tree)
+    const out: BundleRow[][] = []
+    for (const address of raw) {
+      const resolved = await resolveUnderRoot(root, address)
+      const listed = resolved.ok ? await listInner(root, resolved.value) : resolved
+      out.push(listed.ok ? innerRows(listed.value, tree, byId) : [])
+    }
+    return ok(out)
+  }),
```

**VERIFY**

- [ ] `npx vitest run Core/Bundles Core/Contract` is green, including `Core/Contract/engineGraph.test.ts`.
- [ ] Check for unnecessary code or mistakes.

#### Compaction Checkpoint

- [ ] Tick the host phases in *§Process Overview*, record any *§Deviations*, and prepare the handoff before the renderer phases.

---

### Phase 4 — The Browser's Tree

**GOAL:** `useBundleBrowser` holds which rows are open and the inner rows they list, and hands both skins one flattened list. It owns the click intent, the rule that a parent covers its children, and the batch's single destination ask.

#### Task 4-1

**TASK:** Add `TreeRow`, `treeRows`, `outermostOf`, and `rowClick`, and hold the open rows' inner rows in one ref-backed map.

**NOW:**
- **`visible`** is the filtered top rows (`browser.ts:233`).
- **`retained`** keeps checks over top rows only (`:222-223`).
- **`picked` and `actedOn`** act on what's checked, unfiltered.

**CHANGE**

- [ ] Write these `browser.test.ts` cases and watch them fail:
  - **`treeRows`:**
    - It sets each row's `depth`.
    - `open` is null for a page.
    - Inner rows sit beneath an open parent only.
  - **`outermostOf`:** a checked Set and its checked page act once, while siblings and look-alike prefixes (`A/B` vs `A/Bc`) both stay.
- [ ] Hold `open: ReadonlyMap<string, readonly BundleRow[]>` in state, mirrored in a ref for `refresh`. This map is the only record of what's open.
  - **Opening:** `rowClick` on a closed container sets its entry to `[]` at once, so it reads open with its chevron turned. It then asks `bundles:children([address])` and replaces the entry with the reply, but only while the address is still open.
  - **Closing:** `rowClick` on an open container drops the address and every key `isAtOrUnder` it.
  - **Refreshing:** after the listing lands, `refresh` keeps the open addresses that `treeRows` still reaches over the new top rows. It asks for all of them in one `bundles:children` call and sets the map from the reply, under `refresh`'s own `asks` rule.
- [ ] Derive the rest:
  - **`live`:** the top rows plus every row in `open`.
  - **`visible`:** `treeRows(filterRows(rows, query), open)`.
  - **`found`:** the top-level match count, which ArchiveView publishes.
  - **`picked`:** `outermostOf(checkedIn(checked, rowsInView, key))`.
  - **The menu's targets:** `checked.has(row.bundlePath) ? picked : [row]`. `actedOn`'s import goes.
- [ ] Add `rowClick(row, detail)`:
  - A container discloses on `detail === 1`.
  - A page toggles its check on `detail === 1`.
  - A page on `detail === 2` makes sure it's checked.
- [ ] Keep `toggle` for the checkbox.
- [ ] Update the hook's docstring (`:189`) to name the tree, its open map, and `rowClick`.

**AFTER**

```Core/Bundles/browser.ts diff
+/** A row as a browser shows it: how deep it sits, and whether it's open, null for a row with nothing to disclose. */
+export interface TreeRow {
+  row: BundleRow
+  depth: number
+  open: boolean | null
+}
+
+const discloses = (row: BundleRow): boolean => row.kind === 'set' || row.kind === 'collection'
+
+/** The rows in view: each top row, and beneath each open one the inner rows it lists, in order. */
+export function treeRows(
+  rows: readonly BundleRow[],
+  open: ReadonlyMap<string, readonly BundleRow[]>,
+): TreeRow[] {
+  const out: TreeRow[] = []
+  const walk = (row: BundleRow, depth: number): void => {
+    const inner = discloses(row) ? open.get(row.bundlePath) : undefined
+    out.push({ row, depth, open: discloses(row) ? inner !== undefined : null })
+    for (const child of inner ?? []) walk(child, depth + 1)
+  }
+  for (const row of rows) walk(row, 0)
+  return out
+}
+
+/** A batch acts on each item once: a row inside another the batch holds goes with it. */
+export const outermostOf = (rows: readonly BundleRow[]): BundleRow[] =>
+  rows.filter((r) => !rows.some((o) => o !== r && isAtOrUnder(r.bundlePath, o.bundlePath)))
@@ useBundleBrowser @@
-  visible: BundleRow[]
+  visible: TreeRow[]
+  found: number
+  rowClick: (row: BundleRow, detail: number) => void
```

**VERIFY**

- [ ] `npx vitest run Core/Bundles/browser.test.ts` is green, with each new case red before its change.
- [ ] Check for unnecessary code or mistakes.

#### Task 4-2

**TASK:** A batch Restore holding homeless rows asks once per kind of destination and sends each row its destination. `restoreOne`, the batch, and the menu share one destination ask, and the "had nowhere to go" refusal goes.

**NOW:**
- **`restoreBatch`** (`browser.ts:326-345`) restores only the rows whose home resolves, and reports the rest as having nowhere to go.
- **`placesFor`** (`:252-257`) feeds both `restoreOne`'s picker and `openMenu`'s submenu.
- **`many`** sends no destination.

**CHANGE**

- [ ] Rewrite two existing cases to the new rule and watch them fail:
  - **`TrashFrame.test.tsx:322`:** a Restore All of two homeless rows opens one picker, both rows restore to the picked place, and a dismissed picker restores nothing.
  - **`ArchiveView.test.tsx:359`:** make its homeless row a disclosed inner item, and run its batch half as a mixed batch that asks once.
- [ ] Replace `placesFor` with three functions, then rewrite `restoreOne`, `openMenu`, and `restoreBatch` over them:
  - **`destinationKind(row)`:** `'context'` for a Space, otherwise `'container'`.
  - **`destinationTargets(kind)`:** that kind's targets, built once.
  - **`askDestination(kind)`:** pops `destinationRows` and answers a `RestoreDestination` or null.
- [ ] Extend `many` with `destinationOf`. Remove `notifyReport`'s import from `browser.ts`, since its only use was `:330`.

**AFTER**

```Core/Bundles/browser.ts diff
@@ restoreBatch @@
   const restoreBatch = async (targets: BundleRow[]): Promise<void> => {
-    const addressable = targets.filter((r) => r.homeResolves)
-    const homeless = targets.filter((r) => !r.homeResolves)
-    const nowhere = `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`
-    if (addressable.length === 0) return notifyReport(nowhere, true)
-    const ran = await many(addressable, 'restore')
+    // What has no home left asks once where it goes, one ask per kind of destination, and a dismissed ask restores nothing.
+    const to = new Map<DestinationKind, RestoreDestination>()
+    for (const kind of new Set(targets.filter((r) => !r.homeResolves).map(destinationKind))) {
+      const destination = await askDestination(kind)
+      if (!destination) return
+      to.set(kind, destination)
+    }
+    const ran = await many(targets, 'restore', (row) =>
+      row.homeResolves ? undefined : to.get(destinationKind(row)),
+    )
     if (!ran) return
 …
-        homeless.length > 0 && nowhere,
```

**VERIFY**

- [ ] `npx vitest run Core/Bundles Core/Settings Core/Archive` is green, with each rewritten case red before its change.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Gates are clean.
- [ ] A checked inner row survives a refresh while its parent stays open.
- [ ] Closing a parent forgets its open descendants, and a late reply doesn't reopen a closed row.
- [ ] A covered batch acts once per item, and `spendUndo` keys on each row's own address.

---

### Phase 5 — Both Skins

**GOAL:** The Trash frame and ArchiveView draw the tree.
- **Indent:** inner rows step in from each skin's own lead.
- **Chevron:** it sits right of the label.
- **Clicks:** every click goes through `rowClick`.
- **Reader:** an Archive page's double-click opens it.

#### Task 5-1

**TASK:** Give `MenuItem` a `titleAccessory` slot, set inline right of the title text and outside its ellipsis.

**NOW:** `MenuItem` (`MenuRows.tsx:155`) has `subLabel`, a line below the title, and nothing beside the title.

**CHANGE**

- [ ] Write the `MenuRows` test and watch it fail: `titleAccessory` renders after the title text on one line, and is absent from the DOM when not given.
- [ ] Add the prop and `titleLine`, building the title span once.

**AFTER**

```UIX/Menus/MenuRows.tsx diff
 type MenuItemProps = {
   leading?: ReactNode
+  /** Sits right of the title text on its line, outside the text's ellipsis, as a disclosure's chevron does. */
+  titleAccessory?: ReactNode
   subLabel?: ReactNode
 …
+  const title = <span className={cx(s.titleText, overScrollEllipsis)}>{children}</span>
 …
       <span className={cx(s.titleWrap, centered && s.titleCentered)}>
-        <span className={cx(s.titleText, overScrollEllipsis)}>{children}</span>
+        {titleAccessory == null ? (
+          title
+        ) : (
+          <span className={s.titleLine}>
+            {title}
+            {titleAccessory}
+          </span>
+        )}
```

```UIX/Menus/menu-row.css.ts diff
+export const titleLine = style({
+  display: 'flex',
+  alignItems: 'center',
+  gap: '4px', // KNOB
+})
```

**VERIFY**

- [ ] `npx vitest run UIX/Menus` is green.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-2

**TASK:** ArchiveView draws the tree:
- each row is indented by its depth;
- the chevron follows the title;
- every click goes through `rowClick`;
- a page's double-click opens the reader, with a trail through each row above it.

**NOW:** The title span's single click opens a page (`ArchiveView.tsx:210-224`), and a row's click checks it (`:190-195`).

**CHANGE**

- [ ] Rewrite these cases and watch them fail:
  - **`:159`:** a page row's click checks it, and its double-click opens the reader with the row checked, whether or not it started checked. The test sends the real click sequence (`detail` 1, then 2, then `dblclick`). The reader's title is the top row's trail, then each row above, then the page.
  - **`:174`:** a Set row's click discloses its inner rows beneath it, indented, with the chevron open. A second click folds them, and a double-click leaves them open.
- [ ] Add these cases:
  - a checked Set and its checked page restore once, as the Set;
  - the published count stays the count of top rows.
- [ ] Edit `ArchiveRow` and `archive-view.css` as below.
  - **`ArchiveRow`:** it keeps `memo` by taking `depth` and `open` as primitives.
  - **`api.open(row)`:** it keeps its signature and builds its trail from the current `visible`.
    - Its ancestors are `visible.filter((s) => s.row !== row && isAtOrUnder(row.bundlePath, s.row.bundlePath))`, already outermost first.
    - The trail is the outermost row's `crumbSegments`, then each ancestor as `{ title, icon: entityIcon(archivedKind(r), r.icon, icons) }`, then the page.
  - **The Chevron:** it is `DropOutline` without `onToggle`, since the row's click is the toggle, as GroupBand's is.

**AFTER**

```Core/Archive/ArchiveView.tsx diff
@@ ArchiveRow @@
-    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click anywhere on a row checks it, as a Trash row does; the box in its gutter is the keyboard's door
+    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a Set's click discloses it and a page's checks it, as a Trash row's do, and a page's double-click opens it; the box in its gutter is the keyboard's door
     <div
       className={cx('data-row', lead && 'row-lead')}
       data-reveal-host={revealed ? 'on' : ''}
-      style={{ height: ROW_H, transform: `translateY(${start}px)` }}
-      onClick={() => api.toggle(row)}
+      style={{ height: ROW_H, transform: `translateY(${start}px)`, '--depth': depth } as React.CSSProperties}
+      onClick={(e) => api.rowClick(row, e.detail)}
+      onDoubleClick={row.kind === 'page' ? () => api.open(row) : undefined}
 …
-        {/* biome-ignore … a page's title is the pointer's door to the reader … */}
-        <span className={cx(overScrollLabel, 'cell-title')} onClick={…}>
+        <span className={cx(overScrollLabel, 'cell-title')}>
           <Icon name={entityIcon(archivedKind(row), row.icon, icons)} size="body" />
           <span className="cell-title-text">{row.title}</span>
         </span>
+        {open !== null && <DropOutline open={open} />}
```

```Core/Archive/archive-view.css diff
-/* ArchiveView on TableView's sheet: the virtual list, each title with the trail it left at its right, as the Trash's rows carry theirs, and the Archived column. */
+/* ArchiveView on TableView's sheet: the virtual list, each title indented by its depth with its chevron after it and the trail it left at its right, as the Trash's rows carry theirs, and the Archived column. */
 .archive-rows .cell-title {
-  flex: 1 1 auto;
-  min-width: 0;
+  margin-left: calc(var(--row-indent) * var(--depth, 0));
 }
+.archive-rows [data-drop-outline] {
+  color: var(--label-tertiary);
+}
 .archive-rows .archive-trail {
   flex: 0 1 auto;
   min-width: 0;
   max-width: 55%;
+  margin-left: auto;
 }
```

The header docstring at `:41` reads: "A Set discloses what it holds, and a page opens in the reader on a double-click."

**VERIFY**

- [ ] `npx vitest run Core/Archive/ArchiveView.test.tsx` is green, with each new or rewritten case red before its change.
- [ ] Check for unnecessary code or mistakes.

#### Task 5-3

**TASK:** The Trash frame draws the tree:
- each inner row is indented from the row's own lead;
- the chevron sits in `titleAccessory`;
- every click goes through `rowClick`.

**NOW:** Every Trash row's click checks it (`TrashFrame.tsx:164`). MenuItem's `indent` measures from an 8px base, while Trash rows lead by `--row-pad-lead` (24px). Using it would step a depth-1 row left of its parent.

**CHANGE**

- [ ] Write these `TrashFrame.test.tsx` cases and watch them fail:
  - A Collection row's click discloses its Sets and then its pages, indented, and its checkbox still checks it.
  - An inner row's right-click Restore ▸ lists destinations, and its Delete empties only that item.
  - A checked inner row stays checked across a refresh.
- [ ] Have `TrashRowView` take its `TreeRow` whole, and wire it as follows:
  - `onClick={(e) => rowClick(row, e.detail)}`;
  - `titleAccessory={open !== null ? <DropOutline open={open} /> : undefined}`;
  - wrap the leading icon in `<span className="trash-lead" style={{ '--depth': depth }}>`.
- [ ] Add to `trash-frame.css`:
  - `.trash-lead { display: flex; margin-left: calc(var(--disclosure-indent) * var(--depth, 0)); }`
  - `.trash-row [data-drop-outline] { color: var(--label-tertiary); }`
- [ ] The overlay checkbox stays in the row's gutter, as ArchiveView's `.row-check` does in its own.

**VERIFY**

- [ ] `npx vitest run Core/Settings/TrashFrame.test.tsx` is green, and gates are clean.
- [ ] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [ ] Gates are clean.
- [ ] Both skins take every behavior from `browser.ts`, and neither re-implements disclosure, coverage, or click intent.
- [ ] In both skins, the chevron sits right of the label, an inner row's checkbox stays in its skin's gutter column, and each depth steps right by `--disclosure-indent`.

---

### Phase 6 — Documents, Drive, and the Live Pass

**GOAL:** The living documents describe what now exists, the Archive Drive covers disclosure and re-nesting, and the feature is driven end to end over CDP.

#### Task 6-1

**TASK:** Rewrite each *§Reconciliation* entry in place.

**CHANGE**

- [ ] Walk *§Reconciliation* and rewrite each claim to current behavior, overview-level, with no correction language.

**VERIFY**

- [ ] `rg -n "one row per|is one row|title opens the reader|nowhere to go" .claude/Features Core` finds nothing stale.

#### Task 6-2

**TASK:** Add a disclosure group to the Archive Drive.

**CHANGE**

- [ ] Add MATRIX rows to `.claude/scripts/Archive Drive/MATRIX.md`, with matching steps in `live-drive.mjs`, for:
  - a trashed Collection disclosing a Set and pages;
  - an inner page restored through Restore ▸;
  - a Restore All of two inner items asking once;
  - an archived Set's inner page restored, with its Undo re-nesting it;
  - an inner item deleted from the Archive, with its Undo re-nesting it.

**VERIFY**

- [ ] The drive runs green against `~/Test`, rebuilt with `node .claude/scripts/make-benchmark-nexus.mjs test` before and after.

#### Task 6-3

**TASK:** A live CDP pass with screenshots of both skins. Every fixture is removed afterward.

**CHANGE**

- [ ] Launch per `.claude/Guidelines/Development-Environment.md`.
- [ ] In both skins, screenshot a container disclosed to depth 2 with a long title and a checked inner row.
- [ ] Double-click an Archive page, and screenshot the reader's trail.

**VERIFY**

- [ ] The screenshots are read and sent to Nathan.
- [ ] The app process is stopped and `~/Test` is rebuilt.

---

### Completion Criteria

- **Conformance:** The work follows *§Constraints*, `.claude/CLAUDE.md`, and the Studio conventions. No second reader exists for a store path, an inner record, an identity, an artifact row, or a click.
- **Correctness:**
  - Each kind of inner item (page, nested Set) restores, deletes, and Undoes in both stores.
  - A refused inner-item op leaves its bundle untouched.
  - A homeless batch Restore asks once per kind of destination.
  - The gestures match the rulings in both skins, live.
- **Completeness:** Every task is ticked. No `storeOf`, `leaf` request, title-click open, or "nowhere to go" path remains.
- **Confirmation:** Every new or rewritten test goes red without its change, and the live pass's screenshots are delivered.
- **Continuity:** *§Reconciliation* is walked, and the Archive Drive matrix is current.
- **Confidence:** Gates are green from a clean state over `$BASE..HEAD`, and the delta is reported.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [ ] Phase review (opus-high): Phase 1 · Phase 2 · Phase 3 · Phase 4 · Phase 5
- [ ] Simplification lens → adversarial lens (opus-high) over `$BASE..HEAD`
- [ ] Neutral verification (opus-high) over `$BASE..HEAD`
- [ ] Own pass: gates · diff · deviations · criteria
- [ ] Reconciliation walked
- [ ] Report delivered

#### Reconciliation

- `.claude/Features/NexusRecordPM.md:16` — "one row per deleted entity…"; "Checked rows act together…" — Task 6-1
- `.claude/Features/NexusRecordPM.md:14` — Restore is written per bundle; the homeless batch rule — Task 6-1
- `.claude/Features/NexusRecordPM.md:10` — `archive` "names the Archive bundle it left" — Task 6-1
- `.claude/Features/CollectionsPM.md:49,51` — an archived Set's contents, opening pages in the reader, restoring — Task 6-1
- `.claude/Features/CorePM.md:92` — "the Archive bundle a delete from the Archive names" — Task 6-1
- `.claude/Features/InterfacePM.md:80` — "a bundle restored or deleted … spends both" — Task 6-1
- `.claude/Features/PommoraUIX.md` — MenuItem's slots gain `titleAccessory` — Task 6-1
- `.claude/IssuesPM.md` I-033 — the batch's per-row requests now include inner items — Task 6-1
- `Core/Bundles/browser.ts:189` — the hook's doc gains the tree and `rowClick` — Task 4-1
- `Core/Interface/Confirm/confirmations.ts:47` — the `spendUndo` doc reads "A bundle, or an inner item of one, …" — Task 1-3

#### Open Items

- **Sequencing:** this plan runs after the Properties Restructure lands, at least its Phase 12 and Closeout P11B–P12, with Task 6-1 and Task 6-2 after its Phase 18. That plan rewrites the same regions of `spend.ts` (`emptyBundle` and the property arm), `delete.ts` (`fromArchive`'s spend), `rows.ts` (`bundleRowOf`, adding `partial`), `browser.ts` (`many`, `restoreOne`, `restoreBatch`, adding `owed`/`finishOwed`), `TrashFrame.tsx`'s `TrashRowView`, `NexusRecordPM.md:14`, `CorePM.md:92`, and `Archive Drive/MATRIX.md`. Both plans share the one `active` checkout.
- **Re-Grounding Before Execution:** every diff anchor above is re-read against the landed Restructure, and four items are taken into the tasks they touch:
  - **Kept Links:** the delete's kept Link values are appended through `finishEntry`'s owed note rather than written with the record. `keptLinksUnder` and `spendBundle` (Tasks 1-2 and 1-3) are written against that note model, so a whole-bundle spend never removes a bundle an owed note still names.
  - **`emptyBundle`:** its note key (`relative(root, bundleAbs)`) stays one key per inner item (Task 1-3).
  - **`BundleRow.partial`:** this field enters `artifactRow` (Task 3-1).
  - **Batch Restore:** `many`'s `owed` and `finishOwed` merge with the batch's `destinationOf` (Task 4-2).


#### Deviations

- None yet.
