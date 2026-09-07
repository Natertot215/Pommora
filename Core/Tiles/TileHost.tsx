import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  knownTile,
  NEW_TILE_H,
  type TileEntry,
  tileHostKey,
  type TileHostRef,
  type TileStyle,
  type PagePickerItem,
  type ViewPick,
  type ViewPickerItem,
} from '@pommora/core/Tiles/tiles'
import type { ConnPage } from '../MarkdownPM/Links/connectionsApi'
import { containersByPathOf, pagesByIdOf, type ContainerCore } from '../Nexus/treeIndex'
import { usePreviewConnections } from '../Session/pageConnections'
import { attachBelow, insertBand, removeLeaf } from './Layout/ops'
import { getTile } from './Layout/model'
import { TileGrid, type BackdropTarget } from './TileGrid'
import { iconNameOr } from '@pommora/uix/Symbols'
import { entityIcon } from '../Assets/entityIconPolicy'
import type { EntityIconKind } from '@pommora/core/Settings/personalization'
import { useSession } from '../Session/store'
import { popRowMenu, useNativeMenus } from '../Actions/nativeMenus'
import { askRemoveTile } from '../Interface/Confirm/confirmations'
import { notifyRemovedTile } from '../Interface/Notifications/notifications'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { findCollection, findCollectionForSet, findSet } from '../Nexus/treeIndex'
import { mintDefaultView } from '@pommora/core/Views/views'
import type { CollectionNode, NexusTree, PageNode, SetNode } from '@pommora/core/Nexus/tree'
import { zoomStyle } from './tileZoom'
import {
  inertTile,
  type MutateEntry,
  renderTile as renderSurface,
  tileSourceInfo,
} from './tileKinds'
import { TileHandleMenu, tileMenuItems } from './TileHandleMenu'
import { useTileDoc } from './useTileDoc'
import { host as dialer } from '../Platform/dialer'
import './tile-base.css'

function pagePickerItems(
  tree: NexusTree,
  defaultIcons?: Partial<Record<EntityIconKind, string>>,
): PagePickerItem[] {
  const pageItem = (p: PageNode): PagePickerItem => ({
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

// An absent key IS the default, so clearing a field deletes it rather than writing the default back.
const withKey = (
  raw: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> => {
  const next = { ...raw }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}

const NO_PAGES: ReadonlyMap<string, ConnPage> = new Map()
const NO_CONTAINERS: ReadonlyMap<string, ContainerCore> = new Map()

export function TileHost({ host }: { host: TileHostRef }): React.JSX.Element | null {
  const { layout, tiles, ready, setLayout, commitLayout, refreshEntries, saveTiles, setBusy } =
    useTileDoc(host)
  const [editingId, setEditingId] = useState<string | null>(null)
  // Tiles mid-removal: their editor's flush-on-unmount must NOT run — the write would land after the trash and resurrect the file as an entry-less orphan.
  const removing = useRef(new Set<string>())
  const tree = useSession((s) => s.tree)
  const defaultIcons = useSession((s) => s.personalization.defaultIcons)
  const pickers = useMemo(
    () =>
      tree && {
        pageItems: pagePickerItems(tree, defaultIcons),
        viewItems: viewPickerItems(tree, defaultIcons),
      },
    [tree, defaultIcons],
  )
  const select = useSession((s) => s.select)
  const hostLocked = useSession((s) => s.hostLocks[tileHostKey(host)] ?? false)

  const entries = useMemo(() => {
    const map = new Map<string, TileEntry>()
    for (const raw of tiles) {
      const entry = knownTile(raw)
      if (entry) map.set(entry.id, entry)
    }
    return map
  }, [tiles])

  const pagesById = tree ? pagesByIdOf(tree) : NO_PAGES
  const containersByPath = tree ? containersByPathOf(tree) : NO_CONTAINERS

  const connections = usePreviewConnections(tree)

  useEffect(() => {
    if (!editingId) return
    // Capture phase — a gesture handler's stopPropagation (the grid's handles/edges) must not swallow the click-out.
    const onDown = (e: PointerEvent): void => {
      if (!(e.target as Element | null)?.closest?.('.tile.is-editing-tile')) setEditingId(null)
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

  const suppressFlush = useCallback((id: string) => removing.current.has(id), [])

  const applyPagePick = useCallback(
    (id: string, pageId: string) => {
      setEditingId((cur) => (cur === id ? null : cur))
      void dialer().ask('tiles:convertToPage', host, id, pageId).then(refreshEntries)
    },
    [refreshEntries, host],
  )

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
      void dialer()
        .ask('tiles:convertToView', host, id, [{ source_id: pick.source_id, config }])
        .then(refreshEntries)
    },
    [tree, refreshEntries, host],
  )

  const [handleMenu, setHandleMenu] = useState<{ id: string; el: HTMLElement } | null>(null)
  const nativeMenus = useNativeMenus()
  const popNativeMenu = useRef<(id: string, el: HTMLElement) => void>(() => undefined)
  const onHandleMenu = useCallback(
    (id: string, e: React.MouseEvent) => {
      const el = e.currentTarget as HTMLElement
      if (nativeMenus) popNativeMenu.current(id, el)
      else setHandleMenu({ id, el })
    },
    [nativeMenus],
  )
  // The menu stays mounted through its Bloom-out, so the tile it belongs to has to outlive the dismissal that cleared it.
  const menu = useHeld(handleMenu, handleMenu !== null)
  // Held with the anchor: a delete with confirmation waived drops the entry inside the retract.
  const menuTile = useHeld(handleMenu ? entries.get(handleMenu.id) : undefined, handleMenu !== null)
  const mutateEntry = useCallback<MutateEntry>(
    (id, fn) => {
      saveTiles((cur) =>
        cur.map((raw) => (knownTile(raw)?.id === id ? fn(raw as Record<string, unknown>) : raw)),
      )
    },
    [saveTiles],
  )
  const setStyle = useCallback(
    (id: string, style: TileStyle) => mutateEntry(id, (raw) => ({ ...raw, style })),
    [mutateEntry],
  )
  // Toggles off the STRICT boolean — a foreign truthy `locked` parses to unlocked, so the first click must lock, not delete-to-no-op.
  const toggleLock = useCallback(
    (id: string) =>
      mutateEntry(id, (raw) => withKey(raw, 'locked', raw.locked === true ? undefined : true)),
    [mutateEntry],
  )
  const duplicateTile = useCallback(
    (id: string) => {
      void dialer()
        .ask('tiles:duplicateTile', host, id)
        .then((r) => {
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
        // Order is load-bearing: suppress the tile's editor flush, layout first (invisible orphan beats a dead box on a crash), then the entry + file.
        removing.current.add(id)
        setEditingId((cur) => (cur === id ? null : cur))
        commitLayout((cur) => removeLeaf(cur, id))
        void dialer().ask('tiles:removeTile', host, id).then(refreshEntries)
        notifyRemovedTile()
      })
    },
    [commitLayout, refreshEntries, host],
  )

  const tileClassName = useCallback(
    (id: string) => {
      const entry = entries.get(id)
      const classes = [
        entry?.style === 'borderless' ? 'is-borderless' : null,
        editingId === id ? 'is-editing-tile' : null,
        entry?.locked ? 'is-locked' : null,
        handleMenu?.id === id ? 'handle-pinned' : null,
      ].filter(Boolean)
      return classes.length ? classes.join(' ') : undefined
    },
    [entries, editingId, handleMenu],
  )

  const tileStyle = useCallback((id: string) => zoomStyle(entries.get(id)?.zoom), [entries])

  const setTileZoom = useCallback(
    (id: string, factor: number) =>
      mutateEntry(id, (raw) => withKey(raw, 'zoom', factor === 1 ? undefined : factor)),
    [mutateEntry],
  )

  const renderTile = useCallback(
    (id: string) => {
      const entry = entries.get(id)
      if (!entry) return inertTile()
      return renderSurface({
        entry,
        id,
        host,
        editing: editingId === id,
        beginEdit: setEditingId,
        connections,
        suppressFlush,
        pagesById,
        mutateEntry,
      })
    },
    [entries, editingId, connections, suppressFlush, pagesById, host, mutateEntry],
  )

  const onBackdrop = useCallback(
    (target: BackdropTarget) => {
      void dialer()
        .ask('tiles:createMarkdown', host)
        .then((r) => {
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
  const menuPage = menuTile && tileSourceInfo(menuTile, pagesById)
  const menuPageInfo = menuPage && {
    title: menuPage.title,
    icon: entityIcon('page', menuPage.icon, defaultIcons),
  }
  const menuLoc = menuPage && containersByPath.get(menuPage.path.split('/').slice(0, -1).join('/'))
  const menuLocInfo = menuLoc && {
    title: menuLoc.title,
    icon: entityIcon(menuLoc.kind, menuLoc.icon, defaultIcons),
  }
  // Assigned rather than called: the gesture handler is memoized against the preference alone, so it must reach the current build through a ref.
  popNativeMenu.current = (id, el) => {
    const entry = entries.get(id)
    if (!entry || !pickers) return
    const page = tileSourceInfo(entry, pagesById)
    const { items, picks } = tileMenuItems({
      entry,
      ...pickers,
      pageInfo: page && { title: page.title },
      containerLocked: hostLocked,
    })
    void popRowMenu(items, el).then((action) => {
      if (action === null) return
      const arg = (prefix: string): string | undefined =>
        action.startsWith(prefix) ? action.slice(prefix.length) : undefined
      const picked = arg('tile:pick:')
      const zoom = arg('tile:zoom:')
      const chosen = picked === undefined ? undefined : picks[Number(picked)]
      if (chosen?.kind === 'page') applyPagePick(id, chosen.value)
      else if (chosen?.kind === 'view') applyViewPick(id, chosen.value)
      else if (zoom !== undefined) setTileZoom(id, Number(zoom))
      else if (action === 'tile:style:bordered') setStyle(id, 'bordered')
      else if (action === 'tile:style:borderless') setStyle(id, 'borderless')
      else if (action === 'tile:duplicate') duplicateTile(id)
      else if (action === 'tile:delete') confirmRemove(id)
      else if (action === 'tile:lock') toggleLock(id)
    })
  }

  return (
    <div className={`tile-host${hostLocked ? ' is-host-locked' : ''}`}>
      <TileGrid
        layout={layout}
        onLayoutChange={setLayout}
        renderTile={renderTile}
        tileClassName={tileClassName}
        tileStyle={tileStyle}
        onBusyChange={setBusy}
        isTileStatic={(id) => hostLocked || (entries.get(id)?.locked ?? false)}
        onHandleMenu={onHandleMenu}
        onBackdrop={onBackdrop}
      />
      {menu && menuTile && pickers && (
        <TileHandleMenu
          open={handleMenu !== null}
          entry={menuTile}
          anchor={menu.el}
          {...pickers}
          pageInfo={menuPageInfo}
          location={menuLocInfo}
          onClose={() => setHandleMenu(null)}
          onPickPage={(pageId) => applyPagePick(menu.id, pageId)}
          onPickView={(pick) => applyViewPick(menu.id, pick)}
          onStyle={(style) => setStyle(menu.id, style)}
          onDuplicate={() => duplicateTile(menu.id)}
          onRemove={() => confirmRemove(menu.id)}
          onToggleLock={() => toggleLock(menu.id)}
          onOpenPage={() =>
            menuPage && select({ kind: 'page', id: menuPage.id, path: menuPage.path })
          }
          onSetZoom={(factor) => setTileZoom(menu.id, factor)}
          containerLocked={hostLocked}
        />
      )}
    </div>
  )
}
