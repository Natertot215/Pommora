import type { GlanceTarget } from '../../MarkdownPM/api'
import { useSession } from '../../Session/store'
import { armGlance, type GlanceDwell } from './glanceAction'

// The one app-side gate every surface arms through, so the Off rung is honored in one place and missed in none.
export function armPreview(target: GlanceTarget, el: Element, slot: GlanceDwell): void {
  if (useSession.getState().personalization.previewPersistence === 'off') return
  armGlance(target, el, slot)
}

export const glanceLink = (target: GlanceTarget, el: Element): void =>
  armPreview(target, el, 'link')
