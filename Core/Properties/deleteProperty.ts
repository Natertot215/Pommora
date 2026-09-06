import { contentId } from '../Nexus/identityMark'
import { splitFrontmatter } from '../Files/pageFile'
import { writePropertyBundle } from '../Trash/record'
import { patchCacheBlock } from './assignment'
import { readRegistry, type PropertyRegistry } from './propertiesRegistry'
import { removeFromRegistry } from './registryProperty'
import { collectionFolders } from './assignment'
import { keyHolderFiles } from './keyHolders'
import { clearSchemaJournal, writeSchemaJournal, type SchemaJournal } from './propertyJournal'
import { serializeSchemaOp } from './schemaChain'
import { sweepGovernedRoots, type Rewrite } from './governedSweep'
import { readSidecar, writeSidecar, withSidecarLock } from '../Files/sidecar'
import { readTextOrNull } from '../Files/atomicWrite'
import { pageCollectionSidecar } from '../Nexus/schemas'

import { isPlainObject } from './propertyValue'
import { fail, type Result } from '../Contract/result'

async function snapshot(
  root: string,
  propertyId: string,
  def: PropertyRegistry[string],
  folders: string[],
  files: string[],
): Promise<void> {
  const key = def.name
  const values: Record<string, unknown> = {}
  const assignments: string[] = []
  let partial = false
  for (const folder of folders) {
    // Gathered before the unassign strips it — a property restored into no Collection is defined but belongs nowhere.
    const sidecar = await readSidecar(folder, 'collection', pageCollectionSidecar)
    const holds = ((sidecar?.properties as string[] | undefined) ?? []).includes(propertyId)
    if (holds && typeof sidecar?.id === 'string') assignments.push(sidecar.id)
    else if (holds) partial = true
  }
  for (const file of files) {
    const content = await readTextOrNull(file)
    if (content === null) continue
    const fm = splitFrontmatter(content) as Record<string, unknown>
    if (!(key in fm)) continue
    const id = contentId(fm)
    if (id && id in values) partial = true
    if (id) values[id] = fm[key]
    else partial = true
  }
  await writePropertyBundle(root, {
    entity: 'property',
    id: propertyId,
    def,
    values,
    ...(assignments.length ? { assignments } : {}),
    ...(partial ? { partial: true as const } : {}),
  })
}

export function deleteProperty(root: string, propertyId: string): Promise<Result<null>> {
  return serializeSchemaOp(() => deleteInner(root, propertyId))
}

async function deleteInner(root: string, propertyId: string): Promise<Result<null>> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return fail('not-found', 'Property not found.')
  const key = def.name

  // EVERY collection folder, not just current assigners — a Remove-cache block lives on a sidecar that no longer assigns the id, and pre-cache dormant values may sit on any page.
  const folders = await collectionFolders(root)
  const files = await keyHolderFiles(root, key, folders)
  await snapshot(root, propertyId, def, folders, files)
  // Journaled AFTER the snapshot — a replay re-runs the strip tail, never the bundle mint.
  const record: SchemaJournal = { op: 'delete', id: propertyId, name: def.name }
  await writeSchemaJournal(root, record)

  const raw = stripKeyRewrite(key)
  const swept = await sweepGovernedRoots(root, { kind: 'files', files }, { raw })

  for (const folder of folders) await unassignAndPurge(folder, propertyId)
  const removed = await removeFromRegistry(root, propertyId)
  if (!swept.skipped.length) await clearSchemaJournal(root, record)
  return removed
}

export function stripKeyRewrite(key: string): Rewrite {
  return (raw) => {
    if (!(key in raw)) return null
    const next = { ...raw }
    delete next[key]
    return next
  }
}

export function unassignAndPurge(folder: string, propertyId: string): Promise<void> {
  return withSidecarLock(folder, 'collection', async () => {
    const sidecar = await readSidecar(folder, 'collection', pageCollectionSidecar)
    if (!sidecar) return
    const assigned = (sidecar.properties as string[] | undefined) ?? []
    const cacheAll = isPlainObject(sidecar.property_cache) ? sidecar.property_cache : undefined
    const hadCache = cacheAll !== undefined && propertyId in cacheAll
    if (!assigned.includes(propertyId) && !hadCache) return
    const next: Record<string, unknown> = {
      ...sidecar,
      properties: assigned.filter((id) => id !== propertyId),
    }
    // Spread, never Object.assign — dropping the last block is encoded by the key's ABSENCE, and assign only copies keys that are present.
    await writeSidecar(folder, 'collection', hadCache ? patchCacheBlock(next, propertyId) : next)
  })
}
