import { type Handlers, type HostContext, withRoot } from '../Contract/handlers'
import { fail, ok, type Result } from '../Contract/result'
import { getLiveTree, refreshTree } from '../Nexus/liveTree'
import { readValue, writeValue } from '../Platform/localState'
import { call, type CallOutcome, type SyncHost } from './client'
import type { SyncBinding, SyncDevice, SyncState } from './contract'

const NO_DEVICE = fail(
  'operation-failed',
  'This device has no identity; the keychain refused at launch.',
)

const NO_STORE = fail(
  'operation-failed',
  'This nexus cannot record the binding; its database is unavailable.',
)

interface Ready {
  nexusId: string
  device: SyncDevice
  host: SyncHost
  address: string | null
}

// THE one session refusal, in one place: every handler reaches the server through here.
// `device` is a projection, never the host member, whose functions cannot cross IPC.
async function ready(root: string, ctx: HostContext): Promise<Result<Ready>> {
  const tree = getLiveTree() ?? (await refreshTree(root))
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
  if (Array.isArray(outcome.reply?.devices))
    return { address, state: 'approved', devices: outcome.reply.devices }
  if (outcome.status === 404) return { address, state: 'pending' }
  const why = outcome.error ?? `The server answered ${outcome.status}.`
  return { address, state: 'unreachable', why }
}

async function state(root: string, ctx: HostContext): Promise<Result<SyncState>> {
  const r = await ready(root, ctx)
  if (!r.ok) return r
  const { nexusId, device, host, address } = r.value
  if (address === null) return ok({ device, binding: null })
  return ok({
    device,
    binding: bindingFrom(address, await call(host, address, 'devices', { nexusId })),
  })
}

// An answered approve or revoke carries the fresh list, so it needs no second round trip; a refusal carries nothing true about the list, so the list is fetched rather than guessed at.
const act = (route: 'approve' | 'revoke') =>
  withRoot(async (root: string, ctx: HostContext, raw: unknown): Promise<Result<SyncState>> => {
    const r = await ready(root, ctx)
    if (!r.ok) return r
    const deviceId = typeof raw === 'string' ? raw.trim() : ''
    if (deviceId.length === 0) return fail('operation-failed', 'A device id is required.')
    const { nexusId, device, host, address } = r.value
    if (address === null) return fail('operation-failed', 'This nexus is bound to no server.')
    const outcome = await call(host, address, route, { nexusId, deviceId })
    if (outcome.status !== 200 && outcome.status !== 0) return state(root, ctx)
    return ok({ device, binding: bindingFrom(address, outcome) })
  })

export const syncHandlers = {
  'sync:state': withRoot((root, ctx) => state(root, ctx)),

  'sync:renameDevice': withRoot(async (root, ctx, raw: unknown) => {
    const r = await ready(root, ctx)
    if (!r.ok) return r
    const name = typeof raw === 'string' ? raw.trim() : ''
    if (name.length === 0 || name.length > 64)
      return fail('invalid-name', 'A device name is one to sixty-four characters.')
    const { nexusId, device, host, address } = r.value
    await host.device.rename(name)
    // The name is server state on the device's one global row, so the bound server hears it too.
    if (address !== null)
      await call(host, address, 'connect', { nexusId, publicKey: device.publicKey, name })
    return state(root, ctx)
  }),

  'sync:connect': withRoot(async (root, ctx, raw: unknown) => {
    const r = await ready(root, ctx)
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
    return writeValue('sync', { address }) ? state(root, ctx) : NO_STORE
  }),

  'sync:disconnect': withRoot((root, ctx) =>
    writeValue('sync', null) ? state(root, ctx) : NO_STORE,
  ),

  'sync:approve': act('approve'),
  'sync:revoke': act('revoke'),
} satisfies Partial<Handlers>
