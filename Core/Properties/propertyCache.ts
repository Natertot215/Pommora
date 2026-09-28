// A Collection sidecar's `property_cache`: the values a property Remove set aside, keyed by property and then by page id.

import { isPlainObject } from '../Contract/validators'
import { join } from '../Paths/posix'
import { patchSidecar } from '../Files/sidecar'
import type { CollectionNode } from '../Nexus/tree'

export function cachedValues(
  sidecar: Record<string, unknown> | null,
  propertyId: string,
): Record<string, unknown> | null {
  const block = isPlainObject(sidecar?.property_cache) ? sidecar.property_cache[propertyId] : null
  return isPlainObject(block) && isPlainObject(block.values) ? block.values : null
}

// The one writer of a sidecar's `property_cache` block — an absent block value removes the entry, and an emptied cache leaves no key behind.
export function patchCacheBlock(
  sidecar: Record<string, unknown>,
  propertyId: string,
  blockValue?: Record<string, unknown>,
): Record<string, unknown> {
  const cache = { ...(isPlainObject(sidecar.property_cache) ? sidecar.property_cache : {}) }
  if (blockValue) cache[propertyId] = blockValue
  else delete cache[propertyId]
  const next: Record<string, unknown> = { ...sidecar }
  if (Object.keys(cache).length) next.property_cache = cache
  else delete next.property_cache
  return next
}

/** Edits the values each Collection the tree lists as caching one of `propertyIds` holds, through `edit`, which answers a block's next values or null to leave it; answers the folders it wrote and how many it couldn't edit. */
export async function editCaches(
  root: string,
  collections: readonly CollectionNode[],
  propertyIds: ReadonlySet<string>,
  edit: (values: Record<string, unknown>) => Record<string, unknown> | null,
): Promise<{ written: string[]; skipped: number }> {
  const out = { written: [] as string[], skipped: 0 }
  for (const node of collections) {
    const ids = (node.cached ?? []).filter((id) => propertyIds.has(id))
    if (!ids.length) continue
    const folder = join(root, node.path)
    let wrote = false
    const written = await patchSidecar(folder, 'collection', (cur) => {
      let next: Record<string, unknown> | null = null
      for (const id of ids) {
        const values = cachedValues(next ?? cur, id)
        const edited = values && edit(values)
        if (edited)
          next = patchCacheBlock(
            next ?? cur,
            id,
            Object.keys(edited).length ? { values: edited } : undefined,
          )
      }
      wrote = next !== null
      return next
    }).catch(() => null)
    if (!written?.ok) out.skipped++
    else if (wrote) out.written.push(folder)
  }
  return out
}
