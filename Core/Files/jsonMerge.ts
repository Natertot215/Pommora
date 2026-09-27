import { isPlainObject } from '../Contract/validators'
import { type Json, stableStringify } from './stableJson'

export type Depth = Record<string, number>

export const same = (a: unknown, b: unknown): boolean => stableStringify(a) === stableStringify(b)

const unionKeys = (...objects: Json[]): string[] => [
  ...new Set(objects.flatMap((o) => Object.keys(o))),
]

const objectOrAbsent = (v: unknown): v is Json | undefined => v === undefined || isPlainObject(v)

const levelFor = (keys: string[], level: number): Depth =>
  Object.fromEntries(keys.map((k) => [k, level]))

export function mergeKeys(
  base: Json,
  local: Json,
  remote: Json,
  depth: Depth,
  pick: () => 'local' | 'remote',
): Json {
  const out: Json = {}
  const take = (side: Json, key: string): void => {
    if (key in side) out[key] = side[key]
  }
  for (const key of unionKeys(base, local, remote)) {
    const b = base[key]
    const l = local[key]
    const r = remote[key]
    const localChanged = !same(b, l)
    const remoteChanged = !same(b, r)
    const level = depth[key] ?? 0
    if (!localChanged && !remoteChanged) take(base, key)
    else if (!remoteChanged) take(local, key)
    else if (!localChanged) take(remote, key)
    else if (level > 0 && objectOrAbsent(l) && objectOrAbsent(r)) {
      // A side that deleted the key merges as empty, so the other side's changes inside it survive.
      const from = isPlainObject(b) ? b : {}
      const lo = l ?? {}
      const ro = r ?? {}
      const merged = mergeKeys(from, lo, ro, levelFor(unionKeys(from, lo, ro), level - 1), pick)
      if (Object.keys(merged).length > 0 || (l !== undefined && r !== undefined)) out[key] = merged
    } else take(pick() === 'local' ? local : remote, key)
  }
  return out
}
