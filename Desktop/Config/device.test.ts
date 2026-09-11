import { createHash, createPublicKey, verify } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readAppConfig } from './appConfig'
import { ensureDevice } from './device'

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(`enc:${s}`),
    decryptString: (b: Buffer) => b.toString().slice(4),
  },
}))

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pom-dev-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe('ensureDevice', () => {
  it('mints once and writes the public half to the config', async () => {
    const device = await ensureDevice(dir)
    expect(device.id).toMatch(/^[0-9a-f]{64}$/)
    expect(device.publicKey).toHaveLength(43)
    const stored = (await readAppConfig(dir)).device
    expect(stored).toEqual({ id: device.id, publicKey: device.publicKey, name: device.name })
  })

  it('gives the device id as the SHA-256 of the raw public key', async () => {
    const device = await ensureDevice(dir)
    const recipe = createHash('sha256')
      .update(Buffer.from(device.publicKey, 'base64url'))
      .digest('hex')
    expect(recipe).toBe(device.id)
  })

  it('returns the same identity on a second call', async () => {
    const first = await ensureDevice(dir)
    const second = await ensureDevice(dir)
    expect(second.id).toBe(first.id)
    expect(second.publicKey).toBe(first.publicKey)
  })

  it('signs a string so the public key verifies it', async () => {
    const device = await ensureDevice(dir)
    const signature = await device.sign('x')
    const publicKey = createPublicKey({
      key: { kty: 'OKP', crv: 'Ed25519', x: device.publicKey },
      format: 'jwk',
    })
    const sig = Buffer.from(signature, 'base64url')
    expect(verify(null, Buffer.from('x'), publicKey, sig)).toBe(true)
  })

  it('persists a rename', async () => {
    const device = await ensureDevice(dir)
    await device.rename('Studio Mac')
    expect(device.name).toBe('Studio Mac')
    expect((await readAppConfig(dir)).device?.name).toBe('Studio Mac')
    expect((await ensureDevice(dir)).name).toBe('Studio Mac')
  })

  it('re-mints and reports once when the secret store lost the key', async () => {
    const first = await ensureDevice(dir)
    rmSync(join(dir, 'secrets.json'))
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    const second = await ensureDevice(dir)
    expect(second.id).not.toBe(first.id)
    expect(reported).toHaveBeenCalledTimes(1)
  })
})
