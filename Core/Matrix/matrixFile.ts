import { readJsonObject, updateNexusConfig } from '../Files/atomicWrite'
import { nexusConfig } from '../Paths/paths'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { isPlainObject } from '../Properties/propertyValue'
import { type MatrixConfig, type MatrixPatch, parseMatrixConfig } from './matrixConfig'

const matrixPath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.matrix)

export async function readMatrixFile(root: string): Promise<MatrixConfig> {
  return parseMatrixConfig(await readJsonObject(matrixPath(root)))
}

export async function writeMatrixFile(root: string, patch: MatrixPatch): Promise<void> {
  const written = await updateNexusConfig(root, 'matrix', (current) => {
    const next: Record<string, unknown> = { ...current }
    for (const [key, value] of Object.entries(patch)) {
      const held = isPlainObject(current[key]) ? current[key] : {}
      next[key] = { ...held, ...value }
    }
    return next
  })
  if (!written.ok) throw new Error(written.error.message)
}
