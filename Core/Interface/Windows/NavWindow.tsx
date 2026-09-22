import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { cx } from '@pommora/uix/Utilities/cx'
import { duration, easing, ms } from '@pommora/uix/Animations/motion'
import { text } from '@pommora/uix/Theme'
import { WindowBase } from '@pommora/uix/Windows/window-base'
import { SearchField } from '@pommora/uix/Fields/SearchField'
import type { NavRef } from '@pommora/core/Navigation/navRef'
import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { moveByKey } from '../../Navigation/navRecents'
import { resolveIndexOf } from '../../Nexus/treeIndex'
import { windowTargetOf, useSession } from '../../Session/store'
import { useNavData } from '../../Navigation/useNavData'
import { NavList } from '../../Navigation/NavList'
import { NavBanner } from '../../Navigation/NavBanner'
import { consumeWindowMorph } from './windowMorph'
import { WindowTabStrip } from './WindowTabStrip'
import { useWindowTabBody } from './WindowTabBody'
import { NavGallery } from '../../Navigation/NavGallery'
import { useWindowGeometry } from './useWindowGeometry'
import { Subfield } from '../Subfield/Subfield'
import { footerLabel } from '@pommora/core/Actions/toggleLabels'
import './nav-window.css'

const RAIL = { min: 120, def: 200, max: 320 }

// Matched against the press target itself, so child content — row internals, card bodies, the search input — never arms a window move.
const DRAG_SURFACES =
  '.navwindow-content, .navwindow-rail, .navwindow-rail-list, .navwindow-main, .navwindow-main-scroll, .navwindow-search, .tab-scroll, .tab-strip, .nav-list, .nav-gallery, .nav-gallery .card-grid'

export function NavWindow(): React.JSX.Element | null {
  const navOpen = useSession((s) => s.navOpen)
  const { mounted, closing } = useExitPresence(navOpen)
  if (!mounted) return null
  return <NavWindowBody closing={closing} />
}

function NavWindowBody({ closing }: { closing: boolean }): React.JSX.Element {
  const { resolvedRecents, resolvedFavorites, resolvedPins, search, go } = useNavData()
  const closeNav = useSession((s) => s.closeNav)
  const geometry = useWindowGeometry('navwindow')
  const tree = useSession((s) => s.tree)

  // Placement freezes at open — new recents activity must not reshuffle the list under the cursor.
  const [frozenRecents, setFrozenRecents] = useState(resolvedRecents)
  const shownRecents = useMemo(() => {
    const pinned = new Set(resolvedPins.map((p) => p.key))
    const live = new Set(resolvedRecents.map((r) => r.key))
    return frozenRecents.filter((r) => live.has(r.key) && !pinned.has(r.key))
  }, [frozenRecents, resolvedPins, resolvedRecents])
  // A drag commits the SHOWN order wholesale: the store's live order can lag the frozen view, so splicing against it would land elsewhere than the drop showed.
  const setRecentsOrder = useSession((s) => s.setRecentsOrder)
  const reorderShownRecent = (activeKey: string, overKey: string): void => {
    const next = moveByKey(frozenRecents, (r) => r.key, activeKey, overKey)
    if (!next) return
    setFrozenRecents(next)
    setRecentsOrder(next.map((r) => r.key))
  }

  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // An open sourced from a live Page Window FLIPs from its stashed rect; the css intro is canceled pre-paint so only one motion plays.
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

  const results = useMemo(() => (query.trim() ? search(query) : null), [query, search])
  const closeOnSelect = useSession((s) => s.personalization.navCloseOnSelect !== false)
  const onSelected = closeOnSelect ? closeNav : undefined
  const goClose = (target: NavRef): void => go(target, onSelected)
  const goNewTab = (target: NavRef): void => go(target, onSelected, { newTab: true })
  const viewMode = useSession((s) => s.navWindowMode)
  const setNavWindowMode = useSession((s) => s.setNavWindowMode)
  const toggleViewMode = (): void => setNavWindowMode(viewMode === 'list' ? 'gallery' : 'list')

  const target = useSession((s) => (s.pageWindow?.kind === 'nav' ? windowTargetOf(s) : null))
  const { body, right, actions, footer, footerLead, closeSidePane, promote } =
    useWindowTabBody(target)
  const sidePaneOpen = right.open === true
  // Also re-focuses on every map-tab return — the input remounts when a tab swaps the body away.
  useEffect(() => {
    if (!target) searchRef.current?.focus()
  }, [target])

  const openNewTab = useSession((s) => s.openNewTab)
  const setNavViewMode = useSession((s) => s.setNavViewMode)

  // The map tab has no entity to promote: the scan carries the list itself into a new app tab.
  const scan = (): void => {
    if (target) {
      promote()
      return
    }
    setNavViewMode(viewMode)
    closeNav()
    openNewTab()
  }
  const bannered = useSession((s) => s.personalization.windowNavBanner ?? false)
  const searchField = (
    <SearchField
      inputRef={searchRef}
      className={cx('nav-view-search', text.body.standard)}
      value={query}
      onValueChange={setQuery}
    />
  )
  const searchRow = <div className="nav-search-row navwindow-search">{searchField}</div>
  const resolveIndex = tree ? resolveIndexOf(tree) : null
  // Its own list, never the main pane's selection — the bar states what this window is showing.
  const shownCount = results ? results.length : resolvedPins.length + shownRecents.length

  return (
    <WindowBase
      {...geometry}
      rootRef={rootRef}
      closing={closing}
      onClose={closeNav}
      // The pane closes first — an Escape during the kind-swap exit is the shell's own closing gate.
      onEscape={() => (sidePaneOpen ? closeSidePane() : closeNav())}
      dragSurfaces={DRAG_SURFACES}
      footer={footer ?? <Subfield page={null} count={shownCount} selection={{ kind: 'none' }} />}
      footerLabel={footerLabel}
      footerLead={footerLead}
      className={cx('navwindow', target !== null && 'is-page-tab')}
      ariaLabel="Navigation"
      onScan={scan}
      title={<WindowTabStrip index={resolveIndex} title={null} />}
      actions={actions}
      left={{
        windowId: 'navwindow',
        bounds: RAIL,
        mode: 'overlay',
        open: target === null,
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
      right={right}
    >
      <div className="navwindow-content">
        {body ?? (
          <div className="navwindow-main">
            {bannered ? (
              <NavBanner search={searchField} empty={() => searchRow} windowed />
            ) : (
              searchRow
            )}
            <div className="navwindow-main-scroll over-scroll">
              {viewMode === 'gallery' ? (
                <NavGallery
                  pins={results ? [] : resolvedPins}
                  items={results ? results : shownRecents}
                  frozenLayout={!!results}
                  {...(results ? {} : { onReorderRecent: reorderShownRecent })}
                  onSelect={goClose}
                  onOpenNewTab={goNewTab}
                />
              ) : (
                <NavList
                  {...(results
                    ? { items: results }
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
