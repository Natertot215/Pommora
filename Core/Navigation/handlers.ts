import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { fail, NO_STORE, ok } from '../Contract/result'
import { isRect, isString } from '../Contract/validators'
import { isPlainObject } from '../Properties/propertyValue'
import { readNavigationState, writeNavigationState } from './navigationFile'
import { readTabsState, sanitizeTabSet, writeTabsState } from './tabsState'
import type { NavigationState } from './navRef'

export const navigationHandlers = {
  'nav:read': withRoot(async (root) => {
    return ok(await readNavigationState(root))
  }),

  'nav:write': withWriteRoot(async (root, _ctx, patch: unknown) => {
    if (!isPlainObject(patch))
      return fail('operation-failed', 'Navigation patch must be an object.')
    await writeNavigationState(root, patch as Partial<NavigationState>)
    return ok(null)
  }),

  'tabs:load': withRoot(() => ok(readTabsState())),
  'tabs:save': withWriteRoot((_root, _ctx, set: unknown) => {
    const clean = sanitizeTabSet(set)
    if (!clean) return fail('operation-failed', 'Bad tab set.')
    return writeTabsState(clean) ? ok(null) : NO_STORE
  }),

  'capture:thumbnail': withWriteRoot(
    async (root, ctx, navKey: unknown, rect: unknown, scaleFactor: unknown) => {
      if (typeof navKey !== 'string' || !isRect(rect) || typeof scaleFactor !== 'number')
        return fail('operation-failed', 'Bad capture args.')
      const url = await ctx.thumbnails.capture(root, navKey, rect, scaleFactor)
      return url ? ok({ url }) : fail('operation-failed', 'Capture produced no image.')
    },
  ),

  'nav:evictThumbs': withWriteRoot(async (root, ctx, liveKeys: unknown) => {
    if (!Array.isArray(liveKeys)) return fail('operation-failed', 'Live keys must be an array.')
    await ctx.thumbnails.evict(root, liveKeys.filter(isString))
    return ok(null)
  }),
} satisfies Partial<Handlers>
