import type { ConnectionsApi } from '../../MarkdownPM/Connections'
import { armGlance } from './glanceAction'

/** The glance hook every host wires — one link dwell for connections and web addresses alike. */
export const glanceLink: NonNullable<ConnectionsApi['glance']> = (target, el) =>
  armGlance(target, el, 'link')
