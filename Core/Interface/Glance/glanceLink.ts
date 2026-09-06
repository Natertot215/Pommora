import type { GlanceTarget } from '../../MarkdownPM/api'
import { armGlance } from './glanceAction'

export const glanceLink = (target: GlanceTarget, el: Element): void => armGlance(target, el, 'link')
