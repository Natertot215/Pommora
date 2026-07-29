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
import { FEEL_PRESETS } from '@renderer/design-system/interactions/feel'
import { buildPageIndex, flattenPages, type ConnectionsApi } from '@renderer/MarkdownPM/connections'
import { showConnectionMenu } from '@renderer/Embeds/connectionMenu'
import { useConnectionHover } from '@renderer/Embeds/ConnectionHoverCard'
import { attachBelow, insertBand, removeTile as removeLeaf } from '@renderer/SurfacePM/core/ops'
import { getTile } from '@renderer/SurfacePM/core/model'
import { SurfaceView, type BackdropTarget } from '@renderer/SurfacePM/SurfaceView'
import { defaultEntityIcon, iconNameOr } from '@renderer/design-system/symbols'
import type { EntityIconKind } from '@shared/types'
import { useSession } from '@renderer/store'
import { findCollection, findCollectionForSet, findSet } from '@renderer/Detail/Scope'
import { mintDefaultView } from '@shared/views'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import { zoomStep } from './blockZoom'
import { MarkdownBlock } from './MarkdownBlock'
import { BlockHandleMenu } from './BlockHandleMenu'
import { ViewEmbedBlock } from './ViewEmbedBlock'
import { PageEmbedBlock } from './PageEmbedBlock'
import { useBlockDoc } from './useBlockDoc'
import './blocks.css'

function pagePickerItems(
  tree: NexusTree,
  defaultIcons?: Partial<Record<EntityIconKind, string>>,
): PagePickerItem[] {
  const pageItem = (p: { id: string; title: string; icon?: string }): PagePickerItem => ({
    label: p.title,
    icon: iconNameOr(p.icon, defaultEntityIcon('page', defaultIcons)),
    pick: p.id,
  })
  const setItem = (s: SetNode): PagePickerItem => ({
    label: s.title,
    icon: iconNameOr(s.icon, defaultEntityIcon('set', defaultIcons)),
    submenu: [...(s.sets ?? []).map(setItem), ...s.pages.map(pageItem)],
  })
  const collectionItem = (c: CollectionNode): PagePickerItem => ({
    label: c.title,
    icon: iconNameOr(c.icon, defaultEntityIcon('collection', defaultIcons)),
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
    icon: iconNameOr(c.icon, defaultEntityIcon('collection', defaultIcons)),
    // The collection's own views sit ABOVE its Sets (Nathan's call); + Custom stays the pinned footer.
    submenu: [
      ...containerViews(c),
      ...c.sets.map((s) => ({
        label: s.title,
        icon: iconNameOr(s.icon, defaultEntityIcon('set', defaultIcons)),
        submenu: containerViews(s),
      })),
    ],
  })
  return tree.collections.map(collectionItem)
}

// A leaf whose id has no entry — or an entry this build doesn't know — renders inert and keeps
// its space, never crashes the host.

export function BlockSurface({ host }: { host: BlockHostRef }): React.JSX.Element | null {
  const { layout, blocks, ready, setLayout, commitLayout, refreshEntries, saveBlocks } =
    useBlockDoc(host)
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

  // One tree flatten per push, shared by the connections index and every page-embed lookup —
  // never per-embed walks.
  const flatPages = useMemo(() => (tree ? flattenPages(tree) : []), [tree])
  const pagesById = useMemo(() => new Map(flatPages.map((p) => [p.id, p])), [flatPages])

  // Built once per tree push, never per menu-open.
  const containersByPath = useMemo(() => {
    const map = new Map<string, { title: string; icon?: string; kind: 'collection' | 'set' }>()
    const addSet = (sNode: SetNode): void => {
      map.set(sNode.path, { title: sNode.title, icon: sNode.icon, kind: 'set' })
      for (const sub of sNode.sets ?? []) addSet(sub)
    }
    const addCol = (c: CollectionNode): void => {
      map.set(c.path, { title: c.title, icon: c.icon, kind: 'collection' })
      for (const s of c.sets) addSet(s)
    }
    for (const c of [...(tree?.collections ?? [])]) addCol(c)
    return map
  }, [tree])

  const openPreview = useSession((s) => s.openPreview)
  const { hover, card: hoverCard } = useConnectionHover()
  // Reads the LIVE personalization slice (setPersonalization updates it before the tree echoes).
  const openInPreview = useSession((s) => s.personalization.connectionsOpenInPreview ?? false)
  const connections = useMemo<ConnectionsApi | undefined>(() => {
    if (!tree) return undefined
    const idx = buildPageIndex(flatPages)
    return {
      ...idx,
      open: (page) =>
        openInPreview
          ? openPreview({ id: page.id, path: page.path })
          : void select({ kind: 'page', id: page.id, path: page.path }),
      bypass: (page) =>
        void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true }),
      hover,
      menu: showConnectionMenu,
    }
  }, [tree, flatPages, select, openPreview, openInPreview, hover])

  useEffect(() => {
    if (!editingId) return
    // Capture phase — a gesture handler's stopPropagation (SurfacePM's handles/edges) must not
    // swallow the click-out. Matches is-editing-tile (any kind) rather than one content class, so
    // a click anywhere inside the active tile keeps it active.
    const onDown = (e: PointerEvent): void => {
      if (!(e.target as Element | null)?.closest?.('.spm-tile.is-editing-tile')) setEditingId(null)
    }
    const onKey = (e: KeyboardEvent): void => {
      // CM6 consumes Esc first when its autocomplete is open (preventDefault) —
      // that press closes the popup only, the next one exits the editor.
      if (e.key === 'Escape' && !e.defaultPrevented) setEditingId(null)
    }
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [editingId])

  // THE removal flow — the handle menu's Remove (main-confirmed) is its trigger.
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
  const onHandleMenu = useCallback((id: string, e: React.MouseEvent) => {
    setHandleMenu({ id, el: e.currentTarget as HTMLElement })
  }, [])
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
        commitLayout((cur) => attachBelow(cur, id, r.id, getTile(cur, id)?.h ?? NEW_TILE_H))
      })
    },
    [refreshEntries, commitLayout, host],
  )
  const confirmRemove = useCallback(
    (id: string) => {
      void window.nexus.blocks.confirmRemove().then((ok) => {
        if (ok) removeBlock(id)
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

  // Hands the embed the RAW entry — raw spreads inside the transforms so foreign keys on the
  // entry AND its elements survive.
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
          <MarkdownBlock
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
        if (!page) return <div className="blk-inert" /> // dead reference — inert, space holds
        return (
          <PageEmbedBlock
            page={page}
            entryId={entry.id}
            editing={editingId === id}
            onBeginEdit={setEditingId}
            connections={connections}
            locked={entry.locked ?? false}
          />
        )
      }
      if (entry?.type === 'view')
        return (
          <ViewEmbedBlock
            entry={entry}
            mutateEntry={mutateViewEntry}
            onActivate={() => setEditingId(id)}
          />
        )
      return <div className="blk-inert" /> // no/foreign/unknown entry — space holds, nothing breaks
    },
    [entries, editingId, connections, suppressFlush, pagesById, host, mutateViewEntry],
  )

  // Menu-less for now. Updater form — a gesture committing during the IPC await must not be
  // overwritten by a render-captured layout.
  const onBackdrop = useCallback(
    (target: BackdropTarget) => {
      void window.nexus.blocks.createMarkdown(host).then((r) => {
        if (!r.ok) return
        refreshEntries()
        commitLayout((cur) =>
          target.kind === 'wedge'
            ? attachBelow(cur, target.above, r.id, target.fillPx)
            : insertBand(cur, cur.bands.length, r.id, NEW_TILE_H),
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
        icon: iconNameOr(menuPage.icon, defaultEntityIcon('page', defaultIcons)),
      }
    : undefined
  const menuLoc = menuPage
    ? containersByPath.get(menuPage.path.split('/').slice(0, -1).join('/'))
    : undefined
  const menuLocInfo = menuLoc
    ? {
        title: menuLoc.title,
        icon: iconNameOr(menuLoc.icon, defaultEntityIcon(menuLoc.kind, defaultIcons)),
      }
    : undefined
  return (
    <div
      className={`blk-surface${editingId ? ' has-live-editor' : ''}${hostLocked ? ' is-host-locked' : ''}`}
    >
      {hoverCard}
      <SurfaceView
        layout={layout}
        onLayoutChange={setLayout}
        renderTile={renderTile}
        feel={FEEL_PRESETS.Glide}
        tileClassName={tileClassName}
        isTileStatic={(id) => hostLocked || (entries.get(id)?.locked ?? false)}
        onHandleMenu={onHandleMenu}
        onBackdrop={onBackdrop}
      />
      {handleMenu && entries.get(handleMenu.id) && tree && (
        <BlockHandleMenu
          entry={entries.get(handleMenu.id) as BlockEntry}
          anchor={handleMenu.el}
          pageItems={pagePickerItems(tree, defaultIcons)}
          viewItems={viewPickerItems(tree, defaultIcons)}
          pageInfo={menuPageInfo}
          location={menuLocInfo}
          onClose={() => setHandleMenu(null)}
          onPickPage={(pageId) => applyPagePick(handleMenu.id, pageId)}
          onPickView={(pick) => applyViewPick(handleMenu.id, pick)}
          onStyle={(style) => setStyle(handleMenu.id, style)}
          onDuplicate={() => duplicateBlock(handleMenu.id)}
          onRemove={() => confirmRemove(handleMenu.id)}
          onToggleLock={() => toggleLock(handleMenu.id)}
          onOpenPage={() =>
            menuPage && select({ kind: 'page', id: menuPage.id, path: menuPage.path })
          }
          zoom={menuEntry?.zoom}
          onSetZoom={(factor) => setBlockZoom(handleMenu.id, factor)}
          containerLocked={hostLocked}
        />
      )}
    </div>
  )
}
