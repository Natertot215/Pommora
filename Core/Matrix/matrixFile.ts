import { readJsonObject, rmwJsonStrict } from '../Files/atomicWrite'
import { NEXUS_CONFIG_FILES, nexusConfig, nexusDir } from '../Paths/paths'
import { newId } from '../Nexus/ids'
import { machine } from '../Platform/machine'
import { isPlainObject } from '../Properties/propertyValue'
import { type MatrixConfig, type MatrixPatch, parseMatrixConfig } from './matrixConfig'

const matrixPath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.matrix)

export async function readMatrixFile(root: string): Promise<MatrixConfig> {
  return parseMatrixConfig(await readJsonObject(matrixPath(root)))
}

export async function writeMatrixFile(root: string, patch: MatrixPatch): Promise<void> {
  await machine().mkdir(nexusDir(root))
  const written = await rmwJsonStrict(
    matrixPath(root),
    (current) => {
      const next: Record<string, unknown> = { ...current }
      for (const [key, value] of Object.entries(patch)) {
        const held = isPlainObject(current[key]) ? current[key] : {}
        next[key] = { ...held, ...value }
      }
      return next
    },
    () => ({}),
    // A corrupt file moves aside under the lock so the write after the empty read lands.
    (bad) => machine().rename(bad, `${bad}.bad-${newId()}`),
  )
  if (!written.ok) throw new Error(written.error.message)
}
