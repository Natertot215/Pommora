// Values the config file must not carry in the clear, encrypted by the OS keychain through
// safeStorage and written beside pommora.json so the config itself stays hand-readable.

import { join } from '@pommora/core/Paths/posix'
import { safeStorage } from 'electron'
import { readJsonStrict, rmwJsonStrict } from '@pommora/core/Files/atomicWrite'

const FILE = 'secrets.json'

export const KEYCHAIN_UNAVAILABLE = 'The OS keychain refused: no encryption is available.'

export const secretsAvailable = (): boolean => safeStorage.isEncryptionAvailable()

function secretsPath(userDataDir: string): string {
  return join(userDataDir, FILE)
}

export async function getSecret(userDataDir: string, name: string): Promise<string | null> {
  // A damaged file throws rather than reading as no key, which would mint over the identity it holds.
  const read = await readJsonStrict(secretsPath(userDataDir))
  if (!read.ok && read.error.code !== 'not-found') throw new Error(read.error.message)
  const value = read.ok ? read.value[name] : undefined
  if (typeof value !== 'string') return null
  return safeStorage.decryptString(Buffer.from(value, 'base64'))
}

export async function setSecret(
  userDataDir: string,
  name: string,
  plain: string | null,
): Promise<void> {
  if (plain !== null && !secretsAvailable()) throw new Error(KEYCHAIN_UNAVAILABLE)
  const written = await rmwJsonStrict(
    secretsPath(userDataDir),
    (cur) => {
      if (plain === null) {
        const { [name]: _dropped, ...rest } = cur
        return rest
      }
      return { ...cur, [name]: safeStorage.encryptString(plain).toString('base64') }
    },
    () => ({}),
  )
  if (!written.ok) throw new Error(written.error.message)
}
