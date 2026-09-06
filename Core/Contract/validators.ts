import { NOT_A_PROPERTY_DIR_MESSAGE } from '../Assets/assetRoots'
import type { ThumbRect } from '../Interface/chrome'
import type { GlanceSize } from '../Interface/Windows/windowRecord'
import { rootSegs } from '../Paths/exclusion'
import type { Option } from '../Properties/optionModel'
import {
  type FileConfig,
  type LinkConfig,
  LINK_DISPLAYS,
  NUMBER_FAMILIES,
  type NumberConfig,
} from '../Properties/properties'
import { isPlainObject } from '../Properties/propertyValue'
import { fail } from './result'

export const NEEDS_CONFIG_PATCH = fail('operation-failed', 'A config patch is required.')
export const NOT_A_PROPERTY_DIR = fail('invalid-path', NOT_A_PROPERTY_DIR_MESSAGE)

export const isString = (v: unknown): v is string => typeof v === 'string'
export const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString)
export const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)
export const isRect = (v: unknown): v is ThumbRect =>
  isPlainObject(v) && ['x', 'y', 'width', 'height'].every((k) => typeof v[k] === 'number')
export const isGlanceSize = (v: unknown): v is GlanceSize =>
  isPlainObject(v) && ['w', 'h'].every((k) => isFiniteNumber(v[k]))
export const isHeightMap = (v: unknown): v is Record<string, number> =>
  isPlainObject(v) && Object.values(v).every((h) => isFiniteNumber(h) && h > 0)
export const isIndexArray = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((x) => Number.isInteger(x) && x >= 0)
export const isOptionArray = (v: unknown): v is Option[] =>
  Array.isArray(v) &&
  v.every((o) => isPlainObject(o) && typeof o.value === 'string' && typeof o.label === 'string')

/** An `in` check, not truthiness: absent means "leave it", present-and-undefined means "back to the default". */
const asPatch = (payload: unknown): Record<string, unknown> | null =>
  isPlainObject(payload) ? payload : null

export const narrowLinkConfig = (payload: unknown): LinkConfig | null => {
  const p = asPatch(payload)
  if (!p) return null
  const changes: LinkConfig = {}
  if (typeof p.link_underline === 'boolean') changes.link_underline = p.link_underline
  const display = LINK_DISPLAYS.find((d) => d === p.link_display)
  if (display) changes.link_display = display
  if ('link_color' in p)
    changes.link_color = typeof p.link_color === 'string' ? p.link_color : undefined
  return changes
}

/** Stored relative to the asset ROOT; an empty result means the root itself — the absence of the field, not a stored empty string. */
export const narrowFileConfig = (payload: unknown): FileConfig | null => {
  const p = asPatch(payload)
  if (!p || !('file_directory' in p)) return null
  const raw = typeof p.file_directory === 'string' ? p.file_directory : ''
  const dir = rootSegs(raw.trim()).join('/')
  return { file_directory: dir || undefined }
}

export const narrowNumberFormat = (payload: unknown): NumberConfig | null => {
  const p = asPatch(payload)
  if (!p) return null
  const changes: NumberConfig = {}
  if ('number_family' in p)
    changes.number_family = NUMBER_FAMILIES.find((f) => f === p.number_family)
  if ('number_currency' in p)
    changes.number_currency = typeof p.number_currency === 'string' ? p.number_currency : undefined
  if ('number_separators' in p)
    changes.number_separators =
      typeof p.number_separators === 'boolean' ? p.number_separators : undefined
  if ('number_decimals' in p)
    changes.number_decimals =
      p.number_decimals === 'hidden' || typeof p.number_decimals === 'number'
        ? p.number_decimals
        : undefined
  if ('number_fraction' in p)
    changes.number_fraction = typeof p.number_fraction === 'boolean' ? p.number_fraction : undefined
  if ('number_denominator' in p)
    changes.number_denominator =
      typeof p.number_denominator === 'number' ? p.number_denominator : undefined
  return changes
}
