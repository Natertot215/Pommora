import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { canonical, start } from './server.ts'

const NEXUS = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const OTHER_NEXUS = '01ARZ3NDEKTSV4RRFFQ69G5FB0'

const dataDir = mkdtempSync(join(tmpdir(), 'pommora-sync-'))
let running: { port: number; close(): Promise<void> }
let base = ''

type Outcome = { status: number; body: unknown }

function signer(name: string) {
  const pair = generateKeyPairSync('ed25519')
  const jwk = pair.publicKey.export({ format: 'jwk' })
  const publicKey = String(jwk.x)
  const id = createHash('sha256').update(Buffer.from(publicKey, 'base64url')).digest('hex')

  async function call(
    path: string,
    body: unknown,
    tweak?: { ts?: number; signature?: string },
  ): Promise<Outcome> {
    const json = body === undefined ? '' : JSON.stringify(body)
    const ts = tweak?.ts ?? Date.now()
    const raw = Buffer.from(json, 'utf8')
    const signature =
      tweak?.signature ??
      sign(null, Buffer.from(canonical('POST', path, raw, ts), 'utf8'), pair.privateKey).toString(
        'base64url',
      )
    const response = await fetch(base + path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-pommora-device': id,
        'x-pommora-timestamp': String(ts),
        'x-pommora-signature': signature,
      },
      body: json,
    })
    const text = await response.text()
    return { status: response.status, body: text.length > 0 ? JSON.parse(text) : null }
  }

  return { id, publicKey, name, call }
}

const first = signer('First Mac')
const second = signer('Second Mac')

const connectBody = (s: typeof first) => ({
  nexusId: NEXUS,
  publicKey: s.publicKey,
  name: s.name,
})

function names(body: unknown): { id: string; approved: boolean }[] {
  return (body as { devices: { id: string; approved: boolean }[] }).devices.map((d) => ({
    id: d.id,
    approved: d.approved,
  }))
}

async function boot() {
  running = await start({ dataDir, port: 0 })
  base = `http://127.0.0.1:${running.port}`
}

beforeAll(boot)

afterAll(async () => {
  await running.close()
})

describe('the sync server', () => {
  it('does not run itself under the test runner', () => {
    expect(import.meta.main).toBeFalsy()
  })

  it('matches the shared canonical vectors', () => {
    const fixture = JSON.parse(
      readFileSync(fileURLToPath(new URL('../Core/Sync/vectors.json', import.meta.url)), 'utf8'),
    ) as {
      canonical: {
        method: string
        path: string
        body: string
        timestampMs: number
        canonical: string
      }[]
    }
    for (const vector of fixture.canonical) {
      expect(
        canonical(vector.method, vector.path, Buffer.from(vector.body, 'utf8'), vector.timestampMs),
      ).toBe(vector.canonical)
    }
  })

  it('approves the first device of a Nexus by construction', async () => {
    const outcome = await first.call('/connect', connectBody(first))
    expect(outcome.status).toBe(200)
    expect(outcome.body).toEqual({ approved: true })
  })

  it('leaves a second device pending and lists it', async () => {
    const outcome = await second.call('/connect', connectBody(second))
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
    expect(names(gone.body)).not.toContainEqual({ id: second.id, approved: true })
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
    const outcome = await first.call('/devices', { nexusId: NEXUS, pad: 'x'.repeat(8192) })
    expect(outcome.status).toBe(413)
  })

  it('keeps memberships across a restart', async () => {
    await running.close()
    await boot()
    const listed = await first.call('/devices', { nexusId: NEXUS })
    expect(listed.status).toBe(200)
    expect(names(listed.body)).toEqual([{ id: first.id, approved: true }])
  })
})
