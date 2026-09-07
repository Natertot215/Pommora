import type { GlanceTarget } from '../../MarkdownPM/api'
import { useSession } from '../../Session/store'
import { armGlance, cancelGlance, type GlanceDwell, glanceShown } from './glanceAction'

// The one app-side gate every surface arms through, so the Off rung is honored in one place and missed in none.
export function armPreview(target: GlanceTarget, el: Element, slot: GlanceDwell): void {
  if (useSession.getState().personalization.previewPersistence === 'off') return
  ensureArmListeners()
  armGlance(target, el, slot)
}

export const glanceLink = (target: GlanceTarget, el: Element): void =>
  armPreview(target, el, 'link')

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
