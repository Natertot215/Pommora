import { type Handlers, withRoot } from '../Contract/handlers'
import { ok, type Result } from '../Contract/result'
import { liveTreeOf } from '../Nexus/liveTree'
import { sessionRoot } from '../Nexus/session'
import { trashDeps } from './bundle'
import { listBundles } from './holdings'
import type { TrashMode } from './trashRow'
import { trashRows } from './trashRows'
import { SETTING_DEFAULTS } from '../Settings/personalization'

export const trashHandlers = {
  'trash:list': withRoot(async (root) => {
    return ok(trashRows(await listBundles(root), await liveTreeOf(root)))
  }),

  'delete:facts': async (
    ctx,
  ): Promise<Result<{ trashMode: TrashMode; permanentDelete: boolean }>> => {
    const root = sessionRoot()
    const { trashMode, permanentDelete = SETTING_DEFAULTS.permanentDelete } =
      root === null ? { trashMode: await ctx.trashMode() } : await trashDeps(root, ctx)
    return ok({ trashMode, permanentDelete })
  },
} satisfies Partial<Handlers>
