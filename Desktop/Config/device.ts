// The private key lives in this process as a CryptoKey this module never hands out.

import { hostname } from 'node:os'
import type { HostDevice } from '@pommora/core/Contract/handlers'
import type { SyncDevice } from '@pommora/core/Sync/contract'
import { readAppConfig, updateAppConfig } from './appConfig'
import { getSecret, KEYCHAIN_UNAVAILABLE, secretsAvailable, setSecret } from './secrets'

const SECRET = 'device-key'

async function fingerprintOf(raw: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', raw)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function mint(userDataDir: string): Promise<{ device: SyncDevice; key: CryptoKey }> {
  if (!secretsAvailable()) throw new Error(KEYCHAIN_UNAVAILABLE)
  const pair = await globalThis.crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])
  if (!('privateKey' in pair)) throw new Error('Ed25519 generated no key pair.')
  const raw = await globalThis.crypto.subtle.exportKey('raw', pair.publicKey)
  const pkcs8 = await globalThis.crypto.subtle.exportKey('pkcs8', pair.privateKey)
  const device: SyncDevice = {
    id: await fingerprintOf(raw),
    publicKey: Buffer.from(raw).toString('base64url'),
    name: hostname().slice(0, 64),
  }
  // The config gives up its device before the store takes the new private key, so a config never
  // names a public key while the store holds a different private half: any crash mid-mint re-mints.
  await updateAppConfig(userDataDir, () => ({ device: undefined }))
  await setSecret(userDataDir, SECRET, Buffer.from(pkcs8).toString('base64'))
  await updateAppConfig(userDataDir, () => ({ device }))
  return { device, key: pair.privateKey }
}

async function load(userDataDir: string): Promise<CryptoKey | null> {
  const secret = await getSecret(userDataDir, SECRET)
  if (secret === null) return null
  try {
    return await globalThis.crypto.subtle.importKey(
      'pkcs8',
      new Uint8Array(Buffer.from(secret, 'base64')),
      'Ed25519',
      false,
      ['sign'],
    )
  } catch {
    return null
  }
}

export async function ensureDevice(userDataDir: string): Promise<HostDevice> {
  const stored = (await readAppConfig(userDataDir)).device
  const loaded = stored ? await load(userDataDir) : null
  if (stored && !loaded) {
    console.error('Device key missing from the secret store; minting a new identity')
  }
  const { device, key } =
    stored && loaded ? { device: stored, key: loaded } : await mint(userDataDir)
  const host: HostDevice = {
    ...device,
    async sign(canonical: string): Promise<string> {
      const signature = await globalThis.crypto.subtle.sign(
        'Ed25519',
        key,
        new TextEncoder().encode(canonical),
      )
      return Buffer.from(signature).toString('base64url')
    },
    async rename(name: string): Promise<void> {
      await updateAppConfig(userDataDir, () => ({
        device: { id: host.id, publicKey: host.publicKey, name },
      }))
      host.name = name
    },
  }
  return host
}
