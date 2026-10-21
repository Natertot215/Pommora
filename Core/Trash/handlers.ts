import type { Handlers } from '../Contract/handlers'
import { ok, type Result } from '../Contract/result'
import { sessionRoot } from '../Nexus/session'
import type { TrashMode } from './trashMode'
import { SETTING_DEFAULTS } from '../Settings/personalization'
import { readLiveSetting } from '../Settings/settings'

export const trashHandlers = {
  'delete:facts': async (
    ctx,
  ): Promise<Result<{ trashMode: TrashMode; permanentDelete: boolean }>> => {
    const root = sessionRoot()
    return ok({
      trashMode: await ctx.trashMode(),
      permanentDelete:
        root === null
          ? SETTING_DEFAULTS.permanentDelete
          : await readLiveSetting(root, 'permanentDelete'),
    })
  },
} satisfies Partial<Handlers>
