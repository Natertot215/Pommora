// The pane reaches into MarkdownPM and the editor's host reaches this, so the pane claims the presenter slot at mount rather than being imported.
import type { GlanceTarget } from '../../MarkdownPM/api'
import { pushDismissal } from '@pommora/uix/Interactions/dismissalStack'

export interface GlanceRequest {
  target: GlanceTarget
  el: Element
}

// KNOB — one dwell per glance kind. link: editor connections, raised on hover. location: every interface surface, raised on Shift.
// location seeded at 600 — tune on sight (shift-summon feels snappier than the 1s link rest).
export const GLANCE_DWELL = { link: 1000, location: 600 } as const
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
  body?: () => Element | null
  dismissOnPress?: boolean
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
  // A live pane closes on Shift the same way it closes on Esc — the summon key is the dismiss key.
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') return
    if (e.key === 'Shift' && !e.repeat) watch.onEscape()
    else onShift()
  }
  const dismissal = pushDismissal({
    layer: watch.body ?? (() => null),
    dismiss: watch.onEscape,
    outsidePress: watch.dismissOnPress ?? false,
  })
  window.addEventListener('scroll', onShift, true)
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', watch.onMoved)
  return () => {
    if (raf) cancelAnimationFrame(raf)
    dismissal.release()
    window.removeEventListener('scroll', onShift, true)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', watch.onMoved)
  }
}
