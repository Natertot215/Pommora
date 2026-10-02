// One law: act only on a state the record exactly maps, identity-checked by id, and clear on every other state. A failed heal logs and leaves the record — an open is never blocked.

import { errText, fault, ok, type Result } from '../Contract/result'
import { type ConfigReach, NO_REACH } from '../Nexus/configReach'
import { readRegistry } from './propertiesRegistry'
import { collectionFolders } from './assignment'
import { keyHolderFiles } from './keyHolders'
import { renameSweep } from './registryProperty'
import { stripAndRemove } from './deleteProperty'
import { dropOptionFromDef, optionCascade } from './optionOps'
import { optionValues } from './properties'
import { clearSchemaJournal, readSchemaJournal, type SchemaJournal } from './propertyJournal'
import { serializeSchemaOp } from './schemaChain'

export function replaySchemaCascade(
  root: string,
  record?: SchemaJournal,
): Promise<Result<ConfigReach> | null> {
  return serializeSchemaOp(async () => {
    try {
      const journal = record ?? (await readSchemaJournal(root))
      if (!journal) return null
      const owed = await replay(root, journal)
      if (!owed.skipped) await clearSchemaJournal(root, journal)
      return ok(owed)
    } catch (e) {
      console.error('schema replay could not finish:', errText(e))
      return fault(e)
    }
  })
}

async function replay(root: string, journal: SchemaJournal): Promise<ConfigReach> {
  const defs = (await readRegistry(root)).defs
  switch (journal.op) {
    case 'rename': {
      // The def still named `to`, with `from` taken by no other, means the commit landed and the sweep is owed; anything else is a state the record no longer maps.
      const taken = Object.values(defs).some((d) => d.name === journal.from)
      if (defs[journal.id]?.name !== journal.to || taken) return NO_REACH
      return { skipped: await renameSweep(root, journal.from, journal.to), hosts: [] }
    }
    case 'delete': {
      // The registry commits LAST in a delete, so the def still present under its journaled name is the crash state. The id under another name is alive on purpose — a restore or re-create consumes the record at createProperty; this arm catches what the delete left owed.
      const def = defs[journal.id]
      const crashed = def?.name === journal.name
      const freed = !def && !Object.values(defs).some((d) => d.name === journal.name)
      if (!crashed && !freed) return NO_REACH
      const folders = await collectionFolders(root)
      const files = await keyHolderFiles(root, journal.name, folders)
      const { skipped, hosts, removed } = await stripAndRemove(
        root,
        journal.id,
        journal.name,
        folders,
        files,
      )
      return { skipped: skipped + (crashed && !removed.ok ? 1 : 0), hosts }
    }
    case 'option-rename': {
      const def = defs[journal.id]
      if (!def) return NO_REACH
      const values = optionValues(def)
      // Holds `to` and not `from` = the commit landed cleanly; every other state is not this record's.
      if (!values.includes(journal.to) || values.includes(journal.from)) return NO_REACH
      return optionCascade(root, def, journal.from, { op: 'replace', to: journal.to })
    }
    case 'option-remove': {
      // Pages-first order holds the value in the def until the strip completes, so the value still listed is the owed state; gone means only the clear failed.
      const def = defs[journal.id]
      if (!def || !optionValues(def).includes(journal.value)) return NO_REACH
      const owed = await optionCascade(root, def, journal.value, { op: 'strip' })
      if (owed.skipped) return owed
      return (await dropOptionFromDef(root, journal.id, journal.value)).ok
        ? owed
        : { ...owed, skipped: 1 }
    }
  }
}
