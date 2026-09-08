import { type Handlers, withRoot } from '../Contract/handlers'
import { ok, type Result } from '../Contract/result'
import { getLiveTree, refreshTree } from '../Nexus/liveTree'
import { sessionRoot } from '../Nexus/session'
import { readPermanentDelete } from '../Settings/settings'
import { listBundles } from './spend'
import type { TrashMode } from './trashRow'
import { trashRows } from './trashRows'

export const trashHandlers = {
  'trash:list': withRoot(async (root) => {
    return ok(trashRows(await listBundles(root), getLiveTree() ?? (await refreshTree(root))))
  }),

  'delete:facts': async (
    ctx,
  ): Promise<Result<{ trashMode: TrashMode; permanentDelete: boolean }>> => {
    const root = sessionRoot()
    return ok({
      trashMode: await ctx.trashMode(),
      permanentDelete: root === null ? false : await readPermanentDelete(root),
    })
  },

  'trash:report': async (ctx, message: unknown, detail: unknown) => {
    if (typeof message === 'string' && typeof detail === 'string')
      await ctx.message('info', message, detail)
    return ok(null)
  },
} satisfies Partial<Handlers>
