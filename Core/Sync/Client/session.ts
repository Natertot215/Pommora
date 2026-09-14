import type { HostContext } from '../../Contract/handlers'
import type { WatchScope } from '../../Paths/exclusion'
import type { SyncScope } from '../Contract/wire'
import type { Ring } from '../Keys/ring'
import type { SyncHost } from './call'

export interface Session {
  host: SyncHost
  ctx: HostContext
  root: string
  nexusId: string
  target: SyncScope
  ring: Ring
  scope: WatchScope
  failed: Set<string>
}
