import { assignedIds, patchCacheBlock } from './assignment'
import { keyedHolders, keyHolderFiles } from './keyHolders'
import { patchSidecar } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { stripKeys, sweepGovernedRoots, unsweptLine } from './governedSweep'
import { readRegistry } from './propertiesRegistry'
import { serializeSchemaOp } from './schemaChain'
import { fault, ok, type Result } from '../Contract/result'

export function removeProperty(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<null>> {
  return serializeSchemaOp(() => removeInner(root, collectionFolder, propertyId))
}

async function removeInner(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<null>> {
  const sidecar = await readJsonObject(sidecarPath(collectionFolder, 'collection'))
  if (!assignedIds(sidecar).includes(propertyId)) return ok(null)

  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return ok(null)
  const key = def.name

  const { holders, values } = await keyedHolders(
    root,
    await keyHolderFiles(root, key, [collectionFolder]),
    key,
  )
  // Cache + unassign FIRST under the sidecar's own lock, so the page-read window above can't revert a concurrent icon/banner/view write — THEN strip each page under its file lock.
  const written = await patchSidecar(collectionFolder, 'collection', (cur) =>
    patchCacheBlock(
      { ...cur, properties: assignedIds(cur).filter((id) => id !== propertyId) },
      propertyId,
      Object.keys(values).length ? { values } : undefined,
    ),
  )
  if (!written.ok) return written
  const { skipped } = await sweepGovernedRoots(root, holders, { raw: stripKeys(key) })
  return skipped.length ? fault(unsweptLine(skipped.length)) : ok(null)
}
