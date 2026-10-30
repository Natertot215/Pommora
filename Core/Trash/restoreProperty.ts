import { PROPERTY_TYPES, propertyDefinition } from '../Properties/properties'
import { patchSidecar } from '../Files/sidecar'
import { ok, type Result, fault } from '../Contract/result'
import { serializeSchemaOp } from '../Properties/propertiesRegistry'
import { exactTitle } from '../Paths/caseFold'
import { type PropertyRecord, recordedPartly } from '../Bundles/record'
import { linkWorld, nexusPages, shownTitle } from '../Nexus/heldPages'
import { liveTreeOf } from '../Nexus/liveTree'
import { join } from '../Paths/posix'
import { assignInner } from '../Properties/assignment'
import { refillValues } from '../Nexus/governedSweep'
import { patchStashBlock } from '../Properties/propertyStash'
import { isBlankRaw } from '../Files/rootValues'
import { gonePageEntry } from '../Nexus/governedRoot'
import { frozenWorld } from './trashedCopies'
import { type CascadeReport, joinCascades, type StrippedLink } from '../Nexus/cascade'
import type { MutateOutcome } from '../Nexus/mutateRequest'
import { createProperty } from '../Properties/registryProperty'
import { restoreNote } from '../Nexus/owed'

/** A property restore's answer, its numbered label and what the re-assign couldn't refill from the stash read as the reply reads them. */
interface RestoredProperty extends Pick<MutateOutcome, 'landedAs' | 'cascade'> {
  /** The titles of what didn't take its value back. */
  unrestored: string[]
  /** Each Link value left out for naming a page gone, for the restore to park. */
  dropped: StrippedLink[]
}

export function restoreProperty(
  root: string,
  record: PropertyRecord,
): Promise<Result<RestoredProperty>> {
  return serializeSchemaOp(root, () => restoreInner(root, record))
}

async function restoreInner(
  root: string,
  record: PropertyRecord,
): Promise<Result<RestoredProperty>> {
  const parsed = propertyDefinition.safeParse({ ...record.def, id: record.id })
  if (!parsed.success) return fault('That deleted property’s definition no longer reads.')
  const created = await createProperty(root, parsed.data)
  if (!created.ok) return created
  // A conversion that can't land leaves the bundle unspent: the next finish reads the current name in `strip` and deletes again, and the restore can be repeated (H-4).
  const converted = await restoreNote(root, record.id)
  if (!converted.ok) return converted
  const def = created.value
  const tree = await liveTreeOf(root)
  const byId = new Map(tree.collections.map((c) => [c.id, join(root, c.path)]))
  // The stash comes back first, so the re-assign refills from it, and without the pages the record holds a delete-time value for, which supersedes an older leftover.
  for (const [collectionId, block] of Object.entries(record.stashes ?? {})) {
    const folder = byId.get(collectionId)
    const values = Object.fromEntries(
      Object.entries(block.values).filter(([id]) => !Object.hasOwn(record.values, id)),
    )
    if (folder)
      await patchSidecar(folder, 'collection', (cur) =>
        patchStashBlock(cur, record.id, { ...block, values }),
      )
  }
  let refilled: CascadeReport | undefined
  for (const collectionId of record.assignments ?? []) {
    const folder = byId.get(collectionId)
    const a = folder ? await assignInner(root, folder, record.id) : null
    if (a?.ok) refilled = joinCascades(refilled, a.value)
  }
  const { byId: roots, archived } = await nexusPages(root, tree)
  const frozen = frozenWorld(linkWorld(tree, archived))
  const dropped: StrippedLink[] = []
  const values = Object.fromEntries(
    Object.entries(record.values).filter(([id, raw]) => {
      const at = roots.get(id)
      if ((at !== null && at?.kind !== 'page' && at?.kind !== 'space') || isBlankRaw(raw))
        return false
      const entry =
        PROPERTY_TYPES[def.type].connections === 'value' ? gonePageEntry(raw, frozen) : null
      if (entry === null) return true
      dropped.push({ page: id, property: def.id, value: entry, above: record.above?.[id] })
      return false
    }),
  )
  const { taken } = await refillValues(root, def, roots, values, frozen, record.above)
  const cascade = joinCascades(refilled, recordedPartly(record, def.label))
  return ok({
    unrestored: Object.keys(values).flatMap((id) =>
      taken.has(id) ? [] : (shownTitle(tree, roots, id) ?? []),
    ),
    dropped,
    ...(def.label === exactTitle(parsed.data.label) ? {} : { landedAs: def.label }),
    ...(cascade ? { cascade } : {}),
  })
}
