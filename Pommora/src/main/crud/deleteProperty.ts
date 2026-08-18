// Global property delete — the nexus-wide fan-out that removes a definition outright. Record-first
// (an artifact-less bundle in `.trash` holds the def, the Collections that assigned it, and every
// page value keyed by page id), then strips the value from every collection's page under its file
// lock, drops the id from every assignment, purges every Remove-cache block, and finally removes
// the def from the registry. That bundle is what restore spends to rebuild it. The daily
// non-destructive op is Remove (crud/removeProperty); this is the rare one.

import { readFile } from 'node:fs/promises'
import { contentId } from '@shared/identity'
import { writePropertyBundle } from '../provenance'
import { withoutCacheBlock } from './assignment'
import { readRegistry, type PropertyRegistry } from '../io/propertiesRegistry'
import { removeFromRegistry } from './registryProperty'
import { collectionFolders } from './assignment'
import { keyHolderFiles } from './keyHolders'
import { clearSchemaJournal, writeSchemaJournal, type SchemaJournal } from './propertyJournal'
import { serializeSchemaOp } from './schemaChain'
import { sweepGovernedRoots } from './governedSweep'
import { readSidecar, writeSidecar, withSidecarLock } from '../sidecarIO'
import { pageCollectionSidecar } from '@shared/schemas'
import { splitFrontmatter } from '../readNexus'
import { isPlainObject, propertyKey } from '@shared/propertyValue'
import { nowIso } from './util'
import { fail, type Result } from '@shared/result'

/** The recovery net the delete confirmation promises: an artifact-less bundle, values keyed by
 *  page id — an id-less page's value is unrestorable and marks the record partial. */
async function snapshot(
  root: string,
  propertyId: string,
  def: PropertyRegistry[string],
  folders: string[],
  files: string[],
): Promise<void> {
  const key = propertyKey(def)
  const values: Record<string, unknown> = {}
  const assignments: string[] = []
  let partial = false
  for (const folder of folders) {
    // Which Collections carried it, by sidecar id — a property restored into no Collection is
    // defined but belongs nowhere, so this is gathered before the unassign strips it.
    const sidecar = await readSidecar(folder, 'collection', pageCollectionSidecar)
    const holds = ((sidecar?.properties as string[] | undefined) ?? []).includes(propertyId)
    if (holds && typeof sidecar?.id === 'string') assignments.push(sidecar.id)
    else if (holds) partial = true
  }
  for (const file of files) {
    let fm: Record<string, unknown>
    try {
      fm = splitFrontmatter(await readFile(file, 'utf8')) as Record<string, unknown>
    } catch {
      continue
    }
    if (!(key in fm)) continue
    const id = contentId(fm)
    // A duplicated id can hold only one entry — last wins, and the record says it is thin.
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
  const key = propertyKey(def)

  // EVERY collection folder, not just current assigners — a Remove-cache block lives on a
  // sidecar that no longer assigns the id, and pre-cache dormant values may sit on any page.
  const folders = await collectionFolders(root)
  // The one candidate set for the snapshot AND the sweep: the key's holders, scope-intersected.
  const files = await keyHolderFiles(root, key, folders)
  await snapshot(root, propertyId, def, folders, files)
  // Journaled AFTER the snapshot — a replay re-runs the strip tail, never the bundle mint.
  const record: SchemaJournal = { op: 'delete', id: propertyId, name: def.name }
  await writeSchemaJournal(root, record)

  // Strip the value from every page a Collection's schema governs — the one sweep, scoped to
  // the folders that carry the schema this definition belonged to.
  const swept = await sweepGovernedRoots(root, { kind: 'files', files }, stripKeyRewrite(key), {
    stamp: true,
  })

  for (const folder of folders) await unassignAndPurge(folder, propertyId)
  const removed = await removeFromRegistry(root, propertyId)
  // A holder the sweep could not read holds the record — with the def now gone and the name
  // free, the replay's freed-name arm re-strips the stragglers at the next open.
  if (!swept.skipped.length) await clearSchemaJournal(root, record)
  return removed
}

/** The delete's page rewrite, named so the crash replay runs the identical strip. */
export function stripKeyRewrite(
  key: string,
): (raw: Record<string, unknown>) => { next: Record<string, unknown> } | null {
  return (raw) => {
    if (!(key in raw)) return null
    const next = { ...raw }
    delete next[key]
    return { next }
  }
}

/** Drop the id from one Collection's assignments and purge its Remove-cache block, under that
 *  sidecar's lock so a concurrent view/order/icon write can't be reverted by this read-merge-write.
 *  The `.trash` bundle is the recovery net, so this needn't be atomic. */
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
      modified_at: nowIso(),
    }
    // Spread, never Object.assign — dropping the last block is encoded by the key's ABSENCE,
    // and assign only copies keys that are present.
    await writeSidecar(folder, 'collection', hadCache ? withoutCacheBlock(next, propertyId) : next)
  })
}
