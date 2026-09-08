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
  return useMemo(
    () =>
      connectionsFor(tree, {
        open: (page) => openWindowTab({ id: page.id, path: page.path }),
        bypass: (page) =>
          void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true }),
        menu: showConnectionMenu,
      }),
    [tree, openWindowTab, select],
  )
}

/** A connection opened from the main surface follows the preview preference. */
export function usePreviewConnections(tree: NexusTree | null): ConnectionsApi | undefined {
  const select = useSession((s) => s.select)
  const openWindow = useSession((s) => s.openWindow)
  // Reads the LIVE personalization slice (setPersonalization updates it before the tree echoes).
  const openInWindow = useSession((s) => s.personalization.connectionsOpenInPreview ?? false)
  return useMemo(
    () =>
      connectionsFor(tree, {
        open: (page) =>
          openInWindow
            ? openWindow({ id: page.id, path: page.path })
            : void select({ kind: 'page', id: page.id, path: page.path }),
        bypass: (page) =>
          void select({ kind: 'page', id: page.id, path: page.path }, { newTab: true }),
        menu: showConnectionMenu,
      }),
    [tree, select, openWindow, openInWindow],
  )
}
