import { isPlainObject } from '../Contract/validators'
import { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  knownTile,
  tileIdOf,
  type TileEntry,
  type TileHostRef,
  TILE_KINDS,
  type TilePick,
} from './tiles'
import type { ConnPage } from '../Connections/pageIndex'
import { pagesByIdOf } from '../Nexus/treeIndex'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import { useConnections } from '../Session/pageConnections'
import { insertBand, removeLeaf } from './Layout/ops'
import {
  emptyLayout,
  findTile,
  getTile,
  type InsertTarget,
  NEW_TILE_H,
  type TileLayout,
} from './Layout/model'
import { type Inserting, TileGrid } from './TileGrid'
import { useDismissal } from '@pommora/uix/Interactions/dismissalStack'
import { entityIcon } from '../Assets/entityIconPolicy'
import { ZOOM } from '../Settings/personalization'
import { useSession } from '../Session/store'
import { personalizationOf } from '../Session/configSlice'
import { popMenu } from '../Actions/menuActions'
import { askRemoveTile } from '../Interface/Confirm/confirmations'
import { notifyUndoable, reportRefusal } from '../Interface/Notifications/notifications'
import { ZOOM_STEPS } from './tileZoom'
import { inertTile, type MutateEntry, TileBody, tileSourceInfo } from './tileKinds'
import { insertMenuItems, menuPatch, pickOf, pickTreesOf, tileMenuItems } from './tileHandleMenu'
import {
  landTileWrite,
  markTileRemoving,
  patchTileEntry,
  readTileDoc,
  seatTileWrite,
  unmarkTileRemoving,
} from './tileDocStore'
import { dropPageDetail, knownBody } from '../Session/pageDetailCache'
import { useTileDoc } from './useTileDoc'
import { dialer } from '../Platform/dialer'
import { isUlidShaped } from '../Nexus/identityMark'
import { cx } from '@pommora/uix/Utilities/cx'
import { RenderBoundary } from '@pommora/uix/Elements/RenderBoundary'

const NO_PAGES: ReadonlyMap<string, ConnPage> = new Map()

const ZOOM_STYLES = new Map<number, CSSProperties>(
  ZOOM_STEPS.filter((f) => f !== ZOOM.default).map((f) => [
    f,
    { '--tile-zoom': f } as CSSProperties,
  ]),
)

// A write replaces only the entries it changed, so an untouched entry keeps its parse, and every memo keyed on it holds.
const parsedTiles = new WeakMap<object, TileEntry | null>()
const parsedTile = (raw: unknown): TileEntry | null => {
  if (!isPlainObject(raw)) return knownTile(raw)
  if (!parsedTiles.has(raw)) parsedTiles.set(raw, knownTile(raw))
  return parsedTiles.get(raw) ?? null
}

export function TileHost({
  host: given,
  connections,
}: {
  host: TileHostRef
  connections?: ConnectionsApi
}): React.JSX.Element | null {
  // Every mount keys this component by its host, so the first object stands for its life and a mount may pass a fresh literal.
  const [host] = useState(given)
  const {
    layout,
    tiles,
    ready,
    locked: hostLocked,
    setLayout,
    commitLayout,
    setBusy,
  } = useTileDoc(host)
  const [editingId, setEditingId] = useState<string | null>(null)
  const tree = useSession((s) => s.tree)
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
      void landTileWrite(host, dialer().ask('tiles:convert', host, id, pick)).then(reportRefusal)
    },
    [host],
  )

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [inserting, setInserting] = useState<Inserting | null>(null)
  const mutateEntry = useCallback<MutateEntry>(
    (id, patchOf) => patchTileEntry(host, id, patchOf),
    [host],
  )
  const duplicateTile = useCallback(
    (id: string) => {
      void seatTileWrite(host, () => dialer().ask('tiles:duplicateTile', host, id)).then(
        reportRefusal,
      )
    },
    [host],
  )
  const confirmRemove = useCallback(
    (id: string) => {
      void askRemoveTile().then((ok) => {
        if (!ok) return
        // Order is load-bearing: mark the tile so a save of its body sends nothing, layout first (invisible orphan beats a dead box on a crash), then the entry + file.
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
        // A box whose id can't name a tile has nothing on the host, so leaving the board is its whole removal.
        if (!isUlidShaped(id)) {
          unmarkTileRemoving(id)
          return notifyUndoable('Deleted Tile')
        }
        void landTileWrite(host, dialer().ask('tiles:removeTile', host, id)).then((r) => {
          if (!reportRefusal(r)) return putBack()
          unmarkTileRemoving(id)
          const { removed } = r.value
          const kind = knownTile(removed.entry)?.type
          const label = `Deleted ${kind ? TILE_KINDS[kind].label : 'Tile'}`
          // A box with no entry behind it has nothing to restore, so its removal is final.
          if (tileIdOf(removed.entry) === null) return notifyUndoable(label)
          const body = knownBody(id) ?? removed.body
          dropPageDetail(id)
          notifyUndoable(label, async () => {
            const back = await landTileWrite(
              host,
              dialer().ask('tiles:restoreTile', host, {
                ...removed,
                ...(body === undefined ? {} : { body }),
                at: at(),
              }),
            )
            if (reportRefusal(back)) putBack()
          })
        })
      })
    },
    [commitLayout, host],
  )

  const tileClassName = useCallback(
    (id: string) => {
      const entry = entries.get(id)
      return cx(entry?.style === 'borderless' && 'is-borderless', entry?.locked && 'is-locked')
    },
    [entries],
  )

  const tileStyle = useCallback(
    (id: string) => ZOOM_STYLES.get(entries.get(id)?.zoom ?? ZOOM.default),
    [entries],
  )

  const onHandleMenu = useCallback(
    (id: string, e: React.MouseEvent) => {
      const entry = entries.get(id)
      const s = useSession.getState()
      const { tree } = s
      if (!tree) return
      const { defaultIcons } = personalizationOf(s)
      const page = entry && tileSourceInfo(entry, pagesById)
      const pickTree = pickTreesOf(tree, defaultIcons)
      const build = (on: TileEntry | undefined): ReturnType<typeof tileMenuItems> =>
        tileMenuItems({
          entry: on,
          pickTree,
          pageInfo: page && {
            title: page.title,
            icon: entityIcon('page', page.icon, defaultIcons),
          },
          boardLocked: readTileDoc(host).locked,
        })
      const latest = (): TileEntry | undefined =>
        parsedTile(readTileDoc(host).tiles.find((b) => tileIdOf(b) === id)) ?? entry
      let built = build(entry)
      const run = (action: string): void => {
        // A board locked since the menu opened answers only the row a locked board still offers.
        if (action !== 'tile:open' && readTileDoc(host).locked) return
        const chosen = pickOf(action, built.picks)
        const cur = latest()
        const patch = cur && menuPatch(action, cur)
        if (chosen) applyPick(id, chosen)
        else if (patch) mutateEntry(id, () => patch)
        else if (action === 'tile:duplicate') duplicateTile(id)
        else if (action === 'tile:delete') confirmRemove(id)
        else if (action === 'tile:open' && page) {
          if (openRoute) openRoute(page)
          else select({ kind: 'page', id: page.id, path: page.path })
        }
      }
      setMenuOpenId(id)
      void popMenu(built.items, e.currentTarget as HTMLElement, {
        stay: (action) => {
          run(action)
          built = build(latest())
          return built.items
        },
      }).then((action) => {
        setMenuOpenId((cur) => (cur === id ? null : cur))
        if (action !== null) run(action)
      })
    },
    [
      entries,
      pagesById,
      host,
      applyPick,
      mutateEntry,
      duplicateTile,
      confirmRemove,
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
          <TileBody
            entry={entry}
            host={host}
            editing={editingId === id}
            beginEdit={setEditingId}
            connections={conn}
            openPage={openRoute}
            page={tileSourceInfo(entry, pagesById)}
            mutateEntry={mutateEntry}
          />
        </RenderBoundary>
      )
    },
    [entries, editingId, conn, openRoute, pagesById, host, mutateEntry, retry],
  )

  const onInsert = useCallback(
    (target: InsertTarget, e: React.MouseEvent) => {
      const s = useSession.getState()
      if (!s.tree) return
      const { defaultIcons } = personalizationOf(s)
      const built = insertMenuItems(
        pickTreesOf(s.tree, defaultIcons),
        entityIcon('page', undefined, defaultIcons),
      )
      setInserting({ target, phase: 'menu' })
      void popMenu(built.items, e.currentTarget as HTMLElement, {
        // A keyboard press carries no point, so its menu hangs from the control it pressed.
        at: e.detail > 0 ? { x: e.clientX, y: e.clientY } : undefined,
      }).then((action) => {
        if (action === null || readTileDoc(host).locked) return setInserting(null)
        const pick = pickOf(action, built.picks)
        setInserting({ target, phase: 'flight' })
        void seatTileWrite(host, () => dialer().ask('tiles:create', host, target, pick)).then(
          (r) => {
            // Flushed, so the ghost leaves before the next paint, the paint its landed tile first draws in.
            flushSync(() => {
              setInserting(null)
              if (reportRefusal(r) && !pick) setEditingId(r.value.id)
            })
          },
        )
      })
    },
    [host],
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
        inserting={inserting}
        tileStyle={tileStyle}
        onBusyChange={setBusy}
        locked={hostLocked}
        isTileLocked={(id) => entries.get(id)?.locked ?? false}
        onHandleMenu={onHandleMenu}
        onInsert={onInsert}
      />
    </div>
  )
}
