import { Fragment, memo, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { PageTarget, SpaceTarget, WindowTarget } from '../../Navigation/navRef'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { cx } from '@pommora/uix/Utilities/cx'
import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
import { WindowActions } from '@pommora/uix/Windows/WindowActions'
import { WINDOW_BASE_PANEL, type WindowBasePanel } from '@pommora/uix/Windows/WindowBase'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { type BannerOwner, findSpace } from '../../Nexus/treeIndex'
import { PropertyPanel } from '../../Properties/PropertyPanel'
import { useConnections } from '../../Session/pageConnections'
import { useSession, useSetting } from '../../Session/store'
import { useExperimental } from '../../Settings/experimental'
import { PageTile } from '../../Tiles/Surfaces/PageTile'
import { TileHost } from '../../Tiles/TileHost'
import { subscribeTileDoc } from '../../Tiles/tileDocStore'
import { useTileDocReady } from '../../Tiles/useTileDoc'
import { EntityBanner } from '../Header/Banner'
import { CitationsToggle } from '../Subfield/CitationsToggle'
import { Subfield } from '../Subfield/Subfield'
import { useSubfieldPage } from '../Subfield/subfieldPage'
import { useWindowWarm, windowSeam } from './useWindowWarm'
import { windowBannerShown } from './windowTabBanner'

interface WindowTabBodySlots {
  body: React.ReactNode
  bodyRef: RefObject<HTMLDivElement | null>
  right: WindowBasePanel
  actions: React.ReactNode
  footer: React.ReactNode
  footerLead: React.ReactNode
  closeSidePane: () => void
  promote: () => void
}

function SpaceTabBody({
  host,
  owner,
  banner,
  connections,
}: {
  host: SpaceTarget
  owner: BannerOwner
  banner: boolean
  connections: ConnectionsApi | undefined
}): React.JSX.Element {
  return (
    <>
      <EntityBanner owner={banner ? owner : { ...owner, banner: undefined }} chrome="window" />
      <div className="tile-host-frame interface-inset">
        <TileHost key={host.id} host={host} connections={connections} />
      </div>
    </>
  )
}

// Memoized so a parked page sits out the window's own re-renders.
const WindowPage = memo(function WindowPage({
  id,
  path,
  shown,
  onBody,
  arrive,
  onArrived,
  connections,
  chrome,
  bodyRef,
}: {
  id: string
  path: string
  shown: boolean
  onBody?: (body: string) => void
  arrive?: string
  onArrived: () => void
  connections: ConnectionsApi | undefined
  chrome: 'window' | 'none'
  bodyRef: RefObject<HTMLDivElement | null>
}): React.JSX.Element {
  const [editingPath, setEditingPath] = useState<string | null>(null)
  if (editingPath !== null && !shown) setEditingPath(null)
  return (
    <>
      <div
        className={cx('window-body', 'scroll-fade', 'page-tile-grows', !shown && 'is-parked')}
        inert={!shown}
        ref={shown ? bodyRef : undefined}
      >
        <PageTile
          key={path}
          path={path}
          editing={editingPath === path}
          onBeginEdit={() => setEditingPath(path)}
          connections={connections}
          onBody={onBody}
          warm={windowSeam(id, path)}
          chrome={chrome}
          arrive={arrive}
          onArrived={onArrived}
        />
      </div>
      {shown && <Scrollbar page />}
    </>
  )
})

export function useWindowTabBody(target: WindowTarget | null): WindowTabBodySlots {
  const tree = useSession((s) => s.tree)
  const pendingTravel = useSession((s) => s.pendingTravel)
  const clearPendingTravel = useSession((s) => s.clearPendingTravel)
  const experimental = useExperimental()
  const pageBanner = useSession((s) => windowBannerShown(s.personalization, 'page'))
  const spaceBanner = useSession((s) => windowBannerShown(s.personalization, 'space'))
  const tabCache = useSetting('tabCache')

  const pageTarget = target?.kind === 'page' ? target : null
  const pagePath = pageTarget?.path
  const spaceTarget = target?.kind === 'space' ? target : null
  const spaceOwner = spaceTarget && findSpace(tree, spaceTarget.id)

  const [sidePaneOpen, setSidePaneOpen] = useState(false)
  const paneOpen = sidePaneOpen && pageTarget !== null
  const closeSidePane = (): void => setSidePaneOpen(false)

  // Held through the window's exit, so a closing window still draws the page it closes on.
  const liveSlot = useSession((s) => s.windowSlot)
  const slot = useHeld(liveSlot, liveSlot !== null)
  const windowTabs = slot?.tabs
  const activeTabId = slot?.activeTabId

  // Every Space tab the window holds keeps its document loaded, so switching back draws the board in the same frame rather than after a reload.
  const heldSpaces = (windowTabs ?? [])
    .flatMap((t) => (t.target.kind === 'space' ? [t.target.id] : []))
    .join(' ')
  useEffect(() => {
    const held = heldSpaces
      .split(' ')
      .filter(Boolean)
      .map((id) => subscribeTileDoc({ kind: 'space', id }, () => {}))
    return () => {
      for (const off of held) off()
    }
  }, [heldSpaces])

  // The shown page tab and the most recent ones up to the Active Tab Cache, each mounted once and parked off screen while another shows.
  const recent = useRef<string[]>([])
  const pageTabs = useMemo(() => {
    const pages = new Map<string, PageTarget>()
    for (const t of windowTabs ?? []) if (t.target.kind === 'page') pages.set(t.id, t.target)
    const shown = activeTabId !== undefined && pages.has(activeTabId) ? [activeTabId] : []
    recent.current = [
      ...shown,
      ...recent.current.filter((id) => id !== activeTabId && pages.has(id)),
    ].slice(0, shown.length + tabCache)
    // Fixed order, never most-recent-first: reordering keyed children moves their DOM.
    return [...recent.current].sort().map((id) => ({ id, page: pages.get(id)! }))
  }, [windowTabs, activeTabId, tabCache])

  // It closes the TAB, not the window; the window dies by itself when that was its last, and only then does the engulf play.
  const promoteWindowTab = useSession((s) => s.promoteWindowTab)
  const promote = (): void => {
    if (activeTabId) promoteWindowTab(activeTabId)
  }

  const bodyRef = useRef<HTMLDivElement>(null)
  // A Space tab's scroll restore waits for its board's first read; a Page tab has no board to wait on.
  const boardReady = useTileDocReady(spaceTarget)
  useWindowWarm(bodyRef, boardReady)
  const connections = useConnections(tree, 'window')
  const { page, onBody } = useSubfieldPage(pageTarget)

  const arrive =
    pendingTravel?.route === 'window' && pendingTravel.path === pagePath
      ? pendingTravel.heading
      : undefined

  const body = (
    <>
      {pageTabs.map(({ id, page: tab }) => {
        const shown = pageTarget !== null && id === activeTabId
        return (
          <WindowPage
            key={id}
            id={id}
            path={tab.path}
            shown={shown}
            onBody={shown ? onBody : undefined}
            arrive={shown ? arrive : undefined}
            onArrived={clearPendingTravel}
            connections={connections}
            chrome={pageBanner ? 'window' : 'none'}
            bodyRef={bodyRef}
          />
        )
      })}
      {spaceTarget && spaceOwner && (
        <Fragment key={spaceTarget.id}>
          <div className="window-body scroll-fade" ref={bodyRef}>
            <SpaceTabBody
              host={spaceTarget}
              owner={spaceOwner}
              banner={spaceBanner}
              connections={connections}
            />
          </div>
          <Scrollbar />
        </Fragment>
      )}
    </>
  )

  return {
    body,
    bodyRef,
    right: {
      windowId: 'window-side-pane',
      bounds: WINDOW_BASE_PANEL,
      mode: 'overlay',
      open: paneOpen,
      className: 'window-side-pane',
      children: (
        <div className="window-pane-scroll">
          {paneOpen && pageTarget && (
            <PropertyPanel
              subject={{ kind: 'page', id: pageTarget.id, path: pageTarget.path }}
              host="side-pane"
            />
          )}
        </div>
      ),
    },
    actions: (
      <WindowActions
        showSettings={experimental}
        sidePaneOpen={paneOpen}
        {...(pageTarget ? { onToggleSidePane: () => setSidePaneOpen((v) => !v) } : {})}
      />
    ),
    footer: target && (
      <Subfield page={page} selection={target.kind === 'space' ? target : undefined} inert />
    ),
    footerLead: <CitationsToggle page={page} />,
    closeSidePane,
    promote,
  }
}
