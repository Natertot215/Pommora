// Values the config file must not carry in the clear, encrypted by the OS keychain through
// safeStorage and written beside pommora.json so the config itself stays hand-readable.

import { join } from 'node:path'
import { safeStorage } from 'electron'
import { readJsonObject, rmwJsonStrict } from '@pommora/core/Files/atomicWrite'

const FILE = 'secrets.json'

export function secretsPath(userDataDir: string): string {
  return join(userDataDir, FILE)
}

export async function getSecret(userDataDir: string, name: string): Promise<string | null> {
  const obj = await readJsonObject(secretsPath(userDataDir))
  const value = obj?.[name]
  if (typeof value !== 'string') return null
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'))
  } catch {
    return null
  }
}

export async function setSecret(userDataDir: string, name: string, plain: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('The OS keychain refused: no encryption is available.')
  }
  const value = safeStorage.encryptString(plain).toString('base64')
  const written = await rmwJsonStrict(
    secretsPath(userDataDir),
    (cur) => ({ ...cur, [name]: value }),
    () => ({}),
  )
  if (!written.ok) throw new Error(written.error.message)
}
