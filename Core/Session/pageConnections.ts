import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import { NO_TRAIL, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { showConnectionMenu } from '../Interface/Menus/connectionMenuActions'
import { useSession } from './store'
import { personalizationOf } from './configSlice'
import { settingOf } from '../Settings/personalization'
import { pageIndexOf, recordsByIdOf } from '../Nexus/treeIndex'
import type { PageHeadings } from '../Connections/pageIndex'

type Mode = 'preview' | 'window' | 'inert'
type Session = ReturnType<typeof useSession.getState>

const held = new Map<Mode, { read: unknown[]; value: ConnectionsApi | undefined }>()

/** `preview` previews every connection under Open Connections In Preview and otherwise follows Open In Preview, `window` lands in the window's own tab strip, and `inert` opens no page, for a glance or a page's history — its own headings and weblinks still follow. One bundle per mode, rebuilt only when what it reads changes, so a caller may read it at the moment it needs it rather than subscribe. */
function connectionsOf(s: Session, mode: Mode): ConnectionsApi | undefined {
  const { tree, headings, openTarget, openWindowTab } = s
  const inWindow =
    mode === 'window' ||
    (mode === 'preview' && settingOf(personalizationOf(s), 'connectionsOpenInPreview'))
  // `openTarget` and `openWindowTab` are stable store actions.
  const read = [tree, inWindow, headings]
  const hit = held.get(mode)
  if (hit?.read.every((v, i) => v === read[i])) return hit.value
  const value = build()
  held.set(mode, { read, value })
  return value

  function build(): ConnectionsApi | undefined {
    if (!tree) return undefined
    const index = pageIndexOf(tree)
    const headingsOf = (path: string): PageHeadings | undefined => headings[path]
    const location = (id: string): TrailSegment[] =>
      recordsByIdOf(tree).get(id)?.parents ?? NO_TRAIL
    if (mode === 'inert') return { ...index, open: () => {}, headingsOf, location }
    return {
      ...index,
      open: ({ id, path }, heading, newTab) => {
        const target = { kind: 'page', id, path } as const
        if (inWindow && !newTab) openWindowTab(target, { heading })
        else openTarget(target, { newTab, heading })
      },
      menu: showConnectionMenu,
      headingsOf,
      location,
    }
  }
}

/** The preview bundle as it is now, for a value that colors or follows a link without subscribing to every heading change. */
export const previewConnections = (): ConnectionsApi | undefined =>
  connectionsOf(useSession.getState(), 'preview')

export function useConnections(mode: Mode): ConnectionsApi | undefined {
  return useSession((s) => connectionsOf(s, mode))
}
