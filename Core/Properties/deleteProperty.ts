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
import { type KeyedHolders, keyedHolders } from './keyHolders'
import { queryKeyHolders } from '../Index/contentIndex'
import { nexusPages } from '../Nexus/heldPages'
import { liveTreeOf } from '../Nexus/liveTree'
import {
  clearSchemaJournal,
  type SchemaCascade,
  schemaCascade,
  type SchemaJournal,
  writeSchemaJournal,
} from './propertyJournal'
import {
  collectionFolders,
  governedReach,
  type Rewrite,
  sweepCount,
  sweepGovernedRoots,
  type SweepPlan,
} from '../Nexus/governedSweep'
import { stripKeys } from '../Files/rootValues'
import { patchSidecar } from '../Files/sidecar'
import { readJsonObject } from '../Files/atomicWrite'
import { sidecarPath } from '../Paths/paths'
import { spaceSidecars, withoutOrderId } from '../Contexts/spaceSidecar'
import { isPlainObject } from '../Contract/validators'
import { ok, type Result } from '../Contract/result'
import { join, relative } from '../Paths/posix'
import type { MutateOutcome } from '../Nexus/mutateRequest'
import { type ConfigReach, reachConfig } from '../Nexus/configReach'

async function snapshot(
  root: string,
  propertyId: string,
  def: PropertyRegistry[string],
  folders: string[],
  held: KeyedHolders,
): Promise<string> {
  const key = def.key
  const values = { ...held.values }
  const assignments: string[] = []
  const caches: Record<string, Record<string, unknown>> = {}
  let partial = held.partial
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
  for (const file of await spaceSidecars(root)) {
    const raw = await readJsonObject(file)
    if (!raw) {
      partial = true
      continue
    }
    if (!Object.hasOwn(raw, key)) continue
    const id = typeof raw.id === 'string' ? raw.id : undefined
    if (!id || id in values) partial = true
    else values[id] = raw[key]
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

export type PropertyDeletion = SchemaCascade & Required<Pick<MutateOutcome, 'bundled'>>

export async function propertyHolders(root: string, propertyId: string): Promise<Result<number>> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NO_PROPERTY
  const { held, plan } = await deletePlan(root, propertyId, def.key)
  return ok(await sweepCount(root, held.strip, plan))
}

export function deleteProperty(
  root: string,
  propertyId: string,
): Promise<Result<PropertyDeletion>> {
  return serializeSchemaOp(root, () => deleteInner(root, propertyId))
}

async function deleteInner(root: string, propertyId: string): Promise<Result<PropertyDeletion>> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NO_PROPERTY
  const key = def.key

  // EVERY collection folder, not just current assigners — a Remove-cache block lives on a collection sidecar that no longer assigns the id.
  const folders = collectionFolders(root, await liveTreeOf(root))
  const planned = await deletePlan(root, propertyId, key)
  const bundle = await snapshot(root, propertyId, def, folders, planned.held)
  // Journaled AFTER the snapshot — a replay re-runs the strip tail, never the bundle mint.
  const record: SchemaJournal = { op: 'delete', id: propertyId, key }
  await writeSchemaJournal(root, record)

  const { removed, ...reach } = await stripAndRemove(root, propertyId, folders, planned)
  if (!removed.ok) return removed
  if (!reach.skipped) await clearSchemaJournal(root, record)
  return ok({ bundled: { bundlePath: relative(root, bundle) }, ...schemaCascade(reach, record) })
}

interface DeletePlan {
  held: KeyedHolders
  plan: SweepPlan
}

export async function deletePlan(
  root: string,
  propertyId: string,
  key: string,
): Promise<DeletePlan> {
  const { byId } = await nexusPages(root, await liveTreeOf(root))
  const held = await keyedHolders(await governedReach(root, queryKeyHolders(key)), key, byId)
  const raw: Rewrite = (r) => stripKeys(r, [key])
  return { held, plan: { raw, sidecars: withoutOrderId(raw, propertyId) } }
}

export async function stripAndRemove(
  root: string,
  propertyId: string,
  folders: string[],
  { held, plan }: DeletePlan,
): Promise<ConfigReach & { removed: Result<null> }> {
  const swept = await sweepGovernedRoots(root, held.strip, plan)
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
