import { mintBundle } from '../Bundles/bundle'
import { writeRecord } from '../Bundles/record'
import { assignedIds } from '../Nexus/containerFields'
import { stashedBlock, patchStashBlock, type StashBlock } from './propertyStash'
import {
  readRegistry,
  type PropertyRegistry,
  NO_PROPERTY,
  serializeSchemaOp,
} from './propertiesRegistry'
import { removeFromRegistry } from './registryProperty'
import {
  findHolders,
  type Held,
  heldAbove,
  heldValues,
  type Holders,
  unaddressed,
} from '../Index/keyHolders'
import { liveTreeOf } from '../Nexus/liveTree'
import { owedDelete, propertyNote, readNotes, runNoted } from '../Nexus/owed'
import {
  collectionFolders,
  sweepCount,
  sweepGovernedRoots,
  type SweepPlan,
} from '../Nexus/governedSweep'
import { stripKeys } from '../Files/rootValues'
import { patchSidecar } from '../Files/sidecar'
import { readJsonObject, removeOwn } from '../Files/atomicWrite'
import { sidecarPath } from '../Paths/paths'
import { withoutOrderId } from '../Contexts/spaceSidecar'
import { ok, type Result } from '../Contract/result'
import { join, relative } from '../Paths/posix'
import type { MutateReply } from '../Nexus/mutateRequest'
import { type ConfigReach, reachConfig } from '../Nexus/configReach'

async function snapshot(
  root: string,
  propertyId: string,
  def: PropertyRegistry[string],
  folders: string[],
  held: readonly Held[],
  keys: readonly string[],
): Promise<string> {
  // A holder under several keys files the last one's value, and `keys` ends with the current key.
  const values = Object.fromEntries(keys.flatMap((key) => Object.entries(heldValues(held, key))))
  const above = Object.fromEntries(keys.flatMap((key) => Object.entries(heldAbove(held, key))))
  const assignments: string[] = []
  const stashes: Record<string, StashBlock> = {}
  let partial = held.some((h) => !h.id || !h.values)
  for (const folder of folders) {
    // Gathered before the unassign strips it — a property restored into no Collection is defined but belongs nowhere.
    const sidecar = await readJsonObject(sidecarPath(folder, 'collection'))
    if (!sidecar) partial = true
    const id = typeof sidecar?.id === 'string' ? sidecar.id : null
    const holds = assignedIds(sidecar).includes(propertyId)
    const stashed = stashedBlock(sidecar, propertyId)
    if ((holds || stashed) && !id) partial = true
    if (holds && id) assignments.push(id)
    if (stashed && id) stashes[id] = stashed
  }
  const bundle = await mintBundle(root, { kind: 'trash' }, join(root, `property-${propertyId}`))
  await writeRecord(bundle, {
    entity: 'property',
    id: propertyId,
    def,
    values,
    ...(Object.keys(above).length ? { above } : {}),
    ...(assignments.length ? { assignments } : {}),
    ...(Object.keys(stashes).length ? { stashes } : {}),
    ...(partial ? { partial: true as const } : {}),
  })
  return bundle
}

export async function propertyHolders(root: string, propertyId: string): Promise<Result<number>> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NO_PROPERTY
  const { holders, plan } = await deletePlan(root, propertyId, [def.key])
  return ok(await sweepCount(root, holders.files, plan))
}

export function deleteProperty(root: string, propertyId: string): Promise<MutateReply> {
  return serializeSchemaOp(root, () => deleteInner(root, propertyId))
}

async function deleteInner(root: string, propertyId: string): Promise<MutateReply> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return NO_PROPERTY

  // EVERY collection folder, not just current assigners — a Remove's stash block lives on a collection sidecar that no longer assigns the id.
  const folders = collectionFolders(root, await liveTreeOf(root))
  // The delete takes every key the property still owed, so the Trash keeps what each holder holds under any of them, and what Remove or an option change owed goes with it.
  const { strip = [] } = owedDelete(propertyNote((await readNotes(root))[propertyId]), def.key)
  const planned = await deletePlan(root, propertyId, strip)
  const bundle = await snapshot(root, propertyId, def, folders, planned.holders.held, strip)
  // Noted after the bundle mints, so a finish never deletes with no Trash record; the list moves next, so no value write resolves the key once the strip starts; a refusal leaves nothing deleted, so the bundle goes.
  const ran = await runNoted(root, propertyId, {
    note: () => ({ kind: 'property', strip }),
    list: () => removeFromRegistry(root, propertyId),
    sweep: () => stripProperty(root, propertyId, folders, planned),
    settle: () => undefined,
  })
  if (!ran.ok) {
    await removeOwn(bundle)
    return ran
  }
  return ok({ bundled: { bundlePath: relative(root, bundle) }, cascade: ran.value.cascade })
}

interface DeletePlan {
  holders: Holders
  plan: SweepPlan
}

export async function deletePlan(
  root: string,
  propertyId: string,
  keys: readonly string[],
): Promise<DeletePlan> {
  const holders = await findHolders(root, { keys, reach: 'governed', id: propertyId }, 'values')
  return { holders, plan: { raw: withoutOrderId((r) => stripKeys(r, keys), propertyId) } }
}

/** Strips the plan's keys from the property's holders, then purges its assignment and stash from every Collection and its columns from every view. */
export async function stripProperty(
  root: string,
  propertyId: string,
  folders: string[],
  { holders, plan }: DeletePlan,
): Promise<ConfigReach> {
  const swept = await sweepGovernedRoots(holders.files, plan)
  let purged = 0
  for (const folder of folders) if (!(await unassignAndPurge(folder, propertyId))) purged++
  const reach = await reachConfig(root, { kind: 'property', propertyId })
  return {
    skipped: swept.skipped.length + unaddressed(holders.held) + purged + reach.skipped,
    refused: swept.refused,
    hosts: reach.hosts,
  }
}

async function unassignAndPurge(folder: string, propertyId: string): Promise<boolean> {
  const written = await patchSidecar(folder, 'collection', (cur) => {
    const assigned = assignedIds(cur)
    if (!assigned.includes(propertyId) && !stashedBlock(cur, propertyId)) return null
    return patchStashBlock(
      { ...cur, properties: assigned.filter((id) => id !== propertyId) },
      propertyId,
    )
  })
  return written.ok
}
