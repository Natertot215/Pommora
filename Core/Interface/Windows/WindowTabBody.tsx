import { useEffect, useRef, useState, type RefObject } from 'react'
import type { SpaceTarget, WindowTarget } from '@pommora/core/Navigation/navRef'
import { cx } from '@pommora/uix/Utilities/cx'
import { WindowActions } from '@pommora/uix/Windows/WindowActions'
import { WINDOW_BASE_PANEL, type WindowBasePanel } from '@pommora/uix/Windows/window-base'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { type BannerOwner, findSpace } from '../../Nexus/treeIndex'
import { PropertyPanel } from '../../Properties/PropertyPanel'
import { useWindowTabConnections } from '../../Session/pageConnections'
import { useSession } from '../../Session/store'
import { useExperimental } from '../../Settings/experimental'
import { PageTile } from '../../Tiles/Surfaces/PageTile'
import { TileHost } from '../../Tiles/TileHost'
import { subscribeTileDoc } from '../../Tiles/tileDocStore'
import { useTileDocReady } from '../../Tiles/useTileDoc'
import { EntityBanner } from '../Header/Banner'
import { CitationsToggle } from '../Subfield/CitationsToggle'
import { Subfield } from '../Subfield/Subfield'
import { useSubfieldPage } from '../Subfield/subfieldPage'
import { useWindowWarm } from './useWindowWarm'
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
      <div className="tile-host-frame">
        <TileHost key={host.id} host={host} connections={connections} />
      </div>
    </>
  )
}

export function useWindowTabBody(target: WindowTarget | null): WindowTabBodySlots {
  const tree = useSession((s) => s.tree)
  const pendingTravel = useSession((s) => s.pendingTravel)
  const clearPendingTravel = useSession((s) => s.clearPendingTravel)
  const experimental = useExperimental()
  const pageBanner = useSession((s) => windowBannerShown(s.personalization, 'page'))
  const spaceBanner = useSession((s) => windowBannerShown(s.personalization, 'space'))

  const pageTarget = target?.kind === 'page' ? target : null
  const pagePath = pageTarget?.path
  const spaceTarget = target?.kind === 'space' ? target : null
  const spaceOwner = spaceTarget && findSpace(tree, spaceTarget.id)

  const [editing, setEditing] = useState(false)
  useEffect(() => setEditing(false), [pagePath])

  const [sidePaneOpen, setSidePaneOpen] = useState(false)
  const paneOpen = sidePaneOpen && pageTarget !== null
  const closeSidePane = (): void => setSidePaneOpen(false)

  // Every Space tab the window holds keeps its document loaded, so switching back draws the board in the same frame rather than after a reload.
  const heldSpaces = useSession((s) =>
    (s.pageWindow?.tabs ?? [])
      .flatMap((t) => (t.target.kind === 'space' ? [t.target.id] : []))
      .join(' '),
  )
  useEffect(() => {
    const held = heldSpaces
      .split(' ')
      .filter(Boolean)
      .map((id) => subscribeTileDoc({ kind: 'space', id }, () => {}))
    return () => {
      for (const off of held) off()
    }
  }, [heldSpaces])

  // It closes the TAB, not the window; the window dies by itself when that was its last, and only then does the engulf play.
  const promoteWindowTab = useSession((s) => s.promoteWindowTab)
  const activeTabId = useSession((s) => s.pageWindow?.activeTabId)
  const promote = (): void => {
    if (target && activeTabId) promoteWindowTab(activeTabId)
  }

  const bodyRef = useRef<HTMLDivElement>(null)
  // A Space tab's scroll restore waits for its board's first read; a Page tab has no board to wait on.
  const boardReady = useTileDocReady(spaceTarget)
  const warm = useWindowWarm(bodyRef, pagePath, boardReady)
  const connections = useWindowTabConnections(tree)
  const { page, onBody } = useSubfieldPage(pageTarget)

  const arrive =
    pendingTravel?.route === 'window' && pendingTravel.path === pagePath
      ? pendingTravel.heading
      : undefined

  const body = target && (
    <div
      className={cx('window-body', 'over-scroll', pageTarget !== null && 'page-tile-grows')}
      ref={bodyRef}
    >
      {pageTarget ? (
        <PageTile
          key={pageTarget.path}
          path={pageTarget.path}
          editing={editing}
          onBeginEdit={() => setEditing(true)}
          connections={connections}
          onBody={onBody}
          warm={warm}
          chrome={pageBanner ? 'window' : 'none'}
          arrive={arrive}
          onArrived={clearPendingTravel}
        />
      ) : (
        spaceTarget &&
        spaceOwner && (
          <SpaceTabBody
            host={spaceTarget}
            owner={spaceOwner}
            banner={spaceBanner}
            connections={connections}
          />
        )
      )}
    </div>
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
