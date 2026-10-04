import { writePropertyBundle } from '../Trash/record'
import { assignedIds, collectionFolders } from './assignment'
import { cachedValues, patchCacheBlock } from './propertyCache'
import {
  readRegistry,
  type PropertyRegistry,
  NO_PROPERTY,
  serializeSchemaOp,
} from './propertiesRegistry'
import { removeFromRegistry } from './registryProperty'
import { keyedHolders, keyHolderFiles } from './keyHolders'
import {
  clearSchemaJournal,
  type SchemaCascade,
  schemaCascade,
  type SchemaJournal,
  writeSchemaJournal,
} from './propertyJournal'
import { type Rewrite, sweepGovernedRoots } from './governedSweep'
import { heldKey, heldValue, stripHeld } from '../Files/heldKeys'
import { holdsList } from './properties'
import { patchSidecar } from '../Files/sidecar'
import { readJsonObject } from '../Files/atomicWrite'
import { sidecarPath } from '../Paths/paths'
import { spaceSidecars, withOrderEntry } from '../Contexts/spaceSidecar'

import { isPlainObject } from '../Contract/validators'
import { ok, type Result } from '../Contract/result'
import { relative } from '../Paths/posix'
import type { MutateOutcome } from '../Nexus/mutateRequest'
import { type ConfigReach, reachConfig } from '../Nexus/configReach'

async function snapshot(
  root: string,
  propertyId: string,
  def: PropertyRegistry[string],
  folders: string[],
  held: Awaited<ReturnType<typeof keyedHolders>>,
): Promise<string> {
  const key = def.name
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
    if (heldKey(raw, key) === undefined) continue
    const id = typeof raw.id === 'string' ? raw.id : undefined
    if (!id || id in values) partial = true
    else values[id] = heldValue(raw, key, holdsList(def))
  }
  return writePropertyBundle(root, {
    entity: 'property',
    id: propertyId,
    def,
    values,
    ...(assignments.length ? { assignments } : {}),
    ...(Object.keys(caches).length ? { caches } : {}),
    ...(partial ? { partial: true as const } : {}),
  })
}

export type PropertyDeletion = SchemaCascade & Required<Pick<MutateOutcome, 'trashed'>>

export function deleteProperty(
  root: string,
  propertyId: string,
): Promise<Result<PropertyDeletion>> {
  return serializeSchemaOp(root, () => deleteInner(root, propertyId))
}

async function deleteInner(root: string, propertyId: string): Promise<Result<PropertyDeletion>> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NO_PROPERTY
  const key = def.name

  // EVERY collection folder, not just current assigners — a Remove-cache block lives on a collection sidecar that no longer assigns the id, and pre-cache dormant values may sit on any page.
  const folders = await collectionFolders(root)
  const held = await keyedHolders(await keyHolderFiles(root, key, folders), def)
  const bundle = await snapshot(root, propertyId, def, folders, held)
  // Journaled AFTER the snapshot — a replay re-runs the strip tail, never the bundle mint.
  const record: SchemaJournal = { op: 'delete', id: propertyId, name: def.name }
  await writeSchemaJournal(root, record)

  const { removed, ...reach } = await stripAndRemove(root, propertyId, key, folders, held.strip)
  if (!removed.ok) return removed
  if (!reach.skipped) await clearSchemaJournal(root, record)
  return ok({ trashed: { bundlePath: relative(root, bundle) }, ...schemaCascade(reach, record) })
}

export async function stripAndRemove(
  root: string,
  propertyId: string,
  key: string,
  folders: string[],
  files: string[],
): Promise<ConfigReach & { removed: Result<null> }> {
  const raw: Rewrite = (fm) => stripHeld(fm, key)
  const swept = await sweepGovernedRoots(root, files, {
    raw,
    sidecars: withOrderEntry(raw, 'properties', key, null),
  })
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
