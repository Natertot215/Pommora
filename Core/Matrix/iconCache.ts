import { type IconNode, loadFullIconSet } from '@pommora/uix/Symbols'
import { ICON_PX } from '@pommora/uix/Theme/theme-vars.css'

const cache = new Map<string, HTMLImageElement | null>()
const listeners = new Set<() => void>()

export function onIconLoad(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function svgOf(nodes: IconNode, color: string): string {
  const body = nodes
    .map(
      ([tag, attrs]) =>
        `<${tag} ${Object.entries(attrs)
          .filter(([k]) => k !== 'key')
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ')}/>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
}

// The bitmap for a lucide name in `color` at `dpr`, or `null` until it has loaded and the title paints alone, or when the name is unknown.
export function iconFor(name: string, color: string, dpr: number): HTMLImageElement | null {
  const key = `${name}|${color}|${dpr}`
  if (cache.has(key)) return cache.get(key) ?? null
  cache.set(key, null)
  void loadFullIconSet().then((set) => {
    const nodes = set.lucideIconNodes(name)
    if (!nodes) return
    const img = new Image(ICON_PX.footnote * dpr, ICON_PX.footnote * dpr)
    img.onload = () => {
      cache.set(key, img)
      for (const fn of listeners) fn()
    }
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgOf(nodes, color))}`
  })
  return null
}
