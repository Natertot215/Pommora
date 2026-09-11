// Values the config file must not carry in the clear, encrypted by the OS keychain through
// safeStorage and written beside pommora.json so the config itself stays hand-readable.

import { join } from 'node:path'
import { safeStorage } from 'electron'
import { readJsonObject, rmwJsonStrict } from '@pommora/core/Files/atomicWrite'

const FILE = 'secrets.json'

export const KEYCHAIN_UNAVAILABLE = 'The OS keychain refused: no encryption is available.'

export const secretsAvailable = (): boolean => safeStorage.isEncryptionAvailable()

function secretsPath(userDataDir: string): string {
  return join(userDataDir, FILE)
}

export async function getSecret(userDataDir: string, name: string): Promise<string | null> {
  const obj = await readJsonObject(secretsPath(userDataDir))
  const value = obj?.[name]
  if (typeof value !== 'string') return null
  return safeStorage.decryptString(Buffer.from(value, 'base64'))
}

export async function setSecret(userDataDir: string, name: string, plain: string): Promise<void> {
  if (!secretsAvailable()) throw new Error(KEYCHAIN_UNAVAILABLE)
  const value = safeStorage.encryptString(plain).toString('base64')
  const written = await rmwJsonStrict(
    secretsPath(userDataDir),
    (cur) => ({ ...cur, [name]: value }),
    () => ({}),
  )
  if (!written.ok) throw new Error(written.error.message)
}
