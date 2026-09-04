import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { duration, easing, ms } from '@renderer/Animation'
import { text } from '@renderer/DesignSystem/Tokens'
import { WINDOW_BASE_PANEL, WindowBase } from './window-base'
import { SearchField } from '@renderer/DesignSystem/Fields'
import type { NavRef } from '@shared/types'
import { useExitPresence } from '@renderer/Animation/useExitPresence'
import { PageTile } from '../SurfacePM/PageTile'
import type { ConnectionsApi } from '../MarkdownPM/Connections'
import { showConnectionMenu } from '../Actions/connectionMenu'
import { hoverConnection, hoverWebsite } from '../Links/ConnectionPane'
import { moveByKey } from '../Navigation/navRecents'
import { pageIndexOf, resolveIndexOf } from '../treeIndex'
import { windowTargetOf, useSession } from '../store'
import { splitSearch, useNavData } from '../Navigation/useNavData'
import { NavList } from '../Navigation/NavList'
import { WindowActions } from './WindowActions'
import { PagePanel } from './PageWindow'
import { consumeWindowMorph } from './windowMorph'
import { WindowTabStrip } from './WindowTabStrip'
import { useWindowWarm } from './useWindowWarm'
import { NavGallery } from '../Navigation/NavGallery'
import './nav-window.css'

const RAIL = { min: 120, def: 200, max: 320 }

// Matched against the press target itself, so child content — row internals, card bodies, the
// search input — never arms a window move.
const DRAG_SURFACES =
  '.navwindow-content, .navwindow-rail, .navwindow-rail-list, .navwindow-main, .navwindow-main-scroll, .navwindow-search, .navwindow-page, .navwindow-tabs, .window-tabwrap, .tab-scroll, .tab-strip, .nav-list, .nav-gallery, .nav-gallery .card-grid'

export function NavWindow(): React.JSX.Element | null {
  const navOpen = useSession((s) => s.navOpen)
  const { mounted, closing } = useExitPresence(navOpen)
  if (!mounted) return null
  return <NavWindowBody closing={closing} />
}

function NavWindowBody({ closing }: { closing: boolean }): React.JSX.Element {
  const { resolvedRecents, resolvedFavorites, resolvedPins, search, go } = useNavData()
  const closeNav = useSession((s) => s.closeNav)
  const tree = useSession((s) => s.tree)

  // Placement freezes at open — new recents activity must not reshuffle the list under the cursor.
  // Re-snapshots on reopen; still filtered against live pin/membership so a pin or removal drops out.
  const [frozenRecents, setFrozenRecents] = useState(resolvedRecents)
  const shownRecents = useMemo(() => {
    const pinned = new Set(resolvedPins.map((p) => p.key))
    const live = new Set(resolvedRecents.map((r) => r.key))
    return frozenRecents.filter((r) => live.has(r.key) && !pinned.has(r.key))
  }, [frozenRecents, resolvedPins, resolvedRecents])
  // A drag is the one thing that bypasses the freeze, and commits the SHOWN order wholesale — the
  // store's live order can lag the frozen view, so splicing against it would land elsewhere than the drop showed.
  const setRecentsOrder = useSession((s) => s.setRecentsOrder)
  const reorderShownRecent = (activeKey: string, overKey: string): void => {
    const next = moveByKey(frozenRecents, (r) => r.key, activeKey, overKey)
    if (!next) return
    setFrozenRecents(next)
    setRecentsOrder(next.map((r) => r.key))
  }

  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // An open sourced from a live Page Window FLIPs from its stashed rect; the css intro is
  // canceled pre-paint so only one motion plays.
  const rootRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const from = consumeWindowMorph()
    const el = rootRef.current
    if (!from || !el) return
    for (const a of el.getAnimations()) a.cancel()
    const to = el.getBoundingClientRect()
    const dx = from.left + from.width / 2 - (to.left + to.width / 2)
    const dy = from.top + from.height / 2 - (to.top + to.height / 2)
    el.animate(
      [
        {
          transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`,
        },
        { transform: 'translate(0px, 0px) scale(1)' },
      ],
      { duration: ms(duration.base), easing: easing.baseEase },
    )
  }, [])
  // The inspector is PAGE TABS ONLY (deliberate) — it dies on the map return.
  const [inspectorOpen, setInspectorOpen] = useState(false)

  const results = useMemo(() => (query.trim() ? splitSearch(search(query)) : null), [query, search])
  const closeOnSelect = useSession((s) => s.personalization.navCloseOnSelect !== false)
  const onSelected = closeOnSelect ? closeNav : undefined
  const goClose = (target: NavRef): void => go(target, onSelected)
  const goNewTab = (target: NavRef): void => go(target, onSelected, { newTab: true })
  const viewMode = useSession((s) => s.navWindowMode)
  const setNavWindowMode = useSession((s) => s.setNavWindowMode)
  const toggleViewMode = (): void => setNavWindowMode(viewMode === 'list' ? 'gallery' : 'list')

  const pageWindow = useSession((s) => s.pageWindow)
  const pageTarget = useSession((s) => (s.pageWindow?.flavor === 'nav' ? windowTargetOf(s) : null))
  // Also re-focuses on every map-tab return — the input remounts when a page tab swaps the body away.
  useEffect(() => {
    if (!pageTarget) {
      searchRef.current?.focus()
      setInspectorOpen(false)
    }
  }, [pageTarget])

  const openWindowTab = useSession((s) => s.openWindowTab)
  const select = useSession((s) => s.select)
  const openNewTab = useSession((s) => s.openNewTab)
  const setNavViewMode = useSession((s) => s.setNavViewMode)

  const promote = (): void => {
    if (pageTarget) {
      closeNav()
      void select({ kind: 'page', id: pageTarget.id, path: pageTarget.path })
      return
    }
    setNavViewMode(viewMode)
    closeNav()
    openNewTab()
  }
  const hasTabs = pageWindow?.flavor === 'nav' && pageWindow.tabs.length > 1
  const resolveIndex = tree ? resolveIndexOf(tree) : null

  const [editing, setEditing] = useState(false)
  useEffect(() => setEditing(false), [pageTarget?.path])
  const pageScrollRef = useRef<HTMLDivElement>(null)
  const warmSeam = useWindowWarm(pageScrollRef, pageTarget?.path)
  const connections = useMemo<ConnectionsApi | undefined>(() => {
    if (!tree) return undefined
    const idx = pageIndexOf(tree)
    return {
      ...idx,
      open: (page) => openWindowTab({ id: page.id, path: page.path }),
      bypass: (page) =>
        void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true }),
      hover: hoverConnection,
      hoverSite: hoverWebsite,
      menu: showConnectionMenu,
    }
  }, [tree, openWindowTab, select])

  return (
    <WindowBase
      id="navwindow"
      rootRef={rootRef}
      closing={closing}
      onClose={closeNav}
      // The pane closes first — an Escape during the flavor-swap exit is the shell's own closing gate.
      onEscape={() => (inspectorOpen ? setInspectorOpen(false) : closeNav())}
      dragSurfaces={DRAG_SURFACES}
      className={cx('navwindow', pageTarget !== null && 'is-page-tab')}
      ariaLabel="Navigation"
      onScan={promote}
      actions={
        <WindowActions
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => setInspectorOpen((v) => !v)}
        />
      }
      left={{
        windowId: 'navwindow',
        bounds: RAIL,
        mode: 'inflow',
        open: pageTarget === null,
        className: 'navwindow-rail',
        children: (
          <>
            <div className="navwindow-rail-list over-scroll">
              <NavList items={resolvedFavorites} onSelect={goClose} onOpenNewTab={goNewTab} />
            </div>
            <Button
              size="button-inline"
              icon="chevrons-up-down"
              iconSize="control"
              label={viewMode === 'list' ? 'List' : 'Gallery'}
              className="navwindow-style-toggle"
              onClick={toggleViewMode}
            />
          </>
        ),
      }}
      right={{
        windowId: 'window-inspector',
        bounds: WINDOW_BASE_PANEL,
        mode: 'overlay',
        open: inspectorOpen && pageTarget !== null,
        className: 'navwindow-inspector',
        children: (
          <div className="window-pane-scroll">
            {inspectorOpen && pageTarget && <PagePanel target={pageTarget} />}
          </div>
        ),
      }}
    >
      <div className="navwindow-content">
        <div className={cx('navwindow-tabs', hasTabs && 'has-tabs')}>
          <WindowTabStrip index={resolveIndex} title={null} />
        </div>
        {pageTarget ? (
          <div
            className="window-body navwindow-page over-scroll page-tile-grows"
            ref={pageScrollRef}
          >
            <PageTile
              key={pageTarget.path}
              path={pageTarget.path}
              editing={editing}
              onBeginEdit={() => setEditing(true)}
              connections={connections}
              warm={warmSeam}
            />
          </div>
        ) : (
          <div className="navwindow-main">
            <div className="nav-search-row navwindow-search">
              <SearchField
                inputRef={searchRef}
                className={text.body.standard}
                value={query}
                onValueChange={setQuery}
              />
            </div>
            <div className="navwindow-main-scroll over-scroll">
              {/* `extras` has no card form, so Gallery is passed none at all — inert hits surface
                  in List only. */}
              {viewMode === 'gallery' ? (
                <NavGallery
                  pins={results ? [] : resolvedPins}
                  items={results ? results.items : shownRecents}
                  frozenLayout={!!results}
                  {...(results ? {} : { onReorderRecent: reorderShownRecent })}
                  onSelect={goClose}
                  onOpenNewTab={goNewTab}
                />
              ) : (
                <NavList
                  {...(results
                    ? { items: results.items, extras: results.extras }
                    : {
                        pins: resolvedPins,
                        items: shownRecents,
                        reorderable: true,
                        onReorderRecent: reorderShownRecent,
                      })}
                  onSelect={goClose}
                  onOpenNewTab={goNewTab}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </WindowBase>
  )
}
