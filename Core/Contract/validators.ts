import { fault } from './result'

export const NEEDS_CONFIG_PATCH = fault('A config patch is required.')

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
export const isString = (v: unknown): v is string => typeof v === 'string'
export const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString)
export const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)
export const isKeyOf = <T extends object>(obj: T, k: unknown): k is keyof T & string =>
  isString(k) && Object.hasOwn(obj, k)
