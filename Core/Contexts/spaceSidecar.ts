import { isPlainObject } from '../Contract/validators'
import { parseContextKey } from './contexts'
import { asString } from '../Nexus/coerce'
import type { Json } from '../Files/stableJson'
import type { Rewrite } from '../Properties/governedSweep'

export const COLOR_KEY = '$color'
export const ORDER_KEY = '$order'
export const ICON_KEY = '$icon'

// Each name here is a reserved property name or `$`-prefixed, so no property value can sit under one.
const MODELED = new Set(['id', ICON_KEY, 'banner', 'heading_icon_hidden', COLOR_KEY])

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
    if (!isPlainObject(order) || !Array.isArray(entries) || !entries.includes(from)) return keyed
    const next =
      to === null ? entries.filter((e) => e !== from) : entries.map((e) => (e === from ? to : e))
    return { ...cur, [ORDER_KEY]: { ...order, [list]: next } }
  }
}
