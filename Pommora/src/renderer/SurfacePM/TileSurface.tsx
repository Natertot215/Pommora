import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  knownBlock,
  NEW_TILE_H,
  type BlockEntry,
  blockHostKey,
  type BlockHostRef,
  type BlockStyle,
  type PagePickerItem,
  type ViewPick,
  type ViewPickerItem,
} from '@shared/blocks'
import { GLIDE_FEEL } from '@renderer/DesignSystem/Animation/feel'
import type { ConnPage, ConnectionsApi } from '@renderer/MarkdownPM/Connections'
import {
  containersByPathOf,
  pageIndexOf,
  pagesByIdOf,
  type ContainerCore,
} from '@renderer/treeIndex'
import { showConnectionMenu } from '@renderer/Links/connectionMenu'
import { hoverConnection, hoverWebsite } from '@renderer/Links/ConnectionPane'
import { attachBelow, insertBand, removeTile as removeLeaf } from '@renderer/SurfacePM/Core/ops'
import { getTile } from '@renderer/SurfacePM/Core/model'
import { SurfaceView, type BackdropTarget } from '@renderer/SurfacePM/SurfaceView'
import { entityIcon, iconNameOr } from '@renderer/DesignSystem/Symbols'
import type { EntityIconKind } from '@shared/types'
import { useSession } from '@renderer/store'
import { tileMenuModel } from '@shared/tileMenu'
import { popRowMenu, useNativeMenus } from '@renderer/Actions/nativeMenus'
import { askRemoveTile } from '@renderer/Windows/confirmations'
import { notifyRemovedTile } from '@renderer/Interface/notifications'
import { useHeld } from '@renderer/DesignSystem/Interactions/useHeld'
import { findCollection, findCollectionForSet, findSet } from '@renderer/Interface/scope'
import { mintDefaultView } from '@shared/views'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import { ZOOM_STEPS, zoomStep } from './tileZoom'
import { MarkdownTile } from './MarkdownTile'
import { TileHandleMenu } from './TileHandleMenu'
import { ViewTile } from './ViewTile'
import { PageTile } from './PageTile'
import { useTileDoc } from './useTileDoc'
import './block-tile-base.css'

function pagePickerItems(
  tree: NexusTree,
  defaultIcons?: Partial<Record<EntityIconKind, string>>,
): PagePickerItem[] {
  const pageItem = (p: { id: string; title: string; icon?: string }): PagePickerItem => ({
    label: p.title,
    icon: entityIcon('page', p.icon, defaultIcons),
    pick: p.id,
  })
  const setItem = (s: SetNode): PagePickerItem => ({
    label: s.title,
    icon: entityIcon('set', s.icon, defaultIcons),
    submenu: [...(s.sets ?? []).map(setItem), ...s.pages.map(pageItem)],
  })
  const collectionItem = (c: CollectionNode): PagePickerItem => ({
    label: c.title,
    icon: entityIcon('collection', c.icon, defaultIcons),
    submenu: [...c.sets.map(setItem), ...c.pages.map(pageItem)],
  })
  return tree.collections.map(collectionItem)
}

// Sub-Sets carry no views, so only depth-1 Sets drill here.
function viewPickerItems(
  tree: NexusTree,
  defaultIcons?: Partial<Record<EntityIconKind, string>>,
): ViewPickerItem[] {
  const containerViews = (node: CollectionNode | SetNode): ViewPickerItem[] => [
    ...(node.views ?? []).map((v) => ({
      label: v.name,
      icon: iconNameOr(v.icon, 'table'),
      pick: { source_id: node.id, view_id: v.id },
    })),
    { label: '+ Custom', pick: { source_id: node.id, custom: true }, footer: true },
  ]
  const collectionItem = (c: CollectionNode): ViewPickerItem => ({
    label: c.title,
    icon: entityIcon('collection', c.icon, defaultIcons),
    // The collection's own views sit ABOVE its Sets (a deliberate ordering); + Custom stays the pinned footer.
    submenu: [
      ...containerViews(c),
      ...c.sets.map((s) => ({
        label: s.title,
        icon: entityIcon('set', s.icon, defaultIcons),
        submenu: containerViews(s),
      })),
    ],
  })
  return tree.collections.map(collectionItem)
}

// Stable empties for a tree-less render, so the projections need no memo to hold identity.
const NO_PAGES: ReadonlyMap<string, ConnPage> = new Map()
const NO_CONTAINERS: ReadonlyMap<string, ContainerCore> = new Map()

export function TileSurface({ host }: { host: BlockHostRef }): React.JSX.Element | null {
  const { layout, blocks, ready, setLayout, commitLayout, refreshEntries, saveBlocks } =
    useTileDoc(host)
  const [editingId, setEditingId] = useState<string | null>(null)
  // Tiles mid-removal: their editor's flush-on-unmount must NOT run — the write
  // would land after the trash and resurrect the file as an entry-less orphan.
  const removing = useRef(new Set<string>())
  const tree = useSession((s) => s.tree)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const select = useSession((s) => s.select)
  // The store is the cross-subtree source — settings surfaces toggle this from elsewhere.
  const hostLocked = useSession((s) => s.hostLocks[blockHostKey(host)] ?? false)

  const entries = useMemo(() => {
    const map = new Map<string, BlockEntry>()
    for (const raw of blocks) {
      const entry = knownBlock(raw)
      if (entry) map.set(entry.id, entry)
    }
    return map
  }, [blocks])

  // Shared per-tree projections — the connections index and every page-embed lookup read the
  // same cached tables, never per-embed walks.
  const pagesById = tree ? pagesByIdOf(tree) : NO_PAGES
  const containersByPath = tree ? containersByPathOf(tree) : NO_CONTAINERS

  const openPreview = useSession((s) => s.openPreview)
  // Reads the LIVE personalization slice (setPersonalization updates it before the tree echoes).
  const openInPreview = useSession((s) => s.personalization.connectionsOpenInPreview ?? false)
  const connections = useMemo<ConnectionsApi | undefined>(() => {
    if (!tree) return undefined
    const idx = pageIndexOf(tree)
    return {
      ...idx,
      open: (page) =>
        openInPreview
          ? openPreview({ id: page.id, path: page.path })
          : void select({ kind: 'page', id: page.id, path: page.path }),
      bypass: (page) =>
        void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true }),
      hover: hoverConnection,
      hoverSite: hoverWebsite,
      menu: showConnectionMenu,
    }
  }, [tree, select, openPreview, openInPreview])

  useEffect(() => {
    if (!editingId) return
    // Capture phase — a gesture handler's stopPropagation (SurfacePM's handles/edges) must not
    // swallow the click-out.
    const onDown = (e: PointerEvent): void => {
      if (!(e.target as Element | null)?.closest?.('.spm-tile.is-editing-tile')) setEditingId(null)
    }
    const onKey = (e: KeyboardEvent): void => {
      // CM6 consumes Esc first when its autocomplete is open — that press closes the popup only.
      if (e.key === 'Escape' && !e.defaultPrevented) setEditingId(null)
    }
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [editingId])

  // Order is load-bearing: suppress the tile's editor flush, layout first
  // (invisible orphan beats a dead box on a crash), then the entry + file.
  const removeBlock = useCallback(
    (id: string) => {
      removing.current.add(id)
      setEditingId((cur) => (cur === id ? null : cur))
      commitLayout((cur) => removeLeaf(cur, id))
      void window.nexus.blocks.removeTile(host, id).then(refreshEntries)
    },
    [commitLayout, refreshEntries, host],
  )
  const suppressFlush = useCallback((id: string) => removing.current.has(id), [])

  const applyPagePick = useCallback(
    (id: string, pageId: string) => {
      setEditingId((cur) => (cur === id ? null : cur))
      void window.nexus.blocks.convertToPage(host, id, pageId).then(refreshEntries)
    },
    [refreshEntries, host],
  )

  // main re-mints the config id payload-local and flips the entry — copied, never synced.
  const applyViewPick = useCallback(
    (id: string, pick: ViewPick) => {
      if (!tree) return
      const container = findCollection(tree, pick.source_id) ?? findSet(tree, pick.source_id)
      if (!container) return
      const config = pick.custom
        ? mintDefaultView(
            (container.kind === 'collection' ? container : findCollectionForSet(tree, container.id))
              ?.properties ?? [],
          )
        : (container.views ?? []).find((v) => v.id === pick.view_id)
      if (!config) return
      setEditingId((cur) => (cur === id ? null : cur))
      void window.nexus.blocks
        .convertToView(host, id, [{ source_id: pick.source_id, config }])
        .then(refreshEntries)
    },
    [tree, refreshEntries, host],
  )

  const [handleMenu, setHandleMenu] = useState<{ id: string; el: HTMLElement } | null>(null)
  const nativeMenus = useNativeMenus()
  // The native path never sets `handleMenu`, so the in-app pane is never mounted for it.
  const popNativeMenu = useRef<(id: string, el: HTMLElement) => void>(() => undefined)
  const onHandleMenu = useCallback(
    (id: string, e: React.MouseEvent) => {
      const el = e.currentTarget as HTMLElement
      if (nativeMenus) popNativeMenu.current(id, el)
      else setHandleMenu({ id, el })
    },
    [nativeMenus],
  )
  // The menu stays mounted through its Bloom-out, so the tile it belongs to has to outlive the
  // dismissal that cleared it — otherwise React tears the pane out before it can retract.
  const menu = useHeld(handleMenu, handleMenu !== null)
  const setStyle = useCallback(
    (id: string, style: BlockStyle) => {
      saveBlocks((cur) =>
        cur.map((b) =>
          knownBlock(b)?.id === id ? { ...(b as Record<string, unknown>), style } : b,
        ),
      )
    },
    [saveBlocks],
  )
  // Raw entry spreads so foreign fields survive; absent = unlocked.
  const toggleLock = useCallback(
    (id: string) => {
      saveBlocks((cur) =>
        cur.map((b) => {
          if (knownBlock(b)?.id !== id) return b
          const next = { ...(b as Record<string, unknown>) }
          // Toggles off the STRICT boolean — a foreign truthy `locked` (e.g. 1) parses to unlocked,
          // so the first click must lock, not delete-to-no-op.
          if (next.locked === true) delete next.locked
          else next.locked = true
          return next
        }),
      )
    },
    [saveBlocks],
  )
  const duplicateBlock = useCallback(
    (id: string) => {
      void window.nexus.blocks.duplicateTile(host, id).then((r) => {
        if (!r.ok) return
        refreshEntries()
        commitLayout((cur) => attachBelow(cur, id, r.value.id, getTile(cur, id)?.h ?? NEW_TILE_H))
      })
    },
    [refreshEntries, commitLayout, host],
  )
  const confirmRemove = useCallback(
    (id: string) => {
      void askRemoveTile().then((ok) => {
        if (!ok) return
        removeBlock(id)
        notifyRemovedTile()
      })
    },
    [removeBlock],
  )

  const tileClassName = useCallback(
    (id: string) => {
      const classes = [
        entries.get(id)?.style === 'borderless' ? 'is-borderless' : null,
        editingId === id ? 'is-editing-tile' : null,
        entries.get(id)?.locked ? 'is-locked' : null,
        handleMenu?.id === id ? 'handle-pinned' : null, // the open picker's anchor stays shown
        zoomStep(entries.get(id)?.zoom).cls || null,
      ].filter(Boolean)
      return classes.length ? classes.join(' ') : undefined
    },
    [entries, editingId, handleMenu],
  )

  // Hands the embed the raw entry so foreign keys on it and its elements survive.
  const mutateViewEntry = useCallback(
    (entryId: string, fn: (raw: Record<string, unknown>) => Record<string, unknown>) => {
      saveBlocks((cur) =>
        cur.map((raw) => {
          const e = knownBlock(raw)
          if (e?.id !== entryId || e.type !== 'view') return raw
          return fn(raw as Record<string, unknown>)
        }),
      )
    },
    [saveBlocks],
  )

  // Clears `zoom` at 1.0 so the default stays an absent key (mirrors setStyle/toggleLock).
  const setBlockZoom = useCallback(
    (id: string, factor: number) => {
      saveBlocks((cur) =>
        cur.map((raw) => {
          if (knownBlock(raw)?.id !== id) return raw
          const next = { ...(raw as Record<string, unknown>) }
          if (factor === 1) delete next.zoom
          else next.zoom = factor
          return next
        }),
      )
    },
    [saveBlocks],
  )

  const renderTile = useCallback(
    (id: string) => {
      const entry = entries.get(id)
      if (entry?.type === 'markdown')
        return (
          <MarkdownTile
            host={host}
            tileId={id}
            editing={editingId === id}
            onBeginEdit={setEditingId}
            connections={connections}
            suppressFlush={suppressFlush}
            locked={entry.locked ?? false}
          />
        )
      if (entry?.type === 'page') {
        const page = pagesById.get(entry.page_id)
        if (!page) return <div className="tile-inert" /> // dead reference — inert, space holds
        return (
          <PageTile
            path={page.path}
            editing={editingId === id}
            onBeginEdit={() => setEditingId(entry.id)}
            connections={connections}
            locked={entry.locked ?? false}
          />
        )
      }
      if (entry?.type === 'view')
        return (
          <ViewTile
            entry={entry}
            mutateEntry={mutateViewEntry}
            onActivate={() => setEditingId(id)}
          />
        )
      return <div className="tile-inert" /> // no/foreign/unknown entry — space holds, nothing breaks
    },
    [entries, editingId, connections, suppressFlush, pagesById, host, mutateViewEntry],
  )

  // Updater form — a gesture committing during the IPC await must not be overwritten by a
  // render-captured layout.
  const onBackdrop = useCallback(
    (target: BackdropTarget) => {
      void window.nexus.blocks.createMarkdown(host).then((r) => {
        if (!r.ok) return
        refreshEntries()
        commitLayout((cur) =>
          target.kind === 'wedge'
            ? attachBelow(cur, target.above, r.value.id, target.fillPx)
            : insertBand(cur, cur.bands.length, r.value.id, NEW_TILE_H),
        )
      })
    },
    [commitLayout, refreshEntries, host],
  )

  if (!ready) return null
  // Resolved off the shared id→page map — never a per-embed walk.
  const menuEntry = handleMenu ? entries.get(handleMenu.id) : undefined
  const menuPage = menuEntry?.type === 'page' ? pagesById.get(menuEntry.page_id) : undefined
  const menuPageInfo = menuPage
    ? {
        title: menuPage.title,
        icon: entityIcon('page', menuPage.icon, defaultIcons),
      }
    : undefined
  const menuLoc = menuPage
    ? containersByPath.get(menuPage.path.split('/').slice(0, -1).join('/'))
    : undefined
  const menuLocInfo = menuLoc
    ? {
        title: menuLoc.title,
        icon: entityIcon(menuLoc.kind, menuLoc.icon, defaultIcons),
      }
    : undefined
  // Assigned rather than called: the gesture handler is memoized against the preference alone, so
  // it must reach the current build through a ref rather than closing over this render's tiles.
  popNativeMenu.current = (id, el) => {
    const entry = entries.get(id)
    if (!entry || !tree) return
    const page = entry.type === 'page' ? pagesById.get(entry.page_id) : undefined
    const { items, picks } = tileMenuModel({
      entry,
      pageInfo: page && { title: page.title },
      pageItems: pagePickerItems(tree, defaultIcons),
      viewItems: viewPickerItems(tree, defaultIcons),
      zoomSteps: ZOOM_STEPS,
      currentFactor: zoomStep(entry.zoom).factor,
      locked: (entry.locked ?? false) || hostLocked,
      containerLocked: hostLocked,
    })
    void popRowMenu(items, el).then((action) => {
      if (action === null) return
      // The two rows that carry a value carry it in their action, so each names its prefix once.
      const arg = (prefix: string): string | undefined =>
        action.startsWith(prefix) ? action.slice(prefix.length) : undefined
      const picked = arg('tile:pick:')
      const zoom = arg('tile:zoom:')
      const chosen = picked === undefined ? undefined : picks[Number(picked)]
      if (chosen?.kind === 'page') applyPagePick(id, chosen.value)
      else if (chosen?.kind === 'view') applyViewPick(id, chosen.value)
      else if (zoom !== undefined) setBlockZoom(id, Number(zoom))
      else if (action === 'tile:style:bordered') setStyle(id, 'bordered')
      else if (action === 'tile:style:borderless') setStyle(id, 'borderless')
      else if (action === 'tile:duplicate') duplicateBlock(id)
      else if (action === 'tile:delete') confirmRemove(id)
      else if (action === 'tile:lock') toggleLock(id)
    })
  }

  return (
    <div
      className={`blk-surface${editingId ? ' has-live-editor' : ''}${hostLocked ? ' is-host-locked' : ''}`}
    >
      <SurfaceView
        layout={layout}
        onLayoutChange={setLayout}
        renderTile={renderTile}
        feel={GLIDE_FEEL}
        tileClassName={tileClassName}
        isTileStatic={(id) => hostLocked || (entries.get(id)?.locked ?? false)}
        onHandleMenu={onHandleMenu}
        onBackdrop={onBackdrop}
      />
      {menu && entries.get(menu.id) && tree && (
        <TileHandleMenu
          open={handleMenu !== null}
          entry={entries.get(menu.id) as BlockEntry}
          anchor={menu.el}
          pageItems={pagePickerItems(tree, defaultIcons)}
          viewItems={viewPickerItems(tree, defaultIcons)}
          pageInfo={menuPageInfo}
          location={menuLocInfo}
          onClose={() => setHandleMenu(null)}
          onPickPage={(pageId) => applyPagePick(menu.id, pageId)}
          onPickView={(pick) => applyViewPick(menu.id, pick)}
          onStyle={(style) => setStyle(menu.id, style)}
          onDuplicate={() => duplicateBlock(menu.id)}
          onRemove={() => confirmRemove(menu.id)}
          onToggleLock={() => toggleLock(menu.id)}
          onOpenPage={() =>
            menuPage && select({ kind: 'page', id: menuPage.id, path: menuPage.path })
          }
          zoom={menuEntry?.zoom}
          onSetZoom={(factor) => setBlockZoom(menu.id, factor)}
          containerLocked={hostLocked}
        />
      )}
    </div>
  )
}
