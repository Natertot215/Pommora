import { writePropertyBundle } from '../Trash/record'
import { assignedIds, cachedValues, collectionFolders, patchCacheBlock } from './assignment'
import { readRegistry, type PropertyRegistry, NO_PROPERTY } from './propertiesRegistry'
import { removeFromRegistry } from './registryProperty'
import { keyedHolders, keyHolderFiles } from './keyHolders'
import { clearSchemaJournal, writeSchemaJournal, type SchemaJournal } from './propertyJournal'
import { serializeSchemaOp } from './schemaChain'
import { sweepGovernedRoots, type Rewrite } from './governedSweep'
import { patchSidecar } from '../Files/sidecar'
import { readJsonObject } from '../Files/atomicWrite'
import { listFilesRecursive } from '../Files/walk'
import { contextsDir, sidecarPath } from '../Paths/paths'
import { SPACE_SIDECAR } from '../Paths/nexusPaths'
import { withOrderEntry } from '../Contexts/spaceSidecar'

import { isPlainObject } from './propertyValue'
import { ok, type Result } from '../Contract/result'
import { relative } from '../Paths/posix'
import type { MutateOutcome } from '../Nexus/mutateRequest'

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
  let partial = held.kept.length > 0
  for (const folder of folders) {
    // Gathered before the unassign strips it — a property restored into no Collection is defined but belongs nowhere.
    const sidecar = await readJsonObject(sidecarPath(folder, 'collection'))
    const id = typeof sidecar?.id === 'string' ? sidecar.id : null
    const holds = assignedIds(sidecar).includes(propertyId)
    const cached = cachedValues(sidecar, propertyId)
    if ((holds || cached) && !id) partial = true
    if (holds && id) assignments.push(id)
    if (cached && id) caches[id] = cached
  }
  for (const file of await listFilesRecursive(contextsDir(root), [SPACE_SIDECAR])) {
    const raw = await readJsonObject(file)
    if (!raw) {
      partial = true
      continue
    }
    if (!(key in raw)) continue
    const id = typeof raw.id === 'string' ? raw.id : undefined
    if (!id || id in values) partial = true
    else values[id] = raw[key]
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

export function deleteProperty(
  root: string,
  propertyId: string,
): Promise<Result<Pick<MutateOutcome, 'trashed'>>> {
  return serializeSchemaOp(() => deleteInner(root, propertyId))
}

async function deleteInner(
  root: string,
  propertyId: string,
): Promise<Result<Pick<MutateOutcome, 'trashed'>>> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NO_PROPERTY
  const key = def.name

  // EVERY collection folder, not just current assigners — a Remove-cache block lives on a collection sidecar that no longer assigns the id, and pre-cache dormant values may sit on any page.
  const folders = await collectionFolders(root)
  const files = await keyHolderFiles(root, key, folders)
  const held = await keyedHolders(root, files, key)
  const bundle = await snapshot(root, propertyId, def, folders, held)
  // Journaled AFTER the snapshot — a replay re-runs the strip tail, never the bundle mint.
  const record: SchemaJournal = { op: 'delete', id: propertyId, name: def.name }
  await writeSchemaJournal(root, record)

  const { skipped, removed } = await stripAndRemove(
    root,
    propertyId,
    key,
    folders,
    files.filter((f) => !held.kept.includes(f)),
  )
  if (!skipped) await clearSchemaJournal(root, record)
  return removed.ok ? ok({ trashed: { bundlePath: relative(root, bundle) } }) : removed
}

export async function stripAndRemove(
  root: string,
  propertyId: string,
  key: string,
  folders: string[],
  files: string[],
): Promise<{ skipped: number; removed: Result<null> }> {
  const raw = stripKeyRewrite(key)
  const swept = await sweepGovernedRoots(root, files, {
    raw,
    sidecars: withOrderEntry(raw, 'properties', key, null),
  })
  for (const folder of folders) await unassignAndPurge(folder, propertyId)
  return { skipped: swept.skipped.length, removed: await removeFromRegistry(root, propertyId) }
}

function stripKeyRewrite(key: string): Rewrite {
  return (raw) => {
    if (!(key in raw)) return null
    const next = { ...raw }
    delete next[key]
    return next
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
