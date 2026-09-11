import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSecret, setSecret } from './secrets'

const { available } = vi.hoisted(() => ({ available: { value: true } }))

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => available.value,
    encryptString: (s: string) => Buffer.from(`enc:${s}`),
    decryptString: (b: Buffer) => b.toString().slice(4),
  },
}))

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pom-sec-'))
  available.value = true
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('secrets', () => {
  it('round-trips a value through set then get', async () => {
    await setSecret(dir, 'device-key', 'private-bytes')
    expect(await getSecret(dir, 'device-key')).toBe('private-bytes')
  })

  it('answers null for a name that was never set', async () => {
    expect(await getSecret(dir, 'device-key')).toBeNull()
    await setSecret(dir, 'other', 'x')
    expect(await getSecret(dir, 'device-key')).toBeNull()
  })

  it('keeps an existing name when a second one is set', async () => {
    await setSecret(dir, 'first', 'one')
    await setSecret(dir, 'second', 'two')
    expect(await getSecret(dir, 'first')).toBe('one')
    expect(await getSecret(dir, 'second')).toBe('two')
  })

  it('refuses to write when encryption is unavailable', async () => {
    available.value = false
    await expect(setSecret(dir, 'device-key', 'x')).rejects.toThrow()
  })
})
