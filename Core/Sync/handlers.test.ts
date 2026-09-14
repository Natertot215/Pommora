import { mkdir, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type {
  HostContext,
  HostDevice,
  TransportReply,
  TransportRequest,
} from '../Contract/handlers'
import { dropLiveTree, seedLiveTree } from '../Nexus/liveTree'
import { closeSession, openSession } from '../Nexus/session'
import { join } from '../Paths/posix'
import { readValue } from '../Platform/localState'
import { installStores, NO_STORES } from '../Platform/stores'
import { tempRoot } from '../Testing/hostFs'
import { memoryStores } from '../Testing/memoryStores'
import {
  memorySecrets,
  TEST_KDF,
  TEST_PUBLIC_KEY,
  testDevice,
  type TestSecrets,
} from '../Testing/syncDevice'
import { makeTree } from '../Testing/testTree'
import { replyOf } from '../Testing/transportReplies'
import type { SyncHost } from './Client/call'
import { forgetKeys, heldRing, passwordName, ringName } from './Client/keyring'
import type { DeviceRecord, InfoRecord } from './Contract/wire'
import { deriveWrappingKey } from './Keys/kdf'
import { mintKey, wrapForDevice, wrapForPassword } from './Keys/ring'
import { stopSession } from './Client/session'
import { currentStatus } from './Client/status'
import { syncHandlers } from './handlers'

const ADDRESS = 'http://127.0.0.1:7473'
const NEXUS = 'nx'
const PASSWORD = 'pw'

let sent: TransportRequest[]
let renamed: string | null
let walkable: string | null
let deviceA: HostDevice
let deviceB: HostDevice
let secretsA: TestSecrets
let secretsB: TestSecrets

const record = (device: HostDevice, approved: boolean): DeviceRecord => ({
  id: device.id,
  publicKey: device.publicKey,
  name: device.name,
  x25519: device.x25519,
  approved,
  role: 'owner',
})

interface Hub {
  approved: boolean
  devices: DeviceRecord[]
  info: InfoRecord | null
}

const newHub = (devices: DeviceRecord[] = []): Hub => ({ approved: true, devices, info: null })

async function seedInfo(hub: Hub, holders: HostDevice[]): Promise<void> {
  const key = mintKey()
  const ring = await wrapForPassword([key], await deriveWrappingKey(PASSWORD, TEST_KDF))
  for (const holder of holders) {
    ring.push(...(await wrapForDevice([key], { deviceId: holder.id, x25519: holder.x25519 })))
  }
  hub.info = { version: 1, protocol: 1, kdf: TEST_KDF, historyDays: 90, ring }
}

type Reply = Omit<TransportReply, 'bytes'>
type Answer = (req: TransportRequest) => Reply | Promise<Reply>

const found = (body: object): Reply => ({ status: 200, body: JSON.stringify(body) })
const missing: Reply = { status: 404, body: '{"error":"not-found"}' }

function hubAnswer(hub: Hub): Answer {
  return (req) => {
    const path = new URL(req.url).pathname
    const body = JSON.parse(String(req.body ?? '{}')) as {
      deviceId?: string
      base?: number
      add?: InfoRecord['ring']
      create?: Omit<InfoRecord, 'version'>
    }
    switch (path) {
      case '/connect':
        return found({ approved: hub.approved })
      case '/devices':
        return hub.approved ? found({ devices: hub.devices }) : missing
      case '/info':
        if (body.create === undefined) return hub.info ? found({ info: hub.info }) : missing
        if (hub.info) return { status: 409, body: '{"error":"exists"}' }
        hub.info = { version: 1, ...body.create }
        return found({ info: hub.info })
      case '/approve': {
        const target = hub.devices.find((d) => d.id === body.deviceId)
        if (target) target.approved = true
        return found({ devices: hub.devices })
      }
      case '/revoke':
        hub.devices = hub.devices.filter((d) => d.id !== body.deviceId)
        if (hub.info) {
          hub.info = {
            ...hub.info,
            version: hub.info.version + 1,
            ring: hub.info.ring.filter((e) => e.holder !== body.deviceId),
          }
        }
        return found({ devices: hub.devices })
      case '/pull':
        return new Promise((resolve) =>
          setTimeout(() => resolve(found({ changes: [], cursor: 0, hasMore: false })), 20),
        )
      case '/store':
        return found({ outcomes: [], seq: 0 })
      case '/ring':
        if (hub.info === null) return missing
        if (hub.info.version !== body.base) return { status: 409, body: '{"error":"stale"}' }
        hub.info = {
          ...hub.info,
          version: hub.info.version + 1,
          ring: [...hub.info.ring, ...(body.add ?? [])],
        }
        return found({ info: hub.info })
      default:
        return missing
    }
  }
}

function host(answer: Answer, device?: HostDevice, secrets?: TestSecrets): HostContext {
  const transport = async (req: TransportRequest): Promise<TransportReply> => {
    sent.push(req)
    return replyOf(await answer(req))
  }
  return {
    device: device ?? deviceA,
    secrets: secrets ?? secretsA,
    transport,
    push: () => {},
  } as unknown as HostContext
}

const canned =
  (status: number, body: string): Answer =>
  () => ({ status, body })

const unwrap = async <T>(r: unknown): Promise<T> => {
  const result = (await r) as { ok: boolean; value: T; error?: { code: string } }
  expect(result.ok, JSON.stringify(result.error)).toBe(true)
  return result.value
}

const refuse = async (r: unknown): Promise<{ code: string; message: string }> => {
  const result = (await r) as { ok: boolean; error: { code: string; message: string } }
  expect(result.ok).toBe(false)
  return result.error
}

const urls = (): string[] => sent.map((r) => new URL(r.url).pathname)

beforeEach(async () => {
  sent = []
  renamed = null
  walkable = null
  secretsA = memorySecrets()
  secretsB = memorySecrets()
  deviceA = await testDevice('fe1c', 'Recorder', (next) => {
    renamed = next
  })
  deviceB = await testDevice('bb2d', 'Studio')
  installStores(memoryStores().stores)
  await openSession('/x')
  seedLiveTree(makeTree())
})
afterEach(async () => {
  stopSession()
  await forgetKeys({ secrets: memorySecrets() } as unknown as SyncHost, NEXUS)
  dropLiveTree()
  closeSession()
  installStores(NO_STORES)
  if (walkable !== null) await rm(walkable, { recursive: true, force: true })
})

describe('sync:state', () => {
  it('answers an unbound nexus with no binding and a device carrying no function', async () => {
    const state = await unwrap<{ device: object; binding: unknown; status: object }>(
      syncHandlers['sync:state'](host(canned(200, '{}'))),
    )
    expect(state.binding).toBeNull()
    expect(state.status).toEqual({ state: 'off' })
    expect(state.device).toEqual({ id: 'fe1c', publicKey: TEST_PUBLIC_KEY, name: 'Recorder' })
    expect(Object.values(state.device).some((v) => typeof v === 'function')).toBe(false)
    expect(sent).toEqual([])
  })

  it('walks the nexus itself when the live tree was dropped', async () => {
    walkable = tempRoot('pom-sync-')
    await mkdir(join(walkable, '.nexus'), { recursive: true })
    await writeFile(join(walkable, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx1' }))
    await openSession(walkable)
    dropLiveTree()
    const state = await unwrap<{ binding: unknown }>(
      syncHandlers['sync:state'](host(canned(200, '{}'))),
    )
    expect(state.binding).toBeNull()
  })

  it('refuses when the host holds no device identity', async () => {
    const error = await refuse(
      syncHandlers['sync:state']({ ...host(canned(200, '{}')), device: null } as HostContext),
    )
    expect(error.code).toBe('operation-failed')
    expect(error.message).toBe('This device has no identity; the keychain refused at launch.')
  })

  it('keeps its keys when the server answers 401 rather than 404', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [deviceA])
    await unwrap(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD))
    const state = await unwrap<{ binding: { state: string }; status: { reason?: string } }>(
      syncHandlers['sync:state'](host(canned(401, '{"error":"unauthorized"}'))),
    )
    expect(state.binding.state).toBe('unreachable')
    expect(state.status.reason).toBeUndefined()
    expect(secretsA.map.has(ringName(NEXUS))).toBe(true)
  })

  it('forgets its keys and reports the revoked reason when the hub reports it revoked', async () => {
    const hub = newHub()
    await seedInfo(hub, [deviceA])
    hub.devices = [record(deviceA, true)]
    await unwrap(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD))
    expect(secretsA.map.has(ringName(NEXUS))).toBe(true)
    hub.approved = false
    const state = await unwrap<{ status: { reason?: string; why?: string } }>(
      syncHandlers['sync:state'](host(hubAnswer(hub))),
    )
    expect(state.status.reason).toBe('revoked')
    expect(state.status.why).toBe('This device was revoked.')
    expect([...secretsA.map.keys()]).toEqual([])
    expect(heldRing(NEXUS)).toBeNull()
  })
})

describe('sync:connect', () => {
  it('writes the binding on a 200 and reports the list the server answers', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [deviceA])
    const state = await unwrap<{ binding: { state: string; devices: unknown[] } }>(
      syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD),
    )
    expect(state.binding.state).toBe('approved')
    expect(state.binding.devices).toHaveLength(1)
    expect(readValue('sync')).toEqual({ address: ADDRESS, pin: null, cursor: 0 })
  })

  it('creates the info record with one password entry on the first connect', async () => {
    const hub = newHub([record(deviceA, true)])
    await unwrap(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD))
    expect(hub.info?.historyDays).toBe(90)
    expect(hub.info?.ring.map((e) => e.holder)).toEqual(['password', deviceA.id])
    expect(new Set(hub.info?.ring.map((e) => e.keyId)).size).toBe(1)
    expect(heldRing(NEXUS)?.keys).toHaveLength(1)
  })

  it('refuses a wrong password and writes no binding', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [])
    const error = await refuse(
      syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, 'not-the-password'),
    )
    expect(error.message).toBe('The Nexus password is wrong.')
    expect(readValue('sync')).toBeNull()
    expect(secretsA.map.has(passwordName(NEXUS))).toBe(false)
  })

  it('refuses a nexus whose record it cannot open without a password', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [])
    const error = await refuse(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS))
    expect(error.message).toBe('A Nexus password is required.')
    expect(readValue('sync')).toBeNull()
  })

  it('refuses a wrong password on a device whose own wrap already opens the ring', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [deviceA])
    await unwrap(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS))
    expect(secretsA.map.has(passwordName(NEXUS))).toBe(false)
    const error = await refuse(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, 'typo'))
    expect(error.message).toBe('The Nexus password is wrong.')
    expect(secretsA.map.has(passwordName(NEXUS))).toBe(false)
  })

  it('re-validates the password after a disconnect drops the held ring', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [deviceA])
    const ctx = host(hubAnswer(hub))
    await unwrap(syncHandlers['sync:connect'](ctx, ADDRESS, PASSWORD))
    await unwrap(syncHandlers['sync:disconnect'](ctx))
    expect(heldRing(NEXUS)).toBeNull()
    const error = await refuse(syncHandlers['sync:connect'](ctx, ADDRESS, 'typo'))
    expect(error.message).toBe('The Nexus password is wrong.')
    expect(readValue('sync')).toBeNull()
    await unwrap(syncHandlers['sync:connect'](ctx, ADDRESS, PASSWORD))
    expect(heldRing(NEXUS)).not.toBeNull()
  })

  it('reads a 404 from the list as awaiting approval', async () => {
    const hub = newHub()
    hub.approved = false
    const state = await unwrap<{ binding: { state: string } }>(
      syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS),
    )
    expect(state.binding.state).toBe('pending')
  })

  it('refuses without writing when the server does not answer', async () => {
    const ctx = host(() => Promise.reject(new Error('down')))
    await refuse(syncHandlers['sync:connect'](ctx, ADDRESS))
    expect(readValue('sync')).toBeNull()
  })

  it('reports a bound server that stops answering as unreachable, carrying its text', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [deviceA])
    await syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD)
    const ctx = host(() => Promise.reject(new Error('down')))
    const state = await unwrap<{ binding: { state: string; why: string } }>(
      syncHandlers['sync:state'](ctx),
    )
    expect(state.binding.state).toBe('unreachable')
    expect(state.binding.why).toContain('down')
  })

  it('reads a 200 that carries no list as unreachable', async () => {
    const state = await unwrap<{ binding: { state: string; why: string } }>(
      syncHandlers['sync:connect'](host(canned(200, '{}')), ADDRESS),
    )
    expect(state.binding.state).toBe('unreachable')
    expect(state.binding.why).toContain('200')
  })
})

describe('sync:now', () => {
  it('answers the loop status from sync:state', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [deviceA])
    await unwrap(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD))

    const state = await unwrap<{ status: { state: string } }>(
      syncHandlers['sync:now'](host(hubAnswer(hub))),
    )

    expect(state.status.state).toBe(currentStatus().state)
  })
})

describe('sync:disconnect', () => {
  it('clears the binding row', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [deviceA])
    const ctx = host(hubAnswer(hub))
    await syncHandlers['sync:connect'](ctx, ADDRESS, PASSWORD)
    const state = await unwrap<{ binding: unknown }>(syncHandlers['sync:disconnect'](ctx))
    expect(state.binding).toBeNull()
    expect(readValue('sync')).toBeNull()
  })
})

describe('sync:approve', () => {
  it('refuses an empty id without reaching the server', async () => {
    await refuse(syncHandlers['sync:approve'](host(canned(200, '{}')), '  '))
    expect(sent).toEqual([])
  })

  it('refuses while the nexus is bound to no server', async () => {
    await refuse(syncHandlers['sync:approve'](host(canned(200, '{}')), 'ab'))
    expect(sent).toEqual([])
  })

  it('wraps the ring to an approved device that then unwraps it', async () => {
    const hub = newHub([record(deviceA, true), record(deviceB, false)])
    await unwrap(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD))
    sent = []
    const state = await unwrap<{ binding: { state: string }; status: { why?: string } }>(
      syncHandlers['sync:approve'](host(hubAnswer(hub)), deviceB.id),
    )
    expect(state.binding.state).toBe('approved')
    expect(state.status.why).toBeUndefined()
    expect(urls()).toEqual(['/devices', '/info', '/ring', '/approve'])
    expect(hub.info?.ring.filter((e) => e.holder === deviceB.id)).toHaveLength(1)

    await forgetKeys({ secrets: memorySecrets() } as unknown as SyncHost, NEXUS)
    const joined = await unwrap<{ binding: { state: string } }>(
      syncHandlers['sync:connect'](host(hubAnswer(hub), deviceB, secretsB), ADDRESS),
    )
    expect(joined.binding.state).toBe('approved')
    expect(secretsB.map.has(ringName(NEXUS))).toBe(true)
    expect(secretsB.map.has(passwordName(NEXUS))).toBe(false)
    expect(heldRing(NEXUS)?.keys).toHaveLength(1)
  })

  it('reports a device with no agreement key rather than wrapping the ring to it', async () => {
    const bare = { ...record(deviceB, false), x25519: undefined }
    const hub = newHub([record(deviceA, true), bare])
    await unwrap(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD))
    const state = await unwrap<{ status: { why?: string } }>(
      syncHandlers['sync:approve'](host(hubAnswer(hub)), deviceB.id),
    )
    expect(state.status.why).toBe(
      'That device holds no agreement key; it needs the Nexus password.',
    )
  })

  it('answers a refused approve from a fresh list rather than from the refusal', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [deviceA])
    await syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD)
    sent = []
    const answer = hubAnswer(hub)
    const ctx = host((req) =>
      req.url.endsWith('/approve') ? { status: 409, body: '{"error":"revoked"}' } : answer(req),
    )
    const state = await unwrap<{ binding: { state: string } }>(
      syncHandlers['sync:approve'](ctx, 'ab'),
    )
    expect(urls()).toEqual(['/devices', '/info', '/approve', '/devices'])
    expect(state.binding.state).toBe('approved')
  })
})

describe('sync:revoke', () => {
  it('refuses a revoke when this device holds no password', async () => {
    const hub = newHub([record(deviceA, true), record(deviceB, true)])
    await seedInfo(hub, [deviceA])
    await unwrap(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS))
    sent = []
    const error = await refuse(syncHandlers['sync:revoke'](host(hubAnswer(hub)), deviceB.id))
    expect(error.message).toBe('The Nexus password is needed to rotate the ring.')
    expect(sent).toEqual([])
  })

  it('refuses to rotate under a stored password the ring does not open', async () => {
    const hub = newHub([record(deviceA, true), record(deviceB, true)])
    await seedInfo(hub, [deviceA, deviceB])
    await unwrap(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD))
    secretsA.map.set(passwordName(NEXUS), 'typo')
    const version = hub.info?.version
    sent = []
    const state = await unwrap<{ status: { why?: string } }>(
      syncHandlers['sync:revoke'](host(hubAnswer(hub)), deviceB.id),
    )
    expect(state.status.why).toBe('The stored Nexus password does not open the ring.')
    expect(urls()).toEqual(['/devices', '/info'])
    expect(hub.info?.version).toBe(version)
    expect(hub.devices.map((d) => d.id)).toContain(deviceB.id)
  })

  it('reports an approved device the rotation could not reach', async () => {
    const bare = { ...record(deviceB, true), x25519: undefined }
    const leaving = { ...record(deviceB, true), id: 'cc3e' }
    const hub = newHub([record(deviceA, true), bare, leaving])
    await seedInfo(hub, [deviceA])
    await unwrap(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD))
    const state = await unwrap<{ status: { reason?: string; why?: string } }>(
      syncHandlers['sync:revoke'](host(hubAnswer(hub)), 'cc3e'),
    )
    expect(state.status.reason).toBe('password')
    expect(state.status.why).toBe(
      'Some approved devices hold no agreement key and need the Nexus password.',
    )
  })

  it('rotates the ring on revoke for the remaining device alone', async () => {
    const hub = newHub([record(deviceA, true), record(deviceB, true)])
    await seedInfo(hub, [deviceA, deviceB])
    await unwrap(syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD))
    const first = String(hub.info?.ring[0].keyId)
    sent = []
    await unwrap(syncHandlers['sync:revoke'](host(hubAnswer(hub)), deviceB.id))
    expect(urls()).toEqual(['/devices', '/info', '/ring', '/revoke'])
    const fresh = hub.info?.ring.filter((e) => e.keyId !== first) ?? []
    expect(fresh.map((e) => e.holder)).toEqual(['password', deviceA.id])
    expect(hub.info?.ring.some((e) => e.holder === deviceB.id)).toBe(false)
    expect(heldRing(NEXUS)?.keys).toHaveLength(2)
  })
})

describe('sync:renameDevice', () => {
  it('refuses a name past sixty-four characters', async () => {
    const error = await refuse(
      syncHandlers['sync:renameDevice'](host(canned(200, '{}')), 'n'.repeat(65)),
    )
    expect(error.code).toBe('invalid-name')
    expect(sent).toEqual([])
  })

  it('re-issues connect against a bound server so the new name reaches its row', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [deviceA])
    await syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD)
    sent = []
    const state = await unwrap<{ device: { name: string } }>(
      syncHandlers['sync:renameDevice'](host(hubAnswer(hub)), '  Studio  '),
    )
    expect(renamed).toBe('Studio')
    expect(state.device.name).toBe('Studio')
    expect(JSON.parse(String(sent[0].body ?? '{}')).name).toBe('Studio')
    expect(sent[0].url).toBe(`${ADDRESS}/connect`)
  })

  it('reports a downed bound server from the re-issued connect alone', async () => {
    const hub = newHub([record(deviceA, true)])
    await seedInfo(hub, [deviceA])
    await syncHandlers['sync:connect'](host(hubAnswer(hub)), ADDRESS, PASSWORD)
    sent = []
    const ctx = host(() => Promise.reject(new Error('down')))
    const state = await unwrap<{
      device: { name: string }
      binding: { state: string; why: string }
    }>(syncHandlers['sync:renameDevice'](ctx, 'Studio'))
    expect(sent).toHaveLength(1)
    expect(sent[0].url).toBe(`${ADDRESS}/connect`)
    expect(state.device.name).toBe('Studio')
    expect(state.binding.state).toBe('unreachable')
    expect(state.binding.why).toContain('down')
  })

  it('renames an unbound device without reaching any server', async () => {
    const state = await unwrap<{ device: { name: string } }>(
      syncHandlers['sync:renameDevice'](host(canned(200, '{}')), 'Studio'),
    )
    expect(renamed).toBe('Studio')
    expect(state.device.name).toBe('Studio')
    expect(sent).toEqual([])
  })
})
