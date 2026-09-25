import { readJsonObject, updateNexusConfig } from '../Files/atomicWrite'
import { nexusConfig } from '../Paths/paths'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { mergeKeys } from '../Files/jsonMerge'
import { stableStringify } from '../Files/stableJson'
import { MATRIX_MERGE_DEPTH } from '../Sync/Arrival/mergePolicy'
import { applyPatch, type MatrixConfig, type MatrixPatch, parseMatrixConfig } from './matrixConfig'

const matrixPath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.matrix)

export async function readMatrixFile(root: string): Promise<MatrixConfig> {
  return parseMatrixConfig(await readJsonObject(matrixPath(root)))
}

// A write merges over the stored file, so a force or key this build reads differently stays as stored unless the patch changed it, and a patch that changes nothing leaves the file untouched.
export async function writeMatrixFile(root: string, patch: MatrixPatch): Promise<void> {
  const written = await updateNexusConfig(root, 'matrix', (current) => {
    const read = parseMatrixConfig(current)
    const local = parseMatrixConfig(applyPatch(read, patch))
    const next = mergeKeys(read, local, current, MATRIX_MERGE_DEPTH, () => 'local')
    return stableStringify(next) === stableStringify(current) ? null : next
  })
  if (!written.ok) throw new Error(written.error.message)
}
