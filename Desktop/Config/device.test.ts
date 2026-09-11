import { createHash, createPublicKey, verify } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as appConfig from './appConfig'
import { readAppConfig } from './appConfig'
import { ensureDevice } from './device'

const keychain = vi.hoisted(() => ({ available: true, denyOnce: false }))
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => keychain.available,
    encryptString: (s: string) => Buffer.from(`enc:${s}`),
    decryptString: (b: Buffer) => {
      if (keychain.denyOnce) {
        keychain.denyOnce = false
        throw new Error('denied')
      }
      if (!keychain.available) throw new Error('unavailable')
      return b.toString().slice(4)
    },
  },
}))

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pom-dev-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  keychain.available = true
  keychain.denyOnce = false
  vi.restoreAllMocks()
})

function verifies(publicKey: string, canonical: string, signature: string): boolean {
  const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: publicKey }, format: 'jwk' })
  return verify(null, Buffer.from(canonical), key, Buffer.from(signature, 'base64url'))
}

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
    expect(verifies(device.publicKey, 'x', await device.sign('x'))).toBe(true)
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

  it('keeps the identity across a launch the keychain refused', async () => {
    const first = await ensureDevice(dir)
    keychain.available = false
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(ensureDevice(dir)).rejects.toThrow('unavailable')
    keychain.available = true
    const second = await ensureDevice(dir)
    expect(second.id).toBe(first.id)
    expect(second.publicKey).toBe(first.publicKey)
  })

  it('keeps the key and the identity across a launch that could not decrypt it', async () => {
    const first = await ensureDevice(dir)
    const before = createHash('sha256')
      .update(readFileSync(join(dir, 'secrets.json')))
      .digest('hex')
    const reported = vi.spyOn(console, 'error').mockImplementation(() => {})
    keychain.denyOnce = true
    await expect(ensureDevice(dir)).rejects.toThrow('denied')
    expect(reported).not.toHaveBeenCalled()
    const second = await ensureDevice(dir)
    expect(second.id).toBe(first.id)
    expect(second.publicKey).toBe(first.publicKey)
    expect(
      createHash('sha256')
        .update(readFileSync(join(dir, 'secrets.json')))
        .digest('hex'),
    ).toBe(before)
  })

  it('re-mints after a crash between the key write and the config write', async () => {
    await ensureDevice(dir)
    rmSync(join(dir, 'secrets.json'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const actual = appConfig.updateAppConfig
    const spy = vi.spyOn(appConfig, 'updateAppConfig').mockImplementation(async (d, mutate) => {
      if (mutate({}).device) throw new Error('crash')
      return actual(d, mutate)
    })
    await expect(ensureDevice(dir)).rejects.toThrow('crash')
    spy.mockRestore()
    const third = await ensureDevice(dir)
    const stored = (await readAppConfig(dir)).device
    expect(verifies(stored?.publicKey ?? '', 'x', await third.sign('x'))).toBe(true)
  })
})
