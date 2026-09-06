// The glance's imperative seam: what a host calls, apart from the pane itself. A leaf on purpose —
// the pane reaches into MarkdownPM, and MarkdownPM's pointer path has to reach this — so it imports
// nothing and the pane claims the presenter slot at mount.

export type GlanceTarget =
  | { kind: 'page'; id: string; path: string }
  | { kind: 'site'; url: string }

export interface GlanceRequest {
  target: GlanceTarget
  el: Element
}

/** KNOB — one dwell per host kind; a host names its row. */
export const GLANCE_DWELL = { link: 1000 } as const
export type GlanceDwell = keyof typeof GLANCE_DWELL

/** The pane's own body carries this attribute. */
export const GLANCE_BODY_ATTR = 'data-glance'

/** Whether an element sits inside the open pane's body — a gesture there acts on the glance, so it
 *  neither arms a new one nor dismisses the one it landed in. */
export function insideGlance(el: Element): boolean {
  return el.closest(`[${GLANCE_BODY_ATTR}]`) !== null
}

let present: ((next: GlanceRequest | null) => void) | null = null
let pending: ReturnType<typeof setTimeout> | null = null

export function setGlancePresenter(fn: ((next: GlanceRequest | null) => void) | null): void {
  present = fn
}

/** Starts the dwell; a re-arm replaces the pending one. A call before the pane mounts fires into
 *  nothing, and an anchor inside the pane's own body arms nothing. */
export function armGlance(target: GlanceTarget, el: Element, dwell: GlanceDwell): void {
  cancelGlance()
  if (insideGlance(el)) return
  pending = setTimeout(() => {
    pending = null
    present?.({ target, el })
  }, GLANCE_DWELL[dwell])
}

/** Clears a pending dwell; never closes an open pane. */
export function cancelGlance(): void {
  if (pending) {
    clearTimeout(pending)
    pending = null
  }
}

/** Clears a pending dwell and closes the open pane. */
export function closeGlance(): void {
  cancelGlance()
  present?.(null)
}

export interface AnchorWatch {
  /** The anchor left the DOM — scrolled out of the editor's viewport, or rebuilt under a resting
   *  pointer. */
  onGone: () => void
  onEscape: () => void
  /** Something moved the anchor or the pane; cached boxes are stale. */
  onMoved: () => void
}

/** Keeps a glance standing while the content view scrolls, and closes it once its anchor is gone.
 *  CM6 prunes decoration nodes in its own scheduled update AFTER the triggering event, so the
 *  connected check lands behind that update on a double frame rather than synchronously. */
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
