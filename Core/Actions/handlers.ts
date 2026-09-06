import type { Handlers } from '../Contract/handlers'

export const actionsHandlers = {
  'row-menu': (ctx, req) => ctx.menu(req),
} satisfies Partial<Handlers>
