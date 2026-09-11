import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type {
  HostContext,
  HostDevice,
  TransportReply,
  TransportRequest,
} from '../Contract/handlers'
import { dropLiveTree, seedLiveTree } from '../Nexus/liveTree'
import { closeSession, openSession } from '../Nexus/session'
import { readValue } from '../Platform/localState'
import { installStores, NO_STORES } from '../Platform/stores'
import { makeTree } from '../Testing/testTree'
import { memoryStores } from '../Testing/memoryStores'
import { syncHandlers } from './handlers'

const PUBLIC_KEY = 'k'.repeat(43)
const ADDRESS = 'http://127.0.0.1:7473'

let sent: TransportRequest[]
let renamed: string | null
let walkable: string | null

const device: HostDevice = {
  id: 'fe1c',
  publicKey: PUBLIC_KEY,
  name: 'Recorder',
  sign: async () => 'sig',
  rename: async (name) => {
    renamed = name
    device.name = name
  },
}

type Answer = (req: TransportRequest) => TransportReply | Promise<TransportReply>

function host(answer: Answer): HostContext {
  const transport = async (req: TransportRequest): Promise<TransportReply> => {
    sent.push(req)
    return answer(req)
  }
  return { device, transport } as HostContext
}

const canned =
  (status: number, body: string): Answer =>
  () => ({ status, body })
const devices = (approved: boolean): string =>
  JSON.stringify({ devices: [{ id: 'fe1c', publicKey: PUBLIC_KEY, name: 'Recorder', approved }] })

const bound: Answer = (req) =>
  req.url.endsWith('/connect')
    ? { status: 200, body: '{"approved":true}' }
    : { status: 200, body: devices(true) }

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

beforeEach(async () => {
  sent = []
  renamed = null
  walkable = null
  device.name = 'Recorder'
  installStores(memoryStores().stores)
  await openSession('/x')
  seedLiveTree(makeTree())
})
afterEach(async () => {
  dropLiveTree()
  closeSession()
  installStores(NO_STORES)
  if (walkable !== null) await rm(walkable, { recursive: true, force: true })
})

describe('sync:state', () => {
  it('answers an unbound nexus with no binding and a device carrying no function', async () => {
    const state = await unwrap<{ device: object; binding: unknown }>(
      syncHandlers['sync:state'](host(canned(200, '{}'))),
    )
    expect(state.binding).toBeNull()
    expect(state.device).toEqual({ id: 'fe1c', publicKey: PUBLIC_KEY, name: 'Recorder' })
    expect(Object.values(state.device).some((v) => typeof v === 'function')).toBe(false)
    expect(sent).toEqual([])
  })

  it('walks the nexus itself when the live tree was dropped', async () => {
    walkable = await mkdtemp(join(tmpdir(), 'pom-sync-'))
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
})

describe('sync:connect', () => {
  it('writes the binding on a 200 and reports the list the server answers', async () => {
    const ctx = host(bound)
    const state = await unwrap<{ binding: { state: string; devices: unknown[] } }>(
      syncHandlers['sync:connect'](ctx, ADDRESS),
    )
    expect(state.binding.state).toBe('approved')
    expect(state.binding.devices).toHaveLength(1)
    expect(readValue<{ address: string }>('sync')).toEqual({ address: ADDRESS })
  })

  it('reads a 404 from the list as awaiting approval', async () => {
    const ctx = host((req) =>
      req.url.endsWith('/connect')
        ? { status: 200, body: '{"approved":false}' }
        : { status: 404, body: '{"error":"not-found"}' },
    )
    const state = await unwrap<{ binding: { state: string } }>(
      syncHandlers['sync:connect'](ctx, ADDRESS),
    )
    expect(state.binding.state).toBe('pending')
  })

  it('refuses without writing when the server does not answer', async () => {
    const ctx = host(() => Promise.reject(new Error('down')))
    await refuse(syncHandlers['sync:connect'](ctx, ADDRESS))
    expect(readValue('sync')).toBeNull()
  })

  it('reports a bound server that stops answering as unreachable, carrying its text', async () => {
    await syncHandlers['sync:connect'](host(bound), ADDRESS)
    const ctx = host(() => Promise.reject(new Error('down')))
    const state = await unwrap<{ binding: { state: string; why: string } }>(
      syncHandlers['sync:state'](ctx),
    )
    expect(state.binding.state).toBe('unreachable')
    expect(state.binding.why).toContain('down')
  })

  it('reads a 200 that carries no list as unreachable', async () => {
    const ctx = host(canned(200, '{}'))
    const state = await unwrap<{ binding: { state: string; why: string } }>(
      syncHandlers['sync:connect'](ctx, ADDRESS),
    )
    expect(state.binding.state).toBe('unreachable')
    expect(state.binding.why).toContain('200')
  })
})

describe('sync:disconnect', () => {
  it('clears the binding row', async () => {
    const ctx = host(bound)
    await syncHandlers['sync:connect'](ctx, ADDRESS)
    const state = await unwrap<{ binding: unknown }>(syncHandlers['sync:disconnect'](ctx))
    expect(state.binding).toBeNull()
    expect(readValue('sync')).toBeNull()
  })
})

describe('sync:approve', () => {
  it('refuses an empty id without reaching the server', async () => {
    await refuse(syncHandlers['sync:approve'](host(canned(200, devices(true))), '  '))
    expect(sent).toEqual([])
  })

  it('refuses while the nexus is bound to no server', async () => {
    await refuse(syncHandlers['sync:approve'](host(canned(200, devices(true))), 'ab'))
    expect(sent).toEqual([])
  })

  it('answers from exactly one request, since its reply already carries the fresh list', async () => {
    const ctx = host(canned(200, '{"approved":true}'))
    await syncHandlers['sync:connect'](ctx, ADDRESS)
    sent = []
    const ctx2 = host(canned(200, devices(true)))
    const state = await unwrap<{ binding: { state: string; devices: unknown[] } }>(
      syncHandlers['sync:approve'](ctx2, 'ab'),
    )
    expect(sent).toHaveLength(1)
    expect(sent[0].url).toBe(`${ADDRESS}/approve`)
    expect(state.binding.state).toBe('approved')
    expect(state.binding.devices).toHaveLength(1)
  })

  it('answers a refused approve from a fresh list rather than from the refusal', async () => {
    await syncHandlers['sync:connect'](host(bound), ADDRESS)
    sent = []
    const ctx = host((req) =>
      req.url.endsWith('/approve')
        ? { status: 409, body: '{"error":"revoked"}' }
        : { status: 200, body: devices(false) },
    )
    const state = await unwrap<{ binding: { state: string; devices: { approved: boolean }[] } }>(
      syncHandlers['sync:approve'](ctx, 'ab'),
    )
    expect(sent.map((r) => r.url)).toEqual([`${ADDRESS}/approve`, `${ADDRESS}/devices`])
    expect(state.binding.state).toBe('approved')
    expect(state.binding.devices[0].approved).toBe(false)
  })
})

describe('sync:revoke', () => {
  it('reaches the revoke route with its one request', async () => {
    const ctx = host(bound)
    await syncHandlers['sync:connect'](ctx, ADDRESS)
    sent = []
    await unwrap(syncHandlers['sync:revoke'](ctx, 'ab'))
    expect(sent).toHaveLength(1)
    expect(sent[0].url.endsWith('/revoke')).toBe(true)
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
    const ctx = host(bound)
    await syncHandlers['sync:connect'](ctx, ADDRESS)
    sent = []
    const state = await unwrap<{ device: { name: string } }>(
      syncHandlers['sync:renameDevice'](ctx, '  Studio  '),
    )
    expect(renamed).toBe('Studio')
    expect(state.device.name).toBe('Studio')
    expect(JSON.parse(sent[0].body ?? '{}').name).toBe('Studio')
    expect(sent[0].url).toBe(`${ADDRESS}/connect`)
  })

  it('reports a downed bound server from the re-issued connect alone', async () => {
    await syncHandlers['sync:connect'](host(bound), ADDRESS)
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
