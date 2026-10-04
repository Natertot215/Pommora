// One law: act only on a state the record exactly maps, identity-checked by id, and clear on every other state. A failed heal logs and leaves the record — an open is never blocked.

import { errText, fault, ok, type Result } from '../Contract/result'
import { type ConfigReach, NO_REACH } from '../Nexus/configReach'
import { readRegistry, serializeSchemaOp } from './propertiesRegistry'
import { collectionFolders } from './assignment'
import { keyHolderFiles } from './keyHolders'
import { renameSweep } from './registryProperty'
import { stripAndRemove } from './deleteProperty'
import { dropOptionFromDef, optionCascade } from './optionOps'
import { optionValues } from './properties'
import { normalizeTitle } from '../Paths/caseFold'
import {
  clearSchemaJournal,
  readSchemaJournal,
  sameRecord,
  type SchemaJournal,
} from './propertyJournal'

export function replaySchemaCascade(
  root: string,
  record?: SchemaJournal,
): Promise<Result<ConfigReach> | null> {
  return serializeSchemaOp(root, async () => {
    try {
      const journal = record ?? (await readSchemaJournal(root))
      if (!journal) return null
      const owed = await replay(root, journal, record !== undefined)
      if (!owed.skipped) await clearSchemaJournal(root, journal)
      return ok(owed)
    } catch (e) {
      console.error('schema replay could not finish:', errText(e))
      return fault(e)
    }
  })
}

const named =
  (name: string) =>
  (d: { name: string }): boolean =>
    normalizeTitle(d.name) === normalizeTitle(name)

async function replay(
  root: string,
  journal: SchemaJournal,
  answered: boolean,
): Promise<ConfigReach> {
  const defs = (await readRegistry(root)).defs
  switch (journal.op) {
    case 'rename': {
      // The def still named `to` in any casing, with `from` taken by none, means the commit landed and the sweep is owed, to the name the def holds now; anything else is a state the record no longer maps.
      const def = defs[journal.id]
      if (!def || !named(journal.to)(def) || Object.values(defs).some(named(journal.from)))
        return NO_REACH
      return { skipped: await renameSweep(root, journal.from, def), hosts: [] }
    }
    case 'delete': {
      // The registry commits LAST in a delete, so the def still present under its journaled name is the crash state. The id under another name is alive on purpose — a restore or re-create consumes the record at createProperty; this arm catches what the delete left owed. A record a delete's answer carried exists only once its registry commit landed, so for it a present def is a restore.
      const def = defs[journal.id]
      const crashed = !answered && def !== undefined && named(journal.name)(def)
      const freed = !def && !Object.values(defs).some(named(journal.name))
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
      // Pages-first order holds the value in the def until the strip completes, so the value still listed is the owed state; gone means only the clear failed. An option has no identity, so an answer's record is owed only while the slot still holds it: past that, the value listed may have been added again.
      const def = defs[journal.id]
      const held = answered ? await readSchemaJournal(root) : journal
      if (!def || !held || !sameRecord(held, journal)) return NO_REACH
      if (!optionValues(def).includes(journal.value)) return NO_REACH
      const owed = await optionCascade(root, def, journal.value, { op: 'strip' })
      if (owed.skipped) return owed
      return (await dropOptionFromDef(root, journal.id, journal.value)).ok
        ? owed
        : { ...owed, skipped: 1 }
    }
  }
}
