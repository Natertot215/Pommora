import { type Handlers, type HostContext, withRoot } from '../Contract/handlers'
import { fail, NO_NEXUS, ok, type Result } from '../Contract/result'
import { getLiveTree } from '../Nexus/liveTree'
import { readValue, writeValue } from '../Platform/localState'
import { call, type CallOutcome, type SyncHost } from './client'
import type { SyncBinding, SyncDevice, SyncState } from './contract'

const NO_DEVICE = fail(
  'operation-failed',
  'This device has no identity; the keychain refused at launch.',
)

interface Ready {
  nexusId: string
  device: SyncDevice
  host: SyncHost
  address: string | null
}

// THE two session refusals, in one place: every handler reaches the server through here.
// `device` is a projection, never the host member, whose functions cannot cross IPC.
function ready(ctx: HostContext): Result<Ready> {
  const tree = getLiveTree()
  if (tree === null) return NO_NEXUS
  const device = ctx.device
  if (device === null) return NO_DEVICE
  return ok({
    nexusId: tree.nexus.id,
    device: { id: device.id, publicKey: device.publicKey, name: device.name },
    host: { device, transport: ctx.transport },
    address: readValue<{ address: string }>('sync')?.address ?? null,
  })
}

function bindingFrom(
  address: string,
  outcome: CallOutcome<'devices' | 'approve' | 'revoke'>,
): SyncBinding {
  if (outcome.reply) return { address, state: 'approved', devices: outcome.reply.devices }
  if (outcome.status === 404) return { address, state: 'pending' }
  const why = outcome.error ?? `The server answered ${outcome.status}.`
  return { address, state: 'unreachable', why }
}

async function state(ctx: HostContext): Promise<Result<SyncState>> {
  const r = ready(ctx)
  if (!r.ok) return r
  const { nexusId, device, host, address } = r.value
  if (address === null) return ok({ device, binding: null })
  return ok({
    device,
    binding: bindingFrom(address, await call(host, address, 'devices', { nexusId })),
  })
}

// Approve and revoke answer from their one round trip, whose reply already carries the fresh list.
const act = (route: 'approve' | 'revoke') =>
  withRoot(async (_root: string, ctx: HostContext, raw: unknown): Promise<Result<SyncState>> => {
    const r = ready(ctx)
    if (!r.ok) return r
    const deviceId = typeof raw === 'string' ? raw.trim() : ''
    if (deviceId.length === 0) return fail('operation-failed', 'A device id is required.')
    const { nexusId, device, host, address } = r.value
    if (address === null) return fail('operation-failed', 'This nexus is bound to no server.')
    const outcome = await call(host, address, route, { nexusId, deviceId })
    return ok({ device, binding: bindingFrom(address, outcome) })
  })

export const syncHandlers = {
  'sync:state': withRoot((_root, ctx) => state(ctx)),

  'sync:renameDevice': withRoot(async (_root, ctx, raw: unknown) => {
    const r = ready(ctx)
    if (!r.ok) return r
    const name = typeof raw === 'string' ? raw.trim() : ''
    if (name.length === 0 || name.length > 64)
      return fail('invalid-name', 'A device name is one to sixty-four characters.')
    const { nexusId, device, host, address } = r.value
    await host.device.rename(name)
    // The name is server state on the device's one global row, so the bound server hears it too.
    if (address !== null)
      await call(host, address, 'connect', { nexusId, publicKey: device.publicKey, name })
    return state(ctx)
  }),

  'sync:connect': withRoot(async (_root, ctx, raw: unknown) => {
    const r = ready(ctx)
    if (!r.ok) return r
    const address = typeof raw === 'string' ? raw.trim() : ''
    if (address.length === 0) return fail('operation-failed', 'A server address is required.')
    const { nexusId, device, host } = r.value
    const outcome = await call(host, address, 'connect', {
      nexusId,
      publicKey: device.publicKey,
      name: device.name,
    })
    if (outcome.status !== 200)
      return fail(
        'operation-failed',
        `The server refused or did not answer: ${outcome.error ?? outcome.status}.`,
      )
    return writeValue('sync', { address }) ? state(ctx) : NO_NEXUS
  }),

  'sync:disconnect': withRoot((_root, ctx) => (writeValue('sync', null) ? state(ctx) : NO_NEXUS)),

  'sync:approve': act('approve'),
  'sync:revoke': act('revoke'),
} satisfies Partial<Handlers>
