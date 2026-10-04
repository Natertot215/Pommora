import { assignedIds } from './assignment'
import { cachedValues, patchCacheBlock } from './propertyCache'
import { keyedHolders, keyHolderFiles } from './keyHolders'
import { patchSidecar } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { stripHeld, sweepGovernedRoots } from './governedSweep'
import { readRegistry, serializeSchemaOp } from './propertiesRegistry'
import { ok, type Result } from '../Contract/result'
import { mapViews } from '../Views/views'
import { type ConfigReach, NO_REACH, propertyClear, reachConfig } from '../Nexus/configReach'

const NOTHING_TO_REMOVE = ok<ConfigReach>(NO_REACH)

export function removeProperty(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<ConfigReach>> {
  return serializeSchemaOp(root, () => removeInner(root, collectionFolder, propertyId))
}

async function removeInner(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<ConfigReach>> {
  const sidecar = await readJsonObject(sidecarPath(collectionFolder, 'collection'))
  if (!assignedIds(sidecar).includes(propertyId)) return NOTHING_TO_REMOVE

  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NOTHING_TO_REMOVE
  const key = def.name

  const { values, strip } = await keyedHolders(
    await keyHolderFiles(root, key, [collectionFolder]),
    def,
  )
  const clear = propertyClear(propertyId)
  // Views, cache, and the assignment change in ONE write under the sidecar's own lock, so the page-read window above can't revert a concurrent icon/banner/view write — THEN the pass and the page strip. The cache keeps the values it already holds, which a refill cut short left for pages it never reached.
  const written = await patchSidecar(collectionFolder, 'collection', (cur) => {
    const cached = { ...cachedValues(cur, propertyId), ...values }
    return patchCacheBlock(
      {
        ...(mapViews(cur, clear) ?? cur),
        properties: assignedIds(cur).filter((id) => id !== propertyId),
      },
      propertyId,
      Object.keys(cached).length ? { values: cached } : undefined,
    )
  })
  if (!written.ok) return written
  const reach = await reachConfig(root, { kind: 'property', propertyId }, collectionFolder)
  const { skipped } = await sweepGovernedRoots(root, strip, { raw: stripHeld(key) })
  return ok({ skipped: skipped.length + reach.skipped, hosts: reach.hosts })
}
