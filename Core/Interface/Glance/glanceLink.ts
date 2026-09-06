import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { armGlance } from './glanceAction'

export const glanceLink: NonNullable<ConnectionsApi['glance']> = (target, el) =>
  armGlance(target, el, 'link')
