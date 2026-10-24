import { assignedIds } from '../Nexus/containerFields'
import { stashedBlock, patchStashBlock } from './propertyStash'
import { findHolders, heldAbove, heldValues, unaddressed } from '../Index/keyHolders'
import { patchSidecar } from '../Files/sidecar'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { sweepGovernedRoots } from '../Nexus/governedSweep'
import { stripKeys } from '../Files/rootValues'
import { readRegistry, serializeSchemaOp } from './propertiesRegistry'
import { ok } from '../Contract/result'
import { mapViews } from '../Views/views'
import { type ConfigReach, propertyClear, reachConfig, sweptReach } from '../Nexus/configReach'
import type { MutateReply } from '../Nexus/mutateRequest'
import { distinct, propertyNote, runNoted } from '../Nexus/owed'
import { containerAt } from '../Nexus/treePatch'
import { liveTreeOf } from '../Nexus/liveTree'
import { relative } from '../Paths/posix'
import type { PropertyDefinition } from './properties'

export function unassignProperty(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<MutateReply> {
  return serializeSchemaOp(root, () => unassignInner(root, collectionFolder, propertyId))
}

async function unassignInner(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<MutateReply> {
  const collection = containerAt(await liveTreeOf(root), relative(root, collectionFolder))
  const sidecar = await readJsonObject(sidecarPath(collectionFolder, 'collection'))
  if (!collection || !assignedIds(sidecar).includes(propertyId)) return ok({})

  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return ok({})
  const clear = propertyClear(propertyId)
  // The note names the Collection by id, since its folder can move or be renamed before a finish.
  return runNoted(root, propertyId, {
    note: (e) => ({
      ...propertyNote(e),
      collections: distinct(propertyNote(e).collections, [collection.id]),
    }),
    // The views and the assignment change in one write under the sidecar's own lock, so no concurrent icon, banner, or view write is reverted; the stash follows in `stashAndStrip`.
    list: () =>
      patchSidecar(collectionFolder, 'collection', (cur) => ({
        ...(mapViews(cur, clear) ?? cur),
        properties: assignedIds(cur).filter((id) => id !== propertyId),
      })),
    sweep: async () => {
      const reach = await reachConfig(root, { kind: 'property', propertyId }, collectionFolder)
      const stripped = await stashAndStrip(root, collectionFolder, def)
      return { ...stripped, skipped: reach.skipped + stripped.skipped, hosts: reach.hosts }
    },
    settle: (e) => ({
      ...propertyNote(e),
      collections: distinct(propertyNote(e).collections?.filter((id) => id !== collection.id)),
    }),
    under: propertyId,
  })
}

/** Moves the values the Collection's holders hold for `def` into its stash, then strips the key, answering what it couldn't reach: a file it can't read or rewrite, and a holder with no id to stash under, which keeps its value. The stash keeps what it already holds, which a refill cut short left for pages it never reached. */
export async function stashAndStrip(
  root: string,
  folder: string,
  def: PropertyDefinition,
): Promise<ConfigReach> {
  const { pages, held } = await findHolders(
    root,
    { keys: [def.key], reach: { collection: folder } },
    'values',
  )
  const values = heldValues(held, def.key)
  const above = heldAbove(held, def.key)
  if (Object.keys(values).length) {
    const stashed = await patchSidecar(folder, 'collection', (cur) =>
      patchStashBlock(cur, def.id, {
        removed_at: new Date().toISOString(),
        values: { ...stashedBlock(cur, def.id)?.values, ...values },
        above: { ...stashedBlock(cur, def.id)?.above, ...above },
      }),
    )
    if (!stashed.ok) return { skipped: held.length, hosts: [] }
  }
  const swept = await sweepGovernedRoots(pages, { raw: (r) => stripKeys(r, [def.key]) })
  return { ...sweptReach(swept), skipped: swept.skipped.length + unaddressed(held) }
}
