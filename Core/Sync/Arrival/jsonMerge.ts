import { stableStringify } from '../../Files/stableJson'
import { isPlainObject } from '../../Properties/propertyValue'
import { NEXUS_DIR } from '../../Paths/nexusPaths'
import { NEXUS_CONFIG_FILES } from '../../Paths/paths'
import { basename } from '../../Paths/posix'

export type Json = Record<string, unknown>
export type Depth = Record<string, number>

export function isMergedJson(rel: string): boolean {
  return rel.endsWith('.json') && (rel.startsWith(`${NEXUS_DIR}/`) || basename(rel).startsWith('_'))
}

export function mergeDepthFor(rel: string): Depth {
  switch (rel) {
    case `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.settings}`:
      return { personalization: 1 }
    case `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.state}`:
      return { order: 1, navigation: 1 }
    case `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.properties}`:
      return { defs: 1 }
    case `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.crops}`:
      return { byImage: 1 }
    case `${NEXUS_DIR}/${NEXUS_CONFIG_FILES.matrix}`:
      return { group: 1, filter: 1, forces: 1, display: 1 }
    default:
      return {}
  }
}

const same = (a: unknown, b: unknown): boolean => stableStringify(a) === stableStringify(b)

const unionKeys = (...objects: Json[]): string[] => [
  ...new Set(objects.flatMap((o) => Object.keys(o))),
]

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
    else if (level > 0 && isPlainObject(l) && isPlainObject(r)) {
      const from = isPlainObject(b) ? b : {}
      out[key] = mergeKeys(from, l, r, levelFor(unionKeys(from, l, r), level - 1), pick)
    } else take(pick() === 'local' ? local : remote, key)
  }
  return out
}
