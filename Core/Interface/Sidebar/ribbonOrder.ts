export type RibbonKey = 'matrix' | 'agenda' | 'contexts' | 'collections' | 'settings'

const DEFAULT_ORDER: RibbonKey[] = ['matrix', 'agenda', 'contexts', 'collections', 'settings']

export function resolveOrder(persisted: string[] | undefined, experimental: boolean): RibbonKey[] {
  const order = experimental ? DEFAULT_ORDER : DEFAULT_ORDER.filter((k) => k !== 'agenda')
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
