import type { ConnectionsApi } from '../MarkdownPM/Links/connectionsApi'
import { NO_TRAIL, type TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { showConnectionMenu } from '../Interface/Menus/connectionMenuActions'
import { useSession } from './store'
import { personalizationOf } from './configSlice'
import { settingOf } from '../Settings/personalization'
import { pageIndexOf, recordsByIdOf } from '../Nexus/treeIndex'

type Mode = 'preview' | 'window' | 'inert'
type Session = ReturnType<typeof useSession.getState>

const held = new Map<Mode, { read: unknown[]; value: ConnectionsApi | undefined }>()

/** `preview` follows the Open in Preview preference, `window` lands in the window's own tab strip, and `inert` opens no page, for a glance or a page's history — its own headings and external links still follow. One bundle per mode, rebuilt only when what it reads changes, so a caller may read it at the moment it needs it rather than subscribe. */
export function connectionsOf(s: Session, mode: Mode): ConnectionsApi | undefined {
  const { tree, headings, select, openWindowTab } = s
  const inWindow =
    mode === 'window' ||
    (mode === 'preview' && settingOf(personalizationOf(s), 'connectionsOpenInPreview'))
  const read = [tree, inWindow, headings, select, openWindowTab]
  const hit = held.get(mode)
  if (hit?.read.every((v, i) => v === read[i])) return hit.value
  const value = build()
  held.set(mode, { read, value })
  return value

  function build(): ConnectionsApi | undefined {
    if (!tree) return undefined
    const index = pageIndexOf(tree)
    const headingsOf = (path: string): string[] | undefined => headings[path]
    const location = (id: string): TrailSegment[] =>
      recordsByIdOf(tree).get(id)?.parents ?? NO_TRAIL
    if (mode === 'inert') return { ...index, open: () => {}, headingsOf, location }
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
