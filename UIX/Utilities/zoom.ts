import { useEffect, useState } from 'react'

/** The zoom the element renders at, every ancestor's compounded: a screen-space delta divides by it to land inside the element. */
export const currentZoom = (el: Element): number => el.currentCSSZoom || 1

/** The live zoom of the element the ref holds at mount, re-read whenever it resizes. */
export function useElementZoom(ref: { readonly current: Element | null }): number {
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = (): void => setZoom(currentZoom(el))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return zoom
}
