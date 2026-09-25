import { useMemo } from 'react'
import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import type { NexusTree } from '../Nexus/tree'
import { showConnectionMenu } from '../Interface/Menus/connectionMenuActions'
import { useSession, useSetting } from './store'
import { pageIndexOf } from '../Nexus/treeIndex'

/** `preview` follows the Open in Preview preference, `window` lands in the window's own tab strip, and `inert` opens no page, for a glance or a page's history — its own headings and external links still follow. */
export function useConnections(
  tree: NexusTree | null,
  mode: 'preview' | 'window' | 'inert',
): ConnectionsApi | undefined {
  const select = useSession((s) => s.select)
  const openWindowTab = useSession((s) => s.openWindowTab)
  // Reads the LIVE personalization slice (setPersonalization updates it before the tree echoes).
  const preview = useSetting('connectionsOpenInPreview')
  const headings = useSession((s) => s.headings)
  const inWindow = mode === 'window' || (mode === 'preview' && preview)
  return useMemo(() => {
    if (!tree) return undefined
    const index = pageIndexOf(tree)
    const headingsOf = (path: string): string[] | undefined => headings[path]
    if (mode === 'inert') return { ...index, open: () => {}, headingsOf }
    return {
      ...index,
      open: ({ id, path }, heading) => {
        if (inWindow) openWindowTab({ kind: 'page', id, path }, { heading })
        else void select({ kind: 'page', id, path }, { heading })
      },
      bypass: ({ id, path }, heading) =>
        void select({ kind: 'page', id, path }, { newTab: true, heading }),
      menu: showConnectionMenu,
      headingsOf,
    }
  }, [tree, mode, inWindow, headings, select, openWindowTab])
}
