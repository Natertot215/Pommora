import { type Handlers, withRoot } from '../Contract/handlers'
import { ok, type Result } from '../Contract/result'
import { liveTreeOf } from '../Nexus/liveTree'
import { sessionRoot } from '../Nexus/session'
import { readPermanentDelete } from '../Settings/settings'
import { listBundles } from './spend'
import type { TrashMode } from './trashRow'
import { trashRows } from './trashRows'

export const trashHandlers = {
  'trash:list': withRoot(async (root) => {
    return ok(trashRows(await listBundles(root), await liveTreeOf(root)))
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
} satisfies Partial<Handlers>
