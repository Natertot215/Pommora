import { assignedIds } from '../Nexus/containerFields'
import { cachedValues, patchCacheBlock } from './propertyCache'
import { findHolders, heldValues } from '../Index/keyHolders'
import { patchSidecar } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { sweepGovernedRoots } from '../Nexus/governedSweep'
import { stripKeys } from '../Files/rootValues'
import { readRegistry, serializeSchemaOp } from './propertiesRegistry'
import { ok } from '../Contract/result'
import { mapViews } from '../Views/views'
import { propertyClear, reachConfig, reachReport } from '../Nexus/configReach'
import type { MutateReply } from '../Nexus/mutateRequest'

const NOTHING_TO_REMOVE: MutateReply = ok({})

export function unassignProperty(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<MutateReply> {
  return serializeSchemaOp(root, () => unassignInner(root, collectionFolder, propertyId))
}

async function unassignInner(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<MutateReply> {
  const sidecar = await readJsonObject(sidecarPath(collectionFolder, 'collection'))
  if (!assignedIds(sidecar).includes(propertyId)) return NOTHING_TO_REMOVE

  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NOTHING_TO_REMOVE
  const key = def.key

  const { pages, held } = await findHolders(
    root,
    { keys: [key], reach: { collection: collectionFolder } },
    'values',
  )
  const values = heldValues(held, key)
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
  const { skipped } = await sweepGovernedRoots(pages, { raw: (r) => stripKeys(r, [key]) })
  return ok({
    cascade: reachReport({ skipped: skipped.length + reach.skipped, hosts: reach.hosts }),
  })
}
