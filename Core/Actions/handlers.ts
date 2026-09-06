import type { Handler, Handlers, MenuChannel } from '../Contract/handlers'
import { confirmWrite, pushAssetWrites } from '../Nexus/confirm'
import { mutateDeps } from '../Nexus/handlers'
import { confirmMutation } from '../Nexus/mutatePatch'
import type { ContextTarget } from '../Pages/mutateRequest'
import { isPlainObject } from '../Properties/propertyValue'
import type { ViewButton } from '../Views/viewRow'

const forward =
  <K extends MenuChannel>(k: K): Handler<K> =>
  (ctx, ...args) =>
    ctx.menu(k, ...args)

export const actionsHandlers = {
  'history:menu': (ctx, c: unknown) =>
    isPlainObject(c) ? ctx.menu('history:menu', { batch: c.batch === true }) : null,
  'create-menu': forward('create-menu'),

  'view-button-menu': (ctx, current: unknown) => {
    const c = current as { viewButton?: unknown } | null
    const viewButton: ViewButton = c?.viewButton === 'labeled' ? 'labeled' : 'icon'
    return ctx.menu('view-button-menu', { viewButton })
  },
  'view-row-menu': (ctx, current: unknown) => {
    const c = current as { titlesShown?: unknown; deletable?: unknown } | null
    return ctx.menu('view-row-menu', {
      ...(typeof c?.titlesShown === 'boolean' ? { titlesShown: c.titlesShown } : {}),
      deletable: c?.deletable === true,
    })
  },
  'view-embed-title-menu': (ctx, arg: unknown) => {
    const a = arg as { iconShown?: unknown; level?: unknown } | null
    const level = typeof a?.level === 'number' && a.level >= 1 && a.level <= 6 ? a.level : 4
    return ctx.menu('view-embed-title-menu', { iconShown: a?.iconShown === true, level })
  },
  'view-embed-area-menu': (ctx, current: unknown) => {
    const c = current as { viewStyle?: unknown; titleShown?: unknown } | null
    return ctx.menu('view-embed-area-menu', {
      viewStyle: c?.viewStyle === 'dropdown' ? 'dropdown' : 'toolbar',
      titleShown: c?.titleShown !== false,
    })
  },
  'icon-favorite-menu': (ctx, favorited: unknown) =>
    ctx.menu('icon-favorite-menu', favorited === true),
  'nexus:iconMenu': (ctx, arg: unknown) => {
    const o = (arg ?? {}) as { hasPhoto?: unknown; hasGlyph?: unknown }
    return ctx.menu('nexus:iconMenu', {
      hasPhoto: o.hasPhoto === true,
      hasGlyph: o.hasGlyph === true,
    })
  },
  'nexus:bannerMenu': forward('nexus:bannerMenu'),
  'nexus:titleMenu': forward('nexus:titleMenu'),

  'table-menu': forward('table-menu'),
  'grip-menu': forward('grip-menu'),
  'column-menu': forward('column-menu'),
  'cell-menu': forward('cell-menu'),
  'page-actions-menu': forward('page-actions-menu'),
  'card-menu': forward('card-menu'),
  'trash:menu': (ctx, c) => (isPlainObject(c) ? ctx.menu('trash:menu', c) : null),
  'trash:columnMenu': (ctx, c) => (isPlainObject(c) ? ctx.menu('trash:columnMenu', c) : null),
  'tab-menu': (ctx, c) => (isPlainObject(c) ? ctx.menu('tab-menu', c) : null),
  'nav-row-menu': (ctx, c) => (isPlainObject(c) ? ctx.menu('nav-row-menu', c) : null),
  'conn-menu': forward('conn-menu'),
  'citation-menu': forward('citation-menu'),
  'property-menu': forward('property-menu'),
  'option-menu': forward('option-menu'),
  'row-menu': forward('row-menu'),

  'context-menu': async (ctx, target: ContextTarget) =>
    ctx.contextMenu(target, await mutateDeps(ctx), async (req, reply) => {
      // The menu outlives its IPC handler, so this confirm fires after the mutation finished —
      // the same patch-and-push every renderer-driven mutation gets.
      await confirmWrite(ctx, (root) => confirmMutation(root, req, reply))
      pushAssetWrites(ctx)
      ctx.push('menu:action', 'reload-state')
    }),
} satisfies Partial<Handlers>
