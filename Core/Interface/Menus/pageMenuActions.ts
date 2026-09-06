// Sidebar rows are the exception — their menu runs main-side.

import { titleFromPath } from '@pommora/core/Connections/connections'
import { pageLinkText, pagePathText, type PageMoveContext } from '@pommora/core/Actions/pageMenu'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { parentOf } from '@pommora/core/Nexus/treePatch'
import { containerTargets } from '../../Session/destinationTree'
import { useSession } from '../../Session/store'
import { host } from '../../Platform/dialer'

export function pageMoveContext(tree: NexusTree | null, path: string): PageMoveContext {
  return {
    moveTargets: tree ? containerTargets(tree.collections) : [],
    currentParentPath: parentOf(path),
  }
}

export function runPageSendAction(
  action: string,
  { id, path }: { id: string; path: string },
): boolean {
  if (action.startsWith('move:')) {
    void useSession.getState().mutate({ op: 'movePage', path, newParentPath: action.slice(5) })
    return true
  }
  if (action === 'title:copylink') {
    void host().ask('clipboard:write', pageLinkText(titleFromPath(path)))
    return true
  }
  if (action === 'title:copypath') {
    void host().ask('clipboard:write', pagePathText(path))
    return true
  }
  if (action === 'title:history') {
    useSession.getState().openHistory({ id, path })
    return true
  }
  return false
}
