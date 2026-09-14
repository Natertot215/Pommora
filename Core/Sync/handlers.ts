import { type Handlers, type HostContext, withRoot } from '../Contract/handlers'
import { fail, ok, type Result } from '../Contract/result'
import { getLiveTree, refreshTree } from '../Nexus/liveTree'
import { readValue, writeValue } from '../Platform/localState'
import { readFileHistoryConfig } from '../Settings/settings'
import { call, type CallOutcome, type SyncHost, syncHost } from './Client/call'
import { forgetKeys, loadRing, passwordName, refreshRing, ringName } from './Client/keyring'
import type {
  DeviceRecord,
  InfoRecord,
  RingEntry,
  SyncBinding,
  SyncDevice,
  SyncScope,
  SyncState,
  SyncStatus,
} from './Contract/wire'
import { deriveWrappingKey, freshKdfParams } from './Keys/kdf'
import { exportRaw, mintKey, unwrapWithPassword, wrapForDevice, wrapForPassword } from './Keys/ring'

const DAY_MS = 86_400_000

const OFF: SyncStatus = { state: 'off' }

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
  binding: SyncScope | null
}

async function ready(root: string, ctx: HostContext): Promise<Result<Ready>> {
  const tree = getLiveTree() ?? (await refreshTree(root))
  const host = syncHost(ctx)
  if (host === null) return NO_DEVICE
  return ok({
    nexusId: tree.nexus.id,
    device: { id: host.device.id, publicKey: host.device.publicKey, name: host.device.name },
    host,
    binding: readValue<SyncScope>('sync'),
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

async function readInfo(
  host: SyncHost,
  address: string,
  nexusId: string,
): Promise<InfoRecord | null> {
  return (await call(host, address, 'info', { nexusId })).reply?.info ?? null
}

async function state(root: string, ctx: HostContext): Promise<Result<SyncState>> {
  const r = await ready(root, ctx)
  if (!r.ok) return r
  const { nexusId, device, host, binding } = r.value
  if (binding === null) return ok({ device, binding: null, status: OFF })
  const outcome = await call(host, binding.address, 'devices', { nexusId })
  const revoked = outcome.status === 404 && (await host.secrets.get(ringName(nexusId))) !== null
  if (revoked) await forgetKeys(host, nexusId)
  return ok({
    device,
    binding: bindingFrom(binding.address, outcome),
    status: revoked ? { state: 'off', reason: 'revoked', why: 'This device was revoked.' } : OFF,
  })
}

async function shareRing(
  host: SyncHost,
  address: string,
  nexusId: string,
  deviceId: string,
  devices: DeviceRecord[],
): Promise<string | undefined> {
  const info = await readInfo(host, address, nexusId)
  if (info === null) return 'The server holds no key record for this nexus.'
  const ring = await loadRing(host, nexusId, info)
  if (ring === null) return 'This device holds no keys to share; it needs the Nexus password.'
  const target = devices.find((d) => d.id === deviceId)
  if (!target?.x25519) return 'That device holds no agreement key; it needs the Nexus password.'
  const known = new Set(info.ring.filter((e) => e.holder === deviceId).map((e) => e.keyId))
  const raws = (await exportRaw(ring)).filter((raw) => !known.has(raw.keyId))
  if (raws.length === 0) return undefined
  const add = await wrapForDevice(raws, { deviceId, x25519: target.x25519 })
  const appended = await call(host, address, 'ring', { nexusId, base: info.version, add })
  return appended.status === 200 ? undefined : 'The server refused the key hand-off.'
}

async function rotateRing(
  host: SyncHost,
  address: string,
  nexusId: string,
  password: string,
  devices: DeviceRecord[],
): Promise<string | undefined> {
  const info = await readInfo(host, address, nexusId)
  if (info === null) return 'The server holds no key record for this nexus.'
  const kek = await deriveWrappingKey(password, info.kdf)
  const proof = info.ring.filter((e) => e.holder === 'password')
  try {
    if (proof.length === 0) throw new Error('wrong-password')
    await unwrapWithPassword(proof, kek)
  } catch {
    return 'The stored Nexus password does not open the ring.'
  }
  const raw = mintKey()
  const add: RingEntry[] = await wrapForPassword([raw], kek)
  for (const d of devices) {
    if (d.approved && d.x25519)
      add.push(...(await wrapForDevice([raw], { deviceId: d.id, x25519: d.x25519 })))
  }
  const appended = await call(host, address, 'ring', { nexusId, base: info.version, add })
  if (appended.reply === null) return 'The server refused the new key.'
  await refreshRing(host, nexusId, appended.reply.info)
  return undefined
}

const act = (route: 'approve' | 'revoke') =>
  withRoot(async (root: string, ctx: HostContext, raw: unknown): Promise<Result<SyncState>> => {
    const r = await ready(root, ctx)
    if (!r.ok) return r
    const deviceId = typeof raw === 'string' ? raw.trim() : ''
    if (deviceId.length === 0) return fail('operation-failed', 'A device id is required.')
    const { nexusId, device, host, binding } = r.value
    if (binding === null) return fail('operation-failed', 'This nexus is bound to no server.')
    const password = await host.secrets.get(passwordName(nexusId))
    if (route === 'revoke' && password === null)
      return fail('operation-failed', 'The Nexus password is needed to rotate the ring.')
    const outcome = await call(host, binding.address, route, { nexusId, deviceId })
    if (outcome.status !== 200 && outcome.status !== 0) return state(root, ctx)
    const devices = outcome.reply?.devices ?? []
    const why =
      outcome.status !== 200
        ? undefined
        : route === 'approve'
          ? await shareRing(host, binding.address, nexusId, deviceId, devices)
          : await rotateRing(host, binding.address, nexusId, password ?? '', devices)
    return ok({
      device,
      binding: bindingFrom(binding.address, outcome),
      status: why === undefined ? OFF : { state: 'off', why },
    })
  })

export const syncHandlers = {
  'sync:state': withRoot((root, ctx) => state(root, ctx)),

  'sync:renameDevice': withRoot(
    async (root: string, ctx: HostContext, raw: unknown): Promise<Result<SyncState>> => {
      const r = await ready(root, ctx)
      if (!r.ok) return r
      const name = typeof raw === 'string' ? raw.trim() : ''
      if (name.length === 0 || name.length > 64)
        return fail('invalid-name', 'A device name is one to sixty-four characters.')
      const { nexusId, device, host, binding } = r.value
      await host.device.rename(name)
      if (binding === null) return state(root, ctx)
      // The name is server state on the device's one global row, so the bound server hears it too.
      const outcome = await call(host, binding.address, 'connect', {
        nexusId,
        publicKey: device.publicKey,
        name,
      })
      // A server that did not answer would take the transport's full wait a second time, so its silence is reported from the call already made.
      if (outcome.status === 0)
        return ok({
          device: { ...device, name },
          binding: {
            address: binding.address,
            state: 'unreachable',
            why: outcome.error ?? 'The server did not answer.',
          },
          status: OFF,
        })
      return state(root, ctx)
    },
  ),

  'sync:connect': withRoot(
    async (
      root: string,
      ctx: HostContext,
      raw: unknown,
      raw2?: unknown,
      raw3?: unknown,
    ): Promise<Result<SyncState>> => {
      const r = await ready(root, ctx)
      if (!r.ok) return r
      const address = typeof raw === 'string' ? raw.trim() : ''
      if (address.length === 0) return fail('operation-failed', 'A server address is required.')
      const password = typeof raw2 === 'string' && raw2.length ? raw2 : null
      const pin = typeof raw3 === 'string' && raw3.length ? raw3 : undefined
      const { nexusId, device, host } = r.value
      const outcome = await call(host, address, 'connect', {
        nexusId,
        publicKey: device.publicKey,
        name: device.name,
        x25519: host.device.x25519,
      })
      if (outcome.status !== 200)
        return fail(
          'operation-failed',
          `The server refused or did not answer: ${outcome.error ?? outcome.status}.`,
        )
      if (password !== null) await host.secrets.set(passwordName(nexusId), password)
      const info = await readInfo(host, address, nexusId)
      if (info !== null) {
        const ring = await loadRing(host, nexusId, info)
        if (ring === null) {
          if (password === null) return fail('operation-failed', 'A Nexus password is required.')
          await host.secrets.set(passwordName(nexusId), null)
          return fail('operation-failed', 'The Nexus password is wrong.')
        }
      } else if (outcome.reply?.approved === true) {
        if (password === null) return fail('operation-failed', 'A Nexus password is required.')
        const kdf = freshKdfParams()
        const key = mintKey()
        const entries = [
          ...(await wrapForPassword([key], await deriveWrappingKey(password, kdf))),
          ...(host.device.x25519
            ? await wrapForDevice([key], { deviceId: host.device.id, x25519: host.device.x25519 })
            : []),
        ]
        const created = await call(host, address, 'info', {
          nexusId,
          create: {
            protocol: 1,
            kdf,
            historyDays: (await readFileHistoryConfig(root)).keepMs / DAY_MS,
            ring: entries,
          },
        })
        if (created.status !== 200)
          return fail(
            'operation-failed',
            `The server refused the key record: ${created.error ?? created.status}.`,
          )
        await loadRing(host, nexusId, { ring: entries, kdf })
      }
      return writeValue('sync', { address, pin, cursor: 0 }) ? state(root, ctx) : NO_STORE
    },
  ),

  'sync:disconnect': withRoot((root, ctx) =>
    writeValue('sync', null) ? state(root, ctx) : NO_STORE,
  ),

  'sync:approve': act('approve'),
  'sync:revoke': act('revoke'),
} satisfies Partial<Handlers>
