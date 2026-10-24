// A Collection sidecar's `property_stash`: per property, the values a Remove set aside, keyed by page id, and when it set them aside.

import { z } from 'zod'
import { isPlainObject } from '../Contract/validators'
import { join } from '../Paths/posix'
import { patchSidecar } from '../Files/sidecar'
import { heldTreeOf } from '../Nexus/liveTree'
import { readFileHistoryConfig } from '../Settings/settings'
import type { CollectionNode } from '../Nexus/tree'

/** One property's stashed values by page id, when they were removed, and, per page, the key its line stood above; a malformed `above` reads as none. */
export const stashBlock = z.object({
  removed_at: z.string(),
  values: z.record(z.string(), z.unknown()),
  above: z.record(z.string(), z.string()).optional().catch(undefined),
})
export type StashBlock = z.infer<typeof stashBlock>

export function stashedBlock(
  sidecar: Record<string, unknown> | null,
  propertyId: string,
): StashBlock | null {
  const block = isPlainObject(sidecar?.property_stash) ? sidecar.property_stash[propertyId] : null
  const read = stashBlock.safeParse(block)
  return read.success ? read.data : null
}

// The one writer of a sidecar's `property_stash` block — a block absent or holding no values removes the entry, an `above` stays only for a value the block holds, and an emptied stash leaves no key behind.
export function patchStashBlock(
  sidecar: Record<string, unknown>,
  propertyId: string,
  block?: StashBlock,
): Record<string, unknown> {
  const stash = { ...(isPlainObject(sidecar.property_stash) ? sidecar.property_stash : {}) }
  if (block && Object.keys(block.values).length) {
    const above = Object.entries(block.above ?? {}).filter(([id]) =>
      Object.hasOwn(block.values, id),
    )
    stash[propertyId] = { ...block, above: above.length ? Object.fromEntries(above) : undefined }
  } else delete stash[propertyId]
  const next: Record<string, unknown> = { ...sidecar }
  if (Object.keys(stash).length) next.property_stash = stash
  else delete next.property_stash
  return next
}

/** Edits the values each Collection the tree lists as stashing one of `propertyIds` holds, through `edit`, which reads a block's values, its property's id, and its stamp, and answers its next values or null to leave it; answers how many it couldn't edit. */
export async function editStashes(
  root: string,
  collections: readonly CollectionNode[],
  propertyIds: ReadonlySet<string>,
  edit: (
    values: Record<string, unknown>,
    id: string,
    removedAt: string,
  ) => Record<string, unknown> | null,
): Promise<number> {
  let skipped = 0
  for (const node of collections) {
    const ids = (node.stashed ?? []).filter((id) => propertyIds.has(id))
    if (!ids.length) continue
    // Each block the edit changes keeps its stamp, and one it empties leaves.
    const written = await patchSidecar(join(root, node.path), 'collection', (cur) => {
      let next: Record<string, unknown> | null = null
      for (const id of ids) {
        const block = stashedBlock(next ?? cur, id)
        const edited = block && edit(block.values, id, block.removed_at)
        if (edited) next = patchStashBlock(next ?? cur, id, { ...block, values: edited })
      }
      return next
    }).catch(() => null)
    if (!written?.ok) skipped++
  }
  return skipped
}

/** Drops every block a Remove last stamped before the History Timeframe, in the Collections the held tree lists as stashing one; with none listed, it reads nothing. */
export async function sweepStashes(root: string): Promise<void> {
  const collections = heldTreeOf(root)?.collections ?? []
  const ids = new Set(collections.flatMap((c) => c.stashed ?? []))
  if (!ids.size) return
  const cutoff = Date.now() - (await readFileHistoryConfig(root)).keepMs
  await editStashes(root, collections, ids, (_values, _id, removedAt) =>
    Date.parse(removedAt) < cutoff ? {} : null,
  )
}
