import { join } from '../Paths/posix'
import { propertyDefinition } from '../Properties/properties'
import { patchSidecar } from '../Files/sidecar'
import { fail, ok, type Result, fault } from '../Contract/result'
import { readRegistry } from '../Properties/propertiesRegistry'
import type { RecordFile } from './record'
import { projectBaseline } from '../Nexus/remintLedger'
import { refreshTree } from '../Nexus/liveTree'
import { readJsonObject } from '../Files/atomicWrite'
import { sidecarPath } from '../Paths/paths'
import { machine } from '../Platform/machine'
import { collectionFolders, assignInner, patchCacheBlock } from '../Properties/assignment'
import { updatePageProperty } from '../Nexus/page'
import { setSpaceProperty } from '../Properties/setProperty'
import { isBlankRaw, isBlankValue, reconcilePropertyValue } from '../Properties/propertyValue'
import { createProperty } from '../Properties/registryProperty'
import { serializeSchemaOp } from '../Properties/schemaChain'

type PropertyRecord = Extract<RecordFile, { entity: 'property' }>

/** The tree is the wrong source here: it answers with a path-derived placeholder for a folder with no persisted id, which is an address rather than the identity recorded. */
async function foldersById(root: string): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (const folder of await collectionFolders(root)) {
    const id = (await readJsonObject(sidecarPath(folder, 'collection')))?.id
    if (typeof id === 'string') out.set(id, folder)
  }
  return out
}

/** Answers the titles of what didn't take its value back. */
export function restoreProperty(root: string, record: PropertyRecord): Promise<Result<string[]>> {
  return serializeSchemaOp(() => restoreInner(root, record))
}

async function restoreInner(root: string, record: PropertyRecord): Promise<Result<string[]>> {
  if ((await readRegistry(root)).defs[record.id])
    return fail('exists', 'Something in the nexus already carries this identity.')
  const parsed = propertyDefinition.safeParse({ ...record.def, id: record.id })
  if (!parsed.success) return fault('That deleted property’s definition no longer reads.')

  const created = await createProperty(root, parsed.data)
  if (!created.ok) return created
  const def = (await readRegistry(root)).defs[record.id]
  if (!def) return fault('The restored property could not be read back.')

  const byId = await foldersById(root)
  for (const collectionId of record.assignments ?? []) {
    const folder = byId.get(collectionId)
    if (folder) await assignInner(root, folder, record.id)
  }
  for (const [collectionId, values] of Object.entries(record.caches ?? {})) {
    const folder = byId.get(collectionId)
    if (folder)
      await patchSidecar(folder, 'collection', (cur) => patchCacheBlock(cur, record.id, { values }))
  }

  const roots = projectBaseline(await refreshTree(root)).entries
  const unrestored: string[] = []
  for (const [id, raw] of Object.entries(record.values)) {
    const entry = roots[id]
    if ((entry?.kind !== 'page' && entry?.kind !== 'space') || isBlankRaw(raw)) continue
    const reconciled = reconcilePropertyValue(def, raw, false)
    const abs = join(root, entry.path)
    const written = isBlankValue(reconciled.value)
      ? null
      : entry.kind === 'page'
        ? await machine().lock(abs, () => updatePageProperty(root, abs, def, reconciled.value))
        : await setSpaceProperty(abs, def, reconciled.value)
    if (!written?.ok) unrestored.push(entry.title)
  }
  return ok(unrestored)
}
