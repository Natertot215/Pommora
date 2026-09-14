import type { HostContext } from '../../Contract/handlers'
import type { SyncStatus } from '../Contract/wire'

let status: SyncStatus = { state: 'off' }

export const currentStatus = (): SyncStatus => status

export function setStatus(ctx: Pick<HostContext, 'push'>, next: SyncStatus): void {
  status = next
  ctx.push('sync:changed', next)
}
