// Global property delete — the one nexus-wide destructive fan-out. Snapshot-first (a
// timestamped JSON of the def + every page value lands in `.trash`, so the scrub is
// recoverable), then strips the value from every collection's page under its file lock, drops
// the id from every assignment, purges every Remove-cache block, and finally removes the def
// from the registry. The daily non-destructive op is Remove (crud/removeProperty); this is the
// rare one, and it saves nothing restorable in-app.

import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { contentId } from '@shared/identity'
import { writePropertyPair } from '../provenance'
import { withoutCacheBlock } from './assignment'
import { readRegistry, type PropertyRegistry } from '../io/propertiesRegistry'
import { removeFromRegistry } from './registryProperty'
import { allCollectionFolders } from './assignment'
import { serializeSchemaOp } from './schemaChain'
import { rewritePageSerialized } from '../io/fileLock'
import { stripPageMember } from './pageValue'
import { readSidecar } from '../sidecarIO'
import { pageCollectionSidecar } from '@shared/schemas'
import { listMarkdownFiles } from '../io/walk'
import { SIDECAR_FILENAME } from '../paths'
import { writeJson } from '../io/atomicWrite'
import { splitFrontmatter } from '../readNexus'
import { isPlainObject, propertyKey } from '@shared/propertyValue'
import { nowIso, sweepAdmits } from './util'
import { fail, type Result } from '@shared/result'

/** The recovery net the delete confirmation promises: the pair's artifact-less variant, values
 *  keyed by page id — an id-less page's value is unrestorable and marks the pair partial. */
async function snapshot(
  root: string,
  propertyId: string,
  def: PropertyRegistry[string],
  folders: string[],
): Promise<void> {
  const key = propertyKey(def)
  const values: Record<string, unknown> = {}
  let partial = false
  for (const folder of folders) {
    for (const file of await listMarkdownFiles(folder)) {
      let fm: Record<string, unknown>
      try {
        fm = splitFrontmatter(await readFile(file, 'utf8')) as Record<string, unknown>
      } catch {
        continue
      }
      if (!(key in fm)) continue
      const id = contentId(fm)
      // A duplicated id can hold only one entry — last wins, and the pair says it is thin.
      if (id && id in values) partial = true
      if (id) values[id] = fm[key]
      else partial = true
    }
  }
  await writePropertyPair(root, {
    entity: 'property',
    id: propertyId,
    def,
    values,
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
  const folders = await allCollectionFolders(root)
  await snapshot(root, propertyId, def, folders)

  for (const folder of folders) {
    // Strip the value from every page under its file lock (shared with the cell-write path).
    for (const file of await listMarkdownFiles(folder)) {
      await rewritePageSerialized(file, (content) =>
        sweepAdmits(content) ? stripPageMember(content, key) : null,
      )
    }
    // Then unassign + purge the Remove-cache on the collection sidecar (JSON, never raced by a
    // cell-write). The .trash snapshot above is the recovery net, so this needn't be atomic.
    const sidecar = await readSidecar(folder, 'collection', pageCollectionSidecar)
    if (!sidecar) continue
    const assigned = (sidecar.properties as string[] | undefined) ?? []
    const cacheAll = isPlainObject(sidecar.property_cache) ? sidecar.property_cache : undefined
    const hadCache = cacheAll !== undefined && propertyId in cacheAll
    if (!assigned.includes(propertyId) && !hadCache) continue
    const next: Record<string, unknown> = {
      ...sidecar,
      properties: assigned.filter((id) => id !== propertyId),
      modified_at: nowIso(),
    }
    // Spread, never Object.assign — dropping the last block is encoded by the key's ABSENCE,
    // and assign only copies keys that are present.
    const scrubbed = hadCache ? withoutCacheBlock(next, propertyId) : next
    await writeJson(join(folder, SIDECAR_FILENAME.collection), scrubbed)
  }
  return removeFromRegistry(root, propertyId)
}
