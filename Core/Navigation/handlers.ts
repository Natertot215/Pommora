import { type Handlers, withRoot } from '../Contract/handlers'
import { BUSY, fail, NO_NEXUS, ok } from '../Contract/result'
import { isRect, isString } from '../Contract/validators'
import { adopting } from '../Nexus/handlers'
import { sessionRoot } from '../Nexus/session'
import { isPlainObject } from '../Properties/propertyValue'
import { readNavigationState, writeNavigationState } from './navigationFile'
import type { NavigationState } from './navRef'

export const navigationHandlers = {
  'nav:read': withRoot(async (root) => {
    return ok(await readNavigationState(root))
  }),

  // Refused mid-adopt so a gesture on the old nexus's still-open UI can't land in the new one.
  'nav:write': async (_ctx, patch: unknown) => {
    if (adopting()) return BUSY
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (!isPlainObject(patch))
      return fail('operation-failed', 'Navigation patch must be an object.')
    await writeNavigationState(root, patch as Partial<NavigationState>)
    return ok(null)
  },

  'capture:thumbnail': withRoot(
    async (root, ctx, navKey: unknown, rect: unknown, scaleFactor: unknown) => {
      if (typeof navKey !== 'string' || !isRect(rect) || typeof scaleFactor !== 'number')
        return fail('operation-failed', 'Bad capture args.')
      const url = await ctx.thumbnails.capture(root, navKey, rect, scaleFactor)
      return url ? ok({ url }) : fail('operation-failed', 'Capture produced no image.')
    },
  ),

  'nav:evictThumbs': withRoot(async (root, ctx, liveKeys: unknown) => {
    if (!Array.isArray(liveKeys)) return fail('operation-failed', 'Live keys must be an array.')
    await ctx.thumbnails.evict(root, liveKeys.filter(isString))
    return ok(null)
  }),
} satisfies Partial<Handlers>
