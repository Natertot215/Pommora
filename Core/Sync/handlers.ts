import { type Handlers, type HostContext, withRoot } from '../Contract/handlers'
import { fail, ok, type Result } from '../Contract/result'
import { isString } from '../Contract/validators'
import { captureLoser } from './Arrival/captures'
import { getLiveTree, refreshTree } from '../Nexus/liveTree'
import { readValue, writeValue } from '../Platform/localState'
import { readFileHistoryConfig } from '../Settings/settings'
import { deleteBase, readAllBases } from './Client/base'
import { call, type CallOutcome, type SyncHost, type SyncTarget, syncHost } from './Client/call'
import { startSession, stopSession, syncNow } from './Client/session'
import { currentStatus, setStatus } from './Client/status'
import { forgetHeldRing, forgetKeys, loadRing, passwordName, ringName } from './Client/keyring'
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
import {
  exportRaw,
  mintKey,
  newest,
  unwrapWithPassword,
  wrapForDevice,
  wrapForPassword,
} from './Keys/ring'

const DAY_MS = 86_400_000

const OFF: SyncStatus = { state: 'off' }

type Trouble = Pick<SyncStatus, 'reason' | 'why'>

interface KeyWork {
  trouble?: Trouble
  stop?: boolean
}

const NO_RECORD: Trouble = {
  reason: 'server',
  why: 'The server holds no key record for this nexus.',
}

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
  target: SyncTarget,
  outcome: CallOutcome<'devices' | 'approve' | 'revoke'>,
): SyncBinding {
  const address = target.address
  if (Array.isArray(outcome.reply?.devices))
    return { address, state: 'approved', devices: outcome.reply.devices }
  if (outcome.status === 404) return { address, state: 'pending' }
  const why = outcome.error ?? `The server answered ${outcome.status}.`
  return { address, state: 'unreachable', why }
}

const statusOf = (trouble: Trouble | undefined): SyncStatus =>
  trouble === undefined ? OFF : { state: 'off', ...trouble }

const silence = (outcome: { error?: string }): Trouble => ({
  reason: 'server',
  why: outcome.error ?? 'The server did not answer.',
})

async function fetchInfo(
  host: SyncHost,
  target: SyncTarget,
  nexusId: string,
): Promise<InfoRecord | Trouble> {
  const outcome = await call(host, target, 'info', { nexusId })
  if (outcome.status === 0) return silence(outcome)
  return outcome.reply?.info ?? NO_RECORD
}

const isInfo = (fetched: InfoRecord | Trouble): fetched is InfoRecord => 'ring' in fetched

async function appendRing(
  host: SyncHost,
  target: SyncTarget,
  nexusId: string,
  base: number,
  add: RingEntry[],
): Promise<InfoRecord | null> {
  return (await call(host, target, 'ring', { nexusId, base, add })).reply?.info ?? null
}

async function state(root: string, ctx: HostContext): Promise<Result<SyncState>> {
  const r = await ready(root, ctx)
  if (!r.ok) return r
  const { nexusId, device, host, binding } = r.value
  if (binding === null) return ok({ device, binding: null, status: currentStatus() })
  const outcome = await call(host, binding, 'devices', { nexusId })
  const revoked = outcome.status === 404 && (await host.secrets.get(ringName(nexusId))) !== null
  if (revoked) {
    stopSession(ctx)
    await forgetKeys(host, nexusId)
    setStatus(ctx, { state: 'off', reason: 'revoked', why: 'This device was revoked.' })
  }
  return ok({ device, binding: bindingFrom(binding, outcome), status: currentStatus() })
}

async function shareRing(
  host: SyncHost,
  target: SyncTarget,
  nexusId: string,
  deviceId: string,
  devices: DeviceRecord[],
): Promise<KeyWork> {
  const fetched = await fetchInfo(host, target, nexusId)
  if (!isInfo(fetched)) return { trouble: fetched, stop: true }
  const ring = await loadRing(host, nexusId, fetched, null)
  if (ring === null)
    return {
      trouble: {
        reason: 'password',
        why: 'This device holds no keys to share; it needs the Nexus password.',
      },
      stop: true,
    }
  const holder = devices.find((d) => d.id === deviceId)
  if (!holder?.x25519)
    return {
      trouble: {
        reason: 'password',
        why: 'That device holds no agreement key; it needs the Nexus password.',
      },
    }
  const known = new Set(fetched.ring.filter((e) => e.holder === deviceId).map((e) => e.keyId))
  const raws = (await exportRaw(ring)).filter((raw) => !known.has(raw.keyId))
  if (raws.length === 0) return {}
  const add = await wrapForDevice(raws, { deviceId, x25519: holder.x25519 })
  const appended = await appendRing(host, target, nexusId, fetched.version, add)
  return appended === null
    ? { trouble: { reason: 'server', why: 'The server refused the key hand-off.' }, stop: true }
    : {}
}

async function rotateRing(
  host: SyncHost,
  target: SyncTarget,
  nexusId: string,
  password: string,
  deviceId: string,
  devices: DeviceRecord[],
): Promise<KeyWork> {
  const fetched = await fetchInfo(host, target, nexusId)
  if (!isInfo(fetched)) return { trouble: fetched, stop: true }
  const kek = await deriveWrappingKey(password, fetched.kdf)
  const proof = fetched.ring.filter((e) => e.holder === 'password')
  const wrongPassword: KeyWork = {
    trouble: {
      reason: 'password',
      why: 'The stored Nexus password does not open the ring.',
    },
    stop: true,
  }
  if (proof.length === 0) return wrongPassword
  const current = await unwrapWithPassword(proof, kek).catch(() => null)
  if (current === null) return wrongPassword
  const raw = {
    ...mintKey(),
    createdMs: Math.max(Date.now(), newest(current).createdMs + 1),
  }
  const add: RingEntry[] = await wrapForPassword([raw], kek)
  const holders = devices.filter((d) => d.approved && d.id !== deviceId)
  for (const d of holders) {
    if (d.x25519) add.push(...(await wrapForDevice([raw], { deviceId: d.id, x25519: d.x25519 })))
  }
  const appended = await appendRing(host, target, nexusId, fetched.version, add)
  if (appended === null)
    return { trouble: { reason: 'server', why: 'The server refused the new key.' }, stop: true }
  await loadRing(host, nexusId, appended, null)
  return holders.some((d) => !d.x25519)
    ? {
        trouble: {
          reason: 'password',
          why: 'Some approved devices hold no agreement key and need the Nexus password.',
        },
      }
    : {}
}

const act = (route: 'approve' | 'revoke') =>
  withRoot(async (root: string, ctx: HostContext, raw: unknown): Promise<Result<SyncState>> => {
    const r = await ready(root, ctx)
    if (!r.ok) return r
    const deviceId = typeof raw === 'string' ? raw.trim() : ''
    if (deviceId.length === 0) return fail('operation-failed', 'A device id is required.')
    const { nexusId, device, host, binding } = r.value
    if (binding === null) return fail('operation-failed', 'This nexus is bound to no server.')
    let password: string | null = null
    if (route === 'revoke') {
      password = await host.secrets.get(passwordName(nexusId))
      if (password === null)
        return fail('operation-failed', 'The Nexus password is needed to rotate the ring.')
    }
    const listing = await call(host, binding, 'devices', { nexusId })
    const devices = listing.reply?.devices
    if (devices === undefined)
      return ok({ device, binding: bindingFrom(binding, listing), status: currentStatus() })
    const work =
      password === null
        ? await shareRing(host, binding, nexusId, deviceId, devices)
        : await rotateRing(host, binding, nexusId, password, deviceId, devices)
    if (work.stop === true)
      return ok({
        device,
        binding: bindingFrom(binding, listing),
        status: statusOf(work.trouble),
      })
    const outcome = await call(host, binding, route, { nexusId, deviceId })
    if (outcome.status !== 200 && outcome.status !== 0) return state(root, ctx)
    return ok({
      device,
      binding: bindingFrom(binding, outcome),
      status: statusOf(work.trouble),
    })
  })

const given = (raw: unknown): string | null =>
  typeof raw === 'string' && raw.length > 0 ? raw : null

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
      const outcome = await call(host, binding, 'connect', {
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
          status: currentStatus(),
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
      const password = given(raw2)
      const pin = given(raw3)
      const { nexusId, device, host, binding } = r.value
      const kept = binding !== null && binding.address === address
      const target = { address, pin: kept ? (pin ?? binding.pin) : pin }
      const outcome = await call(host, target, 'connect', {
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
      const asked = await call(host, target, 'info', { nexusId })
      if (asked.status === 0)
        return fail(
          'operation-failed',
          `The server did not answer for its keys: ${asked.error ?? 'no reply'}.`,
        )
      const record = asked.reply?.info ?? null
      if (record !== null) {
        if ((await loadRing(host, nexusId, record, password)) === null)
          return fail(
            'operation-failed',
            password === null ? 'A Nexus password is required.' : 'The Nexus password is wrong.',
          )
        if (password !== null) await host.secrets.set(passwordName(nexusId), password)
      } else if (asked.status === 404 && outcome.reply?.approved === true) {
        if (password === null) return fail('operation-failed', 'A Nexus password is required.')
        const kdf = freshKdfParams()
        const key = mintKey()
        const entries = [
          ...(await wrapForPassword([key], await deriveWrappingKey(password, kdf))),
          ...(await wrapForDevice([key], {
            deviceId: host.device.id,
            x25519: host.device.x25519,
          })),
        ]
        const created = await call(host, target, 'info', {
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
        await host.secrets.set(passwordName(nexusId), password)
        await loadRing(host, nexusId, { ring: entries, kdf }, null)
      }
      const scope: SyncScope = { ...target, cursor: kept ? binding.cursor : 0 }
      if (!kept) for (const row of readAllBases()) deleteBase(row.path)
      if (!writeValue('sync', scope)) return NO_STORE
      await startSession(ctx, root, nexusId)
      return state(root, ctx)
    },
  ),

  'sync:disconnect': withRoot(
    async (root: string, ctx: HostContext): Promise<Result<SyncState>> => {
      const r = await ready(root, ctx)
      if (!r.ok) return r
      stopSession(ctx)
      for (const row of readAllBases()) deleteBase(row.path)
      forgetHeldRing(r.value.nexusId)
      return writeValue('sync', null) ? state(root, ctx) : NO_STORE
    },
  ),

  'sync:approve': act('approve'),
  'sync:revoke': act('revoke'),

  'sync:now': withRoot(async (root: string, ctx: HostContext): Promise<Result<SyncState>> => {
    await syncNow()
    return state(root, ctx)
  }),

  'sync:captureLocal': withRoot(async (root, _ctx, rel: unknown, text: unknown) => {
    if (!isString(rel) || !isString(text))
      return fail('operation-failed', 'A path and its text are required.')
    await captureLoser(root, rel, new TextEncoder().encode(text), 'merge-lost')
    return ok(null)
  }),
} satisfies Partial<Handlers>
