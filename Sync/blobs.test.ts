import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { bootWith, type Hub, NEXUS, signer } from './Testing/hub.ts'
import { BLOB_CAP, blobPath, sha256Hex } from './wire.ts'

const MEBIBYTE = Buffer.alloc(1024 * 1024, 7)
const DIGEST = sha256Hex(MEBIBYTE)

let hub: Hub

const owner = signer('Owner Mac')
const reader = signer('Reader Mac')

const spoolFiles = (): string[] => readdirSync(join(hub.dataDir, 'spool'))

const INFO = {
  protocol: 1,
  kdf: { hash: 'SHA-256', iterations: 600_000, salt: 'c2FsdA' },
  historyDays: 30,
  ring: [],
}

beforeAll(async () => {
  hub = await bootWith({ owner, reader })
  await owner.call('/info', { nexusId: NEXUS, create: INFO })
})

afterAll(async () => {
  await hub.close()
})

describe('the hub blob routes', () => {
  it('round-trips a one-mebibyte blob under its own hash', async () => {
    const put = await owner.put(NEXUS, 'k1', MEBIBYTE)
    expect(put.status).toBe(200)
    expect(put.body).toEqual({ sha256: DIGEST, size: MEBIBYTE.length })
    const got = await owner.get(NEXUS, DIGEST)
    expect(got.status).toBe(200)
    expect(sha256Hex(got.bytes)).toBe(DIGEST)
    expect(got.bytes.length).toBe(MEBIBYTE.length)
  })

  it('answers 404 for a hash it does not hold', async () => {
    expect((await owner.get(NEXUS, 'f'.repeat(64))).status).toBe(404)
  })

  it('refuses a put whose signature is not over the path hash, before reading its bytes', async () => {
    const put = await owner.put(NEXUS, 'k1', Buffer.from('elsewhere'), blobPath(NEXUS, DIGEST))
    expect(put.status).toBe(401)
    expect(spoolFiles()).toEqual([])
  })

  it('refuses signed bytes whose hash is not the path', async () => {
    const put = await owner.put(NEXUS, 'k1', Buffer.from('elsewhere'), undefined, MEBIBYTE)
    expect(put.status).toBe(400)
    expect(put.body).toEqual({ error: 'hash-mismatch' })
  })

  it('refuses a put carrying no key id', async () => {
    const put = await owner.put(NEXUS, '', Buffer.from('keyless'))
    expect(put.status).toBe(400)
  })

  it('refuses a body over the cap and leaves no spool file', async () => {
    const put = await owner.put(NEXUS, 'k1', Buffer.alloc(BLOB_CAP + 1, 3))
    expect(put.status).toBe(413)
    expect(spoolFiles()).toEqual([])
  })

  it('lets a reader read and refuses it a put', async () => {
    expect((await reader.get(NEXUS, DIGEST)).status).toBe(200)
    expect((await reader.put(NEXUS, 'k1', Buffer.from('reader bytes'))).status).toBe(404)
  })

  it('refuses bytes for a Nexus with no info record', async () => {
    const other = '01ARZ3NDEKTSV4RRFFQ69G5FB2'
    await owner.call('/connect', {
      nexusId: other,
      publicKey: owner.publicKey,
      name: owner.name,
      x25519: owner.x25519,
    })
    expect((await owner.put(other, 'k1', Buffer.from('homeless'))).status).toBe(404)
    expect((await owner.get(other, DIGEST)).status).toBe(404)
  })

  it('leaves no spool file behind', () => {
    expect(spoolFiles()).toEqual([])
  })
})
