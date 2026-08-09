// Remove — the daily non-destructive lifecycle op, and its restore half. Remove caches
// { pageId: raw } + unassigns on the Collection's sidecar FIRST, then strips the property's value
// from every member page under its file lock. Cache-before-strip keeps Remove RECOVERABLE: the
// values are persisted before any page loses them, so an fs failure mid-strip never destroys
// them. Re-assigning restores each cached value that still conforms to the def's CURRENT type +
// options (per-value reconciliation); the global Delete purges these caches.

import { contentId } from '@shared/identity'
import { stripPageMember } from './pageValue'
import { readSidecar } from '../sidecarIO'
import { propertyValueStands } from './standing'
import { pageCollectionSidecar } from '@shared/schemas'
import { listMarkdownFiles } from '../io/walk'
import { sidecarPath } from '../paths'
import { rewritePageSerialized, readTextOrNull, rmwJsonStrict } from '../io/atomicWrite'
import { readFrontmatterFields, mergeFrontmatter, splitEnvelope } from '../io/pageFile'
import { readRegistry } from '../io/propertiesRegistry'
import { encodeValue, isPlainObject, propertyKey } from '@shared/propertyValue'
import { reconcile } from './reconcile'
import { serializeSchemaOp } from './schemaChain'
import { nowIso, sweepAdmits } from './util'
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
  if (!sidecar || !ids.includes(propertyId)) return ok(null) // not assigned → no-op

  // A property's values live under its own name, so the strip needs the registry's key.
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return ok(null)
  const key = propertyKey(def)

  const files = await listMarkdownFiles(collectionFolder)
  // Snapshot each page's value for the restore cache — read BEFORE stripping so the cache is
  // written first (below): a failure mid-strip can then never lose a value it didn't capture.
  const values: Record<string, unknown> = {}
  for (const file of files) {
    const content = await readTextOrNull(file)
    if (content === null) continue
    const fields = readFrontmatterFields(content)
    const id = contentId(fields)
    const raw = (fields as Record<string, unknown>)[key]
    if (raw === undefined) continue
    // Only the CACHE needs identity — an id-less page still gets stripped (below), its value
    // just isn't restorable; Remove must not leak the value it exists to clear.
    if (id) values[id] = raw
  }
  // Cache + unassign FIRST — under the sidecar's own lock, so the page-read window above can't
  // revert a concurrent icon/banner/view write — THEN strip each page under its file lock.
  // Cache-before-strip keeps the values safely persisted before any page loses them, so a
  // failure mid-strip is recoverable, never lossy.
  const written = await rmwJsonStrict(sidecarPath(collectionFolder, 'collection'), (cur) =>
    patchCacheBlock(
      { ...cur, properties: ids.filter((id) => id !== propertyId) },
      propertyId,
      // No value, no key — a block with nothing in it is the same violation as an empty map.
      Object.keys(values).length ? { values } : undefined,
    ),
  )
  if (!written.ok) return written
  for (const file of files) {
    await rewritePageSerialized(file, (content) =>
      sweepAdmits(content) ? stripPageMember(content, key) : null,
    )
  }
  return ok(null)
}

/** One shape for both cache writers: set (or clear, on undefined) a property's cache block on a
 *  fresh sidecar read, stamping the edit — the no-empties rule drops an emptied map's key. */
function patchCacheBlock(
  cur: Record<string, unknown>,
  propertyId: string,
  blockValue: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const cache = { ...(isPlainObject(cur.property_cache) ? cur.property_cache : {}) }
  if (blockValue) cache[propertyId] = blockValue
  else delete cache[propertyId]
  const next: Record<string, unknown> = { ...cur, modified_at: nowIso() }
  if (Object.keys(cache).length) next.property_cache = cache
  else delete next.property_cache
  return next
}

/** Restore the Remove-cache on re-assign: write each reconciled value back to the page
 *  (matched by frontmatter id) that held it — deleted/moved-out pages drop their entries —
 *  then clear the block. Pages first (under their file lock), cache cleared last. No block → no-op. */
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

  // No readable definition → the cache stays whole: a restore can only spend an entry it
  // actually wrote back, and a def that reappears later still finds everything waiting.
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return ok(null)
  const key = propertyKey(def)
  // Map page id → file; the value write re-reads fresh inside the file lock.
  const byId = new Map<string, string>()
  for (const file of await listMarkdownFiles(collectionFolder)) {
    const content = await readTextOrNull(file)
    if (content === null) continue
    const id = contentId(readFrontmatterFields(content))
    if (id) byId.set(id, file)
  }
  // Each entry leaves the cache only as its page write lands; what didn't restore — a page
  // that vanished, a value the def's CURRENT type/options reject, a page whose frontmatter
  // refuses the write — stays cached.
  // rewritePageSerialized RESOLVES false for a page it couldn't read — only a landed write
  // resolves true — so the resolved boolean is the spend signal, with refusals mapped in.
  const { kept: survivors } = await reconcile(block.values, async (pageId, raw) => {
    const file = byId.get(pageId)
    if (!file) return false
    // The same standing check restore asks — one predicate, so a cached value and a recorded
    // one can never disagree about whether they may come back.
    const standing = propertyValueStands(def, raw)
    if (!standing.stands) return false
    return rewritePageSerialized(file, (content) =>
      !sweepAdmits(content)
        ? null
        : mergeFrontmatter(
            content,
            { [key]: encodeValue(standing.value), modified_at: nowIso() },
            [key, 'modified_at'],
            splitEnvelope(content).body,
          ),
    )
  })
  // The page walk above deliberately runs unlocked; the cache clear takes the sidecar's own key,
  // which the primitive derives from the path it writes.
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
