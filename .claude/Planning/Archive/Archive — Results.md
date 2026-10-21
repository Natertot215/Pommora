### Archive — Results

| Actionable | All-Inclusive | Comments | Documentation | Tests | Files |
|------------|---------------|----------|---------------|-------|-------|
| =🟢+2101=(=🟢+3910=/=🔴-1809=) | =🟢+6987=(=🟢+9716=/=🔴-2729=) | =🟢+105=(=🟢+206=/=🔴-101=) | ±0(+0/-0) | =🟢+4781=(=🟢+5600=/=🔴-819=) | =🟢+19=(=🟢+30=/=🔴-11=) |

- **FILES:** =🟢+2206=(=🟢+4116=/=🔴-1910=)
- **TESTS:** =🟢+4781=(=🟢+5600=/=🔴-819=)

---

##### Core/Actions/createActions.ts

```/Core/Actions/createActions.ts diff
@@ -3 +3 @@ import { spaceCreator } from './createMenu'
 import type { RenameHost } from '../Session/editSlice'
 import { relDirname } from '../Paths/posix'
 import { placeAt, placeNew } from '../Views/creationOrder'
-import { containerAt, findContainerWhere } from '../Nexus/treePatch'
-import { isContainer } from '../Nexus/entities'
+import { containerAt, findContainerById } from '../Nexus/treePatch'
+import { namesContainer } from '../Nexus/entities'
 import { useSession, windowTargetOf } from '../Session/store'
 import { personalizationOf } from '../Session/configSlice'
 
@@ -63 +63 @@ export async function newPage(inWindow: boolean): Promise<void> {
   if (!tree) return
   const from = inWindow ? windowTargetOf(s) : s.selection
   let parentPath: string | null = null
-  if (isContainer(from))
-    parentPath = findContainerWhere(tree, (n) => n.id === from.id)?.path ?? null
+  if (namesContainer(from)) parentPath = findContainerById(tree, from.id)?.path ?? null
   else if (from?.kind === 'page') parentPath = relDirname(from.path)
   if (parentPath === null) parentPath = tree.collections[0]?.path ?? null
   if (parentPath === null) return
```

##### Core/Actions/destinationTree.ts

```/Core/Actions/destinationTree.ts diff
@@ -1 +1 @@
-// Both askers read the one walk in `record.ts` — the card's Move To ▸, which relocates a live page by path, and the trash's Restore ▸, which files a returning one by id — so the two menus can never disagree about what the nexus will hold.
+// Every asker reads `nodesOf` — the card's Move To ▸, which relocates a live page by path, and the Trash's and the Archive's Restore ▸, which file a returning item by id — so the menus can never disagree about what the Nexus will hold.
 
 import type { MoveTarget } from './pageMenu'
 import { contextDirRel } from '../Paths/nexusPaths'
```

##### Core/Actions/entityMenu.ts

```/Core/Actions/entityMenu.ts diff
@@ -5 +5 @@ import {
   type PageMetaAction,
   type PageMoveAction,
   COPY_PATH_ROW,
+  DELETE_ROW,
   pageMetaMenuItems,
+  REMOVAL_ROWS,
+  RENAME_ROW,
   REVEAL_ROW,
 } from './pageMenu'
 import { type TitleMenuAction, titleMenuItems } from './identityMenus'
@@ -30 +33 @@ export type EntityMenuAction =
   | CreateMenuAction
   | 'open'
   | 'preview'
-  | 'delete'
   | 'lock'
   | TitleMenuAction
   | 'changeColor'
@@ -61 +63 @@ export function entityMenuItems(
     return joinGroups<EntityMenuAction>([
       open,
       create,
-      [
-        { label: 'Rename', action: 'rename' },
-        { label: 'Delete', action: 'delete' },
-      ],
+      [RENAME_ROW],
       [
         ...(target.host === 'sidebar'
           ? [
@@ -77 +76 @@ export function entityMenuItems(
         COPY_PATH_ROW,
         REVEAL_ROW,
       ],
+      target.kind === 'set' ? REMOVAL_ROWS : [DELETE_ROW],
     ])
   const identity: ActionItem<EntityMenuAction>[] =
     target.kind === 'space'
@@ -88 +88 @@ export function entityMenuItems(
           ...propertyBranchRows(target),
         ]
       : titleMenuItems()
-  return joinGroups<EntityMenuAction>([
-    open,
-    create,
-    identity,
-    [{ label: 'Delete', action: 'delete' }],
-  ])
+  return joinGroups<EntityMenuAction>([open, create, identity, [DELETE_ROW]])
 }
```

##### Core/Actions/fileHistoryMenu.ts

```/Core/Actions/fileHistoryMenu.ts diff
@@ -1 +0 @@
-import type { ActionItem } from './menuModel'
-
-type FileHistoryMenuAction = 'restore' | 'delete'
-
-export function fileHistoryMenuItems(batch: boolean): ActionItem<FileHistoryMenuAction>[] {
-  return batch
-    ? [{ label: 'Delete All', action: 'delete' }]
-    : [
-        { label: 'Restore', action: 'restore' },
-        { label: 'Delete', action: 'delete', separatorBefore: true },
-      ]
-}
```

##### Core/Actions/pageMenu.ts

```/Core/Actions/pageMenu.ts diff
@@ -13 +13 @@ export type PageMetaAction =
   | 'title:copypath'
   | 'title:history'
   | 'title:reveal'
+  | 'title:archive'
   | 'title:delete'
 
 export type PageMoveAction = `move:${string}`
@@ -37 +38 @@ export const COPY_LINK_ROW = { label: 'Copy Link', action: 'title:copylink' } as
 export const COPY_PATH_ROW = { label: 'Copy Path', action: 'title:copypath' } as const
 export const HISTORY_ROW = { label: 'View History', action: 'title:history' } as const
 export const REVEAL_ROW = { label: 'Reveal Location', action: 'title:reveal' } as const
+const ARCHIVE_ROW = { label: 'Archive', action: 'title:archive' } as const
 export const DELETE_ROW = { label: 'Delete', action: 'title:delete' } as const
+export const REMOVAL_ROWS = [ARCHIVE_ROW, DELETE_ROW] as const
 
 export function destinationRows<A>(
   targets: readonly MoveTarget[],
@@ -101 +104 @@ export function pageSendGroups(
 export const PAGE_ACTION_ROWS = joinGroups([
   [RENAME_ROW],
   pageSendGroups({}, true).flat(),
-  [DELETE_ROW],
+  REMOVAL_ROWS,
 ])
 
 // 'single' takes the Below path, since a grid has no above.
@@ -129 +132 @@ export function pageMetaMenuItems(
     [RENAME_ROW, { label: 'Edit Icon', action: 'title:icon' }, ...propertyBranchRows(opts)],
     opts.newPages ? NEW_PAGE_ROWS[opts.newPages] : [],
     ...pageSendGroups(opts.move ?? {}, opts.reveal),
-    [DELETE_ROW],
+    REMOVAL_ROWS,
   ])
 }
```

##### Core/Actions/restoreMenu.ts

```/Core/Actions/restoreMenu.ts diff
@@ -0 +1 @@
+import { type ActionItem, joinGroups } from './menuModel'
+import { destinationRows, type MoveTarget } from './pageMenu'
+
+type RestoreMenuAction = 'restore' | 'delete' | `restoreTo:${string}`
+
+/** Restore and Delete over what a right-click acts on (`actedOn`), named for a batch; the leaf performs the write and refreshes the list it shows. */
+export function restoreMenuItems({
+  batch,
+  destinations,
+  restoresBatch = true,
+}: {
+  batch: boolean
+  /** Absent means the recorded home resolves and Restore acts without asking. */
+  destinations?: MoveTarget[]
+  /** False where one item restores at a time (File History), so a batch offers Delete All alone. */
+  restoresBatch?: boolean
+}): ActionItem<RestoreMenuAction>[] {
+  const label = batch ? 'Restore All' : 'Restore'
+  const restore: ActionItem<RestoreMenuAction> = destinations
+    ? { label, submenu: destinationRows(destinations, (t) => `restoreTo:${t.id}` as const) }
+    : { label, action: 'restore' }
+  return joinGroups<RestoreMenuAction>([
+    batch && !restoresBatch ? [] : [restore],
+    [{ label: batch ? 'Delete All' : 'Delete', action: 'delete' }],
+  ])
+}
```

##### Core/Actions/trashMenu.ts

```/Core/Actions/trashMenu.ts diff
@@ -1 +0 @@
-// The action resolves back to the leaf, which performs the write and can then refresh the list it is looking at.
-
-import type { ActionItem } from './menuModel'
-import { destinationRows, type MoveTarget } from './pageMenu'
-
-type TrashMenuAction = 'restore' | 'delete' | 'restoreAll' | 'deleteAll' | `restoreTo:${string}`
-
-interface TrashMenuContext {
-  /** The renderer decides: a right-click on an unchecked row acts on that row alone, whatever else is checked. */
-  batch: boolean
-  /** Absent means the recorded home resolves and Restore acts without asking. */
-  destinations?: MoveTarget[]
-}
-
-function trashMenuLabels(batch: boolean): { restore: string; delete: string } {
-  return batch
-    ? { restore: 'Restore All', delete: 'Delete All' }
-    : { restore: 'Restore', delete: 'Delete' }
-}
-
-export function trashMenuItems(ctx: TrashMenuContext): ActionItem<TrashMenuAction>[] {
-  const label = trashMenuLabels(ctx.batch)
-  const restore: ActionItem<TrashMenuAction> = ctx.destinations
-    ? {
-        label: label.restore,
-        submenu: destinationRows(ctx.destinations, (t) => `restoreTo:${t.id}` as const),
-      }
-    : { label: label.restore, action: ctx.batch ? 'restoreAll' : 'restore' }
-  return [
-    restore,
-    { label: label.delete, action: ctx.batch ? 'deleteAll' : 'delete', separatorBefore: true },
-  ]
-}
```

##### Core/Archive/ArchiveView.tsx

```/Core/Archive/ArchiveView.tsx diff
@@ -0 +1 @@
+import { memo, useMemo, useState } from 'react'
+import { Checkbox } from '@pommora/uix/Controls/Checkbox'
+import { NavTrail } from '@pommora/uix/Elements/NavTrail'
+import { historical } from '@pommora/uix/Elements/nav-trail.css'
+import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
+import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
+import { useVirtualRows } from '@pommora/uix/Interactions/virtualRows'
+import { text } from '@pommora/uix/Theme'
+import { cx } from '@pommora/uix/Utilities/cx'
+import { useStableApi } from '@pommora/uix/Utilities/stableApi'
+import { Icon } from '@pommora/uix/Symbols'
+import { entityIcon } from '../Assets/entityIconPolicy'
+import { archivedKind, crumbSegments, useBundleBrowser } from '../Bundles/browser'
+import { DateHeading } from '../Bundles/DateHeading'
+import { countPhrase } from '../Interface/Confirm/confirmations'
+import type { BundleRow } from '../Bundles/rows'
+import { InterfaceScaffold } from '../Interface/InterfaceScaffold'
+import { useContentHost, useHostShown } from '../Interface/contentHost'
+import { type ActionBar, useDeclareActions } from '../Interface/Notifications/notifications'
+import { usePublishCount } from '../Interface/Subfield/publish'
+import type { CollectionNode, SetNode } from '../Nexus/tree'
+import { containerOwner } from '../Nexus/treeIndex'
+import { owningCollection } from '../Nexus/treePatch'
+import { PropertyTypeIcon } from '../Properties/Cells/PropertyTypes'
+import { personalizationOf } from '../Session/configSlice'
+import type { Personalization } from '../Settings/personalization'
+import { useSession } from '../Session/store'
+import { WIDTHS } from '../Views/Table/useColumns'
+import '../Views/Table/table-view.css'
+import { ARCHIVE_TITLE } from './archivePlace'
+import './archive-view.css'
+
+const ROW_H = 48
+
+type RowApi = {
+  toggle: (row: BundleRow) => void
+  menu: (row: BundleRow) => void
+  open: (row: BundleRow) => void
+}
+
+/** A Collection's or a top-level Set's archived items on TableView's sheet: checked for Restore and Delete, a page opened in the reader. */
+export function ArchiveView({ owner }: { owner: CollectionNode | SetNode }): React.JSX.Element {
+  const host = useContentHost()
+  const shown = useHostShown()
+  const query = useSession((s) => (host ? s.viewSearch[host.tabId]?.query : undefined)) ?? ''
+  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
+  const openReader = useSession((s) => s.openReader)
+  const archiveId = useSession((s) => owningCollection(s.tree, owner)?.id) ?? owner.id
+  const browser = useBundleBrowser(
+    { kind: 'archive', id: archiveId },
+    { query, shown, within: owner.kind === 'set' ? owner.id : undefined },
+  )
+  const { listing, visible } = browser
+  const dateTrack =
+    browser.date.width === null
+      ? `${WIDTHS.dateTime.default}px`
+      : `calc(${browser.date.width}px + 2 * var(--cell-padding-x))`
+  const cols = `minmax(${WIDTHS.title.default}px, 1fr) ${dateTrack}`
+
+  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
+  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
+  const { rows: slots, height } = useVirtualRows(
+    { count: visible.length, rowHeight: ROW_H, listEl, scrollEl },
+    [],
+  )
+
+  const api = useStableApi({
+    toggle: (row: BundleRow) => browser.toggle(row.bundlePath),
+    menu: (row: BundleRow) => void browser.openMenu(row),
+    open: (row: BundleRow) => {
+      const stored = row.stored
+      if (!stored) return
+      openReader({
+        kind: 'archive',
+        page: { kind: 'page', ...stored },
+        trail: [
+          ...crumbSegments(row.crumbs, defaultIcons),
+          { title: row.title, icon: entityIcon('page', row.icon, defaultIcons) },
+        ],
+      })
+    },
+    restore: () => void browser.restore(browser.picked),
+    remove: () => void browser.remove(browser.picked),
+  })
+  const count = browser.picked.length > 0 ? countPhrase(browser.picked) : null
+  const bar = useMemo<ActionBar | null>(
+    () => (count === null ? null : { count, restore: api.restore, remove: api.remove }),
+    [count, api],
+  )
+  useDeclareActions(bar)
+  usePublishCount(listing.status === 'ready' ? visible.length : null)
+
+  const footing = (): React.JSX.Element | null => {
+    switch (listing.status) {
+      case 'loading':
+        return null
+      case 'failed':
+        return <div className="archive-empty">The archive couldn't be read.</div>
+      case 'ready':
+        if (visible.length > 0) return null
+        return (
+          <div className="archive-empty">
+            {listing.rows.length === 0
+              ? `This ${owner.kind === 'set' ? 'Set' : 'Collection'}'s archive is empty.`
+              : 'Nothing matches.'}
+          </div>
+        )
+    }
+  }
+
+  return (
+    <InterfaceScaffold
+      owner={containerOwner(owner)}
+      trailing={ARCHIVE_TITLE}
+      plain
+      ready={listing.status !== 'loading'}
+      scrollRef={setScrollEl}
+    >
+      <div className="table table-view">
+        <div
+          className={cx('table-grid', text.body.standard)}
+          style={{ '--cols': cols } as React.CSSProperties}
+        >
+          <div className="table-head">
+            <div className="col-header">
+              <span className="col-header-icon">
+                <PropertyTypeIcon type="title" size="body" />
+              </span>
+              Title
+            </div>
+            <DateHeading
+              date={browser.date}
+              className="archive-date"
+              sampleClass={text.body.standard}
+              label={
+                <span>
+                  <span className="col-header-icon">
+                    <PropertyTypeIcon type="dateTime" size="body" />
+                  </span>
+                  Archived
+                </span>
+              }
+            />
+          </div>
+          <div ref={setListEl} className="archive-rows" style={{ height }}>
+            {slots.map(({ index, start }) => {
+              const row = visible[index]
+              return (
+                <ArchiveRow
+                  key={row.bundlePath}
+                  row={row}
+                  start={start}
+                  lead={index === 0}
+                  checked={browser.checked.has(row.bundlePath)}
+                  revealed={browser.picked.length > 0}
+                  when={browser.date.when(row.storedAt)}
+                  icons={defaultIcons}
+                  api={api}
+                />
+              )
+            })}
+          </div>
+        </div>
+        {footing()}
+      </div>
+    </InterfaceScaffold>
+  )
+}
+
+const ArchiveRow = memo(function ArchiveRow({
+  row,
+  start,
+  lead,
+  checked,
+  revealed,
+  when,
+  icons,
+  api,
+}: {
+  row: BundleRow
+  start: number
+  lead: boolean
+  checked: boolean
+  revealed: boolean
+  when: string
+  icons: Personalization['defaultIcons']
+  api: RowApi
+}): React.JSX.Element {
+  return (
+    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click anywhere on a row checks it, as a Trash row does; the box in its gutter is the keyboard's door
+    <div
+      className={cx('data-row', lead && 'row-lead')}
+      data-reveal-host={revealed ? 'on' : ''}
+      style={{ height: ROW_H, transform: `translateY(${start}px)` }}
+      onClick={() => api.toggle(row)}
+      onContextMenu={(e) => {
+        e.preventDefault()
+        api.menu(row)
+      }}
+    >
+      <div className="data-cell cell-lead">
+        <span className={cx('row-check', revealTarget)}>
+          <Checkbox
+            size="compact"
+            state={checked}
+            onChange={() => api.toggle(row)}
+            ariaLabel={`Select ${row.title}`}
+          />
+        </span>
+        {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a page's title is the pointer's door to the reader; a Set's opens nothing and its click checks the row */}
+        <span
+          className={cx(overScrollLabel, 'cell-title')}
+          onClick={
+            row.kind === 'page'
+              ? (e) => {
+                  e.stopPropagation()
+                  api.open(row)
+                }
+              : undefined
+          }
+        >
+          <Icon name={entityIcon(archivedKind(row), row.icon, icons)} size="body" />
+          <span className="cell-title-text">{row.title}</span>
+        </span>
+        <NavTrail
+          segments={crumbSegments(row.crumbs, icons)}
+          iconSize="control"
+          className={cx(row.historical && historical)}
+        />
+      </div>
+      <div className="data-cell archive-date">{when}</div>
+    </div>
+  )
+})
```

##### Core/Archive/archive-view.css

```/Core/Archive/archive-view.css diff
@@ -0 +1 @@
+/* ArchiveView on TableView's sheet: the virtual list, each title over the trail it left, and the Archived column. */
+.archive-rows {
+  position: relative;
+}
+.archive-rows > .data-row {
+  position: absolute;
+  inset-inline: 0;
+}
+.archive-rows .data-cell {
+  display: flex;
+  flex-direction: column;
+  justify-content: center;
+  gap: 2px; /* KNOB — the title from its trail */
+}
+.col-header.archive-date,
+.data-cell.archive-date {
+  align-items: center;
+  text-align: center;
+}
+.archive-empty {
+  padding: var(--cell-padding-y) var(--cell-padding-x);
+  color: var(--label-tertiary);
+}
```

##### Core/Archive/archive.ts

```/Core/Archive/archive.ts diff
@@ -0 +1 @@
+// The Archive's own ops: a page or Set leaves its Collection for the Collection's Archive, where every cascade still reaches it, and comes back by a plain move to its exact place, with nothing to reconcile.
+
+import { dirname, join, relative } from '../Paths/posix'
+import { archiveStoreOf } from '../Paths/names'
+import { fail, ok } from '../Contract/result'
+import { pathExists, relocate, removeOwn } from '../Files/atomicWrite'
+import { listMarkdownFiles } from '../Files/walk'
+import { archiveDirRel } from '../Paths/nexusPaths'
+import { machine } from '../Platform/machine'
+import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
+import { owningCollection } from '../Nexus/treePatch'
+import { dropDeparture } from '../Nexus/reorder'
+import { archivedSetIds } from '../Nexus/configReach'
+import { nexusPages } from '../Nexus/heldPages'
+import { returningCascade } from '../Nexus/settle'
+import { withUnswept } from '../Nexus/cascade'
+import { liftSetAside } from '../Nexus/folderEntity'
+import type { MutateContext } from '../Nexus/mutate'
+import type { MutateReply, MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
+import {
+  contentPages,
+  fileInto,
+  originPagesOf,
+  originPathOf,
+  type OpenBundle,
+} from '../Bundles/bundle'
+import { gatherContentRecord } from '../Bundles/record'
+import { placeRecord } from '../Bundles/placement'
+import { refileLanded } from './refile'
+
+/** Link values and saved views naming what leaves stay where they are and resolve again on its restore, so nothing is stripped and no configuration pass runs. */
+export async function archiveOp(
+  { root }: MutateContext,
+  req: Extract<MutateRequest, { op: 'archive' }>,
+): Promise<MutateReply> {
+  const resolved = await mutableTarget(root, req.path, [req.kind])
+  if (!resolved.ok) return resolved
+  const abs = resolved.value
+  const tree = await liveTreeOf(root)
+  const store = archiveStoreOf(owningCollection(tree, req.path)?.id)
+  if (!store)
+    return fail('invalid-path', 'Only pages and Sets inside a Collection can be archived.')
+  const record = await gatherContentRecord(root, tree, req.kind, abs)
+  const lifted = req.kind === 'set' ? await liftSetAside(root, abs) : null
+  if (lifted && !lifted.ok) return lifted
+  const bundle = await fileInto(root, store, abs, abs, record, req.leaf).catch(async (e) => {
+    await lifted?.value.undo()
+    throw e
+  })
+  await dropDeparture(root, tree, req.kind, req.path)
+  return ok({ bundled: { bundlePath: relative(root, bundle) } })
+}
+
+/** An archived page or Set returns by a plain move to the place it left, or to `destination`, with nothing reconciled or refilled, since every cascade kept it current; its own links keep naming its own pages, and path links naming where it lived follow it. */
+export async function restoreArchived(
+  root: string,
+  bundle: OpenBundle,
+  destination?: RestoreDestination,
+): Promise<MutateReply> {
+  const { store, record: held, artifact } = bundle
+  if (store.kind !== 'archive' || (held.entity !== 'page' && held.entity !== 'set') || !artifact)
+    return NOT_HELD
+  const tree = await liveTreeOf(root)
+  const { byId } = await nexusPages(root, tree)
+  const placed = await placeRecord(
+    root,
+    held,
+    destination,
+    { abs: bundle.abs, artifact },
+    tree,
+    byId,
+  )
+  if (!placed.ok) return placed
+  const { record, placement, writeOrder, landedAs } = placed.value
+  const { dir, finalName, finalTitle } = placement
+  const targetAbs = join(root, dir, finalName)
+  const back = await originPagesOf(root, store, await contentPages(record.entity, artifact))
+  await machine().mkdir(dirname(targetAbs))
+  await relocate(artifact, targetAbs)
+  await writeOrder?.()
+  await removeOwn(bundle.abs)
+  const title = finalTitle ?? finalName
+  const arrived = await returningCascade(root, tree, back, title, {
+    entity: record.entity,
+    abs: targetAbs,
+  })
+  const cascade = withUnswept(arrived.cascade, title, arrived.unswept)
+  await refileLanded(root, record, store.id, dir)
+  return ok({
+    ...(cascade ? { cascade } : {}),
+    ...(landedAs ? { landedAs } : {}),
+  })
+}
+
+/** A Collection's Archive, its pages at the paths they lived, and its Sets, which leave with the Collection once it leaves for good; null when it has none. */
+export async function collectionArchive(
+  root: string,
+  id: string | undefined,
+): Promise<{ abs: string; files: string[]; origins: string[]; sets: string[] } | null> {
+  const store = archiveStoreOf(id)
+  if (!store) return null
+  const abs = join(root, archiveDirRel(store.id))
+  if (!(await pathExists(abs))) return null
+  const files = await listMarkdownFiles(abs)
+  return {
+    abs,
+    files,
+    origins: files.map((f) => originPathOf(root, store, f)),
+    sets: await archivedSetIds(root, abs),
+  }
+}
```

##### Core/Archive/archivePlace.ts

```/Core/Archive/archivePlace.ts diff
@@ -0 +1 @@
+import type { IconName } from '@pommora/uix/Symbols'
+
+export const ARCHIVE_TITLE = 'Archive'
+export const ARCHIVE_ICON: IconName = 'archive'
```

##### Core/Archive/refile.ts

```/Core/Archive/refile.ts diff
@@ -0 +1 @@
+// Every archived record stays filed in the Archive of the Collection its origin sits in now, its trail current. One carry, `refileArchived`, serves each landing that moves a Set: the settle's comparison of trees and a restore.
+// The open pass, `settleArchives`, re-files each record a Set moved while Pommora was closed left misfiled, and moves an Archive whose Collection exists nowhere into the Trash, recoverable.
+
+import { basename, join } from '../Paths/posix'
+import { isPlainObject } from '../Contract/validators'
+import { errText } from '../Contract/result'
+import { isContainerKind } from '../Nexus/entities'
+import { archiveStoreOf } from '../Paths/names'
+import { removeOwn } from '../Files/atomicWrite'
+import { sameItems } from '@pommora/uix/Utilities/same'
+import { liveTreeOf } from '../Nexus/liveTree'
+import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
+import type { Delta } from '../Nexus/treeDelta'
+import { containerTrailById, owningCollection } from '../Nexus/treePatch'
+import {
+  archiveOwned,
+  archivedWithin,
+  collectionsElsewhere,
+  listBundles,
+  moveIntoStore,
+} from '../Bundles/bundle'
+import { collectionOf, originOf, patchRecord, type RecordFile, trailAbove } from '../Bundles/record'
+import { ARCHIVE_DIR_REL, archiveDirRel } from '../Paths/nexusPaths'
+import { listEntries, listFilesRecursive } from '../Files/walk'
+
+/** Writes `trail` onto an archived record, moving its bundle into `to`'s Archive when its origin now sits in another Collection; the bundle keeps its name, since its stamp is the archived time. */
+async function refile(
+  root: string,
+  bundlePath: string,
+  stored: string[],
+  trail: string[],
+  from: string,
+  to: string,
+): Promise<void> {
+  const into = archiveStoreOf(to)
+  if (!into) return
+  const bundle = join(root, bundlePath)
+  if (from !== to) await moveIntoStore(root, bundle, into, { trail }, basename(bundle))
+  else if (!sameItems(stored, trail)) await patchRecord(bundle, () => ({ trail }))
+}
+
+/** Each record archived from within the Set `setId` takes the trail the Set gives it now, and `to`'s Archive when the Set now sits in another Collection. An origin the tree holds is placed by its current trail, and one it no longer holds by the ids its record stored. */
+async function refileArchived(
+  root: string,
+  setId: string,
+  from: string,
+  to: string,
+  tree: NexusTree,
+): Promise<void> {
+  const above = trailAbove(tree, setId)
+  if (!above) return
+  for (const { bundlePath, origin, held } of await archivedWithin(root, setId, from, tree)) {
+    const below = origin.trail.slice(origin.trail.indexOf(setId) + 1)
+    await refile(root, bundlePath, origin.trail, held ?? [...above, setId, ...below], from, to)
+  }
+}
+
+/** A carry never fails the landing it follows: a record it leaves misfiled is re-filed by the next open's pass. */
+async function carried(carry: () => Promise<void>): Promise<void> {
+  try {
+    await carry()
+  } catch (e) {
+    console.error('archive: the carry failed:', errText(e))
+  }
+}
+
+/** The restores' trigger: a Set landed in `dir` carries what was archived from within it out of `from`, the Archive of the Collection it left. */
+export const refileLanded = (
+  root: string,
+  record: RecordFile,
+  from: string | null,
+  dir: string,
+): Promise<void> =>
+  carried(async () => {
+    if (record.entity !== 'set' || record.parent.kind !== 'container' || !record.id || !from) return
+    const tree = await liveTreeOf(root)
+    const to = owningCollection(tree, dir)?.id
+    if (to) await refileArchived(root, record.id, from, to, tree)
+  })
+
+const isContainerNode = (v: unknown): v is CollectionNode | SetNode =>
+  isPlainObject(v) && isContainerKind(v.kind)
+
+/** The comparison's trigger: a Set the difference sets in place, which `prev` held under another parent, moved, and carries what was archived from within it; a container `prev` never held arrived, or held at another path was renamed or moved, and its own Sets are read the same way. A Collection is left alone, since what it holds moves inside it and trails name ids. */
+export async function refileMoved(
+  root: string,
+  prev: NexusTree,
+  next: NexusTree,
+  delta: Delta,
+): Promise<void> {
+  const landed = async (node: CollectionNode | SetNode): Promise<void> => {
+    const was = containerTrailById(prev, node.id)
+    if (was?.at(-1)?.path !== node.path) for (const set of node.sets ?? []) await landed(set)
+    if (!was || node.kind !== 'set') return
+    if (was.at(-2)?.id === containerTrailById(next, node.id)?.at(-2)?.id) return
+    const from = owningCollection(prev, was[was.length - 1])
+    const to = owningCollection(next, node)
+    if (from && to) await refileArchived(root, node.id, from.id, to.id, next)
+  }
+  const walk = async (d: Delta): Promise<void> => {
+    if ('set' in d) for (const v of [d.set].flat()) if (isContainerNode(v)) await landed(v)
+    if ('at' in d) for (const sub of Object.values(d.at)) await walk(sub)
+  }
+  await carried(() => walk(delta))
+}
+
+/** The open pass, once per open before the index seed: an Archive filed under a live Collection re-files each record whose origin the tree holds, which a Set moved while Pommora was closed leaves misfiled; one whose id names no Collection the tree holds, none in a root folder it doesn't hold, and none in the Trash is orphaned, and its bundles move into `.trash` with their records whole. A root folder whose sidecar reads unreadable could be any Collection, so while one does, that open takes no Archive for orphaned. */
+export async function settleArchives(root: string, tree: NexusTree): Promise<void> {
+  let elsewhere: Promise<Set<string>> | undefined
+  for (const { name: id, kind } of await listEntries(join(root, ARCHIVE_DIR_REL))) {
+    if (kind !== 'dir') continue
+    if (tree.collections.some((c) => c.id === id)) {
+      for (const { bundlePath, record } of await listBundles(root, { kind: 'archive', id })) {
+        const origin = originOf(record)
+        const trail = origin && trailAbove(tree, origin.parent)
+        if (origin && trail)
+          await refile(
+            root,
+            bundlePath,
+            origin.trail,
+            trail,
+            id,
+            collectionOf({ parent: origin.parent, trail }),
+          )
+      }
+      continue
+    }
+    if (await archiveOwned(tree, id, () => (elsewhere ??= collectionsElsewhere(root, tree))))
+      continue
+    for (const { bundlePath } of await listBundles(root, { kind: 'archive', id }))
+      await moveIntoStore(root, join(root, bundlePath), { kind: 'trash' }, {})
+    // A bundle that won't parse stays as evidence; the folder goes once nothing is left beneath it.
+    const archive = join(root, archiveDirRel(id))
+    if (!(await listFilesRecursive(archive)).length) {
+      await removeOwn(archive)
+    }
+  }
+}
```

##### Core/Assets/assetMigrate.ts

```/Core/Assets/assetMigrate.ts diff
@@ -2 +2 @@
 
 import { expressibleInLink } from '../Connections/connections'
 import { wikiTitle } from '../Connections/linkValue'
-import { ASSETS_DIR_REL, NEXUS_CONFIG_FILES, SIDECARS } from '../Paths/nexusPaths'
+import { ASSETS_DIR_REL, NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
 import { basename, titleFromPath, dirname, extname, join, relative } from '../Paths/posix'
 import { assetsDir, nexusConfig } from '../Paths/paths'
 import { machine } from '../Platform/machine'
@@ -15 +15 @@ import {
   readTextOrNull,
   updateNexusConfig,
 } from '../Files/atomicWrite'
-import { corpusFiles, listEntries, listFilesRecursive, listPathsUnder } from '../Files/walk'
-import { outsideContent, reachingExcluded, type WatchScope } from '../Paths/exclusion'
-import { discardFile } from '../Trash/bundle'
+import { corpusFiles, listEntries, listFilesRecursive, sidecarsUnder } from '../Files/walk'
+import { reachingExcluded } from '../Paths/exclusion'
+import { discardFile, type TrashDeps } from '../Trash/discard'
 import { readNavigationFile, writeNavigationState } from '../Navigation/navigationFile'
-import { readWatchScope, updateCrops, updateSettings } from '../Settings/settings'
+import { readWatchScope, rekeyCrops, updateSettings } from '../Settings/settings'
 import {
   AMBIGUOUS,
   buildAssetMap,
@@ -29 +29 @@ import {
 } from './assetMap'
 import { assetFilePath } from './assetRoots'
 import { writeAssetFile } from './assetWrite'
-import type { TrashDeps } from '../Trash/bundle'
 import { spaceSidecars } from '../Contexts/spaceSidecar'
 
 interface AssetMigration {
@@ -115 +114 @@ async function collectRefs(root: string, skipped: AssetMigration['skipped']): Pr
   })
   // Links inside excluded folders move with the rest, or the sweep would trash files they still name.
   const scope = reachingExcluded(await readWatchScope(root))
-  for (const file of await sidecarsUnder(root, scope)) {
+  const sidecars = [...(await sidecarsUnder(root, scope)), ...(await spaceSidecars(root))]
+  for (const file of sidecars.sort()) {
     const fields = await readJsonObject(file)
     if (!fields) {
       skipped.push({ store: relative(root, file), why: 'it could not be read' })
@@ -155 +155 @@ async function collectRefs(root: string, skipped: AssetMigration['skipped']): Pr
   return refs
 }
 
-/** The containers `scope` admits, and every Space sidecar, which the content walk never enters. */
-async function sidecarsUnder(root: string, scope: WatchScope): Promise<string[]> {
-  const containers = await listPathsUnder(root, root, (rel, kind) =>
-    kind === 'dir' ? !outsideContent(rel, scope) : SIDECARS.has(basename(rel)),
-  )
-  const spaces = await spaceSidecars(root)
-  return [...containers.map((rel) => join(root, rel)), ...spaces].sort()
-}
-
 export async function migrateAssets(root: string, deps: TrashDeps): Promise<AssetMigration | null> {
   const { assetDir } = await readWatchScope(root)
   if (assetDir === ASSETS_DIR_REL) return null
@@ -217 +208 @@ export async function migrateAssets(root: string, deps: TrashDeps): Promise<Asse
 
   await refreshAssetMap(root)
 
-  const rekeys: [string, string][] = []
+  const rekeys = new Map<string, string>()
   for (const { from, to } of result.moved) {
     const toRel = await assetFilePath(root, to)
-    if (toRel) rekeys.push([from, toRel])
-  }
-  if (rekeys.length) {
-    // Best-effort: a corrupt crops.json must not block the change once references moved.
-    await updateCrops(root, (b) => {
-      const next = { ...b }
-      for (const [fromRel, toRel] of rekeys) {
-        if (next[fromRel] === undefined) continue
-        next[toRel] = next[fromRel]
-        delete next[fromRel]
-      }
-      return next
-    }).catch(() => {})
+    if (toRel) rekeys.set(from, toRel)
   }
+  if (rekeys.size) await rekeyCrops(root, (key) => rekeys.get(key))
   // Last, so a discard the system trash refuses leaves the move itself whole.
   if (!result.skipped.length) result.trashed = await sweepLegacyRoot(root, deps)
   return result
```

##### Core/Assets/handlers.ts

```/Core/Assets/handlers.ts diff
@@ -14 +14 @@ import { validateAssetDir } from '../Settings/assetDirValidate'
 import { readWatchScope, writeAssetDirectory } from '../Settings/settings'
 import { liveAssetMap } from './assetMap'
 import { migrateAssets } from './assetMigrate'
-import { trashDeps } from '../Trash/bundle'
+import { trashDeps } from '../Trash/discard'
 
 export const assetsHandlers = {
   'assets:map': withRoot(async (root) => ok(await liveAssetMap(root)), ok(EMPTY_ASSET_MAP)),
```

##### Core/Bundles/DateHeading.tsx

```/Core/Bundles/DateHeading.tsx diff
@@ -0 +1 @@
+import type { ReactNode } from 'react'
+import { cx } from '@pommora/uix/Utilities/cx'
+import type { useBundleBrowser } from './browser'
+
+/** A store's date heading: `label` over the column's widest date in the rows' type, drawn unseen, so the column measures whichever is wider; a right-click picks the date's style. */
+export function DateHeading({
+  date,
+  label,
+  className,
+  sampleClass,
+}: {
+  date: ReturnType<typeof useBundleBrowser>['date']
+  label: ReactNode
+  className: string
+  sampleClass: string
+}): React.JSX.Element {
+  return (
+    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a column label, as TableView's headings are
+    <div className={cx('col-header', className)} onContextMenu={date.onContextMenu}>
+      <span ref={date.measureRef} className="col-measure">
+        {label}
+        <span className={sampleClass} aria-hidden>
+          {date.sample}
+        </span>
+      </span>
+    </div>
+  )
+}
```

##### Core/Bundles/browser.ts

```/Core/Bundles/browser.ts diff
@@ -0 +1 @@
+// The renderer's half of the bundle owner: what a store's browser does with the rows `rows.ts` builds host-side.
+import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
+import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
+import { actedOn, checkedIn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
+import { entityIcon } from '../Assets/entityIconPolicy'
+import {
+  askEmptyTrash,
+  askTrashing,
+  confirmDelete,
+  countPhrase,
+  offerUndo,
+  spendUndo,
+} from '../Interface/Confirm/confirmations'
+import {
+  notifyOutcome,
+  notifyReport,
+  unrestoredLine,
+} from '../Interface/Notifications/notifications'
+import type { RestoreDestination } from '../Nexus/mutateRequest'
+import { nodesByIdOf } from '../Nexus/treeIndex'
+import { matches, matchQuery } from '../Paths/caseFold'
+import { basename } from '../Paths/posix'
+import { formatDate } from '../Properties/formatValue'
+import {
+  type DateStyle,
+  dateDefaults,
+  holdsStyle,
+  resolveStyle,
+  storedPick,
+} from '../Properties/columnStyles'
+import { parseStyleAction, styleMenuItems } from '../Actions/columnMenu'
+import { containerTargets, contextTargets } from '../Actions/destinationTree'
+import { popMenu } from '../Actions/menuActions'
+import { destinationRows } from '../Actions/pageMenu'
+import { restoreMenuItems } from '../Actions/restoreMenu'
+import { useNexusForms } from '../Views/Host/useColumnStyles'
+import { useSession } from '../Session/store'
+import { personalizationOf } from '../Session/configSlice'
+import { storesChanged } from '../Session/nexusSlice'
+import { dialer } from '../Platform/dialer'
+import type { Personalization } from '../Settings/personalization'
+import type { BundleStore } from './bundle'
+import type { BundleCrumb, BundleRow } from './rows'
+
+const steppedTo = (title: string, landedAs: string): string => `“${title}” as “${landedAs}”`
+
+/** Typed search narrows in place, keeping the store's order, as a view's search does (`searchGroups`). */
+export function filterRows(rows: BundleRow[], query: string): BundleRow[] {
+  const q = matchQuery(query)
+  return q ? rows.filter((row) => matches(row.match, q)) : rows
+}
+
+/** A row's origin trail as both browsers draw it, each live crumb wearing its kind's glyph. */
+export const crumbSegments = (
+  crumbs: BundleCrumb[],
+  icons: Personalization['defaultIcons'],
+): TrailSegment[] =>
+  crumbs.map((crumb) => ({
+    title: crumb.title,
+    icon: crumb.kind && entityIcon(crumb.kind, undefined, icons),
+  }))
+
+/** What the Archive stores: a page or a Set. */
+export const archivedKind = (row: BundleRow): 'page' | 'set' =>
+  row.kind === 'set' ? 'set' : 'page'
+
+const ARCHIVE_UNDO: RestoreDestination = { kind: 'archive' }
+
+type BatchOp = 'restore' | 'emptyBundle' | 'delete'
+
+/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, under the bundle name it left, so it keeps its Archived date; one renamed or stepped aside since takes a fresh stamp, since that name no longer fits it. */
+const rearchive = (rows: BundleRow[]) => async (): Promise<void> => {
+  for (const row of rows) {
+    const { tree, mutate } = useSession.getState()
+    const id = row.stored?.id
+    if (!id || !tree) continue
+    const path = nodesByIdOf(tree).get(id)?.path
+    if (path)
+      await mutate({ op: 'archive', path, kind: archivedKind(row), leaf: basename(row.bundlePath) })
+  }
+}
+
+type DateKey = 'trashColumnStyle' | 'archiveColumnStyle'
+
+const WIDEST_AT = new Date(2026, 8, 30, 12, 0)
+const DAY_MS = 86_400_000
+
+/** The widest a style writes: September, a Wednesday, the 30th, and a two-digit hour, each where the style shows it; a relative style's widest is a week ago with its clock, else a year's last month. */
+export function widestDate(style: DateStyle): string {
+  const now = new Date(WIDEST_AT.getTime() + (style.time_format === 'none' ? 350 : 7) * DAY_MS)
+  return formatDate(
+    WIDEST_AT.toISOString(),
+    style.date_format,
+    style.time_format,
+    style.weekday,
+    now,
+  )
+}
+
+/** A store's date column: its stored style over the Nexus's date form, the heading's right-click, which picks one, and its width: the wider of the heading and its widest date, the hidden `sample`, as the host the view draws under `measureRef` measures them. */
+function useDateColumn(key: DateKey): {
+  when: (storedAt: number | null) => string
+  onContextMenu: (e: React.MouseEvent) => Promise<void>
+  sample: string
+  measureRef: (el: HTMLElement | null) => void
+  width: number | null
+} {
+  const nexus = useNexusForms()
+  const stored = useSession((s) => personalizationOf(s)[key])
+  const setPersonalization = useSession((s) => s.setPersonalization)
+  // A store shows when each item entered it, where a view's date column leaves the time hidden.
+  const defaults = { ...dateDefaults(nexus.dateFormat), time_format: nexus.clock }
+  const style = resolveStyle(stored, defaults, nexus.clock)
+  const sample = widestDate(style)
+  const [measured, measureRef] = useState<HTMLElement | null>(null)
+  const [width, setWidth] = useState<number | null>(null)
+  useLayoutEffect(() => {
+    // A whole pixel over, since `offsetWidth` rounds and a cell's ellipsis engages on a fraction.
+    if (measured) setWidth(measured.offsetWidth + 1)
+  }, [measured, sample])
+  return {
+    when: (storedAt) =>
+      storedAt === null
+        ? ''
+        : formatDate(
+            new Date(storedAt).toISOString(),
+            style.date_format,
+            style.time_format,
+            style.weekday,
+          ),
+    onContextMenu: async (e) => {
+      e.preventDefault()
+      const action = await popMenu(styleMenuItems({ type: 'dateTime', current: style }))
+      const pick = action ? parseStyleAction(action) : null
+      if (!pick) return
+      const next = {
+        ...stored,
+        [pick.key]: storedPick(pick.key, pick.value, defaults, nexus.clock),
+      }
+      setPersonalization(key, holdsStyle(next) ? next : undefined)
+    },
+    sample,
+    measureRef,
+    width,
+  }
+}
+
+/** What the Trash and the Archive do differently under one browser: the date column's setting, what a delete sends and how it asks, for one row and for a batch, and what a restore's and a delete's Undo do. */
+function rulesOf(kind: BundleStore['kind']): {
+  dateKey: DateKey
+  deleteOp: 'emptyBundle' | 'delete'
+  askBatch: (targets: BundleRow[]) => Promise<boolean>
+  deleteOne: (row: BundleRow) => Promise<boolean>
+  restoreUndo?: (rows: BundleRow[]) => () => Promise<void>
+  deleteUndo?: RestoreDestination
+} {
+  switch (kind) {
+    case 'trash':
+      return {
+        dateKey: 'trashColumnStyle',
+        deleteOp: 'emptyBundle',
+        askBatch: askEmptyTrash,
+        deleteOne: async (row) =>
+          (await askEmptyTrash([row])) &&
+          (await useSession
+            .getState()
+            .mutate({ op: 'emptyBundle', bundlePath: row.bundlePath })) !== null,
+      }
+    case 'archive':
+      return {
+        dateKey: 'archiveColumnStyle',
+        deleteOp: 'delete',
+        askBatch: askTrashing,
+        deleteOne: (row) =>
+          confirmDelete({
+            path: row.bundlePath,
+            kind: archivedKind(row),
+            title: row.title,
+            undoTo: ARCHIVE_UNDO,
+          }),
+        restoreUndo: rearchive,
+        deleteUndo: ARCHIVE_UNDO,
+      }
+  }
+}
+
+type Listing = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; rows: BundleRow[] }
+
+/** A store's browser, narrowed `within` a top-level Set when given: its rows, listed again on each change while shown and on each showing; the checked set, and the checked rows in view; Restore and Delete, run by the right-click menu over a row or the checked rows in view and by the bar over the checked rows; and its date column. */
+export function useBundleBrowser(
+  store: BundleStore,
+  { query, shown, within }: { query: string; shown: boolean; within?: string },
+): {
+  listing: Listing
+  visible: BundleRow[]
+  checked: ReadonlySet<string>
+  picked: BundleRow[]
+  toggle: (bundlePath: string) => void
+  openMenu: (row: BundleRow) => Promise<void>
+  date: ReturnType<typeof useDateColumn>
+  restore: (targets: BundleRow[]) => Promise<void>
+  remove: (targets: BundleRow[]) => Promise<void>
+} {
+  const rules = rulesOf(store.kind)
+  const date = useDateColumn(rules.dateKey)
+  const nexusId = useSession((s) => s.tree?.nexus.id)
+  const mutate = useSession((s) => s.mutate)
+  const [listing, setListing] = useState<Listing>({ status: 'loading' })
+  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
+
+  // Keyed on the store's fields rather than the object, so a caller may pass a fresh literal; only the latest ask's reply lands, since replies can arrive out of order.
+  const asks = useRef(0)
+  const refresh = useCallback(async (): Promise<void> => {
+    const ask = ++asks.current
+    const res = await dialer().ask('bundles:list', store, within)
+    if (ask !== asks.current) return
+    if (!res.ok) {
+      setListing({ status: 'failed' })
+      return
+    }
+    setListing({ status: 'ready', rows: res.value })
+    const live = new Set(res.value.map((r) => r.bundlePath))
+    setChecked((prev) => retained(prev, live))
+  }, [store.kind, store.kind === 'archive' ? store.id : null, within])
+
+  // A parked browser stays mounted, so it lists again on its next showing rather than on every change behind another tab.
+  useEffect(() => {
+    if (!shown) return
+    void refresh()
+    return storesChanged.subscribe(() => void refresh())
+  }, [refresh, shown])
+
+  const visible = useMemo(
+    () => (listing.status === 'ready' ? filterRows(listing.rows, query) : []),
+    [listing, query],
+  )
+  const picked = useMemo(() => checkedIn(checked, visible, (r) => r.bundlePath), [checked, visible])
+  const toggle = (bundlePath: string): void => setChecked((prev) => toggled(prev, bundlePath))
+
+  // One action in flight: a press before it settles is dropped, rather than acting on a row the first already moved.
+  const busy = useRef(false)
+  const flight = async (act: () => Promise<void>): Promise<void> => {
+    if (busy.current) return
+    busy.current = true
+    try {
+      await act()
+    } finally {
+      busy.current = false
+    }
+  }
+
+  const placesFor = (row: BundleRow) => {
+    const { tree } = useSession.getState()
+    return row.kind === 'space'
+      ? { kind: 'context' as const, targets: contextTargets(tree) }
+      : { kind: 'container' as const, targets: containerTargets(tree) }
+  }
+
+  /** A row whose place is gone asks where to go first, unless the menu's submenu already chose. */
+  const restoreOne = async (row: BundleRow, destination?: RestoreDestination): Promise<void> => {
+    let to = destination
+    if (!to && !row.homeResolves) {
+      const places = placesFor(row)
+      const id = await popMenu(destinationRows(places.targets, (t) => t.id))
+      if (!id) return
+      to = { kind: places.kind, id }
+    }
+    const done = await mutate({
+      op: 'restore',
+      bundlePath: row.bundlePath,
+      ...(to ? { destination: to } : {}),
+    })
+    if (!done) return
+    spendUndo(row.bundlePath)
+    // A restore the store can undo always reports, since its notice carries the Undo; the Trash's reports a step aside alone.
+    if (done.landedAs || rules.restoreUndo)
+      notifyOutcome(
+        `Restored ${done.landedAs ? steppedTo(row.title, done.landedAs) : `“${row.title}”`}`,
+        undefined,
+        [done.unrestored !== undefined && unrestoredLine(done.unrestored), done.cascade?.warning],
+        rules.restoreUndo?.([row]),
+      )
+  }
+
+  /** Answers null when a Nexus switch stopped it, as the slice's `mutate` drops a held op: the paths left belong to the Nexus it left, so the batch reports nothing. */
+  const many = async (
+    targets: BundleRow[],
+    op: BatchOp,
+  ): Promise<{
+    done: BundleRow[]
+    refused: BundleRow[]
+    unrestored: string[]
+    warnings: string[]
+    renamed: string[]
+    bundled: string[]
+  } | null> => {
+    const done: BundleRow[] = []
+    const refused: BundleRow[] = []
+    const unrestored: string[] = []
+    const warnings = new Set<string>()
+    const renamed: string[] = []
+    const bundled: string[] = []
+    const switched = (): boolean => useSession.getState().tree?.nexus.id !== nexusId
+    for (const row of targets) {
+      if (switched()) break
+      const res = await mutate(
+        op === 'delete'
+          ? { op, path: row.bundlePath, kind: archivedKind(row) }
+          : { op, bundlePath: row.bundlePath },
+        { quiet: true },
+      )
+      ;(res ? done : refused).push(row)
+      if (!res) continue
+      spendUndo(row.bundlePath)
+      unrestored.push(...(res.unrestored ?? []))
+      if (res.cascade?.warning) warnings.add(res.cascade.warning)
+      if (res.landedAs) renamed.push(steppedTo(row.title, res.landedAs))
+      if (res.bundled) bundled.push(res.bundled.bundlePath)
+    }
+    storesChanged.emit()
+    return switched()
+      ? null
+      : { done, refused, unrestored, warnings: [...warnings], renamed, bundled }
+  }
+
+  const restoreBatch = async (targets: BundleRow[]): Promise<void> => {
+    const addressable = targets.filter((r) => r.homeResolves)
+    const homeless = targets.filter((r) => !r.homeResolves)
+    const nowhere = `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`
+    if (addressable.length === 0) return notifyReport(nowhere, true)
+    const ran = await many(addressable, 'restore')
+    if (!ran) return
+    const { done, refused, unrestored, warnings, renamed } = ran
+    notifyOutcome(
+      `Restored ${countPhrase(done)}`,
+      renamed.length > 1 ? `${renamed.length} Renamed` : renamed[0],
+      [
+        homeless.length > 0 && nowhere,
+        refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
+        unrestored.length > 0 && unrestoredLine(unrestored),
+        ...warnings,
+      ],
+      done.length > 0 ? rules.restoreUndo?.(done) : undefined,
+    )
+  }
+
+  const deleteBatch = async (targets: BundleRow[]): Promise<void> => {
+    if (!(await rules.askBatch(targets))) return
+    const ran = await many(targets, rules.deleteOp)
+    if (!ran) return
+    const { done, refused, warnings, bundled } = ran
+    // An empty mints no bundle, so only a batch the Archive moved into the Trash offers its Undo.
+    offerUndo(
+      bundled,
+      (undo) =>
+        notifyOutcome(
+          `Deleted ${countPhrase(done)}`,
+          undefined,
+          [refused.length > 0 && `${countPhrase(refused)} couldn’t be deleted.`, ...warnings],
+          undo,
+        ),
+      rules.deleteUndo,
+    )
+  }
+
+  // A re-list can drop the checked rows a frame before the bar withdraws, so a press may name none.
+  const restore = (targets: BundleRow[]): Promise<void> =>
+    flight(async () => {
+      if (targets.length > 1) return restoreBatch(targets)
+      if (targets.length) return restoreOne(targets[0])
+    })
+
+  const remove = (targets: BundleRow[]): Promise<void> =>
+    flight(async () => {
+      if (targets.length > 1) return deleteBatch(targets)
+      if (targets.length && (await rules.deleteOne(targets[0]))) spendUndo(targets[0].bundlePath)
+    })
+
+  const openMenu = async (row: BundleRow): Promise<void> => {
+    const targets = actedOn(checked, visible, row, (r) => r.bundlePath)
+    const batch = targets.length > 1
+    const places = !batch && !row.homeResolves ? placesFor(row) : null
+    const action = await popMenu(
+      restoreMenuItems({ batch, ...(places ? { destinations: places.targets } : {}) }),
+    )
+    if (!action) return
+    if (action.startsWith('restoreTo:') && places) {
+      const id = action.slice('restoreTo:'.length)
+      return flight(() => restoreOne(row, { kind: places.kind, id }))
+    }
+    switch (action) {
+      case 'restore':
+        return restore(targets)
+      case 'delete':
+        return remove(targets)
+    }
+  }
+
+  return { listing, visible, checked, picked, toggle, openMenu, date, restore, remove }
+}
```

##### Core/Bundles/bundle.ts

```/Core/Bundles/bundle.ts diff
@@ -0 +1 @@
+import { basename, dirname, join, relative } from '../Paths/posix'
+import { escapes } from '../Paths/pathSafety'
+import { hiddenName } from '../Paths/exclusion'
+import { archiveStoreOf, holdsName } from '../Paths/names'
+import {
+  type ArchiveStore,
+  archiveDirRel,
+  archivedCollectionIdOf,
+  NEXUS_DIR,
+  TRASH_DIR,
+} from '../Paths/nexusPaths'
+import { machine } from '../Platform/machine'
+import { fault, ok, type Result } from '../Contract/result'
+import { type ConnPage, connPage } from '../Connections/pageIndex'
+import { stampedIdOf } from '../Files/pageFile'
+import { sidecarId } from '../Files/sidecar'
+import { listEntries, listMarkdownFiles } from '../Files/walk'
+import { relocate, removeOwn } from '../Files/atomicWrite'
+import type { NexusTree } from '../Nexus/tree'
+import {
+  originOf,
+  originWithin,
+  type RawRecord,
+  type RecordFile,
+  readRawRecord,
+  readRecord,
+  trailAbove,
+  writeRecord,
+} from './record'
+
+export type BundleStore = { kind: 'trash' } | ArchiveStore
+
+export function layoutOf(store: BundleStore): { dir: string; suffix: string } {
+  switch (store.kind) {
+    case 'trash':
+      return { dir: TRASH_DIR, suffix: '.deleted' }
+    case 'archive':
+      return { dir: archiveDirRel(store.id), suffix: '.archived' }
+  }
+}
+
+export function storeOf(root: string, bundleAbs: string): BundleStore | null {
+  const rel = relative(root, bundleAbs)
+  const id = archivedCollectionIdOf(rel)
+  const store: BundleStore = id === null ? { kind: 'trash' } : { kind: 'archive', id }
+  const { dir, suffix } = layoutOf(store)
+  return rel.startsWith(`${dir}/`) && rel.endsWith(suffix) ? store : null
+}
+
+export const fileStamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')
+
+const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/
+
+export function storedAtOf(bundlePath: string): number | null {
+  const m = STAMP.exec(basename(bundlePath).split('__')[0] ?? '')
+  if (!m) return null
+  const t = Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`)
+  return Number.isNaN(t) ? null : t
+}
+
+export const stampedLeaf = (stamp: string, n: number, base: string): string =>
+  n === 0 ? `${stamp}__${base}` : `${stamp}__${n}__${base}`
+
+/** A store reads as a shadow of the nexus, so a stored item shows where it lived. A path that isn't under the root has no chain to mirror, and following its `..` would write outside the store entirely — it lands flat instead. */
+export async function chainDir(
+  root: string,
+  store: BundleStore,
+  absSource: string,
+): Promise<string> {
+  const rel = relative(root, absSource)
+  const chain = rel && !escapes(rel) ? dirname(rel) : '.'
+  const dir = join(root, layoutOf(store).dir, chain)
+  await machine().mkdir(dir)
+  return dir
+}
+
+/** `leaf` asks for one bundle name back, tried only when the source could have been minted under it: one name, stamped, ending in the source's own; a fresh stamp answers anything else, and a leaf something holds. */
+export async function mintBundle(
+  root: string,
+  store: BundleStore,
+  absSource: string,
+  leaf?: string,
+): Promise<string> {
+  const dir = await chainDir(root, store, absSource)
+  const base = `${basename(absSource)}${layoutOf(store).suffix}`
+  const own =
+    leaf !== undefined && holdsName(leaf) && storedAtOf(leaf) !== null && leaf.endsWith(`__${base}`)
+  if (own && (await machine().mkdir(join(dir, leaf))) === 'created') return join(dir, leaf)
+  const stamp = fileStamp()
+  for (let n = 0; ; n++) {
+    const bundle = join(dir, stampedLeaf(stamp, n, base))
+    if ((await machine().mkdir(bundle)) === 'created') return bundle
+  }
+}
+
+/** Where a stored file lived: its path under the store's root with the bundle's own folder taken out. The bundle is the folder wearing its mint's stamp, so a chain or artifact folder that only wears the suffix stays in the path. */
+export function originPathOf(root: string, store: BundleStore, file: string): string {
+  const { dir, suffix } = layoutOf(store)
+  const segs = relative(join(root, dir), file).split('/')
+  const bundle = segs.findIndex((seg) => seg.endsWith(suffix) && storedAtOf(seg) !== null)
+  return segs.filter((_, i) => i !== bundle).join('/')
+}
+
+export async function bundleArtifact(bundleDir: string): Promise<string | null> {
+  const found = (await listEntries(bundleDir)).filter((e) => !hiddenName(e.name))
+  return found.length === 1 ? join(bundleDir, found[0].name) : null
+}
+
+/** Files `artifact` into a bundle minted in `to` for `origin`, `leaf` asked back, its record written ahead; a failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. */
+export async function fileInto(
+  root: string,
+  to: BundleStore,
+  origin: string,
+  artifact: string,
+  record: RecordFile | RawRecord,
+  leaf?: string,
+): Promise<string> {
+  const bundle = await mintBundle(root, to, origin, leaf)
+  try {
+    await writeRecord(bundle, record)
+    await relocate(artifact, join(bundle, basename(artifact)))
+  } catch (e) {
+    await removeOwn(bundle)
+    throw e
+  }
+  return bundle
+}
+
+/** Moves a bundle's artifact into `to`, under the chain it left from, with its raw record spread with `extra`, and removes the emptied bundle; `leaf` asks for that bundle name back. */
+export async function moveIntoStore(
+  root: string,
+  fromBundle: string,
+  to: BundleStore,
+  extra: RawRecord,
+  leaf?: string,
+): Promise<void> {
+  const from = storeOf(root, fromBundle)
+  const artifact = await bundleArtifact(fromBundle)
+  const raw = await readRawRecord(fromBundle)
+  if (!from || !artifact || !raw) return
+  const origin = join(root, originPathOf(root, from, artifact))
+  await fileInto(root, to, origin, artifact, { ...raw, ...extra }, leaf)
+  await removeOwn(fromBundle)
+}
+
+export interface ListedBundle {
+  bundlePath: string
+  record: RecordFile
+  artifactName?: string
+}
+
+/** The bundles in `from`'s Archive archived from within the Set `setId`, by ids rather than by the folder names their chains were spelled with: each origin is the Set or lies beneath it, on the trail the tree gives the origin now, or on the one its record stored once the tree no longer holds it. */
+export async function archivedWithin(root: string, setId: string, from: string, tree: NexusTree) {
+  const store = archiveStoreOf(from)
+  if (!store) return []
+  return (await listBundles(root, store)).flatMap((listed) => {
+    const origin = originOf(listed.record)
+    if (!origin) return []
+    const held = trailAbove(tree, origin.parent)
+    return originWithin(origin, setId, held) ? [{ ...listed, origin, held }] : []
+  })
+}
+
+export async function listBundles(root: string, store: BundleStore): Promise<ListedBundle[]> {
+  const { dir, suffix } = layoutOf(store)
+  const out: ListedBundle[] = []
+  const walk = async (at: string): Promise<void> => {
+    for (const e of await listEntries(at)) {
+      if (e.kind !== 'dir') continue
+      const abs = join(at, e.name)
+      const record = e.name.endsWith(suffix) ? await readRecord(abs) : null
+      if (!record) {
+        await walk(abs)
+        continue
+      }
+      const artifact = record.entity === 'property' ? null : await bundleArtifact(abs)
+      if (record.entity !== 'property' && !artifact) continue
+      out.push({
+        bundlePath: relative(root, abs),
+        record,
+        ...(artifact ? { artifactName: basename(artifact) } : {}),
+      })
+    }
+  }
+  await walk(join(root, dir))
+  return out
+}
+
+/** The Collections outside the tree: in a root folder it doesn't hold, hidden or excluded alike, or in the Trash. */
+export async function collectionsElsewhere(root: string, tree: NexusTree): Promise<Set<string>> {
+  const held = new Set(tree.collections.map((c) => c.path))
+  const unheld = (await listEntries(root)).filter(
+    ({ name, kind }) =>
+      kind === 'dir' && name !== NEXUS_DIR && name !== TRASH_DIR && !held.has(name),
+  )
+  const ids = await Promise.all(unheld.map(({ name }) => sidecarId(join(root, name), 'collection')))
+  const trashed = (await listBundles(root, { kind: 'trash' })).flatMap(({ record }) =>
+    record.entity === 'collection' && record.id ? record.id : [],
+  )
+  return new Set([...ids.flatMap((id) => id ?? []), ...trashed])
+}
+
+/** Whether the Collection an Archive is filed under still answers for it: live, outside the tree, or possibly behind a root sidecar that reads unreadable, which could be any Collection. */
+export async function archiveOwned(
+  tree: NexusTree,
+  id: string,
+  elsewhere: () => Promise<Set<string>>,
+): Promise<boolean> {
+  return (
+    tree.collections.some((c) => c.id === id) ||
+    (tree.unreadable?.some((u) => u.kind === 'collection') ?? false) ||
+    (await elsewhere()).has(id)
+  )
+}
+
+/** A bundle as one open reads it: its store, its record, and the one artifact it holds, which a property's record holds none of and a bundle cut short may not. */
+export interface OpenBundle {
+  abs: string
+  store: BundleStore
+  record: RecordFile
+  artifact: string | null
+}
+
+export async function openBundle(root: string, abs: string): Promise<Result<OpenBundle>> {
+  const store = storeOf(root, abs)
+  if (!store) return fault('Only a trash or archive record can be spent.')
+  const record = await readRecord(abs)
+  if (!record) return fault('That record is unreadable.')
+  return ok({ abs, store, record, artifact: await bundleArtifact(abs) })
+}
+
+export async function contentPages(
+  entity: RecordFile['entity'],
+  artifactAbs: string,
+): Promise<string[]> {
+  switch (entity) {
+    case 'page':
+      return [artifactAbs]
+    case 'collection':
+    case 'set':
+      return listMarkdownFiles(artifactAbs)
+    default:
+      return []
+  }
+}
+
+/** The ids `pages` carry, read from the files themselves. */
+export async function pageIdsOf(pages: string[]): Promise<string[]> {
+  const ids = await Promise.all(pages.map(stampedIdOf))
+  return ids.flatMap((id) => id ?? [])
+}
+
+/** Every stored page at the path it left, its `id` the bundle holding it, since parking needs the bundle alone and reads no file. */
+export async function originPagesIn(root: string, store: BundleStore): Promise<ConnPage[]> {
+  const out: ConnPage[] = []
+  for (const { bundlePath, record, artifactName } of await listBundles(root, store)) {
+    if (!artifactName) continue
+    const bundle = join(root, bundlePath)
+    for (const file of await contentPages(record.entity, join(bundle, artifactName)))
+      out.push(connPage(bundle, originPathOf(root, store, file)))
+  }
+  return out
+}
+
+/** One bundle's pages at the paths they left, with the ids their files carry; an ID-less one answers to its file, which no index holds as an id. */
+export async function originPagesOf(
+  root: string,
+  store: BundleStore,
+  files: readonly string[],
+): Promise<ConnPage[]> {
+  const out: ConnPage[] = []
+  for (const file of files)
+    out.push(connPage((await stampedIdOf(file)) ?? file, originPathOf(root, store, file)))
+  return out
+}
```

##### Core/Bundles/handlers.ts

```/Core/Bundles/handlers.ts diff
@@ -0 +1 @@
+import { type Handlers, withRoot } from '../Contract/handlers'
+import { fault, ok } from '../Contract/result'
+import { isPlainObject, isString } from '../Contract/validators'
+import { liveTreeOf } from '../Nexus/liveTree'
+import { nexusPages } from '../Nexus/heldPages'
+import { archiveStoreOf } from '../Paths/names'
+import { archivedWithin, type BundleStore, listBundles } from './bundle'
+import { bundleRows } from './rows'
+
+function storeFrom(raw: unknown): BundleStore | null {
+  if (!isPlainObject(raw)) return null
+  if (raw.kind === 'trash') return { kind: 'trash' }
+  return raw.kind === 'archive' && isString(raw.id) ? archiveStoreOf(raw.id) : null
+}
+
+export const bundlesHandlers = {
+  'bundles:list': withRoot(async (root, _ctx, raw: unknown, within?: unknown) => {
+    const store = storeFrom(raw)
+    if (!store) return fault('A store is required.')
+    if (within !== undefined && !isString(within)) return fault('Invalid Set id.')
+    if (within !== undefined && store.kind !== 'archive')
+      return fault('Only an Archive lists within a Set.')
+    const tree = await liveTreeOf(root)
+    const { byId } = await nexusPages(root, tree)
+    const listed =
+      store.kind === 'archive' && within !== undefined
+        ? await archivedWithin(root, within, store.id, tree)
+        : await listBundles(root, store)
+    return ok(bundleRows(listed, store, tree, byId))
+  }),
+} satisfies Partial<Handlers>
```

##### Core/Bundles/placement.ts

```/Core/Bundles/placement.ts diff
@@ -0 +1 @@
+// Where a recorded artifact re-enters: the placement resolved against the CURRENT tree and stepped past what the disk holds, the order it lands in, or the refusal that says why it cannot be placed.
+
+import { CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
+import { basename, isAtOrUnder, join, relative, titleFromPath } from '../Paths/posix'
+import { createDisambiguated, freeName } from '../Paths/names'
+import { pathExists } from '../Files/atomicWrite'
+import { landingRefusal } from '../Nexus/folderEntity'
+import { fail, fault, ok, type Result } from '../Contract/result'
+import type { NexusTree } from '../Nexus/tree'
+import type { RestoreDestination } from '../Nexus/mutateRequest'
+import type { NexusPages } from '../Nexus/heldPages'
+import type { EntityRecord } from '../Nexus/record'
+import { findContainerById } from '../Nexus/treePatch'
+import { type Slot, spliceBeside } from '../Nexus/order'
+import { setChildOrder, setCollectionOrder, setSpaceOrder } from '../Nexus/reorder'
+import { contextWorldOf } from '../Contexts/contextResolve'
+import type { ArtifactRecord, Place } from './record'
+import { archiveOwned, type BundleStore, collectionsElsewhere, storeOf } from './bundle'
+
+interface Placement {
+  dir: string
+  finalName: string
+  /** For a page, Space, or Context: the final title restore writes everywhere (folder, registry, re-applied membership keys, the links its arrival re-spells).*/
+  finalTitle?: string
+}
+
+/** The siblings it lands among, held as the tree holds them, and the one writer of their order. */
+interface SiblingOrder {
+  siblings: readonly { id: string }[]
+  write: (root: string, ids: string[]) => Promise<unknown>
+}
+
+type Refusal = 'parent-gone' | 'cannot-hold' | 'unaddressable' | 'id-live'
+type Resolution = { place: Placement; order?: SiblingOrder } | { refuse: Refusal }
+
+/** An id `byId` holds anywhere but inside the restoring bundle is live, and a twin (null) always is; only an archived page's own file sits inside its bundle, since the map holds no Set ids. */
+const heldElsewhere = (held: EntityRecord | null | undefined, restoring: string): boolean =>
+  held !== undefined && !(held && isAtOrUnder(held.path, restoring))
+
+/** THE decision, against the CURRENT tree — a renamed parent resolves to its renamed path. Every name and title choice the tree can make is made here, and `freeOnDisk` steps it only past what the tree can't see.*/
+export function resolveRecord(
+  record: ArtifactRecord,
+  baseName: string,
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+  restoring: string,
+): Resolution {
+  const recordId = record.entity === 'context' ? record.registry.id : record.id
+  if (recordId && heldElsewhere(byId.get(recordId), restoring)) return { refuse: 'id-live' }
+
+  if (record.entity === 'context') {
+    const finalTitle = freeName(
+      record.registry.title,
+      tree.contexts.map((g) => g.def.title),
+    )
+    return { place: { dir: CONTEXTS_DIR_REL, finalName: finalTitle, finalTitle } }
+  }
+
+  if (record.entity === 'space') {
+    const parent = record.parent
+    if (parent.kind === 'unaddressable') return { refuse: 'unaddressable' }
+    if (parent.kind !== 'context') return { refuse: 'cannot-hold' }
+    const group = contextWorldOf(tree.contexts).groupById.get(parent.id)
+    if (!group) return { refuse: 'parent-gone' }
+    const finalTitle = freeName(
+      baseName,
+      group.spaces.map((s) => s.title),
+    )
+    return {
+      place: { dir: contextDirRel(group.def.title), finalName: finalTitle, finalTitle },
+      order: {
+        siblings: group.spaces,
+        write: (root, ids) => setSpaceOrder(root, group.def.id, ids),
+      },
+    }
+  }
+
+  switch (record.parent.kind) {
+    case 'unaddressable':
+      return { refuse: 'unaddressable' }
+    case 'context':
+      return { refuse: 'cannot-hold' }
+    case 'root': {
+      if (record.entity !== 'collection') return { refuse: 'cannot-hold' }
+      const finalName = freeName(
+        baseName,
+        tree.collections.map((c) => c.title),
+      )
+      return {
+        place: { dir: '', finalName },
+        order: { siblings: tree.collections, write: setCollectionOrder },
+      }
+    }
+    case 'container': {
+      if (record.entity === 'collection') return { refuse: 'cannot-hold' }
+      const parent = findContainerById(tree, record.parent.id)
+      if (!parent)
+        return byId.has(record.parent.id) ? { refuse: 'cannot-hold' } : { refuse: 'parent-gone' }
+      // A page and a Set share one folder namespace — both sibling sets block both kinds.
+      const siblings = [
+        ...parent.pages.map((p) => p.title),
+        ...(parent.sets ?? []).map((s) => s.title),
+      ]
+      const key = record.entity === 'page' ? 'page_order' : 'set_order'
+      const order: SiblingOrder = {
+        siblings: record.entity === 'page' ? parent.pages : (parent.sets ?? []),
+        write: (root, ids) => setChildOrder(join(root, parent.path), key, ids),
+      }
+      if (record.entity === 'page') {
+        const finalTitle = freeName(titleFromPath(baseName), siblings)
+        return { place: { dir: parent.path, finalName: `${finalTitle}.md`, finalTitle }, order }
+      }
+      return { place: { dir: parent.path, finalName: freeName(baseName, siblings) }, order }
+    }
+  }
+}
+
+const REFUSAL_TEXT: Record<Refusal, string> = {
+  'parent-gone': 'The place this belonged to no longer exists.',
+  'cannot-hold': 'The place this belonged to can no longer hold it.',
+  unaddressable: 'Where this belonged was never recorded.',
+  'id-live': 'Something in the nexus already carries this identity.',
+}
+
+export const NO_DESTINATION = 'That kind cannot be given a destination.'
+
+function withDestination(
+  record: ArtifactRecord,
+  destination: Exclude<RestoreDestination, { kind: 'archive' }>,
+  tree: NexusTree,
+): Result<ArtifactRecord> {
+  switch (record.entity) {
+    case 'space':
+      if (destination.kind !== 'context') return fail('invalid-path', 'A Space lives in a Context.')
+      if (!contextWorldOf(tree.contexts).groupById.has(destination.id))
+        return fail('not-found', 'That Context no longer exists.')
+      return ok({ ...record, parent: { kind: 'context', id: destination.id }, place: undefined })
+    case 'page':
+    case 'set':
+      if (destination.kind !== 'container')
+        return fail('invalid-path', 'Pages and Sets live in Collections and Sets.')
+      if (!findContainerById(tree, destination.id))
+        return fail('not-found', 'That place no longer exists.')
+      return ok({ ...record, parent: { kind: 'container', id: destination.id }, place: undefined })
+    default:
+      return fault(NO_DESTINATION)
+  }
+}
+
+export function slotOf(
+  place: Place | undefined,
+  liveIds: readonly string[],
+): { anchor: string | null; where: Slot } {
+  if (place?.above && liveIds.includes(place.above)) return { anchor: place.above, where: 'above' }
+  if (place?.below && liveIds.includes(place.below)) return { anchor: place.below, where: 'below' }
+  return { anchor: null, where: place && !place.below ? 'first' : 'last' }
+}
+
+/** The tree's free title stepped further past what the disk holds there that the tree can't see — an outside file, an excluded folder, the asset directory — in the item's own form, so a restore lands beside it, never over it. */
+async function freeOnDisk(
+  root: string,
+  entity: ArtifactRecord['entity'],
+  { dir, finalName, finalTitle }: Placement,
+): Promise<Result<Placement>> {
+  const parent = join(root, dir)
+  const leaf = (title: string): string => (entity === 'page' ? `${title}.md` : title)
+  const taken = async (title: string): Promise<boolean> =>
+    ((entity === 'collection' || entity === 'set') &&
+      (await landingRefusal(root, parent, title)) !== null) ||
+    (await pathExists(join(parent, leaf(title))))
+  const named = await createDisambiguated(
+    finalTitle ?? finalName,
+    async (title) =>
+      (await taken(title)) ? fail('exists', `"${title}" already exists.`) : ok(title),
+    taken,
+  )
+  if (!named.ok) return named
+  return ok({
+    dir,
+    finalName: leaf(named.value),
+    ...(finalTitle === undefined ? {} : { finalTitle: named.value }),
+  })
+}
+
+export async function placeRecord(
+  root: string,
+  stored: ArtifactRecord,
+  destination: RestoreDestination | undefined,
+  bundle: { abs: string; artifact: string },
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+): Promise<
+  Result<{
+    record: ArtifactRecord
+    placement: Placement
+    writeOrder?: () => Promise<unknown>
+    landedAs?: string
+    into?: BundleStore
+  }>
+> {
+  const baseName = basename(bundle.artifact)
+  const restoring = relative(root, bundle.abs)
+  if (destination?.kind === 'archive') {
+    if ((stored.entity !== 'page' && stored.entity !== 'set') || !stored.archive)
+      return fault(NO_DESTINATION)
+    // The bundle it names was removed, so no realpath answers for it; `join` collapses any `..` before the store's prefix test.
+    const into = storeOf(root, join(root, stored.archive))
+    if (into?.kind !== 'archive') return fault(NO_DESTINATION)
+    // A Collection in the Trash keeps its Archive; one gone for good would leave the item filed where no view reaches it.
+    if (!(await archiveOwned(tree, into.id, () => collectionsElsewhere(root, tree))))
+      return fault(REFUSAL_TEXT['parent-gone'])
+    if (stored.id && heldElsewhere(byId.get(stored.id), restoring))
+      return fault(REFUSAL_TEXT['id-live'])
+    return ok({
+      record: stored,
+      placement: {
+        dir: stored.archive,
+        finalName: baseName,
+        ...(stored.entity === 'page' ? { finalTitle: titleFromPath(baseName) } : {}),
+      },
+      into,
+    })
+  }
+  const rehomed = destination ? withDestination(stored, destination, tree) : ok(stored)
+  if (!rehomed.ok) return rehomed
+  const record = rehomed.value
+  const resolution = resolveRecord(record, baseName, tree, byId, restoring)
+  if ('refuse' in resolution) return fault(REFUSAL_TEXT[resolution.refuse])
+  const named = await freeOnDisk(root, record.entity, resolution.place)
+  if (!named.ok) return named
+  const placement = named.value
+  const title = placement.finalTitle ?? placement.finalName
+  const asked = record.entity === 'context' ? record.registry.title : titleFromPath(baseName)
+  const landedAs = title === asked ? undefined : title
+  const { order } = resolution
+  if (record.entity === 'context' || !record.id || !order)
+    return ok({ record, placement, landedAs })
+  const ids = order.siblings.map((n) => n.id)
+  const { anchor, where } = slotOf(record.place, ids)
+  const next = spliceBeside(ids, anchor, record.id, where)
+  return ok({ record, placement, landedAs, writeOrder: () => order.write(root, next) })
+}
```

##### Core/Bundles/record.ts

```/Core/Bundles/record.ts diff
@@ -0 +1 @@
+import { dirname, join, relative } from '../Paths/posix'
+import { z } from 'zod'
+import { readJsonObject, rmwJsonStrict, writeJson } from '../Files/atomicWrite'
+import { index } from '../Files/decoders'
+import { stampedIdOf } from '../Files/pageFile'
+import { sidecarIdentity } from '../Files/sidecar'
+import { contextEntry } from '../Contexts/contexts'
+import type { StrippedLink } from '../Nexus/cascade'
+import type { ContainerKind } from '../Nexus/entities'
+import type { NexusTree } from '../Nexus/tree'
+import { containerAt, containerTrailById } from '../Nexus/treePatch'
+
+/** The underscore is load-bearing: the artifact shares this folder under its own real name, so the record wears a prefix no entity may. The atomic writer's temp sibling inherits it too, so it is skipped alongside Finder's litter. */
+const RECORD_FILENAME = '_record.json'
+
+const parentRef = z.discriminatedUnion('kind', [
+  z.object({ kind: z.literal('root') }),
+  z.object({ kind: z.literal('container'), id: z.string() }),
+  z.object({ kind: z.literal('context'), id: z.string() }),
+  z.object({ kind: z.literal('unaddressable') }),
+])
+
+const memberRoot = z.object({ id: z.string().optional(), kind: z.enum(['page', 'space']) })
+const spaceRef = z.object({ id: z.string().optional(), title: z.string() })
+
+const strippedLink: z.ZodType<StrippedLink> = z.object({
+  page: z.string(),
+  property: z.string(),
+  value: z.string(),
+})
+
+/** The page each outbound link under the artifact named at the delete, by its id and its path then under the key it was written with, so a restore follows it by identity and re-spells only what changed since. */
+const linkTargets = z.record(z.string(), z.object({ id: z.string(), path: z.string() })).optional()
+
+/** The ids of the siblings it sat above and below in its origin's order as it left, so a restore lands it back between them. */
+const place = z.object({ above: z.string().optional(), below: z.string().optional() }).optional()
+
+export type Place = NonNullable<z.infer<typeof place>>
+
+const contentRecord = <E extends string>(entity: E) =>
+  z.object({
+    entity: z.literal(entity),
+    id: z.string().optional(),
+    icon: z.string().optional(),
+    parent: parentRef,
+    place,
+    /** The ids of the containers above `parent`, Collection first; read once the tree no longer holds `parent`, and kept current in the Archive by its carry. */
+    trail: z.array(z.string()).optional(),
+    /** A Trash record's only: the Archive bundle a delete took the item out of, where its Undo returns it. */
+    archive: z.string().optional(),
+    /** Each Link value the delete stripped from a page outside it, by that page's id and the property's, so a restore can put it back. */
+    links: z.array(strippedLink).optional(),
+    targets: linkTargets,
+    partial: z.literal(true).optional(),
+  })
+
+// The record itself is never rewritten from its decode; `def` and `registry` decode loose because a restore writes them back. A page's or Set's record decodes whole, so a delete from the Archive and its Undo each write the other store's record from it.
+const recordFile = z.discriminatedUnion('entity', [
+  contentRecord('page'),
+  contentRecord('collection'),
+  contentRecord('set'),
+  z.object({
+    entity: z.literal('space'),
+    id: z.string(),
+    icon: z.string().optional(),
+    parent: parentRef,
+    place,
+    members: z.array(memberRoot),
+    targets: linkTargets,
+    partial: z.literal(true).optional(),
+  }),
+  z.object({
+    entity: z.literal('property'),
+    id: z.string(),
+    // The definition as it stood, kept whole for the restore to decode.
+    def: z.looseObject({ id: z.string() }),
+    values: z.record(z.string(), z.unknown()),
+    assignments: z.array(z.string()).optional(),
+    caches: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
+    partial: z.literal(true).optional(),
+  }),
+  z.object({
+    entity: z.literal('context'),
+    registry: contextEntry,
+    at: index.optional(),
+    membership: z.array(z.object({ root: memberRoot, spaces: z.array(spaceRef) })),
+    targets: linkTargets,
+    partial: z.literal(true).optional(),
+  }),
+])
+
+export type RecordFile = z.infer<typeof recordFile>
+
+/** The property shape is artifact-less — there is nothing to place. */
+export type ArtifactRecord = Exclude<RecordFile, { entity: 'property' }>
+
+/** A record as its file holds it, which a write that carries it on keeps whole, since a record is never rewritten from its decode. */
+export type RawRecord = Record<string, unknown>
+
+export async function writeRecord(
+  bundleDir: string,
+  record: RecordFile | RawRecord,
+): Promise<void> {
+  await writeJson(join(bundleDir, RECORD_FILENAME), record)
+}
+
+export const readRawRecord = (bundleDir: string): Promise<RawRecord | null> =>
+  readJsonObject(join(bundleDir, RECORD_FILENAME))
+
+export async function readRecord(bundleDir: string): Promise<RecordFile | null> {
+  const raw = await readRawRecord(bundleDir)
+  if (raw === null) return null
+  const parsed = recordFile.safeParse(raw)
+  return parsed.success ? parsed.data : null
+}
+
+/** Merges what `patch` answers into the record in place, raw. */
+export async function patchRecord(
+  bundleDir: string,
+  patch: (raw: RawRecord) => RawRecord,
+): Promise<void> {
+  await rmwJsonStrict(join(bundleDir, RECORD_FILENAME), (raw) => ({ ...raw, ...patch(raw) }))
+}
+
+export function placeOf(ids: readonly string[], id: string): Place | undefined {
+  const at = ids.indexOf(id)
+  if (at === -1) return undefined
+  const above = ids[at + 1]
+  const below = ids[at - 1]
+  return { ...(above ? { above } : {}), ...(below ? { below } : {}) }
+}
+
+export const trailAbove = (tree: NexusTree, containerId: string): string[] | null =>
+  containerTrailById(tree, containerId)
+    ?.slice(0, -1)
+    .map((n) => n.id) ?? null
+
+type Origin = { parent: string; trail: string[] }
+
+/** The container a page or Set left, and the ids it stored above it. */
+export const originOf = (record: RecordFile): Origin | null =>
+  (record.entity === 'page' || record.entity === 'set') && record.parent.kind === 'container'
+    ? { parent: record.parent.id, trail: record.trail ?? [] }
+    : null
+
+export const collectionOf = ({ parent, trail }: Origin): string => trail[0] ?? parent
+
+/** Whether an origin lies within the Set `setId`: by `held`, the tree's trail above its parent, while the tree holds the parent, else by the trail it stored. */
+export const originWithin = (origin: Origin, setId: string, held: string[] | null): boolean =>
+  origin.parent === setId || (held ?? origin.trail).includes(setId)
+
+export async function gatherContentRecord(
+  root: string,
+  tree: NexusTree,
+  kind: 'page' | ContainerKind,
+  abs: string,
+): Promise<RecordFile> {
+  const { id, icon } =
+    kind === 'page'
+      ? { id: await stampedIdOf(abs), icon: undefined }
+      : await sidecarIdentity(abs, kind)
+  const atRoot = dirname(abs) === root
+  const container = atRoot ? null : containerAt(tree, relative(root, dirname(abs)))
+  const siblings: readonly { id: string }[] | undefined = atRoot
+    ? tree.collections
+    : kind === 'page'
+      ? container?.pages
+      : container?.sets
+  const placed =
+    id && siblings
+      ? placeOf(
+          siblings.map((n) => n.id),
+          id,
+        )
+      : undefined
+  const trail = container ? trailAbove(tree, container.id) : null
+  return {
+    entity: kind,
+    ...(id ? { id } : {}),
+    ...(icon ? { icon } : {}),
+    parent: atRoot
+      ? { kind: 'root' }
+      : container
+        ? { kind: 'container', id: container.id }
+        : { kind: 'unaddressable' },
+    ...(placed ? { place: placed } : {}),
+    ...(trail ? { trail } : {}),
+  }
+}
```

##### Core/Bundles/rows.ts

```/Core/Bundles/rows.ts diff
@@ -0 +1 @@
+import { dirname, relative, relJoin, titleFromPath } from '../Paths/posix'
+import { CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
+import { type MatchKey, matchKey } from '../Paths/caseFold'
+import type { HeldKind } from '../Nexus/entities'
+import type { NexusTree } from '../Nexus/tree'
+import type { NexusPages } from '../Nexus/heldPages'
+import { containerTrailById } from '../Nexus/treePatch'
+import { type PropertyType, propertyType } from '../Properties/properties'
+import { contextWorldOf } from '../Contexts/contextResolve'
+import { type BundleStore, type ListedBundle, layoutOf, storedAtOf } from './bundle'
+import { resolveRecord } from './placement'
+import type { ArtifactRecord } from './record'
+
+/** `kind` is absent on a historical crumb, which is a frozen folder name rather than a live entity. */
+export interface BundleCrumb {
+  kind?: HeldKind
+  title: string
+}
+
+/** Main owns the parse: the renderer never sees a bundle suffix, a folder stamp, or the record union. */
+export interface BundleRow {
+  bundlePath: string
+  kind: HeldKind | 'property'
+  title: string
+  /** A property row's type, which picks its icon. */
+  propertyType?: PropertyType
+  /** Resolved live from the recorded parent id, so a renamed ancestor reads true. */
+  crumbs: BundleCrumb[]
+  /** Set when the recorded parent resolves to nothing and `crumbs` fell back to the frozen chain. */
+  historical?: boolean
+  /** Epoch milliseconds from the bundle's own stamp; null when it won't parse. */
+  storedAt: number | null
+  /** False when restoring would refuse for want of a home — the signal to ask where instead. */
+  homeResolves: boolean
+  /** The search's key: the title, placed by the crumbs. */
+  match: MatchKey
+  /** The item's own icon: a page's from the metadata the tree holds, a container's or a Space's from its record, which keeps the sidecar's. */
+  icon?: string
+  /** A page or Set as stored, by its record's id and its path inside the bundle: what the reader opens and a restore's Undo finds again. */
+  stored?: { id: string; path: string }
+}
+
+/** The only surviving evidence of where something lived once its recorded parent is gone. A store mirrors the nexus faithfully, Contexts included, so a Space's chain arrives wearing the internal folders the live breadcrumb never shows — the store's root and the Contexts prefix both come back off. */
+function frozenCrumbs(store: BundleStore, bundlePath: string): BundleCrumb[] {
+  const segments = relative(layoutOf(store).dir, dirname(bundlePath)).split('/').filter(Boolean)
+  const contexts = CONTEXTS_DIR_REL.split('/')
+  const inContexts = contexts.every((seg, i) => segments[i] === seg)
+  return (inContexts ? segments.slice(contexts.length) : segments).map((title) => ({ title }))
+}
+
+function liveCrumbs(record: ArtifactRecord, tree: NexusTree): BundleCrumb[] | null {
+  if (record.entity === 'context') return []
+  if (record.entity === 'space') {
+    const parent = record.parent
+    if (parent.kind !== 'context') return null
+    const group = contextWorldOf(tree.contexts).groupById.get(parent.id)
+    return group ? [{ kind: 'context', title: group.def.title }] : null
+  }
+  if (record.parent.kind === 'root') return record.entity === 'collection' ? [] : null
+  if (record.parent.kind !== 'container') return null
+  // Walked structurally rather than split from a path, since a crumb chain built from names is what the record model refuses.
+  const chain = containerTrailById(tree, record.parent.id)
+  return chain?.map((n) => ({ kind: n.kind, title: n.title })) ?? null
+}
+
+function homeResolvesFor(
+  record: ArtifactRecord,
+  artifactName: string,
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+  restoring: string,
+): boolean {
+  const resolution = resolveRecord(record, artifactName, tree, byId, restoring)
+  return !('refuse' in resolution) || resolution.refuse === 'id-live'
+}
+
+export const matched = (row: Omit<BundleRow, 'match'>): BundleRow => ({
+  ...row,
+  match: matchKey(row.title, row.crumbs.map((c) => c.title).join('/')),
+})
+
+/** A property record has no artifact to name it, so its title is its definition's own; it lived nowhere, so it always has a home to return to. */
+export function bundleRowOf(
+  bundle: ListedBundle,
+  store: BundleStore,
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+): BundleRow | null {
+  const { record, bundlePath, artifactName } = bundle
+  if (record.entity === 'property') {
+    const type = propertyType.safeParse(record.def.type)
+    return matched({
+      bundlePath,
+      kind: 'property',
+      title: typeof record.def.label === 'string' ? record.def.label : record.id,
+      ...(type.success ? { propertyType: type.data } : {}),
+      crumbs: [],
+      storedAt: storedAtOf(bundlePath),
+      homeResolves: true,
+    })
+  }
+  if (!artifactName) return null
+  const live = liveCrumbs(record, tree)
+  const path = relJoin(bundlePath, artifactName)
+  const icon =
+    record.entity === 'page'
+      ? record.id
+        ? tree.config.pageMetadata[record.id]?.icon
+        : undefined
+      : record.entity === 'context'
+        ? undefined
+        : record.icon
+  return matched({
+    bundlePath,
+    kind: record.entity,
+    title: record.entity === 'page' ? titleFromPath(artifactName) : artifactName,
+    crumbs: live ?? frozenCrumbs(store, bundlePath),
+    ...(live ? {} : { historical: true }),
+    storedAt: storedAtOf(bundlePath),
+    ...(icon ? { icon } : {}),
+    ...((record.entity === 'page' || record.entity === 'set') && record.id
+      ? { stored: { id: record.id, path } }
+      : {}),
+    homeResolves: homeResolvesFor(record, artifactName, tree, byId, bundlePath),
+  })
+}
+
+export function bundleRows(
+  bundles: ListedBundle[],
+  store: BundleStore,
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+): BundleRow[] {
+  return bundles
+    .map((b) => bundleRowOf(b, store, tree, byId))
+    .filter((row) => row !== null)
+    .sort((a, b) => (b.storedAt ?? -1) - (a.storedAt ?? -1))
+}
```

##### Core/Contract/bridge.ts

```/Core/Contract/bridge.ts diff
@@ -5 +5 @@ import type { EditorMenuRequest } from '../Actions/editorMenu'
 import type { EditMenuAction, KeyPress, MenuCommand, NativeEdit } from '../Actions/commands'
 import type { RemovedView, SavedView, ViewPatch } from '../Views/views'
 import type { BodyWrite, PageDetail } from '../Pages/pageDetail'
-import type { TrashMode, TrashRow } from '../Trash/trashRow'
+import type { BundleStore } from '../Bundles/bundle'
+import type { BundleRow } from '../Bundles/rows'
+import type { TrashMode } from '../Trash/trashMode'
 import type { ClearReport } from '../Settings/exclusionScan'
 import type { NavigationState, StoredTabSet } from '../Navigation/navRef'
 import type { MatrixConfig, MatrixPatch } from '../Matrix/matrixConfig'
@@ -255 +257 @@ export interface Asks {
   }
   'nav:evictThumbs': { args: [liveKeys: string[]]; reply: Result<null> }
 
-  // `.trash` is outside the watcher, so the browser asks again after every action it takes.
-  'trash:list': { args: []; reply: Result<TrashRow[]> }
+  // No push carries what a store holds, so a browser asks again after every action and on `storesChanged`.
+  // `within` narrows a Collection's Archive to what left from within one of its top-level Sets.
+  'bundles:list': { args: [store: BundleStore, within?: string]; reply: Result<BundleRow[]> }
   // Read at the moment of asking, never from the renderer's cache, so the confirmation can't promise the system trash while main erases outright.
   'delete:facts': { args: []; reply: Result<{ trashMode: TrashMode; permanentDelete: boolean }> }
 
```

##### Core/Contract/handlers.ts

```/Core/Contract/handlers.ts diff
@@ -5 +5 @@ import { settleNow } from '../Nexus/settle'
 import type { EditorMenuRequest } from '../Actions/editorMenu'
 import type { MenuRequest } from '../Actions/menuModel'
 import type { ThumbRect } from '../Interface/chrome'
-import type { TrashMode } from '../Trash/trashRow'
+import type { TrashMode } from '../Trash/trashMode'
 import type { SyncDevice } from '../Sync/Contract/wire'
 
 export type PickKind = 'file' | 'folder' | 'image' | 'exclusion'
```

##### Core/Contract/serve.ts

```/Core/Contract/serve.ts diff
@@ -1 +1 @@
 import { actionsHandlers } from '../Actions/handlers'
 import { assetsHandlers } from '../Assets/handlers'
+import { bundlesHandlers } from '../Bundles/handlers'
 import { interfaceHandlers } from '../Interface/handlers'
 import { matrixHandlers } from '../Matrix/handlers'
 import { navigationHandlers } from '../Navigation/handlers'
@@ -21 +22 @@ export const handlers: Handlers = {
   ...viewsHandlers,
   ...tilesHandlers,
   ...trashHandlers,
+  ...bundlesHandlers,
   ...assetsHandlers,
   ...settingsHandlers,
   ...syncHandlers,
```

##### Core/Files/atomicWrite.ts

```/Core/Files/atomicWrite.ts diff
@@ -74 +74 @@ export async function relocate(
   reportRename(from, to)
 }
 
+export async function removeOwn(abs: string): Promise<void> {
+  recordWrite(abs)
+  await machine().remove(abs)
+}
+
 // A leading BOM is encoding, not corruption.
 export const parseJsonText = (text: string): unknown =>
   JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
```

##### Core/Files/sidecar.ts

```/Core/Files/sidecar.ts diff
@@ -4 +4 @@ import { fail, type Result } from '../Contract/result'
 import { asString } from '../Nexus/coerce'
 import { readJsonObject, rmwJsonStrict } from './atomicWrite'
 
+/** The id and icon a sidecar names, from one read. */
+export async function sidecarIdentity(
+  absFolder: string,
+  kind: SidecarKind,
+): Promise<{ id?: string; icon?: string }> {
+  const raw = await readJsonObject(sidecarPath(absFolder, kind))
+  return { id: asString(raw?.id), icon: asString(raw?.icon) }
+}
+
 export const sidecarId = async (
   absFolder: string,
   kind: SidecarKind,
-): Promise<string | undefined> => asString((await readJsonObject(sidecarPath(absFolder, kind)))?.id)
+): Promise<string | undefined> => (await sidecarIdentity(absFolder, kind)).id
 
 export type Refuse = (why: Result<never>) => null
 
```

##### Core/Files/walk.ts

```/Core/Files/walk.ts diff
@@ -1 +1 @@
 import { hiddenFolder, hiddenName, outsideContent, type WatchScope } from '../Paths/exclusion'
-import { isMarkdownFile, join, relative } from '../Paths/posix'
+import { ARCHIVE_DIR_REL, SIDECARS } from '../Paths/nexusPaths'
+import { basename, isMarkdownFile, join, relative } from '../Paths/posix'
 import { type DirEntry, machine } from '../Platform/machine'
 
 export function isContentName(name: string): boolean {
@@ -28 +29 @@ async function filesUnder(dir: string): Promise<string[]> {
   return out
 }
 
-// The pages under a folder the tree doesn't hold (a trash bundle's artifact), held to the same hidden-name rule as the content walk.
+// The pages under a folder the tree doesn't hold (a bundle's artifact), every name below it held to the hidden-folder rule.
 export async function listMarkdownFiles(dir: string): Promise<string[]> {
   const rels = await listPathsUnder(
     dir,
@@ -38 +39 @@ export async function listMarkdownFiles(dir: string): Promise<string[]> {
   return rels.map((rel) => join(dir, rel))
 }
 
+/** The Nexus root, then its Archive: the one hidden folder read as content, which the root's own walk prunes with `.nexus`. */
+const contentRoots = (root: string): string[] => [root, join(root, ARCHIVE_DIR_REL)]
+
 export async function corpusFiles(root: string, scope: WatchScope): Promise<string[]> {
-  return corpusFilesUnder(root, root, scope)
+  const files: string[] = []
+  for (const dir of contentRoots(root)) files.push(...(await corpusFilesUnder(root, dir, scope)))
+  return files
 }
 
 /** The folders `dir` holds that the app enters: every one but a hidden one. */
@@ -82 +88 @@ export async function corpusFilesUnder(
   )
 }
 
+export async function sidecarsUnder(
+  root: string,
+  scope: WatchScope,
+  under?: string,
+): Promise<string[]> {
+  const files: string[] = []
+  for (const dir of under === undefined ? contentRoots(root) : [under]) {
+    const rels = await listPathsUnder(root, dir, (rel, kind) =>
+      kind === 'dir' ? !outsideContent(rel, scope) : SIDECARS.has(basename(rel)),
+    )
+    files.push(...rels.map((rel) => join(root, rel)))
+  }
+  return files
+}
+
 export async function listFilesRecursive(dir: string, suffixes?: string[]): Promise<string[]> {
   const all = await filesUnder(dir)
   return suffixes ? all.filter((abs) => suffixes.some((s) => abs.endsWith(s))) : all
```

##### Core/Index/contentIndex.ts

```/Core/Index/contentIndex.ts diff
@@ -47 +47 @@ export function markIndexReady(): void {
   readyDb = contentIndexStore()
 }
 
+export const indexReady = (): boolean => contentIndexStore() === readyDb
+
 function queried<T>(run: (db: ContentIndexStore) => T): T | null {
   const db = contentIndexStore()
   if (!db) return null
@@ -58 +60 @@ function queried<T>(run: (db: ContentIndexStore) => T): T | null {
 }
 
 function queryPaths(run: (db: ContentIndexStore) => string[]): string[] | null {
-  if (contentIndexStore() !== readyDb) return null
-  return queried(run)
+  return indexReady() ? queried(run) : null
 }
 
 export function queryMentions(keys: readonly string[], qualifier?: string): string[] | null {
@@ -82 +83 @@ export function queryMembers(key: string, title?: string): string[] | null {
 }
 
 export function readPageRelations(paths?: readonly string[], key?: string): PageRelations | null {
-  return contentIndexStore() !== readyDb ? null : queried((db) => db.readPageRelations(paths, key))
+  return indexReady() ? queried((db) => db.readPageRelations(paths, key)) : null
 }
 
 export function readIndexedStat(path: string): IndexedStat | null {
```

##### Core/Index/indexSeed.ts

```/Core/Index/indexSeed.ts diff
@@ -75 +75 @@ export async function nexusCorpus(root: string): Promise<string[]> {
   return corpusFiles(root, await readWatchScope(root))
 }
 
-export function corpusUnder(root: string, rels: string[], folders: string[]): string[] {
-  return rels
-    .map((rel) => join(root, rel))
-    .filter((abs) => folders.some((folder) => abs.startsWith(`${folder}/`)))
-}
-
-export async function folderCorpus(root: string, absFolder: string): Promise<string[]> {
-  const rels = await corpusFilesUnder(root, absFolder, await readWatchScope(root))
-  return rels.map((rel) => join(root, rel))
-}
-
 async function relCorpusPath(root: string, abs: string): Promise<string | null> {
   const rel = relative(root, abs)
   if (!rel || escapes(rel)) return null
@@ -180 +169 @@ export async function moveIndexPaths(root: string, oldAbs: string, newAbs: strin
     return
   }
   if (!oldRel) {
-    const landed = isMarkdownFile(newRel) ? [newAbs] : await folderCorpus(root, newAbs)
-    for (const abs of landed) await indexWrittenPage(root, abs)
+    const landed = isMarkdownFile(newRel)
+      ? [newRel]
+      : await corpusFilesUnder(root, newAbs, await readWatchScope(root))
+    for (const rel of landed) await indexWrittenPage(root, join(root, rel))
     return
   }
   if (isMarkdownFile(oldRel)) renamePathIndex(oldRel, newRel)
```

##### Core/Interface/App.tsx

```/Core/Interface/App.tsx diff
@@ -13 +13 @@ import { SidePane } from './SidePane/SidePane'
 import { NavWindow } from './Windows/NavWindow'
 import { MatrixWindow } from '../Matrix/MatrixWindow'
 import { PageWindow } from './Windows/PageWindow'
-import { PageHistoryWindow } from './Windows/PageHistoryWindow'
+import { PageReaderWindow } from './Windows/PageReaderWindow'
 import { WebWindow } from './Windows/WebWindow'
 import { SettingsWindow } from '../Settings/SettingsWindow'
 import { IterationWindow } from './Windows/IterationWindow'
 import { ConfirmationWindow } from './Confirm/ConfirmationWindow'
-import { NotificationLabel } from './Notifications/NotificationLabel'
+import { ActionLabel } from './Notifications/ActionLabel'
 import { GlancePane } from './Glance/GlancePane'
 import { useNavThumbnails } from '../Navigation/useNavThumbnails'
 import { Button } from '@pommora/uix/Buttons/Button'
@@ -188 +188 @@ export function App(): React.JSX.Element {
         {status === 'ready' && <NavWindow />}
         {status === 'ready' && <MatrixWindow />}
         {status === 'ready' && <PageWindow />}
-        {status === 'ready' && <PageHistoryWindow />}
+        {status === 'ready' && <PageReaderWindow />}
         {status === 'ready' && <WebWindow />}
         {status === 'ready' && <SettingsWindow />}
         {status === 'ready' && <IterationWindow />}
         <ConfirmationWindow />
         <MenuPresenter />
         <ValuePickPresenter />
-        <NotificationLabel />
+        <ActionLabel />
         {status === 'ready' && <GlancePane />}
         {status === 'ready' && sidePaneOpen && (
           <div
```

##### Core/Interface/ContentView.tsx

```/Core/Interface/ContentView.tsx diff
@@ -14 +14 @@ import { useRevealNear } from '@pommora/uix/Interactions/hoverReveal'
 import { slideIn } from '@pommora/uix/Animations/motion'
 import { FooterToggle } from '@pommora/uix/Interactions/FooterToggle'
 import { findCollection, findSet } from '../Nexus/treeIndex'
+import { topContainerOf } from '../Nexus/treePatch'
 import { ContainerView } from '../Views/ContainerView'
+import { ArchiveView } from '../Archive/ArchiveView'
 import { HomepageView } from './Homepage/HomepageView'
 import { SpaceView } from '../Contexts/SpaceView'
 import { PageView } from '../Pages/PageView'
@@ -39 +41 @@ const SUBFIELD: Record<Exclude<SelectionState['kind'], 'none'>, boolean> = {
   set: true,
   page: true,
   matrix: true,
+  archive: true,
 }
 const keyOf = (target: SelectionState): string =>
   target.kind === 'none' ? target.kind : navKey(target)
@@ -86 +89 @@ const HostView = memo(function HostView({ host }: { host: Host }): React.JSX.Ele
       return <PageView tabId={host.tabId} pageId={target.id} parked={host.parked} />
     case 'matrix':
       return <MatrixView />
+    case 'archive': {
+      const owner = topContainerOf(tree, target.id)
+      return owner ? <ArchiveView owner={owner} /> : <div className="detail interface-inset" />
+    }
   }
 })
 
```

##### Core/Interface/InterfaceScaffold.tsx

```/Core/Interface/InterfaceScaffold.tsx diff
@@ -1 +1 @@
-import { useEffect, useRef } from 'react'
+import { useCallback, useEffect, useRef } from 'react'
 import { cx } from '@pommora/uix/Utilities/cx'
 import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
 import { EntityBanner } from './Header/Banner'
@@ -8 +8 @@ import { captureWarm, readWarm } from '../Session/warmCache'
 
 export function InterfaceScaffold({
   owner,
+  trailing,
+  plain,
+  ready = true,
+  scrollRef,
   children,
 }: {
   owner: BannerOwner | null
+  trailing?: React.ReactNode
+  plain?: true
+  /** False while the content still has no height, so the saved scroll lands once it has. */
+  ready?: boolean
+  /** Handed the scroll element, for content that measures against it. */
+  scrollRef?: (el: HTMLDivElement | null) => void
   children?: React.ReactNode
 }): React.JSX.Element {
-  const ref = useRef<HTMLDivElement>(null)
+  const ref = useRef<HTMLDivElement | null>(null)
+  const attach = useCallback(
+    (el: HTMLDivElement | null) => {
+      ref.current = el
+      scrollRef?.(el)
+    },
+    [scrollRef],
+  )
   const host = useContentHost()
   const tabId = host?.tabId
   const warmKey = host?.key
@@ -21 +38 @@ export function InterfaceScaffold({
   // Scroll tracks into `last`: an unmount's cleanup runs after the div has left the page.
   useEffect(() => {
     const el = ref.current
-    if (!el || tabId === undefined || warmKey === undefined) return
+    if (!el || !ready || tabId === undefined || warmKey === undefined) return
     const saved = readWarm(tabId, warmKey)?.scrollTop
     el.scrollTop = saved ?? 0
     let last = saved ?? 0
@@ -33 +50 @@ export function InterfaceScaffold({
       el.removeEventListener('scroll', onScroll)
       captureWarm(tabId, warmKey, { scrollTop: last })
     }
-  }, [tabId, warmKey])
+  }, [tabId, warmKey, ready])
 
   const surface = owner !== null && isSurfaceKind(owner.kind)
   return (
     <>
-      <div ref={ref} className={cx('detail-scroll', owner && 'has-header')}>
-        {owner ? <EntityBanner owner={owner} /> : null}
+      <div ref={attach} className={cx('detail-scroll', owner && 'has-header')}>
+        {owner ? <EntityBanner owner={owner} trailing={trailing} plain={plain} /> : null}
         <div className={cx(surface ? 'tile-host-frame' : 'detail-body', 'interface-inset')}>
           {children}
         </div>
```

##### Core/Interface/contentHost.ts

```/Core/Interface/contentHost.ts diff
@@ -10 +10 @@ export interface ContentHost {
 export const ContentHostContext = createContext<ContentHost | null>(null)
 
 export const useContentHost = (): ContentHost | null => useContext(ContentHostContext)
+
+/** Whether this view is the one shown, rather than parked behind another tab's. */
+export const useHostShown = (): boolean => {
+  const host = useContentHost()
+  return host !== null && !host.parked
+}
```

##### Core/Interface/Confirm/confirmations.ts

```/Core/Interface/Confirm/confirmations.ts diff
@@ -1 +1 @@
-import type { MutateOutcome } from '../../Nexus/mutateRequest'
+import type { MutateOutcome, RestoreDestination } from '../../Nexus/mutateRequest'
 import type { HeldKind } from '../../Nexus/entities'
 import { valueOr } from '../../Contract/result'
-import { DEFAULT_TRASH_MODE } from '../../Trash/trashRow'
+import { DEFAULT_TRASH_MODE } from '../../Trash/trashMode'
 import { useSession } from '../../Session/store'
 import { personalizationOf } from '../../Session/configSlice'
 import { SETTING_DEFAULTS, settingOf } from '../../Settings/personalization'
-import { notifyDeleted, reportRefusal } from '../Notifications/notifications'
+import { notifyDeleted, notifyUndoable, reportRefusal } from '../Notifications/notifications'
 import { dialer } from '../../Platform/dialer'
 import { itemCount } from '../../Properties/properties'
+import { capitalize } from '@pommora/uix/Utilities/capitalize'
 import type { FormatChange } from '../../Properties/keyFormat'
 
 const DELETE_FACTS_FALLBACK = {
@@ -25 +26 @@ export interface ConfirmRequest {
 
 const ask = (req: ConfirmRequest): Promise<boolean> => useSession.getState().askConfirm(req)
 
-/** A container, a Context, and a Space each carry everything filed under them, so they ask regardless of the Confirm Before Deletion switch — the switch governs what a single delete takes: a page, a tile, a folder that carries no schema. */
-const ALWAYS_ASKS: ReadonlySet<HeldKind> = new Set<HeldKind>([
+type Counted = { kind: HeldKind | 'property' }
+
+const PLURALS: Record<Counted['kind'], string> = {
+  page: 'Pages',
+  collection: 'Collections',
+  set: 'Sets',
+  space: 'Spaces',
+  context: 'Contexts',
+  property: 'Properties',
+}
+
+export function countPhrase(items: readonly Counted[]): string {
+  const kinds = new Set(items.map((r) => r.kind))
+  const kind = kinds.size === 1 ? [...kinds][0] : null
+  if (kind === null) return itemCount(items.length)
+  return items.length === 1 ? `1 ${capitalize(kind)}` : `${items.length} ${PLURALS[kind]}`
+}
+
+type Asked = Counted & { title: string }
+
+/** What a delete asks of what it acts on: one by its title, more by their count. */
+const deleteQuestion = (targets: readonly Asked[]): string =>
+  targets.length === 1 ? `Delete “${targets[0].title}”?` : `Delete these ${countPhrase(targets)}?`
+
+/** A container, a Context, and a Space each carry everything filed under them, so deleting one asks regardless of the Confirm Before Deletion switch — the switch governs what a single delete takes: a page, a tile, a folder that carries no schema. An archive removes nothing, so it asks under its own switch alone. */
+const ALWAYS_ASKS: ReadonlySet<Counted['kind']> = new Set<Counted['kind']>([
   'collection',
   'set',
   'space',
   'context',
 ])
 
-const waived = (kind?: HeldKind): boolean =>
+const waived = (key: 'confirmDeletion' | 'confirmArchiving', kind?: Counted['kind']): boolean =>
   (kind === undefined || !ALWAYS_ASKS.has(kind)) &&
-  !settingOf(personalizationOf(useSession.getState()), 'confirmDeletion')
+  !settingOf(personalizationOf(useSession.getState()), key)
 
 const armed = new Map<string, () => void>()
 
-/** A bundle restored or deleted from anywhere spends the Undo its delete's notice offered, so neither the label nor the chord retries it. */
-export function spendBundle(bundlePath: string): void {
+/** A bundle restored or deleted from anywhere spends the Undo its notice offered, a delete's or an archive's, so neither the label nor the chord retries it. */
+export function spendUndo(bundlePath: string): void {
   armed.get(bundlePath)?.()
   armed.delete(bundlePath)
 }
 
-/** A system-trash delete mints no bundle, so it offers no Undo — the artifact left the nexus and there is nothing to name. */
+/** Posts through `post` with the one Undo that restores every bundle an act minted, to `destination` when given, arming each so a restore of any one from elsewhere spends it; an act that minted none offers none. */
+export function offerUndo(
+  bundlePaths: readonly string[],
+  post: (undo?: () => Promise<void>) => () => void,
+  destination?: RestoreDestination,
+): void {
+  const spend = post(
+    bundlePaths.length > 0
+      ? async () => {
+          for (const bundlePath of bundlePaths) {
+            spendUndo(bundlePath)
+            await useSession.getState().mutate({ op: 'restore', bundlePath, destination })
+          }
+        }
+      : undefined,
+  )
+  for (const bundlePath of bundlePaths) armed.set(bundlePath, spend)
+}
+
+/** A system-trash delete mints no bundle, so it offers no Undo — the artifact left the nexus and there is nothing to name. `undoTo` returns it where the delete took it from rather than to its origin. */
 export function notifyTrashed(
   title: string,
-  { trashed, cascade }: Pick<MutateOutcome, 'trashed' | 'cascade'>,
+  { bundled, cascade }: Pick<MutateOutcome, 'bundled' | 'cascade'>,
   retry?: () => void,
+  undoTo?: RestoreDestination,
 ): void {
-  const spend = notifyDeleted(
-    title,
-    trashed &&
-      (async () => {
-        spendBundle(trashed.bundlePath)
-        await useSession.getState().mutate({ op: 'restore', bundlePath: trashed.bundlePath })
-      }),
-    cascade,
-    retry,
+  offerUndo(
+    bundled ? [bundled.bundlePath] : [],
+    (undo) => notifyDeleted(title, undo, cascade, retry),
+    undoTo,
   )
-  if (trashed) armed.set(trashed.bundlePath, spend)
+}
+
+/** The one question a move into the Trash asks, put once for a batch: unasked only while Confirm Before Deletion is off and nothing in it always asks. */
+export const askTrashing = async (targets: readonly Asked[]): Promise<boolean> => {
+  if (targets.every(({ kind }) => waived('confirmDeletion', kind))) return true
+  const { trashMode } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
+  const it = targets.length > 1 ? 'They' : 'It'
+  return ask({
+    message: deleteQuestion(targets),
+    detail:
+      trashMode === 'system'
+        ? `${it} will be moved to the system trash.`
+        : `${it} will be moved to the nexus’s .trash folder (recoverable).`,
+    action: 'Delete',
+    tone: 'destructive',
+  })
 }
 
 export const confirmDelete = async (target: {
   path: string
   kind: HeldKind
   title: string
+  undoTo?: RestoreDestination
+}): Promise<boolean> => {
+  if (!(await askTrashing([target]))) return false
+  const done = await useSession
+    .getState()
+    .mutate({ op: 'delete', path: target.path, kind: target.kind })
+  if (done) notifyTrashed(target.title, done, undefined, target.undoTo)
+  return done !== null
+}
+
+export const confirmArchive = async (target: {
+  path: string
+  kind: 'page' | 'set'
+  title: string
 }): Promise<void> => {
-  if (!waived(target.kind)) {
-    const { trashMode } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
+  if (!waived('confirmArchiving')) {
     const yes = await ask({
-      message: `Delete “${target.title}”?`,
-      detail:
-        trashMode === 'system'
-          ? 'It will be moved to the system Trash.'
-          : 'It will be moved to the nexus’s .trash folder (recoverable).',
-      action: 'Delete',
-      tone: 'destructive',
+      message: `Archive “${target.title}”?`,
+      detail: `“${target.title}” will be moved to this Collection’s archive, where it can be restored.`,
+      action: 'Archive',
+      tone: 'positive',
     })
     if (!yes) return
   }
   const done = await useSession
     .getState()
-    .mutate({ op: 'delete', path: target.path, kind: target.kind })
-  if (done) notifyTrashed(target.title, done)
+    .mutate({ op: 'archive', path: target.path, kind: target.kind })
+  if (done)
+    offerUndo(done.bundled ? [done.bundled.bundlePath] : [], (undo) =>
+      notifyUndoable(`Archived “${target.title}”`, undo),
+    )
 }
 
 export const askRemoveTile = (): Promise<boolean> =>
-  waived()
+  waived('confirmDeletion')
     ? Promise.resolve(true)
     : ask({
         message: 'Remove this tile?',
@@ -159 +227 @@ export const askFormatChange = (propertyId: string, change: FormatChange): Promi
     true,
   )
 
-export const askEmptyTrash = async (count: number): Promise<boolean> => {
+export const askEmptyTrash = async (targets: readonly Asked[]): Promise<boolean> => {
   const { permanentDelete } = valueOr(await dialer().ask('delete:facts'), DELETE_FACTS_FALLBACK)
+  const [it, back] = targets.length > 1 ? ['They', 'them'] : ['It', 'it']
   return ask({
-    message: count === 1 ? 'Delete this Item?' : `Delete these ${itemCount(count)}?`,
+    message: deleteQuestion(targets),
     detail: permanentDelete
-      ? 'It will be erased from this computer. This cannot be undone.'
-      : 'It will move to your system trash, which is where you would get it back from.',
+      ? `${it} will be erased from this computer. This cannot be undone.`
+      : `${it} will move to your system trash, which is where you would get ${back} back from.`,
     action: 'Delete',
     tone: 'destructive',
     defaultsToCancel: true,
```

##### Core/Interface/Header/Banner.tsx

```/Core/Interface/Header/Banner.tsx diff
@@ -79 +79 @@ export function Banner({
   )
 }
 
-/** A homepage, Collection, Set, or Space's banner, titled by its renamable name. */
+/** A homepage, Collection, Set, or Space's banner, titled by its renamable name; `plain` seats the title as a bannerless owner's, with no image and no way to add one. */
 export function EntityBanner({
   owner,
   chrome = 'detail',
+  trailing,
+  plain,
 }: {
   owner: BannerOwner
   chrome?: 'detail' | 'window'
+  trailing?: ReactNode
+  plain?: true
 }): React.JSX.Element {
   const mutate = useSession((s) => s.mutate)
   const submitRename = useSession((s) => s.submitRename)
@@ -146 +150 @@ export function EntityBanner({
         })
       }
       search={search}
+      trailing={trailing}
     />
   )
   const iconPicker = home ? (
@@ -166 +171 @@ export function EntityBanner({
       }
     />
   )
+  const empty = (add?: () => void): React.JSX.Element => (
+    <div className={cx('banner-empty', surfaceClass)}>
+      {add && chrome === 'detail' && <AddBannerButton onClick={add} />}
+      <div className="banner-empty-title">{titleHeader}</div>
+    </div>
+  )
   return (
     <>
-      <Banner
-        path={owner.path}
-        kind={owner.kind}
-        value={owner.banner}
-        chrome={chrome}
-        className={surfaceClass}
-        titleClassName={cx('banner-title', search && 'is-searchable')}
-        onSearch={search?.start}
-        title={titleHeader}
-        empty={(add) => (
-          <div className={cx('banner-empty', surfaceClass)}>
-            {chrome === 'detail' && <AddBannerButton onClick={add} />}
-            <div className="banner-empty-title">{titleHeader}</div>
-          </div>
-        )}
-      />
+      {plain ? (
+        empty()
+      ) : (
+        <Banner
+          path={owner.path}
+          kind={owner.kind}
+          value={owner.banner}
+          chrome={chrome}
+          className={surfaceClass}
+          titleClassName={cx('banner-title', search && 'is-searchable')}
+          onSearch={search?.start}
+          title={titleHeader}
+          empty={empty}
+        />
+      )}
       {iconPicker}
     </>
   )
```

##### Core/Interface/Header/DetailTitleHeader.tsx

```/Core/Interface/Header/DetailTitleHeader.tsx diff
@@ -38 +38 @@ interface Props {
   iconEditing?: boolean
   search?: TitleSearch
   renameSummon?: number
+  /** Drawn after the title and its search's clear button, which pads against it. */
+  trailing?: React.ReactNode
 }
 
 export function DetailTitleHeader({
@@ -53 +55 @@ export function DetailTitleHeader({
   iconEditing,
   search,
   renameSummon,
+  trailing,
 }: Props): React.JSX.Element {
   const [editing, setEditing] = useState(false)
   const searching = search?.query != null
@@ -225 +228 @@ export function DetailTitleHeader({
       ) : (
         label
       )}
+      {trailing && <span className="detail-title-trailing">{trailing}</span>}
     </div>
   )
 }
```

##### Core/Interface/Header/content-banner.css

```/Core/Interface/Header/content-banner.css diff
@@ -56 +56 @@
 .banner-title .detail-title,
 .banner-empty-title .detail-title {
   --detail-title-size: var(--text-title-small-size);
+  --detail-title-trailing-size: var(--text-headline-size);
   min-width: 0;
 }
 .banner-title .detail-title-icon,
@@ -68 +69 @@
 .banner-title .detail-title-text,
 .banner-title .detail-title-input.detail-title-input,
 .banner-empty-title .detail-title-text,
-.banner-empty-title .detail-title-input.detail-title-input {
+.banner-empty-title .detail-title-input.detail-title-input,
+.banner-empty-title .detail-title-trailing {
   font-weight: var(--weight-semibold);
-  color: var(--label-primary);
 }
 
 /* Inset like every other title divider: the margin holds the content edges, so the rule stops where the title starts. */
```

##### Core/Interface/Header/content-title.css

```/Core/Interface/Header/content-title.css diff
@@ -4 +4 @@
   gap: 8px;
   min-width: 0;
   --detail-title-size: var(--text-title-medium-size);
+  --detail-title-trailing-size: var(--text-title-small-size);
 }
 
 .title-icon-reveal {
@@ -33 +34 @@
   border-radius: 6px;
 }
 .detail-title-text,
+.detail-title-input.detail-title-input,
+.detail-title-trailing {
+  font-weight: var(--weight-bold);
+  line-height: 1.15;
+}
+.detail-title-text,
 /* Doubled: the family reset also states `font`/`color` at this weight, and the title's own scale must win on specificity, not on stylesheet order. */
 .detail-title-input.detail-title-input {
   font-size: var(--detail-title-size);
-  font-weight: var(--weight-bold);
   color: var(--label-primary);
-  line-height: 1.15;
+}
+.detail-title-trailing {
+  flex: none;
+  font-size: var(--detail-title-trailing-size);
+  color: var(--label-secondary);
 }
 .detail-title-text {
   overflow: hidden;
```

##### Core/Interface/Menus/entityMenuActions.ts

```/Core/Interface/Menus/entityMenuActions.ts diff
@@ -26 +26 @@ import {
 import { popMenu } from '../../Actions/menuActions'
 import { createNamed, newPageAdjacent } from '../../Actions/createActions'
 import { useSession } from '../../Session/store'
-import { confirmDelete } from '../Confirm/confirmations'
+import { confirmArchive, confirmDelete } from '../Confirm/confirmations'
 import { runPageAction, runPathAction } from './pageMenuActions'
 
 function creatorsFor(target: EntityMenuTarget): Creator[] {
@@ -130 +130 @@ function runEntityAction(
     case 'title:newbelow':
       void newPageAdjacent(path, action === 'title:newabove' ? 'above' : 'below', target.host)
       return
-    case 'delete':
+    case 'title:archive':
+      void confirmArchive({ path, kind: 'set', title: target.title })
+      return
+    case 'title:delete':
       void confirmDelete(target)
       return
     case 'lock':
```

##### Core/Interface/Menus/pageMenuActions.ts

```/Core/Interface/Menus/pageMenuActions.ts diff
@@ -6 +6 @@ import { containerTargets } from '../../Actions/destinationTree'
 import { useSession } from '../../Session/store'
 import { pageIndexOf } from '../../Nexus/record'
 import { dialer } from '../../Platform/dialer'
-import { confirmDelete } from '../Confirm/confirmations'
+import { confirmArchive, confirmDelete } from '../Confirm/confirmations'
 import { popMenu } from '../../Actions/menuActions'
 import { PAGE_ACTION_ROWS } from '../../Actions/pageMenu'
 
@@ -61 +61 @@ export function runPageAction(
       )
       return true
     case 'title:history':
-      s.openHistory(ref)
+      s.openReader({ kind: 'history', page: ref })
+      return true
+    case 'title:archive':
+      void confirmArchive({ path, kind: 'page', title })
       return true
     case 'title:delete':
       void confirmDelete({ path, kind: 'page', title })
```

##### Core/Interface/Notifications/ActionLabel.tsx

```/Core/Interface/Notifications/ActionLabel.tsx diff
@@ -0 +1 @@
+import { useEffect, useRef, useState } from 'react'
+import { dismissNotification, useActionBar, useNotification } from './notifications'
+import { duration, ms } from '@pommora/uix/Animations/motion'
+import { paneSlide } from '@pommora/uix/Animations/paneSlide'
+import { Swap } from '@pommora/uix/Animations/Swap'
+import { Button } from '@pommora/uix/Buttons/Button'
+import { ProgressBar, paintProgress } from '@pommora/uix/Elements/ProgressBar'
+import { useHeld } from '@pommora/uix/Animations/useExitPresence'
+import { cx } from '@pommora/uix/Utilities/cx'
+import { Segments } from '@pommora/uix/Elements/Segments'
+import * as s from './action-label.css'
+import { clamp } from '@pommora/uix/Utilities/clamp'
+import { trackNear, withinBox } from '@pommora/uix/Interactions/hoverReveal'
+
+const BASE_MS = ms(duration.base)
+const MAX_STEP_MS = 100
+
+export function ActionLabel(): React.JSX.Element {
+  const note = useNotification()
+  const bar = useActionBar()
+  const hostRef = useRef<HTMLDivElement>(null)
+  const progressRef = useRef<HTMLSpanElement>(null)
+  const nearRef = useRef(false)
+  const [shown, setShown] = useState(false)
+
+  useEffect(() => {
+    if (!note) {
+      setShown(false)
+      return
+    }
+    if (progressRef.current) paintProgress(progressRef.current, 1)
+    nearRef.current = false
+    setShown(true)
+  }, [note])
+
+  useEffect(() => {
+    if (!note || !shown) return
+    let raf = 0
+    let spent = 0
+    let rate = 1
+    let last = performance.now()
+    const tick = (now: number): void => {
+      // rAF stops while the window is hidden, so the gap on return is absence, not dwell.
+      const step = Math.min(now - last, MAX_STEP_MS)
+      last = now
+      rate = clamp(rate + (nearRef.current ? -step : step) / BASE_MS, 0, 1)
+      spent += step * rate
+      const remaining = 1 - spent / s.DWELL_MS
+      if (progressRef.current) paintProgress(progressRef.current, remaining)
+      if (remaining > 0) raf = requestAnimationFrame(tick)
+      else setShown(false)
+    }
+    raf = requestAnimationFrame(tick)
+    return () => cancelAnimationFrame(raf)
+  }, [note, shown])
+
+  useEffect(() => {
+    if (!note || shown) return
+    const t = setTimeout(() => dismissNotification(note.id), BASE_MS)
+    return () => clearTimeout(t)
+  }, [note, shown])
+
+  // Proximity rather than hover: the pointer heading for the action reaches the drain before it does, so the label can't leave out from under a reach. A press holds the drain where it stands. A notice stays unarmed until the pointer has been seen outside its band once, since the press that posted it can leave the pointer inside; one posted with the pointer on the label itself, as a press of the bar's own leaves it, arms at once.
+  useEffect(() => {
+    const host = hostRef.current
+    if (!note || !shown || !host) return
+    let armed = host.matches(':hover')
+    return trackNear({
+      anchor: host,
+      measure: () => {
+        const box = host.getBoundingClientRect()
+        return (x, y) => withinBox(box, x, y, s.NEAR_RADIUS)
+      },
+      report: (at) => {
+        if (at === 'held') return
+        armed ||= at !== 'near'
+        nearRef.current = armed && at === 'near'
+      },
+    }).stop
+  }, [note, shown])
+
+  const face = note && shown ? 'notice' : bar ? 'bar' : null
+  const open = face !== null
+  // Held so the label paints its own exit, and cross-fades between faces, instead of retracting or fading to an empty one.
+  const held = useHeld(note, note !== null)
+  const heldBar = useHeld(bar, bar !== null)
+  const heldFace = useHeld(face, open)
+  const error = heldFace === 'notice' && held?.tone === 'error'
+
+  return (
+    <div
+      ref={hostRef}
+      className={cx(s.host, paneSlide({ side: 'right', mode: 'overlay', open }), error && s.error)}
+      role={error ? 'alert' : 'status'}
+      inert={!open}
+    >
+      <Swap
+        className={s.faces}
+        swapped={heldFace === 'notice'}
+        from={
+          heldBar && (
+            <span className={s.row}>
+              <span className={s.message}>
+                <Segments
+                  parts={[
+                    <Button
+                      key="restore"
+                      type="filled"
+                      size="button-inline"
+                      label="Restore"
+                      onClick={heldBar.restore}
+                    />,
+                    heldBar.count,
+                  ]}
+                />
+              </span>
+              <Button
+                type="destructive"
+                size="button-inline"
+                icon="trash"
+                iconSize="body"
+                title="Delete"
+                onClick={heldBar.remove}
+              />
+            </span>
+          )
+        }
+        to={
+          <span className={s.face}>
+            <span className={s.row}>
+              <span className={s.message}>
+                {held?.segment ? <Segments parts={[held.message, held.segment]} /> : held?.message}
+              </span>
+              {held?.action ? (
+                <button
+                  type="button"
+                  className={s.action}
+                  onClick={() => {
+                    if (!shown) return
+                    void held.action?.run()
+                    setShown(false)
+                  }}
+                >
+                  {held.action.label}
+                </button>
+              ) : null}
+            </span>
+            <ProgressBar ref={progressRef} fill={1} />
+          </span>
+        }
+      />
+    </div>
+  )
+}
```

##### Core/Interface/Notifications/NotificationLabel.tsx

```/Core/Interface/Notifications/NotificationLabel.tsx diff
@@ -1 +0 @@
-import { useEffect, useRef, useState } from 'react'
-import { dismissNotification, useNotification } from './notifications'
-import { duration, ms } from '@pommora/uix/Animations/motion'
-import { paneSlide } from '@pommora/uix/Animations/paneSlide'
-import { ProgressBar, paintProgress } from '@pommora/uix/Elements/ProgressBar'
-import { useHeld } from '@pommora/uix/Animations/useExitPresence'
-import { cx } from '@pommora/uix/Utilities/cx'
-import { Segments } from '@pommora/uix/Elements/Segments'
-import * as s from './notification-label.css'
-import { clamp } from '@pommora/uix/Utilities/clamp'
-import { trackNear, withinBox } from '@pommora/uix/Interactions/hoverReveal'
-
-const BASE_MS = ms(duration.base)
-const MAX_STEP_MS = 100
-
-export function NotificationLabel(): React.JSX.Element {
-  const note = useNotification()
-  const hostRef = useRef<HTMLDivElement>(null)
-  const barRef = useRef<HTMLDivElement>(null)
-  const nearRef = useRef(false)
-  const [shown, setShown] = useState(false)
-
-  useEffect(() => {
-    if (!note) {
-      setShown(false)
-      return
-    }
-    if (barRef.current) paintProgress(barRef.current, 1)
-    nearRef.current = false
-    setShown(true)
-  }, [note])
-
-  useEffect(() => {
-    if (!note || !shown) return
-    let raf = 0
-    let spent = 0
-    let rate = 1
-    let last = performance.now()
-    const tick = (now: number): void => {
-      // rAF stops while the window is hidden, so the gap on return is absence, not dwell.
-      const step = Math.min(now - last, MAX_STEP_MS)
-      last = now
-      rate = clamp(rate + (nearRef.current ? -step : step) / BASE_MS, 0, 1)
-      spent += step * rate
-      const remaining = 1 - spent / s.DWELL_MS
-      if (barRef.current) paintProgress(barRef.current, remaining)
-      if (remaining > 0) raf = requestAnimationFrame(tick)
-      else setShown(false)
-    }
-    raf = requestAnimationFrame(tick)
-    return () => cancelAnimationFrame(raf)
-  }, [note, shown])
-
-  useEffect(() => {
-    if (!note || shown) return
-    const t = setTimeout(() => dismissNotification(note.id), BASE_MS)
-    return () => clearTimeout(t)
-  }, [note, shown])
-
-  // Proximity rather than hover: the pointer heading for the action reaches the drain before it does, so the label can't leave out from under a reach. A press holds the drain where it stands.
-  useEffect(() => {
-    const host = hostRef.current
-    if (!note || !shown || !host) return
-    return trackNear({
-      anchor: host,
-      measure: () => {
-        const box = host.getBoundingClientRect()
-        return (x, y) => withinBox(box, x, y, s.NEAR_RADIUS)
-      },
-      report: (at) => {
-        if (at !== 'held') nearRef.current = at === 'near'
-      },
-    }).stop
-  }, [note, shown])
-
-  // Held so the label paints its own exit instead of retracting empty.
-  const held = useHeld(note, note !== null)
-
-  return (
-    <div
-      ref={hostRef}
-      className={cx(
-        s.host,
-        paneSlide({ side: 'right', mode: 'overlay', open: shown }),
-        held?.tone === 'error' && s.error,
-      )}
-      role={held?.tone === 'error' ? 'alert' : 'status'}
-      inert={!shown}
-    >
-      <div className={s.row}>
-        <span className={s.message}>
-          {held?.segment ? <Segments parts={[held.message, held.segment]} /> : held?.message}
-        </span>
-        {held?.action ? (
-          <button
-            type="button"
-            className={s.action}
-            onClick={() => {
-              if (!shown) return
-              void held.action?.run()
-              setShown(false)
-            }}
-          >
-            {held.action.label}
-          </button>
-        ) : null}
-      </div>
-      <ProgressBar ref={barRef} fill={1} />
-    </div>
-  )
-}
```

##### Core/Interface/Notifications/action-label.css.ts

```/Core/Interface/Notifications/action-label.css.ts diff
@@ -15 +15 @@ export const host = style({
   zIndex: stack.top.interrupt,
   display: 'flex',
   flexDirection: 'column',
-  gap: SIZE.padX,
   minWidth: 220,
   maxWidth: 420,
   padding: SIZE.roomyPadX,
@@ -29 +28 @@ export const host = style({
 
 export const error = style({ borderColor: 'var(--error)' })
 
+export const faces = style({ placeItems: 'stretch' })
+
+export const face = style({ display: 'flex', flexDirection: 'column', gap: SIZE.padX })
+
 export const row = style({
   display: 'flex',
   alignItems: 'center',
```

##### Core/Interface/Notifications/notifications.ts

```/Core/Interface/Notifications/notifications.ts diff
@@ -1 +1 @@
-// Store-free, since the slices report through these writers: the notice on screen lives here, beside them.
-import { useSyncExternalStore } from 'react'
+// Store-free, since the slices report through these writers: the notice on screen and the bar the shown view declares live here, beside them.
+import { useEffect, useSyncExternalStore } from 'react'
 import type { Result } from '../../Contract/result'
 import { pushUndo } from '../../Session/undo'
 import type { CascadeReport } from '../../Nexus/cascade'
@@ -7 +7 @@ import type { Unreadable } from '../../Nexus/tree'
 import { titleFromPath } from '../../Paths/posix'
 import { inTurns } from '../../Platform/inTurns'
 import { channel } from '@pommora/uix/Utilities/subscribable'
+import { useHostShown } from '../contentHost'
 
 export interface Notification {
   message: string
@@ -24 +25 @@ export const currentNotification = shown.get
 
 export const useNotification = (): Posted | null => useSyncExternalStore(shown.subscribe, shown.get)
 
+/** What a shown view offers for its checked rows: the count the bar reads and the two actions it runs. */
+export interface ActionBar {
+  count: string
+  restore: () => void
+  remove: () => void
+}
+
+const declared = channel<ActionBar | null>(null)
+
+export const useActionBar = (): ActionBar | null =>
+  useSyncExternalStore(declared.subscribe, declared.get)
+
+/** Declared only while its view shows, as the count publishes: a parked view's bar would stand over another tab's view. */
+export function useDeclareActions(bar: ActionBar | null): void {
+  const shown = useHostShown()
+  useEffect(() => {
+    if (!shown) return
+    declared.set(bar)
+    return () => declared.set(null)
+  }, [shown, bar])
+}
+
 export function dismissNotification(id: number): void {
   if (shown.get()?.id === id) shown.set(null)
 }
@@ -81 +104 @@ export const persist = (
 export const unrestoredLine = (titles: string[]): string =>
   `${titles.join(', ')} didn’t get ${titles.length === 1 ? 'its' : 'their'} value back.`
 
-export function notifyDeleted(
-  title: string,
+/** One notice for what an action did: its head, an optional segment, and whatever didn't go as asked, which marks it failed and offers the retry. */
+export function notifyOutcome(
+  head: string,
+  segment: string | undefined,
+  unmet: (string | false | undefined)[],
   undo?: () => void | Promise<void>,
-  { pages = [], warning }: Partial<Pick<CascadeReport, 'pages' | 'warning'>> = {},
   retry?: () => void,
 ): () => void {
-  const parts = [`Deleted “${title}”`]
-  if (pages.length) parts.push(`${pages.length} Internal ${pages.length === 1 ? 'Link' : 'Links'}`)
-  if (warning) parts[parts.length - 1] += `. ${warning}`
-  const [message, segment] = parts
+  const lines = unmet.filter(Boolean)
+  const parts = segment ? [head, segment] : [head]
+  if (lines.length) parts[parts.length - 1] += `. ${lines.join(' ')}`
+  const failed = lines.length > 0
   return notifyUndoable(
-    message,
+    parts[0],
     undo,
-    warning ? 'error' : 'normal',
-    warning ? retry : undefined,
-    segment,
+    failed ? 'error' : 'normal',
+    failed ? retry : undefined,
+    parts[1],
   )
 }
 
+export function notifyDeleted(
+  title: string,
+  undo?: () => void | Promise<void>,
+  { pages = [], warning }: Partial<Pick<CascadeReport, 'pages' | 'warning'>> = {},
+  retry?: () => void,
+): () => void {
+  const links = pages.length
+    ? `${pages.length} Internal ${pages.length === 1 ? 'Link' : 'Links'}`
+    : undefined
+  return notifyOutcome(`Deleted “${title}”`, links, [warning], undo, retry)
+}
+
 const undoing = inTurns()
 
 /** Answers a spend: once what the undo would reverse is undone some other way, its label leaves and the chord passes it by. */
```

##### Core/Interface/Sidebar/Sidebar.tsx

```/Core/Interface/Sidebar/Sidebar.tsx diff
@@ -31 +31 @@ import type {
 import { placementOf, type SidebarMode } from '../../Settings/personalization'
 import { DEFAULT_NEW_NAME, type MutateRequest } from '../../Nexus/mutateRequest'
 import type { NodeKind } from '../../Nexus/entities'
+import { isTopContainer } from '../../Nexus/treePatch'
 import { type Creator, spaceCreator } from '../../Actions/createMenu'
 import { nodesByIdOf } from '../../Nexus/treeIndex'
 import { SidebarDnd } from './sidebarDnd'
@@ -202 +203 @@ function GhostLeaf({
 // An arrow rather than a named function, so the recursion inside renders the memoized row.
 const ContainerRow = memo(
   ({ node, depth }: { node: CollectionNode | SetNode; depth: number }): React.JSX.Element => {
-    const selectable = useSetting('openFoldersOnTitleClick') || depth <= 1
+    const selectable = useSetting('openFoldersOnTitleClick') || isTopContainer(node)
     const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
     const mutate = useSession((s) => s.mutate)
     const placement = useSession((s) => placementOf(personalizationOf(s), node.kind))
```

##### Core/Interface/Subfield/crumbs.ts

```/Core/Interface/Subfield/crumbs.ts diff
@@ -4 +4 @@ import { type ContainerKind, isContainer } from '../../Nexus/entities'
 import type { SelectionState, SelectTarget } from '../../Navigation/navRef'
 import { titleFromPath } from '../../Paths/posix'
 import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
-import { ancestryOf, type TrailNode, findSpace } from '../../Nexus/treeIndex'
+import { ancestryOf, type TrailNode, findSpace, nodesByIdOf } from '../../Nexus/treeIndex'
+import { ARCHIVE_ICON, ARCHIVE_TITLE } from '../../Archive/archivePlace'
+import { isTopContainer } from '../../Nexus/treePatch'
 
 type SpineTarget = Extract<SelectTarget, { kind: ContainerKind | 'page' }>
 
@@ -47 +49 @@ export function subfieldCrumbs(
   foldersOpen: boolean,
 ): TrailSegment[] {
   if (!tree) return []
+  const crumbsOver = (spine: TrailNode[], currentPos: number): TrailSegment[] =>
+    spine.map((node, i) => {
+      const forwardCrumb = i > currentPos
+      const navigable = forwardCrumb || (i < currentPos && (isTopContainer(node) || foldersOpen))
+      const target = navigable ? targetOf(node) : null
+      return {
+        title: node.title,
+        ghost: forwardCrumb || undefined,
+        onSelect: target
+          ? (e: React.MouseEvent) => navigate(target, forwardCrumb ? 'forward' : 'back', isCmd(e))
+          : undefined,
+      }
+    })
   switch (selection.kind) {
     case 'none':
     case 'matrix':
@@ -71 +86 @@ export function subfieldCrumbs(
         currentChain.every((n, i) => n.id === deepChain[i]?.id)
           ? deepChain
           : currentChain
-      return spine.map((node, i) => {
-        const forwardCrumb = i > currentPos
-        // Up the spine the collection (0) and depth-1 set (1) open a detail surface; deeper Sets open only when folders do.
-        const navigable = forwardCrumb || (i < currentPos && (i <= 1 || foldersOpen))
-        const target = navigable ? targetOf(node) : null
-        return {
-          title: node.title,
-          ghost: forwardCrumb || undefined,
-          onSelect: target
-            ? (e: React.MouseEvent) => navigate(target, forwardCrumb ? 'forward' : 'back', isCmd(e))
-            : undefined,
-        }
-      })
+      return crumbsOver(spine, currentPos)
+    }
+    case 'archive': {
+      const owner = nodesByIdOf(tree).get(selection.id)
+      if (!owner) return []
+      return crumbsOver(
+        [
+          ...owner.parents,
+          owner,
+          {
+            kind: 'archive',
+            id: owner.id,
+            title: ARCHIVE_TITLE,
+            path: owner.path,
+            icon: ARCHIVE_ICON,
+          },
+        ],
+        owner.parents.length + 1,
+      )
     }
   }
 }
```

##### Core/Interface/Subfield/publish.ts

```/Core/Interface/Subfield/publish.ts diff
@@ -1 +1 @@
 import { useCallback, useEffect } from 'react'
 import type { PageStats } from '../../MarkdownPM/Engine/subfieldStats'
 import { useSession } from '../../Session/store'
-import { useContentHost } from '../contentHost'
+import { useHostShown } from '../contentHost'
 
 /** The shown content view publishes its own resolved count, because the Subfield renders beside it and never sees the pipeline that produced the rows. */
 export function usePublishCount(count: number | null): void {
   const setDetailCount = useSession((s) => s.setDetailCount)
-  const host = useContentHost()
-  const shown = host !== null && !host.parked
+  const shown = useHostShown()
   useEffect(() => {
     if (shown) setDetailCount(count)
   }, [shown, count, setDetailCount])
```

##### Core/Interface/Subfield/subfieldItems.tsx

```/Core/Interface/Subfield/subfieldItems.tsx diff
@@ -18 +18 @@ export const DEFAULT_ITEMS: Record<SelectionState['kind'], SubfieldItemId[]> = {
   collection: ['count'],
   set: ['count'],
   page: ['pageStats'],
+  archive: ['count'],
 }
 
 /** A highlight retires the document's own figures: what is measured is what is selected, and the caret alone restores the whole page. */
```

##### Core/Interface/Toolbar/SettingsMenu.tsx

```/Core/Interface/Toolbar/SettingsMenu.tsx diff
@@ -21 +21 @@ function scopePane(kind: SelectionState['kind']): React.JSX.Element | null {
       return <HomepageMenu />
     case 'matrix':
       return <MatrixMenu />
+    case 'archive':
     case 'none':
       return <div style={{ minHeight: 24 }} />
   }
```

##### Core/Interface/Windows/PageReaderWindow.tsx

```/Core/Interface/Windows/PageReaderWindow.tsx diff
@@ -5 +5 @@ import { fetchPageValues } from '../../Properties/pageRow'
 import { relDirname } from '../../Paths/posix'
 import { Button } from '@pommora/uix/Buttons/Button'
 import { Checkbox } from '@pommora/uix/Controls/Checkbox'
-import { NavTrail } from '@pommora/uix/Elements/NavTrail'
+import { NavTrail, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
 import { MenuFooting, MenuItem, MenuSeparator } from '@pommora/uix/Menus'
 import { Segments } from '@pommora/uix/Elements/Segments'
 import { gutter } from '@pommora/uix/Menus/menu-row.css'
 import { useHeldPresence } from '@pommora/uix/Animations/useExitPresence'
-import { retained, toggled } from '@pommora/uix/Utilities/checkSet'
+import { actedOn, retained, toggled } from '@pommora/uix/Utilities/checkSet'
+import { Icon } from '@pommora/uix/Symbols'
 import { MarkdownEditor } from '../../MarkdownPM/MarkdownEditor'
 import { useEditorHost } from '../../Pages/editorHost'
 import { clockOf, formatDate } from '../../Properties/formatValue'
 import { pageWriter } from '../../Session/saveScheduler'
-import { fetchPageDetail } from '../../Session/pageDetailCache'
+import { storesChanged } from '../../Session/nexusSlice'
 import { livePagePath } from '../../Nexus/record'
 import { trailOf } from '../../Nexus/treeIndex'
 import { useConnections } from '../../Session/pageConnections'
 import { useSession, useSetting } from '../../Session/store'
+import type { Reader } from '../../Session/windowSlice'
 import type { PageTarget } from '../../Navigation/navRef'
 import { askDeleteSnapshots, askRestoreSnapshot } from '../Confirm/confirmations'
-import { WINDOW_BASE_PANEL, WindowBase } from '@pommora/uix/Windows/WindowBase'
+import {
+  WINDOW_BASE_PANEL,
+  WindowBase,
+  type WindowBasePanel,
+} from '@pommora/uix/Windows/WindowBase'
 import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
 import { dialer } from '../../Platform/dialer'
 import { popMenu } from '../../Actions/menuActions'
-import { fileHistoryMenuItems } from '../../Actions/fileHistoryMenu'
+import { restoreMenuItems } from '../../Actions/restoreMenu'
 import { useWindowGeometry } from './useWindowGeometry'
 import '../../Navigation/nav-list.css'
 import '../../Tiles/tile-base.css'
 import './page-window.css'
 
-// A non-path host chain: embeds inside a snapshot render inert, and no page path can collide with it.
-const HISTORY_ANCESTOR = 'page-history'
+// A non-path host chain: embeds inside the reader render inert, and no page path can collide with it.
+const READER_ANCESTOR = 'page-reader'
+
+type Branch<K extends Reader['kind']> = { reader: Extract<Reader, { kind: K }>; closing: boolean }
 
 async function restoreFromHistory(target: PageTarget, ts: number): Promise<Result<null>> {
   const { tree, replaceBody } = useSession.getState()
@@ -45 +53 @@ async function restoreFromHistory(target: PageTarget, ts: number): Promise<Resul
     : fault('The page was restored but could not be reread.')
 }
 
-export function PageHistoryWindow(): React.JSX.Element | null {
-  const target = useSession((s) => s.historyTarget)
-  const shown = useHeldPresence(target, 'fast')
+export function PageReaderWindow(): React.JSX.Element | null {
+  const reader = useSession((s) => s.reader)
+  const shown = useHeldPresence(reader, 'fast')
   if (!shown) return null
-  return <PageHistoryBody key={shown.held.id} target={shown.held} closing={shown.closing} />
+  const { held, closing } = shown
+  switch (held.kind) {
+    case 'history':
+      return <HistoryReader key={`history:${held.page.id}`} reader={held} closing={closing} />
+    case 'archive':
+      return <ArchiveReader key={`archive:${held.page.path}`} reader={held} closing={closing} />
+  }
 }
 
-function PageHistoryBody({
-  target,
+/** The one read-only page window: the lock where the open-fullscreen glyph sits, an inert editor, and a trail that names the page without renaming it. Both branches read a page’s body uncached through `page:open`, one read for either kind. */
+function ReaderShell({
+  reader,
   closing,
+  ariaLabel,
+  trail,
+  body,
+  embedPath,
+  right,
 }: {
-  target: PageTarget
+  reader: Reader
   closing: boolean
+  ariaLabel: string
+  trail: TrailSegment[]
+  body: string | null
+  embedPath: string
+  right?: WindowBasePanel
 }): React.JSX.Element {
-  const closeHistory = useSession((s) => s.closeHistory)
-  const geometry = useWindowGeometry('page-history')
+  const closeReader = useSession((s) => s.closeReader)
+  const geometry = useWindowGeometry('page-reader')
+  const resolveOnly = useConnections('inert')
+  const editorHost = useEditorHost({ connections: resolveOnly, inert: true })
+  return (
+    <WindowBase
+      {...geometry}
+      closing={closing}
+      onClose={closeReader}
+      raiseOn={reader}
+      ariaLabel={ariaLabel}
+      lead={
+        <span className="reader-lock" role="img" aria-label="Read Only" title="Read Only">
+          <Icon name="lock" size="body" />
+        </span>
+      }
+      title={
+        <div className="window-toolbar-title">
+          <NavTrail segments={trail} selected className="page-window-crumbs" />
+        </div>
+      }
+      right={right}
+    >
+      <div className="window-body scroll-fade page-tile-grows">
+        {body !== null && (
+          <div className="page-tile page-reader-page">
+            <MarkdownEditor
+              initialBody={body}
+              onChange={() => {}}
+              host={editorHost}
+              readOnly
+              embedAncestors={[READER_ANCESTOR, embedPath]}
+              edgeFade
+            />
+          </div>
+        )}
+      </div>
+      <Scrollbar page />
+    </WindowBase>
+  )
+}
+
+function HistoryReader({ reader, closing }: Branch<'history'>): React.JSX.Element {
+  const target = reader.page
   const tree = useSession((s) => s.tree)
   const nexusClock = useSetting('timeFormat')
   const dateFormat = useSetting('dateFormat')
@@ -103 +170 @@ function PageHistoryBody({
     setBody(null)
     const read =
       shown === null
-        ? fetchPageDetail(livePath).then((d) => d?.body ?? null)
+        ? dialer()
+            .ask('page:open', livePath)
+            .then((r) => valueOr(r, null)?.body ?? null)
         : dialer()
             .ask('history:read', target.id, shown)
             .then((r) => valueOr(r, null))
@@ -115 +184 @@ function PageHistoryBody({
     }
   }, [shown, reload, target.id, livePath])
 
-  const resolveOnly = useConnections('inert')
-  const editorHost = useEditorHost({ connections: resolveOnly, inert: true })
   const trail = trailOf(tree, { kind: 'page', id: target.id })
 
   const toggle = (ts: number): void => setChecked((prev) => toggled(prev, ts))
@@ -137 +204 @@ function PageHistoryBody({
     await refresh()
   }
   const openMenu = async (ts: number): Promise<void> => {
-    const keys = checked.has(ts) ? [...checked] : [ts]
-    const action = await popMenu(fileHistoryMenuItems(keys.length > 1))
+    const keys = actedOn(checked, rows, ts, (t) => t)
+    const action = await popMenu(restoreMenuItems({ batch: keys.length > 1, restoresBatch: false }))
     if (action === 'restore') await restore(ts)
     else if (action === 'delete') await remove(keys)
   }
@@ -221 +288 @@ function PageHistoryBody({
   )
 
   return (
-    <WindowBase
-      {...geometry}
+    <ReaderShell
+      reader={reader}
       closing={closing}
-      onClose={closeHistory}
-      raiseOn={target}
       ariaLabel="File History"
-      title={
-        <div className="window-toolbar-title">
-          <NavTrail segments={trail} selected className="page-window-crumbs" />
-        </div>
-      }
+      trail={trail}
+      body={body}
+      embedPath={livePath}
       right={{
         windowId: 'page-history-list',
         bounds: WINDOW_BASE_PANEL,
@@ -239 +302 @@ function PageHistoryBody({
         open: true,
         children: list,
       }}
-    >
-      <div className="window-body scroll-fade page-tile-grows">
-        {body !== null && (
-          <div className="page-tile page-history-page">
-            <MarkdownEditor
-              initialBody={body}
-              onChange={() => {}}
-              host={editorHost}
-              readOnly
-              embedAncestors={[HISTORY_ANCESTOR, livePath]}
-              edgeFade
-            />
-          </div>
-        )}
-      </div>
-      <Scrollbar page />
-    </WindowBase>
+    />
+  )
+}
+
+/** An archived page as it stood when opened, read uncached, and closed once a change to either store leaves its file gone. */
+function ArchiveReader({ reader, closing }: Branch<'archive'>): React.JSX.Element {
+  const closeReader = useSession((s) => s.closeReader)
+  const { path } = reader.page
+  const [body, setBody] = useState<string | null>(null)
+  useEffect(() => {
+    let live = true
+    const read = (): void =>
+      void dialer()
+        .ask('page:open', path)
+        .then((r) => {
+          if (!live) return
+          if (r.ok) setBody((was) => was ?? r.value.body)
+          else closeReader()
+        })
+    read()
+    const stop = storesChanged.subscribe(read)
+    return () => {
+      live = false
+      stop()
+    }
+  }, [path, closeReader])
+  return (
+    <ReaderShell
+      reader={reader}
+      closing={closing}
+      ariaLabel="Archived Page"
+      trail={reader.trail}
+      body={body}
+      embedPath={path}
+    />
   )
 }
```

##### Core/Interface/Windows/page-window.css

```/Core/Interface/Windows/page-window.css diff
@@ -27 +27 @@
 .page-history-row {
   --row-pad-trail: 2px;
 }
-/* A snapshot is a record, not a writing surface: the text stays selectable, but no caret ever seats in it and the pointer keeps its arrow. */
-.page-history-page .mdpm-caret-layer {
+/* A read-only page is a record, not a writing surface: the text stays selectable, but no caret ever seats in it and the pointer keeps its arrow. */
+.page-reader-page .mdpm-caret-layer {
   display: none;
 }
-.page-history-page .cm-editor .cm-scroller .cm-content {
+.page-reader-page .cm-editor .cm-scroller .cm-content {
   cursor: default;
 }
+/* At an inline button's height, so the glyph sits level with the window's other toolbar controls. */
+.reader-lock {
+  display: inline-flex;
+  align-items: center;
+  height: 20px;
+  padding-inline: 2px;
+}
```

##### Core/Matrix/matrixGraph.ts

```/Core/Matrix/matrixGraph.ts diff
@@ -1 +1 @@
 import { readPageRelations } from '../Index/contentIndex'
 import { ID_KEY } from '../Nexus/identityMark'
+import { isArchived } from '../Paths/nexusPaths'
 import type { PageRelationRow } from '../Platform/stores'
 import { pageValuesOf } from '../Views/pageValues'
 import type { PageValues } from '../Views/viewRow'
@@ -15 +16 @@ export interface MatrixGraphReply {
   ids?: string[]
 }
 
-// `null` when there is no index yet; the renderer keeps what it holds and the next push refetches. Without values, the store reads each page's ID alone. An ask for named paths also answers every page id at them, linked or not, so the renderer lets go of the rows a moved page held under its old path.
+// `null` when there is no index yet; the renderer keeps what it holds and the next push refetches. Without values, the store reads each page's ID alone. An ask for named paths also answers every page id at them, linked or not, so the renderer lets go of the rows a moved page held under its old path. An archived page answers nothing, so it draws no node and no edge.
 export function readMatrixGraph(withValues: boolean, paths?: string[]): MatrixGraphReply | null {
   const rows = readPageRelations(paths, withValues ? undefined : ID_KEY)
   if (!rows) return null
@@ -23 +24 @@ export function readMatrixGraph(withValues: boolean, paths?: string[]): MatrixGr
   const values: MatrixGraphReply['values'] = withValues ? {} : null
   for (const [path, page] of Object.entries(rows.pages)) {
     const id = page.values[ID_KEY]
-    if (typeof id !== 'string') continue
+    if (typeof id !== 'string' || isArchived(path)) continue
     idOf.set(path, id)
     if (values) values[id] = pageValuesOf(id, page.values, page.mtimeMs)
   }
```

##### Core/Navigation/navRef.ts

```/Core/Navigation/navRef.ts diff
@@ -7 +7 @@ type NodeTarget = {
     : { kind: K; id: string }
 }[NodeKind]
 
+/** A Collection's or a top-level Set's Archive, addressed by its owner's id: a place of its own, not a node. */
+type ArchiveTarget = { kind: 'archive'; id: string }
+
 export type SelectionState =
   | { kind: 'none' }
   | { kind: 'homepage' }
   | { kind: 'matrix' }
   | NodeTarget
+  | ArchiveTarget
 
 export type SelectTarget = Exclude<SelectionState, { kind: 'none' }>
 
@@ -31 +35 @@ export function selectTargetOf(t: { kind: NodeKind; id: string; path: string }):
 export type PageTarget = Extract<SelectTarget, { kind: 'page' }>
 export type SpaceTarget = Extract<SelectTarget, { kind: 'space' }>
 
-export type NavRef = { kind: 'homepage' } | { kind: 'matrix' } | { kind: NodeKind; id: string }
+export type NavRef =
+  | { kind: 'homepage' }
+  | { kind: 'matrix' }
+  | { kind: NodeKind; id: string }
+  | ArchiveTarget
 
 export const isSingleton = (t: { kind?: unknown }): t is { kind: 'homepage' | 'matrix' } =>
   t.kind === 'homepage' || t.kind === 'matrix'
@@ -48 +56 @@ const NAV_KINDS: ReadonlySet<string> = new Set<NavRef['kind']>([
   'homepage',
   'matrix',
   ...NODE_KINDS,
+  'archive',
 ])
 
 export function isNavRef(v: unknown): v is NavRef {
```

##### Core/Navigation/tabsModel.ts

```/Core/Navigation/tabsModel.ts diff
@@ -27 +27 @@ export function pinTabId(target: SelectTarget): string {
 }
 
 export function liveTarget(index: ReconcileIndex, ref: NavRef): SelectTarget | null {
-  const probe = isSingleton(ref) ? ref : selectTargetOf({ ...ref, path: '' })
+  const probe =
+    isSingleton(ref) || ref.kind === 'archive' ? ref : selectTargetOf({ ...ref, path: '' })
   const r = reconcileWith(index, probe)
   return r.kind === 'none' ? null : r
 }
```

##### Core/Nexus/cascade.ts

```/Core/Nexus/cascade.ts diff
@@ -7 +7 @@ import { splitEnvelope, mergeFrontmatter, splitFrontmatter, stampedId } from '..
 import {
   type Rewrite,
   type RewriteText,
+  governedReach,
   governedRoot,
+  outsideArchive,
   sweepGovernedRoots,
   unsweptLine,
 } from '../Properties/governedSweep'
@@ -16 +18 @@ import { editCaches } from '../Properties/propertyCache'
 import { heldTreeOf, liveTreeOf } from './liveTree'
 import { pageIndexOf, pagesOf } from './record'
 import type { NexusTree } from './tree'
-import { withheldIn } from './treePatch'
 import { rewriteConnections, rewriteHeadingConnections } from '../Connections/rewrite'
 import { headingOutline } from '../MarkdownPM/Engine/headingScan'
 import { queryMentions } from '../Index/contentIndex'
@@ -29 +30 @@ import type { TilesChanged } from '../Tiles/tiles'
 import { linkEntry } from '../Connections/linkValue'
 import { buildPageIndex, pageKey, pathKeys } from '../Connections/pageIndex'
 import { gonePageEntry } from '../Properties/propertyValue'
-import { liveIdIndex, livePathOf } from './heldPages'
+import { addressable, nexusPages } from './heldPages'
 import { ID_KEY } from './identityMark'
 import { asString } from './coerce'
 
 export interface CascadeReport {
+  /** The Nexus paths written outside the Archive, which feed the `pages:changed` push; nothing displays an archived path. */
   pages: string[]
   hosts: TilesChanged[]
   warning?: string
@@ -57 +59 @@ interface DeleteCascade {
   links: StrippedLink[]
 }
 
+const NO_STRIP: DeleteCascade = { cascade: { pages: [], hosts: [] }, links: [] }
+
 /** A sweep's Space sidecar arm, planned only when a Space the tree holds answers `rewrite`, since the arm reads every Space sidecar. */
-const spaceArm = (tree: NexusTree | null, rewrite: Rewrite): { sidecars?: Rewrite } =>
-  tree?.contexts.some((g) => g.spaces.some((s) => s.values && rewrite(s.values, '') !== null))
+const spaceArm = (tree: NexusTree, rewrite: Rewrite): { sidecars?: Rewrite } =>
+  tree.contexts.some((g) => g.spaces.some((s) => s.values && rewrite(s.values, '') !== null))
     ? { sidecars: rewrite }
     : {}
 
@@ -69 +73 @@ export const joinCascades = (a: CascadeReport, b: CascadeReport): CascadeReport
   warning: [a.warning, b.warning].filter(Boolean).join(' ') || undefined,
 })
 
-/** A delete strips every Link property value naming a page it took, by any key that now resolves to nothing, from the pages and Spaces the tree holds outside it; a key a page outside still answers is left to that page, and bodies keep their links and read unresolved. Nothing at or under `abs` is swept, since it left with the delete. */
+/** `cascade` joined with the line counting the files in “title” whose links couldn't be written. */
+export function withUnswept(
+  cascade: CascadeReport | undefined,
+  title: string,
+  unswept: readonly string[],
+): CascadeReport | undefined {
+  if (!unswept.length) return cascade
+  const left = {
+    pages: [],
+    hosts: [],
+    warning: unsweptLine(unswept.length, `links in “${title}” across `),
+  }
+  return cascade ? joinCascades(cascade, left) : left
+}
+
+/** A delete strips every Link property value naming a page it took, by any key that now resolves to nothing, from the governed pages outside it, archived ones among them, and from every Space; a key a page the tree holds outside it still answers is left to that page, and bodies keep their links and read unresolved. A linker with no ID, or one of two files claiming one, keeps its value, since no restore could put it back. Nothing at or under `abs` is swept, since it left with the delete. */
 export async function deleteCascade(
   root: string,
   abs: string,
@@ -78 +97 @@ export async function deleteCascade(
   const deleted = relative(root, abs)
   const inside = (rel: string): boolean => isAtOrUnder(rel, deleted)
   const tree = heldTreeOf(root)
-  // The held tree may still list the deleted pages, since its patch can fall to a walk, so they're left out by path; with no tree, nothing answers and every key strips.
-  const after = buildPageIndex(tree ? pagesOf(tree).filter((p) => !inside(p.path)) : [])
-  const gone = new Set(paths.flatMap(pathKeys).filter((k) => after.resolve(k).status === 'phantom'))
+  if (!tree) return NO_STRIP
+  const defs = byKey(linkDefsOf(tree.config.registry))
+  if (!defs.size) return NO_STRIP
   try {
-    const defs = byKey(linkDefsOf(tree?.config.registry ?? []))
-    if (!defs.size || !gone.size) return { cascade: { pages: [], hosts: [] }, links: [] }
-    const rels = queryMentions([...gone]) ?? (await nexusCorpus(root))
+    // The held tree may still list the deleted pages, since its patch can fall to a walk, so they're left out by path.
+    const { byId, archived } = await nexusPages(root, tree)
+    const after = buildPageIndex([...pagesOf(tree).filter((p) => !inside(p.path)), ...archived])
+    const gone = new Set(
+      paths.flatMap(pathKeys).filter((k) => after.resolve(k).status === 'phantom'),
+    )
+    if (!gone.size) return NO_STRIP
     const goneEntry = (value: unknown): string | null =>
       gonePageEntry(value, { holds: (t) => !gone.has(pageKey(t)) })
     const named = (raw: Record<string, unknown>) =>
@@ -98 +121 @@ export async function deleteCascade(
         raw,
         named(raw).map(({ key }) => key),
       )
-    // Tree pages, and the pages beneath a folder the tree withholds: a loose file outside every Collection shows in no view and no restore could reach it; dropping this filter strips them too.
-    const held = liveIdIndex(root)
-    const withheld = withheldIn(tree?.unreadable)
-    const files = rels
-      .filter((rel) => (held.has(rel) || withheld(rel)) && !inside(rel))
-      .map((rel) => join(root, rel))
-    let twins = 0
+    const files = (await governedReach(root, queryMentions([...gone]))).filter(
+      (file) => !inside(relative(root, file)),
+    )
+    let heldOut = 0
     const swept = await sweepGovernedRoots(root, files, {
       raw: (raw, file) => {
         const id = asString(raw[ID_KEY])
-        if (
-          named(raw).length &&
-          id !== undefined &&
-          livePathOf(root, id) === null &&
-          !withheld(relative(root, file))
-        ) {
-          twins++
+        if (named(raw).length && !addressable(byId, id)) {
+          heldOut++
           return null
         }
         return strip(raw, file)
@@ -128 +143 @@ export async function deleteCascade(
       if (!id) continue
       for (const { def, value } of named(raw)) links.push({ page: id, property: def.id, value })
     }
-    const unswept = swept.skipped.length + twins
+    const unswept = swept.skipped.length + heldOut
     return {
       cascade: {
-        pages: [...swept.touched.keys()].map((file) => relative(root, file)),
+        pages: [...swept.touched.keys()]
+          .filter((file) => outsideArchive(root, file))
+          .map((file) => relative(root, file)),
         hosts: [],
         warning: unswept ? unsweptLine(unswept, 'links in ') : undefined,
       },
@@ -252 +269 @@ export async function renameCascade(
       'names' in change ? await editCaches(root, tree.collections, cachedIds, cacheMoved) : 0
     const unmoved = swept.skipped.length + tiles.failed + uncached
     return {
-      pages: [...swept.touched.keys()].filter(isMarkdownFile).map((file) => relative(root, file)),
+      pages: [...swept.touched.keys()]
+        .filter((file) => isMarkdownFile(file) && outsideArchive(root, file))
+        .map((file) => relative(root, file)),
       hosts: tiles.hosts,
       warning: unmoved ? unsweptLine(unmoved, `links to “${named}” in `) : undefined,
     }
```

##### Core/Nexus/configReach.ts

```/Core/Nexus/configReach.ts diff
@@ -30 +30 @@ import { editJsonStrict, type StrictEdit, updateNexusConfig } from '../Files/ato
 import { same } from '../Files/stableJson'
 import { errText } from '../Contract/result'
 import { sidecarPath, tileDocPath } from '../Paths/paths'
-import { isAtOrUnder, join } from '../Paths/posix'
+import { SIDECAR_FILENAME } from '../Paths/nexusPaths'
+import { asString } from './coerce'
+import { basename, dirname, isAtOrUnder, join, relative } from '../Paths/posix'
+import { sidecarsUnder } from '../Files/walk'
+import { readWatchScope } from '../Settings/settings'
+import { scopeOf } from '../Settings/codec'
+import type { WatchScope } from '../Paths/exclusion'
+import { sidecarId } from '../Files/sidecar'
 import { isPlainObject } from '../Contract/validators'
 import type { CollectionNode, NexusTree, SetNode } from './tree'
 import type { CascadeReport } from './cascade'
 import type { ContainerKind, HeldKind } from './entities'
-import { containerAt, contextAt, damagedFolders, spaceAt } from './treePatch'
+import { archiveReach, containerAt, contextAt, damagedFolders, spaceAt } from './treePatch'
 
 // ── Roles ──
 type Role =
@@ -273 +280 @@ const within = (node: CollectionNode | SetNode): (CollectionNode | SetNode)[] =>
   ...(node.sets ?? []).flatMap(within),
 ]
 
-export function goneEdit(tree: NexusTree, kind: HeldKind, rel: string): ConfigEdit | null {
+/** The containers a removal took, as locations every saved view, View Tile, and filter drops: read from the tree, or from an archived Set's sidecars on disk. */
+export const goneContainers = (ids: string[]): ConfigEdit => ({
+  kind: 'gone',
+  propertyId: RESERVED_PROPERTY_ID.location,
+  ids,
+})
+
+export function goneEdit(
+  tree: NexusTree,
+  kind: HeldKind,
+  rel: string,
+  archived: string[] = [],
+): ConfigEdit | null {
   switch (kind) {
     case 'page':
       return null
@@ -288 +307 @@ export function goneEdit(tree: NexusTree, kind: HeldKind, rel: string): ConfigEd
     case 'collection':
     case 'set': {
       const node = containerAt(tree, rel)
-      return node
-        ? {
-            kind: 'gone',
-            propertyId: RESERVED_PROPERTY_ID.location,
-            ids: within(node).map((n) => n.id),
-          }
-        : null
+      return node ? goneContainers([...within(node).map((n) => n.id), ...archived]) : null
     }
   }
 }
@@ -305 +318 @@ const editStandalone = (rule: (r: Raw) => Raw | null, held: unknown): unknown =>
   return same(rules, held.rules) ? held : { ...held, rules: rules ?? null }
 }
 
-type Container = { kind: ContainerKind; id: string; dir: string }
+type Container = { kind: ContainerKind; dir: string }
 
 const reaches = (dir: string, under?: string): boolean => !under || isAtOrUnder(dir, under)
 
-function containersOf(tree: NexusTree, root: string, under?: string): Container[] {
-  return tree.collections
-    .flatMap(within)
-    .map((node) => ({ kind: node.kind, id: node.id, dir: join(root, node.path) }))
-    .filter(({ dir }) => reaches(dir, under))
+const setSidecarsUnder = async (root: string, scope: WatchScope, abs: string): Promise<string[]> =>
+  (await sidecarsUnder(root, scope, abs)).filter((file) => basename(file) === SIDECAR_FILENAME.set)
+
+/** The ids of the Sets an archived folder holds, read from their sidecars, so every saved view drops them once the folder leaves for good. */
+export async function archivedSetIds(root: string, abs: string): Promise<string[]> {
+  const ids = await Promise.all(
+    (await setSidecarsUnder(root, await readWatchScope(root), abs)).map((file) =>
+      sidecarId(dirname(file), 'set'),
+    ),
+  )
+  return ids.flatMap((id) => id ?? [])
+}
+
+async function archivedSets(tree: NexusTree, root: string, under?: string): Promise<Container[]> {
+  const archive = archiveReach(tree, under && relative(root, under))
+  if (archive === null) return []
+  return (await setSidecarsUnder(root, scopeOf(tree.config), join(root, archive))).map((file) => ({
+    kind: 'set',
+    dir: dirname(file),
+  }))
 }
 
 export async function reachConfig(
@@ -339 +367 @@ export async function reachConfig(
     return outcome === 'written'
   }
   const { view: edit, rule } = editsOf(e)
-  const containers = containersOf(tree, root, under)
+  const live = tree.collections
+    .flatMap(within)
+    .map((node) => ({ kind: node.kind, id: node.id, dir: join(root, node.path) }))
+    .filter(({ dir }) => reaches(dir, under))
+  const sources = new Set(live.map((c) => c.id))
   const damaged = damagedFolders(tree.unreadable)
     .map((u) => ({ kind: u.kind, dir: join(root, u.path) }))
     .filter(({ dir }) => reaches(dir, under))
-  for (const { kind, dir } of [...containers, ...damaged]) {
+  for (const { kind, dir } of [...live, ...damaged]) {
     await written(sidecarPath(dir, kind), (cur) => mapViews(cur, edit))
   }
-  const sources = new Set(containers.map((c) => c.id))
+  for (const { kind, dir } of await archivedSets(tree, root, under)) {
+    await written(sidecarPath(dir, kind), (cur) => {
+      const id = asString(cur.id)
+      // A Set the edit names as gone leaves together with everything else it names, so its own views still answer.
+      if (id && e.kind === 'gone' && e.ids.includes(id)) return null
+      if (id) sources.add(id)
+      return mapViews(cur, edit)
+    })
+  }
   const inScope = (entry: unknown): boolean => {
     const source = isPlainObject(entry) ? String(entry.source_id) : ''
     return (!under || sources.has(source)) && !(e.kind === 'gone' && e.ids.includes(source))
```

##### Core/Nexus/entities.ts

```/Core/Nexus/entities.ts diff
@@ -43 +43 @@ export const isContainerKind = (kind: unknown): kind is ContainerKind =>
 export const isContainer = <T extends { kind: unknown }>(
   n: T | null | undefined,
 ): n is T & { kind: ContainerKind } => n != null && isContainerKind(n.kind)
+
+/** A target that names a container by id: a Collection, a Set, or either's archive place. */
+export const namesContainer = <T extends { kind: unknown }>(
+  n: T | null | undefined,
+): n is T & { kind: ContainerKind | 'archive' } => isContainer(n) || n?.kind === 'archive'
```

##### Core/Nexus/fileEvents.ts

```/Core/Nexus/fileEvents.ts diff
@@ -571 +571 @@ async function applyMove(root: string, ev: Moved, owed: Owed): Promise<Applied>
   const from = relative(root, ev.from)
   const to = relative(root, ev.absPath)
   const tree = heldTreeOf(root)
-  // A folder landing where an excluded entry already names a path at or beneath it moves the corpus with no settings write to report it, so it walks and reseeds; the entries themselves are unchanged, so the watch stands.
+  // A folder landing where an excluded entry already names a path at or beneath it moves the corpus, so it walks. An entry excluded from outside the move has no settings write of its own, so the walk reseeds and the watch stands; one the move's carry wrote ahead already owes the rescope, whose restarted watcher seeds in the reseed's place.
   if (tree && scopeOf(tree.config).excluded.some((entry) => entryWithin(entry, to) !== null)) {
     owed.corpus = true
     return 'walk'
```

##### Core/Nexus/folderEntity.ts

```/Core/Nexus/folderEntity.ts diff
@@ -1 +1 @@
 import { join, dirname, basename, relative } from '../Paths/posix'
 import { machine } from '../Platform/machine'
 import { recordWrite } from '../Files/writeEcho'
-import { pathExists, relocate, targetTaken, writeJson } from '../Files/atomicWrite'
-import { nameError } from '../Paths/names'
+import { heldName, pathExists, relocate, targetTaken, writeJson } from '../Files/atomicWrite'
+import { listEntries } from '../Files/walk'
+import { freeName, nameError } from '../Paths/names'
 import { sidecarPath } from '../Paths/paths'
 import type { SidecarKind } from '../Paths/nexusPaths'
 import { ok, fail, type Result } from '../Contract/result'
-import { outsideContent } from '../Paths/exclusion'
-import { followExcludedFolders, readWatchScope } from '../Settings/settings'
+import { entryWithin, outsideContent } from '../Paths/exclusion'
+import { carrySetAside, readWatchScope } from '../Settings/settings'
 
 const SET_ASIDE = {
   excluded:
@@ -27 +28 @@ export async function landingRefusal(
   return why && why !== 'hidden' ? fail('invalid-path', `"${name}" ${SET_ASIDE[why]}`) : null
 }
 
-/** A Collection or Set landing at a new path: excluded entries follow before sync hears of the rename, so it pushes under the new scope. */
-const relocateFolder = (root: string, from: string, to: string): Promise<void> =>
-  relocate(from, to, () => followExcludedFolders(root, relative(root, from), relative(root, to)))
+/** A Collection or Set landing at a new path carries its excluded entries and the asset directory: the carry's write refuses the move before anything moves, and its drop runs as `landed`, so sync hears of the rename once, under the scope it settled; a move that throws before landing writes back what the carry read. */
+async function relocateFolder(
+  root: string,
+  from: string,
+  to: string,
+): Promise<Result<{ path: string }>> {
+  const carried = await carrySetAside(root, relative(root, from), relative(root, to))
+  if (!carried.ok) return carried
+  let landed = false
+  try {
+    await relocate(from, to, () => {
+      landed = true
+      return carried.value.drop()
+    })
+  } catch (e) {
+    if (!landed) await carried.value.undo()
+    throw e
+  }
+  return ok({ path: to })
+}
+
+/** A Collection or Set leaving the tree leaves every excluded folder and the asset directory inside it in its parent, the outermost of a nesting, under its own name or the next one free there, each one's entry carried ahead of it. A lift refused or thrown partway moves back what it lifted, as `undo` does when the container's own move fails. */
+export async function liftSetAside(
+  root: string,
+  containerAbs: string,
+): Promise<Result<{ undo: () => Promise<void> }>> {
+  const { excluded, assetDir } = await readWatchScope(root)
+  const inside = [...excluded, assetDir].flatMap((entry) => {
+    const rest = entryWithin(entry, relative(root, containerAbs))
+    return rest ? [rest.join('/')] : []
+  })
+  const parent = dirname(containerAbs)
+  const lifted: { from: string; to: string }[] = []
+  const undo = async (): Promise<void> => {
+    for (const { from, to } of [...lifted].reverse()) await relocateFolder(root, to, from)
+  }
+  try {
+    for (const rest of inside) {
+      if (inside.some((outer) => (entryWithin(rest, outer)?.length ?? 0) > 0)) continue
+      const abs = join(containerAbs, rest)
+      // An entry can outlive its folder, whose spelling is read from its parent's listing.
+      const name = await heldName(abs)
+      if (name === null) continue
+      const taken = (await listEntries(parent)).map((e) => e.name)
+      const to = join(parent, freeName(name, taken))
+      const moved = await relocateFolder(root, abs, to)
+      if (!moved.ok) {
+        await undo()
+        return moved
+      }
+      lifted.push({ from: abs, to })
+    }
+  } catch (e) {
+    await undo()
+    throw e
+  }
+  return ok({ undo })
+}
 
 export async function createFolderEntity(
   parentDir: string,
@@ -59 +115 @@ export async function renameFolderEntity(
   const target = join(dirname(absFolder), newName)
   if (target === absFolder) return ok({ path: absFolder })
   if (await targetTaken(absFolder, target)) return fail('exists', `"${newName}" already exists.`)
-  await relocateFolder(root, absFolder, target)
-  return ok({ path: target })
+  return relocateFolder(root, absFolder, target)
 }
 
 export async function moveFolderEntity(
@@ -71 +126 @@ export async function moveFolderEntity(
   const target = join(newParentDir, basename(absFolder))
   if (await pathExists(target))
     return fail('exists', `"${basename(absFolder)}" already exists there.`)
-  await relocateFolder(root, absFolder, target)
-  return ok({ path: target })
+  return relocateFolder(root, absFolder, target)
 }
```

##### Core/Nexus/handlers.ts

```/Core/Nexus/handlers.ts diff
@@ -4 +4 @@ import { replayPendingRename } from '../Contexts/contextCascade'
 import { ensureContextsRegistry } from '../Contexts/contextsRegistry'
 import { seedContentIndex } from '../Index/indexSeed'
 import { readHeadings } from '../Index/contentIndex'
+import { isArchived } from '../Paths/nexusPaths'
 import { isStringArray } from '../Contract/validators'
 import { forgetLastReads, targetTaken } from '../Files/atomicWrite'
 import { nameError } from '../Paths/names'
@@ -31 +32 @@ import { readNexus, readNexusConfig } from './readNexus'
 import { asString } from './coerce'
 import { settleNow, recordHanded } from './settle'
 import type { NexusState } from './tree'
-import { trashDeps } from '../Trash/bundle'
+import { trashDeps } from '../Trash/discard'
+import { settleArchives } from '../Archive/refile'
 
 async function prepareOpenedNexus(path: string): Promise<string | null> {
   let nexusId: string | null = null
@@ -83 +85 @@ export async function openNexusSequence(
   ctx.openStores(root, nexusId)
   await replayPendingRename(root)
   if (root !== priorRoot) {
-    void sweepFileHistory(root)
     try {
       let tree = await readNexus(root)
       // Every file it lists missing its ID is stamped, since the watcher starts after the open, so neither a file that predates it nor one written before the open's index seed gets an event; and read again rather than patched, since a first adoption stamps every page and one more read costs less than a patch per stamp; a page with a foreign ID is written over only by its Try Again.
@@ -98 +99 @@ export async function openNexusSequence(
         tree = await readNexus(root)
       seedLiveTree(tree)
       if (latchRecord) await runOpenLedger(root, tree)
+      await settleArchives(root, tree).catch((e) =>
+        console.error('archive: the open pass failed:', errText(e)),
+      )
     } catch (e) {
       console.error('adopt: the seed walk failed; reads will retry:', errText(e))
     }
     const reread = await seedContentIndex(root)
     oweSeen(root, reread)
+    void sweepFileHistory(root)
     await replaySchemaCascade(root)
     await settleNow(ctx, root)
     void runRepairSweep(root, reread)
@@ -164 +169 @@ export const nexusHandlers = {
     return ok(null)
   }),
 
-  'index:headings': withRoot(async (_root, _ctx, paths: unknown) =>
-    ok(readHeadings(isStringArray(paths) ? paths : undefined) ?? {}),
-  ),
+  'index:headings': withRoot(async (_root, _ctx, paths: unknown) => {
+    const headings = Object.entries(readHeadings(isStringArray(paths) ? paths : undefined) ?? {})
+    return ok(Object.fromEntries(headings.filter(([path]) => !isArchived(path))))
+  }),
 
   'path:reveal': withRoot(async (root, ctx, p: unknown) => {
     if (typeof p !== 'string') return ok(null)
```

##### Core/Nexus/heldPages.ts

```/Core/Nexus/heldPages.ts diff
@@ -1 +1 @@
-// The held tree's pages by path and by id, for the host's writers.
+// The held tree's pages by path and by id, for the host's writers, and the one projection that adds the Archive's pages to the tree's entities, for every refill and every frozen world.
+// Relinks (create, rename, move) resolve against the live index; strips, refills, and frozen worlds resolve against the tree plus the Archive, `linkWorld`.
 
 import { heldTreeOf } from './liveTree'
-import { relative } from '../Paths/posix'
-import { pagesByPathOf, pagesOf } from './record'
-import { entityMemo } from './tree'
+import { join, relative, titleFromPath } from '../Paths/posix'
+import { type EntityRecord, pagesByIdOf, pagesByPathOf, pagesOf, recordsOf } from './record'
+import { entityMemo, type NexusTree } from './tree'
+import { indexReady, readIndexedStats } from '../Index/contentIndex'
+import { ARCHIVE_DIR_REL, archivedCollectionIdOf } from '../Paths/nexusPaths'
+import { corpusFilesUnder } from '../Files/walk'
+import { stampedIdOf } from '../Files/pageFile'
+import { scopeOf } from '../Settings/codec'
+import { originPathOf } from '../Bundles/bundle'
+import { buildPageIndex, type ConnPage, connPage, type PageIndex } from '../Connections/pageIndex'
+
+type ById = Map<string, EntityRecord | null>
+
+const claim = (byId: ById, r: EntityRecord): void => {
+  byId.set(r.id, byId.has(r.id) ? null : r)
+}
 
 /** Null marks an id two files claim: the window shows the first listed (`record.ts`'s `pagesByIdOf`); a file writer refuses it. */
-const writablePathsOf = entityMemo([], (tree): ReadonlyMap<string, string | null> => {
-  const byId = new Map<string, string | null>()
-  for (const p of pagesOf(tree)) byId.set(p.id, byId.has(p.id) ? null : p.path)
+const entitiesById = entityMemo([recordsOf], (tree): ReadonlyMap<string, EntityRecord | null> => {
+  const byId: ById = new Map()
+  for (const r of recordsOf(tree)) claim(byId, r)
   return byId
 })
 
+const writablePathsOf = entityMemo([recordsOf], (tree): ReadonlyMap<string, string | null> => {
+  const byId = entitiesById(tree)
+  return new Map(pagesOf(tree).map((p) => [p.id, byId.get(p.id)?.path ?? null]))
+})
+
 /** Empty when the tree is not this root's, so a stale tree never names ids for another nexus. */
 export const liveIdIndex = (root: string): ReadonlyMap<string, string> => {
   const tree = heldTreeOf(root)
@@ -31 +50 @@ export const idHeld = (root: string, id: string): boolean => {
   const tree = heldTreeOf(root)
   return tree ? writablePathsOf(tree).has(id) : false
 }
+
+/** `byId` holds every entity the tree holds and every page the Archive holds, an archived one at the path a writer opens, and null where two files claim one id, so neither is addressed by it; `archived` holds the Archive's pages at the paths they left, where a link written before they left still names them. */
+export interface NexusPages {
+  byId: ReadonlyMap<string, EntityRecord | null>
+  archived: readonly ConnPage[]
+}
+
+/** Whether `byId` addresses the one file carrying `id`: not where the file carries no ID, nor where two files claim it, so no strip files a value under it and no refill writes it. */
+export const addressable = (byId: NexusPages['byId'], id: string | undefined): id is string =>
+  id !== undefined && byId.get(id) !== null
+
+/** The title the window shows for `id`: its one holder's, or the first-listed page's where two files claim it. */
+export const shownTitle = (
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+  id: string,
+): string | undefined => byId.get(id)?.title ?? pagesByIdOf(tree).get(id)?.title
+
+export async function nexusPages(root: string, tree: NexusTree): Promise<NexusPages> {
+  const rows = await archivedPageIds(root, tree)
+  const byId: ById = new Map(entitiesById(tree))
+  const archived: ConnPage[] = []
+  for (const [path, { id }] of rows) {
+    const owner = archivedCollectionIdOf(path)
+    if (!id || owner === null) continue
+    claim(byId, { id, kind: 'page', title: titleFromPath(path), path })
+    const left = originPathOf(root, { kind: 'archive', id: owner }, join(root, path))
+    archived.push(connPage(id, left))
+  }
+  return { byId, archived }
+}
+
+/** The tree's pages and the Archive's at the paths they left, with `more` beside them. */
+export const linkWorld = (
+  tree: NexusTree,
+  archived: readonly ConnPage[],
+  more: readonly ConnPage[] = [],
+): PageIndex => buildPageIndex([...pagesOf(tree), ...archived, ...more])
+
+export async function archivedPageIds(
+  root: string,
+  tree: NexusTree,
+): Promise<ReadonlyMap<string, { id?: string }>> {
+  const indexed = indexReady() ? readIndexedStats(ARCHIVE_DIR_REL) : null
+  if (indexed) return indexed
+  const rels = await corpusFilesUnder(root, join(root, ARCHIVE_DIR_REL), scopeOf(tree.config))
+  const ids = await Promise.all(rels.map((rel) => stampedIdOf(join(root, rel))))
+  return new Map(rels.map((rel, i) => [rel, { id: ids[i] ?? undefined }]))
+}
```

##### Core/Nexus/migrateConfig.ts

```/Core/Nexus/migrateConfig.ts diff
@@ -2 +2 @@ import { isPlainObject } from '../Contract/validators'
 import { rmwJsonStrict } from '../Files/atomicWrite'
 import { listFilesRecursive } from '../Files/walk'
 import {
+  ARCHIVE_DIR_REL,
   CONTEXTS_DIR_REL,
   NEXUS_CONFIG_FILES,
   SIDECARS,
@@ -42 +43 @@ export const renamedSidecar = (meta: unknown) =>
 const renamedTileDoc = (doc: unknown) =>
   isPlainObject(doc) ? mapTiles(doc, (tile) => mapViews(tile, renamedView)) : null
 
-// Containers in scope ride the adoption pass (`stampFolder`); only the Trash and the tile documents are walked here.
+// Containers in scope ride the adoption pass (`stampFolder`); only the Trash, the Archive, and the tile documents are walked here.
 export async function normalizeSavedViews(root: string): Promise<void> {
-  for (const file of await listFilesRecursive(join(root, TRASH_DIR), [...SIDECARS]))
-    await rmwJsonStrict(file, renamedSidecar)
+  for (const dir of [TRASH_DIR, ARCHIVE_DIR_REL])
+    for (const file of await listFilesRecursive(join(root, dir), [...SIDECARS]))
+      await rmwJsonStrict(file, renamedSidecar)
   // Runs at open, before a tree exists to ask TILE_HOSTS for its boards.
   for (const dir of [homepageDir(root), join(root, CONTEXTS_DIR_REL)])
     for (const file of await listFilesRecursive(dir, [TILE_DOC_FILENAME]))
```

##### Core/Nexus/move.ts

```/Core/Nexus/move.ts diff
@@ -6 +6 @@ import type { MutateContext } from './mutate'
 import { movePage } from './page'
 import { landingRefusal, moveFolderEntity } from './folderEntity'
 import { liveTreeOf, mutableTarget } from './liveTree'
-import { goneEdit, reachConfig, reachReport } from './configReach'
-import { dropFromChildOrder, setChildOrder } from './reorder'
-import { containerAt, pageAt } from './treePatch'
-import { excludedWithin, exclusionWriteRefusal } from '../Settings/settings'
+import { archivedSetIds, goneEdit, reachConfig, reachReport } from './configReach'
+import { containerAt, owningCollection } from './treePatch'
+import { dropDeparture, setChildOrder } from './reorder'
+import { archivedWithin } from '../Bundles/bundle'
 
 async function ends(
   root: string,
@@ -31 +31 @@ export async function movePageOp(
   if (!at.ok) return at
   if (dirname(at.value.src) === at.value.dst)
     return req.order ? done(await setChildOrder(at.value.dst, 'page_order', req.order)) : ok({})
-  const id = pageAt(await liveTreeOf(root), req.path)?.id
+  const tree = await liveTreeOf(root)
   const r = await movePage(at.value.src, at.value.dst)
   if (!r.ok) return r
-  if (id) await dropFromChildOrder(dirname(at.value.src), 'page_order', id)
+  await dropDeparture(root, tree, 'page', req.path)
   if (req.order) await setChildOrder(at.value.dst, 'page_order', req.order)
   return ok({})
 }
@@ -47 +47 @@ export async function moveSetOp(
   if (!at.ok) return at
   if (dirname(at.value.src) === at.value.dst)
     return done(await setChildOrder(at.value.dst, 'set_order', req.order))
-  const refused =
-    (await landingRefusal(root, at.value.dst, basename(at.value.src))) ??
-    (await exclusionWriteRefusal(root, await excludedWithin(root, req.path)))
+  const refused = await landingRefusal(root, at.value.dst, basename(at.value.src))
   if (refused) return refused
   const from = dirname(req.path).split('/')
   const to = req.newParentPath.split('/')
   const diverge = from.findIndex((seg, i) => seg !== to[i])
   const left = diverge === -1 ? null : from.slice(0, diverge + 1).join('/')
   const held = await liveTreeOf(root)
-  const edit = left === null ? null : goneEdit(held, 'set', req.path)
-  const id = containerAt(held, req.path)?.id
+  const owner = owningCollection(held, req.path)?.id
+  const setId = containerAt(held, req.path)?.id
+  // What was archived from within it moves with it.
+  const within =
+    left !== null && owner && setId ? await archivedWithin(root, setId, owner, held) : []
+  const archived = await Promise.all(
+    within.map(({ bundlePath, record }) =>
+      record.entity === 'set' ? archivedSetIds(root, join(root, bundlePath)) : [],
+    ),
+  )
+  const edit = left === null ? null : goneEdit(held, 'set', req.path, archived.flat())
   const r = await moveFolderEntity(root, at.value.src, at.value.dst)
   if (!r.ok) return r
-  if (id) await dropFromChildOrder(dirname(at.value.src), 'set_order', id)
+  await dropDeparture(root, held, 'set', req.path)
   await setChildOrder(at.value.dst, 'set_order', req.order)
   const reach = left && edit ? await reachConfig(root, edit, join(root, left)) : null
   return ok(reach ? { cascade: reachReport(reach) } : {})
```

##### Core/Nexus/mutate.ts

```/Core/Nexus/mutate.ts diff
@@ -7 +7 @@ import { resolveUnderRoot } from '../Paths/pathSafety'
 import { contextsDir } from '../Paths/paths'
 import { machine } from '../Platform/machine'
 import { fault, ok, type Result } from '../Contract/result'
-import { emptyBundle, restoreOp } from '../Trash/spend'
+import { emptyBundle, restoreTrashed } from '../Trash/spend'
+import { archiveOp, restoreArchived } from '../Archive/archive'
+import { openBundle, storeOf } from '../Bundles/bundle'
 import { deleteOp } from '../Trash/delete'
 import { updateSettings } from '../Settings/settings'
 import { setProfileImageOp } from '../Assets/setProfileImage'
@@ -33 +35 @@ import {
 } from './mutateRequest'
 import { CONTAINER_KINDS } from './entities'
 import { setActiveView } from '../Views/viewsFile'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 import { createContainerOp, createPageOp, createSpaceOp } from './create'
 import { movePageOp, moveSetOp } from './move'
 import { editPageAliases, writePageMeta } from './pageMetadata'
@@ -131 +133 @@ async function dispatch(ctx: MutateContext, req: MutateRequest): Promise<MutateR
         ? underContexts(() => inSettleTurn(root, () => deleteOp(ctx, req)))
         : inSettleTurn(root, () => deleteOp(ctx, req))
 
-    case 'restore':
-      return underContexts(() => inSettleTurn(root, () => restoreOp(ctx, req)))
+    case 'archive':
+      return inSettleTurn(root, () => archiveOp(ctx, req))
+
+    // An Archive bundle holds a page or Set alone, so its restore changes no Context and takes no Contexts lock.
+    case 'restore': {
+      const resolved = await resolveUnderRoot(root, req.bundlePath)
+      if (!resolved.ok) return resolved
+      const restore = async (): Promise<MutateReply> => {
+        const opened = await openBundle(root, resolved.value)
+        if (!opened.ok) return opened
+        return opened.value.store.kind === 'archive'
+          ? restoreArchived(root, opened.value, req.destination)
+          : restoreTrashed(root, opened.value, req.destination)
+      }
+      return storeOf(root, resolved.value)?.kind === 'archive'
+        ? inSettleTurn(root, restore)
+        : underContexts(() => inSettleTurn(root, restore))
+    }
 
     case 'emptyBundle': {
       const resolved = await resolveUnderRoot(root, req.bundlePath)
```

##### Core/Nexus/mutateRequest.ts

```/Core/Nexus/mutateRequest.ts diff
@@ -13 +13 @@ export interface MutateOutcome {
   created?: { path: string }
   cascade?: CascadeReport
   adopted?: string
-  trashed?: { bundlePath: string }
+  /** The bundle a removal minted, in the Trash or an Archive; absent when the system trash took it. */
+  bundled?: { bundlePath: string }
   /** The titles of what a restore brought back without all it held. */
   unrestored?: string[]
+  /** The title a restore stepped aside to, when it couldn't land under its own. */
+  landedAs?: string
   retry?: MutateRequest
 }
 export type MutateReply = Result<MutateOutcome>
@@ -32 +35 @@ export type BannerOwnerKind = z.infer<typeof bannerOwner>
 
 const containerKind = z.enum(CONTAINER_KINDS)
 
-/** Checked against the write path's own destination rules: a contradicting claim is refused as malformed. */
-const restoreDestination = z.object({ kind: z.enum(['container', 'context']), id: z.string() })
+/** Checked against the write path's own destination rules: a contradicting claim is refused as malformed. `archive` is a delete from the Archive's Undo, returning the item to the bundle its record names. */
+const restoreDestination = z.discriminatedUnion('kind', [
+  z.object({ kind: z.enum(['container', 'context']), id: z.string() }),
+  z.object({ kind: z.literal('archive') }),
+])
 export type RestoreDestination = z.infer<typeof restoreDestination>
 
 const childOrderKey = z.literal('set_order')
@@ -70 +76 @@ export const mutateRequest = z.discriminatedUnion('op', [
   }),
   op('renameHeading', { path: z.string(), heading: z.string(), to: z.string() }),
   op('delete', { path: z.string(), kind: heldKind }),
+  op('archive', { path: z.string(), kind: z.enum(['page', 'set']), leaf: z.string().optional() }),
   op('restore', { bundlePath: z.string(), destination: restoreDestination.optional() }),
   op('emptyBundle', { bundlePath: z.string() }),
   op('setProfileImage', { source: z.string().nullable() }),
@@ -85 +92 @@ export const mutateRequest = z.discriminatedUnion('op', [
   op('restoreValue', { path: z.string(), propertyId: z.string(), held: z.unknown().optional() }),
   op('setPageMeta', { path: z.string(), patch: pageMetaPatch }),
   op('editAliases', { path: z.string(), edit: aliasEdit }),
-  // Absent order = legacy append. Stale ids in a source container self-drop on the next read.
+  // Absent an order, the destination's order stands, and the page sorts where `resolveOrder` places an id its order doesn't name.
   op('movePage', { path: z.string(), newParentPath: z.string(), order: ids.optional() }),
   op('moveSet', { path: z.string(), newParentPath: z.string(), order: ids }),
   op('reorderChildren', { parentPath: z.string(), key: childOrderKey, order: ids }),
@@ -143 +150 @@ export const changesSettled = (operation: MutateRequest['op']): boolean =>
   operation === 'moveSet' ||
   operation === 'renameHeading' ||
   operation === 'delete' ||
+  operation === 'archive' ||
   operation === 'restore' ||
   operation === 'emptyBundle'
+
+/** A moved Set carries what was archived from within it, and a container's or Context's new name, or a Set's new place, re-spells the rows' crumbs, so each re-lists an open browser too. */
+export const changesStores = (req: MutateRequest): boolean =>
+  req.op === 'delete' ||
+  req.op === 'archive' ||
+  req.op === 'restore' ||
+  req.op === 'emptyBundle' ||
+  req.op === 'moveSet' ||
+  req.op === 'renameContext' ||
+  (req.op === 'rename' && req.kind !== 'page')
```

##### Core/Nexus/order.ts

```/Core/Nexus/order.ts diff
@@ -1 +1 @@
 // No persisted order sorts by id ascending (ULIDs are time-sortable); a persisted array takes known-in-array-order with tombstones dropped, then appends the unreferenced by title.
 
 import { compareTitles } from '../Paths/caseFold'
+import { nextOrder } from '@pommora/uix/Utilities/moveItem'
 
 interface Orderable {
   id: string
@@ -25 +26 @@ export function resolveOrder<T extends Orderable>(items: T[], order: string[] |
   const rest = [...byId.values()].sort((a, b) => compareTitles(a.title, b.title))
   return [...known, ...rest]
 }
+
+export type Slot = 'above' | 'below' | 'first' | 'last'
+
+export function spliceBeside(
+  ids: string[],
+  anchorId: string | null,
+  item: string,
+  where: Slot,
+): string[] {
+  const at = anchorId === null ? -1 : ids.indexOf(anchorId)
+  const before =
+    where === 'first'
+      ? (ids[0] ?? null)
+      : where === 'above'
+        ? anchorId
+        : where === 'below' && at >= 0
+          ? (ids[at + 1] ?? null)
+          : null
+  return nextOrder(ids, item, before)
+}
```

##### Core/Nexus/record.ts

```/Core/Nexus/record.ts diff
@@ -45 +45 @@ export const recordsOf = entityMemo([(t) => t.contexts], (tree): readonly Entity
   return records
 })
 
-/** The first record listed under each id. */
-export const recordById = entityMemo(
-  [recordsOf],
-  (tree): Readonly<Record<string, EntityRecord>> => {
-    const byId: Record<string, EntityRecord> = {}
-    for (const r of recordsOf(tree)) byId[r.id] ??= r
-    return byId
-  },
-)
-
 export const pagesOf = entityMemo([], (tree): readonly ConnPage[] =>
   recordsOf(tree)
     .filter((r) => r.kind === 'page')
```

##### Core/Nexus/rename.ts

```/Core/Nexus/rename.ts diff
@@ -7 +7 @@ import type { MutateContext } from './mutate'
 import { renamePage } from './page'
 import { landingRefusal, renameFolderEntity } from './folderEntity'
 import { pathExists } from '../Files/atomicWrite'
-import { excludedWithin, exclusionWriteRefusal } from '../Settings/settings'
 
 export async function renameOp(
   { root }: MutateContext,
@@ -17 +16 @@ export async function renameOp(
   if (!resolved.ok) return resolved
   const abs = resolved.value
   if (req.kind !== 'page') {
-    const refused =
-      (await landingRefusal(root, dirname(abs), req.newName)) ??
-      (await exclusionWriteRefusal(root, await excludedWithin(root, req.path)))
+    const refused = await landingRefusal(root, dirname(abs), req.newName)
     if (refused) return refused
     const r = await renameFolderEntity(root, abs, req.newName)
     return r.ok ? ok({}) : r
```

##### Core/Nexus/reorder.ts

```/Core/Nexus/reorder.ts diff
@@ -2 +2 @@ import { isPlainObject } from '../Contract/validators'
 import { pathExists, updateNexusConfig, withIds, withoutId } from '../Files/atomicWrite'
 import { patchSidecar } from '../Files/sidecar'
 import { sidecarPath } from '../Paths/paths'
+import { dirname, join } from '../Paths/posix'
 import { ok, type Result } from '../Contract/result'
 import type { ChildOrderKey } from './mutateRequest'
-import { CONTAINER_KINDS } from './entities'
+import { CONTAINER_KINDS, type HeldKind } from './entities'
+import type { NexusTree } from './tree'
+import { containerAt, pageAt, spaceAt } from './treePatch'
 
 type ContainerOrderKey = ChildOrderKey | 'page_order'
 
@@ -47 +50 @@ export const setSpaceOrder = (
     spaces: { ...spacesOf(order), [contextId]: ids },
   }))
 
-/** A Context gone for good takes its Space order with it. */
-export const dropSpaceOrder = (nexusRoot: string, contextId: string): StateOrderWrite =>
+/** A Context gone for good takes its panel id and its Space order with it. */
+export const dropContextOrder = (nexusRoot: string, contextId: string): StateOrderWrite =>
   writeStateOrder(nexusRoot, (order) => {
+    const panel = withoutId(order, 'contexts', contextId)
     const { [contextId]: dropped, ...spaces } = spacesOf(order)
-    return dropped === undefined ? null : { ...order, spaces }
+    if (dropped === undefined) return panel
+    return { ...(panel ?? order), spaces }
   })
 
 const patchContainer = async (
@@ -63 +68 @@ const patchContainer = async (
   return ok(null)
 }
 
-export const dropFromChildOrder = (
+const dropFromChildOrder = (
   absFolder: string,
   key: ContainerOrderKey,
   id: string,
 ): Promise<Result<unknown>> => patchContainer(absFolder, (cur) => withoutId(cur, key, id))
 
+/** A departing item leaves the order it sat in, its id read from `tree`, the tree from before it left. A Context keeps its panel id while bundled, as its restore returns to it. */
+export async function dropDeparture(
+  root: string,
+  tree: NexusTree,
+  kind: HeldKind,
+  rel: string,
+): Promise<void> {
+  switch (kind) {
+    case 'page':
+    case 'set': {
+      const id = (kind === 'page' ? pageAt(tree, rel) : containerAt(tree, rel))?.id
+      const key = kind === 'page' ? 'page_order' : 'set_order'
+      if (id) await dropFromChildOrder(dirname(join(root, rel)), key, id)
+      return
+    }
+    case 'collection': {
+      const id = containerAt(tree, rel)?.id
+      if (id) await writeStateOrder(root, (order) => withoutId(order, 'collections', id))
+      return
+    }
+    case 'space': {
+      const space = spaceAt(tree, rel)
+      if (space)
+        await writeStateOrder(root, (order) => {
+          const spaces = withoutId(spacesOf(order), space.contextId, space.id)
+          return spaces && { ...order, spaces }
+        })
+      return
+    }
+    case 'context':
+      return
+  }
+}
+
 export async function setChildOrder(
   absFolder: string,
   key: ContainerOrderKey,
```

##### Core/Nexus/settle.ts

```/Core/Nexus/settle.ts diff
@@ -32 +32 @@ import type { NexusTree, Unreadable, ValueChange } from './tree'
 import { deltaOf } from './treeDelta'
 import { liveIdIndex, livePathOf } from './heldPages'
 import { pageIndexOf, pagesOf } from './record'
-import { type CascadeReport, renameCascade } from './cascade'
+import { type CascadeReport, linksNotUpdated, renameCascade } from './cascade'
 import { respellings } from '../Connections/rewrite'
 import { buildPageIndex, type ConnPage, type PageIndex } from '../Connections/pageIndex'
+import { refileMoved } from '../Archive/refile'
+import { repairLanded } from '../Trash/restoreScrub'
+import type { RecordFile } from '../Bundles/record'
 
 // ── The app's own events ──
 
@@ -165 +168 @@ async function settle(pusher: Pusher, root: string): Promise<{ rescope: boolean
   }
   const held = heldTreeOf(root)
   const tree = held && shown(held, stamp)
-  const delta = tree && deltaOf(pushed?.nexus.rootPath === root ? pushed : undefined, tree)
+  const handed = pushed?.nexus.rootPath === root ? pushed : undefined
+  const delta = tree && deltaOf(handed, tree)
   if (tree) pushed = tree
   if (delta) pusher.push('nexus:changed', { version: ++version, delta })
   if (pages.size) pusher.push('pages:changed', [...pages])
@@ -174 +178 @@ async function settle(pusher: Pusher, root: string): Promise<{ rescope: boolean
   for (const { host, ids } of tiles.values()) pusher.push('tiles:changed', { host, ids: [...ids] })
   const map = getHeldAssetMap(root)
   if (assets && map) pusher.push('assets:changed', map)
+  // A Set the window saw move carries what was archived from within it; its writes raise only events the tree ignores, and one that throws costs the settle nothing it pushed or owes. A first tree has no baseline, which the open pass covers.
+  if (handed && tree && delta) await refileMoved(root, handed, tree, delta)
   return corpus || rescope ? { rescope } : null
 }
 
@@ -245 +251 @@ export async function settledIndex(root: string): Promise<PageIndex | null> {
   return tree && pageIndexOf(tree)
 }
 
-/** The one re-spell, run inside the settle's turn: the map `respellings` builds from `before` to `after`, swept under `label`; undefined when nothing needs re-spelling. */
+/** A move's re-spell, run inside the settle's turn: the map `respellings` builds from `before` to `after`, swept under `label`; undefined when nothing needs re-spelling. A restore's arrival re-spells through `returningCascade`. */
 export async function relink(
   root: string,
   before: PageIndex,
@@ -259 +265 @@ export async function relink(
   return renameCascade(root, { names, label })
 }
 
+/** A restore's re-spell, two maps rather than one `relink`: the arrival's collisions read against the live world alone, since beside the returning pages a twin's bare link reads ambiguous and a returning `Notes/Alpha` would take `notes/alpha` from a live `X/Notes/Alpha`. `own` reads the returning pages' own keys against themselves and joins `names` only where the live world names nothing, so a title-only link that found a namesake meanwhile stays with it. */
+export function returningNames(
+  live: PageIndex,
+  after: PageIndex,
+  back: readonly ConnPage[],
+): { names: Map<string, string>; own: Map<string, string> } {
+  const ids = back.map((p) => p.id)
+  const own = respellings(buildPageIndex(back), after, ids, [])
+  const names = respellings(live, after, [], ids)
+  for (const [k, v] of own) if (live.resolve(k).status === 'phantom') names.set(k, v)
+  return { names, own }
+}
+
+/** A restore's arrival under `title`: the index settled with `back` landed, the returning files repaired at `landed.abs` through `landed.repair` (the returning pages' own re-spellings when it has none), then the live world's collisions swept, so live linkers that found a namesake meanwhile stay with it while the returning files keep their own targets. Answers the files the repair couldn't write, and the notice that links weren't updated when the index can't settle. */
+export async function returningCascade(
+  root: string,
+  tree: NexusTree,
+  back: readonly ConnPage[],
+  title: string,
+  landed: {
+    entity: RecordFile['entity']
+    abs: string
+    repair?: (after: PageIndex) => Map<string, string>
+  },
+): Promise<{
+  after: PageIndex | null
+  own: Map<string, string>
+  unswept: string[]
+  cascade?: CascadeReport
+}> {
+  const after = await settledIndex(root)
+  if (!after) return { after, own: new Map(), unswept: [], cascade: linksNotUpdated(title) }
+  const { names, own } = returningNames(pageIndexOf(tree), after, back)
+  const repair = landed.repair?.(after) ?? own
+  const unswept = await repairLanded(root, tree, landed.entity, landed.abs, repair)
+  if (!names.size) return { after, own, unswept }
+  return { after, own, unswept, cascade: await renameCascade(root, { names, label: title }) }
+}
+
 // What an outside payment leaves: a warning logged, since no one is there to read a notice, and the files it wrote owed to the push.
 function paid(root: string, c: CascadeReport | undefined, what: string): void {
   if (!c) return
```

##### Core/Nexus/treeIndex.ts

```/Core/Nexus/treeIndex.ts diff
@@ -4 +4 @@ import { type EntityRecord, pagesByIdOf, pagesByPathOf, recordsOf } from './reco
 import type { BannerOwnerKind } from './mutateRequest'
 import { navKey, type NavRef, type SelectTarget, toNavRef } from '../Navigation/navRef'
 import { MATRIX_ICON, MATRIX_TITLE } from '../Matrix/matrixKind'
+import { ARCHIVE_ICON } from '../Archive/archivePlace'
 import type { CollectionNode, NexusTree, SetNode, SpaceNode } from './tree'
 import { entityMemo } from './tree'
-import { findContainerWhere, withheldIn } from './treePatch'
+import { findContainerById, isTopContainer, withheldIn } from './treePatch'
 import { iconNameOr } from '@pommora/uix/Symbols'
 import { DEFAULT_NEXUS_ICON, entityIcon } from '../Assets/entityIconPolicy'
 import { NO_TRAIL, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
@@ -20 +21 @@ import type { ReconcileIndex } from '../Session/reconcileSelection'
 /** `id` and `path` are '' for the two folderless singletons, the Homepage and the Matrix. */
 interface NodeRecord extends TrailNode {
   key: string
-  kind: NavRef['kind']
+  /** Every place but an Archive, which shares its owner's id: nav search lists none, and none overwrites its owner by id. */
+  kind: Exclude<NavRef['kind'], 'archive'>
   /** The raw icon field — surfaces that render absence read this, not the resolved glyph. */
   ownIcon?: string
   parents: TrailNode[]
@@ -121 +123 @@ export const reconcileIndexOf = entityMemo(
   },
 )
 
+/** One display core per Archive place, each Collection's and each top-level Set's, titled by its owner and trailed by the owner's ancestry. */
+const archiveCoresOf = entityMemo([nodesOf], (tree): [string, NavCore][] =>
+  nodesOf(tree).flatMap((r): [string, NavCore][] =>
+    isTopContainer(r)
+      ? [
+          [
+            navKey({ kind: 'archive', id: r.id }),
+            { icon: ARCHIVE_ICON, title: r.title, path: [...r.parents, r] },
+          ],
+        ]
+      : [],
+  ),
+)
+
 export const resolveIndexOf = entityMemo(
   [nodesOf],
   (tree): ResolveIndex =>
-    new Map<string, NavCore>(
-      nodesOf(tree).map((r) => [r.key, { icon: r.icon, title: r.title, path: r.parents }]),
-    ),
+    new Map<string, NavCore>([
+      ...nodesOf(tree).map((r): [string, NavCore] => [
+        r.key,
+        { icon: r.icon, title: r.title, path: r.parents },
+      ]),
+      ...archiveCoresOf(tree),
+    ]),
 )
 
 export const trailOf = (tree: NexusTree | null, ref: NavRef | SelectTarget): TrailSegment[] =>
@@ -183 +203 @@ export const nodesByIdOf = entityMemo(
     ),
 )
 
-/** The closed set thumbnail eviction prunes against — nothing selects a Context group, so the records are the complete universe of capturable keys. */
-export const navKeysOf = entityMemo([(t) => t.contexts], (tree): string[] =>
-  nodesOf(tree).map((r) => r.key),
-)
+/** The closed set thumbnail eviction prunes against — nothing selects a Context group, so the records and their Archive places are the complete universe of capturable keys. */
+export const navKeysOf = entityMemo([(t) => t.contexts], (tree): string[] => [
+  ...nodesOf(tree).map((r) => r.key),
+  ...archiveCoresOf(tree).map(([key]) => key),
+])
 
 /** `icon` is raw and unvalidated; NavView is excluded because its banner is treated separately. */
 export interface BannerOwner {
@@ -204 +225 @@ export function findCollection(tree: NexusTree | null, id: string): CollectionNo
 }
 
 export function findSet(tree: NexusTree | null, id: string): SetNode | undefined {
-  const hit = tree && findContainerWhere(tree, (n) => n.kind === 'set' && n.id === id)
-  return hit && hit.kind === 'set' ? hit : undefined
+  const hit = tree && findContainerById(tree, id)
+  return hit?.kind === 'set' ? hit : undefined
 }
 
 /** Tile surfaces run tight tile gutters instead of the content inset. Drives `is-surface`. */
```

##### Core/Nexus/treePatch.ts

```/Core/Nexus/treePatch.ts diff
@@ -12 +12 @@ import type {
 } from './tree'
 import type { PropertyDefinition } from '../Properties/properties'
 import { basename, isAtOrUnder, relDirname, relJoin, titleFromPath } from '../Paths/posix'
-import { CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
+import {
+  ARCHIVE_DIR_REL,
+  archiveDirRel,
+  archivedCollectionIdOf,
+  CONTEXTS_DIR_REL,
+  contextDirRel,
+} from '../Paths/nexusPaths'
 import { asStringArray } from './coerce'
 import { resolveOrder } from './order'
 import { type ContainerKind, isContainer } from './entities'
 import { contextWorldOf } from '../Contexts/contextResolve'
+import { archiveStoreOf } from '../Paths/names'
 import { sameItems } from '@pommora/uix/Utilities/same'
 
 /** The ORIGINAL paths thread through: swapping against an already-swapped child re-prepends. */
@@ -75 +82 @@ export const containerTrailWhere = (
   match: ContainerMatch,
 ): (CollectionNode | SetNode)[] | null => trailIn(tree.collections, match)
 
-export const findContainerWhere = (
+export const containerTrailById = (
   tree: NexusTree,
-  match: ContainerMatch,
-): CollectionNode | SetNode | null => containerTrailWhere(tree, match)?.at(-1) ?? null
+  id: string,
+): (CollectionNode | SetNode)[] | null => containerTrailWhere(tree, (n) => n.id === id)
+
+export const findContainerById = (tree: NexusTree, id: string): CollectionNode | SetNode | null =>
+  containerTrailById(tree, id)?.at(-1) ?? null
+
+/** A Collection or a Set directly inside it: what keeps views of its own and an Archive place. */
+export const isTopContainer = (n: { kind: string; path: string }): boolean =>
+  n.kind === 'collection' || (n.kind === 'set' && n.path.split('/').length === 2)
+
+/** The Collection or top-level Set with this id; none once it's gone or sits deeper. */
+export function topContainerOf(
+  tree: NexusTree | null,
+  id: string,
+): CollectionNode | SetNode | undefined {
+  const node = tree && findContainerById(tree, id)
+  return node && isTopContainer(node) ? node : undefined
+}
 
-/** A Collection owns itself; anything else is owned by the Collection its path starts in, since Collections sit only at the Nexus root. */
+/** A Collection owns itself; anything else is owned by the Collection its path starts in, since Collections sit only at the Nexus root, or by the one whose Archive holds it. */
 export function owningCollection(
   tree: NexusTree | null,
   of: string | CollectionNode | SetNode,
 ): CollectionNode | undefined {
   if (typeof of !== 'string' && of.kind === 'collection') return of
-  const top = (typeof of === 'string' ? of : of.path).split('/', 1)[0]
-  return tree?.collections.find((c) => c.path === top)
+  const path = typeof of === 'string' ? of : of.path
+  const filed = archivedCollectionIdOf(path)
+  const top = path.split('/', 1)[0]
+  return tree?.collections.find((c) => (filed === null ? c.path === top : c.id === filed))
+}
+
+/** The Archive a reach covers: every one across the whole Nexus, or all of the owning Collection's for a reach scoped under `rel`, since an archived chain spells its folders as they were named when it left. A Collection whose id can't name a folder has none. */
+export function archiveReach(tree: NexusTree, rel?: string): string | null {
+  if (rel === undefined) return ARCHIVE_DIR_REL
+  const store = archiveStoreOf(owningCollection(tree, rel)?.id)
+  return store ? archiveDirRel(store.id) : null
 }
 
 export const NO_SCHEMA: PropertyDefinition[] = []
@@ -99 +131 @@ export const containerSchema = (
 ): PropertyDefinition[] => owningCollection(tree, of)?.properties ?? NO_SCHEMA
 
 export const containerAt = (tree: NexusTree, rel: string): CollectionNode | SetNode | null =>
-  findContainerWhere(tree, (n) => n.path === rel)
+  containerTrailWhere(tree, (n) => n.path === rel)?.at(-1) ?? null
 
 export const pagePathsIn = (node: CollectionNode | SetNode | null): string[] =>
   node ? [...node.pages.map((p) => p.path), ...(node.sets ?? []).flatMap(pagePathsIn)] : []
```

##### Core/Pages/fileHistory.ts

```/Core/Pages/fileHistory.ts diff
@@ -11 +11 @@ import {
   snapshotStore,
 } from '../Platform/stores'
 import { readFileHistoryConfig } from '../Settings/settings'
-import { liveIdOf, livePathOf } from '../Nexus/heldPages'
+import { archivedPageIds, idHeld, liveIdOf, livePathOf } from '../Nexus/heldPages'
+import { heldTreeOf } from '../Nexus/liveTree'
 import { updatePageBody } from '../Nexus/page'
 import type { BodyWrite } from './pageDetail'
 
@@ -193 +194 @@ export const clearHistory = (): Result<number> =>
 
 export async function sweepFileHistory(root: string): Promise<void> {
   try {
-    const { keepMs } = await readFileHistoryConfig(root)
-    const cutoff = Date.now() - keepMs
-    snapshotStore()?.sweepSnapshots(cutoff)
-    captureStore()?.sweepCaptures(cutoff)
+    const { keepMs, archiveKeepMs } = await readFileHistoryConfig(root)
+    const tree = heldTreeOf(root)
+    const ids = tree
+      ? [...(await archivedPageIds(root, tree)).values()].flatMap(({ id }) =>
+          id && !idHeld(root, id) ? [id] : [],
+        )
+      : []
+    const now = Date.now()
+    snapshotStore()?.sweepSnapshots(now - keepMs, { ids, cutoffMs: now - archiveKeepMs })
+    captureStore()?.sweepCaptures(now - keepMs)
   } catch (e) {
     console.error('file history: the sweep failed:', errText(e))
   }
```

##### Core/Paths/caseFold.ts

```/Core/Paths/caseFold.ts diff
@@ -67 +67 @@ export function matchScore(key: MatchKey, q: string): number | null {
   return place === null ? null : place - UNDER_NAMES
 }
 
+export const matches = (key: MatchKey, q: string): boolean => matchScore(key, q) !== null
+
 type Ranked<T> = { item: T; score: number; name: string }
 
 /** The items whose key matches `q`, best first, a tie broken by name. */
```

##### Core/Paths/exclusion.ts

```/Core/Paths/exclusion.ts diff
@@ -1 +1 @@
 import { foldKey } from './caseFold'
 import {
+  archiveSegs,
   ASSETS_DIRNAME,
   CONTEXT_JOURNAL_REL,
   NEXUS_DIR,
@@ -73 +74 @@ export interface WatchScope {
 
 export type OutsideReason = 'hidden' | 'asset' | 'excluded'
 
-/** What keeps a nexus-relative path outside the content the app reads, or null: a hidden folder or name on the way, the asset root (which holds files rather than content while remaining watched), or an excluded folder. */
+/** What keeps a nexus-relative path outside the content the app reads, or null: a hidden folder or name on the way, counted below `.nexus/archive` for a path inside it (the Archive is the one hidden folder read as content), the asset root (which holds files rather than content while remaining watched), or an excluded folder. */
 export function outsideContent(rel: string, scope: WatchScope): OutsideReason | null {
   const segs = rel.split('/')
-  if (segs.some(hiddenFolder)) return 'hidden'
+  if ((archiveSegs(segs) ?? segs).some(hiddenFolder)) return 'hidden'
   if (assetMatcher(scope.assetDir)(segs)) return 'asset'
   return excludedMatcher(scope.excluded)(segs) ? 'excluded' : null
 }
```

##### Core/Paths/names.ts

```/Core/Paths/names.ts diff
@@ -3 +3 @@ import { machine } from '../Platform/machine'
 import { foldKey } from './caseFold'
 import { hiddenFolder, hiddenName } from './exclusion'
 import { isMarkdownFile } from './posix'
-import { CROPS_REL } from './nexusPaths'
+import { type ArchiveStore, CROPS_REL } from './nexusPaths'
 import { expressibleInLink } from '../Connections/connections'
 
 type NameRole = 'page' | 'directory'
@@ -16 +16 @@ export function holdsName(name: string): boolean {
   return trimmed !== '' && trimmed !== '.' && trimmed !== '..' && !/[/\\\0]/.test(name)
 }
 
+/** The Archive a Collection id names: the id becomes one folder under the Archive's root, and a sidecar can carry any string as its id. */
+export const archiveStoreOf = (id: string | undefined): ArchiveStore | null =>
+  id !== undefined && holdsName(id) ? { kind: 'archive', id } : null
+
 // Every rule a name is held to, in one place. Returns the message to show, or null when the name is allowed.
 export function nameError(name: string, role: NameRole): string | null {
   const trimmed = name.trim()
```

##### Core/Paths/nexusPaths.ts

```/Core/Paths/nexusPaths.ts diff
@@ -4 +4 @@ export const NEXUS_DIR = '.nexus'
 
 export const TRASH_DIR = '.trash'
 
-/** The walk, the index, and every mutation refuse these. Not the watcher — it watches `.nexus`. */
-export const NON_CORPUS_TOP: ReadonlySet<string> = new Set([NEXUS_DIR, TRASH_DIR])
+export const ARCHIVE_DIR_REL = `${NEXUS_DIR}/archive`
+
+export type ArchiveStore = { kind: 'archive'; id: string }
+
+export const archiveDirRel = (collectionId: string): string => `${ARCHIVE_DIR_REL}/${collectionId}`
+
+export const archiveSegs = (segs: string[]): string[] | null =>
+  `${segs[0]}/${segs[1]}` === ARCHIVE_DIR_REL ? segs.slice(2) : null
+
+export const archivedCollectionIdOf = (rel: string): string | null =>
+  archiveSegs(rel.split('/'))?.[0] ?? null
+
+export const isArchived = (rel: string): boolean => archivedCollectionIdOf(rel) !== null
 
 /** The bare name exists because the watcher matches path segments rather than prefixes. */
 export const CONTEXTS_DIRNAME = 'contexts'
```

##### Core/Platform/stores.ts

```/Core/Platform/stores.ts diff
@@ -86 +86 @@ export interface SnapshotStore {
   readSnapshot(pageId: string, ts: number): string | null
   deleteSnapshots(pageId: string, ts: readonly number[]): number
   clearSnapshots(): number
-  sweepSnapshots(cutoffMs: number): number
+  sweepSnapshots(cutoffMs: number, archived: { ids: readonly string[]; cutoffMs: number }): number
 }
 
 export interface BaseRecord {
```

##### Core/Properties/assignment.ts

```/Core/Properties/assignment.ts diff
@@ -6 +6 @@ import { readJsonObject } from '../Files/atomicWrite'
 import { patchSidecar } from '../Files/sidecar'
 import { cachedValues, patchCacheBlock } from './propertyCache'
 import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
-import { type EntityRecord, pageIndexOf, recordById } from '../Nexus/record'
-import { damagedFolders } from '../Nexus/treePatch'
+import { linkWorld, type NexusPages, nexusPages } from '../Nexus/heldPages'
+import { owningCollection } from '../Nexus/treePatch'
 import { readRegistry, serializeSchemaOp } from './propertiesRegistry'
 import { byKey, type PropertyDefinition } from './properties'
 import {
@@ -49 +49 @@ export async function assignedDefs(
 export async function refillValues(
   root: string,
   def: PropertyDefinition,
-  roots: Record<string, EntityRecord>,
+  roots: NexusPages['byId'],
   values: Record<string, unknown>,
   frozen: Frozen,
 ): Promise<Set<string>> {
@@ -76 +76 @@ async function restoreCachedValues(
   // No readable definition → the cache stays whole: a def that reappears later still finds everything waiting.
   const def = (await readRegistry(root)).defs[propertyId]
   if (!def) return ok(null)
-  const under = `${relative(root, collectionFolder)}/`
+  const rel = relative(root, collectionFolder)
   const tree = await liveTreeOf(root)
-  const live = recordById(tree)
-  const members = Object.fromEntries(
-    Object.keys(cached).flatMap((id) =>
-      live[id]?.kind === 'page' && live[id].path.startsWith(under) ? [[id, live[id]]] : [],
-    ),
+  const { byId, archived } = await nexusPages(root, tree)
+  const members = new Map(
+    Object.keys(cached).flatMap((id) => {
+      const r = byId.get(id)
+      return r?.kind === 'page' && owningCollection(tree, r.path)?.path === rel
+        ? [[id, r] as const]
+        : []
+    }),
   )
-  const frozen = frozenWorld(pageIndexOf(tree))
+  const frozen = frozenWorld(linkWorld(tree, archived))
   // A cached Link naming a page gone leaves the cache: one whose page the Trash holds joins its bundle, one naming nothing is dropped.
   const gone =
     def.type === 'link'
-      ? Object.keys(members).flatMap((id) => {
+      ? [...members.keys()].flatMap((id) => {
           const entry = gonePageEntry(cached[id], frozen)
           return entry === null ? [] : [{ page: id, property: propertyId, value: entry }]
         })
@@ -149 +152 @@ export function assignProperty(
   })
 }
 
-export async function collectionFolders(root: string): Promise<string[]> {
-  const tree = await liveTreeOf(root)
-  const damaged = damagedFolders(tree.unreadable).filter((u) => u.kind === 'collection')
-  return [...tree.collections, ...damaged].map((c) => join(root, c.path))
-}
-
 export function reorderAssignment(
   root: string,
   collectionFolder: string,
```

##### Core/Properties/deleteProperty.ts

```/Core/Properties/deleteProperty.ts diff
@@ -1 +1 @@
-import { writePropertyBundle } from '../Trash/record'
-import { assignedIds, collectionFolders } from './assignment'
+import { mintBundle } from '../Bundles/bundle'
+import { type RecordFile, writeRecord } from '../Bundles/record'
+import { assignedIds } from './assignment'
 import { cachedValues, patchCacheBlock } from './propertyCache'
 import {
   readRegistry,
@@ -8 +9 @@ import {
   serializeSchemaOp,
 } from './propertiesRegistry'
 import { removeFromRegistry } from './registryProperty'
-import { type KeyedHolders, keyedHolders, keyHolderFiles } from './keyHolders'
+import { type KeyedHolders, keyedHolders } from './keyHolders'
+import { queryKeyHolders } from '../Index/contentIndex'
+import { nexusPages } from '../Nexus/heldPages'
+import { liveTreeOf } from '../Nexus/liveTree'
 import {
   clearSchemaJournal,
   type SchemaCascade,
@@ -16 +20 @@ import {
   type SchemaJournal,
   writeSchemaJournal,
 } from './propertyJournal'
-import { type Rewrite, sweepCount, sweepGovernedRoots, type SweepPlan } from './governedSweep'
+import {
+  collectionFolders,
+  governedReach,
+  type Rewrite,
+  sweepCount,
+  sweepGovernedRoots,
+  type SweepPlan,
+} from './governedSweep'
 import { stripKeys } from '../Files/rootValues'
 import { patchSidecar } from '../Files/sidecar'
 import { readJsonObject } from '../Files/atomicWrite'
@@ -25 +36 @@ import { spaceSidecars, withoutOrderId } from '../Contexts/spaceSidecar'
 
 import { isPlainObject } from '../Contract/validators'
 import { ok, type Result } from '../Contract/result'
-import { relative } from '../Paths/posix'
+import { join, relative } from '../Paths/posix'
 import type { MutateOutcome } from '../Nexus/mutateRequest'
 import { type ConfigReach, reachConfig } from '../Nexus/configReach'
 
+export async function writePropertyBundle(
+  root: string,
+  record: Extract<RecordFile, { entity: 'property' }>,
+): Promise<string> {
+  const bundle = await mintBundle(root, { kind: 'trash' }, join(root, `property-${record.id}`))
+  await writeRecord(bundle, record)
+  return bundle
+}
+
 async function snapshot(
   root: string,
   propertyId: string,
@@ -74 +94 @@ async function snapshot(
   })
 }
 
-export type PropertyDeletion = SchemaCascade & Required<Pick<MutateOutcome, 'trashed'>>
+export type PropertyDeletion = SchemaCascade & Required<Pick<MutateOutcome, 'bundled'>>
 
 export async function propertyHolders(root: string, propertyId: string): Promise<Result<number>> {
   const def = (await readRegistry(root)).defs[propertyId]
   if (!def) return NO_PROPERTY
-  const { held, plan } = await deletePlan(root, propertyId, def.key, await collectionFolders(root))
+  const { held, plan } = await deletePlan(root, propertyId, def.key)
   return ok(await sweepCount(root, held.strip, plan))
 }
 
@@ -95 +115 @@ async function deleteInner(root: string, propertyId: string): Promise<Result<Pro
   if (!def) return NO_PROPERTY
   const key = def.key
 
-  // EVERY collection folder, not just current assigners — a Remove-cache block lives on a collection sidecar that no longer assigns the id, and pre-cache dormant values may sit on any page.
-  const folders = await collectionFolders(root)
-  const planned = await deletePlan(root, propertyId, key, folders)
+  // EVERY collection folder, not just current assigners — a Remove-cache block lives on a collection sidecar that no longer assigns the id.
+  const folders = collectionFolders(root, await liveTreeOf(root))
+  const planned = await deletePlan(root, propertyId, key)
   const bundle = await snapshot(root, propertyId, def, folders, planned.held)
   // Journaled AFTER the snapshot — a replay re-runs the strip tail, never the bundle mint.
   const record: SchemaJournal = { op: 'delete', id: propertyId, key }
@@ -106 +126 @@ async function deleteInner(root: string, propertyId: string): Promise<Result<Pro
   const { removed, ...reach } = await stripAndRemove(root, propertyId, folders, planned)
   if (!removed.ok) return removed
   if (!reach.skipped) await clearSchemaJournal(root, record)
-  return ok({ trashed: { bundlePath: relative(root, bundle) }, ...schemaCascade(reach, record) })
+  return ok({ bundled: { bundlePath: relative(root, bundle) }, ...schemaCascade(reach, record) })
 }
 
 interface DeletePlan {
@@ -118 +138 @@ export async function deletePlan(
   root: string,
   propertyId: string,
   key: string,
-  folders: string[],
 ): Promise<DeletePlan> {
-  const held = await keyedHolders(await keyHolderFiles(root, key, folders), key)
+  const { byId } = await nexusPages(root, await liveTreeOf(root))
+  const held = await keyedHolders(await governedReach(root, queryKeyHolders(key)), key, byId)
   const raw: Rewrite = (r) => stripKeys(r, [key])
   return { held, plan: { raw, sidecars: withoutOrderId(raw, propertyId) } }
 }
```

##### Core/Properties/governedSweep.ts

```/Core/Properties/governedSweep.ts diff
@@ -6 +6 @@ import {
   rewritePreservingTimes,
 } from '../Files/atomicWrite'
 import { machine } from '../Platform/machine'
-import { isMarkdownFile, join } from '../Paths/posix'
+import { nexusCorpus } from '../Index/indexSeed'
+import { liveTreeOf } from '../Nexus/liveTree'
+import { archiveReach, damagedFolders } from '../Nexus/treePatch'
+import type { NexusTree } from '../Nexus/tree'
+import { isMarkdownFile, join, relative } from '../Paths/posix'
+import { isArchived } from '../Paths/nexusPaths'
 import { ID_KEY } from '../Nexus/identityMark'
 import { asString } from '../Nexus/coerce'
-import type { EntityRecord } from '../Nexus/record'
+import { addressable, type NexusPages } from '../Nexus/heldPages'
 import { splitFrontmatter, sweepParse, type SweptPage } from '../Files/pageFile'
 import type { Json } from '../Files/stableJson'
 import { spaceSidecars } from '../Contexts/spaceSidecar'
@@ -28 +33 @@ export type RewriteText = (content: string, file: string) => string | null
 
 export type SweepPlan = ({ raw: Rewrite } | { text: RewriteText }) & { sidecars?: Rewrite }
 
+export const collectionFolders = (root: string, tree: NexusTree): string[] =>
+  [
+    ...tree.collections,
+    ...damagedFolders(tree.unreadable).filter((u) => u.kind === 'collection'),
+  ].map((c) => join(root, c.path))
+
+/** A property key means something only where a schema governs it, so a property sweep opens its candidates inside a Collection or an Archive, never a loose file the index or the corpus also names. */
+export async function governedReach(
+  root: string,
+  candidates: string[] | null,
+  only?: string,
+): Promise<string[]> {
+  const tree = await liveTreeOf(root)
+  const archive = archiveReach(tree, only && relative(root, only))
+  const folders = [
+    ...(only === undefined ? collectionFolders(root, tree) : [only]),
+    ...(archive === null ? [] : [join(root, archive)]),
+  ]
+  return (candidates ?? (await nexusCorpus(root)))
+    .map((rel) => join(root, rel))
+    .filter((abs) => folders.some((folder) => abs.startsWith(`${folder}/`)))
+}
+
 export const unsweptLine = (count: number, what = ''): string =>
   `Couldn’t update ${what}${itemCount(count)}.`
 
@@ -110 +138 @@ export async function sweepGovernedRoots(
   return out
 }
 
-export const sweepCount = async (root: string, files: string[], plan: SweepPlan): Promise<number> =>
-  (await sweepGovernedRoots(root, files, plan, true)).touched.size
+/** A file outside the Archive: the only kind a confirmation, a what-changed count, or a cascade's `pages` names, since nothing displays an archived path. */
+export const outsideArchive = (root: string, file: string): boolean =>
+  !isArchived(relative(root, file))
+
+export async function sweepCount(root: string, files: string[], plan: SweepPlan): Promise<number> {
+  const shown = files.filter((file) => outsideArchive(root, file))
+  return (await sweepGovernedRoots(root, shown, plan, true)).touched.size
+}
 
 /** Returns the keys a sweep changed to what they held, each file whole while it still holds the sweep's write, so a write since to any other key or to the body is kept; answers the files it couldn't put back. */
 export async function undoSweep(touched: SweepResult['touched']): Promise<string[]> {
@@ -147 +181 @@ function keysPutBack(file: string, now: string, before: string, after: string):
   return jsonText(putBack(raw, file))
 }
 
-/** Rewrites each page or Space whose ID is in `values` — found where `roots` places it, matched by the ID it carries — and answers the IDs whose root now holds what its rewrite asked for; a null rewrite leaves its root as it is. */
+/** Rewrites each page or Space whose ID is in `values` — found where `roots`, the by-id projection, places it, matched by the ID it carries, and left alone where two files claim it — and answers the IDs whose root now holds what its rewrite asked for; a null rewrite leaves its root as it is. */
 export async function sweepRootsById<T>(
   root: string,
-  roots: Record<string, EntityRecord>,
+  roots: NexusPages['byId'],
   values: Record<string, T>,
   rewrite: (raw: Json, value: T) => Json | null,
 ): Promise<Set<string>> {
@@ -159 +193 @@ export async function sweepRootsById<T>(
     (idKey: string): Rewrite =>
     (raw, file) => {
       const id = asString(raw[idKey])
-      if (id === undefined || !Object.hasOwn(values, id)) return null
+      if (!addressable(roots, id) || !Object.hasOwn(values, id)) return null
       const next = rewrite(raw, values[id])
       if (next !== null) asked.set(file, id)
       return next
     }
   const ids = Object.keys(values)
-  const pages = ids.flatMap((id) => (roots[id]?.kind === 'page' ? join(root, roots[id].path) : []))
+  const pages = ids.flatMap((id) => {
+    const at = roots.get(id)
+    return at?.kind === 'page' ? join(root, at.path) : []
+  })
   const { skipped } = await sweepGovernedRoots(root, pages, {
     raw: byId(ID_KEY),
-    ...(ids.some((id) => roots[id]?.kind === 'space') ? { sidecars: byId('id') } : {}),
+    ...(ids.some((id) => roots.get(id)?.kind === 'space') ? { sidecars: byId('id') } : {}),
   })
   for (const file of skipped) asked.delete(file)
   return new Set(asked.values())
```

##### Core/Properties/keyHolders.ts

```/Core/Properties/keyHolders.ts diff
@@ -1 +1 @@
-// Intersected with the sweep's own scope folders: the index answers over the whole nexus, so an unintersected query would strip keys from pages the sweeps were meant to leave alone.
+// Key holders: the files holding a property's key, confirmed from disk, and the values they hold filed by ID for a strip to record.
 
 import { queryKeyHolders } from '../Index/contentIndex'
-import { corpusUnder, nexusCorpus } from '../Index/indexSeed'
 import { readJsonObject, readTextOrNull } from '../Files/atomicWrite'
 import { splitFrontmatter } from '../Files/pageFile'
 import { ID_KEY } from '../Nexus/identityMark'
 import { asString } from '../Nexus/coerce'
 import { isBlankRaw } from './propertyValue'
 import { spaceSidecars } from '../Contexts/spaceSidecar'
+import { governedReach, outsideArchive } from './governedSweep'
+import { addressable, type NexusPages } from '../Nexus/heldPages'
 
-export async function keyHolderFiles(
-  root: string,
-  key: string,
-  folders: string[],
-): Promise<string[]> {
-  return corpusUnder(root, queryKeyHolders(key) ?? (await nexusCorpus(root)), folders)
-}
-
-// Both loops answer from disk: the index holds a page as its last settled event read it, which an outside edit not yet settled can have changed, and the Spaces come from the folder enumeration the sweeps write through, which also finds those under a Context folder a rename cut short has moved ahead of the registry.
-export async function confirmedKeyHolders(
-  root: string,
-  key: string,
-  folders: string[],
-): Promise<string[]> {
+// A confirmation names only what's outside the Archive. Both loops answer from disk: the index holds a page as its last settled event read it, which an outside edit not yet settled can have changed, and the Spaces come from the folder enumeration the sweeps write through, which also finds those under a Context folder a rename cut short has moved ahead of the registry.
+export async function confirmedKeyHolders(root: string, key: string): Promise<string[]> {
   const holders: string[] = []
   const indexed = queryKeyHolders(key)
-  for (const file of corpusUnder(root, indexed ?? (await nexusCorpus(root)), folders)) {
+  for (const file of await governedReach(root, indexed)) {
+    if (!outsideArchive(root, file)) continue
     const content = await readTextOrNull(file)
     // An unreadable file holds the key when the index last read it holding it.
     if (content === null ? indexed !== null : Object.hasOwn(splitFrontmatter(content), key))
@@ -44 +34 @@ export interface KeyedHolders {
   partial: boolean
 }
 
-/** The values of the pages holding `key`, filed by ID, the files a strip should reach, and whether the values miss a holder: a holder with no ID, or whose ID another already took, is kept out of the strip, and a file that can't be read is stripped once it reads. */
-export async function keyedHolders(files: string[], key: string): Promise<KeyedHolders> {
+/** The values of the pages holding `key`, filed by ID, the files a strip should reach, and whether the values miss a holder: a holder with no ID, or with one `byId` marks as two files' claim, is kept out of the strip, and a file that can't be read is stripped once it reads. */
+export async function keyedHolders(
+  files: string[],
+  key: string,
+  byId: NexusPages['byId'],
+): Promise<KeyedHolders> {
   const values: Record<string, unknown> = {}
   const kept: string[] = []
-  const seen = new Set<string>()
   let unread = false
   for (const file of files) {
     const content = await readTextOrNull(file)
@@ -59 +52 @@ export async function keyedHolders(files: string[], key: string): Promise<KeyedH
     const fields = splitFrontmatter(content) as Record<string, unknown>
     if (!Object.hasOwn(fields, key)) continue
     const id = asString(fields[ID_KEY])
-    if (!id || seen.has(id)) {
+    if (!addressable(byId, id)) {
       kept.push(file)
       continue
     }
-    seen.add(id)
     if (!isBlankRaw(fields[key])) values[id] = fields[key]
   }
   return {
```

##### Core/Properties/optionOps.ts

```/Core/Properties/optionOps.ts diff
@@ -1 +1 @@
 import { mutateRegistry, readRegistry, NO_PROPERTY, serializeSchemaOp } from './propertiesRegistry'
 import { uniqueOptionGroups, validateOptionValues } from './schema'
-import { collectionFolders } from './assignment'
-import { keyHolderFiles } from './keyHolders'
-import { sweepCount, sweepGovernedRoots, type SweepPlan, unsweptLine } from './governedSweep'
+import { queryKeyHolders } from '../Index/contentIndex'
+import {
+  governedReach,
+  sweepCount,
+  sweepGovernedRoots,
+  type SweepPlan,
+  unsweptLine,
+} from './governedSweep'
 import { editList, valueEditRewrite, type ValueEdit } from './pageValue'
 import { editCaches } from './propertyCache'
 import { editHeldList, memberKey } from '../Files/rootValues'
@@ -194 +199 @@ async function valueEditPlan(
   def: PropertyDefinition,
   keys: ValueEdit,
 ): Promise<{ files: string[]; plan: SweepPlan }> {
-  const files = await keyHolderFiles(root, def.key, await collectionFolders(root))
+  const files = await governedReach(root, queryKeyHolders(def.key))
   const raw = valueEditRewrite(def, keys)
   return { files, plan: { raw, sidecars: raw } }
 }
```

##### Core/Properties/registryProperty.ts

```/Core/Properties/registryProperty.ts diff
@@ -18 +18 @@ import {
 } from './properties'
 import { ok, fail, type Result } from '../Contract/result'
 import { renameFrontmatterKey } from '../Files/pageFile'
-import { collectionFolders } from './assignment'
-import { confirmedKeyHolders, keyHolderFiles } from './keyHolders'
-import { sweepCount, sweepGovernedRoots, type SweepPlan } from './governedSweep'
+import { confirmedKeyHolders } from './keyHolders'
+import { queryKeyHolders } from '../Index/contentIndex'
+import { governedReach, sweepCount, sweepGovernedRoots, type SweepPlan } from './governedSweep'
 import { rekeyHeld, type KeyCollision } from '../Files/rootValues'
 import {
   clearSchemaJournal,
@@ -109 +109 @@ async function renamePlan(
   to: string,
 ): Promise<{ files: string[]; plan: SweepPlan }> {
   // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too.
-  const files = await keyHolderFiles(root, from, await collectionFolders(root))
+  const files = await governedReach(root, queryKeyHolders(from))
   const text = (content: string): string | null =>
     renameFrontmatterKey(content, from, to, NEW_KEY_IS_FRESHER)
   return { files, plan: { text, sidecars: (raw) => rekeyHeld(raw, from, to, NEW_KEY_IS_FRESHER) } }
@@ -123 +123 @@ export async function renameSweep(root: string, from: string, to: string): Promi
 export type PropertyRename = { from: string; to: string } & SchemaCascade
 
 async function bothKeyHolders(root: string, from: string, to: string): Promise<string[]> {
-  const folders = await collectionFolders(root)
-  const fromHolders = await confirmedKeyHolders(root, from, folders)
+  const fromHolders = await confirmedKeyHolders(root, from)
   if (fromHolders.length === 0) return []
-  const toHolders = new Set(await confirmedKeyHolders(root, to, folders))
+  const toHolders = new Set(await confirmedKeyHolders(root, to))
   return fromHolders.filter((f) => toHolders.has(f))
 }
 
```

##### Core/Properties/removeProperty.ts

```/Core/Properties/removeProperty.ts diff
@@ -1 +1 @@
 import { assignedIds } from './assignment'
 import { cachedValues, patchCacheBlock } from './propertyCache'
-import { keyedHolders, keyHolderFiles } from './keyHolders'
+import { keyedHolders } from './keyHolders'
+import { queryKeyHolders } from '../Index/contentIndex'
+import { nexusPages } from '../Nexus/heldPages'
+import { liveTreeOf } from '../Nexus/liveTree'
 import { patchSidecar } from '../Files/sidecar'
 import { sidecarPath } from '../Paths/paths'
 import { readJsonObject } from '../Files/atomicWrite'
-import { sweepGovernedRoots } from './governedSweep'
+import { governedReach, sweepGovernedRoots } from './governedSweep'
 import { stripKeys } from '../Files/rootValues'
 import { readRegistry, serializeSchemaOp } from './propertiesRegistry'
 import { ok, type Result } from '../Contract/result'
@@ -33 +36 @@ async function removeInner(
   if (!def) return NOTHING_TO_REMOVE
   const key = def.key
 
+  const { byId } = await nexusPages(root, await liveTreeOf(root))
   const { values, strip } = await keyedHolders(
-    await keyHolderFiles(root, key, [collectionFolder]),
+    await governedReach(root, queryKeyHolders(key), collectionFolder),
     key,
+    byId,
   )
   const clear = propertyClear(propertyId)
   // Views, cache, and the assignment change in ONE write under the sidecar's own lock, so the page-read window above can't revert a concurrent icon/banner/view write — THEN the pass and the page strip. The cache keeps the values it already holds, which a refill cut short left for pages it never reached.
```

##### Core/Properties/replaySchemaCascade.ts

```/Core/Properties/replaySchemaCascade.ts diff
@@ -3 +3 @@
 import { errText, fault, ok, type Result } from '../Contract/result'
 import { type ConfigReach, NO_REACH } from '../Nexus/configReach'
 import { readRegistry, serializeSchemaOp } from './propertiesRegistry'
-import { collectionFolders } from './assignment'
+import { collectionFolders } from './governedSweep'
+import { liveTreeOf } from '../Nexus/liveTree'
 import { renameSweep } from './registryProperty'
 import { deletePlan, stripAndRemove } from './deleteProperty'
 import { dropOptionFromDef, optionCascade } from './optionOps'
@@ -53 +54 @@ async function replay(
       const crashed = !answered && def !== undefined && def.key === journal.key
       const freed = !def && !Object.values(defs).some((d) => d.key === journal.key)
       if (!crashed && !freed) return NO_REACH
-      const folders = await collectionFolders(root)
+      const folders = collectionFolders(root, await liveTreeOf(root))
       const { skipped, hosts, removed } = await stripAndRemove(
         root,
         journal.id,
         folders,
-        await deletePlan(root, journal.id, journal.key, folders),
+        await deletePlan(root, journal.id, journal.key),
       )
       return { skipped: skipped + (crashed && !removed.ok ? 1 : 0), hosts }
     }
```

##### Core/Properties/Schema/PropertyFrame.tsx

```/Core/Properties/Schema/PropertyFrame.tsx diff
@@ -3 +3 @@ import { useRef, useState, type ReactNode } from 'react'
 import { Icon, type IconName } from '@pommora/uix/Symbols'
 import type { IconSize } from '@pommora/uix/Theme'
 import { useSession } from '../../Session/store'
-import { trashChanged } from '../../Session/nexusSlice'
+import { storesChanged } from '../../Session/nexusSlice'
 import {
   DEFAULT_LINK_DISPLAY,
   isReservedPropertyId,
@@ -294 +294 @@ export function PropertyFrame({
     else if (action === 'property:destroy' && (await askDestroyProperty(def.id, def.label))) {
       const deleted = await dialer().ask('property:delete', def.id)
       if (!reportRefusal(deleted)) return
-      trashChanged.emit()
+      storesChanged.emit()
       backToList()
       notifyTrashed(def.label, deleted.value, deleted.value.owed && replay(deleted.value.owed))
     }
```

##### Core/Session/navigationSlice.ts

```/Core/Session/navigationSlice.ts diff
@@ -49 +49 @@ import {
   bumpBodyEpoch,
   clearCache,
   dropPageDetail,
+  dropPageDetailsUnder,
   dropCacheDetail,
   fetchPageDetail,
   fetchPageResult,
@@ -611 +612 @@ export const createNavigationSlice: Slice<NavigationSlice> = (set, get) => {
         case 'set':
           set({ selection: { kind: 'set', id: target.id, path: target.path } })
           break
+        case 'archive':
+          set({ selection: { kind: 'archive', id: target.id } })
+          break
         case 'page':
           if (!(await landPage({ kind: 'page', id: target.id, path: target.path }))) return
           break
@@ -694 +698 @@ export const createNavigationSlice: Slice<NavigationSlice> = (set, get) => {
     patchPagesFor: (req) => {
       switch (req.op) {
         case 'delete':
+        case 'archive':
           dropPageDetail(req.path)
+          if (req.kind !== 'page') dropPageDetailsUnder(req.path)
           keepSlots((_, slot) => slot.target.path !== req.path)
           break
         case 'setBanner':
```

##### Core/Session/nexusSlice.ts

```/Core/Session/nexusSlice.ts diff
@@ -6 +6 @@ import {
   reportRefusal,
   unrestoredLine,
 } from '../Interface/Notifications/notifications'
-import { changesSettled, type MutateOutcome, type MutateRequest } from '../Nexus/mutateRequest'
+import {
+  changesSettled,
+  changesStores,
+  type MutateOutcome,
+  type MutateRequest,
+} from '../Nexus/mutateRequest'
 import { caught, type PommoraError, type Result, valueOr } from '../Contract/result'
 import type { NexusChange, NexusTree } from '../Nexus/tree'
 import type { SyncStatus } from '../Sync/Contract/wire'
@@ -59 +64 @@ export interface NexusSlice {
   choose: () => Promise<void>
   openPath: (path: string) => Promise<void>
   openDropped: (file: File) => Promise<void>
-  mutate: (req: MutateRequest) => Promise<MutateOutcome | null>
+  /** `quiet` posts nothing — no refusal, report, warning, or store change — for a batch that reports once for all its rows. */
+  mutate: (req: MutateRequest, opts?: { quiet?: true }) => Promise<MutateOutcome | null>
 }
 
 /** Every save the window still owes, landed ahead of a switch, a quit, or a write that moves, renames, or deletes: a page write after a switch's root flip would overwrite a same-relative-path file in the new Nexus. */
@@ -67 +73 @@ export async function flushAllSaves(): Promise<void> {
   await Promise.all([flushAllWriters(), tileDocsSettled()])
 }
 
-/** A delete, restore, or emptied bundle landed, so an open Trash list reads again. */
-export const trashChanged = emitter()
+/** What a store holds changed, so an open browser of it lists again. */
+export const storesChanged = emitter()
 
 export const createNexusSlice: Slice<NexusSlice> = (set, get) => {
   // One headings ask at a time, so an answer never lands over one asked after it.
@@ -233 +239 @@ export const createNexusSlice: Slice<NexusSlice> = (set, get) => {
     openPath: (path) => openVia(() => dialer().ask('nexus:openPath', path)),
     openDropped: (file) => openVia(() => dialer().openDropped(file)),
 
-    mutate: async (req) => {
+    mutate: async (req, { quiet } = {}) => {
       const held = get().tree
       const moves = req.op === 'rename' || req.op === 'movePage' || req.op === 'moveSet'
       if (changesSettled(req.op)) await flushAllSaves()
       // A flush held by a Nexus switch resumes after it, when the path this op names belongs to the Nexus it left.
       if (get().tree?.nexus.id !== held?.nexus.id) return null
       const res = await dialer().ask('mutate', req)
-      if (!reportRefusal(res)) return null
-      if (res.value.unrestored) notifyReport(unrestoredLine(res.value.unrestored), true)
-      const { cascade, retry } = res.value
-      if (req.op !== 'delete' && cascade)
-        warnCascade(cascade, retry ? () => void get().mutate(retry) : undefined)
-      if (req.op === 'delete' || req.op === 'restore' || req.op === 'emptyBundle')
-        trashChanged.emit()
+      if (!res.ok) {
+        if (!quiet) reportRefusal(res)
+        return null
+      }
+      if (!quiet) {
+        if (res.value.unrestored) notifyReport(unrestoredLine(res.value.unrestored), true)
+        const { cascade, retry } = res.value
+        if (req.op !== 'delete' && cascade)
+          warnCascade(cascade, retry ? () => void get().mutate(retry) : undefined)
+        if (changesStores(req)) storesChanged.emit()
+      }
       // The host pushed what this write changed before it replied, so the tree already holds it.
       get().patchPagesFor(req)
       const tree = get().tree
```

##### Core/Session/pageDetailCache.ts

```/Core/Session/pageDetailCache.ts diff
@@ -132 +132 @@ export function dropPageDetail(path: string): void {
   inFlight.delete(path)
 }
 
+/** A container that left takes its pages' cached details with it, so none returns from its old path. */
+export function dropPageDetailsUnder(dir: string): void {
+  const prefix = `${dir}/`
+  for (const map of [detailByPath, slots, baseByPath, inFlight])
+    for (const key of map.keys()) if (key.startsWith(prefix)) map.delete(key)
+}
+
 /** A returning reader would otherwise see the pre-write value. Editor state and scroll stay warm; only the detail refetches. */
 export function dropCacheDetail(path: string): void {
   detailByPath.delete(path)
```

##### Core/Session/reconcileSelection.ts

```/Core/Session/reconcileSelection.ts diff
@@ -3 +3 @@
 import type { NexusTree } from '../Nexus/tree'
 import type { SelectionState } from '../Navigation/navRef'
 import { reconcileIndexOf } from '../Nexus/treeIndex'
+import { isTopContainer } from '../Nexus/treePatch'
 import { sameItems } from '@pommora/uix/Utilities/same'
 
 export interface ReconcileIndex {
@@ -39 +40 @@ export function reconcileWith(index: ReconcileIndex, selection: SelectionState):
       }
       return path === selection.path ? selection : { kind: 'page', id: selection.id, path }
     }
+    case 'archive': {
+      const path = index.sets.get(selection.id)
+      return index.collections.has(selection.id) ||
+        (path !== undefined && isTopContainer({ kind: 'set', path }))
+        ? selection
+        : { kind: 'none' }
+    }
   }
 }
 
```

##### Core/Session/viewSearchSlice.ts

```/Core/Session/viewSearchSlice.ts diff
@@ -1 +1 @@
 import { tabKey } from '../Navigation/tabsModel'
-import { isContainer } from '../Nexus/entities'
+import { namesContainer } from '../Nexus/entities'
 import { tabOf } from './navigationSlice'
 import type { Slice } from './sessionState'
 
@@ -24 +24 @@ export const createViewSearchSlice: Slice<ViewSearchSlice> = (set, get) => ({
   viewSearch: {},
   searchView: (tabId) => {
     const target = tabOf(get(), tabId)?.target
-    if (!isContainer(target)) return false
+    if (!namesContainer(target)) return false
     const { viewSearch } = get()
     const open = viewSearch[tabId] ?? { key: tabKey(target), query: '', summon: 0 }
     set({ viewSearch: { ...viewSearch, [tabId]: { ...open, summon: open.summon + 1 } } })
```

##### Core/Session/windowSlice.ts

```/Core/Session/windowSlice.ts diff
@@ -4 +4 @@ import {
   type WindowsFile,
 } from '../Interface/Windows/windowRecord'
 import { isWindowTarget, type PageTarget, toNavRef, type WindowTarget } from '../Navigation/navRef'
+import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
 import { type ReconcileIndex, reconcileHeld, reconcileWith } from './reconcileSelection'
 import { reconcileIndexOf } from '../Nexus/treeIndex'
 import { liveTarget, makeTabId } from '../Navigation/tabsModel'
@@ -21 +22 @@ import { sessionWriter } from './saveScheduler'
 import { dialer } from '../Platform/dialer'
 import { normalizeLinkUrl } from '../Paths/urlPath'
 
+/** The one read-only reader: a page's File History, or an archived page titled by the trail it left. */
+export type Reader =
+  | { kind: 'history'; page: PageTarget }
+  | { kind: 'archive'; page: PageTarget; trail: TrailSegment[] }
+
 export interface WindowSlice {
   windowSlot: WindowState | null
   windowsFile: WindowsFile
   windowSlide: { dir: 'back' | 'fwd'; seq: number } | null
   windowExit: 'dismiss' | 'engulf' | 'morph'
   windowSummon: number
-  historyTarget: PageTarget | null
-  openHistory: (target: PageTarget) => void
-  closeHistory: () => void
+  reader: Reader | null
+  openReader: (reader: Reader) => void
+  closeReader: () => void
   openWindowTab: (target: WindowTarget, opts?: { at?: number; heading?: string }) => void
   activateWindowTab: (id: string) => void
   reorderWindowTabs: (id: string, beforeId: string | null) => void
@@ -63 +69 @@ export const windowTargetOf = (s: SessionState): WindowTarget | null => {
 
 export const windowsOpen = (s: SessionState): boolean =>
   s.windowSlot !== null ||
-  s.historyTarget !== null ||
+  s.reader !== null ||
   s.browserSummon !== null ||
   s.settingsOpen ||
   s.iterationOpen
 
 const CLOSED = {
   windowSlot: null,
-  historyTarget: null,
+  reader: null,
   browserSummon: null,
   settingsOpen: false,
   iterationOpen: false,
@@ -139 +145 @@ export const createWindowSlice: Slice<WindowSlice> = (set, get) => {
   return {
     ...PER_NEXUS,
     windowExit: 'dismiss',
-    openHistory: (target) => set({ historyTarget: target }),
-    closeHistory: () => set({ historyTarget: null }),
+    openReader: (reader) => set({ reader }),
+    closeReader: () => set({ reader: null }),
     openWindowTab: (target, { at, heading } = {}) => {
       const travel =
         heading && target.kind === 'page'
@@ -276 +282 @@ export const createWindowSlice: Slice<WindowSlice> = (set, get) => {
           commitWindow(closed && { ...closed, tabs })
         }
       }
-      const history = get().historyTarget
-      const r = history && reconcileWith(index, history)
-      if (r && r !== history) set({ historyTarget: r.kind === 'page' ? r : null })
+      const reader = get().reader
+      if (reader)
+        switch (reader.kind) {
+          case 'history': {
+            const r = reconcileWith(index, reader.page)
+            if (r !== reader.page)
+              set({ reader: r.kind === 'page' ? { kind: 'history', page: r } : null })
+            break
+          }
+          case 'archive':
+            break
+        }
     },
 
     resetWindow: () => {
```

##### Core/Settings/ClearActionRow.tsx

```/Core/Settings/ClearActionRow.tsx diff
@@ -1 +1 @@
 import { Button } from '@pommora/uix/Buttons/Button'
+import { useTimedLabel } from '@pommora/uix/Animations/useTimedLabel'
 import { SettingsFieldRow } from './SettingsFieldRow'
-import { useTimedLabel } from './useTimedLabel'
 
 export function ClearActionRow({
   label,
```

##### Core/Settings/NexusRows.tsx

```/Core/Settings/NexusRows.tsx diff
@@ -9 +9 @@ import type { SyncBinding, SyncState, SyncStatus } from '../Sync/Contract/wire'
 import type { TimeFormat } from '../Properties/columnStyles'
 import { clockOf } from '../Properties/formatValue'
 import { SettingsFieldRow } from './SettingsFieldRow'
-import { useTimedLabel } from './useTimedLabel'
+import { useTimedLabel } from '@pommora/uix/Animations/useTimedLabel'
 import { useSession, useSetting } from '../Session/store'
 import { useExperimental } from './experimental'
 import { trailingCluster, trailingFigure } from '@pommora/uix/Menus/menu-row.css'
```

##### Core/Settings/SettingsWindow.tsx

```/Core/Settings/SettingsWindow.tsx diff
@@ -16 +16 @@ import { WindowBase } from '@pommora/uix/Windows/WindowBase'
 import { SETTINGS_RAIL, SETTINGS_WIN } from '@pommora/uix/Windows/windowBounds'
 import { steppedPickerProps } from '@pommora/uix/Pickers/PickerControl'
 import { resolveColor } from '@pommora/uix/Theme/ramp'
-import { SETTING_DEFAULTS, SETTING_RANGES, type SettingKey, settingOf } from './personalization'
+import {
+  boundOf,
+  SETTING_DEFAULTS,
+  SETTING_RANGES,
+  type SettingKey,
+  settingOf,
+} from './personalization'
 import { Reveal } from '@pommora/uix/Animations/Reveal'
 import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
 import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
@@ -254 +260 @@ function ToggleRow({ row }: { row: RowOf<'toggle'> }): React.JSX.Element {
 
 function ZoomRow({ row }: { row: RowOf<'zoom'> }): React.JSX.Element {
   const [value, set] = useRowValue<number>(row)
-  const range = row.device ? DEVICE_RANGES[row.key] : SETTING_RANGES[row.key]
+  const declared = row.device ? DEVICE_RANGES[row.key] : SETTING_RANGES[row.key]
+  const bound = row.device ? undefined : boundOf(row.key)
+  const ceiling = useSession((s) => bound && settingOf(personalizationOf(s), bound))
+  const range = ceiling ? { ...declared, max: ceiling } : declared
   return (
     <MenuRowView
       row={settingsRow(row, {
```

##### Core/Settings/TrashFrame.tsx

```/Core/Settings/TrashFrame.tsx diff
@@ -1 +1 @@
-import { useCallback, useEffect, useMemo, useState } from 'react'
+import { useState } from 'react'
 import { Checkbox } from '@pommora/uix/Controls/Checkbox'
 import { SearchField } from '@pommora/uix/Fields/SearchField'
-import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
 import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
 import { NavTrail } from '@pommora/uix/Elements/NavTrail'
+import { historical } from '@pommora/uix/Elements/nav-trail.css'
 import { MenuItem } from '@pommora/uix/Menus'
 import { overlay } from '@pommora/uix/Menus/menu-row.css'
-import { retained, toggled } from '@pommora/uix/Utilities/checkSet'
 import { cx } from '@pommora/uix/Utilities/cx'
 import { Icon } from '@pommora/uix/Symbols'
 import { entityIcon } from '../Assets/entityIconPolicy'
-import { itemCount } from '../Properties/properties'
 import { text } from '@pommora/uix/Theme'
-import { askEmptyTrash, spendBundle } from '../Interface/Confirm/confirmations'
-import { changesSettled, type MutateRequest } from '../Nexus/mutateRequest'
 import type { Personalization } from './personalization'
-import type { TrashRow } from '../Trash/trashRow'
+import type { BundleRow } from '../Bundles/rows'
 import { PropertyTypeIcon, propertyTypeIconName } from '../Properties/Cells/PropertyTypes'
-import { formatDate } from '../Properties/formatValue'
-import { containerTargets, contextTargets } from '../Actions/destinationTree'
-import { matchQuery, rankMatches } from '../Paths/caseFold'
 import { useSession } from '../Session/store'
-import { flushAllSaves, trashChanged } from '../Session/nexusSlice'
 import { personalizationOf } from '../Session/configSlice'
-import { notifyReport, unrestoredLine } from '../Interface/Notifications/notifications'
-import { dialer } from '../Platform/dialer'
-import { popMenu } from '../Actions/menuActions'
-import { trashMenuItems } from '../Actions/trashMenu'
-import { parseStyleAction, styleMenuItems } from '../Actions/columnMenu'
-import { dateDefaults, holdsStyle, resolveStyle, storedPick } from '../Properties/columnStyles'
-import { useNexusForms } from '../Views/Host/useColumnStyles'
+import { crumbSegments, useBundleBrowser } from '../Bundles/browser'
+import { DateHeading } from '../Bundles/DateHeading'
 import '../Navigation/nav-list.css'
 import './trash-frame.css'
 
-const PLURALS: Record<TrashRow['kind'], string> = {
-  page: 'pages',
-  collection: 'collections',
-  set: 'sets',
-  space: 'spaces',
-  context: 'contexts',
-  property: 'properties',
-}
-
-export function countPhrase(rows: TrashRow[]): string {
-  const kinds = new Set(rows.map((r) => r.kind))
-  const kind = kinds.size === 1 ? [...kinds][0] : null
-  if (kind === null) return itemCount(rows.length)
-  return rows.length === 1 ? `1 ${kind}` : `${rows.length} ${PLURALS[kind]}`
-}
-
-export function filterRows(rows: TrashRow[], query: string): TrashRow[] {
-  const q = matchQuery(query)
-  if (!q) return rows
-  return rankMatches(rows, q, (row) => row.match)
-}
-
 // Keyed on the nexus so a switch with Settings open mounts a body with its own list.
 export function TrashFrame(): React.JSX.Element {
   const nexusId = useSession((s) => s.tree?.nexus.id ?? '')
@@ -62 +27 @@ export function TrashFrame(): React.JSX.Element {
 }
 
 function TrashBody(): React.JSX.Element {
-  const nexus = useNexusForms()
-  const stored = useSession((s) => personalizationOf(s).trashColumnStyle)
-  // The Trash shows each deletion's time, where a view's date column leaves it hidden.
-  const defaults = { ...dateDefaults(nexus.dateFormat), time_format: nexus.clock }
-  const style = resolveStyle(stored, defaults, nexus.clock)
-  const setPersonalization = useSession((s) => s.setPersonalization)
-  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
-  const tree = useSession((s) => s.tree)
-  const mutate = useSession((s) => s.mutate)
-  const [rows, setRows] = useState<TrashRow[] | null>(null)
-  const [failed, setFailed] = useState(false)
   const [query, setQuery] = useState('')
-  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
-
-  const refresh = useCallback(async (): Promise<void> => {
-    const res = await dialer().ask('trash:list')
-    if (!res.ok) {
-      setFailed(true)
-      return
-    }
-    setFailed(false)
-    setRows(res.value)
-    const live = new Set(res.value.map((r) => r.bundlePath))
-    setChecked((prev) => retained(prev, live))
-  }, [])
-
-  useEffect(() => {
-    void refresh()
-    return trashChanged.subscribe(() => void refresh())
-  }, [refresh])
-
-  const shown = useMemo(() => filterRows(rows ?? [], query), [rows, query])
-  const toggle = (bundlePath: string): void => setChecked((prev) => toggled(prev, bundlePath))
-
-  const one = async (req: Extract<MutateRequest, { bundlePath: string }>): Promise<void> => {
-    if (await mutate(req)) spendBundle(req.bundlePath)
-  }
-
-  const many = async (
-    targets: TrashRow[],
-    op: 'restore' | 'emptyBundle',
-  ): Promise<{
-    done: TrashRow[]
-    refused: TrashRow[]
-    unrestored: string[]
-    warnings: string[]
-  }> => {
-    const done: TrashRow[] = []
-    const refused: TrashRow[] = []
-    const unrestored: string[] = []
-    const warnings = new Set<string>()
-    if (changesSettled(op)) await flushAllSaves()
-    for (const row of targets) {
-      const res = await dialer().ask('mutate', { op, bundlePath: row.bundlePath })
-      ;(res.ok ? done : refused).push(row)
-      if (!res.ok) continue
-      spendBundle(row.bundlePath)
-      unrestored.push(...(res.value.unrestored ?? []))
-      if (res.value.cascade?.warning) warnings.add(res.value.cascade.warning)
-    }
-    await refresh()
-    return { done, refused, unrestored, warnings: [...warnings] }
-  }
-
-  const restoreBatch = async (targets: TrashRow[]): Promise<void> => {
-    const addressable = targets.filter((r) => r.homeResolves)
-    const { done, refused, unrestored, warnings } = await many(addressable, 'restore')
-    const homeless = targets.filter((r) => !r.homeResolves)
-    const unmet = [
-      homeless.length > 0 &&
-        `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`,
-      refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
-      unrestored.length > 0 && unrestoredLine(unrestored),
-      ...warnings,
-    ].filter(Boolean)
-    notifyReport([`Restored ${countPhrase(done)}.`, ...unmet].join(' '), unmet.length > 0)
-  }
-
-  const emptyBatch = async (targets: TrashRow[]): Promise<void> => {
-    if (!(await askEmptyTrash(targets.length))) return
-    const { done, refused, warnings } = await many(targets, 'emptyBundle')
-    const unmet = [
-      refused.length > 0 && `${countPhrase(refused)} couldn’t be deleted.`,
-      ...warnings,
-    ].filter(Boolean)
-    notifyReport([`Deleted ${countPhrase(done)}.`, ...unmet].join(' '), unmet.length > 0)
-  }
-
-  const openColumnMenu = async (): Promise<void> => {
-    const action = await popMenu(styleMenuItems({ type: 'dateTime', current: style }))
-    const pick = action ? parseStyleAction(action) : null
-    if (!pick) return
-    const next = { ...stored, [pick.key]: storedPick(pick.key, pick.value, defaults, nexus.clock) }
-    setPersonalization('trashColumnStyle', holdsStyle(next) ? next : undefined)
-  }
+  const { listing, visible, checked, picked, toggle, openMenu, date } = useBundleBrowser(
+    { kind: 'trash' },
+    { query, shown: true },
+  )
+  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
 
-  const openMenu = async (row: TrashRow): Promise<void> => {
-    // Right-clicking an unchecked row acts on that row alone, whatever else is checked — a checked set is a deliberate construction. The batch is what the menu will actually act on: the CHECKED rows STILL IN VIEW, since deriving it from the unfiltered selection would let a filtered right-click read "Restore All", act on one row, and withhold the destination picker that row was owed.
-    const inSet = checked.has(row.bundlePath) ? shown.filter((r) => checked.has(r.bundlePath)) : []
-    const batch = inSet.length > 1
-    const targets = batch ? inSet : [row]
-    const homeless = !batch && !row.homeResolves
-    const destinationKind = row.kind === 'space' ? ('context' as const) : ('container' as const)
-    const action = await popMenu(
-      trashMenuItems({
-        batch,
-        ...(homeless
-          ? {
-              destinations:
-                destinationKind === 'context' ? contextTargets(tree) : containerTargets(tree),
-            }
-          : {}),
-      }),
-    )
-    if (!action) return
-    if (action.startsWith('restoreTo:')) {
-      const destination = { kind: destinationKind, id: action.slice('restoreTo:'.length) }
-      await one({ op: 'restore', bundlePath: row.bundlePath, destination })
-      return
-    }
-    switch (action) {
-      case 'restore':
-        await one({ op: 'restore', bundlePath: row.bundlePath })
-        break
-      case 'delete':
-        if (await askEmptyTrash(1)) await one({ op: 'emptyBundle', bundlePath: row.bundlePath })
-        break
-      case 'restoreAll':
-        await restoreBatch(targets)
-        break
-      case 'deleteAll':
-        await emptyBatch(targets)
-        break
+  const body = (): React.JSX.Element => {
+    switch (listing.status) {
+      case 'loading':
+        return <div className="trash-empty" />
+      case 'failed':
+        return (
+          <div className={cx('trash-empty', text.body.standard)}>The trash couldn't be read.</div>
+        )
+      case 'ready':
+        if (visible.length === 0)
+          return (
+            <div className={cx('trash-empty', text.body.standard)}>
+              {listing.rows.length === 0 ? 'Trash is empty.' : 'Nothing matches.'}
+            </div>
+          )
+        return (
+          <>
+            <div className="trash-scroll scroll-fade">
+              <div className="nav-list">
+                {visible.map((row) => (
+                  <TrashRowView
+                    key={row.bundlePath}
+                    row={row}
+                    checked={checked.has(row.bundlePath)}
+                    revealed={picked.length > 0}
+                    onToggle={() => toggle(row.bundlePath)}
+                    onMenu={() => void openMenu(row)}
+                    icon={
+                      row.kind === 'property'
+                        ? row.propertyType
+                          ? propertyTypeIconName(row.propertyType)
+                          : 'tag'
+                        : entityIcon(row.kind, row.icon, defaultIcons)
+                    }
+                    defaultIcons={defaultIcons}
+                    when={date.when(row.storedAt)}
+                  />
+                ))}
+              </div>
+            </div>
+            <Scrollbar />
+          </>
+        )
     }
   }
 
   return (
-    <div className={cx('trash-frame table is-clear', checked.size > 0 && 'has-checked')}>
+    <div
+      className="trash-frame table is-clear"
+      style={
+        date.width === null
+          ? undefined
+          : ({
+              '--trash-date-lane': `calc(${date.width}px + var(--trash-date-inset))`,
+            } as React.CSSProperties)
+      }
+    >
       <div className="nav-search-row">
         <SearchField className={text.body.standard} value={query} onValueChange={setQuery} />
       </div>
@@ -211 +102 @@ function TrashBody(): React.JSX.Element {
           </span>
           File Name
         </span>
-        {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a column label — it carries no click and no keyboard gesture of its own, exactly as the banner's and the cards' right-click surfaces do */}
-        <span
-          className="trash-head-date col-header"
-          onContextMenu={(e) => {
-            e.preventDefault()
-            void openColumnMenu()
-          }}
-        >
-          <Icon name="clock-fading" size="body" />
-          Time Deleted
-        </span>
+        <DateHeading
+          date={date}
+          className="trash-head-date"
+          sampleClass={text.caption.standard}
+          label={
+            <span className="trash-head-label">
+              <Icon name="clock-fading" size="body" />
+              Time Deleted
+            </span>
+          }
+        />
       </div>
 
-      {failed ? (
-        <div className={cx('trash-empty', text.body.standard)}>The trash couldn't be read.</div>
-      ) : rows === null ? (
-        <div className="trash-empty" />
-      ) : shown.length === 0 ? (
-        <div className={cx('trash-empty', text.body.standard)}>
-          {rows.length === 0 ? 'Trash is empty.' : 'Nothing matches.'}
-        </div>
-      ) : (
-        <>
-          <div className="trash-scroll scroll-fade">
-            <div className="nav-list">
-              {shown.map((row) => (
-                <TrashRowView
-                  key={row.bundlePath}
-                  row={row}
-                  checked={checked.has(row.bundlePath)}
-                  onToggle={() => toggle(row.bundlePath)}
-                  onMenu={() => void openMenu(row)}
-                  icon={
-                    row.kind === 'property'
-                      ? row.propertyType
-                        ? propertyTypeIconName(row.propertyType)
-                        : 'tag'
-                      : entityIcon(row.kind, undefined, defaultIcons)
-                  }
-                  defaultIcons={defaultIcons}
-                  when={
-                    row.deletedAt === null
-                      ? ''
-                      : formatDate(
-                          new Date(row.deletedAt).toISOString(),
-                          style.date_format,
-                          style.time_format,
-                          style.weekday,
-                        )
-                  }
-                />
-              ))}
-            </div>
-          </div>
-          <Scrollbar />
-        </>
-      )}
+      {body()}
     </div>
   )
 }
@@ -275 +123 @@ function TrashBody(): React.JSX.Element {
 function TrashRowView({
   row,
   checked,
+  revealed,
   onToggle,
   onMenu,
   icon,
   when,
   defaultIcons,
 }: {
-  row: TrashRow
+  row: BundleRow
   checked: boolean
+  revealed: boolean
   onToggle: () => void
   onMenu: () => void
   icon: string
@@ -292 +142 @@ function TrashRowView({
   return (
     <MenuItem
       className="trash-row table-divider"
+      revealed={revealed}
       leading={<Icon name={icon} size="headline" />}
       detail={
         <NavTrail
-          segments={row.crumbs.map((crumb) => ({
-            title: crumb.title,
-            icon: crumb.kind && entityIcon(crumb.kind, undefined, defaultIcons),
-          }))}
+          segments={crumbSegments(row.crumbs, defaultIcons)}
           iconSize="control"
-          className={cx('trash-trail', row.historical && 'is-historical')}
+          className={cx('trash-trail', row.historical && historical)}
         />
       }
-      trailing={
-        <span className={cx('trash-date', text.caption.standard, overScrollEllipsis)}>{when}</span>
-      }
+      trailing={<span className={cx('trash-date', text.caption.standard)}>{when}</span>}
       overlay={
         <Checkbox
           className={overlay}
```

##### Core/Settings/codec.ts

```/Core/Settings/codec.ts diff
@@ -1 +1 @@
 import { isPlainObject } from '../Contract/validators'
 import { COMMAND_IDS, type Commands, chordOf, DEFAULT_COMMANDS } from '../Actions/commands'
 import { asString } from '../Nexus/coerce'
-import { ASSETS_DIR_REL, NON_CORPUS_TOP, NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
+import { ASSETS_DIR_REL, NEXUS_CONFIG_FILES, NEXUS_DIR, TRASH_DIR } from '../Paths/nexusPaths'
 import { foldKey } from '../Paths/caseFold'
 import { rootSegs, type WatchScope } from '../Paths/exclusion'
 import { nexusConfig } from '../Paths/paths'
@@ -48 +48 @@ export function nexusFolderRefusal(raw: string): string | null {
     segs.some((s) => s === '.' || s === '..')
   )
     return 'That folder’s name can’t be written as a nexus path.'
-  if (NON_CORPUS_TOP.has(foldKey(segs[0]))) return 'That folder belongs to the app.'
+  if ([NEXUS_DIR, TRASH_DIR].includes(foldKey(segs[0]))) return 'That folder belongs to the app.'
   return null
 }
 
```

##### Core/Settings/frames.ts

```/Core/Settings/frames.ts diff
@@ -580 +580 @@ export const FRAMES = roster([
         ],
       },
       {
-        title: 'Deletion',
+        title: 'Trash & Archive',
         rows: [
           {
             kind: 'toggle',
             key: 'confirmDeletion',
             label: 'Confirm Before Deletion',
-            hint: 'Ask before deleting a page, a tile, or a folder that carries no schema. Collections, Sets, views and properties always ask.',
+            hint: 'Ask before deleting a page, a tile, or a folder that carries no schema. Collections, Sets, Contexts, Spaces, views and properties always ask.',
+          },
+          {
+            kind: 'toggle',
+            key: 'confirmArchiving',
+            label: 'Confirm Before Archiving',
+            hint: 'Ask before archiving a page or a Set.',
           },
           {
             kind: 'toggle',
             key: 'permanentDelete',
             label: 'Permanently Delete Files',
-            hint: 'Permanently deleted files will be deleted from this computer, keeping this off will move them to system trash.',
+            hint: 'Erase items emptied from the Trash instead of moving them to the system trash.',
           },
           {
             kind: 'toggle',
@@ -617 +623 @@ export const FRAMES = roster([
             label: 'History Timeframe',
             unit: DAYS,
           },
+          {
+            kind: 'zoom',
+            key: 'archiveHistoryDays',
+            label: 'Archive History Timeframe',
+            hint: "How long archived pages keep their snapshots; it follows 'History Timeframe' until set, and never exceeds it.",
+            unit: DAYS,
+          },
           {
             kind: 'zoom',
             key: 'historyInterval',
```

##### Core/Settings/handlers.ts

```/Core/Settings/handlers.ts diff
@@ -43 +43 @@ export const settingsHandlers = {
     if (!isKeyOf(personalizationSchema.shape, key)) return fault('Invalid personalization key.')
     await writePersonalization(root, key, settingValue(key, value))
     if (key === 'webZoomFactor') await ctx.applyZoom()
-    if (key === 'historyDays') void sweepFileHistory(root)
+    if (key === 'historyDays' || key === 'archiveHistoryDays') void sweepFileHistory(root)
     return ok(null)
   }),
 
```

##### Core/Settings/personalization.ts

```/Core/Settings/personalization.ts diff
@@ -187 +187 @@ const SETTINGS = {
   dismissPreviewOnPointer: flag(false),
   fileHistory: flag(true),
   historyDays: stepped(HISTORY_DAYS),
+  archiveHistoryDays: setting(numberCheck(HISTORY_DAYS, true), undefined, HISTORY_DAYS),
   historyInterval: stepped(HISTORY_INTERVAL),
   permanentDelete: flag(false),
-  // Off skips the confirmation only where nothing owns a schema: a page, a tile, a bare folder.
   confirmDeletion: flag(true),
+  confirmArchiving: flag(true),
   restoreLinksOnDeletion: flag(true),
   dateFormat: oneOf(DATE_FORMATS, 'full'),
   timeFormat: oneOf(TIME_FORMAT_SETTINGS, 'twelveHour'),
   trashColumnStyle: setting(columnStyle),
+  archiveColumnStyle: setting(columnStyle),
   openLinksInApp: flag(false),
   webZoomFactor: scaled(1),
   embedScale: scaled(0.9),
@@ -225 +227 @@ const SETTINGS = {
 }
 type Settings = typeof SETTINGS
 export type SettingKey = keyof Settings
-export type SettingValue<K extends SettingKey> =
-  | Exclude<Personalization[K], undefined>
-  | Settings[K]['fallback']
+export type SettingValue<K extends SettingKey> = K extends keyof typeof SETTING_BOUNDS
+  ? SettingValue<(typeof SETTING_BOUNDS)[K]>
+  : Exclude<Personalization[K], undefined> | Settings[K]['fallback']
 
 const eachSetting = <V>(pick: (s: Settings[SettingKey]) => V): Record<SettingKey, V> =>
   Object.fromEntries(Object.entries(SETTINGS).map(([k, s]) => [k, pick(s)])) as Record<
@@ -255 +257 @@ export type SteppedKey = {
   [K in SettingKey]: Settings[K]['range'] extends SteppedRange ? K : never
 }[SettingKey]
 
-export const settingOf = <K extends SettingKey>(p: Personalization, key: K): SettingValue<K> =>
-  (p[key] ?? SETTING_DEFAULTS[key]) as SettingValue<K>
+/** A stepped setting with a bound follows it until picked, and is lowered to it on write. */
+export const SETTING_BOUNDS = {
+  archiveHistoryDays: 'historyDays',
+} as const satisfies Partial<Record<SettingKey, SteppedKey>>
+
+export const boundOf = (key: SettingKey): SteppedKey | undefined =>
+  (SETTING_BOUNDS as Partial<Record<SettingKey, SteppedKey>>)[key]
+
+export const settingOf = <K extends SettingKey>(p: Personalization, key: K): SettingValue<K> => {
+  const bound = boundOf(key)
+  return (p[key] ?? (bound ? settingOf(p, bound) : SETTING_DEFAULTS[key])) as SettingValue<K>
+}
 
 // A Collection's Sets sit above or below its pages by setPlacement, a Set's by subSetPlacement.
 export const placementOf = (p: Personalization, containerKind: string): Placement =>
```

##### Core/Settings/settings.ts

```/Core/Settings/settings.ts diff
@@ -2 +2 @@ import { isPlainObject } from '../Contract/validators'
 import { type Commands, DEFAULT_COMMANDS } from '../Actions/commands'
 import {
   type Personalization,
+  SETTING_BOUNDS,
   type SettingKey,
   type SettingValue,
+  type SteppedKey,
   settingOf,
 } from './personalization'
 import { setOrDrop, updateNexusConfig } from '../Files/atomicWrite'
 import { heldTreeOf } from '../Nexus/liveTree'
 import { sessionRoot } from '../Nexus/session'
-import { normalizeExclusions, readSettings, scopeOf, type SettingsLeaves } from './codec'
+import {
+  normalizeExclusions,
+  readPersonalization,
+  readSettings,
+  scopeOf,
+  type SettingsLeaves,
+} from './codec'
 import { entryWithin, type WatchScope } from '../Paths/exclusion'
 import { fail, ok, type Result, fault } from '../Contract/result'
 
@@ -32 +40 @@ export async function updateCrops(
   if (!written.ok) throw new Error(written.error.message)
 }
 
+/** Best-effort: a corrupt crops.json must not block the change once what it keys has moved. */
+export async function rekeyCrops(
+  root: string,
+  remap: (key: string) => string | undefined,
+): Promise<void> {
+  await updateCrops(root, (byImage) =>
+    Object.fromEntries(Object.entries(byImage).map(([key, crop]) => [remap(key) ?? key, crop])),
+  ).catch(() => {})
+}
+
 /** Served from the tree main already holds; the disk read answers before a walk installs one, where a damaged file reads as the copy the open's gate read. */
 async function liveLeaves(
   root: string,
@@ -63 +81 @@ const DAY_MS = 86_400_000
 
 export async function readFileHistoryConfig(
   root: string,
-): Promise<{ enabled: boolean; intervalMs: number; keepMs: number }> {
+): Promise<{ enabled: boolean; intervalMs: number; keepMs: number; archiveKeepMs: number }> {
   const p = await readLivePersonalization(root)
   return {
     enabled: settingOf(p, 'fileHistory'),
     intervalMs: settingOf(p, 'historyInterval') * MINUTE_MS,
     keepMs: settingOf(p, 'historyDays') * DAY_MS,
+    archiveKeepMs: settingOf(p, 'archiveHistoryDays') * DAY_MS,
   }
 }
 
@@ -83 +102 @@ export function writeExcludedFolders(root: string, folders: string[]): Promise<v
   )
 }
 
-/** The excluded entries at or under `rel`, each relative to it. */
-export const excludedWithin = async (root: string, rel: string): Promise<string[]> =>
-  (await readWatchScope(root)).excluded.flatMap((entry) => entryWithin(entry, rel)?.join('/') ?? [])
-
-async function editExcluded(root: string, edit: (excluded: string[]) => string[]): Promise<void> {
-  const { excluded } = await readWatchScope(root)
-  const next = normalizeExclusions(edit(excluded)).folders
-  if (next.length !== excluded.length || next.some((entry, i) => entry !== excluded[i]))
-    await writeExcludedFolders(root, next)
-}
-
-/** An excluded entry follows the folder it names: a Collection or Set landing at `to` carries every entry at or under `from` with it. */
-export async function followExcludedFolders(root: string, from: string, to: string): Promise<void> {
-  if (from === to) return
-  await editExcluded(root, (excluded) =>
-    excluded.map((entry) => {
-      const rest = entryWithin(entry, from)
-      return rest ? [to, ...rest].join('/') : entry
-    }),
-  )
-}
-
-/** A landing that moves excluded entries rewrites the settings file, so it refuses before anything moves while that file can't be written. */
-export async function exclusionWriteRefusal(
+/** A Collection or Set moving from `from` to `to` carries every excluded entry and the asset directory at or under it. Each landing entry is written just ahead of its source, and the asset directory's source held as an entry, before the folder moves, so the list keeps its order, a case-only rename keeps the landed spelling, a source stays out of the tree until the folder has left it, and the write's refusal is the move's. `drop` settles the landing and re-keys the asset directory's crops once the folder has landed; `undo` writes back what was read when the move fails. */
+export async function carrySetAside(
   root: string,
-  entries: readonly string[],
-): Promise<Result<never> | null> {
-  if (!entries.length) return null
-  const settings = await updateNexusConfig(root, 'settings', () => null)
-  return settings.ok ? null : settings
-}
-
-/** A trashed Collection or Set takes its excluded entries with it; its record keeps them relative to it. */
-export async function releaseExcludedFolders(root: string, rel: string): Promise<void> {
-  await editExcluded(root, (excluded) =>
-    excluded.filter((entry) => entryWithin(entry, rel) === null),
-  )
+  from: string,
+  to: string,
+): Promise<Result<{ drop: () => Promise<void>; undo: () => Promise<void> }>> {
+  const { excluded, assetDir } = await readWatchScope(root)
+  const landing = (entry: string): string[] => {
+    const rest = entryWithin(entry, from)
+    return rest ? [[to, ...rest].join('/')] : []
+  }
+  const ahead = excluded.flatMap((entry) => [...landing(entry), entry])
+  const [asset] = landing(assetDir)
+  if (ahead.length === excluded.length && !asset)
+    return ok({ drop: async () => {}, undo: async () => {} })
+  const write = (folders: string[], dir: string) =>
+    updateNexusConfig(root, 'settings', (cur) => ({
+      ...setOrDrop(cur, 'excluded_folders', folders.length > 0 && folders),
+      ...(asset ? { asset_directory: dir } : {}),
+    }))
+  const folders = normalizeExclusions(asset ? [...ahead, assetDir] : ahead).folders
+  const written = await write(folders, asset)
+  if (!written.ok) return written
+  const kept = normalizeExclusions(excluded.map((entry) => landing(entry)[0] ?? entry)).folders
+  return ok({
+    drop: async () => {
+      if (kept.length < folders.length) await writeExcludedFolders(root, kept)
+      if (asset) await rekeyCrops(root, (key) => landing(key)[0])
+    },
+    undo: async () => {
+      await write(excluded, assetDir)
+    },
+  })
 }
 
-/** A restored Collection or Set lands with the entries its record kept. */
-export const reseatExcludedFolders = (root: string, rel: string, within: string[]): Promise<void> =>
-  editExcluded(root, (excluded) => [...excluded, ...within.map((rest) => `${rel}/${rest}`)])
-
-/** An `undefined` value resets the key to its built-in default — JSON omits it. */
+/** An `undefined` value resets the key to its built-in default — JSON omits it. A picked value above its bound lowers to it in the same write. */
 export function writePersonalization(root: string, key: string, value: unknown): Promise<void> {
   return updateSettings(root, (cur) => {
-    const p = isPlainObject(cur.personalization) ? cur.personalization : {}
-    return { ...cur, personalization: { ...p, [key]: value } }
+    const p = { ...(isPlainObject(cur.personalization) ? cur.personalization : {}), [key]: value }
+    const read = readPersonalization(p)
+    for (const [bounded, bound] of Object.entries(SETTING_BOUNDS) as [SteppedKey, SteppedKey][]) {
+      const cap = settingOf(read, bound) as number
+      if ((read[bounded] ?? 0) > cap) p[bounded] = cap
+    }
+    return { ...cur, personalization: p }
   })
 }
 
```

##### Core/Settings/trash-frame.css

```/Core/Settings/trash-frame.css diff
@@ -1 +1 @@
 .trash-frame.table {
-  --trash-date-lane: 140px; /* KNOB — fixed, so the dates line up down the list */
   --trash-date-inset: 8px; /* KNOB — clears the column divider, heading and rows alike */
   --cell-padding-x: var(--surface-inset);
   --heading-padding-y: 6px; /* KNOB */
@@ -52 +51 @@
   flex: 0 0 var(--trash-date-lane);
   display: flex;
   align-items: center;
-  gap: 6px;
   padding-left: var(--trash-date-inset);
+  padding-right: 0; /* the lane is the measured date plus its inset, as the rows' cells are */
+}
+.trash-head-label {
+  display: flex;
+  align-items: center;
+  gap: 6px;
 }
 
 .trash-scroll {
@@ -73 +77 @@
   border-top: var(--table-border);
 }
 
-.trash-frame.has-checked [data-reveal-host] {
-  --reveal: 1;
-  --reveal-hits: auto;
-}
 .trash-frame .trash-trail {
   padding-right: 8px; /* KNOB — with the cluster's 4px gap, mirrors --trash-date-inset across the divider */
 }
 .trash-date {
   flex: 0 0 var(--trash-date-lane);
   padding-left: var(--trash-date-inset);
+  white-space: nowrap;
   color: var(--label-secondary);
 }
 
-.trash-frame .is-historical {
-  font-style: italic;
-  color: var(--label-tertiary);
-}
-
 .trash-empty {
   flex: 1;
   display: flex;
```

##### Core/Settings/useTimedLabel.ts

```/Core/Settings/useTimedLabel.ts diff
@@ -1 +0 @@
-import { useEffect, useRef, useState } from 'react'
-
-const ACTIVE_MS = 1500
-
-export function useTimedLabel(idle: string, active: string): [string, () => void] {
-  const [done, setDone] = useState(false)
-  const timer = useRef<number | undefined>(undefined)
-  useEffect(() => () => window.clearTimeout(timer.current), [])
-  const mark = (): void => {
-    setDone(true)
-    window.clearTimeout(timer.current)
-    timer.current = window.setTimeout(() => setDone(false), ACTIVE_MS)
-  }
-  return [done ? active : idle, mark]
-}
```

##### Core/Testing/fixtures.ts

```/Core/Testing/fixtures.ts diff
@@ -1 +1 @@
 import { pageKey } from '../Connections/pageIndex'
+import { type BundleRow, matched } from '../Bundles/rows'
 import type { CascadeChange } from '../Nexus/cascade'
 import type { PageDetail } from '../Pages/pageDetail'
 import { machine } from '../Platform/machine'
@@ -28 +29 @@ export function detail(overrides: Partial<PageDetail> = {}): PageDetail {
   }
 }
 
+export function bundleRow(over: Partial<BundleRow> = {}): BundleRow {
+  const { title = 'Alpha' } = over
+  return matched({
+    bundlePath: `.trash/${title}.deleted`,
+    kind: 'page',
+    title,
+    crumbs: [{ kind: 'collection', title: 'Notes' }],
+    storedAt: 0,
+    homeResolves: true,
+    ...over,
+  })
+}
+
 export function titled(title: string, to: string): CascadeChange {
   return { names: new Map([[pageKey(title), to]]), label: title }
 }
```

##### Core/Testing/memoryStores.ts

```/Core/Testing/memoryStores.ts diff
@@ -229 +229 @@ const snapshots = (): SnapshotStore => {
       pages.clear()
       return n
     },
-    sweepSnapshots: (cutoffMs) => {
+    sweepSnapshots: (cutoffMs, archived) => {
+      const short = new Set(archived.ids)
       let n = 0
-      for (const p of pages.values())
-        for (const ts of [...p.keys()]) if (ts < cutoffMs && p.delete(ts)) n++
+      for (const [id, p] of pages)
+        for (const ts of [...p.keys()])
+          if ((ts < cutoffMs || (short.has(id) && ts < archived.cutoffMs)) && p.delete(ts)) n++
       return n
     },
   }
```

##### Core/Testing/settledMutate.ts

```/Core/Testing/settledMutate.ts diff
@@ -5 +5 @@ import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
 import { readNexus } from '../Nexus/readNexus'
 import { settleNow } from '../Nexus/settle'
 import { stabilize } from '../Nexus/treeStabilize'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 
 const QUIET = { push: () => {}, watch: async () => {} }
 
```

##### Core/Testing/storesContract.ts

```/Core/Testing/storesContract.ts diff
@@ -353 +353 @@ export function describeSnapshotStore(name: string, make: () => SnapshotStore):
       expect(store.listSnapshots('p1')).toEqual([{ ts: 200, source: 'edit' }])
     })
 
-    it('sweeps snapshots older than a cutoff', () => {
-      store.addSnapshot('p1', 100, 'edit', 'a')
-      store.addSnapshot('p1', 200, 'edit', 'b')
-      store.addSnapshot('p1', 300, 'edit', 'c')
-      expect(store.sweepSnapshots(200)).toBe(1)
+    it('sweeps snapshots older than the live cutoff, and an archived page’s older than its own', () => {
+      for (const id of ['p1', 'p2']) {
+        store.addSnapshot(id, 100, 'edit', 'a')
+        store.addSnapshot(id, 200, 'edit', 'b')
+        store.addSnapshot(id, 300, 'edit', 'c')
+      }
+      expect(store.sweepSnapshots(200, { ids: ['p2'], cutoffMs: 300 })).toBe(3)
       expect(store.listSnapshots('p1')).toEqual([
         { ts: 300, source: 'edit' },
         { ts: 200, source: 'edit' },
       ])
+      expect(store.listSnapshots('p2')).toEqual([{ ts: 300, source: 'edit' }])
     })
 
     it('clears every snapshot and reports the count', () => {
```

##### Core/Tiles/handlers.ts

```/Core/Tiles/handlers.ts diff
@@ -15 +15 @@ import {
   writeMarkdownTile,
 } from './tilesFile'
 import { hostDir } from './tileHosts'
-import { trashDeps } from '../Trash/bundle'
+import { trashDeps } from '../Trash/discard'
 import { captureLoser } from '../Sync/Arrival/captures'
 import { relative } from '../Paths/posix'
 import { tileFilePath } from '../Paths/paths'
```

##### Core/Tiles/tilesFile.ts

```/Core/Tiles/tilesFile.ts diff
@@ -24 +24 @@ import { newId } from '../Nexus/ids'
 import { mintDefaultView, mintViewId } from '../Views/views'
 import { readStoredView } from '../Views/viewsFile'
 import type { Json } from '../Files/stableJson'
-import { containerSchema, findContainerWhere } from '../Nexus/treePatch'
+import { containerSchema, findContainerById } from '../Nexus/treePatch'
 import { resolveUnderRoot } from '../Paths/pathSafety'
 import { atomicWriteFile, pathExists, rewritePageSerialized } from '../Files/atomicWrite'
 import { linksIn } from '../Connections/scan'
-import { discardFile } from '../Trash/bundle'
+import { discardFile, type TrashDeps } from '../Trash/discard'
 import { machine } from '../Platform/machine'
 import { liveTreeOf } from '../Nexus/liveTree'
 import { tileFilePath } from '../Paths/paths'
 import { tileHostsOf } from './tileHosts'
 import type { BodyWrite } from '../Pages/pageDetail'
-import type { TrashDeps } from '../Trash/bundle'
 
 // The entry and its leaf land in one write, so a board no window holds still shows the tile; a layout this build can't read seats as the empty board a window shows for it.
 const seatTile = (
@@ -75 +74 @@ const PICK_ENTRIES: Record<PickKind, (root: string, value: unknown) => Promise<R
   view: async (root, value) => {
     if (!isPlainObject(value) || typeof value.source_id !== 'string') return fault('Invalid pick.')
     const tree = await liveTreeOf(root)
-    const source = findContainerWhere(tree, (c) => c.id === value.source_id)
+    const source = findContainerById(tree, value.source_id)
     if (!source) return fail('not-found', 'That view’s source is gone.')
     let config: Json | null
     if (typeof value.view_id === 'string') {
```

##### Core/Trash/bundle.ts

```/Core/Trash/bundle.ts diff
@@ -1 +0 @@
-import { basename, dirname, join, relative } from '../Paths/posix'
-import { escapes } from '../Paths/pathSafety'
-import { machine } from '../Platform/machine'
-import { TRASH_DIR } from '../Paths/nexusPaths'
-import { pathExists } from '../Files/atomicWrite'
-import { noteOwn, recordWrite } from '../Files/writeEcho'
-import type { HostContext } from '../Contract/handlers'
-import { readLiveSetting } from '../Settings/settings'
-import type { TrashMode } from './trashRow'
-
-export const BUNDLE_SUFFIX = '.deleted'
-
-/** `.trash` reads as a shadow of the nexus, so a deleted page shows where it lived. A path that isn't under the root has no chain to mirror, and following its `..` would write outside the trash entirely — it lands flat instead. */
-async function trashChainDir(nexusRoot: string, absPath: string): Promise<string> {
-  const rel = relative(nexusRoot, absPath)
-  const chain = rel && !escapes(rel) ? dirname(rel) : '.'
-  const dir = join(nexusRoot, TRASH_DIR, chain)
-  await machine().mkdir(dir)
-  return dir
-}
-
-/** Where a bundled file lived before its delete: the bundle's chain under `.trash` mirrors the folder it left, and the artifact keeps its own tree. */
-export const deletedPathOf = (root: string, bundleAbs: string, file: string): string =>
-  join(relative(join(root, TRASH_DIR), dirname(bundleAbs)), relative(bundleAbs, file))
-
-export const fileStamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')
-
-const stampedLeaf = (stamp: string, n: number, base: string): string =>
-  n === 0 ? `${stamp}__${base}` : `${stamp}__${n}__${base}`
-
-export async function mintBundle(nexusRoot: string, absSource: string): Promise<string> {
-  const dir = await trashChainDir(nexusRoot, absSource)
-  const stamp = fileStamp()
-  const base = `${basename(absSource)}${BUNDLE_SUFFIX}`
-  for (let n = 0; ; n++) {
-    const bundle = join(dir, stampedLeaf(stamp, n, base))
-    if ((await machine().mkdir(bundle)) === 'created') return bundle
-  }
-}
-
-export async function trashFileFlat(nexusRoot: string, absPath: string): Promise<string> {
-  recordWrite(absPath)
-  const dir = await trashChainDir(nexusRoot, absPath)
-  const stamp = fileStamp()
-  const base = basename(absPath)
-  let dest = join(dir, stampedLeaf(stamp, 0, base))
-  for (let n = 1; await pathExists(dest); n++) dest = join(dir, stampedLeaf(stamp, n, base))
-  recordWrite(dest)
-  await machine().rename(absPath, dest)
-  return dest
-}
-
-export interface TrashDeps {
-  trashMode: TrashMode
-  trashToSystem: (absPath: string) => Promise<void>
-  permanentDelete?: boolean
-}
-
-export async function trashDeps(root: string, ctx: HostContext): Promise<TrashDeps> {
-  return {
-    trashMode: await ctx.trashMode(),
-    trashToSystem: (p) =>
-      machine().trashToSystem?.(p) ?? Promise.reject(new Error('This host has no system trash.')),
-    permanentDelete: await readLiveSetting(root, 'permanentDelete'),
-  }
-}
-
-/** A file the Trash can't list — a tile's text, an image sweep's leftover — still goes where Trash Mode sends deletions. */
-export async function discardFile(
-  nexusRoot: string,
-  absPath: string,
-  deps: TrashDeps,
-): Promise<void> {
-  if (deps.trashMode === 'nexus') await trashFileFlat(nexusRoot, absPath)
-  else {
-    recordWrite(absPath)
-    await deps.trashToSystem(absPath)
-  }
-  await noteOwn({ event: 'unlink', absPath, origin: 'own' })
-}
```

##### Core/Trash/delete.ts

```/Core/Trash/delete.ts diff
@@ -1 +1 @@
 import { basename, dirname, isAtOrUnder, join, relative } from '../Paths/posix'
-import { liveTreeOf, mutableTarget } from '../Nexus/liveTree'
+import { resolveUnderRoot } from '../Paths/pathSafety'
+import { collectionArchive } from '../Archive/archive'
+import { containerAt } from '../Nexus/treePatch'
+import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
 import { pagesOf } from '../Nexus/record'
 import { dropPageMetadata } from '../Nexus/pageMetadata'
 import { isContainer } from '../Nexus/entities'
-import { goneEdit, reachConfig, reachReport } from '../Nexus/configReach'
-import { pathExists, relocate } from '../Files/atomicWrite'
+import {
+  archivedSetIds,
+  goneContainers,
+  goneEdit,
+  reachConfig,
+  reachReport,
+} from '../Nexus/configReach'
+import { isArchived } from '../Paths/nexusPaths'
+import { pathExists, relocate, removeOwn } from '../Files/atomicWrite'
 import { fail, ok, valueOr } from '../Contract/result'
 import { mutateRegistryFile, readRegistryStrict, withContextAt } from '../Contexts/contextsRegistry'
 import { unlinkContextKey, unlinkSpaceValue } from '../Contexts/contextCascade'
 import type { MutateContext } from '../Nexus/mutate'
-import { dropSpaceOrder } from '../Nexus/reorder'
+import { dropContextOrder, dropDeparture } from '../Nexus/reorder'
 import { deleteCascade, joinCascades } from '../Nexus/cascade'
 import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
 import { machine } from '../Platform/machine'
-import { discardFile, mintBundle } from './bundle'
-import { contentPages, pageIdsOf } from './holdings'
+import { discardFile } from './discard'
+import { contentPages, mintBundle, openBundle, originPathOf, pageIdsOf } from '../Bundles/bundle'
 import {
   buildContextRecord,
-  gatherContentRecord,
   gatherContextEvidence,
   gatherLinkTargets,
   gatherSpaceRecord,
 } from './gather'
-import { type RecordFile, writeRecord } from './record'
-import { excludedWithin, exclusionWriteRefusal, releaseExcludedFolders } from '../Settings/settings'
+import { gatherContentRecord, type RecordFile, writeRecord } from '../Bundles/record'
+import { liftSetAside } from '../Nexus/folderEntity'
+
+/** A delete naming an Archive bundle takes the item inside it to the Trash under the chain it was archived from, so a Trash restore returns it there, and its record keeps the bundle it left for the Undo. Its pages' index rows sit at their Archive paths, while Link values name them where they lived. */
+async function fromArchive(root: string, req: Extract<MutateRequest, { op: 'delete' }>) {
+  if (!isArchived(req.path)) return null
+  const resolved = await resolveUnderRoot(root, req.path)
+  const opened = resolved.ok ? await openBundle(root, resolved.value) : null
+  if (!opened?.ok) return NOT_HELD
+  const { abs: bundle, store, record: held, artifact: abs } = opened.value
+  if (store.kind !== 'archive' || !abs) return NOT_HELD
+  if ((held.entity !== 'page' && held.entity !== 'set') || held.entity !== req.kind) return NOT_HELD
+  const pages = await contentPages(held.entity, abs)
+  const sets = held.entity === 'set' ? await archivedSetIds(root, abs) : []
+  return ok({
+    bundle,
+    abs,
+    origin: join(root, originPathOf(root, store, abs)),
+    under: pages.map((file) => relative(root, file)),
+    keys: pages.map((file) => originPathOf(root, store, file)),
+    edit: sets.length ? goneContainers(sets) : null,
+    record: { ...held, archive: relative(root, bundle) },
+  })
+}
 
 export async function deleteOp(
   { root, deps }: MutateContext,
   req: Extract<MutateRequest, { op: 'delete' }>,
 ): Promise<MutateReply> {
-  const resolved = await mutableTarget(root, req.path, [req.kind])
+  const archived = await fromArchive(root, req)
+  if (archived && !archived.ok) return archived
+  const from = archived?.value
+  const resolved = from ? ok(from.abs) : await mutableTarget(root, req.path, [req.kind])
   if (!resolved.ok) return resolved
   const abs = resolved.value
   const rel = relative(root, abs)
   if (!(await pathExists(abs))) return fail('not-found', 'Nothing to delete.')
   const before = await liveTreeOf(root)
-  const edit = goneEdit(before, req.kind, req.path)
   const contexts = req.kind === 'context' ? await readRegistryStrict(root) : null
   if (contexts && !contexts.ok) return contexts
-  if (isContainer(req)) {
-    const refused = await exclusionWriteRefusal(root, await excludedWithin(root, req.path))
-    if (refused) return refused
-  }
-  // Write-ahead: the record lands before any sweep destroys what it describes; a Space or Context sweep runs before its artifact moves and refuses on failure, a content strip runs after, so a failed move strips nothing, and the artifact moves before the configuration pass, so a delete cut short leaves evidence rather than silence.
-  const bundle = deps.trashMode === 'system' ? null : await mintBundle(root, abs)
-  // With no bundle to keep them, the pages' metadata entries leave with the delete, by the ids their files carry before the move.
-  const pageIds = bundle ? [] : await pageIdsOf(await contentPages(req.kind, abs))
-  const under = pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
-  const targets = bundle ? await gatherLinkTargets(root, before, rel, under) : {}
-  const write = bundle
-    ? async (record: RecordFile | null): Promise<void> => {
-        if (record)
-          await writeRecord(bundle, {
-            ...record,
-            ...(Object.keys(targets).length ? { targets } : {}),
-          })
+  const lifted = !from && isContainer(req) ? await liftSetAside(root, abs) : null
+  if (lifted && !lifted.ok) return lifted
+  let moved = false
+  try {
+    // Write-ahead: the record lands before any sweep destroys what it describes; a Space or Context sweep runs before its artifact moves and refuses on failure, a content strip runs after, so a failed move strips nothing, and the artifact moves before the configuration pass, so a delete cut short leaves evidence rather than silence.
+    const bundle =
+      deps.trashMode === 'system'
+        ? null
+        : await mintBundle(root, { kind: 'trash' }, from?.origin ?? abs)
+    const archive =
+      !bundle && req.kind === 'collection'
+        ? await collectionArchive(root, containerAt(before, req.path)?.id)
+        : null
+    const edit = from ? from.edit : goneEdit(before, req.kind, req.path, archive?.sets)
+    // With no bundle to keep them, the pages' metadata entries leave with the delete, by the ids their files carry before the move.
+    const pageIds = bundle
+      ? []
+      : await pageIdsOf([...(await contentPages(req.kind, abs)), ...(archive?.files ?? [])])
+    const under =
+      from?.under ?? pagesOf(before).flatMap((p) => (isAtOrUnder(p.path, rel) ? p.path : []))
+    const targets = bundle ? await gatherLinkTargets(root, before, rel, under) : {}
+    const write = bundle
+      ? async (record: RecordFile | null): Promise<void> => {
+          if (record)
+            await writeRecord(bundle, {
+              ...record,
+              ...(Object.keys(targets).length ? { targets } : {}),
+            })
+        }
+      : null
+    // A refused unlink leaves nothing deleted, so its bundle goes with it.
+    const unmint = async (e: unknown): Promise<never> => {
+      if (bundle) await removeOwn(bundle)
+      throw e
+    }
+    let record: RecordFile | null = null
+    let paths: string[] | null = null
+    if (req.kind === 'space') {
+      const registry = write ? await readRegistryStrict(root) : null
+      if (write) await write(await gatherSpaceRecord(before, abs, registry, null))
+      const swept = await unlinkSpaceValue(root, basename(dirname(abs)), basename(abs)).catch(
+        unmint,
+      )
+      if (write) await write(await gatherSpaceRecord(before, abs, registry, valueOr(swept, null)))
+    } else if (req.kind === 'context') {
+      const registry = contexts!.value
+      const title = basename(abs)
+      const at = registry.contexts.findIndex((c) => c.title === title)
+      const entry = registry.contexts[at]
+      const evidence = write && entry ? await gatherContextEvidence(abs, entry, at) : null
+      if (write && evidence) await write(buildContextRecord(evidence, null))
+      // By id, never by title: two entries sharing a title would otherwise erase both while only one folder is trashed.
+      const removed = await mutateRegistryFile(root, (cur) =>
+        entry ? { contexts: cur.contexts.filter((c) => c.id !== entry.id) } : cur,
+      )
+      if (!removed.ok) {
+        if (bundle) await removeOwn(bundle)
+        return removed
       }
-    : null
-  // A refused unlink leaves nothing deleted, so its bundle goes with it.
-  const unmint = async (e: unknown): Promise<never> => {
-    if (bundle) await machine().remove(bundle)
-    throw e
-  }
-  let record: RecordFile | null = null
-  let paths: string[] | null = null
-  if (req.kind === 'space') {
-    const registry = write ? await readRegistryStrict(root) : null
-    if (write) await write(await gatherSpaceRecord(abs, registry, null))
-    const swept = await unlinkSpaceValue(root, basename(dirname(abs)), basename(abs)).catch(unmint)
-    if (write) await write(await gatherSpaceRecord(abs, registry, valueOr(swept, null)))
-  } else if (req.kind === 'context') {
-    const registry = contexts!.value
-    const title = basename(abs)
-    const at = registry.contexts.findIndex((c) => c.title === title)
-    const entry = registry.contexts[at]
-    const evidence = write && entry ? await gatherContextEvidence(abs, entry, at) : null
-    if (write && evidence) await write(buildContextRecord(evidence, null))
-    // By id, never by title: two entries sharing a title would otherwise erase both while only one folder is trashed.
-    const removed = await mutateRegistryFile(root, (cur) =>
-      entry ? { contexts: cur.contexts.filter((c) => c.id !== entry.id) } : cur,
-    )
-    if (!removed.ok) {
-      if (bundle) await machine().remove(bundle)
-      return removed
+      const swept = await unlinkContextKey(root, title, entry?.id, abs).catch(async (e) => {
+        // A sweep cut short puts the entry back where it stood, so the Context can be deleted again.
+        if (entry) await mutateRegistryFile(root, withContextAt(entry, at))
+        return unmint(e)
+      })
+      if (entry && !bundle) await dropContextOrder(root, entry.id)
+      if (write && evidence) await write(buildContextRecord(evidence, valueOr(swept, null)))
+    } else {
+      record = write
+        ? (from?.record ?? (await gatherContentRecord(root, before, req.kind, abs)))
+        : null
+      if (write && record) await write({ ...record, partial: true })
+      paths = from?.keys ?? under
     }
-    const swept = await unlinkContextKey(root, title, entry?.id, abs).catch(async (e) => {
-      // A sweep cut short puts the entry back where it stood, so the Context can be deleted again.
-      if (entry) await mutateRegistryFile(root, withContextAt(entry, at))
-      return unmint(e)
+    if (bundle) await relocate(abs, join(bundle, basename(abs)))
+    else await machine().lock(abs, () => discardFile(root, abs, deps))
+    moved = true
+    if (archive) await machine().lock(archive.abs, () => discardFile(root, archive.abs, deps))
+    if (from) await removeOwn(from.bundle)
+    else await dropDeparture(root, before, req.kind, req.path)
+    await dropPageMetadata(root, pageIds)
+    const gone = paths
+      ? await deleteCascade(root, abs, [...paths, ...(archive?.origins ?? [])])
+      : null
+    if (write && record && gone)
+      await write({
+        ...record,
+        ...(gone.links.length ? { links: gone.links } : {}),
+        ...(gone.cascade.warning ? { partial: true as const } : {}),
+      })
+    const reach = edit ? reachReport(await reachConfig(root, edit)) : null
+    const cascade = gone && reach ? joinCascades(gone.cascade, reach) : (gone?.cascade ?? reach)
+    return ok({
+      ...(bundle ? { bundled: { bundlePath: relative(root, bundle) } } : {}),
+      ...(cascade ? { cascade } : {}),
     })
-    if (entry && !bundle) await dropSpaceOrder(root, entry.id)
-    if (write && evidence) await write(buildContextRecord(evidence, valueOr(swept, null)))
-  } else {
-    record = write ? await gatherContentRecord(root, req.kind, abs) : null
-    if (write && record) await write({ ...record, partial: true })
-    paths = under
+  } catch (e) {
+    if (!moved) await lifted?.value.undo()
+    throw e
   }
-  if (bundle) await relocate(abs, join(bundle, basename(abs)))
-  else await machine().lock(abs, () => discardFile(root, abs, deps))
-  await dropPageMetadata(root, pageIds)
-  const gone = paths ? await deleteCascade(root, abs, paths) : null
-  if (write && record && gone)
-    await write({
-      ...record,
-      ...(gone.links.length ? { links: gone.links } : {}),
-      ...(gone.cascade.warning ? { partial: true as const } : {}),
-    })
-  if (isContainer(req)) await releaseExcludedFolders(root, rel)
-  const reach = edit ? reachReport(await reachConfig(root, edit)) : null
-  const cascade = gone && reach ? joinCascades(gone.cascade, reach) : (gone?.cascade ?? reach)
-  return ok({
-    ...(bundle ? { trashed: { bundlePath: relative(root, bundle) } } : {}),
-    ...(cascade ? { cascade } : {}),
-  })
 }
```

##### Core/Trash/discard.ts

```/Core/Trash/discard.ts diff
@@ -0 +1 @@
+import { basename, join } from '../Paths/posix'
+import { machine } from '../Platform/machine'
+import { pathExists } from '../Files/atomicWrite'
+import { noteOwn, recordWrite } from '../Files/writeEcho'
+import type { HostContext } from '../Contract/handlers'
+import { readLiveSetting } from '../Settings/settings'
+import { chainDir, fileStamp, stampedLeaf } from '../Bundles/bundle'
+import type { TrashMode } from './trashMode'
+
+export async function trashFileFlat(nexusRoot: string, absPath: string): Promise<string> {
+  recordWrite(absPath)
+  const dir = await chainDir(nexusRoot, { kind: 'trash' }, absPath)
+  const stamp = fileStamp()
+  const base = basename(absPath)
+  let dest = join(dir, stampedLeaf(stamp, 0, base))
+  for (let n = 1; await pathExists(dest); n++) dest = join(dir, stampedLeaf(stamp, n, base))
+  recordWrite(dest)
+  await machine().rename(absPath, dest)
+  return dest
+}
+
+export interface TrashDeps {
+  trashMode: TrashMode
+  trashToSystem: (absPath: string) => Promise<void>
+  permanentDelete?: boolean
+}
+
+export async function trashDeps(root: string, ctx: HostContext): Promise<TrashDeps> {
+  return {
+    trashMode: await ctx.trashMode(),
+    trashToSystem: (p) =>
+      machine().trashToSystem?.(p) ?? Promise.reject(new Error('This host has no system trash.')),
+    permanentDelete: await readLiveSetting(root, 'permanentDelete'),
+  }
+}
+
+/** A file the Trash can't list — a tile's text, an image sweep's leftover — still goes where Trash Mode sends deletions. */
+export async function discardFile(
+  nexusRoot: string,
+  absPath: string,
+  deps: TrashDeps,
+): Promise<void> {
+  if (deps.trashMode === 'nexus') await trashFileFlat(nexusRoot, absPath)
+  else {
+    recordWrite(absPath)
+    await deps.trashToSystem(absPath)
+  }
+  await noteOwn({ event: 'unlink', absPath, origin: 'own' })
+}
```

##### Core/Trash/gather.ts

```/Core/Trash/gather.ts diff
@@ -1 +1 @@
-import { basename, dirname, isAtOrUnder, join, relative } from '../Paths/posix'
-import { excludedWithin } from '../Settings/settings'
-import { stampedIdOf } from '../Files/pageFile'
+import { basename, dirname, isAtOrUnder, join } from '../Paths/posix'
 import type { ContextDef, ContextsRegistry } from '../Contexts/contexts'
 import type { Result } from '../Contract/result'
-import { liveTreeOf } from '../Nexus/liveTree'
-import { containerAt } from '../Nexus/treePatch'
 import type { SweepCapture, UnlinkOutcome } from '../Contexts/contextCascade'
 import { readTextOrNull } from '../Files/atomicWrite'
 import { spaceIdsIn } from '../Contexts/spaceSidecar'
-import { sidecarId } from '../Files/sidecar'
+import { sidecarIdentity } from '../Files/sidecar'
 import { exactTitle } from '../Paths/caseFold'
 import { readPageRelations } from '../Index/contentIndex'
 import { extractPageIndex } from '../Index/indexSeed'
 import { valueLinks } from '../Connections/scan'
 import { ID_KEY } from '../Nexus/identityMark'
 import { pageIndexOf } from '../Nexus/record'
+import { nexusPages } from '../Nexus/heldPages'
+import { buildPageIndex } from '../Connections/pageIndex'
 import type { NexusTree } from '../Nexus/tree'
 import type { Relation } from '../Platform/stores'
+import { contextWorldOf } from '../Contexts/contextResolve'
 
-import type { RecordFile, ParentRef } from './record'
-import type { ContainerKind } from '../Nexus/entities'
-
-async function gatherParentRef(root: string, absEntity: string): Promise<ParentRef> {
-  const parentDir = dirname(absEntity)
-  if (parentDir === root) return { kind: 'root' }
-  const id = containerAt(await liveTreeOf(root), relative(root, parentDir))?.id
-  return id ? { kind: 'container', id } : { kind: 'unaddressable' }
-}
+import { placeOf, type RecordFile } from '../Bundles/record'
 
 /** The page-to-page rows of the pages at `paths`: the index's, or read from their files by the index's own extractor while it has none to answer with. */
 async function pageRelationsOf(root: string, paths: readonly string[]): Promise<Relation[]> {
@@ -38 +29 @@ async function pageRelationsOf(root: string, paths: readonly string[]): Promise<
   )
 }
 
-/** What each outbound link at or under `rel` named: the id and path of the page its key resolves to alone, from the rows of the pages there (`paths`) and the values the Spaces there hold. */
+/** What each outbound link at or under `rel` named: the id and path of the page its key resolves to alone, from the rows of the pages there (`paths`) and the values the Spaces there hold; a key no live page answers names the archived page that answers it. */
 export async function gatherLinkTargets(
   root: string,
   tree: NexusTree,
   rel: string,
   paths: readonly string[],
 ): Promise<Record<string, { id: string; path: string }>> {
-  const index = pageIndexOf(tree)
+  const live = pageIndexOf(tree)
+  const archived = buildPageIndex((await nexusPages(root, tree)).archived)
   const out = new Map<string, { id: string; path: string }>()
   const note = (key: string): void => {
-    const page = out.has(key) ? undefined : index.resolve(key).page
+    const hit = live.resolve(key)
+    const page = out.has(key)
+      ? undefined
+      : hit.status === 'phantom'
+        ? archived.resolve(key).page
+        : hit.page
     if (page) out.set(key, { id: page.id, path: page.path })
   }
   for (const row of await pageRelationsOf(root, paths)) note(row.target)
@@ -58 +55 @@ export async function gatherLinkTargets(
   return Object.fromEntries(out)
 }
 
-export async function gatherContentRecord(
-  root: string,
-  kind: 'page' | ContainerKind,
-  abs: string,
-): Promise<RecordFile> {
-  const parent = await gatherParentRef(root, abs)
-  const id = kind === 'page' ? await stampedIdOf(abs) : await sidecarId(abs, kind)
-  return {
-    entity: kind,
-    ...(id ? { id } : {}),
-    parent,
-    ...(kind === 'page' ? {} : { excluded: await excludedWithin(root, relative(root, abs)) }),
-  }
-}
-
 const sweepIncomplete = (swept: UnlinkOutcome | null): boolean =>
   swept === null || swept.skipped.length > 0 || swept.refused.length > 0
 
 export async function gatherSpaceRecord(
+  tree: NexusTree,
   abs: string,
   registry: Result<ContextsRegistry> | null,
   swept: UnlinkOutcome | null,
 ): Promise<RecordFile | null> {
-  const id = await sidecarId(abs, 'space')
+  const { id, icon } = await sidecarIdentity(abs, 'space')
   if (!id) return null
   const contextTitle = basename(dirname(abs))
   const def = registry?.ok
     ? registry.value.contexts.find((c) => c.title === contextTitle)
     : undefined
+  const group = def && contextWorldOf(tree.contexts).groupById.get(def.id)
+  const place =
+    group &&
+    placeOf(
+      group.spaces.map((s) => s.id),
+      id,
+    )
   const captured = swept?.captured ?? []
   const members = captured
     .filter((c): c is SweepCapture & { id: string } => typeof c.id === 'string')
@@ -95 +85 @@ export async function gatherSpaceRecord(
   return {
     entity: 'space',
     id,
+    ...(icon ? { icon } : {}),
     parent: def ? { kind: 'context', id: def.id } : { kind: 'unaddressable' },
+    ...(place ? { place } : {}),
     members,
     ...(partial ? { partial: true as const } : {}),
   }
```

##### Core/Trash/handlers.ts

```/Core/Trash/handlers.ts diff
@@ -1 +1 @@
-import { type Handlers, withRoot } from '../Contract/handlers'
+import type { Handlers } from '../Contract/handlers'
 import { ok, type Result } from '../Contract/result'
-import { liveTreeOf } from '../Nexus/liveTree'
 import { sessionRoot } from '../Nexus/session'
-import { trashDeps } from './bundle'
-import { listBundles } from './holdings'
-import type { TrashMode } from './trashRow'
-import { trashRows } from './trashRows'
+import { trashDeps } from './discard'
+import type { TrashMode } from './trashMode'
 import { SETTING_DEFAULTS } from '../Settings/personalization'
 
 export const trashHandlers = {
-  'trash:list': withRoot(async (root) => {
-    return ok(trashRows(await listBundles(root), await liveTreeOf(root)))
-  }),
-
   'delete:facts': async (
     ctx,
   ): Promise<Result<{ trashMode: TrashMode; permanentDelete: boolean }>> => {
```

##### Core/Trash/holdings.ts

```/Core/Trash/holdings.ts diff
@@ -1 +1 @@
-// What the Trash holds — its bundles, the pages they hold at the paths they left, and the pages and Spaces they hold by ID — and the Link values a restore hands to it.
+// The Link values the Trash keeps for what it holds: a stripped value parked with the trashed page it names, so that page's restore writes it back, and a returning value refilled into a trashed copy it can't reach live.
 
-import { basename, join, relative } from '../Paths/posix'
-import { SPACE_SIDECAR, TRASH_DIR } from '../Paths/nexusPaths'
+import { basename, join } from '../Paths/posix'
+import { SPACE_SIDECAR } from '../Paths/nexusPaths'
 import { landValue } from '../Files/rootValues'
 import { readLinkText } from '../Connections/linkValue'
-import { buildPageIndex, type ConnPage, connPage } from '../Connections/pageIndex'
+import { buildPageIndex } from '../Connections/pageIndex'
 import type { StrippedLink } from '../Nexus/cascade'
 import { spaceIdsIn } from '../Contexts/spaceSidecar'
 import { rmwJsonStrict } from '../Files/atomicWrite'
 import { stampedIdOf } from '../Files/pageFile'
-import { listEntries, listMarkdownFiles } from '../Files/walk'
 import { sweepGovernedRoots } from '../Properties/governedSweep'
 import { isBlankRaw } from '../Properties/propertyValue'
-import { BUNDLE_SUFFIX, deletedPathOf } from './bundle'
-import { type RecordFile, appendLinks, bundleArtifact, readRecord } from './record'
+import { contentPages, listBundles, originPagesIn } from '../Bundles/bundle'
+import { patchRecord } from '../Bundles/record'
 
-export interface ListedBundle {
-  bundlePath: string
-  record: RecordFile
-  artifactName?: string
-}
-
-export async function listBundles(root: string): Promise<ListedBundle[]> {
-  const out: ListedBundle[] = []
-  const walk = async (dir: string): Promise<void> => {
-    for (const e of await listEntries(dir)) {
-      if (e.kind !== 'dir') continue
-      const abs = join(dir, e.name)
-      const record = e.name.endsWith(BUNDLE_SUFFIX) ? await readRecord(abs) : null
-      if (!record) {
-        await walk(abs)
-        continue
-      }
-      const artifact = record.entity === 'property' ? null : await bundleArtifact(abs)
-      if (record.entity !== 'property' && !artifact) continue
-      out.push({
-        bundlePath: relative(root, abs),
-        record,
-        ...(artifact ? { artifactName: basename(artifact) } : {}),
-      })
-    }
-  }
-  await walk(join(root, TRASH_DIR))
-  return out
-}
-
-export async function contentPages(
-  entity: RecordFile['entity'],
-  artifactAbs: string,
-): Promise<string[]> {
-  switch (entity) {
-    case 'page':
-      return [artifactAbs]
-    case 'collection':
-    case 'set':
-      return listMarkdownFiles(artifactAbs)
-    default:
-      return []
-  }
-}
-
-/** The ids `pages` carry, read from the files themselves. */
-export async function pageIdsOf(pages: string[]): Promise<string[]> {
-  const ids = await Promise.all(pages.map(stampedIdOf))
-  return ids.flatMap((id) => id ?? [])
-}
-
-const trashedPage = (root: string, bundleAbs: string, file: string, id: string): ConnPage =>
-  connPage(id, deletedPathOf(root, bundleAbs, file))
-
-/** Every trashed page at the path it left, its `id` the bundle holding it, since parking needs the bundle alone and reads no file. */
-async function trashedPages(root: string): Promise<ConnPage[]> {
-  const out: ConnPage[] = []
-  for (const { bundlePath, record, artifactName } of await listBundles(root)) {
-    if (!artifactName) continue
-    const bundle = join(root, bundlePath)
-    for (const file of await contentPages(record.entity, join(bundle, artifactName)))
-      out.push(trashedPage(root, bundle, file, bundle))
-  }
-  return out
-}
-
-/** One bundle's pages at the paths they left, with the ids their files carry; an ID-less one answers to its file, which no index holds as an id. */
-export async function trashedPagesOf(
-  root: string,
-  bundleAbs: string,
-  files: readonly string[],
-): Promise<ConnPage[]> {
-  const out: ConnPage[] = []
-  for (const file of files) {
-    const id = await stampedIdOf(file)
-    out.push(trashedPage(root, bundleAbs, file, id ?? file))
-  }
-  return out
-}
+const appendLinks = (bundleDir: string, links: StrippedLink[]): Promise<void> =>
+  patchRecord(bundleDir, (raw) => ({
+    links: [...(Array.isArray(raw.links) ? raw.links : []), ...links],
+  }))
 
 /** A Link value dropped for naming a page the Trash holds joins that page's bundle, so its restore writes it back; a key two trashed pages answer names neither. */
 export async function parkLinks(root: string, links: StrippedLink[]): Promise<void> {
   if (!links.length) return
-  const index = buildPageIndex(await trashedPages(root))
+  const index = buildPageIndex(await originPagesIn(root, { kind: 'trash' }))
   const parked = new Map<string, StrippedLink[]>()
   for (const link of links) {
     const page = readLinkText(link.value)
@@ -114 +38 @@ async function trashedHolders(
   ids: ReadonlySet<string>,
 ): Promise<Map<string, string>> {
   const found = new Map<string, string>()
-  for (const { bundlePath, record, artifactName } of await listBundles(root)) {
+  for (const { bundlePath, record, artifactName } of await listBundles(root, { kind: 'trash' })) {
     if (!artifactName) continue
     const artifact = join(root, bundlePath, artifactName)
     switch (record.entity) {
```

##### Core/Trash/record.ts

```/Core/Trash/record.ts diff
@@ -1 +0 @@
-import { join } from '../Paths/posix'
-import { z } from 'zod'
-import { hiddenName, rootSegs } from '../Paths/exclusion'
-import { mintBundle } from './bundle'
-import { readJsonObject, rmwJsonStrict, writeJson } from '../Files/atomicWrite'
-import { index } from '../Files/decoders'
-import { listEntries } from '../Files/walk'
-import { contextEntry } from '../Contexts/contexts'
-import type { StrippedLink } from '../Nexus/cascade'
-
-/** The underscore is load-bearing: the artifact shares this folder under its own real name, so the record wears a prefix no entity may. The atomic writer's temp sibling inherits it too, so it is skipped alongside Finder's litter. */
-const RECORD_FILENAME = '_record.json'
-
-const parentRef = z.discriminatedUnion('kind', [
-  z.object({ kind: z.literal('root') }),
-  z.object({ kind: z.literal('container'), id: z.string() }),
-  z.object({ kind: z.literal('context'), id: z.string() }),
-  z.object({ kind: z.literal('unaddressable') }),
-])
-
-const memberRoot = z.object({ id: z.string().optional(), kind: z.enum(['page', 'space']) })
-const spaceRef = z.object({ id: z.string().optional(), title: z.string() })
-
-const strippedLink: z.ZodType<StrippedLink> = z.object({
-  page: z.string(),
-  property: z.string(),
-  value: z.string(),
-})
-
-/** The page each outbound link under the artifact named at the delete, by its id and its path then under the key it was written with, so a restore follows it by identity and re-spells only what changed since. */
-const linkTargets = z.record(z.string(), z.object({ id: z.string(), path: z.string() })).optional()
-
-const contentRecord = <E extends string>(entity: E) =>
-  z.object({
-    entity: z.literal(entity),
-    id: z.string().optional(),
-    parent: parentRef,
-    /** The excluded entries a Collection or Set held, relative to it, so a restore lands with them wherever it lands. */
-    excluded: z.array(z.string().refine((p) => rootSegs(p).length > 0)).optional(),
-    /** Each Link value the delete stripped from a page outside it, by that page's id and the property's, so a restore can put it back. */
-    links: z.array(strippedLink).optional(),
-    targets: linkTargets,
-    partial: z.literal(true).optional(),
-  })
-
-// The record itself is never rewritten from its decode; `def` and `registry` decode loose because a restore writes them back.
-const recordFile = z.discriminatedUnion('entity', [
-  contentRecord('page'),
-  contentRecord('collection'),
-  contentRecord('set'),
-  z.object({
-    entity: z.literal('space'),
-    id: z.string(),
-    parent: parentRef,
-    members: z.array(memberRoot),
-    targets: linkTargets,
-    partial: z.literal(true).optional(),
-  }),
-  z.object({
-    entity: z.literal('property'),
-    id: z.string(),
-    // The definition as it stood, kept whole for the restore to decode.
-    def: z.looseObject({ id: z.string() }),
-    values: z.record(z.string(), z.unknown()),
-    assignments: z.array(z.string()).optional(),
-    caches: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
-    partial: z.literal(true).optional(),
-  }),
-  z.object({
-    entity: z.literal('context'),
-    registry: contextEntry,
-    at: index.optional(),
-    membership: z.array(z.object({ root: memberRoot, spaces: z.array(spaceRef) })),
-    targets: linkTargets,
-    partial: z.literal(true).optional(),
-  }),
-])
-
-export type RecordFile = z.infer<typeof recordFile>
-export type ParentRef = z.infer<typeof parentRef>
-
-export async function writeRecord(bundleDir: string, record: RecordFile): Promise<void> {
-  await writeJson(join(bundleDir, RECORD_FILENAME), record)
-}
-
-export async function writePropertyBundle(
-  root: string,
-  record: Extract<RecordFile, { entity: 'property' }>,
-): Promise<string> {
-  const bundle = await mintBundle(root, join(root, `property-${record.id}`))
-  await writeRecord(bundle, record)
-  return bundle
-}
-
-/** Raw, since a record is never rewritten from its decode. */
-export async function appendLinks(bundleDir: string, links: StrippedLink[]): Promise<void> {
-  await rmwJsonStrict(join(bundleDir, RECORD_FILENAME), (raw) => ({
-    ...raw,
-    links: [...(Array.isArray(raw.links) ? raw.links : []), ...links],
-  }))
-}
-
-export async function readRecord(bundleDir: string): Promise<RecordFile | null> {
-  const raw = await readJsonObject(join(bundleDir, RECORD_FILENAME))
-  if (raw === null) return null
-  const parsed = recordFile.safeParse(raw)
-  return parsed.success ? parsed.data : null
-}
-
-export async function bundleArtifact(bundleDir: string): Promise<string | null> {
-  const found = (await listEntries(bundleDir)).filter((e) => !hiddenName(e.name))
-  return found.length === 1 ? join(bundleDir, found[0].name) : null
-}
```

##### Core/Trash/resolve.ts

```/Core/Trash/resolve.ts diff
@@ -1 +0 @@
-// Where a recorded artifact re-enters: the placement resolved against the CURRENT tree, or the refusal that says why it cannot be placed.
-
-import { CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
-import { titleFromPath } from '../Paths/posix'
-import { freeName } from '../Paths/names'
-import type { CollectionNode, NexusTree, SetNode } from '../Nexus/tree'
-import { recordById } from '../Nexus/record'
-import { findContainerWhere } from '../Nexus/treePatch'
-import type { RecordFile } from './record'
-import { contextWorldOf } from '../Contexts/contextResolve'
-
-interface Placement {
-  dir: string
-  finalName: string
-  /** For a page, Space, or Context: the final title restore writes everywhere (folder, registry, re-applied membership keys, the links its arrival re-spells). Recorded titles are labels; this is the decision. */
-  finalTitle?: string
-}
-
-export type Refusal = 'parent-gone' | 'cannot-hold' | 'unaddressable' | 'id-live'
-type Resolution = { place: Placement } | { refuse: Refusal }
-
-/** The property shape is artifact-less — there is nothing to place. */
-export type ArtifactRecord = Exclude<RecordFile, { entity: 'property' }>
-
-type Container = CollectionNode | SetNode
-
-export const findContainerById = (tree: NexusTree, id: string): Container | null =>
-  findContainerWhere(tree, (n) => n.id === id)
-
-/** THE decision, against the CURRENT tree — a renamed parent resolves to its renamed path. The acting code branches on nothing: every name and title choice is made here. A live id refusal outranks every other answer — nothing may write over a living identity. */
-export function resolveRecord(
-  record: ArtifactRecord,
-  baseName: string,
-  tree: NexusTree,
-): Resolution {
-  const live = recordById(tree)
-  const recordId = record.entity === 'context' ? record.registry.id : record.id
-  if (recordId && live[recordId]) return { refuse: 'id-live' }
-
-  if (record.entity === 'context') {
-    const finalTitle = freeName(
-      record.registry.title,
-      tree.contexts.map((g) => g.def.title),
-    )
-    return { place: { dir: CONTEXTS_DIR_REL, finalName: finalTitle, finalTitle } }
-  }
-
-  if (record.entity === 'space') {
-    const parent = record.parent
-    if (parent.kind === 'unaddressable') return { refuse: 'unaddressable' }
-    if (parent.kind !== 'context') return { refuse: 'cannot-hold' }
-    const group = contextWorldOf(tree.contexts).groupById.get(parent.id)
-    if (!group) return { refuse: 'parent-gone' }
-    const finalTitle = freeName(
-      baseName,
-      group.spaces.map((s) => s.title),
-    )
-    return {
-      place: { dir: contextDirRel(group.def.title), finalName: finalTitle, finalTitle },
-    }
-  }
-
-  switch (record.parent.kind) {
-    case 'unaddressable':
-      return { refuse: 'unaddressable' }
-    case 'context':
-      return { refuse: 'cannot-hold' }
-    case 'root': {
-      if (record.entity !== 'collection') return { refuse: 'cannot-hold' }
-      const finalName = freeName(
-        baseName,
-        tree.collections.map((c) => c.title),
-      )
-      return { place: { dir: '', finalName } }
-    }
-    case 'container': {
-      if (record.entity === 'collection') return { refuse: 'cannot-hold' }
-      const parent = findContainerById(tree, record.parent.id)
-      if (!parent)
-        return live[record.parent.id] ? { refuse: 'cannot-hold' } : { refuse: 'parent-gone' }
-      // A page and a Set share one folder namespace — both sibling sets block both kinds.
-      const siblings = [
-        ...parent.pages.map((p) => p.title),
-        ...(parent.sets ?? []).map((s) => s.title),
-      ]
-      if (record.entity === 'page') {
-        const finalTitle = freeName(titleFromPath(baseName), siblings)
-        return { place: { dir: parent.path, finalName: `${finalTitle}.md`, finalTitle } }
-      }
-      return { place: { dir: parent.path, finalName: freeName(baseName, siblings) } }
-    }
-  }
-}
```

##### Core/Trash/restoreProperty.ts

```/Core/Trash/restoreProperty.ts diff
@@ -2 +2 @@ import { propertyDefinition } from '../Properties/properties'
 import { patchSidecar } from '../Files/sidecar'
 import { fail, ok, type Result, fault } from '../Contract/result'
 import { readRegistry, serializeSchemaOp } from '../Properties/propertiesRegistry'
-import type { RecordFile } from './record'
-import { pageIndexOf, recordById } from '../Nexus/record'
+import type { RecordFile } from '../Bundles/record'
+import { linkWorld, nexusPages, shownTitle } from '../Nexus/heldPages'
 import { liveTreeOf } from '../Nexus/liveTree'
 import { join } from '../Paths/posix'
 import { assignInner, refillValues } from '../Properties/assignment'
@@ -54 +54 @@ async function restoreInner(
   }
 
   const tree = await liveTreeOf(root)
-  const roots = recordById(tree)
-  const frozen = frozenWorld(pageIndexOf(tree))
+  const { byId: roots, archived } = await nexusPages(root, tree)
+  const frozen = frozenWorld(linkWorld(tree, archived))
   const dropped: StrippedLink[] = []
   const values = Object.fromEntries(
     Object.entries(record.values).filter(([id, raw]) => {
-      if ((roots[id]?.kind !== 'page' && roots[id]?.kind !== 'space') || isBlankRaw(raw))
+      const at = roots.get(id)
+      if ((at !== null && at?.kind !== 'page' && at?.kind !== 'space') || isBlankRaw(raw))
         return false
       const entry = def.type === 'link' ? gonePageEntry(raw, frozen) : null
       if (entry === null) return true
@@ -69 +70 @@ async function restoreInner(
   )
   const taken = await refillValues(root, def, roots, values, frozen)
   return ok({
-    unrestored: Object.keys(values).flatMap((id) => (taken.has(id) ? [] : roots[id].title)),
+    unrestored: Object.keys(values).flatMap((id) =>
+      taken.has(id) ? [] : (shownTitle(tree, roots, id) ?? []),
+    ),
     dropped,
   })
 }
```

##### Core/Trash/restoreScrub.ts

```/Core/Trash/restoreScrub.ts diff
@@ -28 +28 @@ import {
 } from '../Files/pageFile'
 import { basename, join } from '../Paths/posix'
 import { listPathsUnder } from '../Files/walk'
-import { contentPages } from './holdings'
-import type { RecordFile } from './record'
+import { contentPages } from '../Bundles/bundle'
+import type { RecordFile } from '../Bundles/record'
 import { hiddenFolder } from '../Paths/exclusion'
 import { SPACE_SIDECAR } from '../Paths/nexusPaths'
 import { sweepGovernedRoots, unsweptLine } from '../Properties/governedSweep'
```

##### Core/Trash/spend.ts

```/Core/Trash/spend.ts diff
@@ -1 +1 @@
-import { basename, dirname, join, relative } from '../Paths/posix'
-import { resolveUnderRoot } from '../Paths/pathSafety'
+import { basename, dirname, join } from '../Paths/posix'
 import { contextKey } from '../Contexts/contexts'
 import { spaceIdsIn, spaceSidecarsIn } from '../Contexts/spaceSidecar'
 import { rekeyContext } from '../Contexts/contextCascade'
-import { TRASH_DIR } from '../Paths/nexusPaths'
-import type {
-  MutateOutcome,
-  MutateReply,
-  MutateRequest,
-  RestoreDestination,
-} from '../Nexus/mutateRequest'
-import { landingRefusal } from '../Nexus/folderEntity'
-import type { MutateContext } from '../Nexus/mutate'
+import type { MutateOutcome, MutateReply, RestoreDestination } from '../Nexus/mutateRequest'
 import { fail, ok, type Result, fault } from '../Contract/result'
-import type { NexusTree } from '../Nexus/tree'
 import { mutateRegistryFile, withContextAt } from '../Contexts/contextsRegistry'
 import { restoreProperty } from './restoreProperty'
-import { repairLanded, scrubReturning } from './restoreScrub'
-import { exclusionWriteRefusal, readLiveSetting, reseatExcludedFolders } from '../Settings/settings'
-import { sweepRootsById, unsweptLine } from '../Properties/governedSweep'
+import { scrubReturning } from './restoreScrub'
+import { readLiveSetting } from '../Settings/settings'
+import { sweepRootsById } from '../Properties/governedSweep'
 import { joinValues, landValue } from '../Files/rootValues'
-import { respellings, rewriteConnections } from '../Connections/rewrite'
-import { buildPageIndex } from '../Connections/pageIndex'
+import { rewriteConnections } from '../Connections/rewrite'
 import { linkDefsOf } from '../Properties/propertiesRegistry'
 import { refillValues } from '../Properties/assignment'
-import { BUNDLE_SUFFIX, deletedPathOf } from './bundle'
-import { pathExists, relocate, rmwJsonStrict } from '../Files/atomicWrite'
+import {
+  contentPages,
+  fileInto,
+  openBundle,
+  type OpenBundle,
+  originPagesOf,
+  originPathOf,
+  pageIdsOf,
+} from '../Bundles/bundle'
+import { collectionOf, originOf } from '../Bundles/record'
+import { relocate, removeOwn, rmwJsonStrict } from '../Files/atomicWrite'
 import { dropPageMetadata } from '../Nexus/pageMetadata'
-import { dropSpaceOrder } from '../Nexus/reorder'
+import { dropContextOrder } from '../Nexus/reorder'
 import { machine } from '../Platform/machine'
-import { recordWrite } from '../Files/writeEcho'
+import { noteOwn, recordWrite } from '../Files/writeEcho'
+import { goneContainers, reachConfig, reachReport } from '../Nexus/configReach'
+import { collectionArchive } from '../Archive/archive'
+import { refileLanded } from '../Archive/refile'
 import { frozenWorld } from '../Properties/propertyValue'
-import { liveTreeOf } from '../Nexus/liveTree'
-import { settledIndex } from '../Nexus/settle'
+import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
+import { returningCascade } from '../Nexus/settle'
 
-import { type EntityRecord, pageIndexOf, pagesOf, recordById } from '../Nexus/record'
-import { type RecordFile, readRecord, bundleArtifact } from './record'
-import {
-  deleteCascade,
-  joinCascades,
-  linksNotUpdated,
-  renameCascade,
-  type StrippedLink,
-} from '../Nexus/cascade'
-import { contentPages, pageIdsOf, parkLinks, refillTrashed, trashedPagesOf } from './holdings'
-import { findContainerById, resolveRecord, type ArtifactRecord, type Refusal } from './resolve'
+import { linkWorld, type NexusPages, nexusPages, shownTitle } from '../Nexus/heldPages'
+import { deleteCascade, joinCascades, type StrippedLink, withUnswept } from '../Nexus/cascade'
+import { parkLinks, refillTrashed } from './holdings'
+import { NO_DESTINATION, placeRecord } from '../Bundles/placement'
 import { owningCollection } from '../Nexus/treePatch'
 import { contextWorldOf } from '../Contexts/contextResolve'
 
-const REFUSAL_TEXT: Record<Refusal, string> = {
-  'parent-gone': 'The place this belonged to no longer exists.',
-  'cannot-hold': 'The place this belonged to can no longer hold it.',
-  unaddressable: 'Where this belonged was never recorded.',
-  'id-live': 'Something in the nexus already carries this identity.',
-}
-
-async function openBundle(root: string, bundleAbs: string): Promise<Result<RecordFile>> {
-  const trashPrefix = `${join(root, TRASH_DIR)}/`
-  if (!bundleAbs.startsWith(trashPrefix) || !bundleAbs.endsWith(BUNDLE_SUFFIX))
-    return fault('Only a trash record can be spent.')
-  const record = await readRecord(bundleAbs)
-  return record ? ok(record) : fault('That deletion record is unreadable.')
-}
-
 // Artifact first: a failed bundle removal then leaves a record with no artifact, litter the listing skips, where the reverse order would orphan a live artifact.
 export async function emptyBundle(
   root: string,
@@ -71 +50 @@ export async function emptyBundle(
 ): Promise<MutateReply> {
   const opened = await openBundle(root, bundleAbs)
   if (!opened.ok) return opened
-  if (opened.value.entity === 'property') {
-    recordWrite(bundleAbs)
-    if (deps.permanentDelete === true) await machine().remove(bundleAbs)
-    else await deps.trashToSystem(bundleAbs)
+  const { store, record, artifact: artifactAbs } = opened.value
+  if (store.kind !== 'trash') return fault('Only a trash record can be emptied.')
+  const dispose = async (abs: string): Promise<void> => {
+    recordWrite(abs)
+    if (deps.permanentDelete === true) await machine().remove(abs)
+    else await deps.trashToSystem(abs)
+    await noteOwn({ event: 'unlink', absPath: abs, origin: 'own' })
+  }
+  if (record.entity === 'property') {
+    await dispose(bundleAbs)
     return ok({})
   }
-  const artifactAbs = await bundleArtifact(bundleAbs)
   if (!artifactAbs)
     return fail('not-found', "That deletion didn't finish, or something else is in with it.")
-  const pages = await contentPages(opened.value.entity, artifactAbs)
-  const pageIds = await pageIdsOf(pages)
-  recordWrite(artifactAbs)
-  if (deps.permanentDelete === true) await machine().remove(artifactAbs)
-  else await deps.trashToSystem(artifactAbs)
+  const archive = record.entity === 'collection' ? await collectionArchive(root, record.id) : null
+  const pages = await contentPages(record.entity, artifactAbs)
+  const pageIds = await pageIdsOf([...pages, ...(archive?.files ?? [])])
+  await dispose(artifactAbs)
+  if (archive) await dispose(archive.abs)
   await dropPageMetadata(root, pageIds)
-  if (opened.value.entity === 'context') await dropSpaceOrder(root, opened.value.registry.id)
-  // Permanent now: a Link value naming one of its pages, recorded by the delete or taken up since, names nothing any more unless another trashed page answers its key.
-  const gone = pages.length
-    ? await deleteCascade(
-        root,
-        artifactAbs,
-        pages.map((file) => deletedPathOf(root, bundleAbs, file)),
-      )
+  if (record.entity === 'context') await dropContextOrder(root, record.registry.id)
+  // Permanent now, a Collection's Archive with it: a Link value naming one of their pages, recorded by the delete or taken up since, names nothing any more unless another trashed page answers its key.
+  const paths = [
+    ...pages.map((file) => originPathOf(root, store, file)),
+    ...(archive?.origins ?? []),
+  ]
+  const gone = paths.length ? await deleteCascade(root, artifactAbs, paths) : null
+  const reach = archive?.sets.length
+    ? reachReport(await reachConfig(root, goneContainers(archive.sets)))
     : null
-  recordWrite(bundleAbs)
-  await machine().remove(bundleAbs)
-  const recorded = 'links' in opened.value ? (opened.value.links ?? []) : []
+  await removeOwn(bundleAbs)
+  const recorded = 'links' in record ? (record.links ?? []) : []
   await parkLinks(root, [...recorded, ...(gone?.links ?? [])])
-  return ok(gone ? { cascade: gone.cascade } : {})
+  const cascade = gone && reach ? joinCascades(gone.cascade, reach) : (gone?.cascade ?? reach)
+  return ok(cascade ? { cascade } : {})
 }
 
-const NO_DESTINATION = 'That kind cannot be given a destination.'
-
-function withDestination(
-  record: ArtifactRecord,
-  destination: RestoreDestination,
-  tree: NexusTree,
-): Result<ArtifactRecord> {
-  switch (record.entity) {
-    case 'space':
-      if (destination.kind !== 'context') return fail('invalid-path', 'A Space lives in a Context.')
-      if (!contextWorldOf(tree.contexts).groupById.has(destination.id))
-        return fail('not-found', 'That Context no longer exists.')
-      return ok({ ...record, parent: { kind: 'context', id: destination.id } })
-    case 'page':
-    case 'set':
-      if (destination.kind !== 'container')
-        return fail('invalid-path', 'Pages and Sets live in Collections and Sets.')
-      if (!findContainerById(tree, destination.id))
-        return fail('not-found', 'That place no longer exists.')
-      return ok({ ...record, parent: { kind: 'container', id: destination.id } })
-    default:
-      return fault(NO_DESTINATION)
-  }
-}
-
-type Restored = Pick<MutateOutcome, 'unrestored' | 'cascade'>
+type Restored = Pick<MutateOutcome, 'unrestored' | 'cascade' | 'landedAs'>
 
 const restored = (unrestored: string[]): Restored => (unrestored.length ? { unrestored } : {})
 
-export async function restoreOp(
-  { root }: MutateContext,
-  req: Extract<MutateRequest, { op: 'restore' }>,
-): Promise<MutateReply> {
-  const resolved = await resolveUnderRoot(root, req.bundlePath)
-  if (!resolved.ok) return resolved
-  return restoreArtifact(root, resolved.value, req.destination)
-}
-
-async function restoreArtifact(
+export async function restoreTrashed(
   root: string,
-  bundleAbs: string,
+  bundle: OpenBundle,
   destination?: RestoreDestination,
 ): Promise<Result<Restored>> {
-  const opened = await openBundle(root, bundleAbs)
-  if (!opened.ok) return opened
-  if (opened.value.entity === 'property') {
+  const { abs: bundleAbs, store, record: stored, artifact: artifactAbs } = bundle
+  if (stored.entity === 'property') {
     if (destination) return fault(NO_DESTINATION)
-    const rebuilt = await restoreProperty(root, opened.value)
+    const rebuilt = await restoreProperty(root, stored)
     if (!rebuilt.ok) return rebuilt
     await parkLinks(root, rebuilt.value.dropped)
     // A value that no longer fits is named rather than kept: the property is back, so its record could only ever refuse.
-    recordWrite(bundleAbs)
-    await machine().remove(bundleAbs)
+    await removeOwn(bundleAbs)
     return ok(restored(rebuilt.value.unrestored))
   }
-  const artifactAbs = await bundleArtifact(bundleAbs)
   if (!artifactAbs)
     return fail('not-found', 'That deletion never finished; there is nothing to restore.')
 
   const tree = await liveTreeOf(root)
-  const rehomed = destination ? withDestination(opened.value, destination, tree) : ok(opened.value)
-  if (!rehomed.ok) return rehomed
-  const record = rehomed.value
-  const resolution = resolveRecord(record, basename(artifactAbs), tree)
-  if ('refuse' in resolution) return fault(REFUSAL_TEXT[resolution.refuse])
-  const { dir, finalName, finalTitle } = resolution.place
-
-  const targetAbs = join(root, dir, finalName)
-  const targetRel = relative(root, targetAbs)
-  if (record.entity === 'collection' || record.entity === 'set') {
-    const refused =
-      (await landingRefusal(root, join(root, dir), finalName)) ??
-      (await exclusionWriteRefusal(root, record.excluded ?? []))
-    if (refused) return refused
-  }
-  // The tree is the resolver's universe; a file the walk cannot see (an Unknown squatter) could still occupy the target — refuse rather than clobber what nothing adjudicated.
-  if (await pathExists(targetAbs))
-    return fail('exists', 'Something already sits at the restored location.')
-  const back = await trashedPagesOf(root, bundleAbs, await contentPages(record.entity, artifactAbs))
+  const { byId: roots, archived } = await nexusPages(root, tree)
+  const placed = await placeRecord(
+    root,
+    stored,
+    destination,
+    { abs: bundleAbs, artifact: artifactAbs },
+    tree,
+    roots,
+  )
+  if (!placed.ok) return placed
+  const { record, placement, writeOrder, landedAs, into } = placed.value
+  const { dir, finalName, finalTitle } = placement
+  let targetAbs = join(root, dir, finalName)
+  const back = await originPagesOf(root, store, await contentPages(record.entity, artifactAbs))
   const targets = new Map(Object.entries(record.targets ?? {}))
-  const world = buildPageIndex([...pagesOf(tree), ...back])
+  const world = linkWorld(tree, archived, back)
   const frozen = frozenWorld(world, targets)
   const owner =
     record.entity === 'collection'
@@ -210 +153 @@ async function restoreArtifact(
     if (!committed.ok) return committed
   }
   try {
-    await machine().mkdir(dirname(targetAbs))
-    await relocate(
-      artifactAbs,
-      targetAbs,
-      record.entity === 'collection' || record.entity === 'set'
-        ? () => reseatExcludedFolders(root, targetRel, record.excluded ?? [])
-        : undefined,
-    )
+    // The Undo of a delete from the Archive lands in a bundle minted under the name its record keeps, reconciled as any Trash restore, and nothing lands in the tree.
+    if (into && (record.entity === 'page' || record.entity === 'set')) {
+      const origin = join(root, originPathOf(root, store, artifactAbs))
+      const { archive, links, targets, partial, ...filed } = record
+      targetAbs = join(
+        await fileInto(root, into, origin, artifactAbs, filed, basename(dir)),
+        finalName,
+      )
+    } else {
+      await machine().mkdir(dirname(targetAbs))
+      await relocate(artifactAbs, targetAbs)
+    }
   } catch (e) {
-    // The move is the irreversible half; the entry is the reversible one. Reversing it keeps the failure retryable — a ghost entry would trip the next attempt's own id-live guard.
+    // The move is the irreversible half and a Context's entry the reversible one. Reversing it keeps the failure retryable: a ghost entry would trip the next attempt's own id-live guard.
     if (record.entity === 'context')
       await mutateRegistryFile(root, (cur) => ({
         contexts: cur.contexts.filter((c) => !(c.id === record.registry.id && c.title === title)),
       }))
     return fault(e)
   }
-  // Two maps rather than one `relink`: the arrival's collisions read against the live world alone, since beside the returning pages a twin's bare link reads ambiguous and a returning `Notes/Alpha` would take `notes/alpha` from a live `X/Notes/Alpha`. `backNames` reads the returning pages' own keys against themselves, feeding the refill whole and the cascade only where the live world names nothing.
-  const after = await settledIndex(root)
-  const ids = back.map((p) => p.id)
-  const backNames = after
-    ? respellings(buildPageIndex(back), after, ids, [])
-    : new Map<string, string>()
-  const unswept: string[] = []
-  let cascade = after ? undefined : linksNotUpdated(title)
-  if (after) {
-    const repair = new Map<string, string>()
-    for (const [key, { id, path }] of targets) {
-      const q = after.byId.get(id)
-      const next = q && after.respell(key, q, path)
-      if (next) repair.set(key, next)
-    }
-    unswept.push(...(await repairLanded(root, tree, record.entity, targetAbs, repair)))
-    const live = pageIndexOf(tree)
-    const names = respellings(live, after, [], ids)
-    for (const [k, v] of backNames) if (live.resolve(k).status === 'phantom') names.set(k, v)
-    if (names.size) cascade = await renameCascade(root, { names, label: title })
-  }
-  const roots = recordById(tree)
+  await writeOrder?.()
+  const arrived = await returningCascade(root, tree, back, title, {
+    entity: record.entity,
+    abs: targetAbs,
+    repair: (after) => {
+      const repair = new Map<string, string>()
+      for (const [key, { id, path }] of targets) {
+        const q = after.byId.get(id)
+        const next = q && after.respell(key, q, path)
+        if (next) repair.set(key, next)
+      }
+      return repair
+    },
+  })
+  const { after, own, unswept } = arrived
+  const settled = after && heldTreeOf(root)
   const unspent: string[] = []
   const unlinked = new Set<string>()
   if (record.entity === 'context') {
@@ -287 +228 @@ async function restoreArtifact(
     (await readLiveSetting(root, 'restoreLinksOnDeletion'))
   ) {
     const defs = linkDefsOf(tree.config.registry)
-    const refilled = frozenWorld(after ?? world)
+    // Back in the Archive the page sits in no settled tree, so only the world from before the landing holds it.
+    const refilled = frozenWorld(settled && !into ? linkWorld(settled, archived) : world)
     const trashed: StrippedLink[] = []
     for (const def of defs) {
       const all = Object.fromEntries(
         record.links
           .filter((l) => l.property === def.id)
-          .map((l) => [l.page, rewriteConnections(l.value, backNames)]),
+          .map((l) => [l.page, rewriteConnections(l.value, own)]),
       )
       const taken = await refillValues(root, def, roots, all, refilled)
       for (const id of Object.keys(all))
-        if (!roots[id]) trashed.push({ page: id, property: def.id, value: all[id] })
+        if (roots.get(id) === undefined)
+          trashed.push({ page: id, property: def.id, value: all[id] })
         else if (!taken.has(id)) unlinked.add(id)
     }
     // A page or Space in the Trash takes its value back into its trashed copy, so it returns with it.
     await refillTrashed(root, trashed, new Map(defs.map((d) => [d.id, d.key])))
   }
-  if (unswept.length) {
-    const left = {
-      pages: [],
-      hosts: [],
-      warning: unsweptLine(unswept.length, `links in “${title}” across `),
-    }
-    cascade = cascade ? joinCascades(cascade, left) : left
-  }
+  const cascade = withUnswept(arrived.cascade, title, unswept)
   // The record outlives a partial re-tag, so what didn't come back stays written down.
   if (!unspent.length) {
-    recordWrite(bundleAbs)
-    await machine().remove(bundleAbs)
+    await removeOwn(bundleAbs)
   }
+  const left = originOf(stored)
+  if (!into) await refileLanded(root, record, left && collectionOf(left), dir)
   return ok({
-    ...restored([...unspent, ...unlinked].map((id) => roots[id].title)),
+    ...restored([...unspent, ...unlinked].flatMap((id) => shownTitle(tree, roots, id) ?? [])),
     ...(cascade ? { cascade } : {}),
+    ...(landedAs ? { landedAs } : {}),
   })
 }
 
-/** The ids of what's still here and didn't take its tag back; a root gone since has nothing to take it. */
+/** The ids of what's still here and didn't take its tag back, one of two files claiming its id among them; a root gone since has nothing to take it. */
 async function reapply(
   root: string,
-  roots: Record<string, EntityRecord>,
+  roots: NexusPages['byId'],
   key: string,
   additions: Record<string, string[]>,
 ): Promise<string[]> {
   const taken = await sweepRootsById(root, roots, additions, (raw, titles) =>
     landValue(raw, key, joinValues(raw[key], titles)),
   )
-  return Object.keys(additions).filter((id) => roots[id] && !taken.has(id))
+  return Object.keys(additions).filter((id) => roots.get(id) !== undefined && !taken.has(id))
 }
```

##### Core/Trash/trashMode.ts

```/Core/Trash/trashMode.ts diff
@@ -0 +1 @@
+/** The in-nexus `.trash` (portable, index-aware) or the macOS system Trash. Device-level since system Trash isn't portable nexus data. */
+export type TrashMode = 'nexus' | 'system'
+
+export const DEFAULT_TRASH_MODE: TrashMode = 'nexus'
```

##### Core/Trash/trashRow.ts

```/Core/Trash/trashRow.ts diff
@@ -1 +0 @@
-import type { HeldKind } from '../Nexus/entities'
-import type { PropertyType } from '../Properties/properties'
-import type { MatchKey } from '../Paths/caseFold'
-
-/** `kind` is absent on a historical crumb, which is a frozen folder name rather than a live entity. */
-export interface TrashCrumb {
-  kind?: HeldKind
-  title: string
-}
-
-/** Main owns the parse: the renderer never sees a `.deleted` suffix, a folder stamp, or the record union. */
-export interface TrashRow {
-  bundlePath: string
-  kind: HeldKind | 'property'
-  title: string
-  /** A property row's type, which picks its icon. */
-  propertyType?: PropertyType
-  /** Resolved live from the recorded parent id, so a renamed ancestor reads true. */
-  crumbs: TrashCrumb[]
-  /** Set when the recorded parent resolves to nothing and `crumbs` fell back to the frozen chain. */
-  historical?: boolean
-  /** Epoch milliseconds from the bundle's own stamp; null when it won't parse. */
-  deletedAt: number | null
-  /** False when restoring would refuse for want of a home — the signal to ask where instead. */
-  homeResolves: boolean
-  /** The search's key: the title, placed by the crumbs. */
-  match: MatchKey
-}
-
-/** The in-nexus `.trash` (portable, index-aware) or the macOS system Trash. Device-level since system Trash isn't portable nexus data. */
-export type TrashMode = 'nexus' | 'system'
-
-export const DEFAULT_TRASH_MODE: TrashMode = 'nexus'
```

##### Core/Trash/trashRows.ts

```/Core/Trash/trashRows.ts diff
@@ -1 +0 @@
-import { basename, dirname, titleFromPath } from '../Paths/posix'
-import type { NexusTree } from '../Nexus/tree'
-import type { TrashCrumb, TrashRow } from './trashRow'
-import { CONTEXTS_DIR_REL, TRASH_DIR } from '../Paths/nexusPaths'
-import { type ArtifactRecord, resolveRecord } from './resolve'
-import { containerTrailWhere } from '../Nexus/treePatch'
-import type { ListedBundle } from './holdings'
-import { propertyType } from '../Properties/properties'
-import { contextWorldOf } from '../Contexts/contextResolve'
-import { matchKey } from '../Paths/caseFold'
-
-const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/
-
-function deletedAtOf(bundlePath: string): number | null {
-  const m = STAMP.exec(basename(bundlePath).split('__')[0] ?? '')
-  if (!m) return null
-  const t = Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`)
-  return Number.isNaN(t) ? null : t
-}
-
-/** The only surviving evidence of where something lived once its recorded parent is gone. `.trash` mirrors the nexus faithfully, Contexts included, so a Space's chain arrives wearing the internal folders the live breadcrumb never shows — both prefixes come back off. */
-function frozenCrumbs(bundlePath: string): TrashCrumb[] {
-  const segments = dirname(bundlePath)
-    .split('/')
-    .filter((seg) => seg && seg !== '.' && seg !== TRASH_DIR)
-  const contexts = CONTEXTS_DIR_REL.split('/')
-  const inContexts = contexts.every((seg, i) => segments[i] === seg)
-  return (inContexts ? segments.slice(contexts.length) : segments).map((title) => ({ title }))
-}
-
-function liveCrumbs(record: ArtifactRecord, tree: NexusTree): TrashCrumb[] | null {
-  if (record.entity === 'context') return []
-  if (record.entity === 'space') {
-    const parent = record.parent
-    if (parent.kind !== 'context') return null
-    const group = contextWorldOf(tree.contexts).groupById.get(parent.id)
-    return group ? [{ kind: 'context', title: group.def.title }] : null
-  }
-  if (record.parent.kind === 'root') return record.entity === 'collection' ? [] : null
-  if (record.parent.kind !== 'container') return null
-  // Walked structurally rather than split from a path, since a crumb chain built from names is what the record model refuses.
-  const parentId = record.parent.id
-  const chain = containerTrailWhere(tree, (n) => n.id === parentId)
-  return chain?.map((n) => ({ kind: n.kind, title: n.title })) ?? null
-}
-
-function homeResolvesFor(record: ArtifactRecord, artifactName: string, tree: NexusTree): boolean {
-  const resolution = resolveRecord(record, artifactName, tree)
-  return !('refuse' in resolution) || resolution.refuse === 'id-live'
-}
-
-const matched = (row: Omit<TrashRow, 'match'>): TrashRow => ({
-  ...row,
-  match: matchKey(row.title, row.crumbs.map((c) => c.title).join('/')),
-})
-
-/** A property record has no artifact to name it, so its title is its definition's own; it lived nowhere, so it always has a home to return to. */
-export function trashRowOf(bundle: ListedBundle, tree: NexusTree): TrashRow | null {
-  const { record, bundlePath, artifactName } = bundle
-  if (record.entity === 'property') {
-    const type = propertyType.safeParse(record.def.type)
-    return matched({
-      bundlePath,
-      kind: 'property',
-      title: typeof record.def.label === 'string' ? record.def.label : record.id,
-      ...(type.success ? { propertyType: type.data } : {}),
-      crumbs: [],
-      deletedAt: deletedAtOf(bundlePath),
-      homeResolves: true,
-    })
-  }
-  if (!artifactName) return null
-  const live = liveCrumbs(record, tree)
-  return matched({
-    bundlePath,
-    kind: record.entity,
-    title: record.entity === 'page' ? titleFromPath(artifactName) : artifactName,
-    crumbs: live ?? frozenCrumbs(bundlePath),
-    ...(live ? {} : { historical: true }),
-    deletedAt: deletedAtOf(bundlePath),
-    homeResolves: homeResolvesFor(record, artifactName, tree),
-  })
-}
-
-export function trashRows(bundles: ListedBundle[], tree: NexusTree): TrashRow[] {
-  return bundles
-    .map((b) => trashRowOf(b, tree))
-    .filter((row) => row !== null)
-    .sort((a, b) => (b.deletedAt ?? -1) - (a.deletedAt ?? -1))
-}
```

##### Core/Views/creationOrder.ts

```/Core/Views/creationOrder.ts diff
@@ -3 +3 @@
 import type { CreateRequest } from '../Nexus/mutateRequest'
 import type { NexusTree } from '../Nexus/tree'
 import { type Personalization, type Placement, settingOf } from '../Settings/personalization'
-import { nextOrder } from '@pommora/uix/Utilities/moveItem'
+import { type Slot, spliceBeside } from '../Nexus/order'
 import { containerAt, pageIdsIn } from '../Nexus/treePatch'
 import { contextWorldOf } from '../Contexts/contextResolve'
 
-export type Slot = 'above' | 'below' | 'first' | 'last'
-
-export function spliceBeside(
-  ids: string[],
-  anchorId: string | null,
-  item: string,
-  where: Slot,
-): string[] {
-  const at = anchorId === null ? -1 : ids.indexOf(anchorId)
-  const before =
-    where === 'first'
-      ? (ids[0] ?? null)
-      : where === 'above'
-        ? anchorId
-        : where === 'below' && at >= 0
-          ? (ids[at + 1] ?? null)
-          : null
-  return nextOrder(ids, item, before)
-}
-
 function mergedRanking(
   existing: string[] | undefined,
   allIds: string[],
```

##### Core/Views/loadValues.ts

```/Core/Views/loadValues.ts diff
@@ -1 +1 @@
-import { join, relative } from '../Paths/posix'
+import { join } from '../Paths/posix'
 import type { PageValues } from './viewRow'
 import { pageValuesOf } from './pageValues'
 import { readPageRecord } from '../Nexus/readNexus'
-import { folderCorpus } from '../Index/indexSeed'
+import { liveTreeOf } from '../Nexus/liveTree'
+import { containerAt, pagePathsIn } from '../Nexus/treePatch'
 import { livePathOf } from '../Nexus/heldPages'
 
 async function corpus(
@@ -10 +11 @@ async function corpus(
   containerRelPath: string,
   pageIds?: readonly string[],
 ): Promise<string[]> {
-  if (!pageIds) return folderCorpus(rootPath, join(rootPath, containerRelPath))
-  return pageIds.flatMap((id) => {
-    const rel = livePathOf(rootPath, id)
-    return rel ? [join(rootPath, rel)] : []
-  })
+  if (!pageIds) return pagePathsIn(containerAt(await liveTreeOf(rootPath), containerRelPath))
+  return pageIds.flatMap((id) => livePathOf(rootPath, id) ?? [])
 }
 
 export async function loadValues(
@@ -24 +22 @@ export async function loadValues(
 ): Promise<Record<string, PageValues>> {
   const files = await corpus(rootPath, containerRelPath, pageIds)
   const records = await Promise.all(
-    files.map((absFile) => {
-      const relFile = relative(rootPath, absFile)
-      return readPageRecord(absFile, relFile).catch(() => null)
-    }),
+    files.map((rel) => readPageRecord(join(rootPath, rel), rel).catch(() => null)),
   )
   const out: Record<string, PageValues> = {}
   for (const rec of records) {
```

##### Core/Views/Host/useViewCreation.ts

```/Core/Views/Host/useViewCreation.ts diff
@@ -19 +19 @@ import { settingOf } from '../../Settings/personalization'
 import { declaredType, resolveFieldValue } from '../../Properties/value'
 import { filterSeeds } from '../Pipeline/creationSeeds'
 import { flattenContainer, frontmatterOf } from '../Pipeline/group'
-import { placeAt, placementSlot, type Slot, tieOrderWith } from '../creationOrder'
+import { placeAt, placementSlot, tieOrderWith } from '../creationOrder'
+import type { Slot } from '../../Nexus/order'
 import { pageIdsIn } from '../../Nexus/treePatch'
 import { groupKeyToValue } from '../reassign'
 import { useLatest } from '@pommora/uix/Utilities/stableApi'
```

##### Core/Views/Pipeline/search.ts

```/Core/Views/Pipeline/search.ts diff
@@ -1 +1 @@
-import { type MatchKey, matchScore } from '../../Paths/caseFold'
+import { type MatchKey, matches } from '../../Paths/caseFold'
 import { isEmptyBand, type ResolvedGroup } from '../viewRow'
 
 export function searchGroups(
@@ -7 +7 @@ export function searchGroups(
   keys: Map<string, MatchKey>,
 ): ResolvedGroup[] {
   return groups.flatMap((group) => {
-    const items = group.items.filter((row) => matchScore(keys.get(row.id)!, needle) !== null)
+    const items = group.items.filter((row) => matches(keys.get(row.id)!, needle))
     const children = group.children && searchGroups(group.children, needle, keys)
     return isEmptyBand({ items, children }) ? [] : [{ ...group, items, children }]
   })
```

##### Core/Views/Settings/LocationField.tsx

```/Core/Views/Settings/LocationField.tsx diff
@@ -2 +2 @@ import { useMemo, useRef, useState } from 'react'
 import type { CollectionNode, SetNode } from '../../Nexus/tree'
 import { Icon } from '@pommora/uix/Symbols'
 import { TokenField } from '@pommora/uix/Fields/TokenField'
-import { foldKey, matchKey, matchQuery, matchScore } from '../../Paths/caseFold'
+import { foldKey, matches, matchKey, matchQuery } from '../../Paths/caseFold'
 import { EntityIcon } from '../../Assets/EntityIcon'
 import { DisclosureRow, MenuScrollFrame, pickRuns, useDisclosureSet } from '@pommora/uix/Menus'
 import { PickerMenu } from '@pommora/uix/Pickers/PickerMenu'
@@ -25 +25 @@ function narrowed(nodes: Folder[], query: string): { nodes: Folder[]; leads: Set
     ns.flatMap((n) => {
       const sets = walk(n.sets ?? [], place ? `${place}/${n.title}` : n.title)
       if (sets.length > 0) leads.add(n.id)
-      const kept = sets.length > 0 || matchScore(matchKey(n.title, place), query) !== null
+      const kept = sets.length > 0 || matches(matchKey(n.title, place), query)
       return kept ? [{ ...n, sets }] : []
     })
   return { nodes: walk(nodes, ''), leads }
```

##### Core/Views/Settings/ViewFrame.tsx

```/Core/Views/Settings/ViewFrame.tsx diff
@@ -12 +12 @@ import {
   MenuItem,
   MenuFooting,
   MenuScrollFrame,
-  AccessoryButton,
   FootingCreate,
   menuDropLine,
 } from '@pommora/uix/Menus'
@@ -29 +28 @@ import { ColorPicker } from '@pommora/uix/Pickers/ColorPicker'
 import { colorNameFor } from '@pommora/uix/Theme/ramp'
 import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
 import { IconChoice } from '../../Assets/IconChoice'
+import { ARCHIVE_TITLE } from '../../Archive/archivePlace'
 import { useSession } from '../../Session/store'
 import * as vd from '../../Interface/Toolbar/toolbar-menu.css'
 import { dialer } from '../../Platform/dialer'
 import { popMenu } from '../../Actions/menuActions'
 import { viewRowMenuItems } from '../../Actions/viewRowMenu'
+import { selectTargetOf } from '../../Navigation/navRef'
 
 const PANE_SQUARE = 225
 
@@ -47 +48 @@ export function ViewFrame({
   onClose: () => void
 }): React.JSX.Element {
   const mutate = useSession((s) => s.mutate)
+  const select = useSession((s) => s.select)
+  const inArchive = useSession((s) => s.selection.kind === 'archive')
   const saveView = useSaveView(node)
   const [editingId, setEditingId] = useState<string | null>(null)
   const [renamingId, setRenamingId] = useState<string | null>(null)
@@ -62 +65 @@ export function ViewFrame({
     : undefined
   const editingLive = useLiveView(node.id, editing ?? active)
 
+  // In place: under New Tab, `select`'s default would open a tab per press.
+  const showArchive = (shown: boolean): void =>
+    void select(shown ? { kind: 'archive', id: node.id } : selectTargetOf(node), { newTab: false })
   const switchTo = (id: string): void => {
+    if (inArchive) showArchive(false)
     if (id === active.id) return
     void mutate({ op: 'setActiveView', path: node.path, kind: node.kind, viewId: id })
   }
@@ -106 +113 @@ export function ViewFrame({
         <MenuFooting
           leading={<FootingCreate ariaLabel="New View" onClick={() => void createView()} />}
           trailing={
-            // PLACEHOLDER
-            <AccessoryButton
-              icon="dots"
-              size="control"
-              ariaLabel="More"
-              disabled
-              onClick={() => {}}
+            <Button
+              type={inArchive ? 'tinted' : 'filled'}
+              size="button-inline"
+              label={ARCHIVE_TITLE}
+              outline={inArchive}
+              pressed={inArchive}
+              showSelection={false}
+              onClick={() => showArchive(!inArchive)}
             />
           }
         />
```

##### Core/Views/Settings/ViewMenu.tsx

```/Core/Views/Settings/ViewMenu.tsx diff
@@ -2 +2 @@ import { reportRefusal } from '../../Interface/Notifications/notifications'
 import type { CollectionNode, SetNode } from '../../Nexus/tree'
 import { MenuDropdown } from '@pommora/uix/Menus'
 import { useSession } from '../../Session/store'
-import { findCollection, findSet } from '../../Nexus/treeIndex'
-import { containerSchema } from '../../Nexus/treePatch'
+import { containerSchema, topContainerOf } from '../../Nexus/treePatch'
+import { namesContainer } from '../../Nexus/entities'
 import { pickView } from '../Pipeline/pickView'
 import { ViewFrame } from './ViewFrame'
 import { viewGlyph } from '../viewIcon'
@@ -12 +12 @@ import { dialer } from '../../Platform/dialer'
 import { popMenu } from '../../Actions/menuActions'
 import { viewButtonMenuItems } from '../../Actions/viewMenus'
 
-/** Renders only on a Collection / depth-1 Set; a sub-Set's edits save to its one view. */
+/** Renders on a Collection or a top-level Set and on either's Archive, so the dropdown holds across the toggle; a sub-Set's edits save to its one view. */
 export function ViewMenu(): React.JSX.Element | null {
   const selection = useSession((st) => st.selection)
   const tree = useSession((st) => st.tree)
-  const set = selection.kind === 'set' ? findSet(tree, selection.id) : undefined
-  const node =
-    selection.kind === 'collection'
-      ? findCollection(tree, selection.id)
-      : set?.path.split('/').length === 2
-        ? set
-        : undefined
+  const node = namesContainer(selection) ? topContainerOf(tree, selection.id) : undefined
   if (!node) return null
   return <ViewMenuInner key={node.id} node={node} />
 }
```

##### Core/Views/Table/table-view.css

```/Core/Views/Table/table-view.css diff
@@ -1 +1 @@
-/* TableView's layer over the Tables chrome: shell width, grid density, hide/slide beat, grip gutter, and group-band rhythm. Values live in Tables/table-tokens.css. */
+/* The layer TableView and ArchiveView wear over the Tables chrome: shell width, grid density, hide/slide beat, the rail gutter's grip and check, and group-band rhythm. Values live in UIX/Table/table-tokens.css. */
 
 .table-view {
   /* Width is auto so the negative side margins widen the box to both glass edges while the grid's content box (and so every row) stays exactly where it was. */
@@ -47 +47 @@
   background: var(--col-highlight);
 }
 .row-grip,
+.row-check,
 .table-view .group-band-drop-outline {
   position: absolute;
   left: calc(-1 * var(--rail-inset));
@@ -55 +56 @@
   transform: translateY(-50%);
   justify-content: center;
 }
-.row-grip {
+.row-grip,
+.row-check {
   display: inline-flex;
   align-items: center;
+}
+.row-grip {
   color: var(--label-tertiary);
   cursor: grab;
   touch-action: none;
```

##### Core/Views/Table/useColumns.ts

```/Core/Views/Table/useColumns.ts diff
@@ -29 +29 @@ interface ColumnWidth {
 
 // Only `title` is UNCAPPED — a resize past the pane h-scrolls instead of hitting a wall. Mins stay so a stale saved value can't squash a column below legibility.
 const UNCAPPED = Number.POSITIVE_INFINITY
-const WIDTHS: Record<PropertyType | 'title', ColumnWidth> = {
+export const WIDTHS: Record<PropertyType | 'title', ColumnWidth> = {
   title: { min: 120, default: 280, max: UNCAPPED },
   context: { min: 80, default: 140, max: 350 },
   status: { min: 65, default: 120, max: 250 },
```

##### Desktop/Config/appConfig.ts

```/Desktop/Config/appConfig.ts diff
@@ -3 +3 @@
 import { join } from '@pommora/core/Paths/posix'
 import { stat } from 'node:fs/promises'
 import { readJsonObject, rmwJsonStrict } from '@pommora/core/Files/atomicWrite'
-import { DEFAULT_TRASH_MODE, type TrashMode } from '@pommora/core/Trash/trashRow'
+import { DEFAULT_TRASH_MODE, type TrashMode } from '@pommora/core/Trash/trashMode'
 import { TRASH_DIR } from '@pommora/core/Paths/nexusPaths'
 import { foldKey } from '@pommora/core/Paths/caseFold'
 import type { SyncDevice } from '@pommora/core/Sync/Contract/wire'
```

##### Desktop/Store/driver.ts

```/Desktop/Store/driver.ts diff
@@ -2 +2 @@ import { DatabaseSync } from 'node:sqlite'
 import { existsSync, renameSync } from 'node:fs'
 import { basename } from 'node:path'
 import { errText } from '@pommora/core/Contract/result'
-import { fileStamp } from '@pommora/core/Trash/bundle'
+import { fileStamp } from '@pommora/core/Bundles/bundle'
 
 export type Db = DatabaseSync
 
+// A list binds as one JSON argument: a placeholder per value fails past SQLite's variable limit.
+export const LISTED = '(SELECT value FROM json_each(?))'
+
 const SQLITE_CORRUPT = 11
 const SQLITE_NOTADB = 26
 
```

##### Desktop/Store/stores.ts

```/Desktop/Store/stores.ts diff
@@ -10 +10 @@ import type {
   PageRelationRow,
   SyncStore,
 } from '@pommora/core/Platform/stores'
-import { type Db, inTransaction } from './driver'
+import { type Db, inTransaction, LISTED } from './driver'
 import { INDEX_TABLES } from './ddl'
 
-// A list binds as one JSON argument: a placeholder per value fails past SQLite's variable limit.
-const LISTED = '(SELECT value FROM json_each(?))'
-
 // A folder's descendants by range, bound to the folder twice: from `dir/` up to `dir0`, exact because '0' is the code point after '/', where a LIKE would let a legal '%' in a folder name over-match.
 const UNDER = (column: string): string => `${column} >= ? || '/' AND ${column} < ? || '0'`
 
```

##### Desktop/Store/versionsDb.ts

```/Desktop/Store/versionsDb.ts diff
@@ -1 +1 @@
 import { join } from '@pommora/core/Paths/posix'
 import { deflateSync, inflateSync } from 'node:zlib'
-import { checkIntact, openRebuildable, type Db } from './driver'
+import { checkIntact, LISTED, openRebuildable, type Db } from './driver'
 import type { CaptureStore, SnapshotSource, SnapshotStore } from '@pommora/core/Platform/stores'
 
 export const VERSIONS_FILENAME = 'versions.db'
@@ -56 +56 @@ export const snapshotStore = (db: Db): SnapshotStore => ({
     return row ? inflate(row.blob) : null
   },
   deleteSnapshots(pageId, ts) {
-    const marks = ts.map(() => '?').join(', ')
     return removed(
-      db.prepare(`DELETE FROM snapshots WHERE page_id = ? AND ts IN (${marks})`).run(pageId, ...ts),
+      db
+        .prepare(`DELETE FROM snapshots WHERE page_id = ? AND ts IN ${LISTED}`)
+        .run(pageId, JSON.stringify(ts)),
     )
   },
   clearSnapshots() {
@@ -68 +69 @@ export const snapshotStore = (db: Db): SnapshotStore => ({
     db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
     return count
   },
-  sweepSnapshots(cutoffMs) {
-    return removed(db.prepare('DELETE FROM snapshots WHERE ts < ?').run(cutoffMs))
+  sweepSnapshots(cutoffMs, archived) {
+    return removed(
+      db
+        .prepare(`DELETE FROM snapshots WHERE ts < ? OR (ts < ? AND page_id IN ${LISTED})`)
+        .run(cutoffMs, archived.cutoffMs, JSON.stringify(archived.ids)),
+    )
   },
 })
 
```

##### UIX/Animations/Swap.tsx

```/UIX/Animations/Swap.tsx diff
@@ -0 +1 @@
+import type { ReactNode } from 'react'
+import { cx } from '../Utilities/cx'
+import * as s from './swap.css'
+
+/** Two faces in one cell as wide as the wider, so a swap cross-fades with nothing reflowing. The hidden face is inert and unnamed: its controls take no press or focus, and a button names itself by the face it shows. */
+export function Swap({
+  swapped,
+  from,
+  to,
+  className,
+}: {
+  swapped: boolean
+  from: ReactNode
+  to: ReactNode
+  className?: string
+}): React.JSX.Element {
+  return (
+    <span className={cx(s.swap, className)}>
+      {face(from, swapped)}
+      {face(to, !swapped)}
+    </span>
+  )
+}
+
+const faceAttrs = (hidden: boolean) => ({
+  'data-face': hidden ? 'hidden' : 'shown',
+  'aria-hidden': hidden ? ('true' as const) : undefined,
+  inert: hidden,
+})
+
+/** The same attributes set on a face a host draws in the DOM itself. */
+export function setFace(el: HTMLElement, hidden: boolean): void {
+  const { inert, ...named } = faceAttrs(hidden)
+  el.toggleAttribute('inert', inert)
+  for (const [attr, value] of Object.entries(named))
+    if (value === undefined) el.removeAttribute(attr)
+    else el.setAttribute(attr, value)
+}
+
+const face = (node: ReactNode, hidden: boolean): React.JSX.Element => (
+  <span className={s.face} {...faceAttrs(hidden)}>
+    {node}
+  </span>
+)
```

##### UIX/Animations/motion.ts

```/UIX/Animations/motion.ts diff
@@ -18 +18 @@ export const ms = (d: (typeof duration)[keyof typeof duration]): number => Numbe
 /** An exit's beat plus slack for the frame that paints its last state. */
 export const exitWait = (exit: keyof typeof duration): number => ms(duration[exit]) + 30
 
+/** How long an acknowledgement (Copied, Cleared, Synced) holds its done face. */
+export const DONE_MS = 1500
+
 export const prefersReducedMotion = (): boolean =>
   window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
 
```

##### UIX/Animations/swap.css.ts

```/UIX/Animations/swap.css.ts diff
@@ -0 +1 @@
+import { globalStyle, style } from '@vanilla-extract/css'
+import { REVEAL_FADE } from '../Interactions/hover-reveal.css'
+
+export const swap = style({ display: 'inline-grid' })
+// Zero specificity, so a host's own class sets how the faces sit.
+globalStyle(`:where(${swap})`, { placeItems: 'center' })
+
+// A grid of its own, so an icon face draws with no line box; it fades at its host's beat, so a surface that slows its fades (the code block's tag) slows its swap with them.
+export const face = style({
+  gridArea: '1 / 1',
+  display: 'grid',
+  transition: REVEAL_FADE,
+  selectors: { '&[data-face="hidden"]': { opacity: 0 } },
+})
```

##### UIX/Animations/useTimedLabel.tsx

```/UIX/Animations/useTimedLabel.tsx diff
@@ -0 +1 @@
+import { type ReactNode, useEffect, useRef, useState } from 'react'
+import { DONE_MS } from './motion'
+import { Swap } from './Swap'
+
+export function useTimedLabel(idle: string, active: string): [ReactNode, () => void] {
+  const [done, setDone] = useState(false)
+  const timer = useRef<number | undefined>(undefined)
+  useEffect(() => () => window.clearTimeout(timer.current), [])
+  const mark = (): void => {
+    setDone(true)
+    window.clearTimeout(timer.current)
+    timer.current = window.setTimeout(() => setDone(false), DONE_MS)
+  }
+  const label = <Swap swapped={done} from={idle} to={active} />
+  return [label, mark]
+}
```

##### UIX/Elements/ProgressBar.tsx

```/UIX/Elements/ProgressBar.tsx diff
@@ -15 +15 @@ export function ProgressBar({
   ref,
 }: {
   fill: number
-  ref?: Ref<HTMLDivElement>
+  ref?: Ref<HTMLSpanElement>
 }): React.JSX.Element {
   const pct = percent(fill)
   return (
-    <div
+    <span
       ref={ref}
       className={s.track}
       style={{ '--fill': pct } as CSSProperties}
@@ -28 +28 @@ export function ProgressBar({
       aria-valuemin={0}
       aria-valuemax={100}
     >
-      <div className={s.fill} />
-    </div>
+      <span className={s.fill} />
+    </span>
   )
 }
```

##### UIX/Elements/nav-trail.css.ts

```/UIX/Elements/nav-trail.css.ts diff
@@ -20 +20 @@ export const option = style({
   vars: { '--nav-trail-glyph': c.label.secondary },
 })
 
+/** A trail of frozen names, whose places no longer exist. */
+export const historical = style({ fontStyle: 'italic', color: c.label.tertiary })
+
 export const segment = style({
   appearance: 'none',
   border: 0,
```

##### UIX/Elements/progress-bar.css.ts

```/UIX/Elements/progress-bar.css.ts diff
@@ -2 +2 @@ import { style } from '@vanilla-extract/css'
 import { vars } from '../Theme/color.css'
 
 export const track = style({
+  display: 'block',
   width: '100%',
   height: '6px',
   borderRadius: 'var(--radius-full)',
@@ -10 +11 @@ export const track = style({
 })
 
 export const fill = style({
+  display: 'block',
   height: '100%',
   clipPath: 'inset(0 calc(100% - var(--fill) * 1%) 0 0 round var(--radius-full))',
   borderRadius: 'var(--radius-full)',
```

##### UIX/Interactions/virtualRows.ts

```/UIX/Interactions/virtualRows.ts diff
@@ -0 +1 @@
+import { type Key, useLayoutEffect, useState } from 'react'
+import { useVirtualizer } from '@tanstack/react-virtual'
+
+/** The one seam over the virtualizer: fixed-height rows of a list inside a scroll root, each `start` measured from the list's own top. `deps` re-measure where the list sits whenever what lies above it changes. */
+export function useVirtualRows(
+  {
+    count,
+    rowHeight,
+    listEl,
+    scrollEl,
+  }: { count: number; rowHeight: number; listEl: HTMLElement | null; scrollEl: HTMLElement | null },
+  deps: readonly unknown[],
+): { height: number; rows: { key: Key; index: number; start: number }[] } {
+  const [margin, setMargin] = useState(0)
+  // Against the scroll root rather than `offsetTop`, which reads the nearest positioned ancestor: a parked content host, in a content view.
+  useLayoutEffect(() => {
+    if (!listEl || !scrollEl) return
+    const top = listEl.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top
+    setMargin(top + scrollEl.scrollTop)
+  }, [listEl, scrollEl, ...deps])
+  const virtual = useVirtualizer({
+    count,
+    getScrollElement: () => scrollEl,
+    estimateSize: () => rowHeight,
+    overscan: 6,
+    scrollMargin: margin,
+  })
+  return {
+    height: virtual.getTotalSize(),
+    rows: virtual
+      .getVirtualItems()
+      .map(({ key, index, start }) => ({ key, index, start: start - margin })),
+  }
+}
```

##### UIX/Menus/MenuRows.tsx

```/UIX/Menus/MenuRows.tsx diff
@@ -78 +78 @@ type MenuItemProps = {
   centered?: boolean
   disabled?: boolean
   inert?: boolean
+  /** Shows every reveal target in the row, as while any row of its list is checked. */
+  revealed?: boolean
   indent?: number
   tabIndex?: number
   onClick?: (e: MouseEvent<HTMLDivElement>) => void
@@ -103 +105 @@ export function MenuItem({
   centered = false,
   disabled = false,
   inert = false,
+  revealed = false,
   indent = 0,
   tabIndex,
   onClick,
@@ -136 +139 @@ export function MenuItem({
         className,
       )}
       style={rowStyle}
-      data-reveal-host={inert ? undefined : ''}
+      data-reveal-host={inert ? undefined : revealed ? 'on' : ''}
       role={act ? 'button' : undefined}
       tabIndex={act ? (tabIndex ?? 0) : undefined}
       onClick={act}
```

##### UIX/Pickers/IconPicker.tsx

```/UIX/Pickers/IconPicker.tsx diff
@@ -2 +2 @@ import {
   type MouseEvent,
   type RefObject,
   useEffect,
-  useLayoutEffect,
   useMemo,
   useState,
   useSyncExternalStore,
 } from 'react'
-import { useVirtualizer } from '@tanstack/react-virtual'
 import { PickerMenu } from './PickerMenu'
 import { SearchField } from '../Fields/SearchField'
 import { fullIconSet, Icon, loadFullIconSet, subscribeFullIconSet } from '../Symbols'
 import type { IconEntry } from '../Symbols/allSymbols'
 import { SortableZone, useDragItem } from '../Interactions/drag'
+import { useVirtualRows } from '../Interactions/virtualRows'
 import { moveBefore } from '../Utilities/moveItem'
 import { capitalize } from '../Utilities/capitalize'
 import { cx } from '../Utilities/cx'
@@ -80 +79 @@ export function IconPicker({
   // A state-backed callback ref, so the virtualizer re-runs the moment the element mounts.
   const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
   const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
-
-  // How far the list's top sits below the scroll container's top.
-  const [scrollMargin, setScrollMargin] = useState(0)
-  useLayoutEffect(() => {
-    if (listEl) setScrollMargin(listEl.offsetTop)
-  }, [listEl, iconFavs.length, open])
-
-  const rowCount = Math.ceil(filtered.length / COLS)
-  const rowVirt = useVirtualizer({
-    count: rowCount,
-    getScrollElement: () => scrollEl,
-    estimateSize: () => CELL,
-    overscan: 6,
-    scrollMargin,
-  })
+  const virtual = useVirtualRows(
+    { count: Math.ceil(filtered.length / COLS), rowHeight: CELL, listEl, scrollEl },
+    [iconFavs.length, open],
+  )
 
   return (
     <PickerMenu
@@ -127 +115 @@ export function IconPicker({
           </div>
         )}
 
-        <div ref={setListEl} className={s.list} style={{ height: rowVirt.getTotalSize() }}>
-          {rowVirt.getVirtualItems().map((vr) => {
+        <div ref={setListEl} className={s.list} style={{ height: virtual.height }}>
+          {virtual.rows.map((vr) => {
             const start = vr.index * COLS
             return (
               <div
                 key={vr.key}
                 className={s.row}
-                style={{ height: CELL, transform: `translateY(${vr.start - scrollMargin}px)` }}
+                style={{ height: CELL, transform: `translateY(${vr.start}px)` }}
               >
                 {filtered.slice(start, start + COLS).map((entry) => (
                   <GridCell
```

##### UIX/Pickers/PickerControl.tsx

```/UIX/Pickers/PickerControl.tsx diff
@@ -11 +11 @@ export type PickerOption<T extends string> = {
   value: T
   label: string
   icon?: React.ComponentProps<typeof Icon>['name']
+  disabled?: boolean
 }
 
 export type MenuDoor = (
-  rows: { label: string; action: string; checked: boolean; icon?: string }[],
+  rows: { label: string; action: string; checked: boolean; icon?: string; disabled?: boolean }[],
   trigger: HTMLElement,
   options?: { solid?: boolean; compact?: boolean },
 ) => Promise<string | null>
@@ -32 +33 @@ const labelOf = <T extends string>(opts: readonly PickerOption<T>[], v: T): stri
 const stepsWith = (steps: readonly number[], current: number): number[] =>
   steps.some((f) => f === current) ? [...steps] : [...steps, current].sort((a, b) => a - b)
 
-// Every stepped number control — a list of step rows, and the same field behind a right press; a typed value is divided back by `scale` and held within the steps' ends.
+// Every stepped number control — a list of step rows, and the same field behind a right press; a typed value is divided back by `scale` and held within the range.
 export function steppedPickerProps({
   range,
   value,
@@ -54 +55 @@ export function steppedPickerProps({
     options: stepsWith(range.steps, value).map((f) => ({
       value: String(f),
       label: unitLabel(f, unit),
+      disabled: f < range.min || f > range.max,
     })),
     onPick: (v) => onPick(Number(v)),
     typeable: {
@@ -105 +107 @@ export function PickerControl<T extends string>({
       action: o.value,
       checked: o.value === value,
       icon: o.icon,
+      disabled: o.disabled,
     }))
     void door(rows, el, { solid, compact: true }).then((picked) => {
       // Resolved through the options rather than cast: the reply crosses as a bare string.
```

##### UIX/Symbols/index.tsx

```/UIX/Symbols/index.tsx diff
@@ -1 +1 @@
 import {
   AppWindow,
+  Archive,
   ArrowUpDown,
   Atom,
   Calendar,
@@ -47 +48 @@ import {
   Link2,
   ListFilter,
   ListTree,
+  Lock,
   type LucideIcon,
   type LucideProps,
   Map as MapIcon,
@@ -99 +101 @@ import {
 import { fileTypeGlyphs } from './fileTypes'
 import { ICON_NAMES } from './iconNames'
 import { size as sizeTokens, type IconSize } from '../Theme/theme-vars.css'
-import { cx } from '../Utilities/cx'
 import { channel } from '../Utilities/subscribable'
+import { Swap } from '../Animations/Swap'
 import * as sym from './symbols.css'
 
 /** This registry IS the roster: to add an icon, import it above and add a line here. */
@@ -133 +135 @@ export const icons = {
   zap: Zap,
   command: Command,
   trash: Trash,
+  archive: Archive,
   'chevron-left': ChevronLeft,
   'chevron-right': ChevronRight,
   'chevron-up': ChevronUp,
@@ -194 +197 @@ export const icons = {
   'metadata-label': MetadataLabel,
   'progress-check': ProgressCheck,
   'columns-3-cog': Columns3Cog,
+  lock: Lock,
   locked: LockFilled,
   'lock-outline': LockOutline,
   ...fileTypeGlyphs,
@@ -259 +263 @@ export function Icon({
   return <Curated {...rest} {...sized} />
 }
 
-// Both faces stay mounted in one grid cell so a toggle cross-fades rather than swapping glyphs outright.
 export function LockGlyph({
   locked,
   size = 'control',
@@ -268 +271 @@ export function LockGlyph({
   size?: IconSize
 }): React.JSX.Element {
   return (
-    <span className={sym.glyphSwap}>
-      <Icon
-        name="locked"
-        size={size}
-        className={sym.glyphSwapFace}
-        data-face={locked ? 'shown' : 'hidden'}
-      />
-      <Icon
-        name="lock-outline"
-        size={size}
-        className={cx(sym.glyphSwapFace, sym.lockOpenFace)}
-        data-face={locked ? 'hidden' : 'shown'}
-      />
-    </span>
+    <Swap
+      swapped={locked}
+      from={<Icon name="lock-outline" size={size} className={sym.lockOpenFace} />}
+      to={<Icon name="locked" size={size} />}
+    />
   )
 }
```

##### UIX/Symbols/symbols.css.ts

```/UIX/Symbols/symbols.css.ts diff
@@ -1 +1 @@
 import { style } from '@vanilla-extract/css'
 import { vars as colorVars } from '../Theme/color.css'
-import { duration, easing } from '../Animations/motion'
-
-export const glyphSwap = style({ display: 'inline-grid', placeItems: 'center' })
-
-export const glyphSwapFace = style({
-  gridArea: '1 / 1',
-  transition: `opacity ${duration.fast} ${easing.baseEase}`,
-  selectors: { '&[data-face="hidden"]': { opacity: 0 } },
-})
 
 export const lockOpenFace = style({
   selectors: { '&&': { color: colorVars.color.label.tertiary } },
```

##### UIX/Table/table.css

```/UIX/Table/table.css diff
@@ -15 +15 @@
 }
 
 .table-head {
-  /* The one place a heading's type is set — TableView's .col-header and the Trash's head both inherit it. */
+  /* The one place a heading's type is set — TableView's and ArchiveView's .col-header and the Trash's head inherit it. */
   font-size: var(--text-callout-size);
   line-height: var(--text-callout-line);
   font-weight: var(--weight-emphasized);
@@ -24 +24 @@
   border-bottom: var(--heading-divider);
   user-select: none;
 }
+/* A date heading's label stacked over its column's widest value, drawn unseen and taking no height, so the column measures whichever is wider. */
+.col-measure {
+  display: inline-grid;
+  flex: none;
+  white-space: nowrap;
+}
+.col-measure > * {
+  grid-area: 1 / 1;
+}
+.col-measure > [aria-hidden] {
+  visibility: hidden;
+  height: 0;
+}
 .col-header-icon {
   display: inline-flex;
   vertical-align: middle;
```

##### UIX/Utilities/checkSet.ts

```/UIX/Utilities/checkSet.ts diff
@@ -8 +8 @@ export function retained<T>(prev: ReadonlySet<T>, live: ReadonlySet<T>): Readonl
   const next = new Set([...prev].filter((k) => live.has(k)))
   return next.size === prev.size ? prev : next
 }
+
+export function checkedIn<T, K>(
+  checked: ReadonlySet<K>,
+  shown: readonly T[],
+  keyOf: (item: T) => K,
+): T[] {
+  return shown.filter((item) => checked.has(keyOf(item)))
+}
+
+/** What a right-click acts on: an unchecked item alone, whatever else is checked, since a checked set is a deliberate construction; a checked one, the checked items still shown, so a narrowed list never offers a batch of rows it hides, and a lone shown row keeps the single-row menu it is owed. */
+export function actedOn<T, K>(
+  checked: ReadonlySet<K>,
+  shown: readonly T[],
+  clicked: T,
+  keyOf: (item: T) => K,
+): T[] {
+  return checked.has(keyOf(clicked)) ? checkedIn(checked, shown, keyOf) : [clicked]
+}
```

---

##### Core/Actions/cardMenu.test.ts

```/Core/Actions/cardMenu.test.ts diff
@@ -12 +12 @@ describe('cardMenuModel', () => {
       ['Copy Link', 'title:copylink'],
       ['Copy Path', 'title:copypath'],
       ['View History', 'title:history'],
+      ['Archive', 'title:archive'],
       ['Delete', 'title:delete'],
     ])
     expect(m.find((i) => i.action === 'title:rename')?.separatorBefore).toBe(true)
     expect(m.find((i) => i.action === 'title:newbelow')?.separatorBefore).toBe(true)
-    expect(m.find((i) => i.action === 'title:delete')?.separatorBefore).toBe(true)
+    expect(m.find((i) => i.action === 'title:archive')?.separatorBefore).toBe(true)
+    expect(m.find((i) => i.action === 'title:delete')?.separatorBefore).toBeUndefined()
   })
 
   it('carries both page branches after Edit Icon', () => {
```

##### Core/Actions/cellMenu.test.ts

```/Core/Actions/cellMenu.test.ts diff
@@ -5 +5 @@ import { dateDefaults } from '../Properties/columnStyles'
 const DATES = dateDefaults('full')
 
 describe('cellMenuModel', () => {
-  it('title: Preview + stateful Open row + Rename + Edit Icon + New Page pair + the send block + separator-gated Delete', () => {
+  it('title: Preview + stateful Open row + Rename + Edit Icon + New Page pair + the send block + separator-gated Archive and Delete', () => {
     const m = cellMenuModel({ kind: 'title' })
     expect(m.map((i) => [i.label, i.action])).toEqual([
       ['Preview', 'title:window'],
@@ -17 +17 @@ describe('cellMenuModel', () => {
       ['Copy Link', 'title:copylink'],
       ['Copy Path', 'title:copypath'],
       ['View History', 'title:history'],
+      ['Archive', 'title:archive'],
       ['Delete', 'title:delete'],
     ])
     expect(cellMenuModel({ kind: 'title', alreadyOpen: true })[0].label).toBe('Open')
     expect(m.find((i) => i.action === 'title:rename')?.separatorBefore).toBe(true)
-    expect(m.find((i) => i.action === 'title:delete')?.separatorBefore).toBe(true)
+    expect(m.find((i) => i.action === 'title:archive')?.separatorBefore).toBe(true)
+    expect(m.find((i) => i.action === 'title:delete')?.separatorBefore).toBeUndefined()
     expect(m.some((i) => i.submenu)).toBe(false)
   })
 
```

##### Core/Actions/createActions.test.ts

```/Core/Actions/createActions.test.ts diff
@@ -61 +61 @@ describe('newPage', () => {
     expect(asked).toMatchObject([{ parentPath: 'Notes/Ideas' }])
   })
 
+  it('creates in the Set whose archive shows', async () => {
+    seed({ kind: 'archive', id: 's1' })
+    await newPage(false)
+    expect(asked).toMatchObject([{ parentPath: 'Notes/Ideas' }])
+  })
+
   it('falls back to the first Collection, and creates nothing without one', async () => {
     seed({ kind: 'none' })
     await newPage(false)
```

##### Core/Actions/entityMenu.test.ts

```/Core/Actions/entityMenu.test.ts diff
@@ -33 +33 @@ describe('the sidebar entity menu', () => {
       'title:copypath',
       'title:history',
       'title:reveal',
+      'title:archive',
       'title:delete',
     ])
     expect(items[0].label).toBe('Open')
   })
 
-  it('a sidebar collection opens, creates, renames, deletes, locks, copies its path, and reveals in four groups', () => {
+  it('a sidebar collection opens, creates, renames, locks, copies its path, and reveals, closing on Delete alone', () => {
     const items = entityMenuItems(
       { kind: 'collection', id: 'c1', path: 'Notes', title: 'Notes', host: 'sidebar' },
       creators,
@@ -49 +50 @@ describe('the sidebar entity menu', () => {
       'New Page',
       '—',
       'Rename',
-      'Delete',
       '—',
       'Lock Folder',
       'Copy Path',
       'Reveal Location',
+      '—',
+      'Delete',
     ])
+    expect(items.some((i) => i.action === 'title:archive')).toBe(false)
+    expect(items.at(-1)?.action).toBe('title:delete')
     expect(items.find((i) => i.action === 'lock')?.label).toBe('Lock Folder')
     expect(items.find((i) => i.label === 'Reveal Location')?.action).toBe('title:reveal')
   })
 
-  it('a band set neither opens nor locks, and a context without creators starts at Rename', () => {
+  it('a band set neither opens nor locks and closes on Archive above Delete, and a context without creators starts at Rename', () => {
     expect(
       shape(
         entityMenuItems({ kind: 'set', path: 'Notes/S', title: 'S', host: 'detail' }, creators),
       ),
-    ).toEqual(['New Page', '—', 'Rename', 'Delete', '—', 'Copy Path', 'Reveal Location'])
-    expect(
-      shape(
-        entityMenuItems({ kind: 'context', path: 'Areas', title: 'Areas', host: 'sidebar' }, []),
-      ),
-    ).toEqual(['Rename', 'Edit Icon', '—', 'Delete'])
+    ).toEqual([
+      'New Page',
+      '—',
+      'Rename',
+      '—',
+      'Copy Path',
+      'Reveal Location',
+      '—',
+      'Archive',
+      'Delete',
+    ])
+    const context = entityMenuItems(
+      { kind: 'context', path: 'Areas', title: 'Areas', host: 'sidebar' },
+      [],
+    )
+    expect(shape(context)).toEqual(['Rename', 'Edit Icon', '—', 'Delete'])
+    expect(context.at(-1)?.action).toBe('title:delete')
   })
 
   it('a Space draws its identity rows, then its two branches', () => {
```

##### Core/Actions/fileHistoryMenu.test.ts

```/Core/Actions/fileHistoryMenu.test.ts diff
@@ -1 +0 @@
-import { describe, it, expect } from 'vitest'
-import { fileHistoryMenuItems } from './fileHistoryMenu'
-
-describe('the history row menu', () => {
-  it('offers Restore and Delete for one row', () => {
-    expect(fileHistoryMenuItems(false)).toEqual([
-      { label: 'Restore', action: 'restore' },
-      { label: 'Delete', action: 'delete', separatorBefore: true },
-    ])
-  })
-
-  it('offers only Delete All for a multi-check', () => {
-    expect(fileHistoryMenuItems(true)).toEqual([{ label: 'Delete All', action: 'delete' }])
-  })
-})
```

##### Core/Actions/pageMenu.test.ts

```/Core/Actions/pageMenu.test.ts diff
@@ -31 +31 @@ describe('the page menu', () => {
       'View History',
       'Reveal Location',
       '—',
+      'Archive',
       'Delete',
     ])
     expect(pageMetaMenuItems(false).some((i) => i.action === 'title:reveal')).toBe(false)
@@ -84 +85 @@ describe('the page menu', () => {
 })
 
 describe('the page action rows', () => {
-  it('hold Rename, the send and locate rows as one group without Move To, and Delete', () => {
+  it('hold Rename, the send and locate rows as one group without Move To, and Archive above Delete', () => {
     expect(shape(PAGE_ACTION_ROWS)).toEqual([
       'Rename',
       '—',
@@ -93 +94 @@ describe('the page action rows', () => {
       'View History',
       'Reveal Location',
       '—',
+      'Archive',
       'Delete',
     ])
   })
```

##### Core/Actions/restoreMenu.test.ts

```/Core/Actions/restoreMenu.test.ts diff
@@ -1 +1 @@
 import { describe, expect, it } from 'vitest'
-import { trashMenuItems } from './trashMenu'
+import { restoreMenuItems } from './restoreMenu'
 
-describe('the trash row menu', () => {
+describe('the restore menu', () => {
   it('restores and deletes one row, the plural for a batch', () => {
-    expect(trashMenuItems({ batch: false })).toEqual([
+    expect(restoreMenuItems({ batch: false })).toEqual([
       { label: 'Restore', action: 'restore' },
       { label: 'Delete', action: 'delete', separatorBefore: true },
     ])
-    expect(trashMenuItems({ batch: true }).map((i) => [i.label, i.action])).toEqual([
-      ['Restore All', 'restoreAll'],
-      ['Delete All', 'deleteAll'],
+    expect(restoreMenuItems({ batch: true }).map((i) => [i.label, i.action])).toEqual([
+      ['Restore All', 'restore'],
+      ['Delete All', 'delete'],
     ])
   })
 
   it('a homeless row turns Restore into a destination drill keyed by id', () => {
-    const items = trashMenuItems({
+    const items = restoreMenuItems({
       batch: false,
       destinations: [
         {
@@ -33 +33 @@ describe('the trash row menu', () => {
   })
 
   it('nowhere to put it keeps the row, refused', () => {
-    expect(trashMenuItems({ batch: false, destinations: [] })[0]).toEqual({
+    expect(restoreMenuItems({ batch: false, destinations: [] })[0]).toEqual({
       label: 'Restore',
       submenu: [],
     })
   })
+
+  it('where one item restores at a time, a batch offers Delete All alone', () => {
+    expect(restoreMenuItems({ batch: true, restoresBatch: false })).toEqual([
+      { label: 'Delete All', action: 'delete' },
+    ])
+    expect(restoreMenuItems({ batch: false, restoresBatch: false })).toEqual([
+      { label: 'Restore', action: 'restore' },
+      { label: 'Delete', action: 'delete', separatorBefore: true },
+    ])
+  })
 })
```

##### Core/Archive/ArchiveView.test.tsx

```/Core/Archive/ArchiveView.test.tsx diff
@@ -0 +1 @@
+// @vitest-environment jsdom
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { act, createElement } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import type { BundleRow } from '../Bundles/rows'
+import { ArchiveView } from './ArchiveView'
+import { bundleRow } from '../Testing/fixtures'
+import { stubDialer } from '../vitest.setup'
+import { useSession } from '../Session/store'
+import { makeTree } from '../Testing/testTree'
+import { ContentHostContext } from '../Interface/contentHost'
+import { ActionLabel } from '../Interface/Notifications/ActionLabel'
+import { PageReaderWindow } from '../Interface/Windows/PageReaderWindow'
+import { clearNotification, currentNotification } from '../Interface/Notifications/notifications'
+import { resetUndo } from '../Session/undo'
+import { storesChanged } from '../Session/nexusSlice'
+import { captureWarm, clearWarm } from '../Session/warmCache'
+import type { CollectionNode, SetNode } from '../Nexus/tree'
+
+vi.mock('@pommora/uix/Interactions/virtualRows', () => ({
+  useVirtualRows: ({ count, rowHeight }: { count: number; rowHeight: number }) => ({
+    height: count * rowHeight,
+    rows: Array.from({ length: count }, (_, index) => ({
+      key: index,
+      index,
+      start: index * rowHeight,
+    })),
+  }),
+}))
+vi.mock('../MarkdownPM/MarkdownEditor', () => ({
+  MarkdownEditor: (p: { initialBody: string }) =>
+    createElement('div', { className: 'stub-editor' }, p.initialBody),
+}))
+;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
+
+const archived = (title: string, over: Partial<BundleRow> = {}): BundleRow => {
+  const bundlePath = `.nexus/archive/c1/Notes/2026-10-20T12-00-00-000Z__${title}.md.archived`
+  return bundleRow({
+    title,
+    bundlePath,
+    stored: { id: `id-${title}`, path: `${bundlePath}/${title}.md` },
+    ...over,
+  })
+}
+
+describe('ArchiveView', () => {
+  let host: HTMLDivElement
+  let root: Root
+  let listed: BundleRow[]
+  let list: ReturnType<typeof vi.fn>
+  let mutated: ReturnType<typeof vi.fn>
+  let picked: string | null
+  let readable: boolean
+  const tree = makeTree()
+  const collection = tree.collections[0] as CollectionNode
+  const set = collection.sets[0] as SetNode
+
+  const render = async (owner: CollectionNode | SetNode = collection, parked = false) =>
+    act(async () =>
+      root.render(
+        <>
+          <ContentHostContext.Provider value={{ tabId: 't1', key: `archive:${owner.id}`, parked }}>
+            <ArchiveView owner={owner} />
+          </ContentHostContext.Provider>
+          <ActionLabel />
+          <PageReaderWindow />
+        </>,
+      ),
+    )
+  const rowEls = (): HTMLElement[] => [
+    ...host.querySelectorAll<HTMLElement>('.archive-rows .data-row'),
+  ]
+  const titles = (): string[] =>
+    rowEls().map((r) => r.querySelector('.cell-title-text')?.textContent ?? '')
+  const rowOf = (title: string): HTMLElement =>
+    rowEls().find((r) => r.querySelector('.cell-title-text')?.textContent === title) as HTMLElement
+  const boxOf = (title: string): Element | null => rowOf(title).querySelector('[role="checkbox"]')
+  const empty = (): string | null => host.querySelector('.archive-empty')?.textContent ?? null
+  const face = (): Element | null =>
+    host.querySelector('[role=status] [data-face="shown"], [role=alert] [data-face="shown"]')
+  const barButton = (label: 'Restore' | 'Delete'): HTMLElement =>
+    [...(face()?.querySelectorAll('button') ?? [])].find((b) =>
+      label === 'Delete' ? b.getAttribute('title') === 'Delete' : b.textContent === label,
+    ) as HTMLElement
+  const pressBar = async (label: 'Restore' | 'Delete'): Promise<void> => {
+    const button = barButton(label)
+    await act(async () => button.click())
+  }
+  const check = async (...rows: string[]): Promise<void> => {
+    for (const title of rows) await act(async () => rowOf(title).click())
+  }
+  const undo = async (): Promise<void> => {
+    mutated.mockClear()
+    await act(async () => {
+      currentNotification()?.action?.run()
+      await new Promise((settle) => setTimeout(settle, 0))
+    })
+  }
+
+  beforeEach(async () => {
+    listed = [archived('A', { stored: { id: 'p1', path: 'x/A.md' } })]
+    picked = null
+    readable = true
+    mutated = vi.fn(async () => ({ ok: true, value: {} }))
+    list = vi.fn(async () => ({ ok: true, value: listed }))
+    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+      'bundles:list': list,
+      menu: vi.fn(async () => ({ ok: true, value: picked })),
+      mutate: mutated,
+      'delete:facts': vi.fn(async () => ({
+        ok: true,
+        value: { trashMode: 'nexus', permanentDelete: false },
+      })),
+      'page:open': vi.fn(async () =>
+        readable
+          ? { ok: true, value: { body: 'Root body.' } }
+          : { ok: false, error: { code: 'not-found', message: 'gone' } },
+      ),
+    })
+    useSession.setState({ tree, viewSearch: {}, reader: null, askConfirm: async () => true })
+    host = document.body.appendChild(document.createElement('div'))
+    root = createRoot(host)
+  })
+  afterEach(async () => {
+    await act(async () => root.unmount())
+    host.remove()
+    clearNotification()
+    resetUndo()
+    useSession.setState({ tree: null, viewSearch: {}, reader: null })
+  })
+
+  it('lists each archived item with the trail it left under its title and its archived time, newest first', async () => {
+    listed = [
+      archived('Newer', {
+        storedAt: Date.UTC(2026, 9, 20),
+        crumbs: [
+          { kind: 'collection', title: 'Notes' },
+          { kind: 'set', title: 'Ideas' },
+        ],
+      }),
+      archived('Older', { storedAt: Date.UTC(2026, 9, 10) }),
+    ]
+    await render()
+    expect(list).toHaveBeenCalledWith({ kind: 'archive', id: 'c1' }, undefined)
+    expect(titles()).toEqual(['Newer', 'Older'])
+    const cell = rowOf('Newer').querySelector('.cell-lead')
+    expect(cell?.lastElementChild?.textContent).toBe('Notes›Ideas')
+    const dates = rowEls().map((r) => r.querySelector('.data-cell.archive-date')?.textContent ?? '')
+    expect(dates.every((d) => d !== '')).toBe(true)
+    expect(dates[0]).not.toBe(dates[1])
+  })
+
+  it('its Title and Archived headings each wear their type’s glyph, as a table’s headings do', async () => {
+    await render()
+    const heads = [...host.querySelectorAll('.table-head .col-header')]
+    expect(heads.map((h) => h.querySelectorAll('.col-header-icon svg').length)).toEqual([1, 1])
+  })
+
+  it('a click on a row checks it, and a page row’s title opens the reader titled by its trail under the stroked lock', async () => {
+    await render()
+    await check('A')
+    expect(boxOf('A')?.getAttribute('aria-checked')).toBe('true')
+    const title = rowOf('A').querySelector('.cell-title') as HTMLElement
+    await act(async () => title.click())
+    expect(boxOf('A')?.getAttribute('aria-checked')).toBe('true')
+    expect(useSession.getState().reader).toEqual({
+      kind: 'archive',
+      page: { kind: 'page', id: 'p1', path: 'x/A.md' },
+      trail: [expect.objectContaining({ title: 'Notes' }), expect.objectContaining({ title: 'A' })],
+    })
+    expect(host.querySelector('.reader-lock svg')?.classList.contains('lucide-lock')).toBe(true)
+  })
+
+  it('a Set row’s title opens nothing and checks its row', async () => {
+    listed = [archived('Ideas', { kind: 'set' })]
+    await render()
+    const title = rowOf('Ideas').querySelector('.cell-title') as HTMLElement
+    await act(async () => title.click())
+    expect(useSession.getState().reader).toBeNull()
+    expect(boxOf('Ideas')?.getAttribute('aria-checked')).toBe('true')
+  })
+
+  it('the header names its owner with Archive in its trailing slot after the search’s clear button', async () => {
+    await render()
+    const header = host.querySelector('.detail-title')
+    expect(header?.querySelector('.detail-title-text')?.textContent).toBe('Notes')
+    expect(header?.lastElementChild?.className).toBe('detail-title-trailing')
+    expect(header?.lastElementChild?.textContent).toBe('Archive')
+    expect(
+      header?.lastElementChild?.previousElementSibling?.classList.contains('detail-title-clear'),
+    ).toBe(true)
+  })
+
+  it('draws its owner’s title with no banner image and no add-banner button', async () => {
+    await render({ ...collection, banner: 'assets/cover.png' })
+    expect(host.querySelector('.banner')).toBeNull()
+    expect(host.querySelector('[aria-label="Add banner"]')).toBeNull()
+    expect(host.querySelector('.banner-empty .detail-title-text')?.textContent).toBe('Notes')
+  })
+
+  it('an empty archive reads its one line', async () => {
+    listed = []
+    await render()
+    expect(empty()).toBe("This Collection's archive is empty.")
+  })
+
+  it('a top-level Set’s empty archive reads the Set’s line', async () => {
+    listed = []
+    await render(set)
+    expect(list).toHaveBeenCalledWith({ kind: 'archive', id: 'c1' }, 's1')
+    expect(empty()).toBe("This Set's archive is empty.")
+  })
+
+  it('a listing that fails reads its one line and draws no rows', async () => {
+    await render()
+    expect(titles()).toEqual(['A'])
+    list.mockResolvedValue({ ok: false, error: { code: 'io', message: 'No.' } })
+    await act(async () => storesChanged.emit())
+    expect(titles()).toEqual([])
+    expect(empty()).toBe("The archive couldn't be read.")
+  })
+
+  it('narrows in place by the tab’s search, keeping archived order', async () => {
+    listed = [archived('Beta Two'), archived('Alpha'), archived('Beta One')]
+    await render()
+    await act(async () =>
+      useSession.setState({ viewSearch: { t1: { key: 'archive:c1', query: 'beta', summon: 0 } } }),
+    )
+    expect(titles()).toEqual(['Beta Two', 'Beta One'])
+  })
+
+  it('a search that hides every row reads Nothing matches.', async () => {
+    await render()
+    expect(empty()).toBeNull()
+    await act(async () =>
+      useSession.setState({ viewSearch: { t1: { key: 'archive:c1', query: 'zzz', summon: 0 } } }),
+    )
+    expect(titles()).toEqual([])
+    expect(empty()).toBe('Nothing matches.')
+  })
+
+  it('declares its bar while rows are checked, reading their count, and withdraws it when parked', async () => {
+    listed = [archived('A'), archived('B')]
+    await render()
+    expect(host.querySelector('[role=status]')?.hasAttribute('inert')).toBe(true)
+    await check('A', 'B')
+    expect(face()?.textContent).toBe('Restore2 Pages')
+    await render(collection, true)
+    expect(host.querySelector('[role=status]')?.hasAttribute('inert')).toBe(true)
+  })
+
+  it('a right-click Delete moves the row into the Trash with an Undo that returns it to the Archive', async () => {
+    const { bundlePath } = listed[0]
+    const trashed = '.trash/Notes/2026-10-21T12-00-00-000Z__A.md.deleted'
+    mutated.mockResolvedValue({ ok: true, value: { bundled: { bundlePath: trashed } } })
+    await render()
+    picked = 'delete'
+    await act(async () => {
+      rowOf('A').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
+    })
+    expect(mutated.mock.calls).toEqual([[{ op: 'delete', path: bundlePath, kind: 'page' }]])
+    expect(currentNotification()?.message).toBe('Deleted “A”')
+    await undo()
+    expect(mutated.mock.calls).toEqual([
+      [{ op: 'restore', bundlePath: trashed, destination: { kind: 'archive' } }],
+    ])
+  })
+
+  it('the bar’s Restore of one row posts Restored “A”, and of two Restored 2 Pages, whose Undo archives each item again where the tree now holds it, under the bundle name it left', async () => {
+    listed = [
+      archived('A', { stored: { id: 'p1', path: 'x/A.md' } }),
+      archived('B', { stored: { id: 'p2', path: 'x/B.md' } }),
+    ]
+    await render()
+    await check('A')
+    await pressBar('Restore')
+    expect(mutated.mock.calls).toEqual([[{ op: 'restore', bundlePath: listed[0].bundlePath }]])
+    expect(currentNotification()?.message).toBe('Restored “A”')
+    act(() => clearNotification())
+    await check('B')
+    await pressBar('Restore')
+    expect(currentNotification()?.message).toBe('Restored 2 Pages')
+    await undo()
+    expect(mutated.mock.calls).toEqual([
+      [
+        {
+          op: 'archive',
+          path: 'Notes/Alpha.md',
+          kind: 'page',
+          leaf: '2026-10-20T12-00-00-000Z__A.md.archived',
+        },
+      ],
+      [
+        {
+          op: 'archive',
+          path: 'Notes/Ideas/Beta.md',
+          kind: 'page',
+          leaf: '2026-10-20T12-00-00-000Z__B.md.archived',
+        },
+      ],
+    ])
+  })
+
+  it('the bar’s Delete of two asks once and posts Deleted 2 Pages with one Undo returning both to the Archive', async () => {
+    listed = [archived('A'), archived('B')]
+    const asked = vi.fn(async () => true)
+    useSession.setState({ askConfirm: asked })
+    mutated.mockImplementation(async (req: { path?: string }) => ({
+      ok: true,
+      value: req.path
+        ? { bundled: { bundlePath: `.trash/${req.path.split('/').at(-1)}.deleted` } }
+        : {},
+    }))
+    await render()
+    await check('A', 'B')
+    await pressBar('Delete')
+    expect(asked).toHaveBeenCalledOnce()
+    expect(mutated.mock.calls).toEqual(
+      listed.map((r) => [{ op: 'delete', path: r.bundlePath, kind: 'page' }]),
+    )
+    expect(currentNotification()?.message).toBe('Deleted 2 Pages')
+    await undo()
+    expect(mutated.mock.calls).toEqual(
+      listed.map((r) => [
+        {
+          op: 'restore',
+          bundlePath: `.trash/${r.bundlePath.split('/').at(-1)}.deleted`,
+          destination: { kind: 'archive' },
+        },
+      ]),
+    )
+  })
+
+  it('a listing answered after a later one leaves the later one shown', async () => {
+    let answerFirst: (value: unknown) => void = () => {}
+    list.mockImplementationOnce(() => new Promise((answer) => (answerFirst = answer)))
+    await render()
+    listed = [archived('B')]
+    await act(async () => storesChanged.emit())
+    expect(titles()).toEqual(['B'])
+    await act(async () => answerFirst({ ok: true, value: [archived('A')] }))
+    expect(titles()).toEqual(['B'])
+  })
+
+  it('a batch whose last ask lands after a Nexus switch posts nothing', async () => {
+    listed = [archived('A'), archived('B')]
+    await render()
+    await check('A', 'B')
+    mutated.mockImplementation(async () => {
+      if (mutated.mock.calls.length === 2)
+        useSession.setState({ tree: { ...tree, nexus: { ...tree.nexus, id: 'elsewhere' } } })
+      return { ok: true, value: {} }
+    })
+    await pressBar('Delete')
+    expect(mutated).toHaveBeenCalledTimes(2)
+    expect(currentNotification()).toBeNull()
+  })
+
+  it('the bar’s Restore of a row whose place is gone asks where and restores there, and a batch restores the rest and says what had nowhere to go', async () => {
+    listed = [archived('Gone', { homeResolves: false }), archived('Kept')]
+    picked = collection.id
+    await render()
+    await check('Gone')
+    await pressBar('Restore')
+    expect(mutated.mock.calls).toEqual([
+      [
+        {
+          op: 'restore',
+          bundlePath: listed[0].bundlePath,
+          destination: { kind: 'container', id: collection.id },
+        },
+      ],
+    ])
+    expect(currentNotification()?.message).toBe('Restored “Gone”')
+    act(() => clearNotification())
+    await check('Kept')
+    mutated.mockClear()
+    await pressBar('Restore')
+    expect(mutated.mock.calls).toEqual([[{ op: 'restore', bundlePath: listed[1].bundlePath }]])
+    expect(currentNotification()).toMatchObject({
+      message:
+        'Restored 1 Page. 1 Page had nowhere to go — restore those one at a time to choose where.',
+      tone: 'error',
+    })
+  })
+
+  it('a search that hides the checked row withdraws the bar and shows no box', async () => {
+    listed = [archived('A'), archived('B')]
+    await render()
+    await check('A')
+    await act(async () =>
+      useSession.setState({ viewSearch: { t1: { key: 'archive:c1', query: 'B', summon: 0 } } }),
+    )
+    expect(titles()).toEqual(['B'])
+    expect(host.querySelector('[data-reveal-host="on"]')).toBeNull()
+    expect(host.querySelector('[role=status]')?.hasAttribute('inert')).toBe(true)
+  })
+
+  it('a bar press landing after a re-list dropped its checked rows does nothing', async () => {
+    await render()
+    await check('A')
+    const restore = barButton('Restore')
+    const remove = barButton('Delete')
+    listed = []
+    await act(async () => storesChanged.emit())
+    await act(async () => {
+      restore.click()
+      remove.click()
+    })
+    expect(mutated).not.toHaveBeenCalled()
+    expect(currentNotification()).toBeNull()
+  })
+
+  it('a remount returns a long archive to where it was scrolled once its listing lands', async () => {
+    // jsdom lays nothing out, so the scroll box clamps to the height its rows declare, as a browser's does.
+    const real = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')!
+    const held = new WeakMap<Element, number>()
+    Object.defineProperty(Element.prototype, 'scrollTop', {
+      configurable: true,
+      get(this: Element) {
+        return held.get(this) ?? 0
+      },
+      set(this: Element, top: number) {
+        const rows = this.querySelector<HTMLElement>('.archive-rows')
+        held.set(this, Math.min(top, Number.parseFloat(rows?.style.height ?? '') || 0))
+      },
+    })
+    try {
+      listed = Array.from({ length: 40 }, (_, i) => archived(`P${i}`))
+      captureWarm('t1', 'archive:c1', { scrollTop: 900 })
+      let answer: (r: unknown) => void = () => {}
+      list.mockImplementationOnce(() => new Promise((r) => (answer = r)))
+      await render()
+      await act(async () => answer({ ok: true, value: listed }))
+      expect(host.querySelector('.detail-scroll')?.scrollTop).toBe(900)
+    } finally {
+      Object.defineProperty(Element.prototype, 'scrollTop', real)
+      clearWarm()
+    }
+  })
+
+  it('two presses of the bar’s Restore or Delete in one tick act once', async () => {
+    listed = [archived('A')]
+    await render()
+    await check('A')
+    const twice = async (label: 'Restore' | 'Delete'): Promise<void> => {
+      const button = barButton(label)
+      await act(async () => {
+        button.click()
+        button.click()
+      })
+    }
+    await twice('Restore')
+    expect(mutated).toHaveBeenCalledOnce()
+    act(() => clearNotification())
+    mutated.mockClear()
+    await twice('Delete')
+    expect(mutated).toHaveBeenCalledOnce()
+  })
+
+  it('a batch restore closes an open reader of one of its pages', async () => {
+    listed = [archived('A'), archived('B')]
+    mutated.mockImplementation(async () => {
+      readable = false
+      return { ok: true, value: {} }
+    })
+    await render()
+    await check('A', 'B')
+    await act(async () => (rowOf('A').querySelector('.cell-title') as HTMLElement).click())
+    expect(host.querySelector('[aria-label="Archived Page"]')).not.toBeNull()
+    await pressBar('Restore')
+    expect(useSession.getState().reader).toBeNull()
+  })
+})
```

##### Core/Archive/archive.test.ts

```/Core/Archive/archive.test.ts diff
@@ -0 +1 @@
+import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { basename, join } from '../Paths/posix'
+import { readJsonAt, tempRoot } from '../Testing/hostFs'
+import { settledMutate } from '../Testing/settledMutate'
+import * as atomicWrite from '../Files/atomicWrite'
+import * as record from '../Bundles/record'
+import * as settings from '../Settings/settings'
+import { fail } from '../Contract/result'
+import { pathExists } from '../Files/atomicWrite'
+import { splitFrontmatter } from '../Files/pageFile'
+import { contextsDir, contextsRegistryFile } from '../Paths/paths'
+import { installStores, NO_STORES } from '../Platform/stores'
+import { memoryStores } from '../Testing/memoryStores'
+import { seedContentIndex } from '../Index/indexSeed'
+import { machine } from '../Platform/machine'
+import { dropLiveTree, heldTreeOf, refreshTree } from '../Nexus/liveTree'
+import { closeSession, openSession } from '../Nexus/session'
+import { readShard, updatePageMetadata } from '../Nexus/pageMetadata'
+import { shardOf } from '../Nexus/ids'
+import { settleNow } from '../Nexus/settle'
+import { readNexus } from '../Nexus/readNexus'
+import { nexusPages } from '../Nexus/heldPages'
+import { minted, type MutateReply, type RestoreDestination } from '../Nexus/mutateRequest'
+import { writeExcludedFolders } from '../Settings/settings'
+import { type BundleStore, listBundles, mintBundle } from '../Bundles/bundle'
+import { readRecord, writeRecord } from '../Bundles/record'
+import { bundleRows } from '../Bundles/rows'
+import { NO_DESTINATION } from '../Bundles/placement'
+import type { TrashDeps } from '../Trash/discard'
+
+const NOTES = '01KVGMT8BFP350FZZXAMG1QDN0'
+const DAILY = '01KVGMT8BFP350FZZXAMG1QDD0'
+const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
+const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'
+const PAGE_G = '01KVGMT8BFP350FZZXAMG1QDVG'
+const PAGE_K = '01KVGMT8BFP350FZZXAMG1QDVK'
+const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
+const ARCHIVE: BundleStore = { kind: 'archive', id: NOTES }
+const BETA = `---\nID: ${PAGE_B}\n---\nbeta\n`
+
+let root: string
+const at = (...segs: string[]): string => join(root, ...segs)
+const text = (...segs: string[]): Promise<string> => readFile(at(...segs), 'utf8')
+const pageOrder = async (): Promise<unknown> =>
+  (await readJsonAt<{ page_order?: string[] }>(at('Notes', 'Daily', '_pageset.json'))).page_order
+const reseed = async (): Promise<void> => {
+  await refreshTree(root)
+  await seedContentIndex(root)
+}
+const mutate = (req: Parameters<typeof settledMutate>[1]): Promise<MutateReply> =>
+  settledMutate(root, req, nexusDeps)
+const message = (r: MutateReply): string => (r.ok ? '' : r.error.message)
+const archive = async (path: string, kind: 'page' | 'set' = 'page'): Promise<string> => {
+  const r = await mutate({ op: 'archive', path, kind })
+  expect(r.ok).toBe(true)
+  return r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
+}
+const restore = (bundlePath: string, destination?: RestoreDestination): Promise<MutateReply> =>
+  mutate({ op: 'restore', bundlePath, ...(destination ? { destination } : {}) })
+const INTO_NOTES: RestoreDestination = { kind: 'container', id: NOTES }
+
+beforeEach(async () => {
+  root = tempRoot('pom-archive-')
+  installStores(memoryStores().stores)
+  await mkdir(contextsDir(root), { recursive: true })
+  await writeFile(at('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: '2026' }))
+  await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
+  await writeFile(
+    at('.nexus', 'properties.json'),
+    JSON.stringify({
+      order: ['prop_related'],
+      defs: {
+        prop_related: { id: 'prop_related', label: 'Related', key: 'Related', type: 'link' },
+      },
+    }),
+  )
+  await mkdir(at('Notes', 'Daily'), { recursive: true })
+  await writeFile(at('Notes', '_pagecollection.json'), JSON.stringify({ id: NOTES }))
+  await writeFile(
+    at('Notes', 'Daily', '_pageset.json'),
+    JSON.stringify({ id: DAILY, page_order: [PAGE_A, PAGE_B, PAGE_G] }),
+  )
+  await writeFile(at('Notes', 'Daily', 'Alpha.md'), `---\nID: ${PAGE_A}\n---\nalpha\n`)
+  await writeFile(at('Notes', 'Daily', 'Beta.md'), BETA)
+  await writeFile(at('Notes', 'Daily', 'Gamma.md'), `---\nID: ${PAGE_G}\n---\ngamma\n`)
+  await writeFile(at('Notes', 'Linker.md'), `---\nID: ${PAGE_K}\n---\n[[Notes/Daily/Beta]]`)
+  await openSession(root)
+  await reseed()
+})
+
+afterEach(async () => {
+  vi.restoreAllMocks()
+  dropLiveTree()
+  closeSession()
+  installStores(NO_STORES)
+  await rm(root, { recursive: true, force: true })
+})
+
+describe('archive — a page or Set leaves for its Collection’s Archive', () => {
+  it('a page archives into its Collection’s Archive under the chain it left, with its record', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    expect(bundlePath).toMatch(
+      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta\\.md\\.archived$`),
+    )
+    expect(await readFile(at(bundlePath, 'Beta.md'), 'utf8')).toBe(BETA)
+    expect(await readRecord(at(bundlePath))).toEqual({
+      entity: 'page',
+      id: PAGE_B,
+      parent: { kind: 'container', id: DAILY },
+      place: { above: PAGE_G, below: PAGE_A },
+      trail: [NOTES],
+    })
+    const daily = heldTreeOf(root)?.collections[0].sets[0]
+    expect(daily?.pages.map((p) => p.title)).toEqual(['Alpha', 'Gamma'])
+    expect(await pageOrder()).toEqual([PAGE_A, PAGE_G])
+  })
+
+  it('an archived page stays in every cascade’s reach', async () => {
+    await writeFile(at('Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\n[[Alpha]]`)
+    await reseed()
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const renamed = await mutate({
+      op: 'rename',
+      path: 'Notes/Daily/Alpha.md',
+      kind: 'page',
+      newName: 'Alpha 2',
+    })
+    expect(renamed.ok).toBe(true)
+    expect(await text(bundlePath, 'Beta.md')).toBe(`---\nID: ${PAGE_B}\n---\n[[Alpha 2]]`)
+  })
+
+  it('a rename’s cascade through an archived linker reports no archived path', async () => {
+    await writeFile(at('Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\n[[Alpha]]`)
+    await reseed()
+    await archive('Notes/Daily/Beta.md')
+    const renamed = await mutate({
+      op: 'rename',
+      path: 'Notes/Daily/Alpha.md',
+      kind: 'page',
+      newName: 'Alpha 2',
+    })
+    expect(renamed.ok && renamed.value.cascade?.pages).toEqual([])
+  })
+
+  it('a Set archives once the excluded folder inside it is lifted to its parent', async () => {
+    await mkdir(at('Notes', 'Daily', 'Private'), { recursive: true })
+    await writeFile(at('Notes', 'Daily', 'Private', 'Secret.md'), 'secret\n')
+    await writeFile(
+      at('.nexus', 'settings.json'),
+      JSON.stringify({ excluded_folders: ['Notes/Daily/Private'] }),
+    )
+    await refreshTree(root)
+    const bundlePath = await archive('Notes/Daily', 'set')
+    expect(await text('Notes', 'Private', 'Secret.md')).toBe('secret\n')
+    expect(
+      (await readJsonAt<{ excluded_folders: string[] }>(at('.nexus', 'settings.json')))
+        .excluded_folders,
+    ).toEqual(['Notes/Private'])
+    expect(await readdir(at(bundlePath))).toContain('Daily')
+    expect(await readdir(at(bundlePath, 'Daily'))).not.toContain('Private')
+  })
+
+  it('a Set archive whose move fails puts the lifted folder and its entry back', async () => {
+    await mkdir(at('Notes', 'Daily', 'Private'), { recursive: true })
+    await writeFile(at('Notes', 'Daily', 'Private', 'Secret.md'), 'secret\n')
+    await writeFile(
+      at('.nexus', 'settings.json'),
+      JSON.stringify({ excluded_folders: ['Notes/Daily/Private'] }),
+    )
+    await refreshTree(root)
+    const relocate = atomicWrite.relocate
+    vi.spyOn(atomicWrite, 'relocate')
+      .mockImplementationOnce(relocate)
+      .mockRejectedValueOnce(new Error('the move failed'))
+    expect((await mutate({ op: 'archive', path: 'Notes/Daily', kind: 'set' })).ok).toBe(false)
+    expect(await text('Notes', 'Daily', 'Private', 'Secret.md')).toBe('secret\n')
+    expect(await pathExists(at('Notes', 'Private'))).toBe(false)
+    expect(
+      (await readJsonAt<{ excluded_folders: string[] }>(at('.nexus', 'settings.json')))
+        .excluded_folders,
+    ).toEqual(['Notes/Daily/Private'])
+  })
+
+  it('a lift refused on its second folder puts the first back', async () => {
+    for (const name of ['Private', 'Raw'])
+      await mkdir(at('Notes', 'Daily', name), { recursive: true })
+    await writeFile(at('Notes', 'Daily', 'Private', 'Secret.md'), 'secret\n')
+    await writeFile(
+      at('.nexus', 'settings.json'),
+      JSON.stringify({ excluded_folders: ['Notes/Daily/Private', 'Notes/Daily/Raw'] }),
+    )
+    await refreshTree(root)
+    const carry = settings.carrySetAside
+    vi.spyOn(settings, 'carrySetAside')
+      .mockImplementationOnce(carry)
+      .mockResolvedValueOnce(fail('operation-failed', 'the carry failed'))
+    expect((await mutate({ op: 'archive', path: 'Notes/Daily', kind: 'set' })).ok).toBe(false)
+    expect(await text('Notes', 'Daily', 'Private', 'Secret.md')).toBe('secret\n')
+    expect(await pathExists(at('Notes', 'Private'))).toBe(false)
+    expect(
+      (await readJsonAt<{ excluded_folders: string[] }>(at('.nexus', 'settings.json')))
+        .excluded_folders,
+    ).toEqual(['Notes/Daily/Private', 'Notes/Daily/Raw'])
+  })
+
+  it('a Set delete whose record write throws puts the lifted folder back', async () => {
+    await mkdir(at('Notes', 'Daily', 'Private'), { recursive: true })
+    await writeFile(at('Notes', 'Daily', 'Private', 'Secret.md'), 'secret\n')
+    await writeFile(
+      at('.nexus', 'settings.json'),
+      JSON.stringify({ excluded_folders: ['Notes/Daily/Private'] }),
+    )
+    await refreshTree(root)
+    vi.spyOn(record, 'writeRecord').mockRejectedValueOnce(new Error('the write failed'))
+    expect((await mutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' })).ok).toBe(false)
+    expect(await text('Notes', 'Daily', 'Private', 'Secret.md')).toBe('secret\n')
+    expect(await pathExists(at('Notes', 'Private'))).toBe(false)
+    expect(
+      (await readJsonAt<{ excluded_folders: string[] }>(at('.nexus', 'settings.json')))
+        .excluded_folders,
+    ).toEqual(['Notes/Daily/Private'])
+  })
+
+  it('an archive handed the bundle name its item left takes it back, and one naming another name or a path takes a fresh stamp', async () => {
+    const rearchive = async (path: string, leaf: string): Promise<string> => {
+      const r = await mutate({ op: 'archive', path, kind: 'page', leaf })
+      expect(r.ok).toBe(true)
+      return r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
+    }
+    const first = await archive('Notes/Daily/Beta.md')
+    expect((await restore(first)).ok).toBe(true)
+    expect(await rearchive('Notes/Daily/Beta.md', basename(first))).toBe(first)
+    expect((await restore(first)).ok).toBe(true)
+    const renamed = await mutate({
+      op: 'rename',
+      path: 'Notes/Daily/Beta.md',
+      kind: 'page',
+      newName: 'Beta 2',
+    })
+    expect(renamed.ok).toBe(true)
+    const second = await rearchive('Notes/Daily/Beta 2.md', basename(first))
+    expect(second).toMatch(
+      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta 2\\.md\\.archived$`),
+    )
+    expect((await restore(second)).ok).toBe(true)
+    const third = await rearchive('Notes/Daily/Beta 2.md', `../${basename(second)}`)
+    expect(third).toMatch(
+      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta 2\\.md\\.archived$`),
+    )
+    expect(await readdir(at('.nexus', 'archive', NOTES, 'Notes'))).toEqual(['Daily'])
+  })
+
+  it('refuses a page whose Collection’s id would not make a folder name', async () => {
+    await writeFile(at('Notes', '_pagecollection.json'), JSON.stringify({ id: 'notes/col' }))
+    await refreshTree(root)
+    const r = await mutate({ op: 'archive', path: 'Notes/Daily/Beta.md', kind: 'page' })
+    expect(message(r)).toBe('Only pages and Sets inside a Collection can be archived.')
+    expect(await text('Notes', 'Daily', 'Beta.md')).toBe(BETA)
+    expect(await pathExists(at('.nexus', 'archive'))).toBe(false)
+  })
+
+  it('refuses what the tree doesn’t hold as the kind it names', async () => {
+    const r = await mutate({ op: 'archive', path: 'Notes', kind: 'set' })
+    expect(message(r)).toBe('That item can’t be changed.')
+  })
+
+  it('an archive whose move fails leaves no bundle in the Archive', async () => {
+    vi.spyOn(atomicWrite, 'relocate').mockRejectedValueOnce(new Error('the move failed'))
+    expect((await mutate({ op: 'archive', path: 'Notes/Daily/Beta.md', kind: 'page' })).ok).toBe(
+      false,
+    )
+    expect(await listBundles(root, ARCHIVE)).toEqual([])
+    expect(await readdir(at('.nexus', 'archive', NOTES, 'Notes', 'Daily'))).toEqual([])
+    expect(await text('Notes', 'Daily', 'Beta.md')).toBe(BETA)
+  })
+})
+
+describe('restore — an archived item comes back by a plain move', () => {
+  it('a restore returns it to its exact place by a plain move', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const r = await restore(bundlePath)
+    expect(r.ok).toBe(true)
+    expect(r.ok && r.value).not.toHaveProperty('unrestored')
+    expect(r.ok && r.value).not.toHaveProperty('landedAs')
+    expect(await text('Notes', 'Daily', 'Beta.md')).toBe(BETA)
+    expect(await pageOrder()).toEqual([PAGE_A, PAGE_B, PAGE_G])
+    expect(await pathExists(at(bundlePath))).toBe(false)
+  })
+
+  it('a path link naming where it lived follows it to a chosen destination', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    expect((await restore(bundlePath, INTO_NOTES)).ok).toBe(true)
+    expect(await text('Notes', 'Beta.md')).toBe(BETA)
+    expect(heldTreeOf(root)?.collections[0].pages.at(-1)?.id).toBe(PAGE_B)
+    expect(await text('Notes', 'Linker.md')).toBe(`---\nID: ${PAGE_K}\n---\n[[Notes/Beta|Beta]]`)
+  })
+
+  it('a restore landing on a taken name steps aside and says so', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const created = await mutate(
+      minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Beta' }),
+    )
+    expect(created.ok).toBe(true)
+    const r = await restore(bundlePath)
+    expect(r.ok && r.value.landedAs).toBe('Beta (2)')
+    expect(await text('Notes', 'Daily', 'Beta (2).md')).toBe(BETA)
+  })
+
+  it('its own identity in the Archive doesn’t refuse its restore, and a twin elsewhere does', async () => {
+    expect((await restore(await archive('Notes/Daily/Beta.md'))).ok).toBe(true)
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const twin = await mintBundle(root, ARCHIVE, at('Notes', 'Beta.md'))
+    await writeRecord(twin, {
+      entity: 'page',
+      id: PAGE_B,
+      parent: { kind: 'container', id: NOTES },
+    })
+    await copyFile(at(bundlePath, 'Beta.md'), join(twin, 'Beta.md'))
+    await reseed()
+    expect(message(await restore(bundlePath))).toBe(
+      'Something in the nexus already carries this identity.',
+    )
+  })
+
+  it('an Archive restore takes no Contexts lock', async () => {
+    const lock = vi.spyOn(machine(), 'lock')
+    const locked = (): boolean => lock.mock.calls.some(([key]) => key === contextsDir(root))
+    const archived = await archive('Notes/Daily/Beta.md')
+    lock.mockClear()
+    expect((await restore(archived)).ok).toBe(true)
+    expect(locked()).toBe(false)
+    const deleted = await mutate({ op: 'delete', path: 'Notes/Daily/Gamma.md', kind: 'page' })
+    const trashed = deleted.ok ? (deleted.value.bundled?.bundlePath ?? '') : ''
+    lock.mockClear()
+    expect((await restore(trashed)).ok).toBe(true)
+    expect(locked()).toBe(true)
+  })
+
+  it('an item archived out of a Set since trashed returns into that Set once the Set is restored, and with the Set still in the Trash its row reads homeless and its restore takes a destination', async () => {
+    const beta = await archive('Notes/Daily/Beta.md')
+    const gamma = await archive('Notes/Daily/Gamma.md')
+    expect((await mutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' })).ok).toBe(true)
+    const homes = async (): Promise<Record<string, boolean>> => {
+      const tree = await readNexus(root)
+      const { byId } = await nexusPages(root, tree)
+      const rows = bundleRows(await listBundles(root, ARCHIVE), ARCHIVE, tree, byId)
+      return Object.fromEntries(rows.map((r) => [r.bundlePath, r.homeResolves]))
+    }
+    expect(await homes()).toEqual({ [beta]: false, [gamma]: false })
+    expect(message(await restore(gamma))).toBe('The place this belonged to no longer exists.')
+    expect((await restore(gamma, INTO_NOTES)).ok).toBe(true)
+    expect(await pathExists(at('Notes', 'Gamma.md'))).toBe(true)
+    const [daily] = await listBundles(root, { kind: 'trash' })
+    expect((await restore(daily.bundlePath)).ok).toBe(true)
+    expect(await homes()).toEqual({ [beta]: true })
+    expect((await restore(beta)).ok).toBe(true)
+    expect(await text('Notes', 'Daily', 'Beta.md')).toBe(BETA)
+  })
+
+  it('a Set’s link to its returning sibling stays on it past a namesake made meanwhile', async () => {
+    await writeFile(at('Notes', 'Daily', 'Gamma.md'), `---\nID: ${PAGE_G}\n---\nsee [[Alpha]]\n`)
+    await reseed()
+    const bundlePath = await archive('Notes/Daily', 'set')
+    expect(
+      (await mutate(minted({ op: 'createPage', parentPath: 'Notes', name: 'Alpha' }))).ok,
+    ).toBe(true)
+    await reseed()
+    expect((await restore(bundlePath)).ok).toBe(true)
+    expect(await text('Notes', 'Daily', 'Gamma.md')).toBe(
+      `---\nID: ${PAGE_G}\n---\nsee [[Notes/Daily/Alpha|Alpha]]\n`,
+    )
+  })
+
+  it('a restore whose origin has since been excluded finds no parent and takes a destination', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    await writeExcludedFolders(root, ['Notes/Daily'])
+    await settleNow({ push: () => {}, watch: async () => {} }, root)
+    expect(message(await restore(bundlePath))).toBe('The place this belonged to no longer exists.')
+    expect(await pathExists(at(bundlePath, 'Beta.md'))).toBe(true)
+    expect((await restore(bundlePath, INTO_NOTES)).ok).toBe(true)
+    expect(await text('Notes', 'Beta.md')).toBe(BETA)
+  })
+})
+
+describe('a delete from the Archive', () => {
+  const LINKER = `---\nID: ${PAGE_K}\nRelated: "[[Beta]]"\n---\nlinker\n`
+  const related = async (): Promise<unknown> =>
+    splitFrontmatter(await text('Notes', 'Linker.md')).Related
+  const trash = async (
+    archived: string,
+    kind: 'page' | 'set' | 'collection' = 'page',
+  ): Promise<string> => {
+    const r = await mutate({ op: 'delete', path: archived, kind })
+    expect(r.ok).toBe(true)
+    return r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
+  }
+  const UNDO: RestoreDestination = { kind: 'archive' }
+
+  beforeEach(async () => {
+    await writeFile(at('Notes', 'Linker.md'), LINKER)
+    await reseed()
+  })
+
+  it('goes to the Trash under the chain it was archived from, keeping the bundle it left', async () => {
+    const archived = await archive('Notes/Daily/Beta.md')
+    const trashed = await trash(archived)
+    expect(trashed).toMatch(/^\.trash\/Notes\/Daily\/[^/]+__Beta\.md\.deleted$/)
+    expect(await text(trashed, 'Beta.md')).toBe(BETA)
+    expect(await readRecord(at(trashed))).toMatchObject({
+      entity: 'page',
+      id: PAGE_B,
+      parent: { kind: 'container', id: DAILY },
+      place: { above: PAGE_G, below: PAGE_A },
+      trail: [NOTES],
+      archive: archived,
+    })
+    expect(await pathExists(at(archived))).toBe(false)
+  })
+
+  it('strips the Link values naming it, and records them', async () => {
+    const trashed = await trash(await archive('Notes/Daily/Beta.md'))
+    expect(await related()).toBeUndefined()
+    expect(await readRecord(at(trashed))).toMatchObject({
+      links: [{ page: PAGE_K, property: 'prop_related', value: '[[Beta]]' }],
+    })
+  })
+
+  it('an archived Set takes the views naming it and its sub-Sets', async () => {
+    const SUB = '01KVGMT8BFP350FZZXAMG1QDS0'
+    await mkdir(at('Notes', 'Daily', 'Sub'), { recursive: true })
+    await writeFile(at('Notes', 'Daily', 'Sub', '_pageset.json'), JSON.stringify({ id: SUB }))
+    const filter = (rules: unknown[]) => ({ match: 'all', rules })
+    await writeFile(
+      at('Notes', '_pagecollection.json'),
+      JSON.stringify({
+        id: NOTES,
+        views: [
+          {
+            id: 'view_1',
+            name: 'V',
+            type: 'table',
+            filter: filter([
+              { property_id: '_location', op: 'is', values: [DAILY, 'set_keep'] },
+              { property_id: '_location', op: 'is_inside', values: [SUB] },
+            ]),
+          },
+        ],
+      }),
+    )
+    await reseed()
+    await trash(await archive('Notes/Daily', 'set'), 'set')
+    const { views } = await readJsonAt<{ views: { filter: unknown }[] }>(
+      at('Notes', '_pagecollection.json'),
+    )
+    expect(views[0].filter).toEqual(
+      filter([{ property_id: '_location', op: 'is', values: ['set_keep'] }]),
+    )
+  })
+
+  it('refuses a kind its record doesn’t carry', async () => {
+    const archived = await archive('Notes/Daily/Beta.md')
+    const r = await mutate({ op: 'delete', path: archived, kind: 'set' })
+    expect(message(r)).toBe('That item can’t be changed.')
+    expect(await text(archived, 'Beta.md')).toBe(BETA)
+  })
+
+  it('under the system Trash Mode, it leaves for the system trash with its metadata', async () => {
+    await updatePageMetadata(root, PAGE_A, { icon: 'moon' })
+    await updatePageMetadata(root, PAGE_B, { icon: 'star' })
+    const archived = await archive('Notes/Daily/Beta.md')
+    const trashToSystem = vi.fn((p: string) => rm(p, { recursive: true }))
+    const r = await settledMutate(
+      root,
+      { op: 'delete', path: archived, kind: 'page' },
+      { trashMode: 'system', trashToSystem },
+    )
+    expect(r.ok).toBe(true)
+    expect(r.ok && r.value).not.toHaveProperty('bundled')
+    expect(trashToSystem).toHaveBeenCalledWith(at(archived, 'Beta.md'))
+    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
+    expect(await pathExists(at(archived))).toBe(false)
+    const month = await readShard(root, shardOf(PAGE_A)!)
+    expect(month.kind === 'ok' && month.pages).toEqual({ [PAGE_A]: { icon: 'moon' } })
+  })
+
+  it('its Undo returns it to the Archive under the same name, its Link values back', async () => {
+    const archived = await archive('Notes/Daily/Beta.md')
+    const trashed = await trash(archived)
+    const r = await restore(trashed, UNDO)
+    expect(r.ok).toBe(true)
+    expect(r.ok && r.value).not.toHaveProperty('landedAs')
+    expect(await text(archived, 'Beta.md')).toBe(BETA)
+    expect(await readRecord(at(archived))).toEqual({
+      entity: 'page',
+      id: PAGE_B,
+      parent: { kind: 'container', id: DAILY },
+      place: { above: PAGE_G, below: PAGE_A },
+      trail: [NOTES],
+    })
+    expect(await related()).toBe('[[Beta]]')
+    expect(await pathExists(at(trashed))).toBe(false)
+    const daily = heldTreeOf(root)?.collections[0].sets[0]
+    expect(daily?.pages.map((p) => p.title)).toEqual(['Alpha', 'Gamma'])
+  })
+
+  it('its Undo mints a fresh bundle in the same Archive once the name is taken', async () => {
+    const archived = await archive('Notes/Daily/Beta.md')
+    const trashed = await trash(archived)
+    await mkdir(at(archived), { recursive: true })
+    expect((await restore(trashed, UNDO)).ok).toBe(true)
+    const [other, ...rest] = (await listBundles(root, ARCHIVE)).map((b) => b.bundlePath)
+    expect(rest).toEqual([])
+    expect(other).not.toBe(archived)
+    expect(other).toMatch(
+      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta\\.md\\.archived$`),
+    )
+    expect(await text(other, 'Beta.md')).toBe(BETA)
+    expect(await readdir(at(archived))).toEqual([])
+  })
+
+  it('a failed Undo leaves no bundle behind, and its retry lands under the same name', async () => {
+    const archived = await archive('Notes/Daily/Beta.md')
+    const trashed = await trash(archived)
+    vi.spyOn(atomicWrite, 'relocate').mockRejectedValueOnce(new Error('the move failed'))
+    expect((await restore(trashed, UNDO)).ok).toBe(false)
+    expect(await pathExists(at(archived))).toBe(false)
+    expect(await listBundles(root, ARCHIVE)).toEqual([])
+    expect(await text(trashed, 'Beta.md')).toBe(BETA)
+    expect((await restore(trashed, UNDO)).ok).toBe(true)
+    expect(await text(archived, 'Beta.md')).toBe(BETA)
+  })
+
+  it('a plain restore from the Trash returns it to where it was archived from', async () => {
+    const trashed = await trash(await archive('Notes/Daily/Beta.md'))
+    expect((await restore(trashed)).ok).toBe(true)
+    expect(await text('Notes', 'Daily', 'Beta.md')).toBe(BETA)
+    expect(await pageOrder()).toEqual([PAGE_A, PAGE_B, PAGE_G])
+  })
+
+  it('leaves the Link values another archived page sharing its origin still answers', async () => {
+    const first = await archive('Notes/Daily/Beta.md')
+    expect(
+      (await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Beta' }))).ok,
+    ).toBe(true)
+    await archive('Notes/Daily/Beta.md')
+    await trash(first)
+    expect(await related()).toBe('[[Beta]]')
+  })
+
+  it('a live page’s delete counts an archived linker whose strip failed in its warning, and its record stays partial', async () => {
+    const linker = await archive('Notes/Linker.md')
+    const real = atomicWrite.rewritePreservingTimes
+    vi.spyOn(atomicWrite, 'rewritePreservingTimes').mockImplementation((file, data) =>
+      file.startsWith(at(linker)) ? Promise.reject(new Error('refused')) : real(file, data),
+    )
+    const r = await mutate({ op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' })
+    expect(r.ok && r.value.cascade?.warning).toBe('Couldn’t update links in 1 Item.')
+    const bundlePath = r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
+    expect(await readRecord(at(bundlePath))).toMatchObject({ partial: true })
+    expect(splitFrontmatter(await text(linker, 'Linker.md')).Related).toBe('[[Beta]]')
+  })
+
+  it('a live page’s delete leaves the Link values an archived page at its path still answers', async () => {
+    await archive('Notes/Daily/Beta.md')
+    expect(
+      (await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Beta' }))).ok,
+    ).toBe(true)
+    expect((await mutate({ op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' })).ok).toBe(
+      true,
+    )
+    expect(await related()).toBe('[[Beta]]')
+  })
+
+  it('a trashed page’s link to an archived page follows it to where it lands on restore', async () => {
+    await writeFile(at('Notes', 'Daily', 'Gamma.md'), `---\nID: ${PAGE_G}\n---\n[[Alpha]]\n`)
+    await reseed()
+    const alpha = await archive('Notes/Daily/Alpha.md')
+    const gamma = await mutate({ op: 'delete', path: 'Notes/Daily/Gamma.md', kind: 'page' })
+    expect(
+      (await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Alpha' }))).ok,
+    ).toBe(true)
+    const back = await restore(alpha)
+    expect(back.ok && back.value.landedAs).toBe('Alpha (2)')
+    expect((await restore(gamma.ok ? (gamma.value.bundled?.bundlePath ?? '') : '')).ok).toBe(true)
+    expect(await text('Notes', 'Daily', 'Gamma.md')).toContain('[[Alpha (2)]]')
+  })
+
+  it('a trashed page’s link a live page and an archived page both answer names the live one', async () => {
+    await writeFile(at('Notes', 'Daily', 'Gamma.md'), `---\nID: ${PAGE_G}\n---\n[[Alpha]]\n`)
+    await reseed()
+    await archive('Notes/Daily/Alpha.md')
+    expect(
+      (await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Alpha' }))).ok,
+    ).toBe(true)
+    const gamma = await mutate({ op: 'delete', path: 'Notes/Daily/Gamma.md', kind: 'page' })
+    expect(
+      (
+        await mutate({
+          op: 'rename',
+          path: 'Notes/Daily/Alpha.md',
+          kind: 'page',
+          newName: 'Alpha 2',
+        })
+      ).ok,
+    ).toBe(true)
+    expect((await restore(gamma.ok ? (gamma.value.bundled?.bundlePath ?? '') : '')).ok).toBe(true)
+    expect(await text('Notes', 'Daily', 'Gamma.md')).toContain('[[Alpha 2]]')
+  })
+
+  const scoredBeta = async (): Promise<void> => {
+    await writeFile(
+      at('.nexus', 'properties.json'),
+      JSON.stringify({
+        order: ['prop_related', 'prop_score'],
+        defs: {
+          prop_related: { id: 'prop_related', label: 'Related', key: 'Related', type: 'link' },
+          prop_score: { id: 'prop_score', label: 'Score', key: 'Score', type: 'number' },
+        },
+      }),
+    )
+    await writeFile(
+      at('Notes', '_pagecollection.json'),
+      JSON.stringify({ id: NOTES, properties: ['prop_score'] }),
+    )
+    await writeFile(at('Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\nScore: 3\n---\nbeta\n`)
+    await reseed()
+  }
+
+  it('its Undo keeps the page’s values once its Collection is in the Trash', async () => {
+    await scoredBeta()
+    const archived = await archive('Notes/Daily/Beta.md')
+    const trashed = await trash(archived)
+    await trash('Notes', 'collection')
+    expect((await restore(trashed, UNDO)).ok).toBe(true)
+    expect(splitFrontmatter(await text(archived, 'Beta.md')).Score).toBe(3)
+  })
+
+  it('its Undo refuses once its Collection is gone for good, and the page stays in the Trash', async () => {
+    await scoredBeta()
+    const trashed = await trash(await archive('Notes/Daily/Beta.md'))
+    const notes = await trash('Notes', 'collection')
+    expect(
+      (
+        await settledMutate(
+          root,
+          { op: 'emptyBundle', bundlePath: notes },
+          { ...nexusDeps, permanentDelete: true },
+        )
+      ).ok,
+    ).toBe(true)
+    expect(message(await restore(trashed, UNDO))).toBe(
+      'The place this belonged to no longer exists.',
+    )
+    expect(await text(trashed, 'Beta.md')).toContain('Score: 3')
+    expect(await pathExists(at('.nexus', 'archive', NOTES))).toBe(false)
+  })
+
+  it('its Undo lands while a root Collection’s sidecar reads unreadable', async () => {
+    const archived = await archive('Notes/Daily/Beta.md')
+    const trashed = await trash(archived)
+    await writeFile(at('Notes', '_pagecollection.json'), '{ not json')
+    await refreshTree(root)
+    expect(message(await restore(trashed, UNDO))).toBe('')
+    expect(await text(archived, 'Beta.md')).toBe(BETA)
+  })
+
+  it('refuses the Archive as a destination for an Archive bundle', async () => {
+    const archived = await archive('Notes/Daily/Beta.md')
+    expect(message(await restore(archived, UNDO))).toBe(NO_DESTINATION)
+    expect(await text(archived, 'Beta.md')).toBe(BETA)
+  })
+
+  it('emptying it from the Trash gives it up for good', async () => {
+    const archived = await archive('Notes/Daily/Beta.md')
+    const trashed = await trash(archived)
+    expect((await mutate({ op: 'emptyBundle', bundlePath: trashed })).ok).toBe(true)
+    expect(await pathExists(at(trashed))).toBe(false)
+    expect(await pathExists(at(archived))).toBe(false)
+  })
+})
```

##### Core/Archive/refile.test.ts

```/Core/Archive/refile.test.ts diff
@@ -0 +1 @@
+import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { join } from '../Paths/posix'
+import { tempRoot } from '../Testing/hostFs'
+import { settledMutate } from '../Testing/settledMutate'
+import { jsonText, pathExists } from '../Files/atomicWrite'
+import type { ChangeEvent, FileEvent } from '../Files/writeEcho'
+import { contextsDir, contextsRegistryFile } from '../Paths/paths'
+import { installStores, NO_STORES } from '../Platform/stores'
+import { memoryStores } from '../Testing/memoryStores'
+import { seedContentIndex } from '../Index/indexSeed'
+import { diskMoved, dropLiveTree, heldTreeOf, refreshTree } from '../Nexus/liveTree'
+import { closeSession, openSession } from '../Nexus/session'
+import { settleBatch, settleNow } from '../Nexus/settle'
+import type { MutateReply, RestoreDestination } from '../Nexus/mutateRequest'
+import * as bundles from '../Bundles/bundle'
+import { type BundleStore, listBundles } from '../Bundles/bundle'
+import { readRecord } from '../Bundles/record'
+import type { TrashDeps } from '../Trash/discard'
+import { settleArchives } from './refile'
+
+const NOTES = '01KVGMT8BFP350FZZXAMG1QDN0'
+const OTHER = '01KVGMT8BFP350FZZXAMG1QDR0'
+const DAILY = '01KVGMT8BFP350FZZXAMG1QDD0'
+const SUB = '01KVGMT8BFP350FZZXAMG1QDS0'
+const DEEP = '01KVGMT8BFP350FZZXAMG1QDE0'
+const PAGE_N = '01KVGMT8BFP350FZZXAMG1QDVN'
+const PAGE_K = '01KVGMT8BFP350FZZXAMG1QDVK'
+const PAGE_W = '01KVGMT8BFP350FZZXAMG1QDVW'
+const PAGE_G = '01KVGMT8BFP350FZZXAMG1QDVG'
+const GONE = '01KVGMT8BFP350FZZXAMG1QDG0'
+const GONE_SET = '01KVGMT8BFP350FZZXAMG1QDG1'
+const STAMP = '2026-10-20T00-00-00-000Z'
+const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
+const QUIET = { push: () => {}, watch: async () => {} }
+const IN_NOTES: BundleStore = { kind: 'archive', id: NOTES }
+const IN_OTHER: BundleStore = { kind: 'archive', id: OTHER }
+const INTO_OTHER: RestoreDestination = { kind: 'container', id: OTHER }
+
+let root: string
+const at = (...segs: string[]): string => join(root, ...segs)
+const mutate = (req: Parameters<typeof settledMutate>[1]): Promise<MutateReply> =>
+  settledMutate(root, req, nexusDeps)
+const bundled = async (req: Parameters<typeof settledMutate>[1]): Promise<string> => {
+  const r = await mutate(req)
+  expect(r.ok).toBe(true)
+  return r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
+}
+const archive = (path: string, kind: 'page' | 'set' = 'page'): Promise<string> =>
+  bundled({ op: 'archive', path, kind })
+const leafOf = (bundlePath: string): string => bundlePath.split('/').at(-1) ?? ''
+const filed = async (store: BundleStore) =>
+  (await listBundles(root, store)).map(({ bundlePath, record }) => ({
+    bundlePath,
+    id: 'id' in record ? record.id : undefined,
+    trail: 'trail' in record ? record.trail : undefined,
+  }))
+const reread = () => {
+  diskMoved()
+  return refreshTree(root)
+}
+const seedArchived = async (record: unknown, chain = 'Gone'): Promise<string> => {
+  const bundle = `.nexus/archive/${GONE}/${chain}/${STAMP}__Orphan.md.archived`
+  await mkdir(at(bundle), { recursive: true })
+  await writeFile(at(bundle, 'Orphan.md'), `---\nID: ${PAGE_G}\n---\norphan\n`)
+  await writeFile(at(bundle, '_record.json'), jsonText(record))
+  return bundle
+}
+const ORPHAN = { entity: 'page', id: PAGE_G, parent: { kind: 'container', id: GONE_SET } }
+const ev = (event: ChangeEvent, ...segs: string[]): FileEvent => ({
+  event,
+  absPath: at(...segs),
+  origin: 'watched',
+})
+
+beforeEach(async () => {
+  root = tempRoot('pom-refile-')
+  installStores(memoryStores().stores)
+  await mkdir(contextsDir(root), { recursive: true })
+  await writeFile(at('.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: '2026' }))
+  await writeFile(contextsRegistryFile(root), JSON.stringify({ contexts: [] }))
+  await mkdir(at('Notes', 'Daily', 'Sub', 'Deep'), { recursive: true })
+  await mkdir(at('Other'))
+  await writeFile(at('Notes', '_pagecollection.json'), JSON.stringify({ id: NOTES }))
+  await writeFile(at('Other', '_pagecollection.json'), JSON.stringify({ id: OTHER }))
+  await writeFile(at('Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: DAILY }))
+  await writeFile(at('Notes', 'Daily', 'Sub', '_pageset.json'), JSON.stringify({ id: SUB }))
+  await writeFile(
+    at('Notes', 'Daily', 'Sub', 'Deep', '_pageset.json'),
+    JSON.stringify({ id: DEEP }),
+  )
+  await writeFile(at('Notes', 'Daily', 'Sub', 'Note.md'), `---\nID: ${PAGE_N}\n---\nnote\n`)
+  await writeFile(at('Notes', 'Daily', 'Sub', 'Kept.md'), `---\nID: ${PAGE_K}\n---\nkept\n`)
+  await writeFile(at('Notes', 'Daily', 'Sub', 'Deep', 'Low.md'), `---\nID: ${PAGE_W}\n---\nlow\n`)
+  await openSession(root)
+  await refreshTree(root)
+  await seedContentIndex(root)
+  await settleNow(QUIET, root)
+})
+
+afterEach(async () => {
+  vi.restoreAllMocks()
+  dropLiveTree()
+  closeSession()
+  installStores(NO_STORES)
+  await rm(root, { recursive: true, force: true })
+})
+
+describe('the comparison — a Set the settle sees move carries what was archived from within it', () => {
+  it('a Set moved into another Collection carries what was archived from within it', async () => {
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    expect(
+      (
+        await mutate({
+          op: 'moveSet',
+          path: 'Notes/Daily/Sub',
+          newParentPath: 'Other',
+          order: [SUB],
+        })
+      ).ok,
+    ).toBe(true)
+    expect(await pathExists(at(bundlePath))).toBe(false)
+    const carried = `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`
+    expect(await filed(IN_OTHER)).toEqual([{ bundlePath: carried, id: PAGE_N, trail: [OTHER] }])
+    expect(await filed(IN_NOTES)).toEqual([])
+    expect(await readFile(at(carried, 'Note.md'), 'utf8')).toBe(`---\nID: ${PAGE_N}\n---\nnote\n`)
+    const record = await readRecord(at(carried))
+    expect(record && 'parent' in record && record.parent).toEqual({ kind: 'container', id: SUB })
+  })
+
+  it('a Collection whose id would not make a folder name takes nothing outside the Archive', async () => {
+    await writeFile(at('Other', '_pagecollection.json'), JSON.stringify({ id: '../../Escape' }))
+    await reread()
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    expect(
+      (
+        await mutate({
+          op: 'moveSet',
+          path: 'Notes/Daily/Sub',
+          newParentPath: 'Other',
+          order: [SUB],
+        })
+      ).ok,
+    ).toBe(true)
+    await settleArchives(root, await reread())
+    expect(await pathExists(at('Escape'))).toBe(false)
+    expect((await filed(IN_NOTES)).map((b) => b.bundlePath)).toEqual([bundlePath])
+  })
+
+  it('a Collection whose id would not make a folder name reaches no sidecar outside the Archive', async () => {
+    const INNER = '01KVGMT8BFP350FZZXAMG1QDJ0'
+    await writeFile(at('Other', '_pagecollection.json'), JSON.stringify({ id: '../../Escape' }))
+    await mkdir(at('Other', 'A', 'Inner'), { recursive: true })
+    await mkdir(at('Other', 'B'))
+    await writeFile(at('Other', 'A', '_pageset.json'), JSON.stringify({ id: GONE }))
+    await writeFile(at('Other', 'B', '_pageset.json'), JSON.stringify({ id: GONE_SET }))
+    await writeFile(at('Other', 'A', 'Inner', '_pageset.json'), JSON.stringify({ id: INNER }))
+    const outside = JSON.stringify({
+      id: DEEP,
+      views: [
+        {
+          id: 'view_1',
+          name: 'V',
+          type: 'table',
+          filter: {
+            match: 'all',
+            rules: [{ property_id: '_location', op: 'is', values: [INNER] }],
+          },
+        },
+      ],
+    })
+    await mkdir(at('Escape', 'X'), { recursive: true })
+    await writeFile(at('Escape', 'X', '_pageset.json'), outside)
+    await reread()
+    expect(
+      (
+        await mutate({
+          op: 'moveSet',
+          path: 'Other/A/Inner',
+          newParentPath: 'Other/B',
+          order: [INNER],
+        })
+      ).ok,
+    ).toBe(true)
+    expect(await readFile(at('Escape', 'X', '_pageset.json'), 'utf8')).toBe(outside)
+  })
+
+  it('a Set moved out of its Collection takes the archived Sets within it from the views it left', async () => {
+    const filter = (values: string[]) => ({
+      match: 'all',
+      rules: [{ property_id: '_location', op: 'is', values }],
+    })
+    await writeFile(
+      at('Notes', '_pagecollection.json'),
+      JSON.stringify({
+        id: NOTES,
+        views: [{ id: 'view_1', name: 'V', type: 'table', filter: filter([DEEP, 'set_keep']) }],
+      }),
+    )
+    await reread()
+    await archive('Notes/Daily/Sub/Deep', 'set')
+    expect(
+      (
+        await mutate({
+          op: 'moveSet',
+          path: 'Notes/Daily/Sub',
+          newParentPath: 'Other',
+          order: [SUB],
+        })
+      ).ok,
+    ).toBe(true)
+    const { views } = JSON.parse(await readFile(at('Notes', '_pagecollection.json'), 'utf8'))
+    expect(views[0].filter).toEqual(filter(['set_keep']))
+  })
+
+  it('a Set moved out of its Collection takes the archived Sets within it from the views it left after a Set above it was renamed', async () => {
+    const filter = (values: string[]) => ({
+      match: 'all',
+      rules: [{ property_id: '_location', op: 'is', values }],
+    })
+    await writeFile(
+      at('Notes', '_pagecollection.json'),
+      JSON.stringify({
+        id: NOTES,
+        views: [{ id: 'view_1', name: 'V', type: 'table', filter: filter([DEEP, 'set_keep']) }],
+      }),
+    )
+    await reread()
+    await archive('Notes/Daily/Sub/Deep', 'set')
+    expect(
+      (await mutate({ op: 'rename', path: 'Notes/Daily', kind: 'set', newName: 'Days' })).ok,
+    ).toBe(true)
+    expect(
+      (
+        await mutate({
+          op: 'moveSet',
+          path: 'Notes/Days/Sub',
+          newParentPath: 'Other',
+          order: [SUB],
+        })
+      ).ok,
+    ).toBe(true)
+    const { views } = JSON.parse(await readFile(at('Notes', '_pagecollection.json'), 'utf8'))
+    expect(views[0].filter).toEqual(filter(['set_keep']))
+  })
+
+  it('an archived Set carried with a Set that changes Collection keeps its own saved views', async () => {
+    const own = JSON.stringify({
+      id: DEEP,
+      views: [
+        {
+          id: 'view_1',
+          name: 'V',
+          type: 'table',
+          filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values: [DEEP] }] },
+        },
+      ],
+    })
+    await writeFile(at('Notes', 'Daily', 'Sub', 'Deep', '_pageset.json'), own)
+    await reread()
+    const deep = await archive('Notes/Daily/Sub/Deep', 'set')
+    expect(
+      (
+        await mutate({
+          op: 'moveSet',
+          path: 'Notes/Daily/Sub',
+          newParentPath: 'Other',
+          order: [SUB],
+        })
+      ).ok,
+    ).toBe(true)
+    const carried = `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(deep)}`
+    expect(JSON.parse(await readFile(at(carried, 'Deep', '_pageset.json'), 'utf8'))).toEqual(
+      JSON.parse(own),
+    )
+  })
+
+  it('a Set moved within its Collection rewrites the trails alone', async () => {
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    expect(
+      (
+        await mutate({
+          op: 'moveSet',
+          path: 'Notes/Daily/Sub',
+          newParentPath: 'Notes',
+          order: [DAILY, SUB],
+        })
+      ).ok,
+    ).toBe(true)
+    expect(await filed(IN_NOTES)).toEqual([{ bundlePath, id: PAGE_N, trail: [NOTES] }])
+  })
+
+  it('a record whose origin was itself archived is placed by the trail it stored', async () => {
+    const low = await archive('Notes/Daily/Sub/Deep/Low.md')
+    const deep = await archive('Notes/Daily/Sub/Deep', 'set')
+    expect(
+      (
+        await mutate({
+          op: 'moveSet',
+          path: 'Notes/Daily/Sub',
+          newParentPath: 'Other',
+          order: [SUB],
+        })
+      ).ok,
+    ).toBe(true)
+    const into = `.nexus/archive/${OTHER}/Notes/Daily/Sub`
+    expect(
+      (await filed(IN_OTHER)).sort((a, b) => a.bundlePath.localeCompare(b.bundlePath)),
+    ).toEqual(
+      [
+        { bundlePath: `${into}/Deep/${leafOf(low)}`, id: PAGE_W, trail: [OTHER, SUB] },
+        { bundlePath: `${into}/${leafOf(deep)}`, id: DEEP, trail: [OTHER] },
+      ].sort((a, b) => a.bundlePath.localeCompare(b.bundlePath)),
+    )
+    expect(await filed(IN_NOTES)).toEqual([])
+  })
+
+  it('a Set moved in Finder is carried once the settle sees it', async () => {
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    await rename(at('Notes', 'Daily', 'Sub'), at('Other', 'Sub'))
+    await settleBatch(QUIET, root, [
+      ev('unlinkDir', 'Notes', 'Daily', 'Sub'),
+      ev('addDir', 'Other', 'Sub'),
+    ])
+    expect(heldTreeOf(root)?.collections.find((c) => c.id === OTHER)?.sets[0]?.id).toBe(SUB)
+    expect(await filed(IN_OTHER)).toEqual([
+      {
+        bundlePath: `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`,
+        id: PAGE_N,
+        trail: [OTHER],
+      },
+    ])
+  })
+
+  it('a Set moved in Finder into a Collection renamed in the same settle is carried', async () => {
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    await rename(at('Notes', 'Daily', 'Sub'), at('Other', 'Sub'))
+    await rename(at('Other'), at('Elsewhere'))
+    await settleBatch(QUIET, root, [
+      ev('unlinkDir', 'Notes', 'Daily', 'Sub'),
+      ev('unlinkDir', 'Other'),
+      ev('addDir', 'Elsewhere'),
+    ])
+    expect(heldTreeOf(root)?.collections.find((c) => c.id === OTHER)?.sets[0]?.id).toBe(SUB)
+    expect(await filed(IN_OTHER)).toEqual([
+      {
+        bundlePath: `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`,
+        id: PAGE_N,
+        trail: [OTHER],
+      },
+    ])
+  })
+
+  it('a rename moves nothing and reads no Archive', async () => {
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    const listed = vi.spyOn(bundles, 'archivedWithin')
+    expect(
+      (await mutate({ op: 'rename', path: 'Notes/Daily', kind: 'set', newName: 'Days' })).ok,
+    ).toBe(true)
+    expect(listed).not.toHaveBeenCalled()
+    expect((await readRecord(at(bundlePath)))?.entity).toBe('page')
+  })
+})
+
+describe('the restore — a Set landing in another Collection carries what was archived from within it', () => {
+  it('a Set restored from the Trash into another Collection carries what was archived from within it before it left', async () => {
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    const trashed = await bundled({ op: 'delete', path: 'Notes/Daily/Sub', kind: 'set' })
+    expect((await mutate({ op: 'restore', bundlePath: trashed, destination: INTO_OTHER })).ok).toBe(
+      true,
+    )
+    expect(await filed(IN_OTHER)).toEqual([
+      {
+        bundlePath: `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`,
+        id: PAGE_N,
+        trail: [OTHER],
+      },
+    ])
+  })
+
+  it('a Set that sat directly in its Collection, restored from the Trash to a destination in another Collection, carries what was archived from within it', async () => {
+    expect(
+      (
+        await mutate({
+          op: 'moveSet',
+          path: 'Notes/Daily/Sub',
+          newParentPath: 'Notes',
+          order: [DAILY, SUB],
+        })
+      ).ok,
+    ).toBe(true)
+    const bundlePath = await archive('Notes/Sub/Note.md')
+    const trashed = await bundled({ op: 'delete', path: 'Notes/Sub', kind: 'set' })
+    const stored = await readRecord(at(trashed))
+    expect(stored && 'trail' in stored ? stored.trail : undefined).toEqual([])
+    expect((await mutate({ op: 'restore', bundlePath: trashed, destination: INTO_OTHER })).ok).toBe(
+      true,
+    )
+    expect(await filed(IN_OTHER)).toEqual([
+      {
+        bundlePath: `.nexus/archive/${OTHER}/Notes/Sub/${leafOf(bundlePath)}`,
+        id: PAGE_N,
+        trail: [OTHER],
+      },
+    ])
+  })
+
+  it('an archived Set restored to a destination in another Collection does the same', async () => {
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    const sub = await archive('Notes/Daily/Sub', 'set')
+    expect((await mutate({ op: 'restore', bundlePath: sub, destination: INTO_OTHER })).ok).toBe(
+      true,
+    )
+    expect(heldTreeOf(root)?.collections.find((c) => c.id === OTHER)?.sets[0]?.id).toBe(SUB)
+    expect(await filed(IN_OTHER)).toEqual([
+      {
+        bundlePath: `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`,
+        id: PAGE_N,
+        trail: [OTHER],
+      },
+    ])
+  })
+
+  it.each([
+    ['the Trash', 'delete'],
+    ['the Archive', 'archive'],
+  ] as const)('a carry that throws leaves a restored Set restored, from %s', async (_, op) => {
+    await archive('Notes/Daily/Sub/Note.md')
+    const stored = await bundled({ op, path: 'Notes/Daily/Sub', kind: 'set' })
+    vi.spyOn(bundles, 'archivedWithin').mockRejectedValue(new Error('unreadable'))
+    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
+    expect((await mutate({ op: 'restore', bundlePath: stored, destination: INTO_OTHER })).ok).toBe(
+      true,
+    )
+    expect(await readdir(at('Other', 'Sub'))).toContain('Kept.md')
+    expect(await pathExists(at(stored))).toBe(false)
+    expect(logged).toHaveBeenCalledWith('archive: the carry failed:', 'unreadable')
+  })
+})
+
+describe('the open pass — an orphaned Archive moves into the Trash, and a live one re-files', () => {
+  it('an Archive whose id names nothing anywhere moves into the Trash with each record whole', async () => {
+    const bundlePath = await seedArchived(ORPHAN)
+    const stored = await readFile(at(bundlePath, '_record.json'), 'utf8')
+    await settleArchives(root, await reread())
+    const [leaf, ...more] = await readdir(at('.trash', 'Gone'))
+    expect(more).toEqual([])
+    expect(leaf).toMatch(/__Orphan\.md\.deleted$/)
+    expect(leaf?.startsWith(STAMP)).toBe(false)
+    const swept = at('.trash', 'Gone', leaf ?? '')
+    expect(await readFile(join(swept, '_record.json'), 'utf8')).toBe(stored)
+    expect(await readRecord(swept)).not.toHaveProperty('archive')
+    expect(await readFile(join(swept, 'Orphan.md'), 'utf8')).toBe(
+      `---\nID: ${PAGE_G}\n---\norphan\n`,
+    )
+    expect(await pathExists(at('.nexus', 'archive', GONE))).toBe(false)
+  })
+
+  it('an Archive whose Collection sits in an excluded root folder is kept', async () => {
+    await mkdir(at('Private'))
+    await writeFile(at('Private', '_pagecollection.json'), JSON.stringify({ id: GONE }))
+    await writeFile(
+      at('.nexus', 'settings.json'),
+      JSON.stringify({ excluded_folders: ['Private'] }),
+    )
+    const bundlePath = await seedArchived(ORPHAN, 'Private')
+    const tree = await reread()
+    expect(tree.collections.some((c) => c.id === GONE)).toBe(false)
+    await settleArchives(root, tree)
+    expect(await pathExists(at(bundlePath, 'Orphan.md'))).toBe(true)
+    expect(await pathExists(at('.trash'))).toBe(false)
+  })
+
+  it('an Archive whose Collection folder was renamed hidden is kept', async () => {
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    await rename(at('Notes'), at('_Notes'))
+    await settleArchives(root, await reread())
+    expect(await pathExists(at(bundlePath, 'Note.md'))).toBe(true)
+    expect(await pathExists(at('.trash'))).toBe(false)
+  })
+
+  it('an Archive whose Collection sits in the Trash is kept', async () => {
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    await bundled({ op: 'delete', path: 'Notes', kind: 'collection' })
+    await settleArchives(root, await reread())
+    expect((await filed(IN_NOTES)).map((b) => b.bundlePath)).toEqual([bundlePath])
+  })
+
+  it('no Archive is taken for orphaned while a root folder’s sidecar reads unreadable', async () => {
+    await mkdir(at('Broken'))
+    await writeFile(at('Broken', '_pagecollection.json'), '{ not json')
+    const bundlePath = await seedArchived(ORPHAN)
+    const tree = await reread()
+    expect(tree.unreadable?.some((u) => u.kind === 'collection')).toBe(true)
+    await settleArchives(root, tree)
+    expect(await pathExists(at(bundlePath, 'Orphan.md'))).toBe(true)
+  })
+
+  it('a bundle that won’t parse stays as evidence, and its folder with it', async () => {
+    const bundlePath = await seedArchived(ORPHAN)
+    await writeFile(at(bundlePath, '_record.json'), '{ not json')
+    await settleArchives(root, await reread())
+    expect(await pathExists(at(bundlePath, 'Orphan.md'))).toBe(true)
+    expect(await pathExists(at('.trash', 'Gone'))).toBe(false)
+  })
+
+  it('a record whose origin now sits in another Collection is carried there under its own name, its trail rewritten', async () => {
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    await rename(at('Notes', 'Daily', 'Sub'), at('Other', 'Sub'))
+    await settleArchives(root, await reread())
+    expect(await pathExists(at(bundlePath))).toBe(false)
+    expect(await filed(IN_OTHER)).toEqual([
+      {
+        bundlePath: `.nexus/archive/${OTHER}/Notes/Daily/Sub/${leafOf(bundlePath)}`,
+        id: PAGE_N,
+        trail: [OTHER],
+      },
+    ])
+  })
+
+  it('a record whose origin the tree no longer holds stays', async () => {
+    const bundlePath = await archive('Notes/Daily/Sub/Note.md')
+    const stored = await readFile(at(bundlePath, '_record.json'), 'utf8')
+    await rm(at('Notes', 'Daily', 'Sub'), { recursive: true })
+    await settleArchives(root, await reread())
+    expect(await readFile(at(bundlePath, '_record.json'), 'utf8')).toBe(stored)
+    expect(await filed(IN_OTHER)).toEqual([])
+  })
+})
```

##### Core/Assets/assetMigrate.test.ts

```/Core/Assets/assetMigrate.test.ts diff
@@ -13 +13 @@ import { wikiTitle } from '../Connections/linkValue'
 import { splitFrontmatter } from '../Files/pageFile'
 import { contextsDir } from '../Paths/paths'
 import { SPACE_SIDECAR } from '../Paths/nexusPaths'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 
 const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
 
@@ -88 +88 @@ describe('migrateAssets', () => {
     expect(await pathExists(join(root, 'file-assets', 'Cover.png'))).toBe(true)
   })
 
+  it('rewrites the links in an archived Set’s sidecar and an archived page before the sweep trashes the legacy folder', async () => {
+    await asset('a/Cover.png', 'cover')
+    const bundles = '.nexus/archive/col-notes/Notes/2026-10-20T12-00-00-000Z'
+    const set = `${bundles}__Old.archived/Old`
+    const page = `${bundles}__Gone.md.archived`
+    await mkdir(join(root, set), { recursive: true })
+    await mkdir(join(root, page), { recursive: true })
+    await writeFile(
+      join(root, set, '_pageset.json'),
+      JSON.stringify({ id: 'old', banner: '.nexus/assets/a/Cover.png' }),
+    )
+    await writeFile(join(root, page, 'Gone.md'), '---\nbanner: "[[Cover.png]]"\n---\n\nbody')
+    const r = await migrateAssets(root, nexusDeps)
+    expect(r?.rewritten).toBe(2)
+    expect(r?.trashed).toBe(1)
+    expect((await readJson(`${set}/_pageset.json`)).banner).toBe('[[Cover.png]]')
+    expect(await pathExists(join(root, 'file-assets', 'Cover.png'))).toBe(true)
+  })
+
   it('holds the sweep when a store can’t be read', async () => {
     await asset('a/Cover.png', 'cover')
     await writeFile(join(root, 'Notes', '_pagecollection.json'), '{ not json')
```

##### Core/Bundles/browser.test.ts

```/Core/Bundles/browser.test.ts diff
@@ -0 +1 @@
+import { describe, expect, it } from 'vitest'
+import { filterRows, widestDate } from './browser'
+import { bundleRow as row } from '../Testing/fixtures'
+
+describe('filterRows', () => {
+  const rows = [
+    row({ title: 'Alpha', crumbs: [{ kind: 'collection', title: 'Notes' }] }),
+    row({ title: 'Beta', crumbs: [{ kind: 'collection', title: 'Journals' }] }),
+    row({ title: 'Gamma', crumbs: [] }),
+  ]
+
+  it('an empty query keeps the list whole and in the order it arrived', () => {
+    expect(filterRows(rows, '').map((r) => r.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
+    expect(filterRows(rows, '   ')).toBe(rows)
+  })
+
+  it('matches a title', () => {
+    expect(filterRows(rows, 'bet').map((r) => r.title)).toEqual(['Beta'])
+  })
+
+  it('matches a location, so a row is findable by where it lived', () => {
+    expect(filterRows(rows, 'journ').map((r) => r.title)).toEqual(['Beta'])
+  })
+
+  it('matches a location and a title together, a / reading as a word break', () => {
+    expect(filterRows(rows, 'notes/alpha').map((r) => r.title)).toEqual(['Alpha'])
+  })
+
+  it('a query nothing answers yields nothing', () => {
+    expect(filterRows(rows, 'zzz')).toEqual([])
+  })
+
+  it('a row with no location is still matched on its title alone', () => {
+    expect(filterRows(rows, 'gamma').map((r) => r.title)).toEqual(['Gamma'])
+  })
+
+  it('narrows in place, keeping the order it arrived in rather than ranking the best match first', () => {
+    const listed = [
+      row({ title: 'Notes Archive', crumbs: [] }),
+      row({ title: 'Notes', crumbs: [] }),
+    ]
+    expect(filterRows(listed, 'notes').map((r) => r.title)).toEqual(['Notes Archive', 'Notes'])
+  })
+})
+
+describe('widestDate', () => {
+  it('a style showing the weekday and the time runs September’s Wednesday the 30th at 12:00 PM', () => {
+    const sample = widestDate({ date_format: 'full', time_format: 'twelveHour', weekday: 'long' })
+    for (const part of ['Wednesday', 'September', '30th', '12:00 PM'])
+      expect(sample).toContain(part)
+  })
+
+  it('a style without them leaves the weekday and the time out', () => {
+    const sample = widestDate({ date_format: 'full', time_format: 'none', weekday: 'none' })
+    expect(sample).toContain('September 30th')
+    for (const part of ['Wednesday', '12:00']) expect(sample).not.toContain(part)
+  })
+
+  it('a relative style runs a week ago with its clock, else a year’s last month', () => {
+    expect(
+      widestDate({ date_format: 'relative', time_format: 'twelveHour', weekday: 'none' }),
+    ).toBe('7 Days Ago at 12:00 PM')
+    expect(widestDate({ date_format: 'relative', time_format: 'none', weekday: 'none' })).toBe(
+      '12 Months Ago',
+    )
+  })
+})
```

##### Core/Bundles/bundle.test.ts

```/Core/Bundles/bundle.test.ts diff
@@ -0 +1 @@
+import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { basename, dirname, join } from '../Paths/posix'
+import { tempRoot } from '../Testing/hostFs'
+import { layoutOf, listBundles, mintBundle, originPathOf, storeOf } from './bundle'
+import { writeRecord } from './record'
+
+const ID = '01J9Z8X7W6V5T4S3R2Q1P0N9M8'
+const TRASH = { kind: 'trash' } as const
+const ARCHIVE = { kind: 'archive', id: ID } as const
+const STAMPED = '2026-10-17T00-00-00-000Z'
+
+let root: string
+beforeEach(() => {
+  root = tempRoot('pom-bundle-')
+})
+afterEach(async () => {
+  await rm(root, { recursive: true, force: true })
+})
+
+describe('layoutOf', () => {
+  it('files the Trash under .trash and an Archive under its Collection’s id, each wearing its own suffix', () => {
+    expect(layoutOf(TRASH)).toEqual({ dir: '.trash', suffix: '.deleted' })
+    expect(layoutOf(ARCHIVE)).toEqual({ dir: `.nexus/archive/${ID}`, suffix: '.archived' })
+  })
+})
+
+describe('storeOf', () => {
+  it('answers the store a bundle sits in by its root and its suffix', () => {
+    expect(storeOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.deleted`)).toEqual(TRASH)
+    expect(storeOf('/n', `/n/.nexus/archive/${ID}/Notes/${STAMPED}__Alpha.md.archived`)).toEqual(
+      ARCHIVE,
+    )
+  })
+
+  it('answers null for a path neither store holds: an in-Nexus `.deleted`, a `.archived` outside `.nexus/archive`, the id folder itself, and either suffix under the other store', () => {
+    expect(storeOf('/n', '/n/Notes/fake.deleted')).toBeNull()
+    expect(storeOf('/n', '/n/Notes/fake.archived')).toBeNull()
+    expect(storeOf('/n', `/n/.nexus/archive/${ID}.archived`)).toBeNull()
+    expect(storeOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.archived`)).toBeNull()
+    expect(storeOf('/n', `/n/.nexus/archive/${ID}/${STAMPED}__Alpha.md.deleted`)).toBeNull()
+  })
+})
+
+describe('mintBundle', () => {
+  it('creates the bundle under the mirrored chain while the source stays live', async () => {
+    await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
+    const p = join(root, 'Notes', 'Daily', 'Beta.md')
+    await writeFile(p, 'bye')
+    const bundle = await mintBundle(root, TRASH, p)
+    expect(dirname(bundle)).toBe(join(root, '.trash', 'Notes', 'Daily'))
+    expect(basename(bundle).endsWith('__Beta.md.deleted')).toBe(true)
+    expect((await stat(bundle)).isDirectory()).toBe(true)
+    expect(await readFile(p, 'utf8')).toBe('bye')
+  })
+
+  it('de-collides within one timestamp — two mints never share a bundle', async () => {
+    vi.useFakeTimers()
+    vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'))
+    try {
+      const p = join(root, 'twice.md')
+      const first = await mintBundle(root, TRASH, p)
+      const second = await mintBundle(root, TRASH, p)
+      expect(second).not.toBe(first)
+      expect(basename(second)).toBe('2026-08-01T12-00-00-000Z__1__twice.md.deleted')
+    } finally {
+      vi.useRealTimers()
+    }
+  })
+
+  it('lands flat when the source is not under the root', async () => {
+    const outside = tempRoot('pom-out-')
+    try {
+      const bundle = await mintBundle(root, TRASH, join(outside, 'Stray.md'))
+      expect(dirname(bundle)).toBe(join(root, '.trash'))
+    } finally {
+      await rm(outside, { recursive: true, force: true })
+    }
+  })
+
+  it('mirrors the chain under an Archive with its suffix', async () => {
+    await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
+    const bundle = await mintBundle(root, ARCHIVE, join(root, 'Notes', 'Daily', 'Beta.md'))
+    expect(dirname(bundle)).toBe(join(root, '.nexus', 'archive', ID, 'Notes', 'Daily'))
+    expect(basename(bundle).endsWith('__Beta.md.archived')).toBe(true)
+    expect((await stat(bundle)).isDirectory()).toBe(true)
+  })
+})
+
+describe('originPathOf', () => {
+  it('reads a bundled file’s origin from the chain and the artifact’s own tree', () => {
+    const page = `/n/.trash/Studio/Pommora/${STAMPED}__ClaudeMD.md.deleted`
+    expect(originPathOf('/n', TRASH, `${page}/ClaudeMD.md`)).toBe('Studio/Pommora/ClaudeMD.md')
+    const set = `/n/.trash/Coll/${STAMPED}__Set.deleted`
+    expect(originPathOf('/n', TRASH, `${set}/Set/X.md`)).toBe('Coll/Set/X.md')
+  })
+
+  it('reads an archived file under its Archive’s root the same way', () => {
+    const set = `/n/.nexus/archive/${ID}/Coll/${STAMPED}__Set.archived`
+    expect(originPathOf('/n', ARCHIVE, `${set}/Set/Sub/X.md`)).toBe('Coll/Set/Sub/X.md')
+  })
+
+  it('keeps a chain or artifact folder that wears the suffix, finding the bundle by its stamp', () => {
+    const bundle = `/n/.trash/Archive.deleted/${STAMPED}__Notes.deleted`
+    expect(originPathOf('/n', TRASH, `${bundle}/Notes/Old.deleted/X.md`)).toBe(
+      'Archive.deleted/Notes/Old.deleted/X.md',
+    )
+  })
+
+  it('a bundle wearing no stamp keeps its folder in the origin path', () => {
+    expect(originPathOf('/n', TRASH, '/n/.trash/Notes/Alpha.md.deleted/Alpha.md')).toBe(
+      'Notes/Alpha.md.deleted/Alpha.md',
+    )
+  })
+})
+
+describe('listBundles', () => {
+  it('lists an Archive’s bundles under its own root and suffix, and none of the Trash’s', async () => {
+    const seed = async (store: typeof TRASH | typeof ARCHIVE, name: string): Promise<void> => {
+      const bundle = await mintBundle(root, store, join(root, 'Notes', name))
+      await writeFile(join(bundle, name), 'body')
+      await writeRecord(bundle, { entity: 'page', parent: { kind: 'container', id: 'col' } })
+    }
+    await seed(ARCHIVE, 'Alpha.md')
+    await seed(TRASH, 'Beta.md')
+    expect((await listBundles(root, ARCHIVE)).map((b) => b.artifactName)).toEqual(['Alpha.md'])
+    expect((await listBundles(root, TRASH)).map((b) => b.artifactName)).toEqual(['Beta.md'])
+  })
+})
```

##### Core/Bundles/handlers.test.ts

```/Core/Bundles/handlers.test.ts diff
@@ -0 +1 @@
+import { mkdir, writeFile } from 'node:fs/promises'
+import { join } from '../Paths/posix'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import type { HostContext } from '../Contract/handlers'
+import { fault } from '../Contract/result'
+import { dropLiveTree } from '../Nexus/liveTree'
+import { tempRoot } from '../Testing/hostFs'
+import { writePropertyBundle } from '../Properties/deleteProperty'
+import { mintBundle } from './bundle'
+import { writeRecord } from './record'
+
+const { sessionRoot } = vi.hoisted(() => ({ sessionRoot: vi.fn() }))
+vi.mock('../Nexus/session', () => ({ sessionRoot, adopting: () => false }))
+
+const { bundlesHandlers } = await import('./handlers')
+
+const ctx = {} as HostContext
+let root = ''
+
+beforeEach(async () => {
+  root = tempRoot('bundle-handlers-')
+  await mkdir(join(root, '.nexus'), { recursive: true })
+  await writeFile(
+    join(root, '.nexus', 'nexus.json'),
+    JSON.stringify({ id: 'nx', createdAt: '2026' }),
+  )
+  sessionRoot.mockReturnValue(root)
+})
+
+afterEach(() => {
+  sessionRoot.mockReset()
+  dropLiveTree()
+})
+
+describe('bundles:list', () => {
+  it('lists the Trash’s rows for the trash store', async () => {
+    await writePropertyBundle(root, {
+      entity: 'property',
+      id: 'prop_x',
+      def: { id: 'prop_x', label: 'Stage', key: 'Stage' },
+      values: {},
+    })
+    const listed = await bundlesHandlers['bundles:list'](ctx, { kind: 'trash' })
+    expect(listed.ok && listed.value.map((r) => [r.kind, r.title])).toEqual([['property', 'Stage']])
+  })
+
+  it('lists an Archive whose Collection id isn’t ULID-shaped', async () => {
+    const store = { kind: 'archive', id: 'col-foreign' } as const
+    const bundle = await mintBundle(root, store, join(root, 'Notes', 'Alpha.md'))
+    await writeFile(join(bundle, 'Alpha.md'), '# Alpha\n')
+    await writeRecord(bundle, { entity: 'page', parent: { kind: 'unaddressable' } })
+    const listed = await bundlesHandlers['bundles:list'](ctx, store)
+    expect(listed.ok && listed.value.map((r) => [r.kind, r.title])).toEqual([['page', 'Alpha']])
+  })
+
+  it('refuses an archive id that isn’t one safe path segment', async () => {
+    for (const id of ['../x', 'a/b', '..', ''])
+      expect(await bundlesHandlers['bundles:list'](ctx, { kind: 'archive', id })).toEqual(
+        fault('A store is required.'),
+      )
+  })
+
+  it('listed within a top-level Set, a Collection’s Archive holds only what left from within it', async () => {
+    for (const [dir, id] of [
+      ['Notes/Daily/Morning', 'set-morning'],
+      ['Notes/Weekly', 'set-weekly'],
+    ])
+      await mkdir(join(root, dir), { recursive: true }).then(() =>
+        writeFile(join(root, dir, '_pageset.json'), JSON.stringify({ id })),
+      )
+    await writeFile(
+      join(root, 'Notes', 'Daily', '_pageset.json'),
+      JSON.stringify({ id: 'set-daily' }),
+    )
+    await writeFile(
+      join(root, 'Notes', '_pagecollection.json'),
+      JSON.stringify({ id: 'col-notes' }),
+    )
+    const store = { kind: 'archive', id: 'col-notes' } as const
+    const archived = async (from: string, title: string, parent: string, trail?: string[]) => {
+      const bundle = await mintBundle(root, store, join(root, from, `${title}.md`))
+      await writeFile(join(bundle, `${title}.md`), `# ${title}\n`)
+      await writeRecord(bundle, {
+        entity: 'page',
+        parent: { kind: 'container', id: parent },
+        ...(trail ? { trail } : {}),
+      })
+    }
+    await archived('Notes/Daily/Morning', 'Held', 'set-morning')
+    await archived('Notes/Daily/Evening', 'Stored', 'set-evening', ['col-notes', 'set-daily'])
+    await archived('Notes/Weekly', 'Elsewhere', 'set-weekly', ['col-notes'])
+    const listed = await bundlesHandlers['bundles:list'](ctx, store, 'set-daily')
+    expect(listed.ok && listed.value.map((r) => r.title).sort()).toEqual(['Held', 'Stored'])
+  })
+
+  it('refuses a `within` that isn’t a string', async () => {
+    expect(
+      await bundlesHandlers['bundles:list'](ctx, { kind: 'archive', id: 'col-notes' }, 7),
+    ).toEqual(fault('Invalid Set id.'))
+  })
+
+  it('refuses a `within` on the Trash, which holds no Set’s place', async () => {
+    expect(await bundlesHandlers['bundles:list'](ctx, { kind: 'trash' }, 'set-daily')).toEqual(
+      fault('Only an Archive lists within a Set.'),
+    )
+  })
+
+  it('refuses a store it can’t read', async () => {
+    for (const store of [null, { kind: 'shelf' }, { kind: 'archive' }])
+      expect(await bundlesHandlers['bundles:list'](ctx, store)).toEqual(
+        fault('A store is required.'),
+      )
+  })
+})
```

##### Core/Bundles/placement.test.ts

```/Core/Bundles/placement.test.ts diff
@@ -0 +1 @@
+import { afterEach, beforeEach, describe, expect, it } from 'vitest'
+import { mkdir, rm, writeFile } from 'node:fs/promises'
+import { dirname, join } from '../Paths/posix'
+import { readJsonAt, tempRoot } from '../Testing/hostFs'
+import { placeRecord, resolveRecord, slotOf } from './placement'
+import { nexusPages } from '../Nexus/heldPages'
+import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
+
+const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
+
+const P = (over: Partial<import('../Nexus/tree').PageNode> = {}) =>
+  ({
+    kind: 'page',
+    id: 'page-x',
+    title: 'X',
+    path: 'Notes/X.md',
+    ...over,
+  }) as import('../Nexus/tree').PageNode
+const treeOf = (
+  contexts: import('../Nexus/tree').ContextGroup[],
+  collections: Partial<import('../Nexus/tree').CollectionNode>[],
+) =>
+  ({
+    contexts,
+    collections,
+    config: { excluded: [], assetDirectory: ASSETS_DIR_REL },
+  }) as unknown as import('../Nexus/tree').NexusTree
+
+const journal = (over: Partial<import('../Nexus/tree').SetNode> = {}) =>
+  ({
+    kind: 'set',
+    id: 'set-daily',
+    title: 'Journal',
+    path: 'Notes/Journal',
+    pages: [],
+    sets: [],
+    ...over,
+  }) as import('../Nexus/tree').SetNode
+
+const notes = (
+  sets: import('../Nexus/tree').SetNode[] = [journal()],
+  pages: import('../Nexus/tree').PageNode[] = [],
+) => ({
+  kind: 'collection' as const,
+  id: 'col-notes',
+  title: 'Notes',
+  path: 'Notes',
+  sets,
+  pages,
+})
+
+let root: string
+beforeEach(async () => {
+  root = tempRoot('pom-place-')
+  await mkdir(join(root, 'Notes', 'Journal'), { recursive: true })
+  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'col-notes' }))
+  await writeFile(
+    join(root, 'Notes', 'Journal', '_pageset.json'),
+    JSON.stringify({ id: 'set-daily' }),
+  )
+})
+afterEach(async () => {
+  await rm(root, { recursive: true, force: true })
+})
+
+const byIdOf = async (tree: import('../Nexus/tree').NexusTree) =>
+  (await nexusPages(root, tree)).byId
+
+const RESTORING = '.trash/2026-10-20T12-00-00-000Z__Alpha.md.deleted'
+const bundleAt = (name: string) => ({
+  abs: join(root, RESTORING),
+  artifact: join(root, RESTORING, name),
+})
+
+const pageRecord = {
+  entity: 'page' as const,
+  id: PAGE_A,
+  parent: { kind: 'container' as const, id: 'set-daily' },
+}
+
+describe('resolveRecord — a placement with final names, or a typed refusal', () => {
+  it('places a page into its parent container at the container’s CURRENT path', async () => {
+    const tree = treeOf([], [notes()])
+    const r = resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)
+    expect('place' in r && r.place).toEqual({
+      dir: 'Notes/Journal',
+      finalName: 'Alpha.md',
+      finalTitle: 'Alpha',
+    })
+  })
+
+  it('disambiguates a taken title, matching the create convention', async () => {
+    const taken = journal({
+      pages: [P({ id: 'page-o', title: 'Alpha', path: 'Notes/Journal/Alpha.md' })],
+    })
+    const tree = treeOf([], [notes([taken])])
+    const r = resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)
+    expect('place' in r && r.place).toEqual({
+      dir: 'Notes/Journal',
+      finalName: 'Alpha (2).md',
+      finalTitle: 'Alpha (2)',
+    })
+  })
+
+  it('a set title also blocks a page name — one folder cannot hold both', async () => {
+    const inner = journal({
+      sets: [journal({ id: 'set-inner', title: 'Alpha', path: 'Notes/Journal/Alpha' })],
+    })
+    const tree = treeOf([], [notes([inner])])
+    const r = resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)
+    expect('place' in r && r.place).toEqual({
+      dir: 'Notes/Journal',
+      finalName: 'Alpha (2).md',
+      finalTitle: 'Alpha (2)',
+    })
+  })
+
+  it('refuses when the parent is gone — a still-trashed parent is the same answer', async () => {
+    const tree = treeOf([], [notes([])])
+    expect(resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)).toEqual({
+      refuse: 'parent-gone',
+    })
+  })
+
+  it('refuses when the parent id resolves to a kind that cannot hold this one', async () => {
+    const tree = treeOf(
+      [
+        {
+          def: { id: 'ctx_a', title: 'Areas' },
+          spaces: [
+            {
+              kind: 'space',
+              id: 'set-daily',
+              title: 'S',
+              path: '.nexus/contexts/Areas/S',
+              contextId: 'ctx_a',
+            } as import('../Nexus/tree').SpaceNode,
+          ],
+        },
+      ],
+      [notes([])],
+    )
+    expect(resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)).toEqual({
+      refuse: 'cannot-hold',
+    })
+  })
+
+  it('a live id refuses, and it outranks every other answer', async () => {
+    const tree = treeOf(
+      [],
+      [notes([], [P({ id: PAGE_A, title: 'Elsewhere', path: 'Notes/Elsewhere.md' })])],
+    )
+    expect(resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)).toEqual({
+      refuse: 'id-live',
+    })
+  })
+
+  it('an id the Archive holds refuses as live', async () => {
+    const file = join(root, '.nexus/archive/c1/Notes/2026-10-20T12-00-00-000Z__A.md.archived/A.md')
+    await mkdir(dirname(file), { recursive: true })
+    await writeFile(file, `---\nID: ${PAGE_A}\n---\nb\n`)
+    const tree = treeOf([], [notes()])
+    expect(resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), RESTORING)).toEqual({
+      refuse: 'id-live',
+    })
+  })
+
+  it('an id held only inside the restoring bundle isn’t live; one held anywhere else, or twice, is', async () => {
+    const bundle = (n: number): string =>
+      `.nexus/archive/c1/Notes/2026-10-20T12-00-0${n}-000Z__Alpha.md.archived`
+    const seed = async (n: number): Promise<void> => {
+      await mkdir(join(root, bundle(n)), { recursive: true })
+      await writeFile(join(root, bundle(n), 'Alpha.md'), `---\nID: ${PAGE_A}\n---\nb\n`)
+    }
+    const tree = treeOf([], [notes()])
+    await seed(1)
+    const once = await byIdOf(tree)
+    expect('place' in resolveRecord(pageRecord, 'Alpha.md', tree, once, bundle(1))).toBe(true)
+    expect(resolveRecord(pageRecord, 'Alpha.md', tree, once, bundle(2))).toEqual({
+      refuse: 'id-live',
+    })
+    await seed(2)
+    expect(resolveRecord(pageRecord, 'Alpha.md', tree, await byIdOf(tree), bundle(1))).toEqual({
+      refuse: 'id-live',
+    })
+  })
+
+  it('an unaddressable parent refuses', async () => {
+    const record = {
+      entity: 'page' as const,
+      id: PAGE_A,
+      parent: { kind: 'unaddressable' as const },
+    }
+    const tree = treeOf([], [notes()])
+    expect(resolveRecord(record, 'Alpha.md', tree, await byIdOf(tree), RESTORING)).toEqual({
+      refuse: 'unaddressable',
+    })
+  })
+
+  it('a collection returns to the root, disambiguated against its siblings', async () => {
+    const record = {
+      entity: 'collection' as const,
+      id: 'col-back',
+      parent: { kind: 'root' as const },
+    }
+    const tree = treeOf([], [notes()])
+    const r = resolveRecord(record, 'Notes', tree, await byIdOf(tree), RESTORING)
+    expect('place' in r && r.place).toEqual({ dir: '', finalName: 'Notes (2)' })
+  })
+
+  it('a Space follows its Context to the Context’s CURRENT title, colliding titles disambiguated', async () => {
+    const tree = treeOf(
+      [
+        {
+          def: { id: 'ctx_projects', title: 'Ventures' },
+          spaces: [
+            {
+              kind: 'space',
+              id: 'sp-other',
+              title: 'Pommora',
+              path: '.nexus/contexts/Ventures/Pommora',
+              contextId: 'ctx_projects',
+            } as import('../Nexus/tree').SpaceNode,
+          ],
+        },
+      ],
+      [],
+    )
+    const record = {
+      entity: 'space' as const,
+      id: 'sp-pom',
+      parent: { kind: 'context' as const, id: 'ctx_projects' },
+      members: [],
+    }
+    const r = resolveRecord(record, 'Pommora', tree, await byIdOf(tree), RESTORING)
+    expect('place' in r && r.place).toEqual({
+      dir: '.nexus/contexts/Ventures',
+      finalName: 'Pommora (2)',
+      finalTitle: 'Pommora (2)',
+    })
+  })
+
+  it('a Context re-enters the registry under a disambiguated final title', async () => {
+    const tree = treeOf([{ def: { id: 'ctx_new', title: 'Projects' }, spaces: [] }], [])
+    const record = {
+      entity: 'context' as const,
+      registry: { id: 'ctx_projects', title: 'Projects' },
+      membership: [],
+    }
+    const r = resolveRecord(record, 'Projects', tree, await byIdOf(tree), RESTORING)
+    expect('place' in r && r.place).toEqual({
+      dir: '.nexus/contexts',
+      finalName: 'Projects (2)',
+      finalTitle: 'Projects (2)',
+    })
+  })
+
+  it('a Context whose registry id is already live refuses', async () => {
+    const tree = treeOf([{ def: { id: 'ctx_projects', title: 'Elsewhere' }, spaces: [] }], [])
+    const record = {
+      entity: 'context' as const,
+      registry: { id: 'ctx_projects', title: 'Projects' },
+      membership: [],
+    }
+    expect(resolveRecord(record, 'Projects', tree, await byIdOf(tree), RESTORING)).toEqual({
+      refuse: 'id-live',
+    })
+  })
+})
+
+describe('slotOf', () => {
+  it('lands above the sibling it sat above while that one is live', () => {
+    expect(slotOf({ above: 'b', below: 'a' }, ['a', 'b'])).toEqual({ anchor: 'b', where: 'above' })
+  })
+
+  it('lands below the sibling it sat below once the one after it is gone', () => {
+    expect(slotOf({ above: 'gone', below: 'a' }, ['a', 'b'])).toEqual({
+      anchor: 'a',
+      where: 'below',
+    })
+  })
+
+  it('lands first when nothing preceded it and its follower is gone', () => {
+    expect(slotOf({ above: 'gone' }, ['a', 'b'])).toEqual({ anchor: null, where: 'first' })
+  })
+
+  it('lands last when neither neighbour is live, or the record holds no place', () => {
+    expect(slotOf({ above: 'gone', below: 'lost' }, ['a'])).toEqual({ anchor: null, where: 'last' })
+    expect(slotOf(undefined, ['a'])).toEqual({ anchor: null, where: 'last' })
+  })
+})
+
+describe('placeRecord', () => {
+  const siblings = [
+    P({ id: 'page-1', title: 'One', path: 'Notes/Journal/One.md' }),
+    P({ id: 'page-2', title: 'Two', path: 'Notes/Journal/Two.md' }),
+  ]
+
+  it('composes the parent’s full order with the item in its slot', async () => {
+    const tree = treeOf([], [notes([journal({ pages: siblings })])])
+    const record = { ...pageRecord, place: { above: 'page-2', below: 'page-1' } }
+    const placed = await placeRecord(
+      root,
+      record,
+      undefined,
+      bundleAt('Alpha.md'),
+      tree,
+      await byIdOf(tree),
+    )
+    if (!placed.ok) throw new Error('placement refused')
+    expect(placed.value.placement.dir).toBe('Notes/Journal')
+    await placed.value.writeOrder?.()
+    expect((await readJsonAt(join(root, 'Notes', 'Journal', '_pageset.json'))).page_order).toEqual([
+      'page-1',
+      PAGE_A,
+      'page-2',
+    ])
+  })
+
+  it('a picked destination drops the place and lands last', async () => {
+    const tree = treeOf([], [notes([journal()], siblings)])
+    const record = { ...pageRecord, place: { above: 'page-1' } }
+    const placed = await placeRecord(
+      root,
+      record,
+      { kind: 'container', id: 'col-notes' },
+      bundleAt('Alpha.md'),
+      tree,
+      await byIdOf(tree),
+    )
+    if (!placed.ok) throw new Error('placement refused')
+    expect(placed.value.record).toMatchObject({ place: undefined })
+    await placed.value.writeOrder?.()
+    expect((await readJsonAt(join(root, 'Notes', '_pagecollection.json'))).page_order).toEqual([
+      'page-1',
+      'page-2',
+      PAGE_A,
+    ])
+  })
+
+  const setRecord = {
+    entity: 'set' as const,
+    id: 'set-back',
+    parent: { kind: 'container' as const, id: 'col-notes' },
+  }
+
+  it('lands at the tree’s placement when the disk holds nothing there, answering no landedAs', async () => {
+    const tree = treeOf([], [notes()])
+    const placed = await placeRecord(
+      root,
+      pageRecord,
+      undefined,
+      bundleAt('Alpha.md'),
+      tree,
+      await byIdOf(tree),
+    )
+    if (!placed.ok) throw new Error('placement refused')
+    expect(placed.value.placement).toEqual({
+      dir: 'Notes/Journal',
+      finalName: 'Alpha.md',
+      finalTitle: 'Alpha',
+    })
+    expect(placed.value.landedAs).toBeUndefined()
+  })
+
+  it('steps a page past a file of its name, answering the title it took', async () => {
+    await writeFile(join(root, 'Notes', 'Journal', 'Alpha.md'), 'outside')
+    const tree = treeOf([], [notes()])
+    const placed = await placeRecord(
+      root,
+      pageRecord,
+      undefined,
+      bundleAt('Alpha.md'),
+      tree,
+      await byIdOf(tree),
+    )
+    if (!placed.ok) throw new Error('placement refused')
+    expect(placed.value.placement).toEqual({
+      dir: 'Notes/Journal',
+      finalName: 'Alpha (2).md',
+      finalTitle: 'Alpha (2)',
+    })
+    expect(placed.value.landedAs).toBe('Alpha (2)')
+  })
+
+  it('steps a Set past an excluded entry with no folder on disk', async () => {
+    await mkdir(join(root, '.nexus'), { recursive: true })
+    await writeFile(
+      join(root, '.nexus', 'settings.json'),
+      JSON.stringify({ excluded_folders: ['Notes/Daily'] }),
+    )
+    const tree = treeOf([], [notes()])
+    const placed = await placeRecord(
+      root,
+      setRecord,
+      undefined,
+      bundleAt('Daily'),
+      tree,
+      await byIdOf(tree),
+    )
+    if (!placed.ok) throw new Error('placement refused')
+    expect(placed.value.placement).toEqual({ dir: 'Notes', finalName: 'Daily (2)' })
+    expect(placed.value.landedAs).toBe('Daily (2)')
+  })
+
+  it('steps a page past a file of its name alone, and a Set past a folder of its name alone, leaving a namesake of the other form beside it', async () => {
+    await mkdir(join(root, 'Notes', 'Journal', 'Alpha'))
+    await writeFile(join(root, 'Notes', 'Daily.md'), 'outside')
+    const tree = treeOf([], [notes()])
+    const page = await placeRecord(
+      root,
+      pageRecord,
+      undefined,
+      bundleAt('Alpha.md'),
+      tree,
+      await byIdOf(tree),
+    )
+    const set = await placeRecord(
+      root,
+      setRecord,
+      undefined,
+      bundleAt('Daily'),
+      tree,
+      await byIdOf(tree),
+    )
+    expect(page.ok && page.value.placement.finalName).toBe('Alpha.md')
+    expect(page.ok && page.value.landedAs).toBeUndefined()
+    expect(set.ok && set.value.placement.finalName).toBe('Daily')
+    expect(set.ok && set.value.landedAs).toBeUndefined()
+  })
+
+  it('writes a Space’s order under its own Context when another Context shares its title', async () => {
+    const group = (id: string) => ({ def: { id, title: 'Areas' }, spaces: [] })
+    const tree = treeOf([group('ctx_a'), group('ctx_b')], [])
+    const record = {
+      entity: 'space' as const,
+      id: 'sp-back',
+      parent: { kind: 'context' as const, id: 'ctx_b' },
+      members: [],
+    }
+    const placed = await placeRecord(
+      root,
+      record,
+      undefined,
+      bundleAt('Pommora'),
+      tree,
+      await byIdOf(tree),
+    )
+    if (!placed.ok) throw new Error('placement refused')
+    await placed.value.writeOrder?.()
+    expect((await readJsonAt(join(root, '.nexus', 'state.json'))).order).toEqual({
+      spaces: { ctx_b: ['sp-back'] },
+    })
+  })
+
+  it('answers no landedAs for a Context whose registry title differs from its folder’s name only by case', async () => {
+    const record = {
+      entity: 'context' as const,
+      registry: { id: 'ctx_projects', title: 'Projects' },
+      membership: [],
+    }
+    const tree = treeOf([], [])
+    const placed = await placeRecord(
+      root,
+      record,
+      undefined,
+      bundleAt('projects'),
+      tree,
+      await byIdOf(tree),
+    )
+    if (!placed.ok) throw new Error('placement refused')
+    expect(placed.value.placement.finalTitle).toBe('Projects')
+    expect(placed.value.landedAs).toBeUndefined()
+  })
+})
```

##### Core/Bundles/rows.test.ts

```/Core/Bundles/rows.test.ts diff
@@ -5 +5 @@ import { afterEach, beforeEach, describe, expect, it } from 'vitest'
 import { dropLiveTree } from '../Nexus/liveTree'
 import type { MutateReply } from '../Nexus/mutateRequest'
 import type { NexusTree } from '../Nexus/tree'
-import type { TrashRow } from './trashRow'
+import type { BundleRow } from './rows'
 import { settledMutate } from '../Testing/settledMutate'
 import { contextsDir, contextsRegistryFile } from '../Paths/paths'
-import { writePropertyBundle } from './record'
-import { deletedPathOf } from './bundle'
-import { listBundles } from './holdings'
+import { writePropertyBundle } from '../Properties/deleteProperty'
+import { listBundles } from './bundle'
 import { readNexus } from '../Nexus/readNexus'
+import { nexusPages } from '../Nexus/heldPages'
 import { closeSession, openSession } from '../Nexus/session'
-import { trashRowOf, trashRows } from './trashRows'
-import type { TrashDeps } from './bundle'
+import { bundleRowOf, bundleRows } from './rows'
+import type { TrashDeps } from '../Trash/discard'
 
 const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
+const ARCHIVE_ID = '01KVGMT8BFP350FZZXAMG1QDVB'
 const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
 
 let root: string
 
-const rows = async (): Promise<TrashRow[]> =>
-  trashRows(await listBundles(root), await readNexus(root))
+const rows = async (): Promise<BundleRow[]> => {
+  const tree = await readNexus(root)
+  const { byId } = await nexusPages(root, tree)
+  return bundleRows(await listBundles(root, { kind: 'trash' }), { kind: 'trash' }, tree, byId)
+}
 const del = (
   path: string,
   kind: 'page' | 'collection' | 'set' | 'space' | 'context',
@@ -61 +65 @@ afterEach(async () => {
   await rm(root, { recursive: true, force: true })
 })
 
-describe('trashRows — a bundle as the browser reads it', () => {
+describe('bundleRows — a bundle as the browser reads it', () => {
   it('a page keeps its title without the extension, and its live container chain', async () => {
     await del('Notes/Daily/Alpha.md', 'page')
     const [row] = await rows()
@@ -129 +133 @@ describe('trashRows — a bundle as the browser reads it', () => {
     })
     // Nothing climbs: the page is never re-homed into the Set's own Collection.
     expect(page?.crumbs.every((c) => c.kind === undefined)).toBe(true)
+    const archived = bundleRowOf(
+      {
+        bundlePath: `.nexus/archive/${ARCHIVE_ID}/Notes/Daily/2026-10-20T00-00-00-000Z__Alpha.md.archived`,
+        artifactName: 'Alpha.md',
+        record: { entity: 'page', id: PAGE_A, parent: { kind: 'container', id: 'set-daily' } },
+      },
+      { kind: 'archive', id: ARCHIVE_ID },
+      await readNexus(root),
+      new Map(),
+    )
+    expect(archived).toMatchObject({
+      historical: true,
+      crumbs: [{ title: 'Notes' }, { title: 'Daily' }],
+    })
   })
 
   it('a Space whose Context is gone reads its location, not the folders it was kept in', async () => {
@@ -149 +167 @@ describe('trashRows — a bundle as the browser reads it', () => {
     await del('Notes/Daily/Alpha.md', 'page')
     const property = (await rows()).find((r) => r.kind === 'property')
     expect(property).toMatchObject({ title: 'Stage', crumbs: [], homeResolves: true })
-    expect(property?.deletedAt).toEqual(expect.any(Number))
+    expect(property?.storedAt).toEqual(expect.any(Number))
   })
 
-  it('a property record with no readable name lists under its id', () => {
+  it('a property record with no readable name lists under its id', async () => {
     expect(
-      trashRowOf(
+      bundleRowOf(
         {
           bundlePath: '.trash/s__property-prop_x.deleted',
           record: { entity: 'property', id: 'prop_x', def: { id: 'prop_x' }, values: {} },
         },
+        { kind: 'trash' },
         { collections: [], contexts: [] } as unknown as NexusTree,
+        new Map(),
       )?.title,
     ).toBe('prop_x')
   })
@@ -171 +191 @@ describe('trashRows — a bundle as the browser reads it', () => {
     const listed = await rows()
     expect(listed.map((r) => r.kind)).toEqual(['set', 'page'])
     const [newest, oldest] = listed
-    expect(newest.deletedAt).not.toBeNull()
-    expect(newest.deletedAt).toBeGreaterThanOrEqual(oldest.deletedAt as number)
-    expect(Math.abs(Date.now() - (newest.deletedAt as number))).toBeLessThan(60_000)
+    expect(newest.storedAt).not.toBeNull()
+    expect(newest.storedAt).toBeGreaterThanOrEqual(oldest.storedAt as number)
+    expect(Math.abs(Date.now() - (newest.storedAt as number))).toBeLessThan(60_000)
   })
 
   it('a hand-made bundle name still lists, dateless, and sorts last', async () => {
     await del('Notes/Daily/Alpha.md', 'page')
     await del('Notes/Daily', 'set')
-    const stamped = (await listBundles(root)).find((b) => b.artifactName === 'Alpha.md')
+    const stamped = (await listBundles(root, { kind: 'trash' })).find(
+      (b) => b.artifactName === 'Alpha.md',
+    )
     const handMade = (stamped as { bundlePath: string }).bundlePath.replace(
       /[^/]+$/,
       'Alpha.md.deleted',
     )
     await rename(join(root, (stamped as { bundlePath: string }).bundlePath), join(root, handMade))
     const listed = await rows()
-    expect(listed.find((r) => r.kind === 'page')).toMatchObject({ title: 'Alpha', deletedAt: null })
+    expect(listed.find((r) => r.kind === 'page')).toMatchObject({ title: 'Alpha', storedAt: null })
     expect(listed.at(-1)?.kind).toBe('page')
   })
 
-  it('a record carrying no id still shapes a row', () => {
-    const row = trashRowOf(
+  it('a record carrying no id still shapes a row', async () => {
+    const row = bundleRowOf(
       {
         bundlePath: '.trash/Notes/s__Alpha.md.deleted',
         artifactName: 'Alpha.md',
         record: { entity: 'page', parent: { kind: 'container', id: 'set-daily' } },
       },
+      { kind: 'trash' },
       { collections: [], contexts: [] } as unknown as NexusTree,
+      new Map(),
     )
     expect(row).toMatchObject({ kind: 'page', title: 'Alpha', historical: true })
   })
+
+  it('a page row carries the metadata’s icon and its stored id and path, and a Set row its sidecar’s icon', async () => {
+    const bundlePath = '.trash/Notes/Daily/s__Alpha.md.deleted'
+    const page = bundleRowOf(
+      {
+        bundlePath,
+        artifactName: 'Alpha.md',
+        record: { entity: 'page', id: PAGE_A, parent: { kind: 'container', id: 'set-daily' } },
+      },
+      { kind: 'trash' },
+      {
+        collections: [],
+        contexts: [],
+        config: { pageMetadata: { [PAGE_A]: { icon: 'hash' } } },
+      } as unknown as NexusTree,
+      new Map(),
+    )
+    expect(page).toMatchObject({
+      icon: 'hash',
+      stored: { id: PAGE_A, path: `${bundlePath}/Alpha.md` },
+    })
+    await writeFile(
+      join(root, 'Notes', 'Daily', '_pageset.json'),
+      JSON.stringify({ id: 'set-daily', icon: 'folder-heart' }),
+    )
+    await del('Notes/Daily', 'set')
+    const [set] = await rows()
+    expect(set).toMatchObject({
+      kind: 'set',
+      icon: 'folder-heart',
+      stored: { id: 'set-daily', path: `${set.bundlePath}/Daily` },
+    })
+  })
+})
+
+describe('bundleRows — a container’s and a Space’s own icons', () => {
+  it('a Collection row and a Space row carry their sidecars’ icons, and a row with none carries no icon', async () => {
+    await writeFile(
+      join(root, 'Notes', '_pagecollection.json'),
+      JSON.stringify({ id: 'col-notes', icon: 'book' }),
+    )
+    await writeFile(
+      join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
+      JSON.stringify({ id: 'sp-pom', icon: 'rocket' }),
+    )
+    await del('Notes/Daily/Alpha.md', 'page')
+    await del('Notes', 'collection')
+    await del('.nexus/contexts/Projects/Pommora', 'space')
+    const byKind = Object.fromEntries((await rows()).map((r) => [r.kind, r]))
+    expect(byKind.collection.icon).toBe('book')
+    expect(byKind.space.icon).toBe('rocket')
+    expect('icon' in byKind.page).toBe(false)
+  })
+  it('an archived Set’s row carries the icon its sidecar held, read from its record alone', async () => {
+    await writeFile(
+      join(root, 'Notes', 'Daily', '_pageset.json'),
+      JSON.stringify({ id: 'set-daily', icon: 'folder-heart' }),
+    )
+    const archived = await settledMutate(
+      root,
+      { op: 'archive', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    const bundlePath = archived.ok ? (archived.value.bundled?.bundlePath ?? '') : ''
+    await rm(join(root, bundlePath, 'Daily', '_pageset.json'))
+    const store = { kind: 'archive' as const, id: 'col-notes' }
+    const tree = await readNexus(root)
+    const [set] = bundleRows(await listBundles(root, store), store, tree, new Map())
+    expect(set).toMatchObject({ kind: 'set', icon: 'folder-heart' })
+  })
 })
 
-describe('trashRows — `homeResolves` agrees with the resolver', () => {
+describe('bundleRows — `homeResolves` agrees with the resolver', () => {
   it('a row it calls resolvable restores with no destination asked for', async () => {
     await del('Notes/Daily/Alpha.md', 'page')
     const [row] = await rows()
@@ -220 +314 @@ describe('trashRows — `homeResolves` agrees with the resolver', () => {
   it('a row it calls homeless refuses the plain restore, which is why it must be asked', async () => {
     await del('Notes/Daily/Alpha.md', 'page')
     await del('Notes/Daily', 'set')
-    const page = (await rows()).find((r) => r.kind === 'page') as TrashRow
+    const page = (await rows()).find((r) => r.kind === 'page') as BundleRow
     expect(page.homeResolves).toBe(false)
     const restored = await settledMutate(
       root,
@@ -230 +324 @@ describe('trashRows — `homeResolves` agrees with the resolver', () => {
     expect(restored.ok).toBe(false)
   })
 })
-
-describe('deletedPathOf', () => {
-  it('reads a bundled file’s delete-time path from the bundle chain and the artifact’s own tree', () => {
-    const page = '/nexus/.trash/Studio/Pommora/2026-10-17T00-00-00-000Z__ClaudeMD.md.deleted'
-    expect(deletedPathOf('/nexus', page, `${page}/ClaudeMD.md`)).toBe('Studio/Pommora/ClaudeMD.md')
-    const set = '/nexus/.trash/Coll/2026-10-17T00-00-00-000Z__Set.deleted'
-    expect(deletedPathOf('/nexus', set, `${set}/Set/X.md`)).toBe('Coll/Set/X.md')
-  })
-})
```

##### Core/Contexts/contextCascade.test.ts

```/Core/Contexts/contextCascade.test.ts diff
@@ -29 +29 @@ import '../Nexus/settle'
 import { spaceAt } from '../Nexus/treePatch'
 import { contextWorldOf } from './contextResolve'
 import { settledMutate } from '../Testing/settledMutate'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 import { newId } from '../Nexus/ids'
 
 vi.mock('../Properties/governedSweep', async (importOriginal) => {
```

##### Core/Contexts/contextWrite.test.ts

```/Core/Contexts/contextWrite.test.ts diff
@@ -22 +22 @@ import { settleNow } from '../Nexus/settle'
 import { createFolderEntity } from '../Nexus/folderEntity'
 import { createTestPage } from '../Testing/createTestPage'
 import { unsweptLine } from '../Properties/governedSweep'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 import { createProperty } from '../Properties/registryProperty'
 import { readRegistry } from '../Properties/propertiesRegistry'
 
```

##### Core/Files/atomicWrite.test.ts

```/Core/Files/atomicWrite.test.ts diff
@@ -1 +1 @@
 import { stableStringify } from './stableJson'
 import { ok } from '../Contract/result'
-import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
+import { describe, it, expect, beforeEach, afterEach } from 'vitest'
 import { rm, mkdir, readFile, readdir, writeFile, stat, utimes } from 'node:fs/promises'
 import { dirname, join, basename } from '../Paths/posix'
 import { tempRoot, readJsonAt } from '../Testing/hostFs'
@@ -22 +22 @@ import {
   rewritePreservingTimes,
   updateNexusFile,
 } from './atomicWrite'
-import { discardFile, mintBundle, trashFileFlat } from '../Trash/bundle'
+import { mintBundle } from '../Bundles/bundle'
+import { discardFile, trashFileFlat } from '../Trash/discard'
 import { type FileEvent, isRecentWrite, setOwnTap, setWriteTap } from './writeEcho'
 import { machine } from '../Platform/machine'
 
@@ -270 +271 @@ describe('readAppFile and a repairable updateNexusFile', () => {
   })
 })
 
-describe('mintBundle', () => {
-  it('creates the bundle under the mirrored chain while the source stays live', async () => {
-    await mkdir(join(dir, 'Notes', 'Daily'), { recursive: true })
-    const p = join(dir, 'Notes', 'Daily', 'Beta.md')
-    await atomicWriteFile(p, 'bye')
-    const bundle = await mintBundle(dir, p)
-    expect(dirname(bundle)).toBe(join(dir, '.trash', 'Notes', 'Daily'))
-    expect(basename(bundle).endsWith('__Beta.md.deleted')).toBe(true)
-    expect((await stat(bundle)).isDirectory()).toBe(true)
-    expect(await readFile(p, 'utf8')).toBe('bye')
-  })
-
-  it('de-collides within one timestamp — two mints never share a bundle', async () => {
-    vi.useFakeTimers()
-    vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'))
-    try {
-      const p = join(dir, 'twice.md')
-      const first = await mintBundle(dir, p)
-      const second = await mintBundle(dir, p)
-      expect(second).not.toBe(first)
-      expect(basename(second)).toBe('2026-08-01T12-00-00-000Z__1__twice.md.deleted')
-    } finally {
-      vi.useRealTimers()
-    }
-  })
-
-  it('lands flat when the source is not under the root', async () => {
-    const outside = tempRoot('pom-out-')
-    try {
-      const bundle = await mintBundle(dir, join(outside, 'Stray.md'))
-      expect(dirname(bundle)).toBe(join(dir, '.trash'))
-    } finally {
-      await rm(outside, { recursive: true, force: true })
-    }
-  })
-})
-
 describe('relocate', () => {
   it('moves the artifact in under its original basename and clears the original', async () => {
     const p = join(dir, '12__Notes.md')
     await atomicWriteFile(p, 'bye')
-    const bundle = await mintBundle(dir, p)
+    const bundle = await mintBundle(dir, { kind: 'trash' }, p)
     const dest = join(bundle, '12__Notes.md')
     await relocate(p, dest)
     expect(await readFile(dest, 'utf8')).toBe('bye')
@@ -320 +284 @@ describe('relocate', () => {
 
   it('rejects when the source vanished — the caller surfaces it', async () => {
     const p = join(dir, 'ghost.md')
-    const bundle = await mintBundle(dir, p)
+    const bundle = await mintBundle(dir, { kind: 'trash' }, p)
     await expect(relocate(p, join(bundle, 'ghost.md'))).rejects.toThrow()
   })
 })
```

##### Core/Files/walk.test.ts

```/Core/Files/walk.test.ts diff
@@ -4 +4 @@ import type { WatchScope } from '../Paths/exclusion'
 
 const scope = (excluded: string[] = []): WatchScope => ({ excluded, assetDir: ASSETS_DIR_REL })
 import { rm, mkdir, writeFile } from 'node:fs/promises'
-import { join, relative } from '../Paths/posix'
+import { dirname, join, relative } from '../Paths/posix'
 import { tempRoot } from '../Testing/hostFs'
-import { corpusFiles, listMarkdownFiles, listPathsUnder } from './walk'
+import { corpusFiles, listMarkdownFiles, listPathsUnder, sidecarsUnder } from './walk'
 import { installMachine, machine } from '../Platform/machine'
 
 const base = machine()
@@ -30 +30 @@ afterEach(async () => {
   await rm(root, { recursive: true, force: true })
 })
 
+const ARCHIVED = '.nexus/archive/C1/sub/2026-10-20T12-00-00-000Z__z.md.archived'
+
 const rels = (paths: string[]) => paths.map((p) => relative(root, p)).sort()
 
 describe('listMarkdownFiles', () => {
@@ -48 +50 @@ describe('corpusFiles', () => {
     await writeFile(join(root, 'Hidden', 'h.md'), 'x', 'utf8')
     await writeFile(join(root, 'Hidden', 'deep', 'hh.md'), 'x', 'utf8')
     await writeFile(join(root, 'sub', 'CAPS.MD'), 'x', 'utf8')
+    const bundle = join(root, ARCHIVED)
+    await mkdir(join(bundle, '_raw'), { recursive: true })
+    await writeFile(join(bundle, 'z.md'), 'x', 'utf8')
+    await writeFile(join(bundle, '_raw', 'h.md'), 'x', 'utf8')
     expect((await corpusFiles(root, scope())).sort()).toEqual([
+      `${ARCHIVED}/z.md`,
       'Hidden/deep/hh.md',
       'Hidden/h.md',
       'a.md',
@@ -56 +63 @@ describe('corpusFiles', () => {
       'sub/b.md',
     ])
     expect((await corpusFiles(root, scope(['Hidden']))).sort()).toEqual([
+      `${ARCHIVED}/z.md`,
       'a.md',
       'sub/CAPS.MD',
       'sub/b.md',
@@ -66 +74 @@ describe('corpusFiles', () => {
     expect(await corpusFiles(join(root, 'nope'), scope())).toEqual([])
   })
 
-  it('never reads inside `.trash`, `.nexus`, or an excluded folder', async () => {
+  it('never reads inside `.trash`, `.nexus` outside its Archive, or an excluded folder', async () => {
     await mkdir(join(root, '.trash', 'deep'), { recursive: true })
     await mkdir(join(root, 'Hidden', 'deep'), { recursive: true })
     await writeFile(join(root, '.trash', 'deep', 'gone.md'), 'x', 'utf8')
     expect((await corpusFiles(root, scope(['Hidden']))).sort()).toEqual(['a.md', 'sub/b.md'])
     const opened = readSpy.mock.calls.map((c) => relative(root, String(c[0])))
-    expect(opened).toEqual(['', 'sub'])
+    expect(opened).toEqual(['', 'sub', '.nexus/archive'])
+  })
+})
+
+describe('sidecarsUnder', () => {
+  it('lists every container sidecar under both content roots, or under one folder, and never inside a hidden folder', async () => {
+    const archived =
+      '.nexus/archive/C1/Notes/2026-10-20T12-00-00-000Z__Old.archived/Old/_pageset.json'
+    for (const rel of [
+      'Notes/_pagecollection.json',
+      'Notes/Deep/_pageset.json',
+      'Notes/_Drafts/_pageset.json',
+      archived,
+    ]) {
+      await mkdir(dirname(join(root, rel)), { recursive: true })
+      await writeFile(join(root, rel), '{}', 'utf8')
+    }
+    expect(rels(await sidecarsUnder(root, scope()))).toEqual([
+      archived,
+      'Notes/Deep/_pageset.json',
+      'Notes/_pagecollection.json',
+    ])
+    expect(rels(await sidecarsUnder(root, scope(), join(root, '.nexus/archive')))).toEqual([
+      archived,
+    ])
   })
 })
 
```

##### Core/Index/indexMaintenance.test.ts

```/Core/Index/indexMaintenance.test.ts diff
@@ -10 +10 @@ import { openSession, closeSession } from '../Nexus/session'
 import { installStores, NO_STORES } from '../Platform/stores'
 import { memoryStores } from '../Testing/memoryStores'
 import { createProperty } from '../Properties/registryProperty'
-import { listBundles } from '../Trash/holdings'
+import { listBundles } from '../Bundles/bundle'
 import { seedContentIndex } from './indexSeed'
 import { queryKeyHolders, queryMembers, queryMentions } from './contentIndex'
 import { applyEvents, owedFor } from '../Nexus/fileEvents'
 import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
 import { settleBatch } from '../Nexus/settle'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 import { homepageDir } from '../Paths/paths'
 import { machine } from '../Platform/machine'
 import { createTile, writeMarkdownTile } from '../Tiles/tilesFile'
@@ -194 +194 @@ describe('the writers maintain the rows', () => {
     expect(del.ok).toBe(true)
     expect(queryMentions(['beta'])).toEqual(['Notes/Daily/Alpha.md'])
     await expectMaintained()
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const restored = await settledMutate(
       root,
       { op: 'restore', bundlePath: listed.bundlePath },
@@ -208 +208 @@ describe('the writers maintain the rows', () => {
     const del = await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, deps)
     expect(del.ok).toBe(true)
     expect(queryMentions(['beta'])).toEqual([])
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const restored = await settledMutate(
       root,
       { op: 'restore', bundlePath: listed.bundlePath },
```

##### Core/Index/indexSeed.test.ts

```/Core/Index/indexSeed.test.ts diff
@@ -1 +1 @@
 import { describe, it, expect, beforeEach, afterEach } from 'vitest'
 import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
-import { mkdir, readFile, rm, unlink, utimes, writeFile } from 'node:fs/promises'
-import { join } from '../Paths/posix'
+import { mkdir, readFile, rename, rm, unlink, utimes, writeFile } from 'node:fs/promises'
+import { dirname, join } from '../Paths/posix'
 import { tempRoot } from '../Testing/hostFs'
 import { installStores, type Relation, NO_STORES } from '../Platform/stores'
 import { memoryStores } from '../Testing/memoryStores'
@@ -22 +22 @@ import { newContentId } from '../Nexus/ids'
 const ULID_A = '01ARZ3NDEKPSV4RRFFQ69G5FAV'
 const ULID_B = '01BX5ZZKBKPCTAV9WEVGEMMVRZ'
 const ULID_C = '01CX5ZZKBKPCTAV9WEVGEMMVRC'
+const BUNDLES = '.nexus/archive/c1/Notes/2026-10-20T12-00-00-000Z'
 
 let root: string
 let mem: ReturnType<typeof memoryStores>
@@ -70 +71 @@ describe('seedContentIndex', () => {
     expect(stats?.has('Hidden/Secret.md')).toBe(false)
   })
 
+  it('seeds the Archive as the corpus’s second root, and a hidden folder inside an archived Set gets no rows', async () => {
+    const page = `${BUNDLES}__Old.md.archived/Old.md`
+    const raw = `${BUNDLES}__Set.archived/Set/_raw/X.md`
+    for (const rel of [page, raw]) await mkdir(dirname(abs(rel)), { recursive: true })
+    await writeFile(abs(page), `---\nID: ${ULID_B}\n---\n\nlinks [[Target]]\n`)
+    await writeFile(abs(raw), 'links [[Target]]\n')
+    await seedContentIndex(root)
+    const stats = readIndexedStats()
+    expect(stats?.get(page)).toMatchObject({ id: ULID_B })
+    expect(queryMentions(['target'])?.sort()).toEqual(['Loose/Note.md', 'Notes/A.md', page].sort())
+    expect(stats?.has(raw)).toBe(false)
+  })
+
+  it('moves a page’s rows into the Archive and back, and a Set’s by prefix', async () => {
+    await mkdir(abs('Notes', 'Sub'), { recursive: true })
+    await writeFile(abs('Notes', 'Sub', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
+    await seedContentIndex(root)
+    const moves = [
+      ['Notes/A.md', `${BUNDLES}__A.md.archived/A.md`, 'Notes/A.md', ULID_A],
+      ['Notes/Sub', `${BUNDLES}__Sub.archived/Sub`, 'Notes/Sub/B.md', ULID_B],
+    ]
+    for (const [from, to, page, id] of moves) {
+      const archived = page.replace(from, to)
+      await mkdir(dirname(abs(to)), { recursive: true })
+      await rename(abs(from), abs(to))
+      await moveIndexPaths(root, abs(from), abs(to))
+      expect(readIndexedStats('.nexus/archive')?.get(archived)).toMatchObject({ id })
+      expect(readIndexedStats()?.has(page)).toBe(false)
+      await rename(abs(to), abs(from))
+      await moveIndexPaths(root, abs(to), abs(from))
+      expect(readIndexedStats()?.get(page)).toMatchObject({ id })
+      expect(readIndexedStats()?.has(archived)).toBe(false)
+    }
+  })
+
+  it('a removal of the Archive itself prunes every row beneath it', async () => {
+    const page = `${BUNDLES}__Old.md.archived/Old.md`
+    await mkdir(dirname(abs(page)), { recursive: true })
+    await writeFile(abs(page), `---\nID: ${ULID_B}\n---\n\nold\n`)
+    await seedContentIndex(root)
+    const seen = await deindexPath(root, abs('.nexus/archive'))
+    expect(seen.vanished).toEqual([{ id: ULID_B, title: 'Old', path: page }])
+    expect(readIndexedStats('.nexus/archive')?.size).toBe(0)
+  })
+
   it('writes and moves index only what the corpus admits: hidden and excluded paths get no rows', async () => {
     await seedContentIndex(root)
     await mkdir(abs('.obsidian', 'plugins'), { recursive: true })
```

##### Core/Interface/Confirm/confirmations.test.ts

```/Core/Interface/Confirm/confirmations.test.ts diff
@@ -2 +2 @@
 import { beforeEach, describe, expect, it, vi } from 'vitest'
 import {
   askClearOption,
+  askEmptyTrash,
   askDeleteView,
   askDestroyProperty,
   askFormatChange,
   askRemoveOption,
+  askTrashing,
+  confirmArchive,
   confirmDelete,
-  spendBundle,
+  countPhrase,
+  offerUndo,
+  spendUndo,
 } from './confirmations'
 import { resetUndo, undoValue } from '../../Session/undo'
 import { useSession } from '../../Session/store'
 import { makeTree } from '../../Testing/testTree'
-import { clearNotification, currentNotification } from '../Notifications/notifications'
+import {
+  clearNotification,
+  currentNotification,
+  notifyUndoable,
+} from '../Notifications/notifications'
 import type { HeldKind } from '../../Nexus/entities'
 import { stubDialer } from '../../vitest.setup'
 import { fault, ok, type Result } from '../../Contract/result'
+import { bundleRow as row } from '../../Testing/fixtures'
 
 const asked: string[] = []
 
@@ -142 +152 @@ describe('what the Confirm Before Deletion switch governs', () => {
     expect(asked[0]).toContain('from the container')
     expect(asked[1]).toContain('from the tile')
   })
+
+  it('a delete under the system Trash Mode says it moves to the system trash', async () => {
+    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+      'delete:facts': async () => ok({ trashMode: 'system', permanentDelete: false }),
+    })
+    const details: string[] = []
+    useSession.setState({
+      tree: makeTree(),
+      askConfirm: async (r) => {
+        details.push(r.detail)
+        return false
+      },
+    })
+    await confirmDelete({ path: 'Notes/Alpha.md', kind: 'page', title: 'Alpha' })
+    expect(details).toEqual(['It will be moved to the system trash.'])
+  })
 })
 
 describe('a delete through the confirmation', () => {
   const mutate = vi.fn()
-  const del = (kind: HeldKind): Promise<void> =>
+  const del = (kind: HeldKind): Promise<boolean> =>
     confirmDelete({ path: 'Notes/A', kind, title: 'A' })
 
   beforeEach(() => {
@@ -154 +180 @@ describe('a delete through the confirmation', () => {
       'delete:facts': async () => ok({ trashMode: 'nexus', permanentDelete: false }),
     })
     mutate.mockReset()
-    mutate.mockResolvedValue({ trashed: { bundlePath: '.trash/b1' } })
+    mutate.mockResolvedValue({ bundled: { bundlePath: '.trash/b1' } })
     useSession.setState({ mutate: mutate as never })
     clearNotification()
   })
@@ -175 +201 @@ describe('a delete through the confirmation', () => {
     expect(mutate).not.toHaveBeenCalled()
   })
 
+  it('answers whether the delete went through', async () => {
+    switchOn()
+    expect(await del('page')).toBe(true)
+    useSession.setState({ askConfirm: async () => false })
+    expect(await del('page')).toBe(false)
+  })
+
+  it('an Undo given a destination restores its bundle there', async () => {
+    await confirmDelete({ path: 'Notes/A', kind: 'page', title: 'A', undoTo: { kind: 'archive' } })
+    await currentNotification()?.action?.run()
+    expect(mutate).toHaveBeenLastCalledWith({
+      op: 'restore',
+      bundlePath: '.trash/b1',
+      destination: { kind: 'archive' },
+    })
+  })
+
   it('offers an Undo that restores the bundle the delete answered with', async () => {
     await del('page')
     await currentNotification()?.action?.run()
@@ -184 +227 @@ describe('a delete through the confirmation', () => {
   it('gives up its Undo and the chord once the Trash spends its bundle', async () => {
     resetUndo()
     await del('page')
-    spendBundle('.trash/b1')
+    spendUndo('.trash/b1')
     expect(currentNotification()).toBeNull()
     expect(undoValue(null)).toBe(false)
     expect(mutate).not.toHaveBeenCalledWith({ op: 'restore', bundlePath: '.trash/b1' })
@@ -193 +236 @@ describe('a delete through the confirmation', () => {
   it('carries the configuration pass’s warning in the Deleted notice', async () => {
     const warning = 'Couldn’t update 1 Item.'
     mutate.mockResolvedValue({
-      trashed: { bundlePath: '.trash/b1' },
+      bundled: { bundlePath: '.trash/b1' },
       cascade: { pages: [], hosts: [], warning },
     })
     await del('set')
@@ -203 +246 @@ describe('a delete through the confirmation', () => {
 
   it('counts the strip’s linkers behind a segment in the Deleted notice', async () => {
     mutate.mockResolvedValue({
-      trashed: { bundlePath: '.trash/b1' },
+      bundled: { bundlePath: '.trash/b1' },
       cascade: { pages: ['A.md', 'B.md'], hosts: [] },
     })
     await del('page')
@@ -224 +267 @@ describe('a delete through the confirmation', () => {
     expect(currentNotification()?.action).toBeUndefined()
   })
 })
+
+describe('an Undo over several bundles', () => {
+  const mutate = vi.fn()
+
+  beforeEach(() => {
+    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+      'delete:facts': async () => ok({ trashMode: 'nexus', permanentDelete: false }),
+    })
+    mutate.mockReset()
+    mutate.mockResolvedValue({})
+    useSession.setState({ mutate: mutate as never })
+    clearNotification()
+  })
+
+  it('an empty of one asks by its title and says It, and of more by their count and says They', async () => {
+    useSession.setState({
+      askConfirm: async (r) => {
+        asked.push(`${r.message} ${r.detail}`)
+        return true
+      },
+    })
+    await askEmptyTrash([row({ title: 'A' })])
+    await askEmptyTrash([row({}), row({})])
+    expect(asked).toEqual([
+      'Delete “A”? It will move to your system trash, which is where you would get it back from.',
+      'Delete these 2 Pages? They will move to your system trash, which is where you would get them back from.',
+    ])
+  })
+
+  it('asks once for a batch, unasked only when every item would be', async () => {
+    const details: string[] = []
+    useSession.setState({
+      askConfirm: async (r) => {
+        asked.push(r.message)
+        details.push(r.detail)
+        return true
+      },
+    })
+    switchOff()
+    expect(await askTrashing([row({}), row({})])).toBe(true)
+    expect(asked).toEqual([])
+    expect(await askTrashing([row({}), row({ kind: 'set' })])).toBe(true)
+    expect(asked).toEqual(['Delete these 2 Items?'])
+    expect(details).toEqual(['They will be moved to the nexus’s .trash folder (recoverable).'])
+  })
+
+  it('offers one Undo returning every bundle it was handed to the destination given', async () => {
+    offerUndo(['.trash/b1', '.trash/b2'], (undo) => notifyUndoable('Deleted 2 Pages', undo), {
+      kind: 'archive',
+    })
+    await currentNotification()?.action?.run()
+    await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(2))
+    expect(mutate.mock.calls).toEqual([
+      [{ op: 'restore', bundlePath: '.trash/b1', destination: { kind: 'archive' } }],
+      [{ op: 'restore', bundlePath: '.trash/b2', destination: { kind: 'archive' } }],
+    ])
+  })
+
+  it('gives up that Undo once one of its bundles is restored from elsewhere', async () => {
+    offerUndo(['.trash/b1', '.trash/b2'], (undo) => notifyUndoable('Deleted 2 Pages', undo))
+    spendUndo('.trash/b2')
+    expect(currentNotification()).toBeNull()
+    expect(mutate).not.toHaveBeenCalled()
+  })
+})
+
+describe('an archive through the confirmation', () => {
+  const BUNDLE = '.nexus/archive/c1/Notes/1__A.archived'
+  const mutate = vi.fn()
+  const archive = (kind: 'page' | 'set'): Promise<void> =>
+    confirmArchive({ path: 'Notes/A', kind, title: 'A' })
+
+  beforeEach(() => {
+    mutate.mockReset()
+    mutate.mockResolvedValue({ bundled: { bundlePath: BUNDLE } })
+    useSession.setState({ mutate: mutate as never })
+    clearNotification()
+  })
+
+  it('asks “Archive “A”?” in the positive tone and sends the archive', async () => {
+    const seen: unknown[] = []
+    useSession.setState({
+      tree: makeTree(),
+      askConfirm: async (req) => {
+        seen.push(req)
+        return true
+      },
+    })
+    await archive('page')
+    expect(seen).toEqual([
+      {
+        message: 'Archive “A”?',
+        detail: '“A” will be moved to this Collection’s archive, where it can be restored.',
+        action: 'Archive',
+        tone: 'positive',
+      },
+    ])
+    expect(mutate).toHaveBeenCalledWith({ op: 'archive', path: 'Notes/A', kind: 'page' })
+  })
+
+  it('with Confirm Before Archiving off, archives a page and a Set unasked, and Confirm Before Deletion has no say', async () => {
+    useSession.setState({ tree: makeTree({ personalization: { confirmArchiving: false } }) })
+    await archive('page')
+    await archive('set')
+    expect(asked).toEqual([])
+    useSession.setState({ tree: makeTree({ personalization: { confirmDeletion: false } }) })
+    await archive('set')
+    expect(asked).toHaveLength(1)
+    expect(mutate).toHaveBeenCalledTimes(3)
+  })
+
+  it('posts Archived “A” with an Undo that restores its bundle, whatever the switch says', async () => {
+    for (const confirmArchiving of [false, true]) {
+      useSession.setState({ tree: makeTree({ personalization: { confirmArchiving } }) })
+      clearNotification()
+      await archive('page')
+      expect(currentNotification()).toMatchObject({
+        message: 'Archived “A”',
+        tone: 'normal',
+        action: { label: 'Undo' },
+      })
+      expect(currentNotification()?.segment).toBeUndefined()
+      await currentNotification()?.action?.run()
+      expect(mutate).toHaveBeenLastCalledWith({ op: 'restore', bundlePath: BUNDLE })
+    }
+    expect(asked).toEqual(['Archive “A”?'])
+  })
+
+  it('archives nothing when the question is declined', async () => {
+    useSession.setState({ tree: makeTree(), askConfirm: async () => false })
+    await archive('page')
+    expect(mutate).not.toHaveBeenCalled()
+  })
+})
+
+describe('a delete’s question', () => {
+  it('asks of one row by its title, of more by their count, Items where the kinds mix', async () => {
+    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+      'delete:facts': async () => ok({ trashMode: 'nexus', permanentDelete: false }),
+    })
+    switchOn()
+    await askTrashing([row({ title: 'Ideas' })])
+    await askTrashing([row({}), row({})])
+    await askTrashing([row({}), row({ kind: 'set' })])
+    expect(asked).toEqual(['Delete “Ideas”?', 'Delete these 2 Pages?', 'Delete these 2 Items?'])
+  })
+})
+
+describe('countPhrase', () => {
+  it('names the kind when every row shares one', () => {
+    expect(countPhrase([row({}), row({})])).toBe('2 Pages')
+    expect(countPhrase([row({ kind: 'set' }), row({ kind: 'set' })])).toBe('2 Sets')
+    expect(countPhrase([row({ kind: 'context' }), row({ kind: 'context' })])).toBe('2 Contexts')
+  })
+
+  it('generalizes when they do not', () => {
+    expect(countPhrase([row({}), row({ kind: 'space' })])).toBe('2 Items')
+  })
+
+  it('stays singular for one', () => {
+    expect(countPhrase([row({})])).toBe('1 Page')
+    expect(countPhrase([row({ kind: 'space' })])).toBe('1 Space')
+  })
+
+  it('reports none honestly', () => {
+    expect(countPhrase([])).toBe('0 Items')
+  })
+})
```

##### Core/Interface/Menus/entityMenuActions.test.ts

```/Core/Interface/Menus/entityMenuActions.test.ts diff
@@ -4 +4 @@ import { ok } from '../../Contract/result'
 import { stubDialer } from '../../vitest.setup'
 import { showEntityMenu } from './entityMenuActions'
 
+const { confirmArchive, confirmDelete } = vi.hoisted(() => ({
+  confirmArchive: vi.fn(async () => {}),
+  confirmDelete: vi.fn(async () => {}),
+}))
+vi.mock('../Confirm/confirmations', async (importOriginal) => ({
+  ...(await importOriginal<typeof import('../Confirm/confirmations')>()),
+  confirmArchive,
+  confirmDelete,
+}))
+
 const picked = vi.fn<() => string | null>()
 const copyPath = vi.fn(async () => ok(null))
 const reveal = vi.fn(async () => ok(null))
@@ -24 +34 @@ describe('a folder answers its path verbs', () => {
     expect(reveal).toHaveBeenCalledWith('Notes/Drafts')
   })
 })
+
+describe('Archive and Delete reach their confirmations', () => {
+  it('a page’s and a Set’s Archive ask to archive, and a Space’s Delete asks to delete', async () => {
+    picked.mockReturnValueOnce('title:archive')
+    await showEntityMenu({ kind: 'page', id: 'p1', path: 'Notes/A.md', title: 'A' })
+    picked.mockReturnValueOnce('title:archive')
+    await showEntityMenu({ kind: 'set', path: 'Notes/S', title: 'S', host: 'detail' })
+    expect(confirmArchive.mock.calls).toEqual([
+      [{ path: 'Notes/A.md', kind: 'page', title: 'A' }],
+      [{ path: 'Notes/S', kind: 'set', title: 'S' }],
+    ])
+    picked.mockReturnValueOnce('title:delete')
+    await showEntityMenu({
+      kind: 'space',
+      id: 'a1',
+      path: '.nexus/contexts/Realms/Work',
+      title: 'Work',
+      host: 'sidebar',
+    })
+    expect(confirmDelete).toHaveBeenCalledWith(
+      expect.objectContaining({
+        kind: 'space',
+        path: '.nexus/contexts/Realms/Work',
+        title: 'Work',
+      }),
+    )
+  })
+})
```

##### Core/Interface/Notifications/ActionLabel.test.tsx

```/Core/Interface/Notifications/ActionLabel.test.tsx diff
@@ -0 +1 @@
+// @vitest-environment jsdom
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { ActionLabel } from './ActionLabel'
+import {
+  type ActionBar,
+  clearNotification,
+  notifyDeleted,
+  useDeclareActions,
+} from './notifications'
+import { ContentHostContext } from '../contentHost'
+import { duration, ms } from '@pommora/uix/Animations/motion'
+import { DWELL_MS } from './action-label.css'
+;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
+
+let host: HTMLDivElement
+let root: Root
+
+beforeEach(() => {
+  host = document.body.appendChild(document.createElement('div'))
+  root = createRoot(host)
+  act(() => root.render(<ActionLabel />))
+})
+
+afterEach(() => {
+  act(() => {
+    clearNotification()
+    root.unmount()
+  })
+  host.remove()
+})
+
+const label = (): Element | null => host.querySelector('[role=status]')
+const face = (): Element | null | undefined => label()?.querySelector('[data-face="shown"]')
+
+const FAKED = [
+  'setTimeout',
+  'clearTimeout',
+  'requestAnimationFrame',
+  'cancelAnimationFrame',
+  'performance',
+] as const
+const move = (x: number, buttons = 0): void =>
+  act(() => {
+    document.body.dispatchEvent(
+      new PointerEvent('pointermove', { clientX: x, clientY: 20, buttons, bubbles: true }),
+    )
+  })
+const run = (ms: number): void =>
+  act(() => {
+    vi.advanceTimersByTime(ms)
+  })
+const stubBox = (el: HTMLElement): void => {
+  el.getBoundingClientRect = () => ({ left: 100, top: 0, right: 300, bottom: 40 }) as DOMRect
+}
+
+describe('ActionLabel', () => {
+  it('draws the count after the title behind one hidden divider', () => {
+    act(() => notifyDeleted('Ideas', vi.fn(), { pages: ['A.md', 'B.md'] }))
+    const dividers = face()?.querySelectorAll('[aria-hidden="true"]') ?? []
+    expect(dividers).toHaveLength(1)
+    expect([
+      dividers[0].previousSibling?.textContent,
+      dividers[0].nextSibling?.textContent,
+    ]).toEqual(['Deleted “Ideas”', '2 Internal Links'])
+  })
+
+  it('draws a notice without a count as its message alone', () => {
+    act(() => notifyDeleted('Ideas', vi.fn()))
+    expect(face()?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
+    expect(face()?.textContent).toBe('Deleted “Ideas”Undo')
+  })
+})
+
+describe('the drain near the pointer', () => {
+  const showing = (): boolean => !label()?.hasAttribute('inert')
+
+  beforeEach(() => {
+    vi.useFakeTimers({ toFake: [...FAKED] })
+    act(() => notifyDeleted('Ideas', vi.fn()))
+    stubBox(label() as HTMLElement)
+  })
+  afterEach(() => {
+    vi.useRealTimers()
+  })
+
+  it('a notice posted under the pointer drains while the pointer stays in its band', () => {
+    move(400)
+    move(390)
+    run(10_000)
+    expect(showing()).toBe(false)
+  })
+
+  it('stalls within its band once the pointer has been outside it, and drains once it leaves again', () => {
+    move(401)
+    move(400)
+    run(10_000)
+    expect(showing()).toBe(true)
+    move(401)
+    run(10_000)
+    expect(showing()).toBe(false)
+  })
+
+  it('holds where it stands through a press, once the pointer has been outside its band', () => {
+    move(401)
+    move(400)
+    move(1000, 1)
+    run(10_000)
+    expect(showing()).toBe(true)
+  })
+})
+
+describe('the bar a shown view declares', () => {
+  function Declarer({ bar }: { bar: ActionBar | null }): null {
+    useDeclareActions(bar)
+    return null
+  }
+  const mount = (bar: ActionBar | null, parked = false): void =>
+    act(() =>
+      root.render(
+        <>
+          <ContentHostContext.Provider value={{ tabId: 't1', key: 'collection:c1', parked }}>
+            {bar && <Declarer bar={bar} />}
+          </ContentHostContext.Provider>
+          <ActionLabel />
+        </>,
+      ),
+    )
+  const declare = (restore: () => void = vi.fn()): ActionBar => {
+    const bar = { count: '2 Pages', restore, remove: vi.fn() }
+    mount(bar)
+    return bar
+  }
+  const press = (selector: string): void =>
+    act(() => (face()?.querySelector(selector) as HTMLElement).click())
+  const restoreButton = (): Element | undefined =>
+    [...(face()?.querySelectorAll('button') ?? [])].find((b) => b.textContent === 'Restore')
+  const inert = (): boolean => label()?.hasAttribute('inert') ?? false
+
+  it('draws a declared bar as Restore, its count, and a Delete button while nothing is posted', () => {
+    const bar = declare()
+    expect(inert()).toBe(false)
+    expect(face()?.textContent).toBe('Restore2 Pages')
+    act(() => (restoreButton() as HTMLElement).click())
+    press('button[title="Delete"]')
+    expect(bar.restore).toHaveBeenCalledOnce()
+    expect(bar.remove).toHaveBeenCalledOnce()
+  })
+
+  it('yields the bar to a posted notice and takes it back once the notice drains', () => {
+    vi.useFakeTimers({ toFake: [...FAKED] })
+    try {
+      declare()
+      act(() => notifyDeleted('Ideas', vi.fn()))
+      expect(face()?.textContent).toBe('Deleted “Ideas”Undo')
+      expect(inert()).toBe(false)
+      run(DWELL_MS + ms(duration.base))
+      expect(face()?.textContent).toBe('Restore2 Pages')
+      expect(inert()).toBe(false)
+    } finally {
+      vi.useRealTimers()
+    }
+  })
+
+  it('withdraws the bar once its view parks, and once it unmounts', () => {
+    const bar = declare()
+    mount(bar, true)
+    expect(inert()).toBe(true)
+    mount(bar)
+    expect(inert()).toBe(false)
+    mount(null)
+    expect(inert()).toBe(true)
+  })
+
+  it('keeps the hidden face out of reach: inert and aria-hidden, its buttons unfocusable', () => {
+    declare()
+    act(() => notifyDeleted('Ideas', vi.fn()))
+    const hidden = label()?.querySelector('[data-face="hidden"]')
+    expect(hidden?.querySelector('button[title="Delete"]')).not.toBeNull()
+    expect(hidden?.hasAttribute('inert')).toBe(true)
+    expect(hidden?.getAttribute('aria-hidden')).toBe('true')
+  })
+
+  it('holds phrasing content alone in both faces', () => {
+    declare()
+    act(() => notifyDeleted('Ideas', vi.fn()))
+    expect(label()?.querySelectorAll('[data-face]')).toHaveLength(2)
+    expect(label()?.querySelectorAll('[data-face] div')).toHaveLength(0)
+  })
+
+  it("a notice its own bar's press posts arms at once, so the drain stalls under the pointer", () => {
+    vi.useFakeTimers({ toFake: [...FAKED] })
+    try {
+      declare(() => notifyDeleted('Ideas', vi.fn()))
+      const el = label() as HTMLElement
+      stubBox(el)
+      vi.spyOn(el, 'matches').mockImplementation((selector) => selector === ':hover')
+      act(() => (restoreButton() as HTMLElement).click())
+      move(400)
+      move(390)
+      run(10_000)
+      expect(face()?.textContent).toBe('Deleted “Ideas”Undo')
+    } finally {
+      vi.useRealTimers()
+    }
+  })
+})
```

##### Core/Interface/Notifications/NotificationLabel.test.tsx

```/Core/Interface/Notifications/NotificationLabel.test.tsx diff
@@ -1 +0 @@
-// @vitest-environment jsdom
-import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
-import { act } from 'react'
-import { createRoot, type Root } from 'react-dom/client'
-import { NotificationLabel } from './NotificationLabel'
-import { clearNotification, notifyDeleted } from './notifications'
-;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
-
-let host: HTMLDivElement
-let root: Root
-
-beforeEach(() => {
-  host = document.body.appendChild(document.createElement('div'))
-  root = createRoot(host)
-  act(() => root.render(<NotificationLabel />))
-})
-
-afterEach(() => {
-  act(() => {
-    clearNotification()
-    root.unmount()
-  })
-  host.remove()
-})
-
-const label = (): Element | null => host.querySelector('[role=status]')
-
-describe('NotificationLabel', () => {
-  it('draws the count after the title behind one hidden divider', () => {
-    act(() => notifyDeleted('Ideas', vi.fn(), { pages: ['A.md', 'B.md'] }))
-    const dividers = label()?.querySelectorAll('[aria-hidden="true"]') ?? []
-    expect(dividers).toHaveLength(1)
-    expect([
-      dividers[0].previousSibling?.textContent,
-      dividers[0].nextSibling?.textContent,
-    ]).toEqual(['Deleted “Ideas”', '2 Internal Links'])
-  })
-
-  it('draws a notice without a count as its message alone', () => {
-    act(() => notifyDeleted('Ideas', vi.fn()))
-    expect(label()?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
-    expect(label()?.textContent).toBe('Deleted “Ideas”Undo')
-  })
-})
-
-describe('the drain near the pointer', () => {
-  const FAKED = [
-    'setTimeout',
-    'clearTimeout',
-    'requestAnimationFrame',
-    'cancelAnimationFrame',
-    'performance',
-  ] as const
-  const move = (x: number, buttons = 0): void =>
-    act(() => {
-      document.body.dispatchEvent(
-        new PointerEvent('pointermove', { clientX: x, clientY: 20, buttons, bubbles: true }),
-      )
-    })
-  const run = (ms: number): void =>
-    act(() => {
-      vi.advanceTimersByTime(ms)
-    })
-  const showing = (): boolean => !label()?.hasAttribute('inert')
-
-  beforeEach(() => {
-    vi.useFakeTimers({ toFake: [...FAKED] })
-    act(() => notifyDeleted('Ideas', vi.fn()))
-    const el = label() as HTMLElement
-    el.getBoundingClientRect = () => ({ left: 100, top: 0, right: 300, bottom: 40 }) as DOMRect
-  })
-  afterEach(() => {
-    vi.useRealTimers()
-  })
-
-  it('stalls within its band and drains once the pointer leaves it', () => {
-    move(400)
-    run(10_000)
-    expect(showing()).toBe(true)
-    move(401)
-    run(10_000)
-    expect(showing()).toBe(false)
-  })
-
-  it('holds where it stands through a press', () => {
-    move(400)
-    move(1000, 1)
-    run(10_000)
-    expect(showing()).toBe(true)
-  })
-})
```

##### Core/Interface/Subfield/crumbs.test.ts

```/Core/Interface/Subfield/crumbs.test.ts diff
@@ -35 +35 @@ describe('subfieldCrumbs', () => {
     collection?.onSelect?.({ metaKey: false, ctrlKey: false } as React.MouseEvent)
     expect(navigate.mock.calls.map((c) => c[2])).toEqual([true, false])
   })
+
+  it("an archive's crumbs are its owner's ancestry, each navigable, then a plain Archive", () => {
+    const crumbs = subfieldCrumbs(tree, { kind: 'archive', id: 's1' }, null, () => {}, false)
+    expect(crumbs.map((c) => c.title)).toEqual(['Notes', 'Ideas', 'Archive'])
+    expect(crumbs.map((c) => c.onSelect !== undefined)).toEqual([true, true, false])
+  })
 })
```

##### Core/Interface/Subfield/subfieldItems.test.ts

```/Core/Interface/Subfield/subfieldItems.test.ts diff
@@ -6 +6 @@ describe('subfield item registry', () => {
     expect(DEFAULT_ITEMS.none).toEqual(['count'])
   })
 
-  it('a container states its result count', () => {
+  it('a container and its archive state their result count', () => {
     expect(DEFAULT_ITEMS.collection).toEqual(['count'])
     expect(DEFAULT_ITEMS.set).toEqual(['count'])
+    expect(DEFAULT_ITEMS.archive).toEqual(['count'])
   })
 })
```

##### Core/Matrix/matrixGraph.test.ts

```/Core/Matrix/matrixGraph.test.ts diff
@@ -9 +9 @@ import { readMatrixGraph } from './matrixGraph'
 const A = '01KVGMT8BFP350FZZXAMG1QDRN'
 const B = '01KVGMT8BFP350FZZXAMG1QDRW'
 const C = '01KVGMT8BFP350FZZXAMG1QDRX'
+const D = '01KVGMT8BFP350FZZXAMG1QDRD'
 
 let stores: ReturnType<typeof memoryStores>
 
@@ -144 +145 @@ describe('readMatrixGraph', () => {
     expect(readMatrixGraph(true, ['Notes/A.md'])!.links.map((l) => l.target)).toEqual(['beta'])
   })
 
+  it('drops an archived page’s rows, its links included', () => {
+    const archived = '.nexus/archive/C1/Notes/2026-10-20T12-00-00-000Z__D.md.archived/D.md'
+    stores.stores.contentIndex!.upsertPageIndexes([
+      {
+        path: archived,
+        entry: { relations: [relation('body', 'alpha')], headings: [], values: { ID: D } },
+        stat: { mtimeMs: 5000, size: 50 },
+      },
+    ])
+    const reply = readMatrixGraph(true)!
+    expect(reply.values?.[D]).toBeUndefined()
+    expect(reply.links.some((l) => l.path === archived)).toBe(false)
+    expect(readMatrixGraph(false, [archived])!.ids).toEqual([])
+  })
+
   it('reads no values when none are asked for', () => {
     expect(readMatrixGraph(false)!.values).toBeNull()
   })
```

##### Core/Navigation/navRef.test.ts

```/Core/Navigation/navRef.test.ts diff
@@ -6 +6 @@ describe('isNavRef', () => {
     expect(isNavRef({ kind: 'matrix' })).toBe(true)
     expect(isNavRef({ kind: 'matrix', id: 'x' })).toBe(false)
   })
+
+  it("admits an archive place by its owner's id and refuses one without", () => {
+    expect(isNavRef({ kind: 'archive', id: 'c1' })).toBe(true)
+    expect(isNavRef({ kind: 'archive' })).toBe(false)
+    expect(isForeignRef({ kind: 'archive', id: 'c1' })).toBe(false)
+  })
 })
 
 describe('isForeignRef', () => {
```

##### Core/Navigation/tabsModel.test.ts

```/Core/Navigation/tabsModel.test.ts diff
@@ -63 +63 @@ describe('tabsModel — the Matrix kind', () => {
   })
 })
 
+describe('tabsModel — the archive place', () => {
+  it('liveTarget keeps an archive place while its Collection stands, and drops one whose owner is gone', () => {
+    const index = reconcileIndexOf(mkTree('a'))
+    expect(liveTarget(index, { kind: 'archive', id: 'col' })).toEqual({
+      kind: 'archive',
+      id: 'col',
+    })
+    expect(liveTarget(index, { kind: 'archive', id: 'gone' })).toBeNull()
+  })
+
+  it('opening an archive place from a pinned tab spawns a tab rather than replacing the pin', () => {
+    const pinned = derivePinnedTabs([pin('p')], reconcileIndexOf(mkTree('p')), [])
+    const r = openTab(
+      [],
+      pinTabId(pt('p')),
+      pinned,
+      { kind: 'archive', id: 'col' },
+      { newTab: false },
+      'A1',
+    )
+    expect(r.tabs.map((t) => t.id)).toEqual(['A1'])
+    expect(r.activeTabId).toBe('A1')
+  })
+})
+
 describe('tabsModel — openTab', () => {
   it('focuses an already-open tab instead of duplicating (I-1)', () => {
     const tabs = [tab('t1', 'a'), tab('t2', 'b')]
```

##### Core/Nexus/admission.test.ts

```/Core/Nexus/admission.test.ts diff
@@ -16 +16 @@ import { newId } from './ids'
 import { openSession, closeSession } from './session'
 import { contextsDir, contextsRegistryFile, nexusDir, nexusConfig } from '../Paths/paths'
 import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME } from '../Paths/nexusPaths'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 import type { HostContext } from '../Contract/handlers'
 import { openNexusSequence } from './handlers'
 import { installStores, NO_STORES } from '../Platform/stores'
```

##### Core/Nexus/cascade.test.ts

```/Core/Nexus/cascade.test.ts diff
@@ -711 +711 @@ describe('deleteCascade', () => {
     expect(sweepSpy).not.toHaveBeenCalled()
   })
 
-  it('an ID-less linker isn’t held, isn’t stamped by the sweep, and keeps its bytes', async () => {
+  it('an ID-less linker keeps its bytes and its value, counted among the links left in place', async () => {
     const loose = join(dir, 'Loose.md')
     const content = '---\nRelated: "[[Target]]"\n---\n'
     await writeFile(loose, content)
@@ -723 +723 @@ describe('deleteCascade', () => {
     })
     const r = await deleteCascade(root, target(), ['Notes/Target.md'])
     expect(r.links).toEqual([])
+    expect(r.cascade.warning).toBe(unsweptLine(1, 'links in '))
     expect(await readFile(loose, 'utf8')).toBe(content)
   })
 
+  it('strips an archived linker’s Link value naming the page and records it under its id', async () => {
+    const id = '01KVGMT8BFP350FZZXAMG1QARC'
+    const archived = join(
+      root,
+      '.nexus/archive/col-notes/Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md',
+    )
+    await mkdir(join(archived, '..'), { recursive: true })
+    await writeFile(archived, `---\nID: ${id}\nRelated: "[[Target]]"\n---\nb\n`)
+    await refreshTree(root)
+    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
+    expect(await fmOf(archived)).not.toHaveProperty('Related')
+    expect(r.links).toEqual([{ page: id, property: related, value: '[[Target]]' }])
+  })
+
+  it('strips an archived linker’s Link value and names the live linker alone in its pages', async () => {
+    const a = await linker('Cites', '[[Target]]')
+    const archived = join(
+      root,
+      '.nexus/archive/col-notes/Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md',
+    )
+    await mkdir(join(archived, '..'), { recursive: true })
+    await writeFile(
+      archived,
+      `---\nID: 01KVGMT8BFP350FZZXAMG1QARC\nRelated: "[[Target]]"\n---\nb\n`,
+    )
+    await refreshTree(root)
+    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
+    expect(await fmOf(archived)).not.toHaveProperty('Related')
+    expect(r.cascade.pages).toEqual([rel(a.path)])
+  })
+
+  it('still strips a linker inside a Collection whose sidecar doesn’t parse', async () => {
+    const a = await linker('Cites', '[[Target]]')
+    await writeFile(join(dir, '_pagecollection.json'), '{ not json')
+    await refreshTree(root)
+    const r = await deleteCascade(root, target(), ['Notes/Target.md'])
+    expect(await fmOf(a.path)).not.toHaveProperty('Related')
+    expect(r.links).toEqual([{ page: a.id, property: related, value: '[[Target]]' }])
+  })
+
   it('never sweeps a page under a deleted folder', async () => {
     const gone = await set(dir, 'Gone')
     const inner = await linker('Inner', '[[Inner]]', gone)
@@ -782 +823 @@ describe('deleteCascade', () => {
     },
   )
 
-  it('a linker whose frontmatter can’t round-trip is listed unparsed, never swept, and left as it is', async () => {
+  it('a linker whose frontmatter can’t round-trip is listed unparsed, refused by the sweep, and left as it is', async () => {
     const broken = join(dir, 'Broken.md')
     const content =
       '---\nID: 01KVGMT8BFP350FZZXAMG1QDVY\nRelated: "[[Target]]"\nsomething: *word\n---\nb'
@@ -795 +836 @@ describe('deleteCascade', () => {
       kind: 'page',
       reason: 'unparsed',
     })
-    expect(sweptFiles()).not.toContain(broken)
+    expect((await sweepSpy.mock.results[0]?.value)?.refused).toEqual([broken])
     expect(r).toEqual({ cascade: { pages: [], hosts: [] }, links: [] })
     expect(await readFile(broken, 'utf8')).toBe(content)
   })
```

##### Core/Nexus/configReach.test.ts

```/Core/Nexus/configReach.test.ts diff
@@ -10 +10 @@ import { readNexus } from './readNexus'
 import { closeSession, openSession } from './session'
 import './settle'
 import { stabilize } from './treeStabilize'
-import { goneEdit, propertyClear, reachConfig, reachReport } from './configReach'
+import { goneContainers, goneEdit, propertyClear, reachConfig, reachReport } from './configReach'
 import { unsweptLine } from '../Properties/governedSweep'
 
 vi.mock('./liveTree', async (importOriginal) => {
@@ -95 +95 @@ const spaceTiles = (): string => join(space(), TILE_DOC_FILENAME)
 const homeTiles = (): string => join(homepageDir(root), TILE_DOC_FILENAME)
 const matrixFile = (): string => nexusConfig(root, NEXUS_CONFIG_FILES.matrix)
 const settingsFile = (): string => nexusConfig(root, NEXUS_CONFIG_FILES.settings)
+const archivedFile = (collectionId: string, chain: string): string =>
+  join(
+    root,
+    `.nexus/archive/${collectionId}/${chain}/2026-10-20T12-00-00-000Z__Old.archived/Old`,
+    SIDECAR_FILENAME.set,
+  )
 
 const viewsOf = async (file: string): Promise<Raw[]> => (await readJsonAt(file)).views as Raw[]
 const tileViews = async (id: string): Promise<Raw[]> => {
@@ -190 +196 @@ describe('an option rename', () => {
     })
   })
 
+  it('reaches an archived Set’s sidecar as it reaches a live one', async () => {
+    const archived = archivedFile('col_notes', 'Notes')
+    await putJson(archived, { id: 'set_old', views: [rich('view_o')] })
+    await reachConfig(root, rename)
+    const idAside = (view: Raw): Raw => ({ ...view, id: '', name: '' })
+    expect(idAside((await viewsOf(archived))[0])).toEqual(idAside((await viewsOf(setFile()))[0]))
+    expect((await viewsOf(archived))[0]).not.toEqual(rich('view_o'))
+  })
+
   it('leaves the keys a view holds under another grouping, and an entry it cannot read', async () => {
     await reachConfig(root, rename)
     const [, kept, foreign] = await viewsOf(colFile())
@@ -345 +360 @@ describe('what the pass skips', () => {
     expect((await reachConfig(root, rename)).skipped).toBe(1)
   })
 
+  it.skipIf(noModeBits)('counts an archived Set’s sidecar it can’t read as one skip', async () => {
+    const archived = archivedFile('col_notes', 'Notes')
+    await putJson(archived, { id: 'set_old', views: [rich('view_o')] })
+    await chmod(archived, 0o000)
+    try {
+      expect((await reachConfig(root, rename)).skipped).toBe(1)
+    } finally {
+      await chmod(archived, 0o644)
+    }
+  })
+
   it('leaves a corrupt sidecar’s bytes and holds nothing owed for it', async () => {
     await writeFile(setFile(), '{ not json')
     expect((await reachConfig(root, rename)).skipped).toBe(0)
@@ -417 +443 @@ describe('a pass scoped under one Collection', () => {
     expect(await previewRules()).toEqual(untouched)
   })
 
+  it('edits the Collection’s whole Archive and a tile sourcing an archived Set, and leaves another Collection’s Archive', async () => {
+    const archived = archivedFile('col_notes', 'Old Name')
+    const foreign = archivedFile('col_other', 'Other')
+    await putJson(archived, { id: 'set_old', views: [rich('view_o')] })
+    await putJson(foreign, { id: 'set_foreign', views: [rich('view_f')] })
+    await putJson(spaceTiles(), {
+      tiles: [
+        { id: 't_old', type: 'view', views: [{ source_id: 'set_old', config: rich('tv_old') }] },
+      ],
+    })
+    const untouched = await readFile(foreign, 'utf8')
+    await reachConfig(root, clear, col())
+    expect((await viewsOf(archived))[0].group).toEqual({ kind: 'structural' })
+    expect((await tileViews('t_old'))[0].group).toEqual({ kind: 'structural' })
+    expect(await readFile(foreign, 'utf8')).toBe(untouched)
+  })
+
   it('edits only the views of a tile that source the Collection', async () => {
     await putJson(spaceTiles(), {
       tiles: [
@@ -595 +638 @@ describe('a gone edit', () => {
     })
   })
 
+  it('goneContainers names each id as a gone location', async () => {
+    await reachConfig(root, goneContainers(['set_gone', 'set_sub']))
+    expect((await viewsOf(setFile()))[0].filter).toEqual({ match: 'all', rules: strippedRules })
+    expect((await tileViews('t_deep'))[0].group_order).toEqual(['set_keep'])
+  })
+
   it('leaves a tile view sourced from a gone container as written', async () => {
     await reachConfig(root, setGone)
     const tiles = (await readJsonAt(spaceTiles())).tiles as Raw[]
```

##### Core/Nexus/fileEvents.test.ts

```/Core/Nexus/fileEvents.test.ts diff
@@ -13 +13 @@ import { getHeldAssetMap, liveAssetMap } from '../Assets/assetMap'
 import { applyEvents, classifyEvent, owedFor } from './fileEvents'
 import { settleBatch, settleNow } from './settle'
 import { handleMutate } from './mutate'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 import type { Changed, FileEvent } from '../Files/writeEcho'
 import type { CollectionNode, NexusTree, SetNode } from './tree'
-import { findContainerWhere } from './treePatch'
+import { containerAt } from './treePatch'
 import { noteExternalEdit } from '../Pages/fileHistory'
 import { closeSession, openSession } from './session'
 import { installStores, NO_STORES } from '../Platform/stores'
@@ -1289 +1289 @@ describe('the walk and the sidecar event agree on a container', () => {
     }
   const notes = (): CollectionNode | SetNode | null => {
     const tree = heldTreeOf(root)
-    return tree ? findContainerWhere(tree, (n) => n.path === 'Notes') : null
+    return tree ? containerAt(tree, 'Notes') : null
   }
 
   beforeEach(async () => {
```

##### Core/Nexus/handlers.test.ts

```/Core/Nexus/handlers.test.ts diff
@@ -13 +13 @@ import { currentStatus } from '../Sync/Client/status'
 import { tempRoot, readJsonAt } from '../Testing/hostFs'
 import { memoryStores } from '../Testing/memoryStores'
 import { seedContentIndex } from '../Index/indexSeed'
+import * as indexSeedModule from '../Index/indexSeed'
+import * as refileModule from '../Archive/refile'
+import { jsonText, pathExists } from '../Files/atomicWrite'
 import { type HubHost, hubHost } from '../Testing/syncHub'
 import { nexusHandlers, openNexusSequence } from './handlers'
 import { dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
@@ -472 +475 @@ describe('openNexusSequence', () => {
       expect(await readFile(linker, 'utf8')).toContain('[[Archive/Notes|Notes]] and [[Notes]]'),
     )
   })
+  it('an open sweeps an Orphaned Archive into the Trash before the index seeds', async () => {
+    const archive = join(root, '.nexus', 'archive', SHELF)
+    const bundle = join(archive, 'Gone', '2026-10-20T00-00-00-000Z__Orphan.md.archived')
+    await mkdir(bundle, { recursive: true })
+    await writeFile(join(bundle, 'Orphan.md'), `---\nID: ${THIRD_PAGE}\n---\norphan\n`)
+    await writeFile(
+      join(bundle, '_record.json'),
+      jsonText({ entity: 'page', parent: { kind: 'container', id: HOME } }),
+    )
+    const real = indexSeedModule.seedContentIndex
+    let heldAtSeed: boolean | undefined
+    vi.spyOn(indexSeedModule, 'seedContentIndex').mockImplementation(async (r) => {
+      heldAtSeed ??= await pathExists(archive)
+      return real(r)
+    })
+    await openNexusSequence(ctx, root, false)
+    expect(heldAtSeed).toBe(false)
+    expect(await pathExists(join(root, '.trash', 'Gone'))).toBe(true)
+  })
+
+  it('a failing open pass leaves the open whole', async () => {
+    vi.spyOn(refileModule, 'settleArchives').mockRejectedValueOnce(new Error('unreadable'))
+    const seeded = vi.spyOn(indexSeedModule, 'seedContentIndex')
+    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
+    await openNexusSequence(ctx, root, false)
+    expect(seeded).toHaveBeenCalledWith(root)
+    expect(logged).toHaveBeenCalledWith('archive: the open pass failed:', 'unreadable')
+    expect(heldTreeOf(root)?.collections[0]?.pages[0]?.id).toBe(NOTES)
+  })
+})
+
+describe('index:headings', () => {
+  it('answers every page’s headings but an archived page’s', async () => {
+    const bundle = '.nexus/archive/col-lib/Library/2026-10-20T12-00-00-000Z__Arc.md.archived'
+    const archived = `${bundle}/Arc.md`
+    await writeFile(join(root, 'Library', 'Notes.md'), `---\nID: ${NOTES}\n---\n\n## Setup\n`)
+    await mkdir(join(root, bundle), { recursive: true })
+    await writeFile(join(root, archived), `---\nID: ${THIRD_PAGE}\n---\n\n## Setup\n`)
+    await openNexusSequence(ctx, root, false)
+
+    const all = await nexusHandlers['index:headings'](ctx, undefined)
+    expect(all.ok && Object.keys(all.value)).toEqual(['Library/Notes.md'])
+    expect(await nexusHandlers['index:headings'](ctx, [archived])).toEqual({ ok: true, value: {} })
+  })
 })
 
 describe('path:copy', () => {
```

##### Core/Nexus/heldPages.test.ts

```/Core/Nexus/heldPages.test.ts diff
@@ -1 +1 @@
-import { join } from '../Paths/posix'
-import { beforeEach, describe, expect, it, vi } from 'vitest'
+import { mkdir, rm, writeFile } from 'node:fs/promises'
+import { dirname, join } from '../Paths/posix'
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import type { NexusTree } from './tree'
-import { liveIdIndex, liveIdOf, livePathOf } from './heldPages'
+import { liveIdIndex, liveIdOf, livePathOf, nexusPages } from './heldPages'
+import { pagesOf } from './record'
+import { buildPageIndex } from '../Connections/pageIndex'
+import { tempRoot } from '../Testing/hostFs'
+import { installStores, NO_STORES } from '../Platform/stores'
+import { memoryStores } from '../Testing/memoryStores'
+import { indexWrittenPage } from '../Index/indexSeed'
+import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
 
 const held = { tree: null as NexusTree | null }
-vi.mock('./liveTree', () => ({
+vi.mock('./liveTree', async (importOriginal) => ({
+  ...(await importOriginal<typeof import('./liveTree')>()),
   heldTreeOf: (root: string) => (held.tree?.nexus.rootPath === root ? held.tree : null),
 }))
 
@@ -16 +25 @@ const tree = (rootPath: string): NexusTree =>
     collections: [
       {
         kind: 'collection',
+        id: 'cN',
         path: 'Notes',
         pages: [{ kind: 'page', id: 'pA', title: 'A', path: 'Notes/A.md' }],
         sets: [
           {
             kind: 'set',
+            id: 'sD',
             path: 'Notes/Deep',
             pages: [{ kind: 'page', id: 'pD', title: 'D', path: 'Notes/Deep/D.md' }],
             sets: [],
@@ -29 +40 @@ const tree = (rootPath: string): NexusTree =>
       },
       {
         kind: 'collection',
+        id: 'cI',
         path: 'Ideas',
         pages: [{ kind: 'page', id: 'pI', title: 'I', path: 'Ideas/I.md' }],
         sets: [],
       },
     ],
+    config: { excluded: [], assetDirectory: ASSETS_DIR_REL },
   }) as unknown as NexusTree
 
 beforeEach(() => {
@@ -70 +83 @@ describe('the held tree’s pages', () => {
     expect(livePathOf(ROOT, 'pA')).toBeNull()
   })
 })
+
+describe('nexusPages — the tree and the Archive by id', () => {
+  let root: string
+  const PO = '01KVGMT8BFP350FZZXAMG1QARC'
+  const TWIN = '01KVGMT8BFP350FZZXAMG1QTWN'
+  const OLD = '.nexus/archive/cN/Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md'
+  const archive = async (rel: string, id: string): Promise<void> => {
+    const file = join(root, rel)
+    await mkdir(dirname(file), { recursive: true })
+    await writeFile(file, `---\nID: ${id}\n---\nb\n`)
+    await indexWrittenPage(root, file)
+  }
+  const copyOfA = (t: NexusTree): NexusTree => {
+    t.collections[0].pages.push({
+      kind: 'page',
+      id: 'pA',
+      title: 'A copy',
+      path: 'Notes/A copy.md',
+    })
+    return t
+  }
+
+  beforeEach(async () => {
+    root = tempRoot('pom-nexuspages-')
+    await mkdir(join(root, '.nexus'), { recursive: true })
+    installStores(memoryStores().stores)
+    await archive(OLD, PO)
+  })
+  afterEach(async () => {
+    installStores(NO_STORES)
+    await rm(root, { recursive: true, force: true })
+  })
+
+  it('holds every entity the tree holds and every archived page, the archived one at the path a writer opens', async () => {
+    const { byId } = await nexusPages(root, tree(root))
+    expect(byId.get(PO)).toEqual({ id: PO, kind: 'page', title: 'Old', path: OLD })
+    expect(byId.get('cN')).toEqual({ id: 'cN', kind: 'collection', path: 'Notes' })
+    expect(byId.get('sD')).toEqual({ id: 'sD', kind: 'set', path: 'Notes/Deep' })
+    expect(byId.get('pD')).toEqual({ id: 'pD', kind: 'page', title: 'D', path: 'Notes/Deep/D.md' })
+  })
+
+  it('answers each archived page at the path it left, where a path key naming its chain resolves', async () => {
+    const t = tree(root)
+    const { archived } = await nexusPages(root, t)
+    expect(archived).toEqual([{ id: PO, title: 'Old', path: 'Notes/Old.md' }])
+    expect(buildPageIndex([...pagesOf(t), ...archived]).resolve('Notes/Old').page?.id).toBe(PO)
+  })
+
+  it('marks an id two files claim null, within the tree, within the Archive, or across them', async () => {
+    await archive('.nexus/archive/cN/Notes/2026-10-20T12-00-00-000Z__Twin.md.archived/Twin.md', PO)
+    await archive('.nexus/archive/cI/2026-10-20T12-00-00-000Z__T.md.archived/T.md', TWIN)
+    const t = copyOfA(tree(root))
+    t.collections[1].pages.push({ kind: 'page', id: TWIN, title: 'T', path: 'Ideas/T.md' })
+    const { byId } = await nexusPages(root, t)
+    expect(byId.get('pA')).toBeNull()
+    expect(byId.get(PO)).toBeNull()
+    expect(byId.get(TWIN)).toBeNull()
+    expect(byId.get('pD')?.path).toBe('Notes/Deep/D.md')
+  })
+
+  it('reads the Archive off disk while the open store’s index was never marked ready', async () => {
+    const LATE = '.nexus/archive/cN/2026-10-20T12-00-00-000Z__Late.md.archived/Late.md'
+    await mkdir(dirname(join(root, LATE)), { recursive: true })
+    await writeFile(join(root, LATE), `---\nID: ${TWIN}\n---\nb\n`)
+    expect((await nexusPages(root, tree(root))).byId.get(TWIN)?.path).toBe(LATE)
+  })
+
+  it('reads the Archive off disk where no index store opened', async () => {
+    const indexed = await nexusPages(root, tree(root))
+    installStores(NO_STORES)
+    expect(await nexusPages(root, tree(root))).toEqual(indexed)
+  })
+})
```

##### Core/Nexus/mutate.test.ts

```/Core/Nexus/mutate.test.ts diff
@@ -48 +48 @@ import { setWriteTap } from '../Files/writeEcho'
 import { readFileSync } from 'node:fs'
 import { createProperty } from '../Properties/registryProperty'
 import { liveAssetMap, resolveAssetName } from '../Assets/assetMap'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 import type { HostContext } from '../Contract/handlers'
 import { installStores, NO_STORES } from '../Platform/stores'
 import { memoryStores } from '../Testing/memoryStores'
@@ -62 +62 @@ import { seedContentIndex } from '../Index/indexSeed'
 import { createTile, readMarkdownTile, writeMarkdownTile } from '../Tiles/tilesFile'
 import { landedId } from '../Testing/tileLayouts'
 import { lockContention } from '../Testing/machines'
-import { listBundles } from '../Trash/holdings'
+import { listBundles } from '../Bundles/bundle'
 import { fault, ok } from '../Contract/result'
 import { nexusHandlers } from './handlers'
+import { setCollectionOrder, setSpaceOrder } from './reorder'
 import { updatePageMetadata } from './pageMetadata'
 
 let root: string
@@ -645 +646 @@ describe('handleMutate — delete', () => {
     expect(trashToSystem).toHaveBeenCalledOnce()
     expect(trashToSystem.mock.calls[0][0]).toContain('Beta.md')
   })
+
+  const stateOrder = async (): Promise<Record<string, unknown>> =>
+    (await readJson('.nexus/state.json')).order as Record<string, unknown>
+
+  it('a page delete drops its id from the source folder’s page_order, in either Trash Mode', async () => {
+    await writeFile(
+      join(root, 'Notes', 'Daily', '_pageset.json'),
+      JSON.stringify({ id: 'col', page_order: [B_ID, A_ID] }),
+    )
+    await refreshTree(root)
+    await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' },
+      nexusDeps,
+    )
+    expect((await readJson('Notes/Daily/_pageset.json')).page_order).toEqual([A_ID])
+    await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
+      { trashMode: 'system', trashToSystem: (p) => rm(p, { force: true }) },
+    )
+    expect('page_order' in (await readJson('Notes/Daily/_pageset.json'))).toBe(false)
+  })
+
+  it('a Set delete drops its id from the source container’s set_order, and the key with its last id', async () => {
+    await writeFile(
+      join(root, 'Notes', '_pagecollection.json'),
+      JSON.stringify({ id: 'pt', set_order: ['col'] }),
+    )
+    await refreshTree(root)
+    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
+    expect('set_order' in (await readJson('Notes/_pagecollection.json'))).toBe(false)
+  })
+
+  it('a Collection delete drops its id from state.json’s order.collections', async () => {
+    await mkdir(join(root, 'Other'), { recursive: true })
+    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'oth' }))
+    await setCollectionOrder(root, ['oth', 'pt'])
+    await refreshTree(root)
+    await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
+    expect((await stateOrder()).collections).toEqual(['oth'])
+  })
+
+  it('a Space delete drops its id from its Context’s order in state.json', async () => {
+    await seedTwoContexts()
+    await seedSpaceSidecar(root, 'Projects', 'Atlas', { id: 'sp-atlas' })
+    await setSpaceOrder(root, 'ctxP', ['sp-atlas', 'sp-pom'])
+    await refreshTree(root)
+    await settledMutate(
+      root,
+      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
+      nexusDeps,
+    )
+    expect((await stateOrder()).spaces).toEqual({ ctxP: ['sp-atlas'] })
+  })
 })
 
 describe('handleMutate — sync tap', () => {
@@ -2768 +2824 @@ describe('the Contexts lock', () => {
 
       it(`a page value written while a ${entity} restore stands ${when === 'before' ? 'after its move' : 'after its re-tag'} lands, and the tag is back`, async () => {
         expect((await settledMutate(root, op, nexusDeps)).ok).toBe(true)
-        const [bundle] = await listBundles(root)
+        const [bundle] = await listBundles(root, { kind: 'trash' })
         await valueDuring(
           { op: 'restore', bundlePath: bundle.bundlePath },
           () =>
@@ -3273 +3329 @@ describe('handleMutate — excluded entries follow their folders', () => {
     expect(push.mock.calls.map(([name]) => name)).toContain('nexus:changed')
   })
 
+  it('writes a carried entry beside its source before the folder moves, and drops the source before Sync hears of the rename', async () => {
+    await exclude(['Archive', 'Notes/Daily/Old'])
+    const settings = join(root, '.nexus', 'settings.json')
+    const to = join(root, 'Journal')
+    const seen: [string, unknown][] = []
+    const note = (at: string): void => {
+      seen.push([at, JSON.parse(readFileSync(settings, 'utf8')).excluded_folders])
+    }
+    setWriteTap({
+      wrote: (path) => {
+        if (path === settings) note('settings write')
+        if (path === to) note('move')
+      },
+      renamed: () => note('renamed'),
+    })
+    try {
+      const r = await settledMutate(
+        root,
+        { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journal' },
+        nexusDeps,
+      )
+      expect(r.ok).toBe(true)
+    } finally {
+      setWriteTap(null)
+    }
+    const both = ['Archive', 'Journal/Daily/Old', 'Notes/Daily/Old']
+    expect(seen).toEqual([
+      ['settings write', ['Archive', 'Notes/Daily/Old']],
+      ['move', both],
+      ['settings write', both],
+      ['renamed', ['Archive', 'Journal/Daily/Old']],
+    ])
+  })
+
+  it('keeps the landed spelling, as one entry, through a case-only rename', async () => {
+    await exclude(['Notes/Daily/Old'])
+    const r = await settledMutate(
+      root,
+      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'notes' },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect(await excludedOnDisk()).toEqual(['notes/Daily/Old'])
+  })
+
+  it('a carried landing restarts the watcher once and seeds nothing twice', async () => {
+    await exclude(['Notes/Daily/Old'])
+    const seed = vi.spyOn(indexSeed, 'seedContentIndex')
+    const watch = vi.fn(async () => {})
+    const r = await handleMutate(
+      root,
+      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journal' },
+      nexusDeps,
+    )
+    await settleNow({ push: () => {}, watch }, root)
+    expect(r.ok).toBe(true)
+    expect(watch).toHaveBeenCalledTimes(1)
+    expect(seed).not.toHaveBeenCalled()
+    seed.mockRestore()
+  })
+
   it('refuses a landing that carries excluded entries while settings.json can’t be written', async () => {
     await mkdir(join(root, 'Notes', 'Private'), { recursive: true })
     await mkdir(join(root, 'Other'), { recursive: true })
@@ -3297 +3414 @@ describe('handleMutate — excluded entries follow their folders', () => {
     expect(landed.ok).toBe(true)
   })
 
-  it('refuses a Set moved, or a Collection restored, with excluded entries while settings.json can’t be written', async () => {
+  it('refuses a Set moved with excluded entries while settings.json can’t be written', async () => {
     await mkdir(join(root, 'Notes', 'Daily', 'Private'), { recursive: true })
-    await mkdir(join(root, 'Other', 'Kept', 'Private'), { recursive: true })
-    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
-    await writeFile(join(root, 'Other', 'Kept', '_pageset.json'), JSON.stringify({ id: 'ok' }))
     await mkdir(join(root, 'Third'))
     await writeFile(join(root, 'Third', '_pagecollection.json'), JSON.stringify({ id: 'th' }))
-    await exclude(['Notes/Daily/Private', 'Other/Kept/Private'])
-    const deleted = await settledMutate(
-      root,
-      { op: 'delete', path: 'Other', kind: 'collection' },
-      nexusDeps,
-    )
-    const bundlePath = (deleted.ok && deleted.value.trashed?.bundlePath) || ''
-    await refreshTree(root)
+    await exclude(['Notes/Daily/Private'])
     await writeFile(join(root, '.nexus', 'settings.json'), '{ corrupt')
     const moved = await settledMutate(
       root,
@@ -3319 +3426 @@ describe('handleMutate — excluded entries follow their folders', () => {
       nexusDeps,
     )
     expect(moved.ok ? '' : moved.error.message).toContain('settings.json')
-    const restored = await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)
-    expect(restored.ok ? '' : restored.error.message).toContain('settings.json')
     expect(await pathExists(join(root, 'Notes', 'Daily', 'Private'))).toBe(true)
-    expect(await pathExists(join(root, 'Other'))).toBe(false)
     const reordered = await settledMutate(
       root,
       { op: 'moveSet', path: 'Notes/Daily', newParentPath: 'Notes', order: [] },
@@ -3331 +3435 @@ describe('handleMutate — excluded entries follow their folders', () => {
     expect(reordered.ok).toBe(true)
   })
 
-  it('takes a trashed Collection’s entries with it and lands them wherever it is restored', async () => {
+  it('a Collection restores under an unreadable settings.json, writing no settings', async () => {
+    await mkdir(join(root, 'Other', 'Kept', 'Private'), { recursive: true })
+    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
+    await writeFile(join(root, 'Other', 'Kept', '_pageset.json'), JSON.stringify({ id: 'ok' }))
+    await exclude(['Other/Kept/Private'])
+    const deleted = await settledMutate(
+      root,
+      { op: 'delete', path: 'Other', kind: 'collection' },
+      nexusDeps,
+    )
+    const bundlePath = (deleted.ok && deleted.value.bundled?.bundlePath) || ''
+    expect(await pathExists(join(root, 'Private'))).toBe(true)
+    expect(await excludedOnDisk()).toEqual(['Private'])
+    await refreshTree(root)
+    await writeFile(join(root, '.nexus', 'settings.json'), '{ corrupt')
+    const restored = await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)
+    expect(restored.ok).toBe(true)
+    expect(await pathExists(join(root, 'Other', 'Kept', '_pageset.json'))).toBe(true)
+    expect(await pathExists(join(root, 'Other', 'Kept', 'Private'))).toBe(false)
+    expect(await pathExists(join(root, 'Private'))).toBe(true)
+    expect(await read('.nexus/settings.json')).toBe('{ corrupt')
+  })
+
+  it('lifts a trashed Collection’s excluded folder to the root, its entry following, and restores the Collection without it', async () => {
     await mkdir(join(root, 'Other', 'Daily'), { recursive: true })
     await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
     await writeFile(join(root, 'Other', 'Daily', '_pageset.json'), JSON.stringify({ id: 'od' }))
@@ -3341 +3468 @@ describe('handleMutate — excluded entries follow their folders', () => {
       { op: 'delete', path: 'Other', kind: 'collection' },
       nexusDeps,
     )
-    const bundlePath = deleted.ok ? deleted.value.trashed?.bundlePath : undefined
-    expect(bundlePath).toBeDefined()
-    expect(await excludedOnDisk()).toBeUndefined()
-    await settledMutate(
+    const bundlePath = deleted.ok ? (deleted.value.bundled?.bundlePath ?? '') : ''
+    expect(await readJson('Daily/_pageset.json')).toEqual({ id: 'od' })
+    expect(await excludedOnDisk()).toEqual(['Daily'])
+    expect(await readdir(join(root, bundlePath, 'Other'))).toEqual(['_pagecollection.json'])
+    expect('excluded' in (await readJson(`${bundlePath}/_record.json`))).toBe(false)
+    const r = await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)
+    expect(r).toEqual({ ok: true, value: {} })
+    expect(await readdir(join(root, 'Other'))).toEqual(['_pagecollection.json'])
+    expect(await excludedOnDisk()).toEqual(['Daily'])
+    expect(
+      heldTreeOf(root)
+        ?.collections.map((c) => c.path)
+        .sort(),
+    ).toEqual(['Notes', 'Other'])
+  })
+
+  it('a Collection delete whose move fails puts the lifted folder and its entry back', async () => {
+    await mkdir(join(root, 'Other', 'Daily'), { recursive: true })
+    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
+    await writeFile(join(root, 'Other', 'Daily', '_pageset.json'), JSON.stringify({ id: 'od' }))
+    await exclude(['Other/Daily'])
+    const relocate = atomicWrite.relocate
+    const fails = vi
+      .spyOn(atomicWrite, 'relocate')
+      .mockImplementationOnce(relocate)
+      .mockRejectedValueOnce(new Error('the move failed'))
+    const deleted = await settledMutate(
       root,
-      { op: 'createContainer', id: newId(), parentPath: '', kind: 'collection', name: 'Other' },
+      { op: 'delete', path: 'Other', kind: 'collection' },
       nexusDeps,
     )
-    await writeFile(
-      join(root, '.nexus', 'settings.json'),
-      JSON.stringify({ excluded_folders: ['Other/Drafts'] }),
-    )
-    await refreshTree(root)
-    const r = await settledMutate(root, { op: 'restore', bundlePath: bundlePath ?? '' }, nexusDeps)
-    expect(r).toEqual({ ok: true, value: {} })
-    expect(await excludedOnDisk()).toEqual(['Other/Drafts', 'Other (2)/Daily'])
+    fails.mockRestore()
+    expect(deleted.ok).toBe(false)
+    expect(await readJson('Other/Daily/_pageset.json')).toEqual({ id: 'od' })
+    expect(await pathExists(join(root, 'Daily'))).toBe(false)
+    expect(await excludedOnDisk()).toEqual(['Other/Daily'])
   })
 
-  it('reports a Collection delete and its restore to Sync as one rename each, the restore after its entries hold again', async () => {
+  it('reports the lift, the Collection delete, and its restore to Sync as one rename each, every one under settings already excluding the lifted folder', async () => {
     await mkdir(join(root, 'Other', 'Daily'), { recursive: true })
     await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
     await writeFile(join(root, 'Other', 'Daily', '_pageset.json'), JSON.stringify({ id: 'od' }))
@@ -3388 +3535 @@ describe('handleMutate — excluded entries follow their folders', () => {
         nexusDeps,
       )
       expect(deleted.ok).toBe(true)
-      expect(renames).toHaveLength(1)
-      const bundled = renames[0].to
-      expect(renames[0].from).toBe(folder)
+      expect(renames).toHaveLength(2)
+      const bundled = renames[1].to
+      expect(renames[1].from).toBe(folder)
       expect(bundled.endsWith('.deleted/Other')).toBe(true)
       await refreshTree(root)
-      const bundlePath = deleted.ok ? (deleted.value.trashed?.bundlePath ?? '') : ''
+      const bundlePath = deleted.ok ? (deleted.value.bundled?.bundlePath ?? '') : ''
       const restored = await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)
       expect(restored.ok).toBe(true)
       expect(renames.map(({ from, to }) => [from, to])).toEqual([
+        [join(folder, 'Daily'), join(root, 'Daily')],
         [folder, bundled],
         [bundled, folder],
       ])
-      expect(renames[1].excluded).toEqual(['Other/Daily'])
+      expect(renames.map(({ excluded }) => excluded)).toEqual([['Daily'], ['Daily'], ['Daily']])
       const inside = (path: string): boolean =>
         path.startsWith(`${folder}/`) || path.startsWith(`${bundled}/`)
-      expect(wrote.filter(inside)).toEqual([])
+      expect(wrote.filter(inside)).toEqual([join(folder, 'Daily')])
     } finally {
       setWriteTap(null)
     }
@@ -3422 +3570 @@ describe('handleMutate — excluded entries follow their folders', () => {
     expect(await excludedOnDisk()).toEqual(['Other/Daily/Old'])
   })
 
+  it('carries the asset directory with a moved Set', async () => {
+    await mkdir(join(root, 'Other'), { recursive: true })
+    await writeFile(join(root, 'Other', '_pagecollection.json'), JSON.stringify({ id: 'ot' }))
+    await mkdir(join(root, 'Notes', 'Daily', 'Media'), { recursive: true })
+    await writeFile(
+      join(root, '.nexus', 'settings.json'),
+      JSON.stringify({ asset_directory: 'Notes/Daily/Media' }),
+    )
+    await refreshTree(root)
+    const r = await settledMutate(
+      root,
+      { op: 'moveSet', path: 'Notes/Daily', newParentPath: 'Other', order: [] },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect((await readJson('.nexus/settings.json')).asset_directory).toBe('Other/Daily/Media')
+    expect(heldTreeOf(root)?.config.assetDirectory).toBe('Other/Daily/Media')
+  })
+
+  it('restores the settings it carried when the folder move throws, so the walk never stamps the asset folder', async () => {
+    await mkdir(join(root, 'Notes', 'Media'), { recursive: true })
+    await writeFile(join(root, 'Notes', 'Media', 'Pic.png'), 'bytes')
+    const before = { excluded_folders: ['Notes/Daily/Old'], asset_directory: 'Notes/Media' }
+    await writeFile(join(root, '.nexus', 'settings.json'), JSON.stringify(before))
+    await refreshTree(root)
+    const m = machine()
+    const rename = m.rename.bind(m)
+    const held = vi.spyOn(m, 'rename').mockImplementation(async (from, to) => {
+      if (from === join(root, 'Notes')) throw new Error('held')
+      return rename(from, to)
+    })
+    try {
+      const r = await settledMutate(
+        root,
+        { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journal' },
+        nexusDeps,
+      )
+      expect(r.ok).toBe(false)
+    } finally {
+      held.mockRestore()
+    }
+    expect(await readJson('.nexus/settings.json')).toEqual(before)
+    expect(await pathExists(join(root, 'Notes', 'Media', '_pageset.json'))).toBe(false)
+  })
+
+  it('re-keys a crop to the asset’s new path through a rename and a trash of the container holding the asset directory', async () => {
+    await mkdir(join(root, 'Notes', 'Daily', 'Media'), { recursive: true })
+    await writeFile(join(root, 'Notes', 'Daily', 'Media', 'Pic.png'), 'bytes')
+    await writeFile(
+      join(root, '.nexus', 'settings.json'),
+      JSON.stringify({ asset_directory: 'Notes/Daily/Media' }),
+    )
+    const crop = { x: 0.3, y: 0.4, zoom: 1.5 }
+    await mkdir(join(root, '.nexus', 'assets'), { recursive: true })
+    await writeFile(
+      join(root, '.nexus', 'assets', 'crops.json'),
+      JSON.stringify({ byImage: { 'Notes/Daily/Media/Pic.png': crop } }),
+    )
+    await refreshTree(root)
+    const cropKeys = async (): Promise<unknown> =>
+      (await readJson('.nexus/assets/crops.json')).byImage
+    const renamed = await settledMutate(
+      root,
+      { op: 'rename', path: 'Notes', kind: 'collection', newName: 'Journal' },
+      nexusDeps,
+    )
+    expect(renamed.ok).toBe(true)
+    expect(await cropKeys()).toEqual({ 'Journal/Daily/Media/Pic.png': crop })
+    const trashed = await settledMutate(
+      root,
+      { op: 'delete', path: 'Journal/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    expect(trashed.ok).toBe(true)
+    expect(await cropKeys()).toEqual({ 'Journal/Media/Pic.png': crop })
+  })
+
+  it('steps a lifted folder aside past every name its parent holds, the Set’s own among them, and the Set’s restore keeps its name', async () => {
+    for (const rel of ['Omega', 'Daily/Omega', 'Daily/Daily'])
+      await mkdir(join(root, 'Notes', rel), { recursive: true })
+    await exclude(['Notes/Omega', 'Notes/Daily/Omega', 'Notes/Daily/Daily'])
+    const deleted = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    const bundlePath = deleted.ok ? (deleted.value.bundled?.bundlePath ?? '') : ''
+    expect(await excludedOnDisk()).toEqual(['Notes/Omega', 'Notes/Omega (2)', 'Notes/Daily (2)'])
+    for (const rel of ['Omega', 'Omega (2)', 'Daily (2)'])
+      expect(await pathExists(join(root, 'Notes', rel))).toBe(true)
+    const restored = await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)
+    expect(restored.ok).toBe(true)
+    expect(await pathExists(join(root, 'Notes', 'Daily', 'Alpha.md'))).toBe(true)
+  })
+
+  it('lifts only the outermost of nested excluded folders, the inner one riding inside it', async () => {
+    await mkdir(join(root, 'Notes', 'Daily', 'Gamma', 'Omega', 'Deep'), { recursive: true })
+    await exclude(['Notes/Daily/Gamma/Omega', 'Notes/Daily/Gamma/Omega/Deep'])
+    const r = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect(await pathExists(join(root, 'Notes', 'Omega', 'Deep'))).toBe(true)
+    expect(await excludedOnDisk()).toEqual(['Notes/Omega', 'Notes/Omega/Deep'])
+  })
+
+  it('lifts the asset directory out of a trashed Set, its setting following', async () => {
+    await mkdir(join(root, 'Notes', 'Daily', 'Media'), { recursive: true })
+    await writeFile(join(root, 'Notes', 'Daily', 'Media', 'Pic.png'), 'bytes')
+    await writeFile(
+      join(root, '.nexus', 'settings.json'),
+      JSON.stringify({ asset_directory: 'Notes/Daily/Media' }),
+    )
+    await refreshTree(root)
+    const r = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect(await read('Notes/Media/Pic.png')).toBe('bytes')
+    expect((await readJson('.nexus/settings.json')).asset_directory).toBe('Notes/Media')
+    expect(heldTreeOf(root)?.config.assetDirectory).toBe('Notes/Media')
+  })
+
+  it('lifts under the system Trash Mode too, so the system trash never takes an excluded folder', async () => {
+    await mkdir(join(root, 'Notes', 'Daily', 'Private'), { recursive: true })
+    await writeFile(join(root, 'Notes', 'Daily', 'Private', 'Kept.md'), '# Kept\n')
+    await exclude(['Notes/Daily/Private'])
+    const trashToSystem = vi.fn((p: string) => rm(p, { recursive: true, force: true }))
+    const r = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      { trashMode: 'system', trashToSystem },
+    )
+    expect(r.ok).toBe(true)
+    expect(trashToSystem.mock.calls).toEqual([[join(root, 'Notes', 'Daily')]])
+    expect(await read('Notes/Private/Kept.md')).toBe('# Kept\n')
+    expect(await excludedOnDisk()).toEqual(['Notes/Private'])
+  })
+
+  it('lifts an excluded folder and the asset directory spelled apart only by case once', async () => {
+    await mkdir(join(root, 'Notes', 'Daily', 'Media'), { recursive: true })
+    await writeFile(join(root, 'Notes', 'Daily', 'Media', 'Pic.png'), 'bytes')
+    await writeFile(
+      join(root, '.nexus', 'settings.json'),
+      JSON.stringify({
+        excluded_folders: ['Notes/Daily/Media'],
+        asset_directory: 'Notes/Daily/media',
+      }),
+    )
+    await refreshTree(root)
+    const r = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect(await read('Notes/Media/Pic.png')).toBe('bytes')
+    expect(await readJson('.nexus/settings.json')).toEqual({
+      excluded_folders: ['Notes/Media'],
+      asset_directory: 'Notes/Media',
+    })
+  })
+
+  it('leaves an entry naming no folder where it stands, lifting nothing for it', async () => {
+    await exclude(['Notes/Daily/Gone'])
+    const r = await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect(await excludedOnDisk()).toEqual(['Notes/Daily/Gone'])
+    expect(await pathExists(join(root, 'Notes', 'Gone'))).toBe(false)
+  })
+
   it('writes nothing for a rename no entry sits under', async () => {
     await exclude(['Archive'])
     const before = await read('.nexus/settings.json')
```

##### Core/Nexus/mutateRequest.test.ts

```/Core/Nexus/mutateRequest.test.ts diff
@@ -1 +1 @@
 import { describe, it, expect } from 'vitest'
-import { mutateRequest } from './mutateRequest'
+import { changesSettled, changesStores, mutateRequest } from './mutateRequest'
 
 describe('mutateRequest — what the window sends is held to the shape before anything is written', () => {
   const read = (raw: unknown): boolean => mutateRequest.safeParse(raw).success
@@ -15 +15 @@ describe('mutateRequest — what the window sends is held to the shape before an
     expect(read({ op: 'createContainer', parentPath: 'A', kind: 'space', name: 'x' })).toBe(false)
     expect(read({ op: 'reorderChildren', parentPath: 'A', key: 'id', order: [] })).toBe(false)
     expect(read({ op: 'rename', path: 'A', kind: 'context', newName: 'B' })).toBe(false)
+    expect(read({ op: 'archive', path: 'A', kind: 'collection' })).toBe(false)
+    expect(read({ op: 'archive', path: 'A', kind: 'page', leaf: 7 })).toBe(false)
+  })
+
+  it('an archive changes what the settle holds and what the stores list', () => {
+    expect(changesSettled('archive')).toBe(true)
+    expect(changesStores({ op: 'archive', path: 'A/B.md', kind: 'page' })).toBe(true)
+  })
+
+  it('a moved Set, a renamed container or Context, re-lists the stores, and a renamed page doesn’t', () => {
+    expect(changesStores({ op: 'moveSet', path: 'A/S', newParentPath: 'B', order: [] })).toBe(true)
+    expect(changesStores({ op: 'rename', path: 'A', kind: 'collection', newName: 'B' })).toBe(true)
+    expect(changesStores({ op: 'rename', path: 'A/S', kind: 'set', newName: 'T' })).toBe(true)
+    expect(changesStores({ op: 'renameContext', contextId: 'c', newName: 'D' })).toBe(true)
+    expect(changesStores({ op: 'rename', path: 'A/B.md', kind: 'page', newName: 'C' })).toBe(false)
   })
 
   it('drops a key the op does not name, so an extra field cannot steer the write', () => {
@@ -28 +43 @@ describe('mutateRequest — what the window sends is held to the shape before an
     expect(parsed).toEqual({ op: 'renameHeading', path: 'a.md', heading: 'H', to: 'I' })
   })
 
+  it('reads an Undo back into the Archive as a destination carrying no id', () => {
+    expect(
+      mutateRequest.parse({
+        op: 'restore',
+        bundlePath: '.trash/A.md.deleted',
+        destination: { kind: 'archive', id: 'x' },
+      }),
+    ).toEqual({
+      op: 'restore',
+      bundlePath: '.trash/A.md.deleted',
+      destination: { kind: 'archive' },
+    })
+  })
+
   it('holds a property value to a value shape and a crop to its numbers', () => {
     expect(read({ op: 'setProperty', path: 'a.md', propertyId: 'p', value: 'raw' })).toBe(false)
     expect(
```

##### Core/Nexus/normalizeSavedViews.test.ts

```/Core/Nexus/normalizeSavedViews.test.ts diff
@@ -38 +38 @@ const viewsIn = async (
 ): Promise<Record<string, unknown>[]> =>
   (await readJsonAt<{ views: Record<string, unknown>[] }>(sidecarAt(dir, kind))).views
 
-// The open sequence: the walk covers the Trash and tile documents, and adoption every container in scope.
+// The open sequence: the walk covers the Trash, the Archive, and tile documents, and adoption every container in scope.
 const open = async (): Promise<void> => {
   await normalizeSavedViews(root)
   await stampAdopted(root)
@@ -78 +78 @@ describe('normalizeSavedViews', () => {
     ])
   })
 
-  it("renames the Table view's old glyph key in sidecars, trashed sidecars, and every tile document", async () => {
+  it("renames the Table view's old glyph key in sidecars, trashed and archived sidecars, and every tile document", async () => {
     await seed('Notes', [
       { ...view('view_a'), icon: 'table' },
       { ...view('view_b'), icon: 'star' },
     ])
     const trashed = join('.trash', 'Old.deleted', 'Old')
     await seed(trashed, [{ ...view('view_t'), icon: 'table' }])
+    const archived = '.nexus/archive/col-notes/Notes/2026-10-20T12-00-00-000Z__Old.archived/Old'
+    await seed(archived, [{ ...view('view_r'), icon: 'table' }], 'set')
     const tileDoc = join(nexusDir(root), 'contexts', 'Areas', 'A', TILE_DOC_FILENAME)
     await mkdir(join(tileDoc, '..'), { recursive: true })
     const tile = (icon: string) => ({ config: { ...view('embed'), icon }, source_id: 's' })
@@ -101 +103 @@ describe('normalizeSavedViews', () => {
     await open()
     expect((await viewsIn('Notes')).map((v) => v.icon)).toEqual(['view-table', 'star'])
     expect((await viewsIn(trashed))[0].icon).toBe('view-table')
+    expect((await viewsIn(archived, 'set'))[0].icon).toBe('view-table')
     type TileDoc = { tiles: { views: { config: { icon: string } }[] }[] }
     const doc = await readJsonAt<TileDoc>(tileDoc)
     expect(doc.tiles[0].views.map((e) => e.config.icon)).toEqual(['view-table', 'star'])
```

##### Core/Nexus/order.test.ts

```/Core/Nexus/order.test.ts diff
@@ -1 +1 @@
 import { describe, it, expect } from 'vitest'
-import { resolveOrder } from './order'
+import { resolveOrder, spliceBeside } from './order'
 
 const mk = (id: string, title: string): { id: string; title: string } => ({ id, title })
 
@@ -19 +19 @@ describe('resolveOrder', () => {
     expect(r.map((x) => x.id)).toEqual(['a'])
   })
 })
+
+describe('spliceBeside', () => {
+  it('appends for a null anchor — the drop that landed past the last visible card', () => {
+    expect(spliceBeside(['a', 'b'], null, 'x', 'above')).toEqual(['a', 'b', 'x'])
+  })
+})
```

##### Core/Nexus/reorder.test.ts

```/Core/Nexus/reorder.test.ts diff
@@ -3 +3 @@ import { rm, readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
 import { join } from '../Paths/posix'
 import { tempRoot, readJsonAt } from '../Testing/hostFs'
 import {
-  dropFromChildOrder,
-  dropSpaceOrder,
+  dropContextOrder,
   setCollectionOrder,
   setSpaceOrder,
   setChildOrder,
@@ -75 +74 @@ describe('setCollectionOrder', () => {
     })
   })
 
-  it('dropSpaceOrder removes the Context’s Space order and leaves the rest', async () => {
+  it('dropContextOrder removes the Context’s panel id and its Space order, leaving the rest', async () => {
     await setSpaceOrder(root, 'ctx_areas', ['x'])
     await setSpaceOrder(root, 'ctx_projects', ['y'])
     await setPanelContextOrder(root, ['ctx_projects', 'ctx_areas'])
-    await dropSpaceOrder(root, 'ctx_projects')
+    await dropContextOrder(root, 'ctx_projects')
     expect((await readState()).order).toEqual({
       spaces: { ctx_areas: ['x'] },
-      contexts: ['ctx_projects', 'ctx_areas'],
+      contexts: ['ctx_areas'],
     })
   })
 
-  it('dropSpaceOrder writes nothing when the Context has no order', async () => {
-    await dropSpaceOrder(root, 'ctx_projects')
+  it('dropContextOrder writes nothing when the Context has no order', async () => {
+    await dropContextOrder(root, 'ctx_projects')
     expect(await pathExists(nexusConfig(root, NEXUS_CONFIG_FILES.state))).toBe(false)
   })
 
@@ -130 +129 @@ describe('setChildOrder', () => {
     expect((await setChildOrder(raw, 'page_order', ['p1'])).ok).toBe(true)
   })
 })
-
-describe('dropFromChildOrder', () => {
-  it('drops the key once its last id leaves, for page and Set order alike', async () => {
-    const c = await createFolderEntity(root, 'collection', 'Notes', newId())
-    if (!c.ok) throw new Error('setup failed')
-    await setChildOrder(c.value.path, 'page_order', ['p1', 'p2'])
-    await setChildOrder(c.value.path, 'set_order', ['s1'])
-    await dropFromChildOrder(c.value.path, 'page_order', 'p1')
-    await dropFromChildOrder(c.value.path, 'set_order', 's1')
-    const raw = await readJsonAt(sidecarPath(c.value.path, 'collection'))
-    expect(raw.page_order).toEqual(['p2'])
-    expect('set_order' in raw).toBe(false)
-    await dropFromChildOrder(c.value.path, 'page_order', 'p2')
-    expect('page_order' in (await readJsonAt(sidecarPath(c.value.path, 'collection')))).toBe(false)
-  })
-})
```

##### Core/Nexus/settle.test.ts

```/Core/Nexus/settle.test.ts diff
@@ -3 +3 @@ import { mkdir, open, readFile, rm, utimes, writeFile } from 'node:fs/promises'
 import { join } from '../Paths/posix'
 import { readJsonAt, tempRoot } from '../Testing/hostFs'
 import { settledMutate } from '../Testing/settledMutate'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 import { assignProperty } from '../Properties/assignment'
 import { createProperty, renameProperty } from '../Properties/registryProperty'
 import { renameOption, setValueFormat } from '../Properties/optionOps'
@@ -25 +25 @@ import { splitEnvelope, splitFrontmatter } from '../Files/pageFile'
 import { ID_KEY } from './identityMark'
 import { stabilize } from './treeStabilize'
 import { applyEvents, oweCascade, owedFor, oweWalk } from './fileEvents'
-import { settleNow, recordHanded, settleBatch } from './settle'
+import { settleNow, recordHanded, returningNames, settleBatch } from './settle'
 import type { NexusChange, NexusTree } from './tree'
 import { applyDelta } from './treeDelta'
 import * as session from './session'
@@ -33 +33 @@ import { closeSession, openSession, whileAdopting } from './session'
 import { writeExcludedFolders } from '../Settings/settings'
 import { installStores, NO_STORES } from '../Platform/stores'
 import { memoryStores } from '../Testing/memoryStores'
+import { buildPageIndex, connPage } from '../Connections/pageIndex'
+import * as bundles from '../Bundles/bundle'
+import { handleMutate } from './mutate'
 
 const sweep = vi.hoisted(() => ({ hold: null as Promise<void> | null, entered: () => {} }))
 vi.mock('../Properties/governedSweep', async (importOriginal) => {
@@ -644 +647 @@ describe('the settle', () => {
     await first
     expect(firstDone).toBe(true)
   })
+
+  it('a carry that throws leaves the settle whole', async () => {
+    await mkdir(abs('Notes', 'Box'))
+    await writeFile(abs('Notes', 'Box', '_pageset.json'), JSON.stringify({ id: ULID_C }))
+    await writeFile(abs('Notes', 'Box', 'B.md'), `---\nID: ${ULID_B}\n---\n\nbeta\n`)
+    await mkdir(abs('Other'))
+    await writeFile(abs('Other', '_pagecollection.json'), JSON.stringify({ id: ULID_D }))
+    shown = recordHanded(await refreshTree(root)).tree
+    const real = bundles.archivedWithin
+    const carry = vi
+      .spyOn(bundles, 'archivedWithin')
+      .mockImplementationOnce(real)
+      .mockRejectedValue(new Error('boom'))
+    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
+    const moved = await handleMutate(
+      root,
+      { op: 'moveSet', path: 'Notes/Box', newParentPath: 'Other', order: [ULID_C] },
+      { trashMode: 'nexus', trashToSystem: async () => {} },
+    )
+    expect(moved.ok).toBe(true)
+    await settleNow(pusher, root)
+    expect(carry).toHaveBeenCalledTimes(2)
+    expect(channels()).toEqual(['nexus:changed', 'values:changed'])
+    expect(logged).toHaveBeenCalledWith('archive: the carry failed:', 'boom')
+  })
 })
 
 describe('an outside batch’s turn', () => {
@@ -1233 +1261 @@ describe('a page created while no watcher listened', () => {
     }
   })
 })
+
+describe('returningNames', () => {
+  const live = buildPageIndex([connPage('A', 'Notes/Alpha.md')])
+  const back = [connPage('B', 'Notes/Daily/Alpha.md')]
+  const after = buildPageIndex([
+    connPage('A', 'Notes/Alpha.md'),
+    connPage('B', 'Notes/Ideas/Alpha.md'),
+  ])
+  const { names, own } = returningNames(live, after, back)
+  const holder = (map: Map<string, string>, key: string) =>
+    after.resolve(map.get(key) ?? '').page?.id
+
+  it('the arrival’s collision re-spells the live page it took a key from', () => {
+    expect(holder(names, 'alpha')).toBe('A')
+  })
+
+  it('a key only the returning page answered follows it', () => {
+    expect(holder(own, 'daily/alpha')).toBe('B')
+    expect(live.resolve('daily/alpha').status).toBe('phantom')
+    expect(holder(names, 'daily/alpha')).toBe('B')
+  })
+
+  it('a key the live world still resolves stays out of the cascade', () => {
+    expect(holder(own, 'alpha')).toBe('B')
+    expect(holder(names, 'alpha')).toBe('A')
+  })
+})
```

##### Core/Nexus/treeIndex.test.ts

```/Core/Nexus/treeIndex.test.ts diff
@@ -11 +11 @@ import {
   searchEntriesOf,
   spaceLinksOf,
 } from './treeIndex'
-import { pageIndexOf, pageMoves, pagesByIdOf, pagesOf, recordById, recordsOf } from './record'
+import { pageIndexOf, pageMoves, pagesByIdOf, pagesOf, recordsOf } from './record'
 
 describe('the record walk', () => {
   it('caches every projection on the tree identity — same tree, same object', () => {
@@ -23 +23 @@ describe('the record walk', () => {
     expect(pageIndexOf(t)).toBe(pageIndexOf(t))
     expect(navKeysOf(t)).toBe(navKeysOf(t))
     expect(recordsOf(t)).toBe(recordsOf(t))
-    expect(recordById(t)).toBe(recordById(t))
   })
 
   it('a different tree object derives fresh projections', () => {
     expect(reconcileIndexOf(makeTree())).not.toBe(reconcileIndexOf(makeTree()))
-    expect(recordById(makeTree())).not.toBe(recordById(makeTree()))
   })
 })
 
@@ -56 +54 @@ describe('reconcileIndexOf', () => {
     })
   })
 
+  it('an archive place holds while its owner is a Collection or a top-level Set, and reconciles to none once the owner is gone or the Set sits deeper', () => {
+    const t = makeTree()
+    t.collections[0].sets?.[0].sets?.push({
+      kind: 'set',
+      id: 's2',
+      title: 'Deep',
+      path: 'Notes/Ideas/Deep',
+      pages: [],
+      sets: [],
+    })
+    const ix = reconcileIndexOf(t)
+    for (const id of ['c1', 's1'])
+      expect(reconcileWith(ix, { kind: 'archive', id })).toEqual({ kind: 'archive', id })
+    for (const id of ['gone', 's2'])
+      expect(reconcileWith(ix, { kind: 'archive', id })).toEqual({ kind: 'none' })
+  })
+
   it('a page whose ID vanished with nothing at its path reconciles to none', () => {
     const ix = reconcileIndexOf(makeTree())
     expect(reconcileWith(ix, { kind: 'page', id: 'gone', path: 'Notes/Gone.md' })).toEqual({
@@ -65 +80 @@ describe('reconcileIndexOf', () => {
 })
 
 describe('resolveIndexOf', () => {
-  it('holds display cores for the homepage, the Matrix, spaces, collections, sets, and pages — never groups', () => {
+  it("holds display cores for the homepage, the Matrix, spaces, collections, sets, pages, and each Collection's and top-level Set's archive — never groups", () => {
     const ix = resolveIndexOf(makeTree())
     expect(ix.get('homepage')?.title).toBe('TestNexus')
     expect(ix.get('matrix')?.title).toBe('Matrix')
@@ -73 +88 @@ describe('resolveIndexOf', () => {
     expect(ix.get('page:p1')?.path.map((c) => c.title)).toEqual(['Notes'])
     expect(ix.get('page:p2')?.path.map((c) => c.title)).toEqual(['Notes', 'Ideas'])
     expect(ix.get('set:s1')?.path.map((c) => c.title)).toEqual(['Notes'])
+    expect(ix.get('archive:c1')).toMatchObject({ title: 'Notes', icon: 'archive' })
+    expect(ix.get('archive:c1')?.path.map((c) => c.title)).toEqual(['Notes'])
+    expect(ix.get('archive:s1')?.path.map((c) => c.title)).toEqual(['Notes', 'Ideas'])
     expect(ix.has('context:g1')).toBe(false)
   })
   it('a page in a set inside a set trails through both', () => {
@@ -112 +130 @@ describe('searchEntriesOf', () => {
     expect(byKind('set')).toEqual(['Ideas'])
     expect(byKind('page').sort()).toEqual(['Alpha', 'Nested Beta'])
   })
+
+  it('never lists an archive place the resolve index holds', () => {
+    const t = makeTree()
+    expect(resolveIndexOf(t).has('archive:c1')).toBe(true)
+    expect(searchEntriesOf(t).filter((e) => e.key.startsWith('archive:'))).toEqual([])
+  })
 })
 
 describe('page icons', () => {
@@ -193 +217 @@ describe('navKeysOf', () => {
       'set:s1',
       'page:p1',
       'page:p2',
+      'archive:c1',
+      'archive:s1',
     ])
       expect(keys.has(k)).toBe(true)
     expect(keys.has('context:g1')).toBe(false)
```

##### Core/Nexus/treePatch.test.ts

```/Core/Nexus/treePatch.test.ts diff
@@ -2 +2 @@ import { describe, it, expect } from 'vitest'
 import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
 import type { CollectionNode, NexusTree, SetNode, SpaceNode } from './tree'
 import {
+  archiveReach,
   containerSchema,
+  containerTrailById,
   containerTrailWhere,
+  findContainerById,
   moveNodeInTree,
   NO_SCHEMA,
   owningCollection,
@@ -212 +215 @@ describe('moveNodeInTree', () => {
 })
 
 describe('owningCollection', () => {
-  it('names the Collection a path starts in, a Collection its own owner', () => {
+  it('names the Collection a path starts in or whose Archive holds it, a Collection its own owner', () => {
     const t = tree()
     for (const path of ['Notes', 'Notes/A.md', 'Notes/Sub', 'Notes/Sub/B.md'])
       expect(owningCollection(t, path)).toBe(t.collections[0])
     expect(owningCollection(t, 'Tasks/T.md')).toBeUndefined()
     expect(owningCollection(t, '.nexus/contexts/Areas/Home')).toBeUndefined()
     expect(owningCollection(t, 'Note')).toBeUndefined()
+    const archived = '2026-10-20T12-00-00-000Z__X.md.archived/X.md'
+    expect(owningCollection(t, `.nexus/archive/c2/Old Name/${archived}`)).toBe(t.collections[1])
+    expect(owningCollection(t, `.nexus/archive/c9/Gone/${archived}`)).toBeUndefined()
+    expect(owningCollection(t, '.nexus/archive')).toBeUndefined()
     expect(owningCollection(t, t.collections[0].sets[0])).toBe(t.collections[0])
     const detached = { ...t.collections[1] }
     expect(owningCollection(null, detached)).toBe(detached)
@@ -230 +237 @@ describe('owningCollection', () => {
   })
 })
 
+describe('archiveReach', () => {
+  it('covers every Archive unscoped, the owning Collection’s whole Archive under a folder, and none for an unowned one', () => {
+    expect(archiveReach(tree())).toBe('.nexus/archive')
+    expect(archiveReach(tree(), 'Notes/Sub')).toBe('.nexus/archive/c1')
+    expect(archiveReach(tree(), 'Loose')).toBeNull()
+  })
+})
+
 describe('containerTrailWhere', () => {
   it('returns the matched container under every container above it', () => {
     const t = tree()
@@ -238 +253 @@ describe('containerTrailWhere', () => {
     expect(containerTrailWhere(t, (n) => n.id === 'c2')?.map((n) => n.id)).toEqual(['c2'])
     expect(containerTrailWhere(t, () => false)).toBeNull()
   })
+
+  it('finds a container and the trail down to it by id', () => {
+    const t = tree()
+    expect(containerTrailById(t, 's1')?.map((n) => n.id)).toEqual(
+      containerTrailWhere(t, (n) => n.id === 's1')?.map((n) => n.id),
+    )
+    expect(findContainerById(t, 's1')?.id).toBe('s1')
+    expect(containerTrailById(t, 'nope')).toBeNull()
+    expect(findContainerById(t, 'nope')).toBeNull()
+  })
 })
```

##### Core/Pages/fileHistory.test.ts

```/Core/Pages/fileHistory.test.ts diff
@@ -4 +4 @@ import { join } from '../Paths/posix'
 import { tempRoot } from '../Testing/hostFs'
 import type { Result } from '../Contract/result'
 import { HISTORY_INTERVAL } from '../Settings/personalization'
+import { ARCHIVE_DIR_REL } from '../Paths/nexusPaths'
+import { markIndexReady } from '../Index/contentIndex'
 import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
 import { splitEnvelope } from '../Files/pageFile'
 import { machine } from '../Platform/machine'
@@ -382 +384 @@ describe('sweepFileHistory', () => {
     await sweepFileHistory(root)
     expect(captures.sweepCaptures(Number.MAX_SAFE_INTEGER)).toBe(1)
   })
+
+  it('sweeps an archived page at the archive timeframe while a twin the tree holds keeps the History Timeframe', async () => {
+    await settle({ historyDays: 30, archiveHistoryDays: 7 })
+    await captureIfDue(root, PAGE, 'held', 'edit')
+    await captureIfDue(root, OTHER, 'archived', 'edit')
+    vi.advanceTimersByTime(8 * DAY)
+    mem.stores.contentIndex?.upsertPageIndexes(
+      [PAGE, OTHER].map((id) => ({
+        path: `${ARCHIVE_DIR_REL}/c1/Notes/1__${id}.archived/${id}.md`,
+        entry: { relations: [], headings: [], values: { ID: id } },
+        stat: { mtimeMs: 0, size: 0 },
+      })),
+    )
+    markIndexReady()
+    await sweepFileHistory(root)
+    expect(rows(OTHER)).toEqual([])
+    expect(rows()).toHaveLength(1)
+  })
 })
```

##### Core/Paths/exclusion.test.ts

```/Core/Paths/exclusion.test.ts diff
@@ -1 +1 @@
 import { describe, it, expect } from 'vitest'
-import { ASSETS_DIR_REL, thumbsRel } from './nexusPaths'
+import {
+  ARCHIVE_DIR_REL,
+  ASSETS_DIR_REL,
+  archiveSegs,
+  archivedCollectionIdOf,
+  thumbsRel,
+} from './nexusPaths'
 import {
   assetMatcher,
   excludedMatcher,
@@ -26 +32 @@ describe('outsideContent', () => {
     expect(outsideContent('Notes/_Idea.md', scope())).toBe('hidden')
   })
 
+  it('admits the Archive, the one hidden folder read as content, while a hidden folder inside it stays hidden', () => {
+    const page = '.nexus/archive/C1/Alpha/2026-10-20T12-00-00-000Z__Beta.archived/Beta/Notes.md'
+    expect(outsideContent('.nexus/archive', scope())).toBeNull()
+    expect(outsideContent('.nexus/archive/C1', scope())).toBeNull()
+    expect(outsideContent(page, scope())).toBeNull()
+    expect(
+      outsideContent(
+        '.nexus/archive/C1/Alpha/2026-10-20T12-00-00-000Z__Beta.archived/Beta/_raw/X.md',
+        scope(),
+      ),
+    ).toBe('hidden')
+    expect(outsideContent('.nexus/settings.json', scope())).toBe('hidden')
+    expect(outsideContent('.nexus/contexts/Areas/Home', scope())).toBe('hidden')
+  })
+
   it('keeps normal paths', () => {
     expect(outsideContent('Vault A', scope())).toBeNull()
     expect(outsideContent('Vault A/Sub/Page.md', scope())).toBeNull()
@@ -155 +176 @@ describe('manifestAdmits', () => {
     expect(admits(`${ASSETS_DIR_REL}/OTHER-ID/thumbnails/a.jpg`)).toBe(false)
   })
 })
+
+describe('the Archive’s segments', () => {
+  it('answers the segments below .nexus/archive, and null outside it', () => {
+    expect(archiveSegs(['.nexus', 'archive'])).toEqual([])
+    expect(archiveSegs(['.nexus', 'archive', 'C1', 'A.md'])).toEqual(['C1', 'A.md'])
+    expect(archiveSegs(['.nexus'])).toBeNull()
+    expect(archiveSegs(['.nexus', 'contexts'])).toBeNull()
+    expect(archiveSegs(['Notes', 'archive'])).toBeNull()
+  })
+
+  it('answers the Collection id an archived path files under, and null for the folder itself or outside it', () => {
+    expect(
+      archivedCollectionIdOf(
+        '.nexus/archive/C1/Alpha/2026-10-20T12-00-00-000Z__A.md.archived/A.md',
+      ),
+    ).toBe('C1')
+    expect(archivedCollectionIdOf(ARCHIVE_DIR_REL)).toBeNull()
+    expect(archivedCollectionIdOf('Notes/A.md')).toBeNull()
+  })
+})
```

##### Core/Properties/assignment.test.ts

```/Core/Properties/assignment.test.ts diff
@@ -1 +1 @@
 import { describe, it, expect, beforeEach, afterEach } from 'vitest'
-import { readFile, rm, writeFile } from 'node:fs/promises'
+import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
+import { dirname, join } from '../Paths/posix'
 import { tempRoot } from '../Testing/hostFs'
-import { assignProperty, reorderAssignment, collectionFolders } from './assignment'
+import { assignProperty, reorderAssignment } from './assignment'
 import { dropLiveTree } from '../Nexus/liveTree'
 import { createFolderEntity } from '../Nexus/folderEntity'
-import { newId } from '../Nexus/ids'
+import { newContentId, newId } from '../Nexus/ids'
 import { createTestPage } from '../Testing/createTestPage'
 import { sidecarPath } from '../Paths/paths'
 import { readJsonObject } from '../Files/atomicWrite'
@@ -45 +46 @@ it('reorder moves within the assignment array', async () => {
   expect(await ids(notes)).toEqual(['prop_c', 'prop_a', 'prop_b'])
 })
 
-it('collectionFolders lists every collection folder from the live tree', async () => {
-  const t = await createFolderEntity(root, 'collection', 'Tasks', newId())
-  if (!t.ok) throw new Error('setup failed')
-  expect((await collectionFolders(root)).sort()).toEqual([notes, t.value.path].sort())
-})
-
 it('a Remove racing an Assign on ONE collection never loses either write (breaker H-2)', async () => {
   const mk = async (name: string): Promise<string> => {
     const r = await createProperty(root, { id: '', label: name, type: 'number' } as never)
@@ -135 +130 @@ describe('a re-assign puts a cached value back', () => {
   it('leaves a root whose key holds only words no option names as it is', async () => {
     expect((await reassigned('\nTags: [ideas]', tags, 'Tags: [Claude]')).Tags).toEqual(['ideas'])
   })
+
+  const archivedPage = async (fm: string): Promise<string> => {
+    const cid = (await readJsonObject(sidecarPath(notes, 'collection')))?.id as string
+    const file = join(
+      root,
+      '.nexus/archive',
+      cid,
+      'Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md',
+    )
+    await mkdir(dirname(file), { recursive: true })
+    await writeFile(file, `---\nID: ${newContentId('page')}\n${fm}---\nb\n`)
+    return file
+  }
+
+  it('refills an archived member of the Collection where the Archive holds it', async () => {
+    const made = await createProperty(root, { id: '', ...status })
+    if (!made.ok) throw new Error('setup failed')
+    await assignProperty(root, notes, made.value.id)
+    const old = await archivedPage('Status: hi\n')
+    await refreshTree(root)
+    expect((await removeProperty(root, notes, made.value.id)).ok).toBe(true)
+    expect(splitFrontmatter(await readFile(old, 'utf8')).Status).toBeUndefined()
+    expect((await assignProperty(root, notes, made.value.id)).ok).toBe(true)
+    expect(splitFrontmatter(await readFile(old, 'utf8')).Status).toEqual(['hi'])
+  })
+
+  it('keeps a cached Link value naming an archived page', async () => {
+    await archivedPage('')
+    const fm = await reassigned(
+      '',
+      { label: 'Related', key: 'Related', type: 'link' },
+      'Related: "[[Old]]"',
+    )
+    expect(fm.Related).toBe('[[Old]]')
+  })
 })
```

##### Core/Properties/deleteProperty.test.ts

```/Core/Properties/deleteProperty.test.ts diff
@@ -1 +1 @@
 import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
 import { writePageValue, writeSpaceValue } from '../Testing/propertyWrites'
 import { ID_KEY } from '../Nexus/identityMark'
-import { rm, readFile, readdir, writeFile } from 'node:fs/promises'
+import { mkdir, rm, readFile, readdir, writeFile } from 'node:fs/promises'
 import { dirname, join } from '../Paths/posix'
 import { seedSpaceSidecar, readJsonAt, tempRoot } from '../Testing/hostFs'
 import { deleteProperty, propertyHolders } from './deleteProperty'
@@ -13 +13 @@ import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/conf
 import { assignProperty } from './assignment'
 import { removeProperty } from './removeProperty'
 import { createFolderEntity } from '../Nexus/folderEntity'
-import { newId } from '../Nexus/ids'
+import { newContentId, newId } from '../Nexus/ids'
 import { dropLiveTree } from '../Nexus/liveTree'
 import { createTestPage } from '../Testing/createTestPage'
 import { splitFrontmatter } from '../Files/pageFile'
 import { readRegistry } from './propertiesRegistry'
-import { readRecord } from '../Trash/record'
+import { readRecord } from '../Bundles/record'
 import { sidecarPath } from '../Paths/paths'
 import { readJsonObject } from '../Files/atomicWrite'
 import type { PropertyDefinition } from './properties'
@@ -171 +171 @@ describe('propertyHolders', () => {
     expect((await propertyHolders(root, 'prop_nope')).ok).toBe(false)
   })
 
-  it('counts what the delete strips, writing nothing', async () => {
+  it('counts what the delete strips, holding out an ID-less page and both claimants of one id, and writes nothing', async () => {
     const c = await createProperty(root, {
       id: '',
       label: 'Priority',
@@ -200 +200 @@ describe('propertyHolders', () => {
     ]
     const before = await Promise.all(files.map((f) => readFile(f, 'utf8')))
 
-    expect(await propertyHolders(root, c.value.id)).toEqual(ok(3))
+    expect(await propertyHolders(root, c.value.id)).toEqual(ok(2))
     expect(await Promise.all(files.map((f) => readFile(f, 'utf8')))).toEqual(before)
   })
+
+  it('a property delete strips an archived holder and files its value under its id', async () => {
+    const c = await createProperty(root, {
+      id: '',
+      label: 'Priority',
+      type: 'select',
+      select_options: [{ key: 'hi', label: 'hi' }],
+    })
+    if (!c.ok) throw new Error('setup failed')
+    const notesId = (await readJsonObject(sidecarPath(notes, 'collection')))?.id as string
+    const held = join(
+      root,
+      '.nexus/archive',
+      notesId,
+      'Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md',
+    )
+    const pid = newContentId('page')
+    await mkdir(dirname(held), { recursive: true })
+    await writeFile(held, `---\n${ID_KEY}: ${pid}\nPriority: hi\n---\nb\n`)
+
+    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)
+
+    expect(await readFile(held, 'utf8')).not.toContain('Priority')
+    const name = (await readdir(join(root, '.trash'))).find((f) => f.includes(c.value.id))
+    const record = await readRecord(join(root, '.trash', name ?? ''))
+    expect((record as { values: Record<string, unknown> }).values).toEqual({ [pid]: 'hi' })
+  })
 })
 
 describe('a global delete reaches a Space sidecar', () => {
```

##### Core/Properties/governedSweep.test.ts

```/Core/Properties/governedSweep.test.ts diff
@@ -124 +124 @@ describe('sweepCount', () => {
     expect(await readFile(a, 'utf8')).toBe(page)
     expect(await readFile(sidecar.file, 'utf8')).toBe(sidecar.text)
   })
+
+  it('counts no file the Archive holds, while the sweep it previews writes it', async () => {
+    const { root, a } = await seed()
+    const bundle = join(
+      root,
+      '.nexus',
+      'archive',
+      'C1',
+      'Notes',
+      '2026-10-20T12-00-00-000Z__C.md.archived',
+    )
+    await mkdir(bundle, { recursive: true })
+    const archived = join(bundle, 'C.md')
+    await writeFile(archived, '---\nID: 01KVGMT8BFP350FZZXAMG1QDRC\n---\nbody\n')
+    const textPlan: SweepPlan = { text: (c) => `${c}x` }
+    expect(await sweepCount(root, [a, archived], textPlan)).toBe(1)
+    expect((await sweepGovernedRoots(root, [a, archived], textPlan, true)).touched.size).toBe(2)
+  })
 })
```

##### Core/Properties/governedWorld.test.ts

```/Core/Properties/governedWorld.test.ts diff
@@ -3 +3 @@ import { join } from '../Paths/posix'
 import { tempRoot } from '../Testing/hostFs'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import * as liveTree from '../Nexus/liveTree'
-import { assignedDefs, assignProperty, collectionFolders } from './assignment'
+import { assignedDefs, assignProperty } from './assignment'
 import { pageWorldOf } from '../Contexts/contextWrite'
 import { createFolderEntity } from '../Nexus/folderEntity'
 import { newId } from '../Nexus/ids'
@@ -82 +82 @@ describe('pageWorldOf', () => {
     )
   })
 })
-
-describe('collectionFolders', () => {
-  it('never walks the disk while the live tree holds this root', async () => {
-    await liveTree.refreshTree(root)
-    const spy = vi.spyOn(liveTree, 'refreshTree')
-    for (let i = 0; i < 10; i++) await collectionFolders(root)
-    expect(spy).not.toHaveBeenCalled()
-    spy.mockRestore()
-  })
-})
```

##### Core/Properties/governedWorldWrite.test.ts

```/Core/Properties/governedWorldWrite.test.ts diff
@@ -14 +14 @@ import { newId } from '../Nexus/ids'
 import { createFolderEntity } from '../Nexus/folderEntity'
 import { createTestPage } from '../Testing/createTestPage'
 import { createProperty } from './registryProperty'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 
 const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
 let root: string
```

##### Core/Properties/handlers.test.ts

```/Core/Properties/handlers.test.ts diff
@@ -9 +9 @@ import { fail, fault, ok } from '../Contract/result'
 import { sidecarPath } from '../Paths/paths'
 import { closeSession, openSession } from '../Nexus/session'
 import { dropLiveTree, heldTreeOf, refreshTree } from '../Nexus/liveTree'
-import { findContainerWhere } from '../Nexus/treePatch'
+import { containerAt } from '../Nexus/treePatch'
 import { createFolderEntity } from '../Nexus/folderEntity'
 import { newId } from '../Nexus/ids'
 import { createTestPage } from '../Testing/createTestPage'
@@ -20 +20 @@ import { unsweptLine } from './governedSweep'
 import { readSchemaJournal, writeSchemaJournal } from './propertyJournal'
 import { propertiesHandlers } from './handlers'
 import { handleMutate } from '../Nexus/mutate'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 
 vi.mock('./propertiesRegistry', async (importOriginal) => {
   const mod = await importOriginal<typeof import('./propertiesRegistry')>()
@@ -46 +46 @@ const tilePushes = (): unknown[] =>
   pushes.filter((p) => p.channel === 'tiles:changed').map((p) => p.payload)
 
 const liveViewAt = (abs: string): unknown =>
-  findContainerWhere(heldTreeOf(root)!, (c) => c.path === relative(root, abs))?.views?.[0]
+  containerAt(heldTreeOf(root)!, relative(root, abs))?.views?.[0]
 
 beforeEach(async () => {
   pushes = []
@@ -199 +199 @@ describe('the property channels', () => {
     await rm(setFile)
     await mkdir(setFile)
     const r = await propertiesHandlers['property:delete'](ctx, propId)
-    if (!r.ok || !r.value.owed || !r.value.trashed) throw new Error('setup failed')
+    if (!r.ok || !r.value.owed || !r.value.bundled) throw new Error('setup failed')
     const record = r.value.owed
     expect(await propertiesHandlers['property:replay'](ctx, record)).toEqual(fault(unsweptLine(1)))
     await rm(setFile, { recursive: true })
     await writeFile(setFile, held)
     await refreshTree(root)
-    const bundlePath = r.value.trashed.bundlePath
+    const bundlePath = r.value.bundled.bundlePath
     expect((await handleMutate(root, { op: 'restore', bundlePath }, deps)).ok).toBe(true)
     const page = await readFile(`${col}/A.md`, 'utf8')
     expect(await propertiesHandlers['property:replay'](ctx, record)).toEqual(ok(null))
```

##### Core/Properties/journalWiring.test.ts

```/Core/Properties/journalWiring.test.ts diff
@@ -16 +16 @@ import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
 import { closeSession, openSession } from '../Nexus/session'
 import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
 import { seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
-import { listBundles } from '../Trash/holdings'
+import { listBundles } from '../Bundles/bundle'
 import { readRegistry } from './propertiesRegistry'
 import { createProperty, editProperty, renameProperty } from './registryProperty'
 import { deleteProperty } from './deleteProperty'
@@ -177 +177 @@ describe('the delete writer', () => {
     expect(writes.length).toBe(2)
     expect(writes.every((w) => w.journaled)).toBe(true)
     expect(await readSchemaJournal(root)).toBeNull()
-    expect(await listBundles(root)).toHaveLength(1)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
   })
 })
 
```

##### Core/Properties/keyHolders.test.ts

```/Core/Properties/keyHolders.test.ts diff
@@ -1 +1 @@
 import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
 import { chmod, rm, mkdir, readFile, stat, utimes, writeFile } from 'node:fs/promises'
-import { join } from '../Paths/posix'
+import { dirname, join } from '../Paths/posix'
 import { noModeBits, seedSpaceSidecar, tempRoot } from '../Testing/hostFs'
 import { installStores, NO_STORES } from '../Platform/stores'
 import { memoryStores } from '../Testing/memoryStores'
 import { indexWrittenPage, nexusCorpus, seedContentIndex } from '../Index/indexSeed'
-import { dropLiveTree } from '../Nexus/liveTree'
+import { dropLiveTree, liveTreeOf } from '../Nexus/liveTree'
+import { nexusPages } from '../Nexus/heldPages'
+import { createFolderEntity } from '../Nexus/folderEntity'
+import { newId } from '../Nexus/ids'
 import { createProperty, renameProperty } from './registryProperty'
 import { renameOption } from './optionOps'
 import { deleteProperty } from './deleteProperty'
-import { confirmedKeyHolders, keyedHolders, keyHolderFiles } from './keyHolders'
-import { sweepGovernedRoots } from './governedSweep'
+import { confirmedKeyHolders, keyedHolders } from './keyHolders'
+import { queryKeyHolders } from '../Index/contentIndex'
+import { collectionFolders, governedReach, sweepGovernedRoots } from './governedSweep'
+import { splitFrontmatter } from '../Files/pageFile'
 
 vi.mock('./governedSweep', async (importOriginal) => {
   const mod = await importOriginal<typeof import('./governedSweep')>()
@@ -22 +27 @@ const sweepSpy = vi.mocked(sweepGovernedRoots)
 let root: string
 const abs = (...segs: string[]): string => join(root, ...segs)
 const corpus = async (): Promise<string[]> => (await nexusCorpus(root)).map((rel) => abs(rel))
+const pageText = (n: string, fm: string): string =>
+  `---\nID: 01ARZ3NDEKPSV4RRFFQ69G5${n.padStart(3, 'F').slice(-3).toUpperCase()}\n${fm}---\n\nbody\n`
 const page = (n: string, fm: string): Promise<void> =>
-  writeFile(
-    abs('Notes', `${n}.md`),
-    `---\nID: 01ARZ3NDEKPSV4RRFFQ69G5${n.padStart(3, 'F').slice(-3).toUpperCase()}\n${fm}---\n\nbody\n`,
+  writeFile(abs('Notes', `${n}.md`), pageText(n, fm))
+const archived = async (name: string, fm: string, collection = 'c1'): Promise<string> => {
+  const file = abs(
+    '.nexus',
+    'archive',
+    collection,
+    'Notes',
+    `2026-10-20T12-00-00-000Z__${name}.md.archived`,
+    `${name}.md`,
   )
+  await mkdir(dirname(file), { recursive: true })
+  await writeFile(file, pageText(name, fm))
+  await indexWrittenPage(root, file)
+  return file
+}
 
 beforeEach(async () => {
   root = tempRoot('pom-keyh-')
@@ -59 +77 @@ afterEach(async () => {
   await rm(root, { recursive: true, force: true })
 })
 
-describe('keyHolderFiles', () => {
-  it('answers the queried holders intersected with the scope folders', async () => {
-    const files = await keyHolderFiles(root, 'Stage', [abs('Notes')])
-    expect(files.sort()).toEqual([abs('Notes', 'HolderA.md'), abs('Notes', 'HolderB.md')])
+describe('governedReach', () => {
+  it('answers the queried holders inside every Collection and the Archive', async () => {
+    const old = await archived('Q9C', 'Stage: Draft\n')
+    const files = await governedReach(root, queryKeyHolders('Stage'))
+    expect(files.sort()).toEqual(
+      [abs('Notes', 'HolderA.md'), abs('Notes', 'HolderB.md'), old].sort(),
+    )
   })
 
   it('a name registered after the seed finds the pages already holding it, with no re-read', async () => {
     await page('Late', 'Notes: x\n')
     await seedContentIndex(root)
     await createProperty(root, { id: 'prop_n', label: 'Notes', type: 'link' })
-    expect(await keyHolderFiles(root, 'Notes', [abs('Notes')])).toEqual([abs('Notes', 'Late.md')])
+    expect(await governedReach(root, queryKeyHolders('Notes'))).toEqual([abs('Notes', 'Late.md')])
   })
 
   it('a rename onto a key a page holds beside the old one is refused through the index, and the un-governed note never counts', async () => {
@@ -92 +113 @@ describe('keyHolderFiles', () => {
         await page('HolderB', 'Stage: Done\n')
         await chmod(b, 0o000)
         await seedContentIndex(root)
-        expect((await keyHolderFiles(root, 'Stage', [abs('Notes')])).sort()).toEqual([a, b])
+        expect((await governedReach(root, queryKeyHolders('Stage'))).sort()).toEqual([a, b])
       } finally {
         await chmod(a, 0o644)
         await chmod(b, 0o644)
@@ -135 +156 @@ describe('keyHolderFiles', () => {
     await page('Q9X', 'phase: x\n')
     await seedContentIndex(root)
     await seedSpaceSidecar(root, 'Projects', 'Pommora', { id: 'sp1', PHASE: 'y' })
-    expect(await confirmedKeyHolders(root, 'Phase', [abs('Notes')])).toEqual([])
+    expect(await confirmedKeyHolders(root, 'Phase')).toEqual([])
     await page('Q9Y', 'Phase: x\n')
     await seedContentIndex(root)
-    expect(await confirmedKeyHolders(root, 'Phase', [abs('Notes')])).toEqual([
-      abs('Notes', 'Q9Y.md'),
-    ])
+    expect(await confirmedKeyHolders(root, 'Phase')).toEqual([abs('Notes', 'Q9Y.md')])
   })
 
   it('with no index it answers the corpus intersected the same way', async () => {
     installStores(NO_STORES)
-    const files = await keyHolderFiles(root, 'Stage', [abs('Notes')])
+    const files = await governedReach(root, queryKeyHolders('Stage'))
     expect(files).toHaveLength(30)
     expect(files.some((f) => f.includes('Loose'))).toBe(false)
   })
+
+  it('`only` reaches one Collection folder and its own Archive', async () => {
+    await mkdir(abs('Other'), { recursive: true })
+    await writeFile(
+      abs('Other', '_pagecollection.json'),
+      JSON.stringify({ id: 'c2', properties: ['prop_s'] }),
+    )
+    await writeFile(abs('Other', 'Elsewhere.md'), pageText('Elsewhere', 'Stage: Draft\n'))
+    await indexWrittenPage(root, abs('Other', 'Elsewhere.md'))
+    const own = await archived('Q9D', 'Stage: Draft\n')
+    await archived('Q9E', 'Stage: Draft\n', 'c2')
+    dropLiveTree()
+    const files = await governedReach(root, queryKeyHolders('Stage'), abs('Notes'))
+    expect(files.sort()).toEqual(
+      [abs('Notes', 'HolderA.md'), abs('Notes', 'HolderB.md'), own].sort(),
+    )
+  })
+
+  it('reaches an Archive whose Collection the tree no longer holds', async () => {
+    const orphan = await archived('Orphan', 'Stage: Draft\n', 'c9')
+    expect(await governedReach(root, queryKeyHolders('Stage'))).toContain(orphan)
+  })
+
+  it('a rename onto a key an archived page holds beside the old one goes through, the archived page keeping the new key’s value', async () => {
+    const held = await archived('Q9A', 'Stage: s\nPhase: x\n')
+    expect((await renameProperty(root, 'prop_s', 'Phase')).ok).toBe(true)
+    const fm = splitFrontmatter(await readFile(held, 'utf8'))
+    expect(fm.Phase).toBe('x')
+    expect(fm).not.toHaveProperty('Stage')
+  })
+
+  it('an option rename rewrites an archived holder', async () => {
+    const held = await archived('Q9B', 'Stage: Draft\n')
+    expect((await renameOption(root, 'prop_s', 'Draft', 'Sketch')).ok).toBe(true)
+    expect(await readFile(held, 'utf8')).toContain('Sketch')
+    expect(await readFile(abs('Loose', 'Note.md'), 'utf8')).toContain('Draft')
+  })
+
+  it('collectionFolders lists every collection folder from the live tree', async () => {
+    const t = await createFolderEntity(root, 'collection', 'Tasks', newId())
+    if (!t.ok) throw new Error('setup failed')
+    expect(collectionFolders(root, await liveTreeOf(root)).sort()).toEqual(
+      [abs('Notes'), t.value.path].sort(),
+    )
+  })
 })
 
 describe('keyedHolders', () => {
   it('files no value for a page holding another casing of the key', async () => {
     await page('K1', 'tags: [a]\n')
     const file = abs('Notes', 'K1.md')
-    expect(await keyedHolders([file], 'Tags')).toEqual({
+    expect(await keyedHolders([file], 'Tags', new Map())).toEqual({
       values: {},
       strip: [file],
       partial: false,
     })
   })
+
+  it('keeps both claimants of an id the map marks null out of the strip', async () => {
+    const a = abs('Notes', 'HolderA.md')
+    const copy = abs('Notes', 'HolderA copy.md')
+    await writeFile(copy, await readFile(a, 'utf8'))
+    const id = '01ARZ3NDEKPSV4RRFFQ69G5ERA'
+    expect(await keyedHolders([a, copy], 'Stage', new Map([[id, null]]))).toEqual({
+      values: {},
+      strip: [],
+      partial: true,
+    })
+  })
+
+  it('files and strips an archived holder by its id', async () => {
+    const old = await archived('Q9F', 'Stage: Draft\n')
+    const { byId } = await nexusPages(root, await liveTreeOf(root))
+    expect(await keyedHolders([old], 'Stage', byId)).toEqual({
+      values: { '01ARZ3NDEKPSV4RRFFQ69G5Q9F': 'Draft' },
+      strip: [old],
+      partial: false,
+    })
+  })
 })
 
 describe('the property cascades open only the holders', () => {
```

##### Core/Properties/removeProperty.test.ts

```/Core/Properties/removeProperty.test.ts diff
@@ -1 +1 @@
 import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
 import { writePageValue } from '../Testing/propertyWrites'
 import { ID_KEY } from '../Nexus/identityMark'
-import { chmod, rename, rm, readFile, stat, utimes, writeFile } from 'node:fs/promises'
-import { join, relative } from '../Paths/posix'
+import { chmod, mkdir, rename, rm, readFile, stat, utimes, writeFile } from 'node:fs/promises'
+import { dirname, join, relative } from '../Paths/posix'
 import { noModeBits, tempRoot, readJsonAt } from '../Testing/hostFs'
 import { fault, ok } from '../Contract/result'
 import { editJsonStrict, readJsonObject } from '../Files/atomicWrite'
@@ -15 +15 @@ import { removeProperty } from './removeProperty'
 import { assignedIds, assignProperty } from './assignment'
 import { createProperty, editProperty } from './registryProperty'
 import { createFolderEntity } from '../Nexus/folderEntity'
-import { newId } from '../Nexus/ids'
+import { newContentId, newId } from '../Nexus/ids'
 import { createTestPage } from '../Testing/createTestPage'
 import { patchSidecar } from '../Files/sidecar'
 import { readRegistry } from './propertiesRegistry'
@@ -140 +140 @@ describe('removeProperty — strip + cache (C-3/C-6)', () => {
     closeSession()
   })
 
-  it('a copy sharing an id keeps its own value, and re-assigning fills the one Remove stripped', async () => {
+  it('a page and its copy sharing one id both keep their values through Remove, so re-assigning has nothing to fill', async () => {
     const copy = join(folder, 'A copy.md')
     const raw = await readFile(pageA, 'utf8')
     await writeFile(copy, raw.replace('- active', '- done'))
     await removeProperty(root, folder, propId)
-    const [a, c] = [await pageValue(pageA), await pageValue(copy)]
-    expect([a, c].filter((v) => v === undefined)).toHaveLength(1)
+    expect([await pageValue(pageA), await pageValue(copy)]).toEqual([['active'], ['done']])
     await assignProperty(root, folder, propId)
     expect([await pageValue(pageA), await pageValue(copy)]).toEqual([['active'], ['done']])
     expect(await cacheBlock()).toBeUndefined()
   })
 
+  it('a Remove strips its own Collection’s archived holder and caches its value, and leaves another Collection’s', async () => {
+    const other = await createFolderEntity(root, 'collection', 'Other', newId())
+    if (!other.ok) throw new Error('setup failed')
+    const archivedUnder = async (collection: string): Promise<{ file: string; id: string }> => {
+      const cid = (await readJsonObject(sidecarPath(collection, 'collection')))?.id as string
+      const file = join(
+        root,
+        '.nexus/archive',
+        cid,
+        'Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md',
+      )
+      const id = newContentId('page')
+      await mkdir(dirname(file), { recursive: true })
+      await writeFile(file, `---\n${ID_KEY}: ${id}\nStage:\n  - done\n---\nb\n`)
+      return { file, id }
+    }
+    const own = await archivedUnder(folder)
+    const theirs = await archivedUnder(other.value.path)
+    expect((await removeProperty(root, folder, propId)).ok).toBe(true)
+    expect(await pageValue(own.file)).toBeUndefined()
+    expect((await cacheBlock())?.values[own.id]).toEqual(['done'])
+    expect(await pageValue(theirs.file)).toEqual(['done'])
+  })
+
   it('is a no-op when the property is not assigned — never overwrites a cache with emptiness (E-6)', async () => {
     await removeProperty(root, folder, propId)
     const before = await cacheBlock()
```

##### Core/Properties/repairSweep.test.ts

```/Core/Properties/repairSweep.test.ts diff
@@ -1 +1 @@
 import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
-import { join } from '../Paths/posix'
+import { dirname, join } from '../Paths/posix'
 import { tempRoot } from '../Testing/hostFs'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { assignProperty } from './assignment'
 import { createFolderEntity } from '../Nexus/folderEntity'
-import { newId } from '../Nexus/ids'
+import { newContentId, newId } from '../Nexus/ids'
 import { createTestPage } from '../Testing/createTestPage'
 import { createProperty } from './registryProperty'
 import { seedContentIndex } from '../Index/indexSeed'
@@ -18 +18 @@ import { memoryStores } from '../Testing/memoryStores'
 let root: string
 let page: string
 let tagsId: string
+let colId: string
 
 const settings = (repairOnOpen: boolean): Promise<void> =>
   writeFile(
@@ -52 +53 @@ beforeEach(async () => {
   })
   if (!status.ok || !tags.ok) throw new Error('registry failed')
   tagsId = tags.value.id
-  const col = await createFolderEntity(root, 'collection', 'Col', newId())
+  colId = newId()
+  const col = await createFolderEntity(root, 'collection', 'Col', colId)
   if (!col.ok) throw new Error('folder failed')
   await assignProperty(root, col.value.path, status.value.id)
   await assignProperty(root, col.value.path, tagsId)
@@ -77 +79 @@ describe('runRepairSweep', () => {
     expect(out).toContain('- zeta')
   })
 
+  it('canonicalizes a drifted archived page against its own Collection’s definitions', async () => {
+    const archived = join(
+      root,
+      `.nexus/archive/${colId}/Col/2026-10-20T12-00-00-000Z__Two.md.archived/Two.md`,
+    )
+    await mkdir(dirname(archived), { recursive: true })
+    await writeFile(archived, `---\nID: ${newContentId('page')}\nStatus: Open\n---\n\nb\n`)
+    await runRepairSweep(root, await seedContentIndex(root))
+    expect(await readFile(archived, 'utf8')).toContain('Status:\n  - Open')
+  })
+
   it('walks the tree once however many re-read pages it checks', async () => {
     for (const title of ['Two', 'Three']) {
       const p = await createTestPage(join(root, 'Col'), title, { body: 'b' })
```

##### Core/Properties/replaySchemaCascade.test.ts

```/Core/Properties/replaySchemaCascade.test.ts diff
@@ -9 +9 @@ import { installStores, NO_STORES } from '../Platform/stores'
 import { memoryStores } from '../Testing/memoryStores'
 import { dropLiveTree } from '../Nexus/liveTree'
 import { indexWrittenPage, seedContentIndex } from '../Index/indexSeed'
-import { readRecord, writePropertyBundle } from '../Trash/record'
-import { listBundles } from '../Trash/holdings'
+import { readRecord } from '../Bundles/record'
+import { writePropertyBundle } from './deleteProperty'
+import { listBundles } from '../Bundles/bundle'
 import { mutateRegistry, readRegistry } from './propertiesRegistry'
 import { renameFrontmatterKey } from '../Files/pageFile'
 import { sidecarPath } from '../Paths/paths'
@@ -231 +232 @@ describe('delete replay', () => {
     expect((await readRegistry(crashed)).defs.prop_s).toBeUndefined()
     const sidecar = await readJsonObject(sidecarPath(join(crashed, 'Col'), 'collection'))
     expect((sidecar?.properties as string[] | undefined) ?? []).toEqual([])
-    expect(await listBundles(crashed)).toHaveLength(1)
+    expect(await listBundles(crashed, { kind: 'trash' })).toHaveLength(1)
     expect(await readSchemaJournal(crashed)).toBeNull()
   })
 
@@ -647 +648 @@ describe('unreadable holders hold the record', () => {
       if (!deleted.ok) throw new Error('delete refused')
       expect(deleted.value.owed).toEqual({ op: 'delete', id: 'prop_s', key: 'Stage' })
       expect(deleted.value.cascade.warning).toBeDefined()
-      expect(await readRecord(join(root, deleted.value.trashed.bundlePath))).toMatchObject({
+      expect(await readRecord(join(root, deleted.value.bundled.bundlePath))).toMatchObject({
         partial: true,
       })
       await indexWrittenPage(root, b)
```

##### Core/Properties/restoreValue.test.ts

```/Core/Properties/restoreValue.test.ts diff
@@ -9 +9 @@ import { newId } from '../Nexus/ids'
 import { closeSession, openSession } from '../Nexus/session'
 import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
 import { settledMutate } from '../Testing/settledMutate'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 import type { PropertyDraft } from './properties'
 import type { PropertyValue } from './propertyValue'
 import { createProperty } from './registryProperty'
```

##### Core/Properties/setSpaceProperty.test.ts

```/Core/Properties/setSpaceProperty.test.ts diff
@@ -9 +9 @@ import { createProperty } from './registryProperty'
 import { readRegistry } from './propertiesRegistry'
 import { setSpacePropertyOp } from './setProperty'
 import type { MutateContext } from '../Nexus/mutate'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 import type { PropertyDraft } from './properties'
 import type { PropertyValue } from './propertyValue'
 import { closeSession, openSession } from '../Nexus/session'
@@ -155 +155 @@ describe('a value write reconciles the Space it lands on', () => {
       { op: 'delete', path: spaceRel, kind: 'space' },
       settled,
     )
-    if (!deleted.ok || !deleted.value.trashed) throw new Error('delete failed')
+    if (!deleted.ok || !deleted.value.bundled) throw new Error('delete failed')
     expect((await removeOption(root, tagsId, 'beta')).ok).toBe(true)
-    const { bundlePath } = deleted.value.trashed
+    const { bundlePath } = deleted.value.bundled
     expect((await settledMutate(root, { op: 'restore', bundlePath }, settled)).ok).toBe(true)
     expect((await sidecar()).Tags).toEqual(['alpha'])
   })
```

##### Core/Properties/Schema/PropertyFrame.test.tsx

```/Core/Properties/Schema/PropertyFrame.test.tsx diff
@@ -71 +71 @@ beforeEach(() => {
   propertyMenuSpy = vi.fn(async () => null)
   destroySpy = vi.fn(async () => ({
     ok: true,
-    value: { trashed: { bundlePath: '.trash/s__property-prop_status.deleted' } },
+    value: { bundled: { bundlePath: '.trash/s__property-prop_status.deleted' } },
   }))
   unassignSpy = vi.fn(async () => ({ ok: true, value: null }))
   holdersSpy = vi.fn(async () => ok(3))
```

##### Core/Session/devicePrefsSeed.test.tsx

```/Core/Session/devicePrefsSeed.test.tsx diff
@@ -224 +224 @@ describe('a nexus switch keeps none of the old nexus', () => {
     const page = { kind: 'page', id: 'x', path: 'x.md' } as const
     const s = useSession.getState()
     s.openWindowTab(page)
-    s.openHistory(page)
+    s.openReader({ kind: 'history', page })
     s.toggleSettings()
     s.openBrowser('https://example.com')
     s.toggleIteration()
@@ -239 +239 @@ describe('a nexus switch keeps none of the old nexus', () => {
     await useSession.getState().choose()
     expect(atChoose).toMatchObject({
       windowSlot: null,
-      historyTarget: null,
+      reader: null,
       settingsOpen: false,
       browserSummon: null,
       iterationOpen: false,
```

##### Core/Session/store.test.tsx

```/Core/Session/store.test.tsx diff
@@ -422 +422 @@ describe('store — page slots', () => {
     })
   }
 
+  it('an archive drops the page’s detail, base, and slot as a delete does', () => {
+    seed({ pages: { a: ready('a') } })
+    cachePageDetail(detail('a'))
+    useSession.getState().patchPagesFor({ op: 'archive', path: pg('a').path, kind: 'page' })
+    expect(readPageDetail(pg('a').path)).toBeUndefined()
+    expect(readBodyBase(pg('a').path)).toBeNull()
+    expect(useSession.getState().pages.a).toBeUndefined()
+  })
+
+  it('a Set’s delete or archive drops the cached details of the pages under it', () => {
+    cachePageDetail(detail('a', 'Notes/Daily/a.md'))
+    cachePageDetail(detail('b', 'Notes/Daily/b.md'))
+    cachePageDetail(detail('c', 'Notes/Dailyish/c.md'))
+    useSession.getState().patchPagesFor({ op: 'archive', path: 'Notes/Daily', kind: 'set' })
+    expect(readPageDetail('Notes/Daily/a.md')).toBeUndefined()
+    expect(readPageDetail('Notes/Daily/b.md')).toBeUndefined()
+    expect(readPageDetail('Notes/Dailyish/c.md')).toBeDefined()
+  })
+
   it('a rename re-paths only the renamed page’s slot and leaves the shown linker to the push', async () => {
     seedLinkerAndParked()
     setBodyBase('Notes/tile.md', { text: 'seen', hash: 'h' })
@@ -1433 +1452 @@ describe('store — view search', () => {
     })
   })
 
+  it('opens a search on an archive place', () => {
+    const archive: SelectTarget = { kind: 'archive', id: 'c1' }
+    seed({
+      tabs: [uTab('t1', archive, [archive], 0)],
+      activeTabId: 't1',
+      selection: archive,
+      viewSearch: {},
+    })
+    expect(useSession.getState().searchView('t1')).toBe(true)
+    expect(useSession.getState().viewSearch).toEqual({
+      t1: { key: 'archive:c1', query: '', summon: 1 },
+    })
+  })
+
   it('a second summon keeps the query and raises the summon', () => {
     onContainer()
     useSession.getState().searchView('t1')
```

##### Core/Session/windowSlice.test.ts

```/Core/Session/windowSlice.test.ts diff
@@ -2 +2 @@
 import { beforeEach, describe, expect, it } from 'vitest'
 import type { ReconcileIndex } from './reconcileSelection'
 import { useSession } from './store'
+import type { Reader } from './windowSlice'
 import { stubDialer } from '../vitest.setup'
 
 beforeEach(() => {
@@ -20 +21 @@ const indexOf = (pages: Record<string, string>): ReconcileIndex => ({
 
 describe('reconcileWindow', () => {
   it('keeps the history window while the tree holds its page, and closes it once the page is gone', () => {
-    useSession.setState({ historyTarget: { kind: 'page', id: 'a', path: 'Notes/a.md' } })
+    const page = { kind: 'page', id: 'a', path: 'Notes/a.md' } as const
+    useSession.setState({ reader: { kind: 'history', page } })
     useSession.getState().reconcileWindow(indexOf({ a: 'Notes/a.md' }))
-    expect(useSession.getState().historyTarget).toEqual({
-      kind: 'page',
-      id: 'a',
-      path: 'Notes/a.md',
-    })
+    expect(useSession.getState().reader).toEqual({ kind: 'history', page })
+    useSession.getState().reconcileWindow(indexOf({}))
+    expect(useSession.getState().reader).toBeNull()
+  })
+
+  it('keeps an archive reader through a tree change that holds none of its page', () => {
+    const reader: Reader = {
+      kind: 'archive',
+      page: {
+        kind: 'page',
+        id: 'a',
+        path: '.nexus/archive/c1/Notes/2026-10-20T00-00-00-000Z__A.archived/A.md',
+      },
+      trail: [],
+    }
+    useSession.setState({ reader })
     useSession.getState().reconcileWindow(indexOf({}))
-    expect(useSession.getState().historyTarget).toBeNull()
+    expect(useSession.getState().reader).toBe(reader)
   })
 })
 
 describe('reconcileWindow — a page re-keyed at its path', () => {
-  it('re-keys a window tab and the history target to the page now at their path', () => {
+  it('re-keys a window tab and the history reader to the page now at their path', () => {
     const dead = { kind: 'page', id: '01KZSWEW0WPF1PFWWJSKE8Q83P', path: 'Notes/x.md' } as const
     useSession.getState().openWindowTab(dead)
-    useSession.setState({ historyTarget: dead })
+    useSession.setState({ reader: { kind: 'history', page: dead } })
     useSession.getState().reconcileWindow(indexOf({ x: 'Notes/x.md' }))
     const live = { kind: 'page', id: 'x', path: 'Notes/x.md' }
     expect(useSession.getState().windowSlot?.tabs.map((t) => t.target)).toEqual([live])
-    expect(useSession.getState().historyTarget).toEqual(live)
+    expect(useSession.getState().reader).toEqual({ kind: 'history', page: live })
   })
 })
 
```

##### Core/Settings/NexusRows.test.tsx

```/Core/Settings/NexusRows.test.tsx diff
@@ -67 +67 @@ const render = async (
 
 const buttons = (): HTMLButtonElement[] => Array.from(host.querySelectorAll('button'))
 const button = (label: string): HTMLButtonElement | undefined =>
-  buttons().find((b) => b.textContent === label)
+  buttons().find((b) => (b.querySelector('[data-face="shown"]') ?? b).textContent === label)
 
 const refuse = (message: string) =>
   vi.fn(async () => ({ ok: false, error: { code: 'operation-failed', message } }))
```

##### Core/Settings/TrashFrame.test.tsx

```/Core/Settings/TrashFrame.test.tsx diff
@@ -2 +2 @@
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { act } from 'react'
 import { createRoot, type Root } from 'react-dom/client'
-import type { TrashRow } from '../Trash/trashRow'
-import { matchKey } from '../Paths/caseFold'
-import { countPhrase, filterRows, TrashFrame } from './TrashFrame'
+import type { BundleRow } from '../Bundles/rows'
+import { TrashFrame } from './TrashFrame'
+import { bundleRow as row } from '../Testing/fixtures'
 import { stubDialer } from '../vitest.setup'
 import { useSession } from '../Session/store'
 import { makeTree } from '../Testing/testTree'
 import { personalizationOf } from '../Session/configSlice'
 import { notifyTrashed } from '../Interface/Confirm/confirmations'
-import { currentNotification } from '../Interface/Notifications/notifications'
+import { clearNotification, currentNotification } from '../Interface/Notifications/notifications'
 import { pushUndo, resetUndo, undoValue } from '../Session/undo'
 import { pageIO, scheduleBodySave } from '../Session/saveScheduler'
+import { storesChanged } from '../Session/nexusSlice'
 
 ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
 
-const row = (over: Partial<TrashRow>): TrashRow => {
-  const { title = 'Alpha', crumbs = [{ kind: 'collection', title: 'Notes' }] } = over
-  return {
-    bundlePath: `.trash/${over.title ?? 'x'}.deleted`,
-    kind: 'page',
-    title,
-    crumbs,
-    deletedAt: 0,
-    homeResolves: true,
-    match: matchKey(title, crumbs.map((c) => c.title).join('/')),
-    ...over,
-  }
-}
-
-describe('filterRows', () => {
-  const rows = [
-    row({ title: 'Alpha', crumbs: [{ kind: 'collection', title: 'Notes' }] }),
-    row({ title: 'Beta', crumbs: [{ kind: 'collection', title: 'Journals' }] }),
-    row({ title: 'Gamma', crumbs: [] }),
-  ]
-
-  it('an empty query keeps the list whole and in the order it arrived', () => {
-    expect(filterRows(rows, '').map((r) => r.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
-    expect(filterRows(rows, '   ')).toBe(rows)
-  })
-
-  it('matches a title', () => {
-    expect(filterRows(rows, 'bet').map((r) => r.title)).toEqual(['Beta'])
-  })
-
-  it('matches a location, so a row is findable by where it lived', () => {
-    expect(filterRows(rows, 'journ').map((r) => r.title)).toEqual(['Beta'])
-  })
-
-  it('matches a location and a title together, a / reading as a word break', () => {
-    expect(filterRows(rows, 'notes/alpha').map((r) => r.title)).toEqual(['Alpha'])
-  })
-
-  it('a query nothing answers yields nothing', () => {
-    expect(filterRows(rows, 'zzz')).toEqual([])
-  })
-
-  it('a row with no location is still matched on its title alone', () => {
-    expect(filterRows(rows, 'gamma').map((r) => r.title)).toEqual(['Gamma'])
-  })
-})
-
-describe('countPhrase', () => {
-  it('names the kind when every row shares one', () => {
-    expect(countPhrase([row({}), row({})])).toBe('2 pages')
-    expect(countPhrase([row({ kind: 'set' }), row({ kind: 'set' })])).toBe('2 sets')
-    expect(countPhrase([row({ kind: 'context' }), row({ kind: 'context' })])).toBe('2 contexts')
-  })
-
-  it('generalizes when they do not', () => {
-    expect(countPhrase([row({}), row({ kind: 'space' })])).toBe('2 Items')
-  })
-
-  it('stays singular for one', () => {
-    expect(countPhrase([row({})])).toBe('1 page')
-    expect(countPhrase([row({ kind: 'space' })])).toBe('1 space')
-  })
-
-  it('reports none honestly', () => {
-    expect(countPhrase([])).toBe('0 Items')
-  })
-})
-
 describe('a Trash row', () => {
   let host: HTMLDivElement | null = null
   let root: Root | null = null
 
   beforeEach(() => {
     ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
-      'trash:list': vi.fn(async () => ({ ok: true, value: [row({ title: 'Alpha' })] })),
+      'bundles:list': vi.fn(async () => ({ ok: true, value: [row({ title: 'Alpha' })] })),
     })
   })
   afterEach(async () => {
@@ -107 +40 @@ describe('a Trash row', () => {
     await act(async () => root?.render(<TrashFrame />))
     const box = host.querySelector('[role="checkbox"]') as HTMLButtonElement
     expect(box.getAttribute('aria-checked')).toBe('false')
-    expect(host.querySelector('.has-checked')).toBeNull()
+    expect(host.querySelector('[data-reveal-host="on"]')).toBeNull()
     await act(async () => box.click())
     expect(box.getAttribute('aria-checked')).toBe('true')
-    expect(host.querySelector('.has-checked')).not.toBeNull()
+    expect(host.querySelector('[data-reveal-host="on"]')).not.toBeNull()
+  })
+
+  it('a search that hides the checked row shows no box', async () => {
+    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+      'bundles:list': vi.fn(async () => ({
+        ok: true,
+        value: [row({ title: 'Alpha' }), row({ title: 'Beta' })],
+      })),
+    })
+    host = document.createElement('div')
+    document.body.appendChild(host)
+    root = createRoot(host)
+    await act(async () => root?.render(<TrashFrame />))
+    const box = host.querySelector('[role="checkbox"]') as HTMLButtonElement
+    await act(async () => box.click())
+    const search = host.querySelector('input') as HTMLInputElement
+    await act(async () => {
+      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
+        search,
+        'Beta',
+      )
+      search.dispatchEvent(new Event('input', { bubbles: true }))
+    })
+    expect(host.querySelectorAll('.trash-row')).toHaveLength(1)
+    expect(host.querySelector('[data-reveal-host="on"]')).toBeNull()
+  })
+
+  it('draws its item’s own icon ahead of its kind’s', async () => {
+    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+      'bundles:list': vi.fn(async () => ({ ok: true, value: [row({ icon: 'hash' })] })),
+    })
+    host = document.createElement('div')
+    document.body.appendChild(host)
+    root = createRoot(host)
+    await act(async () => root?.render(<TrashFrame />))
+    expect(host.querySelector('.lucide-hash')).not.toBeNull()
   })
 })
 
 describe('the Trash pane', () => {
   let host: HTMLDivElement | null = null
   let root: Root | null = null
-  let listed: TrashRow[]
+  let listed: BundleRow[]
+  let list: ReturnType<typeof vi.fn>
   let picked: string | null
   let mutated: ReturnType<typeof vi.fn>
 
@@ -134 +104 @@ describe('the Trash pane', () => {
     listed = [row({ title: 'Alpha' })]
     picked = null
     mutated = vi.fn(async () => ({ ok: true, value: {} }))
+    list = vi.fn(async () => ({ ok: true, value: listed }))
     ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
-      'trash:list': vi.fn(async () => ({ ok: true, value: listed })),
+      'bundles:list': list,
       menu: vi.fn(async () => ({ ok: true, value: picked })),
       'personalization:set': vi.fn(async () => ({ ok: true, value: null })),
       mutate: mutated,
@@ -160 +131 @@ describe('the Trash pane', () => {
 
   it("lists the opened Nexus's trash after a switch", async () => {
     expect(titles()).toEqual(['Alpha'])
+    expect(list).toHaveBeenCalledWith({ kind: 'trash' }, undefined)
     listed = [row({ title: 'Beta' })]
     await act(async () => nexus('B'))
     expect(titles()).toEqual(['Beta'])
@@ -210 +182 @@ describe('the Trash pane', () => {
     const older = vi.fn(() => true)
     pushUndo(older)
     const { bundlePath } = listed[0]
-    notifyTrashed('Alpha', { trashed: { bundlePath } })
+    notifyTrashed('Alpha', { bundled: { bundlePath } })
     useSession.setState({ askConfirm: async () => true })
     mutated.mockClear()
     picked = action
@@ -226 +198 @@ describe('the Trash pane', () => {
   it('a restore here that is refused leaves the bundle’s Undo on the chord', async () => {
     resetUndo()
     const { bundlePath } = listed[0]
-    notifyTrashed('Alpha', { trashed: { bundlePath } })
+    notifyTrashed('Alpha', { bundled: { bundlePath } })
     mutated.mockResolvedValue({ ok: false, error: { code: 'io', message: 'No.' } })
     picked = 'restore'
     const item = host?.querySelector('.trash-row') as HTMLElement
@@ -245 +217 @@ describe('the Trash pane', () => {
     resetUndo()
     const older = vi.fn(() => true)
     pushUndo(older)
-    notifyTrashed('Alpha', { trashed: { bundlePath: listed[0].bundlePath } })
+    notifyTrashed('Alpha', { bundled: { bundlePath: listed[0].bundlePath } })
     for (const box of host?.querySelectorAll('[role="checkbox"]') ?? [])
       await act(async () => (box as HTMLButtonElement).click())
-    picked = 'restoreAll'
+    picked = 'restore'
     const item = host?.querySelector('.trash-row') as HTMLElement
     await act(async () => {
       item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
@@ -258 +230 @@ describe('the Trash pane', () => {
     expect(older).toHaveBeenCalledTimes(1)
   })
 
-  const pickForBoth = async (action: string): Promise<void> => {
-    listed = [row({ title: 'Alpha' }), row({ title: 'Beta' })]
+  const pickForBoth = async (
+    action: string,
+    both = [row({ title: 'Alpha' }), row({ title: 'Beta' })],
+  ): Promise<void> => {
+    listed = both
     await act(async () => nexus('B'))
     for (const box of host?.querySelectorAll('[role="checkbox"]') ?? [])
       await act(async () => (box as HTMLButtonElement).click())
@@ -273 +248 @@ describe('the Trash pane', () => {
   it('a Restore All lands every pending save before its first restore', async () => {
     const order: string[] = []
     ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
-      'trash:list': vi.fn(async () => ({ ok: true, value: listed })),
+      'bundles:list': vi.fn(async () => ({ ok: true, value: listed })),
       menu: vi.fn(async () => ({ ok: true, value: picked })),
       'page:updateBody': vi.fn(async (path: string) => {
         order.push(`save ${path}`)
@@ -285 +260 @@ describe('the Trash pane', () => {
       }),
     })
     scheduleBodySave('Notes/A.md', 'typed', pageIO)
-    await pickForBoth('restoreAll')
+    await pickForBoth('restore')
     expect(order).toEqual(['save Notes/A.md', 'mutate', 'mutate'])
   })
 
   it('carries what a Restore All couldn’t re-spell into its notice', async () => {
     const warning = 'Couldn’t update links in “Alpha” across 1 Item.'
     mutated.mockResolvedValue({ ok: true, value: { cascade: { pages: [], hosts: [], warning } } })
-    await pickForBoth('restoreAll')
+    await pickForBoth('restore')
     expect(currentNotification()).toMatchObject({
-      message: `Restored 2 pages. ${warning}`,
+      message: `Restored 2 Pages. ${warning}`,
       tone: 'error',
     })
   })
@@ -303 +278 @@ describe('the Trash pane', () => {
     useSession.setState({ askConfirm: async () => true })
     const warning = 'Couldn’t update links in 1 Item.'
     mutated.mockResolvedValue({ ok: true, value: { cascade: { pages: [], hosts: [], warning } } })
-    await pickForBoth('deleteAll')
+    await pickForBoth('delete')
+    expect(currentNotification()).toMatchObject({
+      message: `Deleted 2 Pages. ${warning}`,
+      tone: 'error',
+    })
+  })
+
+  it('names the title a restore here stepped to', async () => {
+    mutated.mockResolvedValue({ ok: true, value: { landedAs: 'Alpha (2)' } })
+    picked = 'restore'
+    const item = host?.querySelector('.trash-row') as HTMLElement
+    await act(async () => {
+      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
+    })
+    expect(currentNotification()).toMatchObject({
+      message: 'Restored “Alpha” as “Alpha (2)”',
+      tone: 'normal',
+    })
+  })
+
+  it('a Restore All with one renamed names it in the segment', async () => {
+    mutated.mockResolvedValueOnce({ ok: true, value: { landedAs: 'Alpha (2)' } })
+    await pickForBoth('restore')
     expect(currentNotification()).toMatchObject({
-      message: `Deleted 2 pages. ${warning}`,
+      message: 'Restored 2 Pages',
+      segment: '“Alpha” as “Alpha (2)”',
+    })
+  })
+
+  it('a Restore All with several renamed counts them', async () => {
+    mutated
+      .mockResolvedValueOnce({ ok: true, value: { landedAs: 'Alpha (2)' } })
+      .mockResolvedValueOnce({ ok: true, value: { landedAs: 'Beta (2)' } })
+    await pickForBoth('restore')
+    expect(currentNotification()).toMatchObject({ segment: '2 Renamed' })
+  })
+
+  it('a Restore All of rows with nowhere to go restores nothing and says only that', async () => {
+    await pickForBoth('restore', [
+      row({ title: 'Alpha', homeResolves: false }),
+      row({ title: 'Beta', homeResolves: false }),
+    ])
+    expect(mutated).not.toHaveBeenCalled()
+    expect(currentNotification()).toMatchObject({
+      message: '2 Pages had nowhere to go — restore those one at a time to choose where.',
       tone: 'error',
     })
   })
 
+  it('a Nexus switch during a batch stops it, posting no notice and telling the stores once', async () => {
+    clearNotification()
+    const heard = vi.fn()
+    const unsubscribe = storesChanged.subscribe(heard)
+    mutated.mockImplementationOnce(async () => {
+      nexus('C')
+      return { ok: true, value: {} }
+    })
+    await pickForBoth('restore')
+    unsubscribe()
+    expect(mutated).toHaveBeenCalledTimes(1)
+    expect(currentNotification()).toBeNull()
+    expect(heard).toHaveBeenCalledTimes(1)
+  })
+
   it('lists a delete made elsewhere while it is open', async () => {
     listed = [row({ title: 'Alpha' }), row({ title: 'Gamma' })]
     await act(async () => {
```

##### Core/Settings/handlers.test.ts

```/Core/Settings/handlers.test.ts diff
@@ -2 +2 @@ import { describe, expect, it, vi } from 'vitest'
 import type { HostContext } from '../Contract/handlers'
 import { fault } from '../Contract/result'
 
-const { writePersonalization } = vi.hoisted(() => ({ writePersonalization: vi.fn() }))
+const { writePersonalization, sweepFileHistory } = vi.hoisted(() => ({
+  writePersonalization: vi.fn(),
+  sweepFileHistory: vi.fn(),
+}))
 vi.mock('../Nexus/session', () => ({ sessionRoot: () => '/root', adopting: () => false }))
 vi.mock('./settings', () => ({ writePersonalization }))
+vi.mock('../Pages/fileHistory', () => ({ sweepFileHistory }))
 
 const { settingsHandlers } = await import('./handlers')
 
@@ -18 +22 @@ describe('personalization:set', () => {
     await settingsHandlers['personalization:set'](ctx, 'openLinksInApp', 'yes')
     expect(writePersonalization).toHaveBeenCalledWith('/root', 'openLinksInApp', undefined)
   })
+
+  it('sweeps file history when either timeframe is written, and for no other key', async () => {
+    const ctx = { push: vi.fn(), applyZoom: vi.fn() } as unknown as HostContext
+    await settingsHandlers['personalization:set'](ctx, 'openLinksInApp', true)
+    expect(sweepFileHistory).not.toHaveBeenCalled()
+    for (const key of ['historyDays', 'archiveHistoryDays']) {
+      sweepFileHistory.mockClear()
+      await settingsHandlers['personalization:set'](ctx, key, 14)
+      expect(sweepFileHistory).toHaveBeenCalledWith('/root')
+    }
+  })
 })
```

##### Core/Settings/personalization.test.ts

```/Core/Settings/personalization.test.ts diff
@@ -1 +1 @@
 import { describe, it, expect } from 'vitest'
 import { readPersonalization } from './codec'
 import {
+  HISTORY_DAYS,
   type Personalization,
   TAB_MIN_WIDTH,
   PREVIEW_LINGER_MS,
   SETTING_DEFAULTS,
+  settingOf,
   settingValue,
 } from './personalization'
 
@@ -168 +170 @@ describe('every decode helper at its boundary', () => {
     expect(readPersonalization([1, 2])).toEqual({})
   })
 })
+
+describe('settingOf on a bounded setting', () => {
+  it('follows its bound until picked, then holds the pick', () => {
+    expect(settingOf({}, 'archiveHistoryDays')).toBe(HISTORY_DAYS.default)
+    expect(settingOf({ historyDays: 14 }, 'archiveHistoryDays')).toBe(14)
+    expect(settingOf({ historyDays: 14, archiveHistoryDays: 7 }, 'archiveHistoryDays')).toBe(7)
+  })
+})
```

##### Core/Settings/settings.test.ts

```/Core/Settings/settings.test.ts diff
@@ -2 +2 @@ import { describe, it, expect, beforeEach, afterEach } from 'vitest'
 import { rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
 import { tempRoot, readJsonAt } from '../Testing/hostFs'
 import {
+  carrySetAside,
   readWatchScope,
   readLiveSetting,
   updateSettings,
@@ -71 +72 @@ describe('writeExcludedFolders', () => {
   })
 })
 
+describe('carrySetAside', () => {
+  it('writes each landing entry just ahead of its source, and its drop leaves the landing alone', async () => {
+    await write({ excluded_folders: ['Archive', 'Old/Private', 'Old/Deep/Raw'] })
+    const carried = await carrySetAside(root, 'Old', 'New')
+    if (!carried.ok) throw new Error(carried.error.message)
+    expect((await readSettings()).excluded_folders).toEqual([
+      'Archive',
+      'New/Private',
+      'Old/Private',
+      'New/Deep/Raw',
+      'Old/Deep/Raw',
+    ])
+    await carried.value.drop()
+    expect((await readSettings()).excluded_folders).toEqual([
+      'Archive',
+      'New/Private',
+      'New/Deep/Raw',
+    ])
+  })
+
+  it('moves the asset directory in the same write, holding its source as an excluded entry until the drop', async () => {
+    await write({ asset_directory: 'Old/Media' })
+    const carried = await carrySetAside(root, 'Old', 'New')
+    if (!carried.ok) throw new Error(carried.error.message)
+    expect(await readSettings()).toEqual({
+      asset_directory: 'New/Media',
+      excluded_folders: ['Old/Media'],
+    })
+    await carried.value.drop()
+    expect(await readSettings()).toEqual({ asset_directory: 'New/Media' })
+  })
+
+  it('refuses while settings.json can’t be written, leaving it byte-identical', async () => {
+    await write({ excluded_folders: ['Old/Private'] })
+    await readWatchScope(root)
+    await writeFile(path(), '{ corrupt', 'utf8')
+    const carried = await carrySetAside(root, 'Old', 'New')
+    expect(carried.ok ? '' : carried.error.message).toContain('settings.json')
+    expect(await readFile(path(), 'utf8')).toBe('{ corrupt')
+  })
+
+  it('writes nothing when no entry or asset directory sits under the source', async () => {
+    await write({ excluded_folders: ['Archive'] })
+    const before = await readFile(path(), 'utf8')
+    const carried = await carrySetAside(root, 'Old', 'New')
+    if (!carried.ok) throw new Error(carried.error.message)
+    await carried.value.drop()
+    expect(await readFile(path(), 'utf8')).toBe(before)
+  })
+})
+
 describe('an unreadable settings.json is never replaced', () => {
   it('updateSettings refuses a corrupt file, names it, and leaves it byte-identical', async () => {
     await writeFile(path(), '{ corrupt', 'utf8')
@@ -114 +166 @@ describe('the permanent-delete switch — what emptying the trash means', () =>
   })
 })
 
+describe('the archive timeframe never exceeds History Timeframe', () => {
+  const personalization = async (): Promise<unknown> => (await readSettings()).personalization
+
+  it('shortening History Timeframe below a picked archive timeframe lowers it in the same write', async () => {
+    await write({ personalization: { historyDays: 60, archiveHistoryDays: 30 } })
+    await writePersonalization(root, 'historyDays', 14)
+    expect(await personalization()).toEqual({ historyDays: 14, archiveHistoryDays: 14 })
+  })
+
+  it('lengthening History Timeframe leaves a pick where it is, and an unpicked one unwritten', async () => {
+    await write({ personalization: { historyDays: 14, archiveHistoryDays: 7 } })
+    await writePersonalization(root, 'historyDays', 60)
+    expect(await personalization()).toEqual({ historyDays: 60, archiveHistoryDays: 7 })
+    await write({ personalization: {} })
+    await writePersonalization(root, 'historyDays', 7)
+    expect(await personalization()).toEqual({ historyDays: 7 })
+  })
+
+  it('a pick above History Timeframe lands at it', async () => {
+    await write({ personalization: { historyDays: 14 } })
+    await writePersonalization(root, 'archiveHistoryDays', 60)
+    expect(await personalization()).toEqual({ historyDays: 14, archiveHistoryDays: 14 })
+  })
+})
+
 describe('the live-tree fast path', () => {
   afterEach(() => dropLiveTree())
 
```

##### Core/Tiles/tilesFile.test.ts

```/Core/Tiles/tilesFile.test.ts diff
@@ -21 +21 @@ import type { TileDoc } from './tiles'
 import { tileDocPath, tileFilePath, homepageDir } from '../Paths/paths'
 import { machine } from '../Platform/machine'
 import { rewriteConnections } from '../Connections/rewrite'
-import type { TrashDeps } from '../Trash/bundle'
+import type { TrashDeps } from '../Trash/discard'
 import { dropLiveTree } from '../Nexus/liveTree'
 
 const append = { kind: 'append' } as const
```

##### Core/Trash/deleteOrder.test.ts

```/Core/Trash/deleteOrder.test.ts diff
@@ -9 +9 @@ import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { pathExists } from '../Files/atomicWrite'
 import { handleMutate } from '../Nexus/mutate'
 import { contextsDir, contextsRegistryFile } from '../Paths/paths'
-import { listBundles } from './holdings'
+import { listBundles } from '../Bundles/bundle'
 import { machine } from '../Platform/machine'
 
 import { closeSession, openSession } from '../Nexus/session'
-import { BUNDLE_SUFFIX, type TrashDeps } from './bundle'
+import type { TrashDeps } from './discard'
 
 const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
 const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'
@@ -72 +72 @@ vi.mock('../Files/atomicWrite', async (importOriginal) => {
     ...actual,
     relocate: async (...args: Parameters<typeof actual.relocate>) => {
       const bundleDir = dirname(args[1])
-      if (bundleDir.endsWith(BUNDLE_SUFFIX)) {
+      if (bundleDir.endsWith('.deleted')) {
         atSettle = await actual.readJsonObject(join(bundleDir, '_record.json'))
         if (settleFails) throw new Error('the process died before the artifact moved')
       }
@@ -207 +207 @@ describe('the record is written before the destruction it describes', () => {
     expect(atSettle).toMatchObject({ entity: 'context', membership: [{ root: { id: PAGE_A } }] })
   })
 
+  it('a delete from the Archive records, with the bundle it left, before the artifact moves', async () => {
+    const archived = await handleMutate(
+      root,
+      { op: 'archive', path: 'Notes/Alpha.md', kind: 'page' },
+      nexusDeps,
+    )
+    const archive = archived.ok ? archived.value.bundled?.bundlePath : undefined
+    expect(archive).toBeDefined()
+    const r = await handleMutate(root, { op: 'delete', path: archive!, kind: 'page' }, nexusDeps)
+    expect(r.ok).toBe(true)
+    expect(atSettle).toMatchObject({ entity: 'page', archive, partial: true })
+  })
+
   it('system-trash mode records nothing and mints no bundle', async () => {
     const r = await handleMutate(
       root,
@@ -285 +298 @@ describe('a deletion cut short leaves evidence, never silence', () => {
     expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(true)
     // The record survives as evidence, and the listing refuses to offer an unfinished deletion.
     expect(await anyRecord()).toMatchObject({ entity: 'page', id: PAGE_A })
-    expect(await listBundles(root)).toHaveLength(0)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
   })
 
   it('a Space delete that dies before the settle still names what the sweep took', async () => {
@@ -299 +312 @@ describe('a deletion cut short leaves evidence, never silence', () => {
     expect(await tagOf()).toBeUndefined()
     expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora'))).toBe(true)
     expect(await anyRecord()).toMatchObject({ members: [{ id: PAGE_A, kind: 'page' }] })
-    expect(await listBundles(root)).toHaveLength(0)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
   })
 })
 
@@ -325 +338 @@ describe('a page delete waits out a save in flight', () => {
     release()
     await save
     const r = await del
-    if (!r.ok || !r.value.trashed) throw new Error('the delete did not trash')
+    if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
     expect(await pathExists(file)).toBe(false)
-    expect(await readFile(join(root, r.value.trashed.bundlePath, 'Alpha.md'), 'utf8')).toBe('saved')
+    expect(await readFile(join(root, r.value.bundled.bundlePath, 'Alpha.md'), 'utf8')).toBe('saved')
   })
 })
```

##### Core/Trash/deleteReach.test.ts

```/Core/Trash/deleteReach.test.ts diff
@@ -6 +6 @@ import { newContentId, newId } from '../Nexus/ids'
 import { ID_KEY } from '../Nexus/identityMark'
 import { join } from '../Paths/posix'
 import { noModeBits, putJson, readJsonAt, tempRoot } from '../Testing/hostFs'
+import { pathExists } from '../Files/atomicWrite'
 import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
 import { settledMutate } from '../Testing/settledMutate'
 import { createFolderEntity } from '../Nexus/folderEntity'
@@ -20 +21 @@ import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME } from '../Paths/nexusPaths'
 import { unsweptLine } from '../Properties/governedSweep'
 import type { FilterGroup } from '../Views/filterRules'
 import { filterSeeds } from '../Views/Pipeline/creationSeeds'
-import type { TrashDeps } from './bundle'
+import type { TrashDeps } from './discard'
 
 type Raw = Record<string, unknown>
 
@@ -116 +117 @@ describe('a page delete', () => {
     await writeFile(loose, content)
     await refreshTree(root)
     const r = await del('Notes/Target.md', 'page')
-    if (!r.ok || !r.value.trashed) throw new Error('the delete did not trash')
+    if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
     expect(r.value.cascade?.pages ?? []).toEqual([])
-    expect((await recordOf(r.value.trashed.bundlePath)).links ?? []).toEqual([])
+    expect((await recordOf(r.value.bundled.bundlePath)).links ?? []).toEqual([])
     expect(await readFile(loose, 'utf8')).toBe(content)
   })
 
@@ -127 +128 @@ describe('a page delete', () => {
     await copyFile(twin, join(notes, 'Twin copy.md'))
     await refreshTree(root)
     const r = await del('Notes/Target.md', 'page')
-    if (!r.ok || !r.value.trashed) throw new Error('the delete did not trash')
+    if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
     expect(r.value.cascade).toEqual({
       pages: [],
       hosts: [],
       warning: unsweptLine(2, 'links in '),
     })
     expect(splitFrontmatter(await readFile(twin, 'utf8')).Related).toBe('[[Target]]')
-    expect(await recordOf(r.value.trashed.bundlePath)).toMatchObject({ partial: true })
-    expect((await recordOf(r.value.trashed.bundlePath)).links).toBeUndefined()
+    expect(await recordOf(r.value.bundled.bundlePath)).toMatchObject({ partial: true })
+    expect((await recordOf(r.value.bundled.bundlePath)).links).toBeUndefined()
   })
 
   it('replies with an empty report when nothing links it', async () => {
@@ -255 +256 @@ describe('a Set delete', () => {
 
   const trashGone = async (): Promise<string> => {
     const r = await del('Notes/Gone', 'set')
-    const bundlePath = r.ok ? r.value.trashed?.bundlePath : undefined
+    const bundlePath = r.ok ? r.value.bundled?.bundlePath : undefined
     if (!bundlePath) throw new Error('the delete did not trash')
     return bundlePath
   }
@@ -327 +328 @@ describe('a Set delete', () => {
       { op: 'delete', path: 'Notes/Gone', kind: 'set' },
       systemDeps,
     )
-    expect(r.ok && r.value.trashed).toBeUndefined()
+    expect(r.ok && r.value.bundled).toBeUndefined()
     expect(r.ok && r.value.cascade?.hosts).toEqual([
       { host: { kind: 'space', id: 'sp_home' }, ids: [] },
     ])
@@ -344 +345 @@ describe('a Set delete', () => {
     const held = await readFile(inside, 'utf8')
     await refreshTree(root)
     const r = await del('Notes/Gone', 'set')
-    if (!r.ok || !r.value.trashed) throw new Error('the delete did not trash')
+    if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
     r.value.cascade?.pages.sort()
     expect(r.value.cascade).toEqual({
       pages: ['Notes/Far.md', 'Notes/Outside.md'],
       hosts: [{ host: { kind: 'space', id: 'sp_home' }, ids: [] }],
     })
     expect(
-      await readFile(join(root, r.value.trashed.bundlePath, 'Gone', 'Inside.md'), 'utf8'),
+      await readFile(join(root, r.value.bundled.bundlePath, 'Gone', 'Inside.md'), 'utf8'),
     ).toBe(held)
-    expect((await recordOf(r.value.trashed.bundlePath)).links).toEqual(
+    expect((await recordOf(r.value.bundled.bundlePath)).links).toEqual(
       expect.arrayContaining([
         { page: await idOf(outside), property: 'prop_related', value: '[[Inner]]' },
         { page: await idOf(far), property: 'prop_related', value: '[[Deep]]' },
@@ -379 +380 @@ describe('a Set delete', () => {
     await chmod(locked.path, 0o555)
     try {
       const r = await del('Notes/Gone', 'set')
-      if (!r.ok || !r.value.trashed) throw new Error('the delete did not trash')
+      if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
       expect(r.value.cascade?.warning).toBe(`${unsweptLine(1, 'links in ')} ${unsweptLine(1)}`)
-      expect((await recordOf(r.value.trashed.bundlePath)).partial).toBe(true)
+      expect((await recordOf(r.value.bundled.bundlePath)).partial).toBe(true)
     } finally {
       await chmod(locked.path, 0o755)
     }
@@ -431 +432 @@ describe('a Collection delete', () => {
       preview: null,
     })
   })
+  describe('to the system trash', () => {
+    const systemDeps: TrashDeps = {
+      trashMode: 'system',
+      trashToSystem: (abs) => rm(abs, { recursive: true, force: true }),
+    }
+    const archived = async (): Promise<string> =>
+      join(
+        root,
+        '.nexus',
+        'archive',
+        String((await readJsonAt(sidecarPath(notes, 'collection'))).id),
+      )
+    const deleteNotes = () =>
+      settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, systemDeps)
+
+    it('a Collection deleted to the system trash takes its Archive, its pages’ links stripped', async () => {
+      await addRelated()
+      await page(notes, 'Gone')
+      const other = await entity(root, 'collection', 'Other')
+      const linker = await page(other.path, 'Linker', 'Gone')
+      await refreshTree(root)
+      await settledMutate(root, { op: 'archive', path: 'Notes/Gone.md', kind: 'page' }, nexusDeps)
+      const archive = await archived()
+      const r = await deleteNotes()
+      expect(r.ok && r.value.cascade?.pages).toEqual(['Other/Linker.md'])
+      expect(await pathExists(archive)).toBe(false)
+      expect(splitFrontmatter(await readFile(linker, 'utf8')).Related).toBeUndefined()
+    })
+
+    it('a Collection deleted to the system trash takes the saved views naming the Sets in its Archive', async () => {
+      const daily = await entity(notes, 'set', 'Daily')
+      const other = await entity(root, 'collection', 'Other')
+      const otherFile = sidecarPath(other.path, 'collection')
+      await putJson(otherFile, {
+        ...(await readJsonAt(otherFile)),
+        views: [view([{ property_id: '_location', op: 'is', values: [daily.id, other.id] }])],
+      })
+      await refreshTree(root)
+      await settledMutate(root, { op: 'archive', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
+      expect((await deleteNotes()).ok).toBe(true)
+      expect((await readJsonAt(otherFile)).views).toEqual([
+        view([{ property_id: '_location', op: 'is', values: [other.id] }]),
+      ])
+    })
+  })
 })
```

##### Core/Trash/restoreProperty.test.ts

```/Core/Trash/restoreProperty.test.ts diff
@@ -1 +1 @@
 import { readFile, rename, rm, mkdir, stat, utimes, writeFile } from 'node:fs/promises'
 import { writePageValue, writeSpaceValue } from '../Testing/propertyWrites'
-import { join } from '../Paths/posix'
+import { dirname, join } from '../Paths/posix'
 import { contextsDir, contextsRegistryFile, sidecarPath } from '../Paths/paths'
 import { tempRoot, readJsonAt } from '../Testing/hostFs'
 import { createContextGroup, createSpace } from '../Contexts/contextWrite'
-import { newId } from '../Nexus/ids'
+import { newContentId, newId } from '../Nexus/ids'
 import { afterEach, beforeEach, describe, expect, it } from 'vitest'
 import type { PropertyDefinition } from '../Properties/properties'
 import { handleMutate } from '../Nexus/mutate'
 import { readRegistry } from '../Properties/propertiesRegistry'
-import { listBundles } from './holdings'
+import { listBundles } from '../Bundles/bundle'
 import { splitFrontmatter } from '../Files/pageFile'
 import { readJsonObject } from '../Files/atomicWrite'
 import { closeSession, openSession } from '../Nexus/session'
+import { refreshTree } from '../Nexus/liveTree'
 import { assignProperty } from '../Properties/assignment'
 import { createFolderEntity } from '../Nexus/folderEntity'
 import { createTestPage } from '../Testing/createTestPage'
 import { deleteProperty } from '../Properties/deleteProperty'
 import { removeProperty } from '../Properties/removeProperty'
 import { createProperty } from '../Properties/registryProperty'
-import type { TrashDeps } from './bundle'
+import type { TrashDeps } from './discard'
 
 const deps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
 
@@ -57 +58 @@ async function seedPriority(): Promise<string> {
   return c.value.id
 }
 
+const archivedPage = async (fm: string): Promise<string> => {
+  const cid = (await readJsonObject(sidecarPath(notes, 'collection')))?.id as string
+  const file = join(
+    root,
+    '.nexus/archive',
+    cid,
+    'Notes/2026-10-20T12-00-00-000Z__Old.md.archived/Old.md',
+  )
+  await mkdir(dirname(file), { recursive: true })
+  await writeFile(file, `---\nID: ${newContentId('page')}\n${fm}---\nb\n`)
+  return file
+}
+
 const onlyBundlePath = async (): Promise<string> => {
-  const listed = await listBundles(root)
+  const listed = await listBundles(root, { kind: 'trash' })
   expect(listed).toHaveLength(1)
   return listed[0].bundlePath
 }
@@ -149 +163 @@ describe('restoring a deleted property', () => {
     expect(await assigns(tasks, id)).toBe(true)
     expect(await valueOn(p1.value.path, 'Priority')).toEqual(['hi'])
     expect(await valueOn(p2.value.path, 'Priority')).toEqual(['lo'])
-    expect(await listBundles(root)).toHaveLength(0)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
   })
 
   it('comes back with the option keys its record holds, refilling the pages that held them', async () => {
@@ -195 +209 @@ describe('restoring a deleted property', () => {
       label: 'Priority (2)',
       key: 'Priority (2)',
     })
-    expect(await listBundles(root)).toHaveLength(0)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
   })
 
   it('refuses when the property id is live again', async () => {
@@ -212 +226 @@ describe('restoring a deleted property', () => {
     const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
     expect(r.ok).toBe(false)
     expect((await readRegistry(root)).defs[id]).toMatchObject({ label: 'Urgency', key: 'Urgency' })
-    expect(await listBundles(root)).toHaveLength(1)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
   })
 
   it('a value that no longer validates does not return', async () => {
@@ -248 +262 @@ describe('restoring a deleted property', () => {
     expect(await valueOn(page.value.path, 'Priority')).toBeUndefined()
 
     const deleted = await deleteProperty(root, id)
-    expect(deleted.ok && deleted.value.trashed?.bundlePath).toBe(await onlyBundlePath())
+    expect(deleted.ok && deleted.value.bundled?.bundlePath).toBe(await onlyBundlePath())
     await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
     expect(await assigns(tasks, id)).toBe(false)
     expect(await valueOn(page.value.path, 'Priority')).toBeUndefined()
@@ -285 +299 @@ describe('restoring a deleted property', () => {
     expect(r.ok).toBe(true)
     expect(await assigns(notes, id)).toBe(true)
     expect(await valueOn(p1.value.path, 'Priority')).toEqual(['hi'])
-    expect(await listBundles(root)).toHaveLength(0)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
   })
 
   it('a Space value comes back on its sidecar and decodes', async () => {
@@ -363 +377 @@ describe('restoring a deleted property', () => {
     expect(await valueOn(dead.value.path, 'Related')).toBeUndefined()
   })
 
+  it('a value whose page shares its id with a copy goes back to neither, and is named', async () => {
+    const id = await seedPriority()
+    const page = await createTestPage(notes, 'A', { body: 'b' })
+    if (!page.ok) throw new Error('page failed')
+    await writePageValue(page.value.path, await liveDef(id), { kind: 'select', value: 'hi' })
+    expect((await deleteProperty(root, id)).ok).toBe(true)
+    const copy = join(notes, 'A copy.md')
+    await writeFile(copy, await readFile(page.value.path, 'utf8'))
+    await refreshTree(root)
+    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
+    expect(r).toEqual({ ok: true, value: { unrestored: ['A copy'] } })
+    for (const file of [page.value.path, copy])
+      expect(await valueOn(file, 'Priority')).toBeUndefined()
+  })
+
+  it('a value comes back on an archived page, written where the Archive holds it', async () => {
+    const id = await seedPriority()
+    const old = await archivedPage('Priority: hi\n')
+    expect((await deleteProperty(root, id)).ok).toBe(true)
+    expect(await valueOn(old, 'Priority')).toBeUndefined()
+    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
+    expect(r).toEqual({ ok: true, value: {} })
+    expect(await valueOn(old, 'Priority')).toEqual(['hi'])
+  })
+
+  it('a Link value naming an archived page comes back', async () => {
+    const c = await createProperty(root, {
+      id: '',
+      label: 'Related',
+      type: 'link',
+    })
+    if (!c.ok) throw new Error('seed failed')
+    await assignProperty(root, notes, c.value.id)
+    await archivedPage('')
+    const live = await createTestPage(notes, 'Live', { body: 'b' })
+    if (!live.ok) throw new Error('page failed')
+    await writePageValue(live.value.path, await liveDef(c.value.id), {
+      kind: 'link',
+      value: '[[Old]]',
+    })
+    expect((await deleteProperty(root, c.value.id)).ok).toBe(true)
+    const r = await handleMutate(root, { op: 'restore', bundlePath: await onlyBundlePath() }, deps)
+    expect(r).toEqual({ ok: true, value: {} })
+    expect(await valueOn(live.value.path, 'Related')).toBe('[[Old]]')
+  })
+
   it('a cached Link value naming no page stays out when the property is assigned again', async () => {
     const c = await createProperty(root, {
       id: '',
```

##### Core/Trash/restoreScrub.test.ts

```/Core/Trash/restoreScrub.test.ts diff
@@ -9 +9 @@ import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
 import { pathExists } from '../Files/atomicWrite'
 import { settledMutate } from '../Testing/settledMutate'
 import { contextsDir, contextsRegistryFile } from '../Paths/paths'
-import { listBundles } from './holdings'
+import { listBundles } from '../Bundles/bundle'
 import { stampMissing } from '../Nexus/adopt'
 import { readNexus } from '../Nexus/readNexus'
 import { fault } from '../Contract/result'
@@ -18 +18 @@ import { memoryStores } from '../Testing/memoryStores'
 import { seedContentIndex } from '../Index/indexSeed'
 
 import { closeSession, openSession } from '../Nexus/session'
-import type { TrashDeps } from './bundle'
+import type { TrashDeps } from './discard'
 
 const trashWrites = vi.hoisted(() => ({ fail: false }))
 vi.mock('../Files/atomicWrite', async (importOriginal) => {
@@ -50 +50 @@ async function cycle(rel: string, kind: 'page' | 'set', mutateWorld: () => Promi
   expect(d.ok).toBe(true)
   await mutateWorld()
   await refreshTree(root)
-  const [listed] = await listBundles(root)
+  const [listed] = await listBundles(root, { kind: 'trash' })
   const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
   expect(r.ok).toBe(true)
 }
@@ -181 +181 @@ describe('a returning artifact is reconciled against the world it comes back to'
     expect(d.ok).toBe(true)
     await rm(join(contextsDir(root), 'Projects', 'Sapphire'), { recursive: true, force: true })
     await refreshTree(root)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     trashWrites.fail = true
     try {
       const r = await settledMutate(
@@ -193 +193 @@ describe('a returning artifact is reconciled against the world it comes back to'
     } finally {
       trashWrites.fail = false
     }
-    expect(await listBundles(root)).toHaveLength(1)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
     expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(false)
   })
 
@@ -345 +345 @@ describe('a returning artifact is reconciled against the world it comes back to'
       expect((await settledMutate(root, { op: 'delete', path, kind: 'page' }, nexusDeps)).ok).toBe(
         true,
       )
-    const bundles = await listBundles(root)
+    const bundles = await listBundles(root, { kind: 'trash' })
     const bundleOf = (name: string): string =>
       bundles.find((b) => b.artifactName === name)?.bundlePath ?? ''
     expect(
@@ -570 +570 @@ describe('a Space sidecar is a context root too', () => {
         )
       ).ok,
     ).toBe(true)
-    const projects = (await listBundles(root)).find(
+    const projects = (await listBundles(root, { kind: 'trash' })).find(
       (b) => b.record.entity === 'context' && b.bundlePath.includes('Projects'),
     )
     expect(projects).toBeDefined()
@@ -610 +610 @@ describe('a Space sidecar is a context root too', () => {
       JSON.stringify({ id: 'sp-live-pom' }),
     )
     await refreshTree(root)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     expect(
       (await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
     ).toBe(true)
@@ -648 +648 @@ describe('a Space sidecar is a context root too', () => {
       JSON.stringify({ id: 'sp-pom' }),
     )
     await refreshTree(root)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     expect(
       (await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
     ).toBe(true)
@@ -688 +688 @@ describe('a Space sidecar is a context root too', () => {
       JSON.stringify({ id: 'sp-pom' }),
     )
     await refreshTree(root)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     expect(
       (await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
     ).toBe(true)
@@ -719 +719 @@ describe('a Space sidecar is a context root too', () => {
       ).ok,
     ).toBe(true)
     await refreshTree(root)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     expect(
       (await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
     ).toBe(true)
@@ -738 +738 @@ describe('a Space sidecar is a context root too', () => {
         )
       ).ok,
     ).toBe(true)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     expect(
       (await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)).ok,
     ).toBe(true)
@@ -799 +799 @@ describe('a parent the filesystem handed Pommora can still be named by id', () =
     )
     expect(d.ok).toBe(true)
 
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     expect(listed.record).toMatchObject({ entity: 'page', parent: { kind: 'container' } })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r.ok).toBe(true)
@@ -818 +818 @@ describe('a parent the filesystem handed Pommora can still be named by id', () =
       nexusDeps,
     )
     expect(d.ok).toBe(false)
-    expect(await listBundles(root)).toEqual([])
+    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
     expect(await readFile(join(root, 'Notes', 'Broken', 'Idea.md'), 'utf8')).toBe(page)
     expect(await readFile(join(root, 'Notes', 'Broken', '_pageset.json'), 'utf8')).toBe('{corrupt')
   })
```

##### Core/Trash/spend.test.ts

```/Core/Trash/spend.test.ts diff
@@ -1 +1 @@
 import { applyEvents } from '../Nexus/fileEvents'
-import * as settle from '../Nexus/settle'
+import * as liveTree from '../Nexus/liveTree'
 import { settleNow } from '../Nexus/settle'
 import { handleMutate } from '../Nexus/mutate'
 import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
@@ -11 +11 @@ import * as atomicWrite from '../Files/atomicWrite'
 import { pathExists } from '../Files/atomicWrite'
 import { settledMutate } from '../Testing/settledMutate'
 import { contextsDir, contextsRegistryFile } from '../Paths/paths'
-import { bundleArtifact, readRecord, writePropertyBundle } from './record'
-import { resolveRecord } from './resolve'
-import { listBundles } from './holdings'
+import { bundleArtifact, listBundles, mintBundle } from '../Bundles/bundle'
+import { readRecord, writeRecord } from '../Bundles/record'
+import { writePropertyBundle } from '../Properties/deleteProperty'
 import { installStores, NO_STORES } from '../Platform/stores'
 import { memoryStores } from '../Testing/memoryStores'
 import { seedContentIndex } from '../Index/indexSeed'
 import { readNexus } from '../Nexus/readNexus'
-import { setPanelContextOrder, setSpaceOrder } from '../Nexus/reorder'
+import { setCollectionOrder, setPanelContextOrder, setSpaceOrder } from '../Nexus/reorder'
 import { closeSession, openSession } from '../Nexus/session'
 import { readShard, updatePageMetadata } from '../Nexus/pageMetadata'
 import { shardOf } from '../Nexus/ids'
 import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
-import type { TrashDeps } from './bundle'
+import type { TrashDeps } from './discard'
 import type { ContextsRegistry } from '../Contexts/contexts'
 import type { RestoreDestination } from '../Nexus/mutateRequest'
 
 const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
 const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'
+const PAGE_C = '01KVGMT8BFP350FZZXAMG1QDVC'
 const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
 
 let root: string
@@ -120 +121 @@ describe('the bundle — one folder per deletion, holding the artifact and its r
       entity: 'page',
       id: PAGE_A,
       parent: { kind: 'container', id: dailyId },
+      trail: ['col-notes'],
     })
   })
 
@@ -137 +139 @@ describe('the bundle — one folder per deletion, holding the artifact and its r
       id: 'col-notes',
       parent: { kind: 'root' },
     })
+    expect(record).not.toHaveProperty('trail')
   })
 
   it('a Space delete records its context parent and the id-bearing roots that tagged it', async () => {
@@ -184 +187 @@ describe('the bundle — one folder per deletion, holding the artifact and its r
     expect(membership[0].spaces).toEqual([{ id: 'sp-pom', title: 'Pommora' }])
   })
 
+  const placeOfOnly = async (): Promise<unknown> =>
+    ((await onlyBundle()).record as { place?: unknown }).place
+
+  it('a page records its place between its neighbours as the tree shows them', async () => {
+    await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbody`)
+    await writeFile(join(root, 'Notes', 'Daily', 'Gamma.md'), `---\nID: ${PAGE_C}\n---\nbody`)
+    await writeFile(
+      join(root, 'Notes', 'Daily', '_pageset.json'),
+      JSON.stringify({ id: 'set-daily', page_order: [PAGE_C, PAGE_A, PAGE_B] }),
+    )
+    await refreshTree(root)
+    await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
+      nexusDeps,
+    )
+    expect(await placeOfOnly()).toEqual({ above: PAGE_B, below: PAGE_C })
+  })
+
+  it('a Set records its place in its container’s set_order', async () => {
+    for (const [name, id] of [
+      ['Weekly', 'set-week'],
+      ['Monthly', 'set-month'],
+    ]) {
+      await mkdir(join(root, 'Notes', name), { recursive: true })
+      await writeFile(join(root, 'Notes', name, '_pageset.json'), JSON.stringify({ id }))
+    }
+    await writeFile(
+      join(root, 'Notes', '_pagecollection.json'),
+      JSON.stringify({ id: 'col-notes', set_order: ['set-week', 'set-daily', 'set-month'] }),
+    )
+    await refreshTree(root)
+    await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
+    expect(await placeOfOnly()).toEqual({ above: 'set-month', below: 'set-week' })
+  })
+
+  it('a Collection records its place among the root’s Collections', async () => {
+    for (const [name, id] of [
+      ['Plain', 'col-plain'],
+      ['Zed', 'col-zed'],
+    ]) {
+      await mkdir(join(root, name), { recursive: true })
+      await writeFile(join(root, name, '_pagecollection.json'), JSON.stringify({ id }))
+    }
+    await setCollectionOrder(root, ['col-zed', 'col-notes', 'col-plain'])
+    await refreshTree(root)
+    await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
+    expect(await placeOfOnly()).toEqual({ above: 'col-plain', below: 'col-zed' })
+  })
+
+  it('a Space records its place in its Context’s order', async () => {
+    await setSpaceOrder(root, 'ctx_projects', ['sp-sap', 'sp-pom'])
+    await refreshTree(root)
+    await settledMutate(
+      root,
+      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
+      nexusDeps,
+    )
+    expect(await placeOfOnly()).toEqual({ below: 'sp-sap' })
+  })
+
   describe('a Context’s place', () => {
     const stateOrder = async (): Promise<unknown> =>
       (await readJsonAt(join(root, '.nexus', 'state.json'))).order
@@ -216 +280 @@ describe('the bundle — one folder per deletion, holding the artifact and its r
       const r = await deleteProjects(nexusDeps)
       expect(r.ok).toBe(true)
       expect(await stateOrder()).toEqual(seeded)
-      const listed = r.ok ? r.value.trashed : undefined
+      const listed = r.ok ? r.value.bundled : undefined
       expect(
         (await settledMutate(root, { op: 'restore', bundlePath: listed!.bundlePath }, nexusDeps))
           .ok,
@@ -229 +293 @@ describe('the bundle — one folder per deletion, holding the artifact and its r
 
     it('a record from before the place was kept restores its Context at the end', async () => {
       const r = await deleteProjects(nexusDeps)
-      const bundlePath = r.ok ? r.value.trashed!.bundlePath : ''
+      const bundlePath = r.ok ? r.value.bundled!.bundlePath : ''
       const recordFile = join(root, bundlePath, '_record.json')
       const { at: _, ...older } = await readJsonAt(recordFile)
       await writeFile(recordFile, JSON.stringify(older))
@@ -237 +301 @@ describe('the bundle — one folder per deletion, holding the artifact and its r
       expect(await registryIds()).toEqual(['ctx_areas', 'ctx_zeta', 'ctx_projects'])
     })
 
-    it('emptying a Context’s bundle drops its Space order', async () => {
+    it('emptying a Context’s bundle drops its panel id and its Space order', async () => {
       const r = await deleteProjects(nexusDeps)
-      const listed = r.ok ? r.value.trashed : undefined
+      const listed = r.ok ? r.value.bundled : undefined
       expect(
         (
           await settledMutate(
@@ -251 +315 @@ describe('the bundle — one folder per deletion, holding the artifact and its r
       ).toBe(true)
       expect(await stateOrder()).toEqual({
         spaces: { ctx_areas: ['sp-home'] },
-        contexts: ['ctx_projects', 'ctx_areas'],
+        contexts: ['ctx_areas'],
       })
     })
 
-    it('a system-trash Context delete drops its Space order at once', async () => {
+    it('a system-trash Context delete drops its panel id and its Space order at once', async () => {
       const r = await deleteProjects({ trashMode: 'system', trashToSystem: async () => {} })
       expect(r.ok).toBe(true)
       expect(await stateOrder()).toEqual({
         spaces: { ctx_areas: ['sp-home'] },
-        contexts: ['ctx_projects', 'ctx_areas'],
+        contexts: ['ctx_areas'],
       })
     })
   })
@@ -287 +351 @@ describe('the bundle — one folder per deletion, holding the artifact and its r
       nexusDeps,
     )
     expect(r.ok).toBe(false)
-    expect(await listBundles(root)).toHaveLength(0)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
     expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(true)
   })
 
@@ -430 +494 @@ describe('the bundle — one folder per deletion, holding the artifact and its r
       nexusDeps,
     )
     expect(r.ok).toBe(false)
-    expect(await listBundles(root)).toEqual([])
+    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
     expect(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8')).toBe(before)
   })
 
@@ -634 +698 @@ describe('listBundles — what the trash offers', () => {
       values: {},
     })
     for (let n = 0; n < 3; n++) {
-      const listed = await listBundles(root)
+      const listed = await listBundles(root, { kind: 'trash' })
       expect(listed).toHaveLength(1)
       expect(listed[0].record.entity).toBe('property')
     }
@@ -655 +719 @@ describe('listBundles — what the trash offers', () => {
       nexusDeps,
     )
     expect(r.ok).toBe(true)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     expect(listed.record).toMatchObject({ entity: 'collection', id: 'col-odd' })
     const restored = await settledMutate(
       root,
@@ -675 +739 @@ describe('listBundles — what the trash offers', () => {
     const [dir] = await bundleDirs(join(root, '.trash'))
     await writeFile(join(dir, '.DS_Store'), 'junk')
     expect(await bundleArtifact(dir)).toBe(join(dir, 'Alpha.md'))
-    expect(await listBundles(root)).toHaveLength(1)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
   })
 
   it('a bundle’s interior is trashed content, never trash structure', async () => {
@@ -687 +751 @@ describe('listBundles — what the trash offers', () => {
       join(phantom, '_record.json'),
       JSON.stringify({ entity: 'page', parent: { kind: 'root' } }),
     )
-    const listed = await listBundles(root)
+    const listed = await listBundles(root, { kind: 'trash' })
     expect(listed).toHaveLength(1)
     expect(listed[0].record.entity).toBe('collection')
   })
@@ -709 +773 @@ describe('listBundles — what the trash offers', () => {
       nexusDeps,
     )
     expect(r.ok).toBe(true)
-    const listed = await listBundles(root)
+    const listed = await listBundles(root, { kind: 'trash' })
     expect(listed).toHaveLength(1)
     expect(listed[0].record).toMatchObject({ entity: 'page' })
   })
@@ -727 +791 @@ describe('listBundles — what the trash offers', () => {
       join(old, '2026-01-01T00-00-00-000Z__Journal.provenance.json'),
       JSON.stringify({ entity: 'set', id: 'old-set', parent: { kind: 'root' } }),
     )
-    expect(await listBundles(root)).toHaveLength(0)
-  })
-})
-
-describe('resolveRecord — a placement with final names, or a typed refusal', () => {
-  const P = (over: Partial<import('../Nexus/tree').PageNode> = {}) =>
-    ({
-      kind: 'page',
-      id: 'page-x',
-      title: 'X',
-      path: 'Notes/X.md',
-      ...over,
-    }) as import('../Nexus/tree').PageNode
-  const treeOf = (
-    contexts: import('../Nexus/tree').ContextGroup[],
-    collections: Partial<import('../Nexus/tree').CollectionNode>[],
-  ) => ({ contexts, collections }) as unknown as import('../Nexus/tree').NexusTree
-
-  const journal = (over: Partial<import('../Nexus/tree').SetNode> = {}) =>
-    ({
-      kind: 'set',
-      id: 'set-daily',
-      title: 'Journal',
-      path: 'Notes/Journal',
-      pages: [],
-      sets: [],
-      ...over,
-    }) as import('../Nexus/tree').SetNode
-
-  const notes = (
-    sets: import('../Nexus/tree').SetNode[] = [journal()],
-    pages: import('../Nexus/tree').PageNode[] = [],
-  ) => ({
-    kind: 'collection' as const,
-    id: 'col-notes',
-    title: 'Notes',
-    path: 'Notes',
-    sets,
-    pages,
-  })
-
-  const pageRecord = {
-    entity: 'page' as const,
-    id: PAGE_A,
-    parent: { kind: 'container' as const, id: 'set-daily' },
-  }
-
-  it('places a page into its parent container at the container’s CURRENT path', () => {
-    const r = resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes()]))
-    expect(r).toEqual({
-      place: { dir: 'Notes/Journal', finalName: 'Alpha.md', finalTitle: 'Alpha' },
-    })
-  })
-
-  it('disambiguates a taken title, matching the create convention', () => {
-    const taken = journal({
-      pages: [P({ id: 'page-o', title: 'Alpha', path: 'Notes/Journal/Alpha.md' })],
-    })
-    const r = resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes([taken])]))
-    expect(r).toEqual({
-      place: { dir: 'Notes/Journal', finalName: 'Alpha (2).md', finalTitle: 'Alpha (2)' },
-    })
-  })
-
-  it('a set title also blocks a page name — one folder cannot hold both', () => {
-    const inner = journal({
-      sets: [journal({ id: 'set-inner', title: 'Alpha', path: 'Notes/Journal/Alpha' })],
-    })
-    const r = resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes([inner])]))
-    expect(r).toEqual({
-      place: { dir: 'Notes/Journal', finalName: 'Alpha (2).md', finalTitle: 'Alpha (2)' },
-    })
-  })
-
-  it('refuses when the parent is gone — a still-trashed parent is the same answer', () => {
-    expect(resolveRecord(pageRecord, 'Alpha.md', treeOf([], [notes([])]))).toEqual({
-      refuse: 'parent-gone',
-    })
-  })
-
-  it('refuses when the parent id resolves to a kind that cannot hold this one', () => {
-    const tree = treeOf(
-      [
-        {
-          def: { id: 'ctx_a', title: 'Areas' },
-          spaces: [
-            {
-              kind: 'space',
-              id: 'set-daily',
-              title: 'S',
-              path: '.nexus/contexts/Areas/S',
-              contextId: 'ctx_a',
-            } as import('../Nexus/tree').SpaceNode,
-          ],
-        },
-      ],
-      [notes([])],
-    )
-    expect(resolveRecord(pageRecord, 'Alpha.md', tree)).toEqual({ refuse: 'cannot-hold' })
-  })
-
-  it('a live id refuses, and it outranks every other answer', () => {
-    const tree = treeOf(
-      [],
-      [notes([], [P({ id: PAGE_A, title: 'Elsewhere', path: 'Notes/Elsewhere.md' })])],
-    )
-    expect(resolveRecord(pageRecord, 'Alpha.md', tree)).toEqual({ refuse: 'id-live' })
-  })
-
-  it('an unaddressable parent refuses', () => {
-    const record = {
-      entity: 'page' as const,
-      id: PAGE_A,
-      parent: { kind: 'unaddressable' as const },
-    }
-    expect(resolveRecord(record, 'Alpha.md', treeOf([], [notes()]))).toEqual({
-      refuse: 'unaddressable',
-    })
-  })
-
-  it('a collection returns to the root, disambiguated against its siblings', () => {
-    const record = {
-      entity: 'collection' as const,
-      id: 'col-back',
-      parent: { kind: 'root' as const },
-    }
-    const r = resolveRecord(record, 'Notes', treeOf([], [notes()]))
-    expect(r).toEqual({ place: { dir: '', finalName: 'Notes (2)' } })
-  })
-
-  it('a Space follows its Context to the Context’s CURRENT title, colliding titles disambiguated', () => {
-    const tree = treeOf(
-      [
-        {
-          def: { id: 'ctx_projects', title: 'Ventures' },
-          spaces: [
-            {
-              kind: 'space',
-              id: 'sp-other',
-              title: 'Pommora',
-              path: '.nexus/contexts/Ventures/Pommora',
-              contextId: 'ctx_projects',
-            } as import('../Nexus/tree').SpaceNode,
-          ],
-        },
-      ],
-      [],
-    )
-    const record = {
-      entity: 'space' as const,
-      id: 'sp-pom',
-      parent: { kind: 'context' as const, id: 'ctx_projects' },
-      members: [],
-    }
-    const r = resolveRecord(record, 'Pommora', tree)
-    expect(r).toEqual({
-      place: {
-        dir: '.nexus/contexts/Ventures',
-        finalName: 'Pommora (2)',
-        finalTitle: 'Pommora (2)',
-      },
-    })
-  })
-
-  it('a Context re-enters the registry under a disambiguated final title', () => {
-    const tree = treeOf([{ def: { id: 'ctx_new', title: 'Projects' }, spaces: [] }], [])
-    const record = {
-      entity: 'context' as const,
-      registry: { id: 'ctx_projects', title: 'Projects' },
-      membership: [],
-    }
-    const r = resolveRecord(record, 'Projects', tree)
-    expect(r).toEqual({
-      place: { dir: '.nexus/contexts', finalName: 'Projects (2)', finalTitle: 'Projects (2)' },
-    })
-  })
-
-  it('a Context whose registry id is already live refuses', () => {
-    const tree = treeOf([{ def: { id: 'ctx_projects', title: 'Elsewhere' }, spaces: [] }], [])
-    const record = {
-      entity: 'context' as const,
-      registry: { id: 'ctx_projects', title: 'Projects' },
-      membership: [],
-    }
-    expect(resolveRecord(record, 'Projects', tree)).toEqual({ refuse: 'id-live' })
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
   })
 })
 
@@ -924 +804 @@ describe('restore — the record spends, headless', () => {
     )
     await rename(join(root, 'Notes', 'Daily'), join(root, 'Notes', 'Journal'))
     await refreshTree(root)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r.ok).toBe(true)
     expect(await readFile(join(root, 'Notes', 'Journal', 'Alpha.md'), 'utf8')).toContain(PAGE_A)
@@ -943 +823 @@ describe('restore — the record spends, headless', () => {
       ],
     ).toBeUndefined()
 
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r.ok).toBe(true)
     expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora', '_space.json'))).toBe(
@@ -968 +848 @@ describe('restore — the record spends, headless', () => {
       )
       await writeFile(alpha(), `---\nID: ${PAGE_A}\n${keys}\n---\nbody`)
       await refreshTree(root)
-      const [listed] = await listBundles(root)
+      const [listed] = await listBundles(root, { kind: 'trash' })
       const r = await settledMutate(
         root,
         { op: 'restore', bundlePath: listed.bundlePath },
@@ -991 +871 @@ describe('restore — the record spends, headless', () => {
       { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
       nexusDeps,
     )
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const [renamed, restored] = await Promise.all([
       settledMutate(
         root,
@@ -1018 +898 @@ describe('restore — the record spends, headless', () => {
     )
     const alpha = join(root, 'Notes', 'Daily', 'Alpha.md')
     await writeFile(alpha, `---\nID: ${PAGE_A}\nbroken: [\n---\nbody`)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r).toEqual({ ok: true, value: { unrestored: ['Alpha'] } })
     expect(await pathExists(join(root, listed.bundlePath, '_record.json'))).toBe(true)
   })
 
+  it('a tag neither of two pages claiming one id takes back is named, and the record stays', async () => {
+    await settledMutate(
+      root,
+      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
+      nexusDeps,
+    )
+    const copy = join(root, 'Notes', 'Daily', 'Alpha copy.md')
+    await writeFile(copy, `---\nID: ${PAGE_A}\n---\ncopy`)
+    await refreshTree(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
+    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
+    expect(r).toEqual({ ok: true, value: { unrestored: ['Alpha copy'] } })
+    expect(await pathExists(join(root, listed.bundlePath, '_record.json'))).toBe(true)
+    for (const file of [join(root, 'Notes', 'Daily', 'Alpha.md'), copy])
+      expect(splitFrontmatter(await readFile(file, 'utf8'))).not.toHaveProperty('<Projects>')
+  })
+
   it('a root gone since is no reason to keep the record', async () => {
     await settledMutate(
       root,
@@ -1032 +929 @@ describe('restore — the record spends, headless', () => {
     )
     await rm(join(root, 'Notes', 'Daily', 'Alpha.md'))
     await refreshTree(root)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r).toEqual({ ok: true, value: {} })
     expect(await pathExists(join(root, listed.bundlePath))).toBe(false)
@@ -1044 +941 @@ describe('restore — the record spends, headless', () => {
       { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
       nexusDeps,
     )
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r.ok).toBe(true)
     const reg = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
@@ -1072 +969 @@ describe('restore — the record spends, headless', () => {
       { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
       nexusDeps,
     )
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r).toEqual({ ok: true, value: {} })
     expect('<Projects>' in splitFrontmatter(await readFile(alpha, 'utf8'))).toBe(false)
@@ -1084 +981 @@ describe('restore — the record spends, headless', () => {
       { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
       nexusDeps,
     )
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r.ok).toBe(false)
@@ -1111 +1008 @@ describe('restore — the record spends, headless', () => {
 describe('a Link value refilled into a trashed copy', () => {
   const beta = (): string => join(root, 'Notes', 'Beta.md')
   const restore = async (name: string): Promise<void> => {
-    const listed = (await listBundles(root)).find((b) => b.artifactName === name)
+    const listed = (await listBundles(root, { kind: 'trash' })).find((b) => b.artifactName === name)
     const r = await settledMutate(
       root,
       { op: 'restore', bundlePath: listed?.bundlePath ?? '' },
@@ -1164 +1061 @@ describe('restore — the returning page’s links follow the pages they named',
     expect((await settledMutate(root, { op: 'delete', path, kind }, nexusDeps)).ok).toBe(true)
   }
   const restore = async (name: string, destination?: RestoreDestination) => {
-    const bundles = await listBundles(root)
+    const bundles = await listBundles(root, { kind: 'trash' })
     const listed = bundles.filter((b) => b.artifactName === name).at(-1)
     const r = await settledMutate(
       root,
@@ -1255 +1152 @@ describe('restore — the returning page’s links follow the pages they named',
     )
   })
 
+  const ARCHIVED = (name: string): string =>
+    `.nexus/archive/col-notes/Notes/2026-10-20T12-00-00-000Z__${name}.md.archived/${name}.md`
+
+  it('a restore keeps the returning page’s Link value naming an archived page', async () => {
+    await del(ALPHA)
+    await mkdir(dirname(join(root, ARCHIVED('Beta'))), { recursive: true })
+    await rename(join(root, 'Notes', 'Beta.md'), join(root, ARCHIVED('Beta')))
+    await reseed()
+    await restore('Alpha.md')
+    expect(splitFrontmatter(await text(ALPHA)).Related).toBe('[[Beta]]')
+  })
+
+  it('a restore puts a stripped Link value back into the archived page that held it', async () => {
+    await mkdir(dirname(join(root, ARCHIVED('Old'))), { recursive: true })
+    await write(ARCHIVED('Old'), PAGE_C, 'Related: "[[Alpha]]"\n', 'old')
+    await reseed()
+    await del(ALPHA)
+    expect(splitFrontmatter(await text(ARCHIVED('Old')))).not.toHaveProperty('Related')
+    await restore('Alpha.md')
+    expect(splitFrontmatter(await text(ARCHIVED('Old'))).Related).toBe('[[Alpha]]')
+  })
+
+  it('a restore leaves a stripped Link value out of both pages claiming its holder’s id, and names it', async () => {
+    await write('Notes/Gamma.md', PAGE_C, 'Related: "[[Alpha]]"\n', 'gamma')
+    await reseed()
+    await del(ALPHA)
+    await write('Notes/Other/Gamma.md', PAGE_C, '', 'copy')
+    await reseed()
+    expect(await restore('Alpha.md')).toEqual({ unrestored: ['Gamma'] })
+    for (const rel of ['Notes/Gamma.md', 'Notes/Other/Gamma.md'])
+      expect(splitFrontmatter(await text(rel))).not.toHaveProperty('Related')
+  })
+
   it('keeps its body and parks its value for a page deleted meanwhile', async () => {
     await del(ALPHA)
     await del('Notes/Beta.md')
@@ -1262 +1192 @@ describe('restore — the returning page’s links follow the pages they named',
     const restored = await text(ALPHA)
     expect(restored).toContain('[[Beta]] ![[Beta]]')
     expect(splitFrontmatter(restored)).not.toHaveProperty('Related')
-    const beta = (await listBundles(root)).find((b) => b.artifactName === 'Beta.md')
+    const beta = (await listBundles(root, { kind: 'trash' })).find(
+      (b) => b.artifactName === 'Beta.md',
+    )
     expect(beta?.record).toMatchObject({
       links: [{ page: PAGE_A, property: 'prop_related', value: '[[Beta]]' }],
     })
@@ -1312 +1244 @@ describe('restore — the returning page’s links follow the pages they named',
 
   it('a bundle without targets restores by the name', async () => {
     await del(ALPHA)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const recordFile = join(root, listed.bundlePath, '_record.json')
     const { targets: _, ...without } = JSON.parse(await readFile(recordFile, 'utf8'))
     await writeFile(recordFile, JSON.stringify(without))
@@ -1332 +1264 @@ describe('restore — the returning page’s links follow the pages they named',
     await writeFile(join(root, 'Notes', 'Daily', 'Omega.md'), 'omega')
     await reseed()
     await del('Notes/Daily', 'set')
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     // Unsettled: a relocate stamps no page, so the held tree leaves the ID-less one out where a fresh read lists it.
     const r = await handleMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r).toEqual({ ok: true, value: {} })
     expect(splitFrontmatter(await text(gamma)).Related).toBe('[[Omega]]')
-    expect(await listBundles(root)).toEqual([])
+    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
   })
 
   it('a page returning beside a new namesake in its own folder refills its stripped link under its new name, and leaves the namesake’s linkers be', async () => {
@@ -1389 +1321 @@ describe('restore — the returning page’s links follow the pages they named',
     expect(await text('Notes/Third.md')).toContain('see [[Notes/Other/Alpha|Alpha]]')
   })
 
+  describe('a namesake made meanwhile leaves the returning files’ own links on their own pages', () => {
+    const namesake = async (): Promise<void> => {
+      const created = await settledMutate(
+        root,
+        {
+          op: 'createPage',
+          id: '01KVGMT8BFP350FZZXAMG1QDVM',
+          parentPath: 'Notes/Other',
+          name: 'Alpha',
+        },
+        nexusDeps,
+      )
+      expect(created.ok).toBe(true)
+      await reseed()
+    }
+
+    it('a page’s link to itself', async () => {
+      await write(ALPHA, PAGE_A, '', 'me: [[Alpha]]')
+      await reseed()
+      await del(ALPHA)
+      await namesake()
+      await restore('Alpha.md')
+      expect(await text(ALPHA)).toBe(`---\nID: ${PAGE_A}\n---\nme: [[Notes/Daily/Alpha|Alpha]]`)
+    })
+
+    it('a Set’s link to its returning sibling', async () => {
+      await write('Notes/Daily/Gamma.md', PAGE_C, '', 'see [[Alpha]]')
+      await reseed()
+      await del('Notes/Daily', 'set')
+      await namesake()
+      await restore('Daily')
+      expect(await text('Notes/Daily/Gamma.md')).toBe(
+        `---\nID: ${PAGE_C}\n---\nsee [[Notes/Daily/Alpha|Alpha]]`,
+      )
+    })
+
+    it('a Set’s Link value and body link to its returning sibling, the namesake in another Collection', async () => {
+      await write('Notes/Daily/Gamma.md', PAGE_C, 'Related: "[[Alpha]]"\n', 'see [[Alpha]]')
+      await reseed()
+      await del('Notes/Daily', 'set')
+      await mkdir(join(root, 'Plain'))
+      await writeFile(
+        join(root, 'Plain', '_pagecollection.json'),
+        JSON.stringify({ id: 'col-plain' }),
+      )
+      await write('Plain/Alpha.md', '01KVGMT8BFP350FZZXAMG1QDVM', '', 'new')
+      await reseed()
+      await restore('Daily')
+      expect(await text('Notes/Daily/Gamma.md')).toBe(
+        `---\nID: ${PAGE_C}\nRelated: "[[Notes/Daily/Alpha|Alpha]]"\n---\nsee [[Notes/Daily/Alpha|Alpha]]`,
+      )
+    })
+  })
+
   it('a restore that finds no settled world says its links weren’t updated', async () => {
     await del(ALPHA)
-    const unsettled = vi.spyOn(settle, 'settledIndex').mockResolvedValue(null)
+    const unsettled = vi.spyOn(liveTree, 'heldTreeOf').mockReturnValue(null)
     try {
       const reply = await restore('Alpha.md')
       expect(reply?.cascade?.warning).toBe("Links to “Alpha” weren't updated.")
@@ -1440 +1426 @@ describe('restore — the returning page’s links follow the pages they named',
           )
         ).ok,
       ).toBe(true)
-      const [listed] = await listBundles(root)
+      const [listed] = await listBundles(root, { kind: 'trash' })
       expect(listed.record).toMatchObject({
         targets: { beta: { id: PAGE_B, path: 'Notes/Beta.md' } },
       })
@@ -1463 +1449 @@ describe('restore — the gate-four pins', () => {
       { event: 'change', absPath: contextsRegistryFile(root), origin: 'watched' },
     ])
     await settleNow({ push: () => {}, watch: async () => {} }, root)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r.ok).toBe(false)
     // Nothing moved and the evidence survives — the restore is retryable once the registry heals.
@@ -1484 +1470 @@ describe('restore — the gate-four pins', () => {
     await mkdir(join(contextsDir(root), 'Projects'), { recursive: true })
     await refreshTree(root)
 
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r.ok).toBe(true)
     // Folder, registry entry, and membership key all wear the resolver's final title.
@@ -1503 +1489 @@ describe('restore — the gate-four pins', () => {
     expect(fm['<Projects>']).toBeUndefined()
   })
 
-  it('an occupant the tree cannot see refuses the restore — never a clobber', async () => {
+  it('an occupant the tree cannot see is stepped around — never a clobber', async () => {
     await settledMutate(
       root,
       { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
       nexusDeps,
     )
     // An Unknown squatter takes the resolved target: same name, contradicting kind key.
-    await writeFile(
-      join(root, 'Notes', 'Daily', 'Alpha.md'),
-      '---\nID: 01KVGMT8BFT350FZZXAMG1QDVD\n---\nsquatter',
-    )
+    const squatter = '---\nID: 01KVGMT8BFT350FZZXAMG1QDVD\n---\nsquatter'
+    await writeFile(join(root, 'Notes', 'Daily', 'Alpha.md'), squatter)
     await applyEvents(root, [
       { event: 'add', absPath: join(root, 'Notes', 'Daily', 'Alpha.md'), origin: 'watched' },
     ])
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
-    expect(r.ok).toBe(false)
-    expect(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8')).toContain('squatter')
-    expect(await bundleDirs(join(root, '.trash'))).toHaveLength(1)
+    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Alpha (2)' } })
+    expect(await readFile(join(root, 'Notes', 'Daily', 'Alpha (2).md'), 'utf8')).toContain(PAGE_A)
+    expect(await readFile(join(root, 'Notes', 'Daily', 'Alpha.md'), 'utf8')).toBe(squatter)
+    expect(await bundleDirs(join(root, '.trash'))).toHaveLength(0)
   })
 
-  it('a Set restored onto a folder Settings excludes refuses, the bundle intact', async () => {
+  it('a Set restored onto a folder Settings excludes steps aside, the excluded entry untouched', async () => {
     await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
-    await writeFile(
-      join(root, '.nexus', 'settings.json'),
-      JSON.stringify({ excluded_folders: ['Notes/Daily'] }),
-    )
+    const settings = JSON.stringify({ excluded_folders: ['Notes/Daily'] })
+    await writeFile(join(root, '.nexus', 'settings.json'), settings)
     await refreshTree(root)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
-    expect(r.ok ? '' : r.error.message).toContain(
-      '"Daily" is currently listed as an excluded directory',
+    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Daily (2)' } })
+    expect(await pathExists(join(root, 'Notes', 'Daily (2)', '_pageset.json'))).toBe(true)
+    expect(await readFile(join(root, '.nexus', 'settings.json'), 'utf8')).toBe(settings)
+  })
+
+  it('a restore whose title the tree already holds answers the title it took', async () => {
+    await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
+      nexusDeps,
     )
-    expect(await bundleDirs(join(root, '.trash'))).toHaveLength(1)
+    await writeFile(join(root, 'Notes', 'Daily', 'Alpha.md'), `---\nID: ${PAGE_B}\n---\nlive`)
+    await applyEvents(root, [
+      { event: 'add', absPath: join(root, 'Notes', 'Daily', 'Alpha.md'), origin: 'watched' },
+    ])
+    const [listed] = await listBundles(root, { kind: 'trash' })
+    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
+    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Alpha (2)' } })
   })
 
-  it('only a trash bundle restores — an in-nexus path refuses', async () => {
+  it('a restore landing on its own title answers no landedAs', async () => {
+    await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
+      nexusDeps,
+    )
+    const [listed] = await listBundles(root, { kind: 'trash' })
+    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
+    expect(r.ok).toBe(true)
+    expect(r.ok && 'landedAs' in r.value).toBe(false)
+  })
+
+  it('a Space steps past a folder its Context holds that the tree doesn’t', async () => {
+    await settledMutate(
+      root,
+      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
+      nexusDeps,
+    )
+    await mkdir(join(contextsDir(root), 'Projects', 'Pommora'))
+    const [listed] = await listBundles(root, { kind: 'trash' })
+    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
+    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Pommora (2)' } })
+    expect(
+      await pathExists(join(contextsDir(root), 'Projects', 'Pommora (2)', '_space.json')),
+    ).toBe(true)
+  })
+
+  it('a Context steps past a folder under .nexus/contexts the registry doesn’t name, and the registry takes the stepped title', async () => {
+    await settledMutate(
+      root,
+      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
+      nexusDeps,
+    )
+    await mkdir(join(contextsDir(root), 'Projects'))
+    const [listed] = await listBundles(root, { kind: 'trash' })
+    const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
+    expect(r).toMatchObject({ ok: true, value: { landedAs: 'Projects (2)' } })
+    expect(
+      await pathExists(join(contextsDir(root), 'Projects (2)', 'Pommora', '_space.json')),
+    ).toBe(true)
+    const registry = await readJsonAt<ContextsRegistry>(contextsRegistryFile(root))
+    expect(registry.contexts).toContainEqual(
+      expect.objectContaining({ id: 'ctx_projects', title: 'Projects (2)' }),
+    )
+  })
+
+  it('a path neither store holds refuses to restore', async () => {
     await mkdir(join(root, 'Notes', 'fake.deleted'), { recursive: true })
     await writeFile(
       join(root, 'Notes', 'fake.deleted', '_record.json'),
@@ -1554 +1597 @@ describe('restore — the gate-four pins', () => {
     expect(await pathExists(join(root, 'Notes', 'fake.deleted', '_record.json'))).toBe(true)
   })
 
+  it('an Archive bundle isn’t emptied as a Trash one', async () => {
+    const bundle = await mintBundle(
+      root,
+      { kind: 'archive', id: '01KVGMT8BFP350FZZXAMG1QDVC' },
+      join(root, 'Notes', 'Beta.md'),
+    )
+    await writeFile(join(bundle, 'Beta.md'), 'body')
+    await writeRecord(bundle, { entity: 'page', parent: { kind: 'root' } })
+    const bundlePath = relative(root, bundle)
+    const emptied = await settledMutate(root, { op: 'emptyBundle', bundlePath }, nexusDeps)
+    expect(emptied.ok ? '' : emptied.error.message).toBe('Only a trash record can be emptied.')
+    expect(await pathExists(join(bundle, 'Beta.md'))).toBe(true)
+    expect(await readRecord(bundle)).toEqual({ entity: 'page', parent: { kind: 'root' } })
+  })
+
   it('a property whose definition can no longer stand does not return, and its record stays', async () => {
     const bundle = await writePropertyBundle(root, {
       entity: 'property',
@@ -1561 +1619 @@ describe('restore — the gate-four pins', () => {
       def: { id: 'prop_x' },
       values: {},
     })
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r.ok).toBe(false)
     expect(await pathExists(join(bundle, '_record.json'))).toBe(true)
@@ -1570 +1628 @@ describe('restore — the gate-four pins', () => {
 })
 
 describe('restore — the attack folds', () => {
+  it('a bundle path that escapes the Nexus refuses before anything opens', async () => {
+    const r = await settledMutate(root, { op: 'restore', bundlePath: '../x' }, nexusDeps)
+    expect(r.ok ? '' : r.error.message).toBe('Path escapes the nexus root.')
+  })
+
   it('a record cannot steer the artifact outside the nexus', async () => {
     await settledMutate(
       root,
@@ -1582 +1645 @@ describe('restore — the attack folds', () => {
     )
     record.registry.title = '../../../escape-target'
     await writeFile(join(dir, '_record.json'), JSON.stringify(record))
-    expect(await listBundles(root)).toEqual([])
+    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
     const r = await settledMutate(
       root,
       { op: 'restore', bundlePath: relative(root, dir) },
@@ -1602 +1665 @@ describe('restore — the attack folds', () => {
       { op: 'delete', path: 'Notes/Daily/12__Notes.md', kind: 'page' },
       nexusDeps,
     )
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r.ok).toBe(true)
     expect(await pathExists(join(root, 'Notes', 'Daily', '12__Notes.md'))).toBe(true)
@@ -1620 +1683 @@ describe('restore — the attack folds', () => {
       )
       await chmod(join(root, '.nexus', 'contexts'), 0o555)
       try {
-        const [listed] = await listBundles(root)
+        const [listed] = await listBundles(root, { kind: 'trash' })
         const failed = await settledMutate(
           root,
           { op: 'restore', bundlePath: listed.bundlePath },
@@ -1633 +1696 @@ describe('restore — the attack folds', () => {
       } finally {
         await chmod(join(root, '.nexus', 'contexts'), 0o755)
       }
-      const [listed] = await listBundles(root)
+      const [listed] = await listBundles(root, { kind: 'trash' })
       const retried = await settledMutate(
         root,
         { op: 'restore', bundlePath: listed.bundlePath },
@@ -1657 +1720 @@ describe('restore — the attack folds', () => {
     await mkdir(join(contextsDir(root), 'Projects'), { recursive: true })
     await refreshTree(root)
 
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath }, nexusDeps)
     expect(r.ok).toBe(true)
     const sap = await readJsonAt(join(contextsDir(root), 'Projects (2)', 'Sapphire', '_space.json'))
@@ -1676 +1739 @@ describe('emptyBundle — giving a bundle up for good', () => {
       { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
       nexusDeps,
     )
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath }, deps)
     expect(r.ok).toBe(true)
     // The artifact leaves under its own name — never a stamped folder wrapping it.
     expect(handed).toHaveLength(1)
     expect(handed[0].endsWith(join(listed.bundlePath, 'Alpha.md'))).toBe(true)
     expect(await pathExists(join(root, listed.bundlePath))).toBe(false)
-    expect(await listBundles(root)).toHaveLength(0)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
   })
 
   it('with the switch on the artifact never reaches the system trash at all', async () => {
@@ -1698 +1761 @@ describe('emptyBundle — giving a bundle up for good', () => {
       { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
       nexusDeps,
     )
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath }, deps)
     expect(r.ok).toBe(true)
     expect(handed).toEqual([])
@@ -1719 +1782 @@ describe('emptyBundle — giving a bundle up for good', () => {
     await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
     await refreshTree(root)
     expect(await pages()).toEqual({ [PAGE_A]: { icon: 'star' }, [PAGE_B]: { locked: true } })
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(
       root,
       { op: 'emptyBundle', bundlePath: listed.bundlePath },
@@ -1747 +1810 @@ describe('emptyBundle — giving a bundle up for good', () => {
     expect(month.kind === 'ok' && month.pages).toEqual({ [PAGE_G]: { icon: 'moon' } })
   })
 
+  describe('a Collection emptied for good', () => {
+    const ARCHIVED = join('.nexus', 'archive', 'col-notes')
+
+    beforeEach(async () => {
+      await writeFile(
+        join(root, '.nexus', 'properties.json'),
+        JSON.stringify({
+          order: ['prop_related'],
+          defs: {
+            prop_related: { id: 'prop_related', label: 'Related', key: 'Related', type: 'link' },
+          },
+        }),
+      )
+      await mkdir(join(root, 'Other'), { recursive: true })
+      await writeFile(
+        join(root, 'Other', '_pagecollection.json'),
+        JSON.stringify({ id: 'col-other' }),
+      )
+      await refreshTree(root)
+    })
+
+    const emptyNotes = async (deps: TrashDeps) => {
+      await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
+      const [listed] = await listBundles(root, { kind: 'trash' })
+      return settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath }, deps)
+    }
+
+    it.each([
+      false,
+      true,
+    ])('a Collection emptied for good empties its Archive, its pages’ links stripped and their metadata dropped (permanentDelete %s)', async (permanentDelete) => {
+      await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbeta`)
+      const linker = join(root, 'Other', 'Linker.md')
+      await writeFile(linker, `---\nID: ${PAGE_C}\nRelated: "[[Beta]]"\n---\nlinker`)
+      await refreshTree(root)
+      await settledMutate(
+        root,
+        { op: 'archive', path: 'Notes/Daily/Beta.md', kind: 'page' },
+        nexusDeps,
+      )
+      await updatePageMetadata(root, PAGE_B, { icon: 'star' })
+      const handed: string[] = []
+      const r = await emptyNotes({
+        ...nexusDeps,
+        permanentDelete,
+        trashToSystem: async (p) => {
+          handed.push(p)
+          await rm(p, { recursive: true })
+        },
+      })
+      expect(r.ok).toBe(true)
+      if (permanentDelete) expect(await pathExists(join(root, ARCHIVED))).toBe(false)
+      else expect(handed).toContain(join(root, ARCHIVED))
+      expect(splitFrontmatter(await readFile(linker, 'utf8')).Related).toBeUndefined()
+      const month = await readShard(root, shardOf(PAGE_B)!)
+      expect(month.kind === 'ok' && month.pages).toEqual({})
+    })
+
+    it('a Collection emptied for good takes the saved views naming the Sets in its Archive', async () => {
+      const sidecar = join(root, 'Other', '_pagecollection.json')
+      const located = (values: string[]) => [
+        {
+          id: 'view_1',
+          name: 'V',
+          type: 'table',
+          filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values }] },
+        },
+      ]
+      await writeFile(
+        sidecar,
+        JSON.stringify({ id: 'col-other', views: located(['set-daily', 'col-other']) }),
+      )
+      await refreshTree(root)
+      await settledMutate(root, { op: 'archive', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
+      expect((await emptyNotes(nexusDeps)).ok).toBe(true)
+      expect((await readJsonAt(sidecar)).views).toEqual(located(['col-other']))
+    })
+  })
+
   it('emptying a copy’s bundle keeps the entry of the live page sharing its ID', async () => {
     await updatePageMetadata(root, PAGE_A, { icon: 'star' })
     await writeFile(join(root, 'Notes', 'Daily', 'Alpha copy.md'), `---\nID: ${PAGE_A}\n---\ncopy`)
@@ -1756 +1898 @@ describe('emptyBundle — giving a bundle up for good', () => {
       nexusDeps,
     )
     await refreshTree(root)
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(
       root,
       { op: 'emptyBundle', bundlePath: listed.bundlePath },
@@ -1774 +1916 @@ describe('emptyBundle — giving a bundle up for good', () => {
       { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
       nexusDeps,
     )
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const chain = join(root, '.trash', 'Archive.deleted')
     await mkdir(chain, { recursive: true })
     await rename(join(root, listed.bundlePath), join(chain, basename(listed.bundlePath)))
@@ -1785 +1927 @@ describe('emptyBundle — giving a bundle up for good', () => {
     )
     expect(r.ok).toBe(false)
     // The real bundle inside it is untouched — it would have gone with the folder.
-    expect(await listBundles(root)).toHaveLength(1)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
   })
 
   it('refuses a path inside the nexus but outside the trash, and one that escapes the root', async () => {
@@ -1803 +1945 @@ describe('emptyBundle — giving a bundle up for good', () => {
       { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
       nexusDeps,
     )
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     expect(
       (await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath }, nexusDeps))
         .ok,
@@ -1823 +1965 @@ describe('emptyBundle — giving a bundle up for good', () => {
       { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
       nexusDeps,
     )
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const bundlePath = listed.bundlePath
     await writeFile(join(root, bundlePath, 'Alpha 2.md'), 'conflict copy')
     const r = await settledMutate(root, { op: 'emptyBundle', bundlePath }, deps)
@@ -1844 +1986 @@ describe('emptyBundle — giving a bundle up for good', () => {
       { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
       nexusDeps,
     )
-    const [listed] = await listBundles(root)
+    const [listed] = await listBundles(root, { kind: 'trash' })
     const r = await settledMutate(root, { op: 'emptyBundle', bundlePath: listed.bundlePath }, deps)
     expect(r.ok).toBe(false)
-    expect(await listBundles(root)).toHaveLength(1)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
   })
 })
 
 describe('restore — into a chosen destination', () => {
   const lastBundle = async (name: string): Promise<string> => {
-    const hit = (await listBundles(root)).find((b) => b.artifactName === name)
+    const hit = (await listBundles(root, { kind: 'trash' })).find((b) => b.artifactName === name)
     expect(hit).toBeDefined()
     return (hit as { bundlePath: string }).bundlePath
   }
@@ -1877 +2019 @@ describe('restore — into a chosen destination', () => {
     expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(true)
   })
 
+  it('a picked destination lands last in the destination’s order', async () => {
+    await writeFile(join(root, 'Notes', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbody`)
+    await writeFile(join(root, 'Notes', 'Gamma.md'), `---\nID: ${PAGE_C}\n---\nbody`)
+    await refreshTree(root)
+    await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
+      nexusDeps,
+    )
+    const r = await settledMutate(
+      root,
+      {
+        op: 'restore',
+        bundlePath: await lastBundle('Alpha.md'),
+        destination: { kind: 'container', id: 'col-notes' },
+      },
+      nexusDeps,
+    )
+    expect(r.ok).toBe(true)
+    expect((await readJsonAt(join(root, 'Notes', '_pagecollection.json'))).page_order).toEqual([
+      PAGE_B,
+      PAGE_C,
+      PAGE_A,
+    ])
+  })
+
   it('a page lands in a Set, and a Set lands in a Collection', async () => {
     await mkdir(join(root, 'Notes', 'Weekly'), { recursive: true })
     await writeFile(
@@ -1949 +2117 @@ describe('restore — into a chosen destination', () => {
     expect(await pathExists(join(contextsDir(root), 'Areas', 'Pommora', '_space.json'))).toBe(true)
   })
 
+  it('refuses the Archive as a destination for a record that left none, a Space’s among them', async () => {
+    await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
+      nexusDeps,
+    )
+    await settledMutate(
+      root,
+      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
+      nexusDeps,
+    )
+    for (const name of ['Alpha.md', 'Pommora']) {
+      const r = await settledMutate(
+        root,
+        { op: 'restore', bundlePath: await lastBundle(name), destination: { kind: 'archive' } },
+        nexusDeps,
+      )
+      expect(r.ok ? '' : r.error.message).toBe('That kind cannot be given a destination.')
+    }
+  })
+
+  it('refuses an Undo whose record names a path outside the Archive', async () => {
+    await settledMutate(
+      root,
+      { op: 'delete', path: 'Notes/Daily/Alpha.md', kind: 'page' },
+      nexusDeps,
+    )
+    const bundlePath = await lastBundle('Alpha.md')
+    await writeRecord(join(root, bundlePath), {
+      entity: 'page',
+      id: PAGE_A,
+      parent: { kind: 'container', id: 'set-daily' },
+      archive: '../Notes/Beta.md.archived',
+    })
+    const r = await settledMutate(
+      root,
+      { op: 'restore', bundlePath, destination: { kind: 'archive' } },
+      nexusDeps,
+    )
+    expect(r.ok ? '' : r.error.message).toBe('That kind cannot be given a destination.')
+    expect(await pathExists(join(root, bundlePath, 'Alpha.md'))).toBe(true)
+    expect(await pathExists(join(root, 'Notes', 'Daily', 'Alpha.md'))).toBe(false)
+  })
+
   it('refuses the destination the move check would refuse — a Space is not a container', async () => {
     await settledMutate(
       root,
@@ -2027 +2239 @@ describe('restore — into a chosen destination', () => {
         )
       ).ok,
     ).toBe(false)
-    expect(await listBundles(root)).toHaveLength(1)
+    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(1)
   })
 
   it('refuses a destination for a kind that cannot be homeless', async () => {
```

##### Core/Trash/trashRecovery.test.ts

```/Core/Trash/trashRecovery.test.ts diff
@@ -8 +8 @@ import * as atomicWrite from '../Files/atomicWrite'
 import { pathExists } from '../Files/atomicWrite'
 import { settledMutate } from '../Testing/settledMutate'
 import { contextsDir, contextsRegistryFile } from '../Paths/paths'
-import { listBundles, parkLinks } from './holdings'
-import { readRecord } from './record'
-import { trashRows } from './trashRows'
+import { listBundles } from '../Bundles/bundle'
+import { parkLinks } from './holdings'
+import { readRecord } from '../Bundles/record'
+import { bundleRows } from '../Bundles/rows'
 import { readNexus } from '../Nexus/readNexus'
+import { nexusPages } from '../Nexus/heldPages'
 import { closeSession, openSession } from '../Nexus/session'
 import { splitFrontmatter } from '../Files/pageFile'
 import { deleteProperty } from '../Properties/deleteProperty'
@@ -23 +25 @@ import { settleNow } from '../Nexus/settle'
 import type { ValueChange } from '../Nexus/tree'
 import type { Pushes } from '../Contract/bridge'
 import { renameProperty } from '../Properties/registryProperty'
-import type { TrashDeps } from './bundle'
+import { setCollectionOrder, setSpaceOrder } from '../Nexus/reorder'
+import type { TrashDeps } from './discard'
 
 let root: string
 const handed: string[] = []
@@ -31 +34 @@ const deps: TrashDeps = {
   trashMode: 'nexus',
   trashToSystem: async (p) => void handed.push(p),
 }
-const rows = async () => trashRows(await listBundles(root), await readNexus(root))
+const rows = async () => {
+  const tree = await readNexus(root)
+  const { byId } = await nexusPages(root, tree)
+  return bundleRows(await listBundles(root, { kind: 'trash' }), { kind: 'trash' }, tree, byId)
+}
 const find = async (title: string) => {
   const hit = (await rows()).find((r) => r.title === title)
   expect(hit, `no row titled ${title}`).toBeDefined()
@@ -46 +53 @@ const beta = join('Journal', 'Daily', 'Beta.md')
 const BETA_ID = '01KVGMT8BFP350FZZXAMG1QDVC'
 const linker = (rel: string, id: string, keys: string) =>
   writeFile(join(root, rel), `---\nID: ${id}\n${keys}\n---\nlinker\n`)
+const ALPHA_ID = '01KVGMT8BFP350FZZXAMG1QDVA'
+const ALEPH_ID = '01KVGMT8BFP350FZZXAMG1QDV0'
+const page = (rel: string, id: string) => writeFile(join(root, rel), `---\nID: ${id}\n---\nbody\n`)
+const sidecarOrder = async (rel: string, key: string): Promise<unknown> =>
+  JSON.parse(await readFile(join(root, rel), 'utf8'))[key]
+const stateOrder = async (): Promise<Record<string, unknown>> =>
+  JSON.parse(await readFile(join(root, '.nexus', 'state.json'), 'utf8')).order
+const restoreRow = async (title: string) => {
+  const row = await find(title)
+  const r = await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath }, deps)
+  expect(r.ok, `restore ${title}`).toBe(true)
+}
 const frontmatter = async (rel = beta) => splitFrontmatter(await readFile(join(root, rel), 'utf8'))
 
 beforeEach(async () => {
@@ -119 +138 @@ afterEach(async () => {
 })
 
 describe('end to end — deleted, listed, restored', () => {
-  it('a page deleted and restored comes back where it was, and leaves the list', async () => {
+  it('a page deleted and restored comes back between its old neighbours, and leaves the list', async () => {
+    await page(join('Journal', 'Daily', 'Aleph.md'), ALEPH_ID)
+    await writeFile(
+      join(root, 'Journal', 'Daily', '_pageset.json'),
+      JSON.stringify({ id: 'set-daily', page_order: [BETA_ID, ALPHA_ID, ALEPH_ID] }),
+    )
     await del('Journal/Daily/Alpha.md', 'page')
     const row = await find('Alpha')
     expect(row.homeResolves).toBe(true)
@@ -127 +151 @@ describe('end to end — deleted, listed, restored', () => {
     const r = await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath }, deps)
     expect(r.ok).toBe(true)
     expect(await pathExists(join(root, 'Journal', 'Daily', 'Alpha.md'))).toBe(true)
+    expect(await sidecarOrder('Journal/Daily/_pageset.json', 'page_order')).toEqual([
+      BETA_ID,
+      ALPHA_ID,
+      ALEPH_ID,
+    ])
     expect(await rows()).toHaveLength(0)
   })
 
+  it('a Set restored returns to its slot in set_order', async () => {
+    for (const [name, id] of [
+      ['Weekly', 'set-week'],
+      ['Monthly', 'set-month'],
+    ]) {
+      await mkdir(join(root, 'Journal', name), { recursive: true })
+      await writeFile(join(root, 'Journal', name, '_pageset.json'), JSON.stringify({ id }))
+    }
+    const journal = JSON.parse(
+      await readFile(join(root, 'Journal', '_pagecollection.json'), 'utf8'),
+    )
+    const order = ['set-week', 'set-daily', 'set-month']
+    await writeFile(
+      join(root, 'Journal', '_pagecollection.json'),
+      JSON.stringify({ ...journal, set_order: order }),
+    )
+    await del('Journal/Daily', 'set')
+    await restoreRow('Daily')
+    expect(await sidecarOrder('Journal/_pagecollection.json', 'set_order')).toEqual(order)
+  })
+
+  it('a Collection restored returns to its slot in state.order.collections', async () => {
+    await mkdir(join(root, 'Zed'), { recursive: true })
+    await writeFile(join(root, 'Zed', '_pagecollection.json'), JSON.stringify({ id: 'col-zed' }))
+    const order = ['col-plain', 'col-journal', 'col-zed']
+    await setCollectionOrder(root, order)
+    await del('Journal', 'collection')
+    await restoreRow('Journal')
+    expect((await stateOrder()).collections).toEqual(order)
+  })
+
+  it('a Space restored returns to its slot in its Context’s Space order', async () => {
+    for (const [space, id] of [
+      ['Sapphire', 'sp-sap'],
+      ['Zeta', 'sp-zeta'],
+    ]) {
+      await mkdir(join(contextsDir(root), 'Projects', space), { recursive: true })
+      await writeFile(
+        join(contextsDir(root), 'Projects', space, '_space.json'),
+        JSON.stringify({ id }),
+      )
+    }
+    const order = ['sp-sap', 'sp-pom', 'sp-zeta']
+    await setSpaceOrder(root, 'ctx_projects', order)
+    await del('.nexus/contexts/Projects/Pommora', 'space')
+    await restoreRow('Pommora')
+    expect((await stateOrder()).spaces).toMatchObject({ ctx_projects: order })
+  })
+
+  it('a restore into a folder with no written order writes the order the folder showed, with the page in its slot', async () => {
+    await page(join('Journal', 'Daily', 'Aleph.md'), ALEPH_ID)
+    await del('Journal/Daily/Alpha.md', 'page')
+    await restoreRow('Alpha')
+    expect(await sidecarOrder('Journal/Daily/_pageset.json', 'page_order')).toEqual([
+      ALEPH_ID,
+      ALPHA_ID,
+      BETA_ID,
+    ])
+  })
+
+  it('a record from before the place was kept lands last, the order written whole', async () => {
+    await page(join('Journal', 'Daily', 'Aleph.md'), ALEPH_ID)
+    await del('Journal/Daily/Alpha.md', 'page')
+    const row = await find('Alpha')
+    const recordFile = join(root, row.bundlePath, '_record.json')
+    const { place: _, ...older } = JSON.parse(await readFile(recordFile, 'utf8'))
+    await writeFile(recordFile, JSON.stringify(older))
+    expect(
+      (await settledMutate(root, { op: 'restore', bundlePath: row.bundlePath }, deps)).ok,
+    ).toBe(true)
+    expect(await sidecarOrder('Journal/Daily/_pageset.json', 'page_order')).toEqual([
+      ALEPH_ID,
+      BETA_ID,
+      ALPHA_ID,
+    ])
+  })
+
   it('a renamed parent is followed — the row reads the new name and the file lands in it', async () => {
     await del('Journal/Daily/Alpha.md', 'page')
     expect(
@@ -329 +435 @@ describe('links come back with the page', () => {
   it('a restored page writes its Link values back onto the pages they came from', async () => {
     await del('Journal/Daily/Alpha.md', 'page')
     expect((await frontmatter()).Related).toBeUndefined()
-    expect((await listBundles(root))[0].record).toMatchObject({
+    expect((await listBundles(root, { kind: 'trash' }))[0].record).toMatchObject({
       links: [{ page: BETA_ID, property: 'prop_related', value: '[[Alpha]]' }],
     })
     expect(await restore('Alpha')).toBeUndefined()
@@ -526 +632 @@ describe('links come back with the page', () => {
     await refreshTree(root)
     const r = await settledMutate(root, { op: 'delete', path: gamma, kind: 'page' }, deps)
     expect(r.ok).toBe(false)
-    expect(await listBundles(root)).toEqual([])
+    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
     expect(await readFile(join(root, gamma), 'utf8')).toBe(content)
   })
 
```

##### Core/Views/creationOrder.test.ts

```/Core/Views/creationOrder.test.ts diff
@@ -1 +1 @@
 import { describe, expect, it } from 'vitest'
 import type { MutateRequest } from '../Nexus/mutateRequest'
-import { placeAt, placeNew, type Slot, spliceBeside, tieOrderWith } from './creationOrder'
+import { placeAt, placeNew, tieOrderWith } from './creationOrder'
+import type { Slot } from '../Nexus/order'
 import { makeTree } from '../Testing/testTree'
 import { makeSorter } from './Pipeline/sort'
 import type { ViewRow } from './viewRow'
@@ -89 +90 @@ describe('placeNew', () => {
   })
 })
 
-describe('spliceBeside', () => {
-  it('appends for a null anchor — the drop that landed past the last visible card', () => {
-    expect(spliceBeside(['a', 'b'], null, 'x', 'above')).toEqual(['a', 'b', 'x'])
-  })
-})
-
 describe('tieOrderWith', () => {
   it("a null anchor ranks the newborn last while reproducing the ranking — a band-add's end-of-group", () => {
     expect(tieOrderWith(['b', 'a'], ['a', 'b', 'c'], 'new', null, 'below')).toEqual([
```

##### Core/Views/loadValues.test.ts

```/Core/Views/loadValues.test.ts diff
@@ -13 +13 @@ const P2 = '01KVGMT8BFP350FZZXAMG1QDR2'
 let root: string
 beforeEach(async () => {
   root = tempRoot('pom-loadvalues-')
+  await mkdir(join(root, '.nexus'), { recursive: true })
+  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nxl' }))
+  await mkdir(join(root, 'Col', 'SetA'), { recursive: true })
+  await writeFile(join(root, 'Col', '_pagecollection.json'), JSON.stringify({ id: 'col' }))
+  await writeFile(join(root, 'Col', 'SetA', '_pageset.json'), JSON.stringify({ id: 'set' }))
 })
 afterEach(async () => {
+  dropLiveTree()
   await rm(root, { recursive: true, force: true })
 })
 
+const hold = async (): Promise<void> => seedLiveTree(await readNexus(root))
+
 describe('loadValues', () => {
   it('maps page id → frontmatter across the container and its nested Sets', async () => {
-    await mkdir(join(root, 'Col', 'SetA'), { recursive: true })
     await writeFile(
       join(root, 'Col', 'p1.md'),
       '---\nID: 01KVGMT8BFP350FZZXAMG1QDR1\n<Areas>:\n  - Work\nStatus: in_progress\n---\n\nbody\n',
@@ -29 +36 @@ describe('loadValues', () => {
       join(root, 'Col', 'SetA', 'p2.md'),
       '---\nID: 01KVGMT8BFP350FZZXAMG1QDR2\n<Count>: 7\n---\n\nbody\n',
     )
+    await hold()
 
     const values = await loadValues(root, 'Col')
     expect(Object.keys(values).sort()).toEqual([P1, P2])
@@ -42 +50 @@ describe('loadValues', () => {
     const tz = process.env.TZ
     process.env.TZ = 'America/New_York'
     try {
-      await mkdir(join(root, 'Col'), { recursive: true })
       const file = join(root, 'Col', 'p1.md')
       await writeFile(file, `---\nID: ${P1}\n---\n\nbody\n`)
       const modified = new Date('2026-09-02T00:30:00.000Z')
       await utimes(file, modified, modified)
+      await hold()
 
       const values = await loadValues(root, 'Col')
       expect(values[P1].modifiedAt).toBe('2026-09-01T20:30:00')
@@ -58 +66 @@ describe('loadValues', () => {
   })
 
   it('one undecodable ID leaves the rest of the batch intact', async () => {
-    await mkdir(join(root, 'Col'), { recursive: true })
     const bad = `8${P1.slice(1)}`
     await writeFile(join(root, 'Col', 'p1.md'), `---\nID: ${P1}\n---\n\nbody\n`)
     await writeFile(join(root, 'Col', 'bad.md'), `---\nID: ${bad}\n---\n\nbody\n`)
+    await hold()
 
     const values = await loadValues(root, 'Col')
     expect(values[bad].createdAt).toBeNull()
@@ -69 +77 @@ describe('loadValues', () => {
   })
 
   it('an ID-less page is absent from the values', async () => {
-    await mkdir(join(root, 'Col'), { recursive: true })
     await writeFile(join(root, 'Col', 'p1.md'), `---\nID: ${P1}\n---\n\nbody\n`)
     await writeFile(
       join(root, 'Col', 'noid.md'),
       '---\ntitle: x\n<Areas>:\n  - Work\nStatus: in_progress\n---\n\nbody\n',
     )
+    await hold()
 
     expect(Object.keys(await loadValues(root, 'Col'))).toEqual([P1])
   })
 
   // An editor that clears a field leaves `banner:` null; the page still has an id, properties, and a mtime — none of which a blank banner may take away.
   it('keeps a page whose icon or banner is null in the batch, values intact', async () => {
-    await mkdir(join(root, 'Col'), { recursive: true })
     await writeFile(
       join(root, 'Col', 'p1.md'),
       `---\nID: ${P1}\nbanner:\nStatus: Active\n---\n\nbody\n`,
     )
+    await hold()
 
     const values = await loadValues(root, 'Col')
     expect(values[P1]).toBeDefined()
@@ -96 +104 @@ describe('loadValues', () => {
 
   // A push names the pages it touched; reading only those keeps a body autosave from re-reading the whole container on every pause.
   it('reads only the named pages, resolved through the live tree', async () => {
-    await mkdir(join(root, '.nexus'), { recursive: true })
-    await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nxl' }))
-    await mkdir(join(root, 'Col', 'SetA'), { recursive: true })
-    await writeFile(join(root, 'Col', '_pagecollection.json'), JSON.stringify({ id: 'col' }))
-    await writeFile(join(root, 'Col', 'SetA', '_pageset.json'), JSON.stringify({ id: 'set' }))
     await writeFile(join(root, 'Col', 'p1.md'), `---\nID: ${P1}\nStatus: a\n---\n\nbody\n`)
     await writeFile(join(root, 'Col', 'SetA', 'p2.md'), `---\nID: ${P2}\n---\n\nbody\n`)
-    seedLiveTree(await readNexus(root))
-    try {
-      const values = await loadValues(root, 'Col', [P2])
-      expect(Object.keys(values)).toEqual([P2])
-      expect(await loadValues(root, 'Col', ['01KVGMT8BFP350FZZXAMG1QDR9'])).toEqual({})
-    } finally {
-      dropLiveTree()
-    }
+    await hold()
+    const values = await loadValues(root, 'Col', [P2])
+    expect(Object.keys(values)).toEqual([P2])
+    expect(await loadValues(root, 'Col', ['01KVGMT8BFP350FZZXAMG1QDR9'])).toEqual({})
+  })
+
+  it('reads the pages the tree holds under the container, never one the tree withholds', async () => {
+    const odd = `${P1.slice(0, 10)}T${P1.slice(11)}`
+    await writeFile(join(root, 'Col', 'p1.md'), `---\nID: ${P1}\n---\n\nbody\n`)
+    await writeFile(join(root, 'Col', 'odd.md'), `---\nID: ${odd}\n---\n\nbody\n`)
+    await mkdir(join(root, 'Col', 'Loose'))
+    await writeFile(join(root, 'Col', 'Loose', 'p2.md'), `---\nID: ${P2}\n---\n\nbody\n`)
+    await hold()
+
+    expect(Object.keys(await loadValues(root, 'Col'))).toEqual([P1])
   })
 
   it('returns an empty map for an absent container', async () => {
+    await hold()
     expect(await loadValues(root, 'Nope')).toEqual({})
   })
 })
```

##### Core/Views/Settings/ViewFrame.test.tsx

```/Core/Views/Settings/ViewFrame.test.tsx diff
@@ -126 +126 @@ describe('ViewFrame — reordering views', () => {
     expect(reorder).not.toHaveBeenCalled()
   })
 })
+
+describe('ViewFrame — the Archive toggle', () => {
+  let select: ReturnType<typeof vi.fn>
+  const archiveButton = (): HTMLElement =>
+    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Archive')!
+  const shown = (selection: 'collection' | 'archive'): void => {
+    useSession.setState({ selection: { kind: selection, id: 'col1' }, select: select as never })
+  }
+
+  beforeEach(() => {
+    select = vi.fn(async () => {})
+  })
+
+  it('the footing holds New View at its left and the Archive button at its right, and no More button', async () => {
+    shown('collection')
+    await mount(source([view('view_a', 'Table')]))
+    const newView = document.querySelector('[aria-label="New View"]') as HTMLElement
+    expect(newView.parentElement?.firstElementChild).toBe(newView)
+    expect(newView.parentElement?.lastElementChild).toBe(archiveButton())
+    expect(document.querySelector('[aria-label="More"]')).toBeNull()
+  })
+
+  it('pressing Archive shows the archive in place, and pressing it there returns to the view', async () => {
+    shown('collection')
+    await mount(source([view('view_a', 'Table')]))
+    expect(archiveButton().getAttribute('aria-pressed')).toBe('false')
+    await act(async () => archiveButton().click())
+    expect(select).toHaveBeenLastCalledWith({ kind: 'archive', id: 'col1' }, { newTab: false })
+    shown('archive')
+    await mount(source([view('view_a', 'Table')]))
+    expect(archiveButton().getAttribute('aria-pressed')).toBe('true')
+    await act(async () => archiveButton().click())
+    expect(select).toHaveBeenLastCalledWith({ kind: 'collection', id: 'col1' }, { newTab: false })
+  })
+
+  it('picking a view from the archive returns to it', async () => {
+    shown('archive')
+    await mount(source([view('view_a', 'Table'), view('view_b', 'Board')]))
+    await clickRow('Board')
+    expect(select).toHaveBeenCalledWith({ kind: 'collection', id: 'col1' }, { newTab: false })
+    expect(mutate).toHaveBeenCalledWith({
+      op: 'setActiveView',
+      path: 'Col',
+      kind: 'collection',
+      viewId: 'view_b',
+    })
+  })
+})
```

##### UIX/Animations/Swap.test.tsx

```/UIX/Animations/Swap.test.tsx diff
@@ -0 +1 @@
+// @vitest-environment jsdom
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { DONE_MS } from './motion'
+import { Swap } from './Swap'
+import { useTimedLabel } from './useTimedLabel'
+;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
+
+let host: HTMLDivElement
+let root: Root
+
+beforeEach(() => {
+  host = document.body.appendChild(document.createElement('div'))
+  root = createRoot(host)
+})
+afterEach(() => {
+  act(() => root.unmount())
+  host.remove()
+})
+
+const faces = (): [string | null, string | undefined, string | null, boolean][] =>
+  [...host.querySelectorAll<HTMLElement>('[data-face]')].map((f) => [
+    f.textContent,
+    f.dataset.face,
+    f.getAttribute('aria-hidden'),
+    f.hasAttribute('inert'),
+  ])
+
+describe('Swap', () => {
+  it('shows one face and leaves the other inert and unnamed', () => {
+    act(() => root.render(<Swap swapped={false} from="Clear" to="Cleared" />))
+    expect(faces()).toEqual([
+      ['Clear', 'shown', null, false],
+      ['Cleared', 'hidden', 'true', true],
+    ])
+  })
+
+  it('swaps the two when told', () => {
+    act(() => root.render(<Swap swapped={false} from="Clear" to="Cleared" />))
+    act(() => root.render(<Swap swapped from="Clear" to="Cleared" />))
+    expect(faces()).toEqual([
+      ['Clear', 'hidden', 'true', true],
+      ['Cleared', 'shown', null, false],
+    ])
+  })
+})
+
+describe('useTimedLabel', () => {
+  function Probe(): React.JSX.Element {
+    const [label, mark] = useTimedLabel('Clear', 'Cleared')
+    return (
+      <button type="button" onClick={mark}>
+        {label}
+      </button>
+    )
+  }
+  const shown = (): string | null | undefined =>
+    host.querySelector('[data-face="shown"]')?.textContent
+
+  it('holds its active face for DONE_MS after a mark, then returns', () => {
+    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
+    act(() => root.render(<Probe />))
+    act(() => host.querySelector('button')?.click())
+    expect(shown()).toBe('Cleared')
+    act(() => vi.advanceTimersByTime(DONE_MS - 1))
+    expect(shown()).toBe('Cleared')
+    act(() => vi.advanceTimersByTime(1))
+    expect(shown()).toBe('Clear')
+    vi.useRealTimers()
+  })
+})
```

##### UIX/Pickers/PickerControl.typeable.test.tsx

```/UIX/Pickers/PickerControl.typeable.test.tsx diff
@@ -2 +2 @@
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { act } from 'react'
 import { createRoot, type Root } from 'react-dom/client'
-import { type MenuDoor, PickerControl, setMenuDoor } from './PickerControl'
+import { type MenuDoor, PickerControl, setMenuDoor, steppedPickerProps } from './PickerControl'
+import { steppedRange } from '../Utilities/clamp'
 ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
 
 const OPTIONS = [
@@ -154 +155 @@ describe('a type-only picker', () => {
     expect(onCommit).toHaveBeenCalledWith('12')
   })
 })
+
+describe('a stepped picker held within a range', () => {
+  const onPick = vi.fn()
+  beforeEach(() => {
+    onPick.mockClear()
+    const props = steppedPickerProps({
+      range: { ...steppedRange([7, 14, 30, 60, 90]), min: 14, max: 30 },
+      value: 14,
+      unit: { scale: 1, suffix: ' Days', digits: 0 },
+      onPick,
+    })
+    act(() => {
+      root.render(<PickerControl ariaLabel="Archive History Timeframe" {...props} />)
+    })
+  })
+  const capped = (): HTMLButtonElement =>
+    host.querySelector('button[aria-label="Archive History Timeframe"]') as HTMLButtonElement
+
+  it('dims the steps outside the range in the list', () => {
+    press(capped(), 'click', { detail: 1 })
+    expect(door.mock.calls[0][0].map((r) => [r.label, r.disabled])).toEqual([
+      ['7 Days', true],
+      ['14 Days', false],
+      ['30 Days', false],
+      ['60 Days', true],
+      ['90 Days', true],
+    ])
+  })
+
+  it('holds a typed value at the cap', () => {
+    press(capped(), 'contextmenu', { button: 2 })
+    act(() => {
+      const input = field() as HTMLInputElement
+      input.value = '60'
+      input.dispatchEvent(new Event('input', { bubbles: true }))
+      input.blur()
+    })
+    expect(onPick).toHaveBeenCalledWith(30)
+  })
+})
```

##### UIX/Utilities/checkSet.test.ts

```/UIX/Utilities/checkSet.test.ts diff
@@ -0 +1 @@
+import { describe, expect, it } from 'vitest'
+import { actedOn } from './checkSet'
+
+const id = (key: string): string => key
+
+describe('actedOn', () => {
+  it('a right-click on an unchecked item acts on it alone, whatever else is checked', () => {
+    expect(actedOn(new Set(['a', 'c']), ['c', 'b', 'a'], 'b', id)).toEqual(['b'])
+  })
+
+  it('a checked item takes the checked items still shown, in their shown order', () => {
+    expect(actedOn(new Set(['a', 'c', 'z']), ['c', 'b', 'a'], 'a', id)).toEqual(['c', 'a'])
+  })
+})
```
