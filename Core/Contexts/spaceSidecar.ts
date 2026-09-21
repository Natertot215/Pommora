import { parseContextKey } from './contexts'
import { asString } from '../Nexus/coerce'
import { isPlainObject } from '../Properties/propertyValue'

type Raw = Record<string, unknown>
type SidecarRewrite = (raw: Raw, file: string) => Raw | null

export const COLOR_KEY = '$color'
export const ORDER_KEY = '$order'

// Each name here is a reserved property name or `$`-prefixed, so no property value can sit under one.
const MODELED = new Set(['id', 'icon', 'banner', 'heading_icon_hidden', COLOR_KEY])

export interface SpaceRowOrder {
  contexts: string[]
  properties: string[]
}

export function spaceFieldsFrom(sc: Raw): {
  icon?: string
  banner?: string
  headingIconHidden: boolean
  color?: string
  values?: Raw
} {
  let values: Raw | undefined
  for (const [k, v] of Object.entries(sc)) {
    if (MODELED.has(k) || parseContextKey(k) !== null) continue
    values ??= {}
    values[k] = v
  }
  return {
    icon: asString(sc.icon),
    banner: asString(sc.banner),
    headingIconHidden: sc.heading_icon_hidden === true,
    color: asString(sc[COLOR_KEY]),
    values,
  }
}

export function readSpaceRowOrder(values: Raw | undefined): SpaceRowOrder {
  const order = values?.[ORDER_KEY]
  const list = (k: keyof SpaceRowOrder): string[] => {
    const entries = isPlainObject(order) ? order[k] : undefined
    return Array.isArray(entries) ? entries.filter((e): e is string => typeof e === 'string') : []
  }
  return { contexts: list('contexts'), properties: list('properties') }
}

export function withOrderEntry(
  inner: SidecarRewrite,
  list: keyof SpaceRowOrder,
  from: string,
  to: string | null,
): SidecarRewrite {
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
