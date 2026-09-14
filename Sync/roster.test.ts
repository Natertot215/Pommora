import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { boot, connectBody, type Hub, NEXUS, setRole, signer } from './Testing/hub.ts'
import { JSON_CAP } from './wire.ts'

const OTHER_NEXUS = '01ARZ3NDEKTSV4RRFFQ69G5FB0'

let hub: Hub

const first = signer('First Mac')
const second = signer('Second Mac')
const third = signer('Third Mac')

function names(body: unknown): { id: string; approved: boolean }[] {
  return (body as { devices: { id: string; approved: boolean }[] }).devices.map((d) => ({
    id: d.id,
    approved: d.approved,
  }))
}

beforeAll(async () => {
  hub = await boot()
})

afterAll(async () => {
  await hub.close()
})

describe('the hub roster', () => {
  it('approves the first device of a Nexus by construction', async () => {
    const outcome = await first.call('/connect', connectBody(first, NEXUS))
    expect(outcome.status).toBe(200)
    expect(outcome.body).toEqual({ approved: true })
  })

  it('leaves a second device pending and lists it', async () => {
    const outcome = await second.call('/connect', connectBody(second, NEXUS))
    expect(outcome.body).toEqual({ approved: false })
    const listed = await first.call('/devices', { nexusId: NEXUS })
    expect(listed.status).toBe(200)
    expect(names(listed.body)).toContainEqual({ id: second.id, approved: false })
  })

  it('refuses a pending device its own list', async () => {
    expect((await second.call('/devices', { nexusId: NEXUS })).status).toBe(404)
  })

  it('approves the second device from the first', async () => {
    const approved = await first.call('/approve', { nexusId: NEXUS, deviceId: second.id })
    expect(approved.status).toBe(200)
    expect(names(approved.body)).toContainEqual({ id: second.id, approved: true })
    expect((await second.call('/devices', { nexusId: NEXUS })).status).toBe(200)
  })

  it('lists the agreement key connect carried', async () => {
    const listed = await first.call('/devices', { nexusId: NEXUS })
    const devices = (listed.body as { devices: { id: string; x25519?: string }[] }).devices
    expect(devices.find((d) => d.id === first.id)?.x25519).toBe(first.x25519)
  })

  it('refuses a reader the approve route', async () => {
    await third.call('/connect', connectBody(third, NEXUS))
    expect((await first.call('/approve', { nexusId: NEXUS, deviceId: third.id })).status).toBe(200)
    setRole(hub.dataDir, third.id, 'reader')
    expect((await third.call('/devices', { nexusId: NEXUS })).status).toBe(200)
    expect((await third.call('/approve', { nexusId: NEXUS, deviceId: second.id })).status).toBe(404)
  })

  it('refuses an editor the revoke route', async () => {
    expect((await second.call('/revoke', { nexusId: NEXUS, deviceId: third.id })).status).toBe(404)
  })

  it('lets the owner revoke', async () => {
    const gone = await first.call('/revoke', { nexusId: NEXUS, deviceId: third.id })
    expect(gone.status).toBe(200)
    expect(names(gone.body).map((d) => d.id)).not.toContain(third.id)
  })

  it('refuses a foreign Nexus id', async () => {
    expect((await first.call('/devices', { nexusId: OTHER_NEXUS })).status).toBe(404)
  })

  it('refuses a device revoking itself', async () => {
    const outcome = await first.call('/revoke', { nexusId: NEXUS, deviceId: first.id })
    expect(outcome.status).toBe(400)
  })

  it('revokes idempotently and forgets the device', async () => {
    const gone = await first.call('/revoke', { nexusId: NEXUS, deviceId: second.id })
    expect(gone.status).toBe(200)
    expect(names(gone.body)).toEqual([{ id: first.id, approved: true }])
    const again = await first.call('/revoke', { nexusId: NEXUS, deviceId: second.id })
    expect(again.status).toBe(200)
    expect(again.body).toEqual(gone.body)
    expect((await second.call('/devices', { nexusId: NEXUS })).status).toBe(404)
  })

  it('answers 409 for an approve of an unknown device', async () => {
    const outcome = await first.call('/approve', { nexusId: NEXUS, deviceId: 'no-such-device' })
    expect(outcome.status).toBe(409)
  })

  it('refuses a stale timestamp', async () => {
    const outcome = await first.call(
      '/devices',
      { nexusId: NEXUS },
      { ts: Date.now() - 6 * 60_000 },
    )
    expect(outcome.status).toBe(401)
  })

  it('refuses a tampered signature', async () => {
    const outcome = await first.call('/devices', { nexusId: NEXUS }, { signature: 'A'.repeat(86) })
    expect(outcome.status).toBe(401)
  })

  it('refuses a body over the cap', async () => {
    const outcome = await first.call('/devices', { nexusId: NEXUS, pad: 'x'.repeat(JSON_CAP) })
    expect(outcome.status).toBe(413)
  })

  it('refuses a connect carrying a malformed agreement key', async () => {
    const fourth = signer('Fourth Mac')
    const outcome = await fourth.call('/connect', {
      ...connectBody(fourth, NEXUS),
      x25519: 'not-a-key',
    })
    expect(outcome.status).toBe(400)
    expect((await first.call('/devices', { nexusId: NEXUS })).body).toEqual({
      devices: [
        {
          id: first.id,
          publicKey: first.publicKey,
          name: first.name,
          x25519: first.x25519,
          approved: true,
          role: 'owner',
        },
      ],
    })
  })

  it('keeps memberships across a restart', async () => {
    await hub.close()
    hub = await boot({ dataDir: hub.dataDir })
    const listed = await first.call('/devices', { nexusId: NEXUS })
    expect(listed.status).toBe(200)
    expect(names(listed.body)).toEqual([{ id: first.id, approved: true }])
  })
})
