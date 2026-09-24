import { assignedIds, cachedValues, patchCacheBlock } from './assignment'
import { keyedHolders } from './keyHolders'
import { stripPageMember } from './pageValue'
import { patchSidecar } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject, readTextOrNull } from '../Files/atomicWrite'
import { folderCorpus } from '../Index/indexSeed'
import { sweepGovernedRoots } from './governedSweep'
import { splitFrontmatter, stampedId } from '../Files/pageFile'
import { machine } from '../Platform/machine'
import { readRegistry } from './propertiesRegistry'
import { isBlankValue, type PropertyValue, reconcilePropertyValue } from './propertyValue'
import { updatePageProperty } from '../Nexus/page'
import { reconcile } from './reconcile'
import { serializeSchemaOp } from './schemaChain'
import { sweepAdmits } from '../Files/pageFile'
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
  const sidecar = await readJsonObject(sidecarPath(collectionFolder, 'collection'))
  if (!assignedIds(sidecar).includes(propertyId)) return ok(null)

  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return ok(null)
  const key = def.name

  const { holders, values } = await keyedHolders(
    root,
    await folderCorpus(root, collectionFolder),
    key,
  )
  // Cache + unassign FIRST under the sidecar's own lock, so the page-read window above can't revert a concurrent icon/banner/view write — THEN strip each page under its file lock.
  const written = await patchSidecar(collectionFolder, 'collection', (cur) =>
    patchCacheBlock(
      { ...cur, properties: assignedIds(cur).filter((id) => id !== propertyId) },
      propertyId,
      Object.keys(values).length ? { values } : undefined,
    ),
  )
  if (!written.ok) return written
  const text = (content: string): string | null => stripPageMember(content, key)
  await sweepGovernedRoots(root, holders, { text })
  return ok(null)
}

export async function restoreCachedValues(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<null>> {
  const cached = cachedValues(
    await readJsonObject(sidecarPath(collectionFolder, 'collection')),
    propertyId,
  )
  if (!cached) return ok(null)

  // No readable definition → the cache stays whole: a def that reappears later still finds everything waiting.
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return ok(null)
  const byId = new Map<string, string[]>()
  for (const file of await folderCorpus(root, collectionFolder)) {
    const content = await readTextOrNull(file)
    const id = content === null ? null : stampedId(content)
    if (id) byId.set(id, [...(byId.get(id) ?? []), file])
  }
  const fill = (file: string, value: PropertyValue): Promise<boolean> =>
    machine().lock(file, async () => {
      const content = await readTextOrNull(file)
      if (content === null || !sweepAdmits(content)) return false
      const held = reconcilePropertyValue(def, splitFrontmatter(content)[def.name], false)
      if (!isBlankValue(held.value)) return false
      return (await updatePageProperty(root, file, def, value)).ok
    })
  const { spent } = await reconcile(cached, async (pageId, raw) => {
    const reconciled = reconcilePropertyValue(def, raw, false)
    if (isBlankValue(reconciled.value)) return false
    for (const file of byId.get(pageId) ?? []) if (await fill(file, reconciled.value)) return true
    return false
  })
  const written = await patchSidecar(collectionFolder, 'collection', (cur) => {
    const left = { ...(cachedValues(cur, propertyId) ?? {}) }
    for (const id of spent) delete left[id]
    return patchCacheBlock(cur, propertyId, Object.keys(left).length ? { values: left } : undefined)
  })
  if (!written.ok) return written
  return ok(null)
}
