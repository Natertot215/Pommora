import type { Handlers } from '../Contract/handlers'
import { fault, ok } from '../Contract/result'
import { menuRequest } from './menuModel'

export const actionsHandlers = {
  menu: async (ctx, req) => {
    const read = menuRequest.safeParse(req)
    return read.success ? ok(await ctx.menu(read.data)) : fault('Malformed menu.')
  },
} satisfies Partial<Handlers>
