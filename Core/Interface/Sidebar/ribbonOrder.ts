import { EXPERIMENTAL_MODES, type SidebarMode } from '@pommora/core/Settings/personalization'

export type RibbonKey = SidebarMode | 'matrix' | 'settings'

// A key's seat is its place in this record, which names every key or fails to compile.
const DEFAULT_ORDER = Object.keys({
  matrix: 0,
  agenda: 0,
  contexts: 0,
  collections: 0,
  settings: 0,
} satisfies Record<RibbonKey, 0>) as RibbonKey[]

export function resolveRibbonOrder(
  persisted: string[] | undefined,
  experimental: boolean,
): RibbonKey[] {
  const order = experimental
    ? DEFAULT_ORDER
    : DEFAULT_ORDER.filter((k) => !EXPERIMENTAL_MODES.has(k))
  const known = new Set<string>(order)
  const keys = (persisted ?? []).filter((k): k is RibbonKey => known.has(k))
  order.forEach((k, i) => {
    if (!keys.includes(k)) keys.splice(i, 0, k)
  })
  return keys
}

// A key the gate hides keeps the seat it was saved in, while a key the ribbon no longer carries still drops.
export function withHidden(persisted: string[] | undefined, visible: RibbonKey[]): string[] {
  const next: string[] = [...visible]
  ;(persisted ?? []).forEach((k, i) => {
    if (DEFAULT_ORDER.includes(k as RibbonKey) && !visible.includes(k as RibbonKey))
      next.splice(i, 0, k)
  })
  return next
}
