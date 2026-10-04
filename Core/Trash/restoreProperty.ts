import { propertyDefinition } from '../Properties/properties'
import { patchSidecar } from '../Files/sidecar'
import { fail, ok, type Result, fault } from '../Contract/result'
import { readRegistry, serializeSchemaOp } from '../Properties/propertiesRegistry'
import type { RecordFile } from './record'
import { recordById } from '../Nexus/record'
import { liveTreeOf } from '../Nexus/liveTree'
import { frozenWorld } from '../Nexus/heldPages'
import { join } from '../Paths/posix'
import { assignInner, refillValues } from '../Properties/assignment'
import { patchCacheBlock } from '../Properties/propertyCache'
import { isBlankRaw, namesGonePage } from '../Properties/propertyValue'
import type { StrippedLink } from '../Nexus/cascade'
import { createProperty } from '../Properties/registryProperty'
import { resolvesCase } from '../Settings/personalization'

type PropertyRecord = Extract<RecordFile, { entity: 'property' }>

interface RestoredProperty {
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
  if ((await readRegistry(root)).defs[record.id])
    return fail('exists', 'Something in the nexus already carries this identity.')
  const parsed = propertyDefinition.safeParse({ ...record.def, id: record.id })
  if (!parsed.success) return fault('That deleted property’s definition no longer reads.')

  const created = await createProperty(root, parsed.data)
  if (!created.ok) return created
  const def = (await readRegistry(root)).defs[record.id]
  if (!def) return fault('The restored property could not be read back.')

  const byId = new Map((await liveTreeOf(root)).collections.map((c) => [c.id, join(root, c.path)]))
  for (const collectionId of record.assignments ?? []) {
    const folder = byId.get(collectionId)
    if (folder) await assignInner(root, folder, record.id)
  }
  for (const [collectionId, values] of Object.entries(record.caches ?? {})) {
    const folder = byId.get(collectionId)
    if (folder)
      await patchSidecar(folder, 'collection', (cur) => patchCacheBlock(cur, record.id, { values }))
  }

  const tree = await liveTreeOf(root)
  const roots = recordById(tree)
  const frozen = frozenWorld(tree)
  const dropped: StrippedLink[] = []
  const values = Object.fromEntries(
    Object.entries(record.values).filter(([id, raw]) => {
      if ((roots[id]?.kind !== 'page' && roots[id]?.kind !== 'space') || isBlankRaw(raw))
        return false
      if (def.type !== 'link' || !namesGonePage(raw, frozen)) return true
      dropped.push({ page: id, property: def.id, value: String(raw) })
      return false
    }),
  )
  const resolveCase = resolvesCase(tree.config.personalization)
  const taken = await refillValues(root, def, roots, values, frozen, resolveCase)
  return ok({
    unrestored: Object.keys(values).flatMap((id) => (taken.has(id) ? [] : roots[id].title)),
    dropped,
  })
}
