import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { STORE_FILE } from './Store/open.ts'
import { boot, connectBody, NEXUS, signer } from './Testing/hub.ts'

const CREATE = {
  protocol: 1,
  kdf: { hash: 'SHA-256', iterations: 600_000, salt: 'c2FsdA' },
  historyDays: 30,
  ring: [{ keyId: 'k1', holder: 'password', wrapped: 'd3JhcHBlZA', createdMs: 1 }],
}

let hub: Awaited<ReturnType<typeof boot>>

const owner = signer('Owner Mac')
const reader = signer('Reader Mac')

function setRole(fingerprint: string, role: string): void {
  const db = new DatabaseSync(join(hub.dataDir, STORE_FILE))
  db.prepare('UPDATE membership SET role = ? WHERE nexus_id = ? AND fingerprint = ?').run(
    role,
    NEXUS,
    fingerprint,
  )
  db.close()
}

const infoOf = (body: unknown) => (body as { info: { version: number; ring: unknown[] } }).info

beforeAll(async () => {
  hub = await boot()
  await owner.call('/connect', connectBody(owner, NEXUS))
  await reader.call('/connect', connectBody(reader, NEXUS))
  await owner.call('/approve', { nexusId: NEXUS, deviceId: reader.id })
  setRole(reader.id, 'reader')
})

afterAll(async () => {
  await hub.close()
})

describe('the hub info record', () => {
  it('answers 404 before the record exists', async () => {
    expect((await owner.call('/info', { nexusId: NEXUS })).status).toBe(404)
  })

  it('creates the info record once', async () => {
    const made = await owner.call('/info', { nexusId: NEXUS, create: CREATE })
    expect(made.status).toBe(200)
    expect(infoOf(made.body)).toEqual({ version: 1, ...CREATE })
    expect((await owner.call('/info', { nexusId: NEXUS, create: CREATE })).status).toBe(409)
    expect(infoOf((await owner.call('/info', { nexusId: NEXUS })).body).version).toBe(1)
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
    expect(infoOf((await owner.call('/info', { nexusId: NEXUS })).body).ring).toHaveLength(3)
    expect((await owner.call('/revoke', { nexusId: NEXUS, deviceId: reader.id })).status).toBe(200)
    const after = infoOf((await owner.call('/info', { nexusId: NEXUS })).body)
    expect(after.ring.map((e) => (e as { holder: string }).holder)).toEqual(['password', owner.id])
  })
})
