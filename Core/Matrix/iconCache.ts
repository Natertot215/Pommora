import { loadFullIconSet } from '@pommora/uix/Symbols'
import { emitter } from '@pommora/uix/Utilities/subscribable'

const cache = new Map<string, HTMLImageElement | null>()
const loaded = emitter()
let pending = 0

// Told on every settle, a failed load included, so whatever waits on `iconsLoading` is asked again.
export const onIconLoad = loaded.subscribe
export const iconsLoading = (): boolean => pending > 0

// The image for an icon name in `color`, or `null` until it has loaded and the node paints alone. An SVG image draws crisp at whatever size the node asks, so one image serves every zoom.
export function iconFor(name: string, color: string): HTMLImageElement | null {
  const key = `${name}|${color}`
  if (cache.has(key)) return cache.get(key) ?? null
  cache.set(key, null)
  pending += 1
  const settle = (img: HTMLImageElement | null): void => {
    pending -= 1
    if (img) cache.set(key, img)
    loaded.emit()
  }
  loadFullIconSet().then(
    (set) => {
      const img = new Image()
      img.onload = () => settle(img)
      img.onerror = () => settle(null)
      img.src = `data:image/svg+xml;utf8,${encodeURIComponent(set.iconMarkup(name, color))}`
    },
    () => settle(null),
  )
  return null
}
