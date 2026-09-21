// One law: act only on a state the record exactly maps, identity-checked by id, and clear on every other state. A failed heal logs and leaves the record — an open is never blocked.

import { errText } from '../Contract/result'
import { readRegistry } from './propertiesRegistry'
import { collectionFolders } from './assignment'
import { keyHolderFiles } from './keyHolders'
import { renameSweep } from './registryProperty'
import { stripAndRemove } from './deleteProperty'
import { dropOptionFromDef, valueEditSweep } from './optionOps'
import { optionValues } from './properties'
import { clearSchemaJournal, readSchemaJournal, type SchemaJournal } from './propertyJournal'
import { serializeSchemaOp } from './schemaChain'

export function replaySchemaCascade(root: string): Promise<boolean> {
  return serializeSchemaOp(async () => {
    try {
      const journal = await readSchemaJournal(root)
      if (!journal) return false
      const unfinished = await replay(root, journal)
      if (!unfinished) await clearSchemaJournal(root, journal)
    } catch (e) {
      console.error('schema replay could not finish:', errText(e))
    }
    return true
  })
}

async function replay(root: string, journal: SchemaJournal): Promise<boolean> {
  const defs = (await readRegistry(root)).defs
  switch (journal.op) {
    case 'rename': {
      // Only the journaled def's own name decides: `to` means the commit landed and the sweep is owed; anything else is a state the record no longer maps.
      if (defs[journal.id]?.name !== journal.to) return false
      return (await renameSweep(root, journal.from, journal.to)) > 0
    }
    case 'delete': {
      // The registry commits LAST in a delete, so the def still present under its journaled name is the crash state. The id under another name is alive on purpose — a restore or re-create consumes the record at createProperty; this arm catches what landed while the app was closed.
      const def = defs[journal.id]
      const crashed = def?.name === journal.name
      const freed = !def && !Object.values(defs).some((d) => d.name === journal.name)
      if (!crashed && !freed) return false
      const folders = await collectionFolders(root)
      const files = await keyHolderFiles(root, journal.name, folders)
      return (await stripAndRemove(root, journal.id, journal.name, folders, files)).skipped > 0
    }
    case 'option-rename': {
      const def = defs[journal.id]
      if (!def) return false
      const values = optionValues(def)
      // Holds `to` and not `from` = the commit landed cleanly; every other state is not this record's.
      if (!values.includes(journal.to) || values.includes(journal.from)) return false
      return (
        (await valueEditSweep(root, def.name, journal.from, { op: 'replace', to: journal.to })) > 0
      )
    }
    case 'option-remove': {
      // Pages-first order holds the value in the def until the strip completes, so the value still listed is the owed state; gone means only the clear failed.
      const def = defs[journal.id]
      if (!def || !optionValues(def).includes(journal.value)) return false
      if ((await valueEditSweep(root, def.name, journal.value, { op: 'strip' })) > 0) return true
      await dropOptionFromDef(root, journal.id, journal.value)
      return false
    }
  }
}
