import { mintBundle } from '../Bundles/bundle'
import { writeRecord } from '../Bundles/record'
import { assignedIds } from '../Nexus/containerFields'
import { cachedValues, patchCacheBlock } from './propertyCache'
import {
  readRegistry,
  type PropertyRegistry,
  NO_PROPERTY,
  serializeSchemaOp,
} from './propertiesRegistry'
import { removeFromRegistry } from './registryProperty'
import { findHolders, type Held, heldValues, type Holders } from '../Index/keyHolders'
import { liveTreeOf } from '../Nexus/liveTree'
import {
  clearSchemaJournal,
  OWED,
  readSchemaJournal,
  schemaCascade,
  type SchemaJournal,
  writeSchemaJournal,
} from './propertyJournal'
import {
  collectionFolders,
  sweepCount,
  sweepGovernedRoots,
  type SweepPlan,
} from '../Nexus/governedSweep'
import { stripKeys } from '../Files/rootValues'
import { patchSidecar } from '../Files/sidecar'
import { readJsonObject } from '../Files/atomicWrite'
import { sidecarPath } from '../Paths/paths'
import { withoutOrderId } from '../Contexts/spaceSidecar'
import { isPlainObject } from '../Contract/validators'
import { ok, type Result } from '../Contract/result'
import { join, relative } from '../Paths/posix'
import type { MutateReply } from '../Nexus/mutateRequest'
import { type ConfigReach, reachConfig } from '../Nexus/configReach'

async function snapshot(
  root: string,
  propertyId: string,
  def: PropertyRegistry[string],
  folders: string[],
  held: readonly Held[],
): Promise<string> {
  const values = heldValues(held, def.key)
  const assignments: string[] = []
  const caches: Record<string, Record<string, unknown>> = {}
  let partial = held.some((h) => !h.id || !h.values)
  for (const folder of folders) {
    // Gathered before the unassign strips it — a property restored into no Collection is defined but belongs nowhere.
    const sidecar = await readJsonObject(sidecarPath(folder, 'collection'))
    if (!sidecar) partial = true
    const id = typeof sidecar?.id === 'string' ? sidecar.id : null
    const holds = assignedIds(sidecar).includes(propertyId)
    const cached = cachedValues(sidecar, propertyId)
    if ((holds || cached) && !id) partial = true
    if (holds && id) assignments.push(id)
    if (cached && id) caches[id] = cached
  }
  const bundle = await mintBundle(root, { kind: 'trash' }, join(root, `property-${propertyId}`))
  await writeRecord(bundle, {
    entity: 'property',
    id: propertyId,
    def,
    values,
    ...(assignments.length ? { assignments } : {}),
    ...(Object.keys(caches).length ? { caches } : {}),
    ...(partial ? { partial: true as const } : {}),
  })
  return bundle
}

export async function propertyHolders(root: string, propertyId: string): Promise<Result<number>> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NO_PROPERTY
  const { holders, plan } = await deletePlan(root, propertyId, def.key)
  return ok(await sweepCount(root, [...holders.pages, ...holders.spaces], plan))
}

export function deleteProperty(root: string, propertyId: string): Promise<MutateReply> {
  return serializeSchemaOp(root, () => deleteInner(root, propertyId))
}

async function deleteInner(root: string, propertyId: string): Promise<MutateReply> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NO_PROPERTY
  if (await readSchemaJournal(root)) return OWED
  const key = def.key

  // EVERY collection folder, not just current assigners — a Remove-cache block lives on a collection sidecar that no longer assigns the id.
  const folders = collectionFolders(root, await liveTreeOf(root))
  const planned = await deletePlan(root, propertyId, key)
  const bundle = await snapshot(root, propertyId, def, folders, planned.holders.held)
  // Journaled AFTER the snapshot — a replay re-runs the strip tail, never the bundle mint.
  const record: SchemaJournal = { op: 'delete', id: propertyId, key }
  await writeSchemaJournal(root, record)

  const { removed, ...reach } = await stripAndRemove(root, propertyId, folders, planned)
  if (!removed.ok) return removed
  if (!reach.skipped) await clearSchemaJournal(root, record)
  return ok({ bundled: { bundlePath: relative(root, bundle) }, ...schemaCascade(reach, record) })
}

interface DeletePlan {
  holders: Holders
  plan: SweepPlan
}

export async function deletePlan(
  root: string,
  propertyId: string,
  key: string,
): Promise<DeletePlan> {
  const holders = await findHolders(
    root,
    { keys: [key], reach: 'governed', id: propertyId },
    'values',
  )
  return { holders, plan: { raw: withoutOrderId((r) => stripKeys(r, [key]), propertyId) } }
}

export async function stripAndRemove(
  root: string,
  propertyId: string,
  folders: string[],
  { holders, plan }: DeletePlan,
): Promise<ConfigReach & { removed: Result<null> }> {
  const swept = await sweepGovernedRoots([...holders.pages, ...holders.spaces], plan)
  for (const folder of folders) await unassignAndPurge(folder, propertyId)
  const reach = await reachConfig(root, { kind: 'property', propertyId })
  return {
    skipped: swept.skipped.length + reach.skipped,
    hosts: reach.hosts,
    removed: await removeFromRegistry(root, propertyId),
  }
}

async function unassignAndPurge(folder: string, propertyId: string): Promise<void> {
  await patchSidecar(folder, 'collection', (cur) => {
    const assigned = assignedIds(cur)
    const hadCache = isPlainObject(cur.property_cache) && propertyId in cur.property_cache
    if (!assigned.includes(propertyId) && !hadCache) return null
    const next = { ...cur, properties: assigned.filter((id) => id !== propertyId) }
    // Spread, never Object.assign — dropping the last block is encoded by the key's ABSENCE, and assign only copies keys that are present.
    return hadCache ? patchCacheBlock(next, propertyId) : next
  })
}
