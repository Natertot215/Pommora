import { join } from '../Locations/posix'
import { pageCollectionSidecar } from '../Nexus/schemas'
import type { PropertyDefinition } from '../Properties/properties'
import { fail, ok, type Result } from '../Contract/result'
import { readRegistry } from '../Properties/propertiesRegistry'
import type { RecordFile } from './record'
import { projectBaseline } from '../Nexus/remintLedger'
import { refreshTree } from '../Nexus/liveTree'
import { readSidecar } from '../IO/sidecar'
import { machine } from '../Platform/machine'
import { collectionFolders, assignInner } from '../Properties/assignment'
import { updatePageProperty } from '../Nexus/page'
import { isBlankValue, reconcilePropertyValue } from '../Properties/propertyValue'
import { createProperty } from '../Properties/registryProperty'
import { serializeSchemaOp } from '../Properties/schemaChain'

type PropertyRecord = Extract<RecordFile, { entity: 'property' }>

/** The tree is the wrong source here: it answers with a path-derived placeholder for a folder
 *  with no persisted id, which is an address rather than the identity recorded. */
async function foldersById(root: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (const folder of await collectionFolders(root)) {
    const sidecar = await readSidecar(folder, 'collection', pageCollectionSidecar)
    if (typeof sidecar?.id === 'string') out.set(sidecar.id, folder)
  }
  return out
}

export function restoreProperty(root: string, record: PropertyRecord): Promise<Result<null>> {
  return serializeSchemaOp(() => restoreInner(root, record))
}

async function restoreInner(root: string, record: PropertyRecord): Promise<Result<null>> {
  if ((await readRegistry(root)).defs[record.id])
    return fail('exists', 'Something in the nexus already carries this identity.')

  const created = await createProperty(root, {
    ...(record.def as unknown as PropertyDefinition),
    id: record.id,
  })
  if (!created.ok) return created
  const def = (await readRegistry(root)).defs[record.id]
  if (!def) return fail('operation-failed', 'The restored property could not be read back.')

  const byId = await foldersById(root)
  for (const collectionId of record.assignments ?? []) {
    const folder = byId.get(collectionId)
    if (folder) await assignInner(root, folder, record.id)
  }

  const roots = projectBaseline(await refreshTree(root)).entries
  let dropped = 0
  for (const [pageId, raw] of Object.entries(record.values)) {
    const entry = roots[pageId]
    if (entry?.kind !== 'page') {
      dropped++
      continue
    }
    const reconciled = reconcilePropertyValue(def, raw, false)
    if (isBlankValue(reconciled.value)) {
      dropped++
      continue
    }
    const file = join(root, entry.path)
    const written = await machine().lock(file, () =>
      updatePageProperty(root, file, def, reconciled.value),
    )
    if (!written.ok) dropped++
  }
  if (dropped) console.warn(`restore: ${dropped} value(s) of ${def.name} no longer validate`)
  return ok(null)
}
