import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { cx } from '@pommora/uix/Utilities/cx'
import { duration, easing, flipTransform, ms } from '@pommora/uix/Animations/motion'
import { WindowBase } from '@pommora/uix/Windows/WindowBase'
import type { NavRef } from '@pommora/core/Navigation/navRef'
import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { moveByKey } from '@pommora/uix/Utilities/moveItem'
import { resolveIndexOf } from '../../Nexus/treeIndex'
import { useFold, windowTargetOf, useSession, useSetting } from '../../Session/store'
import { useNavData } from '../../Navigation/useNavData'
import { NavBanner } from '../../Navigation/NavBanner'
import { useNavBase } from '../../Navigation/NavBase'
import { consumeWindowMorph } from './windowMorph'
import { WindowTabStrip } from './WindowTabStrip'
import { useWindowTabBody } from './WindowTabBody'
import { useWindowGeometry } from './useWindowGeometry'
import { useWindowTabSlide } from './useWindowTabSlide'
import { Subfield } from '../Subfield/Subfield'
import { footerLabel } from '@pommora/core/Actions/toggleLabels'
import './nav-window.css'

const RAIL = { min: 120, def: 200, max: 320 }

// Matched against the press target itself, so child content — row internals, card bodies, the search input — never arms a window move.
const DRAG_SURFACES =
  '.navwindow-content, .navwindow-main, .navwindow-main-scroll, .navwindow-search, .tab-scroll, .tab-strip, .nav-list, .nav-gallery, .nav-gallery .card-grid'

export function NavWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.windowSlot?.kind === 'nav')
  const { mounted, closing } = useExitPresence(open, 'fast')
  if (!mounted) return null
  return <NavWindowBody closing={closing} />
}

function NavWindowBody({ closing }: { closing: boolean }): React.JSX.Element {
  const { resolvedRecents, resolvedPins, search, go } = useNavData()
  const closeWindow = useSession((s) => s.closeWindow)
  const summon = useSession((s) => s.windowSummon)
  const geometry = useWindowGeometry('navwindow')
  const [footerOpen, setFooterOpen] = useFold('footer:navwindow')
  const tree = useSession((s) => s.tree)

  // Placement freezes at open — new recents activity must not reshuffle the list under the cursor.
  const [frozenRecents, setFrozenRecents] = useState(resolvedRecents)
  const shownRecents = useMemo(() => {
    const live = new Set(resolvedRecents.map((r) => r.key))
    return frozenRecents.filter((r) => live.has(r.key))
  }, [frozenRecents, resolvedRecents])
  // A drag commits the SHOWN order wholesale: the store's live order can lag the frozen view, so splicing against it would land elsewhere than the drop showed.
  const setRecentsOrder = useSession((s) => s.setRecentsOrder)
  const reorderShownRecent = (activeKey: string, overKey: string): void => {
    const next = moveByKey(frozenRecents, (r) => r.key, activeKey, overKey)
    if (!next) return
    setFrozenRecents(next)
    setRecentsOrder(next.map((r) => r.key))
  }

  const searchRef = useRef<HTMLInputElement>(null)

  // An open sourced from a live Page Window FLIPs from its stashed rect; the css intro is canceled pre-paint so only one motion plays.
  const rootRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const from = consumeWindowMorph()
    const el = rootRef.current
    if (!from || !el) return
    for (const a of el.getAnimations()) a.cancel()
    el.animate(
      [{ transform: flipTransform(el.getBoundingClientRect(), from) }, { transform: 'none' }],
      { duration: ms(duration.base), easing: easing.baseEase },
    )
  }, [])

  const closeOnSelect = useSetting('navCloseOnSelect')
  const onSelected = closeOnSelect ? () => closeWindow() : undefined
  const goClose = (target: NavRef): void => go(target, onSelected)
  const goNewTab = (target: NavRef): void => go(target, onSelected, { newTab: true })
  const gallery = useSession((s) => s.devicePrefs.navWindowGallery === true)
  const nav = useNavBase({
    gallery,
    search,
    pins: resolvedPins,
    recents: shownRecents,
    onReorderRecent: reorderShownRecent,
    onSelect: goClose,
    onOpenNewTab: goNewTab,
    inputRef: searchRef,
  })
  const setDevicePref = useSession((s) => s.setDevicePref)

  const target = useSession((s) => (s.windowSlot?.kind === 'nav' ? windowTargetOf(s) : null))
  const { body, right, actions, footer, footerLead, closeSidePane, promote } =
    useWindowTabBody(target)
  const sidePaneOpen = right.open === true
  const contentRef = useRef<HTMLDivElement>(null)
  useWindowTabSlide(contentRef, rootRef, sidePaneOpen)
  // Re-focuses on every map-tab return.
  useEffect(() => {
    if (!target) searchRef.current?.focus()
  }, [target])

  const bannered = useSetting('windowNavBanner')
  const searchRow = <div className="nav-search-row navwindow-search">{nav.search}</div>
  const resolveIndex = tree ? resolveIndexOf(tree) : null

  return (
    <WindowBase
      {...geometry}
      rootRef={rootRef}
      closing={closing}
      onClose={() => closeWindow()}
      raiseOn={summon}
      // The pane closes first — an Escape during the kind-swap exit is the shell's own closing gate.
      onEscape={() => (sidePaneOpen ? closeSidePane() : closeWindow())}
      dragSurfaces={DRAG_SURFACES}
      footer={{
        bar: footer ?? <Subfield page={null} count={nav.count} selection={{ kind: 'none' }} />,
        open: footerOpen,
        onOpenChange: setFooterOpen,
        label: footerLabel,
        lead: footerLead,
      }}
      className={cx('navwindow', target !== null && 'is-page-tab')}
      ariaLabel="Navigation"
      onScan={promote}
      title={<WindowTabStrip index={resolveIndex} title={null} />}
      actions={actions}
      left={{
        windowId: 'navwindow',
        bounds: RAIL,
        mode: 'overlay',
        open: target === null,
        children: (
          <Button
            size="button-inline"
            icon="chevrons-up-down"
            iconSize="control"
            label={gallery ? 'Gallery' : 'List'}
            className="navwindow-style-toggle"
            onClick={() => setDevicePref('navWindowGallery', !gallery)}
          />
        ),
      }}
      right={right}
    >
      <div className="navwindow-content" ref={contentRef}>
        {body}
        <div
          className={cx('navwindow-main', target !== null && 'is-parked')}
          inert={target !== null}
        >
          {bannered ? (
            <NavBanner search={nav.search} empty={() => searchRow} chrome="window" />
          ) : (
            searchRow
          )}
          <div className="navwindow-main-scroll over-scroll">{nav.body}</div>
        </div>
      </div>
    </WindowBase>
  )
}
