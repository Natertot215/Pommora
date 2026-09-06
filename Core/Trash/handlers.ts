import type { Handlers } from '../Contract/handlers'
import { NO_NEXUS, ok } from '../Contract/result'
import { getLiveTree, refreshTree } from '../Nexus/liveTree'
import { sessionRoot } from '../Nexus/session'
import { readPermanentDelete } from '../Settings/settings'
import { listBundles } from './spend'
import { DEFAULT_TRASH_MODE, type TrashMode } from './trashRow'
import { trashRows } from './trashRows'

export const trashHandlers = {
  'trash:list': async () => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    return ok(trashRows(await listBundles(root), getLiveTree() ?? (await refreshTree(root))))
  },

  // Answers the safe reading rather than failing: the recoverable destination, and a delete that asks.
  'delete:facts': async (ctx): Promise<{ trashMode: TrashMode; permanentDelete: boolean }> => {
    try {
      const root = sessionRoot()
      return {
        trashMode: await ctx.trashMode(),
        permanentDelete: root === null ? false : await readPermanentDelete(root),
      }
    } catch {
      return { trashMode: DEFAULT_TRASH_MODE, permanentDelete: false }
    }
  },

  'trash:report': async (ctx, message: unknown, detail: unknown) => {
    if (typeof message === 'string' && typeof detail === 'string')
      await ctx.message('info', message, detail)
  },
} satisfies Partial<Handlers>
