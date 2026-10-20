import type { Handlers } from '../Contract/handlers'
import { ok, type Result } from '../Contract/result'
import { sessionRoot } from '../Nexus/session'
import { trashDeps } from './discard'
import type { TrashMode } from './trashMode'
import { SETTING_DEFAULTS } from '../Settings/personalization'

export const trashHandlers = {
  'delete:facts': async (
    ctx,
  ): Promise<Result<{ trashMode: TrashMode; permanentDelete: boolean }>> => {
    const root = sessionRoot()
    const { trashMode, permanentDelete = SETTING_DEFAULTS.permanentDelete } =
      root === null ? { trashMode: await ctx.trashMode() } : await trashDeps(root, ctx)
    return ok({ trashMode, permanentDelete })
  },
} satisfies Partial<Handlers>
