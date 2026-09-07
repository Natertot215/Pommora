import { contentId } from '../Nexus/identityMark'
import { patchCacheBlock } from './assignment'
import { stripPageMember } from './pageValue'
import { readSidecar } from '../Files/sidecar'
import { pageCollectionSidecar } from '../Nexus/schemas'
import { sidecarPath } from '../Paths/paths'
import { readTextOrNull, rmwJsonStrict } from '../Files/atomicWrite'
import { folderCorpus } from '../Index/indexSeed'
import { sweepGovernedRoots } from './governedSweep'
import { splitFrontmatter } from '../Files/pageFile'
import { machine } from '../Platform/machine'
import { readRegistry } from './propertiesRegistry'
import { isBlankValue, isPlainObject, reconcilePropertyValue } from './propertyValue'
import { updatePageProperty } from '../Nexus/page'
import { reconcile } from './reconcile'
import { serializeSchemaOp } from './schemaChain'
import { sweepAdmits } from '../Nexus/util'
import { ok, type Result } from '../Contract/result'

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
    const fields = splitFrontmatter(content)
    const id = contentId(fields)
    const raw = (fields as Record<string, unknown>)[key]
    if (raw === undefined) continue
    if (id) values[id] = raw
  }
  // Cache + unassign FIRST under the sidecar's own lock, so the page-read window above can't revert a concurrent icon/banner/view write — THEN strip each page under its file lock.
  const written = await rmwJsonStrict(sidecarPath(collectionFolder, 'collection'), (cur) =>
    patchCacheBlock(
      { ...cur, properties: ids.filter((id) => id !== propertyId) },
      propertyId,
      Object.keys(values).length ? { values } : undefined,
    ),
  )
  if (!written.ok) return written
  const text = (content: string): string | null => stripPageMember(content, key)
  await sweepGovernedRoots(root, files, { text })
  return ok(null)
}

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

  // No readable definition → the cache stays whole: a def that reappears later still finds everything waiting.
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return ok(null)
  const byId = new Map<string, string>()
  for (const file of await folderCorpus(root, collectionFolder)) {
    const content = await readTextOrNull(file)
    if (content === null) continue
    const id = contentId(splitFrontmatter(content))
    if (id) byId.set(id, file)
  }
  const { kept: survivors } = await reconcile(block.values, async (pageId, raw) => {
    const file = byId.get(pageId)
    if (!file) return false
    const reconciled = reconcilePropertyValue(def, raw, false)
    if (isBlankValue(reconciled.value)) return false
    return machine().lock(file, async () => {
      const content = await readTextOrNull(file)
      if (content === null || !sweepAdmits(content)) return false
      return (await updatePageProperty(root, file, def, reconciled.value)).ok
    })
  })
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
