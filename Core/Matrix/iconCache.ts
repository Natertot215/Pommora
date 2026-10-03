import { type IconNode, loadFullIconSet } from '@pommora/uix/Symbols'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { svgFrame } from '@pommora/uix/Symbols/svgFrame'
import { emitter } from '@pommora/uix/Utilities/subscribable'

const cache = new Map<string, HTMLImageElement | null>()
const loaded = emitter()

export const onIconLoad = loaded.subscribe

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
  return svgFrame(body, { stroke: color })
}

// KNOBs — the smallest and largest raster a glyph is cut at; a node zooming between two buckets takes the larger and scales it down.
const MIN_PX = 16
const MAX_PX = 1024

// A node's size moves with every zoom step, so the ask is quantized: the cache holds a handful of rasters per glyph rather than one per frame.
const bucket = (px: number): number => clamp(2 ** Math.ceil(Math.log2(px)), MIN_PX, MAX_PX)

// The bitmap for a lucide name in `color` at `px` physical pixels, or `null` until it has loaded and the node paints alone, or when the name is unknown.
export function iconFor(name: string, color: string, px: number): HTMLImageElement | null {
  const size = bucket(px)
  const key = `${name}|${color}|${size}`
  if (cache.has(key)) return cache.get(key) ?? null
  cache.set(key, null)
  void loadFullIconSet().then((set) => {
    const nodes = set.lucideIconNodes(name)
    if (!nodes) return
    const img = new Image(size, size)
    img.onload = () => {
      cache.set(key, img)
      loaded.emit()
    }
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgOf(nodes, color))}`
  })
  return null
}
