// Remove caches { pageId: raw } + unassigns on the Collection's sidecar FIRST, then strips the
// property's value from every member page under its file lock — cache-before-strip means an fs
// failure mid-strip never destroys a value the cache didn't already capture. Re-assigning
// restores each cached value that still conforms to the def's CURRENT type + options; the global
// Delete purges these caches.

import { contentId } from '@shared/identity'
import { stripPageMember } from './pageValue'
import { readSidecar } from '../sidecarIO'
import { pageCollectionSidecar } from '@shared/schemas'
import { sidecarPath } from '../paths'
import { readTextOrNull, rewritePageSerialized, rmwJsonStrict } from '../IO/atomicWrite'
import { folderCorpus, indexWrittenPage } from '../indexSeed'
import { noteValueWrite } from '../valuesChanged'
import { readFrontmatterFields } from '../IO/pageFile'
import { serializeOnFile } from '../IO/fileLock'
import { readRegistry } from '../IO/propertiesRegistry'
import { isBlankValue, isPlainObject, reconcilePropertyValue } from '@shared/propertyValue'
import { updatePageProperty } from './page'
import { reconcile } from './reconcile'
import { serializeSchemaOp } from './schemaChain'
import { sweepAdmits } from './util'
import { ok, type Result } from '@shared/result'

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
  const sidecar = await readSidecar(collectionFolder, 'collection', pageCollectionSidecar)
  const ids = (sidecar?.properties as string[] | undefined) ?? []
  if (!sidecar || !ids.includes(propertyId)) return ok(null)

  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return ok(null)
  const key = def.name

  const files = await folderCorpus(root, collectionFolder)
  const values: Record<string, unknown> = {}
  for (const file of files) {
    const content = await readTextOrNull(file)
    if (content === null) continue
    const fields = readFrontmatterFields(content)
    const id = contentId(fields)
    const raw = (fields as Record<string, unknown>)[key]
    if (raw === undefined) continue
    // Only the cache needs identity — an id-less page still gets stripped below, its value
    // just isn't restorable.
    if (id) values[id] = raw
  }
  // Cache + unassign FIRST under the sidecar's own lock, so the page-read window above can't
  // revert a concurrent icon/banner/view write — THEN strip each page under its file lock.
  const written = await rmwJsonStrict(sidecarPath(collectionFolder, 'collection'), (cur) =>
    patchCacheBlock(
      { ...cur, properties: ids.filter((id) => id !== propertyId) },
      propertyId,
      Object.keys(values).length ? { values } : undefined,
    ),
  )
  if (!written.ok) return written
  for (const file of files) {
    const wrote = await rewritePageSerialized(file, (content) =>
      sweepAdmits(content) ? stripPageMember(content, key) : null,
    )
    if (wrote) {
      noteValueWrite(root, file)
      await indexWrittenPage(root, file)
    }
  }
  return ok(null)
}

/** Shared by both cache writers. The no-empties rule drops an emptied map's key. */
function patchCacheBlock(
  cur: Record<string, unknown>,
  propertyId: string,
  blockValue: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const cache = { ...(isPlainObject(cur.property_cache) ? cur.property_cache : {}) }
  if (blockValue) cache[propertyId] = blockValue
  else delete cache[propertyId]
  const next: Record<string, unknown> = { ...cur }
  if (Object.keys(cache).length) next.property_cache = cache
  else delete next.property_cache
  return next
}

/** Write each reconciled value back to the page (matched by frontmatter id) that held it;
 *  deleted/moved-out pages drop their entries. Pages first, cache cleared last. */
export async function restoreCachedValues(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<null>> {
  const sidecar = await readSidecar(collectionFolder, 'collection', pageCollectionSidecar)
  if (!sidecar) return ok(null)
  const cacheAll = isPlainObject(sidecar.property_cache) ? sidecar.property_cache : undefined
  const block = cacheAll?.[propertyId]
  if (!isPlainObject(block) || !isPlainObject(block.values)) return ok(null)

  // No readable definition → the cache stays whole: a def that reappears later still finds
  // everything waiting.
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return ok(null)
  const byId = new Map<string, string>()
  for (const file of await folderCorpus(root, collectionFolder)) {
    const content = await readTextOrNull(file)
    if (content === null) continue
    const id = contentId(readFrontmatterFields(content))
    if (id) byId.set(id, file)
  }
  // What didn't restore — a vanished page, a value the def's current type/options reject, a
  // page whose frontmatter refuses the write — stays cached.
  const { kept: survivors } = await reconcile(block.values, async (pageId, raw) => {
    const file = byId.get(pageId)
    if (!file) return false
    const reconciled = reconcilePropertyValue(def, raw, false)
    if (isBlankValue(reconciled.value)) return false
    const wrote = await serializeOnFile(file, async () => {
      const content = await readTextOrNull(file)
      if (content === null || !sweepAdmits(content)) return false
      return (await updatePageProperty(file, def, reconciled.value)).ok
    })
    if (wrote) await indexWrittenPage(root, file)
    return wrote
  })
  // The page walk above deliberately runs unlocked.
  const written = await rmwJsonStrict(sidecarPath(collectionFolder, 'collection'), (cur) =>
    patchCacheBlock(
      cur,
      propertyId,
      Object.keys(survivors).length ? { ...block, values: survivors } : undefined,
    ),
  )
  if (!written.ok) return written
  return ok(null)
}
