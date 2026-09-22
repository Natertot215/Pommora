import { useEffect, useRef, useState, type RefObject } from 'react'
import type { SpaceTarget, WindowTarget } from '@pommora/core/Navigation/navRef'
import { cx } from '@pommora/uix/Utilities/cx'
import { WindowActions } from '@pommora/uix/Windows/WindowActions'
import { WINDOW_BASE_PANEL, type WindowBasePanel } from '@pommora/uix/Windows/window-base'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { findSpace } from '../../Nexus/treeIndex'
import { PropertyPanel } from '../../Properties/PropertyPanel'
import { useWindowTabConnections } from '../../Session/pageConnections'
import { useSession } from '../../Session/store'
import { useExperimental } from '../../Settings/experimental'
import { PageTile } from '../../Tiles/Surfaces/PageTile'
import { TileHost } from '../../Tiles/TileHost'
import { subscribeTileDoc } from '../../Tiles/tileDocStore'
import { useTileDocReady } from '../../Tiles/useTileDoc'
import { Banner } from '../Header/Banner'
import { CitationsToggle } from '../Subfield/CitationsToggle'
import { Subfield } from '../Subfield/Subfield'
import { useSubfieldPage } from '../Subfield/subfieldPage'
import { useWindowWarm } from './useWindowWarm'
import { windowBannerShown } from './windowTabBanner'

export interface WindowTabBodySlots {
  body: React.ReactNode
  bodyRef: RefObject<HTMLDivElement | null>
  right: WindowBasePanel
  actions: React.ReactNode
  footer: React.ReactNode
  footerLead: React.ReactNode
  sidePaneOpen: boolean
  closeSidePane: () => void
}

function SpaceTabBody({
  host,
  connections,
}: {
  host: SpaceTarget
  connections: ConnectionsApi | undefined
}): React.JSX.Element | null {
  const tree = useSession((s) => s.tree)
  const spaceBanner = useSession((s) => windowBannerShown(s.personalization, 'space'))
  const owner = findSpace(tree, host.id)
  if (!owner) return null
  return (
    <>
      <Banner owner={owner} chrome={spaceBanner ? 'window-banner' : 'window-title'} />
      <div className="tile-host-frame">
        {/* Keyed per Space: the surface's debounced saves and editor session must never carry across an in-place host swap. */}
        <TileHost key={host.id} host={host} connections={connections} />
      </div>
    </>
  )
}

export function useWindowTabBody(
  target: WindowTarget | null,
  bodyClass: string,
): WindowTabBodySlots {
  const tree = useSession((s) => s.tree)
  const pendingTravel = useSession((s) => s.pendingTravel)
  const clearPendingTravel = useSession((s) => s.clearPendingTravel)
  const experimental = useExperimental()
  const pageBanner = useSession((s) => windowBannerShown(s.personalization, 'page'))

  const pageTarget = target?.kind === 'page' ? target : null
  const pagePath = pageTarget?.path
  // Null on a Page tab: a constant host would pin that Space's shared document open while the tab is nowhere on screen.
  const spaceTarget = target?.kind === 'space' ? target : null

  const [editing, setEditing] = useState(false)
  useEffect(() => setEditing(false), [pagePath])

  const [sidePaneOpen, setSidePaneOpen] = useState(false)
  const paneOpen = sidePaneOpen && pageTarget !== null
  const closeSidePane = (): void => setSidePaneOpen(false)

  // Every Space tab the window holds keeps its document loaded, so switching back draws the board in the same frame rather than after a reload.
  const tabs = useSession((s) => s.pageWindow?.tabs)
  useEffect(() => {
    const held = (tabs ?? []).flatMap((t) =>
      t.target.kind === 'space' ? [subscribeTileDoc(t.target, () => {})] : [],
    )
    return () => {
      for (const off of held) off()
    }
  }, [tabs])

  const bodyRef = useRef<HTMLDivElement>(null)
  // The shared tile document retires with its last mount, so a Space tab's scroll restore has to wait for the board to come back (B-8); a Page tab has no board to wait on.
  const boardReady = useTileDocReady(spaceTarget)
  const warm = useWindowWarm(bodyRef, pagePath, pageTarget !== null || boardReady)
  const connections = useWindowTabConnections(tree)
  const { page, onBody } = useSubfieldPage(pageTarget)

  const arrive =
    pendingTravel?.route === 'window' && pendingTravel.path === pagePath
      ? pendingTravel.heading
      : undefined

  const body = target && (
    <div
      className={cx(
        'window-body',
        bodyClass,
        'over-scroll',
        pageTarget !== null && 'page-tile-grows',
      )}
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
        spaceTarget && <SpaceTabBody host={spaceTarget} connections={connections} />
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
    sidePaneOpen: paneOpen,
    closeSidePane,
  }
}
