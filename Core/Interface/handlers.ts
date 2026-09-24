import type { Handlers } from '../Contract/handlers'
import { BUSY, fail, NO_NEXUS, ok, type Result } from '../Contract/result'
import { isGlanceSize, isHeightMap, isIndexArray, isStringArray } from '../Contract/validators'
import { adopting } from '../Nexus/handlers'
import { isPlainObject } from '../Properties/propertyValue'
import { sessionRoot } from '../Nexus/session'
import { readScope, readValue, type Scope, writeKey, writeValue } from '../Platform/localState'
import { type DevicePrefs, packDevicePrefs, readInterfaceScale } from '../Settings/devicePrefs'
import type { GlanceSize } from './Windows/windowRecord'
import { readWindowsState, sanitizeWindows, writeWindowsState } from './Windows/windowState'

const isEmptyValue = (v: unknown): boolean =>
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (isPlainObject(v) && Object.keys(v).length === 0)

export function scopeGet<T>(scope: Scope): () => Result<Record<string, T>> {
  return () => ok(readScope<T>(scope))
}

export function scopeSet<T>(
  scope: Scope,
  valid: (v: unknown) => v is T,
  expected: string,
): (ctx: unknown, key: string, value: T) => Result<null> {
  return (_ctx, key, value) => {
    if (!valid(value)) return fail('operation-failed', expected)
    if (!writeKey(scope, key, isEmptyValue(value) ? null : value)) return NO_NEXUS
    return ok(null)
  }
}

export const interfaceHandlers = {
  'windows:load': () => (sessionRoot() === null ? NO_NEXUS : ok(readWindowsState())),
  'windows:save': (_ctx, file: unknown) => {
    if (adopting()) return BUSY
    const clean = sanitizeWindows(file)
    if (!clean) return fail('operation-failed', 'Bad windows file.')
    return writeWindowsState(clean) ? ok(null) : NO_NEXUS
  },

  'glance:load': () =>
    sessionRoot() === null ? NO_NEXUS : ok(readValue<GlanceSize>('glancePane')),
  'glance:save': (_ctx, size: unknown) => {
    if (adopting()) return BUSY
    if (!isGlanceSize(size)) return fail('operation-failed', 'A glance size needs finite w and h.')
    return writeValue('glancePane', { w: size.w, h: size.h }) ? ok(null) : NO_NEXUS
  },

  'devicePrefs:load': () =>
    sessionRoot() === null ? NO_NEXUS : ok(readValue<DevicePrefs>('devicePrefs')),
  'devicePrefs:save': async (ctx, prefs: unknown) => {
    if (adopting()) return BUSY
    const scale = readInterfaceScale()
    if (!writeValue('devicePrefs', packDevicePrefs(prefs))) return NO_NEXUS
    if (readInterfaceScale() !== scale) await ctx.applyZoom()
    return ok(null)
  },

  'folds:get': scopeGet<string[]>('folds'),
  'folds:set': scopeSet('folds', isStringArray, 'Fold keys must be a string array.'),
  'embedHeights:get': scopeGet<Record<string, number>>('embedHeights'),
  'embedHeights:set': scopeSet(
    'embedHeights',
    isHeightMap,
    'Embed heights must map ids to positive numbers.',
  ),
  'embedZooms:get': scopeGet<Record<string, number>>('embedZooms'),
  'embedZooms:set': scopeSet(
    'embedZooms',
    isHeightMap,
    'Embed scales must map ids to positive numbers.',
  ),
  'tableHeadingCols:get': scopeGet<number[]>('headingCols'),
  'tableHeadingCols:set': scopeSet(
    'headingCols',
    isIndexArray,
    'Table indices must be a non-negative-integer array.',
  ),
  'citations:get': scopeGet<boolean>('citations'),
  'citations:set': scopeSet(
    'citations',
    (v: unknown): v is boolean | null => typeof v === 'boolean' || v === null,
    'Shown must be a boolean.',
  ),

  'error:show': async (ctx, message: unknown) => {
    if (typeof message === 'string')
      await ctx.message('error', 'Couldn’t complete that action.', message)
    return ok(null)
  },
  'clipboard:write': async (ctx, text: unknown) => {
    if (typeof text === 'string') await ctx.clipboard.write(text)
    return ok(null)
  },
  'clipboard:read': async (ctx) => ok(await ctx.clipboard.read()),
} satisfies Partial<Handlers>
