import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { NO_STORE, ok, fault } from '../Contract/result'
import { isFiniteNumber, isPlainObject, isString } from '../Contract/validators'
import type { ThumbRect } from '../Interface/chrome'
import { holdsName } from '../Paths/names'
import { liveTreeOf } from '../Nexus/liveTree'
import { readNavigationState, writeNavigationState } from './navigationFile'
import { readTabsState, sanitizeTabSet, writeTabsState } from './tabsState'

const isRect = (v: unknown): v is ThumbRect =>
  isPlainObject(v) && ['x', 'y', 'width', 'height'].every((k) => isFiniteNumber(v[k]))

export const navigationHandlers = {
  'nav:read': withRoot(async (root) => {
    return ok(await readNavigationState(root))
  }),

  'nav:write': withWriteRoot(async (root, _ctx, patch: unknown) => {
    if (!isPlainObject(patch)) return fault('Navigation patch must be an object.')
    return (await writeNavigationState(root, patch)) ? ok(null) : NO_STORE
  }),

  'tabs:load': withRoot(() => ok(readTabsState())),
  'tabs:save': withWriteRoot((_root, _ctx, set: unknown) => {
    const clean = sanitizeTabSet(set)
    if (!clean) return fault('Bad tab set.')
    return writeTabsState(clean) ? ok(null) : NO_STORE
  }),

  'capture:thumbnail': withWriteRoot(
    async (root, ctx, navKey: unknown, rect: unknown, scaleFactor: unknown) => {
      if (!isString(navKey) || !holdsName(navKey) || !isRect(rect) || !isFiniteNumber(scaleFactor))
        return fault('Bad capture args.')
      const nexusId = (await liveTreeOf(root)).nexus.id
      const url = await ctx.thumbnails.capture(root, nexusId, navKey, rect, scaleFactor)
      return url ? ok({ url }) : fault('Capture produced no image.')
    },
  ),

  'nav:evictThumbs': withWriteRoot(async (root, ctx, liveKeys: unknown) => {
    if (!Array.isArray(liveKeys)) return fault('Live keys must be an array.')
    const nexusId = (await liveTreeOf(root)).nexus.id
    await ctx.thumbnails.evict(root, nexusId, liveKeys.filter(isString))
    return ok(null)
  }),
} satisfies Partial<Handlers>
