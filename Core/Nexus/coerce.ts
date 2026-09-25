import { isStringArray } from '../Contract/validators'

export function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

export const asStringArray = (v: unknown): string[] | undefined =>
  isStringArray(v) ? v : undefined
