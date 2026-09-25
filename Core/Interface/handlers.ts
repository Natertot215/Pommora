import type { EditorPrefs, EditorPrefWrite } from '../Contract/bridge'
import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { NO_STORE, ok, fault } from '../Contract/result'
import { isHeightMap, isIndexArray, isStringArray } from '../Contract/validators'
import { isPlainObject } from '../Properties/propertyValue'
import {
  readKey,
  readScope,
  readValue,
  type Scope,
  writeKey,
  writeValue,
} from '../Platform/localState'
import { type DevicePrefs, packDevicePrefs, readInterfaceScale } from '../Settings/devicePrefs'
import { readWindowsState, sanitizeWindows, writeWindowsState } from './Windows/windowState'

const isEmptyValue = (v: unknown): boolean =>
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (isPlainObject(v) && Object.keys(v).length === 0)

export const scopeSet = (scope: Scope, valid: (v: unknown) => boolean, expected: string) =>
  withWriteRoot((_root, _ctx, key: string, value: unknown) => {
    if (!valid(value)) return fault(expected)
    return writeKey(scope, key, isEmptyValue(value) ? null : value) ? ok(null) : NO_STORE
  })

const editorPrefShapes: Record<keyof EditorPrefs, (v: unknown) => boolean> = {
  folds: isStringArray,
  embedHeights: isHeightMap,
  embedZooms: isHeightMap,
  headingCols: isIndexArray,
}

export const interfaceHandlers = {
  'windows:load': withRoot(() => ok(readWindowsState())),
  'windows:save': withWriteRoot((_root, _ctx, file: unknown) => {
    const clean = sanitizeWindows(file)
    if (!clean) return fault('Bad windows file.')
    return writeWindowsState(clean) ? ok(null) : NO_STORE
  }),

  'devicePrefs:load': withRoot(() => ok(readValue<DevicePrefs>('devicePrefs'))),
  'devicePrefs:save': withWriteRoot(async (_root, ctx, prefs: unknown) => {
    const scale = readInterfaceScale()
    if (!writeValue('devicePrefs', packDevicePrefs(prefs))) return NO_STORE
    if (readInterfaceScale() !== scale) await ctx.applyZoom()
    return ok(null)
  }),

  'editorPrefs:get': withRoot((_root, _ctx, pageId: string) =>
    ok<EditorPrefs>({
      folds: readKey<string[]>('folds', pageId) ?? [],
      embedHeights: readKey<Record<string, number>>('embedHeights', pageId) ?? {},
      embedZooms: readKey<Record<string, number>>('embedZooms', pageId) ?? {},
      headingCols: readKey<number[]>('headingCols', pageId) ?? [],
    }),
  ),
  'editorPrefs:set': (ctx, pageId: string, ...[scope, value]: EditorPrefWrite) =>
    scopeSet(scope, editorPrefShapes[scope], `A ${scope} value has the wrong shape.`)(
      ctx,
      pageId,
      value,
    ),
  'citations:get': withRoot(() => ok(readScope<boolean>('citations')), ok({})),
  'citations:set': scopeSet(
    'citations',
    (v) => typeof v === 'boolean' || v === null,
    'Shown must be a boolean.',
  ),

  'clipboard:write': async (ctx, text: unknown) => {
    if (typeof text === 'string') await ctx.clipboard.write(text)
    return ok(null)
  },
  'clipboard:read': async (ctx) => ok(await ctx.clipboard.read()),
} satisfies Partial<Handlers>
