// A runtime leaf on purpose — the pane reaches into MarkdownPM and the editor's host reaches this, so it imports only a type and the pane claims the presenter slot at mount.
import type { GlanceTarget } from '../../MarkdownPM/api'

export interface GlanceRequest {
  target: GlanceTarget
  el: Element
}

/** KNOB — one dwell per glance surface; further surfaces add their own rows. */
export const GLANCE_DWELL = { link: 1000 } as const
export type GlanceDwell = keyof typeof GLANCE_DWELL

export const GLANCE_BODY_ATTR = 'data-glance'

export function insideGlance(el: Element): boolean {
  return el.closest(`[${GLANCE_BODY_ATTR}]`) !== null
}

let present: ((next: GlanceRequest | null) => void) | null = null
let pending: ReturnType<typeof setTimeout> | null = null

// Presenter-domain flag: true only while a live pane shows. Read imperatively by ghost suppression at dwell-fire, no reactivity.
let shown = false
export function glanceShown(): boolean {
  return shown
}
export function setGlanceShown(v: boolean): void {
  shown = v
}

export function setGlancePresenter(fn: ((next: GlanceRequest | null) => void) | null): void {
  present = fn
}

export function armGlance(target: GlanceTarget, el: Element, dwell: GlanceDwell): void {
  cancelGlance()
  if (insideGlance(el)) return
  pending = setTimeout(() => {
    pending = null
    present?.({ target, el })
  }, GLANCE_DWELL[dwell])
}

export function cancelGlance(): void {
  if (pending) {
    clearTimeout(pending)
    pending = null
  }
}

export function closeGlance(): void {
  cancelGlance()
  present?.(null)
}

interface AnchorWatch {
  onGone: () => void
  onEscape: () => void
  onMoved: () => void
}

/** CM6 prunes decoration nodes in its own scheduled update AFTER the triggering event, so the connected check lands behind that update on a double frame rather than synchronously. */
export function watchAnchor(el: Element, watch: AnchorWatch): () => void {
  let raf = 0
  const onShift = (): void => {
    watch.onMoved()
    if (raf) return
    raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        raf = 0
        if (!el.isConnected) watch.onGone()
      }),
    )
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      watch.onEscape()
      return
    }
    onShift()
  }
  window.addEventListener('scroll', onShift, true)
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', watch.onMoved)
  return () => {
    if (raf) cancelAnimationFrame(raf)
    window.removeEventListener('scroll', onShift, true)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', watch.onMoved)
  }
}
