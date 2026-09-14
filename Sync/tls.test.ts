import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { boot, signer } from './Testing/hub.ts'

const NEXUS = '01ARZ3NDEKTSV4RRFFQ69G5FAV'

const cert = readFileSync(new URL('./Testing/cert.pem', import.meta.url), 'utf8')
const key = readFileSync(new URL('./Testing/key.pem', import.meta.url), 'utf8')

let hub: Awaited<ReturnType<typeof boot>>

beforeAll(async () => {
  hub = await boot(undefined, { cert, key })
})

afterAll(async () => {
  await hub.close()
})

describe('the hub over TLS', () => {
  it('serves the roster over TLS to a client pinning its fingerprint', async () => {
    const device = signer('First Mac')
    const outcome = await device.call('/connect', {
      nexusId: NEXUS,
      publicKey: device.publicKey,
      name: device.name,
    })
    expect(outcome.status).toBe(200)
    expect(outcome.body).toEqual({ approved: true })
    expect(outcome.pin).toBe(hub.pin)
  })
})
