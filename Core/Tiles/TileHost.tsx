import { isPlainObject } from '../Properties/propertyValue'
import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react'
import {
  knownTile,
  NEW_TILE_H,
  type TileEntry,
  type TileHostRef,
  type TileStyle,
  type PagePickerItem,
  TILE_KINDS,
  type TilePick,
  type ViewPickerItem,
} from '@pommora/core/Tiles/tiles'
import type { ConnPage } from '../Connections/pageIndex'
import { pagesByIdOf } from '../Nexus/treeIndex'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import { useConnections } from '../Session/pageConnections'
import { attachBelow, insertBand, removeLeaf } from './Layout/ops'
import { emptyLayout, findTile, getTile, type TileLayout } from './Layout/model'
import { TileGrid, type BackdropTarget } from './TileGrid'
import { useDismissal } from '@pommora/uix/Interactions/dismissalStack'
import { entityIcon } from '../Assets/entityIconPolicy'
import type { EntityIconKind } from '@pommora/core/Settings/personalization'
import { useSession } from '../Session/store'
import { popMenu } from '../Actions/menuActions'
import { askRemoveTile } from '../Interface/Confirm/confirmations'
import { notifyUndoable, reportRefusal } from '../Interface/Notifications/notifications'
import { viewGlyph } from '../Views/viewIcon'
import type { CollectionNode, NexusTree, PageNode, SetNode } from '@pommora/core/Nexus/tree'
import { DEFAULT_ZOOM, ZOOM_STEPS, zoomStep } from './tileZoom'
import {
  inertTile,
  type MutateEntry,
  renderTile as renderSurface,
  tileSourceInfo,
} from './tileKinds'
import { tileMenuItems } from './tileHandleMenu'
import { isTileRemoving, markTileRemoving, readTileBody, unmarkTileRemoving } from './tileDocStore'
import { useTileDoc } from './useTileDoc'
import { dialer } from '../Platform/dialer'
import { cx } from '@pommora/uix/Utilities/cx'
import { RenderBoundary } from '@pommora/uix/Elements/RenderBoundary'
import './tile-base.css'

function pagePickerItems(
  tree: NexusTree,
  defaultIcons?: Partial<Record<EntityIconKind, string>>,
): PagePickerItem[] {
  const pageItem = (p: PageNode): PagePickerItem => ({
    label: p.title,
    icon: entityIcon('page', tree.pageMetadata[p.id]?.icon, defaultIcons),
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
      icon: viewGlyph(v),
      pick: { source_id: node.id, view_id: v.id },
    })),
    { label: '+ Custom', pick: { source_id: node.id }, footer: true },
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

const ZOOM_STYLES = new Map<number, CSSProperties>(
  ZOOM_STEPS.filter((f) => f !== DEFAULT_ZOOM).map((f) => [
    f,
    { '--tile-zoom': f } as CSSProperties,
  ]),
)

export function zoomStyle(factor?: number): CSSProperties | undefined {
  return ZOOM_STYLES.get(zoomStep(factor))
}

// A write replaces only the entries it changed, so an untouched entry keeps its parse, and every memo keyed on it holds.
const parsedTiles = new WeakMap<object, TileEntry | null>()
const parsedTile = (raw: unknown): TileEntry | null => {
  if (!isPlainObject(raw)) return knownTile(raw)
  if (!parsedTiles.has(raw)) parsedTiles.set(raw, knownTile(raw))
  return parsedTiles.get(raw) ?? null
}

export function TileHost({
  host,
  connections,
}: {
  host: TileHostRef
  connections?: ConnectionsApi
}): React.JSX.Element | null {
  const {
    layout,
    tiles,
    ready,
    locked: hostLocked,
    setLayout,
    commitLayout,
    refreshEntries,
    saveTiles,
    setBusy,
  } = useTileDoc(host)
  const [editingId, setEditingId] = useState<string | null>(null)
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

  const entries = useMemo(() => {
    const map = new Map<string, TileEntry>()
    for (const raw of tiles) {
      const entry = parsedTile(raw)
      if (entry) map.set(entry.id, entry)
    }
    return map
  }, [tiles])

  const pagesById = tree ? pagesByIdOf(tree) : NO_PAGES

  const preview = useConnections(tree, 'preview')
  const conn = connections ?? preview
  const openRoute = connections?.open

  const rootRef = useRef<HTMLDivElement>(null)
  useDismissal(editingId !== null, false, {
    layer: () => rootRef.current?.querySelector('.tile.is-editing-tile') ?? null,
    dismiss: () => setEditingId(null),
  })

  const applyPick = useCallback(
    (id: string, pick: TilePick) => {
      setEditingId((cur) => (cur === id ? null : cur))
      void dialer().ask('tiles:convert', host, id, pick).then(reportRefusal).then(refreshEntries)
    },
    [refreshEntries, host],
  )

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
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
          if (!reportRefusal(r)) return
          refreshEntries()
          commitLayout((cur) => attachBelow(cur, id, r.value.id, getTile(cur, id)?.h ?? NEW_TILE_H))
        })
    },
    [refreshEntries, commitLayout, host],
  )
  const confirmRemove = useCallback(
    (id: string) => {
      const kind = entries.get(id)?.type
      void askRemoveTile().then((ok) => {
        if (!ok || !kind) return
        // Order is load-bearing: suppress the tile's editor flush, layout first (invisible orphan beats a dead box on a crash), then the entry + file.
        markTileRemoving(id)
        setEditingId((cur) => (cur === id ? null : cur))
        let before = emptyLayout()
        let after: TileLayout | null = null
        commitLayout((cur) => {
          before = cur
          after = removeLeaf(cur, id)
          return after
        })
        const at = (): { band: number; h: number } => ({
          band: findTile(before, id)?.band ?? before.bands.length,
          h: getTile(before, id)?.h ?? NEW_TILE_H,
        })
        // Untouched since, the board returns exactly; otherwise the tile comes back as its own band where it stood, and nothing placed since moves.
        const putBack = (): void => {
          const { band, h } = at()
          const untouched = JSON.stringify(after)
          commitLayout((cur) =>
            JSON.stringify(cur) === untouched ? before : insertBand(cur, band, id, h),
          )
        }
        void dialer()
          .ask('tiles:removeTile', host, id)
          .then((r) => {
            refreshEntries()
            if (!reportRefusal(r)) return putBack()
            unmarkTileRemoving(id)
            const body = readTileBody(id) ?? r.value.body
            notifyUndoable(`Deleted ${TILE_KINDS[kind].label}`, async () => {
              const back = await dialer().ask('tiles:restoreTile', host, {
                ...r.value,
                ...(body === undefined ? {} : { body }),
                at: at(),
              })
              refreshEntries()
              if (reportRefusal(back)) putBack()
            })
          })
      })
    },
    [entries, commitLayout, refreshEntries, host],
  )

  const tileClassName = useCallback(
    (id: string) => {
      const entry = entries.get(id)
      return cx(entry?.style === 'borderless' && 'is-borderless', entry?.locked && 'is-locked')
    },
    [entries],
  )

  const tileStyle = useCallback((id: string) => zoomStyle(entries.get(id)?.zoom), [entries])

  const setTileZoom = useCallback(
    (id: string, factor: number) =>
      mutateEntry(id, (raw) => withKey(raw, 'zoom', factor === 1 ? undefined : factor)),
    [mutateEntry],
  )

  const onHandleMenu = useCallback(
    (id: string, e: React.MouseEvent) => {
      const entry = entries.get(id)
      if (!entry || !pickers) return
      const page = tileSourceInfo(entry, pagesById)
      const build = (on: TileEntry): ReturnType<typeof tileMenuItems> =>
        tileMenuItems({
          entry: on,
          ...pickers,
          pageInfo: page && {
            title: page.title,
            icon: entityIcon('page', page.icon, defaultIcons),
          },
          containerLocked: hostLocked,
        })
      let built = build(entry)
      const arg = (action: string, prefix: string): string | undefined =>
        action.startsWith(prefix) ? action.slice(prefix.length) : undefined
      const run = (action: string): void => {
        const picked = arg(action, 'tile:pick:')
        const zoom = arg(action, 'tile:zoom:')
        const chosen = picked === undefined ? undefined : built.picks[Number(picked)]
        if (chosen) applyPick(id, chosen)
        else if (zoom !== undefined) setTileZoom(id, Number(zoom))
        else if (action === 'tile:style:bordered') setStyle(id, 'bordered')
        else if (action === 'tile:style:borderless') setStyle(id, 'borderless')
        else if (action === 'tile:duplicate') duplicateTile(id)
        else if (action === 'tile:delete') confirmRemove(id)
        else if (action === 'tile:lock') toggleLock(id)
        else if (action === 'tile:open' && page) {
          if (openRoute) openRoute(page)
          else select({ kind: 'page', id: page.id, path: page.path })
        }
      }
      let current = entry
      const project = (action: string): TileEntry => {
        const zoom = arg(action, 'tile:zoom:')
        if (zoom !== undefined) return { ...current, zoom: Number(zoom) }
        if (action === 'tile:style:bordered') return { ...current, style: 'bordered' }
        if (action === 'tile:style:borderless') return { ...current, style: 'borderless' }
        if (action === 'tile:lock') return { ...current, locked: !(current.locked ?? false) }
        return current
      }
      setMenuOpenId(id)
      void popMenu(built.items, e.currentTarget as HTMLElement, {
        stay: (action) => {
          run(action)
          current = project(action)
          built = build(current)
          return built.items
        },
      }).then((action) => {
        setMenuOpenId((cur) => (cur === id ? null : cur))
        if (action !== null) run(action)
      })
    },
    [
      entries,
      pickers,
      pagesById,
      defaultIcons,
      hostLocked,
      applyPick,
      setTileZoom,
      setStyle,
      duplicateTile,
      confirmRemove,
      toggleLock,
      select,
      openRoute,
    ],
  )

  // A faulted tile retries when the Nexus or any entry changes, since either may be what it couldn't draw.
  const retry = useMemo(() => [tree, entries], [tree, entries])
  const renderTile = useCallback(
    (id: string) => {
      const entry = entries.get(id)
      if (!entry) return inertTile()
      return (
        <RenderBoundary resetKey={retry}>
          {renderSurface({
            entry,
            id,
            host,
            editing: editingId === id,
            beginEdit: setEditingId,
            connections: conn,
            openPage: openRoute,
            suppressFlush: isTileRemoving,
            pagesById,
            mutateEntry,
          })}
        </RenderBoundary>
      )
    },
    [entries, editingId, conn, openRoute, pagesById, host, mutateEntry, retry],
  )

  const onBackdrop = useCallback(
    (target: BackdropTarget) => {
      void dialer()
        .ask('tiles:createMarkdown', host)
        .then((r) => {
          if (!reportRefusal(r)) return
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

  return (
    <div ref={rootRef} className={cx('tile-host', hostLocked && 'is-host-locked')}>
      <TileGrid
        layout={layout}
        onLayoutChange={setLayout}
        renderTile={renderTile}
        tileClassName={tileClassName}
        editingId={editingId}
        menuOpenId={menuOpenId}
        tileStyle={tileStyle}
        onBusyChange={setBusy}
        locked={hostLocked}
        isTileLocked={(id) => entries.get(id)?.locked ?? false}
        onHandleMenu={onHandleMenu}
        onBackdrop={onBackdrop}
      />
    </div>
  )
}
