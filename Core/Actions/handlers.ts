import type { Handlers } from '../Contract/handlers'
import { ok } from '../Contract/result'

export const actionsHandlers = {
  menu: async (ctx, req) => ok(await ctx.menu(req)),
} satisfies Partial<Handlers>
