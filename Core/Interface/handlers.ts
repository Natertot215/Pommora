import type { Handlers } from '../Contract/handlers'
import { BUSY, fail, NO_NEXUS, ok, type Result } from '../Contract/result'
import {
  isGlanceSize,
  isHeightMap,
  isIndexArray,
  isString,
  isStringArray,
} from '../Contract/validators'
import { adopting } from '../Nexus/handlers'
import { sessionRoot } from '../Nexus/session'
import { readScope, readValue, type Scope, writeKey, writeValue } from '../Platform/localState'
import { type DevicePrefs, packDevicePrefs } from '../Settings/devicePrefs'
import { readTabsState, sanitizeTabSet, writeTabsState } from './tabsState'
import type { GlanceSize } from './Windows/windowRecord'
import { readWindowsState, sanitizeWindows, writeWindowsState } from './windowState'

const isEmptyValue = (v: unknown): boolean =>
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0)

/** A scope that can't be read degrades to its empty default, never a failure. */
export function scopeGet<T>(scope: Scope): () => Record<string, T> {
  return () => {
    try {
      return readScope<T>(scope)
    } catch {
      return {}
    }
  }
}

export function scopeSet<T>(
  scope: Scope,
  valid: (v: unknown) => v is T,
  expected: string,
): (ctx: unknown, key: string, value: T) => Result<null> {
  return (_ctx, key, value) => {
    if (typeof key !== 'string') return fail('operation-failed', 'A key is required.')
    if (!valid(value)) return fail('operation-failed', expected)
    if (!writeKey(scope, key, isEmptyValue(value) ? null : value)) return NO_NEXUS
    return ok(null)
  }
}

const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean'

export const interfaceHandlers = {
  'tabs:load': () => (sessionRoot() === null ? NO_NEXUS : ok(readTabsState())),
  'tabs:save': (_ctx, set: unknown) => {
    if (adopting()) return BUSY
    const clean = sanitizeTabSet(set)
    if (!clean) return fail('operation-failed', 'Bad tab set.')
    return writeTabsState(clean) ? ok(null) : NO_NEXUS
  },

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
  'devicePrefs:save': (_ctx, prefs: unknown) => {
    if (adopting()) return BUSY
    return writeValue('devicePrefs', packDevicePrefs(prefs)) ? ok(null) : NO_NEXUS
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
  'activeViews:get': scopeGet<string>('activeView'),
  'activeViews:set': scopeSet('activeView', isString, 'A view id is required.'),
  'viewOrders:get': scopeGet<string[]>('viewOrder'),
  'viewOrders:set': scopeSet('viewOrder', isStringArray, 'An order of page ids is required.'),
  'tableHeadingCols:get': scopeGet<number[]>('headingCols'),
  'tableHeadingCols:set': scopeSet(
    'headingCols',
    isIndexArray,
    'Table indices must be a non-negative-integer array.',
  ),
  // Only whether the header draws the icon is chrome; the icon itself stays in frontmatter.
  'headingIcon:get': scopeGet<boolean>('headingIcon'),
  'headingIcon:set': scopeSet('headingIcon', isBoolean, 'Hidden must be a boolean.'),
  // A row exists only where someone overrode the nexus-wide default; null clears it.
  'citations:get': scopeGet<boolean>('citations'),
  'citations:set': scopeSet(
    'citations',
    (v: unknown): v is boolean | null => isBoolean(v) || v === null,
    'Shown must be a boolean.',
  ),
  // An accelerator for offering an alias back; losing it costs a suggestion, never a link.
  'aliases:get': scopeGet<string[]>('aliases'),
  'aliases:set': scopeSet('aliases', isStringArray, 'Aliases must be a string array.'),

  'error:show': async (ctx, message: unknown) => {
    if (typeof message === 'string')
      await ctx.message('error', 'Couldn’t complete that action.', message)
  },
  'clipboard:write': async (ctx, text: unknown) => {
    if (typeof text === 'string') await ctx.clipboard.write(text)
  },
  'clipboard:read': (ctx) => ctx.clipboard.read(),
} satisfies Partial<Handlers>
