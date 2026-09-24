import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { fail, NO_STORE, ok } from '../Contract/result'
import { isGlanceSize, isHeightMap, isIndexArray, isStringArray } from '../Contract/validators'
import { isPlainObject } from '../Properties/propertyValue'
import { readScope, readValue, type Scope, writeKey, writeValue } from '../Platform/localState'
import { type DevicePrefs, packDevicePrefs, readInterfaceScale } from '../Settings/devicePrefs'
import type { GlanceSize } from './Windows/windowRecord'
import { readWindowsState, sanitizeWindows, writeWindowsState } from './Windows/windowState'

const isEmptyValue = (v: unknown): boolean =>
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (isPlainObject(v) && Object.keys(v).length === 0)

export const scopeGet = <T>(scope: Scope) => withRoot(() => ok(readScope<T>(scope)), ok({}))

export const scopeSet = <T>(scope: Scope, valid: (v: unknown) => v is T, expected: string) =>
  withWriteRoot((_root, _ctx, key: string, value: T) => {
    if (!valid(value)) return fail('operation-failed', expected)
    return writeKey(scope, key, isEmptyValue(value) ? null : value) ? ok(null) : NO_STORE
  })

export const interfaceHandlers = {
  'windows:load': withRoot(() => ok(readWindowsState())),
  'windows:save': withWriteRoot((_root, _ctx, file: unknown) => {
    const clean = sanitizeWindows(file)
    if (!clean) return fail('operation-failed', 'Bad windows file.')
    return writeWindowsState(clean) ? ok(null) : NO_STORE
  }),

  'glance:load': withRoot(() => ok(readValue<GlanceSize>('glancePane'))),
  'glance:save': withWriteRoot((_root, _ctx, size: unknown) => {
    if (!isGlanceSize(size)) return fail('operation-failed', 'A glance size needs finite w and h.')
    return writeValue('glancePane', { w: size.w, h: size.h }) ? ok(null) : NO_STORE
  }),

  'devicePrefs:load': withRoot(() => ok(readValue<DevicePrefs>('devicePrefs'))),
  'devicePrefs:save': withWriteRoot(async (_root, ctx, prefs: unknown) => {
    const scale = readInterfaceScale()
    if (!writeValue('devicePrefs', packDevicePrefs(prefs))) return NO_STORE
    if (readInterfaceScale() !== scale) await ctx.applyZoom()
    return ok(null)
  }),

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
