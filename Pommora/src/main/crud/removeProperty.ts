// Remove — the daily non-destructive lifecycle op, and its restore half. Remove caches
// { pageId: raw } + unassigns on the Collection's sidecar FIRST, then strips the property's value
// from every member page under its file lock. Cache-before-strip keeps Remove RECOVERABLE: the
// values are persisted before any page loses them, so an fs failure mid-strip never destroys
// them. Re-assigning restores each cached value that still conforms to the def's CURRENT type +
// options (per-value reconciliation); the global Delete purges these caches.

import { join } from 'node:path'
import { rewritePageSerialized } from '../io/fileLock'
import { stripPageMember } from './schema'
import { readSidecar } from '../sidecarIO'
import { pageCollectionSidecar } from '@shared/schemas'
import { listMarkdownFiles } from '../io/walk'
import { SIDECAR_FILENAME } from '../paths'
import { readTextOrNull, writeJson } from '../io/atomicWrite'
import { readFrontmatterFields, mergeFrontmatter, splitEnvelope } from '../io/pageFile'
import { withoutCacheBlock } from './assignment'
import { readRegistry } from '../io/propertiesRegistry'
import { decodeValue, encodeValue, isPlainObject } from '@shared/propertyValue'
import { serializeSchemaOp } from './schemaChain'
import { nowIso } from './util'
import { ok, type Result } from '@shared/result'
import { wrapKey } from '@shared/governedKeys'

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
  const key = wrapKey('property', def.name)

  const files = await listMarkdownFiles(collectionFolder)
  // Snapshot each page's value for the restore cache — read BEFORE stripping so the cache is
  // written first (below): a failure mid-strip can then never lose a value it didn't capture.
  const values: Record<string, unknown> = {}
  for (const file of files) {
    const content = await readTextOrNull(file)
    if (content === null) continue
    const fields = readFrontmatterFields(content)
    const raw = (fields as Record<string, unknown>)[key]
    if (raw === undefined) continue
    // Only the CACHE needs identity — an id-less page still gets stripped (below), its value
    // just isn't restorable; Remove must not leak the value it exists to clear.
    if (typeof fields.id === 'string') values[fields.id] = raw
  }
  const cache = { ...(sidecar.property_cache as Record<string, unknown> | undefined) }
  // No value, no key — a block with nothing in it is the same violation as an empty map.
  if (Object.keys(values).length) cache[propertyId] = { removed_at: nowIso(), values }
  // Cache + unassign FIRST (the sidecar is never raced by a cell-write), THEN strip each page
  // under its file lock. Cache-before-strip keeps the values safely persisted before any page
  // loses them, so a failure mid-strip is recoverable, never lossy.
  const nextSidecar: Record<string, unknown> = {
    ...sidecar,
    properties: ids.filter((id) => id !== propertyId),
    property_cache: cache,
    modified_at: nowIso(),
  }
  if (Object.keys(cache).length === 0) delete nextSidecar.property_cache
  await writeJson(join(collectionFolder, SIDECAR_FILENAME.collection), nextSidecar)
  for (const file of files) {
    await rewritePageSerialized(file, (content) => stripPageMember(content, key))
  }
  return ok(null)
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

  const def = (await readRegistry(root)).defs[propertyId]
  if (def) {
    // Map page id → file; the value write re-reads fresh inside the file lock.
    const byId = new Map<string, string>()
    for (const file of await listMarkdownFiles(collectionFolder)) {
      const content = await readTextOrNull(file)
      if (content === null) continue
      const id = readFrontmatterFields(content).id
      if (typeof id === 'string') byId.set(id, file)
    }
    for (const [pageId, raw] of Object.entries(block.values)) {
      const file = byId.get(pageId)
      if (!file) continue
      // Strict: a restore never plants a value the definition's CURRENT type and options
      // cannot validate. That gate is the decoder's `strict` mode, not a second decoder.
      const value = decodeValue(def, raw, { strict: true })
      if (value.kind === 'null') continue
      const key = wrapKey('property', def.name)
      await rewritePageSerialized(file, (content) =>
        mergeFrontmatter(
          content,
          { [key]: encodeValue(value), modified_at: nowIso() },
          [key, 'modified_at'],
          splitEnvelope(content).body,
        ),
      )
    }
  }
  // Clear the cache block LAST — restore the pages first, so a failure mid-restore leaves the
  // cache intact for a re-run rather than dropping the values it hadn't restored yet.
  const nextSidecar = { ...withoutCacheBlock(sidecar, propertyId), modified_at: nowIso() }
  await writeJson(join(collectionFolder, SIDECAR_FILENAME.collection), nextSidecar)
  return ok(null)
}
