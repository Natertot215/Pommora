import { connectionText } from '../../Connections/connections'
import type { PageMenuContext } from '../../Actions/pageMenu'
import type { NexusTree } from '../../Nexus/tree'
import { relDirname, titleFromPath } from '../../Paths/posix'
import { containerTargets } from '../../Actions/destinationTree'
import { useSession } from '../../Session/store'
import { dialer } from '../../Platform/dialer'
import { confirmDelete } from '../Confirm/confirmations'

export function pageMoveContext(tree: NexusTree | null, path: string): PageMenuContext {
  return {
    moveTargets: containerTargets(tree),
    currentParentPath: relDirname(path),
  }
}

/** The verbs every Nexus file and folder answers by its path alone; returns false for any other. */
export function runPathAction(action: string, path: string): boolean {
  switch (action) {
    case 'title:copypath':
      void dialer().ask('path:copy', path)
      return true
    case 'title:reveal':
      void dialer().ask('path:reveal', path)
      return true
    default:
      return false
  }
}

/** Every page verb no one host owns; returns false for an action the caller keeps. */
export function runPageAction(
  action: string,
  page: { id: string; path: string; title?: string; heading?: string },
): boolean {
  const s = useSession.getState()
  const { id, path, title = titleFromPath(path) } = page
  const ref = { kind: 'page', id, path } as const
  if (action.startsWith('move:')) {
    void s.mutate({ op: 'movePage', path, newParentPath: action.slice(5) })
    return true
  }
  if (runPathAction(action, path)) return true
  switch (action) {
    case 'title:window':
      s.openWindowTab(ref, { heading: page.heading })
      return true
    case 'title:newtab':
      void s.select(ref, { newTab: true, heading: page.heading })
      return true
    case 'title:copylink':
      void dialer().ask('clipboard:write', connectionText(title, undefined, page.heading))
      return true
    case 'title:history':
      s.openHistory(ref)
      return true
    case 'title:delete':
      void confirmDelete({ path, kind: 'page', title })
      return true
    default:
      return false
  }
}
