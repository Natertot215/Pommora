import { useEffect, useState } from 'react'

/** The element's own rendered CSS zoom — a scaled surface's pointer math divides by it, and it is never back-solved from a rendered width, which bakes in layout slack. */
export const readZoom = (el: Element): number =>
  Number.parseFloat(getComputedStyle(el).getPropertyValue('zoom')) || 1

/** The live zoom of the element the ref holds at mount, re-read whenever it resizes. */
export function useElementZoom(ref: { readonly current: Element | null }): number {
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = (): void => setZoom(readZoom(el))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return zoom
}
