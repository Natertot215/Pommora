// The pane reaches into MarkdownPM and the editor's host reaches this, so the pane claims the presenter slot at mount rather than being imported.
import type { GlanceTarget } from '../../MarkdownPM/api'
import { pushDismissal } from '@pommora/uix/Interactions/dismissalStack'
import { useSession } from '../../Session/store'
import { personalizationOf } from '../../Session/configSlice'
import { settingOf } from '../../Settings/personalization'

export interface GlanceRequest {
  target: GlanceTarget
  el: Element
}

// KNOB — one dwell per glance kind. link: editor connections, raised on hover. location: every interface surface, raised on Shift.
// location seeded at 600 — tune on sight (shift-summon feels snappier than the 1s link rest).
export const GLANCE_DWELL = { link: 1000, location: 600 } as const
type GlanceDwell = keyof typeof GLANCE_DWELL

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

function armGlance(target: GlanceTarget, el: Element, dwell: GlanceDwell): void {
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

// The one app-side gate every surface arms through, so the Off rung is honored in one place and missed in none.
export function armPreview(target: GlanceTarget, el: Element, slot: GlanceDwell): void {
  if (settingOf(personalizationOf(useSession.getState()), 'previewPersistence') === 'off') return
  ensureArmListeners()
  armGlance(target, el, slot)
}

export const glanceLink = (target: GlanceTarget, el: Element): void =>
  armPreview(target, el, 'link')

/** What an editor host, and a resting value outside one, arm a glance through. */
export const glanceHost = {
  arm: glanceLink,
  cancel: cancelGlance,
  close: closeGlance,
  contains: insideGlance,
}

// The surface currently under the pointer, so a Shift pressed while already at rest can raise its preview without a leave-and-re-enter.
let hovered: { target: GlanceTarget; el: Element; slot: GlanceDwell } | null = null
let armListenersBound = false

// !e.repeat is required: an auto-repeat keydown would cancel + re-arm every frame and the dwell would never complete.
const onShiftDown = (e: KeyboardEvent): void => {
  if (e.key === 'Shift' && !e.repeat && hovered && !glanceShown())
    armPreview(hovered.target, hovered.el, hovered.slot)
}

// A right-click means the target is opening a menu: drop any pending dwell so it can't fire over the menu, and clear the hovered surface so a hover left at rest can't re-pop the moment the menu closes.
const onContextMenu = (): void => leaveGlance()

function ensureArmListeners(): void {
  if (armListenersBound) return
  armListenersBound = true
  window.addEventListener('keydown', onShiftDown)
  window.addEventListener('contextmenu', onContextMenu, true)
}

export function hoverGlance(
  target: GlanceTarget,
  el: Element,
  slot: GlanceDwell,
  armNow: boolean,
): void {
  hovered = { target, el, slot }
  ensureArmListeners()
  if (armNow) armPreview(target, el, slot)
}

export function leaveGlance(): void {
  hovered = null
  cancelGlance()
}

// A release that arrives a frame after the pointer left only counts while the surface still holds the hover.
export function leaveGlanceFrom(el: Element): void {
  if (hovered?.el === el) leaveGlance()
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
  const onLayoutShift = (): void => {
    watch.onMoved()
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        raf = 0
        if (!el.isConnected) watch.onGone()
      })
    })
  }
  // A live pane closes on Shift the same way it closes on Esc — the summon key is the dismiss key.
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') return
    if (e.key === 'Shift' && !e.repeat) watch.onEscape()
    else onLayoutShift()
  }
  const dismissal = pushDismissal({
    layer: watch.body ?? (() => null),
    dismiss: watch.onEscape,
    outsidePress: watch.dismissOnPress ?? false,
  })
  window.addEventListener('scroll', onLayoutShift, true)
  window.addEventListener('keydown', onKey)
  return () => {
    if (raf) cancelAnimationFrame(raf)
    dismissal.release()
    window.removeEventListener('scroll', onLayoutShift, true)
    window.removeEventListener('keydown', onKey)
  }
}
