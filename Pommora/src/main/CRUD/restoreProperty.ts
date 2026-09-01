// The inverse of the global property delete: the definition re-enters the registry, the
// Collections that carried it get it back, and every page value the record holds is written home.
//
// ONLY WHAT STILL VALIDATES RETURNS. A definition whose name has since been taken cannot come
// back at all; a value whose option is gone, whose type no longer fits, or whose page has since
// died simply doesn't. The record is evidence of what was, never a mandate to recreate it —
// so a restore lands what it honestly can and names the rest.

import { join } from 'node:path'
import { pageCollectionSidecar } from '@shared/schemas'
import type { PropertyDefinition } from '@shared/properties'
import { fail, ok, type Result } from '@shared/result'
import { readRegistry } from '../IO/propertiesRegistry'
import type { RecordFile } from '../provenance'
import { projectBaseline } from '../record'
import { refreshTree } from '../liveTree'
import { readSidecar } from '../sidecarIO'
import { serializeOnFile } from '../IO/fileLock'
import { collectionFolders, assignInner } from './assignment'
import { updatePageProperty } from './page'
import { isBlankValue, reconcilePropertyValue } from '@shared/propertyValue'
import { createProperty } from './registryProperty'
import { serializeSchemaOp } from './schemaChain'

type PropertyRecord = Extract<RecordFile, { entity: 'property' }>

/** Collection folders by sidecar id — read from the sidecars themselves, exactly as the delete
 *  recorded them. The tree is the wrong source here: it answers with a path-derived placeholder
 *  for a folder that has no persisted id, which is an address rather than the identity recorded. */
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
  // Nothing may write over a living identity — the same law the artifact resolver answers to.
  if ((await readRegistry(root)).defs[record.id])
    return fail('exists', 'Something in the nexus already carries this identity.')

  // The registry is the judge of whether the definition can return: it refuses a name another
  // property now holds, which is exactly the state that makes this restore invalid.
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
    // A Collection deleted since is simply gone; the property returns to the ones still here.
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
    const written = await serializeOnFile(file, () =>
      updatePageProperty(file, def, reconciled.value),
    )
    if (!written.ok) dropped++
  }
  if (dropped) console.warn(`restore: ${dropped} value(s) of ${def.name} no longer validate`)
  return ok(null)
}
