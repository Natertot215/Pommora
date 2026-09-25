import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { transportRefusal } from './hub.ts'
import { boot, connectBody, NEXUS, signer } from './Testing/hub.ts'

const cert = readFileSync(new URL('./Testing/cert.pem', import.meta.url), 'utf8')
const key = readFileSync(new URL('./Testing/key.pem', import.meta.url), 'utf8')

let hub: Awaited<ReturnType<typeof boot>>

beforeAll(async () => {
  hub = await boot({ tls: { cert, key } })
})

afterAll(async () => {
  await hub.close()
})

describe('the hub over TLS', () => {
  it('serves the roster over TLS to a client pinning its fingerprint', async () => {
    const device = signer('First Mac')
    const outcome = await device.call('/connect', connectBody(device, NEXUS))
    expect(outcome.status).toBe(200)
    expect(outcome.body).toEqual({ approved: true })
    expect(outcome.pin).toBe(hub.pin)
  })
})

describe('the hub transport rule', () => {
  it('refuses to serve plain HTTP on a network host', () => {
    expect(transportRefusal('0.0.0.0', false, false)).toContain('npm run sync:cert')
  })

  it('serves plain HTTP on loopback, with a certificate, or by explicit opt-in', () => {
    expect(transportRefusal('127.0.0.1', false, false)).toBeNull()
    expect(transportRefusal('localhost', false, false)).toBeNull()
    expect(transportRefusal('::1', false, false)).toBeNull()
    expect(transportRefusal('0.0.0.0', true, false)).toBeNull()
    expect(transportRefusal('0.0.0.0', false, true)).toBeNull()
  })
})
