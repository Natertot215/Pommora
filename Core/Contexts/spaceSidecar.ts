import { isPlainObject } from '../Contract/validators'
import { parseContextKey } from './contexts'
import { asString } from '../Nexus/coerce'
import type { Json } from '../Files/stableJson'
import type { Rewrite } from '../Properties/governedSweep'
import { editList, namesValue } from '../Properties/pageValue'
import { pathExists } from '../Files/atomicWrite'
import { visibleFolders } from '../Files/walk'
import { contextsDir, sidecarPath } from '../Paths/paths'
import { join } from '../Paths/posix'

export const COLOR_KEY = '$color'
export const ORDER_KEY = '$order'
export const ICON_KEY = '$icon'

// Each name here is a reserved property name or `$`-prefixed, so no property value can sit under one.
const MODELED = new Set(['id', ICON_KEY, 'banner', 'heading_icon_hidden', COLOR_KEY])

/** The Spaces a Context folder holds, by folder name, and where each one's sidecar sits; a folder without a sidecar is a plain folder its reader passes over. */
export async function spaceSidecarsIn(
  absContextDir: string,
): Promise<{ name: string; file: string }[]> {
  return (await visibleFolders(absContextDir)).map((name) => ({
    name,
    file: sidecarPath(join(absContextDir, name), 'space'),
  }))
}

/** Every Space sidecar on disk, found by folder rather than by registry: a Context mid-rename has moved on disk before the registry or the tree follows it. */
export async function spaceSidecars(root: string): Promise<string[]> {
  const dir = contextsDir(root)
  const files: string[] = []
  for (const context of await visibleFolders(dir))
    for (const { file } of await spaceSidecarsIn(join(dir, context)))
      if (await pathExists(file)) files.push(file)
  return files
}

export interface SpaceRowOrder {
  contexts: string[]
  properties: string[]
}

export function spaceFieldsFrom(sc: Json): {
  icon?: string
  banner?: string
  headingIconHidden: boolean
  color?: string
  values?: Json
} {
  let values: Json | undefined
  for (const [k, v] of Object.entries(sc)) {
    if (MODELED.has(k) || parseContextKey(k) !== null) continue
    values ??= {}
    values[k] = v
  }
  return {
    icon: asString(sc[ICON_KEY]),
    banner: asString(sc.banner),
    headingIconHidden: sc.heading_icon_hidden === true,
    color: asString(sc[COLOR_KEY]),
    values,
  }
}

export function readSpaceRowOrder(values: Json | undefined): SpaceRowOrder {
  const order = values?.[ORDER_KEY]
  const list = (k: keyof SpaceRowOrder): string[] => {
    const entries = isPlainObject(order) ? order[k] : undefined
    return Array.isArray(entries) ? entries.filter((e): e is string => typeof e === 'string') : []
  }
  return { contexts: list('contexts'), properties: list('properties') }
}

export function withOrderEntry(
  inner: Rewrite,
  list: keyof SpaceRowOrder,
  from: string,
  to: string | null,
): Rewrite {
  return (raw, file) => {
    const keyed = inner(raw, file)
    const cur = keyed ?? raw
    const order = cur[ORDER_KEY]
    const entries = isPlainObject(order) ? order[list] : undefined
    const next =
      Array.isArray(entries) &&
      editList(entries, namesValue, from, to === null ? { op: 'strip' } : { op: 'replace', to })
    if (!isPlainObject(order) || !next) return keyed
    return { ...cur, [ORDER_KEY]: { ...order, [list]: next } }
  }
}
