## Disclosable Bundles — Implementation Plan

**DATE:** 10-23-2026
**STATUS:** Ratified 10-23-2026
**SOURCE:** This session's conversation. Nathan's request: archived or trashed Sets and Collections disclose like any other disclosable table row, so a single page or Set can be recovered out of one. His rulings are listed under *§Constraints*.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `8148302cf` | 8,814 passed · 2 skipped | 10-26-2026 11:29 AM | {MM-DD-YYYY hh:mm AM/PM} |

### Context

The Trash and each Collection's Archive keep every departed item as a bundle: a stamped folder holding the item, called its artifact, beside a `_record.json`. A trashed Set or Collection, or an archived Set, therefore reads as one row, and nothing inside it can be reached until the whole thing returns.

The shared parts live in `Core/Bundles/`:
- `layout.ts`, the stores' layout, the stamp, and the readers of a store path;
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
- **Checks Outlive Collapsing:** collapsing a container keeps its inner rows' checks. They're hidden from a batch until it opens again, as a search's hidden rows are.
- **Batch Restore:** a batch Restore holding homeless rows (every inner item is one) asks once per kind of destination. Only the homeless rows go where the picker says; every row with a home of its own still returns there.

The chevron sits right of the label in both skins. An inner row carries its trail like any other row: the bundle's own trail, then the containers inside the bundle above it.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `bundleAddressOf` • Function | The one reader of a store path: its bundle, its store, and the inner item it names. | `Core/Bundles/layout.ts` |
| `stampedSegment` • Function | The index of a path's stamped bundle segment, shared by `bundleAddressOf` and `originPathOf`. | `Core/Bundles/layout.ts` |
| `readBundleAt` • Function | An address's bundle, record, artifact, and inner item, read once, for `openBundle` and `listInner`. | `Core/Bundles/bundle.ts` |
| `ContainerRecord` / `isContainerRecord` • Type, Function | A Set's or Collection's record, the kind that holds inner items. | `Core/Bundles/bundle.ts` |
| `trailWithin` • Function | The container ids above a folder inside a container's bundle, outermost first. | `Core/Bundles/bundle.ts` |
| `innerRecord` • Function | The record an inner item carries as its own. | `Core/Bundles/bundle.ts` |
| `keptLinksUnder` • Function | The bundle's kept Link values, as its record stands at the op, whose page lies at or under an inner item. | `Core/Bundles/bundle.ts` |
| `linkedPage` • Function | The page a Link value's page link resolves to in a page index, shared by `keptLinksUnder` and `parkLinks`. | `Core/Connections/linkValue.ts` |
| `spendBundle` • Function | Spends what an op took: the whole bundle, or an inner item's share of it, its carried Link values off the bundle's record and its pages off the strip the bundle's delete still owes. | `Core/Bundles/bundle.ts` |
| `listInner` • Function | One level of a container address's inner items, in the order the folder's sidecar keeps. | `Core/Bundles/bundle.ts` |
| `InnerListing` • Type | What `listInner` answers: the bundle, its store and record, the folder, and each inner item with its record. | `Core/Bundles/bundle.ts` |
| `OpenBundle.inner` • Field | Marks an open of an inner item. | `Core/Bundles/bundle.ts` |
| `identityOf` • Function | A page's stamped id, or a container's sidecar id and icon. Shared by `gatherContentRecord` and `innerRecord`. | `Core/Bundles/record.ts` |
| `artifactRow` • Function | The one builder of an artifact's row, shared by bundle rows and inner rows. | `Core/Bundles/rows.ts` |
| `bundleCrumbs` • Function | A bundle's trail, live or frozen, which its own row shows and each inner row's trail begins with. | `Core/Bundles/rows.ts` |
| `innerRows` • Function | The rows of a bundle's inner items. | `Core/Bundles/rows.ts` |
| `bundles:children` • Channel | Lists each given address's inner items as rows. | `Core/Contract/bridge.ts` |
| `TreeRow` • Type | A row as a browser shows it: its depth and whether it's open. | `Core/Bundles/browser.ts` |
| `treeRows` • Function | Top rows, with each open container's inner rows beneath them. | `Core/Bundles/browser.ts` |
| `outermostOf` • Function | Drops each row whose ancestor the same batch holds. | `Core/Bundles/browser.ts` |
| `rowClick` • Function | The browser's one click intent. | `Core/Bundles/browser.ts` |
| `DestinationKind` / `destinationKind` / `destinationTargets` / `askDestination` • Type, Functions | A kind of destination, a row's kind, that kind's targets, and the one destination ask that `restoreOne`, the batch, and the menu share. | `Core/Bundles/browser.ts` |
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
  - **Excluded Folders:** a folder the Nexus excludes stays out of an inner listing until it's unexcluded.
  - **Trails:** an inner row shows its trail. It's the bundle's own trail, then each container inside the bundle down to the row's folder, and it carries the bundle's `historical` mark.
  - **Collapsing:** checks are remembered. Collapsing a container never unchecks what it hides, and reopening shows the same checks. A hidden check stays out of the batch and the menu's targets while its container is closed, as a search's hidden checked rows do today.
  - **Batch Destination:** the batch's destination ask applies only to its homeless rows. Every row whose home resolves restores to that home, whatever the picker chose.
  - **Double-Click:** the click intent uses the codebase's `e.detail` pattern (CalendarPicker, MarkdownPM's pointer gestures), and a single click is never delayed.
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
- **Inner-Item Writes:** listing inner items only reads. Among the inner-item paths, only `spendBundle` and `fileInto` write bundle structure, and only `spendBundle` writes a bundle's owed note.
- **Never Every-X:** inner items list lazily, never inside `bundles:list`.
  - They're asked for on opening, and once per refresh for every open address in one call.
  - A closed row's loaded subtree is forgotten, while its checks are kept.
- **Addresses Are Canonical:** a whole bundle's address is its folder, and an inner item's is its own path. `checked`, `spendUndo`'s arming, `outermostOf`, and the open map all key on the address.
- **Tests:** each new behavior gets a test that fails without its change, and a rewritten case counts as that test. Host suites seed through `seedNexus` (`Core/Testing/hostFs.ts`) and the shared definitions (`Core/Testing/definitions.ts`) and run ops through `settledMutate.ts`; renderer suites build rows with `fixtures.ts`'s `bundleRow` and trees with `testTree.ts`; property bundles come from `fixtures.ts`'s `seedPropertyBundle`; each suite's local seeders carry the rest.
- **Comments:** docstrings in the house register where a neighbor has one; no other comments.
- **Imports:** an import that loses its last use leaves in the same task.
- **Docs:** feature docs only fix what's false, in place, plainly, at its length or shorter. They explain to the user, not the coder: they name no functions, files, channels, or shared vocabularies, and state no cohesion or fixes a reader can infer.

#### Process Overview

- [x] **Phase 1** — Addressing Inside a Bundle
  - [x] Task 1-1
  - [x] Task 1-2
  - [x] Task 1-3
  - [x] Review Checkpoint
- [x] **Phase 2** — Filing Back
  - [x] Task 2-1
  - [x] Task 2-2
  - [x] Review Checkpoint
- [x] **Phase 3** — Listing Inner Items
  - [x] Task 3-1
  - [x] Task 3-2
  - [x] Compaction Checkpoint
- [x] **Phase 4** — The Browser's Tree
  - [x] Task 4-1
  - [x] Task 4-2
  - [x] Review Checkpoint
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
- **`storeOf`** (`bundle.ts:42-48`) accepts only a bundle folder, matched by its suffix alone. Its callers are `moveIntoStore` (`:137`), `openBundle` (`:225`), `placement.ts:207`, `mutate.ts:150`, and `bundle.test.ts:28-41`.
- **`originPathOf`** (`:97-102`) finds the stamped segment with its own search.

**CHANGE**

- [x] Rewrite `bundle.test.ts`'s `storeOf` cases as `bundleAddressOf` cases and add the new ones. Watch them fail.
  - **Answers a Bundle:** a bundle folder answers `{ bundle, store }`.
  - **Answers an Item:** a page or folder inside the artifact answers `item`.
  - **Answers Null:**
    - the artifact itself;
    - a hidden inner segment (`_raw`, `.x`);
    - a path outside both stores;
    - a suffixed folder without a stamp.
  - **Archive Paths:** an Archive path answers its Collection's store.
- [x] Add `stampedSegment` and `bundleAddressOf`, point `originPathOf` at `stampedSegment`, and move every `storeOf` caller below to `bundleAddressOf`. `openBundle`'s becomes `bundleAddressOf(root, abs)?.store` here, and Task 1-2 rewrites the function.

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
+  const inner = segs.slice(at + 1)
+  return inner.length > 1 && !inner.some(hiddenName) ? { bundle, store, item: abs } : null
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

- [x] `npx vitest run Core/Bundles/bundle.test.ts` is green, with each new case red before its change.
- [x] `rg "storeOf" Core` finds nothing, and `npm run typecheck` is clean.
- [x] Check for unnecessary code or mistakes.

#### Task 1-2

**TASK:** Open an inner item through one `readBundleAt` reader, read identity through one `identityOf`, and give the ops one way to spend what they took.

**NOW:**
- **`openBundle`** (`bundle.ts:224-230`) opens a bundle folder only.
- **Identity:** `gatherContentRecord` (`record.ts:175-178`) reads a page's or container's identity inline.
- **Spends:** these are bare `removeOwn` calls at `spend.ts:109`, `spend.ts:132`, `spend.ts:297`, `archive.ts:80`, and `delete.ts:134`.

**CHANGE**

- [x] Write these `bundle.test.ts` cases over a seeded trashed Collection `A ⟩ S ⟩ T ⟩ P.md`, and watch them fail:
  - **Opening `S`:** its parent is `A.id`, and it has no trail.
  - **Opening `P.md`:**
    - its parent is `T.id` and its trail `[A.id, S.id]`;
    - it carries its stamped `id` and the bundle's `targets`;
    - it holds only the kept values whose title resolves to `P`.
  - **Missing Sidecar ID:** a folder without one leaves its inner item `unaddressable`.
  - **Page Bundle:** an address inside a page bundle opens as `not-found`.
  - **Partial Bundle:** an inner item of a bundle whose record is hand-seeded `partial: true` opens `partial`, and one of a whole record opens without it. A delete writes `partial` on a property's record alone, so only a content record an earlier build wrote carries it.
  - **`spendBundle`:**
    - on an inner item, it strips exactly that item's carried values from the bundle's record, matched by `page`, `property`, and `value`;
    - on an inner item whose bundle's delete still owes, it takes the item's page paths off the note's `strip`, leaves the rest of the note as it was, and a note left owing nothing clears (`editNote` drops it through `owesAnything`);
    - on a whole bundle, it removes the bundle.
- [x] Add `identityOf` to `record.ts` and route `gatherContentRecord` through it.
- [x] Add `readBundleAt`, `ContainerRecord`, `isContainerRecord`, `trailWithin`, `innerRecord`, `keptLinksUnder`, `spendBundle`, and `OpenBundle.inner`, and rewrite `openBundle` over `readBundleAt`. Add `linkedPage` beside `readLinkText`, and route `keptLinksUnder` and `parkLinks` through it.
  - Only `openBundle`, `spendBundle`, and `listInner` (Task 3-1) are exported.
  - Every existing caller destructures `OpenBundle` unchanged.

**AFTER**

```Core/Bundles/record.ts diff
+/** A page's stamped id, or a container's sidecar id and icon. */
+export async function identityOf(
+  kind: 'page' | ContainerKind,
+  abs: string,
+): Promise<{ id?: string; icon?: string }> {
+  return kind === 'page' ? { id: (await stampedIdOf(abs)) ?? undefined } : sidecarIdentity(abs, kind)
+}
@@ gatherContentRecord @@
-  const { id, icon } =
-    kind === 'page'
-      ? { id: await stampedIdOf(abs), icon: undefined }
-      : await sidecarIdentity(abs, kind)
+  const { id, icon } = await identityOf(kind, abs)
```

```Core/Connections/linkValue.ts diff
@@ readLinkText @@
+/** The page a Link value's page link resolves to in `index`; an address, or a title `index` can't settle, names none. */
+export const linkedPage = (value: string, index: PageIndex): ConnPage | undefined => {
+  const link = readLinkText(value)
+  return link?.kind === 'page' ? index.resolve(link.title).page : undefined
+}
```

```Core/Trash/trashedCopies.ts diff
@@ parkLinks @@
-    const page = readLinkText(link.value)
-    const bundle = page?.kind === 'page' ? index.resolve(page.title).page?.id : undefined
+    const bundle = linkedPage(link.value, index)?.id
```

```Core/Bundles/bundle.ts diff
@@ OpenBundle @@
-/** A bundle as one open reads it: its store, its record, and the one artifact it holds, which a property's record holds none of and a bundle cut short may not. */
-export interface OpenBundle {
-  abs: string
-  store: BundleStore
-  record: RecordFile
-  artifact: string | null
-}
+/** A bundle as one open reads it: its store, its record, and the one artifact it holds, which a property's record holds none of and a bundle cut short may not. An inner item opens as `inner`: the record the bundle's own derives for it, and the item as the artifact. */
+export type OpenBundle = { abs: string; store: BundleStore; record: RecordFile } & (
+  | { inner: true; artifact: string }
+  | { inner: false; artifact: string | null }
+)

+type ContainerRecord = Extract<RecordFile, { entity: 'collection' | 'set' }>
+
+const isContainerRecord = (record: RecordFile): record is ContainerRecord =>
+  isContainerKind(record.entity)
+
+/** An address read once: its bundle, store, record, and artifact, and the inner item it names with the container record and artifact holding it, refused when nothing holds that item any more. */
+async function readBundleAt(root: string, abs: string) {
+  const at = bundleAddressOf(root, abs)
+  if (!at) return fault('Only a trash or archive record can be spent.')
+  const record = await readRecord(at.bundle)
+  if (!record) return fault('That record is unreadable.')
+  const artifact = await bundleArtifact(at.bundle)
+  const { bundle, store, item } = at
+  if (!item) return ok({ bundle, store, record, artifact, inner: null })
+  if (
+    !isContainerRecord(record) ||
+    !artifact ||
+    !isAtOrUnder(item, artifact) ||
+    !(await pathExists(item))
+  )
+    return fail('not-found', 'That item is no longer there.')
+  return ok({ bundle, store, record, artifact, inner: { item, held: record, artifact } })
+}
+
+/** The container ids above `folder` inside a container's bundle, outermost first: the bundle's own trail and parent, the bundled container, and each folder down to `folder`; null when one of them has no id. */
+async function trailWithin(
+  held: ContainerRecord,
+  artifact: string,
+  folder: string,
+): Promise<string[] | null> {
+  const steps = relative(artifact, folder).split('/').filter(Boolean)
+  const inner = await Promise.all(
+    steps.map((_, i) => sidecarId(join(artifact, ...steps.slice(0, i + 1)), 'set')),
+  )
+  const ids = [
+    ...(held.trail ?? []),
+    ...(held.parent.kind === 'container' ? [held.parent.id] : []),
+    held.id,
+    ...inner,
+  ]
+  return ids.every((id): id is string => id !== undefined) ? ids : null
+}
+
+/** What an inner item carries as its own record: its identity, the trail above it as its parent and trail, unaddressable without one, the bundle's targets, and its partial mark, since what the bundle recorded partly it recorded partly for each item it holds; no place, since the siblings it left are gone with it. */
+async function innerRecord(
+  held: ContainerRecord,
+  trail: readonly string[] | null,
+  item: string,
+): Promise<Extract<RecordFile, { entity: 'page' | 'set' }>> {
+  const entity = isMarkdownFile(item) ? 'page' : 'set'
+  const { id, icon } = await identityOf(entity, item)
+  return {
+    entity,
+    ...(id ? { id } : {}),
+    ...(icon ? { icon } : {}),
+    parent: trail ? { kind: 'container', id: trail[trail.length - 1] } : { kind: 'unaddressable' },
+    ...(trail && trail.length > 1 ? { trail: trail.slice(0, -1) } : {}),
+    ...(held.targets ? { targets: held.targets } : {}),
+    ...(held.partial ? { partial: true as const } : {}),
+  }
+}
+
+/** The Link values the bundle keeps whose page, resolved over the bundle's own pages where they lived, lies at or under `item`, read from the record as it stands at the op, so a value its delete's finish appends later stays with the bundle; a title two of its pages share stays with the bundle. */
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
+    const page = linkedPage(link.value, index)
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
+  const { bundle, store, record, artifact, inner } = read.value
+  if (!inner) return ok({ abs: bundle, store, record, artifact, inner: false })
+  const { item, held } = inner
+  const own = await innerRecord(held, await trailWithin(held, inner.artifact, dirname(item)), item)
+  const links = await keptLinksUnder(root, store, held, inner.artifact, item)
+  return ok({ abs: bundle, store, record: links.length ? { ...own, links } : own, artifact: item, inner: true })
 }
+
+/** Spends what a restore, an empty, or an Archive delete took: the whole bundle, or from an inner item's bundle only the item's share — the Link values it carried away, and its pages on the strip the bundle's delete still owes — so the bundle's own restore never writes them twice and a later finish never strips a link to what came back. */
+export async function spendBundle(root: string, opened: OpenBundle): Promise<void> {
+  const { abs, store, record, artifact, inner } = opened
+  if (!inner) return void (await removeOwn(abs))
+  const gone = 'links' in record ? (record.links ?? []) : []
+  const same = (l: unknown): boolean =>
+    isPlainObject(l) && gone.some((g) => g.page === l.page && g.property === l.property && g.value === l.value)
+  if (gone.length)
+    await patchRecord(abs, (raw) => {
+      const links = (Array.isArray(raw.links) ? raw.links : []).filter((l) => !same(l))
+      return { links: links.length ? links : undefined }
+    })
+  const bundle = relative(root, abs)
+  const owing = Object.entries(await readNotes(root)).find(
+    ([, e]) => e.kind === 'container' && e.bundle === bundle,
+  )
+  if (!owing) return
+  const from = originPathOf(root, store, artifact)
+  await editNote(root, owing[0], (e) =>
+    e?.kind === 'container'
+      ? { ...e, strip: distinct(e.strip?.filter((path) => !isAtOrUnder(path, from))) }
+      : e,
+  )
+}
```

**VERIFY**

- [x] `npx vitest run Core/Bundles` is green, with each new case red before its change.
- [x] `npm run typecheck` is clean.
- [x] Check for unnecessary code or mistakes.

#### Task 1-3

**TASK:** Route every spend through `spendBundle`, so an inner item restores, empties, and leaves the Archive through the ops as they stand.

**NOW:**
- **Spends:** each op removes its bundle outright:
  - `emptyBundle` at `spend.ts:109`;
  - `restoreTrashed`'s property branch at `spend.ts:132`, and its end at `spend.ts:297`;
  - `restoreArchived` at `archive.ts:80`;
  - the Archive delete at `delete.ts:134`, inside `deleteOp`'s `leave()` closure, which runs as the list step of `runNoted`.
- **Bare Removals That Stay:** these `removeOwn` calls take back or clear a bundle no op spent, and stay as they are:
  - `delete.ts:119`, a refused delete's bundle going back beside `:120`'s lifted rollback;
  - `bundle.ts:123`, `fileInto`'s failed move;
  - `bundle.ts:143`, `moveIntoStore` removing its emptied source;
  - `deleteProperty.ts:110`, a refused property delete's bundle;
  - `refile.ts:134`, an emptied Archive.
- **`emptyBundle`'s Note:** it keys its owed note on `relative(root, bundleAbs)` (`spend.ts:93`), the request's address. For an inner item that address is the item's own path, so each inner item emptied gets its own note. `openBundle` answers `abs` as the bundle folder for an inner item, so the key stays on the request's address rather than `opened.value.abs`.
- **Kept Links:** a delete's kept Link values reach its record after the move. `finishContainer` (`Core/Nexus/finishOwed.ts:375-402`) appends what its strip takes to `e.bundle`'s record through `patchRecord`, at the delete's own finish or later at Try Again or the next open. `keptLinksUnder` reads the record as it stands at the op.
  - `finishContainer` decides `back` by the container's id, and hands the noted paths to `deleteCascade` (`Core/Nexus/cascade.ts:94`), which strips only the keys that resolve to nothing in the settled index.
  - An inner page restored alone leaves its container not back, so a finish still owed runs the container's strip over the old paths and appends what it takes to the container's record after the item has left.
  - The pulled page's path keys under the container resolve to nothing once it lands elsewhere. Its title key keeps resolving while it lands under its own title, or while a namesake answers it beside a stepped-aside landing ("Pasta (2)").
  - **Links:** an inner item that left would otherwise stay on that strip, and a later finish would strip a link to an item that's back. `spendBundle` takes the item's page paths off `strip` by its origin path when the item leaves (Task 1-2). The pull's own restore then re-spells live linkers to its landing through `returningCascade`, owing that re-spell through its own `relink` entry where a linker can't be written. This half belongs at spend time: `finishOwed` runs every `container` entry before any `relink` entry (`finishOwed.ts:91-92`), so a linker refused at the pull still reads the old key when the container finish runs.
  - **Views:** the delete's owed `gone` edit names every Set under the container (`goneEdit`'s `within`, `configReach.ts:258-264`). `finishContainer` decides `back` for the container alone, so a Set pulled back out would lose its saved views at a later finish. `finishContainer` drops from a `gone` edit every id the tree holds again, the rule its own header states for the container, applied per Set whether or not the container is back. A restored Set, nested or not, is live and keeps its views. A Set emptied out of the bundle, or still in it, isn't, and the views' filters by it drop, even once the rest of the bundle is restored whole. A move's entry (`within`) keeps its edit whole, since a moved Set is live by design.

**CHANGE**

- [x] Write these tests and watch them fail.
  - **`trashRecovery.test.ts`:**
    - A page pulled from a trashed Set restores to a given container, and the bundle still holds its sibling.
    - A kept Link value naming that page refills on its restore and leaves the bundle's record.
    - The Set's own later restore names nothing unrestored and writes nothing twice.
    - An inner item restored with no destination is refused as homeless (`parent-gone`), and its bundle is left byte-identical.
    - A nested Set pulled out lands with its pages, and `refileLanded` carries what was archived from within it into the landing Collection's Archive.
    - **Owed Strip:** a page pulled from a trashed Set while the Set's delete still owes its strip, made owed by a linker whose write is refused, as `archive.test.ts:545-559` does. The note no longer lists the page's path. When the linker is writable again and Try Again runs, its `[[S/Pasta]]` link reads the page's landing and nothing is appended to the Set's record, both with the page landed under its own title and stepped aside ("Pasta (2)"), and with the linker still refused at the pull (its re-spell owed) and writable at the pull.
    - **Owed View Reach:** Set `S`, holding Set `T`, pulled from a trashed Collection while the Collection's delete still owes its `gone` view edit. Once the finish runs, saved views' filters by `S` and by `T` are kept, and a filter by a Set still in the bundle drops.
  - **`spend.test.ts`:**
    - Emptying an inner item disposes only that item, drops its pages' metadata, takes its carried values off the bundle's record, and leaves its owed note keyed by the item's own address.
    - Emptying an inner Set while its bundle's delete still owes its `gone` view edit drops the views' filters by that Set once the finish runs.
  - **`archive.test.ts`:**
    - A page pulled from an archived Set restores by a plain move to a given container.
    - An inner item's Archive delete moves it into the Trash, and its Trash record's `archive` names the item's address.
- [x] Edit the spends, `fromArchive`, and `finishContainer`'s view drop as below.
  - `spend.ts` and `archive.ts` lose their `removeOwn` import, and `delete.ts` keeps its own for `:119`.
  - `fromArchive` returns on a refused path before opening, so `resolved.value` names the address the item held.
- [x] Update `spendUndo`'s doc (`confirmations.ts:46`) to read "A bundle, or an inner item of one, restored or deleted from anywhere spends…".

**AFTER**

```Core/Trash/spend.ts diff
@@ emptyBundle @@
   const id = relative(root, bundleAbs)
 …
   if (record.entity === 'context') await dropContextOrder(root, record.registry.id)
-  await removeOwn(bundleAbs)
+  await spendBundle(root, opened.value)
   const recorded = 'links' in record ? (record.links ?? []) : []
@@ restoreTrashed (property branch) @@
     // A value that no longer fits is named rather than kept: the property is back, so its record could only ever refuse.
-    await removeOwn(bundleAbs)
+    await spendBundle(root, bundle)
@@ restoreTrashed @@
   // The record outlives a partial re-tag, so what didn't come back stays written down.
-  if (!unspent.length) await removeOwn(bundleAbs)
+  if (!unspent.length) await spendBundle(root, bundle)
```

```Core/Archive/archive.ts diff
@@ restoreArchived @@
   await writeOrder?.()
-  await removeOwn(bundle.abs)
+  await spendBundle(root, bundle)
```

```Core/Trash/delete.ts diff
@@ fromArchive @@
-/** A delete naming an Archive bundle takes the item inside it to the Trash under the chain it was archived from, so a Trash restore returns it there, and its record keeps the bundle it left for the Undo. Its pages' index rows sit at their Archive paths, while Link values name them where they lived. */
+/** A delete naming an Archive bundle, or an inner item of one, takes it to the Trash under the chain it was archived from, so a Trash restore returns it there, and its record keeps the address it left for the Undo. Its pages' index rows sit at their Archive paths, while Link values name them where they lived. */
 async function fromArchive(root: string, req: Extract<MutateRequest, { op: 'delete' }>) {
   if (!isArchived(req.path)) return null
   const resolved = await resolveUnderRoot(root, req.path)
-  const opened = resolved.ok ? await openBundle(root, resolved.value) : null
-  if (!opened?.ok) return NOT_HELD
-  const { abs: bundle, store, record: held, artifact: abs } = opened.value
+  if (!resolved.ok) return NOT_HELD
+  const opened = await openBundle(root, resolved.value)
+  if (!opened.ok) return NOT_HELD
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
@@ deleteOp (leave) @@
       if (archive) await machine().lock(archive.abs, () => discardFile(root, archive.abs, deps))
-      if (from) await removeOwn(from.bundle)
+      if (from) await spendBundle(root, from.opened)
       else await dropDeparture(root, before, req.kind, req.path)
```

```Core/Nexus/finishOwed.ts diff
@@ finishContainer @@
-  // A deleted page, Collection, or Set live again holds its links and views, so its delete owes them nothing; a moved Set is live by design, so it's back only while it stands where it left, its move never made or made undone.
+  // A deleted page, Collection, or Set live again holds its links and views, so its delete owes them nothing, and its `gone` view edit keeps only the Sets the tree doesn't hold again, whatever became of their container; a moved Set is live by design, so it's back only while it stands where it left, its move never made or made undone.
   const tree = await liveTreeOf(root)
   const live = findContainerById(tree, id)
   const back = e.within ? live?.path === e.at : pagesByIdOf(tree).has(id) || !!live
+  const perSet = e.edit?.kind === 'gone' && !e.within ? e.edit : null
+  const unlive = perSet?.ids.filter((x) => !findContainerById(tree, x)) ?? []
+  const edit = perSet
+    ? unlive.length
+      ? { ...perSet, ids: unlive }
+      : undefined
+    : back
+      ? undefined
+      : e.edit
 …
   const viewed =
-    !!e.edit &&
-    !back &&
-    add(reach, await reachConfig(root, e.edit, e.within && join(root, e.within)))
+    !!edit && add(reach, await reachConfig(root, edit, e.within && join(root, e.within)))
```

**VERIFY**

- [x] `npx vitest run Core/Trash Core/Archive Core/Bundles` is green, with each new case red before its change.
- [x] Every existing whole-bundle case passes untouched.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] Gates are clean.
- [x] An inner item restored, emptied, or Archive-deleted leaves its bundle holding exactly its siblings, and the bundle record's `links` minus the item's.
- [x] A refused inner-item op leaves its bundle byte-identical.

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
- **`fileInto`** (`bundle.ts:109-127`) mints a bundle, asking for `leaf` back.
- **Its callers:** `archive.ts:45`, `spend.ts:198`, and `moveIntoStore` (`bundle.ts:142`).
- **`moveIntoStore`'s callers:** `refile.ts:38`, which passes `basename(bundle)`, and `refile.ts:131`, which passes nothing.
- **`rearchive`** (`browser.ts:71-81`) sends `leaf: basename(row.bundlePath)`.

**CHANGE**

- [x] Write these tests and watch them fail.
  - **`bundle.test.ts`:** `fileInto` by address:
    - An inner item's address re-nests into its standing folder.
    - A taken name or a gone folder mints a fresh bundle, and a standing folder takes the item whichever store `to` names.
    - A whole bundle's address re-mints under its leaf.
  - **`archive.test.ts`:** a page pulled from an archived Set and restored is put back by its Undo inside the Set's bundle, at its folder.
- [x] Rewrite the existing tests that pass a `leaf`:
  - **`archive.test.ts:219-247`:** the `rearchive` helper passes the full bundle address, and the `../name` case stays.
  - **`ArchiveView.test.tsx:290,298`:** expect `at:` with the full bundle path.
  - **`mutateRequest.test.ts:19`:** use `at: 7`.
- [x] Edit the code as below:
  - `archiveOp` answers `bundled: { bundlePath: filed.address }`, and `archive.ts` loses its `relative` import.
  - `refile.ts:38` drops its last argument, and with it `refile.ts`'s `basename` import.
  - `rearchive` sends `at`, and `browser.ts` loses its `basename` import.
  - At `refile.ts:131`, the Archive-to-Trash move still mints a fresh stamp, because `mintBundle` refuses an `.archived` leaf for a `.deleted` base.

**AFTER**

```Core/Bundles/bundle.ts diff
@@ fileInto @@
-/** Files `artifact` into a bundle minted in `to` for `origin`, `leaf` asked back, its record written ahead; a failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. */
+/** Files `artifact` back at `at`, the address it held: into the folder it sat in while that folder still stands and holds nothing of its name, else into a bundle minted in `to` for `origin`, its record written ahead, asking back the bundle name `at` names when it names a whole bundle. A failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. Answers the address it now holds and where it landed. */
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
+  if (held?.item) {
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
     await lifted?.value.rollback()
     throw e
   })
   await dropDeparture(root, tree, req.kind, req.path)
-  return ok({ bundled: { bundlePath: relative(root, bundle) } })
+  return ok({ bundled: { bundlePath: filed.address } })
```

```Core/Bundles/browser.ts diff
@@ rearchive @@
-/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, under the bundle name it left, so it keeps its Archived date; one renamed or stepped aside since takes a fresh stamp, since that name no longer fits it. */
+/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, back at the address it left. */
 …
-      await mutate({ op: 'archive', path, kind: archivedKind(row), leaf: basename(row.bundlePath) })
+      await mutate({ op: 'archive', path, kind: archivedKind(row), at: row.bundlePath })
```

**VERIFY**

- [x] `npx vitest run Core/Bundles Core/Archive Core/Nexus/mutateRequest.test.ts` is green.
- [x] `rg -w "leaf" Core/Bundles Core/Archive Core/Nexus/mutateRequest.ts` finds only `mintBundle`'s own parameter, `placement.ts`'s local `leaf` helper (`:166-180`), and `refile.test.ts`'s local variable (`:446-450`).
- [x] Check for unnecessary code or mistakes.

#### Task 2-2

**TASK:** Make the Archive delete's Undo, a Trash restore to `{ kind: 'archive' }`, file back through `fileInto` at the address the Trash record's `archive` names, rebased onto the Archive its innermost live ancestor's Collection keeps now. Placement's `dir` is the one source of where the Undo files.

**NOW:**
- **`placeRecord`'s archive branch** (`placement.ts:203-223`) reads `stored.archive` through `bundleAddressOf`, as of Task 1-1, which already admits an inner item's address.
- **`restoreTrashed`** (`spend.ts:193-200`) files with `basename(dir)`.

**CHANGE**

- [x] Write these `archive.test.ts` cases and watch them fail:
  - An inner item Archive-deleted, then Undone, returns inside its Set's bundle, with its Link values refilled as in the whole-bundle case at `:481`.
  - The same case with the Set restored in between returns as its own Archive row.
  - With a live Set above the archived one moved into another Collection, the Undo returns it inside its Set's bundle carried into that Collection's Archive, and with that Set restored in between, as its own row there.
- [x] Edit as below.
  - `spend.ts` loses its `basename` import, whose only use was `:198`.
  - Update the `record.ts` `archive` doc (`:56`) and the `restoreDestination` doc at `mutateRequest.ts:48`.

**AFTER**

```Core/Trash/spend.ts diff
@@ restoreTrashed @@
-    // The Undo of a delete from the Archive lands in a bundle minted under the name its record keeps, reconciled as any Trash restore, and nothing lands in the tree.
+    // The Undo of a delete from the Archive files back at the address its record keeps, in the Archive that holds it now, reconciled as any Trash restore, and nothing lands in the tree.
     if (into && (record.entity === 'page' || record.entity === 'set')) {
       const origin = join(root, originPathOf(root, store, artifactAbs))
       const { archive, links, targets, partial, ...filed } = record
-      targetAbs = join(
-        await fileInto(root, into, origin, artifactAbs, filed, basename(dir)),
-        finalName,
-      )
+      targetAbs = (await fileInto(root, into, origin, artifactAbs, filed, dir)).landed
```

```Core/Bundles/placement.ts diff
@@ placeRecord @@
     // The address it names may be gone, so no realpath answers for it; `join` collapses any `..` before the store's prefix test.
-    const into = bundleAddressOf(root, join(root, stored.archive))?.store
-    if (into?.kind !== 'archive') return fault(NO_DESTINATION)
+    const named = bundleAddressOf(root, join(root, stored.archive))?.store
+    if (named?.kind !== 'archive') return fault(NO_DESTINATION)
+    const origin = originOf(stored)
+    const live = origin
+      ? [...origin.trail, origin.parent]
+          .reverse()
+          .map((id) => containerTrailById(tree, id))
+          .find((held) => held !== null)
+      : undefined
+    const into = archiveStoreOf(live?.[0].id) ?? named
 …
       placement: {
-        dir: stored.archive,
+        dir: join(
+          layoutOf(into).dir,
+          relative(join(root, layoutOf(named).dir), join(root, stored.archive)),
+        ),
```

```Core/Bundles/record.ts diff
-    /** A Trash record's only: the Archive bundle a delete took the item out of, where its Undo returns it. */
+    /** A Trash record's only: the Archive address a delete took the item from, a bundle or an inner item of one, where its Undo files it back. */
```

**VERIFY**

- [x] `npx vitest run Core/Archive Core/Trash Core/Bundles Core/Interface/Confirm` is green, with each new case red before its change.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] Gates are clean.
- [x] Both Undo paths re-nest an inner item while its folder stands, and fall back to a bundle of its own otherwise.
- [x] A whole bundle's Undo keeps its leaf (`archive.test.ts:219-247`, `:481-527`), and refile's moves keep their bundle names.

---

### Phase 3 — Listing Inner Items

**GOAL:** The host answers each asked address's inner items as `BundleRow`s, built by the one builder bundle rows use, over one channel asked lazily.

#### Task 3-1

**TASK:** Add `listInner`, which reads one level of a container address's inner items in the order the folder's sidecar keeps, and route bundle rows and inner rows through one `artifactRow`.

**NOW:** `bundleRowOf` (`rows.ts:85-130`) builds the artifact row inline, carrying `record.partial` as the row's `partial` (`:128`).

**CHANGE**

- [x] Write these tests and watch them fail.
  - **`bundle.test.ts`:** `listInner` lists one level of the folder:
    - Sets come first, then pages.
    - Each kind follows the folder sidecar's `set_order` and `page_order` through `resolveOrder` (`Core/Nexus/order.ts`).
    - Hidden, asset, and excluded entries are skipped.
  - **`rows.test.ts`:** an inner row's fields:
    - `bundlePath` is its address, and `stored` is `{ id, path: address }`.
    - Its icon is the page metadata's, or the Set sidecar's.
    - Its `crumbs` are its bundle's trail, then the bundled container and each inner Set down to its folder, each with its kind.
    - Its `historical` follows its bundle's.
    - `storedAt` is the bundle's stamp.
    - `homeResolves` is false.
    - `partial` follows its bundle record's, hand-seeded as in Task 1-2.
- [x] Add `listInner` with its `InnerListing`, `artifactRow`, and `innerRows`.
  - `bundleRowOf`'s artifact branch becomes one `artifactRow` call, and the existing `rows.test.ts` cases pass unchanged, the partial case at `:189-212` among them.
  - `artifactRow` carries `partial` from the record it's given, so an inner row reads the mark `innerRecord` passes down.
  - Lift `bundleRowOf`'s `liveCrumbs(record, tree) ?? frozenCrumbs(store, bundlePath)` into `bundleCrumbs`. `innerRows` reads it once per listing, then appends one crumb per segment of the path from the bundle folder to `folder`. The first crumb takes the bundled record's kind, and the rest are `'set'`.
  - Inside `artifactRow`, `name` is `basename(at.path)` and `restoring` is `at.bundlePath`. For an inner row, that is its own address, which answers `heldElsewhere` as the bundle would: `byId` holds no Set ids and no Trash pages.
- [x] Update the `BundleRow` docs:
  - **`bundlePath`:** add "Its address: a bundle's folder, or the inner item's own path."
  - **`stored`** (`rows.ts:39`): "…by its record's id and its path in its store…"

**AFTER**

```Core/Bundles/bundle.ts diff
@@ isContainerRecord @@
+type InnerRecord = Extract<RecordFile, { entity: 'page' | 'set' }>
 …
+/** One level of a container address's inner items under the bundle they sit in, its record and store, and the folder they share. */
+export interface InnerListing {
+  bundle: string
+  store: BundleStore
+  record: ContainerRecord
+  folder: string
+  items: { address: string; record: InnerRecord }[]
+}
+
+/** One level of a container address's inner items, its Sets and then its pages, each in the order the folder's sidecar keeps, with the record it carries; the trail above them is read once for the level. */
+export async function listInner(
+  root: string,
+  abs: string,
+  scope: WatchScope,
+): Promise<Result<InnerListing>> {
+  const read = await readBundleAt(root, abs)
+  if (!read.ok) return read
+  const { bundle, store, record, artifact, inner } = read.value
+  if (!isContainerRecord(record) || !artifact)
+    return fail('not-found', 'That holds no inner items.')
+  const folder = inner?.item ?? artifact
+  const trail = await trailWithin(record, artifact, folder)
+  const entries = (await listEntries(folder)).filter(
+    (e) =>
+      (e.kind === 'dir' || isContentFile(e)) &&
+      !outsideContent(originPathOf(root, store, join(folder, e.name)), scope),
+  )
+  const items = await Promise.all(
+    entries.map(async ({ name }) => {
+      const at = join(folder, name)
+      const own = await innerRecord(record, trail, at)
+      return {
+        address: relative(root, at),
+        record: own,
+        id: own.id ?? at,
+        title: titleFromPath(name),
+      }
+    }),
+  )
+  const meta =
+    (await readJsonObject(sidecarPath(folder, folder === artifact ? record.entity : 'set'))) ?? {}
+  const ordered = [
+    ...resolveOrder(
+      items.filter((i) => i.record.entity === 'set'),
+      asStringArray(meta.set_order),
+    ),
+    ...resolveOrder(
+      items.filter((i) => i.record.entity === 'page'),
+      asStringArray(meta.page_order),
+    ),
+  ]
+  return ok({
+    bundle: relative(root, bundle),
+    store,
+    record,
+    folder: relative(root, folder),
+    items: ordered.map(({ address, record }) => ({ address, record })),
+  })
+}
```

```Core/Bundles/rows.ts diff
@@ bundleRowOf @@
   if (!artifactName) return null
+  return artifactRow(
+    record,
+    { bundlePath, path: relJoin(bundlePath, artifactName), storedAt: storedAtOf(bundlePath) },
+    bundleCrumbs(record, store, bundlePath, tree),
+    tree,
+    byId,
+  )
+}
+
+/** A bundle's trail: live from its recorded parent, else frozen from the chain it was filed under. */
+function bundleCrumbs(
+  record: ArtifactRecord,
+  store: BundleStore,
+  bundlePath: string,
+  tree: NexusTree,
+): { crumbs: BundleCrumb[]; historical: boolean } {
+  const live = liveCrumbs(record, tree)
+  return { crumbs: live ?? frozenCrumbs(store, bundlePath), historical: !live }
+}
+
+/** The one row an artifact reads as, a bundle's own or an inner item's: the place it shows, the date it entered, and whether its home still answers. */
+function artifactRow(
+  record: ArtifactRecord,
+  at: { bundlePath: string; path: string; storedAt: number | null },
+  place: { crumbs: BundleCrumb[]; historical: boolean },
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+): BundleRow {
+  const name = basename(at.path)
+  const icon =
+    record.entity === 'page'
+      ? record.id
+        ? tree.config.pageMetadata[record.id]?.icon
+        : undefined
+      : record.entity === 'context'
+        ? undefined
+        : record.icon
+  const home = resolveRecord(record, name, tree, byId, at.bundlePath)
+  return matched({
+    bundlePath: at.bundlePath,
+    kind: record.entity,
+    title: record.entity === 'page' ? titleFromPath(name) : name,
+    crumbs: place.crumbs,
+    ...(place.historical ? { historical: true } : {}),
+    storedAt: at.storedAt,
+    ...(icon ? { icon } : {}),
+    ...((record.entity === 'page' || record.entity === 'set') && record.id
+      ? { stored: { id: record.id, path: at.path } }
+      : {}),
+    homeResolves: !('refuse' in home) || home.refuse === 'id-live',
+    ...(record.partial ? { partial: true as const } : {}),
+  })
+}
+
+/** A bundle's inner items as rows: each addressed by its own path, dated by its bundle's stamp, its trail the bundle's own followed by the containers inside it down to the row's folder. */
+export function innerRows(
+  listed: InnerListing,
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+): BundleRow[] {
+  const { bundle, store, record, folder, items } = listed
+  const { crumbs, historical } = bundleCrumbs(record, store, bundle, tree)
+  const [held, ...sets] = relative(bundle, folder).split('/')
+  const place = {
+    crumbs: [
+      ...crumbs,
+      { kind: record.entity, title: held },
+      ...sets.map((title) => ({ kind: 'set' as const, title })),
+    ],
+    historical,
+  }
+  const storedAt = storedAtOf(bundle)
+  return items.map(({ address, record }) =>
+    artifactRow(record, { bundlePath: address, path: address, storedAt }, place, tree, byId),
+  )
+}
```

`homeResolvesFor` folds into `artifactRow`, its one caller. `asStringArray` comes from `Core/Nexus/coerce`, as `containerFields.ts` takes it; `sidecarPath` comes from `Core/Paths/paths`; and an entry lists when it's a folder or `isContentFile` admits it, and `outsideContent` passes its origin path under the scope the handler reads from the tree, as `nexusPages` reads the Archive.

**VERIFY**

- [x] `npx vitest run Core/Bundles` is green, with each new case red before its change.
- [x] Check for unnecessary code or mistakes.

#### Task 3-2

**TASK:** Declare and serve `bundles:children`, which takes in one call every address a refresh holds open.

**NOW:** Only `bundles:list` exists (`bridge.ts:199`, `Bundles/handlers.ts`).

**CHANGE**

- [x] Write these `handlers.test.ts` cases and watch them fail:
  - Each address's inner items answer in the addresses' order.
  - A gone address, or a path escaping the root, answers an empty list, so one refused address never blanks the other open rows.
  - A non-array or non-string argument faults.
- [x] Add the channel and its handler.
  - The handler reads the tree and pages once per call.
  - Only a malformed argument faults; each address answers on its own.

**AFTER**

```Core/Contract/bridge.ts diff
   'bundles:list': { args: [store: BundleStore, within?: string]; reply: Result<BundleRow[]> }
+  // One level of inner items per row a browser holds open, asked on opening and again on each refresh, since `bundles:list` walks no artifact.
+  'bundles:children': { args: [addresses: string[]]; reply: Result<BundleRow[][]> }
```

```Core/Bundles/handlers.ts diff
+  'bundles:children': withRoot(async (root, _ctx, raw: unknown) => {
+    if (!Array.isArray(raw) || !raw.every(isString)) return fault('Addresses are required.')
+    const tree = await liveTreeOf(root)
+    const { byId } = await nexusPages(root, tree)
+    const scope = scopeOf(tree.config)
+    return ok(
+      await Promise.all(
+        raw.map(async (address) => {
+          const resolved = await resolveUnderRoot(root, address)
+          const listed = resolved.ok ? await listInner(root, resolved.value, scope) : resolved
+          return listed.ok ? innerRows(listed.value, tree, byId) : []
+        }),
+      ),
+    )
+  }),
```

**VERIFY**

- [x] `npx vitest run Core/Bundles Core/Contract` is green, including `Core/Contract/engineGraph.test.ts`.
- [x] Check for unnecessary code or mistakes.

#### Compaction Checkpoint

- [x] Tick the host phases in *§Process Overview*, record any *§Deviations*, and prepare the handoff before the renderer phases.

---

### Phase 4 — The Browser's Tree

**GOAL:** `useBundleBrowser` holds which rows are open and the inner rows they list, and hands both skins one flattened list. It owns the click intent, the rule that a parent covers its children, and the batch's single destination ask.

#### Task 4-1

**TASK:** Add `TreeRow`, `treeRows`, `outermostOf`, and `rowClick`, and hold the open rows' inner rows in one ref-backed map.

**NOW:**
- **`visible`** is the filtered top rows (`browser.ts:234-237`).
- **`retained`** keeps checks over top rows only (`:223-224`).
- **`picked` and `actedOn`** act on what's checked, unfiltered.

**CHANGE**

- [x] Write these `browser.test.ts` cases and watch them fail:
  - **`treeRows`:**
    - It sets each row's `depth`.
    - `open` is null for a page.
    - Inner rows sit beneath an open parent only.
  - **`outermostOf`:** a checked Set and its checked page act once, while siblings and look-alike prefixes (`A/B` vs `A/Bc`) both stay.
  - **Remembered Checks:**
    - A checked inner row stays checked when its container collapses, shows checked again when it reopens, and is left out of `picked` while hidden.
    - A check whose row its reopened container no longer lists is kept when that container's reply lands, and dropped at the next listing.
  - **Listing:** a listing asks once for every open address and keeps the checks its reply still lists; a reply that no longer lists a checked inner row drops its check; a container closed while the reply is in flight stays closed.
  - **Closing:** a container's close forgets its open descendants two levels deep, and a late reply doesn't reopen it.
  - **Clicks:** a `detail` of 0, a keyboard's click, discloses a container and toggles a page; a page's `detail === 2` leaves it checked whether or not it started checked.
  - **Coverage:** a checked Set and its checked page reach `picked` once, as the Set.
- [x] Hold `open: ReadonlyMap<string, readonly BundleRow[] | null>` in state, mirrored in a ref that holds the open map alone. `null` marks an entry whose reply is pending. This map is the only record of what's open.
  - **Opening:** `rowClick` on a closed container sets its entry to `null` at once, so it reads open with its chevron turned. It then asks `bundles:children([address])` and sets the entry from the reply only while that entry is still `null`, so a late reply changes nothing, and a failed one leaves it pending for the next listing to ask again.
  - **Closing:** `rowClick` on an open container drops the address and every key `isAtOrUnder` it from `open`. Its rows' checks stay, under the rule below.
  - **Refreshing:** after the listing lands, `refresh` asks for every open address in one `bundles:children` call, under `refresh`'s own `asks` rule. It lays the reply over the open map as it stands then, keeps the entries `treeRows` still reaches over the new top rows, and sets the listing, the map, and the prune together.
- [x] Derive the rest:
  - **Kept Checks:** `checkSet.ts`'s `retained` takes a predicate in place of a live set, and `PageReaderWindow.tsx:148` passes `(k) => live.has(k)`. The browser's predicate keeps a check in one of two cases:
    - its row is listed (a top row, or one in `open`);
    - the nearest listed row above its address is closed or pending, its contents not loaded to say otherwise.
  - **When Checks Are Pruned:** `retained` runs only where `refresh` lands, over its top rows and its one `bundles:children` reply. Opening and collapsing prune nothing. A stale hidden check is inert until then, since both skins read `checked` only for rows they show and every count comes from `picked`, and every op emits `storesChanged`.
  - **`visible`:** `treeRows(filterRows(rows, query), open)`.
  - **`found`:** the top-level match count, which ArchiveView publishes.
  - **`rowsInView`:** the `BundleRow`s of `visible`, memoized beside it.
  - **`picked`:** `outermostOf(checkedIn(checked, rowsInView, key))`.
  - **The menu's targets:** `outermostOf(actedOn(checked, rowsInView, row, key))`, so the right-click rule stays in `actedOn`, which `PageReaderWindow.tsx` also uses.
- [x] Add `rowClick(row, detail)`, under `CalendarPicker.tsx`'s rule, so a keyboard's `el.click()` (`detail === 0`) reads as a single click:
  - A container discloses on `detail < 2`.
  - A page toggles its check on `detail < 2`.
  - A page on `detail === 2` makes sure it's checked.
- [x] Keep `toggle` for the checkbox.
- [x] Update the hook's docstring (`:189`) to name the tree, its open map, and `rowClick`.

**AFTER**

```Core/Bundles/browser.ts diff
+/** A row as a browser shows it: how deep it sits, and whether it's open, null for a row with nothing to disclose. */
+export interface TreeRow {
+  row: BundleRow
+  depth: number
+  open: boolean | null
+}
+
+/** Each open container's inner rows, null while its reply is pending. */
+type OpenRows = ReadonlyMap<string, readonly BundleRow[] | null>
+
+const discloses = (row: BundleRow): boolean => row.kind === 'set' || row.kind === 'collection'
+
+/** The rows in view: each top row, and beneath each open one the inner rows it lists, in order. */
+export function treeRows(rows: readonly BundleRow[], open: OpenRows): TreeRow[] {
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
+
+/** The checks a listing keeps: a listed row's, and one inside a closed or pending container, whose contents aren't loaded to say otherwise. */
+function keepsCheck(rows: readonly BundleRow[], open: OpenRows): (address: string) => boolean {
+  const listed = new Set(
+    [...rows, ...[...open.values()].flatMap((v) => v ?? [])].map((r) => r.bundlePath),
+  )
+  return (address) => {
+    if (listed.has(address)) return true
+    for (let at = relDirname(address); at; at = relDirname(at))
+      if (listed.has(at)) return !open.get(at)
+    return false
+  }
+}
@@ useBundleBrowser @@
-  visible: BundleRow[]
+  visible: TreeRow[]
+  found: number
+  rowClick: (row: BundleRow, detail: number) => void
 …
+  const disclose = async (address: string): Promise<void> => {
+    const was = held.current
+    if (was.has(address))
+      return openTo(new Map([...was].filter(([at]) => !isAtOrUnder(at, address))))
+    openTo(new Map(was).set(address, null))
+    const res = await dialer().ask('bundles:children', [address])
+    if (res.ok && held.current.get(address) === null)
+      openTo(new Map(held.current).set(address, res.value[0]))
+  }
```

**VERIFY**

- [x] `npx vitest run Core/Bundles/browser.test.ts` is green, with each new case red before its change.
- [x] Check for unnecessary code or mistakes.

#### Task 4-2

**TASK:** A batch Restore holding homeless rows asks once per kind of destination and sends each row its destination. `restoreOne`, the batch, and the menu share one destination ask, and the "had nowhere to go" refusal goes.

**NOW:**
- **`restoreBatch`** (`browser.ts:331-351`) restores only the rows whose home resolves, and reports the rest as having nowhere to go.
- **`placesFor`** (`:253-258`) feeds both `restoreOne`'s picker and `openMenu`'s submenu.
- **`many`** (`:288-329`) sends no destination, and answers `owed` when any reply owes work. `restoreOne`, `restoreBatch`, and `deleteBatch` pass `finishOwed` into `notifyOutcome` as its Try Again when owed.

**CHANGE**

- [x] Rewrite two existing cases to the new rule and watch them fail:
  - **`TrashFrame.test.tsx:382`:** a Restore All of two homeless rows and one homed row opens one picker. The two homeless rows restore to the picked place, and the homed row restores to its own home, its request sent with no destination. A dismissed picker restores nothing.
  - **`ArchiveView.test.tsx:359`:** run its batch half as a mixed batch that asks once.
- [x] Add `browser.test.ts` cases:
  - a batch of a homeless Space and a homeless page asks once per kind and sends each its own kind's destination, and a dismissed second ask restores nothing;
  - a right-click on a checked inner page under its checked, in-view parent Set offers the Set's destinations and restores the Set;
  - an inner row's restore spends the Undo armed at its own address.
- [x] Replace `placesFor` with `DestinationKind` and three functions, then rewrite `restoreOne`, `openMenu`, and `restoreBatch` over them:
  - **`DestinationKind`:** `Extract<RestoreDestination, { id: string }>['kind']`, the request schema's own.
  - **`destinationKind(row)`:** `'context'` for a Space, otherwise `'container'`.
  - **`destinationTargets(kind)`:** that kind's targets, built once.
  - **`askDestination(kind)`:** pops `destinationRows` and answers a `RestoreDestination` or null.
  - **`openMenu`:** its single-target logic reads `targets[0]`, after `outermostOf`, so the destination submenu and plain Restore act on the same item.
- [x] Extend `many` with `destinationOf`, keeping its `owed`, and keep `restoreBatch`'s `owed` and its `finishOwed` argument as they stand. Remove `notifyReport`'s import from `browser.ts`, since its only use was `:335`.

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
     const { done, refused, unrestored, warnings, renamed, owed } = ran
     notifyOutcome(
       `Restored ${countPhrase(done)}`,
       renamed.length > 1 ? `${renamed.length} Renamed` : renamed[0],
       [
-        homeless.length > 0 && nowhere,
         refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
         unrestored.length > 0 && unrestoredLine(unrestored),
         ...warnings,
       ],
       done.length > 0 ? rules.restoreUndo?.(done) : undefined,
       owed ? finishOwed : undefined,
     )
```

**VERIFY**

- [x] `npx vitest run Core/Bundles Core/Settings Core/Archive` is green, with each rewritten case red before its change.
- [x] Check for unnecessary code or mistakes.

#### Review Checkpoint

- [x] Gates are clean.
- [x] A checked inner row survives a refresh while its parent stays open.
- [x] Closing a parent forgets its open descendants but keeps their checks, and a late reply doesn't reopen a closed row.
- [x] A covered batch acts once per item, and `spendUndo` keys on each row's own address.

---

### Phase 5 — Both Skins

**GOAL:** The Trash frame and ArchiveView draw the tree.
- **Indent:** inner rows step in from each skin's own lead.
- **Chevron:** it sits right of the label.
- **Clicks:** every click goes through `rowClick`.
- **Reader:** an Archive page's double-click opens it.

#### Task 5-1

**TASK:** Give `MenuItem` a `titleAccessory` slot, set inline right of the title text and outside its ellipsis.

**NOW:** `MenuItem` (`MenuRows.tsx:96`) sets its title text at `:155` and `subLabel`, a line below it, at `:156`, with nothing beside the title. No UIX suite renders `MenuItem`.

**CHANGE**

- [ ] Add `UIX/Menus/MenuRows.test.tsx` and watch its case fail: `titleAccessory` renders after the title text on one line, and is absent from the DOM when not given.
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
  - **`:359`:** the mixed batch's homeless row is a disclosed inner page.
  - **`:159`:** a page row's click checks it, and its double-click opens the reader with the row checked, whether or not it started checked. The test sends the real click sequence (`detail` 1, then 2, then `dblclick`). For an inner page, the reader's trail is its row's trail, then the page.
  - **`:174`:** a Set row's click discloses its inner rows beneath it, indented, with the chevron open. A second click folds them, and a double-click leaves them open.
- [ ] Add these cases:
  - a checked Set and its checked page restore once, as the Set;
  - an inner row shows its trail: its bundle's trail, then the containers inside the bundle;
  - the published count stays the count of top rows.
- [ ] Edit `ArchiveRow` and `archive-view.css` as below.
  - **`ArchiveRow`:** it keeps `memo` by taking `depth` and `open` as primitives.
  - **`api.open(row)`:** stays as it is at HEAD. An inner row's `crumbs` already hold the bundle's trail and the containers inside it, so `crumbSegments(row.crumbs)` plus the page itself is the reader's trail for every row.
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
-        {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a page's title is the pointer's door to the reader; a Set's opens nothing and its click checks the row */}
-        <span
-          className={cx(overScrollLabel, 'cell-title')}
-          onClick={
-            row.kind === 'page'
-              ? (e) => {
-                  e.stopPropagation()
-                  api.open(row)
-                }
-              : undefined
-          }
-        >
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

**NOW:**
- **Clicks:** every Trash row's click checks it (`TrashFrame.tsx:171`).
- **Indent:** MenuItem's `indent` measures from an 8px base, while Trash rows lead by `--row-pad-lead` (24px). Using it would step a depth-1 row left of its parent.
- **Partial Mark:** `trailing` draws the `triangle-alert` "Recorded Partly" icon ahead of the date for a `partial` row (`:154-161`).

**CHANGE**

- [ ] Write these `TrashFrame.test.tsx` cases and watch them fail:
  - A Collection row's click discloses its Sets and then its pages, indented, and its checkbox still checks it.
  - An inner row's right-click Restore ▸ lists destinations, and its Delete empties only that item.
  - A checked inner row stays checked across a refresh, and across its container collapsing and reopening.
  - An inner row's trail reads its bundle's trail, then the containers inside the bundle.
- [ ] Have `TrashRowView` take its `TreeRow` whole, and wire it as follows:
  - `onClick={(e) => rowClick(row, e.detail)}`;
  - `titleAccessory={open !== null ? <DropOutline open={open} /> : undefined}`;
  - `trailing` keeps the partial icon and the date as they stand;
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

**TASK:** Rewrite each *§Reconciliation* entry in place, under *§Constraints › Docs*.

**CHANGE**

- [ ] Walk *§Reconciliation*. Each feature-doc entry fixes only the sentence it names, in place and plainly, at its length or shorter, as the user reads it, with no correction language.
- [ ] Rewrite `IssuesPM.md` I-075 to the shipped `rowClick`:
  - `browser.ts` reads `detail`, so its row joins the surface table as a `detail` guard, and the paragraph naming this plan leaves;
  - the Solution counts eleven surfaces with the plan's Task 4-1 dropped, and the footnote's two plan cites give way to `browser.ts`'s `rowClick`.
- [ ] Add an `IssuesPM.md` entry: a container bundle emptied by pulling out every inner item stays in its store as an empty row. Nathan has said he's unhappy with this and wants it revisited. Run `~/The Studio/.claude/scripts/index-issues/index-issues.py .claude/IssuesPM.md` afterward, which gives the entry its number and recomputes the totals.

**VERIFY**

- [ ] `rg -n "one row per deleted|is one row|title opens the reader|nowhere to go" .claude/Features Core` finds nothing stale.
- [ ] The index script reports no dangling citation.

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

- `.claude/Features/NexusRecordPM.md:10` — "a Trash record of a page or Set deleted from the Archive names the Archive bundle it left" reads false for an item taken out of an archived Set, whose record names where inside the bundle it sat — Task 6-1
- `.claude/Features/NexusRecordPM.md:16` — "one row per deleted entity" reads false once a Set's or Collection's row opens onto a row per item inside it; "removes the spent bundle" reads false for an item deleted out of one, which leaves the rest behind; "a batch names what it couldn't resolve" reads false once a batch asks where its homeless rows go — Task 6-1
- `.claude/Features/CollectionsPM.md:51` — "Restoring an archived page or set places it back into its remembered placement" reads false for an item restored out of an archived Set, which asks where it goes — Task 6-1
- `.claude/Features/CorePM.md:92` — "save the Archive bundle a delete from the Archive names" and "an Archive bundle" in the cascade rule read false once a delete from the Archive can name an item inside one — Task 6-1
- `.claude/Features/PommoraUIX.md:361` — "`MenuItem` carries `leading` · title · `subLabel` · `detail` · `trailing` · `overlay`" omits `titleAccessory` from the kit's slot ledger — Task 6-1
- `.claude/IssuesPM.md` I-075 — "`Core/Bundles/browser.ts` doesn't read `detail` yet", the Solution's surface count, and the footnote's plan cites read false once `rowClick` ships — Task 6-1
- `.claude/IssuesPM.md` — new entry: an emptied container bundle stays behind — Task 6-1
- `Core/Bundles/browser.ts:189` — the hook's doc gains the tree and `rowClick` — Task 4-1
- `Core/Interface/Confirm/confirmations.ts:46` — the `spendUndo` doc reads "A bundle, or an inner item of one, …" — Task 1-3

#### Open Items

- **Emptied Containers (Nathan's Note):** pulling every inner item out of a container bundle leaves the container in its store as an empty row. That holds for now, and Nathan isn't happy with it. Task 6-1 records it in `IssuesPM.md` for a later decision.


#### Deviations

- **The Layout Leaf (Task 1-2):** `spendBundle`'s owed-note edit put `owed.ts` and `configReach.ts` on the live tree's load path, because `heldPages.ts` reached `bundle.ts` for `originPathOf` alone. The cycle left `configReach.test.ts`'s `liveTree` mock depending on import order. The stores' layout, the stamp, `stampedSegment`, `bundleAddressOf`, and `originPathOf` moved into a pure `Core/Bundles/layout.ts`, so loading the tree reaches nothing else in `Core/Bundles/`, and the baseline cycle through `record.ts` closed with it.
