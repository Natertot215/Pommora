import { clamp } from '@pommora/uix/Utilities/clamp'
import { isPlainObject } from './propertyValue'
import { moveItem } from '@pommora/uix/Utilities/moveItem'
import { join } from '../Paths/posix'
import { readSidecar, writeSidecar, withSidecarLock } from '../Files/sidecar'
import { pageCollectionSidecar } from '../Nexus/schemas'
import { getLiveTree, refreshTree } from '../Nexus/liveTree'
import { restoreCachedValues } from './removeProperty'
import { serializeSchemaOp } from './schemaChain'
import type { CollectionNode, SetNode } from '../Nexus/tree'
import { ok, fail, type Result } from '../Contract/result'

async function read(
  folder: string,
): Promise<{ sidecar: Record<string, unknown>; ids: string[] } | null> {
  const sidecar = await readSidecar(folder, 'collection', pageCollectionSidecar)
  if (sidecar === null) return null
  return {
    sidecar: sidecar as Record<string, unknown>,
    ids: (sidecar.properties as string[] | undefined) ?? [],
  }
}

const write = async (
  folder: string,
  sidecar: Record<string, unknown>,
  ids: string[],
): Promise<void> => writeSidecar(folder, 'collection', { ...sidecar, properties: ids })

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

// A chained fn awaiting another chained fn would deadlock the schema chain, so these are unchained internals a chained op composes in its own slot.
export async function assignInner(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<null>> {
  // Restore stays OUTSIDE the sidecar lock: it walks every member page, long enough that holding the lock would stall every sibling sidecar write.
  const appended = await withSidecarLock(collectionFolder, 'collection', async () => {
    const r = await read(collectionFolder)
    if (!r) return fail('not-found', 'Collection not found.')
    if (r.ids.includes(propertyId)) return ok(false)
    await write(collectionFolder, r.sidecar, [...r.ids, propertyId])
    return ok(true)
  })
  if (!appended.ok) return appended
  if (!appended.value) return ok(null)
  return restoreCachedValues(root, collectionFolder, propertyId)
}

function reorderInner(
  collectionFolder: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  return withSidecarLock(collectionFolder, 'collection', async () => {
    const r = await read(collectionFolder)
    if (!r) return fail('not-found', 'Collection not found.')
    const from = r.ids.indexOf(propertyId)
    if (from < 0) return fail('not-found', 'Property not assigned.')
    const next = moveItem(r.ids, from, clamp(toIndex, 0, r.ids.length - 1))
    await write(collectionFolder, r.sidecar, next)
    return ok(null)
  })
}

export function assignProperty(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<null>> {
  return serializeSchemaOp(() => assignInner(root, collectionFolder, propertyId))
}

export function assignPropertyAt(
  root: string,
  collectionFolder: string,
  propertyId: string,
  toIndex?: number,
): Promise<Result<null>> {
  return serializeSchemaOp(async () => {
    const a = await assignInner(root, collectionFolder, propertyId)
    if (!a.ok || toIndex === undefined) return a
    return reorderInner(collectionFolder, propertyId, toIndex)
  })
}

export async function collectionFolders(root: string): Promise<string[]> {
  const held = getLiveTree()
  const tree = held?.nexus.rootPath === root ? held : await refreshTree(root)
  const out: string[] = []
  const visit = (node: CollectionNode | SetNode): void => {
    if (node.kind === 'collection') out.push(join(root, node.path))
    for (const s of node.sets ?? []) visit(s)
  }
  for (const c of tree.collections) visit(c)
  return out
}

export async function collectionFolderOf(root: string, absFile: string): Promise<string | null> {
  return (await collectionFolders(root)).find((f) => absFile.startsWith(`${f}/`)) ?? null
}

export function reorderAssignment(
  collectionFolder: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  return serializeSchemaOp(() => reorderInner(collectionFolder, propertyId, toIndex))
}
