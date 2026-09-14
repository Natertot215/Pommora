import { beforeEach, describe, expect, it } from 'vitest'
import type { HostDevice } from '../../Contract/handlers'
import { memorySecrets, TEST_KDF, testDevice, type TestSecrets } from '../../Testing/syncDevice'
import type { InfoRecord } from '../Contract/wire'
import { deriveWrappingKey } from '../Keys/kdf'
import { mintKey, wrapForDevice, wrapForPassword } from '../Keys/ring'
import type { SyncHost } from './call'
import { forgetKeys, heldRing, loadRing, passwordName, ringName } from './keyring'

const PASSWORD = 'pw'

let secrets: TestSecrets
let host: SyncHost

async function keys(device: HostDevice): Promise<Pick<InfoRecord, 'ring' | 'kdf'>> {
  const key = mintKey()
  const ring = await wrapForPassword([key], await deriveWrappingKey(PASSWORD, TEST_KDF))
  ring.push(...(await wrapForDevice([key], { deviceId: device.id, x25519: device.x25519 })))
  return { kdf: TEST_KDF, ring }
}

beforeEach(async () => {
  secrets = memorySecrets()
  host = { device: await testDevice('fe1c', 'Recorder'), secrets } as unknown as SyncHost
})

describe('the keyring', () => {
  it('prefers the device entry, falls back to the password, and answers null with neither', async () => {
    const info = await keys(host.device)

    expect(await loadRing(host, 'byDevice', info, null)).not.toBeNull()
    expect(secrets.map.has(ringName('byDevice'))).toBe(true)

    const byPassword = { ...info, ring: info.ring.filter((e) => e.holder === 'password') }
    secrets.map.set(passwordName('byPassword'), PASSWORD)
    expect(await loadRing(host, 'byPassword', byPassword, null)).not.toBeNull()
    expect(secrets.map.has(ringName('byPassword'))).toBe(false)

    expect(await loadRing(host, 'byNothing', byPassword, null)).toBeNull()
    expect(await loadRing(host, 'byNothing', null, null)).toBeNull()
  })

  it('refuses an offered password the ring does not open, device entry or not', async () => {
    const info = await keys(host.device)
    expect(await loadRing(host, 'typed', info, 'wrong')).toBeNull()
    expect(heldRing('typed')).toBeNull()
    expect(secrets.map.size).toBe(0)
    expect(await loadRing(host, 'typed', info, PASSWORD)).not.toBeNull()
  })

  it('re-derives from the info it is handed rather than the ring it holds', async () => {
    const first = await keys(host.device)
    expect((await loadRing(host, 'growing', first, null))?.keys).toHaveLength(1)
    const both = { kdf: TEST_KDF, ring: [...first.ring, ...(await keys(host.device)).ring] }
    expect((await loadRing(host, 'growing', both, null))?.keys).toHaveLength(2)
  })

  it('forgets both secrets and the held ring', async () => {
    secrets.map.set(passwordName('nx'), PASSWORD)
    expect(await loadRing(host, 'nx', await keys(host.device), null)).not.toBeNull()
    expect(heldRing('nx')).not.toBeNull()

    await forgetKeys(host, 'nx')

    expect(heldRing('nx')).toBeNull()
    expect([...secrets.map.keys()]).toEqual([])
  })
})
