import { useMemo } from 'react'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import type { NexusTree } from '../Nexus/tree'
import { showConnectionMenu } from '../Interface/Menus/connectionMenuActions'
import { useSession } from './store'
import { connectionsFor } from '../Nexus/treeIndex'

/** A connection opened from inside a window lands in that window's own tab strip. */
export function useWindowTabConnections(tree: NexusTree | null): ConnectionsApi | undefined {
  const select = useSession((s) => s.select)
  const openWindowTab = useSession((s) => s.openWindowTab)
  const headings = useSession((s) => s.headings)
  const setPendingTravel = useSession((s) => s.setPendingTravel)
  return useMemo(
    () =>
      connectionsFor(tree, {
        open: (page, heading) => {
          if (heading) setPendingTravel({ route: 'window', path: page.path, heading })
          openWindowTab({ kind: 'page', id: page.id, path: page.path })
        },
        bypass: (page, heading) => {
          if (heading) setPendingTravel({ route: 'tab', path: page.path, heading })
          void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true })
        },
        menu: showConnectionMenu,
        headingsOf: (path) => headings[path],
      }),
    [tree, openWindowTab, select, headings, setPendingTravel],
  )
}

/** A connection opened from the main surface follows the preview preference. */
export function usePreviewConnections(tree: NexusTree | null): ConnectionsApi | undefined {
  const select = useSession((s) => s.select)
  const openWindowTab = useSession((s) => s.openWindowTab)
  // Reads the LIVE personalization slice (setPersonalization updates it before the tree echoes).
  const openInWindow = useSession((s) => s.personalization.connectionsOpenInPreview ?? false)
  const headings = useSession((s) => s.headings)
  const setPendingTravel = useSession((s) => s.setPendingTravel)
  return useMemo(
    () =>
      connectionsFor(tree, {
        open: (page, heading) => {
          if (heading)
            setPendingTravel({ route: openInWindow ? 'window' : 'tab', path: page.path, heading })
          if (openInWindow) openWindowTab({ kind: 'page', id: page.id, path: page.path })
          else void select({ kind: 'page', id: page.id, path: page.path })
        },
        bypass: (page, heading) => {
          if (heading) setPendingTravel({ route: 'tab', path: page.path, heading })
          void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true })
        },
        menu: showConnectionMenu,
        headingsOf: (path) => headings[path],
      }),
    [tree, select, openWindowTab, openInWindow, headings, setPendingTravel],
  )
}
