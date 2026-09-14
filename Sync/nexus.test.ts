import type * as Wire from '@pommora/core/Sync/Contract/wire'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { bootWith, type Hub, NEXUS, signer } from './Testing/hub.ts'

const CREATE = {
  protocol: 1,
  kdf: { hash: 'SHA-256', iterations: 600_000, salt: 'c2FsdA' },
  historyDays: 30,
  ring: [{ keyId: 'k1', holder: 'password', wrapped: 'd3JhcHBlZA', createdMs: 1 }],
}

let hub: Hub

const owner = signer('Owner Mac')
const editor = signer('Editor Mac')
const reader = signer('Reader Mac')

const infoOf = (body: unknown): Wire.InfoRecord => (body as { info: Wire.InfoRecord }).info

const read = async (): Promise<Wire.InfoRecord> =>
  infoOf((await owner.call('/info', { nexusId: NEXUS })).body)

beforeAll(async () => {
  hub = await bootWith({ owner, editor, reader })
})

afterAll(async () => {
  await hub.close()
})

describe('the hub info record', () => {
  it('answers 404 before the record exists', async () => {
    expect((await owner.call('/info', { nexusId: NEXUS })).status).toBe(404)
  })

  it('refuses an editor the create', async () => {
    expect((await editor.call('/info', { nexusId: NEXUS, create: CREATE })).status).toBe(404)
    expect((await owner.call('/info', { nexusId: NEXUS })).status).toBe(404)
  })

  it('creates the info record once', async () => {
    const made = await owner.call('/info', { nexusId: NEXUS, create: CREATE })
    expect(made.status).toBe(200)
    expect(infoOf(made.body)).toEqual({ version: 1, ...CREATE })
    expect((await owner.call('/info', { nexusId: NEXUS, create: CREATE })).status).toBe(409)
    expect((await read()).version).toBe(1)
  })

  it('refuses a malformed create', async () => {
    const outcome = await owner.call('/info', {
      nexusId: NEXUS,
      create: { ...CREATE, kdf: { hash: 'SHA-1', iterations: 1, salt: 's' } },
    })
    expect(outcome.status).toBe(400)
  })

  it('appends a ring entry and bumps the version', async () => {
    const added = await owner.call('/ring', {
      nexusId: NEXUS,
      base: 1,
      add: [{ keyId: 'k2', holder: owner.id, wrapped: 'dHdv', createdMs: 2 }],
    })
    expect(added.status).toBe(200)
    expect(infoOf(added.body).version).toBe(2)
    expect(infoOf(added.body).ring).toHaveLength(2)
  })

  it('refuses a repeated key id and holder and leaves the stored entry alone', async () => {
    const repeat = await owner.call('/ring', {
      nexusId: NEXUS,
      base: 2,
      add: [{ keyId: 'k2', holder: owner.id, wrapped: 'b3ZlcndyaXR0ZW4', createdMs: 9 }],
    })
    expect(repeat.status).toBe(409)
    expect((repeat.body as { error: string }).error).toBe('exists')
    const after = await read()
    expect(after.version).toBe(2)
    expect(after.ring.find((e) => e.keyId === 'k2')?.wrapped).toBe('dHdv')
  })

  it('refuses a stale ring base with the current record', async () => {
    const stale = await owner.call('/ring', {
      nexusId: NEXUS,
      base: 1,
      add: [{ keyId: 'k3', holder: owner.id, wrapped: 'dGhyZWU', createdMs: 3 }],
    })
    expect(stale.status).toBe(409)
    expect((stale.body as { error: string }).error).toBe('stale')
    expect(infoOf(stale.body).version).toBe(2)
    expect(infoOf(stale.body).ring).toHaveLength(2)
  })

  it('lets a reader read the record and refuses it the ring', async () => {
    expect((await reader.call('/info', { nexusId: NEXUS })).status).toBe(200)
    const refused = await reader.call('/ring', {
      nexusId: NEXUS,
      base: 2,
      add: [{ keyId: 'k4', holder: reader.id, wrapped: 'Zm91cg', createdMs: 4 }],
    })
    expect(refused.status).toBe(404)
  })

  it('drops the revoked device from the ring', async () => {
    await owner.call('/ring', {
      nexusId: NEXUS,
      base: 2,
      add: [{ keyId: 'k2', holder: reader.id, wrapped: 'cmVhZGVy', createdMs: 5 }],
    })
    expect((await read()).ring).toHaveLength(3)
    expect((await owner.call('/revoke', { nexusId: NEXUS, deviceId: reader.id })).status).toBe(200)
    expect((await read()).ring.map((e) => e.holder)).toEqual(['password', owner.id])
  })
})
