// The send block, renderer-side: what a surface hands over to offer it, and the three actions every
// surface answers identically. Sidebar rows are the exception — their menu runs main-side.

import { titleFromPath } from '@shared/connections'
import { pageLinkText, pagePathText, type PageMoveContext } from '@shared/pageMenu'
import type { NexusTree } from '@shared/types'
import { parentOf } from '@shared/treePatch'
import { containerTargets } from './destinationTree'
import { useSession } from './store'

/** Where this page may be sent: every container in the nexus, with the one it already sits in
 *  named so the menu can show that destination disabled. */
export function pageMoveContext(tree: NexusTree | null, path: string): PageMoveContext {
  return {
    moveTargets: tree ? containerTargets(tree.collections) : [],
    currentParentPath: parentOf(path),
  }
}

/** Runs the send-block actions and reports whether it took one, so a surface's own routing picks
 *  up where this leaves off. A page is named by its file, which is what a connection resolves. */
export function runPageSendAction(action: string, path: string): boolean {
  if (action.startsWith('move:')) {
    void useSession.getState().mutate({ op: 'movePage', path, newParentPath: action.slice(5) })
    return true
  }
  if (action === 'title:copylink') {
    void window.nexus.writeClipboard(pageLinkText(titleFromPath(path)))
    return true
  }
  if (action === 'title:copypath') {
    void window.nexus.writeClipboard(pagePathText(path))
    return true
  }
  return false
}
